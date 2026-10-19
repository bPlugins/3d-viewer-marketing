// Block-inspector controls in the look of @wordpress/components + the plugin's own (bpl-tools
// BControlPro / BInfoControl, Title, SubPanel, ColorControl, BUnitControl, InlineMediaUpload).
// `pro` marks a control the premium build passes isPremium to: on free its label is dimmed with a
// "Pro" pill and any change opens "Upgrade to PRO" instead of applying (BControlPro).
import { html, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { useIsPro } from '../core/plan.js';
import { openProModal } from '../core/bus.js';

let uidN = 0;
const useUid = (p) => useState(() => `${p}-${++uidN}`)[0];

/** Returns [locked, guard]: guard(labelText) opens the upgrade modal and returns true when locked. */
function useLock(pro, label) {
	const isPro = useIsPro();
	const locked = !!pro && !isPro;
	return [locked, () => (locked ? (openProModal(typeof label === 'string' ? label : ''), true) : false)];
}

// ── Icons ──────────────────────────────────────────────────────────────────

const P = {
	info: 'M9 15h2V9H9v6zm1-10c-.5 0-1 .5-1 1s.5 1 1 1 1-.5 1-1-.5-1-1-1zm0-4c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9zm0 16c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7z',
	up: 'M6.5 12.4L12 8l5.5 4.4-.9 1.2L12 10l-4.5 3.6-1-1.2z',
	down: 'M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z',
	upload: 'M12 3v12M7 8l5-5 5 5M5 21h14',
	reset: 'M7 4.5 3.5 8 7 11.5M3.5 8H14a6 6 0 0 1 0 12h-3',
	undo: 'M18.3 11.7c-.6-.6-1.4-.9-2.3-.9H6.7l2.9-3.3-1.1-1-4.5 5L8.5 16l1-1-2.7-3H16c.5 0 .9.2 1.3.5 1 1 1 3.4 1 4.5v.3h1.5v-.2c0-1.5 0-4.3-1.5-5.7z',
	copy: 'M288 64c-35.3 0-64 28.7-64 64v256c0 35.3 28.7 64 64 64h192c35.3 0 64-28.7 64-64V183.4c0-17.4-7.1-34.1-19.7-46.2l-57.7-55.4C454.7 70.4 438.8 64 422.3 64H288zM160 192c-35.3 0-64 28.7-64 64v256c0 35.3 28.7 64 64 64h192c35.3 0 64-28.7 64-64v-16h-64v16H160V256h16v-64h-16z',
	close: 'M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.5 6.7 1 1 6.5-6.6 6.5 6.6 1-1z',
	drag: 'M8 7h2V5H8v2zm0 6h2v-2H8v2zm0 6h2v-2H8v2zm6-14v2h2V5h-2zm0 8h2v-2h-2v2zm0 6h2v-2h-2v2z',
	desktop: 'M20.5 16h-.7V8c0-1.1-.9-2-2-2H6.2c-1.1 0-2 .9-2 2v8h-.7c-.8 0-1.5.7-1.5 1.5h20c0-.8-.7-1.5-1.5-1.5zM5.7 8c0-.3.2-.5.5-.5h11.6c.3 0 .5.2.5.5v7.6H5.7V8z',
	tablet: 'M17 4H7c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H7c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h10c.3 0 .5.2.5.5v12zm-7.5-.5h4V16h-4v1.5z',
	mobile: 'M15 4H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H9c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h6c.3 0 .5.2.5.5v12zm-4.5-.5h2V16h-2v1.5z',
};

export function Ico({ name, size = 24, view }) {
	const vb = view || (name === 'info' ? '0 0 20 20' : name === 'copy' ? '0 0 640 640' : '0 0 24 24');
	const stroke = name === 'upload' || name === 'reset';
	return html`<svg class="ld-be-ico" width=${size} height=${size} viewBox=${vb} aria-hidden="true" focusable="false" fill=${stroke ? 'none' : 'currentColor'} stroke=${stroke ? 'currentColor' : 'none'} stroke-width=${stroke ? 2 : 0} stroke-linecap="round" stroke-linejoin="round"><path d=${P[name]} /></svg>`;
}

// Panel title icons (src/icons/*): simple 16px line glyphs in the plugin's blue.
const PI = {
	model: 'M12 2.5 3.5 7v10l8.5 4.5 8.5-4.5V7zM3.5 7 12 11.5 20.5 7M12 11.5v10',
	lighting: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
	ar: 'M2.8 8V4.8a2 2 0 0 1 2-2H8M16 2.8h3.2a2 2 0 0 1 2 2V8M21.2 16v3.2a2 2 0 0 1-2 2H16M8 21.2H4.8a2 2 0 0 1-2-2V16M12 8.2 15.6 10v4L12 15.8 8.4 14v-4L12 8.2ZM12 12 8.4 10M12 12l3.6-2M12 12v3.8',
	texture: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
	options: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
	mobile: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
	controls: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
	ruler: 'M14.7 2.6 2.6 14.7a1.4 1.4 0 0 0 0 2l4.7 4.7a1.4 1.4 0 0 0 2 0L21.4 9.3a1.4 1.4 0 0 0 0-2l-4.7-4.7a1.4 1.4 0 0 0-2 0ZM7.6 11.6l2 2M10.6 8.6l2 2M13.6 5.6l2 2',
	hotspot: 'M8 3h10a2 2 0 0 1 2 2v12l-4 4H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM16 21v-4h4M9.5 8h7M9.5 12h7M4 7v13a1 1 0 0 0 1 1h1',
	style: 'M3 4h18v16H3zM7 10.5H6v3h1M11 10.5H9.5v1.5H11v1.5H9.5M15 10.5h-1.5V12H15v1.5h-1.5',
	additional: 'M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4',
};
export function PanelIcon({ name }) {
	return html`<svg class="ld-be-picon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${PI[name]} /></svg>`;
}

// ── Tooltip (WP <Tooltip>): fixed so the scrolling sidebar does not clip it ──

export function InfoTip({ text }) {
	const [rect, setRect] = useState(null);
	const ref = useRef(null);
	const show = () => setRect(ref.current?.getBoundingClientRect() || null);
	const hide = () => setRect(null);
	if (!text) return null;
	const left = rect ? Math.max(8, Math.min(rect.left + rect.width / 2 - 120, (window.innerWidth || 400) - 248)) : 0;
	return html`<span class="ld-be-infotip" ref=${ref} tabindex="0" role="img" aria-label=${text} onMouseEnter=${show} onMouseLeave=${hide} onFocus=${show} onBlur=${hide} onClick=${(e) => (e.preventDefault(), e.stopPropagation())}>
		<${Ico} name="info" size=${17} />
		${rect && html`<span class="ld-be-tip" role="tooltip" style=${{ left: left + 'px', top: Math.max(8, rect.top - 8) + 'px' }}>${text}</span>`}
	</span>`;
}

/** Label + info icon (src/components/Label.tsx), with the BControlPro dim + "Pro" pill when locked. */
export function Label({ children, info, locked }) {
	return html`<span class="bPlLabel">
		${locked ? html`<span class="bplOpacity75">${children}</span> <span class="labelPro">Pro</span>` : children}
		<${InfoTip} text=${info} />
	</span>`;
}

// ── Panels ─────────────────────────────────────────────────────────────────

/** PanelBody with the plugin's Title (icon, summary state, PRO badge). Controlled when `open` is passed. */
export function Panel({ title, icon, state, badge, open, onToggle, initialOpen = true, className, children, id }) {
	const [own, setOwn] = useState(initialOpen);
	const isOpen = open ?? own;
	const toggle = () => (onToggle ? onToggle(!isOpen) : setOwn(!isOpen));
	return html`<div class=${cx('components-panel__body', 'bPlPanelBody', className, isOpen && 'is-opened')} data-panel=${id}>
		${title &&
		html`<h2 class="components-panel__body-title">
			<button type="button" class="components-panel__body-toggle" aria-expanded=${isOpen} onClick=${toggle}>
				<span class="bp3d-panel-icon">
					${icon && html`<${PanelIcon} name=${icon} />`} ${title}
					${badge ? html`<span class="bp3d-panel-pro-badge">${badge}</span>` : state ? html`<span class="bp3d-panel-state">${state}</span>` : ''}
				</span>
				<span class="components-panel__arrow"><${Ico} name=${isOpen ? 'up' : 'down'} /></span>
			</button>
		</h2>`}
		${isOpen && html`<div class="components-panel__body-content">${children}</div>`}
	</div>`;
}

/** src/components/SubPanel: a nested, collapsible section inside a panel. */
export function SubPanel({ title, state, initialOpen = false, boxed, children }) {
	const [open, setOpen] = useState(initialOpen);
	return html`<div class=${cx('ld-be-sub', boxed && 'is-boxed', open && 'is-open')}>
		<button type="button" class="ld-be-sub__head" aria-expanded=${open} onClick=${() => setOpen(!open)}>
			<span class="ld-be-sub__title">${title}</span>
			${!open && state && html`<span class="bp3d-panel-state">${state}</span>`}
			<${Ico} name=${open ? 'up' : 'down'} />
		</button>
		${open && html`<div class="ld-be-sub__body">${children}</div>`}
	</div>`;
}

export function Notice({ status = 'warning', children, className }) {
	return html`<div class=${cx('ld-be-notice', 'is-' + status, className)}><div class="ld-be-notice__content">${children}</div></div>`;
}

export function Help({ children }) {
	return html`<p class="components-base-control__help">${children}</p>`;
}

// ── Controls ───────────────────────────────────────────────────────────────

export function Toggle({ label, info, checked, onChange, pro, disabled, className }) {
	const id = useUid('ld-tg');
	const [locked, guard] = useLock(pro, label);
	const on = !!checked;
	return html`<div class=${cx('bInfoControl', 'components-base-control', 'components-toggle-control', className, locked && 'bplProIdentifier')}>
		<div class="components-h-stack">
			<span class=${cx('components-form-toggle', on && 'is-checked', disabled && 'is-disabled')}>
				<input
					id=${id}
					class="components-form-toggle__input"
					type="checkbox"
					checked=${on}
					disabled=${disabled}
					onChange=${(e) => {
						if (guard()) {
							e.currentTarget.checked = on;
							return;
						}
						onChange(e.currentTarget.checked);
					}}
				/>
				<span class="components-form-toggle__track"></span>
				<span class="components-form-toggle__thumb"></span>
			</span>
			<label for=${id} class="components-toggle-control__label"><${Label} info=${info} locked=${locked}>${label}<//></label>
		</div>
	</div>`;
}

export function Select({ label, info, value, options, onChange, pro, side, className, help }) {
	const id = useUid('ld-sel');
	const [locked, guard] = useLock(pro, label);
	return html`<div class=${cx('bInfoControl', 'components-base-control', 'ld-be-field', side && 'is-side', className, locked && 'bplProIdentifier')}>
		${label && html`<label class="components-base-control__label" for=${id}><${Label} info=${info} locked=${locked}>${label}<//></label>`}
		<div class="components-input-control__container">
			<select
				id=${id}
				class="components-select-control__input"
				value=${value ?? ''}
				onChange=${(e) => {
					if (guard()) {
						e.currentTarget.value = value ?? '';
						return;
					}
					onChange(e.currentTarget.value);
				}}
			>
				${options.map((o) => html`<option key=${o.value} value=${o.value}>${o.label}</option>`)}
			</select>
		</div>
		${help && html`<${Help}>${help}<//>`}
	</div>`;
}

export function Range({ label, info, value, min = 0, max = 100, step = 1, onChange, pro, className }) {
	const id = useUid('ld-rng');
	const [locked, guard] = useLock(pro, label);
	const v = value ?? min;
	const set = (e) => {
		if (guard()) {
			e.currentTarget.value = v;
			return;
		}
		const n = parseFloat(e.currentTarget.value);
		if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
	};
	const pct = ((Number(v) - min) / (max - min || 1)) * 100;
	return html`<div class=${cx('bInfoControl', 'components-base-control', 'ld-be-range', className, locked && 'bplProIdentifier')}>
		${label && html`<label class="components-base-control__label" for=${id}><${Label} info=${info} locked=${locked}>${label}<//></label>`}
		<div class="ld-be-range__row">
			<input type="range" class="ld-be-range__slider" min=${min} max=${max} step=${step} value=${v} aria-label=${typeof label === 'string' ? label : undefined} style=${{ '--pct': pct + '%' }} onInput=${set} />
			<input id=${id} type="number" class="components-text-control__input ld-be-range__num" min=${min} max=${max} step=${step} value=${v} onChange=${set} />
		</div>
	</div>`;
}

export function Text({ label, info, value, onChange, placeholder, pro, className, help, type = 'text' }) {
	const id = useUid('ld-txt');
	const [locked, guard] = useLock(pro, label);
	return html`<div class=${cx('bInfoControl', 'components-base-control', 'ld-be-field', className, locked && 'bplProIdentifier')}>
		${label && html`<label class="components-base-control__label" for=${id}><${Label} info=${info} locked=${locked}>${label}<//></label>`}
		<div class="components-input-control__container">
			<input
				id=${id}
				type=${type}
				class="components-text-control__input"
				value=${value ?? ''}
				placeholder=${placeholder}
				onInput=${(e) => {
					if (guard()) {
						e.currentTarget.value = value ?? '';
						return;
					}
					onChange(e.currentTarget.value);
				}}
			/>
		</div>
		${help && html`<${Help}>${help}<//>`}
	</div>`;
}

export function TextArea({ label, info, value, onChange, pro, help, className, rows = 4 }) {
	const id = useUid('ld-ta');
	const [locked, guard] = useLock(pro, label);
	return html`<div class=${cx('bInfoControl', 'components-base-control', 'ld-be-field', className, locked && 'bplProIdentifier')}>
		${label && html`<label class="components-base-control__label" for=${id}><${Label} info=${info} locked=${locked}>${label}<//></label>`}
		<div class="components-input-control__container">
			<textarea
				id=${id}
				class="components-textarea-control__input"
				rows=${rows}
				value=${value ?? ''}
				onInput=${(e) => {
					if (guard()) {
						e.currentTarget.value = value ?? '';
						return;
					}
					onChange(e.currentTarget.value);
				}}
			></textarea>
		</div>
		${help && html`<${Help}>${help}<//>`}
	</div>`;
}

/** src/components/ColorControl: label, a round swatch (native picker) and a reset button. */
export function Color({ label, info, value, defaultColor, onChange, pro }) {
	const id = useUid('ld-col');
	const [locked, guard] = useLock(pro, label);
	const hex = /^#[0-9a-f]{6}$/i.test(value || '') ? value : /^#[0-9a-f]{3}$/i.test(value || '') ? '#' + value.slice(1).replace(/./g, '$&$&') : '#ffffff';
	const transparent = !value || value === 'transparent';
	return html`<div class=${cx('bInfoControl', 'components-base-control', 'ld-be-color', locked && 'bplProIdentifier')}>
		<label class="components-base-control__label" for=${id}><${Label} info=${info} locked=${locked}>${label}<//></label>
		<span class=${cx('ld-be-color__swatch', transparent && 'is-transparent')} style=${{ background: transparent ? undefined : value }}>
			<input
				id=${id}
				type="color"
				value=${hex}
				aria-label=${label}
				onClick=${(e) => guard() && e.preventDefault()}
				onInput=${(e) => !locked && onChange(e.currentTarget.value)}
			/>
		</span>
		<button type="button" class="ld-be-iconbtn" aria-label="Reset" title="Reset" onClick=${() => !guard() && onChange(defaultColor ?? '')}><${Ico} name="reset" size=${20} /></button>
	</div>`;
}

/** BUnitControl: number + unit picker (the blue unit box), side label. */
export function Unit({ label, info, value, units, onChange, pro }) {
	const id = useUid('ld-unit');
	const [locked, guard] = useLock(pro, label);
	const m = /^(-?[\d.]*)\s*([a-z%]*)$/i.exec(String(value ?? '')) || [];
	const num = m[1] ?? '';
	const unit = m[2] || units[0].value;
	const set = (n, u) => !guard() && onChange(n === '' ? '' : `${n}${u}`);
	return html`<div class=${cx('bInfoControl', 'components-base-control', 'ld-be-unit', locked && 'bplProIdentifier')}>
		<label class="components-base-control__label" for=${id}><${Label} info=${info} locked=${locked}>${label}<//></label>
		<div class="ld-be-unit__box">
			<input id=${id} type="number" class="components-text-control__input" value=${num} onInput=${(e) => set(e.currentTarget.value, unit)} />
			${units.length > 1
				? html`<select class="ld-be-unit__unit" aria-label="Select unit" value=${unit} onChange=${(e) => {
						const u = units.find((x) => x.value === e.currentTarget.value);
						set(num === '' ? String(u?.default ?? '') : num, e.currentTarget.value);
					}}>${units.map((u) => html`<option key=${u.value} value=${u.value}>${u.label}</option>`)}</select>`
				: html`<span class="ld-be-unit__unit is-static">${unit}</span>`}
		</div>
	</div>`;
}

/** bpl-tools BtnGroup (Lite | Advanced). */
export function BtnGroup({ label, info, value, options, onChange }) {
	return html`<div class="bInfoControl components-base-control ld-be-btngroup">
		<span class="components-base-control__label"><${Label} info=${info}>${label}<//></span>
		<div class="ld-be-btngroup__btns" role="group" aria-label=${label}>
			${options.map((o) => html`<button type="button" key=${o.value} class=${cx(value === o.value && 'is-active')} aria-pressed=${value === o.value} title=${o.title} onClick=${() => onChange(o.value)}>${o.label}</button>`)}
		</div>
	</div>`;
}

/** InlineMediaUpload / ModelMediaControl: URL field + the blue upload button (opens the media modal). */
export function MediaField({ label, info, value, placeholder, onChange, onBrowse, pro, className }) {
	const id = useUid('ld-media');
	const [locked, guard] = useLock(pro, label);
	const [draft, setDraft] = useState(value || '');
	useEffect(() => setDraft(value || ''), [value]);
	const commit = () => draft !== (value || '') && !guard() && onChange(draft.trim());
	return html`<div class=${cx('bInfoControl', 'components-base-control', 'ld-be-field', className, locked && 'bplProIdentifier')}>
		${label && html`<label class="components-base-control__label" for=${id}><${Label} info=${info} locked=${locked}>${label}<//></label>`}
		<div class="bPlInlineMediaUpload">
			<input
				id=${id}
				type="text"
				class="components-text-control__input"
				value=${draft}
				placeholder=${placeholder}
				onInput=${(e) => (locked ? (e.currentTarget.value = value || '') : setDraft(e.currentTarget.value))}
				onFocus=${() => locked && guard()}
				onBlur=${commit}
				onKeyDown=${(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
			/>
			<button type="button" class="ld-be-upload" aria-label=${'Select ' + (typeof label === 'string' ? label : 'file')} onClick=${() => !guard() && onBrowse((url) => onChange(url))}><${Ico} name="upload" size=${18} /></button>
		</div>
	</div>`;
}

/** Text field with a copy button (Hotspots CopyAbleTextControl). */
export function CopyText({ label, value, onChange, onCopy }) {
	const id = useUid('ld-cp');
	return html`<div class="components-base-control ld-be-field mt10">
		<label class="components-base-control__label" for=${id}>${label}</label>
		<div class="bPlInlineMediaUpload">
			<input id=${id} type="text" class="components-text-control__input" value=${value ?? ''} onInput=${(e) => onChange(e.currentTarget.value)} />
			<button type="button" class="ld-be-upload" aria-label=${'Copy ' + label} onClick=${() => onCopy(String(value ?? ''))}><${Ico} name="copy" size=${18} /></button>
		</div>
	</div>`;
}

/** bpl-tools ItemsPanel (design: sortable): one row per item with duplicate and remove, the active one expanded. */
export function ItemsPanel({ items, itemLabel, titleOf, active, setActive, onChange, newItem, addLabel, render, minItem = 1, hideAdd }) {
	const move = (from, to) => {
		if (to < 0 || to >= items.length) return;
		const next = items.slice();
		const [x] = next.splice(from, 1);
		next.splice(to, 0, x);
		onChange(next);
		setActive(to);
	};
	return html`<div class="ld-be-items">
		${items.map((item, i) => {
			const open = i === active;
			return html`<div key=${i} class=${cx('ld-be-item', open && 'is-open')}>
				<div class="ld-be-item__head">
					<span class="ld-be-item__drag" title="Drag to reorder" aria-hidden="true"><${Ico} name="drag" size=${20} /></span>
					<button type="button" class="ld-be-item__title" aria-expanded=${open} onClick=${() => setActive(open ? -1 : i)} onKeyDown=${(e) => e.altKey && (e.key === 'ArrowUp' ? move(i, i - 1) : e.key === 'ArrowDown' && move(i, i + 1))}>
						${(titleOf && titleOf(item, i)) || `${itemLabel} ${i + 1}`}
					</button>
					<button type="button" class="ld-be-item__btn" aria-label=${'Duplicate ' + itemLabel} title="Duplicate" onClick=${() => {
						const next = items.slice();
						next.splice(i + 1, 0, structuredClone(item));
						onChange(next);
						setActive(i + 1);
					}}><${Ico} name="copy" size=${18} /></button>
					<button type="button" class="ld-be-item__btn" aria-label=${'Remove ' + itemLabel} title="Remove" disabled=${items.length <= minItem} onClick=${() => {
						onChange(items.filter((_, k) => k !== i));
						setActive(Math.max(0, Math.min(active, items.length - 2)));
					}}><${Ico} name="close" size=${20} /></button>
				</div>
				${open && html`<div class="ld-be-item__body">${render(item, i)}</div>`}
			</div>`;
		})}
		${!hideAdd &&
		html`<button type="button" class="components-button is-primary ld-be-full ld-be-additem" onClick=${() => {
			onChange([...items, structuredClone(newItem)]);
			setActive(items.length);
		}}>+ ${addLabel || `Add New ${itemLabel}`}</button>`}
	</div>`;
}

/** bpl-tools Device: the three device buttons next to a responsive label. */
export function DeviceSwitch({ device, onChange }) {
	return html`<span class="ld-be-device" role="group" aria-label="Device">
		${['desktop', 'tablet', 'mobile'].map((d) => html`<button type="button" key=${d} class=${cx(device === d && 'is-active')} aria-pressed=${device === d} aria-label=${d[0].toUpperCase() + d.slice(1)} title=${d[0].toUpperCase() + d.slice(1)} onClick=${() => onChange(d)}><${Ico} name=${d} size=${16} /></button>`)}
	</span>`;
}
