// TopBar (src/admin/editor/TopBar/*): brand · breadcrumbs · product links · save status ·
// undo/redo · reset · Save · theme. window.confirm is replaced by an in-page NativeDialog.
import { html, render, useState, useEffect, useLayoutEffect, useRef } from '../../../core/ui.js';
import { useStore } from '../../../core/store.js';
import { Icon, BrandLogo } from '../../../shared/icons.js';
import { IconButton } from '../../../shared/editor-ui.js';
import { editor, useEditor, variationLabel } from './editor-store.js';

const Divider = ({ cls = 'bg-slate-200 dark:bg-slate-800' }) => html`<span aria-hidden="true" class=${`w-px h-6 flex-shrink-0 ${cls}`}></span>`;

const Separator = ({ cls = '' }) => html`<${Icon} name="chevron-right" size=${14} class=${`wc3d-crumb-sep flex-shrink-0 ${cls}`} />`;

/** Renders children into a <body>-level node, above the editor's stacking context (like a native dialog). */
function BodyPortal({ children }) {
	const host = useRef(null);
	if (!host.current && typeof document !== 'undefined') host.current = document.createElement('div');
	useLayoutEffect(() => {
		document.body.appendChild(host.current);
		return () => {
			render(null, host.current);
			host.current.remove();
		};
	}, []);
	useLayoutEffect(() => {
		render(children, host.current);
	});
	return null;
}

/**
 * Stand-in for the browser's native confirm()/beforeunload dialog (hard rule: no window.confirm).
 * Inline styles only, so it looks the same in either editor theme.
 */
export function NativeDialog(props) {
	return html`<${BodyPortal}><${DialogBox} ...${props} /><//>`;
}

function DialogBox({ title, message, okLabel = 'OK', cancelLabel = 'Cancel', onOk, onCancel }) {
	const okRef = useRef(null);
	useEffect(() => {
		const prev = document.activeElement;
		okRef.current?.focus();
		const onKey = (e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				onCancel();
			}
		};
		window.addEventListener('keydown', onKey, true);
		return () => {
			window.removeEventListener('keydown', onKey, true);
			if (prev && prev.focus) prev.focus();
		};
	}, []);
	const btn = 'appearance:none;font:500 13px/1 system-ui,-apple-system,"Segoe UI",sans-serif;height:32px;padding:0 16px;border-radius:16px;cursor:pointer;';
	return html`<div style="position:fixed;inset:0;z-index:200000;background:rgba(0,0,0,.08);display:flex;justify-content:center;align-items:flex-start;padding:16px;box-sizing:border-box;" onClick=${(e) => e.target === e.currentTarget && onCancel()}>
		<div
			role="alertdialog"
			aria-modal="true"
			aria-label=${title}
			style="width:min(448px,100%);margin-top:8px;background:#fff;color:#1f1f1f;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.28);padding:20px 24px 18px;box-sizing:border-box;font:400 13px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;"
		>
			<div style="font-size:15px;font-weight:500;margin-bottom:10px;">${title}</div>
			<div style="white-space:pre-wrap;color:#3c4043;margin-bottom:22px;">${message}</div>
			<div style="display:flex;justify-content:flex-end;gap:8px;">
				<button type="button" style=${btn + 'background:#fff;color:#0b57d0;border:1px solid #c4c7c5;'} onClick=${onCancel}>${cancelLabel}</button>
				<button type="button" ref=${okRef} style=${btn + 'background:#0b57d0;color:#fff;border:1px solid #0b57d0;'} onClick=${onOk}>${okLabel}</button>
			</div>
		</div>
	</div>`;
}

function Brand() {
	return html`<div class="wc3d-tb-collapse-lg wc3d-tb-brand flex items-center gap-3 whitespace-nowrap">
		<${BrandLogo} class="flex-shrink-0 block" />
		<span class="wc3d-tb-label">3D Product Configurator</span>
	</div>`;
}

function Breadcrumbs({ productName }) {
	const { view, target } = useEditor((s) => ({ view: s.view, target: s.target }));
	const label = useStore((g) => (target !== 'default' ? variationLabel(g.variations?.[target] || { id: target }) : ''));
	const isOverview = view === 'overview';
	const openOverview = () => editor.setView('overview');
	const productsHide = isOverview ? 'wc3d-tb-hide-md' : 'wc3d-tb-hide-xl';
	return html`<nav class="wc3d-topbar-crumbs flex items-center gap-1.5 whitespace-nowrap max-md:overflow-hidden">
		<button type="button" onClick=${openOverview} class=${`wc3d-crumb flex-shrink-0 ${productsHide}`} disabled=${isOverview}>Products</button>
		<${Separator} cls=${productsHide} />
		<button
			type="button"
			onClick=${openOverview}
			class=${`wc3d-crumb truncate max-w-[240px] ${isOverview ? 'min-w-0 wc3d-crumb-current' : 'min-w-[4ch] shrink-[999]'}`}
			title=${productName}
		>
			${productName}
		</button>
		${!isOverview &&
		html`<${Separator} cls="wc3d-tb-hide-xl" />
			<button type="button" onClick=${openOverview} class="wc3d-crumb flex-shrink-0 wc3d-tb-hide-xl">Variations</button>
			<${Separator} />
			${target !== 'default'
				? html`<span class="wc3d-crumb-current min-w-0 truncate max-w-[160px]" title=${label}>${label}</span>`
				: html`<span class="wc3d-crumb-current flex-shrink-0">Default</span>`}`}
	</nav>`;
}

const DOT_CLASS = {
	dirty: 'bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.2)]',
	saving: 'bg-slate-400 wc3d-pulse',
	error: 'bg-[color:var(--wc3d-ui-off)] shadow-[0_0_0_3px_rgba(239,68,68,0.18)]',
	saved: 'bg-[color:var(--wc3d-ui-on)]',
};
const TEXT_CLASS = {
	dirty: 'text-[color:var(--wc3d-ui-warn-fg)]',
	saving: 'text-slate-500 dark:text-slate-400',
	error: 'text-[color:var(--wc3d-ui-danger-fg)]',
	saved: 'text-[color:var(--wc3d-ui-success-fg)]',
};

function SaveStatus() {
	const { status, saveError, dirty, dirtyCount } = useEditor((s) => ({ status: s.status, saveError: s.saveError, dirty: s.dirty, dirtyCount: s.dirtyCount }));
	let st = 'saved';
	let text = 'All changes saved';
	if (status === 'saving') {
		st = 'saving';
		text = 'Saving…';
	} else if (status === 'error') {
		st = 'error';
		text = saveError || 'Save failed';
	} else if (dirty) {
		st = 'dirty';
		text = dirtyCount > 1 ? `Unsaved changes in ${dirtyCount} configurations` : 'Unsaved changes';
	}
	return html`<span class=${'wc3d-tb-collapse-sm inline-flex items-center gap-2 text-[12.5px] font-medium whitespace-nowrap ' + TEXT_CLASS[st]} title=${text}>
		<span class=${'w-2 h-2 flex-shrink-0 rounded-full ' + DOT_CLASS[st]}></span>
		<span class="wc3d-tb-label">${text}</span>
	</span>`;
}

function HistoryControls() {
	const { canUndo, canRedo } = useEditor((s) => ({ canUndo: s.canUndo, canRedo: s.canRedo }));
	return html`<div class="wc3d-switchbox">
		<${IconButton} label="Undo" title="Undo (Ctrl+Z / Cmd+Z)" icon=${html`<${Icon} name="undo" size=${14} style="display:block" />`} onClick=${() => editor.undo()} disabled=${!canUndo} />
		<${IconButton} label="Redo" title="Redo (Ctrl+Y / Cmd+Shift+Z)" icon=${html`<${Icon} name="redo" size=${14} style="display:block" />`} onClick=${() => editor.redo()} disabled=${!canRedo} />
	</div>`;
}

const RESET_DEFAULT_MSG = 'Reset the default configuration? All mesh overrides, material edits, and the environment will be cleared. You will need to click Save to persist the reset.';
const RESET_VARIATION_MSG = 'Reset this variation? All overrides will be removed and the variation will use the default config.';

function ResetButton() {
	const isDefault = useEditor((s) => s.target === 'default');
	const [asking, setAsking] = useState(false);
	return html`<button
			type="button"
			onClick=${() => setAsking(true)}
			class="wc3d-btn wc3d-btn-danger wc3d-tb-collapse-sm"
			title=${isDefault ? 'Clear all mesh, material, and environment changes (save to persist)' : 'Remove all overrides for this variation'}
		>
			<${Icon} name="reset" size=${14} />
			<span class="wc3d-tb-label">${isDefault ? 'Reset default' : 'Reset variation'}</span>
		</button>
		${asking &&
		html`<${NativeDialog}
			title="This page says"
			message=${isDefault ? RESET_DEFAULT_MSG : RESET_VARIATION_MSG}
			onOk=${() => {
				setAsking(false);
				editor.resetTarget();
			}}
			onCancel=${() => setAsking(false)}
		/>`}`;
}

function SaveButton() {
	const { status, dirty } = useEditor((s) => ({ status: s.status, dirty: s.dirty }));
	const saving = status === 'saving';
	const canSave = dirty || status === 'error';
	return html`<button type="button" onClick=${() => editor.save()} disabled=${saving || !canSave} class="wc3d-btn wc3d-btn-save">
		<${Icon} name="save" size=${15} />
		${saving ? 'Saving…' : 'Save changes'}
	</button>`;
}

function ThemeSwitcher({ theme, onChange }) {
	return html`<div role="radiogroup" aria-label="Theme" class="wc3d-switchbox">
		<button type="button" role="radio" aria-checked=${theme === 'light'} onClick=${() => onChange('light')} title="Light theme">
			<${Icon} name="sun" size=${15} />
			<span class="sr-only">Light</span>
		</button>
		<button type="button" role="radio" aria-checked=${theme === 'dark'} onClick=${() => onChange('dark')} title="Dark theme">
			<${Icon} name="moon" size=${15} />
			<span class="sr-only">Dark</span>
		</button>
	</div>`;
}

/** <TopBar product theme onThemeChange ready /> */
export function TopBar({ product, theme, onThemeChange, ready }) {
	const isOverview = useEditor((s) => s.view === 'overview');
	const viewUrl = product?.slug ? `#store.product.${product.slug}` : '';
	const editUrl = product ? `#admin.product.${product.id}` : '';
	return html`<header class="wc3d-topbar flex-shrink-0 sticky top-0 z-50 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
		<div class=${'wc3d-topbar-inner max-md:overflow-x-auto' + (isOverview ? '' : ' is-editor')}>
			<${Brand} />
			<${Divider} />
			<${Breadcrumbs} productName=${product?.name || ''} />
			${viewUrl &&
			html`<a href=${viewUrl} target="_blank" rel="noreferrer" class="wc3d-btn wc3d-btn-ghost wc3d-tb-collapse-md" title="Open the public product page in a new tab">
				<${Icon} name="eye" size=${14} />
				<span class="wc3d-tb-label">View Product</span>
			</a>`}
			${editUrl &&
			html`<a href=${editUrl} class="wc3d-btn wc3d-btn-ghost wc3d-tb-collapse-md" title="Open the WooCommerce product editor">
				<${Icon} name="edit" size=${14} />
				<span class="wc3d-tb-label">Edit Product</span>
			</a>`}
			${(viewUrl || editUrl) && html`<${Divider} />`}
			${ready && html`<${SaveStatus} />`}
			${ready && !isOverview && html`<${HistoryControls} /><${ResetButton} />`}
			${ready && html`<${SaveButton} />`}
			<${ThemeSwitcher} theme=${theme} onChange=${onThemeChange} />
		</div>
	</header>`;
}

export default TopBar;
