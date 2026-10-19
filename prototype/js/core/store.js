import { useState, useEffect } from './ui.js';
import { seed } from '../data/seed.js';

// One in-memory demo database, mirrored to localStorage so clicks survive a reload.
// Bump VERSION whenever seed.js changes shape; old browser copies are then discarded.
let VERSION = 9;
let KEY = 'wc3d-prototype';
let makeSeed = seed;

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
		// Private window or blocked storage: the prototype still works in memory.
	}
}

let state = load() || { __v: VERSION, ...makeSeed() };
const subs = new Set();

function emit() {
	save(state);
	subs.forEach((f) => f(state));
}

/** Immutable set at a dot path: setIn(obj, 'products.101.title', 'x'). */
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
	/** store.set(next) or store.set(s => next) */
	set(next) {
		state = typeof next === 'function' ? next(state) : next;
		emit();
	},
	/** store.patch('settings.placement', 'gallery') */
	patch(path, value) {
		state = setIn(state, path, typeof value === 'function' ? value(getIn(state, path)) : value);
		emit();
	},
	reset() {
		state = { __v: VERSION, ...makeSeed() };
		emit();
	},
	/** Another entry (live-demo.html) keeps its own storage key, version and seed. Call before the first render. */
	configure({ key, version, seed: next }) {
		KEY = key;
		VERSION = version;
		makeSeed = next;
		state = load() || { __v: VERSION, ...makeSeed() };
		emit();
	},
	subscribe(f) {
		subs.add(f);
		return () => subs.delete(f);
	},
	/** Next numeric id for a collection keyed by id. */
	nextId(collection) {
		const ids = Object.keys(state[collection] || {}).map(Number).filter(Number.isFinite);
		return (ids.length ? Math.max(...ids) : 100) + 1;
	},
};

/** Re-render when the store changes; returns selector(state). */
export function useStore(selector = (s) => s) {
	const [, force] = useState(0);
	useEffect(() => store.subscribe(() => force((n) => n + 1)), []);
	return selector(state);
}
