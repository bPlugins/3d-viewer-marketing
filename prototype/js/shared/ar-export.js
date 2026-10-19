// usdz-export core: when to build the AR file, the export itself, the per-configuration cache
// and the QR link. UI lives in screens/store/ar-export.js and editor panels/ar-export.js.
import { isOn } from '../core/features.js';
import { isEmptyCustom } from './options.js';

export const FLAG = 'usdz-export';
const TIMEOUT_MS = 20000;
const MAX_BYTES = 50 * 1048576;
const CACHE_SIZE = 8;

/** Build allowed for this product/variation: flag + global setting + no per-product opt-out. */
export function arBuildAllowed(state, config) {
	const ar = config?.ar;
	return isOn(FLAG) && !!state.settings?.ar_configured && ar?.enabled === true && ar?.configured !== false;
}

const hasLook = (c) => !!c && (Object.keys(c.meshes || {}).some((k) => c.meshes[k] && ('visible' in c.meshes[k] || c.meshes[k].color || c.meshes[k].texture)) || Object.keys(c.materials || {}).length > 0);

/** Rendered shopper layer plus any other shopper keys (decals, …) that change the look. */
export function arDesign(layer, custom) {
	const out = isEmptyCustom(layer) ? {} : { materials: layer.materials || {}, meshes: layer.meshes || {} };
	for (const [k, v] of Object.entries(custom || {})) {
		if (['materials', 'meshes', 'options'].includes(k) || v == null) continue;
		if (typeof v === 'object' && !Object.keys(v).length) continue;
		out[k] = v;
	}
	return Object.keys(out).length ? out : null;
}

/**
 * Does the viewer show something the uploaded files don't? design = arDesign(layer, custom).
 * → { configured, reason: 'design' | 'variation' | null }
 */
export function arLook(state, productId, variationId, design) {
	if (design) return { configured: true, reason: 'design' };
	const rec = variationId ? state.variationConfigs?.[variationId] : null;
	const raw = rec?.config;
	// A variation with its own model or look but no USDZ of its own would otherwise get the product's USDZ.
	if (rec && !raw?.ar?.usdzUrl && (Number(rec.model_id) > 0 || hasLook(raw))) return { configured: true, reason: 'variation' };
	return { configured: false, reason: null };
}

export function formatBytes(n) {
	if (!n && n !== 0) return '';
	if (n < 1024) return `${n} B`;
	if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
	return `${(n / 1048576).toFixed(1)} MB`;
}

export const formatSeconds = (ms) => `${(ms / 1000).toFixed(2)} s`;

/** Meshes the exporter will skip (USDZ only takes MeshStandardMaterial). */
function unsupportedParts(root) {
	const names = [];
	root.traverseVisible((o) => {
		if (o.isMesh && !(o.material && !Array.isArray(o.material) && o.material.isMeshStandardMaterial)) names.push(o.name || 'Unnamed');
	});
	return names;
}

/**
 * Export the viewer's model node (lights, shadows and helpers stay out).
 * controller: createViewer() controller; format 'usdz' | 'glb'. → { bytes, ms, warnings }
 */
export async function buildArFile(controller, format, { fail = false } = {}) {
	const model = controller?.three?.model;
	if (!model) throw new Error('The 3D model is not loaded yet.');
	const root = model.parent || model;
	const t0 = performance.now();
	root.updateMatrixWorld(true);
	const run = async () => {
		if (fail) {
			await new Promise((r) => setTimeout(r, 350));
			throw new Error('Simulated export failure (prototype).');
		}
		if (format === 'usdz') {
			const { USDZExporter } = await import('three/addons/exporters/USDZExporter.js');
			return new USDZExporter().parse(root, { quickLookCompatible: true });
		}
		const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
		const buf = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true });
		return new Uint8Array(buf);
	};
	let timer;
	const timeout = new Promise((_, reject) => (timer = setTimeout(() => reject(new Error('Building the AR file took too long.')), TIMEOUT_MS)));
	try {
		const bytes = await Promise.race([run(), timeout]);
		if (bytes.byteLength > MAX_BYTES) throw new Error('The AR file is too large for a phone.');
		const skipped = format === 'usdz' ? unsupportedParts(root) : [];
		const warnings = skipped.length ? [`${skipped.length} ${skipped.length === 1 ? 'part uses' : 'parts use'} a material Quick Look can't show and will be left out.`] : [];
		return { bytes, ms: performance.now() - t0, warnings };
	} finally {
		clearTimeout(timer);
	}
}

// ── Cache (per page view) ────────────────────────────────────────────────────

const cache = new Map();

export function arCacheKey({ productId, variationId, format, modelKey, config, design }) {
	return JSON.stringify([productId, variationId || 0, format, modelKey, config?.meshes || null, config?.materials || null, design || null]);
}

export function cachedArFile(key) {
	const hit = cache.get(key);
	if (!hit) return null;
	cache.delete(key);
	cache.set(key, hit);
	return hit;
}

export function storeArFile(key, entry) {
	const mime = entry.format === 'usdz' ? 'model/vnd.usdz+zip' : 'model/gltf-binary';
	const blobUrl = URL.createObjectURL(new Blob([entry.bytes], { type: mime }));
	const full = { ...entry, blobUrl, size: entry.bytes.byteLength, builtAt: Date.now() };
	cache.set(key, full);
	while (cache.size > CACHE_SIZE) {
		const [oldKey, old] = cache.entries().next().value;
		URL.revokeObjectURL(old.blobUrl);
		cache.delete(oldKey);
	}
	return full;
}

export const arCacheSize = () => cache.size;

/** Content hash for the upload file name (falls back to FNV-1a when SubtleCrypto is missing). */
export async function hashBytes(bytes) {
	try {
		const d = await crypto.subtle.digest('SHA-1', bytes);
		return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
	} catch {
		let h = 2166136261;
		for (let i = 0; i < bytes.length; i += 7) h = Math.imul(h ^ bytes[i], 16777619);
		return (h >>> 0).toString(16).padStart(8, '0');
	}
}

// ── QR link ──────────────────────────────────────────────────────────────────

function base64url(text) {
	const bytes = new TextEncoder().encode(text);
	let bin = '';
	// Chunked: spreading a large design (uploaded decal image) into fromCharCode overflows the stack.
	for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Longer links don't fit a QR code or a server's URL limit; the plugin needs a short (saved-design) link then. */
export const AR_LINK_MAX = 2000;

/** Product permalink that restores the variation and the design on the phone. */
export function arLink(state, productId, variationId, custom) {
	const p = state.products?.[productId];
	const base = `${location.origin}/product/${p?.slug || productId}/`;
	const params = [];
	const v = variationId ? state.variations?.[variationId] : null;
	if (v) for (const [name, value] of Object.entries(v.attributes || {})) params.push(`attribute_${encodeURIComponent(name.toLowerCase())}=${encodeURIComponent(value)}`);
	const picked = custom && Object.values(custom).some((v) => v != null && (typeof v !== 'object' || Object.keys(v).length > 0));
	if (picked) params.push(`wc3d_ar=${base64url(JSON.stringify({ v: variationId || 0, c: custom }))}`);
	return params.length ? `${base}?${params.join('&')}` : base;
}

/** File name the shopper's phone would see. */
export function arFileName(attachment, format, generated) {
	const stem = String(attachment?.filename || 'model.glb').replace(/\.[a-z0-9]+$/i, '');
	return `${stem}${generated ? '-configured' : ''}.${format}`;
}
