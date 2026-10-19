// Demo store. Shapes mirror the plugin: wc3d_settings option, product post meta,
// wp_wc3d_product_configs / wp_wc3d_variation_configs rows, wp_wc3d_presets, cart items, orders.
// Mesh names must match js/engine/demo-models.js.
import { seedTemplates, seedPages } from './block-seed.js';
import { DEMO_LOGO } from './decal-logo.js';

export const DEFAULT_PALETTE = '#ffffff, #000000, #64748b, #ef4444, #f97316, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6, #ec4899';

export const DEFAULT_SETTINGS = {
	position: 'replace_image',
	show_listing_icon: true,
	show_listing_viewer: false,
	show_zoom_buttons: false,
	show_reset_button: false,
	show_autorotate_button: false,
	show_download_button: true,
	show_gallery: true,
	background_type: 'transparent',
	background_color: '#ffffff',
	background_image_id: 0,
	loading_trigger: 'click',
	enable_customizer: false,
	customizer_color_palette: DEFAULT_PALETTE,
	delete_data_on_uninstall: false,
};

const META_DEFAULTS = {
	_wc3d_enabled: '',
	_wc3d_model_id: 0,
	_wc3d_poster_id: 0,
	_wc3d_show_on_shop: '',
	_wc3d_position: '',
	_wc3d_background_type: '',
	_wc3d_background_color: '',
	_wc3d_background_image_id: 0,
	_wc3d_loading_trigger: '',
	_wc3d_enable_customizer: '',
	_wc3d_show_gallery: '',
};

function product(p) {
	return {
		status: 'publish',
		type: 'simple',
		variations: [],
		attributes: [],
		...p,
		meta: { ...META_DEFAULTS, ...(p.meta || {}) },
	};
}

export function seed() {
	return {
		// usdz-export: ar_configured is off on old installs; on for the demo.
		settings: { ...DEFAULT_SETTINGS, enable_customizer: true, ar_configured: true },

		// Media library. kind 'model' → demo: key in DEMO_MODELS; 'image' → a flat illustration.
		attachments: {
			501: { id: 501, kind: 'model', demo: 'lounge-chair', title: 'lounge-chair', filename: 'lounge-chair.glb', mime: 'model/gltf-binary', sizeBytes: 2457600 },
			502: { id: 502, kind: 'model', demo: 'table-lamp', title: 'arc-table-lamp', filename: 'arc-table-lamp.glb', mime: 'model/gltf-binary', sizeBytes: 1146880 },
			503: { id: 503, kind: 'model', demo: 'mug', title: 'ceramic-mug', filename: 'ceramic-mug.glb', mime: 'model/gltf-binary', sizeBytes: 491520 },
			504: { id: 504, kind: 'model', demo: 'side-table', title: 'oak-side-table', filename: 'oak-side-table.glb', mime: 'model/gltf-binary', sizeBytes: 870400 },
			505: { id: 505, kind: 'model', demo: 'lounge-chair-wide', title: 'lounge-chair-wide', filename: 'lounge-chair-wide.glb', mime: 'model/gltf-binary', sizeBytes: 2662400 },
			510: { id: 510, kind: 'usdz', title: 'lounge-chair', filename: 'lounge-chair.usdz', mime: 'model/vnd.usdz+zip', sizeBytes: 3145728 },
			601: { id: 601, kind: 'image', title: 'studio-backdrop', filename: 'studio-backdrop.jpg', mime: 'image/jpeg', color: '#e7e1d8' },
			602: { id: 602, kind: 'image', title: 'lamp-poster', filename: 'lamp-poster.png', mime: 'image/png', color: '#f3efe6' },
			// Planned (coverage): an oversized default and variation model, a sofa USDZ, models for the 141–146 demo mix.
			541: { id: 541, kind: 'model', demo: 'lounge-chair-wide', title: 'modular-sofa-hd', filename: 'modular-sofa-hd.glb', mime: 'model/gltf-binary', sizeBytes: 19503513 },
			542: { id: 542, kind: 'model', demo: 'lounge-chair-wide', title: 'modular-sofa-3-seat', filename: 'modular-sofa-3-seat.glb', mime: 'model/gltf-binary', sizeBytes: 23068672 },
			543: { id: 543, kind: 'usdz', title: 'modular-sofa', filename: 'modular-sofa.usdz', mime: 'model/vnd.usdz+zip', sizeBytes: 6396313 },
			544: { id: 544, kind: 'model', demo: 'table-lamp', title: 'pendant-lamp', filename: 'pendant-lamp.glb', mime: 'model/gltf-binary', sizeBytes: 1363148 },
			545: { id: 545, kind: 'model', demo: 'lounge-chair', title: 'velvet-armchair', filename: 'velvet-armchair.glb', mime: 'model/gltf-binary', sizeBytes: 3040870 },
			// Planned (external-url): files hosted on a CDN, not assigned; listed only with the flag on.
			561: { id: 561, kind: 'model', source: 'url', url: 'https://cdn.example.com/models/lounge-chair-teal.glb', demo: 'lounge-chair', title: 'lounge-chair-teal', filename: 'lounge-chair-teal.glb', mime: 'model/gltf-binary', sizeBytes: 2457600, date: '2026-09-30 10:20', check: { status: 'ok', checkedAt: '2026-09-30 10:20', contentType: 'model/gltf-binary', cors: true } },
			562: { id: 562, kind: 'usdz', source: 'url', url: 'https://cdn.example.com/models/lounge-chair.usdz', title: 'lounge-chair', filename: 'lounge-chair.usdz', mime: 'model/vnd.usdz+zip', sizeBytes: 3194880, date: '2026-09-30 10:21', check: { status: 'ok', checkedAt: '2026-09-30 10:21', contentType: 'model/vnd.usdz+zip', cors: null } },
		},

		products: {
			101: product({
				id: 101,
				name: 'Lounge Chair',
				slug: 'lounge-chair',
				type: 'variable',
				price: 449,
				sku: 'LC-100',
				short: 'Solid oak frame with deep, removable cushions. Pick a fabric, then make it yours.',
				description: 'A low lounge chair with a solid oak frame and high-resilience foam cushions. Covers zip off for washing.',
				category: 'Furniture',
				image: { model: 'lounge-chair', bg: '#efe9e1' },
				dateCreated: '2026-09-02 10:12',
				dateModified: '2026-09-28 16:40',
				attributes: [{ name: 'Color', options: ['Sand', 'Charcoal', 'Teal'] }],
				variations: [201, 202, 203],
				meta: { _wc3d_enabled: 'yes', _wc3d_model_id: 501, _wc3d_enable_customizer: 'yes' },
			}),
			102: product({
				id: 102,
				name: 'Arc Table Lamp',
				slug: 'arc-table-lamp',
				price: 129,
				sku: 'AL-200',
				short: 'Brass arm, linen shade, warm dimmable light.',
				description: 'A desk lamp with a tilting linen shade on a brushed brass arm.',
				category: 'Lighting',
				image: { model: 'table-lamp', bg: '#f3efe6' },
				dateCreated: '2026-09-05 09:30',
				dateModified: '2026-09-21 11:05',
				meta: { _wc3d_enabled: 'yes', _wc3d_model_id: 502, _wc3d_poster_id: 602, _wc3d_position: 'modal', _wc3d_show_on_shop: 'yes' },
			}),
			103: product({
				id: 103,
				name: 'Ceramic Mug',
				slug: 'ceramic-mug',
				price: 24,
				sku: 'CM-300',
				short: 'Hand-glazed stoneware, 350 ml.',
				description: 'Stoneware mug with a reactive glaze. Dishwasher safe.',
				category: 'Kitchen',
				image: { model: 'mug', bg: '#eef2f3' },
				dateCreated: '2026-09-10 14:00',
				dateModified: '2026-09-18 08:20',
				meta: { _wc3d_enabled: 'yes', _wc3d_model_id: 503, _wc3d_position: 'gallery_first', _wc3d_loading_trigger: 'eager' },
			}),
			104: product({
				id: 104,
				name: 'Oak Side Table',
				slug: 'oak-side-table',
				type: 'variable',
				price: 189,
				sku: 'ST-400',
				short: 'Round oak top with a lower shelf.',
				description: 'Solid oak side table in two heights.',
				category: 'Furniture',
				image: { model: 'side-table', bg: '#f1ece4' },
				dateCreated: '2026-09-14 12:45',
				dateModified: '2026-09-14 12:45',
				attributes: [{ name: 'Size', options: ['Small', 'Large'] }],
				variations: [204, 205],
				meta: { _wc3d_enabled: 'yes', _wc3d_model_id: 504, _wc3d_position: 'product_tab' },
			}),
			105: product({
				id: 105,
				name: 'Canvas Backpack',
				slug: 'canvas-backpack',
				price: 89,
				sku: 'BP-500',
				short: 'Waxed canvas, 22 L, padded laptop sleeve.',
				description: 'Everyday backpack in waxed cotton canvas.',
				category: 'Bags',
				image: { illustration: 'backpack', bg: '#e9efe6', color: '#5b6b4a' },
				dateCreated: '2026-09-20 17:10',
				dateModified: '2026-09-20 17:10',
				status: 'draft',
			}),
			106: product({
				id: 106,
				name: 'Wool Throw',
				slug: 'wool-throw',
				price: 75,
				sku: 'WT-600',
				short: 'Lambswool, 130 × 180 cm.',
				description: 'A soft lambswool throw with fringed edges.',
				category: 'Textiles',
				image: { illustration: 'throw', bg: '#f4ece9', color: '#b5654a' },
				dateCreated: '2026-09-22 10:00',
				dateModified: '2026-09-22 10:00',
			}),
			// Planned (coverage): a realistic mix for the Coverage tab (oversized, 3D off, draft, no model, no 3D).
			141: product({
				id: 141,
				name: 'Modular Sofa',
				slug: 'modular-sofa',
				type: 'variable',
				price: 1290,
				sku: 'MS-700',
				short: 'Deep seats, feather-wrapped cushions, two or three seats.',
				description: 'A low modular sofa with a kiln-dried hardwood frame.',
				category: 'Furniture',
				image: { model: 'lounge-chair-wide', bg: '#ece7df' },
				dateCreated: '2026-09-24 11:20',
				dateModified: '2026-09-29 09:15',
				attributes: [{ name: 'Seats', options: ['2-seat', '3-seat'] }],
				variations: [241, 242],
				meta: { _wc3d_enabled: 'yes', _wc3d_model_id: 541 },
			}),
			142: product({
				id: 142,
				name: 'Pendant Lamp',
				slug: 'pendant-lamp',
				price: 159,
				sku: 'PL-800',
				short: 'Spun aluminium shade on a braided cord.',
				description: 'A ceiling pendant with a matte spun-aluminium shade.',
				category: 'Lighting',
				image: { model: 'table-lamp', bg: '#eef0ea' },
				dateCreated: '2026-09-25 15:00',
				dateModified: '2026-09-25 15:00',
				meta: { _wc3d_model_id: 544 },
			}),
			143: product({
				id: 143,
				name: 'Velvet Armchair',
				slug: 'velvet-armchair',
				price: 529,
				sku: 'VA-900',
				short: 'Cotton velvet on a solid beech frame.',
				description: 'A compact armchair upholstered in cotton velvet.',
				category: 'Furniture',
				image: { model: 'lounge-chair', bg: '#f2e6ea' },
				dateCreated: '2026-09-26 10:40',
				dateModified: '2026-09-30 17:05',
				status: 'draft',
				meta: { _wc3d_enabled: 'yes', _wc3d_model_id: 545 },
			}),
			144: product({
				id: 144,
				name: 'Linen Cushion',
				slug: 'linen-cushion',
				price: 39,
				sku: 'CU-110',
				short: 'Stonewashed linen, 50 × 50 cm, feather insert.',
				description: 'A square cushion in stonewashed European linen.',
				category: 'Textiles',
				image: { illustration: 'throw', bg: '#eef1f4', color: '#7c8ea3' },
				dateCreated: '2026-09-26 12:00',
				dateModified: '2026-09-26 12:00',
				meta: { _wc3d_enabled: 'yes' },
			}),
			145: product({
				id: 145,
				name: 'Travel Mug',
				slug: 'travel-mug',
				price: 29,
				sku: 'TM-120',
				short: 'Double-walled stoneware with a cork lid.',
				description: 'A 300 ml travel mug in glazed stoneware.',
				category: 'Kitchen',
				image: { model: 'mug', bg: '#eaf0ee' },
				dateCreated: '2026-09-27 09:10',
				dateModified: '2026-09-27 09:10',
			}),
			146: product({
				id: 146,
				name: 'Nesting Side Tables',
				slug: 'nesting-side-tables',
				type: 'variable',
				price: 159,
				sku: 'NT-130',
				short: 'Set of two, the small one slides under the large one.',
				description: 'Two nesting side tables in solid wood.',
				category: 'Furniture',
				image: { model: 'side-table', bg: '#efe9df' },
				dateCreated: '2026-09-27 14:30',
				dateModified: '2026-09-27 14:30',
				attributes: [{ name: 'Finish', options: ['Oak', 'Black'] }],
				variations: [243, 244],
			}),
		},

		variations: {
			201: { id: 201, parentId: 101, attributes: { Color: 'Sand' }, price: 449, sku: 'LC-100-SND', swatch: '#d8c8a8' },
			202: { id: 202, parentId: 101, attributes: { Color: 'Charcoal' }, price: 449, sku: 'LC-100-CHR', swatch: '#3f3f46' },
			203: { id: 203, parentId: 101, attributes: { Color: 'Teal' }, price: 479, sku: 'LC-100-TEL', swatch: '#14746f' },
			204: { id: 204, parentId: 104, attributes: { Size: 'Small' }, price: 189, sku: 'ST-400-S' },
			205: { id: 205, parentId: 104, attributes: { Size: 'Large' }, price: 229, sku: 'ST-400-L' },
			// Planned (coverage)
			241: { id: 241, parentId: 141, attributes: { Seats: '2-seat' }, price: 1290, sku: 'MS-700-2' },
			242: { id: 242, parentId: 141, attributes: { Seats: '3-seat' }, price: 1590, sku: 'MS-700-3' },
			243: { id: 243, parentId: 146, attributes: { Finish: 'Oak' }, price: 159, sku: 'NT-130-OAK' },
			244: { id: 244, parentId: 146, attributes: { Finish: 'Black' }, price: 169, sku: 'NT-130-BLK' },
		},

		// wp_wc3d_product_configs: default scene config per product.
		productConfigs: {
			101: {
				model_id: 501,
				config: {
					schema_version: 1,
					meshes: {
						Seat_Cushion: { customizable: true },
						Back_Cushion: { customizable: true },
						Frame: { customizable: true },
						Pillow: { optional: true },
					},
					materials: {
						Seat_Cushion: { baseColor: '#d8c8a8', roughness: 0.9, metalness: 0 },
						Back_Cushion: { baseColor: '#d8c8a8', roughness: 0.9, metalness: 0 },
						Pillow: { baseColor: '#c2410c', roughness: 0.95 },
					},
					camera: { position: [1.8, 1.15, 2.15], target: [0, 0.38, 0], fov: 40, lock: { pan: false, minPolarAngle: 20, maxPolarAngle: 88 } },
					environment: { preset: 'apartment', intensity: 1, shadowsEnabled: true, shadowIntensity: 0.6, backgroundType: 'transparent' },
					animations: null,
					hotspots: [
						{ id: 'covers', anchor_mesh: 'Seat_Cushion', offset: [0.1, 0.52, 0.25], label: 'Removable covers', icon: 'info', description: 'Every cushion cover zips off and is machine washable at 30°C.' },
						{ id: 'oak', anchor_mesh: 'Armrest_Right', offset: [0.42, 0.6, 0.1], label: 'Solid oak', icon: 'info', description: 'FSC-certified European oak with a hard-wax oil finish.' },
						{ id: 'lamp', anchor_mesh: 'Armrest_Left', offset: [-0.42, 0.6, 0.1], label: 'Reading lamp', icon: 'cart', description: 'The Arc Table Lamp fits beside the armrest.', linked_product_id: 102 },
					],
					optimization: { gpuPerformanceMode: 'default', pixelRatioLimit: 1.5 },
					ar: { enabled: true, usdzId: 510, usdzUrl: 'lounge-chair.usdz', scale: 'fixed' },
					// Planned (decals): personalization areas.
					decals: [
						{
							id: 'monogram',
							label: 'Monogram',
							mesh: 'Pillow',
							placement: { side: 'front', x: 0.5, y: 0.5, width: 0.55, height: 0.42, rotation: 0 },
							kinds: ['text'],
							fonts: ['Georgia', 'Brush Script MT', 'Times New Roman'],
							colors: ['#f5e6c8', '#d4af37', '#1f2937'],
							max_chars: 3,
							min_size: 0.5,
							max_size: 1,
							required: false,
							price: { type: 'fixed', amount: 12 },
						},
						{
							id: 'back-logo',
							label: 'Back logo',
							mesh: 'Back_Cushion',
							placement: { side: 'front', x: 0.27, y: 0.68, width: 0.3, height: 0.42, rotation: 0 },
							kinds: ['image', 'text'],
							fonts: ['Inter', 'Georgia'],
							colors: ['#1f2937', '#ffffff', '#c2410c'],
							max_chars: 14,
							min_size: 0.4,
							max_size: 1,
							required: false,
							price: { type: 'fixed', amount: 25 },
						},
					],
					// Planned: option-pricing (rules on the plain customizer list).
					pricing: {
						parts: {
							Seat_Cushion: { color: { type: 'fixed', amount: 15 } },
							Back_Cushion: { color: { type: 'fixed', amount: 15 } },
							Frame: { color: { type: 'percent', amount: 10 } },
							Pillow: { toggle: { type: 'fixed', amount: -12 } },
						},
						colors: { '#ec4899': { type: 'fixed', amount: 10 }, '#8b5cf6': { type: 'fixed', amount: 10, sale: 5 } },
						custom_color: { type: 'fixed', amount: 25 },
					},
					// Planned: option-groups (replace the plain list when saved).
					options: [
						{
							id: 'frame',
							label: 'Frame finish',
							type: 'material',
							display: 'thumbnail',
							targets: ['Frame', 'Legs', 'Armrest_Left', 'Armrest_Right'],
							required: false,
							default: 'natural',
							description: 'Hard-wax oil on solid oak.',
							choices: [
								// No baseColor: the oak texture stays; `color` is only the swatch.
								{ id: 'natural', label: 'Natural oak', color: '#d8b98f', material: { roughness: 0.55, metalness: 0 } },
								{ id: 'smoked', label: 'Smoked oak', material: { baseColor: '#7a5c43', roughness: 0.5, metalness: 0 }, price: { type: 'fixed', amount: 60 } },
								{ id: 'black', label: 'Black ash', material: { baseColor: '#2e2925', roughness: 0.45, metalness: 0 }, price: { type: 'fixed', amount: 80, sale: 65 } },
								{ id: 'walnut', label: 'Walnut', material: { baseColor: '#5c3b27', roughness: 0.45, metalness: 0 }, price: { type: 'percent', amount: 15 } },
							],
						},
						{
							id: 'pillow',
							label: 'Pillow',
							type: 'parts',
							display: 'button',
							targets: ['Pillow'],
							required: false,
							default: 'with',
							choices: [
								{ id: 'with', label: 'With pillow', show: ['Pillow'] },
								{ id: 'without', label: 'No pillow', show: [], price: { type: 'fixed', amount: -15 } },
							],
						},
						{
							id: 'pillow-fabric',
							label: 'Pillow fabric',
							type: 'color',
							display: 'swatch',
							targets: ['Pillow'],
							required: false,
							// No default: the variation's own pillow colour shows until the shopper picks.
							default: '',
							// Planned: conditional-logic (only with a pillow; Navy velvet only on dark covers).
							conditions: { match: 'all', rules: [{ source: 'group', groupId: 'pillow', op: 'is', choiceId: 'with' }] },
							choices: [
								{ id: 'rust', label: 'Rust', color: '#c2410c' },
								{ id: 'mustard', label: 'Mustard', color: '#d97706' },
								{ id: 'sage', label: 'Sage', color: '#7c9a7e', price: { type: 'fixed', amount: 8 } },
								{
									id: 'navy',
									label: 'Navy velvet',
									color: '#1e3a5f',
									price: { type: 'fixed', amount: 12 },
									conditions: { match: 'any', rules: [{ source: 'attribute', name: 'Color', op: 'is', value: 'Charcoal' }, { source: 'attribute', name: 'Color', op: 'is', value: 'Teal' }] },
								},
							],
						},
					],
					gallery_presets: {
						perspective: { position: [1.8, 1.15, 2.15], target: [0, 0.38, 0] },
						front: { position: [0, 0.7, 2.3], target: [0, 0.42, 0] },
						side: { position: [2.3, 0.7, 0], target: [0, 0.42, 0] },
						back: { position: [0, 0.8, -2.3], target: [0, 0.42, 0] },
					},
				},
			},
			102: {
				model_id: 502,
				config: {
					schema_version: 1,
					meshes: { Shade: { customizable: true } },
					materials: { Shade: { baseColor: '#efe6d2', roughness: 0.85 }, Arm: { baseColor: '#b08d57', metalness: 0.9, roughness: 0.3 } },
					camera: null,
					environment: { preset: 'studio', intensity: 1.1, backgroundType: 'color', backgroundColor: '#f6f3ee' },
					animations: { autoplay: 'Shade_Tilt', loop: true, speed: 0.6 },
					hotspots: [],
					optimization: null,
					pricing: { parts: { Shade: { color: { type: 'percent', amount: 8 } } } },
					options: [
						{
							id: 'shade',
							label: 'Shade',
							type: 'color',
							display: 'button',
							targets: ['Shade'],
							required: false,
							default: 'linen',
							choices: [
								{ id: 'linen', label: 'Linen', color: '#efe6d2' },
								{ id: 'sage', label: 'Sage', color: '#9caf88', price: { type: 'percent', amount: 8 } },
								{ id: 'terracotta', label: 'Terracotta', color: '#c46a4a', price: { type: 'percent', amount: 8 } },
								{ id: 'charcoal', label: 'Charcoal', color: '#3f3f46' },
							],
						},
						{
							id: 'arm',
							label: 'Arm finish',
							type: 'material',
							display: 'thumbnail',
							targets: ['Arm'],
							required: false,
							default: 'brass',
							choices: [
								{ id: 'brass', label: 'Brushed brass', material: { baseColor: '#b08d57', metalness: 0.9, roughness: 0.3 } },
								{ id: 'black', label: 'Matte black', material: { baseColor: '#222222', metalness: 0.2, roughness: 0.7 } },
								{ id: 'chrome', label: 'Chrome', material: { baseColor: '#d6d9dc', metalness: 1, roughness: 0.15 }, price: { type: 'fixed', amount: 15 } },
							],
						},
					],
				},
			},
			103: {
				model_id: 503,
				config: {
					schema_version: 1,
					meshes: {},
					materials: { Body: { baseColor: '#3c6e71', roughness: 0.35 } },
					camera: null,
					environment: null,
					animations: null,
					hotspots: [],
					optimization: null,
					// Planned (decals): text or a picture on the front of the mug.
					decals: [
						{
							id: 'front',
							label: 'Front print',
							mesh: 'Body',
							placement: { side: 'front', x: 0.6, y: 0.55, width: 0.56, height: 0.4, rotation: 0 },
							kinds: ['text', 'image'],
							fonts: ['Inter', 'Georgia', 'Courier New', 'Brush Script MT'],
							colors: ['#ffffff', '#1f2937', '#c2410c', '#d4af37'],
							max_chars: 16,
							min_size: 0.3,
							max_size: 1,
							required: false,
							price: { type: 'fixed', amount: 6 },
						},
					],
					// Required group with no default: add to cart is refused until a glaze is picked.
					options: [
						{
							id: 'glaze',
							label: 'Glaze',
							type: 'color',
							display: 'swatch',
							targets: ['Body', 'Handle'],
							required: true,
							default: '',
							choices: [
								{ id: 'lagoon', label: 'Lagoon', color: '#3c6e71' },
								{ id: 'sand', label: 'Sand', color: '#d9c6a5' },
								{ id: 'ink', label: 'Ink', color: '#1f2937', price: { type: 'fixed', amount: 4 } },
								{ id: 'speckle', label: 'Speckled white', color: '#f3f0ea', price: { type: 'fixed', amount: 4 } },
							],
						},
						{
							id: 'inside',
							label: 'Inside',
							type: 'color',
							display: 'dropdown',
							targets: ['Glaze_Inner'],
							required: false,
							default: 'cream',
							choices: [
								{ id: 'cream', label: 'Cream', color: '#f1ece1' },
								// Planned: conditional-logic (black inside only with the Ink glaze).
								{ id: 'black', label: 'Black', color: '#1c1c1c', price: { type: 'fixed', amount: 2 }, conditions: { match: 'all', rules: [{ source: 'group', groupId: 'glaze', op: 'is', choiceId: 'ink' }] } },
							],
						},
					],
				},
			},
			104: {
				model_id: 504,
				config: {
					schema_version: 1,
					meshes: { Shelf: { optional: true } },
					materials: {},
					camera: null,
					environment: { preset: 'lobby' },
					animations: null,
					hotspots: [],
					optimization: null,
					// Planned (decals): a required engraving on the top.
					decals: [
						{
							id: 'engraving',
							label: 'Engraving',
							mesh: 'Top',
							placement: { side: 'top', x: 0.5, y: 0.42, width: 0.62, height: 0.2, rotation: 0 },
							kinds: ['text'],
							fonts: ['Georgia', 'Times New Roman', 'Brush Script MT', 'Inter'],
							colors: ['#3b2414', '#1c1917', '#f5f5f4'],
							max_chars: 24,
							min_size: 0.5,
							max_size: 1,
							required: true,
							price: { type: 'fixed', amount: 15 },
						},
					],
					// Planned (materials-variants + option-groups): the GLB's wood variants as a customer choice.
					options: [
						{
							id: 'wood',
							label: 'Wood finish',
							type: 'variant',
							display: 'thumbnail',
							targets: [],
							required: false,
							default: 'natural',
							choices: [
								{ id: 'natural', label: 'Natural oak', variant: 'Natural Oak', color: '#c49a6c' },
								{ id: 'smoked', label: 'Smoked oak', variant: 'Smoked Oak', color: '#7c5838', price: { type: 'fixed', amount: 20 } },
								{ id: 'black', label: 'Black ash', variant: 'Black Ash', color: '#291f17', price: { type: 'fixed', amount: 30 } },
								{ id: 'walnut', label: 'Walnut', variant: 'Walnut', color: '#53331e', price: { type: 'percent', amount: 15 } },
							],
						},
					],
				},
			},
			// Planned (coverage): AR with a USDZ on the default only, so the 3-seat (own model) is "AR file not matched".
			141: {
				model_id: 541,
				config: {
					schema_version: 1,
					meshes: { Seat_Cushion: { customizable: true }, Back_Cushion: { customizable: true } },
					materials: { Seat_Cushion: { baseColor: '#8a9a8b', roughness: 0.9 }, Back_Cushion: { baseColor: '#8a9a8b', roughness: 0.9 } },
					camera: null,
					environment: { preset: 'apartment' },
					animations: null,
					hotspots: [],
					optimization: null,
					ar: { enabled: true, usdzId: 543, usdzUrl: 'modular-sofa.usdz', scale: 'fixed' },
				},
			},
			143: {
				model_id: 545,
				config: {
					schema_version: 1,
					meshes: {},
					materials: { Seat_Cushion: { baseColor: '#9d4a64', roughness: 0.95 }, Back_Cushion: { baseColor: '#9d4a64', roughness: 0.95 }, Pillow: { baseColor: '#e8c3a0' } },
					camera: null,
					environment: null,
					animations: null,
					hotspots: [],
					optimization: null,
				},
			},
		},

		// wp_wc3d_variation_configs: diffs over the product default (+ optional own model).
		variationConfigs: {
			202: {
				model_id: 0,
				config: {
					schema_version: 1,
					materials: { Seat_Cushion: { baseColor: '#3f3f46', roughness: 0.9 }, Back_Cushion: { baseColor: '#3f3f46', roughness: 0.9 } },
					// Planned (materials-variants): the GLB variant this variation shows.
					material_variant: 'Black Ash & Charcoal Bouclé',
				},
			},
			203: {
				model_id: 0,
				config: {
					schema_version: 1,
					materials: { Seat_Cushion: { baseColor: '#14746f', roughness: 0.85 }, Back_Cushion: { baseColor: '#14746f', roughness: 0.85 }, Pillow: { baseColor: '#fbbf24' } },
					environment: { preset: 'sunset' },
					material_variant: 'Walnut & Teal Leather',
				},
			},
			205: { model_id: 0, config: { schema_version: 1, meshes: { Shelf: { visible: true, optional: false } } } },
			// Planned (coverage): own (oversized) model, inherits the default USDZ.
			242: { model_id: 542, config: { schema_version: 1 } },
		},

		// wp_wc3d_presets (global, per type).
		presets: {
			1: { id: 1, type: 'material', name: 'Brushed brass', data: { baseColor: '#b08d57', metalness: 0.9, roughness: 0.3 } },
			2: { id: 2, type: 'environment', name: 'Warm showroom', data: { preset: 'apartment', intensity: 1.2, shadowsEnabled: true, shadowIntensity: 0.5 } },
			3: { id: 3, type: 'camera', name: 'Hero three-quarter', data: { position: [1.8, 1.15, 2.15], target: [0, 0.38, 0], fov: 40 } },
		},

		cart: { items: [] },

		orders: {
			1001: {
				id: 1001,
				date: '2026-09-29 18:22',
				status: 'processing',
				customer: { name: 'Nadia Rahman', email: 'nadia@example.com', address: '14 Lake Road, Dhaka 1212' },
				payment: 'Cash on delivery',
				items: [
					{ id: 1, productId: 101, variationId: 203, qty: 1, total: 479, custom: { materials: { Seat_Cushion: { baseColor: '#ef4444' }, Back_Cushion: { baseColor: '#ef4444' } }, meshes: { Pillow: { visible: false } } } },
					{ id: 2, productId: 103, variationId: 0, qty: 2, total: 48, custom: null },
				],
			},
			1002: {
				id: 1002,
				date: '2026-09-30 09:05',
				status: 'completed',
				customer: { name: 'Tomás Ortega', email: 'tomas@example.com', address: '220 King St, Toronto ON' },
				payment: 'Credit card',
				items: [{ id: 3, productId: 102, variationId: 0, qty: 1, total: 129, custom: { materials: { Shade: { baseColor: '#10b981' } } } }],
			},
			// Planned (option-groups + option-pricing + order-snapshot): options and the charged
			// breakdown frozen on the line; snapshotId points into `snapshots` (none seeded).
			1003: {
				id: 1003,
				date: '2026-09-30 15:48',
				status: 'processing',
				customer: { name: 'Mei Chen', email: 'mei@example.com', address: '8 Harbour St, Sydney NSW 2000' },
				payment: 'Credit card',
				items: [
					{
						id: 4,
						productId: 101,
						variationId: 202,
						qty: 1,
						basePrice: 449,
						total: 528.35,
						custom: {
							options: { frame: 'walnut', pillow: 'with', 'pillow-fabric': 'navy' },
							materials: { Frame: { baseColor: '#5c3b27', roughness: 0.45, metalness: 0 }, Legs: { baseColor: '#5c3b27', roughness: 0.45, metalness: 0 }, Armrest_Left: { baseColor: '#5c3b27', roughness: 0.45, metalness: 0 }, Armrest_Right: { baseColor: '#5c3b27', roughness: 0.45, metalness: 0 }, Pillow: { baseColor: '#1e3a5f' } },
							meshes: { Pillow: { visible: true } },
						},
						options: [
							{ key: 'frame', label: 'Frame finish', value: 'Walnut', swatch: '#5c3b27', amount: 67.35, regular: null },
							{ key: 'pillow', label: 'Pillow', value: 'With pillow', amount: 0, regular: null },
							{ key: 'pillow-fabric', label: 'Pillow fabric', value: 'Navy velvet', swatch: '#1e3a5f', amount: 12, regular: null },
						],
						snapshotId: 0,
					},
					{
						id: 5,
						productId: 103,
						variationId: 0,
						qty: 2,
						basePrice: 24,
						total: 56,
						custom: { options: { glaze: 'ink', inside: 'cream' }, materials: { Body: { baseColor: '#1f2937' }, Handle: { baseColor: '#1f2937' }, Glaze_Inner: { baseColor: '#f1ece1' } }, meshes: {} },
						options: [
							{ key: 'glaze', label: 'Glaze', value: 'Ink', swatch: '#1f2937', amount: 4, regular: null },
							{ key: 'inside', label: 'Inside', value: 'Cream', swatch: '#f1ece1', amount: 0, regular: null },
						],
						snapshotId: 0,
					},
				],
			},
			// Planned (decals): personalized lines (text and an uploaded logo) frozen with their charged rows.
			1004: {
				id: 1004,
				date: '2026-10-01 11:20',
				status: 'processing',
				customer: { name: 'Sam Patel', email: 'sam@example.com', address: '5 Mill Lane, Bristol BS1 4DJ' },
				payment: 'Credit card',
				items: [
					{
						id: 6,
						productId: 103,
						variationId: 0,
						qty: 1,
						basePrice: 24,
						total: 30,
						custom: {
							options: { glaze: 'lagoon', inside: 'cream' },
							materials: { Body: { baseColor: '#3c6e71' }, Handle: { baseColor: '#3c6e71' }, Glaze_Inner: { baseColor: '#f1ece1' } },
							meshes: {},
							decals: { front: { kind: 'text', text: 'Hello, Sam', font: 'Georgia', color: '#ffffff', size: 0.9, x: 0, y: 0, rotation: 0 } },
						},
						options: [
							{ key: 'glaze', label: 'Glaze', value: 'Lagoon', swatch: '#3c6e71', amount: 0, regular: null },
							{ key: 'inside', label: 'Inside', value: 'Cream', swatch: '#f1ece1', amount: 0, regular: null },
							{ key: 'decal:front', label: 'Front print', value: '“Hello, Sam” (Georgia, #ffffff)', swatch: '#ffffff', amount: 6, regular: null },
						],
						snapshotId: 0,
					},
					{
						id: 7,
						productId: 101,
						variationId: 201,
						qty: 1,
						basePrice: 449,
						total: 486,
						custom: {
							options: { frame: 'natural', pillow: 'with' },
							materials: { Frame: { roughness: 0.55, metalness: 0 }, Legs: { roughness: 0.55, metalness: 0 }, Armrest_Left: { roughness: 0.55, metalness: 0 }, Armrest_Right: { roughness: 0.55, metalness: 0 } },
							meshes: { Pillow: { visible: true } },
							decals: {
								monogram: { kind: 'text', text: 'SP', font: 'Georgia', color: '#d4af37', size: 1, x: 0, y: 0, rotation: 0 },
								'back-logo': { kind: 'image', image: DEMO_LOGO, name: 'studio-logo.png', size: 0.85, x: 0, y: 0, rotation: 0 },
							},
						},
						options: [
							{ key: 'frame', label: 'Frame finish', value: 'Natural oak', swatch: '#d8b98f', amount: 0, regular: null },
							{ key: 'pillow', label: 'Pillow', value: 'With pillow', amount: 0, regular: null },
							{ key: 'decal:monogram', label: 'Monogram', value: '“SP” (Georgia, #d4af37)', swatch: '#d4af37', amount: 12, regular: null },
							{ key: 'decal:back-logo', label: 'Back logo', value: 'studio-logo.png', image: DEMO_LOGO, amount: 25, regular: null },
						],
						snapshotId: 0,
					},
				],
			},
		},

		// Planned (order-snapshot): configured-product pictures, { id, url (data URL), width, height, productId }.
		snapshots: {},

		// Planned (saved-designs): wp_wc3d_saved_designs rows keyed by code (code = codeFor(seq)).
		// customerId 0 = anonymous share link (expires), else an account design. custom = sanitised layer.
		savedDesigns: {
			JY6DAE: {
				code: 'JY6DAE', seq: 1, productId: 101, variationId: 202, created: '2026-05-02 09:30', customerId: 0, name: '', views: 5,
				custom: { options: { frame: 'black', pillow: 'without' }, materials: { Frame: { baseColor: '#2e2925', roughness: 0.45, metalness: 0 }, Legs: { baseColor: '#2e2925', roughness: 0.45, metalness: 0 }, Armrest_Left: { baseColor: '#2e2925', roughness: 0.45, metalness: 0 }, Armrest_Right: { baseColor: '#2e2925', roughness: 0.45, metalness: 0 } }, meshes: { Pillow: { visible: false } } },
			},
			V3G2JA: {
				code: 'V3G2JA', seq: 2, productId: 101, variationId: 203, created: '2026-09-24 20:14', customerId: 1, name: 'Living room chair', views: 3, lastViewed: '2026-10-01 08:12',
				custom: { options: { frame: 'walnut', pillow: 'with', 'pillow-fabric': 'mustard' }, materials: { Frame: { baseColor: '#5c3b27', roughness: 0.45, metalness: 0 }, Legs: { baseColor: '#5c3b27', roughness: 0.45, metalness: 0 }, Armrest_Left: { baseColor: '#5c3b27', roughness: 0.45, metalness: 0 }, Armrest_Right: { baseColor: '#5c3b27', roughness: 0.45, metalness: 0 }, Pillow: { baseColor: '#d97706' } }, meshes: { Pillow: { visible: true } } },
			},
			CCGJ3Y: {
				code: 'CCGJ3Y', seq: 3, productId: 103, variationId: 0, created: '2026-09-27 11:02', customerId: 1, name: 'Mug for Dad', views: 1,
				custom: { options: { glaze: 'ink', inside: 'cream' }, materials: { Body: { baseColor: '#1f2937' }, Handle: { baseColor: '#1f2937' }, Glaze_Inner: { baseColor: '#f1ece1' } }, meshes: {} },
			},
			SQX63K: {
				code: 'SQX63K', seq: 4, productId: 102, variationId: 0, created: '2026-09-30 16:45', customerId: 0, name: '', views: 2,
				custom: { options: { shade: 'terracotta', arm: 'brass' }, materials: { Shade: { baseColor: '#c46a4a' }, Arm: { baseColor: '#b08d57', metalness: 0.9, roughness: 0.3 } }, meshes: {} },
			},
			WJFRLF: {
				code: 'WJFRLF', seq: 5, productId: 101, variationId: 201, created: '2026-09-29 13:20', customerId: 2, name: 'Reading corner', views: 0,
				custom: { options: { frame: 'smoked', pillow: 'with', 'pillow-fabric': 'sage' }, materials: { Frame: { baseColor: '#7a5c43', roughness: 0.5, metalness: 0 }, Legs: { baseColor: '#7a5c43', roughness: 0.5, metalness: 0 }, Armrest_Left: { baseColor: '#7a5c43', roughness: 0.5, metalness: 0 }, Armrest_Right: { baseColor: '#7a5c43', roughness: 0.5, metalness: 0 }, Pillow: { baseColor: '#7c9a7e' } }, meshes: { Pillow: { visible: true } } },
			},
		},

		// Planned (saved-designs): storefront customers (WordPress users); demo.customerId = who is logged in (0 = guest).
		customers: {
			1: { id: 1, name: 'Nadia Rahman', email: 'nadia@example.com' },
			2: { id: 2, name: 'Tomás Ortega', email: 'tomas@example.com' },
		},

		// Planned (block): block theme's Single Product template (wp_template) and pages built with blocks / Elementor.
		wpTemplates: seedTemplates(),
		wpPages: seedPages(),

		// Prototype-only store setup: which cart/checkout the demo store's pages use; demo.theme 'classic' | 'block' (block flag).
		demo: { cartPage: 'classic', customerId: 1, theme: 'classic' },

		// Feature modules (module: true) keep their flag as the Settings → Features toggle; the demo is a new install.
		flags: { 'customizer-modal': true },
	};
}
