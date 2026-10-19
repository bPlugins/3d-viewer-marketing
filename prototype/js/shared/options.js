// Option groups and option pricing: the "server" every screen shares (PHP twin to build:
// includes/Domain/OptionPricing.php). Prices are always recomputed here from the saved config;
// the shopper layer only carries choices. Spec: prototype/specs/customizer-commerce.md.
import { money } from '../core/ui.js';
import { isOn } from '../core/features.js';
import { getMaterialConfig } from './effective-config.js';
import { effectiveFor, viewerSettingsFor } from './product-3d.js';
import { hasDecalEntries, withDecals, hasDecalRules, decalLines, decalErrorsFor } from './decals.js';

export const RULE_TYPES = { fixed: 'Fixed amount', percent: 'Percent of price' };
export const GROUP_TYPES = { color: 'Colour', material: 'Material', parts: 'Parts' };
export const GROUP_DISPLAYS = { swatch: 'Swatches', thumbnail: 'Thumbnails', button: 'Buttons', dropdown: 'Dropdown' };

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const lc = (s) => String(s ?? '').trim().toLowerCase();
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const partName = (mesh) => String(mesh).replace(/_/g, ' ').replace(/(^|\s)(\S)/g, (m, sp, ch) => sp + ch.toUpperCase());

/** Prototype flags for the two features; call sites pass them on so tests can force either mode. */
export function optionFlags() {
	return { pricing: isOn('option-pricing'), groups: isOn('option-groups') };
}

// ── Price rules: { type: 'fixed' | 'percent', amount, sale? } ───────────────

export function normalizeRule(rule) {
	if (!isObj(rule)) return null;
	const amount = Number(rule.amount);
	if (rule.amount === '' || rule.amount == null || !Number.isFinite(amount)) return null;
	const sale = rule.sale === '' || rule.sale == null ? NaN : Number(rule.sale);
	return { type: rule.type === 'percent' ? 'percent' : 'fixed', amount, ...(Number.isFinite(sale) ? { sale } : {}) };
}

/** Charged amount on a base price. Sale wins when set; percent is of the base (variation) price. */
export function ruleAmount(rule, base) {
	const r = normalizeRule(rule);
	if (!r) return 0;
	const v = r.sale ?? r.amount;
	return round2(r.type === 'percent' ? ((Number(base) || 0) * v) / 100 : v);
}

/** Regular amount when a sale is set (for the struck-through badge), else null. */
export function ruleRegular(rule, base) {
	const r = normalizeRule(rule);
	if (!r || r.sale == null) return null;
	return round2(r.type === 'percent' ? ((Number(base) || 0) * r.amount) / 100 : r.amount);
}

/** '+$15.00' / '−$12.00' / '' for zero. */
export function formatDelta(n) {
	const v = round2(n);
	if (!v) return '';
	return (v > 0 ? '+' : '−') + money(Math.abs(v));
}

// ── Option pricing on the plain customizer list (config.pricing) ───────────
// { parts: { [mesh]: { color?: Rule, toggle?: Rule } }, colors: { [#hex]: Rule }, custom_color?: Rule }

export function pricingOf(config) {
	return isObj(config?.pricing) ? config.pricing : null;
}

export function hasPricing(config) {
	const p = pricingOf(config);
	if (!p) return false;
	const parts = Object.values(p.parts || {}).some((r) => liveRule(r?.color) || liveRule(r?.toggle));
	return parts || Object.values(p.colors || {}).some(liveRule) || liveRule(p.custom_color);
}

/** Painting `mesh` with `hex`: the part's recolour rule plus the palette colour's premium (or the custom-colour rule). */
export function colorPrice(config, mesh, hex, base, palette = []) {
	const p = pricingOf(config);
	if (!p || !hex) return 0;
	const key = lc(hex);
	const inPalette = palette.some((c) => lc(c) === key);
	const premium = inPalette ? ruleAmount(p.colors?.[key], base) : ruleAmount(p.custom_color, base);
	return round2(ruleAmount(p.parts?.[mesh]?.color, base) + premium);
}

/** Pre-sale price of painting `mesh` with `hex` when any rule in it has a sale, else null. */
export function colorRegular(config, mesh, hex, base, palette = []) {
	const p = pricingOf(config);
	if (!p || !hex) return null;
	const key = lc(hex);
	const rules = [p.parts?.[mesh]?.color, palette.some((c) => lc(c) === key) ? p.colors?.[key] : p.custom_color];
	if (rules.every((r) => ruleRegular(r, base) == null)) return null;
	return round2(rules.reduce((n, r) => n + (ruleRegular(r, base) ?? ruleAmount(r, base)), 0));
}

/** Showing a hidden optional part or hiding a shown one. */
export function togglePrice(config, mesh, base) {
	return ruleAmount(pricingOf(config)?.parts?.[mesh]?.toggle, base);
}

const defaultColor = (config, mesh) => lc(getMaterialConfig(config.materials, mesh, Object.keys(config.meshes || {}))?.baseColor);
const defaultVisible = (config, mesh) => config.meshes?.[mesh]?.visible !== false;

// ── Option groups (config.options) ─────────────────────────────────────────
// [{ id, label, type: 'color'|'material'|'parts', display, targets: [mesh], required, default, description?,
//    choices: [{ id, label, color?, material?: {baseColor, roughness, metalness}, show?: [mesh], thumbnailId?, price?: Rule }] }]

export function groupsOf(config) {
	if (!Array.isArray(config?.options)) return [];
	return config.options.filter((g) => isObj(g) && g.id && (GROUP_TYPES[g.type] || (g.type === 'variant' && isOn('materials-variants'))) && Array.isArray(g.choices));
}

/** Groups take over the drawer only with the flag on and at least one group saved. */
export function usesGroups(config, flags = optionFlags()) {
	return !!flags.groups && groupsOf(config).length > 0;
}

// ── Conditional logic (flag conditional-logic, specs/conditional-logic.md) ──
// Conditions run only on a config that carries the line's variation attributes (withAttributes).

const LOGIC = Symbol('wc3d.optionContext');
export const RULE_OPS = { is: 'is', is_not: 'is not', is_set: 'has a choice', is_empty: 'has no choice' };

export function withAttributes(config, attributes = {}) {
	return config ? { ...config, [LOGIC]: { attributes: isObj(attributes) ? attributes : {} } } : config;
}

/** The variation's attributes when it belongs to the product, else {}. */
export function attributesFor(state, productId, variationId = 0) {
	const v = variationId ? state.variations?.[variationId] : null;
	return v && v.parentId === productId && isObj(v.attributes) ? v.attributes : {};
}

export function configFor(state, productId, variationId = 0) {
	return withAttributes(effectiveFor(state, productId, variationId, { background: false }), attributesFor(state, productId, variationId));
}

const logicOf = (config) => (isOn('conditional-logic') && config?.[LOGIC]) || null;

export function hasConditions(cond) {
	return isObj(cond) && Array.isArray(cond.rules) && cond.rules.some(isObj);
}

/** true/false, or null when the rule is ignored (incomplete, or not about an earlier group). */
function ruleMatch(rule, attrs, resolved) {
	if (!isObj(rule)) return null;
	if (rule.source === 'attribute') {
		if (!rule.name || !['is', 'is_not'].includes(rule.op)) return null;
		const key = Object.keys(attrs).find((k) => lc(k) === lc(rule.name));
		const same = key != null && lc(attrs[key]) !== '' && lc(attrs[key]) === lc(rule.value);
		return rule.op === 'is' ? same : !same;
	}
	if (rule.source === 'group') {
		if (!resolved.has(rule.groupId) || !RULE_OPS[rule.op]) return null;
		const c = resolved.get(rule.groupId);
		if (rule.op === 'is_set') return !!c;
		if (rule.op === 'is_empty') return !c;
		if (!rule.choiceId) return null;
		return rule.op === 'is' ? c?.id === rule.choiceId : c?.id !== rule.choiceId;
	}
	return null;
}

/** `resolved`: Map of earlier groupId → resolved choice (or null). */
export function conditionsMet(cond, attrs = {}, resolved = new Map()) {
	if (!hasConditions(cond)) return true;
	const results = cond.rules.map((r) => ruleMatch(r, attrs, resolved)).filter((r) => r !== null);
	if (!results.length) return true;
	return cond.match === 'any' ? results.some(Boolean) : results.every(Boolean);
}

/**
 * One top-to-bottom pass: { chosen, hidden, available: {gid: choices}, dropped: {gid: {picked, used}} }.
 * chosen = the shopper's pick if offered, else the default if offered, else null; hidden groups resolve to null.
 */
export function resolveGroups(config, custom) {
	const picks = isObj(custom?.options) ? custom.options : {};
	const ctx = logicOf(config);
	const resolved = new Map();
	const out = { chosen: {}, hidden: new Set(), available: {}, dropped: {} };
	for (const g of groupsOf(config)) {
		const all = g.choices.filter((c) => c && c.id);
		let offered = all;
		let visible = true;
		if (ctx) {
			visible = conditionsMet(g.conditions, ctx.attributes, resolved);
			offered = all.filter((c) => conditionsMet(c.conditions, ctx.attributes, resolved));
			if (visible && all.length && !offered.length) visible = false;
		}
		const find = (id, list) => (id ? list.find((c) => c.id === id) : null) || null;
		const c = visible ? find(picks[g.id], offered) || find(g.default, offered) : null;
		if (!visible) out.hidden.add(g.id);
		else if (ctx && picks[g.id] && !find(picks[g.id], offered) && find(picks[g.id], all)) out.dropped[g.id] = { picked: find(picks[g.id], all), used: c };
		out.available[g.id] = visible ? offered : [];
		out.chosen[g.id] = c;
		resolved.set(g.id, c);
	}
	return out;
}

/** Groups whose conditions are not met (not listed, not charged, not required). */
export function hiddenGroups(config, custom) {
	return resolveGroups(config, custom).hidden;
}

export function availableChoices(config, custom, groupId) {
	return resolveGroups(config, custom).available[groupId] || [];
}

/** Editor: why a rule is ignored ('order' = refers to this or a later group, 'missing'), else ''. */
export function ruleIssue(rule, groups, index) {
	if (!isObj(rule) || rule.source !== 'group') return '';
	const at = groups.findIndex((g) => g?.id === rule.groupId);
	if (at < 0) return 'missing';
	if (at >= index) return 'order';
	if ((rule.op === 'is' || rule.op === 'is_not') && !(groups[at].choices || []).some((c) => c?.id === rule.choiceId)) return 'missing';
	return '';
}

/** groupId → chosen choice: the shopper's pick if it still exists (and is offered), else the default, else null. */
export function selectedChoices(config, custom) {
	return resolveGroups(config, custom).chosen;
}

/** {materials, meshes} that the chosen options paint (+ material_variant from a materials-variants group). */
export function groupLayer(config, custom) {
	const materials = {};
	const meshes = {};
	let variant;
	const chosen = selectedChoices(config, custom);
	for (const g of groupsOf(config)) {
		const c = chosen[g.id];
		if (!c) continue;
		if (g.type === 'variant') variant = typeof c.variant === 'string' ? c.variant : '';
		for (const mesh of g.targets || []) {
			if (g.type === 'color' && c.color) materials[mesh] = { ...(materials[mesh] || {}), baseColor: c.color };
			if (g.type === 'material' && isObj(c.material)) materials[mesh] = { ...(materials[mesh] || {}), ...c.material };
			if (g.type === 'parts') meshes[mesh] = { visible: (c.show || []).includes(mesh) };
		}
	}
	return variant === undefined ? { materials, meshes } : { materials, meshes, material_variant: variant };
}

/** Colour/material groups whose every target a parts choice hides: not shown as chosen, not charged, not required. */
export function inactiveGroups(config, custom) {
	const { meshes } = groupLayer(config, custom);
	const visible = (m) => (meshes[m]?.visible ?? defaultVisible(config, m)) !== false;
	const out = new Set();
	for (const g of groupsOf(config)) {
		if (g.type !== 'parts' && (g.targets || []).length && g.targets.every((m) => !visible(m))) out.add(g.id);
	}
	// conditional-logic: groups hidden by their conditions count as inactive too.
	if (logicOf(config)) for (const id of hiddenGroups(config, custom)) out.add(id);
	return out;
}

export function isEmptyCustom(c) {
	return !c || (!Object.keys(c.materials || {}).length && !Object.keys(c.meshes || {}).length && !Object.keys(c.options || {}).length && !(isOn('decals') && hasDecalEntries(c)));
}

/**
 * What the viewer renders. With groups the drawer has no free picks, so the layer is the
 * groups' (defaults included); without, it is the shopper's own materials/meshes.
 */
export function shopperLayer(config, custom, flags = optionFlags()) {
	if (!usesGroups(config, flags)) return isEmptyCustom(custom) ? null : { materials: custom.materials || {}, meshes: custom.meshes || {} };
	const layer = groupLayer(config, custom);
	return Object.keys(layer.materials).length || Object.keys(layer.meshes).length || layer.material_variant !== undefined ? layer : null;
}

/**
 * add-to-cart sanitising (woocommerce_add_cart_item_data). Groups: unknown picks dropped, every
 * resolved option (defaults too) stored, null when none resolves; materials/meshes baked so older readers (summary, order preview) still work.
 */
export function sanitizeCustom(config, custom, flags = optionFlags()) {
	return withDecals(config, custom, sanitizeChoices(config, custom, flags));
}

function sanitizeChoices(config, custom, flags) {
	if (!usesGroups(config, flags)) return isEmptyCustom(custom) ? null : JSON.parse(JSON.stringify({ materials: custom.materials, meshes: custom.meshes }));
	const options = {};
	for (const [gid, c] of Object.entries(selectedChoices(config, custom))) if (c) options[gid] = c.id;
	if (!Object.keys(options).length) return null;
	return { options, ...groupLayer(config, { options }) };
}

/** Required groups without a choice → WooCommerce-style error messages. */
export function validateChoices(config, custom, flags = optionFlags()) {
	if (!usesGroups(config, flags)) return [];
	const chosen = selectedChoices(config, custom);
	const off = inactiveGroups(config, custom);
	return groupsOf(config)
		.filter((g) => g.required && !chosen[g.id] && !off.has(g.id))
		.map((g) => `“${g.label}” is a required field.`);
}

/** The first required group still without a choice (where the drawer opens after a failed add). */
export function firstMissingGroup(config, custom) {
	const chosen = selectedChoices(config, custom);
	const off = inactiveGroups(config, custom);
	return groupsOf(config).find((g) => g.required && !chosen[g.id] && !off.has(g.id)) || null;
}

const liveRule = (r) => {
	const n = normalizeRule(r);
	return !!n && (n.amount !== 0 || (n.sale ?? 0) !== 0);
};

/** Any non-zero rule the drawer charges: group choices when groups are used, else the plain list. */
export function hasOptionRules(config, flags = optionFlags()) {
	if (hasDecalRules(config)) return true;
	if (usesGroups(config, flags)) return groupsOf(config).some((g) => g.choices.some((c) => liveRule(c?.price)));
	return hasPricing(config);
}

// ── Lines + quote (the summary and the price come from the same list) ──────

/**
 * [{ key, label, value, swatch?, amount, regular? }] for a configuration.
 * amount is 0 with pricing off, so the same rows serve as the plain summary.
 */
export function optionLines(config, custom, base, ctx = {}) {
	return [...choiceLines(config, custom, base, ctx), ...decalLines(config, custom, base, { pricing: !!(ctx.flags || optionFlags()).pricing })];
}

function choiceLines(config, custom, base, { flags = optionFlags(), palette = [] } = {}) {
	const lines = [];
	if (usesGroups(config, flags)) {
		const chosen = selectedChoices(config, custom);
		const off = inactiveGroups(config, custom);
		for (const g of groupsOf(config)) {
			const c = chosen[g.id];
			if (!c || off.has(g.id)) continue;
			const swatch = g.type === 'color' || g.type === 'variant' ? c.color : g.type === 'material' ? c.material?.baseColor || c.color : undefined;
			lines.push({
				key: g.id,
				label: g.label,
				value: c.label,
				swatch,
				amount: flags.pricing ? ruleAmount(c.price, base) : 0,
				regular: flags.pricing ? ruleRegular(c.price, base) : null,
			});
		}
		return lines;
	}
	if (isEmptyCustom(custom)) return lines;
	// Rows follow part order (the drawer), not click order; a hidden part's recolour is neither listed nor charged.
	const mats = custom.materials || {};
	const vis = custom.meshes || {};
	const order = [...new Set([...Object.keys(config.meshes || {}), ...Object.keys(mats), ...Object.keys(vis)])];
	for (const mesh of order) {
		const hex = mats[mesh]?.baseColor;
		if (!hex || lc(hex) === defaultColor(config, mesh)) continue;
		if ((vis[mesh]?.visible ?? defaultVisible(config, mesh)) === false) continue;
		lines.push({ key: 'color:' + mesh, label: partName(mesh), value: hex, swatch: hex, amount: flags.pricing ? colorPrice(config, mesh, hex, base, palette) : 0, regular: flags.pricing ? colorRegular(config, mesh, hex, base, palette) : null });
	}
	for (const mesh of order) {
		const opts = vis[mesh];
		if (opts?.visible == null || opts.visible === defaultVisible(config, mesh)) continue;
		lines.push({ key: 'part:' + mesh, label: partName(mesh), value: opts.visible ? 'Shown' : 'Hidden', amount: flags.pricing ? togglePrice(config, mesh, base) : 0, regular: flags.pricing ? ruleRegular(pricingOf(config)?.parts?.[mesh]?.toggle, base) : null });
	}
	return lines;
}

/** { base, options, total, lines }. The total never drops below zero. */
export function quote(config, custom, base, ctx = {}) {
	const lines = optionLines(config, custom, base, ctx);
	const options = round2(lines.reduce((n, l) => n + l.amount, 0));
	return { base: round2(base), options, total: round2(Math.max(0, Number(base) + options)), lines };
}

// ── Store-level helpers (cart lines, product page) ─────────────────────────

/** Variation price ‖ product price. */
export function basePriceOf(state, productId, variationId = 0) {
	const v = variationId ? state.variations?.[variationId] : null;
	const p = state.products?.[productId];
	return Number((v && v.parentId === productId ? v.price : null) ?? p?.price ?? 0);
}

export function quoteFor(state, productId, variationId, custom, flags = optionFlags()) {
	const config = configFor(state, productId, variationId);
	const palette = viewerSettingsFor(state, productId).colorPalette;
	return quote(config, custom, basePriceOf(state, productId, variationId), { flags, palette });
}

/** The line's variation id when it still belongs to the product, else 0. */
export function lineVariationId(state, item) {
	return item.variationId && state.variations?.[item.variationId]?.parentId === item.productId ? item.variationId : 0;
}

/** Lines saved before option groups carry no `options`, so they keep the plain list. */
export function lineFlags(item, flags = optionFlags()) {
	const opts = item?.custom?.options;
	return { ...flags, groups: !!flags.groups && isObj(opts) };
}

/** The effective config when shoppers pick from groups on this product (3D + customizer on), else null. */
export function groupedConfig(state, productId, variationId = 0, flags = optionFlags()) {
	const vs = viewerSettingsFor(state, productId);
	if (!flags.groups || !vs.available || !vs.customizerEnabled) return null;
	const config = configFor(state, productId, variationId);
	return usesGroups(config, flags) ? config : null;
}

/** woocommerce_add_to_cart_validation: required groups still without a choice. */
export function choiceErrors(state, productId, variationId = 0, custom = null, flags = optionFlags()) {
	const config = groupedConfig(state, productId, variationId, flags);
	return [...(config ? validateChoices(config, custom, flags) : []), ...decalErrorsFor(state, productId, variationId, custom)];
}

/** before_calculate_totals: the line's unit price recomputed from the saved rules. */
export function lineUnitPrice(state, item, flags = optionFlags()) {
	flags = lineFlags(item, flags);
	const vid = lineVariationId(state, item);
	if (!flags.pricing) return basePriceOf(state, item.productId, vid);
	return quoteFor(state, item.productId, vid, item.custom, flags).total;
}

// ── Swatch pictures (local SVG, no network) ────────────────────────────────

/** A lit sphere in the choice's colour; metal and gloss change the highlight. */
export function materialBallUrl(m = {}) {
	const color = m.baseColor || '#cbd5e1';
	const metal = Math.max(0, Math.min(1, Number(m.metalness ?? 0)));
	const gloss = 1 - Math.max(0, Math.min(1, Number(m.roughness ?? 0.6)));
	const hi = (0.25 + gloss * 0.6).toFixed(2);
	const shade = (0.35 + metal * 0.35).toFixed(2);
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="s" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity="${hi}"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${shade}"/></radialGradient></defs><circle cx="32" cy="32" r="30" fill="${color}"/><circle cx="32" cy="32" r="30" fill="url(#s)"/></svg>`;
	return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Swatch picture of a colour/material choice; `color` stands in when the material keeps its own colour. */
export function choiceBallUrl(choice) {
	return materialBallUrl({ ...(choice?.material || {}), baseColor: choice?.material?.baseColor || choice?.color });
}

/** Suggested groups from the old per-mesh flags (editor "Create from customizer settings"). */
export function suggestGroups(config, palette = []) {
	const groups = [];
	const meshes = config?.meshes || {};
	const used = new Set();
	const nextId = (base) => {
		let id = base, n = 2;
		while (used.has(id)) id = `${base}-${n++}`;
		used.add(id);
		return id;
	};
	for (const [mesh, m] of Object.entries(meshes)) {
		if (!m?.customizable) continue;
		const current = getMaterialConfig(config.materials, mesh, Object.keys(meshes))?.baseColor;
		const colors = [...new Set([current, ...palette].filter(Boolean).map(lc))];
		groups.push({
			id: nextId(lc(mesh).replace(/[^a-z0-9]+/g, '-')),
			label: partName(mesh),
			type: 'color',
			display: 'swatch',
			targets: [mesh],
			required: false,
			default: current ? 'c1' : '',
			choices: colors.map((hex, i) => ({ id: 'c' + (i + 1), label: hex, color: hex })),
		});
	}
	for (const [mesh, m] of Object.entries(meshes)) {
		if (!m?.optional) continue;
		groups.push({
			id: nextId(lc(mesh).replace(/[^a-z0-9]+/g, '-') + '-part'),
			label: partName(mesh),
			type: 'parts',
			display: 'button',
			targets: [mesh],
			required: false,
			default: defaultVisible(config, mesh) ? 'with' : 'without',
			choices: [
				{ id: 'with', label: 'With ' + partName(mesh).toLowerCase(), show: [mesh] },
				{ id: 'without', label: 'No ' + partName(mesh).toLowerCase(), show: [] },
			],
		});
	}
	return groups;
}
