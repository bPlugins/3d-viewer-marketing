// Coverage dashboard core (specs/coverage.md): per-product 3D report and the bulk writers.
// Writes only the meta keys the product screen writes, so the storefront follows on its own.
import { store } from '../core/store.js';
import { effectiveFor, modelFor, backgroundFor } from './product-3d.js';
import { renderThumbnail } from '../engine/thumbnail.js';
import { arBuildAllowed } from './ar-export.js';

export const DEFAULT_MAX_MB = 10;

export const ISSUES = {
	'no-3d': { label: 'No 3D', tone: 'neutral', tip: '3D is not turned on for this product.' },
	'no-model': { label: 'No model', tone: 'danger', tip: '3D is on, but no model is assigned.' },
	'missing-file': { label: 'Model file missing', tone: 'danger', tip: 'The model file was deleted from the Media Library.' },
	oversized: { label: 'Oversized', tone: 'danger', tip: 'Large models load slowly on phones.' },
	'no-usdz': { label: 'No iOS AR file', tone: 'warning', tip: 'iPhone and iPad shoppers see no View in AR button.' },
	'ar-mismatch': { label: 'AR file not matched', tone: 'warning', tip: '' },
	'no-poster': { label: 'No poster', tone: 'muted', tip: 'The product image shows until the 3D viewer loads.' },
};
const ISSUE_ORDER = Object.keys(ISSUES);

export const FILTERS = [
	['all', 'All products'],
	['without-3d', 'Without 3D'],
	['with-3d', 'With 3D'],
	['no-usdz', 'Missing iOS AR file'],
	['no-poster', 'Missing poster'],
	['oversized', 'Oversized models'],
	['missing', 'Missing model'],
	['variations', 'Variations not covered'],
	['draft', 'Drafts with 3D'],
];

export const STATUS_BADGES = {
	ready: ['Enabled', 'success'],
	'missing-file': ['Model missing', 'danger'],
	'no-model': ['No model', 'danger'],
	off: ['Not enabled', ''],
	none: ['Not enabled', ''],
};

export function maxModelBytes(settings) {
	const mb = Number(settings?.coverage_max_model_mb);
	return (Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_MAX_MB) * 1024 * 1024;
}

/** size_format()-style: 2.3 MB, 480 KB. */
export function formatBytes(b) {
	if (!b) return '';
	const u = ['B', 'KB', 'MB', 'GB'];
	let i = 0;
	let n = b;
	while (n >= 1024 && i < u.length - 1) (n /= 1024), i++;
	return `${n >= 10 || i < 2 ? Math.round(n) : n.toFixed(1)} ${u[i]}`;
}

export const variationName = (v) => Object.values(v?.attributes || {}).join(', ') || `#${v?.id}`;
const fileOf = (url) => String(url || '').split('/').pop();
const hasOverrides = (cfg) => !!cfg && Object.keys(cfg).some((k) => k !== 'schema_version' && cfg[k] != null);

/** The report row for one product (computed, never stored). */
export function coverageRow(state, product, { maxBytes = maxModelBytes(state.settings) } = {}) {
	const pid = product.id;
	const meta = product.meta || {};
	const enabled = meta._wc3d_enabled === 'yes';
	const modelId = Number(meta._wc3d_model_id) || 0;
	const model = modelId ? state.attachments?.[modelId] || null : null;
	const status = enabled ? (model ? 'ready' : modelId ? 'missing-file' : 'no-model') : modelId ? 'off' : 'none';
	const ready = status === 'ready';

	const base = state.productConfigs?.[pid]?.config || {};
	const ar = { enabled: base.ar?.enabled === true, usdzUrl: base.ar?.usdzUrl || '', filename: '' };
	if (ar.usdzUrl) ar.filename = state.attachments?.[base.ar.usdzId]?.filename || fileOf(ar.usdzUrl);
	// usdz-export: iOS gets a file built on the device, so a missing or unmatched USDZ is not an issue.
	ar.built = arBuildAllowed(state, base);

	const posterId = Number(meta._wc3d_poster_id) || 0;
	const poster = posterId ? state.attachments?.[posterId] || null : null;

	const oversized = [];
	if (model?.sizeBytes > maxBytes) oversized.push({ label: 'Default', filename: model.filename, sizeBytes: model.sizeBytes });

	const vars = { total: 0, covered: 0, ownModel: 0, withOverrides: 0, mismatchedAr: [], missing: [] };
	if (product.type === 'variable') {
		for (const vid of product.variations || []) {
			const v = state.variations?.[vid];
			if (!v) continue;
			vars.total++;
			const rec = state.variationConfigs?.[vid];
			const m = modelFor(state, pid, vid);
			if (ready && m.attachment) vars.covered++;
			if (hasOverrides(rec?.config)) vars.withOverrides++;
			if (!m.hasOwnModel) continue;
			vars.ownModel++;
			if (!m.attachment) vars.missing.push(variationName(v));
			else if (m.attachment.sizeBytes > maxBytes) oversized.push({ label: variationName(v), filename: m.attachment.filename, sizeBytes: m.attachment.sizeBytes });
			if (ar.usdzUrl && !rec?.config?.ar?.usdzUrl) vars.mismatchedAr.push(variationName(v));
		}
	}

	const issues = [];
	if (status === 'off' || status === 'none') issues.push('no-3d');
	if (status === 'no-model') issues.push('no-model');
	if (status === 'missing-file' || (ready && vars.missing.length)) issues.push('missing-file');
	if (oversized.length && enabled) issues.push('oversized');
	if (ready && !ar.usdzUrl && !ar.built) issues.push('no-usdz');
	if (ready && vars.mismatchedAr.length && !ar.built) issues.push('ar-mismatch');
	if (ready && !poster) issues.push('no-poster');

	return { id: pid, product, status, ready, modelId, model, sizeBytes: model?.sizeBytes || 0, ar, posterId, poster, variations: vars, oversized, issues };
}

/** Tooltip for an issue chip on a row. */
export function issueTip(row, id) {
	if (id === 'ar-mismatch') {
		const names = row.variations.mismatchedAr;
		return names.length === 1
			? `${names[0]} has its own model but uses the default iOS AR file.`
			: `${names.join(', ')} have their own models but use the default iOS AR file.`;
	}
	if (id === 'oversized') return row.oversized.map((o) => `${o.filename}: ${formatBytes(o.sizeBytes)}`).join(', ') + '. ' + ISSUES.oversized.tip;
	if (id === 'missing-file' && row.variations.missing.length && row.status === 'ready') return `Own model of ${row.variations.missing.join(', ')} was deleted.`;
	return ISSUES[id].tip;
}

export const isDraftish = (p) => p.status === 'draft' || p.status === 'pending' || p.status === 'private';

export function matchesFilter(row, filter) {
	switch (filter) {
		case 'without-3d':
			return !row.ready;
		case 'with-3d':
			return row.ready;
		case 'no-usdz':
			return row.issues.includes('no-usdz') || row.issues.includes('ar-mismatch');
		case 'no-poster':
			return row.issues.includes('no-poster');
		case 'oversized':
			return row.issues.includes('oversized');
		case 'missing':
			return row.issues.includes('no-model') || row.issues.includes('missing-file');
		case 'variations':
			return row.variations.total > row.variations.covered;
		case 'draft':
			return row.ready && isDraftish(row.product);
		default:
			return true;
	}
}

/** Rows for every simple/variable product not in the Trash, plus the card totals. */
export function coverageReport(state) {
	const maxBytes = maxModelBytes(state.settings);
	const rows = Object.values(state.products || {})
		.filter((p) => (p.type === 'simple' || p.type === 'variable') && p.status !== 'trash')
		.map((p) => coverageRow(state, p, { maxBytes }));
	const count = (f) => rows.filter((r) => matchesFilter(r, f)).length;
	const varTotal = rows.reduce((n, r) => n + r.variations.total, 0);
	const varCovered = rows.reduce((n, r) => n + r.variations.covered, 0);
	return {
		rows,
		maxBytes,
		stats: {
			total: rows.length,
			with3d: count('with-3d'),
			without3d: count('without-3d'),
			varTotal,
			varCovered,
			noUsdz: count('no-usdz'),
			noPoster: count('no-poster'),
			oversized: count('oversized'),
			drafts: count('draft'),
		},
	};
}

export const issueRank = (row) => row.issues.reduce((n, id) => n + (ISSUES[id].tone === 'danger' ? 3 : ISSUES[id].tone === 'warning' ? 2 : 1), 0);
export const sortIssues = (ids) => [...ids].sort((a, b) => ISSUE_ORDER.indexOf(a) - ISSUE_ORDER.indexOf(b));

// ── Bulk writers ──────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');
function nowStr() {
	const d = new Date();
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function patchProducts(ids, metaPatch) {
	const now = nowStr();
	store.set((s) => {
		const products = { ...s.products };
		for (const id of ids) {
			const p = products[id];
			if (!p) continue;
			const patch = typeof metaPatch === 'function' ? metaPatch(p) : metaPatch;
			products[id] = { ...p, meta: { ...p.meta, ...patch }, dateModified: now };
		}
		return { ...s, products };
	});
}

/** ProductPanel::save() for one field: `_wc3d_model_id` (+ `_wc3d_enabled` when enable). */
export function assignModel(ids, attachmentId, { enable = true } = {}) {
	patchProducts(ids, enable ? { _wc3d_model_id: attachmentId, _wc3d_enabled: 'yes' } : { _wc3d_model_id: attachmentId });
}

/** Returns the previous values so the caller can undo. */
export function setEnabled(ids, on) {
	const prev = Object.fromEntries(ids.map((id) => [id, store.get().products?.[id]?.meta?._wc3d_enabled ?? '']));
	patchProducts(ids, { _wc3d_enabled: on ? 'yes' : '' });
	return prev;
}

export function restoreEnabled(prev) {
	patchProducts(Object.keys(prev).map(Number), (p) => ({ _wc3d_enabled: prev[p.id] }));
}

function posterBackground(state, pid) {
	const bg = backgroundFor(state, pid);
	if (bg.backgroundType === 'color' && bg.backgroundColor) return bg.backgroundColor;
	return state.products?.[pid]?.image?.bg || '#ffffff';
}

/**
 * Renders an 800×800 poster for each product with a working model, one at a time,
 * stores it as an image attachment and sets `_wc3d_poster_id`. onProgress(done, total).
 */
export async function generatePosters(ids, { onProgress } = {}) {
	const done = [];
	const failed = [];
	for (let i = 0; i < ids.length; i++) {
		const pid = ids[i];
		const state = store.get();
		const product = state.products?.[pid];
		const { model } = modelFor(state, pid, 0);
		onProgress?.(i, ids.length);
		try {
			if (!product || !model) throw new Error('no model');
			const url = await renderThumbnail(model, effectiveFor(state, pid, 0, { background: false }), {
				width: 800,
				height: 800,
				bg: posterBackground(state, pid),
			});
			if (!url) throw new Error('empty');
			const id = store.nextId('attachments');
			const name = `${product.slug || pid}-3d-poster`;
			store.patch(['attachments', id], { id, kind: 'image', title: name, filename: name + '.jpg', mime: 'image/jpeg', url, date: nowStr(), source: 'wc3d-poster', parentId: pid });
			patchProducts([pid], { _wc3d_poster_id: id });
			done.push(pid);
		} catch {
			failed.push(pid);
		}
	}
	onProgress?.(ids.length, ids.length);
	return { done, failed };
}
