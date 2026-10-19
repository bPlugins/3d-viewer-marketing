// #admin.editor.<productId>[.<variationId>] — the full-screen 3D editor (EditorPage.php + Editor.tsx).
// Route params pick the product and, optionally, a variation to open straight in the editor view.
import { html, useState, useEffect, useRef } from '../../../core/ui.js';
import { useStore } from '../../../core/store.js';
import { go } from '../../../core/router.js';
import { Icon } from '../../../shared/icons.js';
import { Notice } from '../../../shared/admin-ui.js';
import { WpAdmin } from '../chrome.js';
import { editor, useEditor } from './editor-store.js';
import { TopBar, NativeDialog } from './topbar.js';
import { LeftPanel } from './scene-tree.js';
import { CenterPanel } from './viewport.js';
import { Inspector } from './inspector.js';
import { VariationsOverview } from './overview.js';

// ── Theme (theme/useTheme.ts) ─────────────────────────────────────────────────

const THEME_KEY = 'wc3d-theme';
function readTheme() {
	try {
		const t = localStorage.getItem(THEME_KEY);
		if (t === 'dark' || t === 'light') return t;
	} catch {
		// Storage blocked: light.
	}
	return 'light';
}
function useTheme() {
	const [theme, setTheme] = useState(readTheme);
	useEffect(() => {
		try {
			localStorage.setItem(THEME_KEY, theme);
		} catch {
			// ignore
		}
		document.documentElement.style.colorScheme = theme;
	}, [theme]);
	useEffect(() => () => (document.documentElement.style.colorScheme = ''), []);
	return [theme, setTheme];
}

// ── Shortcuts (hooks/useUndoShortcuts.ts) ─────────────────────────────────────

const isTextEntry = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

function useUndoShortcuts(enabled) {
	useEffect(() => {
		if (!enabled) return undefined;
		const onKey = (e) => {
			if (!(e.metaKey || e.ctrlKey) || isTextEntry(e.target instanceof Element ? e.target : null)) return;
			const key = e.key.toLowerCase();
			if (key === 'z') {
				e.preventDefault();
				e.shiftKey ? editor.redo() : editor.undo();
			} else if (key === 'y') {
				e.preventDefault();
				editor.redo();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [enabled]);
}

/**
 * beforeunload stand-in: in wp-admin, leaving with unsaved changes shows the browser's
 * "Leave site?" prompt. Here, in-app links that leave this product's editor are intercepted.
 */
function useLeaveGuard(productId, onAsk) {
	useEffect(() => {
		const onClick = (e) => {
			if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
			if (!a || a.target === '_blank') return;
			const href = a.getAttribute('href') || '';
			if (!href.startsWith('#')) return;
			const token = href.slice(1);
			const self = `admin.editor.${productId}`;
			if (token === self || token.startsWith(self + '.')) return;
			if (!editor.get().dirty) return;
			e.preventDefault();
			onAsk(token);
		};
		document.addEventListener('click', onClick, true);
		return () => document.removeEventListener('click', onClick, true);
	}, [productId]);
}

// ── Screens ───────────────────────────────────────────────────────────────────

function BootstrapScreen() {
	return html`<div class="flex flex-1 items-center justify-center p-8 overflow-y-auto">
		<div role="status" class="wc3d-card flex items-center gap-3 px-5 py-4 text-[13px] font-medium text-slate-500 dark:text-slate-400">
			<span class="wc3d-icon-tile wc3d-icon-tile-brand wc3d-pulse"><${Icon} name="cube" size=${15} /></span>
			Loading configuration…
		</div>
	</div>`;
}

const EditorWorkspace = () => html`<div class="flex flex-1 min-h-0 overflow-hidden max-md:flex-col max-md:overflow-y-auto">
	<${LeftPanel} />
	<${CenterPanel} />
	<${Inspector} />
</div>`;

function EditorApp({ product }) {
	const [theme, setTheme] = useTheme();
	const { loadStatus, view } = useEditor((s) => ({ loadStatus: s.loadStatus, view: s.view }));
	const ready = loadStatus === 'ready';
	const [leaveTo, setLeaveTo] = useState(null);
	useUndoShortcuts(ready && view === 'editor');
	useLeaveGuard(product.id, setLeaveTo);

	// .dark goes on .wc3d-app; Tailwind's dark: variants match descendants, so layout lives on a child.
	return html`<div class=${'wc3d-app' + (theme === 'dark' ? ' dark' : '')}>
		<div class="flex flex-col h-full overflow-hidden bg-slate-50 text-[color:var(--wc3d-ui-title)] dark:bg-slate-950 text-[13px] leading-[1.45] font-sans antialiased">
			<${TopBar} product=${product} theme=${theme} onThemeChange=${setTheme} ready=${ready} />
			${!ready && html`<${BootstrapScreen} />`}
			${ready && view === 'overview' && html`<${VariationsOverview} product=${product} />`}
			${ready && view === 'editor' && html`<${EditorWorkspace} />`}
		</div>
		${leaveTo !== null &&
		html`<${NativeDialog}
			title="Leave site?"
			message="Changes that you made may not be saved."
			okLabel="Leave"
			onOk=${() => {
				const to = leaveTo;
				setLeaveTo(null);
				editor.discard();
				go(to);
			}}
			onCancel=${() => setLeaveTo(null)}
		/>`}
	</div>`;
}

export default function EditorScreen({ params = [] }) {
	const productId = Number(params[0]) || 0;
	const variationId = Number(params[1]) || 0;
	const product = useStore((s) => s.products?.[productId] || null);
	const initKey = useRef('');

	// One editor session per product: unsaved edits survive leaving and coming back.
	// Initialised during the first render so no child ever sees another product's state.
	const key = `${productId}.${variationId}`;
	if (product && initKey.current !== key) {
		initKey.current = key;
		editor.init(productId);
		// Like a page load in wp-admin, every product (simple too) lands on the overview.
		if (variationId && product.variations?.includes(variationId)) editor.openTarget(variationId);
		else editor.setView('overview');
	}

	if (!product) {
		return html`<${WpAdmin} current="wc3d-models" title="3D Models">
			<div class="wrap"><p style="margin:24px 0;font-size:14px;">Product not found.</p></div>
		<//>`;
	}

	const needsSetup = product.meta?._wc3d_enabled !== 'yes' || !(Number(product.meta?._wc3d_model_id) > 0);
	return html`<${WpAdmin} current="wc3d-models" title="3D Models" fullscreen>
		<div class="wrap wc3d-editor-wrap">
			${needsSetup &&
			html`<${Notice} type="warning" inline>
				<p>
					3D viewer is not yet enabled for this product. Enable it and pick a GLB model on the product edit page first.
					${' '}<a href=${`#admin.product.${product.id}`}>Go to product editor</a>
				</p>
			<//>`}
			<div id="wc3d-editor-root" class="wc3d-editor-root"><${EditorApp} product=${product} /></div>
		</div>
	<//>`;
}
