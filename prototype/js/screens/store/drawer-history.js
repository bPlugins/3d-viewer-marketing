// undo-redo-drawer: shopper undo/redo over the whole `custom` layer (specs/undo-redo-drawer.md).
import { html, useState, useEffect, useRef, useCallback } from '../../core/ui.js';
import { Icon } from '../../shared/icons.js';
import { useFeature } from '../../core/features.js';
import { groupsOf, isEmptyCustom } from '../../shared/options.js';

export const HISTORY_LIMIT = 50;
export const COALESCE_MS = 400;

const words = (s) => String(s).replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const json = (v) => JSON.stringify(v ?? null);
const norm = (c) => (isEmptyCustom(c) ? null : c);
const keyOf = (c) => json(norm(c));

const LABELERS = {};

/** Name the steps of another feature's `custom` key: registerHistoryLabel('decals', (before, after, ctx) => 'Text'). */
export function registerHistoryLabel(key, fn) {
	LABELERS[key] = fn;
}

const ITEM_LABELS = {
	materials: (part, before, after) => (after === undefined ? `Reset ${part} color` : `${part} color`),
	meshes: (part, before, after) => (after === undefined ? `Reset ${part}` : after?.visible === false ? `Hide ${part}` : `Show ${part}`),
};

/** What changed between two layers: { key (for coalescing, null = never), label } or null when nothing did. */
export function describeChange(before, after, ctx = {}) {
	const items = [];
	const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
	for (const k of keys) {
		const a = before?.[k];
		const b = after?.[k];
		if (json(a) === json(b)) continue;
		if (k === 'materials' || k === 'meshes' || k === 'options') {
			for (const n of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
				if (json(a?.[n]) === json(b?.[n])) continue;
				const label = k === 'options' ? groupsOf(ctx.config).find((g) => g.id === n)?.label || words(n) : ITEM_LABELS[k](words(n), a?.[n], b?.[n]);
				items.push({ key: `${k}.${n}`, label });
			}
		} else {
			items.push({ key: k, label: LABELERS[k]?.(a, b, ctx) || words(k) });
		}
	}
	if (!items.length) return null;
	return items.length === 1 ? items[0] : { key: null, label: `${items.length} changes` };
}

const isMac = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
const NON_TEXT = new Set(['checkbox', 'radio', 'color', 'range', 'button', 'submit', 'reset', 'file', 'image']);
const isTextField = (el) => !!el && (el.isContentEditable || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !NON_TEXT.has((el.type || 'text').toLowerCase())));

/**
 * useDrawerHistory({ show, custom, setCustom, config, resetKey, rootRef })
 * → { on, set(next, {label, merge}), undo, redo, canUndo, canRedo, undoLabel, redoLabel, said }.
 * With the flag off `set` is `setCustom` itself and nothing else happens.
 */
export function useDrawerHistory({ show, custom, setCustom, config, resetKey, rootRef }) {
	const on = useFeature('undo-redo-drawer') && !!show;
	const [, rerender] = useState(0);
	const [said, setSaid] = useState('');
	const h = useRef(null);
	if (!h.current) h.current = { past: [], future: [], lastKey: null, lastAt: 0, expected: keyOf(custom), value: norm(custom), own: new Set() };
	const live = useRef({});
	live.current = { custom, setCustom, config, on };

	const clear = () => {
		const st = h.current;
		const had = st.past.length || st.future.length;
		Object.assign(st, { past: [], future: [], lastKey: null, lastAt: 0, expected: keyOf(live.current.custom), value: norm(live.current.custom), own: new Set() });
		if (had) rerender((n) => n + 1);
	};
	const current = () => (keyOf(live.current.custom) === h.current.expected ? norm(live.current.custom) : h.current.value);

	// The layer changed without a step (mount clear, variation bridge, another screen): history no longer applies.
	// Layers we wrote that are still rendering (fast picker drags outrun the effects) are not outside changes.
	const now = keyOf(custom);
	useEffect(() => {
		const st = h.current;
		if (now === st.expected) st.own.clear();
		else if (!st.own.has(now)) clear();
	}, [now]);
	const first = useRef(true);
	useEffect(() => {
		if (first.current) return void (first.current = false);
		clear();
	}, [resetKey]);

	const set = useCallback((next, opts = {}) => {
		const st = h.current;
		const cur = current();
		const after = norm(next);
		const change = live.current.on ? describeChange(cur, after, { config: live.current.config }) : null;
		if (change) {
			const t = performance.now();
			// Steps merge only on the same item and label, so typing in a labelled field is one step but Reset never joins a pick.
			const key = change.key === null ? null : opts.label ? `${change.key}|${opts.label}` : change.key;
			const merge = st.past.length > 0 && (opts.merge || (key !== null && key === st.lastKey && t - st.lastAt < COALESCE_MS));
			if (!merge) st.past = [...st.past, { value: cur, label: opts.label || change.label }].slice(-HISTORY_LIMIT);
			// A drag that ends where its step started leaves no step behind.
			const back = merge && !opts.merge && json(st.past[st.past.length - 1].value) === json(after);
			if (back) st.past = st.past.slice(0, -1);
			st.future = [];
			st.lastKey = back ? null : key;
			st.lastAt = t;
			rerender((n) => n + 1);
		}
		st.expected = json(after);
		st.value = after;
		st.own.add(st.expected);
		live.current.setCustom(next);
	}, []);

	const step = (dir) => {
		const st = h.current;
		const from = dir === 'undo' ? st.past : st.future;
		if (!from.length) return;
		const cur = current();
		const entry = dir === 'undo' ? from[from.length - 1] : from[0];
		if (dir === 'undo') {
			st.past = st.past.slice(0, -1);
			st.future = [{ value: cur, label: entry.label }, ...st.future];
		} else {
			st.future = st.future.slice(1);
			st.past = [...st.past, { value: cur, label: entry.label }].slice(-HISTORY_LIMIT);
		}
		st.lastKey = null;
		st.expected = json(entry.value);
		st.value = entry.value;
		st.own.add(st.expected);
		live.current.setCustom(entry.value);
		setSaid(`${dir === 'undo' ? 'Undone' : 'Redone'}: ${entry.label}`);
	};
	const undo = useCallback(() => step('undo'), []);
	const redo = useCallback(() => step('redo'), []);

	// Shortcuts while focus is inside the viewer; clicking the canvas focuses the wrapper.
	useEffect(() => {
		const el = rootRef?.current;
		if (!on || !el) return;
		el.setAttribute('tabindex', '-1');
		el.setAttribute('data-wc3d-history', '');
		const onKey = (e) => {
			if (!(e.ctrlKey || e.metaKey) || e.altKey || isTextField(e.target)) return;
			const k = (e.key || '').toLowerCase();
			const isRedo = (k === 'z' && e.shiftKey) || (k === 'y' && e.ctrlKey && !e.shiftKey);
			if (k !== 'z' && !isRedo) return;
			e.preventDefault();
			e.stopPropagation();
			isRedo ? step('redo') : step('undo');
		};
		let t = 0;
		const onDown = () => {
			clearTimeout(t);
			t = setTimeout(() => el.isConnected && !el.contains(document.activeElement) && el.focus({ preventScroll: true }), 0);
		};
		el.addEventListener('keydown', onKey);
		el.addEventListener('pointerdown', onDown);
		return () => {
			clearTimeout(t);
			el.removeEventListener('keydown', onKey);
			el.removeEventListener('pointerdown', onDown);
			el.removeAttribute('tabindex');
			el.removeAttribute('data-wc3d-history');
		};
	}, [on]);

	const st = h.current;
	return {
		on,
		set: on ? set : setCustom,
		undo,
		redo,
		canUndo: on && st.past.length > 0,
		canRedo: on && st.future.length > 0,
		undoLabel: st.past[st.past.length - 1]?.label || '',
		redoLabel: st.future[0]?.label || '',
		said,
	};
}

/** Undo / Redo icon buttons for the drawer footer, plus the screen-reader announcement. */
export function DrawerHistoryButtons({ history: hs }) {
	const mac = isMac();
	const undoTip = hs.canUndo ? `Undo: ${hs.undoLabel} (${mac ? '⌘Z' : 'Ctrl+Z'})` : 'Nothing to undo';
	const redoTip = hs.canRedo ? `Redo: ${hs.redoLabel} (${mac ? '⇧⌘Z' : 'Ctrl+Shift+Z'})` : 'Nothing to redo';
	return html`
		<button type="button" class="wc3d-customer-drawer__history-btn" aria-label="Undo" aria-disabled=${hs.canUndo ? undefined : 'true'} title=${undoTip} onClick=${() => hs.canUndo && hs.undo()}>
			<${Icon} name="sf-undo" />
		</button>
		<button type="button" class="wc3d-customer-drawer__history-btn" aria-label="Redo" aria-disabled=${hs.canRedo ? undefined : 'true'} title=${redoTip} onClick=${() => hs.canRedo && hs.redo()}>
			<${Icon} name="sf-redo" />
		</button>
		<span class="wc3d-customer-drawer__history-live" aria-live="polite">${hs.said}</span>
	`;
}
