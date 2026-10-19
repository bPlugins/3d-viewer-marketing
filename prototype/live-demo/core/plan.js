// Which plugin the visitor is "running": 3D Viewer (free) or 3D Viewer Pro, plus the
// WooCommerce configurator extension (BPEM). Both plans read the same viewer data, like the
// real plugins share _bp3d_* keys, so switching never loses anything.
import { store, useStore } from '../../js/core/store.js';
import { toast } from './bus.js';

/** 'free' | 'pro' */
export const usePlan = () => useStore((s) => s.lv?.plan || 'free');
export const useIsPro = () => usePlan() === 'pro';
export const isPro = (s = store.get()) => s.lv?.plan === 'pro';

/** 'none' | 'installed' | 'active' (what the Extensions page shows). */
export const useExt = () => useStore((s) => s.lv?.ext || 'none');
/** The configurator only runs on Pro (Licensing::PARENT_PLANS = pro, max). */
// lv.extOff: the plugin is active but switched off on the Extensions screen (BPEM's enable toggle).
export const extActive = (s = store.get()) => isPro(s) && s.lv?.ext === 'active' && !s.lv?.extOff;
export const useExtOff = () => useStore((s) => Boolean(s.lv?.extOff));
export const useExtActive = () => useStore((s) => extActive(s));

export function setPlan(plan, { quiet = false } = {}) {
	if (store.get().lv?.plan === plan) return;
	store.patch('lv.plan', plan);
	if (quiet) return;
	toast(plan === 'pro' ? 'You are now on 3D Viewer Pro. Your viewers and settings are kept.' : 'Back on 3D Viewer (free). Pro settings are kept but not applied.');
}

export function installExtension() {
	store.patch('lv.ext', 'installed');
}

export function activateExtension({ quiet = false } = {}) {
	store.patch('lv.ext', 'active');
	store.patch('lv.extOff', false);
	if (!quiet) toast('3D Product Configurator for WooCommerce is active. WooCommerce → 3D Models is in the menu.');
}

export function deactivateExtension() {
	store.patch('lv.ext', 'installed');
}

/** The Extensions screen's Enabled switch; the plugin itself stays active. */
export function setExtensionEnabled(on) {
	store.patch('lv.extOff', !on);
}
