// block: storefront side of the wc3d/product-viewer block (specs/block.md): the block's markup,
// the block-theme Single Product template and page/post content (blocks or Elementor widgets).
import { html, cx } from '../../core/ui.js';
import { useStore } from '../../core/store.js';
import { is3DAvailable } from '../../shared/product-3d.js';
import { BLOCK_NAME, WIDGET_TYPE, attrsOf, viewerOverrides, blockStyles, blockClass, templateOf, currentViewerBlocks, replacesGallery } from '../../shared/block.js';
import { StoreTheme } from './theme.js';
import { StorefrontViewer, ViewerModal } from './viewer-ui.js';
import { ProductGrid, priceHtml } from './shop.js';
import { ShareDesignLink } from './saved-designs.js';
import { protoLabel } from '../../shared/slots.js';

const css = (obj) => (obj ? Object.entries(obj).map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}:${v};`).join('') : '');

/**
 * <ViewerBlock attrs current productId variationId …/>: the block's server render. Nothing when the product
 * has no 3D (editor: placeholder via `placeholder`). `current` = the page's own product (customizer allowed).
 */
export function ViewerBlock({ attrs, productId, variationId = 0, current = false, custom, onCustomChange, openGroup, onGroupShown, editor = false, placeholder = null, radius, vkey, keepCustom = false, cart = null }) {
	const state = useStore();
	const a = attrsOf({ attrs });
	if (!productId || !is3DAvailable(state, productId)) return placeholder;
	const st = blockStyles(a);
	const vid = current ? variationId : Number(a.variationId) || 0;
	const rootCss = css({ ...st.root, ...(radius != null ? { borderRadius: radius + 'px' } : {}) });
	return html`<div class=${blockClass(a)} style=${st.wrap}>
		<${StorefrontViewer}
			key=${vkey || 'v' + productId + '-' + (current ? 'c' : vid) + (editor ? 'e' : '')}
			productId=${productId}
			variationId=${vid}
			custom=${current ? custom : undefined}
			onCustomChange=${current ? onCustomChange : undefined}
			mode="block"
			overrides=${viewerOverrides(a, { current, editor })}
			style=${rootCss}
			openGroup=${current ? openGroup : null}
			onGroupShown=${onGroupShown}
			keepCustom=${current && keepCustom}
			cart=${current && !editor ? cart : null}
		/>
	</div>`;
}

// ── Single Product template (block theme) ──────────────────────────────────

/**
 * Rendered by product.js when the demo store uses the block theme. ctx carries the page's state and
 * its components (Gallery, CartForm, Tabs) so the template reuses them as WooCommerce's blocks.
 */
export function BlockSingleProduct({ ctx }) {
	const state = useStore();
	const { product, variation, vid, has3D, position } = ctx;
	const template = templateOf(state);
	// Render rule 6: a current-product viewer block turns the automatic placement off on this page.
	const auto = currentViewerBlocks(template).length === 0;
	const hideGallery = has3D && replacesGallery(template);
	const inGallery = auto && has3D && (position === 'replace_image' || position === 'gallery_first');
	const { Gallery, CartForm, Tabs } = ctx;

	const render = (blocks) => (blocks || []).map((bl) => one(bl));
	const one = (bl) => {
		switch (bl.name) {
			case 'core/template-part':
			case 'woocommerce/breadcrumbs':
			case 'woocommerce/store-notices':
				return null; // the theme frame (StoreTheme) prints these
			case 'core/columns':
				return html`<div key=${bl.id} class="wp-block-columns bt-columns">${render(bl.inner)}</div>`;
			case 'core/column':
				return html`<div key=${bl.id} class="wp-block-column bt-column">${render(bl.inner)}</div>`;
			case 'woocommerce/product-image-gallery':
				return hideGallery
					? null
					: html`<div key=${bl.id} class="wp-block-woocommerce-product-image-gallery bt-gallery">
							<${Gallery}
								key=${'g' + ctx.reload + position + auto}
								product=${product}
								variationId=${vid}
								position=${auto ? position : 'none'}
								viewer=${inGallery ? ctx.viewer : null}
								onOpenModal=${auto && has3D && position === 'modal' ? () => ctx.setModalOpen(true) : null}
								show3D=${ctx.show3D}
							/>
						</div>`;
			case 'core/post-title':
				return html`<h1 key=${bl.id} class="wp-block-post-title product_title entry-title">${product.name}</h1>`;
			case 'woocommerce/product-price':
				return html`<div key=${bl.id} class="wp-block-woocommerce-product-price"><p class="price">${priceHtml(state, product)}</p></div>`;
			case 'core/post-excerpt':
				return html`<div key=${bl.id} class="wp-block-post-excerpt"><p class="wp-block-post-excerpt__excerpt">${product.short}</p></div>`;
			case 'woocommerce/add-to-cart-form':
				return html`<div key=${bl.id} class="wp-block-add-to-cart-form">
					<${CartForm} key=${'f' + ctx.reload} product=${product} has3D=${has3D} chosen=${ctx.chosen} setChosen=${ctx.pickVariation} variation=${variation} custom=${ctx.custom} onAdded=${ctx.onAdded} onInvalid=${ctx.onInvalid} ...${ctx.form} />
					<${ShareDesignLink} product=${product} variation=${variation} custom=${ctx.custom} />
				</div>`;
			case 'woocommerce/product-meta':
				return html`<div key=${bl.id} class="wp-block-woocommerce-product-meta product_meta">
					<span class="sku_wrapper">SKU: <span class="sku">${variation?.sku || product.sku}</span></span>
					<span class="posted_in">Category: <a href="#store.shop" rel="tag">${product.category}</a></span>
				</div>`;
			case 'woocommerce/product-details':
				return html`<div key=${bl.id} class="wp-block-woocommerce-product-details">
					<${Tabs} product=${product} viewerTab=${auto && has3D && position === 'product_tab' ? () => ctx.viewer('tab') : null} show3D=${ctx.show3D} />
				</div>`;
			case 'woocommerce/related-products':
				return ctx.related.length
					? html`<section key=${bl.id} class="wp-block-woocommerce-related-products related products">
							<h2>Related products</h2>
							<${ProductGrid} products=${ctx.related} />
						</section>`
					: null;
			case BLOCK_NAME: {
				const a = attrsOf(bl);
				const current = !Number(a.productId);
				return html`<${ViewerBlock}
					key=${bl.id + '-' + ctx.reload}
					attrs=${a}
					productId=${current ? product.id : Number(a.productId)}
					variationId=${current ? (Number(a.variationId) || vid) : 0}
					current=${current}
					custom=${ctx.custom}
					onCustomChange=${ctx.setCustom}
					openGroup=${ctx.openGroup}
					onGroupShown=${() => ctx.setOpenGroup(null)}
					keepCustom=${ctx.keepCustom}
					cart=${ctx.cart}
				/>`;
			}
			default:
				return html`<${BasicBlock} key=${bl.id} block=${bl} render=${render} />`;
		}
	};

	return html`
		<${StoreTheme} crumbs=${[['Home', '#store.shop'], [product.category, '#store.shop'], [product.name]]}>
			<div id=${'product-' + product.id} class=${cx('wp-site-blocks bt-template product type-product status-publish', 'product-type-' + product.type, has3D && 'wc3d-has-3d')}>
				<div class="proto-cart-hint bt-hint"><span class="proto-cart-hint__tag">${protoLabel()}</span><span>Block theme: this page is the Single Product template. <a href="#admin.site-editor">Edit template</a></span></div>
				${render(template.blocks)}
			</div>
			${auto &&
			has3D &&
			position === 'modal' &&
			html`<${ViewerModal} id="wc3d-product-modal" open=${ctx.modalOpen} onClose=${() => ctx.setModalOpen(false)}>${ctx.viewer('modal')}<//>`}
		<//>
	`;
}

/** core/paragraph, core/heading and other plain blocks of pages. */
function BasicBlock({ block: bl, render }) {
	const c = bl.attrs?.content || '';
	if (bl.name === 'core/paragraph') return html`<p class="bt-p">${c}</p>`;
	if (bl.name === 'core/heading') return html`<h2 class="wp-block-heading bt-h">${c}</h2>`;
	if (bl.inner) return html`<div class="bt-group">${render(bl.inner)}</div>`;
	return null;
}

// ── Pages and posts ────────────────────────────────────────────────────────

/** Page content: blocks (picked products only: no "current product" outside product templates). */
export function PageBlocks({ blocks }) {
	const render = (list) =>
		(list || []).map((bl) => {
			if (bl.name === 'core/columns') return html`<div key=${bl.id} class="wp-block-columns bt-columns bt-columns--page">${render(bl.inner)}</div>`;
			if (bl.name === 'core/column') return html`<div key=${bl.id} class="wp-block-column bt-column">${render(bl.inner)}</div>`;
			if (bl.name === BLOCK_NAME) {
				const a = attrsOf(bl);
				return html`<${ViewerBlock} key=${bl.id} attrs=${a} productId=${Number(a.productId)} />`;
			}
			return html`<${BasicBlock} key=${bl.id} block=${bl} render=${render} />`;
		});
	return html`<div class="entry-content bt-entry">${render(blocks)}</div>`;
}

/** Elementor page content (widgets in one section/column). */
export function ElementorContent({ widgets }) {
	return html`<div class="elementor bt-elementor">
		<div class="elementor-section"><div class="elementor-container"><div class="elementor-column">
			${(widgets || []).map((w) => html`<div key=${w.id} class=${'elementor-element elementor-widget elementor-widget-' + w.type}>
				<div class="elementor-widget-container"><${WidgetView} widget=${w} /></div>
			</div>`)}
		</div></div></div>
	</div>`;
}

/** One Elementor widget's frontend output (shared with the editor canvas). */
export function WidgetView({ widget: w, editor = false, placeholder = null, previewId = 0 }) {
	const s = w.settings || {};
	if (w.type === 'heading') return html`<h2 class="elementor-heading-title">${s.title}</h2>`;
	if (w.type === 'text-editor') return html`<p>${s.text}</p>`;
	if (w.type === 'button') return html`<a class="elementor-button bt-el-button" href=${editor ? undefined : s.link || '#'}>${s.text}</a>`;
	if (w.type === WIDGET_TYPE) {
		const pid = Number(s.productId) || previewId;
		return html`<${ViewerBlock} attrs=${s} productId=${pid} editor=${editor} placeholder=${placeholder} radius=${Number(s.radius) || 0} />`;
	}
	return null;
}
