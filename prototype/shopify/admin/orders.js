// Native Admin › Orders list. "Customized" marks orders with a 3D design on any line.
import { html, useState } from '../../js/core/ui.js';
import { useStore } from '../core/store.js';
import { money, orderTotals } from '../core/commerce.js';
import { AdminFrame } from './chrome.js';
import { Page, Card, Badge, Tabs, IndexTable, Icon } from '../ui/polaris.js';

export const payTone = (f) => (f === 'Paid' ? 'neutral' : f === 'Refunded' ? 'neutral' : 'attention');
export const fulfillTone = (f) => (f === 'Fulfilled' ? 'neutral' : 'attention');
export const isCustomized = (o) => o.lines.some((l) => l.designCode);

export function fmtDate(str, withTime) {
	const [d, t] = String(str).split(' ');
	const dt = new Date(d + 'T00:00:00');
	if (Number.isNaN(dt.getTime())) return str;
	const date = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	if (!withTime || !t) return date;
	const [h, m] = t.split(':').map(Number);
	return `${date} at ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

export default function Orders() {
	const s = useStore();
	const [tab, setTab] = useState('all');
	const all = Object.values(s.orders)
		.sort((a, b) => b.id - a.id)
		.filter((o) => tab === 'all' || (tab === 'unfulfilled' ? o.fulfillment !== 'Fulfilled' : isCustomized(o)));

	const rows = all.map((o) => {
		const t = orderTotals(s, o);
		const items = o.lines.reduce((n, l) => n + l.qty, 0);
		return {
			id: o.id,
			href: `#admin.order.${o.id}`,
			cells: [
				html`<div class="as-order-cell"><a class="as-prod__title" href=${`#admin.order.${o.id}`}>${o.name}</a>${isCustomized(o) ? html`<span class="as-3d" title="Has a 3D design"><${Icon} name="cube" size=${12} />Customized</span>` : null}</div>`,
				fmtDate(o.date, true),
				s.customers[o.customerId]?.name || 'No customer',
				html`<span class="as-num">${money(t.total)}</span>`,
				html`<${Badge} tone=${payTone(o.financial)}>${o.financial}<//>`,
				html`<${Badge} tone=${fulfillTone(o.fulfillment)}>${o.fulfillment}<//>`,
				`${items} item${items === 1 ? '' : 's'}`,
			],
		};
	});

	return html`
		<${AdminFrame} current="orders">
			<${Page} title="Orders" width="full" secondaryActions=${[{ content: 'Export', disabled: true }]} primaryAction=${{ content: 'Create order', disabled: true }}>
				<${Card} flush>
					<div class="as-tablebar">
						<${Tabs} tabs=${[{ id: 'all', label: 'All' }, { id: 'unfulfilled', label: 'Unfulfilled' }, { id: 'custom', label: 'Customized' }]} selected=${tab} onSelect=${setTab} />
					</div>
					<${IndexTable} headings=${['Order', 'Date', 'Customer', 'Total', 'Payment status', 'Fulfillment status', 'Items']} rows=${rows} empty=${html`<div class="as-empty-row">No orders here.</div>`} />
				<//>
			<//>
		<//>
	`;
}
