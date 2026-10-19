// New customer accounts chrome (Shopify-hosted): shop name, Orders / Saved designs / Profile, signed-in customer.
import { html, cx } from '../../js/core/ui.js';
import { useStore } from '../core/store.js';
import { Icon } from '../ui/icons.js';
import { toast } from '../ui/polaris.js';

const NAV = [
	{ id: 'orders', label: 'Orders', href: '#account.orders' },
	{ id: 'designs', label: 'Saved designs', href: '#account.designs' },
	{ id: 'profile', label: 'Profile' },
];

export function AccountFrame({ current, children }) {
	const s = useStore();
	const c = s.customers[s.demo.customerId];
	const initials = (c?.name || '?').split(' ').map((x) => x[0]).join('').slice(0, 2);
	return html`<div class="sf sf-acct">
		<header class="sf-acct__head">
			<div class="sf-acct__row">
				<a class="sf-logo sf-logo--sm" href="#store.home">Fernway</a>
				<nav class="sf-acct__nav" aria-label="Account">
					<a href="#store.home">Shop</a>
					${NAV.map((n) =>
						n.href
							? html`<a href=${n.href} class=${cx(current === n.id && 'is-on')} aria-current=${current === n.id ? 'page' : undefined}>${n.label}</a>`
							: html`<button type="button" onClick=${() => toast('Profile is a native page and is not part of this prototype')}>${n.label}</button>`,
					)}
				</nav>
				<div class="sf-acct__user" title=${c ? `Signed in as ${c.name}` : 'Signed out'}>
					<span class="sf-acct__avatar" aria-hidden="true">${initials}</span>
					<span class="sf-acct__name">${c?.name || 'Guest'}</span>
				</div>
			</div>
		</header>
		<main class="sf-acct__main">${children}</main>
		<footer class="sf-acct__foot"><span>Fernway Home</span><a href="#store.home">Refund policy</a><a href="#store.home">Privacy policy</a><a href="#store.home">Terms of service</a></footer>
	</div>`;
}

export function fulfillmentTone(f) {
	return f === 'Fulfilled' ? 'is-done' : 'is-open';
}

export const AccountIcon = Icon;
