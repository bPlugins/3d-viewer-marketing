// bfields ("New" admin interface) field components for the live demo, ported from
// 3d-viewer/lib/bfields/ui (fields/*, layout/FieldRenderer.tsx, FieldGroup.tsx, core/dependency.ts).
// Schema fields use the PHP array keys (id, type, title, subtitle, desc, options, default, dependency, …).
// Styles: css/viewer-modern.css (scoped under .ld-vm). Used by the Modern viewer editor (viewer/modern-edit.js).
import { html, useState, useRef, useEffect, cx } from '../../js/core/ui.js';
import { ProPill, ProLock } from './pro.js';

// lib/bfields/ui/core/icons.tsx (Lucide geometry), with its Codestar / Font Awesome aliases.
const ICONS = {
	chain: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
	diamond: '<path d="M12 3 21 12l-9 9-9-9z"/>',
	terminal: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
	upload: '<path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/>',
	send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
	'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
	refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
	'maximize-2': '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
	monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
	tablet: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M12 18h.01"/>',
	phone: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
	mobile: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
	grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
	sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
	'cloud-drizzle': '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v1M8 14v1M16 19v1M16 14v1M12 21v1M12 16v1"/>',
	download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
	camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
	box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
	gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
	pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
	eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
	search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
	save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
	reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
	trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
	info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
	warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
	copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
	check: '<path d="M20 6 9 17l-5-5"/>',
	move: '<path d="M12 2v20M2 12h20"/><path d="m15 5-3-3-3 3m0 14 3 3 3-3M5 9l-3 3 3 3m14 0 3-3-3-3"/>',
	'zoom-in': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
	'zoom-out': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8 11h6"/>',
	maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
	loader: '<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/>',
	palette: '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
	image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
	code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
	cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
	chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
	layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m6.08 10.37-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"/><path d="m6.08 15.37-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"/>',
	sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
	link: '<path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8"/>',
	zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
	puzzle: '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>',
	grip: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
	'chevron-down': '<path d="m6 9 6 6 6-6"/>',
	'arrow-up': '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
	'arrow-down': '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
	plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
	minus: '<path d="M5 12h14"/>',
	'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
	'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
	'panel-top': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/>',
	'panel-left': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
	x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
};
const ALIASES = {
	cog: 'gear',
	cogs: 'gear',
	wrench: 'gear',
	'shopping-cart': 'cart',
	shop: 'cart',
	woocommerce: 'cart',
	'bar-chart': 'chart',
	'chart-bar': 'chart',
	analytics: 'chart',
	'line-chart': 'chart',
	'chart-line': 'chart',
	cube: 'box',
	cubes: 'layers',
	image: 'image',
	photo: 'image',
	picture: 'image',
	paint: 'palette',
	'paint-brush': 'pencil',
	brush: 'pencil',
	style: 'palette',
	edit: 'pencil',
	pen: 'pencil',
	'code-fork': 'code',
	shortcode: 'code',
	eye: 'eye',
	preview: 'eye',
	selector: 'eye',
	crosshairs: 'eye',
	crosshair: 'eye',
	plug: 'puzzle',
	plugin: 'puzzle',
	module: 'puzzle',
	modules: 'puzzle',
	sliders: 'sliders',
	adjust: 'sliders',
	preset: 'layers',
	general: 'gear',
	bolt: 'zap',
	lightning: 'zap',
	flash: 'zap',
	close: 'x',
	times: 'x',
};

export function BfIcon({ name, size = 20, stroke = 2 }) {
	const key = String(name || 'box')
		.trim()
		.toLowerCase()
		.replace(/^(fa[srlbd]?|dashicons)[\s-]+/, '')
		.replace(/^fa-/, '')
		.replace(/^admin-/, '')
		.trim();
	const inner = ICONS[key] || ICONS[ALIASES[key]] || ICONS.box;
	return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" dangerouslySetInnerHTML=${{ __html: inner }}></svg>`;
}

export const truthy = (v) => (typeof v === 'boolean' ? v : typeof v === 'number' ? v === 1 : ['1', 'true', 'yes', 'on'].includes(String(v ?? '').toLowerCase()));

/** A stored value as Codestar compares it: a single button_set saved as ['x'] reads 'x'; switchers read '1'. */
const norm = (v) => (Array.isArray(v) ? norm(v[0]) : v === true ? '1' : v === false || v == null ? '' : String(v));

function test(v, op, want) {
	const s = norm(v);
	switch (op) {
		case '!=':
			return s !== want;
		case 'any':
			return want.split(',').includes(s);
		case 'not-any':
			return !want.split(',').includes(s);
		case '>=':
			return Number(s) >= Number(want);
		case '<=':
			return Number(s) <= Number(want);
		case '>':
			return Number(s) > Number(want);
		case '<':
			return Number(s) < Number(want);
		default:
			return s === want;
	}
}

/** Codestar's `dependency` ([ids, ops, values, 'all']), or bfields' list of such rules: every one must hold. */
export function isVisible(dep, values, row) {
	if (!Array.isArray(dep) || !dep.length) return true;
	const rules = Array.isArray(dep[0]) ? dep : [dep];
	return rules.every(([ids, ops, wants = '', scope]) => {
		const bag = row && scope !== 'all' ? row : values;
		const opl = String(ops).split('|');
		const wl = String(wants).split('|');
		return String(ids)
			.split('|')
			.every((id, i) => test(bag?.[id], opl[i] ?? opl[0], wl[i] ?? ''));
	});
}

const storable = (f) => f.id && f.id !== 'readonly' && !['content', 'notice', 'submessage', 'callback', 'field_group'].includes(f.type);

/** Every storable field's default, field_group children included (they store at the top level). */
export function defaultsOf(fields, out = {}) {
	for (const f of fields || []) {
		if (f.type === 'field_group') defaultsOf(f.fields, out);
		else if (storable(f) && 'default' in f) out[f.id] = structuredClone(f.default);
	}
	return out;
}

/** Ids a save may write: storable and not locked behind Pro. */
export function editableIds(fields, pro, out = []) {
	for (const f of fields || []) {
		if (f.type === 'field_group') editableIds(f.fields, pro, out);
		else if (storable(f) && (pro || !f.pro)) out.push(f.id);
	}
	return out;
}

const fileName = (url) => {
	const base = String(url || '').split(/[?#]/)[0].split('/').pop() || '';
	try {
		return decodeURIComponent(base);
	} catch {
		return base;
	}
};
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i;
const optionList = (f) => (Array.isArray(f.options) ? f.options.map((o) => [String(o), String(o)]) : Object.entries(f.options || {}));

/* ---- controls (bfields/ui/fields/*) ---- */

function Toggle({ field, value, onChange, locked }) {
	const on = truthy(value);
	return html`<button type="button" class=${cx('bfields-toggle', on && 'bfields-toggle--on')} role="switch" aria-checked=${on} aria-label=${field.title} disabled=${locked} onClick=${() => onChange(on ? '0' : '1')}>
		<span class="bfields-toggle__track"></span>
		<span class="bfields-toggle__label">${on ? field.text_on || 'Enabled' : field.text_off || 'Disabled'}</span>
	</button>`;
}

function Segmented({ field, value, onChange, locked }) {
	const cur = norm(value);
	return html`<div class="bfields-segmented" role="radiogroup" aria-label=${field.title}>
		${optionList(field).map(([k, label]) => html`<button type="button" key=${k} role="radio" aria-checked=${cur === k} aria-pressed=${cur === k} disabled=${locked} onClick=${() => onChange(k)}>${label}</button>`)}
	</div>`;
}

/** Choice.tsx `cards` presentation: the Add New Lite / Advanced grid. */
function ModeGrid({ field, value, onChange, locked }) {
	const cur = norm(value);
	const meta = field.option_meta || {};
	return html`<div class="bfields-mode-grid" role="radiogroup" aria-label=${field.title}>
		${optionList(field).map(([k, label]) => {
			const on = cur === k;
			const chrome = meta[k] || {};
			return html`<button type="button" key=${k} role="radio" aria-checked=${on} disabled=${locked} class=${cx('bfields-mode', !chrome.tag && 'bfields-mode--plain', on && 'bfields-mode--on')} onClick=${() => onChange(k)}>
				<span class="bfields-mode__icon"><${BfIcon} name=${chrome.icon || field.icon} size=${18} /></span>
				<span class="bfields-mode__body">
					<span class="bfields-mode__name">${label}${chrome.tag && html`<span class="bfields-mode__tag">${chrome.tag}</span>`}</span>
					${chrome.perks?.length > 0 && html`<span class="bfields-mode__perks">${chrome.perks.map((p) => html`<span key=${p}>${'✓ ' + p}</span>`)}</span>`}
				</span>
				<span class="bfields-mode__radio"></span>
			</button>`;
		})}
	</div>`;
}

function Radios({ field, value, onChange, locked }) {
	const cur = norm(value);
	return html`<div class="bfields-radios" role="radiogroup" aria-label=${field.title}>
		${optionList(field).map(
			([k, label]) => html`<button type="button" key=${k} role="radio" aria-checked=${cur === k} disabled=${locked} class=${cx('bfields-radio', cur === k && 'bfields-radio--on')} onClick=${() => onChange(k)}>
				<span class="bfields-radio__dot"></span>${label}
			</button>`
		)}
	</div>`;
}

function Select({ field, value, onChange, locked }) {
	const list = optionList(field);
	const cur = norm(value);
	// A browser shows the first option for a value it does not list (Schema.php single-select rule).
	const shown = list.some(([k]) => k === cur) ? cur : list[0]?.[0] ?? '';
	return html`<select class="bfields-select" value=${shown} disabled=${locked} aria-label=${field.title} onChange=${(e) => onChange(e.currentTarget.value)}>
		${field.placeholder && !list.some(([k]) => k === '') && html`<option value="">${field.placeholder}</option>`}
		${list.map(([k, label]) => html`<option key=${k} value=${k}>${label}</option>`)}
	</select>`;
}

function NumberInput({ field, value, onChange, locked }) {
	const stepper = field.type === 'spinner';
	const lim = field.attributes || {};
	const min = field.min ?? lim.min;
	const max = field.max ?? lim.max;
	const step = field.step ?? lim.step;
	const nudge = (dir) => {
		const n = Number(value) || 0;
		const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, Number((n + dir * (Number(step) || 1)).toFixed(4))));
		onChange(String(next));
	};
	const btn = (dir) => html`<button type="button" class="bfields-number__step" tabindex="-1" aria-label=${dir > 0 ? 'Increase' : 'Decrease'} disabled=${locked} onClick=${() => nudge(dir)}>
		<${BfIcon} name=${dir > 0 ? 'plus' : 'minus'} size=${16} />
	</button>`;
	return html`<span class=${cx('bfields-number', stepper && 'bfields-number--stepper', field.unit && 'bfields-number--unit')}>
		${stepper && btn(-1)}
		<input type="number" inputmode="decimal" class="bfields-number__input" value=${value ?? ''} min=${min} max=${max} step=${step ?? 'any'} placeholder=${field.placeholder} disabled=${locked} aria-label=${field.title} onInput=${(e) => onChange(e.currentTarget.value)} />
		${field.unit && html`<span class="bfields-number__unit">${field.unit}</span>`}
		${stepper && btn(1)}
	</span>`;
}

function Slider({ field, value, onChange, locked }) {
	const lo = Number(field.min ?? 0);
	const hi = Number(field.max ?? 100);
	const text = value == null ? '' : String(value);
	const n = text === '' ? lo : Number(text);
	const pct = hi > lo ? ((n - lo) / (hi - lo)) * 100 : 0;
	return html`<div class="bfields-slider">
		<input type="range" value=${Number.isNaN(n) ? lo : n} min=${lo} max=${hi} step=${field.step ?? 1} disabled=${locked} aria-label=${field.title} style=${{ '--bfields-range-pct': Math.max(0, Math.min(100, pct)) + '%' }} onInput=${(e) => onChange(e.currentTarget.value)} />
		<input type="number" class="bfields-slider__value" value=${text} min=${lo} max=${hi} step=${field.step ?? 1} disabled=${locked} aria-label=${field.title} onInput=${(e) => onChange(e.currentTarget.value)} />
	</div>`;
}

function Text({ field, value, onChange, locked }) {
	return html`<input type="text" class="bfields-input" value=${value == null ? '' : String(value)} placeholder=${field.placeholder} disabled=${locked} aria-label=${field.title} onInput=${(e) => onChange(e.currentTarget.value)} />`;
}

function Textarea({ field, value, onChange, locked }) {
	return html`<textarea class="bfields-textarea" rows="3" value=${value || ''} placeholder=${field.placeholder} disabled=${locked} aria-label=${field.title} onInput=${(e) => onChange(e.currentTarget.value)}></textarea>`;
}

function Code({ field, value, onChange, locked }) {
	return html`<div class=${cx('bfields-code', locked && 'is-locked')}>
		<textarea class="bfields-code__input" spellcheck=${false} rows="8" value=${value || ''} disabled=${locked} aria-label=${field.title} onInput=${(e) => onChange(e.currentTarget.value)}></textarea>
	</div>`;
}

function Color({ field, value, onChange, locked }) {
	const text = typeof value === 'string' ? value : '';
	const empty = text === '' || text.toLowerCase() === 'transparent';
	const hex = /^#[0-9a-f]{6}$/i.test(text) ? text : '#ffffff';
	return html`<span class="bfields-color">
		<label class="bfields-colorpick" title=${text || 'Default'}>
			<span class=${cx('bfields-colorpick__swatch', empty && 'bfields-colorpick__swatch--empty')} style=${empty ? undefined : { background: text }}></span>
			Select Color
			<input type="color" class="bfields-colorpick__picker" value=${hex} disabled=${locked} aria-label=${field.title} onInput=${(e) => onChange(e.currentTarget.value)} />
		</label>
		${!empty && text !== field.default && html`<button type="button" class="bfields-btn bfields-btn--link" disabled=${locked} onClick=${() => onChange(field.default ?? '')}>Default</button>`}
	</span>`;
}

const DEVICES = [
	['desktop', 'Desktop', 'monitor'],
	['tablet', 'Tablet', 'tablet'],
	['mobile', 'Mobile', 'phone'],
];

/** Per-device value of a `responsive` dimension: tablet falls back to desktop, mobile to tablet (core/responsive.ts nested mode). */
function deviceOwn(value, device) {
	const v = value && typeof value === 'object' ? value : {};
	return device === 'desktop' ? v : v[device] && typeof v[device] === 'object' ? v[device] : null;
}

function DeviceSwitcher({ field, value, device, setDevice, onChange, locked }) {
	const own = (d) => d !== 'desktop' && deviceOwn(value, d) && deviceOwn(value, d)[field.axis] !== '' && deviceOwn(value, d)[field.axis] != null;
	const active = DEVICES.find(([d]) => d === device);
	return html`<span class="bfields-devswitch">
		<span class="bfields-devswitch__pill" role="group" aria-label="Device">
			${DEVICES.map(([d, label, icon]) => {
				const name = own(d) ? `${label} (has its own value)` : label;
				return html`<button type="button" key=${d} class="bfields-devswitch__btn" aria-pressed=${device === d} aria-label=${name} title=${name} onClick=${() => setDevice(d)}>
					<${BfIcon} name=${icon} size=${13} />${own(d) && html`<span class="bfields-devswitch__dot" aria-hidden="true"></span>`}
				</button>`;
			})}
		</span>
		${own(device) &&
		html`<button type="button" class="bfields-devswitch__reset" disabled=${locked} aria-label=${`Clear the ${active[1]} value`} title=${`Clear the ${active[1]} value and inherit it`} onClick=${() => {
			const next = { ...(value || {}) };
			delete next[device];
			onChange(next);
		}}><${BfIcon} name="x" size=${12} /></button>`}
	</span>`;
}

function Dimension({ field, value, onChange, locked, ctx }) {
	const axis = field.axis;
	const device = ctx?.device || 'desktop';
	const base = value && typeof value === 'object' ? value : {};
	const own = deviceOwn(base, device) || {};
	const inherited = device === 'mobile' ? { ...base, ...(deviceOwn(base, 'tablet') || {}) } : base;
	const units = field.units || ['px', '%', 'em'];
	const unit = own.unit ?? (device === 'desktop' ? base.unit : inherited.unit) ?? units[0];
	const write = (patch) => onChange(device === 'desktop' ? { ...base, ...patch } : { ...base, [device]: { ...own, unit, ...patch } });
	return html`<div class="bfields-dim">
		<input type="number" class="bfields-input" value=${own[axis] ?? ''} placeholder=${device === 'desktop' ? '' : String(inherited[axis] ?? '')} disabled=${locked} aria-label=${field.title} onInput=${(e) => write({ [axis]: e.currentTarget.value })} />
		<select class="bfields-select" value=${unit} disabled=${locked} aria-label=${`${field.title} unit`} onChange=${(e) => write({ unit: e.currentTarget.value })}>
			${units.map((u) => html`<option key=${u} value=${u}>${u}</option>`)}
		</select>
	</div>`;
}

function Spacing({ field, value, onChange, locked }) {
	const cur = value && typeof value === 'object' ? value : {};
	const [linked, setLinked] = useState(false);
	const sides = ['top', 'right', 'bottom', 'left'].filter((s) => field[s] !== false);
	const set = (side, v) => onChange(linked ? Object.fromEntries([...Object.entries(cur), ...sides.map((s) => [s, v])]) : { ...cur, [side]: v });
	return html`<div class="bfields-spacing" role="group" aria-label=${field.title}>
		${sides.map((side) => {
			const suffix = field[side + '_icon'];
			const own = field.labels?.[side];
			return html`<span key=${side} class=${cx('bfields-number', 'bfields-spacing__side', suffix && 'bfields-number--unit')} title=${own || side}>
				${own ? html`<span class="bfields-spacing__prefix" aria-hidden="true">${own}</span>` : !suffix && html`<span class="bfields-spacing__prefix" aria-hidden="true"><${BfIcon} name=${'arrow-' + (side === 'top' ? 'up' : side === 'bottom' ? 'down' : side)} size=${14} /></span>`}
				<input type="number" inputmode="decimal" step="any" class="bfields-number__input bfields-spacing__input" value=${cur[side] ?? ''} placeholder=${field.placeholder?.[side]} disabled=${locked} aria-label=${own || side} onInput=${(e) => set(side, e.currentTarget.value)} />
				${suffix && html`<span class="bfields-number__unit" aria-hidden="true">${suffix}</span>`}
			</span>`;
		})}
		<button type="button" class="bfields-spacing__link" aria-pressed=${linked} disabled=${locked} title=${linked ? 'Unlink sides' : 'Link sides'} aria-label="Link sides" onClick=${() => setLinked(!linked)}><${BfIcon} name="chain" size=${14} /></button>
	</div>`;
}

const EMPTY_MEDIA = { url: '', id: '', width: '', height: '', thumbnail: '', alt: '', title: '', description: '' };

/** `upload` (a URL string) and `media` (Codestar's 8-key array); Media.tsx + MediaInline.tsx. */
function Media({ field, value, onChange, locked, card, ctx }) {
	const urlShape = field.type === 'upload';
	const current = urlShape ? { ...EMPTY_MEDIA, url: typeof value === 'string' ? value : '' } : { ...EMPTY_MEDIA, ...(value && typeof value === 'object' ? value : {}) };
	const emit = (url) => onChange(urlShape ? url : { ...(value && typeof value === 'object' ? value : EMPTY_MEDIA), url, id: url === current.url ? current.id : '' });
	const open = () => ctx?.media?.({ type: field.library === 'image' ? 'image' : field.library === 'model' ? 'model' : 'any', title: field.button_title || 'Select file', onSelect: emit });
	const hasValue = current.url !== '';
	const remove = () => onChange(urlShape ? '' : { ...EMPTY_MEDIA });
	const uploadBtn = (label, cls = 'bfields-btn bfields-btn--soft') => html`<button type="button" class=${cls} disabled=${locked} onClick=${open}><${BfIcon} name="upload" size=${card ? 17 : 16} />${label}</button>`;

	if (card && (urlShape || field.url_input)) {
		return html`<div class="bfields-field-row">
			<input type="text" class="bfields-input" value=${current.url} placeholder=${field.placeholder || 'https://'} disabled=${locked} aria-label=${field.title} spellcheck=${false} onInput=${(e) => emit(e.currentTarget.value)} />
			${uploadBtn(field.button_title || 'Upload')}
		</div>`;
	}
	if (card) {
		const imageOnly = field.library === 'image';
		return html`<div class="bfields-poster">
			<span class="bfields-poster__thumb">${hasValue && IMAGE.test(current.url) ? html`<img src=${current.thumbnail || current.url} alt="" />` : html`<${BfIcon} name="image" size=${20} />`}</span>
			<div class="bfields-poster__main">
				<p class="bfields-poster__name">${hasValue ? current.title || fileName(current.url) : imageOnly ? 'No image selected' : 'No file selected'}</p>
				${!hasValue && imageOnly && html`<p class="bfields-poster__meta">JPG, PNG, WebP or SVG</p>`}
			</div>
			${uploadBtn(field.button_title || 'Upload', 'bfields-btn bfields-btn--primary')}
			${hasValue && html`<button type="button" class="bfields-btn bfields-btn--link" disabled=${locked} onClick=${remove}>Remove</button>`}
		</div>`;
	}
	if (urlShape || field.url_input) {
		return html`<div class="bfields-media bfields-media--url">
			${hasValue && IMAGE.test(current.url) && html`<span class="bfields-media__chip"><img src=${current.url} alt="" /></span>`}
			<input type="text" class="bfields-input bfields-media__input" value=${current.url} placeholder=${field.placeholder || 'Not selected'} disabled=${locked} spellcheck=${false} aria-label=${field.title} onInput=${(e) => emit(e.currentTarget.value)} />
			${uploadBtn(field.button_title || 'Upload', 'bfields-btn bfields-btn--soft bfields-media__upload')}
			${hasValue && html`<button type="button" class="bfields-media__remove" disabled=${locked} aria-label=${`Remove ${field.title || 'file'}`} onClick=${remove}>Remove</button>`}
		</div>`;
	}
	return html`<div class=${cx('bfields-media', 'bfields-media--attachment', !hasValue && 'is-empty')}>
		<span class="bfields-media__chip">${hasValue && IMAGE.test(current.url) ? html`<img src=${current.thumbnail || current.url} alt="" />` : html`<${BfIcon} name="image" size=${18} />`}</span>
		<span class="bfields-media__main"><span class="bfields-media__name" title=${hasValue ? current.url : undefined}>${hasValue ? current.title || fileName(current.url) : 'No file selected'}</span></span>
		${uploadBtn(hasValue ? 'Replace' : field.button_title || 'Upload', 'bfields-btn bfields-btn--soft bfields-media__upload')}
		${hasValue && html`<button type="button" class="bfields-media__remove" disabled=${locked} aria-label=${`Remove ${field.title || 'file'}`} onClick=${remove}>Remove</button>`}
	</div>`;
}

function Fieldset({ field, value, onChange, locked, values, ctx }) {
	const children = field.fields || [];
	const cur = value && typeof value === 'object' && !Array.isArray(value) ? value : Object.fromEntries(children.map((c) => [c.id, c.default ?? '']));
	const cols = Math.min(3, Math.max(1, children.length));
	return html`<fieldset class="bfields-fieldset" aria-label=${field.title} disabled=${locked} style=${{ '--bfields-fieldset-cols': cols }}>
		${children.map((c) => html`<${BfField} key=${c.id} field=${c} values=${values} row=${cur} ctx=${ctx} onChange=${(id, v) => !locked && onChange({ ...cur, [id]: v })} />`)}
	</fieldset>`;
}

/** The value CSF prints in a collapsed row: the first sub-field's (file name for uploads, label for selects). */
function rowTitle(item, fields, i) {
	const first = (fields || []).find((c) => c.id && !['content', 'notice', 'submessage'].includes(c.type));
	let raw = first && first.type !== 'switcher' ? item?.[first.id] : '';
	if (Array.isArray(raw)) raw = raw[0];
	if (raw && typeof raw === 'object') raw = raw.url;
	const text = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
	if (!text) return `Item ${i + 1}`;
	if (first.type === 'upload' || first.type === 'media') return fileName(text);
	return first.options && !Array.isArray(first.options) && typeof first.options[text] === 'string' ? first.options[text] : text;
}

let rowSeq = 0;

/** `group` (collapsible rows) and `repeater` (plain rows): Repeater.tsx, minus drag (Move up / down stay). */
function Repeater({ field, value, onChange, locked, values, ctx }) {
	const rows = Array.isArray(value) ? value : [];
	const collapsible = field.type === 'group';
	const ids = useRef([]);
	while (ids.current.length < rows.length) ids.current.push('r' + ++rowSeq);
	ids.current.length = rows.length;
	const [open, setOpen] = useState({});
	const label = field.button_title || 'Add New';
	const blank = () => Object.fromEntries((field.fields || []).filter((c) => c.id && !['content', 'notice', 'submessage'].includes(c.type)).map((c) => [c.id, structuredClone(c.default ?? '')]));
	const write = (next) => onChange(next.length ? next : '');
	const add = () => {
		const id = 'r' + ++rowSeq;
		ids.current = [...ids.current, id];
		setOpen({ ...open, [id]: true });
		write([...rows, blank()]);
	};
	const patch = (i, key, v) => write(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
	const move = (from, to) => {
		const next = [...rows];
		const [row] = next.splice(from, 1);
		next.splice(to, 0, row);
		const k = [...ids.current];
		const [id] = k.splice(from, 1);
		k.splice(to, 0, id);
		ids.current = k;
		write(next);
	};
	const clone = (i) => {
		const id = 'r' + ++rowSeq;
		const k = [...ids.current];
		k.splice(i + 1, 0, id);
		ids.current = k;
		write([...rows.slice(0, i + 1), structuredClone(rows[i]), ...rows.slice(i + 1)]);
	};
	const remove = (i) => {
		ids.current = ids.current.filter((_, j) => j !== i);
		write(rows.filter((_, j) => j !== i));
	};
	const addButton = html`<button type="button" class="bfields-btn bfields-btn--soft bfields-repeater__add" disabled=${locked} onClick=${add}><${BfIcon} name="plus" size=${16} />${label}</button>`;
	const ico = (name, aria, tip, onClick, disabled, cls) => html`<button type="button" class=${cx('bfields-icon-btn', cls)} aria-label=${aria} title=${tip} disabled=${disabled || locked} onClick=${onClick}><${BfIcon} name=${name} size=${16} /></button>`;

	return html`<div class=${cx('bfields-repeater', !collapsible && 'bfields-repeater--plain', locked && 'bfields-repeater--locked')}>
		${!rows.length
			? html`<div class="bfields-repeater__empty"><p class="bfields-repeater__hint">Nothing here yet. Use “${label}” to add the first one.</p>${addButton}</div>`
			: html`<ol class="bfields-repeater__list" aria-label=${field.title}>
					${rows.map((item, i) => {
						const id = ids.current[i];
						const expanded = !collapsible || !!open[id];
						const title = rowTitle(item, field.fields, i);
						return html`<li key=${id} class=${cx('bfields-repeater-row', expanded && 'is-open')}>
							<div class="bfields-repeater-row__head">
								<button type="button" class="bfields-icon-btn bfields-repeater-row__handle" aria-label=${'Reorder ' + title} title="Drag to reorder" disabled=${locked} onKeyDown=${(e) => {
									if (e.key === 'ArrowUp' && i > 0) (e.preventDefault(), move(i, i - 1));
									if (e.key === 'ArrowDown' && i < rows.length - 1) (e.preventDefault(), move(i, i + 1));
								}}><${BfIcon} name="grip" size=${16} /></button>
								${collapsible
									? html`<button type="button" class="bfields-repeater-row__toggle" aria-expanded=${expanded} onClick=${() => setOpen({ ...open, [id]: !expanded })}>
											<span class="bfields-repeater-row__title"><span class="bfields-repeater-row__value">${title}</span></span>
											<span class="bfields-repeater-row__chevron"><${BfIcon} name="chevron-down" size=${16} /></span>
										</button>`
									: html`<span class="bfields-repeater-row__title bfields-repeater-row__title--plain"><span class="bfields-repeater-row__value">${title}</span></span>`}
								<div class="bfields-repeater-row__actions">
									<span class="bfields-repeater-row__order">
										${ico('arrow-up', `Move ${title} up`, 'Move up', () => move(i, i - 1), i === 0)}
										${ico('arrow-down', `Move ${title} down`, 'Move down', () => move(i, i + 1), i === rows.length - 1)}
									</span>
									${ico('copy', `Duplicate ${title}`, 'Duplicate', () => clone(i))}
									${ico('trash', `Remove ${title}`, 'Remove', () => remove(i), false, 'bfields-repeater-row__remove')}
								</div>
							</div>
							${expanded &&
							html`<div class="bfields-repeater-row__body">
								<fieldset class="bfields-repeater-row__fields" disabled=${locked}>
									${(field.fields || []).map((c, k) => html`<${BfField} key=${c.id || k} field=${c} values=${values} row=${item} ctx=${ctx} onChange=${(key, v) => patch(i, key, v)} />`)}
								</fieldset>
							</div>`}
						</li>`;
					})}
				</ol>`}
		${rows.length > 0 && html`<div class="bfields-repeater__foot">${addButton}</div>`}
	</div>`;
}

const NOTICE_ICON = { info: 'info', warning: 'warning', danger: 'warning', success: 'check' };

function Display({ field }) {
	if (field.type === 'notice' || field.type === 'submessage') {
		const tone = field.style || 'info';
		return html`<div class=${'bfields-infobar bfields-infobar--' + tone} role=${tone === 'danger' ? 'alert' : 'status'}>
			<${BfIcon} name=${NOTICE_ICON[tone] || 'info'} size=${18} />
			<span>${field.render ? html`<${field.render} />` : field.content}</span>
		</div>`;
	}
	return html`<div class=${'bfields-content bfields-content--' + field.type}>${field.render ? html`<${field.render} />` : field.content}</div>`;
}

const CONTROLS = { switcher: Toggle, button_set: Segmented, radio: Radios, select: Select, number: NumberInput, spinner: NumberInput, slider: Slider, text: Text, textarea: Textarea, code_editor: Code, color: Color, bp3d_responsive_dimensions: Dimension, spacing: Spacing, media: Media, upload: Media, group: Repeater, repeater: Repeater, fieldset: Fieldset };
const DISPLAY = ['content', 'notice', 'submessage', 'callback'];
const COMPACT = ['switcher', 'number', 'spinner', 'slider', 'color'];

/**
 * One field (layout/FieldRenderer.tsx): dependency gate, icon, title/desc, control. `row` is the repeater
 * row / fieldset value the field reads and writes; `layout: 'cards'` is the Add New Model tab's card per field.
 * ctx = { pro, device, setDevice, media(opts), invalid: Set }.
 */
export function BfField({ field, values, row, onChange, showIcons = false, layout = 'rows', ctx = {} }) {
	if (!isVisible(field.dependency, values, row)) return null;
	const locked = !!field.pro && !ctx.pro;
	const bag = row || values;
	const stored = bag?.[field.id];
	const value = stored === undefined ? field.default : stored;
	const display = DISPLAY.includes(field.type);
	const card = layout === 'cards';
	const Control = field.type === 'button_set' && field.layout === 'mode-grid' ? ModeGrid : CONTROLS[field.type] || Text;
	const set = (v) => !locked && onChange(field.id, v);
	const inner = display ? html`<${Display} field=${field} />` : html`<${Control} field=${field} value=${value} values=${values} row=${row} onChange=${set} locked=${locked} card=${card} ctx=${ctx} />`;
	const control = locked && !display ? html`<${ProLock} label=${field.title} block=${['group', 'repeater', 'code_editor'].includes(field.type) || card}>${inner}<//>` : inner;
	const switcher = field.type === 'bp3d_responsive_dimensions' && html`<${DeviceSwitcher} field=${field} value=${value} device=${ctx.device || 'desktop'} setDevice=${ctx.setDevice || (() => {})} onChange=${set} locked=${locked} />`;
	const titled = display && (field.title || '').trim() !== '';
	const invalid = ctx.invalid?.has(field.id);
	const error = invalid && ctx.errors?.[field.id] && html`<p class="bfields-field-error" role="alert">${ctx.errors[field.id]}</p>`;
	const desc = (text) => (text ? html`<p class="bfields-hint">${text}</p>` : null);

	if (card && (!display || titled)) {
		const inline = field.type === 'button_set' && field.layout !== 'mode-grid' ? true : titled || COMPACT.includes(field.type);
		return html`<div class=${cx('bfields-card', inline && 'bfields-card--inline', invalid && 'is-invalid')} data-field=${field.id}>
			<div class="bfields-card__head">
				<span class="bfields-card__head-icon"><${BfIcon} name=${field.icon} size=${20} /></span>
				<div>
					<h4 class="bfields-card__title">${field.title}${field.deprecated && html`<b style="color:red"> (Deprecated)</b>`}${switcher}${locked && html`<${ProPill} />`}</h4>
					${field.subtitle && field.subtitle.trim() && html`<p class="bfields-card__desc">${field.subtitle}</p>`}
				</div>
			</div>
			<div class="bfields-card__control">${control}</div>
			${error}${desc(field.desc)}
		</div>`;
	}

	if (display) {
		if (!titled) return html`<div class="bfields-row bfields-row--display">${control}</div>`;
		return html`<div class="bfields-row bfields-row--fill bfields-row--titled">
			${showIcons && html`<span class="bfields-row__icon"><${BfIcon} name=${field.icon} size=${18} /></span>`}
			<div class="bfields-row__main"><h4 class="bfields-row__title">${field.title}</h4></div>
			<div class="bfields-row__control">${control}${desc(field.desc)}</div>
		</div>`;
	}

	const wide = ['group', 'repeater', 'fieldset'].includes(field.type) || (row !== undefined && (field.type === 'media' || field.type === 'upload')) || (field.type === 'button_set' && field.layout === 'mode-grid');
	const fill = field.type === 'code_editor' || field.type === 'text' || field.type === 'textarea';
	return html`<div
		class=${cx('bfields-row', field.type === 'radio' && 'bfields-row--spaced', wide && 'bfields-row--wide', fill && 'bfields-row--fill', field.type === 'code_editor' && 'bfields-row--code', !wide && (field.type === 'media' || field.type === 'upload') && 'bfields-row--media', locked && 'bfields-row--locked', invalid && 'is-invalid')}
		data-field=${field.id}
	>
		${showIcons && html`<span class="bfields-row__icon"><${BfIcon} name=${field.icon} size=${18} /></span>`}
		<div class="bfields-row__main">
			<h4 class="bfields-row__title">${field.title}${field.deprecated && html`<b style="color:red"> (Deprecated)</b>`}${switcher}${locked && html`<${ProPill} />`}</h4>
			${field.subtitle && field.subtitle.trim() && html`<p class="bfields-row__desc">${field.subtitle}</p>`}
			${field.desc && html`<p class="bfields-row__desc">${field.desc}</p>`}
		</div>
		<div class="bfields-row__control">${control}${error}</div>
	</div>`;
}

/** layout/FieldGroup.tsx: a collapsible card around a `field_group`'s children. */
export function FieldGroupCard({ group, values, onChange, showIcons, layout, ctx }) {
	const [open, setOpen] = useState(!group.collapsed);
	const kids = group.fields || [];
	if (!isVisible(group.dependency, values) || !kids.some((f) => isVisible(f.dependency, values))) return null;
	return html`<div class=${cx('bfields-field-group', open && 'is-open')} data-group=${group.id}>
		<h3 class="bfields-field-group__head">
			<button type="button" class="bfields-field-group__toggle" aria-expanded=${open} onClick=${() => setOpen(!open)}>
				${group.icon && html`<span class="bfields-field-group__icon"><${BfIcon} name=${group.icon} size=${18} /></span>`}
				<span class="bfields-field-group__title">${group.title}</span>
				<span class="bfields-field-group__chevron"><${BfIcon} name="chevron-down" size=${16} /></span>
			</button>
		</h3>
		<div class="bfields-field-group__body" role="region" hidden=${!open}>
			${kids.map((f, i) => html`<${BfField} key=${(f.id || f.type) + i} field=${f} values=${values} onChange=${onChange} showIcons=${showIcons} layout=${layout} ctx=${ctx} />`)}
		</div>
	</div>`;
}

/** A section's fields, `field_group`s drawn as their cards (FieldGroup.tsx renderFields). */
export function BfFields({ fields, values, onChange, showIcons = true, layout = 'rows', ctx }) {
	return fields.map((f, i) =>
		f.type === 'field_group'
			? html`<${FieldGroupCard} key=${'group:' + f.id} group=${f} values=${values} onChange=${onChange} showIcons=${showIcons} layout=${layout} ctx=${ctx} />`
			: html`<${BfField} key=${(f.id || f.type) + i} field=${f} values=${values} onChange=${onChange} showIcons=${showIcons} layout=${layout} ctx=${ctx} />`
	);
}

/** core/clipboard.ts: the Clipboard API, else a hidden textarea + execCommand. */
export function copyToClipboard(text) {
	const fallback = () => {
		try {
			const ta = document.createElement('textarea');
			ta.value = text;
			ta.setAttribute('readonly', '');
			ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			ta.remove();
		} catch {
			// Nothing else to try.
		}
	};
	try {
		if (window.isSecureContext && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(fallback);
		else fallback();
	} catch {
		fallback();
	}
}

/** The Tabs on top / Tabs in a sidebar switch (TabsLayout.tsx); the choice is kept per screen in localStorage. */
export function useTabsPosition(unique) {
	const key = 'bfields-tabs:' + unique;
	const [pos, setPos] = useState(() => {
		try {
			return localStorage.getItem(key) === 'left' ? 'left' : 'top';
		} catch {
			return 'top';
		}
	});
	useEffect(() => {
		try {
			localStorage.setItem(key, pos);
		} catch {
			// Blocked storage: the choice lasts for this visit.
		}
	}, [pos]);
	return [pos, setPos];
}

export function TabsSwitch({ value, onChange }) {
	return html`<div class="bfields-tabs-switch" role="group" aria-label="Tab layout">
		${[
			['top', 'Tabs on top', 'panel-top'],
			['left', 'Tabs in a sidebar', 'panel-left'],
		].map(([id, label, icon]) => html`<button type="button" key=${id} aria-pressed=${value === id} aria-label=${label} title=${label} onClick=${() => onChange(id)}><${BfIcon} name=${icon} size=${18} /></button>`)}
	</div>`;
}
