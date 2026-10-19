// wp-admin menu for the live demo, rebuilt from store state on every render (see configureChrome in
// js/screens/admin/chrome.js). Submenu tuple: [id, label, route?, badge?]. No route = inert item; an https route opens in a new tab.
import { isPro, extActive } from './plan.js';
import { LINKS } from './links.js';

const LOGO = new URL('../img/brand/3d-viewer-logo.svg', import.meta.url).href;

export function buildMenu(state, wpMenu) {
	const pro = isPro(state);
	const ext = extActive(state);
	const byId = Object.fromEntries(wpMenu.filter((m) => m !== 'sep').map((m) => [m.id, m]));

	// Submenu order as WordPress builds it (admin_menu priority, then add_submenu_page position):
	// Free: All 3D Viewers, Add New, Settings, Help & Demos, Extensions, Freemius "Upgrade ➤".
	// Pro: Presets (CPT), Visual Editor (4), Analytics (5) land before Settings; Freemius adds Account (no Pricing item).
	const viewerSub = [
		['v3d-list', 'All 3D Viewers', 'v3d.list'],
		['v3d-new', 'Add New', 'v3d.edit.new'],
		...(pro
			? [
					['v3d-presets', 'Presets', 'v3d.presets'],
					['v3d-visual', 'Visual Editor', 'v3d.visual'],
					['v3d-analytics', 'Analytics', 'v3d.analytics'],
				]
			: []),
		['v3d-settings', 'Settings', 'v3d.settings'],
		['v3d-help', 'Help & Demos', 'v3d.help'],
		['v3d-extensions', 'Extensions', 'v3d.extensions', 'New'],
		...(pro ? [['v3d-account', 'Account']] : [['v3d-pricing', 'Upgrade\u00a0\u00a0\u27a4', LINKS.pricing]]),
	];

	const woo = {
		...byId.woocommerce,
		sub: byId.woocommerce.sub.filter(([id]) => id !== 'wc3d-models' || ext),
	};

	return [
		{ ...byId.dashboard, sub: [['dashboard-home', 'Home', 'wp.dashboard'], ['update-core', 'Updates']] },
		'sep',
		byId.posts,
		byId.media,
		{ id: 'v3d', label: '3D Viewer', iconImg: LOGO, sub: viewerSub },
		byId.pages,
		byId.comments,
		'sep',
		woo,
		{ ...byId.products, sub: byId.products.sub.map((it) => (it[0] === 'add-product' ? [...it.slice(0, 2), 'admin.product.new'] : it)) },
		byId.payments,
		byId.analytics,
		byId.marketing,
		'sep',
		byId.appearance,
		{ ...byId.plugins, sub: [['installed-plugins', 'Installed Plugins', 'wp.plugins'], ['plugin-install', 'Add New Plugin'], ['plugin-editor', 'Plugin File Editor']] },
		byId.users,
		byId.tools,
		byId.settings,
	];
}
