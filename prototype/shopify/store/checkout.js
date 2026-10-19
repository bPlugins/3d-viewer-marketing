// Shopify-hosted checkout look (one page). Not customizable by the app on non-Plus plans; the
// Cart Transform result is all that reaches it.
import { html, useState, cx } from '../../js/core/ui.js';
import { store, useStore } from '../core/store.js';
import { money, cartTotals, placeOrder } from '../core/commerce.js';
import { go } from '../core/router.js';
import { Icon } from '../ui/icons.js';
import { CartLine, ProtoNote, FREE_DELIVERY } from './theme.js';

function Field({ label, value, half, type = 'text', autocomplete }) {
	const id = 'sf-co-' + label.toLowerCase().replace(/[^a-z]+/g, '-');
	return html`<div class=${cx('sf-co-field', half && 'sf-co-field--half')}>
		<label for=${id}>${label}</label>
		<input id=${id} type=${type} value=${value} autocomplete=${autocomplete} />
	</div>`;
}

export default function Checkout() {
	const s = useStore();
	const { lines, subtotal, count } = cartTotals(s);
	const [ship, setShip] = useState('standard');
	const [paying, setPaying] = useState(false);
	const [summary, setSummary] = useState(false);
	const customer = s.customers[s.demo.customerId] || { name: 'Guest Shopper', email: 'guest@example.com' };
	const [first, ...rest] = customer.name.split(' ');
	const free = subtotal >= FREE_DELIVERY;
	const rates = { standard: { label: 'Standard delivery', note: '5 to 7 working days', price: free ? 0 : 29 }, express: { label: 'Express delivery', note: '2 working days', price: 45 } };
	const shipping = rates[ship].price;
	const total = Math.round((subtotal + shipping) * 100) / 100;

	const pay = () => {
		setPaying(true);
		setTimeout(() => {
			const id = placeOrder();
			store.patch(['orders', id, 'shipping'], shipping);
			go('store.thanks.' + id);
		}, 700);
	};

	const head = html`<header class="sf-co-head"><div class="sf-co-wrap"><a class="sf-logo" href="#store.home">Fernway</a><a class="sf-co-head__cart" href="#store.cart" aria-label="Back to cart"><${Icon} name="bag" size=${20} /></a></div></header>`;

	if (!lines.length) {
		return html`<div class="sf-co">${head}<div class="sf-co-wrap sf-co-empty"><h1>Your cart is empty</h1><p>Add something to your cart before checking out.</p><a class="sf-btn sf-btn--primary" href="#store.home">Continue shopping</a></div></div>`;
	}

	const summaryBody = html`
		<ul class="sf-lines sf-co-lines">${lines.map(({ line }) => html`<${CartLine} key=${line.id} line=${line} s=${s} imgSize=${64} surface="checkout" />`)}</ul>
		<div class="sf-co-discount"><input type="text" placeholder="Discount code or gift card" aria-label="Discount code or gift card" /><button type="button" class="sf-co-btn-sec">Apply</button></div>
		<div class="sf-co-sum">
			<div class="sf-sumrow"><span>Subtotal · ${count} ${count === 1 ? 'item' : 'items'}</span><span>${money(subtotal)}</span></div>
			<div class="sf-sumrow"><span>Shipping</span><span>${shipping ? money(shipping) : 'Free'}</span></div>
			<div class="sf-sumrow sf-sumrow--total sf-co-total"><span>Total</span><span><small>${s.demo.currency}</small> <strong>${money(total)}</strong></span></div>
		</div>
		<${ProtoNote} tag="Checkout · not extensible on Basic">
			Checkout belongs to Shopify. On Basic the app can't add UI here or swap line images, so the customized line shows its expanded components and the variant image. Plus shops get the snapshot and the "(customized)" title through <code>lineUpdate</code>.
		<//>
	`;

	return html`<div class="sf-co">
		${head}
		<button type="button" class="sf-co-mobile-sum" aria-expanded=${String(summary)} onClick=${() => setSummary(!summary)}>
			<span><${Icon} name="bag" size=${16} /> ${summary ? 'Hide' : 'Show'} order summary <${Icon} name="chevronDown" size=${14} /></span><strong>${money(total)}</strong>
		</button>
		${summary ? html`<div class="sf-co-mobile-sumbody">${summaryBody}</div>` : null}
		<div class="sf-co-grid">
			<main class="sf-co-main">
				<div class="sf-co-wrap-l">
					<div class="sf-co-express">
						<p class="sf-co-express__label">Express checkout</p>
						<div class="sf-co-express__btns"><button type="button" class="sf-co-pay sf-co-pay--a" disabled>Pay</button><button type="button" class="sf-co-pay sf-co-pay--b" disabled>Wallet</button></div>
						<p class="sf-co-or"><span>or</span></p>
					</div>
					<section class="sf-co-sec">
						<div class="sf-co-sec__head"><h2>Contact</h2><a href="#account.orders">Account</a></div>
						<${Field} label="Email" value=${customer.email} type="email" autocomplete="email" />
						<label class="sf-co-check"><input type="checkbox" checked /> Email me with news and offers</label>
					</section>
					<section class="sf-co-sec">
						<h2>Delivery</h2>
						<div class="sf-co-row">
							<div class="sf-co-field"><label for="sf-co-country">Country/Region</label><select id="sf-co-country"><option>United States</option><option>Canada</option><option>Germany</option></select></div>
							<${Field} label="First name" value=${first} half autocomplete="given-name" />
							<${Field} label="Last name" value=${rest.join(' ')} half autocomplete="family-name" />
							<${Field} label="Address" value="418 Alder Lane" autocomplete="street-address" />
							<${Field} label="City" value="Portland" half />
							<${Field} label="ZIP code" value="97209" half />
						</div>
					</section>
					<section class="sf-co-sec">
						<h2>Shipping method</h2>
						<div class="sf-co-radios" role="radiogroup" aria-label="Shipping method">
							${Object.entries(rates).map(([k, r]) => html`<label class=${cx('sf-co-radio', ship === k && 'is-on')}>
								<input type="radio" name="sf-co-ship" checked=${ship === k} onChange=${() => setShip(k)} />
								<span class="sf-co-radio__text"><span>${r.label}</span><small>${r.note}</small></span>
								<strong>${r.price ? money(r.price) : 'Free'}</strong>
							</label>`)}
						</div>
					</section>
					<section class="sf-co-sec">
						<h2>Payment</h2>
						<p class="sf-co-muted">All transactions are secure and encrypted.</p>
						<div class="sf-co-card">
							<div class="sf-co-card__head"><span>Credit card</span><span class="sf-co-demo">Demo card, no charge</span></div>
							<div class="sf-co-row">
								<${Field} label="Card number" value="4242 4242 4242 4242" autocomplete="off" />
								<${Field} label="Expiration date (MM / YY)" value="12 / 29" half autocomplete="off" />
								<${Field} label="Security code" value="123" half autocomplete="off" />
								<${Field} label="Name on card" value=${customer.name} autocomplete="off" />
							</div>
						</div>
					</section>
					<button type="button" class="sf-co-paynow" onClick=${pay} disabled=${paying}>${paying ? 'Processing…' : 'Pay now'}</button>
					<p class="sf-co-legal"><a href="#store.home">Refund policy</a><a href="#store.home">Shipping</a><a href="#store.home">Privacy policy</a><a href="#store.home">Terms of service</a></p>
				</div>
			</main>
			<aside class="sf-co-side" aria-label="Order summary"><div class="sf-co-wrap-r">${summaryBody}</div></aside>
		</div>
	</div>`;
}
