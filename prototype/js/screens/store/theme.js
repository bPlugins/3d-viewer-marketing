// Demo storefront theme: a plain WooCommerce-style frame (header, mini cart, breadcrumbs,
// notices, footer) plus the cart helpers every store screen shares.
import { html, useState, useEffect, useRef, cx, money } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { cartSummary, effectiveFor, viewerSettingsFor } from '../../shared/product-3d.js';
import { lineUnitPrice, lineVariationId, quoteFor, formatDelta, optionFlags, isEmptyCustom, validateChoices, sanitizeCustom, groupedConfig, lineFlags } from '../../shared/options.js';
import { useFeature, isOn } from '../../core/features.js';
import { Slot } from '../../shared/slots.js';
import { attachSnapshot, LineImage } from '../../shared/snapshot.js';
import { decalConfig, decalErrors, decalRows, isDecalKey, withDecals } from '../../shared/decals.js';

// ── Cart helpers ────────────────────────────────────────────────────────────

/** Unit price of a cart line (variation price wins; option-pricing adds the recomputed options). */
export function unitPrice(state, item) {
	return lineUnitPrice(state, item);
}

export { lineFlags, choiceErrors } from '../../shared/options.js';

export function cartCount(state) {
	return (state.cart?.items || []).reduce((n, i) => n + (Number(i.qty) || 0), 0);
}

export function cartTotal(state) {
	return (state.cart?.items || []).reduce((n, i) => n + unitPrice(state, i) * (Number(i.qty) || 0), 0);
}

/** "Lounge Chair - Teal" style line name, like WooCommerce's variation titles. */
export function lineName(state, item) {
	const p = state.products?.[item.productId];
	const v = item.variationId ? state.variations?.[item.variationId] : null;
	const attrs = v ? Object.values(v.attributes || {}).join(', ') : '';
	return (p?.name || 'Product') + (attrs ? ' - ' + attrs : '');
}

/**
 * Option rows of a cart/order line (option-pricing, or a grouped line): the order's frozen rows, else
 * recomputed; [] means the old "3D Customization" text. An order item without frozen rows predates pricing.
 */
export function optionRows(state, item) {
	const flags = lineFlags(item);
	if (!item) return [];
	// decals: with neither pricing nor groups, the old summary row plus one row per filled area.
	if (!flags.pricing && !flags.groups) return decalRows(state, item);
	if (Array.isArray(item.options) && item.options.length) {
		const frozen = isOn('decals') ? item.options : item.options.filter((l) => !isDecalKey(l.key));
		return flags.pricing ? frozen : frozen.map((l) => ({ ...l, amount: 0, regular: null }));
	}
	if (!state.products?.[item.productId]) return [];
	const vid = lineVariationId(state, item);
	return quoteFor(state, item.productId, vid, item.custom, 'total' in item ? { ...flags, pricing: false } : flags).lines;
}

/** "#ef4444 (+$15.00)"; a sale shows the regular amount struck through; zero shows no price. order-snapshot: swatch dot first. */
export function OptionValue({ line }) {
	const dot = useFeature('order-snapshot') && line.swatch ? html`<span class="wc3d-swatch-dot" style=${{ background: line.swatch }} aria-hidden="true"></span>` : null;
	const price = formatDelta(line.amount);
	const was = line.regular != null && line.regular !== line.amount ? formatDelta(line.regular) : '';
	// decals: an image area shows its picture before the file name.
	const thumb = line.image ? html`<img class="wc3d-decal-thumb" src=${line.image} alt="" width="32" height="32" />` : null;
	if (!price && !was) return dot || thumb ? html`${thumb}${dot}${line.value}` : line.value;
	return html`${thumb}${dot}${line.value} (${was && html`<del>${was}</del> `}${price || money(0)})`;
}

/** WC item-data class suffix (sanitize_html_class of the label). */
export const metaClass = (label) => 'variation-' + String(label).replace(/[^A-Za-z0-9_-]/g, '');

let lineSeq = 0;

/**
 * WooCommerce add-to-cart: identical uncustomized lines merge; a customized add always
 * becomes its own line (wc3d_unique_key), except identical option-group picks, which merge.
 * Returns the line key, or '' when a required group has no choice (error notices pushed).
 */
export function addToCart({ productId, variationId = 0, qty = 1, custom = null, fromOrder = false }) {
	const config = fromOrder ? null : groupedConfig(store.get(), productId, variationId);
	let clean;
	if (fromOrder) {
		// Order again (woocommerce_order_again_cart_item_data): the order item's custom is kept as saved.
		clean = isEmptyCustom(custom) ? null : JSON.parse(JSON.stringify(custom));
	} else if (config) {
		clean = sanitizeCustom(config, custom);
		const errors = validateChoices(config, clean);
		if (errors.length) {
			errors.forEach((text) => pushNotice({ type: 'error', text }));
			return '';
		}
	} else {
		// No groups here: a posted `options` is dropped, like sanitizeCustom does.
		const { options: _drop, ...plain } = custom || {};
		clean = isEmptyCustom(plain) ? null : JSON.parse(JSON.stringify(plain));
	}
	// decals: areas sanitised and required ones checked (woocommerce_add_to_cart_validation).
	if (!fromOrder && isOn('decals')) {
		const dc = decalConfig(store.get(), productId, variationId);
		if (!config) clean = withDecals(dc || {}, custom, clean);
		const errors = dc ? decalErrors(dc, clean) : [];
		if (errors.length) {
			errors.forEach((text) => pushNotice({ type: 'error', text }));
			return '';
		}
	}
	const n = Math.max(1, Math.floor(Number(qty) || 1));
	const same = JSON.stringify(clean);
	let key = '';
	store.set((s) => {
		const items = (s.cart?.items || []).slice();
		if (!clean || clean.options) {
			const i = items.findIndex((it) => it.productId === productId && (it.variationId || 0) === (variationId || 0) && (clean ? JSON.stringify(it.custom) === same : !it.custom));
			if (i >= 0) {
				key = items[i].key;
				items[i] = { ...items[i], qty: items[i].qty + n };
				return { ...s, cart: { ...s.cart, items } };
			}
		}
		// Keys are never reused, so a picture still rendering for a removed line cannot land on a new one.
		const seq = Math.max(lineSeq, items.reduce((m, it) => Math.max(m, Number(String(it.key).match(/(\d+)$/)?.[1]) || 0), 0)) + 1;
		lineSeq = seq;
		key = `${productId}-${variationId || 0}-${clean ? 'u' : 'l'}${seq}`;
		items.push({ key, productId, variationId: variationId || 0, qty: n, custom: clean });
		return { ...s, cart: { ...s.cart, items } };
	});
	return key;
}

// order-snapshot: captures still rendering, so checkout can wait for them.
const capturing = new Map();

/** order-snapshot: picture of the cart line `key` as it was stored (a merged line keeps its picture). */
export function captureLine(key) {
	if (!key || !isOn('order-snapshot') || capturing.has(key)) return capturing.get(key) || Promise.resolve(0);
	const it = (store.get().cart?.items || []).find((i) => i.key === key);
	if (!it || it.snapshotId != null || isEmptyCustom(it.custom)) return Promise.resolve(it?.snapshotId || 0);
	const job = attachSnapshot(key, it.productId, it.variationId || 0, it.custom).finally(() => {
		capturing.delete(key);
		pruneSnapshots();
	});
	capturing.set(key, job);
	return job;
}

/** Resolves when pending captures finish, or after `max` ms so checkout never hangs on one. */
export const capturesSettled = (max = 1500) => Promise.race([Promise.all([...capturing.values()]).catch(() => {}), new Promise((r) => setTimeout(r, max))]);

/** order-snapshot: drops pictures no cart line or order item points to (removed lines, emptied carts). */
export function pruneSnapshots() {
	const s = store.get();
	const ids = Object.keys(s.snapshots || {});
	if (!ids.length) return;
	const used = new Set([...(s.cart?.items || []), ...Object.values(s.orders || {}).flatMap((o) => o.items || [])].map((it) => String(it.snapshotId)));
	const keep = ids.filter((id) => used.has(id));
	if (keep.length < ids.length) store.set((st) => ({ ...st, snapshots: Object.fromEntries(keep.map((id) => [id, st.snapshots[id]])) }));
}

export function removeFromCart(key) {
	store.set((s) => ({ ...s, cart: { ...s.cart, items: (s.cart?.items || []).filter((i) => i.key !== key) } }));
	pruneSnapshots();
}

// ── Notices (woocommerce-notices-wrapper) ──────────────────────────────────
// Shown on the route they were raised on, dropped on the next navigation.
let notices = [];
const noticeSubs = new Set();
const emitNotices = () => noticeSubs.forEach((f) => f(notices));

/** pushNotice({type: 'success'|'error'|'info', text, action: {href, label}}) */
export function pushNotice(n) {
	notices = [...notices.filter((x) => x.text !== n.text), { ...n, id: (notices.at(-1)?.id || 0) + 1, route: location.hash }];
	emitNotices();
}

export function clearNotices() {
	notices = [];
	emitNotices();
}

window.addEventListener('hashchange', () => {
	const keep = notices.filter((n) => n.route === location.hash);
	if (keep.length !== notices.length) {
		notices = keep;
		emitNotices();
	}
});

/** WooCommerce's "“Name” has been added to your cart." message, with the View cart button. */
export function addedToCartNotice(state, productId, qty = 1) {
	const name = state.products?.[productId]?.name || 'Product';
	const text = qty > 1 ? `${qty} × “${name}” have been added to your cart.` : `“${name}” has been added to your cart.`;
	pushNotice({ type: 'success', text, action: { href: '#store.cart', label: 'View cart' } });
}

export function Notices() {
	const [list, setList] = useState(notices);
	useEffect(() => {
		noticeSubs.add(setList);
		setList(notices);
		return () => noticeSubs.delete(setList);
	}, []);
	const here = list.filter((n) => n.route === location.hash);
	if (!here.length) return html`<div class="woocommerce-notices-wrapper"></div>`;
	return html`
		<div class="woocommerce-notices-wrapper">
			${here.map(
				(n) => html`
					<div key=${n.id} class=${cx('st-notice', n.type === 'error' ? 'woocommerce-error' : n.type === 'info' ? 'woocommerce-info' : 'woocommerce-message')} role="alert" tabindex="-1">
						${n.action && html`<a href=${n.action.href} class="button wc-forward">${n.action.label}</a>`}
						<span>${n.text}</span>
					</div>
				`
			)}
		</div>
	`;
}

// ── Theme frame ────────────────────────────────────────────────────────────

const BagIcon = () => html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>`;

function MiniCart() {
	const state = useStore();
	const [open, setOpen] = useState(false);
	const box = useRef(null);
	const items = state.cart?.items || [];
	const count = cartCount(state);

	useEffect(() => {
		if (!open) return;
		const onDoc = (e) => !box.current?.contains(e.target) && setOpen(false);
		const onKey = (e) => e.key === 'Escape' && setOpen(false);
		document.addEventListener('pointerdown', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	return html`
		<div class=${cx('st-minicart', open && 'is-open')} ref=${box} onMouseEnter=${() => setOpen(true)} onMouseLeave=${() => setOpen(false)}>
			<a class="st-minicart__link" href="#store.cart" aria-expanded=${open} onFocus=${() => setOpen(true)}>
				<span class="st-minicart__amount">${money(cartTotal(state))}</span>
				<span class="st-minicart__count">${count} ${count === 1 ? 'item' : 'items'}</span>
				<span class="st-minicart__icon"><${BagIcon} />${count > 0 && html`<span class="st-minicart__badge">${count}</span>`}</span>
			</a>
			<div class="st-minicart__drop widget_shopping_cart" hidden=${!open}>
				${items.length
					? html`
							<ul class="woocommerce-mini-cart cart_list product_list_widget">
								${items.map((it) => {
									const p = state.products?.[it.productId];
									const rows = optionRows(state, it);
									const summary = rows.length ? '' : cartSummary(it.custom);
									return html`
										<li key=${it.key} class="woocommerce-mini-cart-item mini_cart_item">
											<button type="button" class="remove remove_from_cart_button" aria-label=${'Remove ' + lineName(state, it) + ' from cart'} onClick=${() => removeFromCart(it.key)}>×</button>
											<a href=${'#store.product.' + (p?.slug || '')}>
												${p && html`<${LineImage} state=${state} item=${it} size=${48} class="st-minicart__thumb" />`}
												<span>${lineName(state, it)}</span>
											</a>
											${summary && html`<dl class="variation"><dt>3D Customization:</dt><dd>${summary}</dd></dl>`}
											${rows.length > 0 && html`<dl class="variation">${rows.map((l) => html`<dt class=${metaClass(l.label)}>${l.label}:</dt><dd class=${metaClass(l.label)}><${OptionValue} line=${l} /></dd>`)}</dl>`}
											<span class="quantity">${it.qty} × <span class="amount">${money(unitPrice(state, it))}</span></span>
										</li>
									`;
								})}
							</ul>
							<p class="woocommerce-mini-cart__total total"><strong>Subtotal:</strong> <span class="amount">${money(cartTotal(state))}</span></p>
							<p class="woocommerce-mini-cart__buttons buttons">
								<a href="#store.cart" class="button wc-forward">View cart</a>
								<a href="#store.checkout" class="button checkout wc-forward">Checkout</a>
							</p>
						`
					: html`<p class="woocommerce-mini-cart__empty-message">No products in the cart.</p>`}
			</div>
		</div>
	`;
}

/**
 * <StoreTheme crumbs=${[['Home', '#store.shop'], ['Shop']]}>…</StoreTheme>
 * crumbs: optional WooCommerce breadcrumb trail; the last entry is the current page.
 */
export function StoreTheme({ children, crumbs }) {
	const state = useStore();
	const [navOpen, setNavOpen] = useState(false);
	const count = cartCount(state);
	const hash = location.hash;
	const on = (prefix) => hash.startsWith('#' + prefix);
	const account = useFeature('saved-designs'); // saved-designs: My Account link
	const lookbook = useFeature('block'); // block: a page built with viewer blocks
	return html`
		<div class="st-site">
			<header class="st-header" role="banner">
				<div class="st-wrap st-header__row">
					<a class="st-brand" href="#store.shop">
						<span class="st-brand__mark" aria-hidden="true"></span>
						<span class="st-brand__name">Demo Store</span>
					</a>
					<button type="button" class="st-navtoggle" aria-expanded=${navOpen} aria-controls="st-nav" onClick=${() => setNavOpen(!navOpen)}>
						<span aria-hidden="true">☰</span> Menu
					</button>
					<nav id="st-nav" class=${cx('st-nav', navOpen && 'is-open')} aria-label="Primary">
						<a href="#store.shop" class=${cx((on('store.shop') || on('store.product')) && 'is-current')} onClick=${() => setNavOpen(false)}>Shop</a>
						<a href="#store.cart" class=${cx(on('store.cart') && 'is-current')} onClick=${() => setNavOpen(false)}>Cart (${count})</a>
						<a href="#store.checkout" class=${cx(on('store.checkout') && 'is-current')} onClick=${() => setNavOpen(false)}>Checkout</a>
						${account && html`<a href="#store.account" class=${cx(on('store.account') && 'is-current')} onClick=${() => setNavOpen(false)}>My account</a>`}
						${lookbook && html`<a href="#store.page.lookbook" class=${cx(on('store.page.lookbook') && 'is-current')} onClick=${() => setNavOpen(false)}>Lookbook</a>`}
						<${Slot} name="store.nav" isCurrent=${on} onNavigate=${() => setNavOpen(false)} />
					</nav>
					<${MiniCart} />
				</div>
			</header>
			<div class="st-content">
				<div class="st-wrap">
					${crumbs?.length
						? html`<nav class="woocommerce-breadcrumb" aria-label="Breadcrumb">
								${crumbs.map(([label, href], i) => html`${i > 0 && html`<span class="st-crumb-sep" aria-hidden="true"> / </span>`}${href && i < crumbs.length - 1 ? html`<a href=${href}>${label}</a>` : html`<span>${label}</span>`}`)}
							</nav>`
						: null}
					<${Notices} />
					${children}
				</div>
			</div>
			<footer class="st-footer" role="contentinfo">
				<div class="st-wrap st-footer__row">
					<div>
						<strong class="st-footer__brand">Demo Store</strong>
						<p>Furniture, lighting and small things for the home.</p>
					</div>
					<ul class="st-footer__links">
						<li><a href="#store.shop">Shop</a></li>
						<li><a href="#store.cart">Cart</a></li>
						<li><a href="#store.checkout">Checkout</a></li>
					</ul>
					<p class="st-footer__copy">© 2026 Demo Store. Built with WooCommerce.</p>
				</div>
			</footer>
		</div>
	`;
}

export default StoreTheme;
