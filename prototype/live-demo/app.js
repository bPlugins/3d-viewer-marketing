// Live demo host: demo bar (plan switch, site switch, tours, reset) + the routed screen.
// Reuses the configurator prototype's store, router, WP admin chrome and screens.
import { html, render, Component, useState, useEffect, useRef, cx } from '../js/core/ui.js';
import { useRoute, go, setDefaultRoute } from '../js/core/router.js';
import { store, useStore } from '../js/core/store.js';
import { configureChrome, WpAdmin } from '../js/screens/admin/chrome.js';
import { StoreTheme } from '../js/screens/store/theme.js';
import { PageBlocks, ElementorContent } from '../js/screens/store/block-theme.js';
import { pageBySlug, BLOCK_NAME, WIDGET_TYPE } from '../js/shared/block.js';
import { ROUTES } from './routes.js';
import { liveSeed, LD_KEY, LD_VERSION } from './core/seed.js';
import { buildMenu } from './core/menu.js';
import { usePlan, setPlan, useExt, useExtActive, useExtOff, isPro, extActive } from './core/plan.js';
import { toast } from './core/bus.js';
import { LINKS } from './core/links.js';
import { MODELS } from './ui/models.js';
import { ProModal, Toast } from './ui/pro.js';
import { TourHost, startTour } from './ui/tour.js';
import { TOURS } from './core/tours.js';
import { extNotice } from './core/hooks.js';
import './woo/hooks.js';

store.configure({ key: LD_KEY, version: LD_VERSION, seed: liveSeed });
setDefaultRoute('wp.dashboard');

let lastInert = 0;
configureChrome({
	menu: buildMenu,
	user: 'demo',
	site: 'Demo Store',
	inertTitle: 'Not part of this demo',
	onInert: () => {
		if (Date.now() - lastInert < 1500) return;
		lastInert = Date.now();
		toast('That screen is not part of the demo. Try 3D Viewer, Products or WooCommerce.');
	},
	// wp_admin_bar_new_content_menu(): core types, then CPTs in registration order (3D Viewer init 0, Preset 1, WooCommerce 5).
	newItems: () => [['Post'], ['Media'], ['Page'], ['3D Viewer', 'v3d.edit.new'], ...(isPro() ? [['Preset', 'v3d.preset.new']] : []), ['Product', 'admin.product.new'], ['Order'], ['Coupon'], ['User']],
});

const cache = new Map();

// Each state carries its route key, so a new route never renders the previous screen with the new params.
function useScreen(key) {
	const [state, setState] = useState(() => cache.get(key) || { status: 'loading', key });
	useEffect(() => {
		const route = ROUTES[key];
		if (!route) return setState({ status: 'missing', key });
		if (cache.get(key)?.status === 'ready') return setState(cache.get(key));
		let live = true;
		setState({ status: 'loading', key });
		route
			.load()
			.then((m) => {
				const next = { status: 'ready', Comp: m.default, key };
				cache.set(key, next);
				if (live) setState(next);
			})
			.catch((error) => live && setState({ status: 'error', error, key }));
		return () => (live = false);
	}, [key]);
	if (cache.get(key)?.status === 'ready') return cache.get(key);
	if (!ROUTES[key]) return { status: 'missing', key };
	return state.key === key ? state : { status: 'loading', key };
}

const ext$ = (href) => (href.startsWith('#') ? {} : { target: '_blank', rel: 'noopener' });

/** Shown instead of a Pro page on free, or a configurator page while the extension is off. */
function Gate({ need, title }) {
	const plan = usePlan();
	const ext = useExt();
	const off = useExtOff();
	const notice = need === 'ext' && extNotice(plan, ext, off);
	return html`<${WpAdmin} current=${need === 'pro' ? 'v3d' : 'woocommerce'} title=${title}>
		<div class="wrap ld-gate">
			<h1 class="wp-heading-inline">${title}</h1>
			${need === 'pro'
				? html`<div class="ld-gate__card">
						<p class="ld-gate__lead"><strong>${title}</strong> is part of 3D Viewer Pro.</p>
						<p>Switch the demo to Pro to open it. Your viewers and settings stay as they are.</p>
						<p class="ld-gate__acts">
							<button type="button" class="button button-primary" onClick=${() => setPlan('pro')}>Try Pro in this demo</button>
							<a class="button" href=${LINKS.pricing} target="_blank" rel="noopener">See plans</a>
						</p>
					</div>`
				: notice &&
					html`<div class="ld-gate__card">
						<p class="ld-gate__lead">${ext === 'active' ? html`<strong>${title}</strong> is part of 3D Product Configurator for WooCommerce, which is not running on this site.` : notice[0]}</p>
						<p class="ld-gate__acts">
							${plan !== 'pro' && html`<button type="button" class="button button-primary" onClick=${() => setPlan('pro')}>Try Pro in this demo</button>`}
							<a class=${plan !== 'pro' ? 'button' : 'button button-primary'} href=${notice[2]} ...${ext$(notice[2])}>${notice[1]}</a>
						</p>
					</div>`}
		</div>
	<//>`;
}

/** Storefront while the configurator is off: its blocks and widgets render nothing; design links fall through to the shop. */
function StoreOff({ route }) {
	const state = useStore();
	useEffect(() => {
		if (route.screen === 'design') location.replace('#store.shop');
	}, [route.token]);
	const page = route.screen === 'page' ? pageBySlug(state, route.params[0] || '') : null;
	if (!page) return html`<${StoreTheme} crumbs=${[['Home', '#store.shop'], ['Page not found']]}>
		<div class="st-404">
			<h1>Oops! That page can’t be found.</h1>
			<p>It looks like nothing was found at this location.</p>
			<p><a class="button" href="#store.shop">Return to shop</a></p>
		</div>
	<//>`;
	const strip = (list) => (list || []).filter((b) => b.name !== BLOCK_NAME).map((b) => (b.inner ? { ...b, inner: strip(b.inner) } : b));
	return html`<${StoreTheme} crumbs=${[['Home', '#store.shop'], [page.title]]}>
		<article class=${'page type-page bt-page' + (page.builder === 'elementor' ? ' bt-page--elementor' : '')}>
			<header class="entry-header bt-page__head"><h1 class="entry-title">${page.title}</h1></header>
			${page.builder === 'elementor' ? html`<${ElementorContent} widgets=${(page.elementor || []).filter((w) => w.type !== WIDGET_TYPE)} />` : html`<${PageBlocks} blocks=${strip(page.blocks)} />`}
		</article>
	<//>`;
}

function ScreenHost({ route }) {
	const key = `${route.area}.${route.screen}`;
	const screen = useScreen(key);
	const plan = usePlan();
	const ext = useExtActive();
	const def = ROUTES[key];
	if (def?.need === 'pro' && plan !== 'pro') return html`<${Gate} need="pro" title=${def.title} />`;
	if (def?.need === 'ext' && !ext) return route.area === 'store' ? html`<${StoreOff} route=${route} />` : html`<${Gate} need="ext" title=${def.title} />`;
	if (key === 'store.design' && !route.params[0]) return html`<${StoreOff} route=${route} />`;
	if (screen.status === 'loading') return html`<div class="proto-msg">Loading…</div>`;
	if (screen.status === 'missing') return html`<div class="proto-msg">This page is not part of the demo. <a href="#wp.dashboard">Go to the Dashboard</a></div>`;
	if (screen.status === 'error')
		return html`<div class="proto-msg proto-msg--error"><strong>This screen failed to load.</strong><pre>${String(screen.error?.stack || screen.error)}</pre></div>`;
	const { Comp } = screen;
	return html`<${Comp} params=${route.params} key=${route.token} />`;
}

/** One broken screen shows its error instead of blanking the whole demo (the bar stays usable). */
class Boundary extends Component {
	componentDidCatch(error) {
		console.error(error);
		this.setState({ error });
	}
	render({ children }, { error }) {
		return error ? html`<div class="proto-msg proto-msg--error"><strong>This screen failed to load.</strong><pre>${String(error?.stack || error)}</pre></div>` : children;
	}
}

function Seg({ label, value, options, onChange, small }) {
	return html`<nav class=${cx('ld-seg', small && 'ld-seg--small')} aria-label=${label}>
		${options.map(([v, text]) => html`<button type="button" key=${v} class=${cx(value === v && 'is-on')} aria-pressed=${value === v} onClick=${() => onChange(v)}>${text}</button>`)}
	</nav>`;
}

function AboutPop({ onClose }) {
	return html`<div class="ld-pop" role="dialog" aria-label="About this demo">
		<div class="ld-pop__head"><strong>About this demo</strong><button type="button" class="ld-x" aria-label="Close" onClick=${onClose}>×</button></div>
		<p>This is a clickable copy of the WordPress admin with 3D Viewer and the WooCommerce configurator. It runs only in your browser: nothing you create or upload is sent anywhere, and other visitors never see your changes.</p>
		<p>Use <strong>Free / Pro</strong> to switch between the free plugin and 3D Viewer Pro. <strong>Reset demo</strong> starts over.</p>
		<p class="ld-pop__links"><a href=${LINKS.wporg} target="_blank" rel="noopener">3D Viewer on WordPress.org</a> · <a href=${LINKS.docs} target="_blank" rel="noopener">Documentation</a></p>
		<h3>Sample models</h3>
		<ul class="ld-credits">${Object.values(MODELS).map((m) => html`<li key=${m.file}>${m.credit}</li>`)}</ul>
	</div>`;
}

function ToursPop({ onClose }) {
	return html`<div class="ld-pop ld-pop--tours" role="dialog" aria-label="Guided tours">
		<div class="ld-pop__head"><strong>Guided tours</strong><button type="button" class="ld-x" aria-label="Close" onClick=${onClose}>×</button></div>
		<ul class="ld-tour-list">
			${TOURS.map(
				(t) => html`<li key=${t.id}>
					<button type="button" onClick=${() => { onClose(); startTour(t.id); }}>
						<span class="ld-tour-list__title">${t.title}</span>
						<span class="ld-tour-list__sum">${t.summary}</span>
					</button>
				</li>`
			)}
		</ul>
	</div>`;
}

const RESET_FLAG = 'bp3d-live-demo-reset';

/** Seed restored, then a fresh page load so no screen keeps unsaved drafts or caches from before. */
function resetDemo() {
	store.reset();
	try {
		sessionStorage.setItem(RESET_FLAG, '1');
		localStorage.removeItem('bp3d-live-demo-preview');
	} catch {
		// Storage blocked: the page still reloads on the fresh seed, just without the toast.
	}
	location.hash = 'wp.dashboard';
	location.reload();
}

function resetToast() {
	try {
		if (!sessionStorage.getItem(RESET_FLAG)) return;
		sessionStorage.removeItem(RESET_FLAG);
	} catch {
		return;
	}
	toast('Demo reset. Only your copy changed.');
}

function DemoBar({ route }) {
	const plan = usePlan();
	const [pop, setPop] = useState(null);
	const [confirmReset, setConfirmReset] = useState(false);
	useEffect(() => {
		if (!pop) return undefined;
		const onKey = (e) => e.key === 'Escape' && setPop(null);
		// A press anywhere outside the demo bar closes the popover too.
		const onDown = (e) => !e.target.closest?.('.ld-bar') && setPop(null);
		document.addEventListener('keydown', onKey);
		document.addEventListener('pointerdown', onDown);
		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('pointerdown', onDown);
		};
	}, [pop]);
	const area = route.area === 'store' ? 'site' : 'admin';
	const toggle = (name) => setPop(pop === name ? null : name);
	return html`<header class="ld-bar">
		<span class="ld-bar__brand"><span class="ld-bar__dot" aria-hidden="true"></span><span class="ld-long">3D Viewer live demo</span><span class="ld-short">Live demo</span></span>
		<${Seg} label="Plugin plan" value=${plan} options=${[['free', 'Free'], ['pro', 'Pro']]} onChange=${(v) => setPlan(v)} />
		<${Seg} small label="Area" value=${area} options=${[['admin', html`<span class="ld-long">WP Admin</span><span class="ld-short">Admin</span>`], ['site', html`<span class="ld-long">Visit site</span><span class="ld-short">Site</span>`]]} onChange=${(v) => go(v === 'site' ? 'store.viewer' : 'wp.dashboard')} />
		${TOURS.length > 0 && html`<button type="button" class="ld-btn" aria-expanded=${pop === 'tours'} onClick=${() => toggle('tours')}>Take a tour</button>`}
		<span class="ld-bar__spacer"></span>
		<button type="button" class="ld-btn ld-btn--quiet" aria-expanded=${pop === 'about'} onClick=${() => toggle('about')}>About</button>
		${confirmReset
			? html`<span class="ld-confirm">Start over?
					<button type="button" class="ld-btn ld-btn--danger" onClick=${resetDemo}>Reset</button>
					<button type="button" class="ld-btn" onClick=${() => setConfirmReset(false)}>Cancel</button></span>`
			: html`<button type="button" class="ld-btn" onClick=${() => setConfirmReset(true)}><span class="ld-long">Reset demo</span><span class="ld-short">Reset</span></button>`}
		<a class="ld-btn ld-btn--cta" href=${LINKS.pricing} target="_blank" rel="noopener">${plan === 'pro' ? 'See pricing' : html`<span class="ld-long">Get 3D Viewer Pro</span><span class="ld-short">Get Pro</span>`}</a>
		${pop === 'about' && html`<${AboutPop} onClose=${() => setPop(null)} />`}
		${pop === 'tours' && html`<${ToursPop} onClose=${() => setPop(null)} />`}
	</header>`;
}

function docTitle(def, route, state) {
	if (!def) return 'Demo Store';
	const name = typeof def.doc === 'function' ? def.doc(route.params, state) : def.doc || def.title;
	return route.area === 'store' ? name + ' – Demo Store' : name + ' ‹ Demo Store — WordPress';
}

/** Re-renders only when the selected value changes (useStore re-renders on every store change). */
function useSelect(select) {
	const fn = useRef(select);
	fn.current = select;
	const [, set] = useState(() => select(store.get()));
	useEffect(() => store.subscribe(() => set(fn.current(store.get()))), []);
	return select(store.get());
}

function App() {
	const route = useRoute();
	const def = ROUTES[`${route.area}.${route.screen}`];
	const plan = useSelect((s) => (isPro(s) ? 'pro' : 'free'));
	const ext = useSelect((s) => extActive(s));
	const gated = (def?.need === 'pro' && plan !== 'pro') || (def?.need === 'ext' && !ext);
	// `fullscreen` may depend on the data (a viewer post opens the block editor or the Modern screen).
	const full = useSelect((s) => (typeof def?.fullscreen === 'function' ? !!def.fullscreen(route.params, s) : !!def?.fullscreen));
	const title = useSelect((s) => docTitle(def, route, s)) + ' · 3D Viewer live demo';
	useEffect(() => {
		document.title = title;
	}, [title]);
	return html`
		<div class=${cx('proto-root', 'ld-root', 'ld-plan-' + plan, full && !gated && 'proto-root--full', 'proto-area-' + route.area)}>
			<${DemoBar} route=${route} />
			<main class="proto-stage"><${Boundary} key=${route.token}><${ScreenHost} route=${route} /><//></main>
			<${ProModal} />
			<${TourHost} />
			<${Toast} />
		</div>
	`;
}

render(html`<${App} />`, document.getElementById('proto-app'));
resetToast();
