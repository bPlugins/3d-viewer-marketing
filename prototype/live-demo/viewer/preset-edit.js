// Presets → Add New / Edit (Pro): the block editor for one bp3d-preset post. Its template is a single
// locked "Model Viewer Preset" block (b3dviewer/preset) that draws its Settings/Style tabs in the canvas,
// copied from 3d-viewer-premium/src/blocks/preset (Edit, Options, O3DVOptions, Style). Also exports the
// small @wordpress/components look-alikes the Visual Editor uses.
import { html, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { store, useStore } from '../../js/core/store.js';
import { go } from '../../js/core/router.js';
import { WpAdmin } from '../../js/screens/admin/chrome.js';
import { nowStr, longDate } from '../../js/screens/admin/products.js';
import { toast } from '../core/bus.js';
import { queuePresetNotice } from './presets.js';

const LOGO = new URL('../img/brand/3d-viewer-logo.svg', import.meta.url).href;

// b3dviewer/preset block.json → attributes.preset.default
export const PRESET_DEFAULT = {
	attributes: { tonMapping: 'neutral' },
	O3DVSettings: { isFullscreen: true, isPagination: false, isNavigation: false, camera: null, mouseControl: true, showEdge: false, zoom: true },
	lazyLoad: true,
	preload: 'auto',
	autoplay: true,
	shadow: true,
	autoRotate: false,
	rotationPerSecond: 20,
	zoom: true,
	isPagination: false,
	isNavigation: true,
	mouseControl: true,
	fullscreen: true,
	cameraBtn: true,
	resetViewBtn: false,
	variant: false,
	loadingPercentage: false,
	progressBar: true,
	environmentImage: '',
	zoomLevel: 1,
	toneMapping: 'neutral',
	styles: {
		width: { desktop: '100%', tablet: '100%', mobile: '100%' },
		height: { desktop: '400px', tablet: '300px', mobile: '300px' },
		bgColor: 'transparent',
		progressBarColor: '#666',
		thumbSize: '90px',
	},
	placement: 'block',
	lockXAxisRotation: false,
	lockYAxisRotation: false,
};

/** mergePreset.ts: merge only the changed keys, optionally inside one nested group. */
const mergePreset = (current, changes, group) => {
	const base = current && typeof current === 'object' ? current : {};
	if (!group) return { ...base, ...changes };
	const nested = base[group] && typeof base[group] === 'object' ? base[group] : {};
	return { ...base, [group]: { ...nested, ...changes } };
};

/** normaliseLoading.ts */
const normaliseLoading = (value) => {
	if (typeof value !== 'string') return 'auto';
	const key = value.trim().toLowerCase();
	if (key === 'eager') return 'eager';
	if (key === 'lazy' || key === 'lazyload' || key === 'true' || key === 'yes') return 'lazy';
	return 'auto';
};

// ── @wordpress/components look-alikes (real class names, styled in css/v3d-pro.css) ──
let uid = 0;
const useId = (prefix) => useRef(`${prefix}-${++uid}`).current;

export const Chevron = ({ up }) => html`<svg class="components-panel__arrow" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d=${up ? 'M6.5 12.4L12 8l5.5 4.4-.9 1.2L12 10l-4.5 3.6-1-1.2z' : 'M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z'} /></svg>`;

export function PanelBody({ title, initialOpen = true, class: cls, children, opened, onToggle }) {
	const [own, setOwn] = useState(initialOpen);
	const open = opened ?? own;
	const toggle = () => (onToggle ? onToggle(!open) : setOwn(!open));
	return html`<div class=${cx('components-panel__body', open && 'is-opened', cls)}>
		<h2 class="components-panel__body-title">
			<button type="button" class="components-button components-panel__body-toggle" aria-expanded=${open} onClick=${toggle}>
				<span class="components-panel__body-label">${title}</span>
				<${Chevron} up=${open} />
			</button>
		</h2>
		${open && children}
	</div>`;
}

export function ToggleControl({ label, checked, onChange, disabled, help, class: cls }) {
	const id = useId('inspector-toggle-control');
	return html`<div class=${cx('components-base-control', 'components-toggle-control', cls)}>
		<div class="components-base-control__field">
			<span class=${cx('components-form-toggle', checked && 'is-checked', disabled && 'is-disabled')}>
				<input class="components-form-toggle__input" id=${id} type="checkbox" checked=${!!checked} disabled=${disabled} onChange=${(e) => onChange(e.currentTarget.checked)} />
				<span class="components-form-toggle__track"></span>
				<span class="components-form-toggle__thumb"></span>
			</span>
			<label for=${id} class="components-toggle-control__label">${label}</label>
		</div>
		${help && html`<p class="components-base-control__help">${help}</p>`}
	</div>`;
}

export function SelectControl({ label, value, options, onChange, side = false, class: cls }) {
	const id = useId('inspector-select-control');
	return html`<div class=${cx('components-base-control', 'components-select-control', side && 'is-side', cls)}>
		<label class="components-base-control__label" for=${id}>${label}</label>
		<select id=${id} class="components-select-control__input" value=${value} onChange=${(e) => onChange(e.currentTarget.value)}>
			${options.map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}
		</select>
	</div>`;
}

export function TextControl({ label, value, onChange, placeholder, class: cls, type = 'text' }) {
	const id = useId('inspector-text-control');
	return html`<div class=${cx('components-base-control', cls)}>
		${label && html`<label class="components-base-control__label" for=${id}>${label}</label>`}
		<input id=${id} class="components-text-control__input" type=${type} value=${value ?? ''} placeholder=${placeholder} onInput=${(e) => onChange(e.currentTarget.value)} />
	</div>`;
}

export function RangeControl({ label, value, min, max, step, onChange, class: cls }) {
	const id = useId('inspector-range-control');
	return html`<div class=${cx('components-base-control', 'components-range-control', cls)}>
		<label class="components-base-control__label" for=${id}>${label}</label>
		<div class="components-range-control__wrapper">
			<input id=${id} type="range" min=${min} max=${max} step=${step} value=${value} onInput=${(e) => onChange(Number(e.currentTarget.value))} />
			<input type="number" class="components-range-control__number" aria-label=${label} min=${min} max=${max} step=${step} value=${value} onInput=${(e) => e.currentTarget.value !== '' && onChange(Number(e.currentTarget.value))} />
		</div>
	</div>`;
}

const isHex = (c) => /^#([0-9a-f]{3}){1,2}$/i.test(c || '');
export function ColorControl({ label, value, defaultColor, onChange, class: cls }) {
	const transparent = !value || value === 'transparent';
	return html`<div class=${cx('components-base-control', 'bPlColor', cls)}>
		<div class="bPlColor__row">
			<span class="components-base-control__label">${label}</span>
			<span class="bPlColor__acts">
				<label class=${cx('bPlColor__swatch', transparent && 'is-transparent')} style=${transparent ? undefined : { background: value }} title=${value || 'transparent'}>
					<input type="color" value=${isHex(value) ? value : '#ffffff'} onInput=${(e) => onChange(e.currentTarget.value)} aria-label=${label} />
				</label>
				${defaultColor !== undefined && value !== defaultColor && html`<button type="button" class="components-button is-small bPlColor__reset" onClick=${() => onChange(defaultColor)}>Reset</button>`}
			</span>
		</div>
	</div>`;
}

export function TabPanel({ tabs, class: cls, children, initial }) {
	const [active, setActive] = useState(initial || tabs[0][0]);
	return html`<div class=${cx('components-tab-panel', cls)}>
		<div class="components-tab-panel__tabs" role="tablist">
			${tabs.map(([name, title]) => html`<button key=${name} type="button" role="tab" aria-selected=${active === name} class=${cx('components-button', 'components-tab-panel__tabs-item', name, active === name && 'active activeTab is-active')} onClick=${() => setActive(name)}>${title}</button>`)}
		</div>
		<div class="components-tab-panel__tab-content" role="tabpanel">${children(active)}</div>
	</div>`;
}

const Icon = ({ d, size = 24 }) => html`<svg width=${size} height=${size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d=${d} /></svg>`;
const I = {
	back: 'M14.6 7l-1.2-1L8 12l5.4 6 1.2-1-4.6-5z',
	plus: 'M11 12.5V17.5H12.5V12.5H17.5V11H12.5V6H11V11H6V12.5H11Z',
	undo: 'M18.3 11.7c-.6-.6-1.4-.9-2.3-.9H6.7l2.9-3.3-1.1-1-4.5 5L8.5 16l1-1-2.7-2.7H16c.5 0 .9.2 1.3.5 1 1 1 3.4 1 4.5v.3h1.5v-.2c0-1.5 0-4.3-1.5-5.7z',
	redo: 'M15.6 6.5l-1.1 1 2.9 3.3H8c-.9 0-1.7.3-2.3.9-1.4 1.5-1.4 4.2-1.4 5.6v.2h1.5v-.3c0-1.1 0-3.5 1-4.5.3-.3.7-.5 1.3-.5h9.2L14.5 15l1.1 1.1 4.6-4.6-4.6-5z',
	list: 'M3 6h11v1.5H3V6Zm3.5 5.5h11V13h-11v-1.5ZM21 17H10v1.5h11V17Z',
	desktop: 'M20.5 16h-.7V8c0-1.1-.9-2-2-2H6.2c-1.1 0-2 .9-2 2v8h-.7c-.8 0-1.5.7-1.5 1.5h20c0-.8-.7-1.5-1.5-1.5zM5.7 8c0-.3.2-.5.5-.5h11.6c.3 0 .5.2.5.5v7.6H5.7V8z',
	sidebar: 'M18 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-4 14.5H6c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h8v13zm4.5-.5c0 .3-.2.5-.5.5h-2.5v-13H18c.3 0 .5.2.5.5v12z',
	more: 'M13 19h-2v-2h2v2zm0-6h-2v-2h2v2zm0-6h-2V5h2v2z',
	close: 'M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.5 6.7 1 1 6.5-6.6 6.5 6.6 1-1z',
	page: 'M15.5 7.5h-7V9h7V7.5Zm-7 3.5h7v1.5h-7V11Zm7 3.5h-7V16h7v-1.5ZM17 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm.5 14a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v12Z',
	status: 'M12 4.75a7.25 7.25 0 100 14.5 7.25 7.25 0 000-14.5zM3.25 12a8.75 8.75 0 1117.5 0 8.75 8.75 0 01-17.5 0zM12 8.75a3.25 3.25 0 100 6.5 3.25 3.25 0 000-6.5z',
};

// ── Preset block (Edit.tsx → Options / O3DVOptions / Style) ──
function Options({ preset, setPreset }) {
	const p = preset;
	return html`
		<${PanelBody} title="Options (Lite Viewer)" class="bPlPanelBody">
			<${ToggleControl} label="Fullscreen" checked=${p.fullscreen} onChange=${(fullscreen) => setPreset({ fullscreen })} />
			<${ToggleControl} class="mt10" label="Camera/Capture Button" checked=${p.cameraBtn} onChange=${(cameraBtn) => setPreset({ cameraBtn })} />
			<${ToggleControl} class="mt10" label="Show Reset View Button" checked=${p.resetViewBtn} onChange=${(resetViewBtn) => setPreset({ resetViewBtn })} />
			<${ToggleControl} class="mt10" label="Zoom In/Out Button" checked=${p.zoomInOutBtn} onChange=${(zoomInOutBtn) => setPreset({ zoomInOutBtn })} />
			<${ToggleControl} class="mt10" label="Mouse Control" checked=${p.mouseControl} onChange=${(mouseControl) => setPreset({ mouseControl })} />
			<${ToggleControl} class="mt10" label="Show Loading Percentage" checked=${p.loadingPercentage} onChange=${(loadingPercentage) => setPreset({ loadingPercentage })} />
			<${ToggleControl} class="mt10" label="Show Progressbar" checked=${p.progressBar} onChange=${(progressBar) => setPreset({ progressBar })} />
			<${ToggleControl} class="mt10" label="Enable Shadow" checked=${p.shadow} onChange=${(shadow) => setPreset({ shadow })} />
			<${ToggleControl} class="mt10" label="Autoplay ( if animated )" checked=${p.autoplay} onChange=${(autoplay) => setPreset({ autoplay })} />
			<${ToggleControl} class="mt10" label="Enable Variant Selector" checked=${p.variant} onChange=${(variant) => setPreset({ variant })} />
			<${ToggleControl} class="mt10" label="Enable Animation Selector" checked=${p.animation} onChange=${(animation) => setPreset({ animation })} />
			<${ToggleControl} class="mt10" label="Lock Left-Right Rotation" disabled=${p.lockYAxisRotation} checked=${p.lockXAxisRotation} onChange=${(lockXAxisRotation) => setPreset({ lockXAxisRotation })} />
			<${ToggleControl} class="mt10" label="Lock Up-Down Rotation" disabled=${p.lockXAxisRotation} checked=${p.lockYAxisRotation} onChange=${(lockYAxisRotation) => setPreset({ lockYAxisRotation })} />
			<${ToggleControl} class="mt10" label="Auto Rotate" checked=${p.autoRotate} onChange=${(autoRotate) => setPreset({ autoRotate })} />
			${p.autoRotate &&
			html`<div class="components-panel__row ld-presets-numrow">
				<label for="ld-preset-rps">Rotate Per Second (deg)</label>
				<input id="ld-preset-rps" class="components-text-control__input" type="number" value=${p.rotationPerSecond} onInput=${(e) => setPreset({ rotationPerSecond: e.currentTarget.value })} />
			</div>`}
			<${ToggleControl} class="mt10" label="Enable Zoom" checked=${p.zoom} onChange=${(zoom) => setPreset({ zoom })} />
			<p class="bpl-help-text">The following settings only work with multiple models</p>
			<${ToggleControl} class="mt10" label="Show Thumbnail List" checked=${p.isPagination} onChange=${(isPagination) => setPreset({ isPagination })} />
			<${ToggleControl} class="mt10" label="Show Arrows" checked=${p.isNavigation} onChange=${(isNavigation) => setPreset({ isNavigation })} />
			<${SelectControl}
				side
				class="mt5"
				label="Hotspot Style"
				value=${p.hotspotStyle || 'style-1'}
				options=${[['style-1', 'Simple Tag (Text Only)'], ['style-2', 'Always Visible Card'], ['style-3', 'Hover Popup Card'], ['style-4', 'Minimal Icon Badge']]}
				onChange=${(hotspotStyle) => setPreset({ hotspotStyle })}
			/>
			<${SelectControl} side class="mt10" label="Lazy Load" value=${normaliseLoading(p.lazyLoad)} options=${[['auto', 'Auto'], ['lazy', 'Lazy'], ['eager', 'Eager']]} onChange=${(lazyLoad) => setPreset({ lazyLoad })} />
		<//>
		<${O3DVOptions} preset=${p} setPreset=${setPreset} />
	`;
}

function O3DVOptions({ preset, setPreset }) {
	const o = preset.O3DVSettings || {};
	const set = (opt) => setPreset(opt, 'O3DVSettings');
	return html`<${PanelBody} class="bPlPanelBody" title="Options (Advanced Viewer)">
		<${ToggleControl} class="mt10" label="Fullscreen" checked=${o.isFullscreen} onChange=${(isFullscreen) => set({ isFullscreen })} />
		<${ToggleControl} class="mt10" label="Zoom In/Out Button" checked=${preset.zoomInOutBtn} onChange=${(zoomInOutBtn) => setPreset({ zoomInOutBtn })} />
		<${ToggleControl} class="mt10" label="Mouse Control" checked=${o.mouseControl} onChange=${(mouseControl) => set({ mouseControl })} />
		<${ToggleControl} class="mt10" label="Zoom" checked=${o.zoom ?? true} onChange=${(zoom) => set({ zoom })} />
		<${ToggleControl} class="mt10" label="Show Edge" checked=${o.showEdge} onChange=${(showEdge) => set({ showEdge })} />
		${o.showEdge && html`<${ColorControl} class="mt10" label="Edge Color" value=${o.edgeColor || '#000000'} onChange=${(edgeColor) => set({ edgeColor })} />`}
		<p class="bpl-help-text">The following settings only work with multiple models</p>
		<${ToggleControl} class="mt10" label="Show Thumbnail List" checked=${o.isPagination} onChange=${(isPagination) => set({ isPagination })} />
		<${ToggleControl} class="mt10" label="Show Arrows" checked=${o.isNavigation} onChange=${(isNavigation) => set({ isNavigation })} />
	<//>`;
}

function Style({ preset, setPreset }) {
	const s = preset.styles || {};
	const setStyles = (changes) => setPreset(changes, 'styles');
	const thumb = parseFloat(s.thumbSize || '90px');
	return html`<${PanelBody} title="Style">
		<div class="components-base-control ld-presets-unit">
			<label class="components-base-control__label" for="ld-preset-thumb">Slider Thumb Size (multiple)</label>
			<span class="ld-presets-unit__field">
				<input id="ld-preset-thumb" type="number" min="0" value=${Number.isFinite(thumb) ? thumb : 90} onInput=${(e) => setStyles({ thumbSize: (e.currentTarget.value || 0) + 'px' })} />
				<span class="ld-presets-unit__unit">px</span>
			</span>
		</div>
		<${ColorControl} label="Background Color" value=${s.bgColor || 'transparent'} defaultColor="transparent" onChange=${(bgColor) => setStyles({ bgColor })} />
	<//>`;
}

function PresetBlock({ preset, setPreset, selected, onSelect }) {
	// Select on pointerdown: a re-render during the click would undo the native checkbox toggle.
	return html`<div class=${cx('wp-block', 'ld-presets-block', selected && 'is-selected')} onPointerDown=${() => !selected && onSelect()} aria-label="Block: Model Viewer Preset">
		<p class="bpl-help-text">Presets apply to WooCommerce products only. Pick one in a product's 3D Viewer Settings › Template/Preset. Blocks, shortcodes and Elementor widgets don't use presets.</p>
		<${TabPanel} class="b3dviewer-tab-panel bPlTabPanel bp3d_preset_panel_body" tabs=${[['settings', 'Settings'], ['style', 'Style']]}>
			${(tab) => html`<div class="components-panel">${tab === 'settings' ? html`<${Options} preset=${preset} setPreset=${setPreset} />` : html`<${Style} preset=${preset} setPreset=${setPreset} />`}</div>`}
		<//>
	</div>`;
}

// ── editor screen ──
function useNarrow() {
	const q = '(max-width: 781px)';
	const [on, setOn] = useState(() => typeof matchMedia === 'function' && matchMedia(q).matches);
	useEffect(() => {
		if (typeof matchMedia !== 'function') return undefined;
		const mq = matchMedia(q);
		const f = () => setOn(mq.matches);
		mq.addEventListener?.('change', f);
		return () => mq.removeEventListener?.('change', f);
	}, []);
	return on;
}

const ago = (s) => {
	const t = Date.parse(String(s || '').replace(' ', 'T'));
	if (!Number.isFinite(t)) return 'a second ago';
	const min = Math.floor((Date.now() - t) / 60000);
	if (min < 1) return 'a second ago';
	if (min < 60) return `${min} ${min === 1 ? 'minute' : 'minutes'} ago`;
	const h = Math.round(min / 60);
	if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
	const d = Math.round(h / 24);
	return `${d} ${d === 1 ? 'day' : 'days'} ago`;
};

export default function PresetEdit({ params = [] }) {
	const id = params[0] || 'new';
	const stored = useStore((s) => (id === 'new' ? null : s.vpresets?.[id]));
	// post.php's wp_die() messages for a missing or trashed post.
	if (id !== 'new' && (!stored || stored.status === 'trash'))
		return html`<${WpAdmin} current="v3d-presets" title="Edit Preset">
			<div class="wrap ld-presets-missing">
				<p>${stored ? 'You cannot edit this item because it is in the Trash. Please restore it and try again.' : 'You attempted to edit an item that doesn’t exist. Perhaps it was deleted?'}</p>
				<p><a href="#v3d.presets">Back to Presets</a></p>
			</div>
		<//>`;
	return html`<${Editor} key=${id} id=${id} />`;
}

function Editor({ id }) {
	// A new preset gets its id on the first save, like an auto-draft becoming a post.
	const [idParam, setIdParam] = useState(id);
	const isNew = idParam === 'new';
	const saved = useStore((s) => (isNew ? null : s.vpresets?.[idParam]));
	const narrow = useNarrow();
	const [doc, setDoc] = useState(() => ({ title: saved?.title || '', preset: { ...PRESET_DEFAULT, ...(saved?.attrs?.preset || {}) } }));
	const [past, setPast] = useState([]);
	const [future, setFuture] = useState([]);
	const [sidebar, setSidebar] = useState(!narrow);
	const [tab, setTab] = useState('post');
	const [selected, setSelected] = useState(false);
	const [savedJson, setSavedJson] = useState(() => JSON.stringify({ title: saved?.title || '', preset: { ...PRESET_DEFAULT, ...(saved?.attrs?.preset || {}) } }));

	const status = saved?.status || (isNew ? 'auto-draft' : 'publish');
	const published = status === 'publish';
	const dirty = JSON.stringify(doc) !== savedJson;

	// Typing in the title within a second is one undo step, like the block editor.
	const lastEdit = useRef({ at: 0, key: '' });
	const commit = (next, key = '') => {
		const now = Date.now();
		const merge = key && lastEdit.current.key === key && now - lastEdit.current.at < 1000;
		lastEdit.current = { at: now, key };
		if (!merge) setPast([...past.slice(-49), doc]);
		setFuture([]);
		setDoc(next);
	};
	const setPreset = (changes, group) => commit({ ...doc, preset: mergePreset(doc.preset, changes, group) });
	const undo = () => past.length && (setFuture([doc, ...future]), setDoc(past[past.length - 1]), setPast(past.slice(0, -1)));
	const redo = () => future.length && (setPast([...past, doc]), setDoc(future[0]), setFuture(future.slice(1)));

	const save = (nextStatus) => {
		const id = isNew ? String(store.nextId('vpresets')) : idParam;
		const now = nowStr();
		const rec = {
			...(saved || {}),
			id,
			title: doc.title.trim(),
			status: nextStatus,
			date: saved?.date && saved.status === 'publish' ? saved.date : now,
			modified: now,
			attrs: { ...(saved?.attrs || {}), preset: doc.preset },
		};
		store.patch(['vpresets', id], rec);
		setSavedJson(JSON.stringify(doc));
		// Block editor snackbars use the post type labels, which this type leaves at core's defaults.
		toast(nextStatus === 'publish' ? (published ? 'Post updated.' : 'Post published.') : 'Draft saved.');
		if (isNew) {
			setIdParam(id);
			try {
				history.replaceState(null, '', '#v3d.preset.' + id);
			} catch {
				// The address bar keeps #v3d.preset.new; the preset is saved either way.
			}
		}
	};
	const trash = () => {
		if (!isNew) {
			store.patch(['vpresets', idParam], { ...saved, status: 'trash', prevStatus: status });
			queuePresetNotice({ kind: 'trash', ids: [idParam] });
		}
		go('v3d.presets');
	};

	// Shortcuts read the latest handlers, so a key pressed right after an edit still sees it.
	const keys = useRef(null);
	keys.current = { save: () => save(published ? 'publish' : 'draft'), undo, redo };
	useEffect(() => {
		const onKey = (e) => {
			const mod = e.metaKey || e.ctrlKey;
			if (mod && e.key.toLowerCase() === 's') {
				e.preventDefault();
				keys.current.save();
			} else if (mod && e.key.toLowerCase() === 'z' && !e.target.closest?.('input, textarea, select')) {
				e.preventDefault();
				e.shiftKey ? keys.current.redo() : keys.current.undo();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, []);

	const title = doc.title.trim() || 'No title';
	const notInDemo = (what) => toast(`${what} is not part of this demo.`);

	return html`<${WpAdmin} current="v3d-presets" title=${isNew ? 'Add New' : 'Edit Preset'} fullscreen>
		<div class=${cx('ld-presets-ed', sidebar && 'has-sidebar')}>
			<div class="ld-presets-ed__head" role="region" aria-label="Editor top bar">
				<div class="ld-presets-ed__left">
					<a class="ld-presets-ed__icon ld-presets-ed__back" href="#v3d.presets" aria-label="View Presets"><${Icon} d=${I.back} /></a>
					<button type="button" class="ld-presets-ed__icon ld-presets-ed__inserter" aria-label="Block Inserter" onClick=${() => notInDemo('Adding blocks')}><${Icon} d=${I.plus} /></button>
					<button type="button" class="ld-presets-ed__icon is-hide-narrow" aria-label="Undo" aria-disabled=${!past.length} onClick=${undo}><${Icon} d=${I.undo} /></button>
					<button type="button" class="ld-presets-ed__icon is-hide-narrow" aria-label="Redo" aria-disabled=${!future.length} onClick=${redo}><${Icon} d=${I.redo} /></button>
					<button type="button" class="ld-presets-ed__icon is-hide-narrow" aria-label="Document Overview" onClick=${() => notInDemo('Document Overview')}><${Icon} d=${I.list} /></button>
				</div>
				<div class="ld-presets-ed__center">
					<div class="ld-presets-ed__docbar"><span class="ld-presets-ed__doctitle">${title}</span><span class="ld-presets-ed__doctype"> · Presets</span></div>
				</div>
				<div class="ld-presets-ed__right">
					${!published &&
					html`<button type="button" class="ld-presets-ed__draft" disabled=${!dirty && !isNew} onClick=${() => save('draft')}>${!dirty && !isNew ? 'Saved' : 'Save draft'}</button>`}
					<button type="button" class="ld-presets-ed__icon is-hide-narrow" aria-label="View" onClick=${() => notInDemo('Preview')}><${Icon} d=${I.desktop} /></button>
					<button type="button" class=${cx('ld-presets-ed__icon', sidebar && 'is-pressed')} aria-label="Settings" aria-pressed=${sidebar} onClick=${() => setSidebar(!sidebar)}><${Icon} d=${I.sidebar} /></button>
					<button type="button" class="ld-presets-ed__publish" aria-disabled=${published && !dirty} onClick=${() => (published && !dirty ? null : save('publish'))}>${published ? 'Save' : 'Publish'}</button>
					<button type="button" class="ld-presets-ed__icon is-hide-narrow" aria-label="Options" onClick=${() => notInDemo('Editor options')}><${Icon} d=${I.more} /></button>
				</div>
			</div>

			<div class="ld-presets-ed__body">
				<div class="ld-presets-ed__canvas" onClick=${(e) => e.target === e.currentTarget && setSelected(false)}>
					<div class="ld-presets-ed__page editor-styles-wrapper">
						<textarea
							class="ld-presets-ed__title wp-block-post-title"
							rows="1"
							placeholder="Add title"
							aria-label="Add title"
							value=${doc.title}
							onFocus=${() => setSelected(false)}
							onInput=${(e) => {
								const v = e.currentTarget.value.replace(/\n/g, ' ');
								commit({ ...doc, title: v }, 'title');
								e.currentTarget.style.height = 'auto';
								e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
							}}
						></textarea>
						<${PresetBlock}
							preset=${doc.preset}
							setPreset=${setPreset}
							selected=${selected}
							onSelect=${() => {
								setSelected(true);
								setTab('block');
							}}
						/>
					</div>
				</div>

				${sidebar &&
				html`<aside class="ld-presets-ed__sidebar" aria-label="Editor settings">
					<div class="ld-presets-ed__tabs" role="tablist">
						<button type="button" role="tab" aria-selected=${tab === 'post'} class=${cx(tab === 'post' && 'is-active')} onClick=${() => setTab('post')}>Presets</button>
						<button type="button" role="tab" aria-selected=${tab === 'block'} class=${cx(tab === 'block' && 'is-active')} onClick=${() => setTab('block')}>Block</button>
						<button type="button" class="ld-presets-ed__close" aria-label="Close Settings" onClick=${() => setSidebar(false)}><${Icon} d=${I.close} /></button>
					</div>
					${tab === 'post'
						? html`<div class="ld-presets-ed__panel">
								<div class="ld-presets-ed__card">
									<span class="ld-presets-ed__cardicon"><${Icon} d=${I.page} /></span>
									<strong>${title}</strong>
								</div>
								<p class="ld-presets-ed__muted">${isNew ? 'Not saved yet.' : `Last edited ${ago(saved?.modified || saved?.date)}.`}</p>
								<div class="ld-presets-ed__rows">
									<div class="ld-presets-ed__row"><span>Status</span><span class="ld-presets-ed__val"><${Icon} d=${I.status} size=${18} />${published ? 'Published' : 'Draft'}</span></div>
									<div class="ld-presets-ed__row"><span>Publish</span><span class="ld-presets-ed__val">${published && saved?.date ? longDate(saved.date) : 'Immediately'}</span></div>
								</div>
								${!isNew && html`<button type="button" class="ld-presets-ed__trash" onClick=${trash}>Move to trash</button>`}
							</div>`
						: html`<div class="ld-presets-ed__panel">
								<div class="ld-presets-ed__card ld-presets-ed__blockcard">
									<img src=${LOGO} alt="" width="24" height="24" />
									<div><strong>Model Viewer Preset</strong></div>
								</div>
								<${PanelBody} title="Advanced" initialOpen=${false}>
									<${TextControl} label="Additional CSS class(es)" value="" onChange=${() => notInDemo('Additional CSS classes')} />
									<p class="components-base-control__help">Separate multiple classes with spaces.</p>
								<//>
							</div>`}
				</aside>`}
			</div>

			<div class="ld-presets-ed__foot">
				<button type="button" class="ld-presets-ed__crumb" onClick=${() => setSelected(false)}>Presets</button>
				${selected && html`<span class="ld-presets-ed__crumbsep" aria-hidden="true">›</span><span class="ld-presets-ed__crumb is-current">Model Viewer Preset</span>`}
			</div>
		</div>
	<//>`;
}
