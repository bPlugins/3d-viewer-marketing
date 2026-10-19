// Theme editor (Online Store › Customize) with our theme app extension: app blocks on the product
// template and the "3D core" app embed. Changes write to the demo store and preview live.
import { html, useState, useRef, useEffect, cx } from '../../js/core/ui.js';
import { store, useStore } from '../core/store.js';
import { has3D } from '../core/commerce.js';
import { Icon } from '../ui/icons.js';
import { Switch, Select, Checkbox, ChoiceList, toast } from '../ui/polaris.js';
import { StoreTheme } from '../store/theme.js';
import { ProductView } from '../store/product.js';

const APP_BLOCKS = [
	{ id: 'configurator', name: '3D Configurator', icon: 'cube', text: 'Viewer, customizer and price box for the product.' },
	{ id: 'button', name: '3D button', icon: 'ar', text: 'A "View in 3D" button that opens the viewer in a dialog.' },
	{ id: 'viewer', name: 'Any product viewer', icon: 'grid', text: 'Shows the 3D model of a product you pick, on any page.' },
];
const THEME_BLOCKS = [
	{ id: 't-title', name: 'Title', icon: 'text' },
	{ id: 't-price', name: 'Price', icon: 'tag' },
	{ id: 't-variant', name: 'Variant picker', icon: 'layers' },
	{ id: 't-buy', name: 'Buy buttons', icon: 'cart' },
	{ id: 't-desc', name: 'Description', icon: 'text' },
];
const TOOLBAR = [
	['zoom', 'Zoom buttons'],
	['reset', 'Reset view'],
	['autorotate', 'Auto-rotate'],
	['fullscreen', 'Full screen'],
	['ar', 'View in your space (AR)'],
];

function SectionRow({ icon, label, selected, onClick, depth = 0, app, children, onRemove }) {
	return html`<div class=${cx('te-row', selected && 'is-on', depth && 'te-row--block', app && 'te-row--app')}>
		<button type="button" class="te-row__btn" onClick=${onClick} aria-pressed=${String(!!selected)}>
			<${Icon} name=${icon} size=${16} /><span>${label}</span>${app ? html`<span class="te-row__app">App</span>` : null}
		</button>
		${onRemove ? html`<button type="button" class="te-row__x" onClick=${onRemove} title=${`Remove ${label}`} aria-label=${`Remove ${label}`}><${Icon} name="trash" size=${15} /></button>` : null}
		${children}
	</div>`;
}

function AddBlock({ placed, onAdd }) {
	const [open, setOpen] = useState(false);
	return html`<div class="te-add">
		<button type="button" class="te-add__btn" aria-expanded=${String(open)} onClick=${() => setOpen(!open)}><${Icon} name="plus" size=${16} /> Add block</button>
		${open
			? html`<div class="te-pop" role="menu">
					<p class="te-pop__label">Theme</p>
					<button type="button" class="te-pop__item" disabled><${Icon} name="text" size=${16} /><span>Text</span></button>
					<button type="button" class="te-pop__item" disabled><${Icon} name="chevronDown" size=${16} /><span>Collapsible row</span></button>
					<p class="te-pop__label">Apps</p>
					${APP_BLOCKS.map((b) => html`<button type="button" role="menuitem" class="te-pop__item" disabled=${placed.includes(b.id)} onClick=${() => { onAdd(b.id); setOpen(false); }}>
						<${Icon} name=${b.icon} size=${16} /><span><strong>${b.name}</strong><small>3D Configurator${placed.includes(b.id) ? ' · added' : ''}</small></span>
					</button>`)}
				</div>`
			: null}
	</div>`;
}

function ConfiguratorSettings({ s, onChange, onRemove }) {
	const st = s.app.settings;
	const set = (k, v) => onChange(['app', 'settings', k], v);
	return html`<div class="te-form">
		<${Select} label="Media position" value=${st.placement} onChange=${(v) => set('placement', v)} options=${[
			{ label: 'Replace the product image', value: 'replace_image' },
			{ label: 'First in the gallery', value: 'gallery_first' },
			{ label: 'Button that opens a dialog', value: 'modal' },
			{ label: 'Collapsible row only', value: 'block_only' },
		]} helpText="Replacing the image needs the 3D core embed for some themes." />
		<${Select} label="Aspect ratio" value=${st.aspect || '1 / 1'} onChange=${(v) => set('aspect', v)} options=${[
			{ label: 'Square (1:1)', value: '1 / 1' },
			{ label: 'Portrait (4:5)', value: '4 / 5' },
			{ label: 'Landscape (4:3)', value: '4 / 3' },
		]} />
		<${ChoiceList} title="Load 3D" selected=${st.loading_trigger} onChange=${(v) => set('loading_trigger', v)} choices=${[
			{ label: 'When the shopper clicks', value: 'click', helpText: 'Fastest page. Shows the poster first.' },
			{ label: 'When it scrolls into view', value: 'scroll' },
			{ label: 'Right away', value: 'eager' },
		]} />
		<fieldset class="te-fieldset">
			<legend class="p-label">Toolbar</legend>
			${TOOLBAR.map(([k, label]) => html`<${Checkbox} label=${label} checked=${st.toolbar?.[k] !== false} onChange=${(v) => set('toolbar', { ...st.toolbar, [k]: v })} />`)}
		</fieldset>
		<${Switch} label="Customizer" checked=${!!st.customizer} onChange=${(v) => set('customizer', v)} helpText="Shows the Customize button. Products can override this in the app." />
		${st.customizer
			? html`<${Select} label="Customizer layout" value=${st.customizer_layout} onChange=${(v) => set('customizer_layout', v)} options=${[
					{ label: 'Large dialog', value: 'modal' },
					{ label: 'Side drawer', value: 'drawer' },
				]} />`
			: null}
		<button type="button" class="te-remove" onClick=${onRemove}><${Icon} name="trash" size=${16} /> Remove block</button>
	</div>`;
}

export default function ThemeEditor() {
	const s = useStore();
	const [tab, setTab] = useState('sections');
	const [sel, setSel] = useState('configurator');
	const [device, setDevice] = useState(() => (window.innerWidth < 760 ? 'mobile' : 'desktop'));
	const [dirty, setDirty] = useState(false);
	const products = Object.values(s.products).filter((p) => p.status === 'active' && has3D(s, p.id));
	const [handle, setHandle] = useState('lounge-chair');
	const placed = s.app.blocks?.product || [];
	const paneRef = useRef(null);
	const frameRef = useRef(null);
	const [paneW, setPaneW] = useState(900);
	const [frameH, setFrameH] = useState(800);

	useEffect(() => {
		const ro = new ResizeObserver(() => {
			if (paneRef.current) setPaneW(paneRef.current.clientWidth);
			if (frameRef.current) setFrameH(frameRef.current.offsetHeight);
		});
		paneRef.current && ro.observe(paneRef.current);
		frameRef.current && ro.observe(frameRef.current);
		return () => ro.disconnect();
	}, []);

	const change = (path, value) => {
		store.patch(path, value);
		setDirty(true);
	};
	const addBlock = (id) => {
		change(['app', 'blocks', 'product'], [...placed.filter((x) => x !== id), id]);
		if (id === 'configurator') store.patch('app.onboarding.block', true);
		setSel(id);
		setTab('sections');
	};
	const removeBlock = (id) => {
		change(['app', 'blocks', 'product'], placed.filter((x) => x !== id));
		if (sel === id) setSel(null);
	};
	const setEmbed = (on) => {
		change('app.embedEnabled', on);
		if (on) store.patch('app.onboarding.embed', true);
	};
	const save = () => {
		setDirty(false);
		toast('Saved. Changes are live on your store');
	};

	const base = device === 'mobile' ? 390 : 1280;
	const scale = Math.min(1, Math.max(0.2, (paneW - 32) / base));
	const selApp = APP_BLOCKS.find((b) => b.id === sel && placed.includes(b.id));
	const selTheme = THEME_BLOCKS.find((b) => b.id === sel) || (sel === 'header' && { name: 'Header', icon: 'menu' }) || (sel === 'announce' && { name: 'Announcement bar', icon: 'menu' }) || (sel === 'related' && { name: 'Related products', icon: 'grid' }) || (sel === 'footer' && { name: 'Footer', icon: 'menu' }) || (sel === 'section' && { name: 'Product information', icon: 'products' });

	return html`<div class="te">
		<header class="te-top">
			<a class="te-top__exit" href="#admin.home" aria-label="Exit theme editor"><${Icon} name="arrowLeft" size=${18} /></a>
			<div class="te-top__theme"><strong>${s.shop.theme}</strong><span class="te-live">Live</span></div>
			<div class="te-top__tpl">
				<${Select} label="Template" labelHidden value="product" options=${[{ label: 'Products · Default product', value: 'product' }]} onChange=${() => {}} />
			</div>
			<div class="te-top__right">
				<div class="te-seg" role="group" aria-label="Preview size">
					<button type="button" class=${cx(device === 'desktop' && 'is-on')} aria-pressed=${String(device === 'desktop')} onClick=${() => setDevice('desktop')} title="Desktop"><${Icon} name="monitor" size=${17} /></button>
					<button type="button" class=${cx(device === 'mobile' && 'is-on')} aria-pressed=${String(device === 'mobile')} onClick=${() => setDevice('mobile')} title="Mobile"><${Icon} name="phone" size=${17} /></button>
				</div>
				<button type="button" class="te-save" onClick=${save} disabled=${!dirty}>Save</button>
			</div>
		</header>

		<div class="te-body">
			<aside class="te-side" aria-label="Theme sections">
				<div class="te-tabs" role="tablist">
					<button type="button" role="tab" aria-selected=${String(tab === 'sections')} class=${cx(tab === 'sections' && 'is-on')} onClick=${() => setTab('sections')}><${Icon} name="layers" size=${16} /> Sections</button>
					<button type="button" role="tab" aria-selected=${String(tab === 'embeds')} class=${cx(tab === 'embeds' && 'is-on')} onClick=${() => setTab('embeds')}><${Icon} name="puzzle" size=${16} /> App embeds${s.app.embedEnabled ? html`<span class="te-dot" aria-label="on"></span>` : null}</button>
				</div>

				${tab === 'sections'
					? html`<div class="te-tree">
							<p class="te-group">Header</p>
							<${SectionRow} icon="menu" label="Announcement bar" selected=${sel === 'announce'} onClick=${() => setSel('announce')} />
							<${SectionRow} icon="menu" label="Header" selected=${sel === 'header'} onClick=${() => setSel('header')} />
							<p class="te-group">Template</p>
							<${SectionRow} icon="products" label="Product information" selected=${sel === 'section'} onClick=${() => setSel('section')} />
							${THEME_BLOCKS.map((b) => html`<${SectionRow} depth=${1} icon=${b.icon} label=${b.name} selected=${sel === b.id} onClick=${() => setSel(b.id)} />`)}
							${APP_BLOCKS.filter((b) => placed.includes(b.id)).map((b) => html`<${SectionRow} depth=${1} app icon=${b.icon} label=${b.name} selected=${sel === b.id} onClick=${() => setSel(b.id)} onRemove=${() => removeBlock(b.id)} />`)}
							<${AddBlock} placed=${placed} onAdd=${addBlock} />
							<${SectionRow} icon="grid" label="Related products" selected=${sel === 'related'} onClick=${() => setSel('related')} />
							<p class="te-group">Footer</p>
							<${SectionRow} icon="menu" label="Footer" selected=${sel === 'footer'} onClick=${() => setSel('footer')} />
						</div>`
					: html`<div class="te-embeds">
							<div class="te-embed">
								<div class="te-embed__head">
									<span class="te-embed__icon"><${Icon} name="cube" size=${18} /></span>
									<div><strong>3D core</strong><small>3D Configurator</small></div>
								</div>
								<${Switch} label="Enabled" checked=${!!s.app.embedEnabled} onChange=${setEmbed} helpText="Loads the viewer, swaps the product image, keeps variants in sync and adds the 3D badge on product cards." />
								${s.app.embedEnabled
									? html`<${Checkbox} label="3D badge and quick view on product cards" checked=${!!s.app.settings.shop_badge} onChange=${(v) => change(['app', 'settings', 'shop_badge'], v)} />`
									: null}
							</div>
						</div>`}

				<div class="te-info"><${Icon} name="info" size=${16} /><p>App blocks and embeds come from the app's theme app extension. No theme code is edited.</p></div>
			</aside>

			<section class="te-preview" aria-label="Preview">
				<div class="te-preview__bar">
					<label class="te-preview__label" for="te-prod">Preview</label>
					<div class="p-select te-preview__select">
						<select id="te-prod" value=${handle} onChange=${(e) => setHandle(e.target.value)}>${products.map((p) => html`<option value=${p.handle} selected=${p.handle === handle}>${p.title}</option>`)}</select>
						<${Icon} name="chevronDown" size=${16} />
					</div>
					<span class="te-preview__scale">${Math.round(scale * 100)}%</span>
				</div>
				<div class="te-pane" ref=${paneRef}>
					<div class=${cx('te-sizer', device === 'mobile' && 'is-mobile')} style=${{ width: base * scale + 'px', height: frameH * scale + 'px' }}>
						<div class="te-frame" ref=${frameRef} style=${{ width: base + 'px', transform: `scale(${scale})` }}>
							<${StoreTheme} embedded><${ProductView} key=${handle} handle=${handle} embedded /><//>
						</div>
					</div>
				</div>
			</section>

			<aside class="te-settings" aria-label="Block settings">
				${selApp
					? html`<div class="te-settings__head"><span class="te-embed__icon"><${Icon} name=${selApp.icon} size=${16} /></span><div><strong>${selApp.name}</strong><small>3D Configurator app block</small></div></div>
							<p class="te-settings__text">${selApp.text}</p>
							${selApp.id === 'configurator'
								? html`<${ConfiguratorSettings} s=${s} onChange=${change} onRemove=${() => removeBlock('configurator')} />`
								: html`<div class="te-form">
										${selApp.id === 'viewer' ? html`<${Select} label="Product" value="1002" options=${[{ label: 'Arc Table Lamp', value: '1002' }]} onChange=${() => {}} helpText="Shown as “Pairs well with” on other products." />` : null}
										<button type="button" class="te-remove" onClick=${() => removeBlock(selApp.id)}><${Icon} name="trash" size=${16} /> Remove block</button>
									</div>`}`
					: selTheme
						? html`<div class="te-settings__head"><span class="te-embed__icon te-embed__icon--theme"><${Icon} name=${selTheme.icon} size=${16} /></span><div><strong>${selTheme.name}</strong><small>Theme ${['section', 'header', 'footer', 'announce', 'related'].includes(sel) ? 'section' : 'block'}</small></div></div>
								<p class="te-settings__text">This part belongs to the theme. Its settings aren't part of the 3D Configurator prototype.</p>
								${sel === 'section' ? html`<p class="te-settings__text">Add the 3D Configurator with <strong>Add block › Apps</strong>.</p>` : null}`
						: html`<div class="te-settings__empty"><${Icon} name="layers" size=${28} /><p>Select a section or block to edit its settings.</p>${!placed.includes('configurator') ? html`<button type="button" class="te-add__btn" onClick=${() => addBlock('configurator')}><${Icon} name="plus" size=${16} /> Add the 3D Configurator block</button>` : null}</div>`}
			</aside>
		</div>
	</div>`;
}
