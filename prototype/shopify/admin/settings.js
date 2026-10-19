// Settings: tabs in the URL (#admin.settings.<tab>), edits held as a draft until Save (contextual save bar).
import { html, useState, useEffect } from '../../js/core/ui.js';
import { store, useStore } from '../core/store.js';
import { go } from '../core/router.js';
import { AdminFrame } from './chrome.js';
import { Page, Card, Badge, Banner, Tabs, ChoiceList, Select, Switch, TextField, Button, Text, Icon, SaveBar, toast } from '../ui/polaris.js';
import { PLAN_FEATURES, planIncludes, planName } from './plans.js';

const TABS = [
	{ id: 'general', label: 'General' },
	{ id: 'customizer', label: 'Customizer' },
	{ id: 'features', label: 'Features' },
	{ id: 'sharing', label: 'Sharing' },
	{ id: 'ar', label: 'AR' },
	{ id: 'privacy', label: 'Data & privacy' },
];

export const MODULE_INFO = {
	'option-groups': { title: 'Option groups', text: 'Named groups of colours, materials or parts with swatches, thumbnails or buttons.' },
	'option-pricing': { title: 'Option pricing', text: 'Charge extra for a choice. The price is recomputed at checkout by our Cart Transform Function.' },
	'conditional-logic': { title: 'Conditional logic', text: 'Show or hide options based on the variant or earlier choices.', requires: 'option-groups' },
	personalization: { title: 'Text and image personalization', text: 'Shoppers add a name, monogram or image on an area you choose.' },
	'saved-designs': { title: 'Share links and saved designs', text: 'A short link that restores a design, plus a Saved designs page in customer accounts.' },
	'order-snapshot': { title: 'Cart and order snapshot', text: 'An image of the configured product on the cart, the order page and the order status page.' },
	'customizer-modal': { title: 'Customizer modal', text: 'Customize opens a large dialog with the viewer, the options, a live total and Add to cart.' },
	'undo-redo': { title: 'Undo and redo for shoppers', text: 'Shoppers step back and forward through their changes in the customizer.' },
	'usdz-export': { title: 'AR of the configured product', text: "Builds the AR file from the shopper's design instead of the base model." },
	'material-variants': { title: 'Material variants', text: 'Reads material variants from the model file and maps them to Shopify variants or options.' },
	coverage: { title: 'Coverage dashboard', text: 'Shows which products have 3D, oversized models and missing AR files, with bulk actions.' },
	'external-url': { title: 'Model from a URL', text: 'Imports a GLB hosted on your CDN into Shopify Files.' },
};

const pick = (s) => JSON.parse(JSON.stringify({ settings: s.app.settings, modules: s.app.modules }));
let kept = null; // draft survives tab switches (each tab is its own route token)

export default function Settings({ params }) {
	const s = useStore();
	const tab = TABS.some((t) => t.id === params[0]) ? params[0] : 'general';
	const [draft, setDraftState] = useState(() => kept || pick(s));
	const [newColor, setNewColor] = useState('#0f766e');
	const saved = pick(s);
	const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

	useEffect(() => () => {
		if (!location.hash.startsWith('#admin.settings')) kept = null;
	}, []);

	const setDraft = (next) => {
		kept = next;
		setDraftState(next);
	};
	const set = (key, value) => setDraft({ ...draft, settings: { ...draft.settings, [key]: value } });
	const setTool = (key, value) => set('toolbar', { ...draft.settings.toolbar, [key]: value });
	const setModule = (id, on) => setDraft({ ...draft, modules: { ...draft.modules, [id]: on } });

	const save = () => {
		store.set((st) => ({ ...st, app: { ...st.app, settings: draft.settings, modules: draft.modules } }));
		kept = null;
		toast('Settings saved');
	};
	const discard = () => setDraft(pick(store.get()));

	const d = draft.settings;
	const palette = d.palette || [];

	const general = html`
		<${Card} title="Where the 3D viewer appears" subtitle="Applies to every product with 3D turned on.">
			<${ChoiceList}
				choices=${[
					{ value: 'replace_image', label: 'Replace product images', helpText: 'The viewer takes the place of the main product image.' },
					{ value: 'gallery_first', label: 'Show 3D first in the gallery', helpText: 'Your photos stay; the 3D view becomes the first slide.' },
					{ value: 'block_only', label: 'Only where I place the block', helpText: 'Add the "3D Configurator" block to your product template in the theme editor.' },
					{ value: 'modal', label: 'Button that opens a modal', helpText: 'A "View in 3D" button under the gallery opens the viewer in a dialog.' },
				]}
				selected=${d.placement}
				onChange=${(v) => set('placement', v)}
			/>
			<${Banner} tone="info">The first two need a gallery adapter for your theme. Horizon and Dawn are supported; on other themes the viewer falls back to the block you place.<//>
		<//>
		<${Card} title="Loading">
			<${Select}
				label="Load the 3D model"
				value=${d.loading_trigger}
				options=${[
					{ value: 'click', label: 'When the shopper clicks the poster (fastest pages)' },
					{ value: 'scroll', label: 'When the viewer scrolls into view' },
					{ value: 'eager', label: 'As soon as the page loads' },
				]}
				onChange=${(v) => set('loading_trigger', v)}
				helpText="Until then shoppers see a poster image, so your storefront speed score stays the same."
			/>
		<//>
		<${Card} title="Viewer toolbar">
			<${Switch} label="Zoom in and out" checked=${d.toolbar.zoom} onChange=${(v) => setTool('zoom', v)} />
			<${Switch} label="Reset view" checked=${d.toolbar.reset} onChange=${(v) => setTool('reset', v)} />
			<${Switch} label="Auto-rotate" checked=${d.toolbar.autorotate} onChange=${(v) => setTool('autorotate', v)} />
			<${Switch} label="Full screen" checked=${d.toolbar.fullscreen} onChange=${(v) => setTool('fullscreen', v)} />
			<${Switch} label='"View in your space" (AR)' checked=${d.toolbar.ar} onChange=${(v) => setTool('ar', v)} />
		<//>
		<${Card} title="Collection pages">
			<${Switch} label="Show a 3D badge on product cards" helpText="Marks products that have 3D on collection and search pages. Needs the app embed. Beta: depends on your theme's product cards." checked=${d.shop_badge} onChange=${(v) => set('shop_badge', v)} />
		<//>
	`;

	const customizer = html`
		<${Card} title="Customizer">
			<${Switch} label="Let shoppers customize products" helpText="Adds a Customize button next to Add to cart. You can turn it off for single products in the editor." checked=${d.customizer} onChange=${(v) => set('customizer', v)} />
		<//>
		<${Card} title="Layout">
			<${ChoiceList}
				choices=${[
					{ value: 'drawer', label: 'Side drawer', helpText: 'Opens beside the viewer. Works on every page.' },
					{ value: 'modal', label: 'Large modal', helpText: 'A bigger viewer, the options, a live total and Add to cart in one dialog. Only next to the product form.' },
				]}
				selected=${d.customizer_layout}
				onChange=${(v) => set('customizer_layout', v)}
			/>
			${d.customizer_layout === 'modal' && !draft.modules['customizer-modal'] ? html`<${Banner} tone="warning" action=${{ content: 'Open Features', href: '#admin.settings.features' }}>The modal needs the "Customizer modal" feature. Until it's on, shoppers get the drawer.<//>` : null}
		<//>
		<${Card} title="Colour palette" subtitle="Colours shoppers can pick for parts you mark as customizable.">
			<ul class="as-palette">
				${palette.map(
					(c, i) => html`<li class="as-swatch">
						<span class="as-swatch__chip" style=${{ background: c }}></span>
						<span class="as-swatch__hex">${c}</span>
						<button type="button" class="as-swatch__x" aria-label=${`Remove ${c}`} onClick=${() => set('palette', palette.filter((_, j) => j !== i))}><${Icon} name="x" size=${12} /></button>
					</li>`,
				)}
			</ul>
			<div class="as-palette__add">
				<label class="as-colorpick"><input type="color" value=${newColor} onInput=${(e) => setNewColor(e.target.value)} aria-label="New colour" /><span>${newColor}</span></label>
				<${Button} icon="plus" disabled=${palette.includes(newColor) || palette.length >= 16} onClick=${() => set('palette', [...palette, newColor])}>Add colour<//>
				<${Text} tone="subdued" variant="caption">${palette.length} of 16<//>
			</div>
		<//>
	`;

	const features = html`
		<p class="as-lede">Turn features on or off for your whole store. Turning one off hides it from shoppers but keeps your setup.</p>
		<div class="as-modules">
			${Object.keys(draft.modules).map((id) => {
				const m = MODULE_INFO[id] || { title: id, text: '' };
				const gated = !planIncludes(s.app.plan, id);
				const blocked = m.requires && !draft.modules[m.requires];
				return html`
					<section class="p-card as-module">
						<div class="as-module__head">
							<div class="as-module__title">
								<h3>${m.title}</h3>
								${gated ? html`<${Badge} tone="new">${planName(PLAN_FEATURES[id])}<//>` : null}
							</div>
							<button type="button" role="switch" aria-label=${m.title} aria-checked=${String(!!draft.modules[id])} class=${'p-switch' + (draft.modules[id] ? ' is-on' : '')} onClick=${() => setModule(id, !draft.modules[id])}><span></span></button>
						</div>
						<p class="as-module__text">${m.text}</p>
						${blocked ? html`<p class="as-module__note"><${Icon} name="alert" size=${14} /> Needs ${MODULE_INFO[m.requires].title}.</p>` : null}
						${gated ? html`<p class="as-module__note">Included in ${planName(PLAN_FEATURES[id])}. <a href="#admin.plans">Compare plans</a></p>` : null}
						${id === 'coverage' && draft.modules[id]
							? html`<div class="as-module__extra"><${TextField} label="Flag models larger than" type="number" min=${1} max=${500} suffix="MB" value=${d.coverage_max_model_mb} onInput=${(v) => set('coverage_max_model_mb', Number.isFinite(v) ? v : d.coverage_max_model_mb)} /></div>`
							: null}
					</section>
				`;
			})}
		</div>
	`;

	const sharing = html`
		${!draft.modules['saved-designs'] ? html`<${Banner} tone="warning" action=${{ content: 'Open Features', href: '#admin.settings.features' }}>Share links are off. Turn on "Share links and saved designs" to use these settings.<//>` : null}
		<${Card} title="Share links">
			<${Select}
				label="Keep saved designs for"
				value=${String(d.share_link_lifetime)}
				options=${[
					{ value: '30', label: '30 days' },
					{ value: '90', label: '90 days' },
					{ value: '180', label: '180 days' },
					{ value: '365', label: '1 year' },
					{ value: '0', label: 'Never expire' },
				]}
				onChange=${(v) => set('share_link_lifetime', Number(v))}
				helpText="After this, the link shows the product with its default setup. Designs in orders never expire."
			/>
			<${Text} tone="subdued">Links look like <code class="as-code">${s.shop.domain}/apps/3d/d/K7Q2MX</code>. Restored pages are hidden from search engines.<//>
		<//>
	`;

	const files = Object.values(s.files);
	const noAr = files.filter((f) => !f.usdz);
	const ar = html`
		<${Card} title="How AR works on Shopify">
			<ul class="as-bullets">
				<li>Shopify creates the USDZ file for iPhone and iPad from every GLB you upload. You don't upload one by hand.</li>
				<li>Android opens the GLB directly in Scene Viewer.</li>
				<li>On a computer, "View in your space" shows a QR code to open the product on a phone.</li>
			</ul>
			${noAr.length
				? html`<${Banner} tone="warning" title=${`${noAr.length} model${noAr.length === 1 ? ' has' : 's have'} no AR file`} action=${{ content: 'View in 3D products', href: '#admin.products' }}>
						${noAr.map((f) => f.filename).join(', ')}. Shopify can't convert Draco-compressed files. Upload an uncompressed copy, or turn on AR of the configured product below.
					<//>`
				: html`<${Badge} tone="success" icon="check">Every model has an AR file<//>`}
		<//>
		<${Card} title="Configured AR">
			<${Switch}
				label="Show the shopper's design in AR"
				helpText="Builds the AR file on the shopper's phone from their colours and parts. Off: AR shows the base model."
				checked=${d.ar_configured}
				onChange=${(v) => set('ar_configured', v)}
			/>
			${d.ar_configured && !draft.modules['usdz-export'] ? html`<${Banner} tone="warning" action=${{ content: 'Open Features', href: '#admin.settings.features' }}>Needs the "AR of the configured product" feature.<//>` : null}
		<//>
	`;

	const privacy = html`
		<${Card} title="Customer data requests">
			<${Text}>We answer Shopify's privacy webhooks automatically. When a customer asks for their data, we send their saved designs and order configurations. When a customer asks to be forgotten, we delete their saved designs and remove their name from order configurations.<//>
			<div class="as-hooks">
				${['customers/data_request', 'customers/redact', 'shop/redact'].map((t) => html`<span class="as-hook"><${Icon} name="check" size=${14} />${t}</span>`)}
			</div>
		<//>
		<${Card} title="If you uninstall">
			<${Text}>Your products, photos and the 3D models in Shopify Files stay in your store. Shopify's own 3D media keeps working in your theme.<//>
			<${Text}>Our copies of your settings, editor setups and designs are deleted 48 hours after you uninstall, when Shopify sends the shop/redact request. Reinstall within 48 hours to keep them.<//>
		<//>
		<${Card} title="Where data is stored">
			<${Text} tone="subdued">Settings and designs live in our database. Shopper snapshots and uploaded personalization images are stored for the life of the design, then deleted.<//>
		<//>
	`;

	const body = { general, customizer, features, sharing, ar, privacy }[tab];

	return html`
		<${AdminFrame} current="app.settings" appTitle="Settings">
			<${SaveBar} dirty=${dirty} onSave=${save} onDiscard=${discard} />
			<${Page} title="Settings" width="narrow">
				<div class="as-settings-tabs"><${Tabs} tabs=${TABS} selected=${tab} onSelect=${(id) => go(`admin.settings.${id}`)} /></div>
				${body}
			<//>
		<//>
	`;
}
