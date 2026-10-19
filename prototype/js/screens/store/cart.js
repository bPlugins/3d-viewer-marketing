// WooCommerce classic cart (cart/cart.php + cart-totals.php) with the plugin's
// "3D Customization" item-data row (CartItemData::get_item_data).
import { html, useState, useEffect, money, cx } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { go } from '../../core/router.js';
import { useFeature, isOn } from '../../core/features.js';
import { cartSummary, modelFor } from '../../shared/product-3d.js';
import { isEmptyCustom, lineVariationId } from '../../shared/options.js';
import { LineImage, saveSnapshot } from '../../shared/snapshot.js';
import { StoreTheme, addToCart, captureLine, removeFromCart, pruneSnapshots, optionRows, OptionValue, metaClass, unitPrice as themeUnitPrice } from './theme.js';
import { ViewerModal, OrderPreviewRoot } from './viewer-ui.js';
import { BlockCart } from './cart-blocks.js';
import { protoLabel } from '../../shared/slots.js';

// ── Helpers shared by cart, checkout and order received ─────────────────────

export function lineProduct(state, item) {
	return state.products?.[item.productId] || null;
}

export function lineVariation(state, item) {
	const v = item.variationId ? state.variations?.[item.variationId] : null;
	return v && v.parentId === item.productId ? v : null;
}

/** WC variation title: "Lounge Chair - Teal" (attributes are in the name, so not repeated as item data). */
export function lineName(state, item) {
	const p = lineProduct(state, item);
	if (!p) return 'Deleted product';
	const v = lineVariation(state, item);
	const attrs = v ? Object.values(v.attributes || {}).filter(Boolean) : [];
	return attrs.length ? `${p.name} - ${attrs.join(', ')}` : p.name;
}

export function unitPrice(state, item) {
	return themeUnitPrice(state, item);
}

export const cartTotal = (state, items) => items.reduce((sum, it) => sum + unitPrice(state, it) * it.qty, 0);

/** Option rows: `lines` (frozen by the caller, option-pricing) ‖ the item's frozen/recomputed rows (optionRows decides). */
function useOptionRows(item, lines) {
	const state = useStore();
	const pricing = useFeature('option-pricing');
	if (pricing && lines?.length) return lines;
	return item ? optionRows(state, item) : [];
}

/** wc_get_formatted_cart_item_data(): dl.variation with the "3D Customization" row (one row per option with option-pricing). */
export function ItemData({ custom, item, lines }) {
	const rows = useOptionRows(item, lines);
	if (rows.length) {
		return html`<dl class="variation">
			${rows.map((l) => html`<dt class=${metaClass(l.label)}>${l.label}:</dt><dd class=${metaClass(l.label)}><p><${OptionValue} line=${l} /></p></dd>`)}
		</dl>`;
	}
	const summary = cartSummary(custom);
	if (!summary) return null;
	return html`<dl class="variation">
		<dt class="variation-3DCustomization">3D Customization:</dt>
		<dd class="variation-3DCustomization"><p>${summary}</p></dd>
	</dl>`;
}

/** Order item meta (wc_display_item_meta): ul.wc-item-meta. */
export function ItemMeta({ custom, item, lines }) {
	const rows = useOptionRows(item, lines);
	if (rows.length) {
		return html`<ul class="wc-item-meta">
			${rows.map((l) => html`<li key=${l.key}><strong class="wc-item-meta-label">${l.label}:</strong> <p><${OptionValue} line=${l} /></p></li>`)}
		</ul>`;
	}
	const summary = cartSummary(custom);
	if (!summary) return null;
	return html`<ul class="wc-item-meta">
		<li><strong class="wc-item-meta-label">3D Customization:</strong> <p>${summary}</p></li>
	</ul>`;
}

export function Notices({ list, onUndo }) {
	if (!list?.length) return null;
	return html`<div class="woocommerce-notices-wrapper">
		${list.map((n, i) =>
			n.type === 'error'
				? html`<ul key=${i} class="woocommerce-error" role="alert">${(Array.isArray(n.text) ? n.text : [n.text]).map((t, j) => html`<li key=${j}>${t}</li>`)}</ul>`
				: html`<div key=${i} class=${n.type === 'info' ? 'woocommerce-info' : 'woocommerce-message'} role="alert">
						${n.text}
						${n.undo && html` <a href="#" class="restore-item" onClick=${(e) => { e.preventDefault(); onUndo?.(n.undo); }}>Undo?</a>`}
					</div>`
		)}
	</div>`;
}

/** `class` adds modifiers; `proto-cart-hint--dev` marks a developer note the live demo hides. */
export function ProtoHint({ children, class: extra }) {
	return html`<div class=${cx('proto-cart-hint', extra)}><span class="proto-cart-hint__tag">${protoLabel()}</span><span>${children}</span></div>`;
}

/** order-snapshot: prototype switch to the Cart/Checkout block pages (the reverse of BlockSetupHint). */
export function ClassicSetupHint({ page }) {
	if (!useFeature('order-snapshot')) return null;
	const checkout = page === 'checkout';
	return html`<${ProtoHint}>
		Demo store setup: ${checkout ? 'Checkout page uses the classic checkout.' : 'Cart page uses the classic cart.'}${' '}
		<button type="button" class="proto-cart-hint__btn" onClick=${() => store.patch('demo.cartPage', 'blocks')}>${checkout ? 'Use the Checkout block' : 'Use the Cart block'}</button>
	<//>`;
}

/** Line image: the order-snapshot picture when the line has one, else the WooCommerce product image. */
export function LineThumb({ state, item, size = 64 }) {
	return html`<${LineImage} state=${state} item=${item} size=${size} />`;
}

/** order-snapshot "View in 3D": a customized line whose product has 3D on and a model (OrderPreview.php rules). */
export function linePreview(state, item) {
	const p = lineProduct(state, item);
	if (!p || p.meta?._wc3d_enabled !== 'yes' || isEmptyCustom(item.custom)) return null;
	const vid = lineVariationId(state, item);
	return modelFor(state, p.id, vid).model ? { productId: p.id, variationId: vid, custom: item.custom } : null;
}

/** order-snapshot: the "View in 3D" dialog takes focus on open and hands it back to the link on close. */
export function useDialogFocus(id, open) {
	useEffect(() => {
		if (!open) return;
		const back = document.activeElement;
		document.querySelector(`#${id} .wc3d-modal__close`)?.focus();
		return () => back?.isConnected && back.focus();
	}, [open]);
}

export function EmptyCart({ notices, onUndo }) {
	return html`
		<${Notices} list=${notices} onUndo=${onUndo} />
		<div class="wc-empty-cart-message"><div class="cart-empty woocommerce-info" role="status">Your cart is currently empty.</div></div>
		<p class="return-to-shop"><a class="button wc-backward" href="#store.shop">Return to shop</a></p>
		<${ProtoHint}>
			The demo cart starts empty. Add a product from the <a href="#store.product.lounge-chair">product page</a>, or${' '}
			<button type="button" class="proto-cart-hint__btn" onClick=${fillDemoCart}>fill the cart with demo items</button>.
		<//>
	`;
}

export function fillDemoCart() {
	const lines = isOn('option-groups')
		? [
				{ productId: 101, variationId: 203, qty: 1, custom: { options: { frame: 'smoked', pillow: 'without' } } },
				{ productId: 102, qty: 1, custom: { options: { shade: 'sage' } } },
				{ productId: 103, qty: 2, custom: { options: { glaze: 'lagoon' } } },
			]
		: [
				{ productId: 101, variationId: 203, qty: 1, custom: { materials: { Seat_Cushion: { baseColor: '#ef4444' }, Back_Cushion: { baseColor: '#ef4444' } }, meshes: { Pillow: { visible: false } } } },
				{ productId: 102, qty: 1, custom: { materials: { Shade: { baseColor: '#10b981' } } } },
				{ productId: 103, qty: 2 },
			];
	lines.forEach((l) => captureLine(addToCart(l)));
}

// ── Cart screen ─────────────────────────────────────────────────────────────

function CartPage() {
	const state = useStore();
	const items = state.cart?.items || [];
	const [draft, setDraft] = useState({});
	const [notices, setNotices] = useState([]);
	const [coupon, setCoupon] = useState('');
	const [preview, setPreview] = useState(null);
	const snapshot = useFeature('order-snapshot');
	useDialogFocus('wc3d-cart-modal', snapshot && !!preview);

	const qtyOf = (it) => (draft[it.key] ?? String(it.qty));
	const changed = items.some((it) => draft[it.key] !== undefined && Number(draft[it.key]) !== it.qty);

	const remove = (it) => {
		const index = items.indexOf(it);
		const snap = it.snapshotId ? state.snapshots?.[it.snapshotId] : null;
		removeFromCart(it.key);
		setNotices([{ type: 'message', text: `“${lineName(state, it)}” removed.`, undo: { item: it, index, snap } }]);
	};

	// order-snapshot: the removed line's picture was pruned, so it is stored again (or the line recaptured).
	const undo = ({ item, index, snap }) => {
		let line = item;
		if (item.snapshotId != null && item.snapshotId !== 0 && store.get().snapshots?.[item.snapshotId]?.url !== snap?.url) {
			const { snapshotId: _drop, ...rest } = item;
			const id = snap ? saveSnapshot(snap.url, snap.productId) : 0;
			line = id ? { ...rest, snapshotId: id } : rest;
		}
		store.patch('cart.items', (list) => {
			const next = [...(list || [])];
			next.splice(Math.min(index, next.length), 0, line);
			return next;
		});
		captureLine(line.key);
		setNotices([]);
	};

	const update = (e) => {
		e?.preventDefault();
		if (!changed) return;
		store.patch('cart.items', (list) =>
			(list || [])
				.map((it) => {
					const q = draft[it.key];
					return q === undefined ? it : { ...it, qty: Math.max(0, Math.floor(Number(q) || 0)) };
				})
				.filter((it) => it.qty > 0)
		);
		pruneSnapshots();
		setDraft({});
		setNotices([{ type: 'message', text: 'Cart updated.' }]);
	};

	const applyCoupon = () => {
		const code = coupon.trim();
		setNotices([{ type: 'error', text: code ? `Coupon "${code.toLowerCase()}" does not exist!` : 'Please enter a coupon code.' }]);
	};

	if (!items.length) return html`<${EmptyCart} notices=${notices} onUndo=${undo} />`;

	const subtotal = cartTotal(state, items);
	return html`
		<${Notices} list=${notices} onUndo=${undo} />
		<form class="woocommerce-cart-form" onSubmit=${update}>
			<table class="shop_table shop_table_responsive cart woocommerce-cart-form__contents" cellspacing="0">
				<thead>
					<tr>
						<th class="product-remove"><span class="screen-reader-text">Remove item</span></th>
						<th class="product-thumbnail"><span class="screen-reader-text">Thumbnail image</span></th>
						<th class="product-name">Product</th>
						<th class="product-price">Price</th>
						<th class="product-quantity">Quantity</th>
						<th class="product-subtotal">Subtotal</th>
					</tr>
				</thead>
				<tbody>
					${items.map((it) => {
						const p = lineProduct(state, it);
						const name = lineName(state, it);
						const pv = snapshot ? linePreview(state, it) : null;
						return html`
							<tr key=${it.key} class="woocommerce-cart-form__cart-item cart_item">
								<td class="product-remove">
									<a href="#" class="remove" aria-label=${`Remove ${name} from cart`} onClick=${(e) => { e.preventDefault(); remove(it); }}>×</a>
								</td>
								<td class="product-thumbnail">${p && html`<a href=${'#store.product.' + p.slug}><${LineThumb} state=${state} item=${it} /></a>`}</td>
								<td class="product-name" data-title="Product">
									${p ? html`<a href=${'#store.product.' + p.slug}>${name}</a>` : name}
									<${ItemData} custom=${it.custom} item=${it} />
									${pv && html`<p class="wc3d-cart-view3d"><a href="#" class="wc3d-cart-view3d__link" aria-haspopup="dialog" onClick=${(e) => { e.preventDefault(); setPreview((cur) => ({ ...pv, n: (cur?.n || 0) + 1 })); }}>View in 3D</a></p>`}
								</td>
								<td class="product-price" data-title="Price"><span class="woocommerce-Price-amount amount">${money(unitPrice(state, it))}</span></td>
								<td class="product-quantity" data-title="Quantity">
									<div class="quantity">
										<label class="screen-reader-text" for=${'qty-' + it.key}>${name} quantity</label>
										<input
											id=${'qty-' + it.key}
											type="number"
											class="input-text qty text"
											min="0"
											step="1"
											inputmode="numeric"
											value=${qtyOf(it)}
											aria-label="Product quantity"
											onInput=${(e) => setDraft({ ...draft, [it.key]: e.currentTarget.value })}
										/>
									</div>
								</td>
								<td class="product-subtotal" data-title="Subtotal"><span class="woocommerce-Price-amount amount">${money(unitPrice(state, it) * it.qty)}</span></td>
							</tr>
						`;
					})}
					<tr>
						<td colspan="6" class="actions">
							<div class="coupon">
								<label for="coupon_code" class="screen-reader-text">Coupon:</label>
								<input
									type="text"
									name="coupon_code"
									class="input-text"
									id="coupon_code"
									value=${coupon}
									placeholder="Coupon code"
									onInput=${(e) => setCoupon(e.currentTarget.value)}
									onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }}
								/>
								<button type="button" class="button" name="apply_coupon" onClick=${applyCoupon}>Apply coupon</button>
							</div>
							<button type="submit" class="button" name="update_cart" disabled=${!changed} aria-disabled=${!changed}>Update cart</button>
						</td>
					</tr>
				</tbody>
			</table>
		</form>
		<div class="cart-collaterals">
			<div class="cart_totals">
				<h2>Cart totals</h2>
				<table cellspacing="0" class="shop_table shop_table_responsive">
					<tbody>
						<tr class="cart-subtotal">
							<th>Subtotal</th>
							<td data-title="Subtotal"><span class="woocommerce-Price-amount amount">${money(subtotal)}</span></td>
						</tr>
						<tr class="order-total">
							<th>Total</th>
							<td data-title="Total"><strong><span class="woocommerce-Price-amount amount">${money(subtotal)}</span></strong></td>
						</tr>
					</tbody>
				</table>
				<div class="wc-proceed-to-checkout">
					<a href="#store.checkout" class="checkout-button button alt wc-forward" onClick=${(e) => { e.preventDefault(); go('store.checkout'); }}>Proceed to checkout</a>
				</div>
			</div>
		</div>
		${snapshot && html`<${ViewerModal} id="wc3d-cart-modal" open=${!!preview} onClose=${() => setPreview(null)}>${preview && html`<${OrderPreviewRoot} key=${preview.n} productId=${preview.productId} variationId=${preview.variationId} choices=${preview.custom} />`}<//>`}
	`;
}

export default function Cart() {
	const blocks = useStore((s) => s.demo?.cartPage === 'blocks');
	if (blocks) return html`<${BlockCart} />`;
	return html`
		<${StoreTheme}>
			<div class="wc-proto-page">
				<h1 class="entry-title">Cart</h1>
				<${ClassicSetupHint} page="cart" />
				<div class=${cx('woocommerce', 'wc-proto-cart')}><${CartPage} /></div>
			</div>
		<//>
	`;
}
