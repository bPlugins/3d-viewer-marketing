// Personalization (flag decals): customer text or image on merchant-picked areas. The "server"
// for areas and content, like options.js for options. Spec: prototype/specs/decals.md.
import { isOn } from '../core/features.js';
import { normalizeRule, ruleAmount, ruleRegular, shopperLayer } from './options.js';
import { cartSummary, effectiveFor, viewerSettingsFor } from './product-3d.js';

/** Font name → CSS family. Inter ships with the plugin; the rest are system fonts. */
export const DECAL_FONTS = {
	Inter: '"wc3d Inter", Inter, sans-serif',
	Arial: 'Arial, Helvetica, sans-serif',
	Georgia: 'Georgia, "Times New Roman", serif',
	'Times New Roman': '"Times New Roman", Times, serif',
	Verdana: 'Verdana, Geneva, sans-serif',
	'Trebuchet MS': '"Trebuchet MS", Helvetica, sans-serif',
	'Courier New': '"Courier New", Courier, monospace',
	Impact: 'Impact, "Arial Black", sans-serif',
	'Brush Script MT': '"Brush Script MT", "Segoe Script", cursive',
};
export const DECAL_SIDES = { front: 'Front', back: 'Back', left: 'Left', right: 'Right', top: 'Top', bottom: 'Bottom' };
export const DECAL_KINDS = { text: 'Text', image: 'Image' };
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_SIDE = 1024;
export const DECAL_ERRORS = {
	type: 'Use a PNG, JPG or WEBP image.',
	size: 'The image must be 5 MB or smaller.',
	read: 'The image could not be read. Try another file.',
};

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lc = (s) => String(s ?? '').trim().toLowerCase();
const HEX = /^#[0-9a-f]{6}$/i;
const DATA_IMAGE = /^data:image\/(png|jpeg|webp);base64,/i;

export const decalKey = (id) => 'decal:' + id;
export const isDecalKey = (key) => String(key || '').startsWith('decal:');

export const DEFAULT_PLACEMENT = { side: 'front', x: 0.5, y: 0.5, width: 0.5, height: 0.3, rotation: 0 };

/** Area with every field filled in and clamped (stored configs may be partial). */
export function normalizeArea(a) {
	const p = isObj(a.placement) ? a.placement : {};
	const kinds = (Array.isArray(a.kinds) ? a.kinds : ['text']).filter((k) => DECAL_KINDS[k]);
	const fonts = (Array.isArray(a.fonts) ? a.fonts : []).filter((f) => DECAL_FONTS[f]);
	const colors = (Array.isArray(a.colors) ? a.colors : []).map(lc).filter((c) => HEX.test(c));
	const lo = clamp(num(a.min_size, 0.2), 0.05, 1);
	return {
		...a,
		label: String(a.label ?? '').trim() || 'Personalization',
		placement: {
			side: DECAL_SIDES[p.side] ? p.side : 'front',
			x: clamp(num(p.x, 0.5), 0, 1),
			y: clamp(num(p.y, 0.5), 0, 1),
			width: clamp(num(p.width, DEFAULT_PLACEMENT.width), 0.05, 1),
			height: clamp(num(p.height, DEFAULT_PLACEMENT.height), 0.05, 1),
			rotation: clamp(num(p.rotation, 0), -180, 180),
		},
		kinds: kinds.length ? [...new Set(kinds)] : ['text'],
		fonts: fonts.length ? [...new Set(fonts)] : ['Inter'],
		colors: colors.length ? [...new Set(colors)] : ['#000000'],
		max_chars: Math.round(clamp(num(a.max_chars, 20), 1, 100)),
		min_size: lo,
		max_size: clamp(num(a.max_size, 1), lo, 1),
		required: !!a.required,
	};
}

export function decalAreas(config) {
	if (!Array.isArray(config?.decals)) return [];
	return config.decals.filter((a) => isObj(a) && a.id && a.mesh).map(normalizeArea);
}

export function usesDecals(config, on = isOn('decals')) {
	return !!on && decalAreas(config).length > 0;
}

export function decalsOf(custom) {
	return isObj(custom?.decals) ? custom.decals : {};
}

/** Area ids whose mesh the shopper's part choices hide: not listed, charged, required or stored. */
export function hiddenAreas(config, custom) {
	const meshes = shopperLayer(config, custom)?.meshes || {};
	const out = new Set();
	for (const a of decalAreas(config)) if ((meshes[a.mesh]?.visible ?? config.meshes?.[a.mesh]?.visible) === false) out.add(a.id);
	return out;
}

/** Any area touched (also an empty one whose kind/font/colour was picked): not an empty shopper layer. */
export function hasDecalEntries(custom) {
	return Object.values(decalsOf(custom)).some(isObj);
}

/** Raw test (no config): any area with text or an image. */
export function hasDecalContent(custom) {
	return Object.values(decalsOf(custom)).some((c) => isObj(c) && ((c.kind === 'image' && !!c.image) || (c.kind !== 'image' && String(c.text ?? '').trim() !== '')));
}

/** Defaults for a fresh design in `area` (kind = the first allowed one). */
export function blankContent(area, kind = area.kinds[0]) {
	return { kind, text: '', font: area.fonts[0], color: area.colors[0], size: area.max_size, x: 0, y: 0, rotation: 0 };
}

/** Customer content clamped to what the area allows; null when unusable. Keeps both kinds' fields (the drawer switches between them). */
export function areaContent(area, raw) {
	if (!isObj(raw)) return null;
	const kind = area.kinds.includes(raw.kind) ? raw.kind : area.kinds[0];
	const out = {
		kind,
		text: String(raw.text ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, area.max_chars),
		font: area.fonts.includes(raw.font) ? raw.font : area.fonts[0],
		color: area.colors.includes(lc(raw.color)) ? lc(raw.color) : area.colors[0],
		size: clamp(num(raw.size, area.max_size), area.min_size, area.max_size),
		x: clamp(num(raw.x, 0), -0.5, 0.5),
		y: clamp(num(raw.y, 0), -0.5, 0.5),
		rotation: clamp(num(raw.rotation, 0), -180, 180),
	};
	if (typeof raw.image === 'string' && DATA_IMAGE.test(raw.image)) {
		out.image = raw.image;
		out.name = String(raw.name ?? '').slice(0, 120) || 'image';
	}
	return out;
}

export function hasContent(area, c) {
	if (!c) return false;
	return c.kind === 'image' ? !!c.image && area.kinds.includes('image') : String(c.text ?? '').trim() !== '' && area.kinds.includes('text');
}

/** Only the active kind's fields (what the cart stores). */
function storedContent(c) {
	const { kind, size, x, y, rotation } = c;
	return kind === 'image' ? { kind, image: c.image, name: c.name, size, x, y, rotation } : { kind, text: c.text.trim(), font: c.font, color: c.color, size, x, y, rotation };
}

/** woocommerce_add_cart_item_data: known, filled areas only; null when none. */
export function sanitizeDecals(config, decals, hidden = new Set()) {
	if (!isObj(decals)) return null;
	const out = {};
	for (const a of decalAreas(config)) {
		if (hidden.has(a.id)) continue;
		const c = areaContent(a, decals[a.id]);
		if (hasContent(a, c)) out[a.id] = storedContent(c);
	}
	return Object.keys(out).length ? out : null;
}

/** sanitizeCustom result with the decals added (or dropped with the flag off). */
export function withDecals(config, custom, clean, on = isOn('decals')) {
	if (!on) return clean;
	const decals = usesDecals(config, on) ? sanitizeDecals(config, custom?.decals, hiddenAreas(config, custom)) : null;
	const out = { ...(clean || {}) };
	delete out.decals;
	if (decals) out.decals = decals;
	const filled = Object.values(out).some((v) => (isObj(v) ? Object.keys(v).length > 0 : v != null));
	return filled ? out : null;
}

export function decalErrors(config, custom, on = isOn('decals')) {
	if (!usesDecals(config, on)) return [];
	const d = decalsOf(custom);
	const hidden = hiddenAreas(config, custom);
	return decalAreas(config)
		.filter((a) => a.required && !hidden.has(a.id) && !hasContent(a, areaContent(a, d[a.id])))
		.map((a) => `“${a.label}” is a required field.`);
}

/** Drawer section id (data-wc3d-group) of the first required area still empty. */
export function firstMissingDecal(config, custom) {
	const d = decalsOf(custom);
	const hidden = hiddenAreas(config, custom);
	const a = decalAreas(config).find((x) => x.required && !hidden.has(x.id) && !hasContent(x, areaContent(x, d[x.id])));
	return a ? decalKey(a.id) : null;
}

/** Areas apply only where the shopper sees the drawer: 3D available and the customizer on. */
export function decalConfig(state, productId, variationId = 0, on = isOn('decals')) {
	const vs = viewerSettingsFor(state, productId);
	if (!on || !vs.available || !vs.customizerEnabled) return null;
	const config = effectiveFor(state, productId, variationId, { background: false });
	return usesDecals(config, on) ? config : null;
}

export function decalErrorsFor(state, productId, variationId = 0, custom = null) {
	const config = decalConfig(state, productId, variationId);
	return config ? decalErrors(config, custom) : [];
}

const liveRule = (r) => {
	const n = normalizeRule(r);
	return !!n && (n.amount !== 0 || (n.sale ?? 0) !== 0);
};

export function hasDecalRules(config, on = isOn('decals')) {
	return usesDecals(config, on) && decalAreas(config).some((a) => liveRule(a.price));
}

/** '“Hello” (Inter, #ffffff)' / 'logo.png'. */
export function decalValue(c) {
	return c.kind === 'image' ? c.name || 'Image' : `“${c.text.trim()}” (${c.font}, ${c.color})`;
}

/** Summary rows of the filled areas, in area order; amounts only with pricing. */
export function decalLines(config, custom, base, { pricing = false, on = isOn('decals') } = {}) {
	if (!usesDecals(config, on)) return [];
	const d = decalsOf(custom);
	const hidden = hiddenAreas(config, custom);
	const lines = [];
	for (const a of decalAreas(config)) {
		if (hidden.has(a.id)) continue;
		const c = areaContent(a, d[a.id]);
		if (!hasContent(a, c)) continue;
		lines.push({
			key: decalKey(a.id),
			label: a.label,
			value: decalValue(c),
			...(c.kind === 'image' ? { image: c.image } : { swatch: c.color }),
			amount: pricing ? ruleAmount(a.price, base) : 0,
			regular: pricing ? ruleRegular(a.price, base) : null,
		});
	}
	return lines;
}

/** Rows for a line when neither pricing nor groups lists options: the old summary row, then the areas. */
export function decalRows(state, item) {
	if (!isOn('decals') || !hasDecalContent(item?.custom) || !state.products?.[item.productId]) return [];
	const vid = item.variationId && state.variations?.[item.variationId]?.parentId === item.productId ? item.variationId : 0;
	const config = effectiveFor(state, item.productId, vid, { background: false });
	const rows = decalLines(config, item.custom, 0);
	if (!rows.length) return [];
	const summary = item.summary || cartSummary(item.custom);
	return summary ? [{ key: 'summary', label: '3D Customization', value: summary, amount: 0, regular: null }, ...rows] : rows;
}

// ── Image upload (FileReader → data URL in memory; the plugin uploads it instead) ──

/** Resolves { image, name } or rejects with one of DECAL_ERRORS. */
export function readImageFile(file) {
	return new Promise((resolve, reject) => {
		if (!file) return reject(DECAL_ERRORS.read);
		if (!IMAGE_TYPES.includes(file.type)) return reject(DECAL_ERRORS.type);
		if (file.size > IMAGE_MAX_BYTES) return reject(DECAL_ERRORS.size);
		const reader = new FileReader();
		reader.onerror = () => reject(DECAL_ERRORS.read);
		reader.onload = () => {
			const img = new Image();
			img.onerror = () => reject(DECAL_ERRORS.read);
			img.onload = () => {
				const s = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight, 1));
				const c = document.createElement('canvas');
				c.width = Math.max(1, Math.round(img.naturalWidth * s));
				c.height = Math.max(1, Math.round(img.naturalHeight * s));
				c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
				// JPEG stays JPEG (smaller); PNG/WEBP keep transparency as PNG.
				const url = file.type === 'image/jpeg' ? c.toDataURL('image/jpeg', 0.88) : c.toDataURL('image/png');
				resolve({ image: url, name: file.name || 'image' });
			};
			img.src = String(reader.result || '');
		};
		reader.readAsDataURL(file);
	});
}
