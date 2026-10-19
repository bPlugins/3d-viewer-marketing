import { useState, useEffect } from '../../js/core/ui.js';
import { seed } from './seed.js';

// Demo database for the Shopify prototype, mirrored to localStorage (separate key from the WP prototype).
// Bump VERSION whenever seed.js changes shape.
const VERSION = 3;
const KEY = 'shopify3d-prototype';

function load() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsed && parsed.__v === VERSION ? parsed : null;
	} catch {
		return null;
	}
}

function save(s) {
	try {
		localStorage.setItem(KEY, JSON.stringify(s));
	} catch {
		// Private window or blocked storage: works in memory.
	}
}

let state = load() || { __v: VERSION, ...seed() };
const subs = new Set();

function emit() {
	save(state);
	subs.forEach((f) => f(state));
}

export function setIn(obj, path, value) {
	const keys = Array.isArray(path) ? path : String(path).split('.');
	if (!keys.length) return value;
	const [k, ...rest] = keys;
	const base = obj ?? {};
	const copy = Array.isArray(base) ? base.slice() : { ...base };
	copy[k] = rest.length ? setIn(base[k], rest, value) : value;
	return copy;
}

export function getIn(obj, path) {
	const keys = Array.isArray(path) ? path : String(path).split('.');
	return keys.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export const store = {
	get: () => state,
	set(next) {
		state = typeof next === 'function' ? next(state) : next;
		emit();
	},
	patch(path, value) {
		state = setIn(state, path, typeof value === 'function' ? value(getIn(state, path)) : value);
		emit();
	},
	reset() {
		state = { __v: VERSION, ...seed() };
		emit();
	},
	subscribe(f) {
		subs.add(f);
		return () => subs.delete(f);
	},
	/** Next numeric id for a collection keyed by id (or a counter key in state.seq). */
	nextId(collection) {
		const ids = Object.keys(state[collection] || {}).map(Number).filter(Number.isFinite);
		return (ids.length ? Math.max(...ids) : 100) + 1;
	},
};

export function useStore(selector = (s) => s) {
	const [, force] = useState(0);
	useEffect(() => store.subscribe(() => force((n) => n + 1)), []);
	return selector(state);
}
