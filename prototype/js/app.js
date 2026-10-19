import { html, render, useState, useEffect, cx } from './core/ui.js';
import { useRoute, go } from './core/router.js';
import { store, useStore } from './core/store.js';
import { FEATURES, toggleFeature, dependencyNote, canToggle } from './core/features.js';
import { ROUTES, MENU } from './routes.js';
import { ThemeSwitch } from './shared/block.js';
import { ArDeviceSwitch } from './shared/ar-device.js';
import { HdriFailSwitch } from './shared/hdri.js';

const cache = new Map();

// Screens with no menu entry highlight their parent (order received is a checkout endpoint).
const MENU_PARENT = {
	'admin.order': 'admin.orders',
	'admin.coverage': 'admin.models',
	'admin.designs': 'admin.models',
	'store.order': 'store.checkout',
	'store.email': 'store.checkout',
	'store.account': 'store.shop',
	'store.design': 'store.shop',
};

function useScreen(key) {
	const [state, setState] = useState(() => cache.get(key) || { status: 'loading' });
	useEffect(() => {
		const route = ROUTES[key];
		if (!route) return setState({ status: 'missing' });
		if (cache.get(key)?.status === 'ready') return setState(cache.get(key));
		let live = true;
		setState({ status: 'loading' });
		route
			.load()
			.then((m) => {
				const next = { status: 'ready', Comp: m.default };
				cache.set(key, next);
				if (live) setState(next);
			})
			.catch((error) => live && setState({ status: 'error', error }));
		return () => (live = false);
	}, [key]);
	return state;
}

function ScreenHost({ route }) {
	const key = `${route.area}.${route.screen}`;
	const screen = useScreen(key);
	if (screen.status === 'loading') return html`<div class="proto-msg">Loading…</div>`;
	if (screen.status === 'missing') return html`<div class="proto-msg">No screen for <code>#${route.token}</code>. <a href="#admin.models">Go to 3D Models</a></div>`;
	if (screen.status === 'error')
		return html`<div class="proto-msg proto-msg--error"><strong>This screen failed to load.</strong><pre>${String(screen.error?.stack || screen.error)}</pre></div>`;
	const { Comp } = screen;
	return html`<${Comp} params=${route.params} key=${route.token} />`;
}

function RoadmapPopover({ onClose }) {
	const flags = useStore((s) => s.flags || {});
	return html`
		<div class="proto-pop" role="dialog" aria-label="Planned features">
			<div class="proto-pop__head">
				<strong>Planned features</strong>
				<button class="proto-x" onClick=${onClose} aria-label="Close">×</button>
			</div>
			<p class="proto-pop__note">Switch a feature on to see it in the prototype. Only features with status "prototyped" have UI yet. A feature module's switch is its Settings → Features toggle.</p>
			<p class="proto-pop__all">
				<button class="proto-btn proto-btn--light" onClick=${() => FEATURES.forEach((f) => canToggle(f) && toggleFeature(f.id, true))}>Switch all on</button>
				<button class="proto-btn proto-btn--light" onClick=${() => FEATURES.forEach((f) => canToggle(f) && toggleFeature(f.id, false))}>Switch all off</button>
			</p>
			<ul class="proto-flags">
				${FEATURES.map(
					(f) => html`
						<li key=${f.id}>
							<label class=${cx('proto-flag', f.status === 'planned' && 'is-planned')}>
								<input
									id=${'flag-' + f.id}
									type="checkbox"
									checked=${!!flags[f.id]}
									disabled=${!canToggle(f)}
									onChange=${(e) => toggleFeature(f.id, e.currentTarget.checked)}
								/>
								<span class="proto-flag__text">
									<span class="proto-flag__title">${f.title}</span>
									<span class="proto-flag__sum">${f.summary}</span>
									${dependencyNote(f) && html`<span class=${cx('proto-flag__req', flags[f.id] && (f.requires || []).some((r) => !flags[r]) && 'is-unmet')}>${dependencyNote(f)}</span>`}
								</span>
								<span class=${'proto-chip proto-chip--' + f.status}>${f.module ? f.status + ' · module' : f.status}</span>
							</label>
						</li>
					`
				)}
			</ul>
			<a class="proto-pop__link" href="#proto.roadmap" onClick=${onClose}>Open the roadmap page</a>
		</div>
	`;
}

// Demo store setup, not a plugin feature: which cart/checkout pages the store uses.
function CartPageSwitch() {
	const page = useStore((s) => s.demo?.cartPage || 'classic');
	const set = (v) => store.patch('demo.cartPage', v);
	return html`<nav class="proto-seg proto-seg--small" aria-label="Cart page">
		<span class="proto-seg__label">Cart page</span>
		<button class=${cx(page === 'classic' && 'is-on')} aria-pressed=${page === 'classic'} onClick=${() => set('classic')}>Classic</button>
		<button class=${cx(page === 'blocks' && 'is-on')} aria-pressed=${page === 'blocks'} onClick=${() => set('blocks')}>Blocks</button>
	</nav>`;
}

function ProtoBar({ route }) {
	const [pop, setPop] = useState(false);
	const [confirmReset, setConfirmReset] = useState(false);
	useEffect(() => {
		if (!pop) return;
		const onKey = (e) => e.key === 'Escape' && setPop(false);
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [pop]);
	const screen = `${route.area}.${route.screen}`;
	// gallery-lane: its compare page sits in the storefront bar.
	const area = route.area === 'store' || screen === 'proto.gallery-lane' ? 'store' : route.area === 'proto' ? 'proto' : 'admin';
	// MENU entries may carry a feature flag as 3rd item: shown only while it is on.
	const flags = useStore((s) => s.flags || {});
	const on = (token) => route.token === token || route.token.startsWith(token.split('.').slice(0, 2).join('.') + '.') || screen === token || MENU_PARENT[screen] === token;
	return html`
		<header class="proto-bar">
			<span class="proto-bar__brand" title="Clickable prototype. Not the shipped plugin.">Prototype</span>
			<nav class="proto-seg" aria-label="Area">
				<button class=${cx(area === 'admin' && 'is-on')} onClick=${() => go('admin.models')}>WP Admin</button>
				<button class=${cx(area === 'store' && 'is-on')} onClick=${() => go('store.product.lounge-chair')}>Storefront</button>
			</nav>
			<nav class="proto-links" aria-label="Screens">
				${(MENU[area] || []).filter(([, , flag]) => !flag || flags[flag]).map(([token, label]) => html`<a key=${token} href=${'#' + token} class=${cx(on(token) && 'is-on')}>${label}</a>`)}
			</nav>
			${area === 'store' && html`<${CartPageSwitch} />`}
			${area === 'store' && html`<${ThemeSwitch} />`}
			${area === 'store' && html`<${ArDeviceSwitch} />`}
			${area === 'admin' && html`<${HdriFailSwitch} />`}
			<span class="proto-bar__spacer"></span>
			<button class="proto-btn" onClick=${() => setPop(!pop)} aria-expanded=${pop}>Planned features</button>
			${confirmReset
				? html`<span class="proto-confirm">Reset all demo data?
						<button class="proto-btn proto-btn--danger" onClick=${() => { store.reset(); setConfirmReset(false); }}>Reset</button>
						<button class="proto-btn" onClick=${() => setConfirmReset(false)}>Cancel</button></span>`
				: html`<button class="proto-btn" onClick=${() => setConfirmReset(true)}>Reset demo data</button>`}
			${pop && html`<${RoadmapPopover} onClose=${() => setPop(false)} />`}
		</header>
	`;
}

function App() {
	const route = useRoute();
	const full = ROUTES[`${route.area}.${route.screen}`]?.fullscreen;
	useEffect(() => {
		const r = ROUTES[`${route.area}.${route.screen}`];
		document.title = (r ? r.title + ' · ' : '') + 'WC 3D Model Viewer Prototype';
	}, [route.token]);
	return html`
		<div class=${cx('proto-root', full && 'proto-root--full', 'proto-area-' + route.area)}>
			<${ProtoBar} route=${route} />
			<main class="proto-stage"><${ScreenHost} route=${route} /></main>
		</div>
	`;
}

render(html`<${App} />`, document.getElementById('proto-app'));
