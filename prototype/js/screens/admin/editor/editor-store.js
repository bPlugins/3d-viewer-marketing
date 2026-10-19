// Editor-local store (port of src/admin/editor/store/*): working copies of the product default
// and its variation configs, dirty tracking against the saved baselines, undo/redo, selection.
// Writes to the global store only on save() and on "Reset variation" (an immediate server DELETE).
import { useState, useEffect, useRef } from '../../../core/ui.js';
import { store } from '../../../core/store.js';
import { defaultConfig, resolveEffectiveConfig, patchMaterialConfig, legacyMaterialKey } from '../../../shared/effective-config.js';
import { modelOf } from '../../../shared/product-3d.js';
import { MODEL_INFO } from '../../../engine/demo-models.js';

const HISTORY_LIMIT = 50;
const COALESCE_MS = 400;
const LOAD_MS = 450;
const SAVE_MS = 700;

/** Shared blank variation config; never mutated, so identity stays stable for memoised selectors. */
export const EMPTY_VARIATION = Object.freeze({ schema_version: 1 });

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Structural equality where null, undefined and a missing key all mean "unset" (store/helpers.ts). */
export function isEqualValue(a, b) {
	if (a === b || (a ?? null) === (b ?? null)) return true;
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
		return a.every((v, i) => isEqualValue(v, b[i]));
	}
	for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!isEqualValue(a[k], b[k])) return false;
	return true;
}

// Boolean-only patches (toggles) are discrete and never time-coalesced.
function coalesceKey(section, patch) {
	const values = Object.values(patch || {});
	if (values.length > 0 && values.every((v) => typeof v === 'boolean')) return null;
	return `${section}:${Object.keys(patch || {}).sort().join(',')}`;
}

const stripUndefined = (obj) => {
	const out = { ...obj };
	for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
	return out;
};

/** "Sand", "Red / Large", or "#123" when the variation has no attributes. */
export function variationLabel(v) {
	const opts = Object.values(v?.attributes || {});
	return opts.length ? opts.join(' / ') : `#${v?.id}`;
}

/** First attribute name of a variation ('' when none). */
export const variationAttributeName = (v) => Object.keys(v?.attributes || {})[0] || '';

// ── State ─────────────────────────────────────────────────────────────────────

const blank = () => ({
	productId: 0,
	loadStatus: 'idle', // 'idle' | 'loading' | 'ready' | 'missing'
	view: 'overview',
	target: 'default',
	attachmentId: 0, // the product's default GLB (_wc3d_model_id)
	base: { model_id: 0, config: defaultConfig() },
	variations: {},
	saved: { base: { model_id: 0, config: defaultConfig() }, variations: {} },
	selection: [],
	selectionName: null,
	selectionIsGroup: false,
	placingHotspot: false,
	status: 'idle',
	saveError: '',
	dirty: false,
	dirtyDefault: false,
	dirtyVariationIds: [],
	dirtyCount: 0,
	past: [],
	future: [],
	canUndo: false,
	canRedo: false,
	viewer: null,
	modelInfo: null,
	modelKey: '',
});

let state = blank();
const subs = new Set();
let loadTimer = 0;
let saveSeq = 0;
let writing = false; // our own global-store writes must not trigger refresh()

function derive(prev, next) {
	if (next.base !== prev.base || next.variations !== prev.variations || next.saved !== prev.saved) {
		const dirtyDefault = !isEqualValue(next.base.config, next.saved.base.config);
		const ids = new Set([...Object.keys(next.variations), ...Object.keys(next.saved.variations)].map(Number));
		const dirtyVariationIds = [];
		for (const id of ids) {
			const rec = next.variations[id];
			const sv = next.saved.variations[id];
			if ((rec?.model_id ?? 0) !== (sv?.model_id ?? 0) || !isEqualValue(rec?.config ?? EMPTY_VARIATION, sv?.config ?? EMPTY_VARIATION)) dirtyVariationIds.push(id);
		}
		next.dirtyDefault = dirtyDefault;
		next.dirtyVariationIds = isEqualValue(dirtyVariationIds, prev.dirtyVariationIds) ? prev.dirtyVariationIds : dirtyVariationIds;
		next.dirtyCount = (dirtyDefault ? 1 : 0) + dirtyVariationIds.length;
		next.dirty = next.dirtyCount > 0;
	}
	next.canUndo = next.past.length > 0;
	next.canRedo = next.future.length > 0;
	// The model (and its mesh list) follows the active target.
	const m = activeModelOf(next);
	const key = m.model ? m.model.demo || m.model.url : '';
	if (key !== prev.modelKey || next.productId !== prev.productId) {
		next.modelKey = key;
		const demo = m.attachment?.demo;
		next.modelInfo = demo && MODEL_INFO[demo] ? { ...MODEL_INFO[demo] } : null;
	}
	return next;
}

function set(patch) {
	const prev = state;
	state = derive(prev, { ...prev, ...patch });
	subs.forEach((f) => f(state));
}

// ── History (historySlice.ts) ─────────────────────────────────────────────────

let lastKey = null;
let lastAt = 0;
let inTask = false;
const breakCoalescing = () => {
	lastKey = null;
	lastAt = 0;
	inTask = false;
};
const snapshot = (s) => ({ base: s.base, variations: s.variations });
const push = (list, snap) => {
	const next = [...list, snap];
	return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
};

function record(key) {
	const now = performance.now();
	const merge = state.past.length > 0 && (inTask || (key !== null && key === lastKey && now - lastAt < COALESCE_MS));
	lastKey = key;
	lastAt = now;
	if (!inTask) {
		inTask = true;
		queueMicrotask(() => (inTask = false));
	}
	return merge ? {} : { past: push(state.past, snapshot(state)), future: [] };
}

const resetHistory = () => {
	breakCoalescing();
	return { past: [], future: [] };
};

// ── Model / variation lookups ─────────────────────────────────────────────────

const g = () => store.get();

function activeModelOf(s) {
	const own = s.target !== 'default' ? Number(s.variations[s.target]?.model_id) || 0 : 0;
	const hasOwnModel = !!own && own !== s.attachmentId;
	const id = hasOwnModel ? own : s.attachmentId;
	const attachment = id ? g().attachments?.[id] || null : null;
	return { attachmentId: id, attachment, model: modelOf(attachment), hasOwnModel };
}

/** WooCommerce variations of the product, in product order. */
function wcVariationsOf(pid) {
	const gs = g();
	return (gs.products?.[pid]?.variations || []).map((id) => gs.variations?.[id]).filter(Boolean);
}

function loadFromGlobal(pid) {
	const gs = g();
	const product = gs.products?.[pid];
	const attachmentId = Number(product?.meta?._wc3d_model_id) || 0;
	const base = { model_id: attachmentId, config: gs.productConfigs?.[pid]?.config || defaultConfig() };
	const variations = {};
	for (const vid of product?.variations || []) {
		const rec = gs.variationConfigs?.[vid];
		if (rec) variations[vid] = { model_id: Number(rec.model_id) || 0, config: rec.config || { schema_version: 1 } };
	}
	return { attachmentId, base, variations, saved: { base, variations } };
}

// ── Edits ─────────────────────────────────────────────────────────────────────

const onVariation = () => state.target !== 'default';

function raw() {
	return onVariation() ? state.variations[state.target]?.config ?? EMPTY_VARIATION : state.base.config;
}

/** Runs produce(activeConfig, onVariation) and writes the result to the active target as one history step. */
function edit(key, produce, extra = {}) {
	if (state.loadStatus !== 'ready') return;
	const onVar = onVariation();
	const cur = raw();
	const next = produce(cur, onVar);
	if (!next || next === cur) return;
	const scoped = key === null ? null : `${onVar ? 'v' + state.target : 'default'}:${key}`;
	const hist = record(scoped);
	if (onVar) {
		const id = state.target;
		const rec = state.variations[id];
		// An untouched variation without a record must not gain one (it would show as linked).
		if (!rec && isEqualValue(next, EMPTY_VARIATION)) return;
		set({ variations: { ...state.variations, [id]: { model_id: rec?.model_id ?? 0, config: next } }, ...hist, ...extra });
	} else {
		set({ base: { ...state.base, config: next }, ...hist, ...extra });
	}
}

const clearedValue = (onVar) => (onVar ? null : undefined);
const withSection = (cfg, section, value) => {
	const next = { ...cfg };
	if (value === undefined) delete next[section];
	else next[section] = value;
	return next;
};

let effMemo = null;

function hotspotsKey(prev, next) {
	if (prev.length !== next.length || prev.some((h, i) => h.id !== next[i]?.id)) return null;
	const changed = [];
	next.forEach((h, i) => {
		const p = prev[i];
		if (p === h) return;
		const fields = [...new Set([...Object.keys(p), ...Object.keys(h)])].filter((k) => !isEqualValue(p[k], h[k]));
		if (fields.length) changed.push(`${h.id}:${fields.sort().join(',')}`);
	});
	return changed.length ? 'hotspots:' + changed.join('|') : null;
}

function wait(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

// ── Public API (ARCHITECTURE.md "Editor store") ───────────────────────────────

export const editor = {
	get: () => state,
	subscribe(f) {
		subs.add(f);
		return () => subs.delete(f);
	},

	/** Load the product into the editor (simulated REST round-trip). `keep` keeps unsaved edits of the same product. */
	init(productId, { keep = true } = {}) {
		const pid = Number(productId) || 0;
		if (keep && state.productId === pid && state.loadStatus === 'ready' && (state.dirty || state.status === 'saving')) return;
		clearTimeout(loadTimer);
		effMemo = null;
		breakCoalescing();
		const product = g().products?.[pid];
		if (!product) {
			state = blank();
			set({ productId: pid, loadStatus: 'missing' });
			return;
		}
		const viewer = state.productId === pid ? state.viewer : null;
		state = blank();
		set({ productId: pid, loadStatus: 'loading', viewer, ...loadFromGlobal(pid) });
		loadTimer = setTimeout(() => {
			if (state.productId === pid) set({ loadStatus: 'ready' });
		}, LOAD_MS);
	},

	/** Re-read saved data from the global store without touching view/target (used when demo data changes elsewhere). */
	refresh() {
		if (!state.productId || state.dirty || state.status === 'saving') return;
		const next = loadFromGlobal(state.productId);
		if (isEqualValue(next.saved, state.saved) && next.attachmentId === state.attachmentId) return;
		set({ ...next, ...resetHistory() });
	},

	/** Drop unsaved edits (what a page reload does in wp-admin). */
	discard() {
		if (!state.productId) return;
		const view = state.view;
		const target = state.target;
		set({ ...loadFromGlobal(state.productId), ...resetHistory(), selection: [], selectionName: null, selectionIsGroup: false, status: 'idle', saveError: '', view, target });
	},

	raw,
	/** Resolved config the viewport shows (storefront resolution, no product background). */
	effective() {
		const base = state.base.config;
		if (!onVariation()) return base;
		const variation = raw();
		const own = activeModelOf(state).hasOwnModel;
		if (effMemo && effMemo.base === base && effMemo.variation === variation && effMemo.own === own) return effMemo.result;
		const result = resolveEffectiveConfig(base, variation, own);
		effMemo = { base, variation, own, result };
		return result;
	},

	/** Merge `patch` into a section of the active target; null clears it (default: key dropped, variation: null = inherit). */
	patch(section, patch) {
		edit(patch === null ? null : coalesceKey(section, patch), (cfg, onVar) => {
			if (patch === null) return withSection(cfg, section, clearedValue(onVar));
			const cur = cfg[section] && typeof cfg[section] === 'object' && !Array.isArray(cfg[section]) ? cfg[section] : {};
			return withSection(cfg, section, stripUndefined({ ...cur, ...patch }));
		});
	},

	/** Store `value` as the whole section (camera presets, Clear view). undefined drops the key. */
	replace(section, value) {
		edit(null, (cfg) => withSection(cfg, section, value));
	},

	patchMeshes(names, patch) {
		const list = (Array.isArray(names) ? names : [names]).filter(Boolean);
		if (!list.length) return;
		edit(coalesceKey('meshes', patch), (cfg) => {
			const meshes = { ...(cfg.meshes || {}) };
			for (const n of list) meshes[n] = stripUndefined({ ...(meshes[n] || {}), ...patch });
			return { ...cfg, meshes };
		});
	},

	patchMaterials(names, patch) {
		const list = (Array.isArray(names) ? names : [names]).filter(Boolean);
		if (!list.length) return;
		const known = state.viewer?.getMeshNames?.() || state.modelInfo?.meshes || [];
		edit(coalesceKey('materials', patch), (cfg) => {
			let materials = cfg.materials;
			for (const n of list) {
				materials = patchMaterialConfig(materials, n, patch, known);
				materials[n] = stripUndefined(materials[n]);
			}
			return { ...cfg, materials };
		});
	},

	/** Hotspot list of the active target: own list, else (variation) the default's. */
	hotspots() {
		const own = raw().hotspots;
		if (own) return own;
		return onVariation() ? state.base.config.hotspots || [] : [];
	},

	/** setHotspots(list) or setHotspots(list => next). A variation without its own list starts from the default's. */
	setHotspots(listOrFn) {
		const cur = editor.hotspots();
		const next = typeof listOrFn === 'function' ? listOrFn(cur) : listOrFn;
		if (!Array.isArray(next)) return;
		edit(hotspotsKey(cur, next), (cfg) => ({ ...cfg, hotspots: next }));
	},

	addHotspot(h) {
		editor.setHotspots((list) => [...list, h]);
	},
	removeHotspot(id) {
		editor.setHotspots((list) => list.filter((h) => h.id !== id));
	},
	updateHotspot(id, patch) {
		editor.setHotspots((list) => list.map((h) => (h.id === id ? stripUndefined({ ...h, ...patch }) : h)));
	},

	/** Merge gallery presets by key; a null value deletes a key; an empty map clears the section. */
	patchGallery(map) {
		edit(null, (cfg, onVar) => {
			if (map === null) return withSection(cfg, 'gallery_presets', clearedValue(onVar));
			const merged = { ...(cfg.gallery_presets || {}), ...map };
			for (const k of Object.keys(merged)) if (merged[k] == null) delete merged[k];
			return withSection(cfg, 'gallery_presets', Object.keys(merged).length ? merged : clearedValue(onVar));
		});
	},

	/** Replace the whole active config (Import & Export). */
	importConfig(cfg) {
		edit(null, () => cfg);
	},

	/** Own GLB for the active variation; 0 = inherit the product model. */
	setVariationModel(attachmentId) {
		if (!onVariation() || state.loadStatus !== 'ready') return;
		const id = state.target;
		const rec = state.variations[id];
		const mid = Number(attachmentId) || 0;
		if ((rec?.model_id ?? 0) === mid && rec) return;
		set({
			variations: { ...state.variations, [id]: { model_id: mid, config: rec?.config ?? EMPTY_VARIATION } },
			selection: [],
			selectionName: null,
			selectionIsGroup: false,
			...record(null),
		});
	},

	/** Drop one mesh/material override key from the active variation (left-panel X). */
	removeOverride(key) {
		if (!onVariation()) return;
		const known = state.viewer?.getMeshNames?.() || state.modelInfo?.meshes || [];
		edit(null, (cfg) => {
			const meshes = { ...(cfg.meshes || {}) };
			const materials = { ...(cfg.materials || {}) };
			let changed = false;
			if (key in meshes) {
				delete meshes[key];
				changed = true;
			}
			for (const k of [key, legacyMaterialKey(key)]) {
				if (k in materials && (k === key || !known.includes(k))) {
					delete materials[k];
					changed = true;
				}
			}
			return changed ? { ...cfg, meshes, materials } : null;
		});
	},

	/** "Clear all": the variation config becomes {schema_version:1}; model_id is kept. */
	clearOverrides() {
		if (!onVariation()) return;
		edit(null, () => ({ schema_version: 1 }));
	},

	/** Attribute Auto-Map: visibility overrides per option, one undo step (configSlice.applyAutoMeshMap). */
	applyAutoMap(attributeName, mapping, exclusive) {
		if (state.loadStatus !== 'ready') return;
		const next = { ...state.variations };
		const all = Object.values(mapping).flat();
		let changed = 0;
		for (const v of wcVariationsOf(state.productId)) {
			const option = v.attributes?.[attributeName];
			if (option === undefined || option === '') continue;
			const rec = state.variations[v.id];
			if (rec && rec.model_id > 0 && rec.model_id !== state.attachmentId) continue;
			const active = mapping[option] || [];
			const config = { ...(rec?.config ?? EMPTY_VARIATION) };
			const meshes = { ...(config.meshes || {}) };
			if (exclusive) for (const n of all) meshes[n] = { ...(meshes[n] || {}), visible: active.includes(n) };
			else for (const n of active) meshes[n] = { ...(meshes[n] || {}), visible: true };
			config.meshes = meshes;
			next[v.id] = { model_id: rec?.model_id ?? 0, config };
			changed++;
		}
		if (!changed) return;
		set({ variations: next, ...record(null) });
	},

	/** One whole-value config key on several variations ({vid: value}; undefined = inherit), one undo step (materials-variants). */
	setVariationKey(key, values) {
		if (state.loadStatus !== 'ready') return;
		const next = { ...state.variations };
		let changed = 0;
		for (const [vid, value] of Object.entries(values || {})) {
			const rec = state.variations[vid];
			const config = { ...(rec?.config ?? EMPTY_VARIATION) };
			if (value === undefined) delete config[key];
			else config[key] = value;
			if (isEqualValue(config, rec?.config ?? EMPTY_VARIATION)) continue;
			// Back to nothing on a variation that had no saved row: drop the draft row too.
			if (isEqualValue(config, EMPTY_VARIATION) && !(rec?.model_id > 0) && !state.saved.variations[vid]) delete next[vid];
			else next[vid] = { model_id: rec?.model_id ?? 0, config };
			changed++;
		}
		if (!changed) return;
		set({ variations: next, ...record(null) });
	},

	/** select(names, {additive, name, isGroup}). Additive toggles meshes in/out (shift-click). */
	select(names, opts = {}) {
		let list = names == null ? [] : (Array.isArray(names) ? names : [names]).filter(Boolean);
		let name = opts.name ?? null;
		let isGroup = !!opts.isGroup;
		if (opts.additive && list.length) {
			const cur = new Set(state.selectionIsGroup ? [] : state.selection);
			for (const n of list) cur.has(n) ? cur.delete(n) : cur.add(n);
			list = [...cur];
			name = null;
			isGroup = false;
		}
		if (name === null) name = list.length === 1 ? list[0] : null;
		if (!list.length && !isGroup) name = null;
		set({ selection: list, selectionName: name, selectionIsGroup: isGroup });
	},

	setPlacingHotspot(on) {
		set({ placingHotspot: !!on });
	},

	undo() {
		step('undo');
	},
	redo() {
		step('redo');
	},
	/** Group edits explicitly (slider drags already coalesce by key + 400 ms). */
	beginTransaction() {},
	commitTransaction() {
		breakCoalescing();
	},

	async save() {
		if (state.loadStatus !== 'ready' || state.status === 'saving') return;
		const seq = ++saveSeq;
		const pid = state.productId;
		const sent = { base: state.base, variations: state.variations, dirtyDefault: state.dirtyDefault, ids: state.dirtyVariationIds.slice() };
		set({ status: 'saving', saveError: '' });
		await wait(SAVE_MS);
		if (seq !== saveSeq || state.productId !== pid) return;
		writing = true;
		store.set((gs) => {
			let productConfigs = gs.productConfigs;
			if (sent.dirtyDefault) productConfigs = { ...productConfigs, [pid]: { model_id: state.attachmentId, config: sent.base.config } };
			const variationConfigs = { ...gs.variationConfigs };
			for (const id of sent.ids) {
				const rec = sent.variations[id];
				if (rec) variationConfigs[id] = { model_id: rec.model_id, config: rec.config };
				else delete variationConfigs[id];
			}
			return { ...gs, productConfigs, variationConfigs };
		});
		writing = false;
		const savedVars = { ...state.saved.variations };
		for (const id of sent.ids) {
			if (sent.variations[id]) savedVars[id] = sent.variations[id];
			else delete savedVars[id];
		}
		breakCoalescing();
		// Edits made while saving stay dirty: the baseline is what was sent.
		set({ saved: { base: sent.dirtyDefault ? sent.base : state.saved.base, variations: savedVars }, status: 'saved' });
	},

	/** Reset default (in memory, one undo step) or Reset variation (immediate server delete, no undo entry). */
	resetTarget() {
		if (state.loadStatus !== 'ready') return;
		if (!onVariation()) {
			edit(null, () => defaultConfig(), { selection: [], selectionName: null, selectionIsGroup: false });
			return;
		}
		const id = state.target;
		writing = true;
		store.set((gs) => {
			if (!gs.variationConfigs?.[id]) return gs;
			const variationConfigs = { ...gs.variationConfigs };
			delete variationConfigs[id];
			return { ...gs, variationConfigs };
		});
		writing = false;
		const variations = { ...state.variations };
		delete variations[id];
		const savedVars = { ...state.saved.variations };
		delete savedVars[id];
		breakCoalescing();
		set({ variations, saved: { ...state.saved, variations: savedVars }, status: 'idle', saveError: '' });
	},

	/** Open the editor view on a target ('default' or a variation id). Resets undo history and selection. */
	openTarget(target) {
		const t = target === 'default' || target == null || target === 0 ? 'default' : Number(target);
		set({ target: t, view: 'editor', selection: [], selectionName: null, selectionIsGroup: false, placingHotspot: false, ...resetHistory() });
	},

	setView(view) {
		if (view === 'editor') return editor.openTarget(state.target);
		set({
			view: 'overview',
			target: 'default',
			selection: [],
			selectionName: null,
			selectionIsGroup: false,
			placingHotspot: false,
			...(state.status === 'saving' ? {} : { status: state.status === 'error' ? 'idle' : state.status, saveError: '' }),
			...resetHistory(),
		});
	},

	setViewer(controller) {
		const patch = { viewer: controller || null };
		const info = controller?.getModelInfo?.();
		if (info) patch.modelInfo = { ...(state.modelInfo || {}), ...info };
		set(patch);
	},

	setModelInfo(info) {
		if (info) set({ modelInfo: { ...(state.modelInfo || {}), ...info } });
	},

	// ── Read helpers for the shell and panels ──
	activeModel: () => activeModelOf(state),
	hasOwnModel: () => activeModelOf(state).hasOwnModel,
	wcVariations: () => wcVariationsOf(state.productId),
	variation: (id) => g().variations?.[id] || null,
	targetLabel() {
		return onVariation() ? variationLabel(g().variations?.[state.target] || { id: state.target }) : '';
	},
	isVariationDirty: (id) => state.dirtyVariationIds.includes(Number(id)),
};

function step(direction) {
	const source = direction === 'undo' ? state.past : state.future;
	if (!source.length) return;
	const snap = direction === 'undo' ? source[source.length - 1] : source[0];
	const current = snapshot(state);
	breakCoalescing();
	set({
		base: snap.base,
		variations: snap.variations,
		...(direction === 'undo'
			? { past: state.past.slice(0, -1), future: [current, ...state.future] }
			: { past: push(state.past, current), future: state.future.slice(1) }),
	});
}

// Keep in sync with saved data changed outside the editor (e.g. "Reset demo data") while nothing is unsaved.
store.subscribe(() => {
	if (!writing && state.loadStatus === 'ready') editor.refresh();
});

const shallowEqual = (a, b) => {
	if (Object.is(a, b)) return true;
	if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
	if (Array.isArray(a) !== Array.isArray(b)) return false;
	const ka = Object.keys(a);
	if (ka.length !== Object.keys(b).length) return false;
	return ka.every((k) => Object.is(a[k], b[k]));
};

/** Re-render when selector(state) changes (shallow compare). */
export function useEditor(selector = (s) => s) {
	const [, force] = useState(0);
	const sel = useRef(selector);
	sel.current = selector;
	const val = useRef();
	val.current = selector(state);
	useEffect(
		() =>
			editor.subscribe((s) => {
				const next = sel.current(s);
				if (!shallowEqual(next, val.current)) force((n) => n + 1);
			}),
		[]
	);
	return val.current;
}

export default editor;
