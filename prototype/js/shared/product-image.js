// Product photo stand-in: a rendered thumbnail of the product's model (variation look included)
// on image.bg, or a flat SVG illustration for products without a model.
import { html, useState, useEffect, cx } from '../core/ui.js';
import { useStore } from '../core/store.js';
import { renderThumbnail } from '../engine/thumbnail.js';
import { effectiveFor } from './product-3d.js';

const ILLUSTRATIONS = {
	backpack: (c, bg) => `
		<rect x="70" y="58" width="60" height="30" rx="15" fill="none" stroke="${c}" stroke-width="7"/>
		<path d="M48 92c0-14 11-24 25-24h54c14 0 25 10 25 24v104c0 8-6 14-14 14H62c-8 0-14-6-14-14z" fill="${c}"/>
		<path d="M48 120h104" stroke="#000" stroke-opacity=".12" stroke-width="3"/>
		<rect x="66" y="138" width="68" height="50" rx="10" fill="#fff" fill-opacity=".14"/>
		<rect x="66" y="138" width="68" height="12" rx="6" fill="#000" fill-opacity=".14"/>
		<rect x="94" y="144" width="12" height="16" rx="3" fill="${bg}" fill-opacity=".9"/>
		<path d="M40 112c-8 4-12 12-12 22v38c0 6 5 10 10 10h10" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" opacity=".75"/>
		<path d="M160 112c8 4 12 12 12 22v38c0 6-5 10-10 10h-10" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" opacity=".75"/>
		<ellipse cx="100" cy="218" rx="62" ry="6" fill="#000" fill-opacity=".08"/>`,
	throw: (c) => `
		<path d="M36 70h128c6 0 10 4 10 10v86c0 6-4 10-10 10H36c-6 0-10-4-10-10V80c0-6 4-10 10-10z" fill="${c}"/>
		<path d="M26 104h148M26 142h148" stroke="#fff" stroke-opacity=".28" stroke-width="6"/>
		<path d="M26 112h148" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>
		<path d="M60 70v106M140 70v106" stroke="#000" stroke-opacity=".08" stroke-width="4"/>
		<path d="M36 176c-2 8-6 12-10 14M52 176v14M68 176v14M84 176v14M100 176v14M116 176v14M132 176v14M148 176v14M164 176c2 8 6 12 10 14" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
		<path d="M26 92c30 10 120 10 148 0" fill="none" stroke="#000" stroke-opacity=".1" stroke-width="3"/>
		<ellipse cx="100" cy="206" rx="80" ry="6" fill="#000" fill-opacity=".07"/>`,
};

/** Flat SVG product illustration as a data URL. */
export function illustrationUrl(image) {
	const bg = image?.bg || '#f1f5f9';
	const c = image?.color || '#64748b';
	const body = (ILLUSTRATIONS[image?.illustration] || ILLUSTRATIONS.throw)(c, bg);
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="400" height="480"><rect width="200" height="240" fill="${bg}"/>${body}</svg>`;
	return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Thumbnail data URL for a product (and variation), at `px` square pixels. */
export function productImageUrl(state, product, variationId = 0, px = 600) {
	const img = product?.image || {};
	if (!img.model) return Promise.resolve(illustrationUrl(img));
	const vid = variationId && state.variations?.[variationId]?.parentId === product.id ? variationId : 0;
	const config = effectiveFor(state, product.id, vid, { background: false });
	return renderThumbnail({ demo: img.model }, config, { width: px, height: px, bg: img.bg || '#f1f5f9' });
}

/**
 * <ProductImage product=${p} variationId=${203} size=${300} fluid class="…" alt="…" />
 * size = CSS px (rendered at 2× for sharp screens); fluid = fill the parent width, square.
 */
export function ProductImage({ product, variationId = 0, size = 300, fluid = false, alt, class: cls, className, style }) {
	const state = useStore();
	const img = product?.image || {};
	const px = Math.min(800, Math.round(size * Math.min(2, window.devicePixelRatio || 1) * (fluid ? 1.5 : 1)));
	const vid = variationId && state.variations?.[variationId]?.parentId === product?.id ? variationId : 0;
	const cfg = img.model ? effectiveFor(state, product.id, vid, { background: false }) : null;
	const key = JSON.stringify([product?.id, img, cfg, px]);
	const [src, setSrc] = useState(() => (img.model ? '' : illustrationUrl(img)));

	useEffect(() => {
		let live = true;
		if (!img.model) {
			setSrc(illustrationUrl(img));
			return;
		}
		productImageUrl(state, product, vid, px).then(
			(url) => live && setSrc(url),
			() => live && setSrc(illustrationUrl({ ...img, illustration: 'throw' }))
		);
		return () => (live = false);
	}, [key]);

	const box = fluid ? { width: '100%', height: 'auto', aspectRatio: '1 / 1' } : { width: size + 'px', height: size + 'px' };
	const base = { display: 'block', objectFit: 'cover', background: img.bg || '#f1f5f9', ...box, ...(style || {}) };
	if (!src) {
		return html`<span class=${cx('proto-pimg', 'is-loading', cls, className)} role="img" aria-label=${alt ?? product?.name ?? ''} style=${base}></span>`;
	}
	return html`<img class=${cx('proto-pimg', cls, className)} src=${src} alt=${alt ?? product?.name ?? ''} width=${size} height=${size} decoding="async" style=${base} />`;
}

export default ProductImage;
