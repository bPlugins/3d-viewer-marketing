// Preact + htm in one ESM file: no build step. Screens import everything from here.
export {
	html,
	render,
	h,
	Component,
	createContext,
	useState,
	useReducer,
	useEffect,
	useLayoutEffect,
	useRef,
	useMemo,
	useCallback,
	useContext,
} from 'https://cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.module.js';

/** Join truthy class names: cx('a', on && 'b', { c: true }). */
export function cx(...parts) {
	const out = [];
	for (const p of parts) {
		if (!p) continue;
		if (typeof p === 'string') out.push(p);
		else if (typeof p === 'object') for (const [k, v] of Object.entries(p)) if (v) out.push(k);
	}
	return out.join(' ');
}

/** Format a price the way the demo store does (USD, 2 decimals). */
export function money(n) {
	return '$' + Number(n || 0).toFixed(2);
}
