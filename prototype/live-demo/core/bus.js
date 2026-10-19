// Page-only UI state that must not persist: toasts, the upgrade modal, the running tour.
// Persistent demo data lives in the store (js/core/store.js, key bp3d-live-demo).
import { useState, useEffect } from '../../js/core/ui.js';

let ui = { toast: null, proModal: null, tour: null };
const subs = new Set();
let toastTimer = 0;

function emit() {
	subs.forEach((f) => f(ui));
}

export const bus = {
	get: () => ui,
	set(patch) {
		ui = { ...ui, ...patch };
		emit();
	},
	subscribe(f) {
		subs.add(f);
		return () => subs.delete(f);
	},
};

/** Re-render when page UI state changes. */
export function useBus(selector = (s) => s) {
	const [, force] = useState(0);
	useEffect(() => {
		// Catch a change made between this render and the subscription (e.g. a toast on page load).
		force((n) => n + 1);
		return bus.subscribe(() => force((n) => n + 1));
	}, []);
	return selector(ui);
}

/** Short message in the bottom corner, like a WP snackbar. */
export function toast(message, { timeout = 3200 } = {}) {
	clearTimeout(toastTimer);
	bus.set({ toast: { message, id: Date.now() } });
	toastTimer = setTimeout(() => bus.set({ toast: null }), timeout);
}

/** Opens "Upgrade to PRO" for a locked control. `feature` is the control's label (shown in the modal). */
export function openProModal(feature = '') {
	bus.set({ proModal: { feature } });
}

export function closeProModal() {
	bus.set({ proModal: null });
}
