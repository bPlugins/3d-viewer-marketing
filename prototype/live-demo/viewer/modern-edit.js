// 3D Viewer → Add New / Edit 3D Viewer in the "New" (Modern) interface: WordPress's post screen with the
// "3D Viewer Settings" meta box drawn as the whole page (bfields `'frame' => 'page'`, ui/layout/EditorShell.tsx;
// inc/Helper/Registrar.php createMetabox). Fields: viewer/meta.js. The side card is the plugin's Live Preview
// (src/admin/preview SidePreview). Notices and labels: PostTypeModelViewer::customizeUpdateMessage().
import { html, useState, useEffect, useRef, useMemo, cx } from '../../js/core/ui.js';
import { store, useStore } from '../../js/core/store.js';
import { go } from '../../js/core/router.js';
import { WpAdmin } from '../../js/screens/admin/chrome.js';
import { nowStr } from '../../js/screens/admin/products.js';
import { useIsPro } from '../core/plan.js';
import { toast } from '../core/bus.js';
import { BfIcon, BfFields, defaultsOf, editableIds, copyToClipboard, useTabsPosition, TabsSwitch } from '../ui/bfields.js';
import { viewerSchema, display, metaToAttrs, resolveSource, writeThrough, isLibraryUrl } from './meta.js';
import { ViewerBlock, getView } from './render.js';
import { MediaHost, openMedia } from './editor-media.js';
import { queueListNotice, shortcodeOf } from './list.js';

const UNIQUE = '_bp3dimages_';
const HINT = 'Copy and paste this shortcode into your posts, pages and widget';
// customizeUpdateMessage(): 1 / 6 / 10.
const MESSAGES = { updated: 'Model Updated', published: 'Model published.', draft: 'Model draft updated.' };
const SOURCE_ERROR = 'Pasting a model URL from outside your Media Library needs 3D Viewer Pro. The previous model was kept.';

display.upgrade = () => html`<div class="bp3d-metabox-upgrade-section ld-vm-upgrade">
	3D Viewer lets you embed interactive 3D models and 360 product views on WordPress sites with almost all 3D file formats.
	<a class="button button-bplugins" href="#v3d.help.pricing">Upgrade to PRO </a>
</div>`;
display.visualEditor = () => html`<a class="button button-primary bp3d-primary-button" target="_blank" rel="noopener" href="#v3d.visual">Open Visual Editor</a>`;
display.liteOnly = () => html`<strong>Lite Viewer only</strong> — every option below this line applies to the Lite Viewer and is ignored when this model uses the Advanced Viewer.`;

// Notices that survive the "reload" after Publish / Save Draft (WordPress's ?message=6).
let pending = null;

const flat = (fields, out = []) => {
	for (const f of fields || []) f.type === 'field_group' ? flat(f.fields, out) : out.push(f);
	return out;
};

/** What the form shows for a stored row: defaults under it, plus the merged 3D Source (ModelSource::fieldDefault). */
function formValues(sections, meta) {
	const all = sections.flatMap((s) => s.fields);
	return { ...defaultsOf(all), ...(meta || {}), bp_3d_source: resolveSource(meta) };
}

/** The preview reads the form as it is (src/admin/preview readAttributes): the merged source is the model. */
const liveAttrs = (values, id) => metaToAttrs({ ...values, bp_3d_src_type: 'link', bp_3d_src_link: values.bp_3d_source || '' }, id);

const hasModel = (a) => !!(a.multiple ? a.models?.some((m) => m.modelUrl) : a.model?.modelUrl);

const ICON = (inner) => html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const I = {
	eye: ICON(html`<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />`),
	scan: ICON(html`<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="1" /><path d="M18.9 12.3a1 1 0 0 0 0-.6 7.5 7.5 0 0 0-13.8 0 1 1 0 0 0 0 .6 7.5 7.5 0 0 0 13.8 0" />`),
	reset: ICON(html`<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" />`),
	zoomIn: ICON(html`<circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M11 8v6M8 11h6" />`),
	zoomOut: ICON(html`<circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M8 11h6" />`),
	full: ICON(html`<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />`),
	camera: ICON(html`<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" />`),
	check: ICON(html`<path d="M20 6 9 17l-5-5" />`),
	cube: html`<svg viewBox="0 0 512 512" aria-hidden="true"><path d="m262.671 40.888c-4.624-2.621-10.288-2.597-14.89.06l-121.551 70.177 129.841 74.964 129.885-75.34z" /><path d="m111.236 277.451c0 5.358 2.858 10.307 7.497 12.986l122.361 70.645v-149.012l-129.859-74.974z" /><path d="m400.942 277.451v-140.726l-129.858 75.325v149.032l122.361-70.645c4.64-2.679 7.497-7.628 7.497-12.986z" /></svg>`,
};
const DEVICES = [
	['desktop', 'Desktop', 'monitor', '100%'],
	['tablet', 'Tablet', 'tablet', '62%'],
	['mobile', 'Mobile', 'phone', '36%'],
];

const applyView = (el, view) => {
	if (!el) return;
	el.cameraOrbit = view?.orbit || 'auto auto auto';
	el.cameraTarget = view?.target || 'auto auto auto';
	el.fieldOfView = view?.fov || 'auto';
	el.resetTurntableRotation?.();
	el.jumpCameraToGoal?.();
};

const parseView = (t) => {
	try {
		const v = JSON.parse(t || '[]');
		return v && !Array.isArray(v) && typeof v === 'object' ? v : null;
	} catch {
		return null;
	}
};

/** The Lite viewer opens glTF only (src/admin/preview LiteNotice). */
function LiteNotice({ attrs }) {
	if ((attrs.currentViewer || 'modelViewer') !== 'modelViewer') return null;
	const urls = attrs.multiple ? (attrs.models || []).map((m) => m.modelUrl) : [attrs.model?.modelUrl];
	const exts = [...new Set(urls.map((u) => String(u || '').split(/[?#]/)[0].split('.').pop().toLowerCase()).filter((e) => e && !/^(glb|gltf)$/.test(e) && !/\//.test(e)))];
	if (!exts.length) return null;
	const advanced = ['obj', '3ds', 'stl', 'ply', 'off', '3dm', 'fbx', 'dae', 'wrl', '3mf', 'amf', 'ifc', 'brep', 'step', 'iges', 'fcstd', 'bim'];
	return html`<p class="bp3d-lite-notice" role="status">The Lite viewer opens only .glb and .gltf files, not ${exts.map((e) => '.' + e).join(', ')}.${exts.every((e) => advanced.includes(e)) ? ' Switch the 3D Viewer to Advanced.' : ''}</p>`;
}

/** "Set current view as initial view" (Pro, Lite viewer only: the field it writes is a Pro field). */
function InitialViewButton({ show, viewer, disabled, onSet, className }) {
	const [done, setDone] = useState(false);
	useEffect(() => {
		if (!done) return undefined;
		const t = setTimeout(() => setDone(false), 2500);
		return () => clearTimeout(t);
	}, [done]);
	if (!show) return null;
	const save = () => {
		const view = getView(viewer.current);
		if (!view?.orbit) return;
		onSet(JSON.stringify(view));
		setDone(true);
	};
	return html`<div class=${className}>
		<button type="button" class=${cx('bfields-btn', 'bfields-btn--soft', 'bp3d-initial-view-btn', done && 'is-done')} title="Rotate and zoom the preview, then save that angle as the view visitors see first." disabled=${disabled} onClick=${save}>
			${done ? I.check : I.camera}${done ? 'Initial view set' : 'Set current view as initial view'}
		</button>
	</div>`;
}

/** PreviewModal: a larger preview with the device switch. */
function PreviewModal({ attrs, device, setDevice, onClose }) {
	const close = useRef(null);
	useEffect(() => {
		close.current?.focus();
		const key = (e) => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', key);
		return () => document.removeEventListener('keydown', key);
	}, []);
	const width = DEVICES.find(([d]) => d === device)?.[3] || '100%';
	return html`<div class="bp3d-modal-overlay" onClick=${onClose}>
		<div class="bp3d-modal-container" role="dialog" aria-modal="true" aria-labelledby="bp3d-modal-title" onClick=${(e) => e.stopPropagation()}>
			<div class="bp3d-modal-header">
				<span class="bp3d-modal-title" id="bp3d-modal-title">${I.cube}Live Preview</span>
				<span class="bp3d-modal-actions">
					<span class="bp3d-modal-devices" role="group" aria-label="Preview device">
						${DEVICES.map(([d, label, icon]) => html`<button key=${d} type="button" class="bp3d-modal-device" aria-pressed=${device === d} aria-label=${label} onClick=${() => setDevice(d)}><${BfIcon} name=${icon} size=${12} /> <span class="bp3d-modal-device__label">${label}</span></button>`)}
					</span>
					<button type="button" class="bp3d-modal-close" ref=${close} aria-label="Close preview" onClick=${onClose}>×</button>
				</span>
			</div>
			<div class=${cx('bp3d-modal-body', hasModel(attrs) && 'bp3d-modal-body--viewer')}>
				${hasModel(attrs)
					? html`<div class="bp3d-modal-frame" style=${{ width }}><${ViewerBlock} attrs=${{ ...attrs, uniqueId: 'bp3dModalPreview' }} device=${device} /></div>`
					: html`<div class="bp3d-model-preview__empty"><span class="bp3d-model-preview__empty-icon">${I.cube}</span><span class="bp3d-model-preview__empty-text"><strong>No model selected</strong><br />Upload a 3D model in the Model tab to see the preview.</span></div>`}
			</div>
		</div>
	</div>`;
}

/** The side card (src/admin/preview SidePreview): the viewer, small, with the card's own view controls. */
function SidePreview({ attrs, device, setDevice, pro, onInitialView }) {
	const viewer = useRef(null);
	const stage = useRef(null);
	const [popup, setPopup] = useState(false);
	const [ready, setReady] = useState(false);
	const has = hasModel(attrs);
	const lite = (attrs.currentViewer || 'modelViewer') === 'modelViewer';
	useEffect(() => setReady(false), [attrs.model?.modelUrl]);
	const side = useMemo(
		() => ({
			...attrs,
			uniqueId: 'bp3dSidePreview',
			fullscreen: false,
			zoomInOutBtn: false,
			cameraBtn: false,
			resetViewBtn: false,
			downloadBtn: false,
			model: { ...attrs.model, arEnabled: false },
			models: (attrs.models || []).map((m) => ({ ...m, arEnabled: false })),
			dimensions: { ...(attrs.dimensions || {}), mode: attrs.dimensions?.mode === 'always' ? 'always' : 'off' },
			styles: { ...attrs.styles, width: '100%', height: '100%' },
		}),
		[attrs]
	);
	const full = () => {
		const box = stage.current?.querySelector('.bp_model_parent');
		if (box?.requestFullscreen) box.requestFullscreen().catch(() => toast('Fullscreen is not available in this browser frame.'));
		else toast('Fullscreen is not available in this browser frame.');
	};
	const btn = (label, icon, onClick) => html`<button type="button" class="bfields-icon-btn" aria-label=${label} title=${label} disabled=${!has} onClick=${onClick}>${icon}</button>`;
	return html`<div class="bfields-preview bp3d-side-preview">
		<div class="bfields-preview__head">
			<h3 class="bfields-preview__title">${I.eye} Live Preview</h3>
			<button type="button" class="bfields-icon-btn" aria-label="Open a larger preview" title="Open a larger preview" disabled=${!has} onClick=${() => setPopup(true)}>${I.scan}</button>
		</div>
		<${LiteNotice} attrs=${attrs} />
		<div class="bfields-preview__stage bp3d-side-preview__stage" ref=${stage}>
			${has
				? html`<${ViewerBlock} attrs=${side} elRef=${viewer} onLoad=${() => setReady(true)} />`
				: html`<span class="bp3d-side-preview__empty">${I.cube}Add a 3D model on the Model tab to preview it here.</span>`}
		</div>
		<div class="bfields-preview__controls">
			<div>
				${btn('Reset view', I.reset, () => applyView(viewer.current, attrs.model?.initialView))}
				${btn('Zoom in', I.zoomIn, () => viewer.current?.zoom?.(2))}
				${btn('Zoom out', I.zoomOut, () => viewer.current?.zoom?.(-2))}
			</div>
			${btn('Fullscreen', I.full, full)}
		</div>
		<${InitialViewButton} className="bp3d-side-preview__view" show=${has && pro && lite} viewer=${viewer} disabled=${!ready} onSet=${onInitialView} />
		${popup && html`<${PreviewModal} attrs=${attrs} device=${device} setDevice=${setDevice} onClose=${() => setPopup(false)} />`}
	</div>`;
}

/** The Preview tab's stage card (EditorShell stageCard + PreviewApp bare). */
function StageCard({ title, attrs, device, setDevice, pro, onInitialView, actions }) {
	const viewer = useRef(null);
	const [ready, setReady] = useState(false);
	const lite = (attrs.currentViewer || 'modelViewer') === 'modelViewer';
	const width = DEVICES.find(([d]) => d === device)?.[3] || '100%';
	return html`<div class="bfields-stagecard bfields-stagecard--host">
		<div class="bfields-stagecard__head">
			<span class="bfields-stagecard__left"><span class="bfields-dot"></span>${title}</span>
			<div class="bfields-devices">
				${DEVICES.map(([d, label, icon]) => html`<button key=${d} type="button" class="bfields-device" aria-pressed=${device === d} onClick=${() => setDevice(d)}><${BfIcon} name=${icon} size=${10} /> ${label}</button>`)}
			</div>
		</div>
		<div class="bfields-stagecard__body">
			<div class="bfields-stagecard__stage" style=${{ maxWidth: width }}>
				<div class="bp3d-model-preview bp3d-model-preview--bare">
					<div class="bp3d-model-preview__body">
						<${LiteNotice} attrs=${attrs} />
						<div class="bp3d-model-preview__stage">
							${hasModel(attrs)
								? html`<${ViewerBlock} attrs=${{ ...attrs, uniqueId: 'bp3dPreview' }} device=${device} elRef=${viewer} onLoad=${() => setReady(true)} />`
								: html`<div class="bp3d-model-preview__empty"><span class="bp3d-model-preview__empty-icon">${I.cube}</span><span class="bp3d-model-preview__empty-text"><strong>No model selected</strong><br />Upload a 3D model in the Model tab to see a live preview here.</span></div>`}
						</div>
					</div>
					<${InitialViewButton} className="bp3d-model-preview__view" show=${hasModel(attrs) && pro && lite} viewer=${viewer} disabled=${!ready} onSet=${onInitialView} />
				</div>
			</div>
		</div>
		${actions && html`<div class="bfields-stagecard__actions">${actions}</div>`}
	</div>`;
}

function ShortcodeChip({ id, place }) {
	const [copied, setCopied] = useState(false);
	const sc = shortcodeOf(id);
	const copy = () => {
		copyToClipboard(sc);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};
	return html`<button type="button" class=${'bfields-shortcode__chip bfields-shortcode__chip--' + place} onClick=${copy} aria-label=${'Copy shortcode: ' + sc} title=${copied ? 'Copied' : HINT}>
		${place === 'side' && html`<span class="bfields-shortcode__label">Shortcode</span>`}
		<code>${sc}</code>
		<span class="bfields-shortcode__icon"><${BfIcon} name=${copied ? 'check' : 'copy'} size=${14} stroke=${copied ? 3 : 2} /></span>
	</button>`;
}

/** WordPress's Screen Options tab for post.php: the screen elements and the column layout. */
function ScreenOptions({ prefs, setPrefs }) {
	const [open, setOpen] = useState(false);
	return html`<div class="ld-vm-screen-meta">
		${open &&
		html`<div id="screen-options-wrap" class="ld-vm-screen-options" aria-label="Screen Options Tab">
			<fieldset class="metabox-prefs">
				<legend>Screen elements</legend>
				<p>Some screen elements can be shown or hidden by using the checkboxes. Expand or collapse the elements by clicking on their headings, and arrange them by dragging their headings or by clicking on the up and down arrows.</p>
				<label for="slugdiv-hide"><input class="hide-postbox-tog" id="slugdiv-hide" type="checkbox" checked=${prefs.slug} onChange=${(e) => setPrefs({ ...prefs, slug: e.currentTarget.checked })} />Slug</label>
			</fieldset>
			<fieldset class="columns-prefs">
				<legend>Layout</legend>
				${[1, 2].map((n) => html`<label key=${n} class="columns-prefs-${n}"><input type="radio" name="screen_columns" value=${n} checked=${prefs.columns === n} onChange=${() => setPrefs({ ...prefs, columns: n })} />${n} ${n === 1 ? 'column' : 'columns'}</label>`)}
			</fieldset>
		</div>`}
		<div id="screen-meta-links">
			<div id="screen-options-link-wrap" class="hide-if-no-js screen-meta-toggle">
				<button type="button" id="show-settings-link" class=${cx('button', 'show-settings', open && 'screen-meta-active')} aria-controls="screen-options-wrap" aria-expanded=${open} onClick=${() => setOpen(!open)}>Screen Options</button>
			</div>
		</div>
	</div>`;
}

const PREFS_KEY = 'bp3d-live-demo-viewer-screen';
const readPrefs = () => {
	try {
		return { slug: false, columns: 2, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
	} catch {
		return { slug: false, columns: 2 };
	}
};

const slugify = (t) =>
	String(t || '')
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/[\s_]+/g, '-')
		.replace(/-+/g, '-');

function Notices({ list, onDismiss }) {
	return list.map((n, i) =>
		n.box
			? html`<div key=${'b' + i} class="notice notice-error inline bfields-box-notice" data-unique=${UNIQUE}><ul>${Object.entries(n.box).map(([id, msg]) => html`<li key=${id}><code>${id}</code> ${msg}</li>`)}</ul></div>`
			: html`<div key=${i} id=${n.kind === 'success' ? 'message' : undefined} class=${cx('notice', n.kind === 'success' ? 'updated notice-success' : 'notice-' + n.kind, 'is-dismissible')}>
					<p>${n.text}</p>
					<button type="button" class="notice-dismiss" onClick=${() => onDismiss(i)}><span class="screen-reader-text">Dismiss this notice.</span></button>
				</div>`
	);
}

export default function ModernEditor({ id, stored }) {
	const pro = useIsPro();
	const settings = useStore((s) => s.lv?.settings);
	const productsMap = useStore((s) => s.products || {});
	const [postId] = useState(() => (id === 'new' ? String(store.nextId('viewers')) : id));
	const products = useMemo(() => Object.values(productsMap).filter((p) => p.status !== 'trash' && p.status !== 'draft').map((p) => [String(p.id), p.name]).sort((a, b) => a[1].localeCompare(b[1])), [productsMap]);
	const sections = useMemo(() => viewerSchema({ pro, postId, settings, products }), [pro, postId, settings, products]);
	const allFields = useMemo(() => flat(sections.flatMap((s) => s.fields)), [sections]);
	const [values, setValues] = useState(() => formValues(sections, stored?.meta));
	const [title, setTitle] = useState(stored?.title || '');
	const [slug, setSlug] = useState(stored?.slug || '');
	const [status, setStatus] = useState(stored?.status || 'auto-draft');
	const [saved, setSaved] = useState(() => JSON.stringify({ title: stored?.title || '', values }));
	const [active, setActive] = useState('model');
	const [device, setDevice] = useState('desktop');
	const [busy, setBusy] = useState('');
	const [note, setNote] = useState('');
	const [notices, setNotices] = useState(() => {
		const n = pending?.id === postId ? pending.list : [];
		pending = null;
		return n;
	});
	const [invalid, setInvalid] = useState(() => new Set(notices.flatMap((n) => (n.box ? Object.keys(n.box) : []))));
	const [toastText, setToastText] = useState('');
	const [prefs, setPrefsState] = useState(readPrefs);
	const [tabsPos, setTabsPos] = useTabsPosition(UNIQUE);
	const toastTimer = useRef(0);
	const top = useRef(null);
	const published = ['publish', 'future', 'private'].includes(status);
	const dirty = JSON.stringify({ title, values }) !== saved;
	const section = sections.find((s) => s.id === active) || sections[0];
	const stage = section.fields.some((f) => f.type === 'callback');
	const attrs = useMemo(() => liveAttrs(values, postId), [values, postId]);

	useEffect(() => () => clearTimeout(toastTimer.current), []);
	useEffect(() => {
		if (!sections.some((s) => s.id === active)) setActive(sections[0].id);
	}, [sections]);

	const setPrefs = (p) => {
		setPrefsState(p);
		try {
			localStorage.setItem(PREFS_KEY, JSON.stringify(p));
		} catch {
			// Blocked storage: kept for this visit.
		}
	};
	const onChange = (key, v) => {
		setValues((cur) => ({ ...cur, [key]: v }));
		if (note === 'saved') setNote('');
	};
	const onInitialView = (json) => {
		if (attrs.multiple) {
			const rows = Array.isArray(values.bp_3d_models) ? values.bp_3d_models : [];
			onChange('bp_3d_models', rows.map((r, i) => (i === 0 ? { ...r, initial_view: json } : r)));
		} else onChange('initial_view', json);
	};

	const showToast = (text) => {
		setToastText(text);
		clearTimeout(toastTimer.current);
		toastTimer.current = setTimeout(() => setToastText(''), 4000);
	};

	/** One save, the way post.php + Metabox::save() + ModelSource::save() handle it. */
	const save = (target) => {
		const was = status;
		const inPlace = published && target === 'publish';
		setBusy(target);
		setNote('');
		setTimeout(
			() => {
				const prev = store.get().viewers?.[postId];
				const old = prev?.meta || {};
				const box = {};
				const posted = String(values.bp_3d_source ?? '').trim();
				if (!pro && 'bp_3d_source' in values && posted && posted !== resolveSource(old).trim() && !isLibraryUrl(posted)) box.bp_3d_source = SOURCE_ERROR;
				// Free saves keep the Pro rows as stored (Viewer::preserveProData); locked rows never post.
				const data = { ...old };
				for (const key of editableIds(allFields, pro)) if (key in values) data[key] = values[key];
				const meta = writeThrough({ ...data, bp_3d_source: values.bp_3d_source }, old, pro);
				const now = nowStr();
				const next = target === 'draft' ? 'draft' : 'publish';
				store.patch(['viewers', postId], {
					...(prev || {}),
					id: postId,
					title,
					slug: slugify(slug) || prev?.slug || slugify(title) || postId,
					status: next,
					date: next === 'publish' && !['publish', 'future', 'private'].includes(was) ? now : prev?.date || now,
					modified: now,
					author: prev?.author || 'demo',
					isGutenberg: false,
					meta,
					attrs: metaToAttrs(meta, postId),
				});
				const fresh = formValues(sections, meta);
				setValues(fresh);
				setSaved(JSON.stringify({ title, values: fresh }));
				setStatus(next);
				setBusy('');
				setInvalid(new Set(Object.keys(box)));
				const errors = Object.keys(box).length ? [{ box }] : [];
				if (inPlace) {
					// Update in place: a toast, "Saved" by the button; a rejected field leaves its notice instead.
					setNotices(errors);
					if (errors.length) setNote('partly');
					else {
						setNote('saved');
						showToast(MESSAGES.updated);
					}
					return;
				}
				const list = [{ kind: 'success', text: next === 'draft' ? MESSAGES.draft : MESSAGES.published }, ...errors];
				if (id === 'new') {
					pending = { id: postId, list };
					go('v3d.edit.' + postId);
					return;
				}
				setNotices(list);
				top.current?.scrollIntoView?.({ block: 'start' });
			},
			inPlace ? 700 : 450
		);
	};

	const trash = (e) => {
		e.preventDefault();
		if (busy) return;
		const prev = store.get().viewers?.[postId];
		if (prev) {
			store.patch(['viewers', postId], { ...prev, status: 'trash', prevStatus: prev.status });
			queueListNotice({ kind: 'trash', ids: [postId] });
		}
		go('v3d.list');
	};

	const ctx = { pro, device, setDevice, media: openMedia, invalid };
	const sectionHasError = (s) => flat(s.fields).some((f) => invalid.has(f.id));
	const primary = published ? 'Update' : 'Publish';
	const secondary = published ? '' : 'Save Draft';
	const sidebar = tabsPos === 'left';

	const actions = dirty
		? html`<button type="button" class="bfields-btn bfields-btn--save" aria-disabled=${busy ? 'true' : undefined} aria-busy=${busy ? 'true' : undefined} onClick=${() => !busy && save(published ? 'publish' : 'draft')}>Save Change</button>`
		: null;

	const publish = html`<div class="bfields-publish">
		<button type="button" class="bfields-btn bfields-btn--primary ld-vm-publish" aria-disabled=${busy ? 'true' : undefined} aria-busy=${busy === 'publish' && published ? 'true' : undefined} onClick=${() => !busy && save('publish')}>
			${busy === 'publish' && published
				? html`<span class="bfields-btn__spinner" aria-hidden="true"></span><span aria-hidden="true">Updating…</span><span class="screen-reader-text">${primary}</span>`
				: html`<${BfIcon} name="send" size=${17} />${primary}`}
		</button>
		${note === 'saved' && html`<span class="bfields-publish__saved">Saved</span>`}
		${note === 'partly' && html`<button type="button" class="bfields-publish__unsaved" onClick=${() => top.current?.scrollIntoView?.({ block: 'start' })}>Partly saved — show message</button>`}
		${secondary && html`<button type="button" class="bfields-btn bfields-btn--ghost" aria-disabled=${busy ? 'true' : undefined} onClick=${() => !busy && save('draft')}>${secondary}</button>`}
		<${ShortcodeChip} id=${postId} place="side" />
		${id !== 'new' && status !== 'auto-draft' && html`<a class="bfields-publish__trash" href="#v3d.list" aria-disabled=${busy ? 'true' : undefined} onClick=${trash}>Move to Trash</a>`}
	</div>`;

	const rows = html`<${BfFields} fields=${section.fields} values=${values} onChange=${onChange} showIcons=${true} layout=${section.layout || 'rows'} ctx=${ctx} />`;

	return html`<${WpAdmin} current=${id === 'new' ? 'v3d-new' : 'v3d-list'} title=${id === 'new' ? 'Add New' : 'Edit 3D Viewer'}>
		<${ScreenOptions} prefs=${prefs} setPrefs=${setPrefs} />
		<div class="wrap ld-vm-wrap" ref=${top}>
			<h1 class="wp-heading-inline screen-reader-text">${id === 'new' ? 'Add New' : 'Edit 3D Viewer'}</h1>
			<hr class="wp-header-end" />
			<${Notices} list=${notices} onDismiss=${(i) => setNotices(notices.filter((_, j) => j !== i))} />
			<div class="bfields-root bfields-app ld-vm" style="--bfields-primary:#1b5cf0;--bfields-save:#1b5cf0;">
				<div class="bfields-editor-page">
					<div class="bfields-title-row">
						<h1 class="bfields-title">${status === 'auto-draft' ? 'Add New' : 'Edit 3D Viewer'}</h1>
						<${TabsSwitch} value=${tabsPos} onChange=${setTabsPos} />
					</div>
					<div class="bfields-title-field bfields-title-field--chip">
						<input class="bfields-title-input ld-vm-title" type="text" value=${title} placeholder="Add title" aria-label="Add title" spellcheck=${true} autocomplete="off" onInput=${(e) => (setTitle(e.currentTarget.value), note === 'saved' && setNote(''))} onKeyDown=${(e) => e.key === 'Enter' && e.preventDefault()} />
						<${ShortcodeChip} id=${postId} place="title" />
					</div>
					<div class=${cx('bfields-panel', sidebar && 'bfields-panel--sidebar')} style="margin-top:21px">
						<div class="bfields-tabs bfields-tabs--fixed bfields-tabs--sticky">
							<div class="bfields-tabs__list" role="tablist" aria-orientation=${sidebar ? 'vertical' : 'horizontal'}>
								${sections.map(
									(s) => html`<button key=${s.id} type="button" role="tab" aria-selected=${s.id === section.id} class=${cx('bfields-tab', s.id === section.id && 'bfields-tab--active')} data-tab=${s.id} onClick=${() => setActive(s.id)}>
										<span class="bfields-tab__label"><${BfIcon} name=${s.icon} size=${17} />${s.title}${sectionHasError(s) && html`<span class="bfields-tab__error" title="This tab has a field that was not saved." aria-label="This tab has a field that was not saved.">!</span>`}</span>
									</button>`
								)}
							</div>
						</div>
						<div class="bfields-editor bfields-editor--sticky">
							<div class="ld-vm-main">
								${stage
									? html`<${StageCard} title=${section.title} attrs=${attrs} device=${device} setDevice=${setDevice} pro=${pro} onInitialView=${onInitialView} actions=${actions} />`
									: html`${section.layout === 'cards' ? rows : html`<div class="bfields-card bfields-card--rows"><h3 class="bfields-section-title">3D Viewer Settings</h3>${rows}</div>`}
											${actions && html`<div class="bfields-editor__actions">${actions}</div>`}`}
							</div>
							<aside class=${cx('bfields-side', stage && 'bfields-side--stage')}>
								<div class="bfields-side__slot">
									<${SidePreview} attrs=${attrs} device=${device} setDevice=${setDevice} pro=${pro} onInitialView=${onInitialView} />
									<div class="misc-pub-section bp3d-admin-ui-row bp3d-admin-ui-row--side">
										3D Viewer interface: <strong>New</strong>${' '}
										<a href="#" class="bp3d-admin-ui-link" onClick=${(e) => (e.preventDefault(), toast('The Classic interface is not part of this demo. Both edit the same viewers.'))}>Switch to classic</a>
									</div>
								</div>
								${publish}
							</aside>
						</div>
					</div>
				</div>
				${toastText && html`<div class="bfields-toast" role="status" onClick=${() => setToastText('')}>${toastText}</div>`}
			</div>
			${prefs.slug &&
			html`<div id="poststuff" class="ld-vm-poststuff">
				<div id="slugdiv" class="postbox">
					<div class="postbox-header"><h2>Slug</h2></div>
					<div class="inside">
						<label class="screen-reader-text" for="post_name">Slug</label>
						<input name="post_name" type="text" class="large-text" id="post_name" value=${slug || slugify(title) || postId} onInput=${(e) => setSlug(e.currentTarget.value)} />
					</div>
				</div>
			</div>`}
			<${MediaHost} />
		</div>
	<//>`;
}
