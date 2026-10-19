// Planned (flag conditional-logic): drawer side of option-group conditions. The "server" maths
// live in shared/options.js (resolveGroups); this only filters what the drawer lists and announces changes.
import { html, useState, useEffect, useRef } from '../../core/ui.js';
import { useFeature } from '../../core/features.js';
import { groupsOf, resolveGroups } from '../../shared/options.js';

/** "%s is not available with this selection. Using %s." */
export function droppedNote(drop) {
	if (!drop?.picked) return '';
	const head = `${drop.picked.label} is not available with this selection.`;
	return drop.used ? `${head} Using ${drop.used.label}.` : head;
}

function snapshotOf(config, r) {
	const snap = new Map();
	for (const g of groupsOf(config)) {
		snap.set(g.id, { label: g.label, shown: !r.hidden.has(g.id), choices: new Map((r.available[g.id] || []).map((c) => [c.id, c.label])) });
	}
	return snap;
}

/** Sentences for what appeared or went away between two passes. */
function changes(before, after) {
	const out = [];
	for (const [gid, now] of after) {
		const was = before.get(gid);
		if (!was) continue;
		if (was.shown !== now.shown) {
			out.push(`${now.label} is now ${now.shown ? 'shown' : 'hidden'}.`);
			continue;
		}
		if (!now.shown) continue;
		for (const [cid, label] of now.choices) if (!was.choices.has(cid)) out.push(`${label} is now available.`);
		for (const [cid, label] of was.choices) if (!now.choices.has(cid)) out.push(`${label} is no longer available.`);
	}
	return out;
}

/**
 * Drawer view of the groups, or null with the flag off (the drawer then lists every group as before).
 * { hidden, group(g) → g with only offered choices, note(gid), live }
 */
export function useConditionView(config, custom) {
	const on = useFeature('conditional-logic');
	const r = on ? resolveGroups(config, custom) : null;
	const snap = r ? snapshotOf(config, r) : null;
	const sig = snap ? JSON.stringify([...snap].map(([id, s]) => [id, s.shown, [...s.choices.keys()]])) : '';
	const prev = useRef(null);
	const [live, setLive] = useState({ text: '', n: 0 });
	useEffect(() => {
		const before = prev.current;
		prev.current = snap;
		if (!before || !snap) return;
		const said = changes(before, snap);
		// A trailing no-break space makes a repeated sentence count as new text for screen readers.
		if (said.length) setLive((l) => ({ text: said.join(' '), n: l.n + 1 }));
	}, [sig]);
	if (!r) return null;
	return {
		hidden: r.hidden,
		group: (g) => ({ ...g, choices: r.available[g.id] || [] }),
		note: (gid) => droppedNote(r.dropped[gid]),
		live: html`<div key="wc3d-cl-live" class="wc3d-sr-only" role="status" aria-live="polite">${live.text}${live.n % 2 ? ' ' : ''}</div>`,
	};
}
