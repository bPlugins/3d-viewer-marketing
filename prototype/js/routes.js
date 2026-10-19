// Route token (area.screen) → screen module. Every module default-exports a
// component receiving { params: string[] } (the remaining hash segments).
export const ROUTES = {
	'admin.models': { title: '3D Models', load: () => import('./screens/admin/models-list.js') },
	'admin.settings': { title: 'Settings', load: () => import('./screens/admin/settings.js') },
	// Planned `coverage`: shows the Models tab while the flag is off.
	'admin.coverage': { title: 'Coverage', load: () => import('./screens/admin/coverage.js') },
	'admin.editor': { title: '3D Editor', load: () => import('./screens/admin/editor/index.js'), fullscreen: true },
	'admin.products': { title: 'Products', load: () => import('./screens/admin/products.js') },
	'admin.product': { title: 'Edit product', load: () => import('./screens/admin/product-edit.js') },
	'admin.orders': { title: 'Orders', load: () => import('./screens/admin/orders.js') },
	'admin.order': { title: 'Edit order', load: () => import('./screens/admin/order-edit.js') },
	'store.shop': { title: 'Shop', load: () => import('./screens/store/shop.js') },
	'store.product': { title: 'Product page', load: () => import('./screens/store/product.js') },
	'store.cart': { title: 'Cart', load: () => import('./screens/store/cart.js') },
	'store.checkout': { title: 'Checkout', load: () => import('./screens/store/checkout.js') },
	'store.order': { title: 'Order received', load: () => import('./screens/store/order-received.js') },
	'store.email': { title: 'Email', load: () => import('./screens/store/email.js') },
	// Planned `saved-designs`: short link, My Account (Saved designs endpoint), admin list.
	'store.design': { title: 'Design link', load: () => import('./screens/store/design-link.js') },
	'store.account': { title: 'My account', load: () => import('./screens/store/account.js') },
	'admin.designs': { title: 'Saved designs', load: () => import('./screens/admin/saved-designs.js') },
	// Planned `block`: Site Editor + Elementor mocks, block/widget pages on the storefront.
	'admin.site-editor': { title: 'Site Editor', load: () => import('./screens/admin/site-editor.js'), fullscreen: true },
	'admin.elementor': { title: 'Elementor', load: () => import('./screens/admin/elementor.js'), fullscreen: true },
	'store.page': { title: 'Page', load: () => import('./screens/store/page.js') },
	'proto.roadmap': { title: 'Roadmap', load: () => import('./screens/roadmap.js') },
	// Planned `gallery-lane`: current and proposed strip side by side at several canvas widths.
	'proto.gallery-lane': { title: 'Gallery lane', load: () => import('./screens/gallery-lane.js') },
};

// Menu shown in the prototype bar, per area.
export const MENU = {
	admin: [
		['admin.models', '3D Models'],
		['admin.settings', 'Settings'],
		['admin.editor.101', '3D Editor'],
		['admin.products', 'Products'],
		['admin.product.101', 'Edit product'],
		['admin.orders', 'Orders'],
		['admin.site-editor', 'Site Editor', 'block'],
		['admin.elementor.702', 'Elementor', 'block'],
	],
	store: [
		['store.shop', 'Shop'],
		['store.product.lounge-chair', 'Product page'],
		['store.cart', 'Cart'],
		['store.checkout', 'Checkout'],
		['store.page.lookbook', 'Lookbook', 'block'],
		['proto.gallery-lane', 'Gallery lane', 'gallery-lane'],
	],
};
