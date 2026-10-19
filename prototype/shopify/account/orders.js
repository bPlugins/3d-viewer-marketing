// Customer account · Orders (native page).
import { html, cx } from '../../js/core/ui.js';
import { useStore } from '../core/store.js';
import { money, orderTotals } from '../core/commerce.js';
import { ProductImage, DesignImage } from '../ui/viewer.js';
import { Icon } from '../ui/icons.js';
import { AccountFrame, fulfillmentTone } from './chrome.js';

export default function Orders() {
	const s = useStore();
	const orders = Object.values(s.orders).filter((o) => o.customerId === s.demo.customerId).sort((a, b) => b.id - a.id);
	return html`<${AccountFrame} current="orders">
		<div class="sf-acct__page">
			<h1 class="sf-acct__title">Orders</h1>
			${orders.length
				? html`<ul class="sf-acct__orders">
						${orders.map((o) => {
							const t = orderTotals(s, o);
							return html`<li>
								<a class="sf-acct__order" href=${'#account.order.' + o.id}>
									<div class="sf-acct__order-head">
										<span class=${cx('sf-status', fulfillmentTone(o.fulfillment))}>${o.fulfillment === 'Fulfilled' ? 'Delivered' : 'Confirmed'}</span>
										<span class="sf-small sf-muted">${o.date.slice(0, 10)}</span>
									</div>
									<div class="sf-acct__thumbs">
										${o.lines.slice(0, 4).map((l) => html`<span class="sf-acct__thumb">${l.designCode && s.designs[l.designCode] ? html`<${DesignImage} design=${s.designs[l.designCode]} size=${76} />` : html`<${ProductImage} productId=${l.productId} variantId=${l.variantId} size=${76} />`}${l.designCode ? html`<span class="sf-acct__thumb-tag"><${Icon} name="cube" size=${11} /></span>` : null}</span>`)}
									</div>
									<div class="sf-acct__order-foot">
										<span><strong>Order ${o.name}</strong><span class="sf-small sf-muted">${o.lines.reduce((n, l) => n + l.qty, 0)} items · ${money(t.total)}</span></span>
										<${Icon} name="chevronRight" size=${18} />
									</div>
								</a>
							</li>`;
						})}
					</ul>`
				: html`<div class="sf-empty"><${Icon} name="orders" size=${36} /><h2 class="sf-h3">No orders yet</h2><p class="sf-muted">When you place an order, it shows up here.</p><a class="sf-btn sf-btn--primary" href="#store.home">Start shopping</a></div>`}
		</div>
	<//>`;
}
