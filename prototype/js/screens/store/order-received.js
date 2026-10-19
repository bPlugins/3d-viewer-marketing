// WooCommerce thank-you page (checkout/thankyou.php + order/order-details*.php) with the
// plugin's "3D Customization" item meta and "View 3D Preview" button + order modal (OrderPreview.php).
import { html, useState, money, cx } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { go } from '../../core/router.js';
import { useFeature } from '../../core/features.js';
import { applyFilter } from '../../shared/slots.js';
import { modelFor } from '../../shared/product-3d.js';
import { StoreTheme, addToCart, captureLine, pruneSnapshots, pushNotice } from './theme.js';
import { ViewerModal, OrderPreviewRoot } from './viewer-ui.js';
import { lineName, ItemMeta, LineThumb, ProtoHint } from './cart.js';
import { GATEWAYS } from './checkout.js';

const US_STATES = { California: 'CA', 'New York': 'NY', Texas: 'TX', Washington: 'WA' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function wcDate(s) {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
	return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : '';
}

/** OrderPreview::render_button() conditions: product exists, _wc3d_enabled = yes, a model resolves. */
function previewFor(state, item) {
	const p = state.products?.[item.productId];
	if (!p || p.meta?._wc3d_enabled !== 'yes' || !applyFilter('wc3d.order-preview', true)) return null;
	const vid = item.variationId && state.variations?.[item.variationId]?.parentId === p.id ? item.variationId : 0;
	const { model } = modelFor(state, p.id, vid);
	return model ? { productId: p.id, variationId: vid, model, custom: item.custom || null } : null;
}

/** WC_Cart_Session::populate_cart_from_order(): empties the cart, adds the lines back (order-snapshot: with their picture). */
function orderAgain(order) {
	store.patch('cart.items', []);
	go('store.cart');
	for (const it of order.items || []) {
		if (!store.get().products?.[it.productId]) continue;
		const key = addToCart({ productId: it.productId, variationId: it.variationId || 0, qty: it.qty, custom: it.custom || null, fromOrder: true });
		const line = key && store.get().cart.items.find((l) => l.key === key);
		if (!line) continue;
		// The order's picture comes back with the line; an order without one gets a new picture.
		if (it.snapshotId != null && line.snapshotId == null) {
			store.patch('cart.items', (list) => list.map((l) => (l.key === key ? { ...l, snapshotId: it.snapshotId } : l)));
		} else captureLine(key);
	}
	pruneSnapshots();
	pushNotice({ type: 'success', text: 'The cart has been filled with the items from your previous order.' });
}

function OrderReceived({ id }) {
	const state = useStore();
	const order = state.orders?.[id];
	const [preview, setPreview] = useState(null);
	const [modalKey, setModalKey] = useState(0);
	const snapshot = useFeature('order-snapshot');

	if (!order) {
		return html`<p class="woocommerce-notice woocommerce-notice--success woocommerce-thankyou-order-received">Thank you. Your order has been received.</p>`;
	}

	const items = order.items || [];
	const subtotal = items.reduce((s, it) => s + Number(it.total || 0), 0);
	const gateway = GATEWAYS.find((g) => g.id === order.paymentMethod || g.title === order.payment);
	const failed = order.status === 'failed';
	const b = order.billing;
	const span = snapshot ? 2 : undefined;
	const open = (pv) => {
		setModalKey((k) => k + 1);
		setPreview(pv);
	};

	return html`
		<div class="woocommerce-order">
			${failed
				? html`<p class="woocommerce-notice woocommerce-notice--error woocommerce-thankyou-order-failed">Unfortunately your order cannot be processed as the originating bank/merchant has declined your transaction. Please attempt your purchase again.</p>`
				: html`<p class="woocommerce-notice woocommerce-notice--success woocommerce-thankyou-order-received">Thank you. Your order has been received.</p>`}

			<ul class="woocommerce-order-overview woocommerce-thankyou-order-details order_details">
				<li class="woocommerce-order-overview__order order">Order number: <strong>${order.id}</strong></li>
				<li class="woocommerce-order-overview__date date">Date: <strong>${wcDate(order.date)}</strong></li>
				${order.customer?.email && html`<li class="woocommerce-order-overview__email email">Email: <strong>${order.customer.email}</strong></li>`}
				<li class="woocommerce-order-overview__total total">Total: <strong><span class="woocommerce-Price-amount amount">${money(subtotal)}</span></strong></li>
				${order.payment && html`<li class="woocommerce-order-overview__payment-method method">Payment method: <strong>${order.payment}</strong></li>`}
			</ul>

			${gateway && html`<p>${gateway.description}</p>`}

			<section class="woocommerce-order-details">
				<h2 class="woocommerce-order-details__title">Order details</h2>
				<table class=${cx('woocommerce-table woocommerce-table--order-details shop_table order_details', snapshot && 'wc3d-has-thumbs')}>
					<thead>
						<tr>${snapshot && html`<th class="product-thumbnail"><span class="screen-reader-text">Thumbnail image</span></th>`}<th class="woocommerce-table__product-name product-name">Product</th><th class="woocommerce-table__product-table product-total">Total</th></tr>
					</thead>
					<tbody>
						${items.map((it) => {
							const p = state.products?.[it.productId];
							const pv = previewFor(state, it);
							return html`<tr key=${it.id} class="woocommerce-table__line-item order_item">
								${snapshot && html`<td class="product-thumbnail"><${LineThumb} state=${state} item=${it} size=${64} /></td>`}
								<td class="woocommerce-table__product-name product-name">
									${p ? html`<a href=${'#store.product.' + p.slug}>${lineName(state, it)}</a>` : lineName(state, it)}${' '}
									<strong class="product-quantity">×${' '}${it.qty}</strong>
									<${ItemMeta} custom=${it.custom} item=${it} />
									${pv &&
									html`<div class="wc3d-order-preview-wrapper" style="margin-top: 10px; margin-bottom: 10px;">
										<button type="button" class="button wc3d-modal-trigger wc3d-order-preview-btn" data-wc3d-modal-open="1" data-wc3d-modal-target="wc3d-order-modal" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer;" onClick=${() => open(pv)}>
											<span aria-hidden="true" style="font-size: 13px;">⛶</span>
											<span>View 3D Preview</span>
										</button>
									</div>`}
								</td>
								<td class="woocommerce-table__product-total product-total"><span class="woocommerce-Price-amount amount">${money(it.total)}</span></td>
							</tr>`;
						})}
					</tbody>
					<tfoot>
						<tr><th scope="row" colspan=${span}>Subtotal:</th><td><span class="woocommerce-Price-amount amount">${money(subtotal)}</span></td></tr>
						${order.payment && html`<tr><th scope="row" colspan=${span}>Payment method:</th><td>${order.payment}</td></tr>`}
						<tr><th scope="row" colspan=${span}>Total:</th><td><span class="woocommerce-Price-amount amount">${money(subtotal)}</span></td></tr>
						${order.customerNote && html`<tr><th colspan=${span}>Note:</th><td>${order.customerNote}</td></tr>`}
					</tfoot>
				</table>
				${snapshot && order.status === 'completed' && html`<p class="order-again"><a href="#store.cart" class="button" onClick=${(e) => { e.preventDefault(); orderAgain(order); }}>Order again</a></p>`}
			</section>
			${snapshot && html`<${ProtoHint}>The store emails the order with the same pictures and option rows. <a href=${`#store.email.${order.id}.customer`}>View the customer email</a><//>`}

			<section class="woocommerce-customer-details">
				<h2 class="woocommerce-column__title">Billing address</h2>
				<address>
					${b
						? [
								`${b.first_name} ${b.last_name}`.trim(),
								b.company,
								b.address_1,
								b.address_2,
								[b.city, [b.country === 'US' ? US_STATES[b.state] || b.state : b.state, b.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', '),
							]
								.filter(Boolean)
								.map((l, i) => html`${i ? html`<br />` : ''}${l}`)
						: [order.customer?.name, ...String(order.customer?.address || '').split(', ')].filter(Boolean).map((l, i) => html`${i ? html`<br />` : ''}${l}`)}
					${order.customer?.phone && html`<p class="woocommerce-customer-details--phone">${order.customer.phone}</p>`}
					${order.customer?.email && html`<p class="woocommerce-customer-details--email">${order.customer.email}</p>`}
				</address>
			</section>
		</div>
		<${ViewerModal} id="wc3d-order-modal" open=${!!preview} onClose=${() => setPreview(null)}>${preview && html`<${OrderPreviewRoot} key=${modalKey} productId=${preview.productId} variationId=${preview.variationId} choices=${preview.custom} />`}<//>
	`;
}

export default function OrderReceivedPage({ params = [] }) {
	return html`
		<${StoreTheme}>
			<div class="wc-proto-page">
				<h1 class="entry-title">Order received</h1>
				<div class="woocommerce wc-proto-cart"><${OrderReceived} id=${params[0]} /></div>
			</div>
		<//>
	`;
}
