// Native admin order page as Shopify shows it, plus our order-details block extension.
import { html, useState } from '../../js/core/ui.js';
import { useStore } from '../core/store.js';
import { money, orderTotals, visibleProps } from '../core/commerce.js';
import { AdminFrame } from './chrome.js';
import { Card, Button, Badge, Text, Icon, Divider, toast } from '../ui/polaris.js';
import { ProductImage, DesignImage } from '../ui/viewer.js';
import { ExtBlock } from './product.js';
import { fmtDate, payTone, fulfillTone } from './orders.js';
import { copyText, CopyFallback } from './designs.js';

const lineAddons = (l) => l.addons.reduce((t, a) => t + a.amount, 0);

function Props({ props }) {
	if (!props?.length) return null;
	return html`
		<dl class="as-props">
			${props.map((pr) => {
				const hidden = pr.name.startsWith('_');
				return html`<div class=${hidden ? 'as-props__row is-hidden' : 'as-props__row'}>
					<dt>${pr.name}:</dt>
					<dd>${pr.value}${hidden ? html`<span class="as-tip" tabindex="0" role="note" aria-label="Hidden from checkout and emails, visible to staff" data-tip="Hidden from checkout and emails, visible to staff"><${Icon} name="info" size=${13} /></span>` : null}</dd>
				</div>`;
			})}
		</dl>
	`;
}

function LineItem({ s, line }) {
	const p = s.products[line.productId];
	const v = s.variants[line.variantId];
	const vTitle = v && v.title !== 'Default Title' ? v.title : null;
	const add = lineAddons(line);
	const unit = line.base + add;
	const updated = line.transform === 'update';
	const thumb = line.snapshot ? html`<img class="as-line__snap" src=${line.snapshot} alt="" width="48" height="48" />` : html`<${ProductImage} productId=${line.productId} variantId=${line.variantId} size=${48} />`;
	return html`
		<li class="as-line">
			<div class="as-line__img">${thumb}${line.qty > 1 ? html`<span class="as-line__qty">${line.qty}</span>` : null}</div>
			<div class="as-line__main">
				<a class="as-link as-line__title" href=${`#admin.product.${line.productId}`}>${updated ? `${p?.title} (customized)` : p?.title}</a>
				${vTitle ? html`<span class="as-line__variant">${vTitle}</span>` : null}
				${v?.sku ? html`<span class="as-line__sku">SKU: ${v.sku}</span>` : null}
				<${Props} props=${line.properties} />
				${line.transform === 'expand'
					? html`<div class="as-bundle">
							<p class="as-bundle__head"><${Icon} name="layers" size=${14} />Bundle · ${line.qty} × ${money(unit)}</p>
							<ul>
								<li><span>${p?.title}${vTitle ? ` / ${vTitle}` : ''}</span><span class="as-num">${money(line.base)}</span></li>
								<li><span>3D customization</span><span class="as-num">${money(add)}</span></li>
							</ul>
						</div>`
					: null}
			</div>
			<div class="as-line__price as-num">${money(unit)} × ${line.qty}</div>
			<div class="as-line__total as-num">${money(unit * line.qty)}</div>
		</li>
	`;
}

export default function Order({ params }) {
	const s = useStore();
	const o = s.orders[Number(params[0])];
	const [fallback, setFallback] = useState(null);
	if (!o) return html`<${AdminFrame} current="orders"><div class="x-missing"><h2>Order not found</h2><a href="#admin.orders">Back to orders</a></div><//>`;

	const t = orderTotals(s, o);
	const c = s.customers[o.customerId];
	const custom = o.lines.filter((l) => l.designCode);
	const items = o.lines.reduce((n, l) => n + l.qty, 0);
	const fulfilled = o.fulfillment === 'Fulfilled';
	const copy = async (code) => ((await copyText(code)) ? toast('Design code copied') : setFallback(code));

	return html`
		<${AdminFrame} current="orders">
			<div class="p-page p-page--default">
				<header class="p-page__head">
					<a class="p-page__back" href="#admin.orders" aria-label="Back to orders"><${Icon} name="arrowLeft" size=${18} /></a>
					<div class="p-page__titles">
						<h1 class="p-page__title">${o.name} <${Badge} tone=${payTone(o.financial)}>${o.financial}<//> <${Badge} tone=${fulfillTone(o.fulfillment)}>${o.fulfillment}<//></h1>
						<p class="p-page__subtitle">${fmtDate(o.date, true)} from Online Store</p>
					</div>
					<div class="p-page__actions">
						<${Button} disabled>Refund<//>
						<${Button} disabled>Edit<//>
					</div>
				</header>
				<div class="p-layout">
					<div class="p-layout__main">
						<${Card} title=${html`<span class="as-fulfil"><${Badge} tone=${fulfillTone(o.fulfillment)} icon=${fulfilled ? 'check' : 'clock'}>${o.fulfillment}<//><span class="as-muted">${items} item${items === 1 ? '' : 's'}</span></span>`}>
							<ul class="as-lines">${o.lines.map((l) => html`<${LineItem} s=${s} line=${l} />`)}</ul>
							<div class="as-card-foot">${fulfilled ? html`<${Button} disabled>Add tracking<//>` : html`<${Button} variant="primary" disabled>Fulfill items<//>`}</div>
						<//>
						<${Card} title=${html`<span class="as-fulfil"><${Badge} tone=${payTone(o.financial)}>${o.financial}<//></span>`}>
							<div class="as-pay">
								<div><span>Subtotal</span><span>${items} item${items === 1 ? '' : 's'}</span><span class="as-num">${money(t.items)}</span></div>
								<div><span>Shipping</span><span>${t.shipping ? 'Standard' : 'Free shipping'}</span><span class="as-num">${money(t.shipping)}</span></div>
								<div class="is-strong"><span>Total</span><span></span><span class="as-num">${money(t.total)}</span></div>
								<${Divider} />
								<div><span>Paid</span><span></span><span class="as-num">${money(o.financial === 'Paid' ? t.total : 0)}</span></div>
							</div>
						<//>
						<${Card} title="Timeline">
							<ul class="as-timeline">
								${fulfilled ? html`<li><span></span>Order fulfilled.</li>` : null}
								${custom.length ? html`<li><span></span>3D Configurator froze ${custom.length} design${custom.length === 1 ? '' : 's'} for this order.</li>` : null}
								<li><span></span>${money(t.total)} was captured.</li>
								<li><span></span>${c?.name || 'The customer'} placed this order on Online Store.</li>
							</ul>
						<//>
					</div>
					<div class="p-layout__side">
						${custom.length
							? html`<${ExtBlock} target="admin.order-details.block.render">
									${custom.map((l) => {
										const d = s.designs[l.designCode];
										const p = s.products[l.productId];
										return html`
											<div class="as-oblock">
												<div class="as-oblock__img">${l.snapshot ? html`<img src=${l.snapshot} alt=${`Snapshot of ${p?.title}`} width="120" height="120" />` : html`<${DesignImage} design=${d || { productId: l.productId, variantId: l.variantId, choices: null }} size=${120} />`}</div>
												<div class="as-oblock__text">
													<${Text} variant="heading">${p?.title}${l.qty > 1 ? ` × ${l.qty}` : ''}<//>
													<span class="as-mono">Design ${l.designCode}</span>
												</div>
												<dl class="as-oblock__rows">${visibleProps(l.properties).map((pr) => html`<div><dt>${pr.name}</dt><dd>${pr.value}</dd></div>`)}</dl>
												${l.addons.length
													? html`<ul class="as-oblock__addons">
															${l.addons.map((a) => html`<li><span>${a.label}</span><span class="as-num">+${money(a.amount)}</span></li>`)}
														</ul>`
													: null}
												<div class="as-oblock__actions">
													<${Button} variant="primary" icon="cube" href=${`#admin.preview.${o.id}.${l.id}`}>Open 3D preview<//>
													<${Button} icon="copy" onClick=${() => copy(l.designCode)}>Copy design code<//>
												</div>
											</div>
										`;
									})}
									<p class="as-ext__note"><${Icon} name="info" size=${13} /> Admin blocks can't draw 3D, so this shows the snapshot. The preview opens the app in a full-screen window.</p>
								<//>`
							: null}
						<${Card} title="Notes"><${Text} tone="subdued">No notes from customer<//><//>
						<${Card} title="Customer">
							${c
								? html`<${Text} variant="heading">${c.name}<//>
										<${Text} tone="subdued">${Object.values(s.orders).filter((x) => x.customerId === c.id).length} orders<//>
										<${Text} variant="heading">Contact information<//>
										<${Text}>${c.email}<//>`
								: html`<${Text} tone="subdued">No customer<//>`}
						<//>
					</div>
				</div>
			</div>
			<${CopyFallback} title="Copy design code" text=${fallback} onClose=${() => setFallback(null)} />
		<//>
	`;
}
