// Renders one 3D Viewer block (b3dviewer/modelviewer attrs) the way the plugin's frontend does
// (3d-viewer-premium Components/Common/Viewer.tsx + ModelViewer.tsx + style.scss).
// Used by the block editor canvas, the Visual Editor, the storefront page and Woo product pages.
// On free, Pro-only attributes are ignored (kept in the data, not applied).
import { html, useEffect, useRef, useState, useMemo, cx, money } from '../../js/core/ui.js';
import { useStore } from '../../js/core/store.js';
import { go } from '../../js/core/router.js';
import { addToCart, captureLine } from '../../js/screens/store/theme.js';
import { ModelViewer } from '../ui/mv.js';
import { MODELS, modelKeyFromUrl } from '../ui/models.js';
import { useIsPro } from '../core/plan.js';
import { toast } from '../core/bus.js';

// ── Attribute helpers (shared with the editor) ─────────────────────────────

export const CONTROL_KEYS = ['zoom', 'fullscreen', 'camera', 'download', 'reset', 'dimensions', 'ar'];
export const CONTROLS_DEFAULTS = {
	labels: 'off',
	text: {},
	corner: { zoom: 'bottom-right', fullscreen: 'bottom-right', camera: 'bottom-left', download: 'bottom-left', reset: 'bottom-left', dimensions: 'bottom-left', ar: 'bottom-left' },
	order: CONTROL_KEYS,
	size: 35,
	gap: 10,
	offset: 10,
};
export const PINS_DEFAULTS = { size: 28, color: '#15171a', background: '#ffffff' };
export const DIM_DEFAULTS = { mode: 'off', unit: 'cm', color: '' };
export const MOBILE_DEFAULTS = { imageMode: 'off', tapLabel: '', breakpoint: 768, reduceMotion: false };

export const LABELS = {
	zoomIn: 'Zoom in',
	zoomOut: 'Zoom out',
	fullscreenOpen: 'Enter fullscreen',
	fullscreenClose: 'Exit fullscreen',
	camera: 'Save image of the model',
	download: 'Download the 3D model file',
	reset: 'Reset view',
	dimensionsShow: 'Show dimensions',
	dimensionsHide: 'Hide dimensions',
	ar: 'View in AR',
	qrTitle: 'QR Code',
	qrHelp: 'Scan QR code to view in AR on mobile',
	qrAlt: 'QR code linking to the augmented reality view',
	qrClose: 'Close QR code',
	view3d: 'View in 3D',
	prevModel: 'Previous model',
	nextModel: 'Next model',
	modelAlt: 'A 3D model',
	modelNumber: 'Model %d',
	variant: 'Variant',
	animations: 'Animations',
	playVideo: 'Play video',
	viewProduct: 'View product',
	addToCart: 'Add to cart',
	outOfStock: 'Out of stock',
	videoUnavailable: 'This video cannot be shown.',
	closePopup: 'Close',
};

export const normalizeControls = (c) => {
	const src = c && typeof c === 'object' ? c : {};
	return { ...CONTROLS_DEFAULTS, ...src, corner: { ...CONTROLS_DEFAULTS.corner, ...(src.corner || {}) }, text: { ...(src.text || {}) } };
};

/** True when the block shows several models (Pro only: without a licence the repeater never renders). */
export const isMultiple = (a, pro = true) => !!(pro && a?.multiple && (a.models || []).length);

/**
 * The model the viewer shows. Single mode keeps it on `model` (block.json); posts saved
 * before that, and the demo seed, keep it on models[0], so fall back to that.
 */
export function currentModel(a, index = 0, pro = true) {
	if (!a) return {};
	if (isMultiple(a, pro)) return a.models[Math.min(index, a.models.length - 1)] || {};
	if (a.model?.modelUrl) return a.model;
	const legacy = a.models?.[0] || {};
	return { ...legacy, ...(a.model || {}), modelUrl: legacy.modelUrl || '', poster: a.model?.poster || legacy.poster || '' };
}

/** Hotspots live on the model; very old posts kept one top-level list. */
export const hotspotsOf = (a, m) => (Array.isArray(m?.hotspots) ? m.hotspots : !a?.multiple && Array.isArray(a?.hotspots) ? a.hotspots : []);

/** Files uploaded in this page session (blob: URL → { name, kind, size, date }). They end with the page. */
export const uploads = new Map();
const deadBlob = (url) => /^blob:/.test(url || '') && !uploads.has(url);

export const fileName = (url) => {
	if (uploads.has(url)) return uploads.get(url).name;
	const last = String(url || '').split(/[?#]/)[0].split('/').pop() || '';
	try {
		return decodeURIComponent(last);
	} catch {
		return last;
	}
};

const UNIT_FACTOR = { mm: 1000, cm: 100, m: 1, in: 39.3701, ft: 3.28084 };
const UNIT_DIGITS = { mm: 0, cm: 1, m: 2, in: 1, ft: 2 };
export const formatDim = (meters, unit = 'cm') => {
	const v = meters * (UNIT_FACTOR[unit] || 100);
	return String(Number(v.toFixed(UNIT_DIGITS[unit] ?? 1)));
};

// ── Icons (Components/Common/icons.tsx) ────────────────────────────────────

const I = {
	plus: html`<svg viewBox="0 0 640 640" aria-hidden="true" focusable="false"><path d="M352 128c0-17.7-14.3-32-32-32s-32 14.3-32 32v160H128c-17.7 0-32 14.3-32 32s14.3 32 32 32h160v160c0 17.7 14.3 32 32 32s32-14.3 32-32V352h160c17.7 0 32-14.3 32-32s-14.3-32-32-32H352V128z" /></svg>`,
	minus: html`<svg viewBox="0 0 640 640" aria-hidden="true" focusable="false"><path d="M96 320c0-17.7 14.3-32 32-32h384c17.7 0 32 14.3 32 32s-14.3 32-32 32H128c-17.7 0-32-14.3-32-32z" /></svg>`,
	fullscreen: html`<svg viewBox="0 0 512 512" aria-hidden="true" focusable="false"><path d="m104 72h48a24 24 0 0 0 24-24 24 24 0 0 0 -24-24h-104a24 24 0 0 0 -24 24v104a24 24 0 0 0 48 0v-48l116 116a22.627 22.627 0 0 0 32 0 22.627 22.627 0 0 0 0-32z" /><path d="m220 292a22.627 22.627 0 0 0 -32 0l-116 116v-48a24 24 0 0 0 -48 0v104a24 24 0 0 0 24 24h104a24 24 0 0 0 24-24 24 24 0 0 0 -24-24h-48l116-116a22.627 22.627 0 0 0 0-32z" /><path d="m464 24h-104a24 24 0 0 0 -24 24 24 24 0 0 0 24 24h48l-116 116a22.627 22.627 0 0 0 0 32 22.627 22.627 0 0 0 32 0l116-116v48a24 24 0 0 0 48 0v-104a24 24 0 0 0 -24-24z" /><path d="m464 336a24 24 0 0 0 -24 24v48l-116-116a22.627 22.627 0 0 0 -32 0 22.627 22.627 0 0 0 0 32l116 116h-48a24 24 0 0 0 -24 24 24 24 0 0 0 24 24h104a24 24 0 0 0 24-24v-104a24 24 0 0 0 -24-24z" /></svg>`,
	exit: html`<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 3.5V9H3.5M3 3l6 6" /><path d="M15 3.5V9h5.5M21 3l-6 6" /><path d="M9 20.5V15H3.5M3 21l6-6" /><path d="M15 20.5V15h5.5M21 21l-6-6" /></svg>`,
	close: html`<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="#000" d="M11.29 3.29a1 1 0 1 1 1.42 1.42L9.41 8l3.3 3.29a1 1 0 0 1-1.42 1.42L8 9.41l-3.29 3.3a1 1 0 0 1-1.42-1.42L6.59 8l-3.3-3.29a1 1 0 0 1 1.42-1.42L8 6.59z" /></svg>`,
	camera: html`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 6.5h-1.28l-.32-1a3 3 0 0 0-2.84-2H9.44A3 3 0 0 0 6.6 5.55l-.32 1H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-8a3 3 0 0 0-3-3zm1 11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h2a1 1 0 0 0 1-.68l.54-1.64a1 1 0 0 1 .95-.68h5.12a1 1 0 0 1 .95.68l.54 1.64a1 1 0 0 0 .9.68h2a1 1 0 0 1 1 1zm-8-9a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm0 6a2 2 0 1 1 2-2 2 2 0 0 1-2 2z" /></svg>`,
	download: html`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 16a1 1 0 0 1-.71-.29l-4-4a1 1 0 1 1 1.42-1.42L11 12.59V3a1 1 0 0 1 2 0v9.59l2.29-2.3a1 1 0 1 1 1.42 1.42l-4 4A1 1 0 0 1 12 16zm7 5a1 1 0 0 0 0-2H5a1 1 0 0 0 0 2z" /></svg>`,
	reset: html`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm-6 8c0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3c-3.31 0-6-2.69-6-6z" /></svg>`,
	ruler: html`<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.7 2.6 2.6 14.7a1.4 1.4 0 0 0 0 2l4.7 4.7a1.4 1.4 0 0 0 2 0L21.4 9.3a1.4 1.4 0 0 0 0-2l-4.7-4.7a1.4 1.4 0 0 0-2 0Z" /><path d="m7.6 11.6 2 2" /><path d="m10.6 8.6 2 2" /><path d="m13.6 5.6 2 2" /></svg>`,
	// ARQROPenerIcon: a phone with an "AR" badge and a cube (Components/Common/icons.tsx).
	ar: html`<svg viewBox="0 0 512 512" width="35" height="35" aria-hidden="true" focusable="false" fill="none" stroke="#000" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10"><g>
		<line x1="223.158" y1="461.837" x2="253.281" y2="461.837" />
		<path d="M97.65,199.11V44.14c0-18.86,15.28-34.14,34.14-34.14h212.86c18.86,0,34.14,15.28,34.14,34.14v36.15" />
		<path d="M97.65,312.89v154.97c0,18.86,15.28,34.14,34.14,34.14h212.86c18.86,0,34.14-15.28,34.14-34.14c0-16.94,0-117.03,0-154.97c0-0.25,0-0.5,0-0.75" />
		<polyline points="318.715,10 298.633,50.163 178.143,50.163 157.726,10" />
		<circle cx="378.791" cy="190.734" r="110.449" />
		<line x1="413.528" y1="187.311" x2="443.052" y2="220.857" />
		<line x1="405.052" y1="150.571" x2="405.052" y2="220.857" />
		<path d="M443.052,168.838c0,10.088-8.846,18.267-19.3,18.267c-5.186,0-18.548,0.081-18.548,0.081c-0.178-50.176-0.117-32.87-0.13-36.614c0,0,12.551,0,18.678,0C434.206,150.571,443.052,158.75,443.052,168.838z" />
		<path d="M313.258,220.857l26.392-69.296c0.54-1.318,2.406-1.32,2.948-0.003l26.152,69.299" />
		<line x1="321.488" y1="203.599" x2="360.652" y2="203.599" />
		<polyline points="395.951,299.85 378.79,312.89 238.221,419.67 97.65,312.89 22.76,256 238.221,92.33 286.961,129.35" />
		<polyline points="293.451,260.85 293.451,287.88 238.221,319.77 183.001,287.88 183.001,224.12 238.221,192.23 270.13,210.66" />
		<polyline points="183.001,224.12 238.221,256 276.98,233.63" />
		<line x1="238.221" y1="256" x2="238.221" y2="319.768" />
	</g></svg>`,
	arrowLeft: html`<svg viewBox="-78.5 0 512 512" aria-hidden="true" focusable="false"><path d="M257 64L291 98 128 262 291 426 257 460 61 262 257 64Z" /></svg>`,
	arrowRight: html`<svg viewBox="-77 0 512 512" aria-hidden="true" focusable="false"><path d="M98 460L64 426 227 262 64 98 98 64 294 262 98 460Z" /></svg>`,
	link: html`<svg class="hotspot-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>`,
};

/** A QR-style symbol drawn locally (same idea as the configurator's AR modal); not a scannable code. */
function qrSvgUrl(text) {
	const N = 29;
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
	const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)), ((h ^= h >>> 16) >>> 0) / 4294967296);
	const grid = Array.from({ length: N }, () => Array(N).fill(-1));
	const finder = (r, c) => {
		for (let y = -1; y <= 7; y++)
			for (let x = -1; x <= 7; x++) {
				const yy = r + y;
				const xx = c + x;
				if (yy < 0 || xx < 0 || yy >= N || xx >= N) continue;
				grid[yy][xx] = y < 0 || x < 0 || y > 6 || x > 6 || Math.max(Math.abs(y - 3), Math.abs(x - 3)) === 2 ? 0 : 1;
			}
	};
	finder(0, 0);
	finder(0, N - 7);
	finder(N - 7, 0);
	for (let i = 8; i < N - 8; i++) grid[6][i] = grid[i][6] = i % 2 === 0 ? 1 : 0;
	let rects = '';
	for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (grid[y][x] === 1 || (grid[y][x] === -1 && rnd() > 0.52)) rects += `<rect x="${x + 2}" y="${y + 2}" width="1" height="1"/>`;
	return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N + 4} ${N + 4}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects}</g></svg>`);
}

const PIN = {
	info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-5M12 8h.01',
	plus: 'M12 5v14M5 12h14',
	dot: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
	link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
	play: 'M7 4l13 8-13 8z',
	pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
	cart: 'M3 4h2l2.6 11.2a1.5 1.5 0 0 0 1.5 1.1h8.3a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2M9 20h.01M18 20h.01',
	question: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
};

function PinBadge({ icon, index, customIcon }) {
	if (icon === 'number') return html`<span class="hotspot-icon hotspot-icon-number" aria-hidden="true">${index + 1}</span>`;
	if (icon === 'custom' && customIcon) return html`<img class="hotspot-icon hotspot-icon-custom" src=${customIcon} alt="" />`;
	return html`<svg class="hotspot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${PIN[icon] || PIN.info} /></svg>`;
}

// hotspots/registry.ts + display.ts + pinIcon.ts: per-type behaviour and how a row resolves.
export const HOTSPOT_TYPES = {
	info: { canPopup: true, card: false, fly: true, annotation: (s) => s !== 'style-1' },
	link: { canPopup: false, card: false, fly: false, annotation: (s) => s !== 'style-1' },
	image: { canPopup: true, card: false, fly: false, annotation: (s) => s !== 'style-1' },
	waypoint: { canPopup: false, card: false, fly: true, annotation: () => false },
	animation: { canPopup: false, card: false, fly: false, annotation: (s) => s !== 'style-1' },
	video: { canPopup: true, card: true, fly: false, annotation: () => true },
	product: { canPopup: true, card: true, fly: false, annotation: () => true },
};
const STYLE_DISPLAY = { 'style-1': 'none', 'style-2': 'always', 'style-3': 'hover', 'style-4': 'hover' };
/** normalize.ts: unknown → info, a link URL without a type → link. */
export const typeOf = (h) => (HOTSPOT_TYPES[h?.type] ? h.type : h?.linkUrl ? 'link' : 'info');
export const displayOverride = (h) => {
	const own = String(h?.display ?? '');
	if (!['always', 'hover', 'popup', 'none'].includes(own)) return '';
	return own === 'popup' && !HOTSPOT_TYPES[typeOf(h)].canPopup ? '' : own;
};
export const resolveDisplay = (h, style) => displayOverride(h) || STYLE_DISPLAY[style] || 'always';
export const hasDisplayChoice = (type) => HOTSPOT_TYPES[type]?.annotation('style-2') ?? true;
const PIN_ICONS = ['text', 'info', 'plus', 'dot', 'number', 'link', 'play', 'cart', 'question', 'custom'];
const pinOf = (h, style) => (PIN_ICONS.includes(h.pinIcon) ? h.pinIcon : style !== 'style-4' ? 'text' : h.type === 'waypoint' ? 'dot' : h.type === 'animation' ? 'play' : 'info');

/** embeds.ts parseVideoUrl, minus the embed src: the demo never loads a remote player. */
export function parseVideoUrl(raw) {
	let url;
	try {
		url = new URL(String(raw || ''));
	} catch {
		return /^blob:/.test(raw || '') ? { provider: 'file', src: raw } : null;
	}
	if (url.protocol === 'blob:') return { provider: 'file', src: raw };
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
	const host = url.hostname.replace(/^www\./, '');
	const yt = host === 'youtu.be' ? url.pathname.slice(1).split('/')[0] : ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host) ? (url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:embed|shorts|v)\/([^/?#]+)/)?.[1]) : null;
	if (yt && /^[\w-]{6,20}$/.test(yt)) return { provider: 'youtube', src: '' };
	const vm = host === 'vimeo.com' ? url.pathname.match(/^\/(?:video\/)?(\d+)/)?.[1] : host === 'player.vimeo.com' ? url.pathname.match(/^\/video\/(\d+)/)?.[1] : null;
	if (vm && /^\d{6,12}$/.test(vm)) return { provider: 'vimeo', src: '' };
	return /\.(mp4|webm|ogg|ogv)$/i.test(url.pathname) ? { provider: 'file', src: raw } : null;
}

const playIcon = html`<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" /></svg>`;

/** types/video.tsx: the player mounts only once the card is opened, never in the editor. */
function VideoContent({ h, open, editor, onOpen }) {
	const embed = parseVideoUrl(h.videoUrl);
	const play = (e) => {
		e.stopPropagation();
		if (!editor && embed?.provider !== 'file') toast('YouTube and Vimeo players load on your site. This demo makes no outside requests, so it shows the placeholder.');
		onOpen();
	};
	return html`${!embed && html`<div class="hotspot-video-note">${LABELS.videoUnavailable}</div>`}
		${embed && (!open || editor || embed.provider !== 'file') && html`<button type="button" class="hotspot-video-placeholder" aria-label=${LABELS.playVideo} onClick=${play}>${playIcon}</button>`}
		${embed && open && !editor && embed.provider === 'file' && html`<video class="hotspot-video" src=${embed.src} controls playsinline preload="none"></video>`}
		${h.desc && html`<div class="annotation-desc">${h.desc}</div>`}`;
}

/** types/product.tsx, read from the demo store instead of the Store API. */
function ProductContent({ h, editor }) {
	const product = useStore((s) => s.products?.[Number(h.productId)]);
	const title = String(h.title ?? '').trim().toLowerCase();
	if (!product) return html`${h.desc && html`<div class="annotation-desc">${h.desc}</div>`}`;
	const inStock = product.stock_status !== 'outofstock';
	const simple = (product.type || 'simple') === 'simple' && inStock;
	const href = '#store.product.' + product.slug;
	const nav = (e) => {
		e.stopPropagation();
		if (editor) e.preventDefault();
	};
	const add = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (editor) return;
		const key = addToCart({ productId: product.id, qty: 1 });
		if (!key) return go('store.product.' + product.slug);
		captureLine(key);
		toast(`“${product.name}” has been added to your cart.`);
	};
	return html`${product.name.trim().toLowerCase() !== title && html`<div class="annotation-title">${product.name}</div>`}
		${h.desc && html`<div class="annotation-desc">${h.desc}</div>`}
		<div class="hotspot-product-price"><span>${money(product.price)}</span></div>
		${!inStock && html`<div class="hotspot-product-note">${LABELS.outOfStock}</div>`}
		${simple
			? html`<a class="hotspot-visit-btn ajax_add_to_cart add_to_cart_button" href=${href} data-product_id=${String(product.id)} data-quantity="1" onClick=${add}>${LABELS.addToCart}</a>
					<a class="hotspot-secondary-link" href=${href} onClick=${nav}>${LABELS.viewProduct}</a>`
			: html`<a class="hotspot-visit-btn" href=${href} onClick=${nav}>${LABELS.viewProduct}</a>`}`;
}

const CONTENT = { video: VideoContent, product: ProductContent };

const linkIcon = html`<svg class="hotspot-link-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>`;
const animIcons = html`<svg class="hotspot-anim-icon hotspot-anim-play" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4" /></svg><svg class="hotspot-anim-icon hotspot-anim-pause" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>`;

function VisitLink({ h, editor }) {
	const newTab = h.openInNewTab === true;
	return html`<a class="hotspot-visit-btn" href=${editor ? '#' : h.linkUrl} target=${newTab ? '_blank' : '_self'} rel=${newTab ? 'noopener noreferrer' : undefined} onClick=${(e) => (e.stopPropagation(), editor && e.preventDefault())}>${linkIcon}${h.linkText || 'Visit Link'}</a>`;
}

/** The shared Popup (HotspotPopupModal): content centred over the page with a dimmed backdrop. */
function HotspotPopup({ h, editor, onClose }) {
	const ref = useRef(null);
	const type = typeOf(h);
	const Content = CONTENT[type];
	useEffect(() => {
		ref.current?.focus();
		const onKey = (e) => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, []);
	return html`<div class="bp3d-hotspot-popup">
		<div class="bp3d-hotspot-popup-backdrop" onClick=${onClose}></div>
		<div class=${'bp3d-hotspot-popup-dialog bp3d-hotspot-popup-dialog--' + type} role="dialog" aria-modal="true" aria-label=${h.title || type} onClick=${(e) => e.stopPropagation()}>
			<button type="button" ref=${ref} class="bp3d-hotspot-popup-close" aria-label=${LABELS.closePopup} onClick=${onClose}>${I.close}</button>
			${h.title && html`<div class="annotation-title">${h.title}</div>`}
			${type === 'image' && h.imageUrl && html`<img class="hotspot-media" src=${h.imageUrl} alt=${h.imageAlt || h.title || ''} loading="lazy" />`}
			${Content
				? html`<${Content} h=${h} open=${true} editor=${editor} onOpen=${() => {}} />`
				: html`${h.desc && html`<div class="annotation-desc">${h.desc}</div>`}${h.linkUrl && html`<${VisitLink} h=${h} editor=${editor} />`}`}
		</div>
	</div>`;
}

/** HotspotCard.tsx: video and product, whose card holds interactive content. */
function CardHotspot({ h, i, style, editor, open, onToggle }) {
	const type = typeOf(h);
	const display = resolveDisplay(h, style);
	const pin = pinOf(h, style);
	const title = h.title ?? 'Title';
	const Content = CONTENT[type];
	return html`<div
		slot=${'hotspot-' + i}
		class=${cx('view-button', style, 'hotspot-card', 'hotspot-type-' + type, displayOverride(h) && 'bp3d-display-' + display, PIN_ICONS.includes(h.pinIcon) && (pin === 'text' ? 'bp3d-pin-text' : 'bp3d-pin-icon'), display === 'popup' && 'hotspot-popup-trigger', open && 'is-open')}
		data-position=${h.position}
		data-normal=${h.normal || '0m 1m 0m'}
		data-shell="card"
		data-visibility-attribute="visible"
	>
		<button type="button" class="hotspot-trigger" aria-expanded=${open} aria-label=${title || undefined} onClick=${(e) => (e.stopPropagation(), onToggle(open ? null : i))}>
			${pin === 'text' ? title : html`<${PinBadge} icon=${pin} index=${i} customIcon=${h.customIcon} />`}
		</button>
		${display !== 'popup' &&
		display !== 'none' &&
		html`<div class="annotation" role="group" aria-label=${title || undefined} onClick=${(e) => e.stopPropagation()}>
			${pin !== 'text' && title && html`<div class="annotation-title">${title}</div>`}
			<${Content} h=${h} open=${open} editor=${editor} onOpen=${() => onToggle(i)} />
		</div>`}
	</div>`;
}

/** LegacyHotspot.tsx: info, link, image, waypoint and animation keep the original <button> markup. */
function Hotspot({ h, i, style, editor, playing, onActivate }) {
	const type = typeOf(h);
	const pin = pinOf(h, style);
	const display = resolveDisplay(h, style);
	const isLink = type === 'link' || (type === 'info' && !!h.linkUrl);
	const title = h.title ?? 'Title';
	const showCard = display === 'always' || display === 'hover';
	const media = type === 'image' && h.imageUrl ? html`<img class="hotspot-media" src=${h.imageUrl} alt=${h.imageAlt || title || ''} loading="lazy" />` : null;
	const common = {
		type: 'button',
		slot: 'hotspot-' + i,
		'data-position': h.position,
		'data-normal': h.normal || '0m 1m 0m',
		'data-visibility-attribute': 'visible',
		onClick: (e) => (e.stopPropagation(), onActivate(h, i)),
	};
	if (type === 'waypoint') {
		return html`<button ...${common} class=${cx('view-button', style, 'hotspot-type-waypoint', PIN_ICONS.includes(h.pinIcon) && (pin === 'text' ? 'bp3d-pin-text' : 'bp3d-pin-icon'))} aria-label=${title || undefined}>
			${pin === 'text' ? title : html`<${PinBadge} icon=${pin} index=${i} customIcon=${h.customIcon} />`}
		</button>`;
	}
	return html`<button
		...${common}
		class=${cx('view-button', style, isLink && 'hotspot-link', !['info', 'link'].includes(type) && 'hotspot-type-' + type, displayOverride(h) && 'bp3d-display-' + display, PIN_ICONS.includes(h.pinIcon) && (pin === 'text' ? 'bp3d-pin-text' : 'bp3d-pin-icon'), playing && 'is-playing')}
		aria-label=${pin !== 'text' ? title : undefined}
		aria-pressed=${type === 'animation' ? !!playing : undefined}
	>
		${pin !== 'text' && html`<${PinBadge} icon=${playing && pin === 'play' ? 'pause' : pin} index=${i} customIcon=${h.customIcon} />`}
		${isLink && pin === 'text' && linkIcon}
		${type === 'animation' && pin === 'text' && animIcons}
		${pin === 'text' && title}
		${showCard &&
		(pin !== 'text' || h.desc || isLink || media) &&
		html`<div class="annotation">
			${media}
			${pin !== 'text' && html`<div class="annotation-title">${title}</div>`}
			${h.desc && html`<div class="annotation-desc">${h.desc}</div>`}
			${isLink && h.linkUrl && html`<${VisitLink} h=${h} editor=${editor} />`}
		</div>`}
	</button>`;
}

function ControlButton({ control, label, mode, icon, onClick, pressed, className }) {
	return html`<button
		type="button"
		class=${cx('control-btn', className)}
		data-control=${control}
		aria-label=${mode === 'inline' ? undefined : label}
		data-label=${mode === 'tooltip' ? label : undefined}
		aria-pressed=${pressed}
		onClick=${(e) => {
			e.stopPropagation();
			onClick();
		}}
	>
		${icon}${mode === 'inline' && html`<span class="control-btn__label">${label}</span>`}
	</button>`;
}

// ── Dimensions (Components/Common/Dimensions.tsx): lines + labels around the bounding box ──

const DIM_SPOTS = ['dot+X-Y+Z', 'dot-X-Y+Z', 'dot+X+Y+Z', 'dot+X-Y-Z', 'dim-X', 'dim-Y', 'dim-Z'];

function useDimensions(ref, on, src, unit, realSize) {
	const [box, setBox] = useState(null);
	useEffect(() => {
		const el = ref.current;
		if (!el || !on) return undefined;
		const read = () => {
			try {
				const s = el.getDimensions();
				const c = el.getBoundingBoxCenter();
				setBox({ x: s.x, y: s.y, z: s.z, cx: c.x, cy: c.y, cz: c.z });
			} catch {
				setBox(null);
			}
		};
		if (el.loaded) read();
		el.addEventListener('load', read);
		return () => el.removeEventListener('load', read);
	}, [on, src]);
	useEffect(() => {
		const el = ref.current;
		if (!el || !on || !box) return undefined;
		let raf = 0;
		const draw = () => {
			raf = 0;
			const svg = el.querySelector('.bp3d-dim-lines');
			if (!svg) return;
			const p = (n) => el.queryHotspot?.('hotspot-' + n)?.canvasPosition;
			const lines = svg.querySelectorAll('line');
			[['dot-X-Y+Z', 'dot+X-Y+Z'], ['dot+X-Y+Z', 'dot+X+Y+Z'], ['dot+X-Y+Z', 'dot+X-Y-Z']].forEach(([s, e], k) => {
				const a = p(s);
				const b = p(e);
				if (!a || !b || !lines[k]) return;
				lines[k].setAttribute('x1', a.x);
				lines[k].setAttribute('y1', a.y);
				lines[k].setAttribute('x2', b.x);
				lines[k].setAttribute('y2', b.y);
			});
		};
		const queue = () => (raf ||= requestAnimationFrame(draw));
		const timers = [60, 300, 900].map((ms) => setTimeout(queue, ms));
		el.addEventListener('camera-change', queue);
		const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => setTimeout(queue, 30)) : null;
		ro?.observe(el);
		return () => {
			timers.forEach(clearTimeout);
			cancelAnimationFrame(raf);
			el.removeEventListener('camera-change', queue);
			ro?.disconnect();
		};
	}, [on, box]);
	if (!on || !box) return null;
	const { x, y, z, cx: X, cy: Y, cz: Z } = box;
	const pos = {
		'dot+X-Y+Z': [X + x / 2, Y - y / 2, Z + z / 2],
		'dot-X-Y+Z': [X - x / 2, Y - y / 2, Z + z / 2],
		'dot+X+Y+Z': [X + x / 2, Y + y / 2, Z + z / 2],
		'dot+X-Y-Z': [X + x / 2, Y - y / 2, Z - z / 2],
		'dim-X': [X, Y - y / 2, Z + z / 2],
		'dim-Y': [X + x / 2, Y, Z + z / 2],
		'dim-Z': [X + x / 2, Y - y / 2, Z],
	};
	// A real size on one axis scales the other labels to match (RealSizeFields).
	const given = ['width', 'height', 'depth'].find((k) => Number(realSize?.[k]) > 0);
	const measured = { width: x, height: y, depth: z };
	const factor = given ? Number(realSize[given]) / Number(formatDim(measured[given], unit)) : 1;
	const label = (k) => (Number(realSize?.[k]) > 0 ? String(realSize[k]) : String(Number((Number(formatDim(measured[k], unit)) * factor).toFixed(UNIT_DIGITS[unit] ?? 1)))) + ' ' + unit;
	const text = { 'dim-X': label('width'), 'dim-Y': label('height'), 'dim-Z': label('depth') };
	return {
		spots: DIM_SPOTS.map(
			(n) => html`<span key=${n + src} slot=${'hotspot-' + n} class=${n.startsWith('dot') ? 'bp3d-dim-dot' : 'bp3d-dim-label'} data-position=${pos[n].map((v) => v + 'm').join(' ')} data-normal="0m 1m 0m">${text[n] || ''}</span>`
		),
		svg: html`<svg class="bp3d-dim-lines" aria-hidden="true"><line /><line /><line /></svg>`,
	};
}

// ── Textures (Texture panel): base colour / metallic / roughness factors per material ──

const originals = new WeakMap();
// Variant materials load lazily (model-viewer throws on touching them), so only loaded ones count.
const loadedMats = (el) => (el?.model?.materials || []).filter((m) => m.isLoaded !== false);
function applyTextures(el, applied) {
	const mats = loadedMats(el);
	if (!mats.length) return;
	// Remember each material's own factors the first time it is seen (variants load later).
	const orig = originals.get(el.model) || {};
	originals.set(el.model, orig);
	for (const m of mats) {
		if (!orig[m.name]) orig[m.name] = { base: [...m.pbrMetallicRoughness.baseColorFactor], metal: m.pbrMetallicRoughness.metallicFactor, rough: m.pbrMetallicRoughness.roughnessFactor };
	}
	for (const m of mats) {
		const o = orig[m.name];
		if (!o) continue;
		const t = applied?.[m.name] || {};
		const pbr = m.pbrMetallicRoughness;
		pbr.setBaseColorFactor(t.baseColor?.factor?.length ? t.baseColor.factor : o.base);
		const mr = t.metallicRoughness?.factor || [];
		pbr.setMetallicFactor(mr[0] ?? o.metal);
		pbr.setRoughnessFactor(mr[1] ?? o.rough);
	}
}

/** Material names + their current factors, for the editor's Texture panel. */
export function readMaterials(el) {
	const mats = loadedMats(el);
	const orig = el?.model && originals.get(el.model);
	return mats.map((m) => ({
		name: m.name,
		base: orig?.[m.name]?.base || [...m.pbrMetallicRoughness.baseColorFactor],
		metal: orig?.[m.name]?.metal ?? m.pbrMetallicRoughness.metallicFactor,
		rough: orig?.[m.name]?.rough ?? m.pbrMetallicRoughness.roughnessFactor,
	}));
}

const applyView = (el, view) => {
	if (!el) return;
	el.cameraOrbit = view?.orbit || el.getAttribute('camera-orbit') || 'auto auto auto';
	el.cameraTarget = view?.target || 'auto auto auto';
	el.fieldOfView = view?.fov || 'auto';
	el.resetTurntableRotation?.();
};

/** Same reading as model-viewer's camera getters, for "Set Current as Initial View" and hotspots. */
export const getView = (el) =>
	el?.getCameraOrbit ? { orbit: el.getCameraOrbit().toString(), target: el.getCameraTarget().toString(), fov: el.getFieldOfView() + 'deg' } : null;

function useMedia(q) {
	const [on, setOn] = useState(() => typeof matchMedia === 'function' && matchMedia(q).matches);
	useEffect(() => {
		if (typeof matchMedia !== 'function') return undefined;
		const mq = matchMedia(q);
		const f = () => setOn(mq.matches);
		f();
		mq.addEventListener('change', f);
		return () => mq.removeEventListener('change', f);
	}, [q]);
	return on;
}

/**
 * <ViewerBlock attrs=${attrs} device="desktop" editor=${false} onReady=${(el) => …} />
 * Keep this signature stable: other screens import it. Optional, editor-only extras:
 * `index`/`onIndex` (active model), `placing` + `onPlace(hotspot)` (click the model to add a hotspot),
 * `onInfo({ animations, variants, materials })` after each load.
 */
export function ViewerBlock({ attrs, device = 'desktop', editor = false, class: cls, onReady, onLoad, elRef, children, index: ctlIndex, onIndex, placing = false, onPlace, onInfo }) {
	const pro = useIsPro();
	const own = useRef(null);
	const ref = elRef || own;
	const root = useRef(null);
	const a = attrs || {};
	const multiple = isMultiple(a, pro);
	const list = multiple ? a.models : [currentModel(a, 0, pro)];
	const [ownIndex, setOwnIndex] = useState(0);
	const index = Math.max(0, Math.min(ctlIndex ?? ownIndex, list.length - 1));
	const setIndex = (i) => {
		setOwnIndex(i);
		onIndex?.(i);
	};
	const m = currentModel(a, index, pro);
	const model = modelKeyFromUrl(m.modelUrl);
	const controls = pro ? normalizeControls(a.controls) : CONTROLS_DEFAULTS;
	const labelMode = controls.labels;
	const label = (k) => controls.text?.[k === 'fullscreenOpen' ? 'fullscreen' : k.startsWith('dimensions') ? 'dimensions' : k]?.trim() || LABELS[k];
	const dimensions = pro ? { ...DIM_DEFAULTS, ...(a.dimensions || {}) } : DIM_DEFAULTS;
	const mobile = { ...MOBILE_DEFAULTS, ...(a.mobile || {}) };
	const pins = { ...PINS_DEFAULTS, ...(a.pins || {}) };
	const styles = a.styles || {};
	// Outside the editor the width/height follow the page width, like Style.tsx's 1024/640 px media queries.
	const tabletUp = useMedia('(max-width: 1024px)');
	const mobileUp = useMedia('(max-width: 640px)');
	const sized = editor || device !== 'desktop' ? device : mobileUp ? 'mobile' : tabletUp ? 'tablet' : 'desktop';
	const pick = (v, fb) => (v && typeof v === 'object' ? v[sized] || v.desktop || fb : v || fb);
	const height = pick(styles.height, '400px');
	const width = pick(styles.width, '100%');

	const [load, setLoad] = useState({ src: '', loading: true, progress: 0, animations: [], variants: [] });
	// The live <model-viewer> (it remounts when the mobile image or an empty block replaces it).
	const [el, setEl] = useState(null);
	useEffect(() => {
		const live = root.current?.querySelector('model-viewer') || null;
		if (live) ref.current = live;
		if (live !== el) setEl(live);
	});
	const [full, setFull] = useState(false);
	const [dimsOn, setDimsOn] = useState(dimensions.mode === 'always');
	const [qr, setQr] = useState(false);
	const [revealed, setRevealed] = useState(false);
	const narrow = useMedia(`(max-width: ${mobile.breakpoint || 768}px)`);
	const isMobile = device === 'mobile' || (!editor && narrow);
	const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
	const motionOff = pro && mobile.reduceMotion && (isMobile || reducedMotion);
	useEffect(() => setDimsOn(dimensions.mode === 'always'), [dimensions.mode]);

	const lazy = a.lazyLoad === 'lazyload' ? 'lazy' : a.lazyLoad || 'auto';
	const custom = /^(blob:|https?:|data:|\.|\/)/.test(a.environmentImage || '') || /\.(hdr|jpe?g|png|webp)$/i.test(a.environmentImage || '');
	const env = multiple ? m.environmentImage : m.environmentImage || a.environmentImage;
	const useEnvSky = multiple ? m.useEnvironmentAsSkybox : a.useEnvironmentAsSkybox;
	const skybox = pro ? (useEnvSky && (custom || /^(blob:|https?:)/.test(env || '')) ? env : m.skyboxImage) || null : null;
	const zoomLevel = Number(a.zoomLevel) || 1;
	const loaded = load.src === model && !load.loading;
	const animName = pro && a.selectedAnimation && load.animations.includes(a.selectedAnimation) ? a.selectedAnimation : null;
	const shadowOn = a.shadow !== false;
	// AR is free (free block's Model panel, free Viewer.php); free Woo attrs carry none, so no AR there.
	const ar = !!m.arEnabled;

	const mv = {
		'camera-controls': a.mouseControl !== false,
		'disable-zoom': a.zoom === false,
		'interaction-prompt': 'none',
		'touch-action': 'pan-y',
		'shadow-intensity': shadowOn ? 1 : null,
		'shadow-softness': shadowOn ? 1 : null,
		loading: lazy === 'auto' ? null : lazy,
		reveal: a.preload || 'auto',
		exposure: pro ? (m.exposure ?? a.exposure ?? 1) : null,
		'tone-mapping': pro ? m.toneMapping || a.toneMapping || 'neutral' : null,
		'environment-image': pro && env ? env : null,
		'skybox-image': skybox,
		'skybox-height': skybox ? m.skyboxHeight || '0m' : null,
		'auto-rotate': pro && !!a.autoRotate && !motionOff,
		'auto-rotate-delay': pro && a.autoRotate ? Number(a.rotateDelay ?? 3000) : null,
		'rotation-per-second': pro && a.autoRotate && a.rotationPerSecond !== '' ? `${Number(a.rotationPerSecond) || 20}deg` : null,
		autoplay: pro && a.autoplay !== false && !motionOff,
		'animation-name': animName,
		'min-camera-orbit': pro && a.lockYAxisRotation ? 'auto 90deg auto' : pro && a.lockXAxisRotation ? '0deg auto auto' : null,
		'max-camera-orbit': pro && a.lockYAxisRotation ? 'auto 90deg auto' : pro && a.lockXAxisRotation ? '0deg auto auto' : null,
		// Always set, like manageAttributes: removing `scale` makes model-viewer throw.
		scale: pro ? `${zoomLevel} ${zoomLevel} ${zoomLevel}` : '1 1 1',
		'camera-orbit': a.rotate ? `${Number(a.rotateAlongX) || 0}deg ${Number(a.rotateAlongY ?? 75)}deg 105%` : null,
		ar,
		'ar-modes': ar ? [m.arMode || 'quick-look', ...['webxr', 'scene-viewer', 'quick-look'].filter((x) => x !== (m.arMode || 'quick-look'))].join(' ') : null,
		'ar-placement': ar ? m.arPlacement || 'floor' : null,
		'ios-src': ar ? m.modelISOSrc || (MODELS[model]?.ios ? new URL('../models/' + MODELS[model].ios, import.meta.url).href : null) : null,
	};

	// Load / progress / clips, per model (ModelViewer.tsx handleLoad / handleProgress).
	useEffect(() => {
		if (!el) return undefined;
		setLoad({ src: model, loading: true, progress: 0, animations: [], variants: [] });
		const onProgress = (e) => setLoad((s) => ({ ...s, progress: Math.round((e.detail?.totalProgress || 0) * 100) }));
		const done = () => {
			const animations = el.availableAnimations || [];
			const variants = el.availableVariants || [];
			setLoad({ src: model, loading: false, progress: 100, animations, variants });
			applyView(el, m.initialView);
			el.jumpCameraToGoal?.();
			if (pro) applyTextures(el, a.appliedTextures);
			let size = null;
			try {
				const d = el.getDimensions();
				size = { x: d.x, y: d.y, z: d.z };
			} catch {
				size = null;
			}
			onInfo?.({ animations, variants, materials: readMaterials(el), size });
			onLoad?.(el);
		};
		const fail = (e) => e.detail?.type === 'loadfailure' && setLoad((s) => ({ ...s, loading: false }));
		el.addEventListener('progress', onProgress);
		el.addEventListener('load', done);
		el.addEventListener('error', fail);
		return () => {
			el.removeEventListener('progress', onProgress);
			el.removeEventListener('load', done);
			el.removeEventListener('error', fail);
		};
	}, [model, el]);

	useEffect(() => {
		if (loaded) applyView(ref.current, m.initialView);
	}, [JSON.stringify(m.initialView || null)]);

	useEffect(() => {
		const el = ref.current;
		if (!el || !loaded) return;
		if (pro) applyTextures(el, a.appliedTextures);
		else if (el.model && originals.has(el.model)) applyTextures(el, {});
	}, [loaded, pro, JSON.stringify(a.appliedTextures || {})]);

	// A scale change leaves the orbit target behind; re-read `auto` and redraw (manageAttributes applyZoomScale).
	useEffect(() => {
		const el = ref.current;
		if (!el || !loaded) return;
		Promise.resolve(el.updateComplete)
			.then(() => {
				const target = el.cameraTarget;
				if (typeof target === 'string' && target.includes('auto')) el.cameraTarget = target;
				el.jumpCameraToGoal?.();
			})
			.catch(() => {});
	}, [loaded, pro, zoomLevel]);

	useEffect(() => {
		const el = ref.current;
		if (!el || !loaded) return;
		if (!(pro && a.autoplay !== false) || motionOff) el.pause?.();
		else el.play?.();
	}, [loaded, pro, a.autoplay, animName, motionOff]);

	// Click the model to drop a hotspot (Hotspots.tsx, mode === 'new-hotspot').
	useEffect(() => {
		if (!el || !placing) return undefined;
		const click = (e) => {
			const hit = el.positionAndNormalFromPoint?.(e.clientX, e.clientY);
			if (!hit?.normal) return;
			onPlace?.({
				type: 'info',
				title: 'Title',
				desc: '',
				linkUrl: '',
				linkText: 'Visit Link',
				openInNewTab: false,
				orbit: el.getCameraOrbit()?.toString(),
				normal: hit.normal.toString(),
				target: el.getCameraTarget()?.toString(),
				position: hit.position.toString(),
				fov: el.getFieldOfView() + 'deg',
			});
		};
		el.addEventListener('click', click);
		return () => el.removeEventListener('click', click);
	}, [placing, onPlace, el]);

	useEffect(() => {
		const f = () => setFull(document.fullscreenElement === root.current?.querySelector('.bp_model_parent'));
		document.addEventListener('fullscreenchange', f);
		return () => document.removeEventListener('fullscreenchange', f);
	}, []);

	// hotspots/activate.ts: camera types fly, animation toggles its clip, link navigates, cards open.
	const [openSpot, setOpenSpot] = useState(null);
	const [playing, setPlaying] = useState(null);
	const before = useRef(null);
	useEffect(() => (setOpenSpot(null), setPlaying(null), (before.current = null)), [model]);
	useEffect(() => {
		if (openSpot == null || !el) return undefined;
		const close = () => setOpenSpot(null);
		const onKey = (e) => e.key === 'Escape' && close();
		el.addEventListener('click', close);
		document.addEventListener('keydown', onKey);
		return () => (el.removeEventListener('click', close), document.removeEventListener('keydown', onKey));
	}, [openSpot, el]);
	const activate = (h, i) => {
		const el = ref.current;
		if (!el || !h) return;
		const type = typeOf(h);
		if (HOTSPOT_TYPES[type].card || resolveDisplay(h, style) === 'popup') return setOpenSpot(openSpot === i ? null : i);
		if (HOTSPOT_TYPES[type].fly) {
			if (h.orbit) el.cameraOrbit = h.orbit;
			if (h.target) el.cameraTarget = h.target;
			el.fieldOfView = h.fov || '45deg';
		}
		if (type === 'animation') {
			if (playing === i) {
				el.pause?.();
				return setPlaying(null);
			}
			if (!h.animationName || !(el.availableAnimations || []).includes(h.animationName)) return;
			before.current ||= { name: el.animationName, paused: el.paused };
			const repeat = h.animationRepeat || 'once';
			el.animationName = h.animationName;
			el.play?.(repeat === 'loop' ? {} : repeat === 'pingpong' ? { pingpong: true } : { repetitions: 1 });
			setPlaying(i);
			if (repeat === 'once') {
				el.addEventListener(
					'finished',
					() => {
						setPlaying(null);
						const prev = before.current;
						before.current = null;
						if (!prev) return;
						el.animationName = prev.name;
						prev.paused ? el.pause?.() : el.play?.();
					},
					{ once: true }
				);
			}
		}
		if (!editor && type !== 'animation' && (type === 'link' || h.linkUrl) && /^https?:/.test(h.linkUrl || '')) window.open(h.linkUrl, h.openInNewTab ? '_blank' : '_self', 'noopener');
	};
	const goFull = () => {
		const box = root.current?.querySelector('.bp_model_parent');
		if (!box) return;
		if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
		else if (box.requestFullscreen) box.requestFullscreen().catch(() => setFull((f) => !f));
		else setFull((f) => !f);
	};
	const exitFull = () => {
		if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
		setFull(false);
	};
	const capture = () => {
		const el = ref.current;
		if (!el?.toDataURL) return;
		window.open(el.toDataURL('image/png'), '_blank', 'noopener');
	};
	const download = () => {
		const src = ref.current?.src;
		if (src) window.open(src, '_blank', 'noopener');
	};

	const zoomWorks = a.mouseControl !== false && a.zoom !== false;
	const strip = {
		zoom: a.zoomInOutBtn && zoomWorks && [
			html`<${ControlButton} key="zi" control="zoom-in" label=${label('zoomIn')} mode=${labelMode} icon=${I.plus} onClick=${() => ref.current?.zoom?.(2)} />`,
			html`<${ControlButton} key="zo" control="zoom-out" label=${label('zoomOut')} mode=${labelMode} icon=${I.minus} onClick=${() => ref.current?.zoom?.(-2)} />`,
		],
		fullscreen: a.fullscreen !== false && [
			html`<${ControlButton} key="fo" control="fullscreen" className="fullscreen-open" label=${label('fullscreenOpen')} mode=${labelMode} icon=${I.fullscreen} onClick=${goFull} />`,
			html`<${ControlButton} key="fe" control="fullscreen-exit" className="fullscreen-exit" label=${label('fullscreenClose')} mode=${labelMode} icon=${I.exit} onClick=${exitFull} />`,
		],
		camera: a.cameraBtn && html`<${ControlButton} control="camera" className="cameraBtn" label=${label('camera')} mode=${labelMode} icon=${I.camera} onClick=${capture} />`,
		download: a.downloadBtn && html`<${ControlButton} control="download" className="downloadBtn" label=${label('download')} mode=${labelMode} icon=${I.download} onClick=${download} />`,
		reset: a.resetViewBtn && html`<${ControlButton} control="reset" className="resetViewBtn" label=${label('reset')} mode=${labelMode} icon=${I.reset} onClick=${() => applyView(ref.current, m.initialView)} />`,
		dimensions: dimensions.mode !== 'off' && html`<${ControlButton} control="dimensions" className=${cx('dimensionsBtn', dimsOn && 'is-active')} label=${label(dimsOn ? 'dimensionsHide' : 'dimensionsShow')} mode=${labelMode} icon=${I.ruler} pressed=${dimsOn} onClick=${() => setDimsOn((v) => !v)} />`,
		ar: ar && html`<div class="ar-qrcode"><${ControlButton} control="ar" className="ar-qr-opener" label=${label('ar')} mode=${labelMode} icon=${I.ar} onClick=${() => (ref.current?.canActivateAR ? ref.current.activateAR() : setQr(true))} /></div>`,
	};
	const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

	const dims = useDimensions(ref, pro && dimensions.mode !== 'off' && dimsOn && loaded, model, dimensions.unit, m.realSize);
	const hotspots = pro ? hotspotsOf(a, m) : [];
	const style = a.hotspotStyle || 'style-2';
	const poster = m.poster || '';
	const showMobileImage = pro && mobile.imageMode !== 'off' && !!poster && isMobile && !revealed;
	const bgImage = pro && styles.bgImage ? styles.bgImage : '';
	const bg = styles.bgColor && styles.bgColor !== 'transparent' ? styles.bgColor : 'transparent';
	const thumb = pro ? String(styles.thumbSize || '90px').replace(/^(\d+)$/, '$1px') : '90px';

	const vars = {
		width: '100%',
		...(pro ? { '--bp3d-ctl-size': controls.size + 'px', '--bp3d-ctl-gap': controls.gap + 'px', '--bp3d-ctl-offset': controls.offset + 'px' } : {}),
		...(pro ? { '--bp3d-pin-size': pins.size + 'px', '--bp3d-pin-color': pins.color, '--bp3d-pin-bg': pins.background } : {}),
		...(dimensions.color ? { '--bp3d-dim-color': dimensions.color } : {}),
		'--ld-thumb': thumb,
		'--ld-progress': styles.progressBarColor || '#666',
	};

	const popupSpot = openSpot != null && hotspots[openSpot] && resolveDisplay(hotspots[openSpot], style) === 'popup' ? hotspots[openSpot] : null;
	const popup = popupSpot && html`<${HotspotPopup} key=${openSpot} h=${popupSpot} editor=${editor} onClose=${() => setOpenSpot(null)} />`;
	const additional = a.additional || {};
	// Viewer.tsx: the ID goes on the inner wrapper; the old shared id stays where custom CSS targets it.
	const userCSS = pro && typeof additional.CSS === 'string' && additional.CSS.trim() ? additional.CSS : '';
	const wrapperId = (pro && additional.ID) || (userCSS.includes('additional_id') ? 'additional_id' : undefined);
	const gone = deadBlob(m.modelUrl);
	const empty = !m.modelUrl || gone;

	return html`<div
		ref=${root}
		class=${cx('ld-viewer', 'modelViewerBlock', 'b3dviewer', cls, editor && 'is-editor', multiple && a.isPagination && 'modelPagination', labelMode !== 'off' && 'labels-' + labelMode, placing && 'is-placing', a.progressBar === false && 'no-progressbar')}
		style=${vars}
	>
		<div id=${wrapperId} class=${cx('b3dviewer-wrapper', 'bp_model_parent', additional.Class, full && 'fullscreen')} style=${{ width, height, maxWidth: '100%' }}>
			${userCSS && html`<style>${userCSS}</style>`}
			${showMobileImage &&
			html`<div class="bp3d-mobile-image">
				<img src=${poster} alt=${m.modelName || '3D model preview'} />
				${mobile.imageMode === 'tap' && html`<button type="button" class="bp3d-mobile-image__tap" onClick=${() => setRevealed(true)}>${mobile.tapLabel || LABELS.view3d}</button>`}
			</div>`}
			${!showMobileImage &&
			!empty &&
			html`<${ModelViewer}
				model=${model}
				attrs=${mv}
				elRef=${ref}
				onReady=${onReady}
				alt=${m.modelName || LABELS.modelAlt}
				style=${{ width: '100%', height: '100%', display: 'block', backgroundColor: bg, ...(bgImage ? { backgroundImage: `url("${bgImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) }}
			>
				${hotspots.map((h, i) => {
					if (!h?.position) return null;
					const key = i + ':' + h.position + ':' + model;
					return HOTSPOT_TYPES[typeOf(h)].card || resolveDisplay(h, style) === 'popup'
						? html`<${CardHotspot} key=${key} h=${h} i=${i} style=${style} editor=${editor} open=${openSpot === i} onToggle=${(n) => setOpenSpot(n)} />`
						: html`<${Hotspot} key=${key} h=${h} i=${i} style=${style} editor=${editor} playing=${playing === i} onActivate=${activate} />`;
				})}
				${dims?.spots}
				${dims?.svg}
				<span slot="interaction-prompt" style="display:none"></span>
				<span slot="ar-button"></span>
				<button type="button" slot="poster" class="bp3d-default-poster" aria-label=${m.modelName || LABELS.modelAlt} style=${poster ? { backgroundImage: `url("${poster}")` } : {}}></button>
				${!loaded &&
				(a.loadingPercentage
					? html`<div class="percentageWrapper" slot="progress-bar"><div class="overlay"></div><span class="percentage">${load.progress}%</span></div>`
					: html`<div class="bp3d_loader" slot="progress-bar">
							<div class="overlay"></div>
							<span class="bp3d_loader__spin"></span>
							${a.progressBar !== false && html`<span class="ld-progress"><span style=${{ width: Math.max(4, load.progress) + '%' }}></span></span>`}
						</div>`)}
				<div class="bp3d-selectors">
					${pro && a.variant && loaded && load.variants.length > 0
						? html`<div class="variantWrapper select">
								<label>${LABELS.variant}</label>
								<select onChange=${(e) => (ref.current.variantName = e.currentTarget.value)}>${load.variants.map((v) => html`<option key=${v} value=${v}>${v}</option>`)}</select>
							</div>`
						: pro && editor && a.variant && loaded && html`<span class="ld-viewer__none">No variants found - </span>`}
					${pro && a.animation && loaded && load.animations.length > 0
						? html`<div class="animationWrapper select">
								<label>${LABELS.animations}</label>
								<select
									value=${animName || ''}
									onChange=${(e) => {
										const el = ref.current;
										el.animationName = e.currentTarget.value;
										el.play?.();
									}}
								>
									<option value="">Default</option>
									${load.animations.map((v) => html`<option key=${v} value=${v}>${v}</option>`)}
								</select>
							</div>`
						: pro && editor && a.animation && loaded && html`<span class="ld-viewer__none"> No animations found</span>`}
				</div>
				${multiple &&
				a.isPagination &&
				html`<div class="slider">
					<div class="slides">
						${list.map(
							(item, i) => html`<button type="button" key=${i} class=${cx('slide', i === index && 'selected', !item.poster && 'slide-number')} aria-label=${item.modelName || LABELS.modelNumber.replace('%d', i + 1)} aria-pressed=${i === index} onClick=${(e) => (e.stopPropagation(), setIndex(i))}>
								${item.poster ? html`<img src=${item.poster} alt="" />` : html`<span>${i + 1}</span>`}
							</button>`
						)}
					</div>
				</div>`}
				${multiple &&
				a.isNavigation &&
				list.length > 1 &&
				html`<div class="slideController">
					<button type="button" class=${cx('arrow-left', index <= 0 && 'disabled')} aria-label=${LABELS.prevModel} aria-disabled=${index <= 0} onClick=${(e) => (e.stopPropagation(), setIndex(Math.max(0, index - 1)))}>${I.arrowLeft}</button>
					<button type="button" class=${cx('arrow-right', index >= list.length - 1 && 'disabled')} aria-label=${LABELS.nextModel} aria-disabled=${index >= list.length - 1} onClick=${(e) => (e.stopPropagation(), setIndex(Math.min(list.length - 1, index + 1)))}>${I.arrowRight}</button>
				</div>`}
				${children}
			<//>`}
			${empty && html`<div class="ld-viewer__empty">${gone ? 'This file was uploaded in an earlier visit. Uploads stay in the browser tab only, so add it again.' : multiple ? 'Upload a 3D Model' : 'Add Your 3D Model'}</div>`}
			${!showMobileImage &&
			!empty &&
			corners.map((corner) => {
				const keys = (pro ? [...new Set([...(controls.order || []), ...CONTROL_KEYS])] : CONTROL_KEYS).filter((k) => strip[k] && (controls.corner[k] || CONTROLS_DEFAULTS.corner[k]) === corner);
				const pinned = corner === 'top-right' ? html`<${ControlButton} control="fullscreen-close" className="fullscreen-close" label=${label('fullscreenClose')} mode=${labelMode} icon=${I.close} onClick=${exitFull} />` : null;
				if (!keys.length && !pinned) return null;
				return html`<div key=${corner} class=${'position-' + corner} data-corner=${corner}>${pinned}${keys.map((k) => strip[k])}</div>`;
			})}
			${full && popup}
		</div>
		${!full && popup}
		${qr &&
		html`<div class="bp3d-qr-overlay" onClick=${() => setQr(false)}>
			<div class="qr-content" role="dialog" aria-modal="true" aria-label=${LABELS.qrTitle} onClick=${(e) => e.stopPropagation()}>
				<${ControlButton} control="qr-close" className="qr-content-close" label=${LABELS.qrClose} icon=${I.close} onClick=${() => setQr(false)} />
				<strong>${LABELS.qrTitle}</strong>
				<p>${LABELS.qrHelp}</p>
				<img class="ld-qr-img" src=${qrSvgUrl(location.href.split('#')[0] + '?bp3d-action=view-ar')} alt=${LABELS.qrAlt} />
				<small class="ld-qr-note">A sample code: on your site this is a QR code for the page. Open the demo on a phone to try AR.</small>
			</div>
		</div>`}
	</div>`;
}
