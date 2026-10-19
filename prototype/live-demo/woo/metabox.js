// 3D Viewer's product meta box on the WooCommerce product screen, in the plugins' default "New" interface
// (bfields MetaboxShell, AdminUi::SURFACES '_bp3d_product_'): free = ProductMeta.php "3D Product Settings",
// Pro = ProductMetaPro.php "3D Viewer Settings". Edits stay in a draft until the product's Update/Publish
// (or the box's own Update) saves them.
import { html, useState } from '../../js/core/ui.js';
import { store, useStore } from '../../js/core/store.js';
import { Dashicon } from '../../js/screens/admin/products.js';
import { ProPill, ProLock } from '../ui/pro.js';
import { isPro } from '../core/plan.js';
import { toast } from '../core/bus.js';
import { FieldRow } from './bfields.js';
import { productMetaDefaults, modelRowDefaults, popupRowDefaults, POSITION_LABELS, FREE_POSITIONS, HOTSPOT_STYLES } from './data.js';
import { wooEnabled } from './viewer.js';

const UNIQUE = '_bp3d_product_';
const drafts = new Map();
const STATUS_LABELS = { draft: 'Draft', pending: 'Pending', private: 'Private', trash: 'Trash', future: 'Scheduled' };
const clone = (v) => JSON.parse(JSON.stringify(v));

/** Writes the box's draft for `key` ('new' or the product id) to v3dProducts[id]. Called on product save. */
export function saveMetaDraft(id, key) {
	const d = drafts.get(key);
	if (!d || !id) return;
	store.patch(['v3dProducts', id], clone(d));
	drafts.delete(key);
}

/** bp3d_variant_selects(): variation attributes with more than one value. */
function variantSelects(state, product) {
	if (!product || product.type !== 'variable') return [];
	const vars = (product.variations || []).map((id) => state.variations?.[id]).filter(Boolean);
	return (product.attributes || [])
		.map((a) => {
			const all = vars.map((v) => v.attributes?.[a.name] ?? '');
			return { key: 'attribute_' + a.name.toLowerCase().replace(/\s+/g, '-'), label: a.name, count: all.length, values: [...new Set(all.map((x) => String(x).trim()).filter(Boolean))] };
		})
		.filter((s) => s.count > 1);
}

// Utils::getSupportedMimeTypes() (free) and the "Allowed Mime Types" setting.
const FREE_FORMATS = ['glb', 'gltf', 'obj', '3ds', 'step', 'stl', 'fbx', '3dml', 'dae', 'wrl', '3mf', 'mtl', 'hdr', 'usdz'];
export const allowedFormats = (state) => {
	const v = state.lv?.settings?.allowed_mime_types;
	return Array.isArray(v) ? v : FREE_FORMATS;
};

/** ProductMeta::getFields() notice: formats off for upload, the saved model's format off, or which are on. */
function formatNotice(state, modelSrc) {
	const allowed = allowedFormats(state);
	const link = html`<a href="#v3d.settings" target="_blank" rel="noopener">3D Viewer Settings</a>`;
	const ext = (/\.([a-z0-9]+)(?:[?#].*)?$/i.exec(modelSrc || '') || [])[1]?.toLowerCase() || '';
	if (!allowed.length) return { type: 'notice', style: 'danger', html: html`<strong>Notice:</strong> All 3D file formats are currently disabled for upload. Please enable the formats you need in the ${link}.` };
	if (ext && FREE_FORMATS.includes(ext) && !allowed.includes(ext))
		return { type: 'notice', style: 'danger', html: html`<strong>Warning:</strong> The uploaded 3D model format (.${ext.toUpperCase()}) is currently disabled. Please enable it in the ${link} to ensure it loads properly.` };
	const enabled = FREE_FORMATS.filter((f) => allowed.includes(f));
	return {
		type: 'notice',
		style: 'info',
		html:
			enabled.length === FREE_FORMATS.length
				? html`Uploading 3D files (GLB, GLTF, OBJ, STL, FBX, HDR, etc.) is allowed by default. You can turn any format off in the ${link}.`
				: html`Enabled for upload: ${enabled.join(', ').toUpperCase()}. You can change this in the ${link}.`,
	};
}

const supportLink = (bold) => html`<a href="https://bplugins.com/support" target="_blank" rel="noopener">${bold ? html`<b>Support Center</b>` : 'Support Center'}</a>`;
const yesNo = { textOn: 'Yes', textOff: 'No' };
const upload = (id, title, subtitle, placeholder, extra = {}) => ({ id, type: 'upload', kind: 'image', title, subtitle, placeholder, ...extra });

// HotspotFields::fields(['descriptions' => false]) with Registrar's `modern_dependency` swapped in.
const HOTSPOT_TYPES = { info: 'Info', link: 'Link', image: 'Image', waypoint: 'Waypoint', animation: 'Animation', video: 'Video', product: 'Product' };
const HOTSPOT_DISPLAY = { '': 'Use viewer setting', always: 'Always visible', hover: 'Tooltip on hover', popup: 'Popup', none: 'Pin only (no content)' };
const PIN_ICONS = { '': 'Use viewer setting', text: 'Text (name)', info: 'Info', plus: 'Plus', dot: 'Dot', number: 'Number', link: 'Link', play: 'Play', cart: 'Cart', question: 'Question', custom: 'Custom image' };
const hotspotDefaults = () => ({ title: '', type: 'info', display: '', pinIcon: '', desc: '', position: '', normal: '', orbit: '', target: '', fov: '' });
const HOTSPOT_FIELDS = [
	{ id: 'title', type: 'text', title: 'Title' },
	{ id: 'type', type: 'select', title: 'Type', options: HOTSPOT_TYPES, default: 'info' },
	{ id: 'display', type: 'select', title: 'Display', options: HOTSPOT_DISPLAY, default: '' },
	{ id: 'pinIcon', type: 'select', title: 'Pin Icon', options: PIN_ICONS, default: '' },
	{ id: 'customIcon', type: 'upload', kind: 'image', title: 'Pin Image', dependency: ['pinIcon', '==', 'custom'] },
	{ id: 'desc', type: 'textarea', title: 'Description' },
	{ id: 'linkUrl', type: 'text', title: 'Link URL', placeholder: 'https://example.com', dependency: ['type', '==', 'link'], class: 'bp3d-hotspot-link-url-field' },
	{ id: 'linkText', type: 'text', title: 'Link Button Text', placeholder: 'Visit Link', dependency: [['type', '==', 'link'], ['hotspot_style', '!=', 'style-1', 'all']], class: 'bp3d-hotspot-link-text-field' },
	{ id: 'openInNewTab', type: 'switcher', title: 'Open in new tab', ...yesNo, dependency: ['type', '==', 'link'], class: 'bp3d-hotspot-link-url-field' },
	{ id: 'imageUrl', type: 'upload', kind: 'image', title: 'Image', desc: 'Shown above the description in the card styles. Paste a medium-size image URL for a small card.', dependency: ['type', '==', 'image'] },
	{ id: 'imageAlt', type: 'text', title: 'Image Alt Text', desc: 'Falls back to the hotspot title.', dependency: ['type', '==', 'image'] },
	{ id: 'animationName', type: 'text', title: 'Animation Name', desc: 'The clip to play, exactly as it is named in the model. Copy it from the Visual Editor.', dependency: ['type', '==', 'animation'] },
	{ id: 'animationRepeat', type: 'select', title: 'Repeat', options: { once: 'Once', loop: 'Loop until clicked again', pingpong: 'Back and forth until clicked again' }, default: 'once', dependency: ['type', '==', 'animation'] },
	{ id: 'videoUrl', type: 'text', title: 'Video URL', placeholder: 'https://www.youtube.com/watch?v=...', desc: 'YouTube, Vimeo, or a direct MP4, WebM or OGG file. The player loads only when the visitor opens the card.', dependency: ['type', '==', 'video'] },
	{ id: 'productId', type: 'source', title: 'Product', placeholder: 'Search products', desc: 'The card is built from this product when the visitor opens it.', dependency: ['type', '==', 'product'] },
	{ id: 'position', type: 'text', title: 'Position' },
	{ id: 'normal', type: 'text', title: 'Normal' },
	{ id: 'orbit', type: 'text', title: 'Orbit' },
	{ id: 'target', type: 'text', title: 'Target' },
	{ id: 'fov', type: 'text', title: 'FOV (Field of View)' },
];

/** The `3dviewer_product_attributes` filter: one "Product 3D Models" row. */
function modelFields(selects) {
	return [
		{ id: 'model_src', type: 'upload', kind: 'model', title: '3D Source', subtitle: 'Upload Model Or Input Valid Model url', desc: 'Upload / Paste Model url. Supported file type: glb, glTF', placeholder: 'You Can Paste here Model url' },
		...selects.map((s) => ({
			id: s.key,
			type: 'select',
			title: s.label + ' variation',
			options: [['all', 'All'], ...s.values.map((v) => [v.replace(/ /g, '-'), v])],
			default: 'all',
			desc: `Shoppers see this model when they pick this ${s.label}. All shows it for every option, and before they pick one. Keep Show Thumbnail List and Show Arrows off, so shoppers stay on the matching model.`,
		})),
		...(selects.length ? [{ id: 'product_variant', type: 'text', class: 'hidden' }] : []),
		{ id: 'model-viewer-note', type: 'content', title: 'Note', html: "Below features are only available on 'Lite Viewer'" },
		upload('poster_src', '3D Poster', 'Upload Poster Or Input Valid poster/image URL', 'You Can Paste here Poster/image URL'),
		upload('environment_image_src', 'Environment Image', 'Upload Image Or Input Valid Image URL', 'You Can Paste here Image/image URL'),
		upload('skybox_image_src', 'Skybox Image', 'Upload Image Or Input Valid image URL', 'You Can Paste here image URL'),
		{ id: 'exposure', type: 'slider', store: 'number', min: 0.1, max: 10, step: 0.1, title: 'Exposure', subtitle: 'Brightness for Model', desc: 'Use exposure to increase/decrease brightness of Model. "1" for Default.', default: 1 },
		{ id: 'enable_ar', type: 'switcher', title: 'Enable AR', ...yesNo, subtitle: 'Enable AR (Augmented Reality)' },
		{ id: 'model_iso_src', type: 'upload', kind: 'model', title: '3D Source for iOS (Optional)', subtitle: 'Upload Model Or Input Valid Model url', desc: 'Upload / Paste Model url', placeholder: 'You Can Paste here Model url', dependency: ['enable_ar', '==', '1'] },
		{ id: 'ar_placement', type: 'button_set', title: 'AR Placement', options: { floor: 'Floor', wall: 'Wall' }, default: 'floor', dependency: ['enable_ar', '==', '1'] },
		{ id: 'ar_mode', type: 'button_set', title: 'AR Mode', options: { webxr: 'WebXR', 'scene-viewer': 'Scene Viewer', 'quick-look': 'Quick Look' }, default: 'webxr', dependency: ['enable_ar', '==', '1'] },
		{
			id: 'real_size',
			type: 'fieldset',
			title: 'Real Size (Optional)',
			desc: "Only if this 3D file was exported at the wrong scale. Fill one axis and the others scale to match. Leave empty to use the product's own dimensions when the global setting allows it. Changes the labels only - it does not resize the model or its size in AR.",
			fields: [
				{ id: 'width', type: 'number', title: 'Width' },
				{ id: 'height', type: 'number', title: 'Height' },
				{ id: 'depth', type: 'number', title: 'Depth' },
			],
		},
		{ id: 'hotspots', type: 'group', title: 'Hotspots', desc: 'Add hotspots to your 3D model.', fields: HOTSPOT_FIELDS, make: hotspotDefaults },
		{ id: 'initial_view', type: 'text', title: 'Initial View', desc: 'Paste the Initial View JSON data from the Visual editor.', placeholder: 'Paste here Initial View JSON data', default: '[]' },
		{
			id: 'invalid',
			type: 'content',
			title: 'Use the Visual Editor to add hotspots',
			html: html`<a class="button button-primary bp3d-primary-button" target="_blank" rel="noopener" href="#v3d.visual">Open Visual Editor</a>`,
		},
	];
}

const POPUP_FIELDS = [
	{ id: 'selector', type: 'text', title: 'Selector', placeholder: 'Class, ID, Image SRC', desc: 'Required: the element on this product page that opens the popup when clicked. Use a class (view-in-3d or .view-in-3d), an #id, or the URL of an image on the page, then add that element yourself, for example a link with class="view-in-3d" in the product description. Without a Selector the popup never opens.' },
	{ id: 'popupCurrentViewer', type: 'button_set', title: 'Viewer', subtitle: 'Choose Viewer', desc: 'Choose Lite for GLB/GLTF or Advanced for other formats.', options: { modelViewer: 'Lite', O3DViewer: 'Advanced' }, default: 'modelViewer' },
	{ id: 'model_src', type: 'upload', kind: 'model', title: '3D Model Source', subtitle: 'Upload Model Or Input Valid Model url', desc: 'Upload / Paste Model url. Supported file type: glb, glTF', placeholder: 'You Can Paste here Model url' },
	upload('poster_src', '3D Poster', 'Upload Poster Or Input Valid poster/image URL', 'You Can Paste here Poster/image URL'),
	upload('environment_image_src', 'Environment Image', 'Upload Image Or Input Valid Image URL (Lite Viewer)', 'You Can Paste here Image/image URL'),
	upload('skybox_image_src', 'Skybox Image', 'Upload Image Or Input Valid image URL', 'You Can Paste here image URL'),
	{ id: 'target', type: 'text', title: 'Target', desc: "Leave it empty. It's used in special cases.", placeholder: 'Target' },
];

// AdminUi::viewerModes(): the Lite / Advanced mode grid.
const VIEWER_MODES = {
	modelViewer: { icon: 'zap', tag: 'Recommended', perks: ['GLB and glTF', 'Augmented reality'] },
	O3DViewer: { icon: 'sliders', perks: ['OBJ, STL, FBX, STEP and more'] },
};
const preset = { dependency: ['bp_model_template', '==', 'none'] };

/** ProductMetaPro::getFields(). `pro` marks what the free plugin shows locked. */
function proFields({ id, presetOptions, selects, onSave, pro }) {
	const viewer = { id: 'currentViewer', type: 'button_set', presentation: 'cards', optionMeta: VIEWER_MODES, class: 'bp3d-row-inline', title: 'Viewer', subtitle: 'Choose Viewer', desc: 'The Lite Viewer prioritizes .glb and .glTF files with robust features, while the Advanced Viewer supports additional file types with streamlined functionality.', options: { modelViewer: 'Lite', O3DViewer: 'Advanced' }, default: 'modelViewer', pro: true };
	const shop = [
		{ id: 'replace_model_with_thumbnail', type: 'switcher', title: 'Display 3D icon to see models in shop pages and product listings', ...yesNo, desc: 'Enable this option to display 3D icon to see models in shop pages and product listings', default: false, pro: true },
		{ id: 'show_model_instead_thumbnail', type: 'switcher', title: 'Display 3D models in shop pages and product listings', ...yesNo, desc: 'Shop cards open on the 3D model instead of the product image. Works together with Display 3D icon above.', default: false, dependency: pro ? ['replace_model_with_thumbnail', '==', '1'] : undefined, pro: true },
	];
	const template = { id: 'bp_model_template', type: 'select', title: 'Template/Preset', desc: "A preset replaces this product's Thumbnail List, Arrows, Zoom, Height, Background and Hotspot Style, and the store-wide viewer options such as Auto Rotate. Those fields are hidden while a preset is selected; choose None to use them.", options: presetOptions, pro: true };
	const thumbs = { id: 'show_thumbs', type: 'switcher', desc: "Requires multiple 3D models. Each model's poster image is used as its thumbnail; models without one show a numbered chip.", title: 'Show Thumbnail List', ...yesNo, default: false, dependency: pro ? ['bp_model_template|viewer_position', '==|!=', 'none|merge_with_first_image'] : undefined, pro: true };
	const popups = { id: 'bp3d_popup_models', type: 'group', title: 'Popup 3D Models', class: 'bp3d-row-inline', buttonTitle: 'Add New Model', fields: POPUP_FIELDS, make: popupRowDefaults, pro: true };
	const shortcode = { id: 'shortcode', type: 'content', title: 'Shortcode', html: html`[3d_viewer_product id=${id}] <br /> <small>This shortcode can be paste in product description area</small>`, pro: true };
	if (!pro)
		return [
			{ ...viewer, value: 'modelViewer' },
			{ id: 'bp3d_models', type: 'group', title: 'Product 3D Models', desc: 'Multiple Files Support Only In Pro Version', class: 'bp3d-row-inline', buttonTitle: 'Add New Model', fields: [], make: modelRowDefaults, value: [], pro: true },
			...shop,
			template,
			thumbs,
			{ id: 'hotspot_style', type: 'button_set', title: 'Hotspot Style', options: HOTSPOT_STYLES, default: 'style-1', pro: true },
			{ ...popups, value: [] },
			shortcode,
		];
	return [
		{ id: 'meta_heading', type: 'content', title: 'Support', html: html`Please leave a message if you encounter any issues on the product page. ${supportLink(false)}` },
		viewer,
		{ id: 'bp3d_models', type: 'group', title: 'Product 3D Models', class: 'bp3d-row-inline', desc: 'Click on + icon to add 3d files, if you add multiple 3d files, we will show them as a slider', buttonTitle: 'Add New Model', fields: modelFields(selects), make: modelRowDefaults },
		...shop,
		{ id: 'viewer_position', type: 'select', title: '3D Viewer Position', desc: 'Select the position of the viewer', options: POSITION_LABELS, default: 'none' },
		template,
		thumbs,
		{ id: 'bp_3d_zooming', type: 'switcher', title: 'Enable Zoom', subtitle: 'Enable or Disable Zoom Behaviour', desc: 'If you wish to disable zooming behaviour please choose No. Moving controls should be enabled to work this.', ...yesNo, default: true, ...preset },
		{ id: 'show_arrows', type: 'switcher', title: 'Show Arrows', desc: 'Navigation arrows require multiple 3D models to be added', ...yesNo, default: false, ...preset },
		{
			id: 'bp3d_group_hotspots',
			type: 'field_group',
			title: 'Hotspots',
			subtitle: "Default look of this product's hotspot pins. Add the hotspots themselves on each model under Product 3D Models.",
			cardTitle: 'Style & Pin Settings',
			class: 'bp3d-row-inline',
			icon: 'info',
			collapsed: true,
			fields: [
				{ id: 'hotspot_style', title: 'Default Hotspot Style', type: 'button_set', options: HOTSPOT_STYLES, default: 'style-1', ...preset },
				{ id: 'bp_3d_pin_size', type: 'slider', store: 'number', min: 16, max: 64, step: 1, title: 'Pin Size (px)', desc: 'Diameter of the hotspot badge, in pixels. Text pins are unaffected.', default: 28, ...preset },
				{ id: 'bp_3d_pin_color', type: 'color', title: 'Pin Icon Color', desc: 'Colour of the icon inside the badge, and of the label on a text pin.', default: '#15171a', ...preset },
				{ id: 'bp_3d_pin_background', type: 'color', title: 'Pin Background', desc: 'Colour of the badge behind the icon, and of the pill behind a text pin.', default: '#ffffff', ...preset },
			],
		},
		{ id: 'bp_3d_dimensions_mode', type: 'button_set', title: 'Show Dimensions', subtitle: 'Real-world width, height and depth lines on the model', desc: "Measurements use the store's dimension unit (WooCommerce > Settings > Products). Lite Viewer only.", options: { off: 'Off', button: 'Ruler button', always: 'Always on' }, default: 'off', dependency: ['currentViewer', '==', 'modelViewer', 'all'] },
		{ id: 'bp_3d_dimensions_source', type: 'button_set', title: 'Dimensions Come From', desc: "'Product dimensions' labels the model with this product's own shipping dimensions, which is right whenever the 3D file was exported at a different scale. 'Measured from the model' reads the file itself. A Real Size set on an individual model always wins.", options: { product: 'Product dimensions', model: 'Measured from the model' }, default: 'product', dependency: ['bp_3d_dimensions_mode|currentViewer', '!=|==', 'off|modelViewer', 'all'] },
		{ id: 'bp_3d_dimension_color', type: 'color', title: 'Dimension Line Colour', desc: 'Colour of the dimension lines and corner dots. Leave empty for the default.', default: '', dependency: ['bp_3d_dimensions_mode|currentViewer', '!=|==', 'off|modelViewer', 'all'] },
		{ id: 'bp_3d_height', type: 'dimensions', title: 'Height', desc: 'Applies to Replace, Tab and products without images. Top and Bottom match the product image size.', units: ['px', 'em', 'pt'], default: { height: '320', unit: 'px' }, width: false, ...preset },
		{ id: 'bp_model_bg', type: 'color', title: 'Background', desc: 'Set Background color', default: 'transparent', ...preset },
		popups,
		shortcode,
		{
			id: 'shortcode',
			type: 'content',
			title: 'Template Shortcode',
			html: html`<strong>PHP</strong> <br /> ${`<?php echo do_shortcode('[3d_viewer_product id="' . get_the_ID() . '"]'); ?>`} or <br /> ${`<?php echo do_shortcode('[3d_viewer_product id="${id}"]'); ?>`} <strong>Recommended</strong>`,
		},
		// Saves without scrolling back up to the Publish box; same form submit as WP's Update.
		{ id: 'bp3d_product_save_btn', type: 'content', title: ' ', html: html`<button type="button" class="button button-primary bp3d-primary-button bp3d_import_product_button" onClick=${() => onSave?.()}>Update</button>` },
	];
}

/** ProductMeta::getFields() (free): the flat source and poster fields edit model row 0. */
function freeFields(state, productId) {
	return [
		formatNotice(state, state.v3dProducts?.[productId]?.bp3d_models?.[0]?.model_src || ''),
		{
			id: 'meta_heading',
			type: 'content',
			title: 'Support',
			html: html`Please leave a message if you encounter any issues on the product page. ${supportLink(true)}<br /><cite style="color:#2271b1; font-weight: bold">The free product viewer displays GLB and GLTF models. Premium adds OBJ, STL, 3DM, 3DS, 3MF, AMF, BIM, BREP, DAE, FBX, FCSTD, IFC, IGES, STEP, OFF, PLY and WRL.</cite>`,
		},
		{ id: 'bp3d_model_src', type: 'upload', kind: 'model', title: '3D Source', subtitle: 'Upload Model Or Input Valid Model url', desc: 'Upload or paste a model URL. GLB and GLTF are supported; other formats need Premium.', placeholder: 'You Can Paste here Model url' },
		upload('bp3d_poster_src', '3D Poster', 'Upload Poster Or Input Valid poster/image url', 'You Can Paste here Poster/image url', { desc: 'This image will display until the model is either loaded or fails to load.' }),
		{
			id: 'viewer_position',
			type: 'radio',
			title: '3D Viewer Position',
			desc: 'Select the position of the viewer',
			options: Object.fromEntries(FREE_POSITIONS.map((p) => [p, POSITION_LABELS[p]])),
			default: 'none',
			// Pro's sixth position, locked.
			after: html`<${ProLock} label="Dedicated Tab"><button type="button" role="radio" aria-checked="false" class="bfields-radio ld-woo-radio-pro"><span class="bfields-radio__dot"></span>Dedicated Tab <${ProPill} /></button><//>`,
		},
		{ id: 'bp_model_bg', type: 'color', title: 'Background', desc: 'Set Background color', default: 'transparent' },
	];
}

/** AdminUi::publishBoxRow(): the Publish box line on the product screen. */
export function InterfaceRow() {
	const state = useStore();
	if (!wooEnabled(state)) return null;
	return html`<div class="misc-pub-section bp3d-admin-ui-row">3D Viewer interface: <strong>New</strong> <a href="#" class="bp3d-admin-ui-link" onClick=${(e) => (e.preventDefault(), toast('The Classic interface is not part of this demo. Both edit the same settings.'))}>Switch to classic</a></div>`;
}

// ── The box ────────────────────────────────────────────────────────────────
export function V3dMetabox({ productId, product, isNew, onSave }) {
	const state = useStore();
	const [, force] = useState(0);
	const [closed, setClosed] = useState(false);
	if (!wooEnabled(state)) return null;
	const pro = isPro(state);
	const key = isNew ? 'new' : productId;
	const d = drafts.get(key) || { ...productMetaDefaults(), ...clone(state.v3dProducts?.[productId] || {}) };
	const save = (next) => (drafts.set(key, next), force((n) => n + 1));
	const rows = Array.isArray(d.bp3d_models) ? d.bp3d_models : [];
	const row0 = rows[0] || modelRowDefaults();

	// getTemplates(): published presets, plus the stored one with its status (the storefront still applies it).
	const presets = Object.values(state.vpresets || {}).filter((p) => (p.status || 'publish') === 'publish').sort((a, b) => String(b.date).localeCompare(String(a.date)));
	// Pairs, not an object: numeric ids would sort ahead of "none".
	const presetOptions = [['none', 'None'], ...presets.map((p) => [String(p.id), p.title || '(no title)'])];
	const storedPreset = state.vpresets?.[d.bp_model_template];
	if (d.bp_model_template && d.bp_model_template !== 'none' && storedPreset && !presets.includes(storedPreset))
		presetOptions.push([String(storedPreset.id), (storedPreset.title || '#' + storedPreset.id) + ` (${STATUS_LABELS[storedPreset.status] || storedPreset.status})`]);

	const title = pro ? '3D Viewer Settings' : '3D Product Settings';
	const locked = proFields({ id: productId || '', presetOptions, selects: variantSelects(state, product), onSave, pro });
	const fields = pro ? locked : [...freeFields(state, productId), ...locked];
	// Free edits model row 0 through the flat keys, as ProductMeta::preserveProData() does.
	// Like bfields' hydrated store, a key the meta lacks reads as its field's default (dependencies included).
	const defaults = Object.fromEntries(fields.flatMap((f) => (f.type === 'field_group' ? f.fields : [f])).filter((f) => f.id && f.default !== undefined).map((f) => [f.id, f.default]));
	const values = { ...defaults, ...d, ...(pro ? {} : { bp3d_model_src: row0.model_src, bp3d_poster_src: row0.poster_src }) };
	const set = (id, v) => {
		const flat = !pro && { bp3d_model_src: 'model_src', bp3d_poster_src: 'poster_src' }[id];
		if (flat) return save({ ...d, bp3d_models: [{ ...row0, [flat]: v }, ...rows.slice(1)] });
		save({ ...d, [id]: v });
	};
	// Locked rows on free draw their own placeholder value; nothing they show is written.
	const ctx = { unique: UNIQUE, values, set, choices: { bp_model_template: presetOptions.map(([k]) => k), viewer_position: Object.keys(POSITION_LABELS) } };
	const lockedCtx = (f) => (f.value !== undefined ? { ...ctx, values: { ...values, [f.id]: f.value }, set: () => {} } : ctx);

	return html`<div id="_bp3d_product_" class=${'postbox ld-woo-box' + (closed ? ' closed' : '')}>
		<div class="postbox-header">
			<h2 class="hndle">${title}</h2>
			<div class="handle-actions">
				<button type="button" class="handlediv" aria-expanded=${!closed} onClick=${() => setClosed(!closed)}>
					<span class="screen-reader-text">Toggle panel: ${title}</span>
					<span class="toggle-indicator" aria-hidden="true"><${Dashicon} name=${closed ? 'arrow-down' : 'arrow-up'} /></span>
				</button>
			</div>
		</div>
		${!closed &&
		html`<div class="inside">
			<div class="bfields-root bfields-app ld-woo-bf" data-unique=${UNIQUE} data-kind="metabox">
				<div class="bfields-admin bfields-admin--metabox">
					<div class="bfields-panel">
						<div class="bfields-settings-body bfields-settings-body--flush">
							${fields.map((f, i) => html`<${FieldRow} key=${f.id ? f.id + '#' + i : 'notice'} f=${f} ctx=${lockedCtx(f)} />`)}
						</div>
					</div>
				</div>
			</div>
		</div>`}
	</div>`;
}
