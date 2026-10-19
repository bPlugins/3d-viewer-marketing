// Customer account · order status page with our order-status block extension.
import { html, cx } from '../../js/core/ui.js';
import { useStore } from '../core/store.js';
import { addToCart } from '../core/commerce.js';
import { go } from '../core/router.js';
import { Icon } from '../ui/icons.js';
import { toast } from '../ui/polaris.js';
import { OrderLines, OrderSummary, DesignBlock } from '../store/order-parts.js';
import { AccountFrame } from './chrome.js';

const STEPS = ['Confirmed', 'On its way', 'Delivered'];

export default function AccountOrder({ params }) {
	const s = useStore();
	const order = s.orders[params[0]];
	if (!order || order.customerId !== s.demo.customerId) {
		return html`<${AccountFrame} current="orders"><div class="sf-acct__page sf-empty"><h1 class="sf-h3">Order not found</h1><p class="sf-muted">This order isn't linked to your account.</p><a class="sf-btn sf-btn--primary" href="#account.orders">Back to orders</a></div><//>`;
	}
	const customer = s.customers[order.customerId];
	const step = order.fulfillment === 'Fulfilled' ? 2 : 0;
	const again = () => {
		for (const l of order.lines) {
			const d = l.designCode ? s.designs[l.designCode] : null;
			addToCart({ productId: l.productId, variantId: l.variantId, qty: l.qty, choices: d?.choices || null, snapshot: l.snapshot || null });
		}
		toast('Added to your cart');
		go('store.cart');
	};
	return html`<${AccountFrame} current="orders">
		<div class="sf-acct__page">
			<a class="sf-acct__back" href="#account.orders"><${Icon} name="arrowLeft" size=${16} /> Orders</a>
			<div class="sf-acct__ohead">
				<div><h1 class="sf-acct__title">Order ${order.name}</h1><p class="sf-muted sf-small">Placed ${order.date.slice(0, 10)}</p></div>
				<button type="button" class="sf-btn sf-btn--secondary" onClick=${again}>Buy again</button>
			</div>
			<div class="sf-acct__ogrid">
				<div class="sf-acct__ocol">
					<section class="sf-acct__card">
						<h2 class="sf-acct__h2">${STEPS[step]}</h2>
						<p class="sf-muted sf-small">${step === 2 ? 'Your order was delivered.' : "We're making your order. You'll get an email when it ships."}</p>
						<ol class="sf-steps">${STEPS.map((x, i) => html`<li class=${cx(i <= step && 'is-done')}><span></span>${x}</li>`)}</ol>
					</section>
					<${DesignBlock} s=${s} order=${order} target="customer-account.order-status.block.render" />
					<section class="sf-acct__card sf-acct__info">
						<div><h3>Contact information</h3><p>${customer?.email}</p></div>
						<div><h3>Shipping address</h3><p>${customer?.name}<br />418 Alder Lane<br />Portland OR 97209<br />United States</p></div>
						<div><h3>Payment</h3><p>Card ending 4242 · ${order.financial}</p></div>
					</section>
				</div>
				<aside class="sf-acct__card sf-acct__oside" aria-label="Order summary">
					<${OrderLines} s=${s} order=${order} />
					<${OrderSummary} s=${s} order=${order} />
				</aside>
			</div>
		</div>
	<//>`;
}
