// token → screen module (lazy, so one unfinished screen never breaks the others) + the Shopify surface it stands for.
// Matching: the longest prefix of "area.screen" wins; remaining segments are params.
export const ROUTES = {
	guide: { load: () => import('./guide.js'), surface: 'Prototype map', area: 'guide' },

	// Embedded app (App Home, iframe) — Phase 1–2, 6
	'admin.home': { load: () => import('./admin/home.js'), surface: 'App Home · /app (Polaris web components)', area: 'admin', phase: 'Phase 1' },
	'admin.products': { load: () => import('./admin/products.js'), surface: 'App Home · /app/products (coverage)', area: 'admin', phase: 'Phase 2 · 6' },
	'admin.presets': { load: () => import('./admin/presets.js'), surface: 'App Home · /app/presets', area: 'admin', phase: 'Phase 2' },
	'admin.designs': { load: () => import('./admin/designs.js'), surface: 'App Home · /app/designs', area: 'admin', phase: 'Phase 6' },
	'admin.settings': { load: () => import('./admin/settings.js'), surface: 'App Home · /app/settings (contextual save bar)', area: 'admin', phase: 'Phase 2' },
	'admin.plans': { load: () => import('./admin/plans.js'), surface: 'Managed Pricing plan page', area: 'admin', phase: 'Phase 1' },
	'admin.editor': { load: () => import('./admin/editor/index.js'), surface: '<s-app-window> → /app/products/:id/editor (R3F editor)', area: 'admin', phase: 'Phase 2' },

	// Native admin pages with our UI extensions
	'admin.catalog': { load: () => import('./admin/catalog.js'), surface: 'Admin · Products list (native)', area: 'admin' },
	'admin.product': { load: () => import('./admin/product.js'), surface: 'Admin product page + admin.product-details.block.render / action', area: 'admin', phase: 'Phase 2' },
	'admin.orders': { load: () => import('./admin/orders.js'), surface: 'Admin · Orders list (native)', area: 'admin' },
	'admin.order': { load: () => import('./admin/order.js'), surface: 'Admin order page + admin.order-details.block.render', area: 'admin', phase: 'Phase 4' },
	'admin.preview': { load: () => import('./admin/preview.js'), surface: '<s-app-window> → /app/orders/:id/preview (3D)', area: 'admin', phase: 'Phase 4' },

	// Theme editor (theme app extension)
	'theme.editor': { load: () => import('./theme/editor.js'), surface: 'Theme editor · app blocks + app embed (theme app extension)', area: 'theme', phase: 'Phase 3' },

	// Storefront (theme app extension + app proxy + Cart Transform)
	'store.home': { load: () => import('./store/home.js'), surface: 'Storefront · collection grid (app embed: 3D badge)', area: 'store', phase: 'Phase 3' },
	'store.product': { load: () => import('./store/product.js'), surface: 'Storefront · product page (app block "3D Configurator")', area: 'store', phase: 'Phase 3 · 4 · 5' },
	'store.cart': { load: () => import('./store/cart.js'), surface: 'Storefront · cart (Cart Transform Function)', area: 'store', phase: 'Phase 5' },
	'store.checkout': { load: () => import('./store/checkout.js'), surface: 'Checkout (Shopify-hosted; transform applied)', area: 'store', phase: 'Phase 5' },
	'store.thanks': { load: () => import('./store/thanks.js'), surface: 'Thank-you page · checkout UI extension', area: 'store', phase: 'Phase 4' },
	'store.design': { load: () => import('./store/design.js'), surface: 'App proxy · /apps/3d/d/:code (share link)', area: 'store', phase: 'Phase 6' },

	// Customer accounts (customer account UI extensions)
	'account.orders': { load: () => import('./account/orders.js'), surface: 'Customer account · Orders (native)', area: 'account' },
	'account.order': { load: () => import('./account/order.js'), surface: 'Customer account · order status block extension', area: 'account', phase: 'Phase 4' },
	'account.designs': { load: () => import('./account/designs.js'), surface: 'Customer account · full-page extension "Saved designs"', area: 'account', phase: 'Phase 6' },
};

export function matchRoute(token) {
	const parts = token.split('.');
	for (let n = Math.min(parts.length, 2); n > 0; n--) {
		const key = parts.slice(0, n).join('.');
		if (ROUTES[key]) return { key, route: ROUTES[key], params: parts.slice(n) };
	}
	return null;
}

// Prototype bar areas → landing token.
export const AREAS = [
	{ id: 'guide', label: 'Map', token: 'guide' },
	{ id: 'admin', label: 'Admin', token: 'admin.home' },
	{ id: 'theme', label: 'Theme editor', token: 'theme.editor' },
	{ id: 'store', label: 'Storefront', token: 'store.home' },
	{ id: 'account', label: 'Customer account', token: 'account.orders' },
];
