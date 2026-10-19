// The viewer post's "3D Viewer Settings" meta (_bp3dimages_) as the Modern interface draws it, and the
// mapping from that meta to the viewer's attributes. Fields: 3d-viewer-premium/inc/Field/Viewer.php
// (unlicensed: Pro rows locked) and inc/Field/ViewerPro.php, HotspotFields.php; the merged 3D Source field
// is inc/Base/ModelSource.php. Mapping: inc/Shortcode/Shortcode.php + ShortcodePro.php (getCommonAttributes).

import { defaultsOf } from '../ui/bfields.js';

const yes = { text_on: 'Yes', text_off: 'No' };
const LITE = ['currentViewer', '==', 'modelViewer', 'all'];
const UPLOADS = 'https://demo.bplugins.local/wp-content/uploads/';

/** AdminUi::viewerModes(): the Lite / Advanced cards. */
const VIEWER_MODES = {
	modelViewer: { icon: 'zap', tag: 'Recommended', perks: ['GLB and glTF', 'Augmented reality'] },
	O3DViewer: { icon: 'sliders', perks: ['OBJ, STL, FBX, STEP and more'] },
};

/** Viewer::upgrade_section(), the notice the unlicensed build puts at the top of each tab. */
const upgrade = { type: 'content', id: '', render: () => (display.upgrade ? display.upgrade() : null) };

/** inc/Field/HotspotFields.php fields(): one repeater row. `style` = the viewer has a Hotspot Style control. */
export function hotspotFields(style, products = []) {
	const desc = (t) => ({ desc: t });
	const types = { info: 'Info', link: 'Link', image: 'Image', waypoint: 'Waypoint', animation: 'Animation', video: 'Video', product: 'Product' };
	return [
		{ id: 'title', type: 'text', title: 'Title', ...desc('Title of the hotspot in the 3D model.') },
		{ id: 'type', type: 'select', title: 'Type', options: types, default: 'info' },
		{ id: 'display', type: 'select', title: 'Display', options: { '': 'Use viewer setting', always: 'Always visible', hover: 'Tooltip on hover', popup: 'Popup', none: 'Pin only (no content)' }, default: '', ...desc('How this hotspot shows its content. Leave on the viewer setting to follow Hotspot Style. Popup is ignored for Link and Animation, whose click already does something else.') },
		{ id: 'pinIcon', type: 'select', title: 'Pin Icon', options: { '': 'Use viewer setting', text: 'Text (name)', info: 'Info', plus: 'Plus', dot: 'Dot', number: 'Number', link: 'Link', play: 'Play', cart: 'Cart', question: 'Question', custom: 'Custom image' }, default: '', ...desc("What the pin shows: the hotspot's name as a label, one of the badge icons, or your own picture.") },
		{ id: 'customIcon', type: 'upload', title: 'Pin Image', library: 'image', dependency: ['pinIcon', '==', 'custom'], ...desc('Drawn inside the pin badge instead of an icon. A small square picture works best.') },
		{ id: 'desc', type: 'textarea', title: 'Description', ...desc('Description of the hotspot in the 3D model.') },
		{ id: 'linkUrl', type: 'text', title: 'Link URL', placeholder: 'https://example.com', dependency: ['type', '==', 'link'] },
		{ id: 'linkText', type: 'text', title: 'Link Button Text', placeholder: 'Visit Link', dependency: style ? [['type', '==', 'link'], ['hotspot_style', '!=', 'style-1', 'all']] : ['type', '==', 'link'] },
		{ id: 'openInNewTab', type: 'switcher', title: 'Open in new tab', ...yes, dependency: ['type', '==', 'link'] },
		{ id: 'imageUrl', type: 'upload', title: 'Image', library: 'image', desc: 'Shown above the description in the card styles. Paste a medium-size image URL for a small card.', dependency: ['type', '==', 'image'] },
		{ id: 'imageAlt', type: 'text', title: 'Image Alt Text', desc: 'Falls back to the hotspot title.', dependency: ['type', '==', 'image'] },
		{ id: 'animationName', type: 'text', title: 'Animation Name', desc: 'The clip to play, exactly as it is named in the model. Copy it from the Visual Editor.', dependency: ['type', '==', 'animation'] },
		{ id: 'animationRepeat', type: 'select', title: 'Repeat', options: { once: 'Once', loop: 'Loop until clicked again', pingpong: 'Back and forth until clicked again' }, default: 'once', dependency: ['type', '==', 'animation'] },
		{ id: 'videoUrl', type: 'text', title: 'Video URL', placeholder: 'https://www.youtube.com/watch?v=...', desc: 'YouTube, Vimeo, or a direct MP4, WebM or OGG file. The player loads only when the visitor opens the card.', dependency: ['type', '==', 'video'] },
		{ id: 'productId', type: 'select', title: 'Product', placeholder: 'Search products', options: Object.fromEntries(products), desc: 'The card is built from this product when the visitor opens it.', dependency: ['type', '==', 'product'] },
		{ id: 'position', type: 'text', title: 'Position', ...desc('Position of the hotspot in the 3D model.') },
		{ id: 'normal', type: 'text', title: 'Normal', ...desc('Normal of the hotspot in the 3D model.') },
		{ id: 'orbit', type: 'text', title: 'Orbit', ...desc('Orbit of the hotspot in the 3D model.') },
		{ id: 'target', type: 'text', title: 'Target', ...desc('Target of the hotspot in the 3D model.') },
		{ id: 'fov', type: 'text', title: 'FOV (Field of View)', ...desc('FOV of the hotspot in the 3D model.') },
	];
}

/** HotspotFields::pinStyleFields(), with the icons the viewer meta box adds. */
const pinStyleFields = (dependency) => [
	{ id: 'bp_3d_pin_size', icon: 'maximize-2', type: 'slider', min: 16, max: 64, step: 1, title: 'Pin Size (px)', desc: 'Diameter of the hotspot badge, in pixels. Text pins are unaffected.', default: 28, dependency },
	{ id: 'bp_3d_pin_color', icon: 'palette', type: 'color', title: 'Pin Icon Color', desc: 'Colour of the icon inside the badge, and of the label on a text pin.', default: '#15171a', dependency },
	{ id: 'bp_3d_pin_background', icon: 'palette', type: 'color', title: 'Pin Background', desc: 'Colour of the badge behind the icon, and of the pill behind a text pin.', default: '#ffffff', dependency },
];

const CONTROL_KEYS = ['zoom', 'fullscreen', 'camera', 'download', 'reset', 'dimensions', 'ar'];
const CONTROL_TEXT_KEYS = ['zoomIn', 'zoomOut', 'fullscreen', 'camera', 'download', 'reset', 'dimensions', 'ar'];
const CORNER_DEFAULTS = { zoom: 'bottom-right', fullscreen: 'bottom-right', camera: 'bottom-left', download: 'bottom-left', reset: 'bottom-left', dimensions: 'bottom-left', ar: 'bottom-left' };

/** ViewerPro::control_fields(): labels, then a position per control, then a label per button. */
function controlFields() {
	const titles = { zoom: 'Zoom in / out', fullscreen: 'Fullscreen', camera: 'Capture image', download: 'Download model', reset: 'Reset view', dimensions: 'Dimensions', ar: 'View in AR' };
	const textTitles = { zoomIn: 'Zoom in', zoomOut: 'Zoom out', fullscreen: 'Fullscreen', camera: 'Capture image', download: 'Download model', reset: 'Reset view', dimensions: 'Dimensions', ar: 'View in AR' };
	const dependency = {
		zoom: ['bp_3d_zoom_in_out_btn|bp_camera_control|bp_3d_zooming', '==|==|==', '1|1|1', 'all'],
		fullscreen: ['bp_3d_fullscreen', '==', '1', 'all'],
		camera: ['bp_3d_camera_btn|currentViewer', '==|==', '1|modelViewer', 'all'],
		download: ['bp_3d_download_btn', '==', '1', 'all'],
		reset: ['bp_3d_reset_view_btn|currentViewer', '==|==', '1|modelViewer', 'all'],
		dimensions: ['bp_3d_dimensions_mode|currentViewer', '!=|==', 'off|modelViewer', 'all'],
		ar: ['currentViewer', '==', 'modelViewer', 'all'],
	};
	const icons = { zoom: 'zoom-in', zoomIn: 'zoom-in', zoomOut: 'zoom-out', fullscreen: 'maximize', camera: 'camera', download: 'download', reset: 'reset', dimensions: 'maximize-2', ar: 'phone' };
	const corners = { 'top-left': 'Top left', 'top-right': 'Top right', 'bottom-left': 'Bottom left', 'bottom-right': 'Bottom right' };
	const liteOnly = ['camera', 'reset', 'dimensions', 'ar'];
	return [
		{ id: 'bp_3d_control_labels', icon: 'info', type: 'button_set', title: 'Control Labels', desc: "Show each control's name next to its icon. Screen readers announce the name in every mode.", options: { off: 'Off', tooltip: 'Tooltip', inline: 'Inline text' }, default: 'off' },
		...CONTROL_KEYS.map((k) => ({ id: 'bp_3d_control_corner_' + k, icon: icons[k], type: 'select', title: `${titles[k]} position`, options: corners, default: CORNER_DEFAULTS[k], dependency: dependency[k] })),
		...CONTROL_TEXT_KEYS.map((k) => ({
			id: 'bp_3d_control_text_' + k,
			icon: icons[k],
			type: 'text',
			title: `${textTitles[k]} label`,
			desc: 'Leave empty to use the translated default.',
			default: '',
			dependency: liteOnly.includes(k) ? ['bp_3d_control_labels|currentViewer', '!=|==', 'off|modelViewer', 'all'] : ['bp_3d_control_labels', '!=', 'off', 'all'],
		})),
	];
}

/** inc/Field/Viewer.php: the premium build without a licence. `pro: true` = a `bp3d-readonly` row, locked.
 * AR stays open: the free plugin's own Viewer.php ships Enable AR, iOS source, placement and mode. */
function freeSections(postId) {
	return [
		{
			id: 'model',
			title: 'Model',
			icon: 'fa fa-cube',
			layout: 'cards',
			fields: [
				upgrade,
				{ id: 'currentViewer', icon: 'layers', option_meta: VIEWER_MODES, layout: 'mode-grid', type: 'button_set', title: 'Viewer', subtitle: 'Choose Viewer', desc: 'Choose between Lite and Advanced viewer modes. Lite is optimized for GLB and GLTF files with strong performance and essential features. Advanced supports almost all 3D file types but offers a more streamlined feature set.', options: { modelViewer: 'Lite', O3DViewer: 'Advanced' }, default: 'modelViewer' },
				{ id: 'bp_3d_model_type', icon: 'box', type: 'button_set', title: 'Model Type', subtitle: 'Choose Model Type', desc: 'Enables multiple models in a single viewer, allowing users to switch between different 3D models.', options: { msimple: 'Single', mcycle: 'Multiple' }, default: ['msimple'] },
				{ id: 'bp_3d_source', icon: 'link', type: 'upload', library: 'model', title: '3D Source', subtitle: 'Upload a model or paste its URL', desc: 'Specifies the URL of the 3D model file to be displayed in the viewer. Pasting a URL from outside your Media Library needs Pro.', placeholder: 'Paste a model URL or upload a file', button_title: 'Upload Source', default: '', dependency: ['bp_3d_model_type', '==', 'msimple'] },
				{ id: 'readonly', icon: 'box', type: 'repeater', title: '3D Cycle Models', subtitle: 'Cycling between 3D Models', button_title: 'Add New Model', desc: 'Use Multiple Model in a row.', pro: true, fields: [{ id: 'model_src', type: 'media', library: 'model', title: 'Model Source', desc: 'Upload or Select 3d object files. Supported file type: glb, glTF' }], dependency: ['bp_3d_model_type', '==', 'mcycle'] },
				{ id: 'readonly', icon: 'camera', type: 'text', title: 'Initial View', desc: 'Paste the Initial View JSON data copied from the Visual editor. Initial View allow you to set the initial view of your 3D model.', placeholder: 'Paste here Initial View JSON data', pro: true, default: '[]' },
				{
					id: 'bp3d_group_lighting',
					type: 'field_group',
					title: 'Lighting & Environment',
					icon: 'sun',
					collapsed: true,
					fields: [
						{ id: 'readonly', icon: 'image', type: 'upload', library: 'image', button_title: 'Upload', title: 'Environment Image', desc: 'Sets an environment image to improve lighting and reflections on the model.', dependency: ['bp_3d_model_type|currentViewer', '==|==', 'msimple|modelViewer', 'all'], pro: true },
						{ id: 'readonly', icon: 'image', type: 'upload', library: 'image', button_title: 'Upload', title: 'HDR Skybox Image', desc: 'Sets a skybox image that appears as the background and provides environmental lighting for the model.', dependency: ['bp_3d_model_type|currentViewer', '==|==', 'msimple|modelViewer', 'all'], pro: true },
					],
				},
			],
		},
		{
			id: 'settings',
			title: 'Settings',
			icon: 'fa fa-cog',
			fields: [
				upgrade,
				{ id: 'bp_camera_control', icon: 'move', type: 'switcher', title: 'Moving Controls', desc: 'Allows users to rotate, pan, and interact with the model using a mouse or touch input.', ...yes, default: true },
				{ id: 'bp_3d_zooming', icon: 'zoom-in', type: 'switcher', title: 'Enable Zoom', subtitle: 'Enable or Disable Zooming Behaviour', desc: 'Enables zooming in and out of the 3D model using mouse scroll or touch gestures.', ...yes, default: true, dependency: LITE },
				{ id: 'bp_3d_loading', icon: 'loader', type: 'radio', title: 'Loading Type', subtitle: "Choose Loading type, default:  'Auto' ", options: { auto: 'Auto', lazy: 'Lazy', eager: 'Eager' }, default: 'auto', dependency: LITE },
				{ id: 'bp_model_angle', icon: 'camera', type: 'switcher', title: 'Initial View', subtitle: 'Specified Custom Angle of Model in Initial Load.', desc: 'Defines the initial camera angle and orientation of the model when the viewer first loads.', pro: true, ...yes, default: false, dependency: LITE },
				{ id: 'angle_property', icon: 'camera', type: 'spacing', title: 'Custom Angle Values', subtitle: 'Set The Custom values for Model. Default Values are ("X=0deg Y=75deg Z=105%")', desc: 'Set Your Desire Values. (X= Horizontal Position, Y= Vertical Position, Z= Zoom Level/Position) ', default: { top: '0', right: '75', bottom: '105' }, left: false, top_icon: 'Deg', right_icon: 'Deg', bottom_icon: '%', placeholder: { top: 'X', right: 'Y', bottom: 'Z' }, labels: { top: 'X', right: 'Y', bottom: 'Z' }, dependency: ['bp_model_angle|currentViewer', '==|==', '1|modelViewer', 'all'] },
				{ id: 'bp_3d_autoplay', icon: 'zap', type: 'switcher', title: 'Autoplay', subtitle: 'Enable or Disable AutoPlay', desc: 'Automatically starts model animation when the viewer loads.', ...yes, default: false, pro: true, dependency: LITE },
				{ id: '3d_shadow_intensity', icon: 'cloud-drizzle', type: 'spinner', title: 'Shadow Intensity', subtitle: 'Shadow Intensity for Model', desc: 'Controls how dark or light the model’s shadow appears. Higher values create darker, more visible shadows.', pro: true, default: '1', dependency: LITE },
				{ id: '3d_exposure', icon: 'sun', type: 'spinner', min: 0.1, max: 5, title: 'Exposure', subtitle: 'Brightness for Model', desc: 'Adjusts the brightness of the model scene. Higher values make the model brighter.', pro: true, default: '1', dependency: LITE },
				{ id: 'bp_model_anim_du', icon: 'zap', type: 'text', title: 'Cycle Animation Duration', subtitle: 'Animation Duration Time at Seconds : 1000ms = 1sec', desc: "Input Model Animation Duration Time (default: '5') Seconds", pro: true, default: 5000, dependency: ['bp_3d_model_type|currentViewer', '==|==', 'mcycle|modelViewer', 'all'] },
				{ id: 'bp_3d_poster_type', icon: 'image', type: 'button_set', title: 'Poster Type', subtitle: 'Choose Poster Type', desc: 'Select Poster Type, Default- Simple.', pro: true, options: { simple: 'simple', cycle: 'Cycle' }, default: ['simple'] },
				{ id: 'bp_3d_poster', icon: 'image', type: 'media', library: 'image', button_title: 'Upload Poster', url_input: true, title: '3D Poster Image', subtitle: 'Display a poster until loaded', desc: "Upload or Select 3d Poster Image.  if you don't want to use just leave it empty", pro: true, dependency: ['bp_3d_poster_type', '==', 'simple', 'all'] },
				{ id: 'bp_3d_posters', icon: 'image', type: 'repeater', title: 'Poster Images', subtitle: 'Cycling between posters', button_title: 'Add New Poster Images', desc: "Use multiple images for poster image.if you don't want to use just leave it empty", fields: [{ id: 'poster_img', type: 'upload', library: 'image', title: 'Poster Image' }], dependency: ['bp_3d_poster_type', '==', 'cycle', 'all'], pro: true },
				{ id: 'bp_3d_progressbar', icon: 'sliders', type: 'switcher', title: 'Progressbar', subtitle: 'Show/Hide Progressbar', desc: 'Displays a progress bar during model loading to indicate loading status.', ...yes, default: true, dependency: LITE },
				{ id: 'bp_model_progress_percent', icon: 'loader', type: 'switcher', title: 'Show Progress Percent', desc: 'Shows the loading percentage while the 3D model is being loaded.', ...yes, pro: true, default: false, dependency: LITE },
				{ id: 'bp_3d_rotate', icon: 'refresh', type: 'switcher', title: 'Auto Rotate', subtitle: 'Enable or Disable Auto Rotation', desc: 'Automatically rotates the 3D model without user interaction. Great for showcasing products.', ...yes, pro: true, default: false, dependency: LITE },
				{ id: '3d_rotate_speed', icon: 'refresh', type: 'spinner', title: 'Auto Rotate Speed', subtitle: 'Auto Rotation Speed Per Seconds', desc: 'Controls how fast the model rotates automatically. Higher values mean faster rotation.', min: 0, max: 180, default: 30, pro: true, dependency: ['bp_3d_rotate|currentViewer', '==|==', '1|modelViewer', 'all'] },
				{ id: '3d_rotate_delay', icon: 'refresh', type: 'number', title: 'Auto Rotation Delay (ms)', subtitle: 'After a period of time auto rotation will start', desc: 'Sets the delay time before automatic rotation starts after the model loads or after user interaction stops.', default: 3000, pro: true, dependency: ['bp_3d_rotate|currentViewer', '==|==', '1|modelViewer', 'all'] },
				{ id: 'bp_3d_fullscreen', icon: 'maximize', type: 'switcher', title: 'Fullscreen', subtitle: 'Enable or Disable Fullscreen Mode', desc: 'Shows a fullscreen button so users can view the model in fullscreen mode.', ...yes, pro: true, default: true },
				{ id: 'bp_3d_enable_ar', icon: 'phone', type: 'switcher', title: 'Enable AR', desc: 'Enables AR (Augmented Reality) so visitors can view the 3D model in their real environment on supported devices.', ...yes, default: false, dependency: LITE },
				{ id: 'model_iso_src', icon: 'phone', type: 'upload', library: 'model', title: '3D Source for iOS (Optional)', subtitle: 'Upload Model Or Input Valid Model url', desc: 'Specifies the iOS-specific model file (.usdz) used for viewing the 3D model in AR on Apple devices.', placeholder: 'You Can Paste here Model url', dependency: ['bp_3d_enable_ar|currentViewer', '==|==', '1|modelViewer', 'all'] },
				{ id: 'ar_placement', icon: 'phone', type: 'button_set', title: 'AR Placement', desc: "Defines how the model is placed in AR. Choose 'floor' to place the model on the ground or 'wall' to attach it to a vertical surface.", options: { floor: 'Floor', wall: 'Wall' }, default: 'floor', dependency: ['bp_3d_enable_ar|currentViewer', '==|==', '1|modelViewer', 'all'] },
				{ id: 'ar_mode', icon: 'phone', type: 'button_set', title: 'AR Mode', desc: "Selects the AR viewing mode. 'Quick Look' is used for iOS devices, while other modes enable AR on supported Android devices.", options: { webxr: 'WebXR', 'scene-viewer': 'Scene Viewer', 'quick-look': 'Quick Look' }, default: 'webxr', dependency: ['bp_3d_enable_ar|currentViewer', '==|==', '1|modelViewer', 'all'] },
			],
		},
		{
			id: 'style',
			title: 'Style',
			icon: 'fa fa-paint-brush',
			fields: [
				upgrade,
				{ id: 'bp_3d_width', icon: 'move', type: 'bp3d_responsive_dimensions', axis: 'width', title: 'Width', desc: 'Sets the width of the 3D viewer. Use % for a width that follows its container, or a fixed unit such as px.', default: { width: 100, unit: '%' } },
				{ id: 'bp_3d_height', icon: 'maximize-2', type: 'bp3d_responsive_dimensions', axis: 'height', title: 'Height', desc: 'Sets the height of the 3D viewer. Adjust this to control how much vertical space the model occupies.', units: ['px', 'em', 'pt'], default: { height: 320, unit: 'px' } },
				{ id: 'bp_3d_align', icon: 'grid', title: 'Align', desc: 'Controls the alignment of the 3D viewer within its container, such as left, center, or right.', type: 'button_set', options: { start: 'Left', center: 'Center', end: 'Right' }, default: 'center' },
				{ id: 'bp_model_bg', icon: 'palette', type: 'color', title: 'Background Color', subtitle: "Set Background Color For 3d Model.If You don't need just leave blank. Default : 'transparent color'", desc: 'Sets the background color of the 3D viewer. Use transparent or any valid CSS color value.', default: 'transparent' },
				{ id: 'bp_model_progressbar_color', icon: 'palette', type: 'color', title: 'Progressbar Color', subtitle: 'Set Progressbar Color For 3d Model.', desc: 'Changes the color of the loading progress bar shown while the model is loading.', default: 'rgba(0, 0, 0, 0.4)', dependency: ['currentViewer|bp_3d_progressbar', '==|==', 'modelViewer|1', 'all'], pro: true },
				{ id: 'css', icon: 'code', type: 'code_editor', title: 'CSS Editor (use this ID below as wrapper selector)', desc: 'Write full CSS rules with a selector, or they have no effect, for example: .b3dviewer-wrapper model-viewer { border-radius: 12px; }', subtitle: '#model' + postId, pro: true },
			],
		},
		preview,
	];
}

const preview = { id: 'preview', title: 'Preview', icon: 'fas fa-eye', fields: [{ type: 'callback', id: '' }] };

/** Global defaults the Pro meta box reads from Settings (ViewerPro::bpmeta_isset on _bp3d_settings_). */
function globals(s = {}) {
	const pick = (k, def, sub) => (s[k] != null && typeof s[k] === 'object' && sub ? s[k][sub] ?? def : s[k] ?? def);
	const on = (v) => (v === true || v === '1' || v === 1 ? '1' : v === false || v === '0' || v === '' ? '0' : v);
	return {
		autoplay: on(pick('bpp_3d_autoplay', false)),
		camera: on(pick('bpp_camera_control', true)),
		zooming: on(pick('bpp_3d_zooming', true)),
		loading: pick('bpp_3d_loading', 'auto'),
		shadow: String(pick('3dp_shadow_intensity', '1')),
		rotate: on(pick('bpp_3d_rotate', false)),
		speed: String(pick('3dp_rotate_speed', '30')),
		delay: String(pick('3dp_rotate_delay', '3000')),
		fullscreen: on(pick('bpp_3d_fullscreen', '1')),
		progressbar: on(pick('bpp_3d_progressbar', true)),
		width: { width: pick('bpp_3d_width', '100', 'width'), unit: pick('bpp_3d_width', '%', 'unit') },
		height: { height: pick('bpp_3d_height', '320', 'height'), unit: pick('bpp_3d_height', 'px', 'unit') },
		bg: pick('bpp_model_bg', 'transparent'),
	};
}

/** inc/Field/ViewerPro.php (Modern): Model, Settings, Elements, Style, Preview. */
function proSections(postId, settings, products) {
	const g = globals(settings);
	const single = ['bp_3d_model_type|currentViewer', '==|==', 'msimple|modelViewer', 'all'];
	const env = { '': 'Neutral', legacy: 'Legacy', custom: 'Custom image' };
	const tone = { '': 'Default', neutral: 'Neutral', aces: 'ACES', agx: 'agX' };
	const realSize = (dependency, subtitle) => ({
		id: 'real_size',
		type: 'fieldset',
		title: 'Real Size (Optional)',
		subtitle,
		desc: "Type the product's real size if the 3D file was exported at the wrong scale. Fill one axis and the others scale to match; leave all three empty to use the size measured from the file. Changes the labels only - it does not resize the model or its size in AR.",
		fields: [
			{ id: 'width', type: 'number', title: 'Width' },
			{ id: 'height', type: 'number', title: 'Height' },
			{ id: 'depth', type: 'number', title: 'Depth' },
		],
		dependency,
	});
	const visualEditor = (title, extra) => ({ id: 'invalid', type: 'content', title, render: OpenVisualEditor, ...extra });
	return [
		{
			id: 'model',
			title: 'Model',
			icon: 'fa fa-cube',
			layout: 'cards',
			fields: [
				{ id: 'currentViewer', icon: 'layers', option_meta: VIEWER_MODES, layout: 'mode-grid', type: 'button_set', title: 'Viewer', subtitle: 'Choose Viewer', desc: 'The Lite Viewer prioritizes .glb and .glTF files with robust features, while the Advanced Viewer, supporting .obj, .3ds, .stl, .ply, .gltf, .off, .3dm, .fbx, .dae, .wrl, .3mf, .amf, .ifc, .brep, .step, .iges, .fcstd, .bim  file types, has a more streamlined functionality.', options: { modelViewer: 'Lite', O3DViewer: 'Advanced' }, default: 'modelViewer' },
				{ id: 'bp_3d_model_type', icon: 'box', type: 'button_set', title: 'Model Type', subtitle: 'Choose Model Type', desc: 'Select Model Type, Default- Simple.', options: { msimple: 'simple', mcycle: 'Cycle' }, default: ['msimple'] },
				{ id: 'bp_3d_source', icon: 'link', type: 'upload', library: 'model', title: '3D Source', subtitle: 'Upload a model or paste its URL', desc: 'Specifies the URL of the 3D model file to be displayed in the viewer.', placeholder: 'Paste a model URL or upload a file', button_title: 'Upload Source', default: '', dependency: ['bp_3d_model_type', '==', 'msimple'] },
				{
					id: 'bp_3d_models',
					icon: 'box',
					type: 'group',
					title: '3D Cycle Models',
					subtitle: 'Cycling between 3D Models',
					button_title: 'Add New Model',
					desc: 'Use Multiple Model in a row.',
					fields: [
						{ id: 'model_link', type: 'upload', library: 'model', title: '3D Source', subtitle: 'Upload Model Or Input Valid Model url', desc: 'Specifies the URL of the 3D model file to be displayed in the viewer.', placeholder: 'You Can Paste here Model url' },
						{ id: 'poster_src', type: 'upload', library: 'image', title: '3D Poster', subtitle: 'Upload Poster Or Input Valid poster/image URL', desc: "Shown while the 3D model loads, in either viewer. Also used as the mobile image when 'On Mobile Devices' is set to show an image.", placeholder: 'You Can Paste here Poster/image URL' },
						{ id: 'model-viewer-note', type: 'submessage', style: 'warning', render: LiteOnlyNote },
						{ id: 'environment_preset', type: 'select', title: 'Environment Preset', subtitle: 'Built-in lighting used when no Environment Image is set', options: env, default: 'custom' },
						{ id: 'environment_image_src', type: 'upload', library: 'image', title: 'Environment Image', subtitle: 'Upload Image Or Input Valid Image URL', desc: 'Sets an environment image to improve lighting and reflections on the model.', placeholder: 'You Can Paste here Image/image URL', dependency: ['environment_preset', '==', 'custom'] },
						{ id: 'use_environment_as_skybox', type: 'switcher', title: 'Use Environment as Skybox', desc: 'Paints the environment image behind the model instead of using a separate skybox image.', ...yes, default: false },
						{ id: 'skybox_image_src', type: 'upload', library: 'image', title: 'Skybox Image', subtitle: 'Upload Image Or Input Valid image URL', desc: 'Sets a skybox image that appears as the background and provides environmental lighting for the model.', placeholder: 'You Can Paste here image URL', dependency: ['use_environment_as_skybox', '!=', '1'] },
						{ id: 'skybox_height', type: 'text', title: 'Skybox Height', subtitle: 'Camera height inside the skybox, e.g. 1.6m', placeholder: '0m', default: '' },
						{ id: 'tone_mapping', type: 'select', title: 'Tone Mapping', options: tone, default: '' },
						{ id: 'exposure', type: 'slider', min: 0.1, max: 10, step: 0.1, title: 'Exposure', subtitle: 'Brightness for Model', desc: 'Adjusts the brightness of the model scene. Higher values make the model brighter.', default: 1, dependency: LITE },
						{ id: 'enable_ar', type: 'switcher', title: 'Enable AR', ...yes, subtitle: 'Enable AR (Augmented Reality)', desc: 'Enables AR (Augmented Reality) so visitors can view the 3D model in their real environment on supported devices.' },
						{ id: 'model_iso_src', type: 'upload', library: 'model', title: '3D Source for iOS (Optional)', subtitle: 'Upload Model Or Input Valid Model url', desc: 'Specifies the iOS-specific model file (.usdz) used for viewing the 3D model in AR on Apple devices.', placeholder: 'You Can Paste here Model url', dependency: ['enable_ar', '==', '1'] },
						{ id: 'ar_placement', type: 'button_set', title: 'AR Placement', subtitle: 'AR Placement', desc: "Defines how the model is placed in AR. Choose 'floor' to place the model on the ground or 'wall' to attach it to a vertical surface.", options: { floor: 'Floor', wall: 'Wall' }, default: 'floor', dependency: ['enable_ar', '==', '1'] },
						{ id: 'ar_mode', type: 'button_set', title: 'AR Mode', subtitle: 'AR Mode', desc: "Selects the AR viewing mode. 'Quick Look' is used for iOS devices, while other modes enable AR on supported Android devices.", options: { webxr: 'WebXR', 'scene-viewer': 'Scene Viewer', 'quick-look': 'Quick Look' }, default: 'webxr', dependency: ['enable_ar', '==', '1'] },
						realSize(['currentViewer|bp_3d_dimensions_mode', '==|!=', 'modelViewer|off', 'all'], 'Only if this 3D file was exported at the wrong scale'),
						{ id: 'hotspots', type: 'group', title: 'Hotspots/Annotations', desc: 'Adds interactive hotspots to the model for displaying information or actions.', fields: hotspotFields(false, products) },
						{ id: 'initial_view', type: 'text', title: 'Initial View', desc: 'Paste the Initial View JSON data copied from the Visual editor. Initial View allow you to set the initial view of your 3D model.', placeholder: 'Paste here Initial View JSON data', default: '[]' },
						visualEditor('Use the Visual Editor to add and position hotspots on your 3D model in a visual interface'),
					],
					dependency: ['bp_3d_model_type', '==', 'mcycle'],
				},
				{ id: 'bp_3d_poster', icon: 'image', type: 'media', library: 'image', button_title: 'Upload Poster', url_input: true, title: '3D Poster Image', subtitle: 'Display a poster until loaded', desc: "Shown while the 3D model loads, in either viewer. Also used as the mobile image when 'On Mobile Devices' is set to show an image.", dependency: ['bp_3d_model_type', '==', 'msimple', 'all'] },
				{ id: 'initial_view', icon: 'camera', type: 'text', title: 'Initial View', desc: 'Defines the initial camera angle and orientation of the model when the viewer first loads. Paste the Initial View JSON data copied from the Visual editor. Initial View allow you to set the initial view of your 3D model.', placeholder: 'Paste here Initial View JSON data', default: '[]', dependency: single },
				visualEditor('Use the Visual Editor to add hotspots or set initial view on your 3D model in a visual interface', { icon: 'external-link', dependency: ['bp_3d_model_type|currentViewer', '==|==', 'msimple|modelViewer'] }),
				{
					id: 'bp3d_group_hotspots',
					type: 'field_group',
					title: 'Hotspots',
					icon: 'info',
					collapsed: true,
					fields: [
						{ id: 'hotspots', icon: 'info', type: 'group', title: 'Hotspots', desc: 'Adds interactive hotspots to the model for displaying information or actions.', dependency: single, fields: hotspotFields(true, products) },
						{ id: 'hotspot_style', icon: 'palette', title: 'Default Hotspot Style', desc: 'The starting look for every hotspot on this viewer. Any hotspot can override it with its own Display and Pin Icon.', type: 'button_set', options: { 'style-1': 'Simple Tag (Text Only)', 'style-2': 'Always Visible Card', 'style-3': 'Hover Popup Card', 'style-4': 'Minimal Icon Badge' }, default: 'style-1', dependency: single },
						...pinStyleFields(single),
					],
				},
				{ id: 'bp_3d_posters', icon: 'image', type: 'group', title: 'Poster Images', deprecated: true, button_title: 'Add New Poster Images', desc: "Use multiple images for poster image.if you don't want to use just leave it empty", fields: [{ id: 'poster_img', type: 'upload', library: 'image', title: 'Poster Image' }], dependency: ['bp_3d_model_type', '==', 'mcycle', 'all'] },
				{
					id: 'bp3d_group_lighting',
					type: 'field_group',
					title: 'Lighting & Environment',
					icon: 'sun',
					collapsed: true,
					fields: [
						{ id: 'bp_3d_environment_preset', icon: 'sun', type: 'select', title: 'Environment Preset', subtitle: 'Built-in lighting used when no Environment Image is set', desc: "Uses one of the viewer's built-in lighting environments. Ignored when an Environment Image is uploaded below.", options: env, default: 'custom', dependency: single },
						{ id: 'bp_3d_environment_image', icon: 'image', type: 'upload', library: 'image', button_title: 'Upload', title: 'Environment Image', desc: 'Sets an environment image to improve lighting and reflections on the model.', dependency: ['bp_3d_model_type|currentViewer|bp_3d_environment_preset', '==|==|==', 'msimple|modelViewer|custom', 'all'] },
						{ id: 'bp_3d_use_environment_as_skybox', icon: 'sun', type: 'switcher', title: 'Use Environment as Skybox', subtitle: 'Show the environment image as the background', desc: 'Paints the environment image behind the model instead of using a separate skybox image.', ...yes, default: false, dependency: single },
						{ id: 'bp_3d_skybox_image', icon: 'image', type: 'upload', library: 'image', button_title: 'Upload', title: 'HDR Skybox Image', desc: 'Sets a skybox image that appears as the background and provides environmental lighting for the model.', dependency: ['bp_3d_model_type|currentViewer|bp_3d_use_environment_as_skybox', '==|==|!=', 'msimple|modelViewer|1', 'all'] },
						{ id: 'bp_3d_skybox_height', icon: 'maximize-2', type: 'text', title: 'Skybox Height', subtitle: 'Camera height inside the skybox, e.g. 1.6m', desc: 'Raises the camera inside the skybox so the model sits on the ground plane instead of floating. Leave empty for the default.', placeholder: '0m', default: '', dependency: single },
						{ id: 'bp_3d_tone_mapping', icon: 'sliders', type: 'select', title: 'Tone Mapping', subtitle: 'How bright colours are compressed into the display range', desc: "Changes how highlights roll off. 'Default' leaves the viewer's own choice in place.", options: tone, default: '', dependency: single },
						{ id: '3d_shadow_intensity', icon: 'cloud-drizzle', type: 'slider', min: 0, max: 1, step: 0.1, title: 'Shadow Intensity', subtitle: 'Shadow Intensity for Model', desc: 'Controls how dark or light the model’s shadow appears. Higher values create darker, more visible shadows.', default: g.shadow, dependency: LITE },
						{ id: '3d_exposure', icon: 'sun', type: 'slider', min: 0.1, max: 5, step: 0.1, title: 'Exposure', subtitle: 'Brightness for Model', desc: 'Adjusts the brightness of the model scene. Higher values make the model brighter.', default: '1', dependency: ['bp_3d_model_type|currentViewer', '!=|==', 'mcycle|modelViewer', 'all'] },
					],
				},
			],
		},
		{
			id: 'settings',
			title: 'Settings',
			icon: 'fa fa-cog',
			fields: [
				{ id: 'bp_3d_autoplay', icon: 'zap', type: 'switcher', title: 'Autoplay', subtitle: 'Enable or Disable AutoPlay', desc: 'Automatically starts model animation when the viewer loads.', ...yes, default: g.autoplay, dependency: LITE },
				{ id: 'bp_camera_control', icon: 'move', type: 'switcher', title: 'Moving Controls', desc: 'Allows users to rotate, pan, and interact with the model using a mouse or touch input.', ...yes, default: g.camera },
				{ id: 'bp_3d_zooming', icon: 'zoom-in', type: 'switcher', title: 'Enable Zoom', subtitle: 'Enable or Disable Zoom Behaviour', desc: 'Enables zooming in and out of the 3D model using mouse scroll or touch gestures.', ...yes, default: g.zooming, dependency: ['bp_camera_control', '==', '1', 'all'] },
				{ id: 'bp_3d_show_edge', icon: 'diamond', type: 'switcher', title: 'Show Edge', subtitle: 'Outline where surfaces meet', desc: 'Draws outlines on the model where two surfaces meet at a sharp angle.', ...yes, default: false, dependency: ['currentViewer', '==', 'O3DViewer', 'all'] },
				{ id: 'bp_3d_edge_color', icon: 'palette', type: 'color', title: 'Edge Color', desc: 'Colour of the outlines drawn on the model.', default: '#000000', dependency: ['bp_3d_show_edge|currentViewer', '==|==', '1|O3DViewer', 'all'] },
				{ id: 'bp_3d_edge_threshold', icon: 'sliders', type: 'slider', min: 0, max: 90, step: 1, title: 'Edge Threshold', desc: 'Edges are drawn only where two surfaces meet at a sharper angle than this. Lower values show more edges; 0 outlines every triangle.', default: 0, dependency: ['bp_3d_show_edge|currentViewer', '==|==', '1|O3DViewer', 'all'] },
				{ id: 'lockXAxisRotation', icon: 'move', type: 'switcher', title: 'Lock Left-Right Rotation', desc: 'Prevents the model from rotating around the Y axis (left and right). Only one lock works at a time: if both are on, only Lock Up-Down Rotation applies.', ...yes, default: false, dependency: LITE },
				{ id: 'lockYAxisRotation', icon: 'move', type: 'switcher', title: 'Lock Up-Down Rotation', desc: 'Prevents the model from rotating around the X axis (up and down). Only one lock works at a time: if both are on, only Lock Up-Down Rotation applies.', ...yes, default: false, dependency: LITE },
				{ id: '', type: 'notice', style: 'warning', content: "Up-Down and Left-Right rotation can't both be locked. Only Lock Up-Down Rotation applies, so turn one of them off.", dependency: ['lockXAxisRotation|lockYAxisRotation|currentViewer', '==|==|==', '1|1|modelViewer', 'all'] },
				{ id: 'bp_3d_loading', icon: 'loader', type: 'radio', title: 'Loading Type', subtitle: "Choose Loading type, default:  'Auto' ", desc: 'Choose how the 3D model loads on the page. Auto lets the browser decide, Lazy loads the model only when it becomes visible, and Eager loads it immediately.', options: { auto: 'Auto', lazy: 'Lazy', eager: 'Eager' }, default: g.loading, dependency: LITE },
				{ id: 'bp_3d_mobile_image_mode', icon: 'phone', type: 'button_set', title: 'On Mobile Devices', subtitle: 'Show the poster image instead of the 3D model on phones', desc: "Needs a poster image. 'Image, tap to load' shows a View in 3D button; 'Image only' never loads the model on mobile. Saves the model download and rendering on phones. Works with both viewers.", options: { off: 'Load 3D model', tap: 'Image, tap to load', static: 'Image only' }, default: 'off' },
				{ id: 'bp_3d_mobile_tap_label', icon: 'phone', type: 'text', title: 'Tap Button Text', placeholder: 'View in 3D', default: '', dependency: ['bp_3d_mobile_image_mode', '==', 'tap', 'all'] },
				{ id: 'bp_3d_mobile_breakpoint', icon: 'phone', type: 'number', title: 'Mobile Breakpoint', desc: 'Screens up to this width count as mobile. Touch-only devices are judged by their shorter edge, so a phone in landscape still counts.', unit: 'px', default: 768, dependency: ['bp_3d_mobile_image_mode', '!=', 'off', 'all'] },
				{ id: 'bp_3d_mobile_reduce_motion', icon: 'phone', type: 'switcher', title: 'Reduce Motion on Mobile', subtitle: 'Turn off animation and Auto Rotate on phones', desc: 'Turns off the model animation and Auto Rotate on phones, and for visitors whose device asks for reduced motion. Visitors can still rotate and zoom. With Show image only, no model loads on phones, so only the reduced-motion part applies.', ...yes, default: false, dependency: LITE },
				{ id: 'bp_3d_dimensions_mode', icon: 'maximize-2', type: 'button_set', title: 'Show Dimensions', subtitle: 'Real-world width, height and depth lines on the model', desc: "Draws measurement lines around the model with real-world labels. 'Ruler button' hides them behind a button visitors press; 'Always on' shows them from the moment the model loads. Lite Viewer only.", options: { off: 'Off', button: 'Ruler button', always: 'Always on' }, default: 'off', dependency: LITE },
				{ id: 'bp_3d_dimension_unit', icon: 'maximize-2', type: 'select', title: 'Dimension Unit', desc: 'Unit the measurements are shown in. Also the unit the Real Size fields expect.', options: { mm: 'Millimetres (mm)', cm: 'Centimetres (cm)', m: 'Metres (m)', in: 'Inches (in)', ft: 'Feet (ft)' }, default: 'cm', dependency: ['currentViewer|bp_3d_dimensions_mode', '==|!=', 'modelViewer|off', 'all'] },
				{ id: 'bp_3d_dimension_color', icon: 'palette', type: 'color', title: 'Dimension Line Colour', desc: 'Colour of the dimension lines and corner dots. Leave empty for the default.', default: '', dependency: ['currentViewer|bp_3d_dimensions_mode', '==|!=', 'modelViewer|off', 'all'] },
				{ ...realSize(['currentViewer|bp_3d_dimensions_mode|bp_3d_model_type', '==|!=|!=', 'modelViewer|off|mcycle', 'all'], 'Only if the 3D file was exported at the wrong scale'), icon: 'maximize-2' },
				{ id: 'bp_3d_rotate', icon: 'refresh', type: 'switcher', title: 'Auto Rotate', subtitle: 'Enable or Disable Auto Rotation', desc: 'Automatically rotates the 3D model without user interaction. Great for showcasing products.', ...yes, default: g.rotate, dependency: LITE },
				{ id: '3d_rotate_speed', icon: 'refresh', type: 'spinner', title: 'Auto Rotate Speed', subtitle: 'Auto Rotation Speed Per Seconds', desc: 'Controls how fast the model rotates automatically. Higher values mean faster rotation.', min: 0, max: 180, default: g.speed, dependency: ['bp_3d_rotate|currentViewer', '==|==', '1|modelViewer', 'all'] },
				{ id: '3d_rotate_delay', icon: 'refresh', type: 'number', title: 'Auto Rotation Delay (ms)', subtitle: 'After a period of time auto rotation will start', desc: 'Sets the delay time before automatic rotation starts after the model loads or after user interaction stops.', default: g.delay, dependency: ['bp_3d_rotate|currentViewer', '==|==', '1|modelViewer', 'all'] },
				{ id: '3d_zoom_level', icon: 'zoom-in', type: 'spinner', title: 'Zoom Level', desc: 'Controls the zoom level of the model. Higher values mean closer zoom.', min: 0.5, max: 5, default: 1, dependency: LITE },
			],
		},
		{
			id: 'elements',
			title: 'Elements',
			icon: 'fa fa-sliders',
			fields: [
				{ id: 'show_thumbs', icon: 'grid', type: 'switcher', title: 'Show Thumbnail List', desc: 'Displays pagination thumbnails when multiple models are available.', ...yes, default: false, dependency: ['bp_3d_model_type', '==', 'mcycle', 'all'] },
				{ id: 'show_arrows', icon: 'move', type: 'switcher', title: 'Show Arrows', desc: 'Shows navigation controls for switching between multiple models.', ...yes, default: true, dependency: ['bp_3d_model_type', '==', 'mcycle', 'all'] },
				{ id: 'bp_3d_enable_ar', icon: 'phone', type: 'switcher', title: 'Enable AR', desc: 'Enables AR (Augmented Reality) so visitors can view the 3D model in their real environment on supported devices.', ...yes, default: false, dependency: ['currentViewer|bp_3d_model_type', '==|!=', 'modelViewer|mcycle', 'all'] },
				{ id: 'model_iso_src', icon: 'phone', type: 'upload', library: 'model', title: '3D Source for iOS (Optional)', subtitle: 'Upload Model Or Input Valid Model url', desc: 'Specifies the iOS-specific model file (.usdz) used for viewing the 3D model in AR on Apple devices.', placeholder: 'You Can Paste here Model url', dependency: ['bp_3d_enable_ar|currentViewer|bp_3d_model_type', '==|==|!=', '1|modelViewer|mcycle', 'all'] },
				{ id: 'ar_placement', icon: 'phone', type: 'button_set', title: 'AR Placement', desc: "Defines how the model is placed in AR. Choose 'floor' to place the model on the ground or 'wall' to attach it to a vertical surface.", options: { floor: 'Floor', wall: 'Wall' }, default: 'floor', dependency: ['bp_3d_enable_ar|currentViewer|bp_3d_model_type', '==|==|!=', '1|modelViewer|mcycle', 'all'] },
				{ id: 'ar_mode', icon: 'phone', type: 'button_set', title: 'AR Mode', desc: "Selects the AR viewing mode. 'Quick Look' is used for iOS devices, while other modes enable AR on supported Android devices.", options: { webxr: 'WebXR', 'scene-viewer': 'Scene Viewer', 'quick-look': 'Quick Look' }, default: 'webxr', dependency: ['bp_3d_enable_ar|currentViewer|bp_3d_model_type', '==|==|!=', '1|modelViewer|mcycle', 'all'] },
				{ id: 'bp_3d_fullscreen', icon: 'maximize', type: 'switcher', title: 'Fullscreen', subtitle: 'Enable or Disable Fullscreen Mode', desc: 'Shows a fullscreen button so users can view the model in fullscreen mode.', ...yes, default: g.fullscreen },
				{ id: 'bp_3d_zoom_in_out_btn', icon: 'zoom-out', type: 'switcher', title: 'Show Zoom In/Out Button', subtitle: 'Moving Controls and Enable Zoom must both be on for this to work', desc: 'Displays zoom in and zoom out buttons on the viewer interface.', ...yes, default: false, dependency: ['bp_camera_control|bp_3d_zooming', '==|==', '1|1', 'all'] },
				{ id: 'bp_3d_camera_btn', icon: 'camera', type: 'switcher', title: 'Camera/Capture Button', subtitle: 'Enable or Disable Camera/Capture Button', desc: 'Displays a camera button that lets users capture the current view of the model.', ...yes, default: false, dependency: LITE },
				{ id: 'bp_3d_download_btn', icon: 'download', type: 'switcher', title: 'Download Button', subtitle: 'Enable or Disable Download Button', desc: 'Displays a button that lets visitors download the 3D model file.', ...yes, default: false },
				{ id: 'bp_3d_reset_view_btn', icon: 'reset', type: 'switcher', title: 'Show Reset View Button', subtitle: 'Enable or Disable Reset View Button', desc: 'Displays a reset view button on the viewer interface to restore initial camera angle and target.', ...yes, default: false, dependency: LITE },
				...controlFields(),
				{ id: 'bp_3d_progressbar', icon: 'sliders', type: 'switcher', title: 'Progressbar', subtitle: 'Show/Hide Progressbar', desc: 'Displays a progress bar during model loading to indicate loading status.', ...yes, default: g.progressbar, dependency: LITE },
				{ id: 'bp_model_progress_percent', icon: 'loader', type: 'switcher', title: 'Show Progress Percent', desc: 'Shows the loading percentage while the 3D model is being loaded.', ...yes, dependency: LITE },
				{ id: 'bp_3d_variant', icon: 'palette', type: 'switcher', title: 'Enable Variant Selector', subtitle: 'Let visitors switch between the material variants in the file', desc: 'Shows a dropdown of the KHR_materials_variants defined in the model. Nothing appears if the file has none.', ...yes, default: false, dependency: LITE },
				{ id: 'bp_3d_animation', icon: 'zap', type: 'switcher', title: 'Enable Animation Selector', subtitle: 'Let visitors switch between the animations in the file', desc: 'Shows a dropdown of the animations defined in the model. Nothing appears if the file has none.', ...yes, default: false, dependency: LITE },
				{ id: 'bp_3d_selected_animation', icon: 'zap', type: 'text', title: 'Default Animation', desc: 'The animation selected when the viewer loads. It plays at once if Autoplay is on.', default: '', dependency: ['bp_3d_animation|currentViewer', '==|==', '1|modelViewer', 'all'] },
				{ id: '', type: 'notice', style: 'warning', content: 'Autoplay is off, so no animation plays when the page loads. Visitors start one from the Animations menu. Turn on Autoplay (Settings tab) to play it on load.', dependency: ['bp_3d_animation|currentViewer|bp_3d_autoplay', '==|==|!=', '1|modelViewer|1', 'all'] },
			],
		},
		{
			id: 'style',
			title: 'Style',
			icon: 'fa fa-paint-brush',
			fields: [
				{ id: 'bp_3d_width', icon: 'move', type: 'bp3d_responsive_dimensions', axis: 'width', title: 'Width', desc: 'Sets the width of the 3D viewer. Use % for a width that follows its container, or a fixed unit such as px.', default: g.width },
				{ id: 'bp_3d_height', icon: 'maximize-2', type: 'bp3d_responsive_dimensions', axis: 'height', title: 'Height', desc: 'Sets the height of the 3D viewer. Adjust this to control how much vertical space the model occupies.', units: ['px', 'em', 'pt'], default: g.height },
				{ id: 'bp_3d_align', icon: 'grid', title: 'Align', desc: 'Controls the alignment of the 3D viewer within its container, such as left, center, or right.', type: 'button_set', options: { start: 'Left', center: 'Center', end: 'Right' }, default: 'center' },
				{ id: 'bp_model_bg', icon: 'palette', type: 'color', title: 'Background Color', subtitle: "Set Background Color For 3d Model.If You don't need just leave blank. Default : 'transparent color'", desc: 'Sets the background color of the 3D viewer. Use transparent or any valid CSS color value.', default: g.bg },
				{ id: 'bp_model_bg_image', icon: 'image', type: 'upload', library: 'image', button_title: 'Upload', title: 'Background Image', subtitle: 'Overrides the background colour when set', desc: 'Shown behind the model. A skybox, or an environment image used as the skybox, covers it.', dependency: LITE },
				{ id: 'bp_3d_thumb_size', icon: 'grid', type: 'text', title: 'Thumb Size', subtitle: 'Size of each thumbnail in the model list, e.g. 70px', desc: 'Applies to the thumbnail list shown with multiple models.', placeholder: '70px', default: '70px', dependency: ['bp_3d_model_type', '==', 'mcycle', 'all'] },
				{ id: 'bp_model_progressbar_color', icon: 'palette', type: 'color', title: 'Progressbar Color', subtitle: 'Set Progressbar Color For 3d Model.', desc: 'Changes the color of the loading progress bar shown while the model is loading.', default: 'rgba(0, 0, 0, 0.4)', dependency: ['currentViewer|bp_3d_progressbar', '==|==', 'modelViewer|1', 'all'] },
				{
					id: 'bp3d_group_controls',
					type: 'field_group',
					title: 'Controls',
					icon: 'sliders',
					collapsed: false,
					fields: [
						{ id: 'bp_3d_control_size', icon: 'maximize-2', type: 'number', title: 'Control Size (px)', desc: 'Width and height of each control button. Inline labels keep this height and grow sideways.', default: 35, attributes: { min: 24, max: 64, step: 1 } },
						{ id: 'bp_3d_control_gap', icon: 'sliders', type: 'number', title: 'Control Spacing (px)', desc: 'Space between controls stacked in the same corner.', default: 10, attributes: { min: 0, max: 40, step: 1 } },
						{ id: 'bp_3d_control_offset', icon: 'move', type: 'number', title: 'Control Edge Offset (px)', desc: 'Distance from the viewer edge to the controls.', default: 10, attributes: { min: 0, max: 60, step: 1 } },
					],
				},
				{ id: 'css', icon: 'code', type: 'code_editor', title: 'CSS Editor (use this ID below as wrapper selector)', desc: 'Write full CSS rules with a selector, or they have no effect. Give the viewer an ID below and target it, for example: #my-viewer model-viewer { border-radius: 12px; }', subtitle: '#model' + postId },
				{ id: 'additional_id', icon: 'code', type: 'text', title: 'Additional ID', desc: 'Adds a custom HTML ID to the 3D viewer wrapper. Useful for targeting the viewer with CSS or JavaScript.', subtitle: ' ', default: '' },
				{ id: 'additional_class', icon: 'code', type: 'text', title: 'Additional Class', desc: 'Adds custom CSS class names to the 3D viewer wrapper for advanced styling or scripting.', subtitle: ' ', default: '' },
			],
		},
		preview,
	];
}

// Display-only content the schemas print as HTML; set by the editor (it owns the routing and markup).
export const display = { upgrade: null, visualEditor: null, liteOnly: null };
function OpenVisualEditor() {
	return display.visualEditor ? display.visualEditor() : null;
}
function LiteOnlyNote() {
	return display.liteOnly ? display.liteOnly() : null;
}

/** The meta box schema for the plan the demo runs: { sections }. */
export function viewerSchema({ pro, postId, settings, products = [] }) {
	return pro ? proSections(postId, settings, products) : freeSections(postId);
}

// ── Stored row helpers ─────────────────────────────────────────────────────

/** A saved row as Pro writes it for a new post: every field at its default (the merged source is form-only). */
export function metaDefaults(settings) {
	const { bp_3d_source, ...out } = defaultsOf(proSections('0', settings, []).flatMap((s) => s.fields));
	return out;
}

export const emptyMedia = () => ({ url: '', id: '', width: '', height: '', thumbnail: '', alt: '', title: '', description: '' });

/** ModelSource::resolve(): the model URL the shortcode renders, from the three stored keys. */
export function resolveSource(row) {
	if (!row || typeof row !== 'object') return '';
	const type = row.bp_3d_src_type || 'upload';
	if (type === 'upload' || (Array.isArray(type) && type[0] === 'upload')) return typeof row.bp_3d_src?.url === 'string' ? row.bp_3d_src.url : '';
	return typeof row.bp_3d_src_link === 'string' ? row.bp_3d_src_link : '';
}

/** ModelSource::isLibraryUrl(): the site's own uploads (and files added in this tab). */
export const isLibraryUrl = (url) => /^blob:/.test(url) || String(url).trim().replace(/^https?:/i, '').startsWith(UPLOADS.replace(/^https?:/, ''));

/** ModelSource::writeThrough(): the form-only `bp_3d_source` back into bp_3d_src_type / bp_3d_src / bp_3d_src_link. */
export function writeThrough(data, old, licensed) {
	if (!('bp_3d_source' in data)) return data;
	const posted = String(data.bp_3d_source ?? '').trim();
	const { bp_3d_source, ...out } = data;
	if (posted === '' || posted === resolveSource(old).trim()) {
		if (!['bp_3d_src_type', 'bp_3d_src', 'bp_3d_src_link'].some((k) => k in old)) Object.assign(out, { bp_3d_src_type: 'upload', bp_3d_src: emptyMedia(), bp_3d_src_link: '' });
		return out;
	}
	if (!licensed && !isLibraryUrl(posted)) return out;
	const library = isLibraryUrl(posted);
	const src = old.bp_3d_src?.url === posted ? old.bp_3d_src : { ...emptyMedia(), url: posted, id: library ? String(900 + posted.length) : '' };
	return { ...out, bp_3d_src_type: library ? 'upload' : 'link', bp_3d_src: src, bp_3d_src_link: posted };
}

// ── Meta → viewer attributes (Shortcode::getCommonAttributes + ShortcodePro::renderModelViewer) ──

const isOn = (v) => ['1', 1, true, 'true', 'yes'].includes(v);
const CSS_UNITS = ['px', '%', 'em', 'rem', 'vw', 'vh', 'pt'];

function accessor(meta) {
	const row = meta && typeof meta === 'object' ? meta : {};
	return (key, def = null, bool = false, key2 = null) => {
		let v = key2 ? row[key]?.[key2] : row[key];
		if (v === undefined || v === null) v = def;
		if (Array.isArray(v) && !key2 && typeof v[0] === 'string' && v.length === 1) v = v[0];
		return bool ? isOn(v) : v;
	};
}

const sizeNumber = (n) => (n === '' || n == null || Number.isNaN(Number(n)) || Number(n) < 0 ? '' : String(n).trim());
const cssLength = (n, unit) => (sizeNumber(n) === '' ? '' : sizeNumber(n) + (CSS_UNITS.includes(unit) ? unit : 'px'));

/** Shortcode::responsiveSize(): the flat desktop string, per device once tablet or mobile has its own. */
function responsiveSize(m, key, axis, number, unit) {
	const desktop = m(key, number, false, axis) + m(key, unit, false, 'unit');
	const dev = (d) => {
		const v = m(key, null, false, d);
		return v && typeof v === 'object' ? cssLength(v[axis], v.unit) : '';
	};
	const tablet = dev('tablet');
	const mobile = dev('mobile');
	if (tablet === '' && mobile === '') return desktop;
	const t = tablet || desktop;
	return { desktop, tablet: t, mobile: mobile || t };
}

const environmentImage = (image, preset) => (preset === 'legacy' ? 'legacy' : preset === '' ? '' : typeof image === 'string' ? image.trim() : '');

function realSize(fs) {
	if (!fs || typeof fs !== 'object') return {};
	const out = {};
	for (const axis of ['width', 'height', 'depth']) {
		const v = fs[axis];
		if (v !== '' && v != null && !Number.isNaN(Number(v)) && Number(v) > 0) out[axis] = Number(v);
	}
	return out;
}

const parseView = (text) => {
	try {
		const v = JSON.parse(text || '[]');
		return v && !Array.isArray(v) && typeof v === 'object' ? v : null;
	} catch {
		return null;
	}
};

const hotspots = (rows) => (Array.isArray(rows) ? rows.filter((r) => r && typeof r === 'object').map((r) => ({ ...r, openInNewTab: isOn(r.openInNewTab) })) : []);

const pinColor = (v, fb) => (typeof v === 'string' && /^(#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgb|hsl)a?\([0-9a-z.,%\s/+-]+\))$/i.test(v.trim()) ? v.trim() : fb);
const clampInt = (v, lo, hi, fb) => (v === '' || v == null || Number.isNaN(Number(v)) ? fb : Math.max(lo, Math.min(hi, Math.round(Number(v)))));

function controls(m) {
	const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'left-center', 'right-center'];
	const labels = m('bp_3d_control_labels', '');
	const text = {};
	for (const k of CONTROL_TEXT_KEYS) {
		const v = m('bp_3d_control_text_' + k, '');
		if (typeof v === 'string' && v.trim()) text[k] = v.trim();
	}
	const corner = {};
	for (const k of CONTROL_KEYS) {
		const v = m('bp_3d_control_corner_' + k, '');
		corner[k] = corners.includes(v) ? v : CORNER_DEFAULTS[k];
	}
	return {
		labels: ['off', 'tooltip', 'inline'].includes(labels) ? labels : 'off',
		text,
		corner,
		order: CONTROL_KEYS,
		size: clampInt(m('bp_3d_control_size', ''), 24, 64, 35),
		gap: clampInt(m('bp_3d_control_gap', ''), 0, 40, 10),
		offset: clampInt(m('bp_3d_control_offset', ''), 0, 60, 10),
	};
}

/** The viewer attributes a Modern / Classic post renders with, from its _bp3dimages_ row. */
export function metaToAttrs(meta, id) {
	const m = accessor(meta);
	const srcType = m('bp_3d_src_type') || 'upload';
	const modelUrl = srcType === 'upload' ? m('bp_3d_src', '', false, 'url') || '' : m('bp_3d_src_link') || '';
	const posters = m('bp_3d_posters');
	const models = (Array.isArray(m('bp_3d_models', [])) ? m('bp_3d_models', []) : [])
		.filter((r) => r && typeof r === 'object')
		.map((r, i) => ({
			modelUrl: r.model_link || '',
			useDecoder: 'none',
			poster: Array.isArray(posters) && posters[i]?.poster_img ? posters[i].poster_img : r.poster_src || '',
			skyboxImage: r.skybox_image_src || '',
			skyboxHeight: r.skybox_height || '',
			environmentImage: environmentImage(r.environment_image_src || '', r.environment_preset ?? 'custom'),
			useEnvironmentAsSkybox: isOn(r.use_environment_as_skybox),
			toneMapping: r.tone_mapping || '',
			arEnabled: isOn(r.enable_ar),
			arPlacement: r.ar_placement || 'floor',
			arMode: r.ar_mode || 'webxr scene-viewer quick-look',
			modelISOSrc: r.model_iso_src || '',
			exposure: r.exposure ?? '1.0',
			initialView: parseView(r.initial_view),
			hotspots: hotspots(r.hotspots),
			realSize: realSize(r.real_size),
		}));
	const multiple = m('bp_3d_model_type', 'msimple') !== 'msimple';
	const single = {
		modelUrl,
		poster: m('bp_3d_poster', '', false, 'url') || '',
		skyboxImage: m('bp_3d_skybox_image') || '',
		skyboxHeight: m('bp_3d_skybox_height', ''),
		arEnabled: m('bp_3d_enable_ar', '0', true),
		arMode: m('ar_mode', 'webxr scene-viewer quick-look'),
		arPlacement: m('ar_placement', 'floor'),
		modelISOSrc: m('model_iso_src') || '',
		initialView: parseView(m('initial_view')),
		hotspots: hotspots(m('hotspots', [])),
		realSize: realSize(m('real_size')),
	};
	const ensureBool = (k, def) => m(k, def, true);
	return {
		model: multiple && models.length ? models[0] : single,
		models: multiple ? models : [],
		align: m('bp_3d_align', 'center'),
		uniqueId: 'model' + id,
		currentViewer: m('currentViewer', 'modelViewer'),
		multiple,
		O3DVSettings: {
			isFullscreen: ensureBool('bp_3d_fullscreen', '1'),
			isPagination: ensureBool('show_thumbs', '0'),
			isNavigation: ensureBool('show_arrows', '0'),
			camera: null,
			mouseControl: ensureBool('bp_camera_control', '1'),
			zoom: ensureBool('bp_3d_zooming', '1'),
			showEdge: ensureBool('bp_3d_show_edge', '0'),
			edgeColor: m('bp_3d_edge_color', '') || '#000000',
			edgeThreshold: Number(m('bp_3d_edge_threshold', '')) || 0,
		},
		environmentImage: environmentImage(m('bp_3d_environment_image', ''), m('bp_3d_environment_preset', 'custom')),
		useEnvironmentAsSkybox: ensureBool('bp_3d_use_environment_as_skybox', '0'),
		toneMapping: m('bp_3d_tone_mapping', ''),
		lazyLoad: m('bp_3d_loading', 'lazy'),
		loading: m('bp_3d_loading'),
		autoplay: ensureBool('bp_3d_autoplay', '0'),
		shadow: Number(m('3d_shadow_intensity', '1')),
		autoRotate: ensureBool('bp_3d_rotate', '0'),
		zoomLevel: m('3d_zoom_level'),
		zoom: ensureBool('bp_3d_zooming', '1'),
		isPagination: ensureBool('show_thumbs', '0'),
		isNavigation: ensureBool('show_arrows', '0'),
		hotspotStyle: m('hotspot_style', 'style-1'),
		pins: { size: clampInt(m('bp_3d_pin_size', ''), 16, 64, 28), color: pinColor(m('bp_3d_pin_color', ''), '#15171a'), background: pinColor(m('bp_3d_pin_background', ''), '#ffffff') },
		preload: 'auto',
		rotationPerSecond: m('3d_rotate_speed'),
		mouseControl: ensureBool('bp_camera_control', '1'),
		lockXAxisRotation: ensureBool('lockXAxisRotation', '0'),
		lockYAxisRotation: ensureBool('lockYAxisRotation', '0'),
		fullscreen: ensureBool('bp_3d_fullscreen', '1'),
		zoomInOutBtn: ensureBool('bp_3d_zoom_in_out_btn', '0'),
		cameraBtn: ensureBool('bp_3d_camera_btn', '0'),
		downloadBtn: ensureBool('bp_3d_download_btn', '0'),
		resetViewBtn: ensureBool('bp_3d_reset_view_btn', '0'),
		variant: ensureBool('bp_3d_variant', '0'),
		loadingPercentage: ensureBool('bp_model_progress_percent', '0'),
		progressBar: ensureBool('bp_3d_progressbar', '0'),
		rotate: ensureBool('bp_model_angle', '0'),
		rotateDelay: parseInt(m('3d_rotate_delay', '3000'), 10) || 0,
		rotateAlongX: m('angle_property', '0', false, 'top'),
		rotateAlongY: m('angle_property', '75', false, 'right'),
		exposure: m('3d_exposure'),
		stylesheet: null,
		additional: { ID: m('additional_id') || '', Class: m('additional_class') || '', CSS: m('css') || '' },
		animation: ensureBool('bp_3d_animation', '0'),
		woo: false,
		selectedAnimation: m('bp_3d_selected_animation', ''),
		placement: 'shortcode',
		mobile: {
			imageMode: ['off', 'tap', 'static'].includes(m('bp_3d_mobile_image_mode', 'off')) ? m('bp_3d_mobile_image_mode', 'off') : 'off',
			tapLabel: String(m('bp_3d_mobile_tap_label', '') || ''),
			breakpoint: parseInt(m('bp_3d_mobile_breakpoint', 768), 10) > 0 ? parseInt(m('bp_3d_mobile_breakpoint', 768), 10) : 768,
			reduceMotion: ensureBool('bp_3d_mobile_reduce_motion', '0'),
		},
		dimensions: {
			mode: ['off', 'button', 'always'].includes(m('bp_3d_dimensions_mode', 'off')) ? m('bp_3d_dimensions_mode', 'off') : 'off',
			unit: ['mm', 'cm', 'm', 'in', 'ft'].includes(m('bp_3d_dimension_unit', 'cm')) ? m('bp_3d_dimension_unit', 'cm') : 'cm',
			color: m('bp_3d_dimension_color', '') || '',
		},
		controls: controls(m),
		styles: {
			width: responsiveSize(m, 'bp_3d_width', 'width', '100', '%'),
			height: responsiveSize(m, 'bp_3d_height', 'height', '100', '%'),
			bgColor: m('bp_model_bg'),
			bgImage: m('bp_model_bg_image'),
			progressBarColor: m('bp_model_progressbar_color'),
			thumbSize: m('bp_3d_thumb_size', '') || '70px',
		},
	};
}

/** A viewer post is a block-editor post when it was made there (_bp3d_is_gutenberg); older demo posts without meta were too. */
export const isBlockPost = (v) => (v?.isGutenberg === undefined ? !v?.meta : !!v.isGutenberg);

/** The attributes any screen renders a viewer post with. */
export const attrsOfViewer = (v) => (v && !isBlockPost(v) && v.meta ? metaToAttrs(v.meta, v.id) : v?.attrs || {});
