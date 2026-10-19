// WooCommerce classic checkout (checkout/form-checkout.php). Place order turns the cart
// into store.orders[id] (items keep `custom`, like _wc3d_custom_config on the line item).
import { html, useState, money, cx } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { go } from '../../core/router.js';
import { useFeature, isOn } from '../../core/features.js';
import { lineVariationId, quoteFor } from '../../shared/options.js';
import { StoreTheme, lineFlags, capturesSettled } from './theme.js';
import { lineName, unitPrice, cartTotal, ItemData, Notices, ProtoHint, EmptyCart, LineThumb, ClassicSetupHint } from './cart.js';
import { BlockCheckout } from './checkout-blocks.js';

export const GATEWAYS = [
	{ id: 'bacs', title: 'Direct bank transfer', status: 'on-hold', description: 'Make your payment directly into our bank account. Please use your Order ID as the payment reference. Your order will not be shipped until the funds have cleared in our account.' },
	{ id: 'cheque', title: 'Check payments', status: 'on-hold', description: 'Please send a check to Store Name, Store Street, Store Town, Store State / County, Store Postcode.' },
	{ id: 'cod', title: 'Cash on delivery', status: 'processing', description: 'Pay with cash upon delivery.' },
];

export const COUNTRIES = [
	{ code: 'US', name: 'United States (US)', state: 'State', postcode: 'ZIP Code', states: ['California', 'New York', 'Texas', 'Washington'] },
	{ code: 'CA', name: 'Canada', state: 'Province', postcode: 'Postal code', states: ['British Columbia', 'Ontario', 'Quebec'] },
	{ code: 'GB', name: 'United Kingdom (UK)', state: 'County', postcode: 'Postcode', states: null, stateOptional: true },
	{ code: 'BD', name: 'Bangladesh', state: 'District', postcode: 'Postcode / ZIP', states: ['Dhaka', 'Chattogram', 'Sylhet'], postcodeOptional: true },
];

const DEMO_BILLING = {
	first_name: 'Alex',
	last_name: 'Morgan',
	company: '',
	country: 'US',
	address_1: '500 Market Street',
	address_2: 'Apt 4B',
	city: 'San Francisco',
	state: 'California',
	postcode: '94105',
	phone: '(415) 555-0134',
	email: 'alex.morgan@example.com',
};

const EMPTY_SHIPPING = { first_name: '', last_name: '', company: '', country: 'US', address_1: '', address_2: '', city: '', state: '', postcode: '' };

function fieldsFor(group, values) {
	const c = COUNTRIES.find((x) => x.code === values.country) || COUNTRIES[0];
	const f = [
		{ key: 'first_name', label: 'First name', required: true, cls: 'form-row-first', auto: 'given-name' },
		{ key: 'last_name', label: 'Last name', required: true, cls: 'form-row-last', auto: 'family-name' },
		{ key: 'company', label: 'Company name', cls: 'form-row-wide', auto: 'organization' },
		{ key: 'country', label: 'Country / Region', required: true, cls: 'form-row-wide', type: 'country' },
		{ key: 'address_1', label: 'Street address', required: true, cls: 'form-row-wide', placeholder: 'House number and street name', auto: 'address-line1' },
		{ key: 'address_2', label: 'Apartment, suite, unit, etc.', srOnly: true, cls: 'form-row-wide', placeholder: 'Apartment, suite, unit, etc. (optional)', auto: 'address-line2' },
		{ key: 'city', label: 'Town / City', required: true, cls: 'form-row-wide', auto: 'address-level2' },
		{ key: 'state', label: c.state, required: !c.stateOptional, cls: 'form-row-wide', type: c.states ? 'state' : 'text', options: c.states, auto: 'address-level1' },
		{ key: 'postcode', label: c.postcode, required: !c.postcodeOptional, cls: 'form-row-wide', auto: 'postal-code' },
	];
	if (group === 'billing') {
		f.push({ key: 'phone', label: 'Phone', required: true, cls: 'form-row-wide', type: 'tel', auto: 'tel' });
		f.push({ key: 'email', label: 'Email address', required: true, cls: 'form-row-wide', type: 'email', auto: 'email' });
	}
	return f;
}

function Field({ group, f, value, invalid, onChange }) {
	const id = `${group}_${f.key}`;
	const set = (e) => onChange(f.key, e.currentTarget.value);
	let input;
	if (f.type === 'country') {
		input = html`<select id=${id} name=${id} class="country_to_state country_select" autocomplete="country" value=${value} onChange=${set}>
			${COUNTRIES.map((c) => html`<option key=${c.code} value=${c.code} selected=${c.code === value}>${c.name}</option>`)}
		</select>`;
	} else if (f.type === 'state') {
		input = html`<select id=${id} name=${id} class="state_select" autocomplete=${f.auto} value=${value} onChange=${set}>
			<option value="">Select an option…</option>
			${f.options.map((o) => html`<option key=${o} value=${o} selected=${o === value}>${o}</option>`)}
		</select>`;
	} else {
		input = html`<input
			type=${f.type === 'email' || f.type === 'tel' ? f.type : 'text'}
			class="input-text"
			id=${id}
			name=${id}
			placeholder=${f.placeholder || ''}
			autocomplete=${f.auto || 'off'}
			value=${value}
			aria-required=${f.required ? 'true' : undefined}
			onInput=${set}
		/>`;
	}
	return html`
		<p class=${cx('form-row', f.cls, f.required && 'validate-required', invalid && 'woocommerce-invalid woocommerce-invalid-required-field')} id=${id + '_field'}>
			<label for=${id} class=${cx(f.srOnly && 'screen-reader-text')}>
				${f.label}${' '}
				${f.required ? html`<abbr class="required" title="required">*</abbr>` : !f.srOnly && html`<span class="optional">(optional)</span>`}
			</label>
			<span class="woocommerce-input-wrapper">${input}</span>
		</p>
	`;
}

function Fields({ group, values, invalid, onChange }) {
	return html`<div class=${`woocommerce-${group}-fields__field-wrapper`}>
		${fieldsFor(group, values).map((f) => html`<${Field} key=${f.key} group=${group} f=${f} value=${values[f.key] ?? ''} invalid=${invalid.includes(`${group}_${f.key}`)} onChange=${onChange} />`)}
	</div>`;
}

/** What the line was charged and chose (option-pricing / groups): later rule or label changes never change the order. */
export function freezeOptions(state, item) {
	const flags = lineFlags(item);
	if (!flags.pricing && !flags.groups) return {};
	const vid = lineVariationId(state, item);
	const q = quoteFor(state, item.productId, vid, item.custom, flags);
	return { basePrice: q.base, total: Math.round(q.total * item.qty * 100) / 100, options: q.lines.map((l) => ({ ...l })) };
}

export function stamp(d = new Date()) {
	const p = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function addressLine(v) {
	const c = COUNTRIES.find((x) => x.code === v.country);
	return [v.address_1, v.address_2, v.city, [v.state, v.postcode].filter(Boolean).join(' '), c && c.code !== 'US' ? c.name : ''].filter(Boolean).join(', ');
}

/** Order line items from the cart lines (classic and Checkout block share this). */
export function orderItems(s) {
	const snap = isOn('order-snapshot');
	let itemId = Math.max(0, ...Object.values(s.orders || {}).flatMap((o) => (o.items || []).map((i) => Number(i.id) || 0)));
	return (s.cart?.items || []).map((it) => ({
		id: ++itemId,
		productId: it.productId,
		variationId: it.variationId || 0,
		qty: it.qty,
		total: unitPrice(s, it) * it.qty,
		custom: it.custom || null,
		...freezeOptions(s, it),
		...(snap && it.snapshotId != null ? { snapshotId: it.snapshotId } : {}),
	}));
}

function CheckoutForm() {
	const state = useStore();
	const items = state.cart?.items || [];
	const [billing, setBilling] = useState(DEMO_BILLING);
	const [shipTo, setShipTo] = useState(false);
	const [shipping, setShipping] = useState(EMPTY_SHIPPING);
	const [notes, setNotes] = useState('');
	const [method, setMethod] = useState('cod');
	const [notices, setNotices] = useState([]);
	const [invalid, setInvalid] = useState([]);
	const [showCoupon, setShowCoupon] = useState(false);
	const [coupon, setCoupon] = useState('');
	const [busy, setBusy] = useState(false);
	const snapshot = useFeature('order-snapshot');

	if (!items.length) return html`<${EmptyCart} notices=${[{ type: 'info', text: 'Checkout is not available whilst your cart is empty.' }]} />`;

	const subtotal = cartTotal(state, items);
	const gateway = GATEWAYS.find((g) => g.id === method);

	const changeCountry = (setter) => (key, value) =>
		setter((v) => ({ ...v, [key]: value, ...(key === 'country' ? { state: '' } : {}) }));

	const validate = () => {
		const errors = [];
		const bad = [];
		const check = (group, values) => {
			const prefix = group === 'billing' ? 'Billing' : 'Shipping';
			for (const f of fieldsFor(group, values)) {
				const v = String(values[f.key] ?? '').trim();
				if (f.required && !v) {
					errors.push(html`<strong>${prefix} ${f.label}</strong> is a required field.`);
					bad.push(`${group}_${f.key}`);
				} else if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
					errors.push(html`<strong>${prefix} ${f.label}</strong> is not a valid email address.`);
					bad.push(`${group}_${f.key}`);
				}
			}
		};
		check('billing', billing);
		if (shipTo) check('shipping', shipping);
		setInvalid(bad);
		return errors;
	};

	const placeOrder = (e) => {
		e.preventDefault();
		if (busy) return;
		const errors = validate();
		if (errors.length) {
			setNotices([{ type: 'error', text: errors }]);
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		}
		setNotices([]);
		setBusy(true);
		// WooCommerce's blockUI pause while the AJAX checkout runs (order-snapshot: and any picture still rendering).
		const wait = new Promise((r) => setTimeout(r, 700));
		Promise.all([wait, capturesSettled()]).then(() => {
			const s = store.get();
			const id = store.nextId('orders');
			const order = {
				id,
				date: stamp(),
				status: gateway.status,
				customer: {
					name: `${billing.first_name} ${billing.last_name}`.trim(),
					email: billing.email.trim(),
					address: addressLine(billing),
					phone: billing.phone.trim(),
				},
				payment: gateway.title,
				paymentMethod: gateway.id,
				billing: { ...billing },
				shipping: shipTo ? { ...shipping } : null,
				customerNote: notes.trim(),
				items: orderItems(s),
			};
			store.set((st) => ({ ...st, orders: { ...(st.orders || {}), [id]: order }, cart: { ...(st.cart || {}), items: [] } }));
			go(`store.order.${id}`);
		});
	};

	return html`
		<${Notices} list=${notices} />
		<div class="woocommerce-form-coupon-toggle">
			<div class="woocommerce-info">
				Have a coupon? <a href="#" class="showcoupon" onClick=${(e) => { e.preventDefault(); setShowCoupon(!showCoupon); }}>Click here to enter your code</a>
			</div>
		</div>
		${showCoupon &&
		html`<form class="checkout_coupon woocommerce-form-coupon" onSubmit=${(e) => { e.preventDefault(); const c = coupon.trim(); setNotices([{ type: 'error', text: c ? `Coupon "${c.toLowerCase()}" does not exist!` : 'Please enter a coupon code.' }]); }}>
			<p>If you have a coupon code, please apply it below.</p>
			<p class="form-row form-row-first">
				<label for="checkout_coupon_code" class="screen-reader-text">Coupon:</label>
				<input type="text" name="coupon_code" class="input-text" placeholder="Coupon code" id="checkout_coupon_code" value=${coupon} onInput=${(e) => setCoupon(e.currentTarget.value)} />
			</p>
			<p class="form-row form-row-last"><button type="submit" class="button" name="apply_coupon">Apply coupon</button></p>
			<div class="clear"></div>
		</form>`}

		<form name="checkout" class=${cx('checkout woocommerce-checkout', busy && 'processing')} onSubmit=${placeOrder} noValidate>
			<div class="wc-proto-checkout">
				<div class="col2-set" id="customer_details">
					<${ProtoHint}>Billing details are prefilled with example data so you can place a demo order in one click. Nothing is sent anywhere.<//>
					<div class="col-1">
						<div class="woocommerce-billing-fields">
							<h3>Billing details</h3>
							<${Fields} group="billing" values=${billing} invalid=${invalid} onChange=${changeCountry(setBilling)} />
						</div>
					</div>
					<div class="col-2">
						<div class="woocommerce-shipping-fields">
							<h3 id="ship-to-different-address">
								<label class="woocommerce-form__label woocommerce-form__label-for-checkbox checkbox">
									<input id="ship-to-different-address-checkbox" class="woocommerce-form__input woocommerce-form__input-checkbox input-checkbox" type="checkbox" checked=${shipTo} onChange=${(e) => setShipTo(e.currentTarget.checked)} />
									${' '}<span>Ship to a different address?</span>
								</label>
							</h3>
							${shipTo && html`<div class="shipping_address"><${Fields} group="shipping" values=${shipping} invalid=${invalid} onChange=${changeCountry(setShipping)} /></div>`}
						</div>
						<div class="woocommerce-additional-fields">
							<div class="woocommerce-additional-fields__field-wrapper">
								<p class="form-row notes" id="order_comments_field">
									<label for="order_comments">Order notes <span class="optional">(optional)</span></label>
									<span class="woocommerce-input-wrapper">
										<textarea name="order_comments" class="input-text" id="order_comments" placeholder="Notes about your order, e.g. special notes for delivery." rows="2" cols="5" value=${notes} onInput=${(e) => setNotes(e.currentTarget.value)}></textarea>
									</span>
								</p>
							</div>
						</div>
					</div>
				</div>

				<div class="wc-proto-review">
					<h3 id="order_review_heading">Your order</h3>
					<div id="order_review" class="woocommerce-checkout-review-order">
						<table class=${cx('shop_table woocommerce-checkout-review-order-table', snapshot && 'wc3d-has-thumbs')}>
							<thead>
								<tr>${snapshot && html`<th class="product-thumbnail"><span class="screen-reader-text">Thumbnail image</span></th>`}<th class="product-name">Product</th><th class="product-total">Subtotal</th></tr>
							</thead>
							<tbody>
								${items.map(
									(it) => html`<tr key=${it.key} class="cart_item">
										${snapshot && html`<td class="product-thumbnail"><${LineThumb} state=${state} item=${it} size=${48} /></td>`}
										<td class="product-name">
											${lineName(state, it)}${' '}<strong class="product-quantity">× ${it.qty}</strong>
											<${ItemData} custom=${it.custom} item=${it} />
										</td>
										<td class="product-total"><span class="woocommerce-Price-amount amount">${money(unitPrice(state, it) * it.qty)}</span></td>
									</tr>`
								)}
							</tbody>
							<tfoot>
								<tr class="cart-subtotal"><th colspan=${snapshot ? 2 : undefined}>Subtotal</th><td><span class="woocommerce-Price-amount amount">${money(subtotal)}</span></td></tr>
								<tr class="order-total"><th colspan=${snapshot ? 2 : undefined}>Total</th><td><strong><span class="woocommerce-Price-amount amount">${money(subtotal)}</span></strong></td></tr>
							</tfoot>
						</table>

						<div id="payment" class="woocommerce-checkout-payment">
							<ul class="wc_payment_methods payment_methods methods">
								${GATEWAYS.map(
									(g) => html`<li key=${g.id} class=${`wc_payment_method payment_method_${g.id}`}>
										<input id=${'payment_method_' + g.id} type="radio" class="input-radio" name="payment_method" value=${g.id} checked=${method === g.id} onChange=${() => setMethod(g.id)} />
										<label for=${'payment_method_' + g.id}>${g.title}</label>
										${method === g.id && html`<div class=${`payment_box payment_method_${g.id}`}><p>${g.description}</p></div>`}
									</li>`
								)}
							</ul>
							<div class="form-row place-order">
								<div class="woocommerce-terms-and-conditions-wrapper">
									<div class="woocommerce-privacy-policy-text">
										<p>Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our <a href="#store.checkout" class="woocommerce-privacy-policy-link" onClick=${(e) => e.preventDefault()}>privacy policy</a>.</p>
									</div>
								</div>
								<button type="submit" class="button alt" name="woocommerce_checkout_place_order" id="place_order" disabled=${busy}>Place order</button>
							</div>
						</div>
					</div>
				</div>
			</div>
			${busy && html`<div class="blockUI blockOverlay" aria-hidden="true"></div>`}
		</form>
	`;
}

export default function Checkout() {
	const blocks = useStore((s) => s.demo?.cartPage === 'blocks');
	if (blocks) return html`<${BlockCheckout} />`;
	return html`
		<${StoreTheme}>
			<div class="wc-proto-page">
				<h1 class="entry-title">Checkout</h1>
				<${ClassicSetupHint} page="checkout" />
				<div class="woocommerce wc-proto-cart"><${CheckoutForm} /></div>
			</div>
		<//>
	`;
}
