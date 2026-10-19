// 3D Viewer → Settings: the _bp3d_settings_ option (defaults) and the page's sections, copied from
// 3d-viewer/inc/Field/Settings.php (free), 3d-viewer-premium/inc/Field/SettingsPro.php and AnalyticsPro.php.
// Field shape follows Codestar/bfields: { id, type, title, subtitle, desc, icon, options, default, dependency, pro }.

const FREE_MIME = ['glb', 'gltf', 'obj', '3ds', 'step', 'stl', 'fbx', '3dml', 'dae', 'wrl', '3mf', 'mtl', 'hdr', 'usdz'];
const PRO_MIME = ['glb', 'gltf', 'obj', '3ds', 'step', 'stp', 'stl', 'fbx', '3dm', '3dml', 'dae', 'wrl', '3mf', 'ply', 'off', 'amf', 'ifc', 'brep', 'brp', 'iges', 'igs', 'fcstd', 'bim', 'mtl', 'hdr', 'usdz'];
const mimeOptions = (list) => Object.fromEntries(list.map((ext) => [ext, `${ext.toUpperCase()} (.${ext})`]));

const YES = { text_on: 'Yes', text_off: 'No' };
const LOADING = { auto: 'Auto', lazy: 'Lazy', eager: 'Eager' };
const CORNERS = { 'top-left': 'Top left', 'top-right': 'Top right', 'bottom-left': 'Bottom left', 'bottom-right': 'Bottom right' };
const CONTROL_TITLES = { zoom: 'Zoom in / out', fullscreen: 'Fullscreen', camera: 'Capture image', download: 'Download model', reset: 'Reset view', dimensions: 'Dimensions', ar: 'View in AR' };
const CONTROL_TEXT = { zoomIn: 'Zoom in', zoomOut: 'Zoom out', fullscreen: 'Fullscreen', camera: 'Capture image', download: 'Download model', reset: 'Reset view', dimensions: 'Dimensions', ar: 'View in AR' };
const CONTROL_ICONS = { zoom: 'zoom-in', zoomIn: 'zoom-in', zoomOut: 'zoom-out', fullscreen: 'maximize', camera: 'camera', download: 'download', reset: 'reset', dimensions: 'maximize-2', ar: 'phone' };
const CORNER_DEFAULTS = { zoom: 'bottom-right', fullscreen: 'bottom-right', camera: 'bottom-left', download: 'bottom-left', reset: 'bottom-left', dimensions: 'bottom-left', ar: 'bottom-left' };

// AdminUi::switchField(), which Registrar::createSection() puts first on the page.
const INTERFACE = { type: 'interface', id: 'admin_interface', icon: 'monitor', title: 'Admin interface', subtitle: 'Only changes how the screens look. Settings and viewers stay the same.' };
const gutenberg = { id: 'gutenberg_enabled', icon: 'code', type: 'switcher', title: 'Enable Gutenberg', ...YES, subtitle: 'Enable / Disable Gutenberg Shortcode Generator.', default: false };
const deleteData = { id: 'delete_data_on_uninstall', layout: 'danger', type: 'switcher', title: 'Delete data on uninstall', desc: 'Delete data on uninstall', ...YES, default: false };

/** Loading spinner, control placement and the WooCommerce control fields (SettingsPro::general()). */
function proGeneralFields() {
	return [
		{ id: 'bp3d_loader_type', icon: 'loader', type: 'button_set', title: 'Loading Spinner', subtitle: 'Shown while a 3D model loads', desc: "Applies to every viewer on the site, in both the Lite and Advanced viewers. 'None' removes only the spinner card; the Loading Percentage and Progress Bar options still apply.", options: { default: 'Default', image: 'Custom image', none: 'None' }, default: 'default', pro: true },
		{ id: 'bp3d_loader_image', icon: 'image', type: 'media', title: 'Spinner Image', button_title: 'Upload Image', desc: 'GIF, animated WebP, SVG or PNG. The default spinner is used while this is empty.', dependency: ['bp3d_loader_type', '==', 'image'], default: '', pro: true },
		{ id: 'bp3d_loader_size', icon: 'maximize-2', type: 'number', title: 'Spinner Size', desc: 'Width of the spinner image, 24–300 px. Height follows the image.', unit: 'px', default: 100, dependency: ['bp3d_loader_type', '!=', 'none'], pro: true },
		{ id: 'bp3d_loader_background', icon: 'palette', type: 'color', title: 'Spinner Background', desc: 'Background of the spinner card. Use transparent for none.', default: '#ffffff', dependency: ['bp3d_loader_type', '!=', 'none'], pro: true },
		{ id: 'bp3d_control_placement', icon: 'grid', type: 'button_set', title: 'Control Placement', subtitle: 'Where the Zoom, Fullscreen, Camera, Reset, Dimensions and AR icons sit on the viewer', desc: 'Classic corners keeps the four-position selects on the Gutenberg block and the meta box. Drag-and-drop zones adds eight positions with a draggable widget to the block. Elementor lists all eight positions in both modes, as plain selects. WooCommerce viewers keep classic corners either way.', options: { corners: 'Classic corners', zones: 'Drag-and-drop zones' }, default: 'corners', pro: true },
		{ id: 'bp3d_control_labels', icon: 'info', type: 'button_set', title: 'Control Labels', desc: "Show each control's name next to its icon on WooCommerce viewers. Screen readers announce the name in every mode.", options: { off: 'Off', tooltip: 'Tooltip', inline: 'Inline text' }, default: 'off', pro: true },
		...Object.keys(CONTROL_TITLES).map((key) => ({ id: 'bp3d_control_corner_' + key, icon: CONTROL_ICONS[key], type: 'select', title: `${CONTROL_TITLES[key]} position`, options: CORNERS, default: CORNER_DEFAULTS[key], pro: true })),
		...Object.keys(CONTROL_TEXT).map((key) => ({ id: 'bp3d_control_text_' + key, icon: CONTROL_ICONS[key], type: 'text', title: `${CONTROL_TEXT[key]} label`, desc: 'Leave empty to use the translated default.', default: '', dependency: ['bp3d_control_labels', '!=', 'off'], pro: true })),
		{ id: 'bp3d_control_size', icon: 'maximize-2', type: 'number', title: 'Control Size (px)', desc: 'Width and height of each control button. Inline labels keep this height and grow sideways.', default: 35, min: 24, max: 64, step: 1, pro: true },
		{ id: 'bp3d_control_gap', icon: 'sliders', type: 'number', title: 'Control Spacing (px)', desc: 'Space between controls stacked in the same corner.', default: 10, min: 0, max: 40, step: 1, pro: true },
		{ id: 'bp3d_control_offset', icon: 'move', type: 'number', title: 'Control Edge Offset (px)', desc: 'Distance from the viewer edge to the controls.', default: 10, min: 0, max: 60, step: 1, pro: true },
	];
}

const ANALYTICS = {
	id: 'analytics',
	title: 'Analytics',
	icon: 'chart',
	pro: true,
	fields: [
		{ type: 'content', id: 'analytics_intro', content: 'analytics' },
		{ id: 'analytics_enabled', icon: 'chart', type: 'switcher', title: 'Record anonymous 3D engagement', ...YES, desc: 'Counts views, interactions, time in 3D, AR launches, hotspot clicks and add-to-cart on every viewer. No cookies; no IP addresses or personal data are stored.', default: true },
		{ id: 'analytics_exclude_editors', icon: 'pencil', type: 'switcher', title: 'Ignore logged-in editors', ...YES, desc: "Don't record visits from users who can edit content, so your own testing doesn't inflate the numbers. Decided when the page is rendered, so it relies on logged-in pages not being served from a page cache (the default for every major cache plugin).", default: true, dependency: ['analytics_enabled', '==', true] },
		{ id: 'analytics_respect_gpc', icon: 'eye', type: 'switcher', title: 'Respect Do Not Track / Global Privacy Control', ...YES, desc: 'Visitors whose browser sends a Do Not Track or Global Privacy Control signal are not recorded.', default: true, dependency: ['analytics_enabled', '==', true] },
		{ id: 'analytics_retention', icon: 'save', type: 'select', title: 'Keep detailed rows for', desc: 'Daily totals are kept forever; detailed per-view rows are removed after this many days. Shortening the period removes older rows on the next nightly run; lengthening it does not bring them back.', options: { 30: '30 days', 90: '90 days', 180: '180 days', 365: '1 year' }, order: ['30', '90', '180', '365'], default: '90', dependency: ['analytics_enabled', '==', true] },
		{ id: 'analytics_ga4', icon: 'send', type: 'switcher', title: 'Also send events to Google Analytics 4', ...YES, desc: 'Uses the gtag or Google Tag Manager already on your site (AR launches, add-to-cart, interactions, hotspot clicks — never time ticks). The plugin never loads Google scripts itself.', default: false, dependency: ['analytics_enabled', '==', true] },
	],
};

const PRESET = {
	id: 'preset',
	title: 'Preset',
	icon: 'sliders',
	pro: true,
	fields: [
		{ id: 'bpp_3d_width', icon: 'move', type: 'dimensions', title: 'Width', desc: '3D Viewer Width', default: { width: '100', unit: '%' }, axis: 'width', units: ['px', '%', 'em'] },
		{ id: 'bpp_3d_height', icon: 'maximize-2', type: 'dimensions', title: 'Height', desc: '3D Viewer height', units: ['px', 'em', 'pt'], default: { height: '320', unit: 'px' }, axis: 'height' },
		{ id: 'bpp_model_bg', icon: 'palette', type: 'color', title: 'Background Color', subtitle: "Set Background Color For 3d Model.If You don't need just leave blank. Default : 'transparent color'", desc: 'Choose Your Background Color For Model.', default: 'transparent' },
		{ id: 'bpp_3d_autoplay', icon: 'zap', type: 'switcher', title: 'Autoplay', subtitle: 'Enable or Disable AutoPlay', desc: 'Autoplay Feature is for Autoplay Supported Model.', ...YES, default: false },
		{ id: '3dp_shadow_intensity', icon: 'cloud-drizzle', type: 'slider', min: 0, max: 1, step: 0.1, title: 'Shadow Intensity', subtitle: 'Shadow Intensity for Model', desc: 'Use Shadow Intensity Limit for Model. "1" for Default.', default: '1' },
		{ id: 'bpp_3d_preloader', icon: 'download', type: 'switcher', title: 'Preload', subtitle: 'Preload with poster and show model on interaction', desc: 'Choose "Yes" if you want to use preload with poster image.', ...YES, default: false },
		{ id: 'bpp_camera_control', icon: 'move', type: 'switcher', title: 'Moving Controls', desc: 'Use The Moving controls to enable user interaction', ...YES, default: true },
		{ id: 'bpp_3d_zooming', icon: 'zoom-in', type: 'switcher', title: 'Enable Zoom', subtitle: 'Enable or Disable Zoom Behaviour', desc: 'If you wish to disable zooming behaviour please choose No. Moving controls should be enabled to work this.', ...YES, default: true },
		{ id: 'bpp_3d_progressbar', icon: 'sliders', type: 'switcher', title: 'Progressbar', subtitle: 'Enable or Disable Progressbar', desc: 'If you wish to disable Progressbar please choose No.', ...YES, default: true },
		{ id: 'bpp_3d_loading', icon: 'loader', type: 'radio', title: 'Loading Type', subtitle: "Choose Loading type, default:  'Auto' ", options: LOADING, default: 'auto' },
		{ id: 'bpp_3d_rotate', icon: 'refresh', type: 'switcher', title: 'Auto Rotate', subtitle: 'Enable or Disable Auto Rotation', desc: 'Enables the auto-rotation of the model.', ...YES, default: false },
		{ id: '3dp_rotate_speed', icon: 'refresh', type: 'spinner', title: 'Auto Rotate Speed', subtitle: 'Auto Rotation Speed Per Seconds', desc: 'Use Negative Number for Reverse Action. "30" for Default Behaviour.', min: -180, max: 180, default: 30, dependency: ['bpp_3d_rotate', '==', true] },
		{ id: '3dp_rotate_delay', icon: 'refresh', type: 'number', title: 'Auto Rotation Delay (ms)', subtitle: 'After a period of time auto rotation will start', desc: 'Sets the delay before auto-rotation begins. The format of the value is a number in milliseconds.(1000ms = 1s)', default: 3000, dependency: ['bpp_3d_rotate', '==', true] },
		{ id: 'bpp_3d_fullscreen', icon: 'maximize', type: 'switcher', title: 'Fullscreen', subtitle: 'Enable or Disable Fullscreen Mode', desc: 'Default: "Yes / Enable"', ...YES, default: true },
	],
};

function woocommerce(pro) {
	const p = !pro;
	return {
		id: 'woocommerce-settings',
		title: pro ? 'WooCommerce Settings' : 'Woocommerce Settings',
		icon: pro ? 'cog' : 'shopping-cart',
		fields: [
			{ id: '3d_woo_switcher', icon: 'cart', type: 'switcher', title: 'Woocommerce', subtitle: 'Enable / Disable Woocommerce Feature for 3D Viewer.', desc: 'Enable / Disable. Default is Enable.', ...(pro ? YES : {}), default: true },
			{ id: 'is_not_compatible', icon: 'warning', type: 'switcher', title: 'Theme Compatibility Mode', ...(pro ? YES : {}), desc: pro ? 'Turn on if the 3D viewer is missing or in the wrong place on product pages. It is then placed using the selectors on the Woocommerce Selectors tab.' : 'Enable if 3D Viewer is not compatible with this theme', default: false },
			{ id: '3d_shadow_intensity', icon: 'cloud-drizzle', type: 'slider', min: 0, max: 1, step: 0.1, title: 'Shadow Intensity', subtitle: 'Shadow Intensity for Model', desc: 'Use Shadow Intensity Limit for Model. "1" for Default.', default: '1', pro: true },
			{ id: 'bp_camera_control', icon: 'move', type: 'switcher', title: 'Moving Controls', desc: 'Use The Moving controls to enable user interaction', ...YES, default: true },
			{ id: 'bp_3d_zooming', icon: 'zoom-in', type: 'switcher', title: 'Enable Zoom', subtitle: 'Enable or Disable Zoom Behaviour', desc: pro ? 'If you wish to disable zooming behaviour please choose No. Moving controls should be enabled to work this.' : 'If you wish to disable zooming behaviour please choose No.', ...YES, default: true },
			{ id: 'bp_3d_progressbar', icon: 'sliders', type: 'switcher', title: 'Progressbar', subtitle: 'Enable or Disable Progressbar', desc: 'If you wish to disable Progressbar please choose No.', ...YES, default: true, pro: true },
			{ id: 'bp_3d_loading', icon: 'loader', type: 'radio', title: 'Loading Type', subtitle: "Choose Loading type, default:  'Auto' ", options: LOADING, default: 'auto' },
			{ id: 'bp_3d_mobile_image_mode', icon: 'phone', type: 'button_set', title: 'On Mobile Devices', subtitle: 'Show the poster image instead of the 3D model on phones', desc: "Applies to every product. Uses each product model's poster; models without one load as usual. 'Image, tap to load' shows a View in 3D button; 'Image only' never loads the model on mobile. Saves the model download and rendering on phones. Works with both viewers.", options: { off: 'Load 3D model', tap: 'Image, tap to load', static: 'Image only' }, default: 'off', pro: true },
			{ id: 'bp_3d_mobile_tap_label', icon: 'phone', type: 'text', title: 'Tap Button Text', placeholder: 'View in 3D', default: '', dependency: ['bp_3d_mobile_image_mode', '==', 'tap'], pro: true },
			{ id: 'bp_3d_mobile_breakpoint', icon: 'phone', type: 'number', title: 'Mobile Breakpoint', desc: 'Screens up to this width count as mobile. Touch-only devices are judged by their shorter edge, so a phone in landscape still counts.', unit: 'px', default: 768, dependency: ['bp_3d_mobile_image_mode', '!=', 'off'], pro: true },
			{ id: 'bp_3d_mobile_reduce_motion', icon: 'phone', type: 'switcher', title: 'Reduce Motion on Mobile', subtitle: 'Turn off animation and Auto Rotate on phones', desc: 'Applies to every product using the Lite viewer. Turns off the model animation and Auto Rotate on phones, and for visitors whose device asks for reduced motion. Visitors can still rotate and zoom. With Show image only, no model loads on phones, so only the reduced-motion part applies.', ...YES, default: false, pro: true },
			{ id: 'bp_3d_rotate', icon: 'refresh', type: 'switcher', title: 'Auto Rotate', subtitle: 'Enable or Disable Auto Rotation', desc: 'Enables the auto-rotation of the model.', ...YES, default: true, pro: true },
			{ id: '3d_rotate_speed', icon: 'refresh', type: 'spinner', title: 'Auto Rotate Speed', subtitle: 'Auto Rotation Speed Per Seconds', desc: 'Use Negative Number for Reverse Action. "30" for Default Behaviour.', min: -180, max: 180, default: 30, dependency: ['bp_3d_rotate', '==', true], pro: true },
			{ id: '3d_rotate_delay', icon: 'refresh', type: 'number', title: 'Auto Rotation Delay (ms)', subtitle: 'After a period of time auto rotation will start', desc: 'Sets the delay before auto-rotation begins. The format of the value is a number in milliseconds.(1000ms = 1s)', default: 3000, dependency: ['bp_3d_rotate', '==', true], pro: true },
			{ id: 'bp_3d_autoplay', icon: 'zap', type: 'switcher', title: 'Autoplay', subtitle: 'Enable or Disable AutoPlay', desc: 'Autoplay Feature is for Autoplay Supported Model.', ...YES, default: false, pro: true },
			{ id: 'bp_3d_fullscreen', icon: 'maximize', type: 'switcher', title: 'Fullscreen', subtitle: 'Enable or Disable Fullscreen Mode', desc: 'Default: "Yes / Enable"', ...YES, default: true, pro: true },
		].map((f) => (p ? f : { ...f, pro: undefined })),
	};
}

const SELECTORS = [
	{ id: 'gallery', icon: 'image', layout: 'selector', type: 'text', title: 'Gallery Selector', desc: 'Write here the gallery selector', placeholder: '.woocommerce-product-gallery' },
	{ id: 'gallery_item', icon: 'image', layout: 'selector', type: 'text', title: 'Gallery Item Selector', desc: 'Write here the gallery item selector', placeholder: '.woocommerce-product-gallery__image' },
	{ id: 'gallery_item_active', icon: 'check', layout: 'selector', type: 'text', title: 'Gallery Item Active Selector', desc: 'Write here the gallery item active selector', placeholder: '.woocommerce-product-gallery__image.flex-active-slide' },
	{ id: 'gallery_thumbnail_item', icon: 'grid', layout: 'selector', type: 'text', title: 'Gallery Thumbnail Item Selector', desc: 'Write here the gallery thumbnail item selector', placeholder: '.flex-control-thumbs li' },
	{ id: 'gallery_trigger', icon: 'search', layout: 'selector', type: 'text', title: 'Gallery Trigger Selector', desc: 'Write here the gallery trigger selector', placeholder: '.woocommerce-product-gallery__trigger' },
];
const CUSTOM_CSS = { id: 'custom_css', icon: 'code', type: 'code_editor', title: 'Custom CSS', desc: 'Write here the custom css code', default: '' };

/**
 * The page's tabs for a plan. Pro = SettingsPro order. Free = the free plugin's tabs with the Pro
 * tabs and fields shown locked (pro: true), in the order the Pro build lists them.
 */
export function settingsSections(pro) {
	const strip = (fields) => fields.map((f) => ({ ...f, pro: undefined }));
	if (pro) {
		return [
			{
				id: 'general-settings',
				title: 'General Settings',
				icon: 'box',
				fields: [
					INTERFACE,
					gutenberg,
					{ id: 'allowed_mime_types', layout: 'tile-grid', type: 'checkbox', title: 'Allowed Mime Types', desc: 'Select which 3D model file types can be uploaded to the media library.', after: 'Unticked types cannot be uploaded; tick any other format you need here.', options: mimeOptions(PRO_MIME), default: FREE_MIME },
					deleteData,
					...strip(proGeneralFields()),
				],
			},
			{ ...ANALYTICS, pro: undefined },
			{ ...PRESET, pro: undefined },
			woocommerce(true),
			{ id: 'woocommerce-selectors', title: 'WooCommerce Selectors', icon: 'crosshairs', fields: [...SELECTORS, CUSTOM_CSS] },
		];
	}
	return [
		{
			id: 'general-settings',
			title: 'General Settings',
			icon: 'cog',
			fields: [
				INTERFACE,
				{ id: 'allowed_mime_types', layout: 'tile-grid', type: 'checkbox', title: 'Allowed Mime Types', desc: 'Select which 3D model and HDR file types can be uploaded to the media library. All supported formats are enabled by default; uncheck any you want to block.', options: mimeOptions(FREE_MIME), default: FREE_MIME },
				deleteData,
				...proGeneralFields(),
			],
		},
		ANALYTICS,
		PRESET,
		woocommerce(false),
		{ id: 'shortcode-generator', title: 'Shortcode Generator', icon: 'code', fields: [{ ...gutenberg, text_on: undefined, text_off: undefined }] },
		{ id: 'woocommerce-selectors', title: 'WooCommerce Selectors', icon: 'crosshairs', fields: [...SELECTORS, { ...CUSTOM_CSS, pro: true }] },
	];
}

/** Every field id → its default, across both plans (one stored option, like the real plugins). */
/** Extensions only the Pro list offers; a free save keeps their stored ticks (Settings::preserveSettings()). */
export const PRO_ONLY_MIME = PRO_MIME.filter((ext) => !FREE_MIME.includes(ext));

export function settingsDefaults() {
	const out = {};
	for (const pro of [false, true]) {
		for (const section of settingsSections(pro)) {
			for (const f of section.fields) if (f.id && 'default' in f && !(f.id in out)) out[f.id] = Array.isArray(f.default) ? [...f.default] : f.default && typeof f.default === 'object' ? { ...f.default } : f.default;
		}
	}
	for (const f of SELECTORS) out[f.id] = '';
	return out;
}
