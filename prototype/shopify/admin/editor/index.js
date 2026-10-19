// #admin.editor.<pid>[.<vid>]: the full-screen 3D editor inside <s-app-window> (the WooCommerce React editor, ported).
// Left: variants + parts. Centre: viewer. Right: inspector. Phones stack the viewer over a Parts / Inspector switch.
import { html, useState, useEffect, useRef, cx } from '../../../js/core/ui.js';
import { useStore } from '../../core/store.js';
import { go } from '../../core/router.js';
import { AppWindow, Badge, EmptyState, Icon, Modal } from '../../ui/polaris.js';
import { useEd, initEditor, isDirty, canUndo, canRedo, undo, redo, save, discard, getEd } from './state.js';
import { Sidebar } from './sidebar.js';
import { Viewport } from './viewport.js';
import { Inspector } from './inspector.js';
import { Seg } from './fields.js';

const isTextEntry = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

function useShortcuts() {
	useEffect(() => {
		const onKey = (e) => {
			if (!(e.metaKey || e.ctrlKey) || isTextEntry(e.target instanceof Element ? e.target : null)) return;
			const k = e.key.toLowerCase();
			if (k === 'z') {
				e.preventDefault();
				e.shiftKey ? redo() : undo();
			} else if (k === 'y') {
				e.preventDefault();
				redo();
			} else if (k === 's') {
				e.preventDefault();
				if (isDirty()) save();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);
}

/** Stand-in for the app window's leave confirmation: in-app links out of this editor are held while dirty. */
function useLeaveGuard(pid, onAsk) {
	useEffect(() => {
		const onClick = (e) => {
			if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
			if (!a) return;
			const token = a.getAttribute('href').slice(1);
			const self = `admin.editor.${pid}`;
			if (token === self || token.startsWith(self + '.') || !isDirty(getEd())) return;
			e.preventDefault();
			e.stopPropagation();
			onAsk(token);
		};
		document.addEventListener('click', onClick, true);
		return () => document.removeEventListener('click', onClick, true);
	}, [pid]);
}

function BarActions({ product, dirty, publishing }) {
	return html`
		<div class="ed-bar">
			<button type="button" class="ed-barbtn" title="Undo (Ctrl+Z)" aria-label="Undo" disabled=${!canUndo()} onClick=${undo}><${Icon} name="undo" size=${16} /></button>
			<button type="button" class="ed-barbtn" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled=${!canRedo()} onClick=${redo}><${Icon} name="redo" size=${16} /></button>
			<a class="ed-barbtn ed-barbtn--text" href=${`#store.product.${product.handle}`} title="Preview on store"><${Icon} name="external" size=${16} /><span>Preview on store</span></a>
			<button type="button" class="ed-barbtn ed-barbtn--primary" disabled=${!dirty || publishing} onClick=${save}>${publishing ? 'Saving…' : 'Save'}</button>
		</div>
	`;
}

function StatusChip({ dirty, publishing, published }) {
	if (publishing) return html`<span class="ed-status"><${Badge} tone="info">Publishing…<//></span>`;
	if (dirty) return html`<span class="ed-status"><${Badge} tone="attention">Unsaved changes<//></span>`;
	return html`<span class="ed-status"><${Badge} tone=${published ? 'success' : 'neutral'}>${published ? 'Published' : 'Not published'}<//></span>`;
}

function EditorApp({ product }) {
	const s = useStore();
	const ed = useEd();
	const [tab, setTab] = useState('parts');
	const [leaveTo, setLeaveTo] = useState(null);
	const [askDiscard, setAskDiscard] = useState(false);
	const dirty = isDirty(ed);
	const publishing = ed.phase === 'publishing';
	useShortcuts();
	useLeaveGuard(product.id, setLeaveTo);

	// Phones: tapping a part on the model jumps to the inspector.
	const lastSel = useRef(ed.selection);
	useEffect(() => {
		if (ed.selection && ed.selection !== lastSel.current && window.matchMedia('(max-width: 860px)').matches) setTab('inspect');
		lastSel.current = ed.selection;
	}, [ed.selection]);

	return html`
		<${AppWindow}
			title=${`Edit 3D · ${product.title}`}
			exitHref=${'#admin.product.' + product.id}
			badge=${html`<${StatusChip} dirty=${dirty} publishing=${publishing} published=${!!s.configs[product.id]?.publishedAt} />`}
			actions=${html`<${BarActions} product=${product} dirty=${dirty} publishing=${publishing} />`}
			class="ed-appwin"
		>
			<div class="ed">
				${dirty || publishing
					? html`<div class=${cx('ed-savebar', publishing && 'is-busy')} role="region" aria-label="Unsaved changes">
							<span class="ed-savebar__msg">
								${publishing
									? html`<span class="ed-spin" aria-hidden="true"></span> Publishing to storefront metafields…`
									: html`<${Icon} name="alert" size=${16} /> Unsaved changes<span class="ed-savebar__more"> · shoppers see the last published version</span>`}
							</span>
							${publishing
								? null
								: html`<div class="ed-savebar__actions">
										<button type="button" class="ed-savebar__discard" onClick=${() => setAskDiscard(true)}>Discard</button>
										<button type="button" class="ed-savebar__save" onClick=${save}>Save</button>
									</div>`}
						</div>`
					: null}
				<div class="ed-body" data-tab=${tab}>
					<aside class="ed-left" aria-label="Variants and parts"><${Sidebar} product=${product} /></aside>
					<main class="ed-center"><${Viewport} /></main>
					<div class="ed-mtabs">
						<${Seg}
							full
							label="Panel"
							value=${tab}
							options=${[
								{ value: 'parts', label: 'Parts', icon: 'layers' },
								{ value: 'inspect', label: 'Inspector', icon: 'settings' },
							]}
							onChange=${setTab}
						/>
					</div>
					<aside class="ed-right" aria-label="Inspector"><${Inspector} product=${product} /></aside>
				</div>
			</div>
			<${Modal}
				open=${leaveTo !== null}
				size="small"
				title="Leave without saving?"
				onClose=${() => setLeaveTo(null)}
				primaryAction=${{
					content: 'Leave without saving',
					destructive: true,
					onAction: () => {
						const to = leaveTo;
						setLeaveTo(null);
						discard();
						go(to);
					},
				}}
				secondaryActions=${[{ content: 'Keep editing', onAction: () => setLeaveTo(null) }]}
			>
				<p class="ed-p">Your changes to ${product.title} haven't been saved. If you leave, they're lost and shoppers keep seeing the published version.</p>
			<//>
			<${Modal}
				open=${askDiscard}
				size="small"
				title="Discard all unsaved changes?"
				onClose=${() => setAskDiscard(false)}
				primaryAction=${{ content: 'Discard changes', destructive: true, onAction: () => (discard(), setAskDiscard(false)) }}
				secondaryActions=${[{ content: 'Keep editing', onAction: () => setAskDiscard(false) }]}
			>
				<p class="ed-p">The editor goes back to the last saved version, for every variant.</p>
			<//>
		<//>
	`;
}

export default function EditorScreen({ params = [] }) {
	const pid = Number(params[0]) || 0;
	const vid = Number(params[1]) || 0;
	const product = useStore((s) => s.products[pid] || null);
	const initKey = useRef('');
	const key = `${pid}.${vid}`;
	// Initialised during render so no child ever sees another product's draft.
	if (product && initKey.current !== key) {
		initKey.current = key;
		initEditor(pid, vid);
	}
	if (!product) {
		return html`<${AppWindow} title="Edit 3D" exitHref="#admin.products">
			<div class="ed-missing"><${EmptyState} heading="Product not found" action=${{ content: 'Back to 3D products', href: '#admin.products' }}>This product may have been deleted.<//></div>
		<//>`;
	}
	return html`<${EditorApp} product=${product} />`;
}

