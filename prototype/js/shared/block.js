// block: the wc3d/product-viewer block / Elementor widget data (specs/block.md): attribute defaults,
// demo templates and pages, viewer overrides, and the "Theme" store-setup switch.
import { html, useMemo, cx } from '../core/ui.js';
import { store, useStore } from '../core/store.js';
import { useFeature } from '../core/features.js';
import { defaultSingleProduct, seedTemplates, seedPages } from '../data/block-seed.js';

export const BLOCK_NAME = 'wc3d/product-viewer';
export const WIDGET_TYPE = 'wc3d-product-viewer';
export const BLOCK_TITLE = '3D Product Viewer';
export const BLOCK_DESC = "Show a product's interactive 3D model, with the customizer and AR.";

export const DEFAULT_ATTRS = {
	productId: 0,
	variationId: 0,
	placement: 'gallery',
	aspect: '1/1',
	height: 480,
	width: 100,
	align: '',
	customizer: 'product',
	controls: null,
	background: 'product',
	backgroundColor: '#ffffff',
	className: '',
};

export const ASPECTS = [
	['1/1', 'Square'],
	['4/3', '4:3'],
	['16/9', '16:9'],
	['fixed', 'Fixed height'],
];
export const WIDTHS = [25, 50, 75, 100];
export const CONTROL_KEYS = [
	['zoom', 'Zoom buttons'],
	['reset', 'Reset view'],
	['autorotate', 'Auto-rotate'],
	['download', 'Download'],
	['gallery', 'Gallery of different sides'],
];

/** Saved attributes over the defaults (an older block renders the same). */
export function attrsOf(block) {
	return { ...DEFAULT_ATTRS, ...(block?.attrs || {}) };
}

/** Attributes for a newly inserted block. productId -1 = "Choose a product" with nothing picked yet (renders nothing). */
export function newAttrs({ productTemplate }) {
	return productTemplate ? { productId: 0, aspect: '1/1', placement: 'gallery' } : { productId: -1, aspect: '16/9' };
}

// ── Demo templates and pages (data in data/block-seed.js) ─────────────────

export { defaultSingleProduct, seedTemplates, seedPages };

export const templateOf = (state, slug = 'single-product') => state.wpTemplates?.[slug] || defaultSingleProduct();
export const pagesOf = (state) => state.wpPages || seedPages();
export const pageBySlug = (state, slug) => Object.values(pagesOf(state)).find((p) => p.slug === slug && p.status === 'publish') || null;

/** Depth-first list of blocks (with their parent array and index). */
export function walk(blocks, fn, parent = null) {
	(blocks || []).forEach((bl, i) => {
		fn(bl, { list: blocks, index: i, parent });
		if (bl.inner) walk(bl.inner, fn, bl);
	});
}

export function findBlock(blocks, id) {
	let hit = null;
	walk(blocks, (bl, at) => {
		if (bl.id === id) hit = { block: bl, ...at };
	});
	return hit;
}

/** Viewer blocks of the current product in a template (render rule 6). */
export function currentViewerBlocks(template) {
	const out = [];
	walk(template?.blocks, (bl) => bl.name === BLOCK_NAME && !Number(bl.attrs?.productId) && out.push(bl));
	return out;
}

/** Does the template hide the gallery (a current-product viewer with placement gallery)? */
export const replacesGallery = (template) => currentViewerBlocks(template).some((bl) => attrsOf(bl).placement !== 'standalone');

/** Immutable map over a block tree. */
export function mapBlocks(blocks, fn) {
	return (blocks || []).map((bl) => {
		const next = fn(bl);
		return next?.inner ? { ...next, inner: mapBlocks(next.inner, fn) } : next;
	});
}

export function removeBlock(blocks, id) {
	return (blocks || []).filter((bl) => bl.id !== id).map((bl) => (bl.inner ? { ...bl, inner: removeBlock(bl.inner, id) } : bl));
}

/** Insert `block` after `afterId` in its parent list, else at the end (before a trailing footer part). */
export function insertBlock(blocks, block, afterId) {
	if (afterId && findBlock(blocks, afterId)) {
		const ins = (list) => list.flatMap((bl) => (bl.id === afterId ? [bl, block] : [bl.inner ? { ...bl, inner: ins(bl.inner) } : bl]));
		return ins(blocks);
	}
	const list = (blocks || []).slice();
	const last = list[list.length - 1];
	const at = last?.name === 'core/template-part' && last.attrs?.slug === 'footer' ? list.length - 1 : list.length;
	list.splice(at, 0, block);
	return list;
}

/** Move a block up (-1) or down (+1) among its siblings. */
export function moveBlock(blocks, id, dir) {
	const mv = (list) => {
		const i = list.findIndex((bl) => bl.id === id);
		if (i >= 0) {
			const j = i + dir;
			if (j < 0 || j >= list.length) return list;
			const next = list.slice();
			[next[i], next[j]] = [next[j], next[i]];
			return next;
		}
		return list.map((bl) => (bl.inner ? { ...bl, inner: mv(bl.inner) } : bl));
	};
	return mv(blocks || []);
}

/** Next free client id with a prefix ('b' → b1, b2…), deterministic. */
export function nextBlockId(blocks, prefix = 'b') {
	let max = 0;
	walk(blocks, (bl) => {
		const m = String(bl.id).match(new RegExp('^' + prefix + '(\\d+)$'));
		if (m) max = Math.max(max, Number(m[1]));
	});
	return prefix + (max + 1);
}

// ── Viewer overrides (ViewerBootstrapBuilder overrides) ────────────────────

/**
 * Overrides for <StorefrontViewer overrides>: { customizerEnabled?, controls?, background?, loadingTrigger? }.
 * `current` = the block shows the page's own product (the only case where the customizer can run).
 */
export function viewerOverrides(attrs, { current, editor = false } = {}) {
	const a = { ...DEFAULT_ATTRS, ...attrs };
	const o = {};
	if (!current) o.customizerEnabled = false;
	else if (a.customizer === 'show') o.customizerEnabled = true;
	else if (a.customizer === 'hide') o.customizerEnabled = false;
	if (a.controls && typeof a.controls === 'object') o.controls = { ...a.controls };
	if (a.background === 'transparent') o.background = { backgroundType: 'transparent' };
	else if (a.background === 'color') o.background = { backgroundType: 'color', backgroundColor: a.backgroundColor || '#ffffff' };
	if (editor) {
		o.loadingTrigger = 'eager';
		o.customizerModal = false; // customizer-modal: a full-screen modal would cover the editor
	}
	return o;
}

/** viewerSettingsFor() result with block overrides applied; no overrides = unchanged. */
export function overrideSettings(settings, o) {
	if (!o) return settings;
	const s = { ...settings };
	if (o.loadingTrigger) s.loadingTrigger = o.loadingTrigger;
	if (typeof o.customizerEnabled === 'boolean') s.customizerEnabled = o.customizerEnabled;
	if (typeof o.customizerModal === 'boolean') s.customizerModal = o.customizerModal;
	if (o.controls) {
		s.controls = { ...s.controls, ...o.controls };
		s.showGallery = !!o.controls.gallery;
	}
	return s;
}

/** Effective config with the block's background (replaces the product's); memoised. */
export function useBlockConfig(config, o) {
	const key = o?.background ? JSON.stringify(o.background) : '';
	return useMemo(() => (key ? { ...config, environment: { ...(config?.environment || {}), backgroundImageUrl: undefined, ...o.background } } : config), [config, key]);
}

/** Inline size of the wrapper and the root (aspect ratio or fixed height, width). */
export function blockStyles(attrs) {
	const a = { ...DEFAULT_ATTRS, ...attrs };
	const fixed = a.aspect === 'fixed';
	const h = Math.max(240, Math.min(1000, Number(a.height) || 480));
	const bg = a.background === 'color' ? { '--wc3d-block-bg': a.backgroundColor || '#ffffff' } : a.background === 'transparent' ? { '--wc3d-block-bg': 'transparent' } : {};
	return {
		wrap: a.width < 100 && a.align !== 'wide' && a.align !== 'full' ? { width: a.width + '%' } : undefined,
		root: { ...(fixed ? { height: h + 'px', aspectRatio: 'auto' } : { aspectRatio: a.aspect.replace('/', ' / ') }), ...bg },
	};
}

export function blockClass(attrs, extra) {
	const a = { ...DEFAULT_ATTRS, ...attrs };
	return cx('wp-block-wc3d-product-viewer', a.align && 'align' + a.align, a.width < 100 && 'has-custom-width', a.className, extra);
}

/** [wc3d_viewer …] with the attributes the shortcode gains (spec: shortcode parity). */
export function shortcodeFor(attrs, previewId = 0) {
	const a = { ...DEFAULT_ATTRS, ...attrs };
	const parts = [`id="${a.productId > 0 ? a.productId : previewId || 'PRODUCT_ID'}"`];
	if (a.variationId) parts.push(`variation="${a.variationId}"`);
	if (a.aspect === 'fixed') parts.push(`height="${a.height}"`);
	else if (a.aspect !== '16/9') parts.push(`aspect="${a.aspect}"`);
	if (a.width < 100) parts.push(`width="${a.width}%"`);
	if (a.customizer !== 'product') parts.push(`customizer="${a.customizer === 'show' ? 'yes' : 'no'}"`);
	if (a.controls) parts.push(`controls="${CONTROL_KEYS.filter(([k]) => a.controls[k]).map(([k]) => k).join(',') || 'none'}"`);
	if (a.background === 'transparent') parts.push('background="transparent"');
	if (a.background === 'color') parts.push(`background="${a.backgroundColor}"`);
	if (a.className) parts.push(`class="${a.className}"`);
	return `[wc3d_viewer ${parts.join(' ')}]`;
}

// ── Demo store setup: theme switch ─────────────────────────────────────────

/** true when the storefront renders as a block theme (flag on + demo.theme 'block'). */
export function useBlockTheme() {
	const on = useFeature('block');
	const theme = useStore((s) => s.demo?.theme || 'classic');
	return on && theme === 'block';
}

/** Prototype bar switch "Theme: Classic / Block" (storefront, flag on). */
export function ThemeSwitch() {
	const on = useFeature('block');
	const theme = useStore((s) => s.demo?.theme || 'classic');
	if (!on) return null;
	const set = (v) => store.patch('demo.theme', v);
	return html`<nav class="proto-seg proto-seg--small" aria-label="Theme">
		<span class="proto-seg__label">Theme</span>
		<button class=${cx(theme === 'classic' && 'is-on')} aria-pressed=${theme === 'classic'} onClick=${() => set('classic')}>Classic</button>
		<button class=${cx(theme === 'block' && 'is-on')} aria-pressed=${theme === 'block'} onClick=${() => set('block')}>Block</button>
	</nav>`;
}
