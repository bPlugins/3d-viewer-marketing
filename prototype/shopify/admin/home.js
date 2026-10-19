// App Home dashboard: setup guide (with app embed status, BFS), stats, recent customized orders, plan.
import { html, useState, cx } from '../../js/core/ui.js';
import { store, useStore } from '../core/store.js';
import { go } from '../core/router.js';
import { money, has3D, orderTotals } from '../core/commerce.js';
import { AdminFrame } from './chrome.js';
import { Page, Card, Button, Badge, Banner, ProgressBar, Text, Icon } from '../ui/polaris.js';
import { DesignImage } from '../ui/viewer.js';
import { PLANS } from './plans.js';
import { fmtDate } from './orders.js';

function steps(s) {
	const ob = s.app.onboarding;
	return [
		{
			id: 'model',
			title: 'Upload a 3D model',
			done: ob.model || Object.values(s.configs).some((c) => c.modelFileId),
			text: 'Add a GLB or glTF file to a product. It is stored as Shopify 3D media, and Shopify creates the AR file for iPhone and iPad.',
			action: { content: 'Add a model', href: '#admin.products' },
		},
		{
			id: 'editor',
			title: 'Set it up in the 3D editor',
			done: ob.editor,
			text: 'Pick colours and materials, add option groups and hotspots, and choose the starting camera angle.',
			action: { content: 'Open the editor', href: '#admin.editor.1001' },
		},
		{
			id: 'embed',
			title: 'Turn on the app embed',
			done: s.app.embedEnabled,
			text: 'The "3D core" app embed loads the viewer and keeps it in step with the variant picker. Turn it on in your theme editor under App embeds, then save.',
			action: { content: 'Turn on in theme editor', href: '#theme.editor' },
		},
		{
			id: 'block',
			title: 'Add the "3D Configurator" block',
			done: ob.block || (s.app.blocks?.product || []).includes('configurator'),
			text: 'Add the block to your product template where the viewer and Customize button should appear. Skip this if the viewer replaces your product images.',
			action: { content: 'Add block in theme editor', href: '#theme.editor' },
		},
		{
			id: 'preview',
			title: 'Preview on your store',
			done: ob.preview,
			text: 'Open a product page, spin the model and try the customizer the way a shopper would.',
			action: { content: 'Preview Lounge Chair', onAction: () => { store.patch('app.onboarding.preview', true); go('store.product.lounge-chair'); } },
		},
	];
}

function SetupGuide({ s }) {
	const list = steps(s);
	const done = list.filter((x) => x.done).length;
	const [open, setOpen] = useState(() => list.find((x) => !x.done)?.id || null);
	const [hidden, setHidden] = useState(false);
	if (hidden) return html`<div class="as-guide-hidden"><${Button} variant="plain" onClick=${() => setHidden(false)}>Show setup guide (${done} of ${list.length} done)<//></div>`;
	return html`
		<${Card} class="as-guide">
			<div class="as-guide__head">
				<div>
					<${Text} variant="heading">Setup guide<//>
					<${Text} tone="subdued">Get 3D on your product pages in five steps.<//>
				</div>
				<${Button} variant="tertiary" size="slim" onClick=${() => setHidden(true)}>Hide<//>
			</div>
			<div class="as-guide__progress"><span>${done} of ${list.length} tasks complete</span><${ProgressBar} value=${(done / list.length) * 100} tone=${done === list.length ? 'success' : 'primary'} label="Setup progress" /></div>
			<ol class="as-steps-list">
				${list.map(
					(st) => html`<li class=${cx('as-step', st.done && 'is-done', open === st.id && 'is-open')}>
						<button type="button" class="as-step__toggle" aria-expanded=${String(open === st.id)} onClick=${() => setOpen(open === st.id ? null : st.id)}>
							<span class="as-step__dot">${st.done ? html`<${Icon} name="check" size=${12} />` : null}</span>
							<span class="as-step__title">${st.title}</span>
							${st.id === 'embed' ? (st.done ? html`<${Badge} tone="success">On<//>` : html`<${Badge} tone="warning">Off<//>`) : null}
							<${Icon} name="chevronDown" size=${16} class="as-step__chev" />
						</button>
						${open === st.id
							? html`<div class="as-step__body">
									<p>${st.text}</p>
									<div class="as-step__actions">
										<${Button} variant=${st.done ? 'secondary' : 'primary'} size="slim" href=${st.action.href} onClick=${st.action.onAction}>${st.action.content}<//>
										${st.id !== 'embed' && st.id !== 'model'
											? html`<${Button} variant="plain" onClick=${() => store.patch(['app', 'onboarding', st.id], !st.done)}>${st.done ? 'Mark as not done' : 'Mark as done'}<//>`
											: null}
									</div>
								</div>`
							: null}
					</li>`,
				)}
			</ol>
		<//>
	`;
}

function Stat({ label, value, note, href }) {
	const inner = html`<span class="as-stat__label">${label}</span><span class="as-stat__value">${value}</span>${note ? html`<span class="as-stat__note">${note}</span>` : null}`;
	return href ? html`<a class="as-stat" href=${href}>${inner}</a>` : html`<div class="as-stat">${inner}</div>`;
}

export default function Home() {
	const s = useStore();
	const with3D = Object.keys(s.products).filter((id) => has3D(s, id)).length;
	const customOrders = Object.values(s.orders)
		.filter((o) => o.lines.some((l) => l.designCode))
		.sort((a, b) => b.id - a.id);
	const savedCount = Object.values(s.designs).filter((d) => d.kind === 'saved').length;
	const plan = PLANS.find((p) => p.id === s.app.plan) || PLANS[0];
	const plus = s.shop.plan === 'plus';

	return html`
		<${AdminFrame} current="app.home" appTitle="Dashboard">
			<${Page} title=${`Welcome back, ${s.shop.name}`} subtitle="Here's how 3D is doing in your store.">
				${!s.app.embedEnabled
					? html`<${Banner} tone="warning" title="The 3D app embed is off in your theme" action=${{ content: 'Turn on in theme editor', href: '#theme.editor' }}>
							Shoppers won't see the 3D viewer until you turn on "3D core" under App embeds in the ${s.shop.theme} theme and save.
						<//>`
					: null}
				<${SetupGuide} s=${s} />
				<div class="as-stats">
					<${Stat} label="Products with 3D" value=${with3D} note=${`of ${Object.keys(s.products).length} products`} href="#admin.products" />
					<${Stat} label="Customized orders" value=${customOrders.length} note="All time" href="#admin.orders" />
					<${Stat} label="Saved designs" value=${savedCount} note="Share links" href="#admin.designs" />
					<${Stat} label="Customize → add to cart" value="18.4%" note=${html`Last 30 days · <${Badge} tone="new">Demo data<//>`} />
				</div>
				<div class="p-layout">
					<div class="p-layout__main">
						<${Card} title="Recent customized orders" actions=${[{ content: 'View all orders', href: '#admin.orders' }]} flush>
							${customOrders.length
								? html`<ul class="as-recent">
										${customOrders.slice(0, 5).map((o) => {
											const l = o.lines.find((x) => x.designCode);
											const d = s.designs[l.designCode];
											return html`<li>
												<a class="as-recent__row" href=${`#admin.order.${o.id}`}>
													${l.snapshot ? html`<img class="as-recent__snap" src=${l.snapshot} alt="" width="48" height="48" />` : html`<${DesignImage} design=${d || { productId: l.productId, variantId: l.variantId }} size=${48} />`}
													<span class="as-recent__text">
														<span class="as-recent__title">${o.name} · ${s.products[l.productId]?.title}</span>
														<span class="as-recent__meta">${s.customers[o.customerId]?.name || 'Guest'} · ${fmtDate(o.date)}</span>
													</span>
													<span class="as-recent__total as-num">${money(orderTotals(s, o).total)}</span>
												</a>
											</li>`;
										})}
									</ul>`
								: html`<div class="as-pad"><${Text} tone="subdued">No customized orders yet. They appear here when shoppers buy a product they customized.<//></div>`}
						<//>
					</div>
					<div class="p-layout__side">
						<${Card} title="Plan" actions=${[{ content: 'Change', href: '#admin.plans' }]}>
							<div class="as-plan-mini">
								<${Text} variant="headingLg">${plan.name}<//>
								<${Text} tone="subdued">${plan.price ? `$${plan.price}/month, billed by Shopify` : 'Free'}<//>
							</div>
							<${Text} variant="caption" tone="subdued">${plan.blurb}<//>
						<//>
						<${Card} title="Your store plan" subtitle=${`Shopify ${plus ? 'Plus' : 'Basic'}`}>
							<${Text}>How option prices reach checkout depends on your Shopify plan:<//>
							<ul class="as-transform">
								<li class=${!plus ? 'is-current' : ''}>
									<span class="as-transform__name">Basic, Shopify, Advanced ${!plus ? html`<${Badge} tone="success">Your store<//>` : null}</span>
									<span class="as-transform__text">Each customized line shows the product plus a separate "3D customization" line for the add-ons.</span>
									<code class="as-code">lineExpand</code>
								</li>
								<li class=${plus ? 'is-current' : ''}>
									<span class="as-transform__name">Shopify Plus ${plus ? html`<${Badge} tone="success">Your store<//>` : null}</span>
									<span class="as-transform__text">One line at the full price, titled "Lounge Chair (customized)", with the snapshot image.</span>
									<code class="as-code">lineUpdate</code>
								</li>
							</ul>
							<${Button} variant="plain" href="#store.cart">See it in the cart<//>
						<//>
					</div>
				</div>
			<//>
		<//>
	`;
}
