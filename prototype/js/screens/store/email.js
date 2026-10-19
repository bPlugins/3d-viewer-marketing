// #store.email.<orderId>.<customer|admin>: WooCommerce "Processing order" / "New order" emails
// (emails/email-header.php, email-order-details.php, email-order-items.php, email-addresses.php, email-footer.php).
import { html, money, cx } from '../../core/ui.js';
import { useStore } from '../../core/store.js';
import { useFeature } from '../../core/features.js';
import { LineImage } from '../../shared/snapshot.js';
import { orderTotal, itemMeta, itemName } from '../admin/orders.js';

const SITE = 'Demo Store';
const ADMIN_EMAIL = 'admin@example.com';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const US_STATES = { California: 'CA', 'New York': 'NY', Texas: 'TX', Washington: 'WA' };

function parts(s) {
	const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(s || ''));
	return m ? { y: m[1], mo: Number(m[2]), d: Number(m[3]), h: Number(m[4] || 0), mi: m[5] || '00' } : null;
}

const wcDate = (s) => {
	const t = parts(s);
	return t ? `${MONTHS[t.mo - 1]} ${t.d}, ${t.y}` : '';
};

const mailDate = (s) => {
	const t = parts(s);
	return t ? `${MONTHS[t.mo - 1].slice(0, 3)} ${t.d}, ${t.y}, ${t.h % 12 || 12}:${t.mi} ${t.h < 12 ? 'AM' : 'PM'}` : '';
};

function addressOf(a, fallback) {
	if (!a) return fallback;
	const region = [a.country === 'US' ? US_STATES[a.state] || a.state : a.state, a.postcode].filter(Boolean).join(' ');
	return [`${a.first_name || ''} ${a.last_name || ''}`.trim(), a.company, a.address_1, a.address_2, [a.city, region].filter(Boolean).join(', ')].filter(Boolean);
}

const lines = (list) => list.map((l, i) => html`${i ? html`<br />` : ''}${l}`);

/** wc_display_item_meta(): the variation attributes are already in the item name, so they are not repeated. */
function emailMeta(state, item) {
	const v = item.variationId ? state.variations?.[item.variationId] : null;
	const skip = v ? Object.keys(v.attributes || {}).length : 0;
	return itemMeta(state, item).slice(skip);
}

function ItemRow({ state, item, admin, showImage }) {
	const p = state.products?.[item.productId];
	const v = item.variationId ? state.variations?.[item.variationId] : null;
	const sku = admin ? v?.sku || p?.sku : '';
	const meta = emailMeta(state, item);
	return html`<tr class="order_item">
		<td class="td wc-email-item">
			${showImage && html`<div class="wc-email-item__image"><${LineImage} state=${state} item=${item} size=${64} /></div>`}
			${itemName(state, item)}${sku && ` (#${sku})`}
			${meta.length > 0 &&
			html`<ul class="wc-item-meta">
				${meta.map(([label, value], i) => html`<li key=${label + i}><strong class="wc-item-meta-label">${label}:</strong> <p>${value}</p></li>`)}
			</ul>`}
		</td>
		<td class="td wc-email-qty">${item.qty}</td>
		<td class="td wc-email-price"><span class="woocommerce-Price-amount amount">${money(item.total)}</span></td>
	</tr>`;
}

function OrderEmail({ state, order, admin, showImage }) {
	const c = order.customer || {};
	const b = order.billing;
	const first = (b?.first_name || String(c.name || '').split(' ')[0] || '').trim();
	const fullName = b ? `${b.first_name || ''} ${b.last_name || ''}`.trim() : c.name || '';
	const total = orderTotal(order);
	const billing = addressOf(b, [c.name, ...String(c.address || '').split(', ')].filter(Boolean));
	const shipping = order.shipping ? addressOf(order.shipping, []) : [];
	const title = html`[Order #${order.id}]`;

	return html`<div class="wc-email-wrapper" dir="ltr">
		<div class="wc-email-container" id="template_container">
			<div class="wc-email-header" id="template_header">
				<h1>${admin ? `New order: #${order.id}` : 'Thank you for your order'}</h1>
			</div>
			<div class="wc-email-body" id="body_content_inner">
				${admin
					? html`<p>You’ve received the following order from ${fullName}:</p>`
					: html`<p>Hi ${first},</p>
							<p>Just to let you know — we've received your order #${order.id}, and it is now being processed:</p>`}

				<h2>
					${admin ? html`<a class="link" href=${'#admin.order.' + order.id}>${title}</a>` : title} (<time datetime=${String(order.date || '').replace(' ', 'T')}>${wcDate(order.date)}</time>)
				</h2>
				<div class="wc-email-order">
					<table class="td" cellspacing="0" cellpadding="6" border="1">
						<thead>
							<tr>
								<th class="td" scope="col">Product</th>
								<th class="td" scope="col">Quantity</th>
								<th class="td" scope="col">Price</th>
							</tr>
						</thead>
						<tbody>
							${(order.items || []).map((it) => html`<${ItemRow} key=${it.id} state=${state} item=${it} admin=${admin} showImage=${showImage} />`)}
						</tbody>
						<tfoot>
							<tr class="wc-email-first"><th class="td" scope="row" colspan="2">Subtotal:</th><td class="td"><span class="woocommerce-Price-amount amount">${money(total)}</span></td></tr>
							${order.payment && html`<tr><th class="td" scope="row" colspan="2">Payment method:</th><td class="td">${order.payment}</td></tr>`}
							<tr><th class="td" scope="row" colspan="2">Total:</th><td class="td"><span class="woocommerce-Price-amount amount">${money(total)}</span></td></tr>
							${order.customerNote && html`<tr><th class="td" scope="row" colspan="2">Note:</th><td class="td">${order.customerNote}</td></tr>`}
						</tfoot>
					</table>
				</div>

				<table class="wc-email-addresses" id="addresses" cellspacing="0" cellpadding="0" border="0">
					<tbody>
						<tr>
							<td class="wc-email-addresses__col">
								<h2>Billing address</h2>
								<address class="address">
									${lines(billing)}
									${c.phone && html`<br /><a href=${'tel:' + c.phone}>${c.phone}</a>`}
									${c.email && html`<br /><a href=${'mailto:' + c.email}>${c.email}</a>`}
								</address>
							</td>
							${shipping.length > 0 &&
							html`<td class="wc-email-addresses__col">
								<h2>Shipping address</h2>
								<address class="address">${lines(shipping)}</address>
							</td>`}
						</tr>
					</tbody>
				</table>

				<p>${admin ? 'Congratulations on the sale.' : `Thanks for using ${SITE}!`}</p>
			</div>
		</div>
		<div class="wc-email-footer" id="template_footer">
			<p id="credit">${SITE} — Built with <a href="https://woocommerce.com" onClick=${(e) => e.preventDefault()}>WooCommerce</a></p>
		</div>
	</div>`;
}

export default function EmailPreview({ params = [] }) {
	const state = useStore();
	const snapshot = useFeature('order-snapshot');
	const id = params[0] || '';
	const admin = params[1] === 'admin';
	const order = state.orders?.[id];

	if (!order || order.status === 'trash') {
		return html`<div class="wc-proto-email"><div class="wc-proto-email__client wc-proto-email__missing"><p>Email not found.</p></div></div>`;
	}

	const c = order.customer || {};
	const tab = (kind, label) => {
		const on = (kind === 'admin') === admin;
		return html`<a href=${`#store.email.${order.id}.${kind}`} class=${cx('wc-proto-email__tab', on && 'is-active')} aria-current=${on ? 'page' : undefined}>${label}</a>`;
	};

	return html`<div class="wc-proto-email">
		<div class="wc-proto-email__client">
			<div class="wc-proto-email__bar">
				<nav class="wc-proto-email__tabs" aria-label="Emails">
					${tab('customer', 'Processing order')}
					${tab('admin', 'New order')}
				</nav>
				<div class="wc-proto-email__links">
					<a href=${'#store.order.' + order.id}>Order received</a>
					<a href=${'#admin.order.' + order.id}>Edit order #${order.id}</a>
				</div>
			</div>
			<header class="wc-proto-email__head">
				<h1 class="wc-proto-email__subject">${admin ? `[${SITE}]: New order #${order.id}` : `Your ${SITE} order has been received!`}</h1>
				<dl class="wc-proto-email__fields">
					<div><dt>From</dt><dd>${SITE} <span>${'<' + ADMIN_EMAIL + '>'}</span></dd></div>
					<div><dt>To</dt><dd>${admin ? ADMIN_EMAIL : c.name ? html`${c.name} <span>${'<' + (c.email || '') + '>'}</span>` : c.email}</dd></div>
					<div><dt>Date</dt><dd>${mailDate(order.date)}</dd></div>
				</dl>
			</header>
			<div class="wc-proto-email__view">
				<${OrderEmail} state=${state} order=${order} admin=${admin} showImage=${snapshot} />
			</div>
		</div>
	</div>`;
}
