import { html, render, useState, useEffect, useRef, Component, cx } from '../js/core/ui.js';
import { useRoute } from './core/router.js';
import { store, useStore } from './core/store.js';
import { store as wpStore } from '../js/core/store.js';
import { ROUTES, AREAS, matchRoute } from './routes.js';
import { Icon } from './ui/icons.js';
import { ToastHost } from './ui/polaris.js';

class Boundary extends Component {
	constructor() {
		super();
		this.state = { error: null };
	}
	componentDidCatch(error) {
		console.error(error);
		this.setState({ error });
	}
	render({ children }, { error }) {
		if (error) return html`<div class="x-missing"><h2>This screen failed to render</h2><pre>${String(error?.message || error)}</pre></div>`;
		return children;
	}
}

const cache = new Map();
function Screen({ token }) {
	const m = matchRoute(token);
	const [mod, setMod] = useState(() => (m && cache.get(m.key)) || null);
	const [err, setErr] = useState(null);
	useEffect(() => {
		if (!m) return;
		if (cache.has(m.key)) return setMod(cache.get(m.key));
		setMod(null);
		setErr(null);
		m.route
			.load()
			.then((x) => {
				cache.set(m.key, x);
				setMod(x);
			})
			.catch((e) => {
				console.error(e);
				setErr(e);
			});
	}, [m?.key]);
	if (!m) return html`<div class="x-missing"><h2>No screen at #${token}</h2><a href="#guide">Open the map</a></div>`;
	if (err) return html`<div class="x-missing"><h2>Screen not available</h2><pre>${String(err.message || err)}</pre></div>`;
	if (!mod) return html`<div class="x-loading"><span class="x-pimg__spin"></span></div>`;
	const S = mod.default;
	return html`<${Boundary} key=${token}><${S} params=${m.params} token=${token} /><//>`;
}

function Seg({ label, value, options, onChange }) {
	return html`
		<div class="pb-seg" role="group" aria-label=${label}>
			<span class="pb-seg__label">${label}</span>
			${options.map((o) => html`<button type="button" class=${cx(value === o.value && 'is-on')} aria-pressed=${String(value === o.value)} onClick=${() => onChange(o.value)}>${o.label}</button>`)}
		</div>
	`;
}

function PrototypeBar({ route }) {
	const s = useStore();
	const m = matchRoute(route.token);
	const [confirmReset, setConfirmReset] = useState(false);
	const cartCount = s.cart.lines.reduce((t, l) => t + l.qty, 0);
	const ref = useRef(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--pb-total', el.offsetHeight + 'px'));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return html`
		<div class="pb" ref=${ref}>
			<div class="pb__row">
				<a class="pb__brand" href="#guide"><span class="pb__logo"><${Icon} name="cube" size=${14} /></span><span>3D Configurator <em>for Shopify</em></span><span class="pb__tag">Prototype</span></a>
				<nav class="pb__areas" aria-label="Prototype areas">
					${AREAS.map((a) => html`<a class=${cx('pb__area', route.area === a.id && 'is-active')} href=${'#' + a.token}>${a.label}${a.id === 'store' && cartCount ? html`<span class="pb__count">${cartCount}</span>` : null}</a>`)}
				</nav>
				<div class="pb__controls">
					<${Seg} label="Plan" value=${s.shop.plan} options=${[{ label: 'Basic', value: 'basic' }, { label: 'Plus', value: 'plus' }]} onChange=${(v) => store.patch('shop.plan', v)} />
					<${Seg} label="Currency" value=${s.demo.currency} options=${[{ label: 'USD', value: 'USD' }, { label: 'EUR', value: 'EUR' }]} onChange=${(v) => store.patch('demo.currency', v)} />
					${confirmReset
						? html`<span class="pb__confirm">Reset all demo data? <button type="button" onClick=${() => { store.reset(); setConfirmReset(false); }}>Reset</button><button type="button" onClick=${() => setConfirmReset(false)}>Cancel</button></span>`
						: html`<button type="button" class="pb__reset" onClick=${() => setConfirmReset(true)}>Reset demo data</button>`}
				</div>
			</div>
			${m && m.route.surface
				? html`<div class="pb__surface"><${Icon} name="puzzle" size=${12} /><span>${m.route.surface}</span>${m.route.phase ? html`<span class="pb__phase">${m.route.phase}</span>` : null}</div>`
				: null}
		</div>
	`;
}

function App() {
	const route = useRoute();
	useEffect(() => {
		document.documentElement.dataset.area = route.area;
	}, [route.area]);
	return html`
		<${PrototypeBar} route=${route} />
		<div class="x-stage" data-area=${route.area}>
			<${Screen} token=${route.token} />
		</div>
		<${ToastHost} />
	`;
}

// The shared engine reads the WP prototype's feature flags; mirror the app's module switches into them.
function syncEngineFlags(s) {
	const want = { decals: !!s.app.modules.personalization, 'materials-variants': !!s.app.modules['material-variants'] };
	const flags = wpStore.get().flags || {};
	if (Object.entries(want).some(([k, v]) => !!flags[k] !== v)) wpStore.patch('flags', { ...flags, ...want });
}
syncEngineFlags(store.get());
store.subscribe(syncEngineFlags);

render(html`<${App} />`, document.getElementById('app'));
