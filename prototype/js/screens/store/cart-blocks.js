// WooCommerce Cart block (wp-block-woocommerce-cart): the cart page when the demo store uses blocks
// (state.demo.cartPage). The plugin fills it through the Store API: item_data and the line image.
import { html, useState, useEffect, useLayoutEffect, useRef, money, cx } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { go } from '../../core/router.js';
import { useFeature } from '../../core/features.js';
import { cartSummary } from '../../shared/product-3d.js';
import { LineImage } from '../../shared/snapshot.js';
import { ProductImage } from '../../shared/product-image.js';
import { StoreTheme, removeFromCart, optionRows, OptionValue } from './theme.js';
import { lineProduct, lineVariation, unitPrice, cartTotal, ProtoHint, fillDemoCart, linePreview, useDialogFocus } from './cart.js';
import { ViewerModal, OrderPreviewRoot } from './viewer-ui.js';

// ── Pieces shared with the Checkout block ───────────────────────────────────

/** useContainerWidthContext: is-large ≥ 700, is-medium ≥ 520, is-small ≥ 400, else is-mobile. */
export function useContainerSize() {
	const ref = useRef(null);
	const [size, setSize] = useState('is-large');
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const measure = () => {
			const w = el.getBoundingClientRect().width;
			setSize(w >= 700 ? 'is-large' : w >= 520 ? 'is-medium' : w >= 400 ? 'is-small' : 'is-mobile');
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return [ref, size];
}

const kebab = (s) =>
	String(s)
		.trim()
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();

/** <FormattedMoney> as the blocks print it. */
export function Money({ value, class: cls }) {
	return html`<span class=${cx('wc-block-formatted-money-amount wc-block-components-formatted-money-amount', cls)}>${money(value)}</span>`;
}

export function ProductPrice({ value, class: cls }) {
	return html`<span class=${cx('price wc-block-components-product-price', cls)}><${Money} value=${value} class="wc-block-components-product-price__value" /></span>`;
}

/** Store API item_data: option rows, else the single "3D Customization" row the shipped plugin returns. */
function itemData(state, item) {
	const rows = optionRows(state, item);
	if (rows.length) return rows.map((l) => ({ key: l.key, name: l.label, value: html`<${OptionValue} line=${l} />` }));
	const summary = cartSummary(item.custom);
	return summary ? [{ key: '3d', name: '3D Customization', value: summary }] : [];
}

function ProductDetails({ details }) {
	if (!details.length) return null;
	return html`<ul class="wc-block-components-product-details">
		${details.map(
			(d) => html`<li key=${d.key || d.name} class=${'wc-block-components-product-details__' + kebab(d.name)}>
				<span class="wc-block-components-product-details__name">${d.name}:</span>${' '}
				<span class="wc-block-components-product-details__value">${d.value}</span>
			</li>`
		)}
	</ul>`;
}

/** ProductSummary trims the short description to 15 words. */
function summaryText(text, words = 15) {
	const list = String(text || '').trim().split(/\s+/).filter(Boolean);
	return list.length > words ? list.slice(0, words).join(' ') + '…' : list.join(' ');
}

/** <ProductMetadata>: description, item data, then the variation attributes. */
export function ProductMetadata({ state, item }) {
	const p = lineProduct(state, item);
	const v = lineVariation(state, item);
	const variation = v ? Object.entries(v.attributes || {}).filter(([, val]) => val).map(([name, value]) => ({ key: 'attr-' + name, name, value })) : [];
	return html`<div class="wc-block-components-product-metadata">
		${p?.short && html`<div class="wc-block-components-product-metadata__description"><p>${summaryText(p.short)}</p></div>`}
		<${ProductDetails} details=${itemData(state, item)} />
		<${ProductDetails} details=${variation} />
	</div>`;
}

/** Store API item name: the parent product (attributes are listed as details). */
export const blockItemName = (state, item) => lineProduct(state, item)?.name || 'Deleted product';

/** Prototype switch back to the classic shortcode pages. */
export function BlockSetupHint({ page }) {
	const checkout = page === 'checkout';
	return html`<${ProtoHint}>
		Demo store setup: ${checkout ? 'Checkout page uses the Checkout block.' : 'Cart page uses the Cart block.'}${' '}
		<button type="button" class="proto-cart-hint__btn" onClick=${() => store.patch('demo.cartPage', 'classic')}>${checkout ? 'Use the classic checkout' : 'Use the classic cart'}</button>
	<//>`;
}

/** Store notices: snackbar for info (auto-dismiss), banner for errors. */
export function Snackbars({ list, onDismiss }) {
	useEffect(() => {
		if (!list.length) return;
		const t = setTimeout(() => onDismiss(list[0].id), 10000);
		return () => clearTimeout(t);
	}, [list]);
	if (!list.length) return null;
	return html`<div class="wc-block-components-notice-snackbar-list" tabindex="-1">
		${list.map(
			(n) => html`<div key=${n.id} class="wc-block-components-notice-banner is-info wc-block-components-notice-snackbar" role="status" onClick=${() => onDismiss(n.id)}>
				<div class="wc-block-components-notice-banner__content">${n.text}</div>
			</div>`
		)}
	</div>`;
}

export function NoticeBanner({ status = 'error', children }) {
	return html`<div class=${'wc-block-components-notice-banner is-' + status} role="alert">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zm0 16a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4zM11 7h2v6h-2V7zm0 8h2v2h-2v-2z"></path></svg>
		<div class="wc-block-components-notice-banner__content">${children}</div>
	</div>`;
}

const Chevron = ({ up }) =>
	html`<svg class="wc-block-components-panel__button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d=${up ? 'M6.5 12.4L12 8l5.5 4.4-.9 1.2L12 10l-4.5 3.6-1-1.2z' : 'M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z'}></path></svg>`;

/** "Add coupons" panel (wc-block-components-totals-coupon). */
export function CouponPanel() {
	const [open, setOpen] = useState(false);
	const [code, setCode] = useState('');
	const [error, setError] = useState('');
	const apply = (e) => {
		e.preventDefault();
		const c = code.trim();
		if (c) setError(`"${c.toLowerCase()}" is an invalid coupon code.`);
	};
	return html`<div class="wc-block-components-totals-wrapper">
		<div class=${cx('wc-block-components-panel wc-block-components-totals-coupon', open && 'is-open')}>
			<div role="button" tabindex="0" class="wc-block-components-panel__button" aria-expanded=${open} onClick=${() => setOpen(!open)} onKeyDown=${(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen(!open))}>
				Add coupons<${Chevron} up=${open} />
			</div>
			${open &&
			html`<div class="wc-block-components-panel__content">
				<form class="wc-block-components-totals-coupon__form" onSubmit=${apply}>
					<div class=${cx('wc-block-components-text-input wc-block-components-totals-coupon__input', (code || error) && 'is-active', error && 'has-error')}>
						<input id="wc-block-components-totals-coupon__input-coupon" type="text" autocomplete="off" aria-label="Enter code" value=${code} onInput=${(e) => { setCode(e.currentTarget.value); setError(''); }} autofocus />
						<label for="wc-block-components-totals-coupon__input-coupon">Enter code</label>
					</div>
					<button type="submit" class="wc-block-components-button wp-element-button wc-block-components-totals-coupon__button contained" disabled=${!code.trim()}>
						<span class="wc-block-components-button__text">Apply</span>
					</button>
				</form>
				${error && html`<div class="wc-block-components-validation-error" role="alert"><p>${error}</p></div>`}
			</div>`}
		</div>
	</div>`;
}

export function TotalsItem({ label, value, description, class: cls }) {
	return html`<div class=${cx('wc-block-components-totals-item', cls)}>
		<span class="wc-block-components-totals-item__label">${label}</span>
		${typeof value === 'number' ? html`<${Money} value=${value} class="wc-block-components-totals-item__value" />` : html`<span class="wc-block-components-totals-item__value">${value}</span>`}
		<div class="wc-block-components-totals-item__description">${description}</div>
	</div>`;
}

// ── Cart block ──────────────────────────────────────────────────────────────

function QuantitySelector({ name, value, onChange }) {
	const [draft, setDraft] = useState(null);
	const commit = (v) => {
		setDraft(null);
		const n = Math.max(1, Math.min(9999, Math.floor(Number(v) || 0)));
		if (n !== value) onChange(n);
	};
	return html`<div class="wc-block-components-quantity-selector">
		<input
			class="wc-block-components-quantity-selector__input"
			type="number"
			step="1"
			min="1"
			max="9999"
			value=${draft ?? value}
			aria-label=${`Quantity of ${name} in your cart.`}
			onInput=${(e) => setDraft(e.currentTarget.value)}
			onChange=${(e) => commit(e.currentTarget.value)}
			onKeyDown=${(e) => e.key === 'Enter' && commit(e.currentTarget.value)}
		/>
		<button type="button" aria-label=${`Reduce quantity of ${name}`} class="wc-block-components-quantity-selector__button wc-block-components-quantity-selector__button--minus" disabled=${value <= 1} onClick=${() => commit(value - 1)}>－</button>
		<button type="button" aria-label=${`Increase quantity of ${name}`} class="wc-block-components-quantity-selector__button wc-block-components-quantity-selector__button--plus" onClick=${() => commit(value + 1)}>＋</button>
	</div>`;
}

function CartLineItem({ state, item, onRemove, onPreview }) {
	const snapshot = useFeature('order-snapshot');
	const p = lineProduct(state, item);
	const name = blockItemName(state, item);
	const href = p ? '#store.product.' + p.slug : '#store.shop';
	const unit = unitPrice(state, item);
	const pv = snapshot ? linePreview(state, item) : null;
	const setQty = (qty) => store.patch('cart.items', (list) => (list || []).map((x) => (x.key === item.key ? { ...x, qty } : x)));
	return html`<tr class="wc-block-cart-items__row">
		<td class="wc-block-cart-item__image" aria-hidden="true">
			<a href=${href} tabindex="-1"><${LineImage} state=${state} item=${item} size=${80} /></a>
		</td>
		<td class="wc-block-cart-item__product">
			<div class="wc-block-cart-item__wrap">
				<a class="wc-block-components-product-name" href=${href}>${name}</a>
				<div class="wc-block-cart-item__prices"><${ProductPrice} value=${unit} /></div>
				<${ProductMetadata} state=${state} item=${item} />
				${pv && html`<p class="wc3d-cart-view3d"><a href="#" class="wc3d-cart-view3d__link" aria-haspopup="dialog" onClick=${(e) => { e.preventDefault(); onPreview(pv); }}>View in 3D</a></p>`}
				<div class="wc-block-cart-item__quantity">
					<${QuantitySelector} name=${name} value=${item.qty} onChange=${setQty} />
					<button type="button" class="wc-block-cart-item__remove-link" aria-label=${`Remove ${name} from cart`} onClick=${() => onRemove(item)}>Remove item</button>
				</div>
			</div>
		</td>
		<td class="wc-block-cart-item__total">
			<div class="wc-block-cart-item__total-price-and-sale-badge-wrapper"><${ProductPrice} value=${unit * item.qty} /></div>
		</td>
	</tr>`;
}

function priceRange(state, p) {
	const prices = (p.variations || []).map((id) => state.variations?.[id]?.price).filter((n) => n != null).map(Number);
	if (!prices.length) return money(p.price);
	const lo = Math.min(...prices);
	const hi = Math.max(...prices);
	return lo === hi ? money(lo) : `${money(lo)} – ${money(hi)}`;
}

/** wp-block-woocommerce-empty-cart-block: title, dots separator, "New in store" product grid. */
function EmptyCartBlock({ state }) {
	const fresh = Object.values(state.products || {})
		.filter((p) => p.status === 'publish')
		.sort((a, b) => String(b.dateCreated).localeCompare(String(a.dateCreated)))
		.slice(0, 4);
	return html`<div class="wp-block-woocommerce-empty-cart-block">
		<h2 class="wp-block-heading has-text-align-center with-empty-cart-icon wc-block-cart__empty-cart__title">Your cart is currently empty!</h2>
		<hr class="wp-block-separator has-alpha-channel-opacity is-style-dots" />
		<h2 class="wp-block-heading has-text-align-center">New in store</h2>
		<div class="wp-block-product-new wc-block-grid has-4-columns">
			<ul class="wc-block-grid__products">
				${fresh.map(
					(p) => html`<li key=${p.id} class="wc-block-grid__product">
						<a href=${'#store.product.' + p.slug} class="wc-block-grid__product-link">
							<div class="wc-block-grid__product-image"><${ProductImage} product=${p} size=${240} fluid /></div>
							<div class="wc-block-grid__product-title">${p.name}</div>
						</a>
						<div class="wc-block-grid__product-price price">${priceRange(state, p)}</div>
					</li>`
				)}
			</ul>
		</div>
		<${ProtoHint}>
			The demo cart starts empty. Add a product from the <a href="#store.product.lounge-chair">product page</a>, or${' '}
			<button type="button" class="proto-cart-hint__btn" onClick=${fillDemoCart}>fill the cart with demo items</button>.
		<//>
	</div>`;
}

function FilledCart({ state, items }) {
	const [ref, size] = useContainerSize();
	const [snacks, setSnacks] = useState([]);
	const [preview, setPreview] = useState(null);
	const snapshot = useFeature('order-snapshot');
	useDialogFocus('wc3d-cart-modal', snapshot && !!preview);
	const subtotal = cartTotal(state, items);

	const remove = (it) => {
		removeFromCart(it.key);
		setSnacks((l) => [...l.filter((n) => n.id !== 'removed-cart-item'), { id: 'removed-cart-item', text: `"${blockItemName(state, it)}" was removed from your cart.` }]);
	};

	return html`
		<div ref=${ref} class=${cx('wc-block-components-sidebar-layout wc-block-cart wp-block-woocommerce-filled-cart-block', size)}>
			<div class="wc-block-components-main wc-block-cart__main wp-block-woocommerce-cart-items-block">
				<table class="wc-block-cart-items wp-block-woocommerce-cart-line-items-block">
					<thead>
						<tr class="wc-block-cart-items__header">
							<th class="wc-block-cart-items__header-image"><span>Product</span></th>
							<th class="wc-block-cart-items__header-product"><span>Details</span></th>
							<th class="wc-block-cart-items__header-total"><span>Total</span></th>
						</tr>
					</thead>
					<tbody>
						${items.map((it) => html`<${CartLineItem} key=${it.key} state=${state} item=${it} onRemove=${remove} onPreview=${(pv) => setPreview((cur) => ({ ...pv, n: (cur?.n || 0) + 1 }))} />`)}
					</tbody>
				</table>
			</div>
			<div class="wc-block-components-sidebar wc-block-cart__sidebar wp-block-woocommerce-cart-totals-block">
				<div class="wp-block-woocommerce-cart-order-summary-block">
					<div class="wc-block-components-totals-wrapper">
						<h2 class="wc-block-components-title wc-block-cart__totals-title">Cart totals</h2>
					</div>
					<${CouponPanel} />
					<div class="wc-block-components-totals-wrapper">
						<${TotalsItem} label="Subtotal" value=${subtotal} />
					</div>
					<div class="wc-block-components-totals-wrapper">
						<${TotalsItem} class="wc-block-components-totals-footer-item" label="Estimated total" value=${subtotal} />
					</div>
				</div>
				<div class="wc-block-cart__submit wp-block-woocommerce-proceed-to-checkout-block">
					<div class="wc-block-cart__submit-container">
						<a href="#store.checkout" class="wc-block-components-button wp-element-button wc-block-cart__submit-button contained" onClick=${(e) => { e.preventDefault(); go('store.checkout'); }}>
							<span class="wc-block-components-button__text">Proceed to Checkout</span>
						</a>
					</div>
				</div>
			</div>
		</div>
		<${Snackbars} list=${snacks} onDismiss=${(id) => setSnacks((l) => l.filter((n) => n.id !== id))} />
		${snapshot && html`<${ViewerModal} id="wc3d-cart-modal" open=${!!preview} onClose=${() => setPreview(null)}>${preview && html`<${OrderPreviewRoot} key=${preview.n} productId=${preview.productId} variationId=${preview.variationId} choices=${preview.custom} />`}<//>`}
	`;
}

export function BlockCart() {
	const state = useStore();
	const items = state.cart?.items || [];
	return html`
		<${StoreTheme}>
			<div class="wc-proto-page wc-proto-blocks">
				<h1 class="entry-title">Cart</h1>
				<${BlockSetupHint} page="cart" />
				<div class="wp-block-woocommerce-cart alignwide">
					${items.length ? html`<${FilledCart} state=${state} items=${items} />` : html`<${EmptyCartBlock} state=${state} />`}
				</div>
			</div>
		<//>
	`;
}
