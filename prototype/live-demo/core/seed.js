// Demo site for the live demo: the configurator prototype's store data (products, orders, …)
// plus 3D Viewer data. Only shipped configurator modules are on; prototyped ones stay off.
// Bump LD_VERSION whenever this file (or a seed helper it calls) changes shape.
import { seed } from '../../js/data/seed.js';
import { FEATURES } from '../../js/core/features.js';
import { viewerAttrs } from '../viewer/attrs.js';
import { metaDefaults, metaToAttrs, emptyMedia } from '../viewer/meta.js';
import { settingsDefaults } from '../viewer/settings-data.js';
import { seedProductMeta } from '../woo/data.js';

export const LD_VERSION = 5;
export const LD_KEY = 'bp3d-live-demo';

const upload = (file) => `https://demo.bplugins.local/wp-content/uploads/2026/10/${file}`;

/** A post made in the block editor (_bp3d_is_gutenberg = 1): attrs = the b3dviewer/modelviewer block. */
function viewer(id, title, date, attrs, status = 'publish') {
	return { id, title, status, date, modified: date, author: 'demo', isGutenberg: true, attrs: viewerAttrs(attrs) };
}

/** A post made in the meta box screen: meta = its _bp3dimages_ row; attrs are derived for the screens that render it. */
function metaViewer(id, title, date, file, overrides, status = 'publish') {
	const meta = { ...metaDefaults(settingsDefaults()), bp_3d_src_type: 'upload', bp_3d_src: { ...emptyMedia(), url: upload(file), id: String(Number(id) + 300), title: file.replace(/\.\w+$/, '') }, bp_3d_src_link: '', ...overrides };
	return { id, title, status, date, modified: date, author: 'demo', slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), isGutenberg: false, meta, attrs: metaToAttrs(meta, id) };
}

// Each 3D product's viewer position, named in its title. Configurator products (labels: SettingsPage.php cards)
// show theirs while the extension runs; the rest use 3D Viewer's (ProductMeta.php / ProductMetaPro.php).
const PRODUCTS = {
	101: { name: 'Lounge Chair — Replace Featured', meta: { _wc3d_position: 'replace_image' } },
	102: { name: 'Arc Table Lamp — Popup Button (Configurator)' },
	103: { name: 'Ceramic Mug — First In Gallery (Configurator)' },
	104: { name: 'Oak Side Table — None, Shortcode (Configurator)', meta: { _wc3d_position: 'none', _wc3d_show_on_shop: 'yes' } },
	141: { name: 'Modular Sofa — Dedicated Tab (Pro)', meta: { _wc3d_position: 'product_tab' } },
	106: { name: 'Wool Throw — Top of the product image' },
	142: { name: 'Pendant Lamp — Replace Product Image with 3D' },
	145: { name: 'Travel Mug — Show 3D on First Image of Woocommerce Gallery' },
	146: { name: 'Nesting Side Tables — Bottom of the product image' },
};

function liveProducts(products) {
	return Object.fromEntries(
		Object.entries(products || {}).map(([id, p]) => {
			const o = PRODUCTS[id];
			return [id, o ? { ...p, name: o.name, meta: { ...p.meta, ...(o.meta || {}) } } : p];
		})
	);
}

export function liveSeed() {
	const dev = seed();
	const base = { ...dev, products: liveProducts(dev.products) };
	const flags = Object.fromEntries(FEATURES.map((f) => [f.id, f.status === 'shipped']));
	return {
		...base,
		flags,
		lv: {
			plan: 'free',
			ext: 'none',
			settings: settingsDefaults(),
		},
		// bp3d-model-viewer posts: 201 was made in the block editor, the others in the meta box screen.
		viewers: {
			201: viewer('201', 'Astronaut (AR ready)', '2026-10-02 10:14', {
				models: [{ modelUrl: upload('astronaut.glb'), poster: '', useDecoder: 'none' }],
				model: { arEnabled: true, arMode: 'quick-look', arPlacement: 'floor' },
				autoRotate: true,
			}),
			202: metaViewer('202', 'Fox with animation', '2026-10-05 16:40', 'fox.glb', { bp_3d_animation: '1', bp_3d_selected_animation: 'Survey', bp_3d_autoplay: '1', bp_model_bg: '#eef1fa' }),
			203: metaViewer('203', 'Sneaker colourways', '2026-10-09 09:05', 'shoe.glb', { bp_3d_variant: '1' }),
			204: metaViewer('204', 'Rubber duck', '2026-10-12 18:22', 'duck.glb', {}, 'draft'),
		},
		// bp3d-preset posts (Pro): saved block settings.
		vpresets: {},
		// 3D Viewer's own WooCommerce product meta (_bp3d_product_), by product id.
		v3dProducts: seedProductMeta(base),
	};
}
