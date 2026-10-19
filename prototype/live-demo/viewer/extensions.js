// 3D Viewer → Extensions: the dashboard's Extensions screen (dash/Extensions.tsx of 3d-viewer and 3d-viewer-premium),
// which the plugin puts on the BPEM page too. The configurator is premium_host_only: Pro installs and activates it.
import { html, useState, useRef, useEffect } from '../../js/core/ui.js';
import { WpAdmin } from '../../js/screens/admin/chrome.js';
import { go } from '../../js/core/router.js';
import { useIsPro, useExt, useExtOff, setPlan, installExtension, activateExtension, setExtensionEnabled } from '../core/plan.js';
import { toast } from '../core/bus.js';
import { LINKS } from '../core/links.js';
import { DashLayout, DIcon, Tag, SearchField, ShelfHero, CountChips, ExtHelp, NEW_TAB, PAGES, useModalFocus } from './help.js';

const CONFIGURATOR = 'wc-3d-model-viewer-pro';
const CLOUD_ICON =
	'data:image/svg+xml;charset=utf-8,' +
	encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none"><path d="M7.3 19.4a4.8 4.8 0 0 1-.6-9.55 6.3 6.3 0 0 1 12.1-1.62 4.8 4.8 0 0 1-1.1 9.47" stroke="#146EF5" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 21.4v-9.8M12 11.6l-3.1 3.1M12 11.6l3.1 3.1" stroke="#146EF5" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>');
const WC3D_ICON = new URL('../img/brand/wc-3d-model-viewer.png', import.meta.url).href;

const configurator = { id: CONFIGURATOR, name: '3D Product Configurator for WooCommerce', version: '1.1.0', homepage: LINKS.configurator, desc: 'Customize a 3D model per WooCommerce product variation.', author: 'bPlugins', authorUrl: 'https://bplugins.com' };
// public/extensions.json of 3D Viewer Pro (is_paid false: the host licence unlocks both).
const PRO_CATALOG = [
	configurator,
	{ id: 'cloud-storage-for-bplugins', name: 'Cloud Storage', version: '1.0.0', homepage: 'https://bplugins.com/products/cloud-storage', desc: 'Pick 3D models from Amazon S3, Cloudflare R2, Bunny.net, Google Drive or Dropbox.', icon: CLOUD_ICON },
];
// public/extensions.php of the free plugin: only the configurator, sold through 3D Viewer Pro.
const FREE_CATALOG = [{ ...configurator, icon: WC3D_ICON, paid: true }];

/** BPEM's row for one extension, from the demo's plan + install state. */
function itemOf(ext, pro, state, off) {
	const s = ext.id === CONFIGURATOR ? state : 'none';
	const installed = s === 'active';
	const enabled = installed && !off;
	return {
		...ext,
		licensed: pro,
		installed,
		pluginPresent: s === 'installed',
		enabled,
		status: installed ? (!pro ? 'unlicensed' : enabled ? 'active' : 'disabled') : '',
	};
}

const isActive = (e) => e.installed && e.status === 'active';
const MATCH = {
	all: () => true,
	active: isActive,
	inactive: (e) => !isActive(e) && (e.installed || e.pluginPresent),
	available: (e) => !e.installed && !e.pluginPresent,
};
// The free plugin's older filters.
const FREE_MATCH = { ...MATCH, inactive: (e) => e.installed && e.status !== 'active', available: (e) => !e.installed };

function badge(e) {
	if (!e.installed) return e.pluginPresent ? ['Installed', 'muted'] : ['Pro', 'pro'];
	return e.status === 'active' ? ['Active', 'success'] : ['Inactive', 'muted'];
}

function ExtensionCard({ ext, pro, busy, licenseKey, onKey, onInstall, onToggle, onBuy, onLicense }) {
	const [label, tone] = badge(ext);
	const blocked = !ext.licensed;
	const isBusy = Boolean(busy);
	const licensePanel = ext.installed && ext.paid;
	const learnMore = html`<a href=${ext.homepage} ...${NEW_TAB} class="bp3d-dash-btn bp3d-dash-btn--ghost"><${DIcon} name="ExternalLink" size=${14} weight=${1.75} /> Learn More</a>`;

	let cta = null;
	if (!ext.installed) {
		if (ext.pluginPresent) {
			cta = html`<button type="button" class="bp3d-dash-btn bp3d-dash-btn--primary bp3d-dash-extcard__cta" disabled=${isBusy || blocked} onClick=${onInstall}>
				${busy === 'activate' ? html`<span class="bp3d-x-spinner"></span> Activating…` : 'Activate'}
			</button>`;
		} else if (ext.paid && !ext.licensed) {
			cta = html`<button type="button" class="bp3d-dash-btn bp3d-dash-btn--primary bp3d-dash-extcard__cta" disabled=${isBusy} onClick=${onBuy}>
				<${DIcon} name="ShoppingCart" size=${14} weight=${1.75} /> Buy Now <${DIcon} name="ArrowRight" class="bp3d-dash-rtl-flip" size=${14} weight=${1.75} />
			</button>`;
		} else {
			cta = html`<button type="button" class="bp3d-dash-btn bp3d-dash-btn--primary bp3d-dash-extcard__cta" disabled=${isBusy || blocked} onClick=${onInstall}>
				${busy === 'install' ? html`<span class="bp3d-x-spinner"></span> Installing…` : html`Install <${DIcon} name="ArrowRight" class="bp3d-dash-rtl-flip" size=${14} weight=${1.75} />`}
			</button>`;
		}
	}

	const switchRow = html`<div class="bp3d-ext__switchrow">
		<span>${ext.enabled ? 'Enabled' : 'Disabled'}</span>
		<button type="button" role="switch" aria-checked=${ext.enabled} aria-label=${'Enable ' + ext.name} class=${'bp3d-x-switch' + (busy === 'toggle' ? ' is-busy' : '')} disabled=${isBusy || (!ext.enabled && !ext.licensed)} onClick=${onToggle}>
			${busy === 'toggle' && html`<span class="bp3d-x-spinner"></span>`}
		</button>
	</div>`;

	const license = html`<div class="bp3d-ext__license">
		<form class="bp3d-ext__keyrow" onSubmit=${(e) => { e.preventDefault(); if (licenseKey.trim()) onLicense(); }}>
			<div class="bp3d-x-field bp3d-x-field--sm">
				<input type="text" aria-label=${'License key for ' + ext.name} placeholder="Enter license key" autocomplete="off" value=${licenseKey} readonly=${isBusy} onInput=${(e) => onKey(e.currentTarget.value)} />
			</div>
			<button type="submit" class="bp3d-x-btn bp3d-x-btn--primary bp3d-x-btn--sm bp3d-ext__activate" disabled=${isBusy || !licenseKey.trim()}>
				${busy === 'license-activate' ? html`<span class="bp3d-x-spinner"></span>` : 'Activate'}
			</button>
		</form>
		<div class="bp3d-dash-extcard__actions">
			${learnMore}
			<button type="button" class="bp3d-dash-btn bp3d-dash-btn--primary bp3d-dash-extcard__cta" disabled=${isBusy} onClick=${onBuy}><${DIcon} name="ShoppingCart" size=${14} weight=${1.75} /> Buy license</button>
		</div>
	</div>`;

	return html`<article class="bp3d-dash-extcard" data-ext=${ext.id}>
		<div class="bp3d-dash-extcard__shot">
			${ext.icon ? html`<img src=${ext.icon} alt="" />` : html`<span class="bp3d-ext__glyph"><${DIcon} name="Puzzle" size=${44} weight=${1.25} /></span>`}
			<${Tag} class=${'bp3d-ext__badge bp3d-ext__badge--' + tone}>${label}<//>
		</div>
		<div class="bp3d-dash-extcard__body">
			<div class="bp3d-dash-extcard__head">
				<span class="bp3d-dash-extcard__icon">${!pro ? html`<${DIcon} name="Box" size=${20} weight=${1.75} />` : ext.icon ? html`<img src=${ext.icon} alt="" />` : html`<${DIcon} name="Puzzle" size=${20} weight=${1.75} />`}</span>
				<div>
					<h3 class="bp3d-dash-title">${ext.name}</h3>
					<div class="bp3d-dash-extcard__by">
						<span class="bp3d-dash-extcard__ver">v${ext.version}</span>
						${ext.author && html`<span class="bp3d-dash-extcard__author">by <a href=${ext.authorUrl} ...${NEW_TAB}>${ext.author} <${DIcon} name="ExternalLink" size=${12} weight=${1.75} /></a></span>`}
					</div>
				</div>
			</div>
			<p class="bp3d-dash-text">${ext.desc}</p>
			${blocked && html`<p class="bp3d-ext__warn">Available with a 3D Viewer Pro license.</p>`}
			${blocked &&
			ext.id === CONFIGURATOR &&
			html`<p class="ld-ext-try-row">
				It comes with the 3D Viewer Pro plan or higher.
				<button type="button" class="ld-ext-try" onClick=${() => setPlan('pro')}>Try it with Pro in this demo</button>
			</p>`}
			${ext.installed
				? html`<div class="bp3d-ext__manage">
						${licensePanel ? html`${switchRow}${license}` : html`<div class="bp3d-dash-extcard__actions">${learnMore}${switchRow}</div>`}
						${ext.id === CONFIGURATOR && extIsLive(ext) && html`<p class="bp3d-ext__note ld-ext-open"><${DIcon} name="CircleCheck" size=${13} weight=${1.75} /> WooCommerce → 3D Models is ready. <a href="#admin.models">Open 3D Models →</a></p>`}
					</div>`
				: html`<div class="bp3d-dash-extcard__actions">${learnMore}${cta}</div>`}
		</div>
	</article>`;
}

const extIsLive = (ext) => ext.licensed && isActive(ext);

/** Reload required (reload: 'auto' in includes/Extension.php). */
function ReloadDialog({ text, onLater }) {
	const panel = useRef(null);
	const reloadButton = useRef(null);
	useModalFocus(panel, onLater, reloadButton);
	return html`<div class="bp3d-x-modal" role="presentation">
		<div ref=${panel} class="bp3d-x-confirm bp3d-x-modal__panel" role="dialog" aria-modal="true" aria-labelledby="bp3d-ext-reload-title">
			<strong id="bp3d-ext-reload-title">Reload required</strong>
			<p>${text}</p>
			<div class="bp3d-x-confirm__actions">
				<button type="button" class="bp3d-x-btn bp3d-x-btn--sm" onClick=${onLater}>Later</button>
				<button type="button" ref=${reloadButton} class="bp3d-x-btn bp3d-x-btn--sm bp3d-x-btn--primary" onClick=${() => location.reload()}>Reload now</button>
			</div>
		</div>
	</div>`;
}

/** The screen body; Help & Demos renders it as its Extensions tab. */
export function ExtensionsScreen() {
	const pro = useIsPro();
	const state = useExt();
	const off = useExtOff();
	const [filter, setFilter] = useState('all');
	const [search, setSearch] = useState('');
	const [busy, setBusy] = useState({});
	const [keys, setKeys] = useState({});
	const [notices, setNotices] = useState([]);
	const [refreshing, setRefreshing] = useState(false);
	const [reloadPrompt, setReloadPrompt] = useState(null);
	const ids = useRef(0);
	const timers = useRef([]);
	useEffect(() => () => timers.current.forEach(clearTimeout), []);
	const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

	const items = (pro ? PRO_CATALOG : FREE_CATALOG).map((e) => itemOf(e, pro, state, off));
	const match = pro ? MATCH : FREE_MATCH;
	const notify = (kind, text, reload = false) => {
		const id = ++ids.current;
		setNotices((list) => [...list.filter((n) => !(reload && n.reload)), { id, kind, text, reload }].slice(-4));
		if (kind === 'success' && !reload) later(() => setNotices((list) => list.filter((n) => n.id !== id)), 5000);
	};
	const setBusyFor = (id, what) => setBusy((b) => {
		const next = { ...b };
		if (what) next[id] = what;
		else delete next[id];
		return next;
	});
	const refetch = () => {
		setRefreshing(true);
		later(() => setRefreshing(false), 700);
	};

	// POST /install: a fresh download only installs; a second call (Activate) activates it.
	const install = (ext) => {
		if (ext.id !== CONFIGURATOR) {
			toast(`${ext.name} is not part of this demo. Try the 3D Product Configurator for WooCommerce.`);
			return;
		}
		const present = ext.pluginPresent;
		setBusyFor(ext.id, present ? 'activate' : 'install');
		later(() => {
			if (present) {
				activateExtension();
				notify('success', `${ext.name} is installed and active.`, true);
			} else {
				installExtension();
				notify('warning', `${ext.name} is installed. Activate it to use it.`);
			}
			setBusyFor(ext.id, '');
			refetch();
		}, present ? 900 : 1400);
	};
	const toggle = (ext) => {
		const enabled = !ext.enabled;
		setBusyFor(ext.id, 'toggle');
		later(() => {
			setExtensionEnabled(enabled);
			setBusyFor(ext.id, '');
			setReloadPrompt(`${ext.name} ${enabled ? 'enabled' : 'disabled'}. Reload the page for this to take effect.`);
		}, 600);
	};
	// Comes with 3D Viewer Pro: the free plugin sells the host plan, not the add-on.
	const buy = () => go('v3d.help.pricing');
	const license = (ext) => {
		setBusyFor(ext.id, 'license-activate');
		later(() => {
			setBusyFor(ext.id, '');
			notify('error', 'That key could not be activated. Check it and try again.');
		}, 800);
	};

	const counts = Object.fromEntries(Object.keys(match).map((k) => [k, items.filter(match[k]).length]));
	const q = search.trim().toLowerCase();
	const list = items.filter((e) => match[filter](e) && (!q || e.name.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q)));
	const installedCount = items.filter((e) => e.installed || (pro && e.pluginPresent)).length;
	const anyBusy = Object.keys(busy).length > 0;

	return html`
		<${ShelfHero}
			variant="extensions"
			eyebrow="Extensions"
			title="Supercharge Your 3D Viewer"
			text="Extend 3D Viewer with powerful add-ons. Each extension manages its own license independently."
			chips=${[['Cuboid', `${items.length} ${items.length === 1 ? 'Extension' : 'Extensions'}`, 128], ['Zap', 'One-Click Install', 122.5], ['CircleCheck', 'Own License Each', 138.67]]}
			stats=${[['Box', installedCount, 'Installed'], ['Power', counts.active, 'Active', true]]}
		/>
		<div class="bp3d-dash-ext bp3d-dash-ext--extensions">
			<div class="bp3d-dash-subnav">
				<div class="bp3d-dash-subnav__tabs">
					<span class="bp3d-dash-subnav__tab bp3d-dash-subnav__tab--on"><${DIcon} name="Puzzle" size=${13.17} /> Extensions</span>
				</div>
				<div class="bp3d-ext__tools">
					<button type="button" class="bp3d-dash-btn bp3d-dash-btn--ghost bp3d-ext__refresh" onClick=${refetch} disabled=${refreshing || anyBusy} aria-busy=${refreshing}>
						${refreshing ? html`<span class="bp3d-x-spinner"></span>` : html`<${DIcon} name="RefreshCw" size=${14} weight=${1.75} />`} Refresh
					</button>
					<${SearchField} placeholder="Search extensions..." label="Search extensions" iconSize=${13.17} weight=${1.65} value=${search} onChange=${setSearch} />
				</div>
			</div>

			<div class="bp3d-x-notices" aria-live="polite">
				${notices.map(
					(n) => html`<div key=${n.id} class=${'bp3d-x-notice bp3d-x-notice--' + n.kind} role=${n.kind === 'error' ? 'alert' : 'status'}>
						<${DIcon} name=${n.kind === 'error' ? 'CircleX' : 'CircleCheck'} size=${16} weight=${1.75} />
						<span>${n.text}</span>
						${n.reload && html`<button type="button" class="bp3d-x-notice__action" onClick=${() => location.reload()}>Reload now</button>`}
						<button type="button" class="bp3d-x-notice__close" aria-label="Dismiss" onClick=${() => setNotices((l) => l.filter((x) => x.id !== n.id))}><${DIcon} name="X" size=${14} weight=${2} /></button>
					</div>`
				)}
			</div>

			<section class="bp3d-dash-shelf">
				<${CountChips} value=${filter} counts=${counts} onChange=${setFilter} label="Filter extensions" />
				<div class="bp3d-dash-shelf__grid">
					${!refreshing && !list.length && html`<p class="bp3d-dash-text bp3d-dash-loading">No extensions match. Try a different filter or keyword.</p>`}
					${list.map(
						(ext) => html`<${ExtensionCard}
							key=${ext.id}
							ext=${ext}
							pro=${pro}
							busy=${busy[ext.id] || ''}
							licenseKey=${keys[ext.id] || ''}
							onKey=${(v) => setKeys((k) => ({ ...k, [ext.id]: v }))}
							onInstall=${() => install(ext)}
							onToggle=${() => toggle(ext)}
							onBuy=${buy}
							onLicense=${() => license(ext)}
						/>`
					)}
				</div>
			</section>

			<${ExtHelp} title="Need help with extensions?" text=${html`Check out our <a href=${PAGES.docs} ...${NEW_TAB}>documentation</a> or contact our support team for assistance.`} cta="View Docs" href=${PAGES.docs} />
		</div>

		${reloadPrompt &&
		html`<${ReloadDialog}
			text=${reloadPrompt}
			onLater=${() => {
				notify('warning', reloadPrompt, true);
				setReloadPrompt(null);
			}}
		/>`}
	`;
}

export default function Extensions() {
	return html`<${WpAdmin} current="v3d-extensions" title="Extensions">
		<${DashLayout} current="extensions" standalone><${ExtensionsScreen} /><//>
	<//>`;
}
