// WooCommerce → Orders (HPOS list, admin.php?page=wc-orders) with the order preview modal.
import { html, useState, useEffect, cx, money } from '../../core/ui.js';
import { store, useStore, setIn } from '../../core/store.js';
import { go } from '../../core/router.js';
import { WpAdmin } from './chrome.js';
import { cartSummary } from '../../shared/product-3d.js';
import { optionRows, OptionValue } from '../store/theme.js';
import { useFeature } from '../../core/features.js';
import { LineImage } from '../../shared/snapshot.js';
import { Dashicon, WpNotice, useFlash, shortDate, longDate, parseDate, nowStr } from './products.js';

export const ORDER_STATUSES = {
	pending: 'Pending payment',
	processing: 'Processing',
	'on-hold': 'On hold',
	completed: 'Completed',
	cancelled: 'Cancelled',
	refunded: 'Refunded',
	failed: 'Failed',
	'checkout-draft': 'Draft',
};

export const orderTotal = (o) => (o.items || []).reduce((n, it) => n + Number(it.total || 0), 0);

/** Split the demo customer's one-line address into WooCommerce's address lines. */
export function addressLines(customer) {
	return [customer?.name, ...String(customer?.address || '').split(',').map((s) => s.trim())].filter(Boolean);
}

/**
 * Item meta rows as WooCommerce shows them: variation attributes, then "3D Customization".
 * option-pricing / option groups: one row per frozen option (recomputed for old orders), else the old summary.
 */
export function itemMeta(state, item) {
	const rows = [];
	const v = item.variationId ? state.variations?.[item.variationId] : null;
	if (v) Object.entries(v.attributes || {}).forEach(([k, val]) => rows.push([k, val]));
	const options = optionRows(state, item);
	if (options.length) return [...rows, ...options.map((l) => [l.label, html`<${OptionValue} line=${l} />`])];
	const summary = item.summary || cartSummary(item.custom);
	if (summary) rows.push(['3D Customization', summary]);
	return rows;
}

export function itemName(state, item) {
	const p = state.products?.[item.productId];
	const v = item.variationId ? state.variations?.[item.variationId] : null;
	const name = p?.name || item.name || 'Product';
	return v ? `${name} - ${Object.values(v.attributes || {}).join(', ')}` : name;
}

/** WC list date: "X mins ago" within a day, otherwise "Sep 29, 2026". */
function listOrderDate(s) {
	const t = parseDate(s);
	if (!t) return '';
	const then = new Date(t.y, t.mo - 1, t.d, t.h, t.mi).getTime();
	const diff = Date.now() - then;
	if (diff >= 0 && diff < 86400000) {
		const mins = Math.max(1, Math.round(diff / 60000));
		return mins < 60 ? `${mins} ${mins === 1 ? 'min' : 'mins'} ago` : `${Math.round(mins / 60)} ${Math.round(mins / 60) === 1 ? 'hour' : 'hours'} ago`;
	}
	return shortDate(s);
}

export function StatusMark({ status }) {
	return html`<mark class=${cx('order-status', 'status-' + status, 'tips')}><span>${ORDER_STATUSES[status] || status}</span></mark>`;
}

// Admin order notes (array). The checkout's customer note is `customerNote`.
export const noteList = (o) => (Array.isArray(o?.notes) ? o.notes : []);

function setStatus(id, status) {
	store.patch(['orders', id], (o) => ({
		...o,
		status,
		notes: [...noteList(o), { id: noteList(o).length + 1, date: nowStr(), text: `Order status changed from ${ORDER_STATUSES[o.status]} to ${ORDER_STATUSES[status]}.`, system: true }],
	}));
}

function OrderPreview({ order, onClose }) {
	const state = useStore();
	const snapshot = useFeature('order-snapshot');
	useEffect(() => {
		const k = (e) => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', k);
		document.body.classList.add('modal-open');
		return () => (document.removeEventListener('keydown', k), document.body.classList.remove('modal-open'));
	}, []);
	const actions = [];
	if (['pending', 'on-hold'].includes(order.status)) actions.push(['processing', 'Processing']);
	if (['pending', 'on-hold', 'processing'].includes(order.status)) actions.push(['completed', 'Completed']);
	return html`<div class="wc3d-wc-backbone" role="dialog" aria-modal="true">
		<div class="wc-backbone-modal wc-order-preview">
			<div class="wc-backbone-modal-content" tabindex="0">
				<section class="wc-backbone-modal-main" role="main">
					<header class="wc-backbone-modal-header">
						<${StatusMark} status=${order.status} />
						<h1>Order #${order.id}</h1>
						<button type="button" class="modal-close modal-close-link" onClick=${onClose}><${Dashicon} name="no-alt" /><span class="screen-reader-text">Close modal panel</span></button>
					</header>
					<article>
						<div class="wc-order-preview-addresses">
							<div class="wc-order-preview-address">
								<h2>Billing details</h2>
								${addressLines(order.customer).map((l, i) => html`${i ? html`<br />` : ''}${l}`)}
								<strong>Email</strong>
								<a href=${'mailto:' + order.customer.email}>${order.customer.email}</a>
								${order.customer.phone && html`<strong>Phone</strong><a href=${'tel:' + order.customer.phone}>${order.customer.phone}</a>`}
								<strong>Payment via</strong>
								${order.payment}
							</div>
							<div class="wc-order-preview-address">
								<h2>Shipping details</h2>
								${addressLines(order.customer).map((l, i) => html`${i ? html`<br />` : ''}${l}`)}
								<strong>Shipping method</strong>
								Free shipping
							</div>
						</div>
						<div class="wc-order-preview-table-wrapper">
							<table cellspacing="0" class="wc-order-preview-table">
								<thead>
									<tr>
										<th class="wc-order-preview-table__column--product">Product</th>
										<th class="wc-order-preview-table__column--quantity">Quantity</th>
										<th class="wc-order-preview-table__column--tax">Tax</th>
										<th class="wc-order-preview-table__column--total">Total</th>
									</tr>
								</thead>
								<tbody>
									${order.items.map(
										(it) => html`<tr class="wc-order-preview-table__item" key=${it.id}>
											<td class="wc-order-preview-table__column--product">
												${snapshot && html`<div class="wc3d-preview-item-image"><${LineImage} state=${state} item=${it} size=${48} /></div>`}
												${itemName(state, it)}
												<div class="wc-order-item-sku">${(it.variationId ? state.variations?.[it.variationId]?.sku : state.products?.[it.productId]?.sku) || ''}</div>
												${itemMeta(state, it).length > 0 &&
												html`<table cellspacing="0" class="wc-order-item-meta">
													${itemMeta(state, it).map(([k, v], i) => html`<tr key=${k + ':' + i}><th>${k}:</th><td>${v}</td></tr>`)}
												</table>`}
											</td>
											<td class="wc-order-preview-table__column--quantity">${it.qty}</td>
											<td class="wc-order-preview-table__column--tax">${money(0)}</td>
											<td class="wc-order-preview-table__column--total">${money(it.total)}</td>
										</tr>`
									)}
								</tbody>
							</table>
						</div>
					</article>
					<footer>
						<div class="inner">
							${actions.map(([s, l]) => html`<button type="button" key=${s} class="button button-large" onClick=${() => (setStatus(order.id, s), onClose())}>${l}</button> `)}
							<a class="button button-primary button-large" aria-label="Edit this order" href=${'#admin.order.' + order.id}>Edit</a>
						</div>
					</footer>
				</section>
			</div>
		</div>
		<div class="wc-backbone-modal-backdrop modal-close" onClick=${onClose}></div>
	</div>`;
}

const BULK = [
	['trash', 'Move to Trash'],
	['mark_processing', 'Change status to processing'],
	['mark_on-hold', 'Change status to on-hold'],
	['mark_completed', 'Change status to completed'],
	['mark_cancelled', 'Change status to cancelled'],
];

export default function OrdersList() {
	const state = useStore();
	const flashed = useFlash();
	const [view, setView] = useState('all');
	const [q, setQ] = useState('');
	const [query, setQuery] = useState('');
	const [month, setMonth] = useState('');
	const [month2, setMonth2] = useState('');
	const [checked, setChecked] = useState([]);
	const [bulk, setBulk] = useState('-1');
	const [preview, setPreview] = useState(0);
	const [expanded, setExpanded] = useState({});
	const [notice, setNotice] = useState(null);

	const all = Object.values(state.orders || {}).sort((a, b) => String(b.date).localeCompare(String(a.date)));
	const counts = { all: 0, trash: 0 };
	all.forEach((o) => {
		counts[o.status] = (counts[o.status] || 0) + 1;
		if (o.status !== 'trash') counts.all++;
	});
	const months = [...new Set(all.map((o) => String(o.date).slice(0, 7)))];
	const rows = all.filter((o) => {
		if (view === 'all' ? o.status === 'trash' : o.status !== view) return false;
		if (month && !String(o.date).startsWith(month)) return false;
		if (query) {
			const hay = `${o.id} ${o.customer?.name} ${o.customer?.email} ${o.customer?.address}`.toLowerCase();
			if (!hay.includes(query.toLowerCase())) return false;
		}
		return true;
	});
	const applyBulk = () => {
		if (!checked.length || bulk === '-1') return;
		if (bulk === 'trash' || bulk === 'untrash') {
			store.set((s) => checked.reduce((acc, id) => setIn(acc, ['orders', id, 'status'], bulk === 'trash' ? 'trash' : s.orders[id].prevStatus || 'pending'), s));
			if (bulk === 'trash') store.set((s) => checked.reduce((acc, id) => setIn(acc, ['orders', id, 'prevStatus'], state.orders[id].status), s));
			setNotice(`${checked.length} ${checked.length === 1 ? 'order' : 'orders'} ${bulk === 'trash' ? 'moved to the Trash' : 'restored from the Trash'}.`);
		} else {
			const s = bulk.replace('mark_', '');
			checked.forEach((id) => state.orders[id].status !== s && setStatus(id, s));
			setNotice(`${checked.length} order ${checked.length === 1 ? 'status' : 'statuses'} changed.`);
		}
		setChecked([]);
	};
	const VIEWS = [['all', 'All'], ...Object.entries(ORDER_STATUSES), ['trash', 'Trash']].filter(([k]) => k === 'all' || counts[k]);
	const allChecked = rows.length > 0 && rows.every((r) => checked.includes(r.id));
	const COLS = [
		['order_number', 'Order'],
		['order_date', 'Date'],
		['order_status', 'Status'],
		['order_total', 'Total'],
	];
	const head = () => html`<tr>
		<td class="manage-column column-cb check-column"><input type="checkbox" aria-label="Select All" checked=${allChecked} onChange=${(e) => setChecked(e.currentTarget.checked ? rows.map((r) => r.id) : [])} /></td>
		${COLS.map(([k, l]) => html`<th key=${k} scope="col" class=${cx('manage-column', 'column-' + k, k === 'order_number' && 'column-primary')}>${l}</th>`)}
	</tr>`;
	const previewOrder = preview ? state.orders?.[preview] : null;

	return html`<${WpAdmin} current="orders" title="Orders">
		<div class="wrap woocommerce wc3d-wc-screen">
			<h1 class="wp-heading-inline">Orders</h1>
			<hr class="wp-header-end" />
			${flashed.map((n, i) => html`<${WpNotice} key=${'f' + i}>${n.body}<//>`)}
			${notice && html`<${WpNotice} key=${notice}>${notice}<//>`}
			<ul class="subsubsub">
				${VIEWS.map(
					([k, l], i) => html`<li class=${k} key=${k}>
						<a href="#admin.orders" class=${cx(view === k && 'current')} aria-current=${view === k ? 'page' : undefined} onClick=${(e) => (e.preventDefault(), setView(k), setChecked([]))}>
							${l} <span class="count">(${counts[k] || 0})</span>
						</a>${i < VIEWS.length - 1 ? ' |' : ''}
					</li>`
				)}
			</ul>
			<form id="wc-orders-filter" onSubmit=${(e) => (e.preventDefault(), setQuery(q.trim()))}>
				<p class="search-box">
					<label class="screen-reader-text" for="orders-search-input-search-input">Search orders:</label>
					<input type="search" id="orders-search-input-search-input" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} />
					<input type="submit" id="search-submit" class="button" value="Search orders" />
				</p>
				<div class="tablenav top">
					<div class="alignleft actions bulkactions">
						<label for="bulk-action-selector-top" class="screen-reader-text">Select bulk action</label>
						<select id="bulk-action-selector-top" value=${bulk} onChange=${(e) => setBulk(e.currentTarget.value)}>
							<option value="-1">Bulk actions</option>
							${view === 'trash' ? html`<option value="untrash">Restore</option>` : BULK.map(([v, l]) => html`<option value=${v} key=${v}>${l}</option>`)}
						</select>
						<input type="button" class="button action" value="Apply" onClick=${applyBulk} />
					</div>
					<div class="alignleft actions">
						<label for="filter-by-date" class="screen-reader-text">Filter by date</label>
						<select id="filter-by-date" value=${month2} onChange=${(e) => setMonth2(e.currentTarget.value)}>
							<option value="">All dates</option>
							${months.map((m) => {
								const t = parseDate(m + '-01');
								return html`<option value=${m} key=${m}>${longDate(m + '-01').split(' ')[0]} ${t.y}</option>`;
							})}
						</select>
						<select class="wc-customer-search" aria-label="Filter by registered customer" disabled>
							<option>Filter by registered customer</option>
						</select>
						<input type="button" class="button" value="Filter" onClick=${() => setMonth(month2)} />
					</div>
					<div class="tablenav-pages one-page"><span class="displaying-num">${rows.length} ${rows.length === 1 ? 'item' : 'items'}</span></div>
					<br class="clear" />
				</div>
				<table class="wp-list-table widefat fixed striped table-view-list orders wc-orders-list-table wc-orders-list-table-shop_order">
					<thead>${head()}</thead>
					<tbody id="the-list">
						${!rows.length && html`<tr class="no-items"><td class="colspanchange" colspan="5">No orders found</td></tr>`}
						${rows.map(
							(o) => html`<tr
								key=${o.id}
								id=${'order-' + o.id}
								class=${cx('order-' + o.id, 'type-shop_order', 'status-' + o.status, expanded[o.id] && 'is-expanded')}
								onClick=${(e) => !e.target.closest('a,button,input,label,.check-column') && go('admin.order.' + o.id)}
							>
								<th scope="row" class="check-column">
									<input type="checkbox" aria-label=${'Select order #' + o.id} checked=${checked.includes(o.id)} onChange=${(e) => setChecked(e.currentTarget.checked ? [...checked, o.id] : checked.filter((x) => x !== o.id))} />
								</th>
								<td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
									<button type="button" class="order-preview" title="Preview" onClick=${() => setPreview(o.id)}><${Dashicon} name="visibility" /><span class="screen-reader-text">Preview</span></button>
									<a href=${'#admin.order.' + o.id} class="order-view"><strong>#${o.id} ${o.customer?.name}</strong></a>
									<button type="button" class="toggle-row" onClick=${() => setExpanded({ ...expanded, [o.id]: !expanded[o.id] })}><span class="screen-reader-text">Show more details</span></button>
								</td>
								<td class="order_date column-order_date" data-colname="Date">
									<time datetime=${String(o.date).replace(' ', 'T')} title=${longDate(o.date).replace(' at', '')}>${listOrderDate(o.date)}</time>
								</td>
								<td class="order_status column-order_status" data-colname="Status"><${StatusMark} status=${o.status} /></td>
								<td class="order_total column-order_total" data-colname="Total"><span class="tips"><span class="woocommerce-Price-amount amount">${money(orderTotal(o))}</span></span></td>
							</tr>`
						)}
					</tbody>
					<tfoot>${head()}</tfoot>
				</table>
				<div class="tablenav bottom">
					<div class="tablenav-pages one-page"><span class="displaying-num">${rows.length} ${rows.length === 1 ? 'item' : 'items'}</span></div>
					<br class="clear" />
				</div>
			</form>
		</div>
		${previewOrder && html`<${OrderPreview} order=${previewOrder} onClose=${() => setPreview(0)} />`}
	<//>`;
}
