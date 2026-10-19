// Saved designs (share links) and the designs frozen into orders.
import { html, useState } from '../../js/core/ui.js';
import { store, useStore } from '../core/store.js';
import { AdminFrame } from './chrome.js';
import { Page, Card, Button, Badge, Banner, Modal, Tabs, IndexTable, Text, EmptyState, toast } from '../ui/polaris.js';
import { DesignImage } from '../ui/viewer.js';

const LIFETIME = { 0: 'never expire', 30: 'expire after 30 days', 90: 'expire after 90 days', 180: 'expire after 180 days', 365: 'expire after 1 year' };

export const shareLink = (s, code) => `${s.shop.domain}/apps/3d/d/${code}`;

/** Clipboard with a fallback the caller renders (some hosts block the async clipboard). */
export async function copyText(text) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

export function CopyFallback({ text, onClose, title = 'Copy link' }) {
	return html`
		<${Modal} open=${!!text} size="small" title=${title} onClose=${onClose} secondaryActions=${[{ content: 'Close', onAction: onClose }]}>
			<${Text} tone="subdued">Your browser blocked copying. Select the text and copy it.<//>
			<input class="as-copy-input" readonly value=${text || ''} ref=${(el) => el && setTimeout(() => el.select(), 0)} aria-label="Text to copy" />
		<//>
	`;
}

export default function Designs({ params }) {
	const s = useStore();
	const [tab, setTab] = useState(params[0] === 'orders' ? 'orders' : 'saved');
	const [del, setDel] = useState(null);
	const [fallback, setFallback] = useState(null);
	const saved = Object.values(s.designs).filter((d) => d.kind === 'saved').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	const fromOrders = Object.values(s.designs).filter((d) => d.kind === 'cart');
	const orderOf = (code) => Object.values(s.orders).find((o) => o.lines.some((l) => l.designCode === code));
	const customer = (id) => (id ? s.customers[id]?.name : null);

	const copy = async (code) => {
		const link = shareLink(s, code);
		if (await copyText(link)) toast('Link copied');
		else setFallback(link);
	};
	const remove = () => {
		store.patch('designs', (ds) => {
			const next = { ...ds };
			delete next[del.code];
			return next;
		});
		toast('Design deleted');
		setDel(null);
	};

	const savedRows = saved.map((d) => ({
		id: d.code,
		cells: [
			html`<div class="as-prod">
				<${DesignImage} design=${d} size=${48} />
				<div class="as-prod__text as-prod__text--col">
					<span class="as-prod__title">${d.name || 'Untitled design'}</span>
					<span class="as-mono">${d.code}</span>
				</div>
			</div>`,
			s.products[d.productId] ? html`<a class="as-link" href=${`#admin.product.${d.productId}`}>${s.products[d.productId].title}</a>` : '—',
			customer(d.customerId) || html`<span class="as-muted">Guest</span>`,
			d.createdAt.slice(0, 10),
			d.expiresAt ? d.expiresAt : html`<span class="as-muted">Never</span>`,
			String(d.views),
			html`<div class="as-row-actions">
				<${Button} size="slim" icon="link" onClick=${() => copy(d.code)}>Copy link<//>
				<${Button} size="slim" variant="tertiary" icon="external" href=${`#store.design.${d.code}`} title="Open on storefront" />
				<${Button} size="slim" variant="tertiary" icon="trash" title="Delete" onClick=${() => setDel(d)} />
			</div>`,
		],
	}));

	const orderRows = fromOrders.map((d) => {
		const o = orderOf(d.code);
		return {
			id: d.code,
			href: o ? `#admin.order.${o.id}` : undefined,
			cells: [
				html`<div class="as-prod">
					<${DesignImage} design=${d} size=${48} />
					<div class="as-prod__text as-prod__text--col"><span class="as-prod__title">${s.products[d.productId]?.title}</span><span class="as-mono">${d.code}</span></div>
				</div>`,
				o ? html`<a class="as-link" href=${`#admin.order.${o.id}`}>${o.name}</a>` : html`<span class="as-muted">In a cart</span>`,
				customer(d.customerId) || html`<span class="as-muted">Guest</span>`,
				d.createdAt.slice(0, 10),
				o ? html`<${Badge}>Kept with the order<//>` : html`<${Badge} tone="info">Not ordered yet<//>`,
			],
		};
	});

	return html`
		<${AdminFrame} current="app.designs" appTitle="Saved designs">
			<${Page} title="Saved designs" subtitle="Designs shoppers saved or shared, and the ones frozen into orders." width="full">
				${!s.app.modules['saved-designs']
					? html`<${Banner} tone="warning" action=${{ content: 'Turn on', href: '#admin.settings.features' }}>Share links are off, so shoppers can't save new designs. Existing links keep working.<//>`
					: html`<${Banner} tone="info" action=${{ content: 'Change', href: '#admin.settings.sharing' }}>New share links ${LIFETIME[s.app.settings.share_link_lifetime] || `expire after ${s.app.settings.share_link_lifetime} days`}. Expired links open the product with its default setup.<//>`}
				<${Card} flush>
					<div class="as-tablebar"><${Tabs} tabs=${[{ id: 'saved', label: 'Saved by shoppers', badge: saved.length }, { id: 'orders', label: 'From orders', badge: fromOrders.length }]} selected=${tab} onSelect=${setTab} /></div>
					${tab === 'saved'
						? html`<${IndexTable}
								headings=${['Design', 'Product', 'Customer', 'Created', 'Expires', 'Views', '']}
								rows=${savedRows}
								empty=${html`<${EmptyState} heading="No saved designs yet" illustration="share">When shoppers press Save or Share in the customizer, their designs show up here.<//>`}
							/>`
						: html`<${IndexTable}
								headings=${['Design', 'Order', 'Customer', 'Created', 'Status']}
								rows=${orderRows}
								empty=${html`<${EmptyState} heading="No customized orders yet" illustration="orders">Designs are frozen when a shopper adds a customized product to the cart.<//>`}
							/>`}
				<//>
			<//>
			<${Modal}
				open=${!!del}
				size="small"
				title="Delete design?"
				onClose=${() => setDel(null)}
				primaryAction=${{ content: 'Delete design', destructive: true, onAction: remove }}
				secondaryActions=${[{ content: 'Cancel', onAction: () => setDel(null) }]}
			>
				<${Text}>The share link <span class="as-mono">${del?.code}</span> stops working and the design disappears from the customer's Saved designs page. Orders aren't affected.<//>
			<//>
			<${CopyFallback} text=${fallback} onClose=${() => setFallback(null)} />
		<//>
	`;
}
