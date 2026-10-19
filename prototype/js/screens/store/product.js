// Single product page (#store.product.<slug>): WooCommerce gallery with the plugin's placement
// mode, summary, variation form, add to cart (with the shopper's 3D customization) and tabs.
import { html, useState, useEffect, useRef, cx, money } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { viewerSettingsFor } from '../../shared/product-3d.js';
import { useFeature } from '../../core/features.js';
import { usesGroups, validateChoices, sanitizeCustom, firstMissingGroup, configFor } from '../../shared/options.js';
import { ProductImage } from '../../shared/product-image.js';
import { usesDecals, decalErrors, firstMissingDecal } from '../../shared/decals.js';
import { StoreTheme, addToCart, addedToCartNotice, clearNotices, pushNotice, captureLine } from './theme.js';
import { StorefrontViewer, ViewerModal } from './viewer-ui.js';
import { ProductGrid, priceHtml } from './shop.js';
import { PriceSummary } from './price-summary.js';
import { BlockSingleProduct } from './block-theme.js';
import { useBlockTheme } from '../../shared/block.js';
import { useRestoredDesign, ShareDesignLink } from './saved-designs.js';
import { applyFilter } from '../../shared/slots.js';

const shade = (hex, amt) => {
	const n = parseInt(String(hex || '#f1f5f9').slice(1), 16);
	const ch = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
	return '#' + [ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
};

/** Featured image + two gallery shots (the same product on other backdrops). */
function galleryImages(product) {
	const bg = product.image?.bg || '#f1f5f9';
	return [
		{ key: 'featured', product, alt: product.name },
		{ key: 'g1', product: { ...product, image: { ...product.image, bg: '#ffffff' } }, alt: product.name + ' on white' },
		{ key: 'g2', product: { ...product, image: { ...product.image, bg: shade(bg, -22) } }, alt: product.name + ' detail' },
	];
}

function variationFor(state, product, chosen) {
	if (product.type !== 'variable') return null;
	const names = product.attributes.map((a) => a.name);
	if (!names.every((n) => chosen[n])) return null;
	return product.variations.map((id) => state.variations[id]).find((v) => v && names.every((n) => v.attributes?.[n] === chosen[n])) || null;
}

// ── Gallery ────────────────────────────────────────────────────────────────

function Lightbox({ images, index, variationId, onClose }) {
	const [i, setI] = useState(index);
	useEffect(() => {
		const onKey = (e) => {
			if (e.key === 'Escape') onClose();
			if (e.key === 'ArrowRight') setI((n) => (n + 1) % images.length);
			if (e.key === 'ArrowLeft') setI((n) => (n - 1 + images.length) % images.length);
		};
		document.addEventListener('keydown', onKey);
		document.body.classList.add('st-lightbox-open');
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.classList.remove('st-lightbox-open');
		};
	}, []);
	const img = images[i];
	return html`
		<div class="st-lightbox" role="dialog" aria-modal="true" aria-label="Product image">
			<div class="st-lightbox__bg" onClick=${onClose}></div>
			<button type="button" class="st-lightbox__close" aria-label="Close (Esc)" onClick=${onClose}>×</button>
			${images.length > 1 &&
			html`<button type="button" class="st-lightbox__nav is-prev" aria-label="Previous (arrow left)" onClick=${() => setI((i - 1 + images.length) % images.length)}>‹</button>
				<button type="button" class="st-lightbox__nav is-next" aria-label="Next (arrow right)" onClick=${() => setI((i + 1) % images.length)}>›</button>`}
			<figure class="st-lightbox__fig">
				<${ProductImage} product=${img.product} variationId=${img.key === 'featured' ? variationId : 0} size=${640} alt=${img.alt} class="st-lightbox__img" />
				<figcaption>${i + 1} / ${images.length}</figcaption>
			</figure>
		</div>
	`;
}

function Gallery({ product, variationId, position, viewer, onOpenModal, show3D = 0 }) {
	const has3D = !!viewer;
	const all = galleryImages(product);
	// Slides after the plugin's gallery filters.
	let slides;
	if (has3D && position === 'replace_image') slides = [{ key: '3d', is3D: true, thumb: all[0] }];
	else if (has3D && position === 'gallery_first') slides = [{ key: '3d', is3D: true, thumb: all[0] }, ...all.slice(1).map((im) => ({ key: im.key, img: im, thumb: im }))];
	else slides = all.map((im) => ({ key: im.key, img: im, thumb: im }));
	const [active, setActive] = useState(0);
	const [zoom, setZoom] = useState(null);
	useEffect(() => {
		if (show3D && has3D) setActive(0);
	}, [show3D]);
	const idx = Math.min(active, slides.length - 1);
	const images = all.filter((im) => slides.some((s) => s.img === im));

	return html`
		<div class=${cx('woocommerce-product-gallery woocommerce-product-gallery--with-images woocommerce-product-gallery--columns-4 images', slides.length > 1 && 'has-thumbs')}>
			<a
				href="#"
				class="woocommerce-product-gallery__trigger"
				aria-label="View full-screen image gallery"
				onClick=${(e) => {
					e.preventDefault();
					const s = slides[idx];
					setZoom(Math.max(0, images.indexOf(s.img)));
				}}
				><span aria-hidden="true">🔍</span></a
			>
			<div class="flex-viewport">
				<div class="woocommerce-product-gallery__wrapper" style=${{ transform: `translate3d(${-idx * 100}%, 0, 0)` }}>
					${slides.map((s, i) =>
						s.is3D
							? html`<div key=${s.key} class=${cx('woocommerce-product-gallery__image wc3d-replace-image', i === idx && 'flex-active-slide')} data-thumb-alt=${product.name} aria-hidden=${i !== idx}>
									${viewer('replace')}
								</div>`
							: html`<div key=${s.key} class=${cx('woocommerce-product-gallery__image', i === idx && 'flex-active-slide')} aria-hidden=${i !== idx}>
									<a href="#" onClick=${(e) => (e.preventDefault(), setZoom(Math.max(0, images.indexOf(s.img))))} tabindex=${i === idx ? 0 : -1} aria-label=${'Enlarge ' + s.img.alt}>
										<${ProductImage} product=${s.img.product} variationId=${s.img.key === 'featured' ? variationId : 0} size=${560} fluid alt=${s.img.alt} class="wp-post-image" />
									</a>
									${i === 0 &&
									onOpenModal &&
									html`<button type="button" class="wc3d-modal-trigger wc3d-modal-trigger--overlay" data-wc3d-modal-open="1" data-wc3d-modal-target="wc3d-product-modal" data-product-id=${product.id} aria-haspopup="dialog" aria-label="View in 3D" onClick=${onOpenModal}>
										<span class="wc3d-modal-trigger__icon" aria-hidden="true">⛶</span><span class="wc3d-modal-trigger__label">View in 3D</span>
									</button>`}
								</div>`
					)}
				</div>
			</div>
			${slides.length > 1 &&
			html`<ol class="flex-control-nav flex-control-thumbs">
				${slides.map(
					(s, i) => html`<li key=${s.key}>
						<button type="button" class=${cx('st-thumb', i === idx && 'flex-active')} aria-label=${`Show image ${i + 1}`} aria-current=${i === idx ? 'true' : undefined} onClick=${() => setActive(i)}>
							<${ProductImage} product=${s.thumb.product} variationId=${s.thumb.key === 'featured' ? variationId : 0} size=${120} fluid alt=${s.thumb.alt} />
						</button>
					</li>`
				)}
			</ol>`}
			${zoom !== null && html`<${Lightbox} images=${images} index=${zoom} variationId=${variationId} onClose=${() => setZoom(null)} />`}
		</div>
	`;
}

// ── Add-to-cart form ───────────────────────────────────────────────────────

function Quantity({ product, qty, setQty }) {
	return html`<div class="quantity">
		<label class="screen-reader-text" for="quantity_${product.id}">${product.name} quantity</label>
		<input type="number" id="quantity_${product.id}" class="input-text qty text" name="quantity" value=${qty} min="1" step="1" inputmode="numeric" autocomplete="off" aria-label="Product quantity" onInput=${(e) => setQty(e.currentTarget.value)} />
	</div>`;
}

// customizer-modal: qty, needSel and formRef live on the page so the modal shares them.
function CartForm({ product, has3D, chosen, setChosen, variation, custom, onAdded, onInvalid, qty, setQty, needSel, setNeedSel, formRef }) {
	const state = useStore();
	const pricing = useFeature('option-pricing');
	const flags = { pricing, groups: useFeature('option-groups') };
	const decalsOn = useFeature('decals');
	const variable = product.type === 'variable';
	const anyChosen = Object.values(chosen).some(Boolean);
	// option-groups: the form posts the sanitised choices (woocommerce_add_cart_item_data).
	// conditional-logic: the config carries the variation's attributes (inert without the flag).
	const config = configFor(state, product.id, variation?.id || 0);
	const grouped = has3D && viewerSettingsFor(state, product.id).customizerEnabled && usesGroups(config, flags);
	// decals: personalization areas post the sanitised layer too.
	const personal = has3D && viewerSettingsFor(state, product.id).customizerEnabled && usesDecals(config, decalsOn);
	const clean = grouped || personal ? sanitizeCustom(config, custom, flags) : null;
	const json = grouped || personal ? (clean ? JSON.stringify(clean) : '') : custom && (Object.keys(custom.materials || {}).length || Object.keys(custom.meshes || {}).length) ? JSON.stringify(custom) : '';
	const prices = variable ? product.variations.map((id) => state.variations[id]?.price).filter((p) => p != null) : [];
	const pricesDiffer = new Set(prices).size > 1;

	const submit = (e) => {
		e.preventDefault();
		if (variable && !variation) {
			setNeedSel(true);
			return;
		}
		if (grouped || personal) {
			const errors = [...validateChoices(config, custom, flags), ...decalErrors(config, custom, decalsOn)];
			if (errors.length) {
				clearNotices();
				errors.forEach((text) => pushNotice({ type: 'error', text }));
				onInvalid?.((grouped && firstMissingGroup(config, custom)?.id) || firstMissingDecal(config, custom));
				return;
			}
		}
		const n = Math.max(1, Math.floor(Number(qty) || 1));
		const key = addToCart({ productId: product.id, variationId: variation?.id || 0, qty: n, custom: grouped || personal ? clean : json ? custom : null });
		if (!key) return;
		// order-snapshot: picture of the sanitised custom the line stored.
		captureLine(key);
		clearNotices();
		addedToCartNotice(store.get(), product.id, n);
		setQty(1);
		setNeedSel(false);
		onAdded();
	};

	const hidden = has3D && html`<input type="hidden" name="wc3d_custom_config" id="wc3d_custom_config" value=${json} />`;
	const button = html`<button type="submit" name="add-to-cart" value=${product.id} class=${cx('single_add_to_cart_button button alt', variable && !variation && 'disabled wc-variation-selection-needed')}>Add to cart</button>`;

	if (!variable) {
		return html`<form ref=${formRef} class="cart" onSubmit=${submit}>
			<p class="stock in-stock">In stock</p>
			${pricing && html`<${PriceSummary} product=${product} variation=${null} custom=${custom} />`}
			${hidden}<${Quantity} product=${product} qty=${qty} setQty=${setQty} />${button}
		</form>`;
	}
	return html`
		<form ref=${formRef} class="variations_form cart" data-product_id=${product.id} onSubmit=${submit}>
			<table class="variations" cellspacing="0" role="presentation">
				<tbody>
					${product.attributes.map(
						(a, i) => html`<tr key=${a.name}>
							<th class="label"><label for=${'pa_' + a.name.toLowerCase()}>${a.name}</label></th>
							<td class="value">
								<select id=${'pa_' + a.name.toLowerCase()} name=${'attribute_' + a.name.toLowerCase()} value=${chosen[a.name] || ''} onChange=${(e) => (setChosen({ ...chosen, [a.name]: e.currentTarget.value }), setNeedSel(false))}>
									<option value="">Choose an option</option>
									${a.options.map((o) => html`<option key=${o} value=${o}>${o}</option>`)}
								</select>
								${i === product.attributes.length - 1 &&
								html`<a class="reset_variations" href="#" style=${{ visibility: anyChosen ? 'visible' : 'hidden' }} onClick=${(e) => (e.preventDefault(), setChosen({}))}>Clear</a>`}
							</td>
						</tr>`
					)}
				</tbody>
			</table>
			<div class="single_variation_wrap">
				<div class="woocommerce-variation single_variation" role="alert" aria-relevant="additions">
					${variation &&
					html`${pricesDiffer && html`<div class="woocommerce-variation-price"><span class="price">${money(variation.price)}</span></div>`}
						<div class="woocommerce-variation-availability"><p class="stock in-stock">In stock</p></div>`}
				</div>
				${pricing && html`<${PriceSummary} product=${product} variation=${variation} custom=${custom} />`}
				<div class=${cx('woocommerce-variation-add-to-cart variations_button', variation ? 'woocommerce-variation-add-to-cart-enabled' : 'woocommerce-variation-add-to-cart-disabled')}>
					${hidden}<${Quantity} product=${product} qty=${qty} setQty=${setQty} />${button}
					<input type="hidden" name="variation_id" class="variation_id" value=${variation?.id || 0} />
				</div>
				${needSel && html`<p class="st-inline-error" role="alert">Please select some product options before adding this product to your cart.</p>`}
			</div>
		</form>
	`;
}

// ── Tabs ───────────────────────────────────────────────────────────────────

function Tabs({ product, viewerTab, show3D = 0 }) {
	const tabs = [{ key: 'description', title: 'Description' }];
	if (product.attributes?.length) tabs.push({ key: 'additional_information', title: 'Additional information' });
	if (viewerTab) tabs.push({ key: 'wc3d_view', title: '3D View' });
	tabs.push({ key: 'reviews', title: 'Reviews (0)' });
	const [active, setActive] = useState('description');
	useEffect(() => {
		if (show3D && viewerTab) setActive('wc3d_view');
	}, [show3D]);
	const cur = tabs.some((t) => t.key === active) ? active : 'description';
	return html`
		<div class="woocommerce-tabs wc-tabs-wrapper">
			<ul class="tabs wc-tabs" role="tablist">
				${tabs.map(
					(t) => html`<li key=${t.key} class=${cx(t.key + '_tab', cur === t.key && 'active')} role="presentation">
						<a href=${'#tab-' + t.key} role="tab" id=${'tab-title-' + t.key} aria-controls=${'tab-' + t.key} aria-selected=${cur === t.key} onClick=${(e) => (e.preventDefault(), setActive(t.key))}>${t.title}</a>
					</li>`
				)}
			</ul>
			${tabs.map(
				(t) => html`<div key=${t.key} class=${cx('woocommerce-Tabs-panel panel entry-content wc-tab', 'woocommerce-Tabs-panel--' + t.key)} id=${'tab-' + t.key} role="tabpanel" aria-labelledby=${'tab-title-' + t.key} hidden=${cur !== t.key}>
					${t.key === 'description' && html`<h2>Description</h2><p>${product.description}</p>`}
					${t.key === 'additional_information' &&
					html`<h2>Additional information</h2>
						<table class="woocommerce-product-attributes shop_attributes">
							<tbody>
								${product.attributes.map((a) => html`<tr key=${a.name} class="woocommerce-product-attributes-item"><th class="woocommerce-product-attributes-item__label" scope="row">${a.name}</th><td class="woocommerce-product-attributes-item__value"><p>${a.options.join(', ')}</p></td></tr>`)}
							</tbody>
						</table>`}
					${t.key === 'wc3d_view' && viewerTab()}
					${t.key === 'reviews' &&
					html`<div id="reviews" class="woocommerce-Reviews">
						<h2 class="woocommerce-Reviews-title">Reviews</h2>
						<p class="woocommerce-noreviews">There are no reviews yet.</p>
						<p class="st-review-cta">Be the first to review “${product.name}”</p>
					</div>`}
				</div>`
			)}
		</div>
	`;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProductPage({ params }) {
	const state = useStore();
	const slug = params?.[0] || '';
	const product = Object.values(state.products || {}).find((p) => p.slug === slug && p.status === 'publish');
	// saved-designs: #store.product.<slug>.design.<code> starts the page from a saved design.
	const restored = useRestoredDesign(product, params);
	const [chosen, setChosen] = useState(restored?.chosen || {});
	const [custom, setCustom] = useState(restored?.custom || null);
	const [modalOpen, setModalOpen] = useState(false);
	const [reload, setReload] = useState(0);
	const [openGroup, setOpenGroup] = useState(null);
	const [show3D, setShow3D] = useState(restored ? 1 : 0);
	const [qty, setQty] = useState(1);
	const [needSel, setNeedSel] = useState(false);
	const formRef = useRef(null);
	const top = useRef(null);
	const blockTheme = useBlockTheme();

	if (!product) {
		return html`<${StoreTheme} crumbs=${[['Home', '#store.shop'], ['Page not found']]}>
			<div class="st-404">
				<h1>Oops! That page can’t be found.</h1>
				<p>It looks like nothing was found at this location.</p>
				<p><a class="button" href="#store.shop">Return to shop</a></p>
			</div>
		<//>`;
	}

	const settings = viewerSettingsFor(state, product.id);
	const has3D = settings.available;
	const position = has3D ? settings.position : 'none';
	const variation = variationFor(state, product, chosen);
	const vid = variation?.id || 0;

	// A variation pick (or Clear) drops the shopper's choices, like the viewer's WC bridge.
	const pickVariation = (next) => {
		setChosen(next);
		setCustom(null);
	};

	// Adding to cart re-renders the page (WooCommerce posts the form): viewer back to its poster.
	const onAdded = () => {
		setCustom(null);
		setModalOpen(false);
		setReload((n) => n + 1);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	// option-groups: a required group left empty opens the drawer on it (viewer slide, tab or modal shown first).
	const onInvalid = (groupId) => {
		if (!groupId) return;
		setShow3D((n) => n + 1);
		if (position === 'modal') setModalOpen(true);
		setOpenGroup(groupId);
	};

	// customizer-modal: the modal reads and drives the page's own form through this bridge.
	const cart = {
		product,
		chosen,
		variation,
		setChosen: (next) => (pickVariation(next), setNeedSel(false)),
		qty,
		setQty,
		needSel,
		submit: () => formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })),
	};
	const viewer = (mode) => html`<${StorefrontViewer} key=${'v' + reload} productId=${product.id} variationId=${vid} custom=${custom} onCustomChange=${setCustom} mode=${mode} openGroup=${openGroup} onGroupShown=${() => setOpenGroup(null)} keepCustom=${!!restored} cart=${cart} />`;
	const inGallery = has3D && (position === 'replace_image' || position === 'gallery_first');
	const related = Object.values(state.products)
		.filter((p) => p.status === 'publish' && p.id !== product.id)
		.sort((a, b) => (b.category === product.category) - (a.category === product.category) || a.id - b.id)
		.slice(0, 4);

	// block: the demo store's block theme renders the Single Product template with these same parts.
	if (blockTheme) {
		const ctx = { product, variation, vid, has3D, position, chosen, pickVariation, custom, setCustom, reload, onAdded, onInvalid, show3D, openGroup, setOpenGroup, modalOpen, setModalOpen, viewer, related, Gallery, CartForm, Tabs, keepCustom: !!restored, cart, form: { qty, setQty, needSel, setNeedSel, formRef } };
		return html`<${BlockSingleProduct} ctx=${ctx} />`;
	}

	return html`
		<${StoreTheme} crumbs=${[['Home', '#store.shop'], [product.category, '#store.shop'], [product.name]]}>
			<div ref=${top} id=${'product-' + product.id} class=${cx('product type-product status-publish', 'product-type-' + product.type, has3D && 'wc3d-has-3d')}>
				<div class="st-product">
					<div class="st-product__gallery">
						${applyFilter('store.product.gallery', html`<${Gallery}
							key=${'g' + reload + position}
							product=${product}
							variationId=${vid}
							position=${position}
							viewer=${inGallery ? viewer : null}
							onOpenModal=${has3D && position === 'modal' ? () => setModalOpen(true) : null}
							show3D=${show3D}
						/>`, { product, has3D, chosen })}
					</div>
					<div class="summary entry-summary">
						<h1 class="product_title entry-title">${product.name}</h1>
						<p class="price">${priceHtml(state, product)}</p>
						<div class="woocommerce-product-details__short-description"><p>${product.short}</p></div>
						<${CartForm} key=${'f' + reload} product=${product} has3D=${has3D} chosen=${chosen} setChosen=${pickVariation} variation=${variation} custom=${custom} onAdded=${onAdded} onInvalid=${onInvalid} qty=${qty} setQty=${setQty} needSel=${needSel} setNeedSel=${setNeedSel} formRef=${formRef} />
						<${ShareDesignLink} product=${product} variation=${variation} custom=${custom} />
						<div class="product_meta">
							<span class="sku_wrapper">SKU: <span class="sku">${variation?.sku || product.sku}</span></span>
							<span class="posted_in">Category: <a href="#store.shop" rel="tag">${product.category}</a></span>
						</div>
					</div>
				</div>
				<${Tabs} product=${product} viewerTab=${applyFilter('store.product.viewer-tab', has3D && position === 'product_tab' ? () => viewer('tab') : null, { product, has3D, chosen })} show3D=${show3D} />
				${related.length > 0 &&
				html`<section class="related products">
					<h2>Related products</h2>
					<${ProductGrid} products=${related} />
				</section>`}
			</div>
			${has3D &&
			position === 'modal' &&
			html`<${ViewerModal} id="wc3d-product-modal" open=${modalOpen} onClose=${() => setModalOpen(false)}>${viewer('modal')}<//>`}
		<//>
	`;
}
