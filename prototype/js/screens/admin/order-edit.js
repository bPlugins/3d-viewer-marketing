// WooCommerce → Orders → Edit order (HPOS), with the plugin's "View 3D Preview" button after
// each line item's meta and the shared order preview modal (includes/Frontend/OrderPreview.php).
import { html, useState, useEffect, useRef, cx, money } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { go } from '../../core/router.js';
import { WpAdmin } from './chrome.js';
import { modelFor } from '../../shared/product-3d.js';
import { ViewerModal, OrderPreviewRoot } from '../store/viewer-ui.js';
import { ProductImage } from '../../shared/product-image.js';
import { useFeature } from '../../core/features.js';
import { applyFilter, protoLabel } from '../../shared/slots.js';
import { LineImage, useLineSnapshot } from '../../shared/snapshot.js';
import { Dashicon, WpNotice, flash, nowStr, longDate, parseDate, shortDate } from './products.js';
import { ORDER_STATUSES, orderTotal, itemMeta, itemName, addressLines, noteList } from './orders.js';

/** OrderPreview::display_order_item_3d_preview() conditions: product exists, _wc3d_enabled = yes, a model resolves. */
export function previewPayload(state, item) {
	const p = state.products?.[item.productId];
	if (!p || p.meta?._wc3d_enabled !== 'yes' || !applyFilter('wc3d.order-preview', true)) return null;
	const vid = item.variationId && state.variations?.[item.variationId]?.parentId === p.id ? item.variationId : 0;
	const { model } = modelFor(state, p.id, vid);
	return model ? { productId: p.id, variationId: vid, custom: item.custom || null } : null;
}

export function PreviewButton({ onOpen }) {
	return html`<div class="wc3d-order-preview-wrapper" style="margin-top: 10px; margin-bottom: 10px;">
		<button
			type="button"
			class="button wc3d-modal-trigger wc3d-order-preview-btn"
			data-wc3d-modal-open="1"
			data-wc3d-modal-target="wc3d-order-modal"
			style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer;"
			onClick=${onOpen}
		>
			<span aria-hidden="true" style="font-size: 13px;">⛶</span>
			<span>View 3D Preview</span>
		</button>
	</div>`;
}

/** order-snapshot: "View image" under the item meta, only when the line has a picture. */
function SnapshotLink({ state, item, onOpen }) {
	const url = useLineSnapshot(state, item);
	if (!url) return null;
	return html`<p class="wc3d-order-item-snapshot"><a href="#" onClick=${(e) => (e.preventDefault(), onOpen(url))}>View image</a></p>`;
}

/** The full snapshot in a WC backbone modal (shown in the page, never downloaded). */
function SnapshotModal({ title, url, onClose }) {
	const box = useRef(null);
	useEffect(() => {
		const back = document.activeElement;
		const k = (e) => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', k);
		document.body.classList.add('modal-open');
		box.current?.focus();
		return () => {
			document.removeEventListener('keydown', k);
			document.body.classList.remove('modal-open');
			if (back?.isConnected) back.focus();
		};
	}, []);
	return html`<div class="wc3d-wc-backbone wc3d-snapshot-modal" role="dialog" aria-modal="true" aria-label=${title}>
		<div class="wc-backbone-modal">
			<div class="wc-backbone-modal-content" tabindex="0" ref=${box}>
				<section class="wc-backbone-modal-main" role="main">
					<header class="wc-backbone-modal-header">
						<h1>${title}</h1>
						<button type="button" class="modal-close modal-close-link" onClick=${onClose}><${Dashicon} name="no-alt" /><span class="screen-reader-text">Close modal panel</span></button>
					</header>
					<article><img class="wc3d-snapshot-full" src=${url} alt=${title} /></article>
				</section>
			</div>
		</div>
		<div class="wc-backbone-modal-backdrop modal-close" onClick=${onClose}></div>
	</div>`;
}

const EMAIL_ACTIONS = { send_order_details: 'customer', send_order_details_admin: 'admin' };

const splitAddress = (address) => {
	const parts = String(address || '').split(',').map((s) => s.trim());
	return { line1: parts[0] || '', city: parts.slice(1).join(', ') };
};
const splitName = (name) => {
	const [first = '', ...rest] = String(name || '').split(' ');
	return { first, last: rest.join(' ') };
};

function AddressEditor({ who, value, onChange, billing }) {
	const n = splitName(value.name);
	const a = splitAddress(value.address);
	const set = (patch) => {
		const nn = { ...n, ...patch };
		const aa = { ...a, ...patch };
		onChange({ ...value, name: [nn.first, nn.last].filter(Boolean).join(' '), address: [aa.line1, aa.city].filter(Boolean).join(', '), ...(patch.email !== undefined && { email: patch.email }), ...(patch.phone !== undefined && { phone: patch.phone }) });
	};
	const row = (id, label, val, key, cls = '') => html`<p class=${cx('form-field', cls)}>
		<label for=${`_${who}_${id}`}>${label}</label>
		<input type="text" id=${`_${who}_${id}`} value=${val} onInput=${(e) => set({ [key]: e.currentTarget.value })} />
	</p>`;
	return html`<div class="edit_address">
		${row('first_name', 'First name', n.first, 'first', '_billing_first_name_field')}
		${row('last_name', 'Last name', n.last, 'last', 'last')}
		${row('address_1', 'Address line 1', a.line1, 'line1', 'form-field-wide')}
		${row('city', 'City', a.city, 'city', 'form-field-wide')}
		${billing && row('email', 'Email address', value.email || '', 'email')}
		${billing && row('phone', 'Phone', value.phone || '', 'phone', 'last')}
	</div>`;
}

function baseNotes(order) {
	const notes = [{ id: 'b1', date: order.date, text: 'Order status changed from Pending payment to Processing.', system: true }];
	if (!noteList(order).length && order.status === 'completed') notes.push({ id: 'b2', date: order.date, text: 'Order status changed from Processing to Completed.', system: true });
	return notes;
}

export default function OrderEdit({ params = [] }) {
	const state = useStore();
	const id = Number(params[0]) || 0;
	const order = state.orders?.[id];
	const [d, setD] = useState(() => (order ? { status: order.status, date: order.date, customer: { ...order.customer }, shipping: { ...(order.shippingTo || order.customer) }, action: '' } : null));
	const [editing, setEditing] = useState({});
	const [notice, setNotice] = useState(null);
	const [preview, setPreview] = useState(null);
	const [note, setNote] = useState('');
	const [noteType, setNoteType] = useState('');
	const snapshot = useFeature('order-snapshot');
	const [image, setImage] = useState(null);
	const [sent, setSent] = useState('');

	if (!order || order.status === 'trash') {
		return html`<${WpAdmin} current="orders" title="Edit order">
			<div class="wrap"><div class="notice notice-error"><p>${order ? 'You cannot edit this item because it is in the Trash. Please restore it and try again.' : 'You attempted to edit an item that does not exist. Perhaps it was deleted?'}</p></div></div>
		<//>`;
	}

	const total = orderTotal(order);
	const paid = order.status === 'completed' || /card/i.test(order.payment || '');
	const t = parseDate(d.date) || parseDate(order.date);
	const p2 = (n) => String(n).padStart(2, '0');
	const setDate = (patch) => {
		const v = { ...t, ...patch };
		setD({ ...d, date: `${v.y}-${p2(v.mo)}-${p2(v.d)} ${p2(v.h)}:${p2(v.mi)}` });
	};
	const notes = [...baseNotes(order), ...noteList(order)].sort((a, b) => String(b.date).localeCompare(String(a.date)));

	const save = () => {
		const add = [];
		if (d.status !== order.status) add.push({ text: `Order status changed from ${ORDER_STATUSES[order.status]} to ${ORDER_STATUSES[d.status]}.`, system: true });
		if (d.action === 'send_order_details') add.push({ text: 'Order details manually sent to customer.', system: true });
		const now = nowStr();
		store.patch(['orders', id], (o) => ({
			...o,
			status: d.status,
			date: d.date,
			customer: { ...d.customer },
			shippingTo: { ...d.shipping },
			notes: [...noteList(o), ...add.map((n, i) => ({ id: noteList(o).length + i + 1, date: now, ...n }))],
		}));
		setSent(EMAIL_ACTIONS[d.action] || '');
		setD({ ...d, action: '' });
		setEditing({});
		setNotice((n) => (n || 0) + 1);
		window.scrollTo(0, 0);
	};
	const addNote = () => {
		if (!note.trim()) return;
		store.patch(['orders', id], (o) => ({ ...o, notes: [...noteList(o), { id: noteList(o).length + 1, date: nowStr(), text: note.trim(), customer: noteType === 'customer' }] }));
		setNote('');
	};
	const deleteNote = (nid) => store.patch(['orders', id], (o) => ({ ...o, notes: noteList(o).filter((n) => n.id !== nid) }));
	const trash = () => {
		store.patch(['orders', id], (o) => ({ ...o, prevStatus: o.status, status: 'trash' }));
		flash({ body: '1 order moved to the Trash.' });
		go('admin.orders');
	};

	const shipTo = d.shipping?.address ? d.shipping : d.customer;

	return html`<${WpAdmin} current="orders" title="Edit order">
		<div class="wrap woocommerce wc3d-wc-screen wc3d-order-edit">
			<h1 class="wp-heading-inline">Edit order</h1>
			<hr class="wp-header-end" />
			${notice && html`<${WpNotice} key=${notice} id="message">Order updated.<//>`}
			${snapshot && notice && sent && html`<${WpNotice} key=${'e' + notice} type="info">${protoLabel()}: no email is sent. <a href=${`#store.email.${order.id}.${sent}`}>${sent === 'admin' ? 'View the new order email' : 'View the customer email'}</a><//>`}
			<form name="order" id="order" onSubmit=${(e) => e.preventDefault()}>
				<div id="poststuff">
					<div id="post-body" class="metabox-holder columns-2">
						<div id="postbox-container-1" class="postbox-container">
							<div id="woocommerce-order-actions" class="postbox">
								<div class="postbox-header"><h2 class="hndle">Order actions</h2></div>
								<div class="inside">
									<ul class="order_actions submitbox">
										<li class="wide" id="actions">
											<select name="wc_order_action" aria-label="Choose an action..." value=${d.action} onChange=${(e) => setD({ ...d, action: e.currentTarget.value })}>
												<option value="">Choose an action...</option>
												<option value="send_order_details">Send order details to customer</option>
												<option value="send_order_details_admin">Resend new order notification</option>
												<option value="regenerate_download_permissions">Regenerate download permissions</option>
											</select>
											<button type="button" class="button wc-reload" onClick=${save}><span>Apply</span></button>
										</li>
										<li class="wide">
											<div id="delete-action"><a class="submitdelete deletion" href="#admin.orders" onClick=${(e) => (e.preventDefault(), trash())}>Move to Trash</a></div>
											<button type="button" class="button save_order button-primary" name="save" onClick=${save}>Update</button>
										</li>
									</ul>
								</div>
							</div>
							<div id="woocommerce-order-notes" class="postbox">
								<div class="postbox-header"><h2 class="hndle">Order notes</h2></div>
								<div class="inside">
									<ul class="order_notes">
										${notes.map(
											(n) => html`<li key=${n.id} class=${cx('note', n.system && 'system-note', n.customer && 'customer-note')}>
												<div class="note_content"><p>${n.text}</p></div>
												<p class="meta">
													<abbr class="exact-date" title=${n.date}>${longDate(n.date)}</abbr>
													${!n.system && ' by Raju'}
													${typeof n.id === 'number' && html` <a href="#" class="delete_note" role="button" onClick=${(e) => (e.preventDefault(), deleteNote(n.id))}>Delete note</a>`}
												</p>
											</li>`
										)}
									</ul>
									<div class="add_note">
										<p>
											<label for="add_order_note">Add note <span class="woocommerce-help-tip" aria-label="Add a note for your reference, or add a customer note (the user will be notified)."></span></label>
											<textarea id="add_order_note" class="input-text" cols="20" rows="5" value=${note} onInput=${(e) => setNote(e.currentTarget.value)}></textarea>
										</p>
										<p>
											<label for="order_note_type" class="screen-reader-text">Note type</label>
											<select id="order_note_type" value=${noteType} onChange=${(e) => setNoteType(e.currentTarget.value)}>
												<option value="">Private note</option>
												<option value="customer">Note to customer</option>
											</select>
											<button type="button" class="add_note button" onClick=${addNote}>Add</button>
										</p>
									</div>
								</div>
							</div>
						</div>

						<div id="postbox-container-2" class="postbox-container">
							<div id="woocommerce-order-data" class="postbox">
								<div class="inside">
									<div class="panel-wrap woocommerce">
										<div id="order_data" class="panel woocommerce-order-data">
											<h2 class="woocommerce-order-data__heading">Order #${order.id} details</h2>
											<p class="woocommerce-order-data__meta order_number">
												Payment via ${order.payment}.${paid ? ` Paid on ${longDate(order.date).replace(' at ', ' @ ')}.` : ''} Customer IP: <span class="woocommerce-Order-customerIP">103.92.84.12</span>
											</p>
											<div class="order_data_column_container">
												<div class="order_data_column">
													<h3>General</h3>
													<p class="form-field form-field-wide">
														<label for="order_date">Date created:</label>
														<input type="text" class="date-picker" id="order_date" maxlength="10" value=${`${t.y}-${p2(t.mo)}-${p2(t.d)}`} onChange=${(e) => {
															const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.currentTarget.value);
															if (m) setDate({ y: +m[1], mo: +m[2], d: +m[3] });
														}} />@ <input type="number" class="hour" aria-label="hour" min="0" max="23" step="1" value=${p2(t.h)} onInput=${(e) => setDate({ h: Math.min(23, Number(e.currentTarget.value) || 0) })} />:<input type="number" class="minute" aria-label="minute" min="0" max="59" step="1" value=${p2(t.mi)} onInput=${(e) => setDate({ mi: Math.min(59, Number(e.currentTarget.value) || 0) })} />
													</p>
													<p class="form-field form-field-wide wc-order-status">
														<label for="order_status">Status: ${order.status === 'pending' && html`<a href=${'#store.order.' + order.id}>Customer payment page →</a>`}</label>
														<select id="order_status" name="order_status" class="wc-enhanced-select" value=${d.status} onChange=${(e) => setD({ ...d, status: e.currentTarget.value })}>
															${Object.entries(ORDER_STATUSES).map(([k, l]) => html`<option value=${k} key=${k}>${l}</option>`)}
														</select>
													</p>
													<p class="form-field form-field-wide wc-customer-user">
														<label for="customer_user">Customer: <a href="#admin.orders">View other orders →</a></label>
														<select id="customer_user" class="wc-customer-search">
															<option>${d.customer.name} (${d.customer.email})</option>
															<option>Guest</option>
														</select>
													</p>
												</div>
												<div class="order_data_column">
													<h3>Billing <a href="#" class="edit_address" onClick=${(e) => (e.preventDefault(), setEditing({ ...editing, billing: !editing.billing }))}><${Dashicon} name="edit" /><span class="screen-reader-text">Edit billing address</span></a></h3>
													${editing.billing
														? html`<${AddressEditor} who="billing" billing value=${d.customer} onChange=${(c) => setD({ ...d, customer: c })} />
																<p class="form-field form-field-wide">
																	<label for="_payment_method">Payment method:</label>
																	<select id="_payment_method" value=${order.payment} disabled><option>${order.payment}</option></select>
																</p>`
														: html`<div class="address">
																<p>${addressLines(d.customer).map((l, i) => html`${i ? html`<br />` : ''}${l}`)}</p>
																<p><strong>Email address:</strong> <a href=${'mailto:' + d.customer.email}>${d.customer.email}</a></p>
																${d.customer.phone && html`<p><strong>Phone:</strong> <a href=${'tel:' + d.customer.phone}>${d.customer.phone}</a></p>`}
															</div>`}
												</div>
												<div class="order_data_column">
													<h3>Shipping <a href="#" class="edit_address" onClick=${(e) => (e.preventDefault(), setEditing({ ...editing, shipping: !editing.shipping }))}><${Dashicon} name="edit" /><span class="screen-reader-text">Edit shipping address</span></a></h3>
													${editing.shipping
														? html`<${AddressEditor} who="shipping" value=${shipTo} onChange=${(c) => setD({ ...d, shipping: c })} />`
														: html`<div class="address"><p>${addressLines(shipTo).map((l, i) => html`${i ? html`<br />` : ''}${l}`)}</p></div>`}
													${order.customerNote && html`<p class="order_note"><strong>Customer provided note:</strong> ${order.customerNote}</p>`}
												</div>
											</div>
											<div class="clear"></div>
										</div>
									</div>
								</div>
							</div>

							<div id="woocommerce-order-items" class="postbox">
								<div class="postbox-header"><h2 class="hndle">Items</h2></div>
								<div class="inside">
									<div class="woocommerce_order_items_wrapper wc-order-items-editable">
										<table cellpadding="0" cellspacing="0" class="woocommerce_order_items">
											<thead>
												<tr>
													<th class="item sortable" colspan="2">Item</th>
													<th class="item_cost sortable">Cost</th>
													<th class="quantity sortable">Qty</th>
													<th class="line_cost sortable">Total</th>
												</tr>
											</thead>
											<tbody id="order_line_items">
												${order.items.map((it) => {
													const p = state.products?.[it.productId];
													const v = it.variationId ? state.variations?.[it.variationId] : null;
													const meta = itemMeta(state, it);
													const payload = previewPayload(state, it);
													const unit = Number(it.total || 0) / (it.qty || 1);
													return html`<tr class="item" key=${it.id} data-order_item_id=${it.id}>
														<td class="thumb">
															<div class="wc-order-item-thumbnail">${p && (snapshot ? html`<${LineImage} state=${state} item=${it} size=${38} />` : html`<${ProductImage} product=${p} variationId=${it.variationId || 0} size=${38} alt="" />`)}</div>
														</td>
														<td class="name" data-sort-value=${itemName(state, it)}>
															${p ? html`<a href=${'#admin.product.' + p.id} class="wc-order-item-name">${itemName(state, it)}</a>` : html`<div class="wc-order-item-name">${itemName(state, it)}</div>`}
															${(v?.sku || p?.sku) && html`<div class="wc-order-item-sku"><strong>SKU:</strong> ${v?.sku || p?.sku}</div>`}
															${v && html`<div class="wc-order-item-variation"><strong>Variation ID:</strong> ${v.id}</div>`}
															<div class="view">
																${meta.length > 0 &&
																html`<table cellspacing="0" class="display_meta">
																	<tbody>
																		${meta.map(([k, val], i) => html`<tr key=${k + ':' + i}><th>${k}:</th><td><p>${val}</p></td></tr>`)}
																	</tbody>
																</table>`}
															</div>
															${snapshot && p && html`<${SnapshotLink} state=${state} item=${it} onOpen=${(url) => setImage({ url, title: itemName(state, it) })} />`}
															${payload && html`<${PreviewButton} onOpen=${() => setPreview((cur) => ({ ...payload, n: (cur?.n || 0) + 1 }))} />`}
														</td>
														<td class="item_cost" width="1%"><div class="view"><span class="woocommerce-Price-amount amount">${money(unit)}</span></div></td>
														<td class="quantity" width="1%"><div class="view"><small class="times">×</small> ${it.qty}</div></td>
														<td class="line_cost" width="1%"><div class="view"><span class="woocommerce-Price-amount amount">${money(it.total)}</span></div></td>
													</tr>`;
												})}
											</tbody>
										</table>
									</div>
									<div class="wc-order-data-row wc-order-totals-items wc-order-items-editable">
										<table class="wc-order-totals">
											<tbody>
												<tr><td class="label">Items Subtotal:</td><td width="1%"></td><td class="total"><span class="woocommerce-Price-amount amount">${money(total)}</span></td></tr>
											</tbody>
										</table>
										<div class="clear"></div>
										<table class="wc-order-totals wc3d-totals-sep">
											<tbody>
												<tr><td class="label">Order Total:</td><td width="1%"></td><td class="total"><span class="woocommerce-Price-amount amount">${money(total)}</span></td></tr>
											</tbody>
										</table>
										${paid &&
										html`<div class="clear"></div>
											<table class="wc-order-totals wc3d-totals-sep">
												<tbody>
													<tr><td class="label label-highlight">Paid:</td><td width="1%"></td><td class="total"><span class="woocommerce-Price-amount amount">${money(total)}</span></td></tr>
													<tr><td><span class="description">${shortDate(order.date)} via ${order.payment}</span></td><td colspan="2"></td></tr>
												</tbody>
											</table>`}
										<div class="clear"></div>
									</div>
									<div class="wc-order-data-row wc-order-bulk-actions">
										<p class="add-items"><span class="description"><span class="woocommerce-help-tip" aria-label="To edit this order change the status back to &quot;Pending payment&quot;"></span> This order is no longer editable.</span></p>
									</div>
								</div>
							</div>
						</div>
					</div>
					<br class="clear" />
				</div>
			</form>
		</div>
		<${ViewerModal} id="wc3d-order-modal" open=${!!preview} onClose=${() => setPreview(null)}>
			${preview && html`<${OrderPreviewRoot} key=${preview.n} productId=${preview.productId} variationId=${preview.variationId} choices=${preview.custom} />`}
		<//>
		${snapshot && image && html`<${SnapshotModal} title=${image.title} url=${image.url} onClose=${() => setImage(null)} />`}
	<//>`;
}
