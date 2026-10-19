// The "server + Function" of the Shopify prototype: config resolution, option logic, pricing,
// line item properties, the Cart Transform simulation and design records. Pure helpers over store state.
import { resolveEffectiveConfig, applyShopperChoices } from '../../js/shared/effective-config.js';
import { store } from './store.js';

/* ---------- money (Markets) ---------- */

export const CURRENCIES = {
	USD: { symbol: '$', rate: 1, code: 'USD' },
	EUR: { symbol: '€', rate: 0.92, code: 'EUR' },
};

/** Shop-currency amount → presentment string, e.g. money(449) → "$449.00", or "€413.08" in EUR. */
export function money(amount, currency = store.get().demo.currency) {
	const c = CURRENCIES[currency] || CURRENCIES.USD;
	const v = Math.round(Number(amount || 0) * c.rate * 100) / 100;
	const sign = v < 0 ? '−' : '';
	return `${sign}${c.symbol}${Math.abs(v).toFixed(2)}`;
}

/** Signed form for add-on rows: "+$15.00" / "−$12.00". */
export function moneyDelta(amount, currency) {
	return (amount >= 0 ? '+' : '') + money(amount, currency);
}

/* ---------- products & config ---------- */

export const productByHandle = (s, handle) => Object.values(s.products).find((p) => p.handle === handle);
export const variantsOf = (s, pid) => (s.products[pid]?.variants || []).map((id) => s.variants[id]).filter(Boolean);
export const firstVariant = (s, pid) => variantsOf(s, pid)[0];
export const has3D = (s, pid) => !!(s.configs[pid]?.enabled && s.configs[pid]?.modelFileId && s.files[s.configs[pid].modelFileId]);

/* Option-value rules: "Color=Teal", "Size=Wide". Set once per value, combined for every variant that has it. */
export const ruleKey = (name, value) => `${name}=${value}`;

/** Rule layers that apply to a variant, in the product's option order: [{key, name, value, layer}]. */
export function rulesFor(product, variant, rules) {
	if (!product || !variant || !rules) return [];
	return (product.options || [])
		.map((o) => ({ key: ruleKey(o.name, variant.options?.[o.name]), name: o.name, value: variant.options?.[o.name] }))
		.filter((r) => rules[r.key])
		.map((r) => ({ ...r, layer: rules[r.key] }));
}

/** Product default ← option-value rules ← variant override. Rules keep mesh names, so they always inherit. */
export function resolveLayers(base, ruleLayers, variantLayer) {
	let out = base;
	for (const r of ruleLayers) out = resolveEffectiveConfig(out, r.layer?.config || null, false);
	return variantLayer ? resolveEffectiveConfig(out, variantLayer.config || null, !!variantLayer.modelFileId) : out;
}

/** Model file: the variant's own GLB, else the last option rule with one, else the product's. */
export function layerModelId(productModelId, ruleLayers, variantLayer) {
	if (variantLayer?.modelFileId) return variantLayer.modelFileId;
	for (let i = ruleLayers.length - 1; i >= 0; i--) if (ruleLayers[i].layer?.modelFileId) return ruleLayers[i].layer.modelFileId;
	return productModelId;
}

/** { file, model: {demo}|null, hasOwnModel } for a product/variant. */
export function modelFor(s, pid, vid) {
	const vc = vid ? s.variantConfigs[vid] : null;
	const rules = rulesFor(s.products[pid], s.variants[vid], s.configs[pid]?.optionRules);
	const id = layerModelId(s.configs[pid]?.modelFileId, rules, vc);
	const file = s.files[id];
	return { file: file || null, model: file?.demo ? { demo: file.demo } : null, hasOwnModel: !!vc?.modelFileId };
}

/** Effective config: product default ← option-value rules ← variant override (same merge rules as the WP plugin). */
export function effectiveFor(s, pid, vid) {
	const base = s.configs[pid]?.config || { schema_version: 1, meshes: {}, materials: {}, hotspots: [] };
	const rules = rulesFor(s.products[pid], s.variants[vid], s.configs[pid]?.optionRules);
	return resolveLayers(base, rules, vid ? s.variantConfigs[vid] : null);
}

/** Customizer on for this product? Per-product 'on'|'off'|'inherit' over the app setting. */
export function customizerOn(s, pid) {
	const v = s.configs[pid]?.customizer || 'inherit';
	return v === 'inherit' ? !!s.app.settings.customizer : v === 'on';
}

/* ---------- options & conditional logic ---------- */

function ruleMatches(rule, choices, variantOptions) {
	if (rule.source === 'option') {
		const v = variantOptions?.[rule.name];
		return rule.op === 'is_not' ? v !== rule.value : v === rule.value;
	}
	const picked = choices?.options?.[rule.groupId];
	if (rule.op === 'has_choice') return !!picked;
	if (rule.op === 'no_choice') return !picked;
	return rule.op === 'is_not' ? picked !== rule.choiceId : picked === rule.choiceId;
}

export function conditionsPass(cond, choices, variantOptions) {
	if (!cond || !cond.rules?.length || !store.get().app.modules['conditional-logic']) return true;
	const res = cond.rules.map((r) => ruleMatches(r, choices, variantOptions));
	return cond.match === 'any' ? res.some(Boolean) : res.every(Boolean);
}

/** Groups (with only their visible choices) the shopper can see right now. */
export function visibleGroups(config, choices, variantOptions) {
	return (config.options || [])
		.filter((g) => conditionsPass(g.conditions, choices, variantOptions))
		.map((g) => ({ ...g, choices: (g.choices || []).filter((c) => conditionsPass(c.conditions, choices, variantOptions)) }))
		.filter((g) => g.choices.length);
}

/** Picked choice per visible group: shopper pick, else the group default. Hidden groups drop out. */
export function resolvedPicks(config, choices, variantOptions) {
	const out = {};
	for (const g of visibleGroups(config, choices, variantOptions)) {
		const id = choices?.options?.[g.id] ?? g.default;
		const c = g.choices.find((x) => x.id === id);
		if (c) out[g.id] = c;
	}
	return out;
}

/** Shopper layer for the engine ({materials, meshes, decals}) from option picks + decal content. */
export function shopperLayer(config, choices, variantOptions) {
	const materials = {};
	const meshes = {};
	const groups = visibleGroups(config, choices, variantOptions);
	const picks = resolvedPicks(config, choices, variantOptions);
	for (const g of groups) {
		const c = picks[g.id];
		if (!c) continue;
		for (const mesh of g.targets || []) {
			if (g.type === 'color' && c.color) materials[mesh] = { ...(materials[mesh] || {}), baseColor: c.color };
			if (g.type === 'material' && c.material) materials[mesh] = { ...(materials[mesh] || {}), ...c.material };
			if (g.type === 'parts') meshes[mesh] = { visible: (c.show || []).includes(mesh) };
		}
	}
	for (const [mesh, hex] of Object.entries(choices?.colors || {})) materials[mesh] = { ...(materials[mesh] || {}), baseColor: hex };
	for (const [mesh, vis] of Object.entries(choices?.parts || {})) meshes[mesh] = { visible: !!vis };
	const decals = {};
	for (const [id, d] of Object.entries(choices?.decals || {})) if (d && (d.text || d.image)) decals[id] = d;
	return { materials, meshes, decals };
}

/** Effective config with the shopper's choices baked in (for thumbnails/snapshots). */
export function configuredConfig(s, pid, vid, choices) {
	const cfg = effectiveFor(s, pid, vid);
	const v = s.variants[vid];
	return applyShopperChoices(cfg, shopperLayer(cfg, choices, v?.options));
}

/* ---------- pricing (port of OptionLines; runs in browser, server and the Function) ---------- */

export function ruleAmount(rule, base) {
	if (!rule || !store.get().app.modules['option-pricing']) return 0;
	const amount = rule.sale ?? rule.amount ?? 0;
	return rule.type === 'percent' ? Math.round(base * amount) / 100 : Number(amount);
}

/** Priced add-on lines: [{label, amount, regular?}] for option picks + decal areas. */
export function priceLines(s, pid, vid, choices) {
	const cfg = effectiveFor(s, pid, vid);
	const v = s.variants[vid];
	const base = v?.price ?? s.products[pid]?.price ?? 0;
	const out = [];
	const picks = resolvedPicks(cfg, choices, v?.options);
	for (const g of visibleGroups(cfg, choices, v?.options)) {
		const c = picks[g.id];
		if (!c?.price) continue;
		const amount = ruleAmount(c.price, base);
		if (amount) out.push({ label: `${g.label}: ${c.label}`, amount, regular: c.price.sale != null ? ruleAmount({ ...c.price, sale: undefined }, base) : undefined });
	}
	if (s.app.modules.personalization) {
		for (const area of cfg.decals || []) {
			const d = choices?.decals?.[area.id];
			if (!d || !(d.text || d.image) || !area.price) continue;
			const amount = ruleAmount(area.price, base);
			if (amount) out.push({ label: `${area.label}: ${d.text ? `"${d.text}"` : 'Image'}`, amount });
		}
	}
	return out;
}

export function priceSummary(s, pid, vid, choices) {
	const base = s.variants[vid]?.price ?? s.products[pid]?.price ?? 0;
	const lines = priceLines(s, pid, vid, choices);
	const addons = lines.reduce((t, l) => t + l.amount, 0);
	return { base, lines, addons: Math.round(addons * 100) / 100, total: Math.round((base + addons) * 100) / 100 };
}

/** Required groups/areas still missing → list of labels. */
export function missingRequired(s, pid, vid, choices) {
	const cfg = effectiveFor(s, pid, vid);
	const v = s.variants[vid];
	const missing = [];
	for (const g of visibleGroups(cfg, choices, v?.options)) if (g.required && !choices?.options?.[g.id]) missing.push(g.label);
	for (const a of cfg.decals || []) if (a.required && !(choices?.decals?.[a.id]?.text || choices?.decals?.[a.id]?.image)) missing.push(a.label);
	return missing;
}

/* ---------- line item properties & designs ---------- */

function hash(str) {
	let h = 5381;
	for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
	return h.toString(16).padStart(8, '0').slice(0, 8);
}

/** Readable rows + hidden `_3d_*` keys, as written on the Shopify cart line. */
export function lineProperties(s, pid, vid, choices, code) {
	const cfg = effectiveFor(s, pid, vid);
	const v = s.variants[vid];
	const rows = [];
	const picks = resolvedPicks(cfg, choices, v?.options);
	for (const g of visibleGroups(cfg, choices, v?.options)) if (picks[g.id]) rows.push({ name: g.label, value: picks[g.id].label });
	for (const area of cfg.decals || []) {
		const d = choices?.decals?.[area.id];
		if (d?.text) rows.push({ name: area.label, value: d.text });
		else if (d?.image) rows.push({ name: area.label, value: 'Uploaded image' });
	}
	for (const [mesh, hex] of Object.entries(choices?.colors || {})) rows.push({ name: cfg.meshes?.[mesh]?.label || mesh.replace(/_/g, ' '), value: hex });
	if (code) {
		rows.push({ name: '_3d_design', value: code });
		rows.push({ name: '_3d_hash', value: hash(JSON.stringify(choices || {})) });
	}
	return rows;
}

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** Deterministic 6-char code from the store sequence (no Date.now ids in the prototype). */
export function nextDesignCode() {
	const s = store.get();
	let n = s.demo.seq * 7919 + Object.keys(s.designs).length * 104729;
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += CODE_CHARS[n % CODE_CHARS.length];
		n = Math.floor(n / CODE_CHARS.length) + 17 * (i + 1);
	}
	store.patch('demo.seq', (x) => x + 1);
	return s.designs[code] ? nextDesignCode() : code;
}

export function nowStr() {
	return '2026-10-16 ' + new Date().toTimeString().slice(0, 5);
}

/** Create an immutable design record (POST /apps/3d/designs). Returns the code. */
export function createDesign({ productId, variantId, choices, kind = 'cart', name = '', customerId = null }) {
	const code = nextDesignCode();
	const days = store.get().app.settings.share_link_lifetime;
	store.patch(['designs', code], {
		code,
		kind,
		productId,
		variantId,
		customerId,
		name,
		createdAt: nowStr(),
		expiresAt: kind === 'saved' && days ? `+${days} days` : null,
		views: 0,
		choices: JSON.parse(JSON.stringify(choices || {})),
	});
	return code;
}

/* ---------- cart & Cart Transform simulation ---------- */

/** Add to cart (/cart/add.js). Lines with different properties never merge, like Shopify. */
export function addToCart({ productId, variantId, qty = 1, choices = null, snapshot = null }) {
	const s = store.get();
	const custom = choices && (Object.keys(choices.options || {}).length || Object.keys(choices.decals || {}).length || Object.keys(choices.colors || {}).length || Object.keys(choices.parts || {}).length);
	const code = custom ? createDesign({ productId, variantId, choices, kind: 'cart', customerId: s.demo.customerId }) : null;
	const properties = custom ? lineProperties(store.get(), productId, variantId, choices, code) : [];
	const key = JSON.stringify([variantId, properties]);
	const existing = store.get().cart.lines.find((l) => l.key === key);
	if (existing) {
		store.patch('cart.lines', (ls) => ls.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l)));
	} else {
		store.patch('cart.lines', (ls) => [...ls, { key, id: ls.length ? Math.max(...ls.map((l) => l.id)) + 1 : 1, productId, variantId, qty, choices: custom ? choices : null, designCode: code, properties, snapshot }]);
	}
	return code;
}

/**
 * What the Cart Transform Function returns for a cart line.
 * Basic/Advanced: lineExpand → base variant + hidden "3D customization" component.
 * Plus: lineUpdate → one line, new price, title and the snapshot image.
 */
export function transformLine(s, line) {
	const sum = line.choices ? priceSummary(s, line.productId, line.variantId, line.choices) : { base: s.variants[line.variantId]?.price ?? 0, lines: [], addons: 0, total: s.variants[line.variantId]?.price ?? 0 };
	if (!sum.addons) return { mode: null, unit: sum.base, sum };
	if (s.shop.plan === 'plus') return { mode: 'update', unit: sum.total, sum, title: `${s.products[line.productId].title} (customized)`, image: line.snapshot || null };
	return {
		mode: 'expand',
		unit: sum.total,
		sum,
		components: [
			{ title: `${s.products[line.productId].title}${s.variants[line.variantId]?.title !== 'Default Title' ? ' / ' + s.variants[line.variantId].title : ''}`, price: sum.base },
			{ title: '3D customization', price: sum.addons, hidden: true },
		],
	};
}

export function cartTotals(s) {
	const lines = s.cart.lines.map((l) => ({ line: l, t: transformLine(s, l) }));
	const subtotal = lines.reduce((t, x) => t + x.t.unit * x.line.qty, 0);
	return { lines, subtotal: Math.round(subtotal * 100) / 100, count: s.cart.lines.reduce((t, l) => t + l.qty, 0) };
}

/** Checkout → order (orders/create webhook freezes OrderConfig). Returns the order id. */
export function placeOrder() {
	const s = store.get();
	const id = Math.max(...Object.keys(s.orders).map(Number)) + 1;
	const lines = s.cart.lines.map((l, i) => {
		const t = transformLine(s, l);
		return {
			id: i + 1,
			productId: l.productId,
			variantId: l.variantId,
			qty: l.qty,
			designCode: l.designCode,
			transform: t.mode,
			base: t.sum.base,
			addons: t.sum.lines.map(({ label, amount }) => ({ label, amount })),
			properties: l.properties,
			snapshot: l.snapshot || null,
		};
	});
	store.set((st) => ({
		...st,
		orders: { ...st.orders, [id]: { id, name: '#' + id, date: nowStr(), customerId: st.demo.customerId, financial: 'Paid', fulfillment: 'Unfulfilled', shipping: 0, lines } },
		cart: { lines: [], note: '' },
	}));
	return id;
}

export function orderTotals(s, order) {
	const items = order.lines.reduce((t, l) => t + (l.base + l.addons.reduce((a, x) => a + x.amount, 0)) * l.qty, 0);
	return { items: Math.round(items * 100) / 100, shipping: order.shipping || 0, total: Math.round((items + (order.shipping || 0)) * 100) / 100 };
}

export const visibleProps = (props) => (props || []).filter((p) => !p.name.startsWith('_'));
