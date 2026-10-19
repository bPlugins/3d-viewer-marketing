// 3D Viewer's own WooCommerce product meta (_bp3d_product_), keyed by product id. Shape follows
// ProductMetaPro.php; the free metabox edits row 0 of bp3d_models, as ProductMeta::preserveProData() does.
export const upload = (file) => `https://demo.bplugins.local/wp-content/uploads/2026/10/${file}`;

export const FREE_POSITIONS = ['none', 'top', 'bottom', 'replace', 'merge_with_first_image'];

export const POSITION_LABELS = {
	none: 'None',
	top: 'Top of the product image',
	bottom: 'Bottom of the product image',
	replace: 'Replace Product Image with 3D',
	merge_with_first_image: 'Show 3D on First Image of Woocommerce Gallery',
	tab: 'Dedicated Tab',
};

export const HOTSPOT_STYLES = {
	'style-1': 'Simple Tag (Text Only)',
	'style-2': 'Always Visible Card',
	'style-3': 'Hover Popup Card',
	'style-4': 'Minimal Icon Badge',
};

/** One "Product 3D Models" row (3dviewer_product_attributes). Variation selects add `attribute_<name>` keys. */
export function modelRowDefaults() {
	return {
		model_src: '',
		poster_src: '',
		environment_image_src: '',
		skybox_image_src: '',
		exposure: 1,
		enable_ar: false,
		model_iso_src: '',
		ar_placement: 'floor',
		ar_mode: 'webxr',
		initial_view: '[]',
	};
}

export function popupRowDefaults() {
	return { selector: '', popupCurrentViewer: 'modelViewer', model_src: '', poster_src: '', environment_image_src: '', skybox_image_src: '', target: '' };
}

/** Field defaults from ProductMetaPro::getFields(). */
export function productMetaDefaults() {
	return {
		currentViewer: 'modelViewer',
		bp3d_models: [],
		replace_model_with_thumbnail: false,
		show_model_instead_thumbnail: false,
		viewer_position: 'none',
		bp_model_template: 'none',
		show_thumbs: false,
		bp_3d_zooming: true,
		show_arrows: false,
		hotspot_style: 'style-1',
		bp_3d_height: { height: '320', unit: 'px' },
		bp_model_bg: 'transparent',
		bp3d_popup_models: [],
	};
}

/** Saved meta over the defaults (saved data wins), or null when the product never had any. */
export function metaFor(state, productId) {
	const saved = state.v3dProducts?.[productId];
	if (!saved) return null;
	return { ...productMetaDefaults(), ...saved };
}

/** Rows that carry a model, as the storefront reads them. */
export const modelRows = (meta) => (Array.isArray(meta?.bp3d_models) ? meta.bp3d_models : []).filter((r) => r && r.model_src);

function row(file, extra = {}) {
	return { ...modelRowDefaults(), model_src: upload(file), ...extra };
}

export function seedProductMeta(base) {
	const products = base?.products || {};
	const meta = {
		// Free: the Sheen Chair replaces the Lounge Chair photos; Pro adds the shop icon.
		101: { viewer_position: 'replace', bp3d_models: [row('sheen-chair.glb')], replace_model_with_thumbnail: true, bp_3d_height: { height: '460', unit: 'px' } },
		// Two models: free shows the first on top of the gallery, Pro adds the thumbnail list and arrows.
		106: {
			viewer_position: 'top',
			bp3d_models: [row('astronaut.glb', { enable_ar: true, model_iso_src: upload('astronaut.usdz'), ar_mode: 'quick-look' }), row('fox.glb')],
			show_thumbs: true,
			show_arrows: true,
			bp_model_bg: '#f3f4f6',
			replace_model_with_thumbnail: true,
			show_model_instead_thumbnail: true,
		},
		// The 3D view on the first gallery image, behind the cube icon.
		145: { viewer_position: 'merge_with_first_image', bp3d_models: [row('duck.glb')], bp_model_bg: '#eef6ff' },
		// Pro's Dedicated Tab; the free plugin has no such position, so it shows the photos only.
		141: { viewer_position: 'tab', bp3d_models: [row('sheen-chair.glb')], bp_3d_height: { height: '420', unit: 'px' }, replace_model_with_thumbnail: true },
		// No configurator on these two (142 has it switched off): 3D Viewer covers Replace and Bottom.
		142: { viewer_position: 'replace', bp3d_models: [row('shoe.glb')], bp_3d_height: { height: '440', unit: 'px' }, replace_model_with_thumbnail: true },
		146: { viewer_position: 'bottom', bp3d_models: [row('fox.glb')], bp_model_bg: '#f5f1ea', replace_model_with_thumbnail: true, show_model_instead_thumbnail: true },
	};
	return Object.fromEntries(Object.entries(meta).filter(([id]) => products[id]).map(([id, m]) => [id, { ...productMetaDefaults(), ...m }]));
}
