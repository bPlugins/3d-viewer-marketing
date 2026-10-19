// bfields "New" interface pieces for 3D Viewer's product meta box, ported from 3d-viewer/lib/bfields/ui:
// layout/FieldRenderer.tsx + FieldGroup.tsx, fields/*.tsx. Fields are described as Codestar-style objects
// (type, title, subtitle, desc, dependency…) so the box below reads like ProductMeta(Pro).php.
import { html, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { useStore } from '../../js/core/store.js';
import { ProPill, ProLock } from '../ui/pro.js';
import { isPro } from '../core/plan.js';
import { MediaFrame } from './media.js';

// ── icons (bfields/ui/core/icons.tsx, Lucide geometry) ─────────────────────
const ICONS = {
	grip: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
	'chevron-down': '<path d="m6 9 6 6 6-6"/>',
	'arrow-up': '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
	'arrow-down': '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
	copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
	trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
	plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
	upload: '<path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/>',
	info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
	warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
	check: '<path d="M20 6 9 17l-5-5"/>',
	search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
	x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
	zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
	sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
	box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
};

export function Icon({ name, size = 20, stroke = 2, class: cls }) {
	return html`<svg class=${cls} width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" dangerouslySetInnerHTML=${{ __html: ICONS[name] || ICONS.box }}></svg>`;
}

// ── values and dependencies (core/dependency.ts) ───────────────────────────
export const truthy = (v) => (typeof v === 'boolean' ? v : typeof v === 'number' ? v === 1 : ['1', 'true', 'yes', 'on'].includes(String(v ?? '').toLowerCase()));

const checkBoolean = (v) => (v === true || v === 1 || v === '1' || v === 'true' ? true : v === false || v === 0 || v === '0' || v === 'false' || v == null ? false : v);
const toNumber = (v) => (typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'number' ? v : String(v).trim() === '' ? 0 : Number(String(v).trim()));
function looseEquals(a, b) {
	if (typeof a === 'boolean' === (typeof b === 'boolean') && typeof a === typeof b) return a === b;
	const an = toNumber(a);
	const bn = toNumber(b);
	return !Number.isNaN(an) && !Number.isNaN(bn) && an === bn;
}

/** Codestar's ['a|b', '==|!=', 'x|y', 'all'] (or a list of them) as bfields rules. */
function rules(dep) {
	if (!dep) return [];
	const list = Array.isArray(dep[0]) ? dep : [dep];
	return list.flatMap(([ids, conds, vals, all]) => {
		const c = String(conds).split('|');
		const v = String(vals ?? '').split('|');
		return String(ids)
			.split('|')
			.map((controller, i) => ({ controller, condition: c[i] ?? c[0], value: v[i] ?? '', global: all === 'all' }));
	});
}

/** Dependencies read a select holding a value it no longer offers as its first option (dependency.ts shown()). */
function resolve(rule, ctx) {
	const own = !rule.global && ctx.row && Object.prototype.hasOwnProperty.call(ctx.row, rule.controller);
	const raw = own ? ctx.row[rule.controller] : ctx.values[rule.controller];
	const choices = (own ? null : ctx.choices?.[rule.controller]) || null;
	if (!choices || (raw != null && typeof raw !== 'string' && typeof raw !== 'number')) return raw;
	return choices.includes(String(raw ?? '')) ? raw : choices[0];
}

export function isVisible(dep, ctx) {
	return rules(dep).every((r) => {
		const cur = resolve(r, ctx);
		const eq = looseEquals(checkBoolean(r.value), checkBoolean(cur));
		return r.condition === '!=' ? !eq : eq;
	});
}

const optionList = (f) => (Array.isArray(f.options) ? f.options : Object.entries(f.options || {})).map(([k, l]) => [String(k), l]);

// ── controls (fields/*.tsx) ────────────────────────────────────────────────
function Toggle({ f, value, onChange, id }) {
	const on = truthy(value);
	return html`<button type="button" id=${id} class=${cx('bfields-toggle', on && 'bfields-toggle--on')} role="switch" aria-checked=${on} aria-label=${f.title} onClick=${() => onChange(!on)}>
		<span class="bfields-toggle__track"></span>
		<span class="bfields-toggle__label">${on ? f.textOn || 'Enabled' : f.textOff || 'Disabled'}</span>
	</button>`;
}

function Choice({ f, value, onChange, id }) {
	const options = optionList(f);
	const cur = String(value ?? '');
	if (f.presentation === 'segmented')
		return html`<div class="bfields-segmented" role="radiogroup" aria-label=${f.title}>
			${options.map(([k, l]) => html`<button type="button" key=${k} aria-pressed=${cur === k} onClick=${() => onChange(k)}>${l}</button>`)}
		</div>`;
	if (f.presentation === 'radio')
		return html`<div class="bfields-radios" role="radiogroup" aria-label=${f.title}>
			${options.map(
				([k, l]) => html`<button type="button" key=${k} role="radio" aria-checked=${cur === k} class=${cx('bfields-radio', cur === k && 'bfields-radio--on')} onClick=${() => onChange(k)}>
					<span class="bfields-radio__dot"></span>${l}
				</button>`
			)}
			${f.after}
		</div>`;
	if (f.presentation === 'cards') {
		const meta = f.optionMeta || {};
		return html`<div class="bfields-mode-grid" role="radiogroup" aria-label=${f.title} id=${id}>
			${options.map(([k, l]) => {
				const on = cur === k;
				const m = meta[k] || {};
				return html`<button type="button" key=${k} role="radio" aria-checked=${on} class=${cx('bfields-mode', !m.tag && 'bfields-mode--plain', on && 'bfields-mode--on')} onClick=${() => onChange(k)}>
					<span class="bfields-mode__icon"><${Icon} name=${m.icon} size=${18} /></span>
					<span class="bfields-mode__body">
						<span class="bfields-mode__name">${l}${m.tag && html`<span class="bfields-mode__tag">${m.tag}</span>`}</span>
						${m.perks?.length && html`<span class="bfields-mode__perks">${m.perks.map((p) => html`<span key=${p}>${'\u2713 ' + p}</span>`)}</span>`}
					</span>
					<span class="bfields-mode__radio"></span>
				</button>`;
			})}
		</div>`;
	}
	// A select holding a value it does not offer shows its first option, as Codestar's form does.
	const shown = options.some(([k]) => k === cur) ? cur : options[0]?.[0] ?? '';
	return html`<select id=${id} class="bfields-select" aria-label=${f.title} value=${shown} onChange=${(e) => onChange(e.currentTarget.value)}>
		${options.map(([k, l]) => html`<option key=${k} value=${k}>${l}</option>`)}
	</select>`;
}

function Text({ f, value, onChange, id }) {
	const text = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
	if (f.type === 'textarea')
		return html`<textarea id=${id} class="bfields-textarea" rows="3" style="--bfields-textarea-rows:3" value=${text} placeholder=${f.placeholder} aria-label=${f.title} onInput=${(e) => onChange(e.currentTarget.value)}></textarea>`;
	return html`<input id=${id} type="text" class="bfields-input" value=${text} placeholder=${f.placeholder} aria-label=${f.title} onInput=${(e) => onChange(e.currentTarget.value)} />`;
}

/** `slider` (Number.tsx) and `number` (NumberInput.tsx). The store keeps the type it already holds. */
function NumberField({ f, value, onChange, id }) {
	const [typing, setTyping] = useState(null);
	const numeric = f.store === 'number';
	const text = typing ?? (value === undefined || value === null ? '' : String(value));
	const write = (raw) => {
		setTyping(raw);
		if (!numeric) return onChange(raw);
		if (raw.trim() !== '' && Number.isFinite(Number(raw)) && !raw.endsWith('.')) onChange(Number(raw));
	};
	if (f.type !== 'slider')
		return html`<span class="bfields-number">
			<input id=${id} type="number" inputmode="decimal" class="bfields-number__input" value=${text} min=${f.min} max=${f.max} step=${f.step ?? 'any'} aria-label=${f.title} onInput=${(e) => write(e.currentTarget.value)} onBlur=${() => setTyping(null)} />
		</span>`;
	const lo = Number(f.min ?? 0);
	const hi = Number(f.max ?? 100);
	const n = text === '' ? lo : Number(text);
	const pct = hi > lo ? ((n - lo) / (hi - lo)) * 100 : 0;
	// Clamp and snap on blur only, so "0." survives typing.
	const settle = () => {
		setTyping(null);
		if (text.trim() === '') return;
		const grid = Number(f.step ?? 1) || 1;
		const places = (String(grid).split('.')[1] ?? '').length;
		const x = Number.isFinite(Number(text)) ? Number(text) : lo;
		const next = Number(Math.min(hi, lo + Math.round((Math.min(hi, Math.max(lo, x)) - lo) / grid) * grid).toFixed(places));
		if (next !== Number(value)) onChange(numeric ? next : String(next));
	};
	return html`<div class="bfields-slider">
		<input id=${id} type="range" value=${Number.isNaN(n) ? lo : n} min=${lo} max=${hi} step=${f.step ?? 1} aria-label=${f.title} style=${{ '--bfields-range-pct': Math.max(0, Math.min(100, pct)) + '%' }} onInput=${(e) => (setTyping(null), onChange(numeric ? Number(e.currentTarget.value) : e.currentTarget.value))} />
		<input type="number" class="bfields-slider__value" value=${text} min=${lo} max=${hi} step=${f.step ?? 1} aria-label=${f.title} onInput=${(e) => write(e.currentTarget.value)} onBlur=${settle} />
	</div>`;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGBA = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i;
function parseColor(text) {
	const v = String(text || '').trim();
	const hex = HEX.exec(v);
	if (hex) {
		const d = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
		return { r: parseInt(d.slice(0, 2), 16), g: parseInt(d.slice(2, 4), 16), b: parseInt(d.slice(4, 6), 16), a: 1 };
	}
	const m = RGBA.exec(v);
	return m ? { r: Math.min(255, +m[1]), g: Math.min(255, +m[2]), b: Math.min(255, +m[3]), a: m[4] === undefined ? 1 : Math.max(0, Math.min(1, +m[4])) } : null;
}
const hex2 = (n) => n.toString(16).padStart(2, '0');
const formatColor = ({ r, g, b, a }) => (a >= 1 ? `#${hex2(r)}${hex2(g)}${hex2(b)}` : `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`);
function normaliseTyped(typed) {
	const t = typed.trim();
	if (t === '') return '';
	if (t.toLowerCase() === 'transparent') return 'transparent';
	const p = parseColor(t);
	return p ? formatColor(p) : null;
}

/** Color.tsx + ColorPanel.tsx: the "Select Color" button and its panel (alpha, Transparent / Default / Clear). */
function Color({ f, value, onChange, id }) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(null);
	const wrap = useRef(null);
	const text = typeof value === 'string' ? value : '';
	const empty = text === '' || text.toLowerCase() === 'transparent';
	const parsed = parseColor(text);
	const fallback = typeof f.default === 'string' ? f.default : '';
	useEffect(() => {
		if (!open) return undefined;
		wrap.current?.querySelector('.bfields-colorpanel__text')?.focus();
		const outside = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
		document.addEventListener('mousedown', outside);
		return () => document.removeEventListener('mousedown', outside);
	}, [open]);
	const commit = () => {
		if (draft === null) return;
		const next = normaliseTyped(draft);
		setDraft(null);
		if (next !== null && next !== text) onChange(next);
	};
	const act = (v) => (setDraft(null), onChange(v));
	const alpha = parsed ? Math.round(parsed.a * 100) : 100;
	return html`<span class="bfields-color" ref=${wrap}>
		<span
			id=${id}
			role="button"
			tabindex="0"
			aria-haspopup="dialog"
			aria-expanded=${open}
			aria-label=${f.title}
			class="bfields-colorpick"
			title=${text || 'Default'}
			onClick=${() => setOpen(!open)}
			onKeyDown=${(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen(!open))}
		>
			<span class=${cx('bfields-colorpick__swatch', empty && 'bfields-colorpick__swatch--empty')} style=${empty ? undefined : { background: text }}></span>
			Select Color
		</span>
		${open &&
		html`<div class="bfields-colorpanel" role="dialog" aria-label=${f.title} onKeyDown=${(e) => e.key === 'Escape' && (e.preventDefault(), e.stopPropagation(), setOpen(false))}>
			<div class="bfields-colorpanel__row">
				<span class=${cx('bfields-colorpanel__preview', empty && 'bfields-colorpanel__preview--empty')}>
					<span class="bfields-colorpanel__fill" style=${empty ? undefined : { background: text }}></span>
					<input type="color" class="bfields-colorpanel__native" value=${parsed ? formatColor({ ...parsed, a: 1 }) : '#ffffff'} aria-label="Pick a colour" onInput=${(e) => { const p = parseColor(e.currentTarget.value); p && act(formatColor({ ...p, a: parsed ? parsed.a : 1 })); }} />
				</span>
				<input type="text" class="bfields-input bfields-colorpanel__text" value=${draft ?? text} placeholder=${fallback || 'Default'} aria-label="Colour value" spellcheck=${false} autocomplete="off" onInput=${(e) => setDraft(e.currentTarget.value)} onBlur=${commit} onKeyDown=${(e) => e.key === 'Enter' && (e.preventDefault(), commit())} />
			</div>
			<label class="bfields-colorpanel__alpha">
				<span class="bfields-colorpanel__label">Opacity</span>
				<input type="range" min="0" max="100" value=${alpha} disabled=${!parsed} style=${{ '--bfields-range-pct': (parsed ? alpha : 0) + '%' }} onInput=${(e) => parsed && act(formatColor({ ...parsed, a: Number(e.currentTarget.value) / 100 }))} />
				<output class="bfields-colorpanel__output">${parsed ? alpha + '%' : '—'}</output>
			</label>
			<div class="bfields-colorpanel__actions">
				<button type="button" class="bfields-colorpanel__action" disabled=${text === 'transparent'} onClick=${() => act('transparent')}>Transparent</button>
				<button type="button" class="bfields-colorpanel__action" disabled=${text === fallback} title=${fallback ? 'Back to ' + fallback : undefined} onClick=${() => act(fallback)}>Default</button>
				${fallback !== '' && html`<button type="button" class="bfields-colorpanel__action" disabled=${text === ''} onClick=${() => act('')}>Clear</button>`}
			</div>
		</div>`}
	</span>`;
}

/** Dimension.tsx with `width => false`: one number, the unit select; no chain on a single axis. */
function Dimension({ f, value, onChange, id }) {
	const cur = value && typeof value === 'object' ? value : {};
	const units = f.units || ['px', '%', 'em'];
	const axis = f.width === false ? 'height' : 'width';
	return html`<div class="bfields-dim">
		<input id=${id} type="number" class="bfields-input" value=${cur[axis] ?? ''} aria-label=${f.title} onInput=${(e) => onChange({ ...cur, [axis]: e.currentTarget.value })} />
		<select class="bfields-select" value=${cur.unit ?? ''} aria-label=${f.title + ' unit'} onChange=${(e) => onChange({ ...cur, unit: e.currentTarget.value })}>
			${cur.unit && !units.includes(cur.unit) && html`<option value=${cur.unit}>${cur.unit} (not available)</option>`}
			${units.map((u) => html`<option key=${u} value=${u}>${u}</option>`)}
		</select>
	</div>`;
}

const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i;

/** MediaInline.tsx, `url` mode (Codestar `upload`): the URL stays editable; Upload opens the media frame. */
function Media({ f, value, onChange, id }) {
	const [open, setOpen] = useState(false);
	const url = typeof value === 'string' ? value : value && typeof value === 'object' ? value.url || '' : '';
	const upload = useRef(null);
	return html`<div class="bfields-media bfields-media--url">
		${url && IMAGE.test(url) && html`<span class="bfields-media__chip"><img src=${url} alt="" /></span>`}
		<input id=${id} type="text" class="bfields-input bfields-media__input" value=${url} placeholder=${f.placeholder || 'Not selected'} spellcheck=${false} aria-label=${f.title} onInput=${(e) => onChange(e.currentTarget.value)} />
		<button ref=${upload} type="button" class="bfields-btn bfields-btn--soft bfields-media__upload" onClick=${() => setOpen(true)}><${Icon} name="upload" size=${16} />Upload</button>
		${url && html`<button type="button" class="bfields-media__remove" aria-label=${'Remove ' + f.title} onClick=${() => (onChange(''), upload.current?.focus())}>Remove</button>`}
		${open && html`<${MediaFrame} kind=${f.kind || 'model'} title="Select file" button="Select" onClose=${() => setOpen(false)} onSelect=${(u) => (onChange(u), setOpen(false))} />`}
	</div>`;
}

/** SourceSelect.tsx for `'options' => 'posts'` (the hotspot Product): search the published products. */
function Source({ f, value, onChange, id }) {
	const state = useStore();
	const [term, setTerm] = useState('');
	const [editing, setEditing] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [active, setActive] = useState(-1);
	const input = useRef(null);
	const products = Object.values(state.products || {}).filter((p) => p.status === 'publish');
	const label = (pid) => products.find((p) => String(p.id) === String(pid))?.name || `${pid} (not available)`;
	const chosen = String(value ?? '');
	const showInput = !chosen || editing;
	const q = term.trim().toLowerCase();
	const shown = q.length >= 2 ? products.filter((p) => p.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name)) : [];
	const open = showInput && (expanded || q !== '');
	const status = q.length < 2 ? 'Type at least 2 characters to search.' : shown.length ? '' : 'No matches.';
	useEffect(() => {
		if (editing) input.current?.focus();
	}, [editing]);
	const pick = (p) => (onChange(String(p.id)), setTerm(''), setEditing(false), setExpanded(false), setActive(-1));
	const onKey = (e) => {
		if (e.key === 'ArrowDown' && shown.length) (e.preventDefault(), setActive((active + 1) % shown.length));
		else if (e.key === 'ArrowUp' && shown.length) (e.preventDefault(), setActive((active - 1 + shown.length) % shown.length));
		else if (e.key === 'Enter' && shown[active]) (e.preventDefault(), pick(shown[active]));
		else if (e.key === 'Escape') (setExpanded(false), setTerm(''), setEditing(false));
	};
	return html`<div
		class=${cx('bfields-source', open && 'bfields-source--open')}
		onFocusOut=${(e) => !e.currentTarget.contains(e.relatedTarget) && (setExpanded(false), editing && (setTerm(''), setEditing(false)))}
	>
		${showInput
			? html`<div class="bfields-source__box">
				<${Icon} name="search" size=${14} />
				<input ref=${input} id=${id} type="search" class="bfields-source__input" value=${term} placeholder=${editing && chosen ? label(chosen) : f.placeholder || 'Type to search…'} aria-label=${f.title} role="combobox" aria-expanded=${open} aria-autocomplete="list" autocomplete="off" onInput=${(e) => (setTerm(e.currentTarget.value), setActive(-1))} onMouseDown=${() => setExpanded(true)} onKeyDown=${onKey} />
				<${Icon} name="chevron-down" size=${16} class="bfields-source__chevron" />
			</div>`
			: html`<div class="bfields-source__box bfields-source__box--value">
				<button type="button" id=${id} class="bfields-source__value" aria-haspopup="listbox" aria-label=${`${f.title}: ${label(chosen)}`} onClick=${() => (setEditing(true), setExpanded(true))}>
					<span class="bfields-source__chip">${label(chosen)}</span>
					<${Icon} name="chevron-down" size=${16} class="bfields-source__chevron" />
				</button>
				<button type="button" class="bfields-source__remove" aria-label=${'Remove ' + label(chosen)} title="Remove" onClick=${() => onChange('')}><${Icon} name="x" size=${14} /></button>
			</div>`}
		${open &&
		html`<div class="bfields-source__popover">
			${shown.length > 0 &&
			html`<ul class="bfields-source__list" role="listbox" aria-label=${f.title}>
				${shown.map(
					(p, i) => html`<li key=${p.id} role="option" aria-selected=${i === active} class=${cx('bfields-source__option', i === active && 'bfields-source__option--active')} onMouseDown=${(e) => e.preventDefault()} onClick=${() => pick(p)}>
						<span class="bfields-source__name">${p.name}</span>
					</li>`
				)}
			</ul>`}
			${status && html`<p class="bfields-source__status">${status}</p>`}
		</div>`}
	</div>`;
}

/** Fieldset.tsx: sub-fields side by side, patched into one object. */
function Fieldset({ f, value, onChange, ctx, id }) {
	const cur = value && typeof value === 'object' && !Array.isArray(value) ? value : Object.fromEntries(f.fields.map((c) => [c.id, c.default ?? '']));
	const sub = { ...ctx, row: cur, idPrefix: id, set: (k, v) => onChange({ ...cur, [k]: v }) };
	return html`<fieldset class="bfields-fieldset" aria-label=${f.title} style=${{ '--bfields-fieldset-cols': Math.min(3, f.fields.length) }}>
		${f.fields.map((c) => html`<${FieldRow} key=${c.id} f=${c} ctx=${sub} />`)}
	</fieldset>`;
}

// Row ids follow the row object, never stored in it (Repeater.tsx ROW IDS).
const rowIds = new WeakMap();
let seq = 0;
const idOf = (row) => {
	if (!row || typeof row !== 'object') return 'r' + ++seq;
	if (!rowIds.has(row)) rowIds.set(row, 'r' + ++seq);
	return rowIds.get(row);
};
const deepCopy = (v) => JSON.parse(JSON.stringify(v));
const fileName = (url) => {
	const base = String(url).split(/[?#]/)[0].split('/').pop() || '';
	try {
		return decodeURIComponent(base);
	} catch {
		return base;
	}
};

/** CSF's accordion title: the first sub-field's value (a file name for uploads), else "Item N". */
function rowTitle(row, f, index) {
	const first = f.fields.find((c) => c.id && !c.display);
	let raw = first && first.type !== 'switcher' ? row?.[first.id] : '';
	if (raw && typeof raw === 'object') raw = raw.url || '';
	const text = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
	if (text && first.type === 'upload') return fileName(text);
	if (text && first.options && !Array.isArray(first.options) && first.options[text]) return first.options[text];
	return text || `Item ${index + 1}`;
}

/** Repeater.tsx (`group` → collapsible rows): grip, title, move up/down, duplicate, remove, "Add New…". */
function Repeater({ f, value, onChange, ctx, id, locked }) {
	const rows = Array.isArray(value) ? value : [];
	const ids = rows.map(idOf);
	const [open, setOpen] = useState({});
	const [confirm, setConfirm] = useState('');
	const [drag, setDrag] = useState(null);
	const [message, setMessage] = useState('');
	const list = useRef(null);
	const track = useRef(null);
	const focusNext = useRef(null);
	const root = useRef(null);
	const nested = ctx.row !== undefined;
	const label = f.buttonTitle || 'Add New';
	const titleOf = (i) => rowTitle(rows[i], f, i);
	const canMove = rows.length > 1;

	useEffect(() => {
		const t = focusNext.current;
		focusNext.current = null;
		if (!t || !root.current) return;
		const scope = t.part === 'add' ? root.current : root.current.querySelector(`[data-row="${t.id}"]`);
		const el = scope?.querySelector(`[data-part="${t.part}"]`);
		(el && !el.disabled ? el : scope?.querySelector('[data-part="toggle"]'))?.focus();
	});

	// window.confirm() in bfields; the demo asks in the row instead.
	useEffect(() => {
		if (confirm) root.current?.querySelector('.ld-woo-confirm__yes')?.focus();
	}, [confirm]);

	const announce = (text) => setMessage((cur) => (cur === text ? text + '\u00a0' : text));
	const emit = (next) => onChange(next);
	const patchRow = (i, key, v) => {
		const patched = { ...rows[i], [key]: v };
		rowIds.set(patched, ids[i]);
		emit(rows.map((r, n) => (n === i ? patched : r)));
	};
	const add = () => {
		const fresh = f.make();
		const rid = idOf(fresh);
		emit([...rows, fresh]);
		setOpen({ ...open, [rid]: true });
		focusNext.current = { id: rid, part: 'toggle' };
		announce(`${rowTitle(fresh, f, rows.length)} added, item ${rows.length + 1} of ${rows.length + 1}.`);
	};
	const clone = (i) => {
		const copy = deepCopy(rows[i]);
		const rid = idOf(copy);
		emit([...rows.slice(0, i + 1), copy, ...rows.slice(i + 1)]);
		setOpen({ ...open, [rid]: true });
		focusNext.current = { id: rid, part: 'toggle' };
		announce(`${titleOf(i)} duplicated as item ${i + 2}.`);
	};
	const remove = (i) => {
		const title = titleOf(i);
		const next = rows.filter((_, n) => n !== i);
		const neighbour = ids[i + 1] ?? ids[i - 1];
		setConfirm('');
		emit(next);
		focusNext.current = neighbour ? { id: neighbour, part: 'toggle' } : { id: '', part: 'add' };
		announce(`${title} removed, ${next.length} ${next.length === 1 ? 'item' : 'items'} left.`);
	};
	const move = (from, to, part) => {
		if (!canMove || to < 0 || to >= rows.length || to === from) return;
		const title = titleOf(from);
		const next = [...rows];
		next.splice(to, 0, next.splice(from, 1)[0]);
		emit(next);
		focusNext.current = { id: ids[from], part };
		announce(`${title} moved to position ${to + 1} of ${rows.length}.`);
	};
	const onHandleKey = (e, i) => {
		if (drag) return e.key === 'Escape' && (e.preventDefault(), (track.current = null), setDrag(null), announce('Reorder cancelled.'));
		const to = { ArrowUp: i - 1, ArrowDown: i + 1, Home: 0, End: rows.length - 1 }[e.key];
		if (to === undefined) return;
		e.preventDefault();
		move(i, to, 'handle');
	};
	// Pointer drag on the grip: rows slide out of the way, the drop lands where the row's centre is.
	const onDown = (e, i) => {
		if (!canMove || !list.current || e.button !== 0) return;
		e.preventDefault();
		e.currentTarget.focus({ preventScroll: true });
		e.currentTarget.setPointerCapture?.(e.pointerId);
		const rects = [...list.current.children].map((el) => el.getBoundingClientRect());
		const sy = window.scrollY;
		const tops = rects.map((r) => r.top + sy);
		const bottoms = rects.map((r) => r.bottom + sy);
		const gap = tops.length > 1 ? tops[1] - bottoms[0] : 0;
		track.current = { pointerId: e.pointerId, startY: e.clientY + sy, tops, bottoms, from: i };
		setDrag({ id: ids[i], from: i, to: i, offset: 0, shift: bottoms[i] - tops[i] + gap });
	};
	const onMove = (e) => {
		const t = track.current;
		if (!t || !drag || e.pointerId !== t.pointerId) return;
		const { tops, bottoms, from } = t;
		const offset = Math.min(bottoms[bottoms.length - 1] - bottoms[from], Math.max(tops[0] - tops[from], e.clientY + window.scrollY - t.startY));
		const centre = (tops[from] + bottoms[from]) / 2 + offset;
		const to = tops.reduce((n, top, at) => (at !== from && (top + bottoms[at]) / 2 <= centre ? n + 1 : n), 0);
		setDrag({ ...drag, to, offset });
	};
	const onUp = (e) => {
		const t = track.current;
		if (!t || e.pointerId !== t.pointerId) return;
		track.current = null;
		const to = drag?.to ?? t.from;
		setDrag(null);
		if (to !== t.from) move(t.from, to, 'handle');
	};
	const shiftOf = (i, rid) => {
		if (!drag) return undefined;
		if (rid === drag.id) return `translateY(${drag.offset}px)`;
		if (drag.from < drag.to && i > drag.from && i <= drag.to) return `translateY(${-drag.shift}px)`;
		if (drag.from > drag.to && i >= drag.to && i < drag.from) return `translateY(${drag.shift}px)`;
		return undefined;
	};

	const addButton = html`<button type="button" class="bfields-btn bfields-btn--soft bfields-repeater__add" data-part="add" onClick=${add}><${Icon} name="plus" size=${16} />${label}</button>`;
	const hint = `${id}-reorder-hint`;
	return html`<div ref=${root} class=${cx('bfields-repeater', nested && 'bfields-repeater--nested', locked && 'bfields-repeater--locked')}>
		<span id=${hint} hidden>Drag, or press the up and down arrow keys, to reorder.</span>
		<div class="bfields-repeater__sr" role="status" aria-live="polite" aria-atomic="true">${message}</div>
		${rows.length === 0
			? html`<div class="bfields-repeater__empty">
				<p class="bfields-repeater__hint">Nothing here yet. Use “${label}” to add the first one.</p>
				${addButton}
			</div>`
			: html`<ol ref=${list} class=${cx('bfields-repeater__list', drag && 'is-sorting')} aria-label=${f.title}>
				${rows.map((item, i) => {
					const rid = ids[i];
					const expanded = Boolean(open[rid]);
					const text = titleOf(i);
					const base = `${id}-${rid}`;
					const empty = text === `Item ${i + 1}`;
					return html`<li key=${rid} data-row=${rid} class=${cx('bfields-repeater-row', expanded && 'is-open', drag?.id === rid && 'is-dragging')} style=${{ transform: shiftOf(i, rid) }}>
						<div class="bfields-repeater-row__head">
							<button type="button" class="bfields-icon-btn bfields-repeater-row__handle" data-part="handle" disabled=${!canMove} aria-label=${'Reorder ' + text} aria-describedby=${hint} title="Drag to reorder" onPointerDown=${(e) => onDown(e, i)} onPointerMove=${onMove} onPointerUp=${onUp} onPointerCancel=${() => drag && ((track.current = null), setDrag(null))} onKeyDown=${(e) => onHandleKey(e, i)}>
								<${Icon} name="grip" size=${16} />
							</button>
							<button type="button" id=${base + '-toggle'} class="bfields-repeater-row__toggle" data-part="toggle" aria-expanded=${expanded} aria-controls=${base + '-body'} onClick=${() => setOpen({ ...open, [rid]: !expanded })}>
								<span class="bfields-repeater-row__title">${empty ? html`<span class="bfields-repeater-row__name">${text}</span>` : html`<span class="bfields-repeater-row__value">${text}</span>`}</span>
								<span class="bfields-repeater-row__chevron"><${Icon} name="chevron-down" size=${16} /></span>
							</button>
							<div class="bfields-repeater-row__actions">
								<span class="bfields-repeater-row__order">
									<button type="button" class="bfields-icon-btn" data-part="up" disabled=${!canMove || i === 0} aria-label=${`Move ${text} up`} title="Move up" onClick=${() => move(i, i - 1, 'up')}><${Icon} name="arrow-up" size=${16} /></button>
									<button type="button" class="bfields-icon-btn" data-part="down" disabled=${!canMove || i === rows.length - 1} aria-label=${`Move ${text} down`} title="Move down" onClick=${() => move(i, i + 1, 'down')}><${Icon} name="arrow-down" size=${16} /></button>
								</span>
								<button type="button" class="bfields-icon-btn" aria-label=${'Duplicate ' + text} title="Duplicate" onClick=${() => clone(i)}><${Icon} name="copy" size=${16} /></button>
								<button type="button" class="bfields-icon-btn bfields-repeater-row__remove" aria-label=${'Remove ' + text} title="Remove" onClick=${() => setConfirm(confirm === rid ? '' : rid)}><${Icon} name="trash" size=${16} /></button>
							</div>
						</div>
						${confirm === rid &&
						html`<div class="ld-woo-confirm" role="alertdialog" aria-labelledby=${base + '-confirm'}>
							<span id=${base + '-confirm'}>Are you sure to delete this item?</span>
							<span class="ld-woo-confirm__acts">
								<button type="button" class="bfields-btn bfields-btn--soft" onClick=${() => setConfirm('')}>Cancel</button>
								<button type="button" class="bfields-btn ld-woo-confirm__yes" onClick=${() => remove(i)}>OK</button>
							</span>
						</div>`}
						${expanded &&
						html`<div id=${base + '-body'} class="bfields-repeater-row__body" role="region" aria-labelledby=${base + '-toggle'}>
							<fieldset class="bfields-repeater-row__fields">
								${f.fields.map(
									(c, at) => html`<${FieldRow}
										key=${c.id || c.type + at}
										f=${c}
										ctx=${{ ...ctx, row: item, idPrefix: `${id}-${i}`, set: (k, v) => patchRow(i, k, v) }}
									/>`
								)}
							</fieldset>
						</div>`}
					</li>`;
				})}
			</ol>`}
		${rows.length > 0 && html`<div class="bfields-repeater__foot">${addButton}</div>`}
	</div>`;
}

function Display({ f }) {
	if (f.type === 'notice') {
		const tone = f.style || 'info';
		return html`<div class=${'bfields-infobar bfields-infobar--' + tone} role=${tone === 'danger' ? 'alert' : 'status'}>
			<${Icon} name=${tone === 'info' ? 'info' : 'warning'} size=${18} /><span>${f.html}</span>
		</div>`;
	}
	return html`<div class="bfields-content bfields-content--content">${f.html}</div>`;
}

const CONTROLS = { switcher: Toggle, button_set: Choice, radio: Choice, select: Choice, text: Text, textarea: Text, slider: NumberField, number: NumberField, color: Color, dimensions: Dimension, upload: Media, fieldset: Fieldset, group: Repeater, source: Source };
const CORE = { switcher: 'toggle', button_set: 'choice', radio: 'choice', select: 'choice', text: 'text', textarea: 'text', slider: 'number', number: 'number', color: 'color', dimensions: 'dimension', upload: 'media', fieldset: 'fieldset', group: 'repeater', source: 'choice' };
const PRESENTATION = { button_set: 'segmented', radio: 'radio', select: 'select' };

/** field_group, `layout => 'row'`: a titled row whose control is a collapsible card (FieldGroup.tsx). */
function GroupRow({ g, ctx }) {
	const [open, setOpen] = useState(!g.collapsed);
	if (!isVisible(g.dependency, ctx) || !g.fields.some((c) => isVisible(c.dependency, ctx))) return null;
	const base = `bfields-${ctx.unique}-group-${g.id}`;
	return html`<div class=${cx('bfields-row bfields-row--wide bfields-row--group', g.class)} data-group=${g.id}>
		<div class="bfields-row__main">
			<h4 class="bfields-row__title">${g.title}</h4>
			${g.subtitle && html`<p id=${base + '-desc'} class="bfields-row__desc">${g.subtitle}</p>`}
		</div>
		<div class="bfields-row__control">
			<div class=${cx('bfields-field-group', open && 'is-open')}>
				<h3 class="bfields-field-group__head">
					<button type="button" id=${base + '-toggle'} class="bfields-field-group__toggle" aria-expanded=${open} aria-controls=${base + '-body'} onClick=${() => setOpen(!open)}>
						${g.icon && html`<span class="bfields-field-group__icon"><${Icon} name=${g.icon} size=${18} /></span>`}
						<span class="bfields-field-group__title">${g.cardTitle || g.title}</span>
						<span class="bfields-field-group__chevron"><${Icon} name="chevron-down" size=${16} /></span>
					</button>
				</h3>
				<div id=${base + '-body'} class="bfields-field-group__body" role="region" aria-labelledby=${base + '-toggle'} hidden=${!open}>
					${g.fields.map((c) => html`<${FieldRow} key=${c.id} f=${c} ctx=${ctx} />`)}
				</div>
			</div>
		</div>
	</div>`;
}

/** FieldRenderer.tsx: dependency gate, title/description column, control column. */
export function FieldRow({ f, ctx }) {
	if (f.type === 'field_group') return html`<${GroupRow} g=${f} ctx=${ctx} />`;
	if (/(^|\s)hidden(\s|$)/.test(f.class || '') || !isVisible(f.dependency, ctx)) return null;
	const locked = Boolean(f.pro) && !isPro();
	const lock = (control) => (locked ? html`<${ProLock} label=${f.title} block>${control}<//>` : control);
	const pill = locked && html` <${ProPill} />`;

	if (f.type === 'content' || f.type === 'notice') {
		const control = html`<${Display} f=${f} />`;
		if (!f.title || !f.title.trim()) return html`<div class=${cx('bfields-row bfields-row--display', f.class)}>${lock(control)}</div>`;
		return html`<div class=${cx('bfields-row bfields-row--fill bfields-row--titled', locked && 'bfields-row--locked', f.class)}>
			<div class="bfields-row__main">
				<h4 class="bfields-row__title">${f.title}${pill}</h4>
				${f.subtitle && html`<p class="bfields-row__desc">${f.subtitle}</p>`}
			</div>
			<div class="bfields-row__control">${lock(control)}${f.desc && html`<p class="bfields-hint">${f.desc}</p>`}</div>
		</div>`;
	}

	const Control = CONTROLS[f.type] || Text;
	const core = CORE[f.type] || 'text';
	const id = `${ctx.idPrefix || 'bfields-' + ctx.unique}-${f.id}`;
	const bag = ctx.row ?? ctx.values;
	const value = bag?.[f.id] === undefined ? f.default : bag[f.id];
	const presentation = f.presentation || PRESENTATION[f.type];
	const control = html`<${Control} f=${{ ...f, presentation }} value=${value} id=${id} ctx=${ctx} locked=${locked} onChange=${(v) => ctx.set(f.id, v)} />`;
	const wide = core === 'repeater' || core === 'fieldset' || (ctx.row !== undefined && core === 'media') || presentation === 'cards';
	const fill = core === 'text';
	return html`<div
		class=${cx(
			'bfields-row',
			presentation === 'radio' && 'bfields-row--spaced',
			wide && 'bfields-row--wide',
			fill && 'bfields-row--fill',
			!wide && core === 'media' && 'bfields-row--media',
			locked && 'bfields-row--locked',
			f.class
		)}
		data-field=${f.id}
	>
		<div class="bfields-row__main">
			<h4 class="bfields-row__title">${f.title}${pill}</h4>
			${f.subtitle && html`<p class="bfields-row__desc">${f.subtitle}</p>`}
			${f.desc && html`<p class="bfields-row__desc">${f.desc}</p>`}
		</div>
		<div class="bfields-row__control">${lock(control)}</div>
	</div>`;
}
