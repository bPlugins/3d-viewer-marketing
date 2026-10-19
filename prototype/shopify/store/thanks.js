// Thank-you page (#store.thanks.<orderId>) with our checkout UI extension block.
import { html } from '../../js/core/ui.js';
import { useStore } from '../core/store.js';
import { money, orderTotals } from '../core/commerce.js';
import { Icon } from '../ui/icons.js';
import { OrderLines, OrderSummary, DesignBlock } from './order-parts.js';

export default function Thanks({ params }) {
	const s = useStore();
	const order = s.orders[params[0]];
	const head = html`<header class="sf-co-head"><div class="sf-co-wrap"><a class="sf-logo" href="#store.home">Fernway</a><a class="sf-co-head__cart" href="#store.cart" aria-label="Cart"><${Icon} name="bag" size=${20} /></a></div></header>`;
	if (!order) {
		return html`<div class="sf-co">${head}<div class="sf-co-wrap sf-co-empty"><h1>We couldn't find that order</h1><p>Check the link in your confirmation email, or see all orders in your account.</p><a class="sf-btn sf-btn--primary" href="#account.orders">Go to your orders</a></div></div>`;
	}
	const customer = s.customers[order.customerId];
	const t = orderTotals(s, order);
	return html`<div class="sf-co">
		${head}
		<div class="sf-co-grid">
			<main class="sf-co-main">
				<div class="sf-co-wrap-l">
					<div class="sf-co-thanks">
						<span class="sf-co-thanks__check"><${Icon} name="check" size=${22} /></span>
						<div><p class="sf-co-muted">Confirmation ${order.name}</p><h1>Thank you${customer ? `, ${customer.name.split(' ')[0]}` : ''}!</h1></div>
					</div>
					<section class="sf-co-box">
						<h2>Your order is confirmed</h2>
						<p class="sf-co-muted">You'll get a confirmation email with your order number shortly. Made-to-order pieces ship in 5 to 7 working days.</p>
					</section>

					<${DesignBlock} s=${s} order=${order} target="purchase.thank-you.block.render" trackHref=${'#account.order.' + order.id} />

					<section class="sf-co-box">
						<h2>Order details</h2>
						<div class="sf-co-details">
							<div><h3>Contact information</h3><p>${customer?.email || 'guest@example.com'}</p></div>
							<div><h3>Payment method</h3><p>Card ending 4242 · ${money(t.total)}</p></div>
							<div><h3>Shipping address</h3><p>${customer?.name || 'Guest'}<br />418 Alder Lane<br />Portland OR 97209<br />United States</p></div>
							<div><h3>Shipping method</h3><p>${t.shipping >= 45 ? 'Express delivery' : 'Standard delivery'}</p></div>
						</div>
					</section>
					<div class="sf-co-thanks__foot">
						<p class="sf-co-muted">Need help? <a href="#store.home">Contact us</a></p>
						<a class="sf-co-paynow sf-co-paynow--auto" href="#store.home">Continue shopping</a>
					</div>
				</div>
			</main>
			<aside class="sf-co-side" aria-label="Order summary">
				<div class="sf-co-wrap-r">
					<${OrderLines} s=${s} order=${order} />
					<${OrderSummary} s=${s} order=${order} />
				</div>
			</aside>
		</div>
	</div>`;
}
