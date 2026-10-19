// Editor session: a draft of the product default + option-value rules ("Size=Wide") + variant exceptions,
// per-target undo/redo, and save/publish.
// Edit rules follow resolveEffectiveConfig: meshes/materials entry-level, environment/optimization/ar field-level, the rest whole value.
import { useState, useEffect } from '../../../js/core/ui.js';
import { getMaterialConfig, defaultConfig } from '../../../js/shared/effective-config.js';
import { store } from '../../core/store.js';
import { nowStr, ruleKey, rulesFor, resolveLayers, layerModelId } from '../../core/commerce.js';
import { toast } from '../../ui/polaris.js';

const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
const EMPTY = () => ({ schema_version: 1 });
const HISTORY_CAP = 50;
const COALESCE_MS = 800;

let st = null;
const subs = new Set();

function set(patch) {
	st = { ...st, ...patch };
	subs.forEach((f) => f(st));
}

function stripUndefined(o) {
	const out = {};
	for (const [k, v] of Object.entries(o || {})) if (v !== undefined) out[k] = v;
	return out;
}

/** Start (or keep) the session for a product. Unsaved edits survive a remount of the same product. */
export function initEditor(pid, vid) {
	if (st && st.pid === pid && isDirty()) {
		st = { ...st, ctl: null, placing: false, preview: {}, target: vid && st.draft.variants[vid] ? Number(vid) : st.target };
		return;
	}
	const s = store.get();
	const cfg = s.configs[pid] || {};
	const variants = {};
	for (const id of s.products[pid]?.variants || []) {
		const vc = s.variantConfigs[id];
		variants[id] = vc ? { modelFileId: vc.modelFileId ?? null, config: clone(vc.config) || EMPTY() } : { modelFileId: null, config: EMPTY() };
	}
	const rules = {};
	for (const o of s.products[pid]?.options || []) {
		for (const val of o.values) {
			const r = cfg.optionRules?.[ruleKey(o.name, val)];
			rules[ruleKey(o.name, val)] = r ? { modelFileId: r.modelFileId ?? null, config: clone(r.config) || EMPTY() } : { modelFileId: null, config: EMPTY() };
		}
	}
	const draft = { modelFileId: cfg.modelFileId ?? null, base: clone(cfg.config) || defaultConfig(), rules, variants };
	st = {
		pid,
		target: vid && variants[vid] ? Number(vid) : 'default',
		draft,
		saved: JSON.stringify(draft),
		history: {},
		lastKey: null,
		lastAt: 0,
		selection: null,
		placing: false,
		hotspotSel: null,
		preview: {},
		sample: {},
		ctl: null,
		meshNames: [],
		hierarchy: [],
		clips: [],
		phase: 'idle',
	};
}

export const getEd = () => st;
export const isDirty = (s = st) => !!s && JSON.stringify(s.draft) !== s.saved;
/** Any layer over the default: an option-value rule or a variant. */
export const onVariant = (s = st) => s.target !== 'default';
const RULE = 'rule:';
export const isRule = (t) => typeof t === 'string' && t.startsWith(RULE);
export const ruleTarget = (key) => RULE + key;
const layerAt = (t, d) => (t === 'default' ? null : isRule(t) ? d.rules?.[t.slice(RULE.length)] : d.variants[t]);
const withLayer = (d, t, layer) => (isRule(t) ? { ...d, rules: { ...d.rules, [t.slice(RULE.length)]: layer } } : { ...d, variants: { ...d.variants, [t]: layer } });
export const currentLayer = (s = st) => layerAt(s.target, s.draft);
export const rawConfig = (s = st) => (onVariant(s) ? currentLayer(s).config : s.draft.base);
export const ownModel = (s = st) => !!currentLayer(s)?.modelFileId;

/** "Size: Wide" / "Teal / Wide" / "Default": what the active target is called in copy. */
export function targetLabel(s = st) {
	if (!onVariant(s)) return 'Default';
	if (isRule(s.target)) return s.target.slice(RULE.length).replace('=', ': ');
	return store.get().variants[s.target]?.title || 'Variant';
}

/** A variant to preview the active target with (price, conditions): the variant itself, else the first that has the rule's value. */
export function targetVariantId(s0, s = st) {
	const ids = s0.products[s.pid]?.variants || [];
	if (!onVariant(s)) return ids[0];
	if (!isRule(s.target)) return s.target;
	const [name, value] = s.target.slice(RULE.length).split('=');
	return ids.find((id) => s0.variants[id]?.options?.[name] === value) ?? ids[0];
}

function layersFor(s) {
	const s0 = store.get();
	if (isRule(s.target)) return { rules: [{ layer: currentLayer(s) }], variant: null };
	const p = s0.products[s.pid];
	return { rules: rulesFor(p, s0.variants[s.target], s.draft.rules), variant: currentLayer(s) };
}

let memo = null;
/** Effective config of the active target (what the viewer and the storefront show). */
export function effective(s = st) {
	if (!onVariant(s)) return s.draft.base;
	if (memo && memo.base === s.draft.base && memo.rules === s.draft.rules && memo.variants === s.draft.variants && memo.t === s.target) return memo.out;
	const { rules, variant } = layersFor(s);
	const out = resolveLayers(s.draft.base, rules, variant);
	memo = { base: s.draft.base, rules: s.draft.rules, variants: s.draft.variants, t: s.target, out };
	return out;
}

/** Model file of the active target: variant's own GLB, else an option rule's, else the product's. */
export function activeFile(s0, s = st) {
	if (!onVariant(s)) return s0.files[s.draft.modelFileId] || null;
	const { rules, variant } = layersFor(s);
	return s0.files[layerModelId(s.draft.modelFileId, rules, variant)] || null;
}

/** The model the active target gets when it sets none itself (product's, or an option rule's for a variant). */
export function inheritedFile(s0, s = st) {
	if (!onVariant(s) || isRule(s.target)) return s0.files[s.draft.modelFileId] || null;
	return s0.files[layerModelId(s.draft.modelFileId, layersFor(s).rules, null)] || null;
}

export function hasOverride(v) {
	return !!v && (!!v.modelFileId || Object.keys(v.config || {}).some((k) => k !== 'schema_version'));
}

/* ---------- history ---------- */

function snapshot(t) {
	const d = st.draft;
	return t === 'default' ? { modelFileId: d.modelFileId, config: d.base } : layerAt(t, d);
}

function restore(t, snap) {
	const d = st.draft;
	return t === 'default' ? { ...d, modelFileId: snap.modelFileId, base: snap.config } : withLayer(d, t, snap);
}

function commit(draft, key) {
	const t = st.target;
	const now = performance.now();
	const h = st.history[t] || { past: [], future: [] };
	const coalesce = key && key === st.lastKey && now - st.lastAt < COALESCE_MS;
	const past = coalesce ? h.past : [...h.past, snapshot(t)].slice(-HISTORY_CAP);
	set({ draft, history: { ...st.history, [t]: { past, future: [] } }, lastKey: key, lastAt: now });
}

/** Replace the active target's raw config via produce(cur, onVariant) → next. */
function edit(key, produce) {
	const t = st.target;
	const d = st.draft;
	const cur = rawConfig();
	const next = produce(cur, t !== 'default');
	if (!next || next === cur) return;
	commit(t === 'default' ? { ...d, base: next } : withLayer(d, t, { ...layerAt(t, d), config: next }), key);
}

export function canUndo() {
	return !!st.history[st.target]?.past.length;
}
export function canRedo() {
	return !!st.history[st.target]?.future.length;
}

export function undo() {
	const t = st.target;
	const h = st.history[t];
	if (!h?.past.length) return;
	const prev = h.past[h.past.length - 1];
	const cur = snapshot(t);
	set({ draft: restore(t, prev), history: { ...st.history, [t]: { past: h.past.slice(0, -1), future: [cur, ...h.future] } }, lastKey: null });
}

export function redo() {
	const t = st.target;
	const h = st.history[t];
	if (!h?.future.length) return;
	const [next, ...rest] = h.future;
	const cur = snapshot(t);
	set({ draft: restore(t, next), history: { ...st.history, [t]: { past: [...h.past, cur], future: rest } }, lastKey: null });
}

/* ---------- edits ---------- */

/** Field-level sections (environment, optimization, ar): a variant stores only the changed fields. */
export function patchSection(section, patch, key = section) {
	edit(key, (cfg) => ({ ...cfg, [section]: stripUndefined({ ...(cfg[section] || {}), ...patch }) }));
}

/** Whole-value sections (camera, hotspots, options, decals, animations, gallery_presets). */
export function setWhole(section, valueOrFn, key = null) {
	edit(key, (cfg, onVar) => {
		const cur = cfg[section] ?? (onVar ? effective()[section] : undefined);
		const next = typeof valueOrFn === 'function' ? valueOrFn(clone(cur)) : valueOrFn;
		return { ...cfg, [section]: next };
	});
}

/** Entry-level meshes/materials: a variant entry carries the full merged entry (it replaces the default's). */
export function patchEntry(section, name, patch, key = `${section}.${name}`) {
	edit(key, (cfg, onVar) => {
		const known = st.meshNames;
		const fromEff = onVar ? (section === 'materials' ? getMaterialConfig(effective().materials, name, known) : effective().meshes?.[name]) : undefined;
		const cur = cfg[section]?.[name] ?? fromEff ?? {};
		return { ...cfg, [section]: { ...(cfg[section] || {}), [name]: stripUndefined({ ...cur, ...patch }) } };
	});
}

/** Variant only: drop overridden keys so they inherit the default again. */
export function clearOverride(keys, entry) {
	if (!onVariant()) return;
	edit(null, (cfg) => {
		const next = { ...cfg };
		for (const k of keys) {
			if (entry && next[k]) {
				const m = { ...next[k] };
				delete m[entry];
				next[k] = m;
				if (!Object.keys(m).length) delete next[k];
			} else delete next[k];
		}
		return next;
	});
}

export function setModelFile(fileId) {
	const t = st.target;
	const d = st.draft;
	const id = fileId ? Number(fileId) : null;
	if (t === 'default') {
		if (d.modelFileId === id) return;
		commit({ ...d, modelFileId: id }, null);
	} else {
		if ((layerAt(t, d).modelFileId ?? null) === id) return;
		commit(withLayer(d, t, { ...layerAt(t, d), modelFileId: id }), null);
	}
	set({ selection: null });
}

export function resetVariant() {
	const t = st.target;
	if (t === 'default' || !hasOverride(layerAt(t, st.draft))) return;
	commit(withLayer(st.draft, t, { modelFileId: null, config: EMPTY() }), null);
}

/** Import & export: replace the active target's config. */
export function importConfig(cfg) {
	edit(null, () => clone(cfg));
}

/* ---------- view state (not saved) ---------- */

export function setTarget(t) {
	if (t !== 'default' && !layerAt(t, st.draft)) return;
	set({ target: t, placing: false, preview: {}, lastKey: null });
}
export const select = (name) => set({ selection: name || null });
export const setPlacing = (on) => set({ placing: !!on });
export const setHotspotSel = (id) => set({ hotspotSel: id });
export const setPreview = (preview) => set({ preview });
export const setSample = (sample) => set({ sample });
export function setViewer(ctl) {
	set({ ctl, meshNames: ctl.getMeshNames(), hierarchy: ctl.getHierarchy(), clips: ctl.getAnimations?.() || [] });
}

/* ---------- save / discard ---------- */

export function save() {
	if (st.phase !== 'idle') return;
	const pid = st.pid;
	const draft = st.draft;
	set({ phase: 'publishing' });
	// Postgres write, then the storefront metafields ($app.render) are republished.
	setTimeout(() => {
		const t = nowStr();
		store.set((s0) => {
			const variantConfigs = { ...s0.variantConfigs };
			for (const [vid, v] of Object.entries(draft.variants)) {
				if (!hasOverride(v) && !variantConfigs[vid]) continue;
				variantConfigs[vid] = clone(v);
			}
			const optionRules = {};
			for (const [k, r] of Object.entries(draft.rules || {})) if (hasOverride(r)) optionRules[k] = clone(r);
			const prev = s0.configs[pid] || { enabled: true, customizer: 'inherit' };
			return { ...s0, configs: { ...s0.configs, [pid]: { ...prev, modelFileId: draft.modelFileId, config: clone(draft.base), optionRules, updatedAt: t, publishedAt: t } }, variantConfigs };
		});
		if (st && st.pid === pid) set({ saved: JSON.stringify(draft), phase: 'idle' });
		toast('Saved · published to storefront');
	}, 900);
}

export function discard() {
	set({ draft: JSON.parse(st.saved), history: {}, lastKey: null, placing: false, preview: {} });
}

/** Unique id within a list: base-1, base-2… (no time-based ids). */
export function uniqueId(base, taken) {
	const slug =
		String(base || 'item')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'item';
	if (!taken.includes(slug)) return slug;
	let n = 2;
	while (taken.includes(`${slug}-${n}`)) n++;
	return `${slug}-${n}`;
}

/** Re-render on every editor change. */
export function useEd() {
	const [, force] = useState(0);
	useEffect(() => {
		const f = () => force((n) => n + 1);
		subs.add(f);
		return () => subs.delete(f);
	}, []);
	return st;
}
