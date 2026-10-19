// Block editor for one bp3d-model-viewer post made in it (post.php?action=edit / post-new.php), fullscreen like
// WordPress's own: the CPT is locked to the b3dviewer/modelviewer block (template_lock: all), so the
// inserter is off. The plugin relabels "Publish" to "Save" (PostTypeModelViewer::changePublishButtonText).
import { html, useState, useEffect, useRef, useCallback, cx } from '../../js/core/ui.js';
import { store, useStore } from '../../js/core/store.js';
import { go } from '../../js/core/router.js';
import { WpAdmin } from '../../js/screens/admin/chrome.js';
import { nowStr, longDate } from '../../js/screens/admin/products.js';
import { useIsPro } from '../core/plan.js';
import { toast } from '../core/bus.js';
import { viewerAttrs } from './attrs.js';
import { ViewerBlock, currentModel, hotspotsOf, getView } from './render.js';
import { Ico } from './editor-controls.js';
import { MediaHost, openMedia } from './editor-media.js';
import { SettingsTab } from './panels/settings.js';
import { StyleTab, AdditionalPanel, UpgradePanel } from './panels/style.js';
import { copyText, shortcodeOf, queueListNotice } from './list.js';
import { isBlockPost } from './meta.js';
import ModernEditor from './modern-edit.js';

const LOGO = new URL('../img/brand/3d-viewer-logo.svg', import.meta.url).href;
const narrowNow = () => typeof matchMedia === 'function' && matchMedia('(max-width: 782px)').matches;

const WP = {
	plus: 'M11 12.5V17.5H12.5V12.5H17.5V11H12.5V6H11V11H6V12.5H11Z',
	undo: 'M18.3 11.7c-.6-.6-1.4-.9-2.3-.9H6.7l2.9-3.3-1.1-1-4.5 5L8.5 16l1-1-2.7-3H16c.5 0 .9.2 1.3.5 1 1 1 3.4 1 4.5v.3h1.5v-.2c0-1.5 0-4.3-1.5-5.7z',
	redo: 'M15.6 6.5l-1.1 1 2.9 3.3H8c-.9 0-1.7.3-2.3.9-1.4 1.5-1.4 4.2-1.4 5.6v.2h1.5v-.3c0-1.1 0-3.5 1-4.5.3-.3.7-.5 1.3-.5h9.2L14.5 15l1.1 1.1 4.6-4.6-4.6-5z',
	list: 'M3 6h11v1.5H3V6Zm3.5 5.5h11V13h-11v-1.5ZM21 17H10v1.5h11V17Z',
	sidebar: 'M18 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-4 14.5H6c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h8v13zm4.5-.5c0 .3-.2.5-.5.5h-2.5v-13H18c.3 0 .5.2.5.5v12z',
	close: 'M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.5 6.7 1 1 6.5-6.6 6.5 6.6 1-1z',
	desktop: 'M20.5 16h-.7V8c0-1.1-.9-2-2-2H6.2c-1.1 0-2 .9-2 2v8h-.7c-.8 0-1.5.7-1.5 1.5h20c0-.8-.7-1.5-1.5-1.5zM5.7 8c0-.3.2-.5.5-.5h11.6c.3 0 .5.2.5.5v7.6H5.7V8z',
	tablet: 'M17 4H7c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H7c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h10c.3 0 .5.2.5.5v12zm-7.5-.5h4V16h-4v1.5z',
	mobile: 'M15 4H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H9c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h6c.3 0 .5.2.5.5v12zm-4.5-.5h2V16h-2v1.5z',
	external: 'M19.5 4.5h-7V6h4.44l-5.97 5.97 1.06 1.06L18 7.06v4.44h1.5v-7Zm-13 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3H17v3a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h3V5.5h-3Z',
	check: 'M16.7 7.1l-6.3 8.5-3.3-2.5-.9 1.2 4.5 3.4L17.9 8z',
	chevron: 'M10.6 6L9.4 7l4.6 5-4.6 5 1.2 1 5.4-6z',
	trash: 'M12 5.5A2.25 2.25 0 0 0 9.878 7h4.244A2.251 2.251 0 0 0 12 5.5ZM12 4a3.751 3.751 0 0 0-3.675 3H5v1.5h1.27l.818 8.997a2.75 2.75 0 0 0 2.739 2.501h4.347a2.75 2.75 0 0 0 2.738-2.5L17.73 8.5H19V7h-3.325A3.751 3.751 0 0 0 12 4Zm4.224 4.5H7.776l.806 8.861a1.25 1.25 0 0 0 1.245 1.137h4.347a1.25 1.25 0 0 0 1.245-1.137l.805-8.861Z',
	more: 'M13 19h-2v-2h2v2zm0-6h-2v-2h2v2zm0-6h-2V5h2v2z',
};
const W = ({ d, size = 24 }) => html`<svg width=${size} height=${size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d=${d} /></svg>`;
const wLogo = html`<svg width="36" height="36" viewBox="0 0 80 80" aria-hidden="true" focusable="false"><path fill="currentColor" d="M40 8C22.4 8 8 22.4 8 40s14.4 32 32 32 32-14.4 32-32S57.6 8 40 8zM11.2 40c0-4.2.9-8.1 2.5-11.7l13.7 37.6C17.8 61.2 11.2 51.4 11.2 40zm28.8 28.8c-2.8 0-5.6-.4-8.1-1.2l8.6-25.1 8.9 24.3c.1.1.1.3.2.4-3 1-6.2 1.6-9.6 1.6zm4-42.3c1.7-.1 3.3-.3 3.3-.3 1.5-.2 1.4-2.5-.2-2.4 0 0-4.7.4-7.7.4-2.8 0-7.6-.4-7.6-.4-1.6-.1-1.7 2.3-.2 2.4 0 0 1.5.2 3 .3l4.5 12.3-6.3 18.9-10.5-31.2c1.7-.1 3.3-.3 3.3-.3 1.5-.2 1.4-2.5-.2-2.4 0 0-4.7.4-7.7.4-.5 0-1.2 0-1.9-.1C19.5 16.6 29.1 11.2 40 11.2c8.1 0 15.5 3.1 21.1 8.2-.1 0-.3 0-.4 0-3 0-5.2 2.7-5.2 5.5 0 2.5 1.5 4.7 3 7.2 1.2 2 2.5 4.6 2.5 8.3 0 2.6-1 5.6-2.3 9.7l-3 10.1L44 26.5zm10.6 38.7l8.8-25.4c1.6-4.1 2.2-7.4 2.2-10.3 0-1.1-.1-2-.2-3 2.3 4.1 3.5 8.8 3.5 13.8 0 10.6-5.8 19.9-14.3 24.9z" /></svg>`;

const DEVICES = [
	['desktop', 'Desktop'],
	['tablet', 'Tablet'],
	['mobile', 'Mobile'],
];
const OPEN = { model: true, lighting: false, ar: false, texture: false, options: false, mobile: false, controls: false, dimensions: false, hotspots: true, style: true, additional: false };

export default function EditViewer({ params }) {
	const id = params?.[0] || 'new';
	const stored = useStore((s) => s.viewers?.[id]);
	const gutenberg = useStore((s) => !!s.lv?.settings?.gutenberg_enabled);
	if (id !== 'new' && (!stored || stored.status === 'trash')) {
		return html`<${WpAdmin} current="v3d-list" title="Edit 3D Viewer">
			<div class="wrap ld-be-missing">
				<p>${stored ? 'You cannot edit this item because it is in the Trash. Please restore it and try again.' : 'You attempted to edit an item that doesn’t exist. Perhaps it was deleted?'}</p>
				<p><a href="#v3d.list">Back to All 3D Viewers</a></p>
			</div>
		<//>`;
	}
	// PostTypeModelViewer::useBlockEditorForPost(): the block editor only for posts made in it, or for a new
	// post while Settings → Enable Gutenberg is on; every other post opens the Modern meta box screen.
	if (id === 'new' ? !gutenberg : !isBlockPost(stored)) return html`<${ModernEditor} key=${id} id=${id} stored=${stored} />`;
	return html`<${Editor} key=${id} id=${id} stored=${stored} />`;
}

function useHistory(initial) {
	const [doc, setDoc] = useState(initial);
	const past = useRef([]);
	const future = useRef([]);
	const last = useRef({ at: 0, key: '' });
	const [, bump] = useState(0);
	// Typing in one field within a second is one undo step, like the block editor.
	const update = (fn, key = '') => {
		setDoc((cur) => {
			const next = fn(cur);
			const now = Date.now();
			if (!(key && last.current.key === key && now - last.current.at < 1000)) past.current = [...past.current.slice(-79), cur];
			last.current = { at: now, key };
			future.current = [];
			return next;
		});
		bump((n) => n + 1);
	};
	const undo = () => {
		if (!past.current.length) return;
		setDoc((cur) => {
			future.current = [cur, ...future.current];
			const prev = past.current[past.current.length - 1];
			past.current = past.current.slice(0, -1);
			return prev;
		});
		last.current = { at: 0, key: '' };
		bump((n) => n + 1);
	};
	const redo = () => {
		if (!future.current.length) return;
		setDoc((cur) => {
			past.current = [...past.current, cur];
			const next = future.current[0];
			future.current = future.current.slice(1);
			return next;
		});
		bump((n) => n + 1);
	};
	return { doc, update, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}

/** WordPress previews the unsaved edits: hand them to #store.viewer.<id>.preview (store/viewer-page.js). */
function storePreview(id, doc) {
	try {
		localStorage.setItem('bp3d-live-demo-preview', JSON.stringify({ id, title: doc.title, attrs: doc.attrs }));
	} catch {
		// Without storage the preview falls back to the last saved version.
	}
}

function Editor({ id, stored }) {
	const pro = useIsPro();
	const [postId] = useState(() => (id === 'new' ? String(store.nextId('viewers')) : id));
	const [status, setStatus] = useState(stored?.status || 'auto-draft');
	const h = useHistory(() => ({ title: stored?.title || '', attrs: structuredClone(stored?.attrs || viewerAttrs()) }));
	const { doc } = h;
	const a = doc.attrs;
	const [saved, setSaved] = useState(() => JSON.stringify({ title: stored?.title || '', attrs: stored?.attrs || viewerAttrs() }));
	const dirty = JSON.stringify(doc) !== saved;
	const [saving, setSaving] = useState('');
	const [justSaved, setJustSaved] = useState(false);

	const [selected, setSelected] = useState(true);
	const [sidebar, setSidebar] = useState(() => !narrowNow());
	const [sideTab, setSideTab] = useState('block');
	const [inspTab, setInspTab] = useState('settings');
	const [listView, setListView] = useState(false);
	const [device, setDevice] = useState('desktop');
	const [previewMenu, setPreviewMenu] = useState(false);
	const [statusMenu, setStatusMenu] = useState(false);
	const [open, setOpen] = useState(OPEN);
	const [index, setIndex] = useState(0);
	const [placing, setPlacing] = useState(false);
	const [info, setInfo] = useState({ animations: [], variants: [], materials: [], size: null });
	const [copied, setCopied] = useState(false);
	const viewerRef = useRef(null);
	const sideRef = useRef(null);

	const set = (patch, key) => h.update((d) => ({ ...d, attrs: { ...d.attrs, ...patch } }), key);
	// Single model: the block keeps it on `model`; models[0] mirrors URL/poster for older readers.
	const setModel = (patch, key) =>
		h.update((d) => {
			const cur = currentModel(d.attrs, 0, false);
			const model = { ...cur, ...patch };
			const out = { ...d.attrs, model };
			if (!d.attrs.multiple && ('modelUrl' in patch || 'poster' in patch)) {
				const first = { ...(d.attrs.models?.[0] || { useDecoder: 'none' }), modelUrl: model.modelUrl || '', poster: model.poster || '' };
				out.models = [first, ...(d.attrs.models || []).slice(1)];
			}
			return { ...d, attrs: out };
		}, key);
	const setTitle = (title) => h.update((d) => ({ ...d, title }), 'title');

	const multiple = !!a.multiple && pro;
	const m = currentModel(a, index, pro);
	const hasModel = !!m.modelUrl || (multiple && a.models.some((x) => x.modelUrl));
	useEffect(() => setPlacing(false), [pro, index]);

	const save = (target) => {
		const was = status;
		setSaving(target === 'publish' ? 'publish' : 'draft');
		setTimeout(() => {
			const now = nowStr();
			const prev = store.get().viewers?.[postId];
			const rec = {
				id: postId,
				title: doc.title,
				status: target,
				date: target === 'publish' && was !== 'publish' ? now : prev?.date || now,
				modified: now,
				author: prev?.author || 'demo',
				attrs: doc.attrs,
				isGutenberg: true,
			};
			store.patch(['viewers', postId], rec);
			setStatus(target);
			setSaved(JSON.stringify({ title: doc.title, attrs: doc.attrs }));
			setSaving('');
			setJustSaved(target !== 'publish');
			toast(target === 'publish' ? (was === 'publish' ? 'Post updated.' : 'Post published.') : was === 'publish' ? 'Post reverted to draft.' : 'Draft saved.');
			if (id === 'new') {
				try {
					history.replaceState(null, '', '#v3d.edit.' + postId);
				} catch {
					// The address bar keeps #v3d.edit.new; the post is saved either way.
				}
			}
		}, 450);
	};
	useEffect(() => dirty && setJustSaved(false), [dirty]);

	const trash = () => {
		const prev = store.get().viewers?.[postId];
		if (prev) {
			store.patch(['viewers', postId], { ...prev, status: 'trash', prevStatus: prev.status });
			queueListNotice({ kind: 'trash', ids: [postId] });
		}
		go('v3d.list');
	};

	useEffect(() => {
		const onKey = (e) => {
			const mod = e.metaKey || e.ctrlKey;
			if (mod && e.key.toLowerCase() === 's') {
				e.preventDefault();
				save(status === 'publish' ? 'publish' : 'draft');
			} else if (mod && e.key.toLowerCase() === 'z' && !e.target.closest?.('input, textarea, select')) {
				e.preventDefault();
				e.shiftKey ? h.redo() : h.undo();
			} else if (e.key === 'Escape') {
				setPlacing(false);
				setPreviewMenu(false);
				setStatusMenu(false);
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});

	const toggle = (panel, v) => setOpen((o) => ({ ...o, [panel]: v }));
	const showHotspots = () => {
		setInspTab('settings');
		setOpen((o) => ({ ...o, hotspots: true }));
		setTimeout(() => sideRef.current?.querySelector('[data-panel="hotspots"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
	};
	const media = (type, cb) => openMedia({ type, onSelect: cb });
	const ctx = {
		pro,
		index,
		setIndex,
		info,
		media,
		placing,
		// On phones the settings panel covers the canvas, so close it to let the model be clicked.
		setPlacing: (v) => (setPlacing(v), v && setSelected(true), v && narrowNow() && setSidebar(false)),
		open,
		toggle,
		device,
		setDevice,
		showHotspots,
		copy: (t) => (copyText(t), toast('Copied')),
	};
	const props = { a, set, setModel, ctx };

	const onPlace = useCallback(
		(spot) => {
			h.update((d) => {
				const attrs = d.attrs;
				if (attrs.multiple && pro) return { ...d, attrs: { ...attrs, models: attrs.models.map((x, i) => (i === index ? { ...x, hotspots: [...(x.hotspots || []), spot] } : x)) } };
				const cur = currentModel(attrs, 0, false);
				return { ...d, attrs: { ...attrs, model: { ...cur, hotspots: [...hotspotsOf(attrs, cur), spot] } } };
			});
			setPlacing(false);
		},
		[index, pro]
	);

	const setInitialView = (view) => {
		if (multiple) set({ models: a.models.map((x, i) => (i === index ? { ...x, initialView: view } : x)) });
		else setModel({ initialView: view });
	};
	const seeInitial = () => {
		const el = viewerRef.current;
		const v = m.initialView;
		if (!el || !v) return;
		if (v.orbit) el.cameraOrbit = v.orbit;
		if (v.target) el.cameraTarget = v.target;
		if (v.fov) el.fieldOfView = v.fov;
	};

	const copyShortcode = () => {
		copyText(shortcodeOf(postId));
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	const select = () => {
		setSelected(true);
		setSideTab('block');
	};
	const published = status === 'publish';
	const publishLabel = saving === 'publish' ? (published ? 'Saving…' : 'Publishing…') : 'Save';

	return html`<div class=${cx('ld-be', sidebar && 'has-sidebar', listView && 'has-listview')}>
		<header class="ld-be-header" role="region" aria-label="Editor top bar">
			<a class="ld-be-wlogo" href="#v3d.list" aria-label="View Posts" title="View Posts">${wLogo}<span class="ld-be-wlogo__back"><${W} d=${WP.chevron} /></span></a>
			<div class="ld-be-tools" role="toolbar" aria-label="Document tools">
				<button type="button" class="ld-be-tb ld-be-inserter" aria-label="Block Inserter" title="Block Inserter: this post type is locked to the Model Viewer block" aria-disabled="true" onClick=${() => toast('This 3D Viewer is locked to one Model Viewer block, so the inserter is off.')}><${W} d=${WP.plus} /></button>
				<button type="button" class="ld-be-tb is-hide-sm" aria-label="Undo" title="Undo" aria-disabled=${!h.canUndo} disabled=${!h.canUndo} onClick=${h.undo}><${W} d=${WP.undo} /></button>
				<button type="button" class="ld-be-tb is-hide-sm" aria-label="Redo" title="Redo" aria-disabled=${!h.canRedo} disabled=${!h.canRedo} onClick=${h.redo}><${W} d=${WP.redo} /></button>
				<button type="button" class=${cx('ld-be-tb', 'is-hide-sm', listView && 'is-pressed')} aria-label="Document Overview" title="Document Overview" aria-pressed=${listView} onClick=${() => setListView(!listView)}><${W} d=${WP.list} /></button>
			</div>
			<div class="ld-be-docbar">
				<button type="button" class="ld-be-docbar__btn" onClick=${() => document.querySelector('.ld-be-title')?.focus()}>
					<span class="ld-be-docbar__title">${doc.title || 'No title'}</span><span class="ld-be-docbar__type">· 3D Viewer</span>
				</button>
			</div>
			<div class="ld-be-actions">
				${!published &&
				html`<button type="button" class="ld-be-savedraft" disabled=${!!saving || (justSaved && !dirty)} onClick=${() => save('draft')}>
					${saving === 'draft' ? 'Saving…' : justSaved && !dirty ? html`<${W} d=${WP.check} /> Saved` : 'Save draft'}
				</button>`}
				<div class="ld-be-drop is-hide-xs">
					<button type="button" class=${cx('ld-be-tb', previewMenu && 'is-pressed')} aria-label="View" title="View" aria-expanded=${previewMenu} onClick=${() => setPreviewMenu(!previewMenu)}><${W} d=${WP[device]} /></button>
					${previewMenu &&
					html`<div class="ld-be-pop ld-be-pop--right" role="menu">
						${DEVICES.map(([d, l]) => html`<button type="button" key=${d} role="menuitemradio" aria-checked=${device === d} class=${cx('ld-be-pop__item', device === d && 'is-active')} onClick=${() => (setDevice(d), setPreviewMenu(false))}>${l}${device === d && html`<${W} d=${WP.check} />`}</button>`)}
						<hr />
						<a class="ld-be-pop__item" role="menuitem" href=${'#store.viewer.' + postId + '.preview'} target="_blank" rel="noopener" onClick=${() => (setPreviewMenu(false), storePreview(postId, doc))}>Preview in new tab <${W} d=${WP.external} /></a>
					</div>`}
				</div>
				<button type="button" class="components-button is-primary ld-be-publish" aria-disabled=${published && !dirty} disabled=${!!saving || (published && !dirty)} onClick=${() => save('publish')}>${publishLabel}</button>
				<button type="button" class=${cx('ld-be-tb', sidebar && 'is-pressed')} aria-label="Settings" title="Settings" aria-pressed=${sidebar} onClick=${() => setSidebar(!sidebar)}><${W} d=${WP.sidebar} /></button>
			</div>
		</header>

		<div class="ld-be-body">
			${listView &&
			html`<aside class="ld-be-listview" aria-label="Document Overview">
				<div class="ld-be-listview__head">
					<span class="is-active">List View</span>
					<button type="button" class="ld-be-tb" aria-label="Close" onClick=${() => setListView(false)}><${W} d=${WP.close} /></button>
				</div>
				<button type="button" class=${cx('ld-be-listview__item', selected && 'is-selected')} onClick=${select}><img src=${LOGO} alt="" width="18" height="18" /> Model Viewer</button>
			</aside>`}

			<div class=${cx('ld-be-canvas', 'is-' + device)} onClick=${(e) => e.target === e.currentTarget && setSelected(false)}>
				<div class="ld-be-frame" onClick=${(e) => (e.target === e.currentTarget || e.target.classList.contains('editor-styles-wrapper')) && setSelected(false)}>
					<div class="editor-styles-wrapper">
						<div class="ld-be-titlewrap">
							<textarea class="ld-be-title wp-block-post-title" rows="1" placeholder="Add title" aria-label="Add title" value=${doc.title} onFocus=${() => setSelected(false)} onInput=${(e) => setTitle(e.currentTarget.value.replace(/\n/g, ''))}></textarea>
						</div>
						<div class=${cx('ld-be-block', 'wp-block', selected && 'is-selected', placing && 'is-placing')} data-type="b3dviewer/modelviewer" onClick=${select}>
							${selected &&
							html`<div class="ld-be-blocktb" role="toolbar" aria-label="Block tools">
								<span class="ld-be-blocktb__type" title="Model Viewer"><img src=${LOGO} alt="Model Viewer" width="20" height="20" /></span>
							</div>`}
							${!selected && hasModel && html`<div class="modelViewerIsSelected"></div>`}
							${hasModel
								? html`<${ViewerBlock}
										attrs=${a}
										device=${device}
										editor=${true}
										elRef=${viewerRef}
										index=${index}
										onIndex=${setIndex}
										placing=${placing}
										onPlace=${onPlace}
										onInfo=${setInfo}
									>
										<div class="setDefaultViewContainer" onClick=${(e) => e.stopPropagation()}>
											<button type="button" class="button button-primary button-bplugins" disabled=${!pro} onClick=${() => setInitialView(getView(viewerRef.current))}>Set Current as Initial View${pro ? '' : ' - Pro'}</button>
											${pro &&
											m.initialView &&
											html`<button type="button" class="button button-primary button-bplugins" onClick=${seeInitial}>See Initial View</button>
												<button type="button" class="button button-primary button-bplugins" onClick=${() => setInitialView(null)}>Remove Initial View</button>`}
										</div>
									<//>`
								: html`<${Upload3d} multiple=${multiple} onCommit=${(url) => (select(), multiple ? set({ models: a.models.map((x, i) => (i === index ? { ...x, modelUrl: url } : x)) }) : setModel({ modelUrl: url }))} />`}
							${placing && html`<div class="ld-be-placing" role="status">Click on the model in the preview to add a hotspot. <button type="button" class="ld-be-link" onClick=${(e) => (e.stopPropagation(), setPlacing(false))}>Cancel</button></div>`}
						</div>
					</div>
				</div>
			</div>

			${sidebar &&
			html`<aside class="ld-be-sidebar" aria-label="Editor settings" ref=${sideRef}>
				<div class="ld-be-sidebar__head" role="tablist">
					<button type="button" role="tab" class=${cx('ld-be-sidetab', sideTab === 'post' && 'is-active')} aria-selected=${sideTab === 'post'} onClick=${() => setSideTab('post')}>3D Viewer</button>
					<button type="button" role="tab" class=${cx('ld-be-sidetab', sideTab === 'block' && 'is-active')} aria-selected=${sideTab === 'block'} onClick=${() => setSideTab('block')}>Block</button>
					<button type="button" class="ld-be-tb ld-be-sidebar__close" aria-label="Close Settings" onClick=${() => setSidebar(false)}><${W} d=${WP.close} /></button>
				</div>
				<div class="ld-be-sidebar__body">
					${sideTab === 'post'
						? html`<${PostPanel} title=${doc.title} status=${status} stored=${stored} saved=${store.get().viewers?.[postId]} statusMenu=${statusMenu} setStatusMenu=${setStatusMenu} onStatus=${(s) => (setStatusMenu(false), save(s))} onTrash=${trash} canTrash=${!!store.get().viewers?.[postId]} />`
						: !selected
							? html`<p class="ld-be-noblock">No block selected.</p>`
							: html`<div class="block-editor-block-card">
										<span class="block-editor-block-icon"><img src=${LOGO} alt="" width="24" height="24" /></span>
										<div class="block-editor-block-card__content"><h2 class="block-editor-block-card__title">Model Viewer</h2></div>
									</div>
									${hasModel &&
									html`<div class="b3dviewer-inspector">
										<div class="components-panel__body is-opened ld-be-shortcode">
											<div class="components-panel__row">
												<div class="b3dviewer_front_shortcode justify-center">
													<button type="button" class="components-button is-primary" title=${copied ? 'Copied' : ''} onClick=${copyShortcode}>${copied ? 'Copied' : 'Copy Shortcode'}</button>
												</div>
											</div>
										</div>
										<div class="b3dviewer-tab-panel bPlTabPanel">
											<div role="tablist" aria-orientation="horizontal" class="components-tab-panel__tabs">
												${[['settings', 'Settings'], ['style', 'Style']].map(([t, l]) => html`<button type="button" role="tab" key=${t} class=${cx('components-tab-panel__tabs-item', t, inspTab === t && 'active activeTab')} aria-selected=${inspTab === t} onClick=${() => setInspTab(t)}>${l}</button>`)}
											</div>
											<div role="tabpanel" class="components-tab-panel__tab-content">${inspTab === 'settings' ? html`<${SettingsTab} ...${props} />` : html`<${StyleTab} ...${props} />`}</div>
										</div>
										<${AdditionalPanel} ...${props} />
										${!pro && html`<${UpgradePanel} />`}
									</div>`}`}
				</div>
			</aside>`}
		</div>

		<footer class="ld-be-footer" aria-label="Editor footer">
			<ul class="ld-be-crumbs">
				<li><button type="button" class="ld-be-link" onClick=${() => setSelected(false)}>3D Viewer</button></li>
				${selected && html`<li><${W} d=${WP.chevron} size=${18} /> Model Viewer</li>`}
			</ul>
		</footer>
		<${MediaHost} />
	</div>`;
}

/** The empty block (Edit.tsx .upload3d): paste a URL or open the media modal. */
function Upload3d({ multiple, onCommit }) {
	const [draft, setDraft] = useState('');
	const commit = () => draft.trim() && onCommit(draft.trim());
	return html`<div class="upload3d">
		<div class="upload3d__icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#146ef5" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5 3.5 7v10l8.5 4.5 8.5-4.5V7zM3.5 7 12 11.5 20.5 7M12 11.5v10" /></svg></div>
		<h2>${multiple ? 'Upload a 3D Model' : 'Add Your 3D Model'}</h2>
		<p class="upload3d__hint">Paste a model URL or upload a file to get started.</p>
		<div class="bPlInlineMediaUpload">
			<input type="text" class="components-text-control__input" placeholder="Model URL" aria-label="Model URL" value=${draft} onInput=${(e) => setDraft(e.currentTarget.value)} onBlur=${commit} onKeyDown=${(e) => e.key === 'Enter' && (e.preventDefault(), commit())} onClick=${(e) => e.stopPropagation()} />
			<button type="button" class="ld-be-upload" aria-label="Select or upload a 3D model" onClick=${(e) => (e.stopPropagation(), openMedia({ type: 'model', onSelect: onCommit }))}><${Ico} name="upload" size=${18} /></button>
		</div>
	</div>`;
}

/** The "3D Viewer" (post) tab: post card, status, publish date, author, Move to trash. */
function PostPanel({ title, status, saved, statusMenu, setStatusMenu, onStatus, onTrash, canTrash }) {
	const published = status === 'publish';
	return html`<div class="ld-be-post">
		<div class="block-editor-block-card">
			<span class="block-editor-block-icon"><img src=${LOGO} alt="" width="24" height="24" /></span>
			<div class="block-editor-block-card__content">
				<h2 class="block-editor-block-card__title">${title || 'No title'}</h2>
				<span class="block-editor-block-card__description">${saved?.modified ? `Last edited ${longDate(saved.modified)}.` : 'Not saved yet.'}</span>
			</div>
		</div>
		<div class="ld-be-postbody">
			<div class="ld-be-summary">
				<div class="ld-be-summary__row">
					<span>Status</span>
					<div class="ld-be-drop">
						<button type="button" class="ld-be-link is-strong" aria-expanded=${statusMenu} onClick=${() => setStatusMenu(!statusMenu)}>${published ? 'Published' : 'Draft'}</button>
						${statusMenu &&
						html`<div class="ld-be-pop ld-be-pop--right" role="radiogroup" aria-label="Status">
							<p class="ld-be-pop__title">Status</p>
							${[['draft', 'Draft', 'Not ready to publish.'], ['publish', 'Published', 'Visible to everyone.']].map(
								([v, l, d]) => html`<label key=${v} class="ld-be-pop__radio"><input type="radio" name="ld-be-status" checked=${(published ? 'publish' : 'draft') === v} onChange=${() => onStatus(v)} /> <span><strong>${l}</strong><small>${d}</small></span></label>`
							)}
						</div>`}
					</div>
				</div>
				<div class="ld-be-summary__row"><span>Publish</span><span>${published && saved?.date ? longDate(saved.date) : 'Immediately'}</span></div>
				<div class="ld-be-summary__row"><span>Author</span><span>demo</span></div>
			</div>
			${canTrash && html`<button type="button" class="components-button is-destructive ld-be-trash" onClick=${onTrash}><${W} d=${WP.trash} /> Move to trash</button>`}
		</div>
	</div>`;
}
