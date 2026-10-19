// 3D Viewer → Settings in the plugin's "New" interface (bfields, 3d-viewer/lib/bfields/ui/layout/AdminShell.tsx).
// Free shows the Pro tabs and fields locked; Save Changes writes the whole option to lv.settings.
import { html, useState, useEffect, useMemo, useRef, useCallback, cx } from '../../js/core/ui.js';
import { store, useStore } from '../../js/core/store.js';
import { go } from '../../js/core/router.js';
import { WpAdmin } from '../../js/screens/admin/chrome.js';
import { useIsPro } from '../core/plan.js';
import { toast } from '../core/bus.js';
import { ProPill, ProLock } from '../ui/pro.js';
import { settingsSections, settingsDefaults, PRO_ONLY_MIME } from './settings-data.js';

// bfields stickyBar.ts: a zero-height marker after the bar is below the window exactly while the bar is pinned.
function useStuckBar() {
	const [stuck, setStuck] = useState(false);
	const observer = useRef(null);
	const marker = useCallback((node) => {
		observer.current?.disconnect();
		observer.current = null;
		if (!node || typeof IntersectionObserver === 'undefined') return setStuck(false);
		observer.current = new IntersectionObserver(
			(entries) => {
				const entry = entries[entries.length - 1];
				if (!entry) return;
				const bottom = entry.rootBounds?.bottom ?? window.innerHeight;
				setStuck(!entry.isIntersecting && entry.boundingClientRect.top >= bottom);
			},
			{ rootMargin: '0px 0px -20px 0px' }
		);
		observer.current.observe(node);
	}, []);
	useEffect(() => () => observer.current?.disconnect(), []);
	return [marker, stuck];
}

const LOGO = new URL('../img/brand/3d-viewer-logo.svg', import.meta.url).href;

// bfields' icon vocabulary (lib/bfields/ui/core/icons.tsx), Lucide geometry.
const ICONS = {
	'gear': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
	'pencil': '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
	'eye': '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
	'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
	'save': '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
	'reset': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
	'trash': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
	'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
	'warning': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
	'copy': '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
	'move': '<path d="M12 2v20M2 12h20"/><path d="m15 5-3-3-3 3m0 14 3 3 3-3M5 9l-3 3 3 3m14 0 3-3-3-3"/>',
	'zoom-in': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
	'zoom-out': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8 11h6"/>',
	'maximize': '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
	'loader': '<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/>',
	'palette': '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
	'image': '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
	'code': '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
	'cart': '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
	'chart': '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
	'layers': '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m6.08 10.37-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"/><path d="m6.08 15.37-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"/>',
	'sliders': '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
	'link': '<path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8"/>',
	'zap': '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
	'puzzle': '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>',
	'chain': '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
	'diamond': '<path d="M12 3 21 12l-9 9-9-9z"/>',
	'terminal': '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
	'upload': '<path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/>',
	'send': '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
	'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
	'refresh': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
	'maximize-2': '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
	'monitor': '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
	'tablet': '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M12 18h.01"/>',
	'phone': '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
	'grid': '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
	'panel-top': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/>',
	'panel-left': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
	'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
	'cloud-drizzle': '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v1M8 14v1M16 19v1M16 14v1M12 21v1M12 16v1"/>',
	'download': '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
	'camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
	'grip': '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
	'chevron-down': '<path d="m6 9 6 6 6-6"/>',
	'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
	'minus': '<path d="M5 12h14"/>',
	'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
	check: '<path d="M20 6 9 17l-5-5"/>',
};
// Codestar / Font Awesome names the field files use, as bfields maps them.
const ALIASES = { cog: 'gear', 'shopping-cart': 'cart', 'chart-line': 'chart', cube: 'box', crosshairs: 'eye', mobile: 'phone' };

export function BfIcon({ name, size = 20, stroke = 2 }) {
	const key = String(name || 'box').replace(/^(fa[srlbd]?)[\s-]+/, '').replace(/^fa-/, '');
	const inner = ICONS[key] || ICONS[ALIASES[key]] || ICONS.box;
	return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" dangerouslySetInnerHTML=${{ __html: inner }}></svg>`;
}

const truthy = (v) => (typeof v === 'boolean' ? v : typeof v === 'number' ? v === 1 : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));

function visible(field, values) {
	if (!field.dependency) return true;
	const [id, op, want] = field.dependency;
	const v = values[id];
	const eq = typeof want === 'boolean' ? truthy(v) === want : String(v ?? '') === String(want);
	return op === '!=' ? !eq : eq;
}

function readTabsPos() {
	try {
		return localStorage.getItem('bfields-tabs:_bp3d_settings_') === 'left' ? 'left' : 'top';
	} catch {
		return 'top';
	}
}

function writeTabsPos(v) {
	try {
		localStorage.setItem('bfields-tabs:_bp3d_settings_', v);
	} catch {
		// Storage blocked: the choice lasts for this visit.
	}
}

// Unsaved edits survive tab switches (each tab is its own route, so the screen remounts).
let draft = null;

/* ---- controls (bfields/ui/fields/*) ---- */

function Toggle({ field, value, onChange, locked }) {
	const on = truthy(value);
	const danger = field.layout === 'danger';
	const onLabel = field.text_on || 'Enabled';
	const offLabel = field.text_off || (danger ? 'No' : 'Disabled');
	return html`<button type="button" class=${cx('bfields-toggle', on && 'bfields-toggle--on', danger && !on && 'bfields-toggle--danger')} role="switch" aria-checked=${on} aria-label=${field.title} disabled=${locked} onClick=${() => onChange(!on)}>
		<span class="bfields-toggle__track"></span>
		<span class="bfields-toggle__label">${on ? onLabel : offLabel}</span>
	</button>`;
}

const optionList = (field) => (field.order || Object.keys(field.options)).map((k) => [k, field.options[k]]);

function Segmented({ field, value, onChange, locked }) {
	return html`<div class="bfields-segmented" role="radiogroup" aria-label=${field.title}>
		${optionList(field).map(([k, label]) => html`<button type="button" key=${k} aria-pressed=${String(value) === k} disabled=${locked} onClick=${() => onChange(k)}>${label}</button>`)}
	</div>`;
}

function Radios({ field, value, onChange, locked }) {
	return html`<div class="bfields-radios" role="radiogroup" aria-label=${field.title}>
		${optionList(field).map(
			([k, label]) => html`<button type="button" key=${k} role="radio" aria-checked=${String(value) === k} disabled=${locked} class=${cx('bfields-radio', String(value) === k && 'bfields-radio--on')} onClick=${() => onChange(k)}>
				<span class="bfields-radio__dot"></span>${label}
			</button>`
		)}
	</div>`;
}

function Select({ field, value, onChange, locked, class: cls = 'bfields-select', options }) {
	return html`<select class=${cls} value=${String(value ?? '')} disabled=${locked} aria-label=${field.title} onChange=${(e) => onChange(e.currentTarget.value)}>
		${(options || optionList(field)).map(([k, label]) => html`<option key=${k} value=${k}>${label}</option>`)}
	</select>`;
}

function NumberInput({ field, value, onChange, locked }) {
	const stepper = field.type === 'spinner';
	const nudge = (dir) => {
		const n = Number(value) || 0;
		const next = Math.min(field.max ?? Infinity, Math.max(field.min ?? -Infinity, n + dir));
		onChange(next);
	};
	const step = (dir) => html`<button type="button" class="bfields-number__step" tabindex="-1" aria-label=${dir > 0 ? 'Increase' : 'Decrease'} disabled=${locked} onClick=${() => nudge(dir)}>
		<${BfIcon} name=${dir > 0 ? 'plus' : 'minus'} size=${16} />
	</button>`;
	return html`<span class=${cx('bfields-number', stepper && 'bfields-number--stepper', field.unit && 'bfields-number--unit')}>
		${stepper && step(-1)}
		<input type="number" inputmode="decimal" class="bfields-number__input" value=${value ?? ''} min=${field.min} max=${field.max} step=${field.step ?? 'any'} disabled=${locked} aria-label=${field.title} onInput=${(e) => onChange(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} />
		${field.unit && html`<span class="bfields-number__unit">${field.unit}</span>`}
		${stepper && step(1)}
	</span>`;
}

function Slider({ field, value, onChange, locked }) {
	const lo = field.min ?? 0;
	const hi = field.max ?? 100;
	const n = value === '' || value == null ? lo : Number(value);
	const pct = hi > lo ? ((n - lo) / (hi - lo)) * 100 : 0;
	return html`<div class="bfields-slider">
		<input type="range" value=${n} min=${lo} max=${hi} step=${field.step ?? 1} disabled=${locked} aria-label=${field.title} style=${{ '--bfields-range-pct': Math.max(0, Math.min(100, pct)) + '%' }} onInput=${(e) => onChange(e.currentTarget.value)} />
		<input type="number" class="bfields-slider__value" value=${value ?? ''} min=${lo} max=${hi} step=${field.step ?? 1} disabled=${locked} aria-label=${field.title} onInput=${(e) => onChange(e.currentTarget.value)} />
	</div>`;
}

function TextInput({ field, value, onChange, locked }) {
	const [copied, setCopied] = useState(false);
	const text = typeof value === 'string' ? value : '';
	if (field.layout === 'selector') {
		const copy = () => {
			try {
				navigator.clipboard?.writeText(text || field.placeholder || '').catch(() => {});
			} catch {
				// No clipboard access: the chip still shows the selector.
			}
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		};
		return html`<span class="bfields-selector-field">
			<input type="text" value=${text} placeholder=${field.placeholder} disabled=${locked} spellcheck=${false} size=${Math.max(1, (text || field.placeholder || '').length)} aria-label=${field.title} onInput=${(e) => onChange(e.currentTarget.value)} />
			<button type="button" onClick=${copy} aria-label="Copy selector" title=${copied ? 'Copied' : 'Copy'}><${BfIcon} name=${copied ? 'check' : 'copy'} size=${16} /></button>
		</span>`;
	}
	return html`<input type="text" class="bfields-input" value=${text} placeholder=${field.placeholder} disabled=${locked} aria-label=${field.title} onInput=${(e) => onChange(e.currentTarget.value)} />`;
}

function Code({ field, value, onChange, locked }) {
	return html`<div class=${cx('bfields-code', locked && 'is-locked')}>
		<textarea class="bfields-code__input" spellcheck=${false} rows="8" value=${value || ''} disabled=${locked} aria-label=${field.title} placeholder="/* .bp3d-model-viewer { … } */" onInput=${(e) => onChange(e.currentTarget.value)}></textarea>
	</div>`;
}

function Color({ field, value, onChange, locked }) {
	const text = typeof value === 'string' ? value : '';
	const empty = text === '' || text.toLowerCase() === 'transparent';
	const hex = /^#[0-9a-f]{6}$/i.test(text) ? text : '#ffffff';
	return html`<span class="bfields-color">
		<label class="bfields-colorpick" title=${text || 'Default'}>
			<span class=${cx('bfields-colorpick__swatch', empty && 'bfields-colorpick__swatch--empty ld-set-swatch--empty')} style=${empty ? undefined : { background: text }}></span>
			Select Color
			<input type="color" class="bfields-colorpick__picker" value=${hex} disabled=${locked} aria-label=${field.title} onInput=${(e) => onChange(e.currentTarget.value)} />
		</label>
		${!empty && field.default === 'transparent' && html`<button type="button" class="bfields-btn bfields-btn--link ld-set-clear" disabled=${locked} onClick=${() => onChange('transparent')}>Clear</button>`}
	</span>`;
}

function Dimension({ field, value, onChange, locked }) {
	const v = value && typeof value === 'object' ? value : {};
	const axis = field.axis;
	return html`<div class="bfields-dim">
		<input type="number" class="bfields-input" value=${v[axis] ?? ''} disabled=${locked} aria-label=${field.title} onInput=${(e) => onChange({ ...v, [axis]: e.currentTarget.value })} />
		<${Select} field=${field} value=${v.unit} locked=${locked} options=${field.units.map((u) => [u, u])} onChange=${(unit) => onChange({ ...v, unit })} />
	</div>`;
}

function Media({ field, value, onChange, locked }) {
	return html`<div class="bfields-field-row">
		<input type="text" class="bfields-input" value=${value || ''} placeholder="https://" disabled=${locked} aria-label=${field.title} onInput=${(e) => onChange(e.currentTarget.value)} />
		<button type="button" class="bfields-btn bfields-btn--soft" disabled=${locked} onClick=${() => toast('The Media Library is not part of this demo. Paste an image URL instead.')}>${field.button_title || 'Upload'}</button>
	</div>`;
}

const CONTROLS = { switcher: Toggle, button_set: Segmented, radio: Radios, select: Select, number: NumberInput, spinner: NumberInput, slider: Slider, text: TextInput, code_editor: Code, color: Color, dimensions: Dimension, media: Media };

/** Allowed Mime Types: the full-width tile card (Choice.tsx, presentation 'tiles'). */
function MimeTiles({ field, value, onChange, locked }) {
	const selected = Array.isArray(value) ? value : [];
	const keys = Object.keys(field.options);
	const pick = (k) => onChange(selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k]);
	return html`<div class="bfields-row--card" data-field=${field.id}>
		<div class="bfields-subcard">
			<div class="bfields-subcard__head">
				<div>
					<h3 class="bfields-subcard__title">${field.title}</h3>
					<p class="bfields-subcard__desc">${field.desc}</p>
				</div>
				<div class="bfields-linkbtns">
					<button type="button" class="bfields-linkbtn" disabled=${locked} onClick=${() => onChange(keys)}>Select All</button>
					<button type="button" class="bfields-linkbtn bfields-linkbtn--muted" disabled=${locked} onClick=${() => onChange([])}>Deselect All</button>
				</div>
			</div>
			<div class="bfields-mime-grid" role="group" aria-label=${field.title}>
				${keys.map((k) => {
					const on = selected.includes(k);
					return html`<button type="button" key=${k} role="checkbox" aria-checked=${on} disabled=${locked} class=${cx('bfields-mime', on && 'bfields-mime--on')} onClick=${() => pick(k)}>
						<span class="bfields-mime__box">${on && html`<${BfIcon} name="check" size=${12} stroke=${3} />`}</span>
						<span><strong style="font-weight:600">${k.toUpperCase()}</strong><span class="bfields-mime__ext"> (.${k})</span></span>
					</button>`;
				})}
			</div>
			${field.after && html`<p class="bfields-infobar"><${BfIcon} name="info" size=${18} />${field.after}</p>`}
		</div>
	</div>`;
}

function InterfaceRow({ showIcons }) {
	return html`<div class="bfields-row bfields-row--fill bfields-row--titled">
		${showIcons && html`<span class="bfields-row__icon"><${BfIcon} name="monitor" size=${18} /></span>`}
		<div class="bfields-row__main">
			<h4 class="bfields-row__title">Admin interface</h4>
			<p class="bfields-row__desc">Only changes how the screens look. Settings and viewers stay the same.</p>
		</div>
		<div class="bfields-row__control">
			<div class="bp3d-admin-ui-switch" role="group" aria-label="Admin interface">
				<span class="bp3d-admin-ui-switch__opt is-current" aria-current="true">New</span>
				<a class="bp3d-admin-ui-switch__opt" href="#" title="Switch to the classic interface" aria-label="Switch to the classic interface" onClick=${(e) => {
					e.preventDefault();
					toast('The Classic interface is not part of this demo. Both edit the same settings.');
				}}>Classic</a>
			</div>
		</div>
	</div>`;
}

/** Viewer::upgrade_section(): the notice the Pro build shows on its locked tabs. */
function UpgradeRow() {
	return html`<div class="bfields-row bfields-row--display">
		<div class="bfields-content bfields-content--content">
			<div class="bp3d-metabox-upgrade-section ld-set-upgrade">
				3D Viewer lets you embed interactive 3D models and 360 product views on WordPress sites with almost all 3D file formats.
				<a class="button button-bplugins" href="#v3d.help.pricing">Upgrade to PRO </a>
			</div>
		</div>
	</div>`;
}

function AnalyticsIntro() {
	return html`<div class="bfields-row bfields-row--display">
		<div class="bfields-content bfields-content--content">
			<p>See what your 3D models are doing for your store — views, interaction, time in 3D, AR launches by platform, hotspot clicks and WooCommerce add-to-cart. <a href="#v3d.analytics">Open Analytics →</a></p>
			<p>Anonymous by design: a view lives in memory for one page load. No cookies, no fingerprints; no IP addresses or personal data are stored. Detailed rows are deleted after the retention period; daily totals are kept.</p>
		</div>
	</div>`;
}

function FieldRow({ field, values, onChange, showIcons, locked }) {
	if (field.type === 'interface') return html`<${InterfaceRow} showIcons=${showIcons} />`;
	if (field.type === 'content') return html`<${AnalyticsIntro} />`;
	if (!visible(field, values)) return null;
	const value = values[field.id];
	const set = (v) => onChange(field.id, v);
	if (field.layout === 'tile-grid') return html`<${MimeTiles} field=${field} value=${value} onChange=${set} locked=${false} />`;
	const Control = CONTROLS[field.type] || TextInput;
	const control = html`<${Control} field=${field} value=${value} onChange=${set} locked=${false} />`;
	const wrapped = locked ? html`<${ProLock} label=${field.title}>${control}<//>` : control;
	const body = html`
		<div class="bfields-row__main">
			<h4 class="bfields-row__title">${field.title}${locked && html`<${ProPill} />`}</h4>
			${field.subtitle && html`<p class="bfields-row__desc">${field.subtitle}</p>`}
			${field.desc && html`<p class="bfields-row__desc">${field.desc}</p>`}
		</div>
		<div class="bfields-row__control">${wrapped}</div>
	`;
	if (field.layout === 'danger') {
		return html`<div class="bfields-danger-card" data-field=${field.id}>
			<span class="bfields-danger-card__icon"><${BfIcon} name="trash" size=${22} /></span>
			${body}
		</div>`;
	}
	const fill = field.type === 'code_editor' || (field.type === 'text' && field.layout !== 'selector');
	return html`<div
		class=${cx('bfields-row', field.type === 'radio' && 'bfields-row--spaced', fill && 'bfields-row--fill', field.type === 'code_editor' && 'bfields-row--code', field.type === 'media' && 'bfields-row--media', field.layout === 'selector' && 'bfields-row--selector')}
		data-field=${field.id}
	>
		${showIcons && html`<span class="bfields-row__icon"><${BfIcon} name=${field.icon} size=${18} /></span>`}
		${body}
	</div>`;
}

export default function Settings({ params = [] }) {
	const pro = useIsPro();
	const saved = useStore((s) => s.lv?.settings);
	const sections = useMemo(() => settingsSections(pro), [pro]);
	const [values, setValues] = useState(() => draft || { ...settingsDefaults(), ...(saved || {}) });
	const [search, setSearch] = useState('');
	const [busy, setBusy] = useState(false);
	const [barEnd, barStuck] = useStuckBar();
	const [status, setStatus] = useState(null);
	const [tabsPos, setTabsPos] = useState(readTabsPos);
	const dirty = draft !== null;
	const section = sections.find((s) => s.id === params[0]) || sections[0];

	useEffect(
		() => () => {
			if (!location.hash.startsWith('#v3d.settings')) draft = null;
		},
		[]
	);

	// A plan switch is a different plugin's page: reload the stored option unless there are unsaved edits.
	useEffect(() => {
		if (!draft) setValues({ ...settingsDefaults(), ...(store.get().lv?.settings || {}) });
	}, [pro]);

	const onChange = (id, v) => {
		const next = { ...values, [id]: v };
		draft = next;
		setValues(next);
		setStatus(null);
	};

	const save = () => {
		setBusy(true);
		setStatus(null);
		setTimeout(() => {
			// Read-modify-write: keys this page doesn't show (the other plan's) stay as stored.
			store.patch('lv.settings', (old) => {
				const next = { ...(old || {}), ...values };
				const stored = Array.isArray(old?.allowed_mime_types) ? old.allowed_mime_types : null;
				// Free can't show Pro's extra types, so their stored ticks survive a free save.
				if (!pro && stored && Array.isArray(next.allowed_mime_types)) {
					next.allowed_mime_types = [...new Set([...next.allowed_mime_types, ...stored.filter((x) => PRO_ONLY_MIME.includes(x))])];
				}
				return next;
			});
			// Like bfields' store.commit(): the form shows what was stored, merged keys included.
			setValues({ ...settingsDefaults(), ...(store.get().lv?.settings || {}) });
			draft = null;
			setBusy(false);
			setStatus('Settings saved.');
			toast('Settings saved.');
		}, 450);
	};

	const needle = search.trim().toLowerCase();
	const matches = (f) => [f.title, f.subtitle, f.desc, f.id].join(' ').toLowerCase().includes(needle);
	const sectionLocked = (s) => s.pro && !pro;
	const pool = needle ? sections.flatMap((s) => s.fields.map((f) => ({ f, s }))).filter(({ f }) => f.title && matches(f)) : section.fields.map((f) => ({ f, s: section }));
	const rows = pool.filter(({ f }) => f.layout !== 'danger');
	const cards = pool.filter(({ f }) => f.layout === 'danger');
	const showIcons = section.fields.some((f) => f.icon);
	const flush = !(rows[0] && rows[0].f.layout === 'tile-grid');
	const sidebar = tabsPos === 'left';
	const row = ({ f, s }) => html`<${FieldRow} key=${s.id + f.id} field=${f} values=${values} onChange=${onChange} showIcons=${showIcons || needle} locked=${!pro && (f.pro || sectionLocked(s))} />`;

	return html`<${WpAdmin} current="v3d-settings" title="3D Viewer Settings">
		<div class="bfields-root bfields-app ld-set" style="--bfields-primary:#1b5cf0;--bfields-save:#1b5cf0">
			<div class="bfields-admin bfields-admin--align-start">
				<div class="bfields-admin__inner" style="--bfields-container:none">
					<div class="bfields-settings-head">
						<img class="bfields-settings-head__logo" src=${LOGO} alt="" />
						<h1 class="bfields-settings-head__title">3D Viewer Settings</h1>
						<div class="bfields-search">
							<${BfIcon} name="search" size=${20} />
							<input type="search" value=${search} placeholder="Search settings..." aria-label="Search settings" onInput=${(e) => setSearch(e.currentTarget.value)} />
						</div>
						<div class="bfields-tabs-switch" role="group" aria-label="Tab layout">
							${[
								['top', 'Tabs on top', 'panel-top'],
								['left', 'Tabs in a sidebar', 'panel-left'],
							].map(
								([id, label, icon]) => html`<button type="button" key=${id} aria-pressed=${tabsPos === id} aria-label=${label} title=${label} onClick=${() => { setTabsPos(id); writeTabsPos(id); }}>
									<${BfIcon} name=${icon} size=${18} />
								</button>`
							)}
						</div>
					</div>

					<div class=${cx('bfields-panel', sidebar && 'bfields-panel--sidebar')}>
						<div class="bfields-tabs" role="tablist" aria-orientation=${sidebar ? 'vertical' : 'horizontal'}>
							${sections.map(
								(s) => html`<button type="button" key=${s.id} role="tab" aria-selected=${s.id === section.id} class=${cx('bfields-tab', s.id === section.id && 'bfields-tab--active')} onClick=${() => { setSearch(''); go('v3d.settings.' + s.id); }}>
									<${BfIcon} name=${s.icon} size=${17} />${s.title}${sectionLocked(s) && html`<${ProPill} />`}
								</button>`
							)}
						</div>

						<div class=${cx('bfields-settings-body', flush && 'bfields-settings-body--flush')}>
							${needle && !pool.length && html`<p class="bfields-empty">No settings match “${search.trim()}”.</p>`}
							${!needle && sectionLocked(section) && html`<${UpgradeRow} />`}
							${rows.map(row)}
							${cards.map(row)}

							<div class=${cx('bfields-actions', dirty && 'is-dirty', dirty && barStuck && 'is-stuck')}>
								${status
									? html`<span class="bfields-actions__status bfields-actions__status--success" role="status">${status}</span>`
									: dirty && html`<span class="bfields-actions__status bfields-actions__status--dirty" role="status">Unsaved changes</span>`}
								<button type="button" class="bfields-btn bfields-btn--save" disabled=${busy} onClick=${save}>
									<${BfIcon} name="save" size=${17} />${busy ? 'Saving...' : 'Save Changes'}
								</button>
							</div>
							<span class="bfields-actions__end" ref=${barEnd} aria-hidden="true"></span>
						</div>
					</div>
				</div>
			</div>
		</div>
	<//>`;
}
