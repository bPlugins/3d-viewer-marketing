// Guided tours started from the demo bar (runner: ui/tour.js).
// Step: { route?, keep? (RegExp: already there), target, title, body, click?, advanceOn?, doneWhen?(), skip?(), before?(), leave?(),
//   place?: 'right' (card corner when the target fills the screen), dock?: 'top' (phones: card at the top) }
// target: selector | [selectors] | () => selector | element. before() runs after routing; leave() when Next is pressed.
import { setPlan, extActive, installExtension, activateExtension } from './plan.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const byText = (sel, text) => $$(sel).find((el) => el.textContent.trim().includes(text)) || null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Resolves with the element (or true) once `test` (selector or function) holds, or null after `ms`. */
async function waitFor(test, ms = 4000) {
	const t0 = Date.now();
	for (;;) {
		const v = typeof test === 'string' ? $(test) : test();
		if (v) return v;
		if (Date.now() - t0 > ms) return null;
		await sleep(80);
	}
}

/** Sets a form control's value the way typing would, so Preact's onInput/onChange run. */
function typeInto(el, value, event = 'input') {
	if (!el) return;
	const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
	Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
	el.dispatchEvent(new Event(event, { bubbles: true }));
}

const pro = () => setPlan('pro');

// ── 3D Viewer helpers ──────────────────────────────────────────────────────
// New viewers open the Modern screen (viewer/modern-edit.js); the Pro tour uses 201, a block-editor post.

let made = null; // id of the viewer the first tour saved
const editRoute = () => (made ? 'v3d.edit.' + made : 'v3d.edit.new');
const closeMedia = () => $('.ld-media .media-modal-close')?.click();
const sourceInput = () => $('.ld-vm [data-field="bp_3d_source"] input');
const hasSource = () => !!sourceInput()?.value.trim();
const uploadSource = () => $('.ld-vm [data-field="bp_3d_source"] .bfields-btn--soft')?.click();

/** Picks fox.glb from the media modal when the visitor pressed Next without choosing a model. */
async function ensureSource() {
	if (hasSource()) return;
	if (!$('.ld-media')) {
		(await waitFor(() => $('.ld-vm [data-field="bp_3d_source"] .bfields-btn--soft'), 2000)) && uploadSource();
		await waitFor('.ld-media .attachment', 2000);
	}
	if (!$('.ld-media .attachment.selected')) (byText('.ld-media .attachment', 'fox.glb') || $('.ld-media .attachment'))?.click();
	(await waitFor('.ld-media .media-button-select:not([disabled])', 1500))?.click();
	await waitFor(hasSource, 2000);
}

async function openTab(id) {
	const tab = await waitFor(`.ld-vm [data-tab="${id}"]`, 3000);
	if (tab && tab.getAttribute('aria-selected') !== 'true') tab.click();
	await waitFor(`.ld-vm [data-tab="${id}"][aria-selected="true"]`, 1000);
}

async function publishViewer() {
	const btn = $('.ld-vm-publish');
	if (btn && /Publish/.test(btn.textContent)) {
		btn.click();
		await waitFor(() => /^#v3d\.edit\.\d/.test(location.hash) && $('.ld-vm-publish') && /Update/.test($('.ld-vm-publish').textContent), 3000);
	}
	made = location.hash.match(/^#v3d\.edit\.(\d+)/)?.[1] || made;
}

// ── 3D Viewer block editor helpers (the Pro tour) ──────────────────────────

async function openSidebar() {
	await waitFor('.ld-be-header');
	if (!$('.ld-be-sidebar')) $('.ld-be-actions [aria-label="Settings"]')?.click();
	await waitFor('.ld-be-sidebar');
	const blockTab = byText('.ld-be-sidetab', 'Block');
	if (blockTab && blockTab.getAttribute('aria-selected') !== 'true') blockTab.click();
	if ($('.ld-be-noblock')) $('.ld-be-block')?.click();
	const settings = await waitFor('.components-tab-panel__tabs-item.settings', 1500);
	if (settings && settings.getAttribute('aria-selected') !== 'true') settings.click();
	await waitFor('[data-panel]', 1500);
}

async function openPanel(id) {
	await openSidebar();
	const toggle = $(`[data-panel="${id}"] .components-panel__body-toggle`);
	if (toggle?.getAttribute('aria-expanded') === 'false') toggle.click();
	await waitFor(`[data-panel="${id}"].is-opened`, 1000);
}

// ── Configurator helpers ───────────────────────────────────────────────────

const workspaceOpen = () => $$('.wc3d-editor-root aside').length >= 2;
const customizerOpen = () => !!$('.wc3d-customizer-modal__panel, .wc3d-customer-drawer.open');

async function openCustomizer() {
	if (customizerOpen()) return;
	await waitFor('.wc3d-viewer-root');
	if (!$('.wc3d-customize-btn')) $('.wc3d-load-button')?.click();
	(await waitFor('.wc3d-customize-btn', 4000))?.click();
	await waitFor(customizerOpen, 2000);
}

export const TOURS = [
	{
		id: 'first-viewer',
		title: 'Your first 3D viewer',
		summary: 'Create a viewer, pick a model, set a few options and see it on the site. Works on Free.',
		steps: [
			{
				route: 'v3d.list',
				before: () => (made = null),
				target: '.wrap.ld-list .page-title-action',
				click: true,
				doneWhen: () => location.hash.startsWith('#v3d.edit.'),
				title: 'Start a new viewer',
				body: 'Each 3D viewer is its own post under 3D Viewer → All 3D Viewers. Press Add New to start one.',
			},
			{
				route: editRoute,
				keep: /^v3d\.edit\./,
				before: closeMedia,
				target: '.ld-vm-title',
				click: true,
				title: 'Give it a name',
				body: 'Type a title, for example "Fox". It names the viewer in your list of viewers. The shortcode next to it is what you paste into a page.',
				leave: () => {
					const t = $('.ld-vm-title');
					if (t && !t.value.trim()) typeInto(t, 'My first 3D viewer');
				},
			},
			{
				route: editRoute,
				keep: /^v3d\.edit\./,
				skip: hasSource,
				before: async () => {
					closeMedia();
					await openTab('model');
				},
				target: '.ld-vm [data-field="bp_3d_source"]',
				click: true,
				doneWhen: () => !!$('.ld-media') || hasSource(),
				title: 'Add a 3D model',
				body: 'On the Model tab, paste a model URL into 3D Source, or press Upload Source to open the Media Library.',
			},
			{
				route: editRoute,
				keep: /^v3d\.edit\./,
				skip: () => hasSource() && !$('.ld-media'),
				before: async () => {
					if (!$('.ld-media')) uploadSource();
					await waitFor('.ld-media .media-modal');
				},
				target: '.ld-media .media-modal',
				click: true,
				dock: 'top',
				doneWhen: () => !$('.ld-media') && hasSource(),
				title: 'Pick a model',
				body: 'Choose fox.glb (or any .glb file) and press Select. You can upload your own model too; it stays in your browser. The Live Preview beside the form shows it at once.',
				leave: ensureSource,
			},
			{
				route: editRoute,
				keep: /^v3d\.edit\./,
				before: async () => {
					closeMedia();
					await ensureSource();
					await openTab('settings');
				},
				target: '.ld-vm .bfields-card--rows',
				click: true,
				title: 'Choose the options',
				body: 'The Settings tab decides how visitors move and zoom the model and how it loads. Rows marked Pro come with 3D Viewer Pro. Style sets the size, alignment and background.',
			},
			{
				route: editRoute,
				keep: /^v3d\.edit\./,
				before: async () => {
					await ensureSource();
				},
				target: '.ld-vm .bfields-publish',
				click: true,
				doneWhen: () => /^#v3d\.edit\.\d/.test(location.hash) && /Update/.test($('.ld-vm-publish')?.textContent || ''),
				title: 'Publish it',
				body: 'Press Publish to save the viewer. The button then reads Update, and the shortcode under it is ready to copy.',
				leave: publishViewer,
			},
			{
				route: 'store.viewer',
				target: () => [made && '#viewer-' + made, '.ld-sv-section'].filter(Boolean),
				title: 'See it on your site',
				body: 'This is the 3D Showcase page, built with the 3D Viewer block. Your new viewer is at the top. Drag to turn the model and scroll to zoom. You can also paste its shortcode into any page.',
			},
		],
	},
	{
		id: 'pro',
		title: 'What Pro adds',
		summary: 'Hotspots, auto-rotate, lighting, Presets, the Visual Editor and Analytics.',
		steps: [
			{
				before: pro,
				target: '.ld-bar nav[aria-label="Plugin plan"]',
				title: 'You are on Pro now',
				body: 'This tour switched the demo to 3D Viewer Pro. Use this switch to go back to Free at any time. Your viewers and settings are kept either way.',
			},
			{
				route: 'v3d.edit.201',
				keep: /^v3d\.edit\.201$/,
				before: async () => {
					pro();
					await openPanel('hotspots');
				},
				target: '[data-panel="hotspots"]',
				click: true,
				title: 'Hotspots',
				body: 'Press Add Hotspot, then click the model to pin a label to that spot. Default Style sets how the labels look.',
			},
			{
				route: 'v3d.edit.201',
				keep: /^v3d\.edit\.201$/,
				before: async () => {
					pro();
					await openPanel('options');
				},
				target: () => byText('[data-panel="options"] .components-toggle-control', 'Auto Rotate'),
				click: true,
				title: 'Auto-rotate',
				body: 'Auto Rotate turns the model slowly until a visitor touches it. You can set the delay and the speed once it is on.',
			},
			{
				route: 'v3d.edit.201',
				keep: /^v3d\.edit\.201$/,
				before: async () => {
					pro();
					await openPanel('lighting');
				},
				target: '[data-panel="lighting"]',
				click: true,
				title: 'Lighting and environment',
				body: 'Set the exposure and tone mapping, light the model with an HDR image, or use that image as the background.',
			},
			{
				route: 'v3d.presets',
				before: pro,
				target: '.wrap.ld-presets-list',
				title: 'Presets',
				body: 'A preset saves a set of viewer settings. Pick one on a WooCommerce product instead of setting each product up by hand.',
			},
			{
				route: 'v3d.visual',
				before: pro,
				target: '.wrap.ld-ve',
				title: 'Visual Editor',
				body: 'Load a model, click it to place hotspots or frame a camera angle, then copy the values into your viewer.',
			},
			{
				route: 'v3d.analytics',
				before: pro,
				target: ['.bp3d-an-tiles', '.wrap.ld-an-wrap'],
				title: 'Analytics',
				body: 'See how often each viewer is seen and how many visitors open it in AR, by day and by viewer.',
			},
		],
	},
	{
		id: 'configurator',
		title: 'Sell configurable products',
		summary: 'Turn on the WooCommerce configurator, set up a product and buy it as a shopper.',
		steps: [
			{
				route: 'v3d.extensions',
				before: pro,
				target: '[data-ext="wc-3d-model-viewer-pro"]',
				click: true,
				doneWhen: () => extActive(),
				title: 'Add the configurator',
				body: () =>
					extActive()
						? '3D Product Configurator for WooCommerce comes with Pro and is already active here. Press Next.'
						: '3D Product Configurator for WooCommerce comes with Pro. Press Install, then Activate. The demo is on Pro for this tour.',
				leave: () => {
					if (extActive()) return;
					installExtension();
					activateExtension();
				},
			},
			{
				route: 'admin.models',
				before: () => {
					pro();
					if (!extActive()) (installExtension(), activateExtension());
				},
				target: () => $('a[href="#admin.editor.101"]')?.closest('tr'),
				click: true,
				doneWhen: () => location.hash.startsWith('#admin.editor.'),
				title: 'WooCommerce → 3D Models',
				body: 'This list shows every product and whether it has 3D. Open Lounge Chair (its name or Edit) to go to its 3D editor.',
			},
			{
				route: 'admin.editor.101',
				keep: /^admin\.editor\.101/,
				before: async () => {
					await waitFor('.wc3d-editor-root .wc3d-card, .wc3d-editor-root aside', 5000);
					if (workspaceOpen()) byText('.wc3d-editor-root button', 'Overview')?.click();
				},
				target: () => byText('.wc3d-editor-root button.wc3d-card', 'Charcoal'),
				click: true,
				doneWhen: workspaceOpen,
				title: 'One card per variation',
				body: 'Each card is a WooCommerce variation. A variation can change materials, colours, or load a different model. Open Charcoal.',
			},
			{
				route: 'admin.editor.101',
				keep: /^admin\.editor\.101/,
				before: async () => {
					await waitFor('.wc3d-editor-root .wc3d-card, .wc3d-editor-root aside', 5000);
					if (!workspaceOpen()) byText('.wc3d-editor-root button.wc3d-card', 'Charcoal')?.click();
					await waitFor(workspaceOpen, 3000);
				},
				target: () => $$('.wc3d-editor-root aside')[1],
				click: true,
				title: 'Set up parts, options and prices',
				body: 'Pick a part in the mesh tree on the left, then change it here. Customer Options decide what shoppers can change, and Option Pricing adds a price to each choice.',
			},
			{
				route: 'store.product.lounge-chair',
				before: () => $('.wc3d-customizer-modal__close')?.click(),
				target: '.wc3d-viewer-root',
				click: true,
				doneWhen: customizerOpen,
				title: 'The product page',
				body: 'Shoppers see a picture first, so the page loads fast. Press Interact in 3D, then Customize.',
			},
			{
				route: 'store.product.lounge-chair',
				before: openCustomizer,
				target: ['.wc3d-customizer-modal__panel', '.wc3d-customer-drawer.open'],
				click: true,
				title: 'Make it theirs',
				body: 'Shoppers pick a colour, a frame finish and the pillow. The chair and the total change as they choose.',
			},
			{
				route: 'store.product.lounge-chair',
				before: openCustomizer,
				target: ['.wc3d-customizer-modal__footer', 'form.cart .single_add_to_cart_button'],
				click: true,
				title: 'Add to cart',
				body: 'Choose a Color at the top, then press Add to cart. The choices go into the order, so you see the same chair in WooCommerce → Orders.',
			},
		],
	},
	{
		id: 'ar',
		title: 'See it in AR',
		summary: 'Open a viewer in augmented reality, or get the QR code on a computer.',
		steps: [
			{
				route: 'store.viewer.201',
				before: async () => {
					pro();
					$('.bp3d-qr-overlay .qr-content-close')?.click();
				},
				target: '.ld-sv-block',
				title: 'A viewer with AR on',
				body: 'This viewer has Enable AR switched on in the block\'s AR panel. Visitors get a View in AR button.',
			},
			{
				route: 'store.viewer.201',
				before: async () => {
					pro();
					$('.bp3d-qr-overlay .qr-content-close')?.click();
				},
				target: '.ld-sv-block [data-control="ar"]',
				click: true,
				doneWhen: () => !!$('.bp3d-qr-overlay'),
				title: 'View in AR',
				body: 'Press the AR button. On a phone that supports AR, the model opens in your room. On a computer you get a QR code instead.',
			},
			{
				route: 'store.viewer.201',
				before: async () => {
					pro();
					if (!$('.bp3d-qr-overlay')) $('.ld-sv-block [data-control="ar"]')?.click();
					await waitFor('.bp3d-qr-overlay .qr-content', 1500);
				},
				target: '.bp3d-qr-overlay .qr-content',
				title: 'Scan with your phone',
				body: 'On your site this shows a QR code for the page. Scan it with a phone camera to open the model in AR there.',
			},
		],
	},
];
