// Planned `block` demo data (specs/block.md): the block theme's Single Product template and two pages.
// No imports, so seed.js and shared/block.js can both use it.

const b = (id, name, attrs, inner) => ({ id, name, ...(attrs ? { attrs } : {}), ...(inner ? { inner } : {}) });

/** WooCommerce's Single Product template (block theme), without the viewer block: a fresh install. */
export function defaultSingleProduct() {
	return {
		slug: 'single-product',
		title: 'Single Product',
		blocks: [
			b('t1', 'core/template-part', { slug: 'header' }),
			b('t2', 'woocommerce/breadcrumbs'),
			b('t3', 'woocommerce/store-notices'),
			b('t4', 'core/columns', null, [
				b('t5', 'core/column', null, [b('t6', 'woocommerce/product-image-gallery')]),
				b('t7', 'core/column', null, [
					b('t8', 'core/post-title'),
					b('t9', 'woocommerce/product-price'),
					b('t10', 'core/post-excerpt'),
					b('t11', 'woocommerce/add-to-cart-form'),
					b('t12', 'woocommerce/product-meta'),
				]),
			]),
			b('t13', 'woocommerce/product-details'),
			b('t14', 'woocommerce/related-products'),
			b('t15', 'core/template-part', { slug: 'footer' }),
		],
	};
}

export function seedTemplates() {
	return { 'single-product': defaultSingleProduct() };
}

export function seedPages() {
	const viewer = 'wc3d/product-viewer';
	return {
		701: {
			id: 701,
			title: 'Living room lookbook',
			slug: 'lookbook',
			status: 'publish',
			builder: 'blocks',
			blocks: [
				b('p1', 'core/paragraph', { content: 'Three pieces we keep coming back to. Turn them around, zoom in on the grain, then pick your fabric on the product page.' }),
				b('p2', viewer, { productId: 101, aspect: '16/9', align: 'wide', controls: { zoom: true, reset: true, autorotate: true, download: false, gallery: true } }),
				b('p3', 'core/heading', { content: 'Light and a place for your cup' }),
				b('p4', 'core/columns', null, [
					b('p5', 'core/column', null, [b('p6', viewer, { productId: 102, aspect: '1/1' }), b('p7', 'core/paragraph', { content: 'Arc Table Lamp. A warm brass arm over a linen shade.' })]),
					b('p8', 'core/column', null, [b('p9', viewer, { productId: 104, variationId: 205, aspect: '1/1', background: 'color', backgroundColor: '#f4efe6' }), b('p10', 'core/paragraph', { content: 'Oak Side Table, large. Solid oak with a lower shelf.' })]),
				]),
			],
		},
		702: {
			id: 702,
			title: 'Meet the mug',
			slug: 'meet-the-mug',
			status: 'publish',
			builder: 'elementor',
			elementor: [
				{ id: 'e1', type: 'heading', settings: { title: 'Meet the mug' } },
				{ id: 'e2', type: 'text-editor', settings: { text: 'Thrown by hand, glazed twice. Spin it around before you pick a glaze.' } },
				{ id: 'e3', type: 'wc3d-product-viewer', settings: { productId: 103, aspect: 'fixed', height: 420, background: 'color', backgroundColor: '#f3efe6', radius: 12 } },
				{ id: 'e4', type: 'button', settings: { text: 'Shop the mug', link: '#store.product.ceramic-mug' } },
			],
		},
	};
}
