// Home / collection grid. The "3D" card badge and quick view come from the app embed (card adapter).
import { html, useState } from '../../js/core/ui.js';
import { useStore } from '../core/store.js';
import { money, has3D, variantsOf, firstVariant } from '../core/commerce.js';
import { ProductImage } from '../ui/viewer.js';
import { Icon } from '../ui/icons.js';
import { StoreTheme, ProtoNote } from './theme.js';
import { View3DModal } from './modals.js';

function priceText(s, p) {
	const prices = variantsOf(s, p.id).map((v) => v.price);
	const lo = Math.min(...prices, p.price);
	return prices.some((x) => x !== lo) ? `From ${money(lo)}` : money(lo);
}

export default function Home() {
	const s = useStore();
	const [quick, setQuick] = useState(null);
	const products = Object.values(s.products).filter((p) => p.status === 'active');
	const embed = s.app.embedEnabled;
	const badge = embed && s.app.settings.shop_badge;
	return html`<${StoreTheme}>
		<section class="sf-hero">
			<div class="sf-wrap sf-hero__grid">
				<div class="sf-hero__text">
					<p class="sf-eyebrow">Autumn collection</p>
					<h1 class="sf-display">Made to be lived with</h1>
					<p class="sf-lede">Solid oak, washable linen and glazes fired by hand. Turn any piece around in 3D and make it yours before it ships.</p>
					<div class="sf-hero__actions">
						<a class="sf-btn sf-btn--primary" href="#store.product.lounge-chair">Design your lounge chair</a>
						<button type="button" class="sf-btn sf-btn--secondary" onClick=${() => document.getElementById('sf-grid')?.scrollIntoView({ behavior: 'smooth' })}>Shop all</button>
					</div>
				</div>
				<div class="sf-hero__media"><${ProductImage} productId=${1001} variantId=${2003} fluid /></div>
			</div>
		</section>

		<section class="sf-wrap sf-collection" id="sf-grid">
			<div class="sf-collection__head">
				<h2 class="sf-h2">Shop all</h2>
				<span class="sf-muted sf-small">${products.length} products</span>
			</div>
			<ul class="sf-grid">
				${products.map((p) => {
					const is3D = has3D(s, p.id);
					return html`<li class="sf-card">
						<a class="sf-card__link" href=${'#store.product.' + p.handle}>
							<div class="sf-card__media">
								<${ProductImage} productId=${p.id} fluid />
								${badge && is3D ? html`<span class="sf-badge3d"><${Icon} name="cube" size=${12} /> 3D</span>` : null}
							</div>
							<div class="sf-card__body">
								<h3 class="sf-card__title">${p.title}</h3>
								<p class="sf-card__price">${priceText(s, p)}</p>
							</div>
						</a>
						${embed && is3D ? html`<button type="button" class="sf-card__quick" onClick=${() => setQuick(p.id)}><${Icon} name="cube" size=${16} /> View in 3D</button>` : null}
					</li>`;
				})}
			</ul>
			${!embed
				? html`<${ProtoNote} tag="App embed · 3D core">The 3D badge and the "View in 3D" quick view on product cards come from the app embed. <a href="#theme.editor">Turn it on in the theme editor</a> to see them.<//>`
				: null}
		</section>

		<section class="sf-wrap sf-promise">
			<div><${Icon} name="cube" size=${22} /><h3>See it in 3D</h3><p>Turn, zoom and place furniture in your room before you buy.</p></div>
			<div><${Icon} name="palette" size=${22} /><h3>Make it yours</h3><p>Choose finishes and fabrics, and add a monogram to selected pieces.</p></div>
			<div><${Icon} name="bag" size=${22} /><h3>Free delivery</h3><p>On orders over ${money(500)}, with 30-day returns.</p></div>
		</section>

		${quick
			? html`<${View3DModal} productId=${quick} variantId=${firstVariant(s, quick)?.id} onClose=${() => setQuick(null)}>
					<p class="sf-eyebrow">${s.products[quick].vendor}</p>
					<h3 class="sf-h3">${s.products[quick].title}</h3>
					<p class="sf-v3d__price">${priceText(s, s.products[quick])}</p>
					<p class="sf-muted">${s.products[quick].description}</p>
					<a class="sf-btn sf-btn--primary sf-btn--full" href=${'#store.product.' + s.products[quick].handle}>View product</a>
				<//>`
			: null}
	<//>`;
}
