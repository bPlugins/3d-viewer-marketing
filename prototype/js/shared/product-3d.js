// Product-level 3D helpers over the demo store: model lookup, effective config,
// per-product viewer settings (ProductViewerSettings.php) and the cart summary (CartItemData.php).
import { defaultConfig, resolveEffectiveConfig } from './effective-config.js';
import { applyFilter } from './slots.js';

export const POSITIONS = {
	none: 'None (use shortcode only)',
	replace_image: 'Replace product image with 3D',
	gallery_first: 'Show 3D on first image of WooCommerce gallery',
	modal: 'Popup / Modal (button overlay on the product image)',
	product_tab: 'Inside a "3D View" product tab',
};
export const LOADING_TRIGGERS = ['click', 'scroll', 'eager'];
const DEFAULT_PALETTE = '#ffffff, #000000, #64748b, #ef4444, #f97316, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6, #ec4899';

const meta = (state, pid, key) => state.products?.[pid]?.meta?.[key] ?? '';
const defaultModelId = (state, pid) => Number(meta(state, pid, '_wc3d_model_id')) || 0;

/** Viewer model descriptor for an attachment: {demo} | {url} | null. */
export function modelOf(attachment) {
	if (!attachment) return null;
	if (attachment.demo) return { demo: attachment.demo };
	if (attachment.blobUrl) return { url: attachment.blobUrl, sizeBytes: attachment.sizeBytes };
	// external-url: a URL record with no demo stand-in (same-origin or blob: in the prototype) loads for real.
	if (attachment.source === 'url' && attachment.kind === 'model' && sameOrigin(attachment.url)) return { url: attachment.url, sizeBytes: attachment.sizeBytes };
	return null;
}

function sameOrigin(url) {
	try {
		return new URL(url).origin === location.origin;
	} catch {
		return false;
	}
}

/** Model for a product or variation; a variation with its own model_id (≠ default) uses it. */
export function modelFor(state, productId, variationId = 0) {
	const baseId = defaultModelId(state, productId);
	const rec = variationId ? state.variationConfigs?.[variationId] : null;
	const ownId = Number(rec?.model_id) || 0;
	const hasOwnModel = !!ownId && ownId !== baseId;
	const id = hasOwnModel ? ownId : baseId;
	const attachment = id ? state.attachments?.[id] || null : null;
	return { attachmentId: id, attachment, model: modelOf(attachment), hasOwnModel };
}

/**
 * Resolved config for a product/variation as the storefront sees it. The product
 * background (meta → global) fills environment unless the saved config sets its own
 * (apply_background); pass {background: false} for the raw editor resolution.
 */
export function effectiveFor(state, productId, variationId = 0, { background = true } = {}) {
	let base = state.productConfigs?.[productId]?.config || defaultConfig();
	if (background) base = applyBackground(state, productId, base);
	const rec = variationId ? state.variationConfigs?.[variationId] : null;
	if (!rec?.config) return withoutVariant(state, base);
	return withoutVariant(state, resolveEffectiveConfig(base, rec.config, modelFor(state, productId, variationId).hasOwnModel));
}

// materials-variants off: a saved variant is ignored (and thumbnail cache keys stay apart).
function withoutVariant(state, cfg) {
	if (state.flags?.['materials-variants'] || cfg?.material_variant === undefined) return cfg;
	const { material_variant: _off, ...rest } = cfg;
	return rest;
}

/** Image attachment → URL the prototype can show (flat SVG in the attachment's colour). */
export function attachmentUrl(attachment) {
	if (!attachment) return '';
	if (attachment.blobUrl) return attachment.blobUrl;
	if (attachment.url) return attachment.url;
	if (attachment.kind !== 'image') return '';
	const c = attachment.color || '#e5e7eb';
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs><radialGradient id="g" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="800" height="600" fill="${c}"/><rect y="390" width="800" height="210" fill="#000" fill-opacity=".05"/><rect width="800" height="600" fill="url(#g)"/></svg>`;
	return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function imageBackground(state, imageId) {
	const att = imageId ? state.attachments?.[imageId] : null;
	return { backgroundType: 'image', backgroundImageUrl: att ? attachmentUrl(att) : '', backgroundImageId: imageId };
}

/** ProductViewerSettings::background(): per-product type wins over global. */
export function backgroundFor(state, productId) {
	const s = state.settings || {};
	const type = meta(state, productId, '_wc3d_background_type');
	if (type !== '') {
		if (type === 'transparent') return { backgroundType: 'transparent' };
		if (type === 'color') {
			const color = meta(state, productId, '_wc3d_background_color');
			return { backgroundType: 'color', backgroundColor: color !== '' ? color : '#ffffff' };
		}
		if (type === 'image') return imageBackground(state, Number(meta(state, productId, '_wc3d_background_image_id')) || 0);
	}
	if (s.background_type === 'color') return { backgroundType: 'color', backgroundColor: String(s.background_color ?? '#ffffff') };
	if (s.background_type === 'image') return imageBackground(state, Number(s.background_image_id) || 0);
	return { backgroundType: 'transparent' };
}

/** ProductViewerSettings::apply_background(). */
export function applyBackground(state, productId, config) {
	if (config?.environment?.backgroundType) return config;
	const env = config?.environment && typeof config.environment === 'object' ? config.environment : {};
	return { ...config, environment: { ...env, ...backgroundFor(state, productId) } };
}

const triState = (state, pid, metaKey, optionKey) => {
	const v = meta(state, pid, metaKey);
	if (v === 'yes') return true;
	if (v === 'no') return false;
	return !!state.settings?.[optionKey];
};

/** is_available(): enabled + a model set. */
export function is3DAvailable(state, productId) {
	return applyFilter('wc3d.available', !!productId && meta(state, productId, '_wc3d_enabled') === 'yes' && !!defaultModelId(state, productId), state, productId);
}

/** Resolved per-product viewer settings (meta → global → default) plus the localized globals. */
export function viewerSettingsFor(state, productId) {
	const s = state.settings || {};
	const perPos = meta(state, productId, '_wc3d_position');
	const globalPos = String(s.position ?? '');
	const position = perPos !== '' && perPos in POSITIONS ? perPos : globalPos in POSITIONS ? globalPos : 'replace_image';
	let trigger = meta(state, productId, '_wc3d_loading_trigger');
	if (trigger === '') trigger = String(s.loading_trigger ?? '');
	const loadingTrigger = LOADING_TRIGGERS.includes(trigger) ? trigger : 'click';
	const posterId = Number(meta(state, productId, '_wc3d_poster_id')) || 0;
	const poster = posterId ? state.attachments?.[posterId] || null : null;
	const palette = String(s.customizer_color_palette || DEFAULT_PALETTE)
		.split(',')
		.map((c) => c.trim())
		.filter(Boolean);
	return {
		available: is3DAvailable(state, productId),
		position,
		loadingTrigger,
		customizerEnabled: triState(state, productId, '_wc3d_enable_customizer', 'enable_customizer'),
		showGallery: triState(state, productId, '_wc3d_show_gallery', 'show_gallery'),
		showOnShop: meta(state, productId, '_wc3d_show_on_shop') === 'yes' || !!s.show_listing_viewer,
		showListingIcon: !!s.show_listing_icon,
		posterId,
		poster,
		posterUrl: poster ? attachmentUrl(poster) : '',
		background: backgroundFor(state, productId),
		controls: {
			zoom: !!s.show_zoom_buttons,
			reset: !!s.show_reset_button,
			autorotate: !!s.show_autorotate_button,
			download: !!s.show_download_button,
			gallery: !!s.show_gallery,
		},
		colorPalette: palette,
		// customizer-modal: the feature module's Settings → Features toggle; off = the drawer.
		customizerModal: !!state.flags?.['customizer-modal'],
	};
}

// PHP ucwords(): uppercase the first letter after whitespace.
const ucwords = (s) => s.replace(/(^|[\s])(\S)/g, (m, sp, ch) => sp + ch.toUpperCase());
const partName = (part) => ucwords(String(part).replace(/_/g, ' '));
// PHP round() → half away from zero.
const pct = (v) => {
	const n = Number(v) * 100;
	return String(Math.sign(n) * Math.round(Math.abs(n)));
};

/** CartItemData::format_summary(): 'Seat Cushion (Color: #ef4444); Pillow: Hidden'. */
export function cartSummary(custom) {
	if (!custom || typeof custom !== 'object') return '';
	const lines = [];
	if (custom.materials && typeof custom.materials === 'object') {
		for (const [part, opts] of Object.entries(custom.materials)) {
			if (!opts || typeof opts !== 'object') continue;
			const details = [];
			if (opts.baseColor != null) details.push(`Color: ${opts.baseColor}`);
			if (opts.metalness != null) details.push(`Metalness: ${pct(opts.metalness)}%`);
			if (opts.roughness != null) details.push(`Roughness: ${pct(opts.roughness)}%`);
			if (details.length) lines.push(`${partName(part)} (${details.join(', ')})`);
		}
	}
	if (custom.meshes && typeof custom.meshes === 'object') {
		for (const [part, opts] of Object.entries(custom.meshes)) {
			if (opts && typeof opts === 'object' && opts.visible != null) {
				lines.push(`${partName(part)}: ${opts.visible ? 'Shown' : 'Hidden'}`);
			}
		}
	}
	return lines.join('; ');
}
