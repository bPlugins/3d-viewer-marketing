// Prototype map: every screen, the Shopify surface it stands for, and a guided demo path.
import { html } from '../js/core/ui.js';
import { ROUTES } from './routes.js';
import { Icon } from './ui/icons.js';

const TOUR = [
	['admin.home', 'Dashboard', 'Onboarding checklist, app embed status, what is live.'],
	['admin.editor.1001', 'Configure the chair', 'Full-screen editor in an app window: parts, options, prices, hotspots, scene.'],
	['theme.editor', 'Switch on the app embed', 'Theme editor: turn on "3D core" and place the "3D Configurator" block.'],
	['store.product.lounge-chair', 'Customize as a shopper', 'Poster first, then 3D. Pick options, see the live total, add to cart.'],
	['store.cart', 'See the Cart Transform', 'Switch Plan between Basic and Plus in the bar to compare lineExpand and lineUpdate.'],
	['store.checkout', 'Check out', 'Shopify checkout with the transformed lines; places a real demo order.'],
	['admin.order.1041', 'Merchant order view', 'Order page with our admin block: snapshot, summary, "Open 3D preview".'],
	['account.designs', 'Saved designs', 'Customer account full-page extension: open, add to cart, share, delete.'],
];

const GROUPS = [
	['Embedded app (App Home)', (k) => k.startsWith('admin.') && !['admin.catalog', 'admin.product', 'admin.orders', 'admin.order'].includes(k)],
	['Native admin pages + our admin extensions', (k) => ['admin.catalog', 'admin.product', 'admin.orders', 'admin.order'].includes(k)],
	['Theme editor', (k) => k.startsWith('theme.')],
	['Storefront', (k) => k.startsWith('store.')],
	['Customer account', (k) => k.startsWith('account.')],
];

const SAMPLE = { 'admin.editor': 'admin.editor.1001', 'admin.product': 'admin.product.1001', 'admin.order': 'admin.order.1041', 'admin.preview': 'admin.preview.1041.1', 'store.product': 'store.product.lounge-chair', 'store.thanks': 'store.thanks.1042', 'store.design': 'store.design.K7Q2MX', 'account.order': 'account.order.1042' };

export default function Guide() {
	return html`
		<div class="g-wrap">
			<header class="g-hero">
				<p class="g-eyebrow">bPlugins · prototype for docs/SHOPIFY-ROADMAP.md</p>
				<h1>3D Product Configurator, as a Shopify app</h1>
				<p class="g-lede">A clickable copy of the planned app on demo data, built from the WooCommerce plugin's own engine and config format. Every screen is tagged with the Shopify surface it would ship on. Switch <b>Plan</b> and <b>Currency</b> in the bar to see how pricing changes.</p>
			</header>

			<section class="g-section">
				<h2>Demo path</h2>
				<ol class="g-tour">
					${TOUR.map(
						([token, title, text], i) => html`<li>
							<a href=${'#' + token}>
								<span class="g-tour__n">${i + 1}</span>
								<span class="g-tour__body"><span class="g-tour__title">${title}</span><span class="g-tour__text">${text}</span></span>
								<${Icon} name="chevronRight" size=${16} />
							</a>
						</li>`,
					)}
				</ol>
			</section>

			<section class="g-section">
				<h2>All screens</h2>
				<div class="g-groups">
					${GROUPS.map(
						([title, test]) => html`<div class="g-group">
							<h3>${title}</h3>
							<ul>
								${Object.entries(ROUTES)
									.filter(([k]) => k !== 'guide' && test(k))
									.map(([k, r]) => html`<li><a href=${'#' + (SAMPLE[k] || k)}><span class="g-route">${SAMPLE[k] || k}</span><span class="g-surface">${r.surface}</span>${r.phase ? html`<span class="g-phase">${r.phase}</span>` : null}</a></li>`)}
							</ul>
						</div>`,
					)}
				</div>
			</section>

			<section class="g-section g-notes">
				<h2>What is real and what is simulated</h2>
				<ul>
					<li><b>Real:</b> the three.js engine, demo models, config resolution (product ← variant ← shopper), option logic and pricing math. They are the WP prototype's own modules.</li>
					<li><b>Simulated:</b> Shopify admin chrome, theme editor, checkout, the Cart Transform Function, webhooks, app proxy and metafield publishing. Their behaviour follows the roadmap's spike assumptions.</li>
					<li>Data lives in this browser only. <b>Reset demo data</b> restores the seed.</li>
				</ul>
			</section>
		</div>
	`;
}
