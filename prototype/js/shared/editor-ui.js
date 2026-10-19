// htm ports of src/admin/editor/components/ui/* — same props, behaviour and class strings.
// Preact note: live updates use onInput (React's onChange); native `change` marks a commit.
import { html, Component, useState, useEffect, useLayoutEffect, useRef } from '../core/ui.js';
import { CheckCircleIcon, ChevronDownIcon, CloseIcon, InfoIcon, WarningIcon } from './icons.js';

// ── classes.ts ──
export const INPUT_CLASS = 'wc3d-input';
export const INPUT_SM_CLASS = 'wc3d-input wc3d-input-sm';
export const INPUT_MONO_CLASS = 'wc3d-input wc3d-input-sm wc3d-input-mono';
export const SELECT_CLASS = 'wc3d-select';
export const TEXTAREA_CLASS = 'wc3d-textarea';
export const LABEL_CLASS = 'wc3d-label';
export const HELP_CLASS = 'wc3d-help';
export const EYEBROW_CLASS = 'wc3d-eyebrow';
export const SURFACE_CLASS = 'wc3d-surface';
export const DIVIDER_CLASS = 'border-t border-slate-100 dark:border-slate-800';
export const ROW_DIVIDER_CLASS = 'border-b border-slate-100 dark:border-slate-800 last:border-b-0';
export const LINK_CLASS = 'wc3d-link';
export const LINK_DANGER_CLASS = 'wc3d-link wc3d-link-danger';
export const LINK_MUTED_CLASS = 'wc3d-link wc3d-link-muted';
export const SEG_CLASS = 'wc3d-seg';
export const READOUT_ROW_CLASS = `flex items-center justify-between gap-3 px-3 py-2 ${ROW_DIVIDER_CLASS}`;
export const READOUT_KEY_CLASS = 'flex-shrink-0 text-slate-500 dark:text-slate-400';
export const READOUT_VALUE_CLASS = 'min-w-0 truncate text-end tabular-nums font-semibold text-slate-800 dark:text-slate-100';
export const MONO_TEXT_CLASS = 'font-mono text-[11px] text-slate-500 dark:text-slate-400';
export const VIEWPORT_FRAME_CLASS =
	'relative flex-1 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-[linear-gradient(180deg,#fbfcfd_0%,#eef1f5_100%)] dark:bg-[linear-gradient(180deg,#0b0f17_0%,#070a10_100%)]';

// React's useId; Preact's standalone build predates it.
let uid = 0;
export function useId() {
	const ref = useRef(null);
	if (ref.current === null) ref.current = `wc3d-${++uid}`;
	return ref.current;
}

const join = (...parts) => parts.filter(Boolean).join(' ');

// ── Accordion ──
const HEADER_RESET = 'w-full flex items-center m-0 border-0 border-solid bg-transparent text-start cursor-pointer select-none transition-colors ';
const SECTION_HEADER =
	HEADER_RESET +
	'gap-3 h-12 px-4 text-[13.5px] font-semibold leading-tight text-[color:var(--wc3d-ui-title)] ' +
	'hover:bg-slate-50 dark:hover:bg-slate-800/40';
const SECTION_BODY = 'pb-1';
const NESTED_HEADER_TAIL =
	'justify-between gap-2 px-4 font-semibold text-slate-700 dark:text-slate-200 ' + `${DIVIDER_CLASS} hover:bg-slate-50 dark:hover:bg-slate-800/40`;
const NESTED_HEADER = `${HEADER_RESET}h-10 text-[12.5px] ${NESTED_HEADER_TAIL}`;
const NESTED_COMPACT_HEADER = `${HEADER_RESET}h-9 text-[12px] ${NESTED_HEADER_TAIL}`;

/** variant: 'section' | 'nested' | 'nested-compact'. Uncontrolled via defaultOpen, or controlled via open + onToggle. */
export function Accordion({ title, variant = 'section', icon, badge, defaultOpen = false, open: openProp, onToggle, keepMounted = false, bodyClassName, children }) {
	const [openState, setOpenState] = useState(defaultOpen);
	const isControlled = openProp !== undefined;
	const open = isControlled ? openProp : openState;
	const opened = useRef(open);
	if (open) opened.current = true;

	const baseId = useId();
	const headerId = `${baseId}-header`;
	const panelId = `${baseId}-panel`;

	const toggle = () => {
		const next = !open;
		if (!isControlled) setOpenState(next);
		onToggle?.(next);
	};

	const isSection = variant === 'section';
	const headerClass = isSection ? SECTION_HEADER : variant === 'nested' ? NESTED_HEADER : NESTED_COMPACT_HEADER;
	const renderBody = open || (keepMounted && opened.current);
	const chevron = html`<${ChevronDownIcon}
		strokeWidth=${2}
		class=${`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
	/>`;

	return html`
		<div class=${isSection ? 'border-b border-slate-100 dark:border-slate-800' : undefined}>
			<button type="button" id=${headerId} aria-expanded=${open} aria-controls=${panelId} onClick=${toggle} class=${headerClass}>
				${isSection
					? html`${icon && html`<span class=${`wc3d-icon-tile transition-colors ${open ? 'wc3d-icon-tile-brand' : ''}`}>${icon}</span>`}
							<span class="flex-1 min-w-0 truncate">${title}</span>
							${badge} ${chevron}`
					: html`<span class="min-w-0 truncate">${title}</span>${chevron}`}
			</button>
			<div id=${panelId} role="region" aria-labelledby=${headerId} hidden=${!open} class=${bodyClassName ?? (isSection ? SECTION_BODY : undefined)}>
				${renderBody && children}
			</div>
		</div>
	`;
}

// ── Checkbox ──
/** Square checkbox; supports `indeterminate`. Other props pass to the <input>. */
export function Checkbox({ indeterminate = false, className = '', class: cls = '', ...rest }) {
	const ref = useRef(null);
	// The browser clears `indeterminate` on click, so re-apply after every render.
	useLayoutEffect(() => {
		if (ref.current) ref.current.indeterminate = indeterminate;
	});
	return html`<input ref=${ref} type="checkbox" class=${`wc3d-checkbox ${className} ${cls}`.trim()} ...${rest} />`;
}

// ── ColorField ──
const HEX6 = /^#?([0-9a-f]{6})$/i;
const HEX3 = /^#?([0-9a-f]{3})$/i;
export const CHECKERBOARD_BG = 'repeating-conic-gradient(#cbd5e1 0 25%, #e2e8f0 0 50%) 50% / 12px 12px';

/** `#rgb` / `#rrggbb` (with or without #) → lowercase `#rrggbb`, or null. */
export function normalizeHex(input) {
	const s = String(input ?? '').trim();
	const six = HEX6.exec(s);
	if (six) return `#${six[1].toLowerCase()}`;
	const three = HEX3.exec(s);
	if (three) return '#' + three[1].toLowerCase().split('').map((c) => c + c).join('');
	return null;
}

export function ColorField({ value, onChange, onChangeStart, onChangeEnd, label, showHexInput = true, fallback = '#ffffff', disabled = false, children }) {
	const [draft, setDraft] = useState(value);
	const editing = useRef(false);
	const active = useRef(false);
	const cb = useRef({ onChangeStart, onChangeEnd });
	cb.current = { onChangeStart, onChangeEnd };

	// Follow external changes (undo, presets, picker) unless the user is typing.
	useEffect(() => {
		if (!editing.current) setDraft(value);
	}, [value]);

	const begin = () => {
		if (active.current) return;
		active.current = true;
		cb.current.onChangeStart?.();
	};
	const end = () => {
		if (!active.current) return;
		active.current = false;
		cb.current.onChangeEnd?.();
	};
	useEffect(() => end, []);

	const emit = (hex) => {
		begin();
		onChange(hex);
	};

	const onDraftChange = (next) => {
		editing.current = true;
		setDraft(next);
		// Only a complete 6-digit colour previews live; #rgb is accepted on commit.
		if (HEX6.test(next.trim())) {
			const hex = normalizeHex(next);
			if (hex) emit(hex);
		}
	};

	const commitDraft = () => {
		editing.current = false;
		const hex = normalizeHex(draft);
		if (hex && hex !== normalizeHex(value)) {
			emit(hex);
			setDraft(hex);
		} else {
			setDraft(value);
		}
		end();
	};

	const onDraftKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitDraft();
		} else if (e.key === 'Escape') {
			editing.current = false;
			setDraft(value);
			end();
		}
	};

	const pickerValue = normalizeHex(value) ?? fallback;

	return html`
		<div class="flex items-center gap-2">
			<span
				class=${`relative flex-shrink-0 w-7 h-7 box-border rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
				style=${{ background: value || CHECKERBOARD_BG }}
			>
				<input
					type="color"
					aria-label=${label}
					value=${pickerValue}
					disabled=${disabled}
					onInput=${(e) => emit(e.currentTarget.value)}
					onChange=${end}
					onBlur=${end}
					class="absolute inset-0 w-full h-full m-0 p-0 border-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
				/>
			</span>
			${showHexInput &&
			html`<input
				type="text"
				aria-label=${label}
				value=${draft}
				disabled=${disabled}
				spellcheck=${false}
				maxLength=${7}
				onInput=${(e) => onDraftChange(e.currentTarget.value)}
				onBlur=${commitDraft}
				onKeyDown=${onDraftKeyDown}
				class=${`${INPUT_MONO_CLASS} w-[84px] text-center`}
			/>`}
			${children}
		</div>
	`;
}

// ── EmptyState ──
const SLOT_BASE = 'wc3d-dashed flex items-center justify-center w-full h-[60px] box-border px-3 rounded-lg text-center text-[11.5px]';
const SLOT_TONE = {
	neutral: 'text-slate-500 dark:text-slate-400',
	warning: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
};
const TILE_CLASS =
	'flex items-center justify-center rounded-lg bg-[color:var(--wc3d-ui-tile)] text-slate-400 dark:text-slate-500 ' + 'border border-slate-200 dark:border-slate-700';

/** variant: 'panel' | 'page' | 'dashed' | 'slot'; tone 'neutral' | 'warning' (slot). */
export function EmptyState({ variant = 'panel', title, description, icon, tone = 'neutral', className = '', class: cls = '' }) {
	const extra = join(className, cls);
	if (variant === 'slot') return html`<div class=${join(SLOT_BASE, SLOT_TONE[tone], extra)}>${title}</div>`;
	if (variant === 'dashed')
		return html`<div class=${join('wc3d-dashed px-4 py-6 text-center text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400', extra)}>${title}</div>`;
	if (variant === 'page')
		return html`
			<div class=${join('flex flex-col items-center justify-center py-16 text-center', extra)}>
				${icon && html`<div class=${`${TILE_CLASS} w-11 h-11 mb-3.5`}>${icon}</div>`}
				<p class="m-0 text-[14px] font-semibold text-[color:var(--wc3d-ui-title)]">${title}</p>
				${description && html`<p class="m-0 mt-1 text-[13px] text-slate-500 dark:text-slate-400">${description}</p>`}
			</div>
		`;
	return html`
		<div class=${join('px-5 py-8 text-center', extra)}>
			${icon && html`<div class=${`${TILE_CLASS} w-9 h-9 mx-auto mb-3`}>${icon}</div>`}
			<p class="m-0 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">${title}</p>
		</div>
	`;
}

// ── FieldRow ──
export const FIELD_LABEL_CLASS = 'min-w-0 text-[12px] font-medium leading-snug text-slate-700 dark:text-slate-200';

/** Label on the left, control on the right. `htmlFor` renders a <label for>. */
export function FieldRow({ label, labelId, htmlFor, description, className = '', class: cls = '', labelClassName = FIELD_LABEL_CLASS, children }) {
	const labelBody = html`${label}${description &&
		html`<span class="block mt-0.5 text-[11.5px] font-normal leading-snug text-slate-500 dark:text-slate-400">${description}</span>`}`;
	return html`
		<div class=${join('flex items-center justify-between gap-3', className, cls)}>
			${htmlFor
				? html`<label id=${labelId} for=${htmlFor} class=${labelClassName}>${labelBody}</label>`
				: html`<span id=${labelId} class=${labelClassName}>${labelBody}</span>`}
			${children}
		</div>
	`;
}

// ── IconButton ──
const BTN_BASE =
	'inline-flex items-center justify-center flex-shrink-0 m-0 border-0 border-solid bg-transparent shadow-none cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-not-allowed ';
const ICON_BUTTON_VARIANT = {
	toolbar:
		BTN_BASE +
		'h-7 w-7 p-0 rounded-md text-slate-500 hover:text-[color:var(--wc3d-ui-title)] hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800',
	ghost:
		BTN_BASE +
		'p-1.5 rounded-md text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-brand-400 dark:hover:bg-slate-800',
	danger:
		BTN_BASE +
		'p-1.5 rounded-md text-slate-400 hover:text-[color:var(--wc3d-ui-danger-fg)] hover:bg-[color:var(--wc3d-ui-danger-bg)] dark:text-slate-500',
	plain: '',
};

/** Icon-only button; `label` → aria-label and tooltip. variant: 'toolbar' | 'ghost' | 'danger' | 'plain'. */
export function IconButton({ label, icon, variant = 'plain', title, className = '', class: cls = '', type = 'button', ...rest }) {
	return html`<button
		type=${type}
		aria-label=${label}
		title=${title ?? label}
		class=${join(ICON_BUTTON_VARIANT[variant], className, cls) || undefined}
		...${rest}
	>
		${icon}
	</button>`;
}

// ── InfoBanner ──
const TONE_CLASS = {
	info: 'bg-[color:var(--wc3d-ui-strip)]',
	success: 'bg-[color:var(--wc3d-ui-success-bg)]',
	warning: 'bg-[color:var(--wc3d-ui-warn-bg)]',
	danger: 'bg-[color:var(--wc3d-ui-danger-bg)]',
};
const ICON_TONE_CLASS = {
	info: 'text-[color:var(--wc3d-ui-primary)]',
	success: 'text-[color:var(--wc3d-ui-success-fg)]',
	warning: 'text-amber-500 dark:text-amber-400',
	danger: 'text-[color:var(--wc3d-ui-danger-fg)]',
};
const BANNER_ICON_CLASS = 'w-4 h-4 flex-shrink-0';
const defaultBannerIcon = (tone) =>
	tone === 'info'
		? html`<${InfoIcon} class=${BANNER_ICON_CLASS} />`
		: tone === 'success'
			? html`<${CheckCircleIcon} strokeWidth=${2} class=${BANNER_ICON_CLASS} />`
			: html`<${WarningIcon} strokeWidth=${2} class=${BANNER_ICON_CLASS} />`;

/** tone: info | success | warning | danger; `icon` null hides it; `compact` = one medium line. */
export function InfoBanner({ tone = 'info', title, icon, compact = false, padding, onDismiss, role, className = '', class: cls = '', children }) {
	const glyph = icon === undefined ? defaultBannerIcon(tone) : icon;
	const pad = padding ?? (compact ? 'px-3 py-2.5' : 'px-3.5 py-3');
	const base = `${pad} rounded-lg ${TONE_CLASS[tone]} text-[12px] leading-relaxed text-slate-600 dark:text-slate-300 ${join(className, cls)}`.trim();
	const glyphBox = glyph && html`<span class=${`inline-flex flex-shrink-0 ${compact ? '' : 'mt-[1px]'} ${ICON_TONE_CLASS[tone]}`}>${glyph}</span>`;
	const dismiss =
		onDismiss &&
		html`<button
			type="button"
			onClick=${onDismiss}
			aria-label="Dismiss"
			class="inline-flex flex-shrink-0 m-0 p-0.5 border-0 bg-transparent rounded cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
		>
			<${CloseIcon} strokeWidth=${2.5} class="w-3.5 h-3.5" />
		</button>`;

	if (compact)
		return html`<div role=${role} class=${`${base} font-medium flex items-center gap-2`}>
			${glyphBox}<span class="flex-1 min-w-0">${children}</span>${dismiss}
		</div>`;

	return html`<div role=${role} class=${`${base} flex items-start gap-2.5`}>
		${glyphBox}
		<div class="flex-1 min-w-0 space-y-1.5">
			${title && html`<div class="font-semibold text-[color:var(--wc3d-ui-title)]">${title}</div>`} ${children}
		</div>
		${dismiss}
	</div>`;
}

// ── SliderRow ──
export const formatPercent = (v) => `${Math.round(v * 100)}%`;
export const formatMultiplier = (v) => `${v.toFixed(1)}x`;
const formatFixed2 = (v) => v.toFixed(2);
const GESTURE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);
const TRACK_CLASS = 'block m-0 p-0 border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const SLIDER_LABEL_CLASS = 'text-[12px] font-medium text-slate-700 dark:text-slate-200';
const READOUT_CLASS =
	'inline-flex items-center justify-center flex-shrink-0 h-6 min-w-[40px] px-1.5 box-border rounded-md ' +
	'border border-slate-200 dark:border-slate-700 bg-[color:var(--wc3d-ui-tile)] ' +
	'text-[11.5px] font-medium tabular-nums text-[color:var(--wc3d-ui-title)]';

/**
 * onChange fires live every tick; onChangeStart/onChangeEnd bracket one gesture
 * (pointer drag, key hold, or a single AT step) so callers make one undo entry.
 * variant: 'stacked' | 'inline' | 'caps' (renders as stacked).
 */
export function SliderRow({ label, value, onChange, onChangeStart, onChangeEnd, min = 0, max = 1, step = 0.01, format = formatFixed2, variant = 'stacked', disabled = false, className = '', class: cls = '' }) {
	const labelId = useId();
	const active = useRef(false);
	const detachPointer = useRef(null);
	const cb = useRef({ onChangeStart, onChangeEnd });
	cb.current = { onChangeStart, onChangeEnd };

	const begin = () => {
		if (active.current) return;
		active.current = true;
		cb.current.onChangeStart?.();
	};
	const end = () => {
		detachPointer.current?.();
		detachPointer.current = null;
		if (!active.current) return;
		active.current = false;
		cb.current.onChangeEnd?.();
	};
	// Close an open gesture if the row unmounts mid-drag.
	useEffect(() => end, []);

	const onPointerDown = () => {
		begin();
		// pointerup can land outside the input, so listen on window.
		const up = () => end();
		window.addEventListener('pointerup', up);
		window.addEventListener('pointercancel', up);
		detachPointer.current = () => {
			window.removeEventListener('pointerup', up);
			window.removeEventListener('pointercancel', up);
		};
	};
	const onKeyDown = (e) => {
		if (GESTURE_KEYS.has(e.key)) begin();
	};
	const handleChange = (raw) => {
		const next = parseFloat(raw);
		if (Number.isNaN(next)) return;
		if (active.current) return onChange(next);
		// A change with no gesture (e.g. screen-reader increment) is its own transaction.
		cb.current.onChangeStart?.();
		onChange(next);
		cb.current.onChangeEnd?.();
	};

	const num = Number(value) || 0;
	const text = format(num);
	const span = max - min;
	const pct = span > 0 ? Math.min(100, Math.max(0, ((num - min) / span) * 100)) : 0;

	const input = (trackClass) => html`<input
		type="range"
		min=${min}
		max=${max}
		step=${step}
		value=${num}
		disabled=${disabled}
		aria-labelledby=${labelId}
		aria-valuetext=${text}
		onInput=${(e) => handleChange(e.currentTarget.value)}
		onPointerDown=${onPointerDown}
		onKeyDown=${onKeyDown}
		onKeyUp=${end}
		onBlur=${end}
		class=${trackClass}
		style=${{ '--wc3d-pct': `${pct}%` }}
	/>`;

	const extra = join(className, cls);
	if (variant === 'inline')
		return html`<div class=${join('grid grid-cols-[1fr_auto] items-center gap-3 py-2', extra)}>
			<span id=${labelId} class=${SLIDER_LABEL_CLASS}>${label}</span>
			<div class="flex items-center gap-2.5">${input(`w-[110px] ${TRACK_CLASS}`)}<span class=${READOUT_CLASS}>${text}</span></div>
		</div>`;

	return html`<div class=${extra || undefined}>
		<div class="flex justify-between items-center gap-2 mb-2">
			<span id=${labelId} class=${SLIDER_LABEL_CLASS}>${label}</span>
			<span class=${READOUT_CLASS}>${text}</span>
		</div>
		${input(`w-full ${TRACK_CLASS}`)}
	</div>`;
}

// ── Toggle / ToggleRow ──
export const TOGGLE_CLASS = [
	'wc3d-toggle-input appearance-none flex-shrink-0 w-9 h-5 rounded-full m-0 p-0 relative cursor-pointer',
	'border-0 shadow-none bg-[color:var(--wc3d-ui-off-soft)]',
	'transition-colors duration-150',
	"after:content-[''] after:absolute after:top-0.5 after:start-0.5",
	'after:w-4 after:h-4 after:rounded-full after:bg-white',
	'after:shadow-[0_1px_2px_rgba(15,23,42,0.2)] after:transition-transform after:duration-150',
	'checked:bg-[color:var(--wc3d-ui-on)] checked:after:translate-x-4',
	'indeterminate:bg-amber-400 indeterminate:after:translate-x-2',
	'rtl:checked:after:-translate-x-4 rtl:indeterminate:after:-translate-x-2',
	'dark:bg-rose-400/50 dark:checked:bg-[color:var(--wc3d-ui-on)] dark:indeterminate:bg-amber-500',
	'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

/** Pill switch (36×20). Name it with `label` or `labelledBy`. Space and Enter toggle. */
export function Toggle({ checked, onChange, label, labelledBy, indeterminate = false, disabled = false, id, describedBy, children }) {
	const ref = useRef(null);
	useLayoutEffect(() => {
		if (ref.current) ref.current.indeterminate = indeterminate;
	});
	const onKeyDown = (e) => {
		if (e.key === 'Enter' && !disabled) {
			e.preventDefault();
			onChange(!checked);
		}
	};
	return html`<label class="inline-flex items-center gap-2 cursor-pointer select-none text-[12px] font-medium">
		<input
			ref=${ref}
			id=${id}
			type="checkbox"
			role=${indeterminate ? undefined : 'switch'}
			aria-checked=${indeterminate ? 'mixed' : String(!!checked)}
			aria-label=${label}
			aria-labelledby=${labelledBy}
			aria-describedby=${describedBy}
			class=${TOGGLE_CLASS}
			checked=${!!checked}
			disabled=${disabled}
			onChange=${(e) => onChange(e.currentTarget.checked)}
			onKeyDown=${onKeyDown}
		/>
		${children}
	</label>`;
}

/** FieldRow + Toggle wired by aria-labelledby; `status` renders next to the switch. */
export function ToggleRow({ checked, onChange, indeterminate, disabled, status, ...row }) {
	const labelId = useId();
	return html`<${FieldRow} ...${row} labelId=${labelId}>
		<${Toggle} labelledBy=${labelId} checked=${checked} onChange=${onChange} indeterminate=${indeterminate} disabled=${disabled}>${status}<//>
	<//>`;
}

// ── ChunkBoundary ──
/** Error boundary: renders `fallback` instead of unmounting the editor. */
export class ChunkBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { failed: false };
	}
	componentDidCatch(error) {
		console.error(error);
		this.setState({ failed: true });
	}
	render() {
		return this.state.failed ? this.props.fallback ?? null : this.props.children;
	}
}
