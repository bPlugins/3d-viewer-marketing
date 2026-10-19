// Order pieces shared by the thank-you page and the customer account: frozen order lines and our
// "Your custom design" extension block (thank-you + order status targets).
import { html, useState } from '../../js/core/ui.js';
import { money, moneyDelta, visibleProps, orderTotals } from '../core/commerce.js';
import { ProductImage, DesignImage } from '../ui/viewer.js';
import { Icon } from '../ui/icons.js';
import { SurfaceTag } from '../ui/polaris.js';
import { variantTitle } from './theme.js';
import { View3DModal } from './modals.js';

const lineUnit = (l) => l.base + l.addons.reduce((a, x) => a + x.amount, 0);

export function OrderLines({ s, order }) {
	return html`<ul class="sf-olines">
		${order.lines.map((l) => {
			const p = s.products[l.productId];
			const vt = variantTitle(s, l.variantId);
			const props = visibleProps(l.properties);
			const add = l.addons.reduce((a, x) => a + x.amount, 0);
			const plus = l.transform === 'update';
			return html`<li class="sf-oline">
				<div class="sf-oline__media">
					${plus && l.snapshot ? html`<img class="sf-line__snap" src=${l.snapshot} alt="" style=${{ width: '56px', height: '56px' }} />` : html`<${ProductImage} productId=${l.productId} variantId=${l.variantId} size=${56} />`}
					<span class="sf-line__badge">${l.qty}</span>
				</div>
				<div class="sf-oline__info">
					<p class="sf-oline__title">${plus ? `${p?.title} (customized)` : p?.title}</p>
					${vt ? html`<p class="sf-oline__sub">${vt}</p>` : null}
					${props.length ? html`<p class="sf-oline__sub">${props.map((x) => x.value).join(' · ')}</p>` : null}
					${l.transform === 'expand' && add
						? html`<ul class="sf-line__components"><li><span>${p?.title}${vt ? ' / ' + vt : ''}</span><span>${money(l.base)}</span></li><li><span>3D customization</span><span>${moneyDelta(add)}</span></li></ul>`
						: null}
				</div>
				<span class="sf-oline__price">${money(lineUnit(l) * l.qty)}</span>
			</li>`;
		})}
	</ul>`;
}

export function OrderSummary({ s, order }) {
	const t = orderTotals(s, order);
	return html`<div class="sf-osum">
		<div class="sf-sumrow"><span>Subtotal</span><span>${money(t.items)}</span></div>
		<div class="sf-sumrow"><span>Shipping</span><span>${t.shipping ? money(t.shipping) : 'Free'}</span></div>
		<div class="sf-sumrow sf-sumrow--total"><span>Total</span><strong>${money(t.total)}</strong></div>
	</div>`;
}

/**
 * Our customer-facing extension block: a picture per customized line, its summary and "View in 3D".
 * target = the extension target shown in the SurfaceTag.
 */
export function DesignBlock({ s, order, target, trackHref }) {
	const [open, setOpen] = useState(null);
	const lines = order.lines.filter((l) => l.designCode && s.designs[l.designCode]);
	if (!lines.length) return null;
	const cur = open ? lines.find((l) => l.id === open) : null;
	const curDesign = cur ? s.designs[cur.designCode] : null;
	return html`<section class="sf-ext" aria-label="Your custom design">
		<div class="sf-ext__tag"><${SurfaceTag}>${target}<//><span class="sf-small sf-muted">3D Configurator app</span></div>
		<h2 class="sf-ext__title">Your custom design${lines.length > 1 ? 's' : ''}</h2>
		<ul class="sf-ext__list">
			${lines.map((l) => {
				const d = s.designs[l.designCode];
				const p = s.products[l.productId];
				const props = visibleProps(l.properties);
				return html`<li class="sf-ext__item">
					<div class="sf-ext__img">${l.snapshot ? html`<img src=${l.snapshot} alt=${`Your ${p?.title}`} />` : html`<${DesignImage} design=${d} fluid />`}</div>
					<div class="sf-ext__info">
						<p class="sf-ext__name">${p?.title}${variantTitle(s, l.variantId) ? ` · ${variantTitle(s, l.variantId)}` : ''}</p>
						<dl class="sf-line__props">${props.map((x) => html`<div><dt>${x.name}:</dt><dd>${x.value}</dd></div>`)}</dl>
						<p class="sf-small sf-muted">Design ${d.code}</p>
						<div class="sf-ext__actions">
							<button type="button" class="sf-btn sf-btn--secondary sf-btn--sm" onClick=${() => setOpen(l.id)}><${Icon} name="cube" size=${16} /> View in 3D</button>
							${trackHref ? html`<a class="sf-btn sf-btn--ghost sf-btn--sm" href=${trackHref}>Track in your account</a>` : null}
						</div>
					</div>
				</li>`;
			})}
		</ul>
		${cur && curDesign
			? html`<${View3DModal} productId=${cur.productId} variantId=${cur.variantId} choices=${curDesign.choices} title=${`Your ${s.products[cur.productId]?.title}`} onClose=${() => setOpen(null)}>
					<p class="sf-small sf-muted">Order ${order.name} · design ${curDesign.code}</p>
					<dl class="sf-line__props">${visibleProps(cur.properties).map((x) => html`<div><dt>${x.name}:</dt><dd>${x.value}</dd></div>`)}</dl>
					<p class="sf-small sf-muted">This is the frozen design from your order. It doesn't change if the shop edits the product later.</p>
				<//>`
			: null}
	</section>`;
}
