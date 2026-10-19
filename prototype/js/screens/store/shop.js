// Shop archive (#store.shop): WooCommerce product loop with the plugin's listing additions
// (ListingIcon.php): "View in 3D" popup trigger or "3D" badge, and the shared listing modal.
import { html, useState, useEffect, cx, money } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { go } from '../../core/router.js';
import { viewerSettingsFor } from '../../shared/product-3d.js';
import { ProductImage } from '../../shared/product-image.js';
import { StoreTheme, addToCart, captureLine, choiceErrors } from './theme.js';
import { StorefrontViewer, ViewerModal } from './viewer-ui.js';
import { Slot } from '../../shared/slots.js';

/** "$449.00" or "$449.00 – $479.00" for variable products. */
export function priceHtml(state, product) {
	if (product.type !== 'variable') return html`<span class="woocommerce-Price-amount amount">${money(product.price)}</span>`;
	const prices = product.variations.map((id) => Number(state.variations?.[id]?.price)).filter(Number.isFinite);
	const lo = prices.length ? Math.min(...prices) : product.price;
	const hi = prices.length ? Math.max(...prices) : product.price;
	if (lo === hi) return html`<span class="woocommerce-Price-amount amount">${money(lo)}</span>`;
	return html`<span class="woocommerce-Price-amount amount">${money(lo)}</span><span aria-hidden="true"> – </span><span class="screen-reader-text">Price range: ${money(lo)} through ${money(hi)}</span><span class="woocommerce-Price-amount amount">${money(hi)}</span>`;
}

/** One loop card. onOpen3D(productId) opens the listing modal when the popup trigger shows. */
export function ShopCard({ product, onOpen3D }) {
	const state = useStore();
	const s = viewerSettingsFor(state, product.id);
	const [added, setAdded] = useState('idle');
	const href = '#store.product.' + product.slug;
	const variable = product.type === 'variable';
	// option-groups: a required group with no default needs the product page (as Product Add-Ons does).
	const needsChoice = !variable && choiceErrors(state, product.id).length > 0;
	const trigger = s.available && s.showOnShop && !!onOpen3D;
	const badge = s.available && !s.showOnShop && s.showListingIcon;

	const ajaxAdd = (e) => {
		e.preventDefault();
		setAdded('loading');
		setTimeout(() => {
			const key = addToCart({ productId: product.id, qty: 1 });
			captureLine(key);
			setAdded(key ? 'added' : 'idle');
		}, 450);
	};

	return html`
		<li class=${cx('product type-product', 'product-type-' + product.type, s.available && 'wc3d-has-3d')}>
			<a href=${href} class="woocommerce-LoopProduct-link woocommerce-loop-product__link">
				<${ProductImage} product=${product} size=${300} fluid class="attachment-woocommerce_thumbnail" />
				<${Slot} name="store.shop.card-image" product=${product} />
				${trigger &&
				html`<button
					type="button"
					class="wc3d-listing-trigger"
					data-wc3d-listing-trigger
					data-wc3d-modal-target="wc3d-listing-modal"
					data-product-id=${product.id}
					aria-label="View in 3D"
					onClick=${(e) => {
						e.preventDefault();
						e.stopPropagation();
						onOpen3D(product.id);
					}}
				>
					<span class="wc3d-listing-trigger__badge" aria-hidden="true">3D</span>
					<span class="wc3d-listing-trigger__label">View in 3D</span>
				</button>`}
				${badge &&
				html`<span
					class="wc3d-listing-icon"
					aria-hidden="true"
					title="3D model available"
					data-href=${href}
					data-product-id=${product.id}
					onClick=${(e) => {
						e.preventDefault();
						e.stopPropagation();
						go('store.product.' + product.slug);
					}}
					>3D</span
				>`}
				<h2 class="woocommerce-loop-product__title">${product.name}</h2>
				<span class="price">${priceHtml(state, product)}</span>
			</a>
			${variable
				? html`<a href=${href} class="button product_type_variable add_to_cart_button" aria-label=${`Select options for “${product.name}”`}>Select options</a>`
				: needsChoice
				? html`<a href=${href} class="button product_type_simple add_to_cart_button" aria-label=${`Select options for “${product.name}”`}>Select options</a>`
				: html`<a
						href=${href}
						class=${cx('button product_type_simple add_to_cart_button ajax_add_to_cart', added === 'loading' && 'loading', added === 'added' && 'added')}
						aria-label=${`Add to cart: “${product.name}”`}
						onClick=${ajaxAdd}
						>Add to cart</a
					>`}
			${added === 'added' && html`<a href="#store.cart" class="added_to_cart wc-forward" title="View cart">View cart</a>`}
		</li>
	`;
}

/** ul.products + the shared #wc3d-listing-modal (printed once, only if a trigger rendered). */
export function ProductGrid({ products, columns = 4 }) {
	const state = useStore();
	const [open, setOpen] = useState(0);
	const needsModal = products.some((p) => {
		const s = viewerSettingsFor(state, p.id);
		return s.available && s.showOnShop;
	});
	return html`
		<ul class=${'products columns-' + columns}>
			${products.map((p) => html`<${ShopCard} key=${p.id} product=${p} onOpen3D=${setOpen} />`)}
		</ul>
		${needsModal &&
		html`<${ViewerModal} id="wc3d-listing-modal" listing open=${!!open} onClose=${() => setOpen(0)}>
			${open ? html`<${StorefrontViewer} key=${open} productId=${open} mode="listing" />` : null}
		<//>`}
	`;
}

const SORTS = [
	['menu_order', 'Default sorting'],
	['popularity', 'Sort by popularity'],
	['rating', 'Sort by average rating'],
	['date', 'Sort by latest'],
	['price', 'Sort by price: low to high'],
	['price-desc', 'Sort by price: high to low'],
];
const POPULARITY = { 101: 9, 103: 7, 102: 5, 104: 3, 106: 2 };

let lastSort = 'menu_order';

export default function Shop() {
	const state = useStore();
	const [sort, setSort] = useState(lastSort);
	useEffect(() => void (lastSort = sort), [sort]);
	const low = (p) => (p.type === 'variable' ? Math.min(...p.variations.map((id) => Number(state.variations?.[id]?.price ?? p.price))) : Number(p.price));
	const list = Object.values(state.products || {}).filter((p) => p.status === 'publish');
	const by = {
		menu_order: (a, b) => a.id - b.id,
		popularity: (a, b) => (POPULARITY[b.id] || 0) - (POPULARITY[a.id] || 0),
		rating: (a, b) => a.id - b.id,
		date: (a, b) => String(b.dateCreated).localeCompare(String(a.dateCreated)),
		price: (a, b) => low(a) - low(b),
		'price-desc': (a, b) => low(b) - low(a),
	}[sort];
	list.sort(by);

	return html`
		<${StoreTheme} crumbs=${[['Home', '#store.shop'], ['Shop']]}>
			<header class="woocommerce-products-header">
				<h1 class="woocommerce-products-header__title page-title">Shop</h1>
			</header>
			<div class="st-shop-bar">
				<p class="woocommerce-result-count">Showing all ${list.length} results</p>
				<form class="woocommerce-ordering" onSubmit=${(e) => e.preventDefault()}>
					<select name="orderby" class="orderby" aria-label="Shop order" value=${sort} onChange=${(e) => setSort(e.currentTarget.value)}>
						${SORTS.map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}
					</select>
				</form>
			</div>
			<${ProductGrid} products=${list} />
		<//>
	`;
}
