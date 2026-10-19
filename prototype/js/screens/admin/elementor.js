// block: Elementor editor mock (#admin.elementor.<pageId>) with the "3D Product Viewer" widget (specs/block.md).
import { html, useState, useEffect, cx } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { go } from '../../core/router.js';
import { useFeature } from '../../core/features.js';
import { is3DAvailable, viewerSettingsFor } from '../../shared/product-3d.js';
import { Icon } from '../../shared/icons.js';
import { WIDGET_TYPE, BLOCK_TITLE, attrsOf, pagesOf, seedPages, ASPECTS, CONTROL_KEYS, nextBlockId } from '../../shared/block.js';
import { WidgetView } from '../store/block-theme.js';
import { ProductSearch, variationOptions } from './block-controls.js';
import { protoLabel } from '../../shared/slots.js';

const WIDGETS = [
	['Basic', [['Heading', 'T'], ['Image', '▣'], ['Text Editor', '¶'], ['Video', '▶'], ['Button', '⬚'], ['Divider', '—']]],
	['WooCommerce', [['Products', '▦'], ['Add To Cart', '🛒'], [BLOCK_TITLE, 'cube', WIDGET_TYPE]]],
];
const TITLES = { heading: 'Heading', 'text-editor': 'Text Editor', button: 'Button', [WIDGET_TYPE]: BLOCK_TITLE };

export default function ElementorScreen({ params }) {
	const on = useFeature('block');
	if (!on) {
		return html`<div class="wpse-flagoff">
			<p><strong>Turn on the Product viewer block feature</strong> to use the Elementor widget.</p>
			<p>Turn on "Product viewer block" in <a href="#admin.settings.modules">WooCommerce → 3D Models → Settings → Features</a>.</p>
			<p><a href="#admin.models">Back to 3D Models</a></p>
		</div>`;
	}
	return html`<${ElementorEditor} pageId=${params?.[0] || '702'} />`;
}

function ElementorEditor({ pageId }) {
	const state = useStore();
	const page = pagesOf(state)[pageId];
	const [widgets, setWidgets] = useState(() => page?.elementor || []);
	const [selected, setSelected] = useState(null);
	const [tab, setTab] = useState('content');
	const [q, setQ] = useState('');
	const [saving, setSaving] = useState(false);
	const [toast, setToast] = useState('');
	const [panelOpen, setPanelOpen] = useState(() => (typeof matchMedia === 'function' ? !matchMedia('(max-width: 782px)').matches : true));

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(''), 4000);
		return () => clearTimeout(t);
	}, [toast]);

	if (!page || page.builder !== 'elementor') {
		return html`<div class="wpse-flagoff"><p>This page is not built with Elementor.</p><p><a href="#admin.models">Back to 3D Models</a></p></div>`;
	}

	const dirty = JSON.stringify(widgets) !== JSON.stringify(page.elementor || []);
	const sel = widgets.find((w) => w.id === selected) || null;
	const setSettings = (patch) => setWidgets((ws) => ws.map((w) => (w.id === selected ? { ...w, settings: { ...w.settings, ...patch } } : w)));
	const add = () => {
		const w = { id: nextBlockId(widgets.map((x) => ({ id: x.id })), 'e'), type: WIDGET_TYPE, settings: { productId: -1, aspect: '16/9', radius: 0 } };
		setWidgets((ws) => {
			const i = ws.findIndex((x) => x.id === selected);
			const next = ws.slice();
			next.splice(i >= 0 ? i + 1 : ws.length, 0, w);
			return next;
		});
		setSelected(w.id);
		setTab('content');
	};
	const remove = (id) => {
		setWidgets((ws) => ws.filter((w) => w.id !== id));
		if (selected === id) setSelected(null);
	};
	const update = () => {
		setSaving(true);
		setTimeout(() => {
			store.patch('wpPages', (old) => ({ ...(old || seedPages()), [page.id]: { ...pagesOf(store.get())[page.id], elementor: widgets } }));
			setSaving(false);
			setToast('Your changes have been saved.');
		}, 500);
	};

	const needle = q.trim().toLowerCase();
	const cats = WIDGETS.map(([c, items]) => [c, items.filter(([label, , type]) => !needle || label.toLowerCase().includes(needle) || (type === WIDGET_TYPE && ['3d', 'model', 'viewer', 'product', 'ar'].some((k) => k.startsWith(needle))))]).filter(([, i]) => i.length);

	return html`<div class=${cx('elm', panelOpen && 'has-panel')}>
		<header class="elm-top">
			<button type="button" class="elm-top__btn" aria-label="Elements" title="Elements" aria-pressed=${panelOpen && !sel} onClick=${() => (setSelected(null), setPanelOpen(!panelOpen || !!sel))}>
				<span aria-hidden="true">＋</span><span class="elm-hide-sm">Elements</span>
			</button>
			<span class="elm-top__title">${page.title}</span>
			<span class="elm-top__end">
				<button type="button" class="elm-top__btn" onClick=${() => go('store.page.' + page.slug)}>View page</button>
				<button type="button" class="elm-publish" disabled=${!dirty || saving} onClick=${update}>${saving ? 'Saving…' : 'Update'}</button>
			</span>
		</header>
		<div class="elm-body">
			${panelOpen &&
			html`<aside class="elm-panel" aria-label="Elementor panel">
				${sel
					? html`<div class="elm-panel__head">
								<button type="button" class="elm-back" aria-label="Back to elements" onClick=${() => setSelected(null)}>‹</button>
								<span>Edit ${TITLES[sel.type] || 'widget'}</span>
							</div>
							${sel.type === WIDGET_TYPE
								? html`<${WidgetControls} widget=${sel} tab=${tab} setTab=${setTab} set=${setSettings} />`
								: html`<p class="elm-note">This widget's settings are not part of the ${protoLabel().toLowerCase()}.</p>`}`
					: html`<div class="elm-panel__head"><span>Elements</span></div>
							<div class="elm-search"><input type="search" placeholder="Search Widget..." aria-label="Search Widget" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} /></div>
							${cats.map(
								([c, items]) => html`<div key=${c} class="elm-cat">
									<h3 class="elm-cat__title">${c}</h3>
									<div class="elm-grid">
										${items.map(([label, glyph, type]) =>
											type
												? html`<button key=${label} type="button" class="elm-tile is-ours" onClick=${add}><span class="elm-tile__icon"><${Icon} name="php-box" size=${26} /></span><span>${label}</span></button>`
												: html`<button key=${label} type="button" class="elm-tile is-inert" aria-disabled="true" title=${`Not part of the ${protoLabel().toLowerCase()}`}><span class="elm-tile__icon" aria-hidden="true">${glyph}</span><span>${label}</span></button>`
										)}
									</div>
								</div>`
							)}`}
			</aside>`}
			<main class="elm-canvas" onClick=${() => setSelected(null)}>
				<div class="elm-page">
					<h1 class="elm-page__title">${page.title}</h1>
					<div class="elm-section">
						${widgets.map(
							(w) => html`<div key=${w.id} class=${cx('elm-widget', selected === w.id && 'is-selected')} onClick=${(e) => (e.stopPropagation(), setSelected(w.id), setTab('content'), setPanelOpen(true))}>
								<div class="elm-widget__handle">
									<span>${TITLES[w.type] || w.type}</span>
									${w.type === WIDGET_TYPE && html`<button type="button" aria-label=${'Delete ' + (TITLES[w.type] || 'widget')} title="Delete" onClick=${(e) => (e.stopPropagation(), remove(w.id))}>✕</button>`}
								</div>
								<${WidgetView}
									widget=${w}
									editor=${true}
									placeholder=${html`<div class="wpse-ph elm-ph"><div class="wpse-ph__label"><${Icon} name="php-box" size=${18} /> ${BLOCK_TITLE}</div><p>${Number(w.settings?.productId) > 0 ? 'This product has no 3D model.' : 'Choose a product in the panel.'}</p></div>`}
								/>
								${selected !== w.id && w.type === WIDGET_TYPE && html`<div class="wpse-viewer__shield" aria-hidden="true"></div>`}
							</div>`
						)}
						<button type="button" class="elm-add" onClick=${(e) => (e.stopPropagation(), setSelected(null), setPanelOpen(true))}>＋ Drag widget here</button>
					</div>
				</div>
			</main>
		</div>
		${toast && html`<div class="wpse-snack elm-toast" role="status">${toast}</div>`}
	</div>`;
}

function Section({ title, children, open: initial = true }) {
	const [open, setOpen] = useState(initial);
	return html`<div class=${cx('elm-section-ctl', open && 'is-open')}>
		<button type="button" class="elm-section-ctl__title" aria-expanded=${open} onClick=${() => setOpen(!open)}><span aria-hidden="true">${open ? '▾' : '▸'}</span> ${title}</button>
		${open && html`<div class="elm-section-ctl__body">${children}</div>`}
	</div>`;
}

function Row({ label, children, block = false }) {
	return html`<div class=${cx('elm-ctl', block && 'is-block')}><span class="elm-ctl__label">${label}</span><div class="elm-ctl__input">${children}</div></div>`;
}

function Switcher({ checked, onChange, label }) {
	return html`<button type="button" role="switch" aria-checked=${!!checked} aria-label=${label} class=${cx('elm-switch', checked && 'is-on')} onClick=${() => onChange(!checked)}>
		<span>${checked ? 'Yes' : 'No'}</span>
	</button>`;
}

function WidgetControls({ widget, tab, setTab, set }) {
	const state = useStore();
	const s = attrsOf({ attrs: widget.settings });
	const current = !Number(s.productId);
	const pid = Number(s.productId) > 0 ? Number(s.productId) : 0;
	const vs = pid ? viewerSettingsFor(state, pid) : null;
	const vOpts = current ? [] : variationOptions(state, pid);
	const radius = Number(widget.settings?.radius) || 0;
	return html`
		<div class="elm-tabs" role="tablist">
			${[['content', 'Content'], ['style', 'Style'], ['advanced', 'Advanced']].map(([k, l]) => html`<button key=${k} type="button" role="tab" aria-selected=${tab === k} class=${cx('elm-tab', tab === k && 'is-on')} onClick=${() => setTab(k)}>${l}</button>`)}
		</div>
		<div class="elm-controls">
			${tab === 'content' &&
			html`<${Section} title="Product">
					<${Row} label="Source">
						<select value=${current ? 'current' : 'pick'} onChange=${(e) => set({ productId: e.currentTarget.value === 'current' ? 0 : -1, variationId: 0 })}>
							<option value="current">Current product</option>
							<option value="pick">Choose a product</option>
						</select>
					</${Row}>
					${current
						? html`<p class="elm-note">Current product works in Single Product templates (Theme Builder). On this page, choose a product.</p>`
						: html`<${ProductSearch} cls="elm" value=${pid} onChange=${(id) => set({ productId: id, variationId: 0 })} />`}
					${vOpts.length > 0 &&
					html`<${Row} label="Variation">
						<select value=${String(s.variationId || 0)} onChange=${(e) => set({ variationId: Number(e.currentTarget.value) })}>
							${vOpts.map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}
						</select>
					</${Row}>`}
				</${Section}>
				<${Section} title="Viewer">
					<${Row} label="Show customizer">
						<select value=${current ? s.customizer : 'hide'} disabled=${!current} onChange=${(e) => set({ customizer: e.currentTarget.value })}>
							<option value="product">Use the product setting</option>
							<option value="show">Show</option>
							<option value="hide">Hide</option>
						</select>
					</${Row}>
					${!current && html`<p class="elm-note">The customizer needs the product’s add-to-cart form, so it is available for the current product only.</p>`}
					<${Row} label="Use global toolbar">
						<${Switcher} label="Use global toolbar" checked=${!s.controls} onChange=${(on) => set({ controls: on ? null : { ...(vs?.controls || { zoom: false, reset: false, autorotate: false, download: true, gallery: true }) } })} />
					</${Row}>
					${s.controls && CONTROL_KEYS.map(([k, label]) => html`<${Row} key=${k} label=${label}><${Switcher} label=${label} checked=${!!s.controls[k]} onChange=${(v) => set({ controls: { ...s.controls, [k]: v } })} /></${Row}>`)}
				</${Section}>`}
			${tab === 'style' &&
			html`<${Section} title="Size">
					<${Row} label="Aspect ratio">
						<select value=${s.aspect} onChange=${(e) => set({ aspect: e.currentTarget.value })}>${ASPECTS.map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}</select>
					</${Row}>
					${s.aspect === 'fixed' &&
					html`<${Row} label="Height (px)" block=${true}>
						<div class="elm-slider"><input type="range" min="240" max="1000" step="10" value=${s.height} aria-label="Height" onInput=${(e) => set({ height: Number(e.currentTarget.value) })} /><span>${s.height}</span></div>
					</${Row}>`}
				</${Section}>
				<${Section} title="Box">
					<${Row} label="Background">
						<select value=${s.background} onChange=${(e) => set({ background: e.currentTarget.value })}>
							<option value="product">Product setting</option>
							<option value="transparent">Transparent</option>
							<option value="color">Color</option>
						</select>
					</${Row}>
					${s.background === 'color' && html`<${Row} label="Color"><input type="color" aria-label="Background color" value=${s.backgroundColor} onInput=${(e) => set({ backgroundColor: e.currentTarget.value })} /></${Row}>`}
					<${Row} label="Border radius (px)" block=${true}>
						<div class="elm-slider"><input type="range" min="0" max="40" value=${radius} aria-label="Border radius" onInput=${(e) => set({ radius: Number(e.currentTarget.value) })} /><span>${radius}</span></div>
					</${Row}>
				</${Section}>`}
			${tab === 'advanced' &&
			html`<${Section} title="Layout">
				<${Row} label="CSS Classes" block=${true}>
					<input type="text" value=${s.className} aria-label="CSS Classes" onChange=${(e) => set({ className: e.currentTarget.value.trim() })} />
				</${Row}>
			</${Section}>`}
		</div>
		${pid > 0 && !is3DAvailable(state, pid) && html`<p class="elm-note elm-note--warn">${state.products[pid]?.name} has no 3D model, so the widget shows nothing on the page.</p>`}
	`;
}
