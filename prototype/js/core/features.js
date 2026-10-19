import { store, useStore } from './store.js';
import { applyFilter } from '../shared/slots.js';

// Roadmap features (resource/COMPETITOR-LANDSCAPE-ANALYSIS.md §5).
// status: planned → prototyped (built here behind its flag) → shipped (in the plugin; flag removed).
// module: true = a feature module (specs/modules.md). It keeps its flag after shipping: the flag is its Settings → Features toggle.
export const FEATURES = [
	{ id: 'option-pricing', title: 'Option pricing', status: 'shipped', module: true, area: 'Customizer', summary: 'Fixed, sale, negative or percentage surcharge per color, part or option, with a live total.', description: 'Charge extra (or give a discount) per color, part or option, as a fixed amount or a percentage. Shoppers see a live total; the cart price is recomputed from your rules.' },
	{ id: 'option-groups', title: 'Option groups with swatches', status: 'shipped', module: true, area: 'Customizer', summary: 'Merchant-defined groups with label, thumbnail, swatch type, default, required and price.', description: 'Build named option groups (color, material or parts) with swatches, thumbnails, buttons or a dropdown, defaults and required picks. They replace the plain mesh lists in the customizer.' },
	{ id: 'order-snapshot', title: 'Cart and order snapshot', status: 'shipped', module: true, area: 'Cart & orders', summary: 'Image of the configured product plus a summary on cart, checkout blocks, order and email.' },
	{ id: 'materials-variants', title: 'KHR_materials_variants', status: 'shipped', module: true, area: 'Editor', summary: 'Read material variants from the GLB and map them to variations or options.', note: 'Variant choices for customers need Option groups.' },
	{ id: 'usdz-export', title: 'AR of the configured product', status: 'shipped', module: true, area: 'AR', summary: 'Build the iOS AR file from the configured scene instead of the base model.', note: 'Pick a phone with "AR device" in the storefront bar.' },
	{ id: 'decals', title: 'Text and image decals', status: 'shipped', module: true, pluginId: 'personalization', area: 'Customizer', summary: 'Customer text or image placed on a merchant-picked area of the model.', note: 'Area prices need Option pricing.' },
	{ id: 'block', title: 'Product viewer block', status: 'shipped', module: true, pluginId: 'product-viewer-block', area: 'Placement', summary: 'Block and Elementor widget for Single Product templates.' },
	{ id: 'saved-designs', title: 'Share link and saved designs', status: 'shipped', module: true, area: 'Customizer', summary: 'Short link that restores a configuration; optional My Account list.' },
	{ id: 'conditional-logic', title: 'Conditional logic', status: 'shipped', module: true, area: 'Customizer', summary: 'Show or hide options based on the variation or other choices.', requires: ['option-groups'] },
	{ id: 'undo-redo-drawer', title: 'Undo and redo for customers', status: 'shipped', module: true, area: 'Customizer', summary: 'Step back and forward through customer changes in the drawer.', description: 'Undo and Redo buttons (and Ctrl+Z / Ctrl+Shift+Z) in the customizer, so shoppers can step back through their changes.' },
	{ id: 'coverage', title: 'Coverage dashboard', status: 'shipped', module: true, pluginId: 'model-coverage', area: 'Admin', summary: 'Products with and without 3D, missing AR file or poster, oversized models; bulk assign.' },
	{ id: 'external-url', title: 'Model from a URL', status: 'shipped', module: true, area: 'Admin', summary: 'Use a GLB hosted on a CDN instead of the media library.' },
	{
		id: 'customizer-modal',
		title: 'Customizer modal',
		status: 'shipped',
		module: true,
		area: 'Customizer',
		summary: 'Customize opens a large modal: big 3D viewer, options panel, live total and Add to cart.',
		description: 'Customize opens a large dialog with a bigger viewer, the options, live total and Add to cart. Off: the side drawer. Needs the customizer to be enabled.',
	},
	{
		id: 'hdri-download',
		title: 'Lighting presets on demand',
		status: 'prototyped',
		area: 'Editor',
		summary: 'Only Studio ships in the zip; the other lighting presets download from GitHub when an admin asks (editor, Settings).',
		note: 'Use "Fail HDRI download" in the prototype bar to see the upload fallback.',
	},
	{
		id: 'gallery-lane',
		title: 'Gallery strip on the bottom row',
		status: 'prototyped',
		area: 'Viewer',
		summary: 'View thumbnails stay on the bottom row beside View in AR / Customize, shrinking to fit, instead of floating over the model.',
		note: 'Compare widths on the "Gallery lane" page (storefront bar).',
	},
];

/** "Needs Option groups." / soft note, for the Planned features popover and roadmap page. */
export function dependencyNote(f) {
	const titles = (f.requires || []).map((id) => FEATURES.find((x) => x.id === id)?.title || id);
	return [titles.length && `Needs ${titles.join(' and ')}.`, f.note].filter(Boolean).join(' ');
}

/** Feature modules, in the order the Settings → Features tab lists them. */
export const MODULES = FEATURES.filter((f) => f.module);

/** A prototype switch can change it: prototyped features, and feature modules (shipped or not). */
export function canToggle(f) {
	return f.status === 'prototyped' || !!f.module;
}

/** Shipped and not a module: always on, no flag. */
export function alwaysOn(f) {
	return f.status === 'shipped' && !f.module;
}

/**
 * ModuleSettings::cards() status for each feature module, from a {id: bool} map of toggles.
 * A module whose required modules are not all active is 'blocked' and keeps its stored true.
 */
export function moduleCards(enabled) {
	const byId = Object.fromEntries(MODULES.map((m) => [m.id, m]));
	const active = new Set(MODULES.filter((m) => enabled[m.id]).map((m) => m.id));
	let changed = true;
	while (changed) {
		changed = false;
		for (const id of [...active]) {
			if ((byId[id].requires || []).some((r) => !active.has(r))) {
				active.delete(id);
				changed = true;
			}
		}
	}
	return MODULES.map((m) => {
		const requires = (m.requires || []).map((r) => ({ id: r, title: byId[r]?.title || FEATURES.find((f) => f.id === r)?.title || r, installed: !!byId[r] }));
		const on = !!enabled[m.id];
		const status = !on ? 'off' : active.has(m.id) ? 'active' : 'blocked';
		const missing = requires.filter((r) => !active.has(r.id));
		const reason = status === 'blocked' ? `Waiting for ${missing.map((r) => r.title).join(' and ')}.` : '';
		return { id: m.id, title: m.title, description: m.description || m.summary, enabled: on, status, reason, requires };
	});
}

// 'feature.on' lets the live demo switch every module off while the configurator extension is inactive.
export function isOn(id) {
	const s = store.get();
	return !!applyFilter('feature.on', !!s.flags?.[id], id, s);
}

/** true when the feature's flag is switched on in the prototype bar. */
export function useFeature(id) {
	return useStore((s) => !!applyFilter('feature.on', !!s.flags?.[id], id, s));
}

export function toggleFeature(id, on) {
	store.patch(`flags.${id}`, on);
}
