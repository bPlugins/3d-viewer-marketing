// Admin frame: generic merchant-admin top bar + left nav (no vendor logo), with our embedded app
// under "Apps". App pages get the App Bridge title bar and the s-app-nav sub-items.
import { html, useState, cx } from '../../js/core/ui.js';
import { useStore } from '../core/store.js';
import { Icon } from '../ui/icons.js';

const MAIN_NAV = [
	{ id: 'home', label: 'Home', icon: 'home', href: '#admin.home' },
	{ id: 'orders', label: 'Orders', icon: 'orders', href: '#admin.orders' },
	{ id: 'products', label: 'Products', icon: 'products', href: '#admin.catalog' },
	{ id: 'customers', label: 'Customers', icon: 'customers' },
	{ id: 'content', label: 'Content', icon: 'content' },
	{ id: 'analytics', label: 'Analytics', icon: 'analytics' },
	{ id: 'marketing', label: 'Marketing', icon: 'marketing' },
	{ id: 'discounts', label: 'Discounts', icon: 'discounts' },
];

// s-app-nav items (shopify.app.toml / <s-app-nav>).
export const APP_NAV = [
	{ id: 'app.home', label: 'Dashboard', href: '#admin.home' },
	{ id: 'app.products', label: '3D products', href: '#admin.products' },
	{ id: 'app.presets', label: 'Presets', href: '#admin.presets' },
	{ id: 'app.designs', label: 'Saved designs', href: '#admin.designs' },
	{ id: 'app.settings', label: 'Settings', href: '#admin.settings' },
	{ id: 'app.plans', label: 'Plans', href: '#admin.plans' },
];

/**
 * <AdminFrame current="app.home|app.products|…|orders|products" appTitle="Dashboard" appActions=${vnode}>…</AdminFrame>
 * current starting with "app." renders the embedded-app iframe area with title bar.
 */
export function AdminFrame({ current = 'app.home', appTitle, appActions, children }) {
	const shop = useStore((s) => s.shop);
	const [navOpen, setNavOpen] = useState(false);
	const inApp = current.startsWith('app.');
	return html`
		<div class=${cx('a-frame', navOpen && 'is-nav-open')}>
			<header class="a-top">
				<button class="a-top__menu" onClick=${() => setNavOpen(!navOpen)} aria-label="Menu"><${Icon} name="menu" size=${20} /></button>
				<div class="a-top__brand"><span class="a-top__mark"><${Icon} name="store" size=${16} /></span><span class="a-top__admin">Admin</span></div>
				<label class="a-top__search"><${Icon} name="search" size=${16} /><input placeholder="Search" aria-label="Search" /></label>
				<div class="a-top__store"><span class="a-top__avatar">FH</span><span class="a-top__store-name">${shop.name}</span>${shop.plan === 'plus' ? html`<span class="a-top__plan">Plus</span>` : null}</div>
			</header>
			<nav class="a-nav" aria-label="Admin">
				<ul>
					${MAIN_NAV.map(
						(n) => html`<li>
							<a class=${cx('a-nav__item', current === n.id && 'is-active', !n.href && 'is-inert')} href=${n.href || undefined} aria-disabled=${n.href ? undefined : 'true'}>
								<${Icon} name=${n.icon} size=${18} /><span>${n.label}</span>
							</a>
						</li>`,
					)}
				</ul>
				<p class="a-nav__heading">Sales channels</p>
				<ul>
					<li><a class="a-nav__item" href="#theme.editor"><${Icon} name="store" size=${18} /><span>Online Store</span></a></li>
				</ul>
				<p class="a-nav__heading">Apps</p>
				<ul>
					<li>
						<a class=${cx('a-nav__item', inApp && 'is-active')} href="#admin.home"><span class="p-appicon p-appicon--xs"><${Icon} name="cube" size=${12} /></span><span>3D Configurator</span></a>
						${inApp
							? html`<ul class="a-nav__sub">
									${APP_NAV.map((n) => html`<li><a class=${cx('a-nav__subitem', current === n.id && 'is-active')} href=${n.href}>${n.label}</a></li>`)}
								</ul>`
							: null}
					</li>
				</ul>
				<div class="a-nav__foot"><span class="a-nav__item is-inert"><${Icon} name="settings" size=${18} /><span>Settings</span></span></div>
			</nav>
			<main class="a-main">
				${inApp
					? html`<div class="a-appbar">
							<span class="p-appicon p-appicon--sm"><${Icon} name="cube" size=${14} /></span>
							<span class="a-appbar__name">3D Configurator</span>
							${appTitle ? html`<${Icon} name="chevronRight" size=${14} /><span class="a-appbar__title">${appTitle}</span>` : null}
							<div class="a-appbar__actions">${appActions || null}</div>
						</div>
						<div class="a-iframe">${children}</div>`
					: children}
			</main>
		</div>
	`;
}
