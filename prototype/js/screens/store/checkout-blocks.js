// WooCommerce Checkout block (wp-block-woocommerce-checkout): the checkout page when the demo store
// uses blocks. Place Order builds store.orders[id] exactly like the classic checkout.
import { html, useState, useRef, money, cx } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { go } from '../../core/router.js';
import { LineImage } from '../../shared/snapshot.js';
import { StoreTheme, capturesSettled } from './theme.js';
import { unitPrice, cartTotal, ProtoHint } from './cart.js';
import { GATEWAYS, COUNTRIES, stamp, addressLine, orderItems } from './checkout.js';
import { useContainerSize, Money, ProductPrice, ProductMetadata, blockItemName, BlockSetupHint, CouponPanel, TotalsItem } from './cart-blocks.js';

const DEMO_ADDRESS = { first_name: 'Alex', last_name: 'Morgan', country: 'US', address_1: '500 Market Street', address_2: 'Apt 4B', city: 'San Francisco', state: 'California', postcode: '94105', phone: '(415) 555-0134' };
const DEMO_EMAIL = 'alex.morgan@example.com';
const EMPTY_ADDRESS = { first_name: '', last_name: '', country: 'US', address_1: '', address_2: '', city: '', state: '', postcode: '', phone: '' };
const SHIPPING_KEYS = ['first_name', 'last_name', 'company', 'country', 'address_1', 'address_2', 'city', 'state', 'postcode'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FREE_SHIPPING = { id: 'free_shipping:1', name: 'Free shipping' };

/** Block address form fields (default locale order). */
function addressFields(values) {
	const c = COUNTRIES.find((x) => x.code === values.country) || COUNTRIES[0];
	return [
		{ key: 'country', label: 'Country/Region', required: true, type: 'country', wide: true },
		{ key: 'first_name', label: 'First name', required: true, auto: 'given-name' },
		{ key: 'last_name', label: 'Last name', required: true, auto: 'family-name' },
		{ key: 'address_1', label: 'Address', required: true, auto: 'address-line1', wide: true },
		{ key: 'address_2', label: 'Apartment, suite, etc.', auto: 'address-line2', wide: true, toggle: '+ Add apartment, suite, etc.' },
		{ key: 'city', label: 'City', required: true, auto: 'address-level2' },
		{ key: 'state', label: c.state, required: !c.stateOptional, type: c.states ? 'state' : 'text', options: c.states, auto: 'address-level1' },
		{ key: 'postcode', label: c.postcode, required: !c.postcodeOptional, auto: 'postal-code' },
		{ key: 'phone', label: 'Phone', type: 'tel', auto: 'tel' },
	];
}

const invalidText = (label) => `Please enter a valid ${label.toLowerCase()}`;

function addressErrors(group, values) {
	const out = {};
	for (const f of addressFields(values)) if (f.required && !String(values[f.key] ?? '').trim()) out[`${group}-${f.key}`] = invalidText(f.label);
	return out;
}

const fieldLabel = (f) => (f.required ? f.label : `${f.label} (optional)`);

function ValidationError({ id, text }) {
	if (!text) return null;
	return html`<div class="wc-block-components-validation-error" role="alert">
		<p id=${'validate-error-' + id}>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M10 2c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8zm1.13 9.38l.35-6.46H8.52l.35 6.46h2.26zm-.09 3.36c.24-.23.37-.55.37-.96 0-.42-.12-.74-.36-.97s-.59-.35-1.06-.35-.82.12-1.07.35-.37.55-.37.97c0 .41.13.73.38.96.26.23.61.34 1.06.34s.8-.11 1.05-.34z"></path></svg>
			<span>${text}</span>
		</p>
	</div>`;
}

const SelectChevron = () =>
	html`<svg class="wc-blocks-components-select__expand" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z"></path></svg>`;

function TextInput({ id, label, type = 'text', value, auto, required, error, class: cls, onInput, disabled }) {
	return html`<div class=${cx('wc-block-components-text-input', cls, value && 'is-active', error && 'has-error')}>
		<input
			type=${type}
			id=${id}
			autocomplete=${auto || 'off'}
			aria-label=${label}
			required=${required}
			aria-invalid=${error ? 'true' : 'false'}
			aria-describedby=${error ? 'validate-error-' + id : undefined}
			value=${value}
			disabled=${disabled}
			onInput=${(e) => onInput(e.currentTarget.value)}
		/>
		<label for=${id}>${label}</label>
		<${ValidationError} id=${id} text=${error} />
	</div>`;
}

function SelectInput({ id, label, value, options, auto, error, class: cls, onChange, disabled }) {
	return html`<div class=${cx(cls, error && 'has-error')}>
		<div class="wc-blocks-components-select">
			<div class="wc-blocks-components-select__container">
				<label for=${id} class="wc-blocks-components-select__label">${label}</label>
				<select class="wc-blocks-components-select__select" id=${id} autocomplete=${auto} aria-invalid=${error ? 'true' : 'false'} value=${value} disabled=${disabled} onChange=${(e) => onChange(e.currentTarget.value)}>
					${options.map(([v, t]) => html`<option key=${v} value=${v} selected=${v === value} disabled=${v === ''}>${t}</option>`)}
				</select>
				<${SelectChevron} />
			</div>
		</div>
		<${ValidationError} id=${id} text=${error} />
	</div>`;
}

function AddressForm({ group, values, errors, onChange, disabled }) {
	const [showApt, setShowApt] = useState(!!values.address_2);
	return html`<div id=${group} class="wc-block-components-address-form">
		${addressFields(values).map((f) => {
			const id = `${group}-${f.key}`;
			const cls = cx(`wc-block-components-address-form__${f.key}`, f.wide && 'is-wide');
			const set = (v) => onChange(f.key, v);
			if (f.type === 'country') {
				return html`<${SelectInput} key=${id} id=${id} class=${cx(cls, 'wc-block-components-country-input')} label=${f.label} auto="country" value=${values.country} options=${COUNTRIES.map((c) => [c.code, c.name])} onChange=${set} disabled=${disabled} />`;
			}
			if (f.type === 'state') {
				return html`<${SelectInput} key=${id + values.country} id=${id} class=${cx(cls, 'wc-block-components-state-input')} label=${fieldLabel(f)} auto=${f.auto} value=${values.state} options=${[['', 'Select an option…'], ...f.options.map((o) => [o, o])]} error=${errors[id]} onChange=${set} disabled=${disabled} />`;
			}
			if (f.toggle && !showApt) {
				return html`<div key=${id} class=${cls + '-toggle-wrap'}>
					<button type="button" class=${`wc-block-components-address-form__${f.key}-toggle`} onClick=${() => setShowApt(true)}>${f.toggle}</button>
				</div>`;
			}
			return html`<${TextInput} key=${id} id=${id} class=${cls} type=${f.type === 'tel' ? 'tel' : 'text'} label=${fieldLabel(f)} auto=${f.auto} required=${f.required} value=${values[f.key] ?? ''} error=${errors[id]} onInput=${set} disabled=${disabled} />`;
		})}
	</div>`;
}

function Checkbox({ id, label, checked, onChange, disabled }) {
	return html`<div class="wc-block-components-checkbox">
		<label for=${id}>
			<input id=${id} class="wc-block-components-checkbox__input" type="checkbox" checked=${checked} disabled=${disabled} onChange=${(e) => onChange(e.currentTarget.checked)} />
			<svg class="wc-block-components-checkbox__mark" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20"><path d="M9 20.2l-8.6-8.6L3 9l6 6L21.6 2.4 24 5z"></path></svg>
			<span class="wc-block-components-checkbox__label">${label}</span>
		</label>
	</div>`;
}

function Step({ id, cls, title, description, children }) {
	return html`<fieldset class=${cx('wc-block-components-checkout-step', cls)} id=${id}>
		<legend class="screen-reader-text">${title}</legend>
		<div class="wc-block-components-checkout-step__heading"><h2 class="wc-block-components-title wc-block-components-checkout-step__title" aria-hidden="true">${title}</h2></div>
		<div class="wc-block-components-checkout-step__container">
			${description && html`<p class="wc-block-components-checkout-step__description">${description}</p>`}
			<div class="wc-block-components-checkout-step__content">${children}</div>
		</div>
	</fieldset>`;
}

function RadioOption({ name, value, checked, label, secondary, onChange, disabled }) {
	const id = `radio-control-${name}-${value}`;
	return html`<label class=${cx('wc-block-components-radio-control__option', checked && 'wc-block-components-radio-control__option-checked')} for=${id}>
		<input id=${id} class="wc-block-components-radio-control__input" type="radio" name=${'radio-control-' + name} value=${value} checked=${checked} disabled=${disabled} onChange=${onChange} />
		<div class="wc-block-components-radio-control__option-layout">
			<div class="wc-block-components-radio-control__label-group">
				<span class="wc-block-components-radio-control__label">${label}</span>
				${secondary && html`<span class="wc-block-components-radio-control__secondary-label">${secondary}</span>`}
			</div>
		</div>
	</label>`;
}

// ── Order summary sidebar ───────────────────────────────────────────────────

function SummaryItem({ state, item }) {
	const name = blockItemName(state, item);
	const unit = unitPrice(state, item);
	const total = unit * item.qty;
	return html`<div class="wc-block-components-order-summary-item">
		<div class="wc-block-components-order-summary-item__image">
			<div class="wc-block-components-order-summary-item__quantity">
				<span aria-hidden="true">${item.qty}</span>
				<span class="screen-reader-text">${item.qty === 1 ? '1 item' : `${item.qty} items`}</span>
			</div>
			<${LineImage} state=${state} item=${item} size=${48} />
		</div>
		<div class="wc-block-components-order-summary-item__description">
			<h3 class="wc-block-components-product-name">${name}</h3>
			<span class="wc-block-components-order-summary-item__individual-prices price wc-block-components-product-price">
				<${Money} value=${unit} class="wc-block-components-product-price__value wc-block-components-order-summary-item__individual-price" />
			</span>
			<${ProductMetadata} state=${state} item=${item} />
		</div>
		<span class="screen-reader-text">${`Total price for ${item.qty} ${name} ${item.qty === 1 ? 'item' : 'items'}: ${money(total)}`}</span>
		<div class="wc-block-components-order-summary-item__total-price"><${ProductPrice} value=${total} /></div>
	</div>`;
}

function OrderSummary({ state, items, collapsible }) {
	const [open, setOpen] = useState(false);
	const subtotal = cartTotal(state, items);
	const expanded = !collapsible || open;
	const toggle = () => collapsible && setOpen(!open);
	return html`<div class=${cx('wp-block-woocommerce-checkout-order-summary-block', collapsible && 'is-collapsible', expanded && 'is-open')}>
		<div
			class="wc-block-components-checkout-order-summary__title"
			role=${collapsible ? 'button' : undefined}
			tabindex=${collapsible ? 0 : undefined}
			aria-expanded=${collapsible ? open : undefined}
			onClick=${toggle}
			onKeyDown=${(e) => collapsible && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle())}
		>
			<p class="wc-block-components-checkout-order-summary__title-text" role="heading">Order summary</p>
			${collapsible && html`<p class="wc-block-components-checkout-order-summary__title-price">${money(subtotal)}</p>`}
			${collapsible && html`<span class="wc-block-components-checkout-order-summary__title-icon" aria-hidden="true"></span>`}
		</div>
		${expanded &&
		html`<div class="wc-block-components-checkout-order-summary__content">
			<div class="wp-block-woocommerce-checkout-order-summary-cart-items-block wc-block-components-totals-wrapper">
				<div class="wc-block-components-order-summary">
					<div class="wc-block-components-order-summary__content">
						${items.map((it) => html`<${SummaryItem} key=${it.key} state=${state} item=${it} />`)}
					</div>
				</div>
			</div>
			<${CouponPanel} />
			<div class="wc-block-components-totals-wrapper">
				<${TotalsItem} label="Subtotal" value=${subtotal} />
				<${TotalsItem} class="wc-block-components-totals-shipping" label="Shipping" value=${html`<strong>Free</strong>`} description=${FREE_SHIPPING.name} />
			</div>
			<div class="wc-block-components-totals-wrapper">
				<${TotalsItem} class="wc-block-components-totals-footer-item" label="Total" value=${subtotal} />
			</div>
		</div>`}
	</div>`;
}

// ── Checkout form ───────────────────────────────────────────────────────────

function EmptyCheckout() {
	return html`<div class="wc-block-checkout-empty">
		<svg class="wc-block-checkout-empty__image" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="72" height="72" aria-hidden="true" focusable="false"><path d="M6 7h12l-1 13H7L6 7zm3 0V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path></svg>
		<strong class="wc-block-checkout-empty__title">Your cart is currently empty!</strong>
		<p class="wc-block-checkout-empty__description">Checkout is not available whilst your cart is empty—please take a look through our store and come back when you're ready to place an order.</p>
		<span class="wp-block-button"><a href="#store.shop" class="wp-block-button__link">Browse store</a></span>
	</div>`;
}

function CheckoutBlockForm({ state, items }) {
	const [ref, size] = useContainerSize();
	const [email, setEmail] = useState(DEMO_EMAIL);
	const [shipping, setShipping] = useState(DEMO_ADDRESS);
	const [billing, setBilling] = useState(EMPTY_ADDRESS);
	const [sameBilling, setSameBilling] = useState(true);
	const [method, setMethod] = useState('cod');
	const [addNote, setAddNote] = useState(false);
	const [note, setNote] = useState('');
	const [errors, setErrors] = useState({});
	const [tried, setTried] = useState(false);
	const [busy, setBusy] = useState(false);
	const formRef = useRef(null);

	const collect = (next = {}) => {
		const v = { email, shipping, billing, sameBilling, ...next };
		const e = {};
		const mail = v.email.trim();
		if (!mail || !EMAIL_RE.test(mail)) e.email = 'Please enter a valid email address';
		Object.assign(e, addressErrors('shipping', v.shipping));
		if (!v.sameBilling) Object.assign(e, addressErrors('billing', v.billing));
		return e;
	};
	// After the first Place Order, errors follow the fields as the shopper types.
	const revalidate = (next) => tried && setErrors(collect(next));

	const changeAddress = (group, setter, current) => (key, value) => {
		const next = { ...current, [key]: value, ...(key === 'country' ? { state: '' } : {}) };
		setter(next);
		revalidate({ [group]: next });
	};

	const placeOrder = (e) => {
		e.preventDefault();
		if (busy) return;
		const found = collect();
		setTried(true);
		setErrors(found);
		const first = Object.keys(found)[0];
		if (first) {
			const el = formRef.current?.querySelector('#' + first);
			el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
			el?.focus({ preventScroll: true });
			return;
		}
		setBusy(true);
		const gateway = GATEWAYS.find((g) => g.id === method);
		const addr = sameBilling ? shipping : billing;
		const billingOut = { first_name: addr.first_name, last_name: addr.last_name, company: '', country: addr.country, address_1: addr.address_1, address_2: addr.address_2, city: addr.city, state: addr.state, postcode: addr.postcode, phone: addr.phone, email: email.trim() };
		const shippingOut = sameBilling ? null : Object.fromEntries(SHIPPING_KEYS.map((k) => [k, shipping[k] ?? '']));
		// Snapshots still rendering finish first so the order items get their snapshotId.
		Promise.all([capturesSettled(), new Promise((r) => setTimeout(r, 700))]).then(() => {
			const s = store.get();
			const id = store.nextId('orders');
			const order = {
				id,
				date: stamp(),
				status: gateway.status,
				customer: {
					name: `${billingOut.first_name} ${billingOut.last_name}`.trim(),
					email: billingOut.email,
					address: addressLine(billingOut),
					phone: String(billingOut.phone || '').trim(),
				},
				payment: gateway.title,
				paymentMethod: gateway.id,
				billing: billingOut,
				shipping: shippingOut,
				customerNote: addNote ? note.trim() : '',
				items: orderItems(s),
			};
			store.set((st) => ({ ...st, orders: { ...(st.orders || {}), [id]: order }, cart: { ...(st.cart || {}), items: [] } }));
			go(`store.order.${id}`);
		});
	};

	const small = size !== 'is-large';
	return html`
		<div ref=${ref} class=${cx('wc-block-components-sidebar-layout wc-block-checkout', size)}>
			<div class="wc-block-components-main wc-block-checkout__main wp-block-woocommerce-checkout-fields-block">
				<form ref=${formRef} class=${cx('wc-block-components-form wc-block-checkout__form', busy && 'is-processing')} onSubmit=${placeOrder} noValidate>
					<${ProtoHint}>Address details are prefilled with example data so you can place a demo order in one click. Nothing is sent anywhere.<//>
					<${Step} id="contact-fields" cls="wc-block-checkout__contact-fields wp-block-woocommerce-checkout-contact-information-block" title="Contact information" description="We'll use this email to send you details and updates about your order.">
						<div class="wc-block-components-address-form">
							<${TextInput} id="email" class="wc-block-components-address-form__email is-wide" type="email" label="Email address" auto="email" required value=${email} error=${errors.email} disabled=${busy} onInput=${(v) => { setEmail(v); revalidate({ email: v }); }} />
						</div>
					<//>
					<${Step} id="shipping-fields" cls="wc-block-checkout__shipping-fields wp-block-woocommerce-checkout-shipping-address-block" title="Shipping address" description="Enter the address where you want your order delivered.">
						<${AddressForm} group="shipping" values=${shipping} errors=${errors} disabled=${busy} onChange=${changeAddress('shipping', setShipping, shipping)} />
						<div class="wc-block-checkout__use-address-for-billing">
							<${Checkbox} id="checkbox-control-billing" label="Use same address for billing" checked=${sameBilling} disabled=${busy} onChange=${(v) => { setSameBilling(v); revalidate({ sameBilling: v }); }} />
						</div>
					<//>
					${!sameBilling &&
					html`<${Step} id="billing-fields" cls="wc-block-checkout__billing-fields wp-block-woocommerce-checkout-billing-address-block" title="Billing address" description="Enter the billing address that matches your payment method.">
						<${AddressForm} group="billing" values=${billing} errors=${errors} disabled=${busy} onChange=${changeAddress('billing', setBilling, billing)} />
					<//>`}
					<${Step} id="shipping-option" cls="wc-block-checkout__shipping-option wp-block-woocommerce-checkout-shipping-methods-block" title="Shipping options">
						<div class="wc-block-components-shipping-rates-control">
							<div class="wc-block-components-shipping-rates-control__package">
								<div class="wc-block-components-radio-control">
									<${RadioOption} name="shipping" value=${FREE_SHIPPING.id} checked label=${FREE_SHIPPING.name} secondary=${html`<span class="wc-block-components-shipping-rates-control__package__description--free">Free</span>`} disabled=${busy} onChange=${() => {}} />
								</div>
							</div>
						</div>
					<//>
					<${Step} id="payment-method" cls="wc-block-checkout__payment-method wp-block-woocommerce-checkout-payment-block" title="Payment options">
						<div class="wc-block-components-radio-control wc-block-components-radio-control--highlight-checked wc-block-components-radio-control-accordion">
							${GATEWAYS.map(
								(g) => html`<div key=${g.id} class=${cx('wc-block-components-radio-control-accordion-option', method === g.id && 'wc-block-components-radio-control-accordion-option--checked-option-highlighted')}>
									<${RadioOption} name="wc-payment-method-options" value=${g.id} checked=${method === g.id} label=${html`<span class="wc-block-components-payment-method-label">${g.title}</span>`} disabled=${busy} onChange=${() => setMethod(g.id)} />
									${method === g.id && html`<div class="wc-block-components-radio-control-accordion-content"><div>${g.description}</div></div>`}
								</div>`
							)}
						</div>
					<//>
					<div class="wc-block-checkout__add-note wp-block-woocommerce-checkout-order-note-block">
						<${Checkbox} id="checkbox-control-note" label="Add a note to your order" checked=${addNote} disabled=${busy} onChange=${setAddNote} />
						${addNote &&
						html`<div class="wc-block-checkout__order-notes">
							<textarea class="wc-block-components-textarea" aria-label="Notes about your order, e.g. special notes for delivery." placeholder="Notes about your order, e.g. special notes for delivery." value=${note} disabled=${busy} onInput=${(e) => setNote(e.currentTarget.value)}></textarea>
						</div>`}
					</div>
					<div class="wc-block-checkout__terms wp-block-woocommerce-checkout-terms-block">
						<span class="wc-block-components-checkbox-label">By proceeding with your purchase you agree to our <a href="#store.checkout" onClick=${(e) => e.preventDefault()}>Terms and Conditions</a> and <a href="#store.checkout" onClick=${(e) => e.preventDefault()}>Privacy Policy</a></span>
					</div>
					<div class="wc-block-checkout__actions wp-block-woocommerce-checkout-actions-block">
						<div class="wc-block-checkout__actions_row">
							<a href="#store.cart" class="wc-block-components-checkout-return-to-cart-button">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M20 11.2H6.8l3.7-3.7-1-1L3.9 12l5.6 5.5 1-1-3.7-3.7H20z"></path></svg>
								Return to Cart
							</a>
							<button type="submit" class=${cx('wc-block-components-button wp-element-button wc-block-components-checkout-place-order-button contained', busy && 'wc-block-components-button--loading')} disabled=${busy} aria-disabled=${busy}>
								${busy && html`<span class="wc-block-components-spinner" aria-hidden="true"></span>`}
								<span class="wc-block-components-button__text"><span class="wc-block-components-checkout-place-order-button__text">Place Order</span></span>
							</button>
						</div>
					</div>
				</form>
			</div>
			<div class="wc-block-components-sidebar wc-block-checkout__sidebar wp-block-woocommerce-checkout-totals-block">
				<${OrderSummary} state=${state} items=${items} collapsible=${small} />
			</div>
		</div>
	`;
}

export function BlockCheckout() {
	const state = useStore();
	const items = state.cart?.items || [];
	return html`
		<${StoreTheme}>
			<div class="wc-proto-page wc-proto-blocks">
				<h1 class="entry-title">Checkout</h1>
				<${BlockSetupHint} page="checkout" />
				<div class="wp-block-woocommerce-checkout alignwide wc-block-checkout">
					${items.length ? html`<${CheckoutBlockForm} state=${state} items=${items} />` : html`<${EmptyCheckout} />`}
				</div>
			</div>
		<//>
	`;
}
