// saved-designs: the "server" for share links and saved designs (wp_wc3d_saved_designs + REST).
// Spec: specs/saved-designs.md. Records live in state.savedDesigns[code].
import { store } from '../core/store.js';
import { isOn } from '../core/features.js';
import { viewerSettingsFor, modelFor } from './product-3d.js';
import { groupedConfig, sanitizeCustom } from './options.js';

export const STORE_URL = 'https://demo-store.test/';
export const SHARE_DEFAULTS = { share_links: true, share_links_account: true, share_link_lifetime: 90 };
export const LIFETIMES = [
	[30, '30 days'],
	[90, '90 days'],
	[180, '6 months'],
	[365, '1 year'],
	[0, 'Never'],
];
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Settings with defaults for installs that never saved the new keys. */
export function shareSettings(state = store.get()) {
	const s = state.settings || {};
	const pick = (k) => (s[k] === undefined ? SHARE_DEFAULTS[k] : s[k]);
	const life = Number(pick('share_link_lifetime'));
	return { links: !!pick('share_links'), account: !!pick('share_links_account'), lifetime: Number.isFinite(life) && life >= 0 ? life : 90 };
}

/** Options::sanitize() part for the new keys ({} with the flag off, so stored values are kept as they are). */
export function sanitizeShareSettings(input) {
	if (!isOn('saved-designs')) return {};
	const life = parseInt(input.share_link_lifetime, 10);
	return {
		share_links: input.share_links === undefined ? SHARE_DEFAULTS.share_links : !!input.share_links,
		share_links_account: input.share_links_account === undefined ? SHARE_DEFAULTS.share_links_account : !!input.share_links_account,
		share_link_lifetime: LIFETIMES.some(([d]) => d === life) ? life : SHARE_DEFAULTS.share_link_lifetime,
	};
}

/** seq → 6-char code. Each step is a bijection on 30 bits, so codes never repeat. */
export function codeFor(seq) {
	let x = (Math.imul(seq, 387420489) + 1013904223) & 0x3fffffff;
	x ^= x >>> 15;
	x = Math.imul(x, 2654435761 | 0) & 0x3fffffff;
	x ^= x >>> 13;
	let s = '';
	for (let i = 0; i < 6; i++) {
		s = ALPHABET[x & 31] + s;
		x >>>= 5;
	}
	return s;
}

export const normalizeCode = (c) => String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6);
export const storeLink = (code) => `${STORE_URL}?wc3d_design=${code}`;
export const protoToken = (code) => `store.design.${code}`;

/** JSON with sorted keys, so equal layers compare equal whatever the click order. */
export function canonical(v) {
	if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
	if (v && typeof v === 'object') {
		return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
	}
	return JSON.stringify(v ?? null);
}

/** Any non-empty key counts (materials, meshes, options and later decals, …). */
export function hasLayer(custom) {
	if (!custom || typeof custom !== 'object') return false;
	return Object.values(custom).some((v) => v != null && (typeof v !== 'object' || Object.keys(v).length > 0));
}

/** What a record stores: the whole layer; with groups the sanitised picks (defaults included) merged in. */
export function designCustom(state, productId, variationId, custom) {
	const raw = custom && typeof custom === 'object' ? JSON.parse(JSON.stringify(custom)) : {};
	const config = groupedConfig(state, productId, variationId);
	let out;
	if (config) out = { ...raw, ...(sanitizeCustom(config, raw) || {}) };
	else {
		const { options: _drop, ...plain } = raw;
		out = plain;
	}
	return hasLayer(out) ? out : null;
}

// ── Dates ──────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');
export function nowStr(d = new Date()) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function parseStr(s) {
	const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(s || ''));
	return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null;
}
/** 'September 24, 2026' (WooCommerce date format). */
export function longDate(s) {
	const d = s instanceof Date ? s : parseStr(s);
	return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : '';
}

/** Expiry Date of an anonymous link, or null (account design, or lifetime Never). */
export function expiresAt(d, state = store.get()) {
	if (!d || d.customerId) return null;
	const { lifetime } = shareSettings(state);
	const c = parseStr(d.created);
	if (!lifetime || !c) return null;
	return new Date(c.getTime() + lifetime * 86400000);
}
export const isExpired = (d, state = store.get(), now = new Date()) => {
	const e = expiresAt(d, state);
	return !!e && e.getTime() <= now.getTime();
};

// ── Records ────────────────────────────────────────────────────────────────

export const designsOf = (state = store.get()) => Object.values(state.savedDesigns || {});
export const currentCustomer = (state = store.get()) => {
	const id = Number(state.demo?.customerId) || 0;
	return id ? state.customers?.[id] || null : null;
};

const sameDesign = (d, productId, variationId, key, customerId) =>
	d.productId === productId && (d.variationId || 0) === (variationId || 0) && (Number(d.customerId) || 0) === customerId && canonical(d.custom) === key;

/** The record an identical design already has (anonymous: unexpired only). */
export function findDesign(state, { productId, variationId = 0, custom, customerId = 0 }) {
	const key = canonical(custom);
	return designsOf(state).find((d) => sameDesign(d, productId, variationId, key, customerId) && !isExpired(d, state)) || null;
}

/**
 * POST /wc3d/v1/designs: create or reuse. custom is the page's shopper layer; returns the record.
 * customerId + name → an account design.
 */
export function saveDesign({ productId, variationId = 0, custom, customerId = 0, name = '' }) {
	const state = store.get();
	const clean = designCustom(state, productId, variationId, custom);
	const hit = findDesign(state, { productId, variationId, custom: clean, customerId });
	if (hit) return { record: hit, reused: true };
	// The counter never goes down, so a deleted record's code is never handed to another design.
	let seq = designsOf(state).reduce((m, d) => Math.max(m, Number(d.seq) || 0), Number(state.savedDesignSeq) || 0) + 1;
	while (state.savedDesigns?.[codeFor(seq)]) seq++;
	const code = codeFor(seq);
	store.patch('savedDesignSeq', seq);
	const record ={ code, seq, productId, variationId: variationId || 0, custom: clean, created: nowStr(), customerId: customerId || 0, name: customerId ? String(name || '').trim() : '', views: 0 };
	store.patch(['savedDesigns', code], record);
	return { record, reused: false };
}

export function renameDesign(code, name) {
	store.patch(['savedDesigns', code, 'name'], String(name || '').trim());
}

export function deleteDesigns(codes) {
	const drop = new Set(codes);
	store.set((s) => ({ ...s, savedDesigns: Object.fromEntries(Object.entries(s.savedDesigns || {}).filter(([c]) => !drop.has(c))) }));
}

export function countView(code) {
	if (!store.get().savedDesigns?.[code]) return;
	store.patch(['savedDesigns', code], (d) => ({ ...d, views: (Number(d.views) || 0) + 1, lastViewed: nowStr() }));
}

/** Can the product open in 3D with the customizer (where a design makes sense)? */
export function designable(state, productId) {
	const p = state.products?.[productId];
	if (!p || p.status !== 'publish') return false;
	const vs = viewerSettingsFor(state, productId);
	return vs.available && !!modelFor(state, productId, 0).model;
}

/**
 * GET /wc3d/v1/designs/{code}: { status: 'ok'|'missing'|'expired'|'gone', record, product, variation }.
 * 'gone' = the product is deleted, unpublished or no longer has 3D.
 */
export function lookupDesign(state, code) {
	const d = state.savedDesigns?.[normalizeCode(code)];
	if (!d) return { status: 'missing' };
	if (isExpired(d, state)) return { status: 'expired', record: d };
	const product = state.products?.[d.productId];
	if (!product || !designable(state, d.productId)) return { status: 'gone', record: d };
	const v = d.variationId ? state.variations?.[d.variationId] : null;
	const variation = v && v.parentId === product.id && product.variations?.includes(v.id) ? v : null;
	return { status: 'ok', record: d, product, variation, lostVariation: !!d.variationId && !variation };
}

/** Product page token for a code (#store.product.<slug>.design.<code>). */
export function productToken(state, d) {
	const p = state.products?.[d.productId];
	return p ? `store.product.${p.slug}.design.${d.code}` : 'store.shop';
}
