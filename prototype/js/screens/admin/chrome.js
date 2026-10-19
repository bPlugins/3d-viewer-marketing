// Generic WordPress admin frame: admin bar, left menu (folds ≤960px, hides behind a
// hamburger ≤782px), content area. No WordPress/WooCommerce logos; icons are plain SVGs.
import { html, useState, useEffect, cx } from '../../core/ui.js';
import { useStore } from '../../core/store.js';
import { Slot } from '../../shared/slots.js';

// Dashicon-like 20×20 glyphs (fill currentColor, even-odd holes).
const GLYPHS = {
	dashboard: 'M10 3.5a7.5 7.5 0 0 0-6.5 11.25h13A7.5 7.5 0 0 0 10 3.5zm0 1.75a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zM6.2 7a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm7.6 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zM5 10.6a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm10 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm-1.9-3.1.9.9-2.9 3.3a1.5 1.5 0 1 1-1-1z',
	posts: 'M12.6 2.4 17.6 7.4l-1.3 1.3-.8-.6-3.3 3.3.5 3.2-1.4 1.4-3-3-3.6 3.6H3.6v-1.1l3.6-3.6-3-3 1.4-1.4 3.2.5 3.3-3.3-.6-.8z',
	media: 'M3 6h3.2l1.4-2h4.8l1.4 2H17v10H3zm7 2.3a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zm0 1.5a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4z',
	pages: 'M7 2h6.5L17 5.5V15H7zm6 1.2V6h2.8zM4 5h1.8v11.5H14V18H4z',
	comments: 'M3 4h14v9.5H9.2L5.5 17v-3.5H3z',
	store: 'M4 7.5h12l-1 10.5H5zm3-.1V6a3 3 0 0 1 6 0v1.4h-1.5V6a1.5 1.5 0 0 0-3 0v1.4z',
	products: 'M2.5 3.5h15v4h-15zm1 5h13V17h-13zm4 1.7v1.6h5v-1.6z',
	payments: 'M2 5h16v10.5H2zm1.5 1.5v1.8h13V6.5zm.8 5.2v1.8h4.2v-1.8z',
	analytics: 'M3 16.5h14V18H3zM4 10h3v5.5H4zm4.5-6.5h3v12h-3zM13 7h3v8.5h-3z',
	marketing: 'M3 7.5h3l8-4v12.5l-8-4H3zm3.2 5 1.6 4.5h1.8L8 12.5zM15.5 8h2v3.5h-2z',
	appearance: 'M14.6 2.4l3 3-6.9 6.9-3-3zM6.8 10.2l3 3c-.5 2.6-2.6 4.3-5.8 4.3.8-1 .9-2 .9-3.1 0-2.2 1.3-3.6 1.9-4.2z',
	plugins: 'M7 2h1.5v4h3V2H13v4h1.5v4a4.5 4.5 0 0 1-3.75 4.44V18h-1.5v-3.56A4.5 4.5 0 0 1 5.5 10V6H7z',
	users: 'M10 2.8a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2zM3.3 17.2c0-3.4 3-5.7 6.7-5.7s6.7 2.3 6.7 5.7z',
	tools: 'M16.9 5.4 14.3 8l-2.2-.1-.1-2.2 2.6-2.6a4.6 4.6 0 0 0-6 5.8L3 14.5a1.5 1.5 0 0 0 2.1 2.1l5.6-5.6a4.6 4.6 0 0 0 6.2-5.6z',
	settings: 'M3 5h8v1.5H3zm11 0h3v1.5h-3zM11.2 3.2h1.6v5h-1.6zM3 9.25h3v1.5H3zm6 0h8v1.5H9zM6.2 7.5h1.6v5H6.2zM3 13.5h10V15H3zm13 0h1V15h-1zM13.2 11.7h1.6v5h-1.6z',
	collapse: 'M10 2.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zm1.6 3.8L7.4 10l4.2 3.7z',
	home: 'M10 2.8 17.5 9.2H15.4V17h-3.8v-4.6H8.4V17H4.6V9.2H2.5z',
	plus: 'M9 3.5h2V9h5.5v2H11v5.5H9V11H3.5V9H9z',
	menu: 'M2.5 4.5h15v2h-15zm0 4.5h15v2h-15zm0 4.5h15v2h-15z',
	avatar: 'M0 0h20v20H0zm10 4.2a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zM3.6 20c.6-3.6 3.2-5.9 6.4-5.9s5.8 2.3 6.4 5.9z',
};

export function Glyph({ name, size = 20, class: cls }) {
	return html`<svg class=${cx('wpa-glyph', cls)} width=${size} height=${size} viewBox="0 0 20 20" fill="currentColor" fill-rule="evenodd" aria-hidden="true" focusable="false"><path d=${GLYPHS[name]} /></svg>`;
}

// [id, label, route?]. "3D Models" sits just before WooCommerce → Settings (spec 02 §1).
const MENU = [
	{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard', sub: [['dashboard-home', 'Home'], ['update-core', 'Updates']] },
	'sep',
	{ id: 'posts', label: 'Posts', icon: 'posts', sub: [['all-posts', 'All Posts'], ['post-new', 'Add New Post'], ['category', 'Categories'], ['post-tag', 'Tags']] },
	{ id: 'media', label: 'Media', icon: 'media', sub: [['library', 'Library'], ['media-new', 'Add New Media File']] },
	{ id: 'pages', label: 'Pages', icon: 'pages', sub: [['all-pages', 'All Pages'], ['page-new', 'Add New Page']] },
	{ id: 'comments', label: 'Comments', icon: 'comments' },
	'sep',
	{
		id: 'woocommerce',
		label: 'WooCommerce',
		icon: 'store',
		sub: [
			['wc-home', 'Home'],
			['orders', 'Orders', 'admin.orders'],
			['customers', 'Customers'],
			['reports', 'Reports'],
			['wc3d-models', '3D Models', 'admin.models'],
			['wc-settings', 'Settings'],
			['wc-status', 'Status'],
			['wc-addons', 'Extensions'],
		],
	},
	{
		id: 'products',
		label: 'Products',
		icon: 'products',
		sub: [['all-products', 'All Products', 'admin.products'], ['add-product', 'Add New Product'], ['product-cat', 'Categories'], ['product-tag', 'Tags'], ['product-attributes', 'Attributes']],
	},
	{ id: 'payments', label: 'Payments', icon: 'payments' },
	{
		id: 'analytics',
		label: 'Analytics',
		icon: 'analytics',
		sub: [['analytics-overview', 'Overview'], ['analytics-products', 'Products'], ['analytics-revenue', 'Revenue'], ['analytics-orders', 'Orders'], ['analytics-variations', 'Variations'], ['analytics-categories', 'Categories'], ['analytics-coupons', 'Coupons'], ['analytics-taxes', 'Taxes'], ['analytics-downloads', 'Downloads'], ['analytics-stock', 'Stock'], ['analytics-settings', 'Settings']],
	},
	{ id: 'marketing', label: 'Marketing', icon: 'marketing', sub: [['marketing-overview', 'Overview'], ['coupons', 'Coupons']] },
	'sep',
	{ id: 'appearance', label: 'Appearance', icon: 'appearance', sub: [['themes', 'Themes'], ['customize', 'Customize'], ['widgets', 'Widgets'], ['nav-menus', 'Menus'], ['theme-editor', 'Theme File Editor']] },
	{ id: 'plugins', label: 'Plugins', icon: 'plugins', sub: [['installed-plugins', 'Installed Plugins'], ['plugin-install', 'Add New Plugin'], ['plugin-editor', 'Plugin File Editor']] },
	{ id: 'users', label: 'Users', icon: 'users', sub: [['all-users', 'All Users'], ['user-new', 'Add New User'], ['profile', 'Profile']] },
	{ id: 'tools', label: 'Tools', icon: 'tools', sub: [['tools-available', 'Available Tools'], ['import', 'Import'], ['export', 'Export'], ['site-health', 'Site Health'], ['export-personal-data', 'Export Personal Data'], ['erase-personal-data', 'Erase Personal Data']] },
	{ id: 'settings', label: 'Settings', icon: 'settings', sub: [['options-general', 'General'], ['options-writing', 'Writing'], ['options-reading', 'Reading'], ['options-discussion', 'Discussion'], ['options-media', 'Media'], ['options-permalink', 'Permalinks'], ['options-privacy', 'Privacy']] },
];

// Friendly aliases for `current`.
const ALIASES = { models: 'wc3d-models', settings3d: 'wc3d-models', product: 'all-products', order: 'orders', editor: 'wc3d-models' };

/** Every id WpAdmin({current}) accepts (top-level and submenu ids). */
export const MENU_IDS = MENU.filter((m) => m !== 'sep').flatMap((m) => [m.id, ...(m.sub || []).map((s) => s[0])]);

// Another entry (live-demo.html) may supply its own menu (built from store state), names and inert-link handler.
const chrome = { menu: null, user: 'Raju', site: 'Demo Store', inertTitle: 'Not part of the prototype', onInert: null, newItems: null };
export function configureChrome(next) {
	Object.assign(chrome, next);
}
function useMenu() {
	const state = useStore((s) => s);
	return chrome.menu ? chrome.menu(state, MENU) : MENU;
}

function resolve(current, menu = MENU) {
	const id = ALIASES[current] || current;
	for (const top of menu) {
		if (top === 'sep') continue;
		if (top.id === id) return { top: top.id, sub: top.sub?.[0]?.[0] };
		if (top.sub?.some((s) => s[0] === id)) return { top: top.id, sub: id };
	}
	return { top: null, sub: null };
}

const topRoute = (top) => top.route || top.sub?.[0]?.[2];

function useMedia(query) {
	const get = () => (typeof matchMedia === 'function' ? matchMedia(query).matches : false);
	const [on, setOn] = useState(get);
	useEffect(() => {
		if (typeof matchMedia !== 'function') return undefined;
		const mq = matchMedia(query);
		const f = () => setOn(mq.matches);
		f();
		mq.addEventListener?.('change', f);
		return () => mq.removeEventListener?.('change', f);
	}, [query]);
	return on;
}

const FOLD_KEY = 'wc3d-proto-menu-fold';
function readFold() {
	try {
		return localStorage.getItem(FOLD_KEY);
	} catch {
		return null;
	}
}
function writeFold(v) {
	try {
		localStorage.setItem(FOLD_KEY, v);
	} catch {
		// Storage blocked: the fold state just isn't remembered.
	}
}

// Inert items keep their look but go nowhere.
const inert = (e) => {
	e.preventDefault();
	chrome.onInert?.(e);
};

function MenuLink({ route, class: cls, children, onNavigate, ...rest }) {
	if (route && /^https?:/.test(route)) return html`<a href=${route} target="_blank" rel="noopener" class=${cls} ...${rest}>${children}</a>`;
	if (route)
		return html`<a href=${'#' + route} class=${cls} onClick=${onNavigate} ...${rest}>${children}</a>`;
	return html`<a href="#" class=${cx(cls, 'is-inert')} onClick=${inert} title=${chrome.inertTitle} ...${rest}>${children}</a>`;
}

function AdminMenu({ menu, active, folded, mobile, onNavigate }) {
	const [openSub, setOpenSub] = useState(null);
	const processing = useStore((s) => Object.values(s.orders || {}).filter((o) => o.status === 'processing').length);

	return html`<ul class="adminmenu" role="menu">
		${menu.map((top, i) => {
			if (top === 'sep') return html`<li key=${'sep' + i} class="wp-menu-separator" aria-hidden="true"><div class="separator"></div></li>`;
			const isCurrent = active.top === top.id;
			const hasSub = !!top.sub;
			const mobileOpen = mobile && openSub === top.id;
			const route = topRoute(top);
			const onTop = (e) => {
				// On touch layouts the first tap opens the submenu, like WP's responsive menu.
				if (mobile && hasSub && !isCurrent && openSub !== top.id) {
					e.preventDefault();
					setOpenSub(top.id);
					return;
				}
				if (!route) return inert(e);
				onNavigate?.();
			};
			return html`<li
				key=${top.id}
				class=${cx('menu-top', hasSub && 'wp-has-submenu', isCurrent ? (hasSub ? 'wp-has-current-submenu wp-menu-open' : 'current') : 'wp-not-current-submenu', mobileOpen && 'is-sub-open', 'menu-icon-' + top.id)}
				role="none"
			>
				<a
					href=${route ? '#' + route : '#'}
					class=${cx('menu-top', hasSub && 'wp-has-submenu', isCurrent && (hasSub ? 'wp-has-current-submenu' : 'current'), !route && 'is-inert')}
					aria-haspopup=${hasSub && !isCurrent ? 'true' : undefined}
					aria-current=${isCurrent && !hasSub ? 'page' : undefined}
					role="menuitem"
					onClick=${onTop}
				>
					<div class="wp-menu-image" aria-hidden="true">${top.iconImg ? html`<img class="wpa-menu-img" src=${top.iconImg} alt="" width="18" height="18" />` : html`<${Glyph} name=${top.icon} />`}</div>
					<div class="wp-menu-name">${top.label}</div>
				</a>
				${hasSub &&
				html`<ul class="wp-submenu wp-submenu-wrap" role="menu">
					<li class="wp-submenu-head" aria-hidden="true">${top.label}</li>
					${top.sub.map(
						([id, label, r, badge], j) => html`<li key=${id} class=${cx(j === 0 && 'wp-first-item', active.sub === id && isCurrent && 'current') || undefined} role="none">
							<${MenuLink}
								route=${r}
								class=${cx(j === 0 && 'wp-first-item', active.sub === id && isCurrent && 'current') || undefined}
								aria-current=${active.sub === id && isCurrent ? 'page' : undefined}
								role="menuitem"
								onNavigate=${onNavigate}
							>
								${label}
								${badge && html` <span class="wpa-sub-badge">${badge}</span>`}
								${id === 'orders' &&
								processing > 0 &&
								html` <span class=${'awaiting-mod update-plugins count-' + processing}><span class="processing-count">${processing}</span></span>`}
							<//>
						</li>`
					)}
				</ul>`}
			</li>`;
		})}
		<li class="wpa-collapse" role="none">
			<button type="button" class="collapse-button" aria-expanded=${!folded} onClick=${() => onNavigate?.('fold')} role="menuitem">
				<span class="collapse-button-icon" aria-hidden="true"><${Glyph} name="collapse" /></span>
				<span class="collapse-button-label">Collapse Menu</span>
			</button>
		</li>
	</ul>`;
}

function AdminBar({ mobile, menuOpen, onToggleMenu }) {
	return html`<div class="wpa-bar" role="navigation" aria-label="Toolbar">
		<ul class="ab-top-menu">
			${mobile &&
			html`<li class="ab-menu-toggle">
				<button type="button" class="ab-item" aria-expanded=${menuOpen} onClick=${onToggleMenu}>
					<${Glyph} name="menu" class="ab-icon" />
					<span class="screen-reader-text">Menu</span>
				</button>
			</li>`}
			<li class="ab-site-name menupop">
				<a class="ab-item" href="#store.shop" aria-haspopup="true">
					<${Glyph} name="home" class="ab-icon" />
					<span class="ab-label">${chrome.site}</span>
				</a>
				<div class="ab-sub-wrapper">
					<ul class="ab-submenu">
						<li><a class="ab-item" href="#store.shop">Visit Site</a></li>
						<li><a class="ab-item" href="#store.shop">Visit Store</a></li>
					</ul>
				</div>
			</li>
			<li class="ab-comments">
				<a class="ab-item" href="#" onClick=${inert}>
					<${Glyph} name="comments" class="ab-icon" />
					<span class="ab-label" aria-hidden="true">0</span>
					<span class="screen-reader-text">0 Comments in moderation</span>
				</a>
			</li>
			<li class="ab-new-content menupop">
				<a class="ab-item" href="#" onClick=${inert} aria-haspopup="true">
					<${Glyph} name="plus" class="ab-icon" />
					<span class="ab-label">New</span>
				</a>
				<div class="ab-sub-wrapper">
					<ul class="ab-submenu">
						${((typeof chrome.newItems === 'function' ? chrome.newItems() : chrome.newItems) || ['Post', 'Media', 'Page', 'Product', 'Order', 'User'].map((l) => [l])).map(([l, r]) => html`<li key=${l}><a class="ab-item" href=${r ? '#' + r : '#'} onClick=${r ? undefined : inert}>${l}</a></li>`)}
					</ul>
				</div>
			</li>
		</ul>
		<ul class="ab-top-secondary">
			<li class="ab-my-account menupop">
				<a class="ab-item" href="#" onClick=${inert} aria-haspopup="true">
					<span class="ab-howdy">Howdy, <span class="display-name">${chrome.user}</span></span>
					<${Glyph} name="avatar" size=${16} class="avatar avatar-16" />
				</a>
				<div class="ab-sub-wrapper">
					<ul class="ab-submenu ab-user-actions">
						<li class="ab-user-info">
							<${Glyph} name="avatar" size=${64} class="avatar avatar-64" />
							<span class="display-name">${chrome.user}</span>
						</li>
						<li><a class="ab-item" href="#" onClick=${inert}>Edit Profile</a></li>
						<li><a class="ab-item" href="#" onClick=${inert}>Log Out</a></li>
					</ul>
				</div>
			</li>
		</ul>
	</div>`;
}

/**
 * <WpAdmin current="wc3d-models" title="3D Models">…</WpAdmin>
 * current: a menu id (see MENU_IDS; aliases models/product/order). fullscreen: editor mode
 * (admin bar only; content covers the menu and fills the stage, see css/editor.css).
 */
export function WpAdmin({ current, title, children, fullscreen = false }) {
	const menu = useMenu();
	const active = resolve(current, menu);
	const mobile = useMedia('(max-width: 782px)');
	const autoFold = useMedia('(max-width: 960px)');
	const [pref, setPref] = useState(readFold);
	const [menuOpen, setMenuOpen] = useState(false);
	const folded = !mobile && (pref === 'folded' || (pref !== 'unfolded' && autoFold));

	useEffect(() => {
		if (!mobile) setMenuOpen(false);
	}, [mobile]);

	const onNavigate = (what) => {
		if (what === 'fold') {
			const next = folded ? 'unfolded' : 'folded';
			// Back to automatic when the choice matches the width default.
			const value = (next === 'folded') === autoFold ? '' : next;
			writeFold(value);
			setPref(value || null);
			return;
		}
		setMenuOpen(false);
	};

	return html`<div
		class=${cx('wp-admin-frame', fullscreen && 'is-fullscreen', folded && 'is-folded', mobile && 'is-mobile', menuOpen && 'is-menu-open')}
	>
		<${AdminBar} mobile=${mobile} menuOpen=${menuOpen} onToggleMenu=${() => setMenuOpen(!menuOpen)} />
		<div class="wpa-main">
			${!fullscreen &&
			html`<nav class="wpa-menu" aria-label="Main menu">
				<${AdminMenu} menu=${menu} active=${active} folded=${folded} mobile=${mobile} onNavigate=${onNavigate} />
			</nav>`}
			${menuOpen && html`<div class="wpa-scrim" onClick=${() => setMenuOpen(false)} aria-hidden="true"></div>`}
			<div class="wpa-content">
				<div class="wpa-body" role="main" aria-label=${title || undefined}>
					<div class="wpa-body-content">${!fullscreen && html`<${Slot} name="wp-admin.notices" />`}${children}</div>
				</div>
			</div>
		</div>
	</div>`;
}

export default WpAdmin;
