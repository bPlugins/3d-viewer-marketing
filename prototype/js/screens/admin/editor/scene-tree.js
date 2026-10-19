// Left panel (Editor.tsx LeftPanel, ResizableSidebar, SceneTree): context header, mesh tree with
// tri-state visibility checkboxes and frontend indicators, animations list, variant summary card.
import { html, useState, useEffect, useRef, useMemo, useCallback } from '../../../core/ui.js';
import { useStore } from '../../../core/store.js';
import { Icon } from '../../../shared/icons.js';
import { Checkbox, EYEBROW_CLASS, HELP_CLASS, useId } from '../../../shared/editor-ui.js';
import { CLIP_DURATIONS } from '../../../engine/demo-models.js';
import { editor, useEditor, variationLabel, variationAttributeName } from './editor-store.js';
import { VariationTabs } from './variation-tabs.js';

// ── ResizableSidebar ──────────────────────────────────────────────────────────

const MIN_WIDTH = 200;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 260;
const STORAGE_KEY = 'wc3d-left-sidebar-width';
const KEY_STEP = 16;

function readStoredWidth() {
	let stored = NaN;
	try {
		stored = Number(localStorage.getItem(STORAGE_KEY));
	} catch {
		// Storage blocked: default width.
	}
	return Number.isFinite(stored) && stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : DEFAULT_WIDTH;
}

function storeWidth(w) {
	try {
		localStorage.setItem(STORAGE_KEY, String(w));
	} catch {
		// ignore
	}
}

export function ResizableSidebar({ children }) {
	const [width, setWidth] = useState(readStoredWidth);
	const [dragging, setDragging] = useState(false);
	const widthRef = useRef(width);
	const panelId = useId();

	const apply = (next) => {
		const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next));
		widthRef.current = clamped;
		setWidth(clamped);
	};

	const onPointerDown = (e) => {
		e.preventDefault();
		const startX = e.clientX;
		const startWidth = widthRef.current;
		const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
		setDragging(true);
		const onMove = (ev) => apply(startWidth + (rtl ? startX - ev.clientX : ev.clientX - startX));
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			setDragging(false);
			storeWidth(widthRef.current);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	};

	const onKeyDown = (e) => {
		const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP;
		const targets = { ArrowLeft: widthRef.current - step, ArrowRight: widthRef.current + step, Home: MIN_WIDTH, End: MAX_WIDTH, Enter: DEFAULT_WIDTH };
		if (!(e.key in targets)) return;
		e.preventDefault();
		apply(targets[e.key]);
		storeWidth(widthRef.current);
	};

	return html`
		<aside
			id=${panelId}
			style=${{ width: `${width}px` }}
			class="flex-shrink-0 max-w-[40%] max-md:!w-full max-md:max-w-none max-md:max-h-[45vh] max-md:border-b flex flex-col box-border bg-white border-e border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-y-auto wc3d-scroll"
		>
			${children}
		</aside>
		<div
			role="separator"
			aria-orientation="vertical"
			aria-controls=${panelId}
			aria-label="Resize sidebar"
			aria-valuenow=${width}
			aria-valuemin=${MIN_WIDTH}
			aria-valuemax=${MAX_WIDTH}
			tabindex="0"
			onPointerDown=${onPointerDown}
			onKeyDown=${onKeyDown}
			onDblClick=${() => apply(DEFAULT_WIDTH)}
			title="Drag to resize · double-click to reset"
			class="wc3d-splitter group relative z-10 w-0 flex-shrink-0 cursor-col-resize select-none max-md:hidden"
		>
			<span class="absolute inset-y-0 -left-1.5 -right-1.5"></span>
			<span
				aria-hidden="true"
				class=${`wc3d-splitter__line absolute inset-y-0 -left-[2px] w-[3px] bg-brand-500 transition-opacity group-hover:opacity-45 pointer-events-none ${dragging ? 'opacity-100' : 'opacity-0'}`}
			></span>
		</div>
	`;
}

// ── Tree index ────────────────────────────────────────────────────────────────

function buildIndex(nodes) {
	const parentMap = new Map();
	let meshCount = 0;
	const build = (node, depth, key, parent) => {
		if (parent && !parentMap.has(node.name)) parentMap.set(node.name, parent);
		if (node.mesh) meshCount++;
		const children = [];
		const subtree = node.mesh ? [node.mesh] : [];
		(node.children || []).forEach((child, i) => {
			const entry = build(child, depth + 1, `${key}/${i}`, node.name);
			if (!entry) return;
			children.push(entry);
			subtree.push(...entry.subtree);
		});
		if (!subtree.length) return null;
		return { node, key, depth, meshes: node.mesh ? [node.mesh] : subtree, subtree, hasChildren: (node.children || []).length > 0, children };
	};
	const roots = [];
	nodes.forEach((n, i) => {
		const e = build(n, 0, String(i), null);
		if (e) roots.push(e);
	});
	return { roots, meshCount, parentMap };
}

const toTri = (visible, total) => (visible === total ? 'all' : visible === 0 ? 'none' : 'some');

function computeTri(roots, cfg) {
	const out = new Map();
	const walk = (entry) => {
		const own = entry.node.mesh && cfg?.[entry.node.mesh]?.visible !== false ? 1 : 0;
		let visible = own;
		for (const c of entry.children) visible += walk(c);
		out.set(entry.key, entry.node.mesh ? toTri(own, 1) : toTri(visible, entry.subtree.length));
		return visible;
	};
	roots.forEach(walk);
	return out;
}

const activateOnKey = (e, fn) => {
	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		fn();
	}
};

const CARET_CLASS =
	'inline-flex items-center justify-center w-4 h-4 flex-shrink-0 rounded cursor-pointer text-[color:var(--wc3d-ui-desc)] hover:text-[color:var(--wc3d-ui-title)]';

function NodeRow({ entry, tri, isSelected, isCollapsed, isToggleable, isCustomizable, isCustomized, onToggleCollapse, onSelect, onToggleVisible }) {
	const { node, depth, hasChildren } = entry;
	const isMesh = !!node.mesh;
	const rowRef = useRef(null);
	useEffect(() => {
		if (isSelected && rowRef.current) rowRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}, [isSelected]);
	const select = () => onSelect(entry);
	const toggleCollapse = () => onToggleCollapse(node.name);
	const anyHidden = tri !== 'all';
	const rowClasses =
		'group flex items-center gap-2 h-8 pe-2 rounded-md text-[12.5px] cursor-default select-none w-max min-w-full transition-colors duration-150 ' +
		(isSelected ? 'bg-[var(--wc3d-ui-strip)] text-[color:var(--wc3d-ui-primary)] font-semibold' : 'text-[color:var(--wc3d-ui-title)] hover:bg-[var(--wc3d-ui-tile)]');
	return html`<div ref=${rowRef} class=${rowClasses} style=${{ paddingInlineStart: `${6 + depth * 18}px` }}>
		${hasChildren
			? html`<span
					role="button"
					tabindex="0"
					aria-expanded=${!isCollapsed}
					aria-label=${isCollapsed ? 'Expand' : 'Collapse'}
					class=${CARET_CLASS}
					onClick=${(e) => {
						e.stopPropagation();
						toggleCollapse();
					}}
					onKeyDown=${(e) => activateOnKey(e, toggleCollapse)}
				>
					<${Icon} name="chevron-down" size=${12} class=${`transition-transform duration-150 ${isCollapsed ? '-rotate-90 rtl:rotate-90' : ''}`} />
				</span>`
			: html`<span class="inline-flex w-4 h-4 flex-shrink-0 pointer-events-none" aria-hidden="true"></span>`}
		<${Checkbox}
			checked=${tri === 'all'}
			indeterminate=${tri === 'some'}
			onChange=${() => onToggleVisible(entry.meshes, tri !== 'all')}
			onClick=${(e) => e.stopPropagation()}
			title=${tri === 'all' ? 'Hide' : 'Show'}
			aria-label=${tri === 'all' ? `Hide ${node.name}` : `Show ${node.name}`}
		/>
		<span class=${'inline-flex w-4 justify-center flex-shrink-0 ' + (isMesh || isSelected ? 'text-[color:var(--wc3d-ui-primary)]' : 'text-[color:var(--wc3d-ui-desc)]')} aria-hidden="true">
			<${Icon} name=${isMesh ? 'mesh-node' : 'folder'} size=${14} />
		</span>
		<span
			role="button"
			tabindex="0"
			aria-pressed=${isSelected}
			class=${'flex-none whitespace-nowrap cursor-pointer rounded ' + (anyHidden ? 'text-[color:var(--wc3d-ui-placeholder)]' : '')}
			onClick=${select}
			onKeyDown=${(e) => activateOnKey(e, select)}
		>
			${node.name}
		</span>
		<div class="flex items-center gap-1.5 ms-1 flex-shrink-0">
			${isToggleable && html`<span class="inline-flex" title="Toggleable on Frontend"><${Icon} name="toggle" size=${13} class="text-[color:var(--wc3d-ui-on)]" /></span>`}
			${isCustomizable && html`<span class="inline-flex" title="Customizable on Frontend"><${Icon} name="palette-bubble" size=${13} class="text-amber-500 dark:text-amber-400" /></span>`}
			${isCustomized && html`<span class="inline-flex" title="Custom style applied"><${Icon} name="brush" size=${13} class="text-[color:var(--wc3d-ui-primary)]" /></span>`}
		</div>
	</div>`;
}

// ── SceneTree ─────────────────────────────────────────────────────────────────

const SECTION_RULE = 'border-b border-[color:var(--wc3d-ui-rule)]';

export function SceneTree() {
	const [collapsed, setCollapsed] = useState(() => new Set());
	const { selection, selectionName, selectionIsGroup, modelInfo, meshesCfg } = useEditor((s) => ({
		selection: s.selection,
		selectionName: s.selectionName,
		selectionIsGroup: s.selectionIsGroup,
		modelInfo: s.modelInfo,
		meshesCfg: editor.raw().meshes,
	}));

	// Runtime hierarchy from the loaded model, else a flat list from the parsed mesh names.
	const nodes = useMemo(() => {
		if (modelInfo?.hierarchy?.length) return modelInfo.hierarchy;
		return (modelInfo?.meshes || []).map((m) => ({ name: m, mesh: m }));
	}, [modelInfo]);
	const index = useMemo(() => buildIndex(nodes), [nodes]);
	const triMap = useMemo(() => computeTri(index.roots, meshesCfg), [index, meshesCfg]);

	const onToggleCollapse = useCallback((name) => {
		setCollapsed((prev) => {
			const next = new Set(prev);
			next.has(name) ? next.delete(name) : next.add(name);
			return next;
		});
	}, []);
	const onSelect = useCallback((entry) => editor.select(entry.meshes, { name: entry.node.name, isGroup: !entry.node.mesh }), []);
	const onToggleVisible = useCallback((meshes, visible) => editor.patchMeshes(meshes, { visible }), []);

	// Expand every collapsed ancestor of the selection (also for viewport clicks).
	useEffect(() => {
		if (!selectionName) return;
		setCollapsed((prev) => {
			const next = new Set(prev);
			const seen = new Set();
			let changed = false;
			let cur = index.parentMap.get(selectionName);
			while (cur && !seen.has(cur)) {
				seen.add(cur);
				if (next.delete(cur)) changed = true;
				cur = index.parentMap.get(cur);
			}
			return changed ? next : prev;
		});
	}, [selection, selectionName, index]);

	if (!nodes.length) {
		return html`<div class=${`px-4 py-4 ${SECTION_RULE}`}>
			<div class=${`${EYEBROW_CLASS} mb-1.5`}>Mesh tree</div>
			<p class=${`${HELP_CLASS} m-0`}>No scene loaded.</p>
		</div>`;
	}

	const rows = [];
	const pushRows = (entries) => {
		for (const entry of entries) {
			const { node } = entry;
			const own = node.mesh ? meshesCfg?.[node.mesh] : undefined;
			const isCollapsed = collapsed.has(node.name);
			const isSelected = selectionName === node.name && selectionIsGroup === !node.mesh;
			rows.push(html`<${NodeRow}
				key=${entry.key}
				entry=${entry}
				tri=${triMap.get(entry.key) ?? 'all'}
				isSelected=${isSelected}
				isCollapsed=${isCollapsed}
				isToggleable=${own?.optional === true}
				isCustomizable=${own?.customizable === true}
				isCustomized=${!!own?.color || !!own?.texture}
				onToggleCollapse=${onToggleCollapse}
				onSelect=${onSelect}
				onToggleVisible=${onToggleVisible}
			/>`);
			if (!isCollapsed) pushRows(entry.children);
		}
	};
	pushRows(index.roots);

	const clips = modelInfo?.clips?.length ? modelInfo.clips : (modelInfo?.animations || []).map((name) => ({ name, duration: CLIP_DURATIONS[name] || 0 }));
	const count = index.meshCount;

	return html`<div class=${`px-3 py-3 ${SECTION_RULE}`}>
		<div class="flex items-center justify-between gap-2 px-1 mb-2">
			<span class=${EYEBROW_CLASS}>Mesh tree</span>
			<span class="wc3d-badge" title=${count === 1 ? `${count} mesh` : `${count} meshes`}>${count}</span>
		</div>
		<div class="flex flex-col gap-px overflow-x-auto">${rows}</div>
		${clips.length > 0 &&
		html`<div class=${`${EYEBROW_CLASS} mt-4 mb-1.5 px-1`}>Animations</div>
			<div class="flex flex-col gap-px">
				${clips.map(
					(a) => html`<div key=${a.name} class="flex items-center gap-2 h-7 px-1.5 text-[12px] text-[color:var(--wc3d-ui-text-2)]">
						<${Icon} name="play" size=${10} class="flex-shrink-0 text-[color:var(--wc3d-ui-desc)]" />
						<span class="truncate">${a.name}</span>
						${a.duration ? html`<span class="ms-auto flex-shrink-0 font-mono text-[11px] text-[color:var(--wc3d-ui-desc)]">(${Number(a.duration).toFixed(1)}s)</span>` : null}
					</div>`
				)}
			</div>`}
	</div>`;
}

// ── LeftPanel ─────────────────────────────────────────────────────────────────

export function LeftPanel() {
	const target = useEditor((s) => s.target);
	const isDefault = target === 'default';
	const variation = useStore((g) => (isDefault ? null : g.variations?.[target] || { id: target, attributes: {} }));
	const label = variation ? variationLabel(variation) : '';
	const attributeName = variation ? variationAttributeName(variation) : '';
	return html`<${ResizableSidebar}>
		<div class="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
			<div class="flex items-center gap-1.5 mb-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
				<span class="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-brand-500"></span>
				${isDefault ? 'Editing default' : 'Editing variant'}
			</div>
			<div class="flex items-center justify-between gap-2">
				<span class="min-w-0 text-[14px] font-semibold text-[color:var(--wc3d-ui-title)] truncate" title=${isDefault ? 'Default configuration' : label}>${isDefault ? 'Default' : label}</span>
				${attributeName && html`<span class="wc3d-badge wc3d-badge-brand flex-shrink-0">${attributeName}</span>`}
			</div>
		</div>
		<${SceneTree} />
		<${VariationTabs} variationLabel=${label} canReturn=${true} />
	<//>`;
}

export default LeftPanel;
