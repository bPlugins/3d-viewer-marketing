// 3D Viewer → Visual Editor (Pro): 3d-viewer-premium/src/admin/visual-editor. A throwaway block editor holding
// one Model Viewer block with placement "visual-editor", so the inspector is the block's own Settings tab minus
// Mobile, Controls, multiple models and hotspot styling (panels/settings.js). Like the plugin, nothing is saved.
import { html, useState, useEffect, useRef, useCallback, cx } from '../../js/core/ui.js';
import { WpAdmin } from '../../js/screens/admin/chrome.js';
import { toast } from '../core/bus.js';
import { ViewerBlock, currentModel, hotspotsOf, getView } from './render.js';
import { viewerAttrs } from './attrs.js';
import { Ico, Panel, Text } from './editor-controls.js';
import { MediaHost, openMedia } from './editor-media.js';
import { SettingsTab } from './panels/settings.js';
import { copyText } from './list.js';

const LOGO = new URL('../img/brand/3d-viewer-logo.svg', import.meta.url).href;

// parse('<!-- wp:b3dviewer/modelviewer {"model":{},"placement":"visual-editor","isPremium":true} -->')
const initialAttrs = () => ({ ...viewerAttrs({ placement: 'visual-editor', isPremium: true }), model: {} });
// The block's PanelBody initialOpen values; Model starts closed on this page (ModelForm.tsx).
const OPEN = { model: false, lighting: false, ar: false, texture: false, options: false, dimensions: false, hotspots: true };

/** Edit.tsx empty state: ModelUrlField with its media button. */
function Upload3d({ onCommit }) {
	const [draft, setDraft] = useState('');
	const commit = () => draft.trim() && onCommit(draft.trim());
	return html`<div class="upload3d">
		<div class="upload3d__icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#146ef5" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5 3.5 7v10l8.5 4.5 8.5-4.5V7zM3.5 7 12 11.5 20.5 7M12 11.5v10" /></svg></div>
		<h2>Add Your 3D Model</h2>
		<p class="upload3d__hint">Paste a model URL or upload a file to get started.</p>
		<div class="bPlInlineMediaUpload">
			<input type="text" class="components-text-control__input" placeholder="Model URL" aria-label="Model URL" value=${draft} onInput=${(e) => setDraft(e.currentTarget.value)} onBlur=${commit} onKeyDown=${(e) => e.key === 'Enter' && (e.preventDefault(), commit())} />
			<button type="button" class="ld-be-upload" aria-label="Select or upload a 3D model" onClick=${() => openMedia({ type: 'model', onSelect: onCommit })}><${Ico} name="upload" size=${18} /></button>
		</div>
	</div>`;
}

export default function VisualEditor() {
	const [a, setA] = useState(initialAttrs);
	const [selected, setSelected] = useState(true);
	const [open, setOpen] = useState(OPEN);
	const [placing, setPlacing] = useState(false);
	const [info, setInfo] = useState({ animations: [], variants: [], materials: [], size: null });
	const [copied, setCopied] = useState(false);
	const [className, setClassName] = useState('');
	const viewerRef = useRef(null);
	const sideRef = useRef(null);

	const set = (patch) => setA((cur) => ({ ...cur, ...patch }));
	const setModel = (patch) => setA((cur) => ({ ...cur, model: { ...currentModel(cur, 0, false), ...patch } }));
	const m = currentModel(a, 0, false);
	const hasModel = !!m.modelUrl;

	useEffect(() => {
		if (!copied) return undefined;
		const t = setTimeout(() => setCopied(false), 1800);
		return () => clearTimeout(t);
	}, [copied]);
	useEffect(() => {
		const onKey = (e) => e.key === 'Escape' && setPlacing(false);
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, []);

	const onPlace = useCallback((spot) => {
		setA((cur) => {
			const model = currentModel(cur, 0, false);
			return { ...cur, model: { ...model, hotspots: [...hotspotsOf(cur, model), spot] } };
		});
		setPlacing(false);
	}, []);

	const ctx = {
		pro: true,
		index: 0,
		setIndex: () => {},
		info,
		media: (type, cb) => openMedia({ type, onSelect: cb }),
		placing,
		setPlacing: (v) => (setPlacing(v), v && setSelected(true)),
		open,
		toggle: (panel, v) => setOpen((o) => ({ ...o, [panel]: v })),
		device: 'desktop',
		setDevice: () => {},
		showHotspots: () => {
			setOpen((o) => ({ ...o, hotspots: true }));
			setTimeout(() => sideRef.current?.querySelector('[data-panel="hotspots"]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
		},
		copy: (t) => (copyText(t), toast('Copied Succesfully')),
	};
	const props = { a, set, setModel, ctx };

	// ClipboardButton text: JSON.stringify(getView(viewerRef.current)).
	const copyView = () => {
		const view = getView(viewerRef.current);
		if (!view) return;
		copyText(JSON.stringify(view));
		setCopied(true);
	};
	const notInDemo = (what) => toast(`${what} is not part of this demo.`);

	return html`<${WpAdmin} current="v3d-visual" title="Visual Editor">
		<div class="wrap ld-ve">
			<h1>Visual Editor</h1>
			<p class="description">Load a model, then click it to place hotspots or frame a camera angle and copy the values into your viewer. Nothing here is saved.</p>
			<hr class="wp-header-end" />
			<div id="bp3dAdminVisualEditor">
				<div class="editor-content">
					<div class="bp3d-block-editor-wrapper ld-be">
						<div class="editor-styles-wrapper" onClick=${(e) => e.target === e.currentTarget && (setSelected(false), setPlacing(false))}>
							<div class=${cx('ld-be-block', 'wp-block', selected && 'is-selected', placing && 'is-placing', className)} data-type="b3dviewer/modelviewer" onClick=${() => setSelected(true)}>
								${selected &&
								html`<div class="block-editor-block-contextual-toolbar" role="toolbar" aria-label="Block tools">
									<button type="button" class="ld-ve-tb" aria-label="Model Viewer" title="Model Viewer" onClick=${(e) => (e.stopPropagation(), notInDemo('Transforming the block'))}><img src=${LOGO} alt="" width="22" height="22" /></button>
									<button type="button" class="ld-ve-tb" aria-label="Align" title="Align" onClick=${(e) => (e.stopPropagation(), notInDemo('Alignment'))}><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14V7H5V5.5ZM5 17h14v1.5H5V17Zm0-6.5h14V14H5v-3.5Z" fill="currentColor" /></svg></button>
									<button type="button" class="ld-ve-tb" aria-label="Options" title="Options" onClick=${(e) => (e.stopPropagation(), notInDemo('The block options menu'))}><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 19h-2v-2h2v2zm0-6h-2v-2h2v2zm0-6h-2V5h2v2z" fill="currentColor" /></svg></button>
								</div>`}
								${!selected && hasModel && html`<div class="modelViewerIsSelected"></div>`}
								${hasModel
									? html`<${ViewerBlock} attrs=${a} editor=${true} elRef=${viewerRef} placing=${placing} onPlace=${onPlace} onInfo=${setInfo}>
											<div class="setDefaultViewContainer" onClick=${(e) => e.stopPropagation()}>
												<button type="button" class="button button-primary" title=${copied ? 'Copied' : ''} disabled=${copied} onClick=${copyView}>Copy Current/Initial View</button>
												${copied && html`<div class="components-snackbar">Copied Succesfully</div>`}
											</div>
										<//>`
									: html`<${Upload3d} onCommit=${(modelUrl) => (setSelected(true), setModel({ modelUrl, initialView: null, ext: modelUrl.split('.').pop() }))} />`}
								${placing && html`<div class="ld-be-placing" role="status">Click on the model in the preview to add a hotspot. <button type="button" class="ld-be-link" onClick=${(e) => (e.stopPropagation(), setPlacing(false))}>Cancel</button></div>`}
							</div>
						</div>

						<div class="block-editor-sidebar ld-be-sidebar" ref=${sideRef}>
							${!selected
								? html`<p class="ld-be-noblock">No block selected.</p>`
								: html`<div class="block-editor-block-card">
											<span class="block-editor-block-icon"><img src=${LOGO} alt="" width="24" height="24" /></span>
											<div class="block-editor-block-card__content"><h2 class="block-editor-block-card__title">Model Viewer</h2></div>
										</div>
										<${InspectorTabs} props=${props} />
										<${Panel} id="advanced" title="Advanced" initialOpen=${false}>
											<${Text} label="Additional CSS class(es)" value=${className} onChange=${setClassName} help="Separate multiple classes with spaces." />
										<//>`}
						</div>
					</div>
				</div>
			</div>
		</div>
		<${MediaHost} />
	<//>`;
}

/** settings.tsx TabPanel; the Style tab is empty on this page. */
function InspectorTabs({ props }) {
	const [tab, setTab] = useState('settings');
	return html`<div class="b3dviewer-tab-panel bPlTabPanel">
		<div role="tablist" aria-orientation="horizontal" class="components-tab-panel__tabs">
			${[['settings', 'Settings'], ['style', 'Style']].map(([t, l]) => html`<button type="button" role="tab" key=${t} class=${cx('components-tab-panel__tabs-item', t, tab === t && 'active activeTab')} aria-selected=${tab === t} onClick=${() => setTab(t)}>${l}</button>`)}
		</div>
		<div role="tabpanel" class="components-tab-panel__tab-content">${tab === 'settings' ? html`<${SettingsTab} ...${props} />` : html`<span></span>`}</div>
	</div>`;
}
