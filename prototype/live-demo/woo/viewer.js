// 3D Viewer's own WooCommerce storefront (SingleProduct.php, ProductsPro.php, Product::getProductAttributes()):
// viewer around the product gallery, Pro's Dedicated Tab, and the shop-loop 3D icon. Renders with ViewerBlock.
import { html, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { useStore } from '../../js/core/store.js';
import { viewerSettingsFor } from '../../js/shared/product-3d.js';
import { ViewerBlock, CONTROL_KEYS } from '../viewer/render.js';
import { viewerAttrs } from '../viewer/attrs.js';
import { isPro } from '../core/plan.js';
import { metaFor, modelRows } from './data.js';

const on = (v) => v === true || v === '1' || v === 1;

/** _bp3d_settings_ value with the plugin's own fallback. */
function setting(state, key, def) {
	const v = state.lv?.settings?.[key];
	return v === undefined || v === '' ? def : v;
}

/** The Woo integration is on unless "3d_woo_switcher" is saved off (ProductMeta::register()). */
export const wooEnabled = (state) => {
	const v = setting(state, '3d_woo_switcher', '1');
	return !(v === false || v === 0 || v === '0');
};

/** What the storefront renders for a product: null when 3D Viewer adds no viewer to it. */
export function productViewer(state, product) {
	if (!product || !wooEnabled(state)) return null;
	const meta = metaFor(state, product.id);
	const rows = modelRows(meta);
	if (!rows.length) return null;
	const pro = isPro(state);
	// The free plugin cannot show Pro's 'tab' position: images only.
	const position = pro || meta.viewer_position !== 'tab' ? meta.viewer_position : 'none';
	return { meta, raw: state.v3dProducts?.[product.id] || {}, rows: pro ? rows : rows.slice(0, 1), pro, position };
}

/** Utils::controlsFromGetter() / mobileAttributes() from the store-wide settings (Pro). */
function settingsControls(state) {
	const corner = {};
	const text = {};
	for (const k of CONTROL_KEYS) {
		const c = setting(state, 'bp3d_control_corner_' + k, '');
		if (c) corner[k] = c;
	}
	for (const k of ['zoomIn', 'zoomOut', 'fullscreen', 'camera', 'download', 'reset', 'dimensions', 'ar']) {
		const t = setting(state, 'bp3d_control_text_' + k, '');
		if (t) text[k] = t;
	}
	return { labels: setting(state, 'bp3d_control_labels', 'off'), corner, text, size: Number(setting(state, 'bp3d_control_size', 35)), gap: Number(setting(state, 'bp3d_control_gap', 10)), offset: Number(setting(state, 'bp3d_control_offset', 10)) };
}

const realSize = (r) => Object.fromEntries(['width', 'height', 'depth'].filter((k) => Number(r?.[k]) > 0).map((k) => [k, Number(r[k])]));

function initialView(v) {
	try {
		const j = JSON.parse(v || '[]');
		return j && !Array.isArray(j) ? j : [];
	} catch {
		return [];
	}
}

/** Product::buildModelsArray(): one model per "Product 3D Models" row. */
export const modelOf = (row) => ({
	modelUrl: row.model_src || '',
	useDecoder: 'none',
	poster: row.poster_src || '',
	skyboxImage: row.skybox_image_src || '',
	environmentImage: row.environment_image_src || '',
	arEnabled: on(row.enable_ar),
	modelISOSrc: row.model_iso_src || '',
	exposure: Number(row.exposure) || 1,
	arPlacement: row.ar_placement || 'floor',
	arMode: row.ar_mode || 'webxr',
	hotspots: Array.isArray(row.hotspots) ? row.hotspots.filter((h) => h && h.position) : [],
	variations: Object.fromEntries(Object.entries(row).filter(([k]) => k.startsWith('attribute_'))),
	initialView: initialView(row.initial_view),
	realSize: realSize(row.real_size),
});

/** Product::getProductAttributes() + get_3d_model_html()'s preset merge, as block attributes. */
export function productAttrs(state, v, placement, height) {
	const { meta, raw, pro } = v;
	const h = height || `${meta.bp_3d_height?.height || '350'}${meta.bp_3d_height?.unit || 'px'}`;
	const zoomFallback = on(setting(state, 'bp_3d_zooming', '1'));
	const zoom = 'bp_3d_zooming' in raw ? on(raw.bp_3d_zooming) : zoomFallback;
	const common = {
		zoom,
		mouseControl: on(setting(state, 'bp_camera_control', '1')),
		fullscreen: on(setting(state, 'bp_3d_fullscreen', '1')),
		progressBar: on(setting(state, 'bp_3d_progressbar', '1')),
		lazyLoad: setting(state, 'bp_3d_loading', 'auto'),
		styles: { height: { desktop: h, tablet: h, mobile: h }, bgColor: meta.bp_model_bg || 'transparent', progressBarColor: '#666' },
		woo: true,
		placement,
	};
	if (!pro) {
		const row = v.rows[0];
		return viewerAttrs({ ...common, model: { modelUrl: row.model_src, poster: row.poster_src || '' }, models: [{ modelUrl: row.model_src, poster: row.poster_src || '', useDecoder: 'none' }] });
	}
	const final = {
		...common,
		currentViewer: meta.currentViewer || 'modelViewer',
		multiple: true,
		models: v.rows.map(modelOf),
		autoplay: on(setting(state, 'bp_3d_autoplay', false)),
		shadow: Number(setting(state, '3d_shadow_intensity', 1)) > 0,
		autoRotate: on(setting(state, 'bp_3d_rotate', false)),
		rotateDelay: Number(setting(state, '3d_rotate_delay', 200)),
		rotationPerSecond: Number(setting(state, '3d_rotate_speed', 20)),
		isPagination: on(meta.show_thumbs),
		isNavigation: on(meta.show_arrows),
		hotspotStyle: meta.hotspot_style || 'style-1',
		pins: { size: Number(meta.bp_3d_pin_size) || 28, color: meta.bp_3d_pin_color || '#15171a', background: meta.bp_3d_pin_background || '#ffffff' },
		rotate: on(meta.bp_model_angle),
		rotateAlongX: meta.angle_property?.top ?? 0,
		rotateAlongY: meta.angle_property?.right ?? 75,
		exposure: 1,
		mobile: {
			imageMode: setting(state, 'bp_3d_mobile_image_mode', 'off'),
			tapLabel: setting(state, 'bp_3d_mobile_tap_label', ''),
			breakpoint: Number(setting(state, 'bp_3d_mobile_breakpoint', 768)),
			reduceMotion: on(setting(state, 'bp_3d_mobile_reduce_motion', false)),
		},
		dimensions: { mode: meta.currentViewer === 'O3DViewer' ? 'off' : meta.bp_3d_dimensions_mode || 'off', unit: 'cm', color: meta.bp_3d_dimension_color || '' },
		controls: settingsControls(state),
	};
	// Presets::getPresetById() wins key by key (wp_parse_args), except the viewer type. Draft or trashed presets still apply.
	const preset = meta.bp_model_template && meta.bp_model_template !== 'none' ? state.vpresets?.[meta.bp_model_template]?.attrs?.preset : null;
	const { currentViewer, ...presetData } = preset && typeof preset === 'object' ? preset : {};
	const attrs = viewerAttrs({ ...final, ...presetData });
	if (preset && height) attrs.styles = { ...attrs.styles, height: { desktop: h, tablet: h, mobile: h } };
	return attrs;
}

/** getModelBasedOnVariants() + defaultModelIndex() (Pro): the row a complete variation pick shows. */
function rowForChoice(rows, chosen, attrNames) {
	const keyOf = (name) => 'attribute_' + name.toLowerCase().replace(/\s+/g, '-');
	const models = rows.map((r) => ({ variations: Object.fromEntries(Object.entries(r).filter(([k]) => k.startsWith('attribute_'))) }));
	const complete = attrNames.length > 0 && attrNames.every((n) => chosen?.[n]);
	if (!complete) return Math.max(0, models.findIndex((m) => Object.values(m.variations).length > 0 && Object.values(m.variations).every((x) => x === 'all')));
	const sel = Object.fromEntries(attrNames.map((n) => [keyOf(n), String(chosen[n])]));
	let i = models.findIndex((m) => Object.keys(sel).every((k) => [sel[k], sel[k].replace(/ /g, '-'), 'all'].includes(m.variations[k])));
	if (i < 0) i = models.findIndex((m) => Object.keys(sel).some((k) => m.variations[k] === 'all'));
	return i;
}

/** One product viewer: the 3D Viewer block in Woo mode (Pro: models slider with thumbnails/arrows). */
export function ProductViewer({ v, placement, height, square, chosen, attrNames = [], class: cls }) {
	const state = useStore();
	const [index, setIndex] = useState(0);
	useEffect(() => {
		if (!v.pro || v.rows.length < 2) return;
		const i = rowForChoice(v.rows, chosen, attrNames);
		if (i >= 0) setIndex(i);
	}, [JSON.stringify(chosen || {})]);
	const i = Math.min(index, v.rows.length - 1);
	return html`<div class=${cx('ld-woo-viewer', 'modelViewerBlock wooCustomSelector', 'position_' + v.position, square && 'ld-woo-viewer--square', cls)}>
		<div class="ld-woo-viewer__stage">
			<${ViewerBlock} attrs=${productAttrs(state, v, placement, square ? '100%' : height)} index=${i} onIndex=${setIndex} />
		</div>
	</div>`;
}

const CUBE = html`<svg aria-hidden="true" focusable="false" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><g><path d="m430.928 233.886v33.008c32.309 16.144 51.082 36.127 51.082 55.951 0 45.434-91.41 81.126-181.847 88.649-8.257.68-14.395 7.927-13.705 16.174.648 7.932 7.487 14.336 16.174 13.715 78.723-6.481 209.368-40.451 209.368-118.538 0-42.648-41.729-71.987-81.072-88.959z" /><path d="m165.821 360.564c-8.329-8.475-22.804-4.333-25.346 7.31l-6.627 30.346c-99.272-26.719-146.934-84.187-52.598-131.326v-33.008c-123.786 53.4-104.361 153.699 46.19 193.674l-5.959 27.284c-2.555 11.698 9.038 21.593 20.219 17.121l74.974-29.99c9.918-3.966 12.636-16.788 5.128-24.431z" /><path d="m262.671 40.888c-4.624-2.621-10.288-2.597-14.89.06l-121.551 70.177c20.586 11.885 118.654 68.505 129.841 74.964l129.885-75.34z" /><path d="m111.236 277.451c0 5.358 2.858 10.307 7.497 12.986l122.361 70.645v-149.012l-129.859-74.974v140.355z" /><path d="m400.942 277.451v-140.726l-129.858 75.325v149.032l122.361-70.645c4.64-2.679 7.497-7.628 7.497-12.986z" /></g></svg>`;
const IMAGE_ICON = html`<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill="#0D0D0D" /><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm16 0H5v7.92l3.375-2.7a1 1 0 0 1 1.25 0l4.3 3.44 1.368-1.367a1 1 0 0 1 1.414 0L19 14.586V5zM5 19h14v-1.586l-3-3-1.293 1.293a1 1 0 0 1-1.332.074L9 12.28l-4 3.2V19z" fill="#0D0D0D" /></svg>`;

/** Keeps an overlay on top of `target(host)`'s box (measured, so it follows the theme's layout). */
function useOverlayBox(hostRef, target, deps = []) {
	const [box, setBox] = useState(null);
	useEffect(() => {
		const host = hostRef.current;
		const el = host && target(host);
		if (!el) return undefined;
		const measure = () => setBox({ top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight });
		measure();
		const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
		ro?.observe(el);
		window.addEventListener('resize', measure);
		return () => (ro?.disconnect(), window.removeEventListener('resize', measure));
	}, deps);
	return box;
}

/** "Show 3D on First Image of Woocommerce Gallery": the cube icon on the first image swaps it for the model. */
function MergeGallery({ v, gallery, chosen, attrNames }) {
	const ref = useRef(null);
	const [active, setActive] = useState(false);
	const [first, setFirst] = useState(true);
	const box = useOverlayBox(ref, (host) => host.querySelector('.flex-viewport'), [active]);
	const recheck = () => setTimeout(() => setFirst(!!ref.current?.querySelector('.woocommerce-product-gallery__image')?.classList.contains('flex-active-slide')), 0);
	const onClick = (e) => {
		if (e.target.closest?.('.flex-control-thumbs')) setActive(false);
		recheck();
	};
	return html`<div ref=${ref} class="ld-woo-merge" onClick=${onClick}>
		${gallery}
		${box &&
		first &&
		html`<div class=${cx('ld-woo-merge__layer', active && 'is-active')} style=${{ top: box.top + 'px', left: box.left + 'px', width: box.width + 'px', height: box.height + 'px' }}>
			${active && html`<${ProductViewer} v=${v} placement="product-gallery-inline" height=${box.height + 'px'} chosen=${chosen} attrNames=${attrNames} />`}
			<button type="button" class=${cx('ld-woo-toggle', active ? 'view_img' : 'view_3d')} aria-label=${active ? 'View image' : 'View in 3D'} onClick=${(e) => (e.stopPropagation(), setActive(!active))}>${active ? IMAGE_ICON : CUBE}</button>
		</div>`}
	</div>`;
}

/** Variation attributes a shopper picks (keys of `chosen`). */
const attrNamesOf = (product) => (product?.type === 'variable' ? (product.attributes || []).filter((x) => x.variation !== false).map((x) => x.name) : []);

/** woocommerce_before_single_product_summary → renderProductModels(): viewer above/below/instead of the gallery. */
export function ProductGallery({ gallery, product, chosen }) {
	const state = useStore();
	const v = productViewer(state, product);
	const popups = html`<${PopupModels} product=${product} />`;
	if (!v || v.position === 'none' || v.position === 'tab') return html`${gallery}${popups}`;
	const names = attrNamesOf(product);
	if (v.position === 'merge_with_first_image') return html`<${MergeGallery} v=${v} gallery=${gallery} chosen=${chosen} attrNames=${names} />${popups}`;
	const viewer = (square) => html`<${ProductViewer} v=${v} placement="product-gallery" square=${square} chosen=${chosen} attrNames=${names} />`;
	return html`<div class=${cx('product-modal-wrap ld-woo-wrap', 'position_' + v.position)}>
			${v.position === 'replace'
				? html`<div class="woocommerce-product-gallery woocommerce-product-gallery--with-images images">${viewer(false)}</div>`
				: v.position === 'top'
					? html`${viewer(true)}${gallery}`
					: html`${gallery}${viewer(true)}`}
		</div>
		${popups}`;
}

/** Pro: SingleProduct::addProductTab() – "3D View" tab content. */
export function TabViewer({ product, chosen }) {
	const state = useStore();
	const v = productViewer(state, product);
	if (!v) return null;
	return html`<${ProductViewer} v=${v} placement="woocommerce-tab" chosen=${chosen} attrNames=${attrNamesOf(product)} class="ld-woo-viewer--tab" />`;
}

export function hasTab(state, product) {
	const v = productViewer(state, product);
	return !!v && v.position === 'tab';
}

const IMAGE_SRC = /\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?$/i;

/** getClickAbleDom(): an image URL, a CSS selector, or a bare class name; then up to the outermost single-child wrapper. */
function clickable(selector) {
	if (!selector) return null;
	let el = null;
	try {
		el = IMAGE_SRC.test(selector) || /^(https?:|data:|blob:)/.test(selector)
			? document.querySelector(`img[src="${CSS.escape(selector)}"], img[data-src="${CSS.escape(selector)}"], a[href="${CSS.escape(selector)}"]`)
			: document.querySelector(selector.includes('#') || selector.includes('.') ? selector : '.' + selector);
	} catch {
		return null;
	}
	while (el && el.parentElement && el.parentElement.children.length === 1 && el.parentElement !== document.body) el = el.parentElement;
	return el;
}

/** Pro: SingleProductPro::renderPopupModels(): one hidden popup per "Popup 3D Models" row, opened by its Selector. */
export function PopupModels({ product }) {
	const state = useStore();
	const [open, setOpen] = useState(-1);
	const meta = product && isPro(state) && wooEnabled(state) ? metaFor(state, product.id) : null;
	const popups = (Array.isArray(meta?.bp3d_popup_models) ? meta.bp3d_popup_models : []).filter((p) => p && p.model_src);
	const sig = JSON.stringify(popups.map((p) => p.selector));
	useEffect(() => {
		const offs = [];
		const t = setTimeout(() => {
			popups.forEach((p, i) => {
				const el = clickable((p.selector || '').trim());
				if (!el) return;
				const onClick = (e) => (e.preventDefault(), setOpen(i));
				el.addEventListener('click', onClick);
				const cursor = el.style.cursor;
				el.style.cursor = 'pointer';
				offs.push(() => (el.removeEventListener('click', onClick), (el.style.cursor = cursor)));
			});
		}, 0);
		return () => (clearTimeout(t), offs.forEach((f) => f()));
	}, [sig, product?.id]);
	useEffect(() => {
		if (open < 0) return undefined;
		const onKey = (e) => e.key === 'Escape' && !document.fullscreenElement && !document.querySelector('.bp3dv-model-main .bp3d-qr-overlay') && setOpen(-1);
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open]);
	if (!popups.length) return null;
	const p = popups[open];
	if (!p) return null;
	const v = productViewer(state, product);
	const base = v ? productAttrs(state, v, 'popup') : viewerAttrs({ woo: true });
	const authored = (v?.rows || []).find((r) => r.model_src === p.model_src);
	const h = `${meta.bp_3d_height?.height || '350'}${meta.bp_3d_height?.unit || 'px'}`;
	const attrs = {
		...base,
		placement: 'popup',
		loadingPercentage: true,
		currentViewer: p.popupCurrentViewer || 'modelViewer',
		isPagination: false,
		isNavigation: false,
		mouseControl: true,
		multiple: true,
		model: { modelUrl: '', poster: '' },
		styles: { ...base.styles, height: { desktop: h, tablet: h, mobile: h }, bgColor: meta.bp_model_bg || 'transparent' },
		models: [{ modelUrl: p.model_src, poster: p.poster_src || '', useDecoder: 'none', skyboxImage: p.skybox_image_src || '', environmentImage: p.environment_image_src || '', arEnabled: false, hotspots: authored ? modelOf(authored).hotspots : [] }],
	};
	return html`<div class="bp3dv-model-main model-open" id=${p.target || 'bp3dv-popup-' + (open + 1)} data-selector=${p.selector} role="dialog" aria-modal="true" aria-label=${product.name + ' 3D model'}>
		<div class="bp3dv-model-inner">
			<button type="button" class="close-btn" aria-label="Close" onClick=${() => setOpen(-1)}>×</button>
			<div class="bp3dv-model-wrap">
				<div class="pop-up-content-wrap">
					<div class="modelViewerBlock wooCustomSelector wp-block-b3dviewer-modelviewer" data-type="popup"><${ViewerBlock} key=${open + p.model_src} attrs=${attrs} /></div>
				</div>
			</div>
		</div>
		<div class="bg-overlay" onClick=${() => setOpen(-1)}></div>
	</div>`;
}

/** Pro: ProductsPro::appendModelToImage() + ShopLoopItemComponents (3D icon ↔ image icon on the card). */
export function ShopCard3D({ product }) {
	const state = useStore();
	const v = productViewer(state, product);
	const show = !!v && v.pro && on(v.meta.replace_model_with_thumbnail) && !viewerSettingsFor(state, product.id).available;
	const [active, setActive] = useState(() => !!v && on(v.meta.show_model_instead_thumbnail));
	if (!show) return null;
	const stop = (e) => (e.preventDefault(), e.stopPropagation());
	// Sits on the loop thumbnail (square, top of the card link); get_3d_model_html() passes every model row.
	return html`<div class=${cx('ld-woo-card', active && 'active')} onClick=${stop}>
		${active && html`<${ProductViewer} v=${v} placement="shop-loop-item" square />`}
		<button type="button" class=${cx('ld-woo-toggle', active ? 'view_img' : 'view_3d')} data-control=${active ? 'view-image' : 'view-3d'} aria-label=${active ? 'View image' : 'View in 3D'} onClick=${(e) => (stop(e), setActive(!active))}>${active ? IMAGE_ICON : CUBE}</button>
	</div>`;
}
