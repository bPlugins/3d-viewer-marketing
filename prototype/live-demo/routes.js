// Route token (area.screen) → screen module, as in js/routes.js. Every module default-exports a
// component receiving { params: string[] }. need: 'pro' = 3D Viewer Pro only; 'ext' = configurator active.
// WooCommerce and storefront screens are the configurator prototype's, reused unchanged.
// doc: the document title when it differs from `title` (string, or (params, state) => string).
import { pageBySlug } from '../js/shared/block.js';

const W = '../js/screens/';

// PostTypeModelViewer::useBlockEditorForPost(): a new viewer gets the block editor only with Settings → Enable
// Gutenberg on; a saved one keeps the editor it was made with (viewer/meta.js isBlockPost).
const blockEditor = ([id], s) => {
	if (id === 'new') return !!s.lv?.settings?.gutenberg_enabled;
	const v = s.viewers?.[id];
	return !!v && v.status !== 'trash' && (v.isGutenberg === undefined ? !v.meta : !!v.isGutenberg);
};

export const ROUTES = {
	// WordPress
	'wp.dashboard': { title: 'Dashboard', load: () => import('./wp/dashboard.js') },
	'wp.plugins': { title: 'Plugins', load: () => import('./wp/plugins.js') },

	// 3D Viewer (bp3d-model-viewer)
	'v3d.list': { title: '3D Viewers', doc: '3D Viewer', load: () => import('./viewer/list.js') },
	'v3d.edit': { title: 'Edit 3D Viewer', doc: (p) => (p[0] === 'new' ? 'Add New' : 'Edit 3D Viewer'), load: () => import('./viewer/edit.js'), fullscreen: blockEditor },
	'v3d.settings': { title: '3D Viewer Settings', doc: 'Settings', load: () => import('./viewer/settings.js') },
	'v3d.help': { title: 'Help & Demos', doc: 'Help & Demos - 3D Viewer', load: () => import('./viewer/help.js') },
	'v3d.extensions': { title: 'Extensions', doc: '3D Viewer Extensions', load: () => import('./viewer/extensions.js') },
	'v3d.presets': { title: 'Presets', load: () => import('./viewer/presets.js'), need: 'pro' },
	'v3d.preset': { title: 'Edit Preset', doc: (p) => (p[0] === 'new' ? 'Add New' : 'Edit Preset'), load: () => import('./viewer/preset-edit.js'), need: 'pro', fullscreen: true },
	'v3d.visual': { title: 'Visual Editor', load: () => import('./viewer/visual-editor.js'), need: 'pro' },
	'v3d.analytics': { title: '3D Analytics', load: () => import('./viewer/analytics.js'), need: 'pro' },

	// WooCommerce
	'admin.products': { title: 'Products', load: () => import(W + 'admin/products.js') },
	'admin.product': { title: 'Edit product', doc: (p) => (p[0] === 'new' ? 'Add new product' : 'Edit product'), load: () => import(W + 'admin/product-edit.js') },
	'admin.orders': { title: 'Orders', load: () => import(W + 'admin/orders.js') },
	'admin.order': { title: 'Edit order', load: () => import(W + 'admin/order-edit.js') },
	'admin.models': { title: '3D Models', load: () => import(W + 'admin/models-list.js'), need: 'ext' },
	'admin.settings': { doc: '3D Models', title: '3D Models Settings', load: () => import(W + 'admin/settings.js'), need: 'ext' },
	'admin.coverage': { doc: '3D Models', title: 'Coverage', load: () => import(W + 'admin/coverage.js'), need: 'ext' },
	'admin.designs': { doc: '3D Models', title: 'Saved designs', load: () => import(W + 'admin/saved-designs.js'), need: 'ext' },
	'admin.editor': { doc: '3D Models', title: '3D Editor', load: () => import(W + 'admin/editor/index.js'), fullscreen: true, need: 'ext' },
	'admin.site-editor': { title: 'Site Editor', load: () => import(W + 'admin/site-editor.js'), fullscreen: true, need: 'ext' },
	'admin.elementor': { title: 'Elementor', load: () => import(W + 'admin/elementor.js'), fullscreen: true, need: 'ext' },

	// Storefront
	'store.viewer': { title: '3D Showcase', load: () => import('./store/viewer-page.js') },
	'store.shop': { title: 'Shop', load: () => import(W + 'store/shop.js') },
	'store.product': { title: 'Product', doc: (p, s) => Object.values(s.products || {}).find((x) => x.slug === p[0])?.name || 'Page not found', load: () => import(W + 'store/product.js') },
	'store.cart': { title: 'Cart', load: () => import(W + 'store/cart.js') },
	'store.checkout': { title: 'Checkout', load: () => import(W + 'store/checkout.js') },
	'store.order': { title: 'Order received', load: () => import(W + 'store/order-received.js') },
	'store.email': { title: 'Email', load: () => import(W + 'store/email.js') },
	'store.design': { title: 'Design link', load: () => import(W + 'store/design-link.js'), need: 'ext' },
	'store.account': { title: 'My account', load: () => import(W + 'store/account.js') },
	'store.page': { title: 'Page', doc: (p, s) => pageBySlug(s, p[0] || '')?.title || 'Page not found', load: () => import(W + 'store/page.js'), need: 'ext' },
};
