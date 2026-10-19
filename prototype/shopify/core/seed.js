// Demo data for the Shopify prototype. Shapes mirror docs/SHOPIFY-ROADMAP.md §7:
// configs/variantConfigs = our Postgres (ProductConfig/VariantConfig), files = Shopify Files (MODEL_3D media),
// designs = Design table, orders[].lines[].properties = Shopify line item properties.
// Config JSON is the WooCommerce plugin's schema_version 1, unchanged.

const LOUNGE_CONFIG = {
	schema_version: 1,
	meshes: {
		Seat_Cushion: { customizable: true, label: 'Seat cushion' },
		Back_Cushion: { customizable: true, label: 'Back cushion' },
		Frame: { label: 'Frame' },
		Pillow: { optional: true, label: 'Pillow' },
	},
	materials: {
		Seat_Cushion: { baseColor: '#d8c8a8', roughness: 0.9, metalness: 0 },
		Back_Cushion: { baseColor: '#d8c8a8', roughness: 0.9, metalness: 0 },
		Pillow: { baseColor: '#c2410c', roughness: 0.95 },
	},
	camera: { position: [1.8, 1.15, 2.15], target: [0, 0.38, 0], fov: 40, lock: { pan: false, minPolarAngle: 20, maxPolarAngle: 88 } },
	environment: { preset: 'studio', intensity: 1, shadowsEnabled: true, shadowIntensity: 0.6, backgroundType: 'transparent' },
	animations: null,
	hotspots: [
		{ id: 'covers', anchor_mesh: 'Seat_Cushion', offset: [0.1, 0.52, 0.25], label: 'Removable covers', icon: 'info', description: 'Every cushion cover zips off and is machine washable at 30°C.' },
		{ id: 'oak', anchor_mesh: 'Armrest_Right', offset: [0.42, 0.6, 0.1], label: 'Solid oak', icon: 'info', description: 'FSC-certified European oak with a hard-wax oil finish.' },
		{ id: 'lamp', anchor_mesh: 'Armrest_Left', offset: [-0.42, 0.6, 0.1], label: 'Reading lamp', icon: 'cart', description: 'The Arc Table Lamp fits beside the armrest.', linked_product_id: 1002 },
	],
	optimization: { gpuPerformanceMode: 'default', pixelRatioLimit: 1.5 },
	ar: { enabled: true, source: 'shopify', scale: 'fixed' },
	decals: [
		{
			id: 'monogram',
			label: 'Monogram',
			mesh: 'Pillow',
			placement: { side: 'front', x: 0.5, y: 0.5, width: 0.55, height: 0.42, rotation: 0 },
			kinds: ['text'],
			fonts: ['Georgia', 'Times New Roman'],
			colors: ['#f5e6c8', '#d4af37', '#1f2937'],
			max_chars: 3,
			min_size: 0.5,
			max_size: 1,
			required: false,
			price: { type: 'fixed', amount: 12 },
		},
	],
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
				{ id: 'natural', label: 'Natural oak', color: '#d8b98f', material: { roughness: 0.55, metalness: 0 } },
				{ id: 'smoked', label: 'Smoked oak', color: '#7a5c43', material: { baseColor: '#7a5c43', roughness: 0.5, metalness: 0 }, price: { type: 'fixed', amount: 60 } },
				{ id: 'black', label: 'Black ash', color: '#2e2925', material: { baseColor: '#2e2925', roughness: 0.45, metalness: 0 }, price: { type: 'fixed', amount: 80, sale: 65 } },
				{ id: 'walnut', label: 'Walnut', color: '#5c3b27', material: { baseColor: '#5c3b27', roughness: 0.45, metalness: 0 }, price: { type: 'percent', amount: 15 } },
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
			default: '',
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
					conditions: { match: 'any', rules: [{ source: 'option', name: 'Color', op: 'is', value: 'Charcoal' }, { source: 'option', name: 'Color', op: 'is', value: 'Teal' }] },
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
};

const cushions = (hex) => ({
	materials: {
		Seat_Cushion: { baseColor: hex, roughness: 0.9, metalness: 0 },
		Back_Cushion: { baseColor: hex, roughness: 0.9, metalness: 0 },
	},
});

export function seed() {
	return {
		shop: {
			name: 'Fernway Home',
			domain: 'fernway-home.myshopify.com',
			plan: 'basic', // basic | plus (prototype bar switch)
			currency: 'USD',
			theme: 'Horizon',
		},

		app: {
			plan: 'growth', // free | growth | business (Managed Pricing)
			installedAt: '2026-10-02 09:14',
			embedEnabled: false, // app embed "3D core" switched on in the theme editor
			onboarding: { model: true, editor: true, embed: false, block: false, preview: false },
			blocks: { product: ['configurator'] }, // app blocks added to the product template
			modules: {
				'option-groups': true,
				'option-pricing': true,
				'conditional-logic': true,
				personalization: true,
				'saved-designs': true,
				'order-snapshot': true,
				'customizer-modal': true,
				'undo-redo': true,
				'usdz-export': false,
				'material-variants': false,
				coverage: true,
				'external-url': false,
			},
			settings: {
				placement: 'replace_image', // replace_image | gallery_first | block_only | modal
				loading_trigger: 'click', // click | scroll | eager
				aspect: '1 / 1',
				customizer: true,
				customizer_layout: 'modal', // drawer | modal
				toolbar: { zoom: true, reset: true, autorotate: true, fullscreen: true, ar: true },
				palette: ['#111827', '#f8fafc', '#d8c8a8', '#3f3f46', '#0f766e', '#c2410c', '#d97706', '#7c9a7e', '#1e3a5f', '#be185d', '#6d28d9'],
				share_link_lifetime: 90,
				ar_configured: false,
				shop_badge: true,
				coverage_max_model_mb: 10,
			},
		},

		// Shopify Files: MODEL_3D media live on Shopify's CDN; Shopify generates the USDZ twin for AR.
		files: {
			501: { id: 501, kind: 'model3d', demo: 'lounge-chair', filename: 'lounge-chair.glb', sizeBytes: 2516582, status: 'READY', usdz: true, triangles: 48210 },
			502: { id: 502, kind: 'model3d', demo: 'table-lamp', filename: 'arc-table-lamp.glb', sizeBytes: 1146880, status: 'READY', usdz: true, triangles: 12890 },
			503: { id: 503, kind: 'model3d', demo: 'mug', filename: 'ceramic-mug.glb', sizeBytes: 491520, status: 'READY', usdz: true, triangles: 6420 },
			504: { id: 504, kind: 'model3d', demo: 'side-table', filename: 'oak-side-table.glb', sizeBytes: 870400, status: 'READY', usdz: true, triangles: 9310 },
			506: { id: 506, kind: 'model3d', demo: 'lounge-chair-wide', filename: 'lounge-chair-wide.glb', sizeBytes: 2662400, status: 'READY', usdz: true, triangles: 51340 },
			505: { id: 505, kind: 'model3d', demo: 'lounge-chair-wide', filename: 'modular-sofa-hd.glb', sizeBytes: 19503513, status: 'READY', usdz: false, triangles: 212400, draco: true },
		},

		products: {
			1001: { id: 1001, title: 'Lounge Chair', handle: 'lounge-chair', status: 'active', vendor: 'Fernway', type: 'Chairs', price: 449, options: [{ name: 'Color', values: ['Sand', 'Charcoal', 'Teal'] }, { name: 'Size', values: ['Standard', 'Wide'] }], variants: [2001, 2002, 2003, 2011, 2012, 2013], media: [501, 506], image: { model: 'lounge-chair', bg: '#ece6dd' }, description: 'A low lounge chair with a solid oak frame and high-resilience foam cushions. Covers zip off for washing.', inventory: 34 },
			1002: { id: 1002, title: 'Arc Table Lamp', handle: 'arc-table-lamp', status: 'active', vendor: 'Fernway', type: 'Lighting', price: 129, options: [], variants: [2004], media: [502], image: { model: 'table-lamp', bg: '#f1ede4' }, description: 'A desk lamp with a tilting linen shade on a brushed brass arm.', inventory: 58 },
			1003: { id: 1003, title: 'Ceramic Mug', handle: 'ceramic-mug', status: 'active', vendor: 'Fernway', type: 'Kitchen', price: 24, options: [], variants: [2005], media: [503], image: { model: 'mug', bg: '#e9eef0' }, description: 'Stoneware mug with a reactive glaze. Dishwasher safe. 350 ml.', inventory: 210 },
			1004: { id: 1004, title: 'Oak Side Table', handle: 'oak-side-table', status: 'active', vendor: 'Fernway', type: 'Tables', price: 189, options: [{ name: 'Size', values: ['Small', 'Large'] }], variants: [2006, 2007], media: [504], image: { model: 'side-table', bg: '#efe8de' }, description: 'Solid oak side table in two heights.', inventory: 19 },
			1005: { id: 1005, title: 'Modular Sofa', handle: 'modular-sofa', status: 'draft', vendor: 'Fernway', type: 'Sofas', price: 1890, options: [], variants: [2008], media: [505], image: { model: 'lounge-chair-wide', bg: '#e8e4dc' }, description: 'Three-seat modular sofa.', inventory: 6 },
			1006: { id: 1006, title: 'Linen Throw', handle: 'linen-throw', status: 'active', vendor: 'Fernway', type: 'Textiles', price: 79, options: [], variants: [2009], media: [], image: { swatch: '#b9a58c' }, description: 'Stonewashed linen throw, 130 × 170 cm.', inventory: 44 },
			1007: { id: 1007, title: 'Wool Rug', handle: 'wool-rug', status: 'active', vendor: 'Fernway', type: 'Textiles', price: 340, options: [], variants: [2010], media: [], image: { swatch: '#8a7f73' }, description: 'Hand-tufted New Zealand wool, 160 × 230 cm.', inventory: 8 },
		},

		variants: {
			2001: { id: 2001, productId: 1001, title: 'Sand / Standard', options: { Color: 'Sand', Size: 'Standard' }, price: 449, sku: 'LC-100-SND-S', swatch: '#d8c8a8' },
			2002: { id: 2002, productId: 1001, title: 'Charcoal / Standard', options: { Color: 'Charcoal', Size: 'Standard' }, price: 449, sku: 'LC-100-CHR-S', swatch: '#3f3f46' },
			2003: { id: 2003, productId: 1001, title: 'Teal / Standard', options: { Color: 'Teal', Size: 'Standard' }, price: 469, sku: 'LC-100-TEA-S', swatch: '#0f766e' },
			2011: { id: 2011, productId: 1001, title: 'Sand / Wide', options: { Color: 'Sand', Size: 'Wide' }, price: 599, sku: 'LC-100-SND-W', swatch: '#d8c8a8' },
			2012: { id: 2012, productId: 1001, title: 'Charcoal / Wide', options: { Color: 'Charcoal', Size: 'Wide' }, price: 599, sku: 'LC-100-CHR-W', swatch: '#3f3f46' },
			2013: { id: 2013, productId: 1001, title: 'Teal / Wide', options: { Color: 'Teal', Size: 'Wide' }, price: 619, sku: 'LC-100-TEA-W', swatch: '#0f766e' },
			2004: { id: 2004, productId: 1002, title: 'Default Title', options: {}, price: 129, sku: 'AL-200' },
			2005: { id: 2005, productId: 1003, title: 'Default Title', options: {}, price: 24, sku: 'CM-300' },
			2006: { id: 2006, productId: 1004, title: 'Small', options: { Size: 'Small' }, price: 189, sku: 'ST-400-S' },
			2007: { id: 2007, productId: 1004, title: 'Large', options: { Size: 'Large' }, price: 219, sku: 'ST-400-L' },
			2008: { id: 2008, productId: 1005, title: 'Default Title', options: {}, price: 1890, sku: 'MS-500' },
			2009: { id: 2009, productId: 1006, title: 'Default Title', options: {}, price: 79, sku: 'LT-600' },
			2010: { id: 2010, productId: 1007, title: 'Default Title', options: {}, price: 340, sku: 'WR-700' },
		},

		// ProductConfig (Postgres). enabled = the storefront renders 3D; publishedAt = metafields $app.render written.
		configs: {
			1001: {
				enabled: true,
				modelFileId: 501,
				config: LOUNGE_CONFIG,
				// Set once per option value; "Teal / Wide" = Color=Teal + Size=Wide.
				optionRules: {
					'Color=Sand': { modelFileId: null, config: { schema_version: 1, ...cushions('#d8c8a8') } },
					'Color=Charcoal': { modelFileId: null, config: { schema_version: 1, ...cushions('#3f3f46') } },
					'Color=Teal': { modelFileId: null, config: { schema_version: 1, ...cushions('#0f766e') } },
					'Size=Wide': { modelFileId: 506, config: { schema_version: 1, camera: { position: [2.3, 1.35, 2.75], target: [0, 0.38, 0], fov: 40, lock: { pan: false, minPolarAngle: 20, maxPolarAngle: 88 } } } },
				},
				updatedAt: '2026-10-12 16:40',
				publishedAt: '2026-10-12 16:40',
				customizer: 'inherit',
			},
			1002: {
				enabled: true,
				modelFileId: 502,
				updatedAt: '2026-10-09 11:05',
				publishedAt: '2026-10-09 11:05',
				customizer: 'inherit',
				config: {
					schema_version: 1,
					meshes: { Shade: { customizable: true, label: 'Shade' } },
					materials: { Shade: { baseColor: '#efe6d2', roughness: 0.85 }, Arm: { baseColor: '#b08d57', metalness: 0.9, roughness: 0.3 } },
					camera: null,
					environment: { preset: 'studio', intensity: 1.1, backgroundType: 'color', backgroundColor: '#f6f3ee' },
					animations: { autoplay: 'Shade_Tilt', loop: true, speed: 0.6 },
					hotspots: [],
					ar: { enabled: true, source: 'shopify', scale: 'fixed' },
					options: [
						{
							id: 'shade',
							label: 'Shade',
							type: 'color',
							display: 'swatch',
							targets: ['Shade'],
							default: 'linen',
							choices: [
								{ id: 'linen', label: 'Linen', color: '#efe6d2' },
								{ id: 'terracotta', label: 'Terracotta', color: '#c56a4a', price: { type: 'fixed', amount: 10 } },
								{ id: 'olive', label: 'Olive', color: '#6b7046', price: { type: 'fixed', amount: 10 } },
							],
						},
						{
							id: 'arm',
							label: 'Arm finish',
							type: 'material',
							display: 'button',
							targets: ['Arm', 'Base'],
							default: 'brass',
							choices: [
								{ id: 'brass', label: 'Brushed brass', color: '#b08d57', material: { baseColor: '#b08d57', metalness: 0.9, roughness: 0.3 } },
								{ id: 'black', label: 'Matte black', color: '#1f2023', material: { baseColor: '#1f2023', metalness: 0.4, roughness: 0.6 }, price: { type: 'percent', amount: 8 } },
							],
						},
					],
				},
			},
			1003: {
				enabled: true,
				modelFileId: 503,
				updatedAt: '2026-10-08 08:20',
				publishedAt: '2026-10-08 08:20',
				customizer: 'inherit',
				config: {
					schema_version: 1,
					meshes: { Body: { customizable: true, label: 'Glaze' }, Glaze_Inner: { label: 'Inside' } },
					materials: { Body: { baseColor: '#2f6f8f', roughness: 0.25 }, Handle: { baseColor: '#2f6f8f', roughness: 0.25 }, Glaze_Inner: { baseColor: '#f1ece1', roughness: 0.3 } },
					camera: null,
					environment: { preset: 'studio', intensity: 1, backgroundType: 'transparent', shadowsEnabled: true, shadowIntensity: 0.5 },
					hotspots: [],
					ar: { enabled: true, source: 'shopify', scale: 'fixed' },
					decals: [
						{ id: 'front', label: 'Name on the mug', mesh: 'Body', placement: { side: 'front', x: 0.5, y: 0.5, width: 0.42, height: 0.38, rotation: 0 }, kinds: ['text'], fonts: ['Georgia', 'Arial'], colors: ['#ffffff', '#111827', '#d4af37'], max_chars: 12, min_size: 0.5, max_size: 1, required: false, price: { type: 'fixed', amount: 6 } },
					],
					options: [
						{
							id: 'glaze',
							label: 'Glaze',
							type: 'color',
							display: 'swatch',
							targets: ['Body', 'Handle'],
							default: 'lagoon',
							choices: [
								{ id: 'lagoon', label: 'Lagoon', color: '#2f6f8f' },
								{ id: 'ink', label: 'Ink', color: '#1f2937' },
								{ id: 'moss', label: 'Moss', color: '#5f7a4f' },
								{ id: 'clay', label: 'Clay', color: '#b4674a', price: { type: 'fixed', amount: 2 } },
							],
						},
					],
				},
			},
			1004: {
				enabled: true,
				modelFileId: 504,
				updatedAt: '2026-10-05 12:45',
				publishedAt: '2026-10-05 12:45',
				customizer: 'off',
				config: {
					schema_version: 1,
					meshes: {},
					materials: {},
					camera: null,
					environment: { preset: 'studio', intensity: 1, backgroundType: 'transparent', shadowsEnabled: true, shadowIntensity: 0.5 },
					hotspots: [],
					ar: { enabled: true, source: 'shopify', scale: 'fixed' },
				},
			},
			1005: { enabled: false, modelFileId: 505, updatedAt: '2026-10-14 18:02', publishedAt: null, customizer: 'inherit', config: { schema_version: 1, meshes: {}, materials: {}, hotspots: [] } },
		},

		// VariantConfig: per-variant exceptions over product default + option rules, keyed by Shopify variant id. modelFileId null = inherit.
		variantConfigs: {
			2007: { modelFileId: null, config: { schema_version: 1, camera: { position: [1.6, 1.3, 1.9], target: [0, 0.45, 0] } } },
			// An exception: Teal / Wide ships with a mustard pillow, on top of Color=Teal + Size=Wide.
			2013: { modelFileId: null, config: { schema_version: 1, materials: { Pillow: { baseColor: '#d97706', roughness: 0.95 } } } },
		},

		presets: {
			1: { id: 1, type: 'material', name: 'Brushed brass', data: { baseColor: '#b08d57', metalness: 0.9, roughness: 0.3 } },
			2: { id: 2, type: 'material', name: 'Matte ceramic', data: { baseColor: '#f1ece1', metalness: 0, roughness: 0.7 } },
			3: { id: 3, type: 'environment', name: 'Warm showroom', data: { preset: 'apartment', intensity: 1.2, shadowsEnabled: true, shadowIntensity: 0.6 } },
			4: { id: 4, type: 'camera', name: 'Low three-quarter', data: { position: [1.6, 0.7, 1.9], target: [0, 0.35, 0] } },
		},

		customers: {
			301: { id: 301, name: 'Sam Rivera', email: 'sam.rivera@example.com' },
			302: { id: 302, name: 'Noor Haddad', email: 'noor.h@example.com' },
		},

		// Design table. kind 'cart' = frozen on add to cart; 'saved' = shopper pressed Save/Share.
		designs: {
			K7Q2MX: { code: 'K7Q2MX', kind: 'saved', productId: 1001, variantId: 2002, customerId: 301, name: 'Living room chair', createdAt: '2026-10-10 19:22', expiresAt: '2027-01-08', views: 4, choices: { options: { frame: 'walnut', pillow: 'with', 'pillow-fabric': 'navy' }, decals: { monogram: { kind: 'text', text: 'SR', font: 'Georgia', color: '#d4af37', size: 0.9, x: 0, y: 0, rotation: 0 } } } },
			P3VD8A: { code: 'P3VD8A', kind: 'saved', productId: 1003, variantId: 2005, customerId: 301, name: 'Gift mug for Ana', createdAt: '2026-10-11 08:05', expiresAt: '2027-01-09', views: 1, choices: { options: { glaze: 'clay' }, decals: { front: { kind: 'text', text: 'Ana', font: 'Georgia', color: '#ffffff', size: 0.9, x: 0, y: 0, rotation: 0 } } } },
			H2ZJ4R: { code: 'H2ZJ4R', kind: 'saved', productId: 1002, variantId: 2004, customerId: null, name: '', createdAt: '2026-10-13 14:40', expiresAt: '2027-01-11', views: 9, choices: { options: { shade: 'olive', arm: 'black' } } },
			D1041A: { code: 'D1041A', kind: 'cart', productId: 1001, variantId: 2003, customerId: 302, name: '', createdAt: '2026-10-14 10:31', expiresAt: null, views: 0, choices: { options: { frame: 'smoked', pillow: 'with', 'pillow-fabric': 'mustard' }, decals: {} } },
			D1042A: { code: 'D1042A', kind: 'cart', productId: 1003, variantId: 2005, customerId: 301, name: '', createdAt: '2026-10-15 09:12', expiresAt: null, views: 0, choices: { options: { glaze: 'ink' }, decals: { front: { kind: 'text', text: 'Hello, Sam', font: 'Georgia', color: '#ffffff', size: 0.9, x: 0, y: 0, rotation: 0 } } } },
		},

		// Shopify orders as our app sees them (orders/create webhook → OrderConfig).
		// transform: how the Cart Transform Function priced the line ('expand' all plans, 'update' Plus).
		orders: {
			1041: {
				id: 1041,
				name: '#1041',
				date: '2026-10-14 10:34',
				customerId: 302,
				financial: 'Paid',
				fulfillment: 'Unfulfilled',
				shipping: 0,
				lines: [
					{
						id: 1,
						productId: 1001,
						variantId: 2003,
						qty: 1,
						designCode: 'D1041A',
						transform: 'expand',
						base: 469,
						addons: [
							{ label: 'Frame finish: Smoked oak', amount: 60 },
						],
						properties: [
							{ name: 'Frame finish', value: 'Smoked oak' },
							{ name: 'Pillow', value: 'With pillow' },
							{ name: 'Pillow fabric', value: 'Mustard' },
							{ name: '_3d_design', value: 'D1041A' },
							{ name: '_3d_hash', value: '9f3a51c2' },
						],
					},
				],
			},
			1042: {
				id: 1042,
				name: '#1042',
				date: '2026-10-15 09:15',
				customerId: 301,
				financial: 'Paid',
				fulfillment: 'Fulfilled',
				shipping: 6,
				lines: [
					{
						id: 1,
						productId: 1003,
						variantId: 2005,
						qty: 2,
						designCode: 'D1042A',
						transform: 'expand',
						base: 24,
						addons: [{ label: 'Name on the mug: "Hello, Sam"', amount: 6 }],
						properties: [
							{ name: 'Glaze', value: 'Ink' },
							{ name: 'Name on the mug', value: 'Hello, Sam' },
							{ name: '_3d_design', value: 'D1042A' },
							{ name: '_3d_hash', value: '0b7e22d9' },
						],
					},
					{ id: 2, productId: 1006, variantId: 2009, qty: 1, designCode: null, transform: null, base: 79, addons: [], properties: [] },
				],
			},
		},

		cart: { lines: [], note: '' },

		demo: {
			customerId: 301, // logged-in shopper on the storefront / customer account
			currency: 'USD', // USD | EUR (Markets)
			seq: 1043,
		},
	};
}
