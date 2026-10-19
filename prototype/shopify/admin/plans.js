// Managed Pricing plan page. Prices and the plan split follow the roadmap's open-decision suggestion (example only).
import { html, useState, cx } from '../../js/core/ui.js';
import { store, useStore } from '../core/store.js';
import { AdminFrame } from './chrome.js';
import { Page, Card, Button, Badge, Banner, Modal, Text, Icon, toast } from '../ui/polaris.js';

export const PLAN_ORDER = ['free', 'growth', 'business'];

export const PLANS = [
	{
		id: 'free',
		name: 'Free',
		price: 0,
		blurb: 'Show one product in 3D and AR.',
		features: ['3D viewer on 1 product', 'AR with the USDZ file Shopify creates', 'Hotspots and gallery views', '"3D Configurator" theme block and app embed'],
	},
	{
		id: 'growth',
		name: 'Growth',
		price: 19,
		blurb: 'Let shoppers customize what they buy.',
		features: ['Unlimited 3D products', 'Customizer in a drawer or a modal', 'Option groups and conditional logic', 'Share links and saved designs', 'Order snapshot and 3D order preview', 'Undo and redo for shoppers'],
	},
	{
		id: 'business',
		name: 'Business',
		price: 49,
		blurb: 'Charge for options and personalization.',
		features: ['Everything in Growth', 'Option pricing at checkout (Cart Transform)', 'Text and image personalization', 'AR of the configured product', 'Coverage dashboard and poster generation', 'Model from a URL', 'Priority support'],
	},
];

/** Lowest plan that includes each feature module (the plan → features flag service). */
export const PLAN_FEATURES = {
	'option-groups': 'growth',
	'conditional-logic': 'growth',
	'saved-designs': 'growth',
	'order-snapshot': 'growth',
	'customizer-modal': 'growth',
	'undo-redo': 'growth',
	'material-variants': 'growth',
	'option-pricing': 'business',
	personalization: 'business',
	'usdz-export': 'business',
	coverage: 'business',
	'external-url': 'business',
};

export const planName = (id) => PLANS.find((p) => p.id === id)?.name || id;
export const planIncludes = (plan, moduleId) => PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(PLAN_FEATURES[moduleId] || 'free');

export default function Plans() {
	const s = useStore();
	const current = s.app.plan;
	const [pick, setPick] = useState(null);
	const target = PLANS.find((p) => p.id === pick);
	const downgrade = target && PLAN_ORDER.indexOf(target.id) < PLAN_ORDER.indexOf(current);

	const approve = () => {
		store.patch('app.plan', target.id);
		setPick(null);
		toast(`You're on the ${target.name} plan`);
	};

	return html`
		<${AdminFrame} current="app.plans" appTitle="Plans">
			<${Page} title="Plans" subtitle="Billed through Shopify. Change or cancel any time.">
				<div class="as-plans">
					${PLANS.map((p) => {
						const on = p.id === current;
						return html`
							<section class=${cx('as-plan', on && 'is-current')}>
								<div class="as-plan__head">
									<h2 class="as-plan__name">${p.name}</h2>
									${on ? html`<${Badge} tone="success">Current plan<//>` : null}
								</div>
								<p class="as-plan__price"><span>$${p.price}</span>/month</p>
								<p class="as-plan__blurb">${p.blurb}</p>
								<ul class="as-plan__list">
									${p.features.map((f) => html`<li><${Icon} name="check" size=${16} /><span>${f}</span></li>`)}
								</ul>
								<div class="as-plan__foot">
									${on ? html`<${Button} full disabled>Your plan<//>` : html`<${Button} full variant=${PLAN_ORDER.indexOf(p.id) > PLAN_ORDER.indexOf(current) ? 'primary' : 'secondary'} onClick=${() => setPick(p.id)}>Choose ${p.name}<//>`}
								</div>
							</section>
						`;
					})}
				</div>
				<p class="as-plans__note"><${Badge} tone="info">Example pricing<//> Prices and the plan split are a starting point from the roadmap, not final.</p>
				<${Card} title="Billing questions">
					<dl class="as-faq">
						<div><dt>Who charges me?</dt><dd>Shopify. The plan shows on your Shopify bill with your other apps, in your billing currency.</dd></div>
						<div><dt>What happens when I change plans?</dt><dd>Shopify prorates the difference. On a downgrade, features outside the new plan switch off but your 3D setups stay saved.</dd></div>
						<div><dt>Is there a trial?</dt><dd>Growth and Business start with a 14-day free trial. You can cancel before it ends at no charge.</dd></div>
					</dl>
				<//>
			<//>
			<${Modal}
				open=${!!target}
				title="Approve subscription"
				size="small"
				onClose=${() => setPick(null)}
				primaryAction=${target ? { content: downgrade ? `Switch to ${target.name}` : 'Approve', onAction: approve } : null}
				secondaryActions=${[{ content: 'Cancel', onAction: () => setPick(null) }]}
			>
				${target
					? html`
							<div class="as-approve">
								<span class="p-appicon p-appicon--lg"><${Icon} name="cube" size=${22} /></span>
								<div>
									<${Text} variant="heading">3D Configurator · ${target.name}<//>
									<${Text} tone="subdued">$${target.price.toFixed(2)} USD every 30 days<//>
								</div>
							</div>
							<${Text}>Charged by Shopify on your Shopify bill. ${target.price ? 'Your 14-day free trial starts today.' : 'No charge.'}<//>
							${downgrade ? html`<${Banner} tone="warning">Features outside ${target.name} switch off. Your saved 3D setups stay in place if you upgrade again.<//>` : null}
						`
					: null}
			<//>
		<//>
	`;
}
