// 3D pieces shared by admin and storefront: product images (rendered from the demo models),
// configured-design images, and the storefront viewer (poster → lazy 3D, hotspots, toolbar).
import { html, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { Viewer3D } from '../../js/engine/Viewer3D.js';
import { renderThumbnail } from '../../js/engine/thumbnail.js';
import { store } from '../core/store.js';
import { effectiveFor, modelFor, configuredConfig } from '../core/commerce.js';
import { Icon } from './icons.js';

export { Viewer3D, renderThumbnail };

function useThumb(model, config, w, h, bg) {
	const [url, setUrl] = useState('');
	const key = JSON.stringify([model, config, w, h, bg]);
	useEffect(() => {
		let live = true;
		if (!model) return;
		renderThumbnail(model, config, { width: w, height: h, bg }).then((u) => live && setUrl(u)).catch(() => {});
		return () => (live = false);
	}, [key]);
	return url;
}

/**
 * Product photo stand-in: the product's 3D model rendered on its background colour, or a fabric swatch
 * for products without 3D. <ProductImage productId variantId size=${64} fluid rounded />
 */
export function ProductImage({ productId, variantId, size = 64, fluid, class: cls, choices }) {
	const s = store.get();
	const p = s.products[productId];
	const style = fluid ? { width: '100%', aspectRatio: '1 / 1' } : { width: size + 'px', height: size + 'px' };
	const vid = variantId || p?.variants[0];
	const swatch = p?.image?.swatch;
	const m = p && !swatch ? modelFor(s, productId, vid).model : null;
	const model = swatch || !p ? null : m || (p.image?.model ? { demo: p.image.model } : null);
	const config = model ? (choices ? configuredConfig(s, productId, vid, choices) : effectiveFor(s, productId, vid)) : null;
	const px = fluid ? 640 : Math.max(128, size * 2);
	const url = useThumb(model, config, px, px, '');
	if (!p) return null;
	if (swatch) {
		return html`<div class=${cx('x-pimg x-pimg--swatch', cls)} style=${{ ...style, '--swatch': swatch }} role="img" aria-label=${p.title}></div>`;
	}
	return html`<div class=${cx('x-pimg', cls)} style=${{ ...style, background: p.image?.bg || '#eee' }} role="img" aria-label=${p.title}>${url ? html`<img src=${url} alt="" />` : html`<span class="x-pimg__spin"></span>`}</div>`;
}

/** Image of a saved/ordered design (what the snapshot would be). <DesignImage design size fluid /> */
export function DesignImage({ design, size = 64, fluid, class: cls }) {
	if (!design) return null;
	return html`<${ProductImage} productId=${design.productId} variantId=${design.variantId} choices=${design.choices} size=${size} fluid=${fluid} class=${cls} />`;
}

/** Capture a JPEG snapshot of a configuration (order-snapshot module). → Promise<dataURL> */
export function captureSnapshot(productId, variantId, choices, size = 600) {
	const s = store.get();
	const { model } = modelFor(s, productId, variantId);
	return renderThumbnail(model, configuredConfig(s, productId, variantId, choices), { width: size, height: size, bg: s.products[productId]?.image?.bg || '#ffffff' });
}

/* ---------- hotspots ---------- */

function Hotspots({ hotspots, ctl, onCart }) {
	const [pos, setPos] = useState({});
	const [open, setOpen] = useState(null);
	useEffect(() => {
		let raf = 0;
		const tick = () => {
			const v = ctl.current;
			if (v) {
				const next = {};
				for (const h of hotspots || []) {
					const p = v.project(h.anchor_mesh || null, h.offset || [0, 0, 0]);
					if (p) next[h.id] = p;
				}
				setPos((old) => (JSON.stringify(old) === JSON.stringify(next) ? old : next));
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [JSON.stringify(hotspots)]);
	return html`
		<div class="x-hotspots">
			${(hotspots || []).map((h) => {
				const p = pos[h.id];
				if (!p || p.behind || !p.visible) return null;
				return html`
					<div class=${cx('x-hotspot', p.occluded && 'is-occluded', open === h.id && 'is-open')} style=${{ left: p.x + 'px', top: p.y + 'px' }}>
						<button type="button" class="x-hotspot__btn" aria-expanded=${String(open === h.id)} onClick=${() => setOpen(open === h.id ? null : h.id)}>
							${h.icon === 'cart' ? html`<${Icon} name="cart" size=${13} />` : null}<span>${h.label}</span>
						</button>
						${open === h.id
							? html`<div class="x-hotspot__card">
									<p>${h.description}</p>
									${h.linked_product_id && onCart ? html`<button type="button" class="x-hotspot__cta" onClick=${() => onCart(h.linked_product_id)}>Add ${store.get().products[h.linked_product_id]?.title} to cart</button>` : null}
								</div>`
							: null}
					</div>
				`;
			})}
		</div>
	`;
}

/**
 * Storefront viewer: poster first, three.js only after the trigger (BFS Lighthouse budget).
 * <StoreViewer productId variantId choices trigger="click|scroll|eager" toolbar={zoom,reset,autorotate,fullscreen,ar}
 *   onReady(ctl) onCart(pid) height="480px" class children(overlays) />
 */
export function StoreViewer({ productId, variantId, choices = null, custom = null, trigger = 'click', toolbar = {}, onReady, onCart, onAR, class: cls, style, children, configOverride }) {
	const s = store.get();
	const [active, setActive] = useState(trigger === 'eager');
	const [ready, setReady] = useState(false);
	const [pct, setPct] = useState(0);
	const [spin, setSpin] = useState(false);
	const host = useRef(null);
	const ctl = useRef(null);
	const { model } = modelFor(s, productId, variantId);
	const config = configOverride || effectiveFor(s, productId, variantId);
	const p = s.products[productId];

	useEffect(() => {
		if (trigger !== 'scroll' || active || !host.current) return;
		const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setActive(true), { rootMargin: '120px' });
		io.observe(host.current);
		return () => io.disconnect();
	}, [trigger, active]);

	const fullscreen = () => host.current?.requestFullscreen?.().catch(() => {});
	return html`
		<div ref=${host} class=${cx('x-viewer', ready && 'is-ready', cls)} style=${style}>
			${active
				? html`<${Viewer3D}
						class="x-viewer__canvas"
						model=${model}
						config=${config}
						custom=${custom}
						autoRotate=${spin}
						onReady=${(v) => {
							ctl.current = v;
							setReady(true);
							onReady?.(v);
						}}
						onProgress=${setPct}
					>
						${ready ? html`<${Hotspots} hotspots=${config.hotspots} ctl=${ctl} onCart=${onCart} />` : null}
					<//>`
				: null}
			${!ready
				? html`<button type="button" class="x-viewer__poster" onClick=${() => setActive(true)} aria-label="Interact in 3D">
						<${ProductImage} productId=${productId} variantId=${variantId} choices=${choices} fluid />
						<span class="x-viewer__cta">${active ? html`<span class="x-viewer__pct">Loading 3D… ${Math.round(pct)}%</span>` : html`<${Icon} name="cube" size=${18} /> Interact in 3D`}</span>
					</button>`
				: null}
			${ready
				? html`<div class="x-viewer__tools">
						${toolbar.zoom !== false ? html`<button type="button" title="Zoom in" aria-label="Zoom in" onClick=${() => ctl.current?.zoom(1)}><${Icon} name="zoomIn" size=${18} /></button><button type="button" title="Zoom out" aria-label="Zoom out" onClick=${() => ctl.current?.zoom(-1)}><${Icon} name="zoomOut" size=${18} /></button>` : null}
						${toolbar.reset !== false ? html`<button type="button" title="Reset view" aria-label="Reset view" onClick=${() => ctl.current?.resetCamera({ animate: true })}><${Icon} name="reset" size=${18} /></button>` : null}
						${toolbar.autorotate !== false ? html`<button type="button" title="Auto-rotate" aria-label="Auto-rotate" aria-pressed=${String(spin)} class=${spin ? 'is-on' : ''} onClick=${() => setSpin(!spin)}><${Icon} name="rotate" size=${18} /></button>` : null}
						${toolbar.fullscreen !== false ? html`<button type="button" title="Full screen" aria-label="Full screen" onClick=${fullscreen}><${Icon} name="fullscreen" size=${18} /></button>` : null}
					</div>`
				: null}
			${toolbar.ar !== false && config.ar?.enabled
				? html`<button type="button" class="x-viewer__ar" onClick=${() => onAR?.()}><${Icon} name="ar" size=${16} /> View in your space</button>`
				: null}
			${children}
		</div>
	`;
}
