// Polaris-Web-Components-like primitives for the embedded app (s-page, s-section, s-button…),
// rendered as plain Preact so the prototype needs no build. Class names: .p-*.
import { html, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { Icon } from './icons.js';

export { Icon };

/** <Button variant="primary|secondary|tertiary|plain|critical" size="slim|medium|large" icon href onClick disabled loading>label</Button> */
export function Button({ variant = 'secondary', size = 'medium', icon, href, onClick, disabled, loading, children, class: cls, type = 'button', title, full, pressed, id }) {
	const c = cx('p-btn', `p-btn--${variant}`, size !== 'medium' && `p-btn--${size}`, full && 'p-btn--full', pressed && 'is-pressed', loading && 'is-loading', !children && icon && 'p-btn--icon', cls);
	const inner = html`${icon ? html`<${Icon} name=${icon} size=${16} />` : null}${children ? html`<span>${children}</span>` : null}`;
	if (href && !disabled) return html`<a class=${c} href=${href} title=${title} id=${id} aria-label=${!children ? title : undefined}>${inner}</a>`;
	return html`<button type=${type} class=${c} onClick=${onClick} disabled=${disabled || loading} title=${title} id=${id} aria-label=${!children ? title : undefined} aria-pressed=${pressed === undefined ? undefined : String(!!pressed)}>${inner}</button>`;
}

export function ButtonGroup({ children, class: cls }) {
	return html`<div class=${cx('p-btn-group', cls)}>${children}</div>`;
}

/** <Badge tone="success|warning|critical|info|attention|new|neutral" progress>text</Badge> */
export function Badge({ tone = 'neutral', children, icon }) {
	return html`<span class=${cx('p-badge', `p-badge--${tone}`)}>${icon ? html`<${Icon} name=${icon} size=${12} />` : null}${children}</span>`;
}

/** <Page title subtitle backHref primaryAction={content,onAction,href,disabled,loading} secondaryActions=[...] titleMeta width="default|narrow|full">…</Page> */
export function Page({ title, subtitle, backHref, primaryAction, secondaryActions = [], titleMeta, width = 'default', children }) {
	return html`
		<div class=${cx('p-page', `p-page--${width}`)}>
			${title
				? html`<header class="p-page__head">
						${backHref ? html`<a class="p-page__back" href=${backHref} aria-label="Back"><${Icon} name="arrowLeft" size=${18} /></a>` : null}
						<div class="p-page__titles">
							<h1 class="p-page__title">${title} ${titleMeta || null}</h1>
							${subtitle ? html`<p class="p-page__subtitle">${subtitle}</p>` : null}
						</div>
						<div class="p-page__actions">
							${secondaryActions.map((a) => html`<${Button} variant=${a.variant || 'secondary'} icon=${a.icon} href=${a.href} onClick=${a.onAction} disabled=${a.disabled}>${a.content}<//>`)}
							${primaryAction ? html`<${Button} variant="primary" href=${primaryAction.href} onClick=${primaryAction.onAction} disabled=${primaryAction.disabled} loading=${primaryAction.loading} icon=${primaryAction.icon}>${primaryAction.content}<//>` : null}
						</div>
					</header>`
				: null}
			<div class="p-page__body">${children}</div>
		</div>
	`;
}

/** Two-column layout: <Layout><Layout.Main/>…<Layout.Side/></Layout>; stacks on phones. */
export function Layout({ children }) {
	return html`<div class="p-layout">${children}</div>`;
}
Layout.Main = ({ children }) => html`<div class="p-layout__main">${children}</div>`;
Layout.Side = ({ children }) => html`<div class="p-layout__side">${children}</div>`;

/** <Card title actions=${[{content, onAction, href}]} sectioned=true flush>…</Card> (s-section) */
export function Card({ title, subtitle, actions = [], children, flush, class: cls, headerExtra }) {
	return html`
		<section class=${cx('p-card', flush && 'p-card--flush', cls)}>
			${title || actions.length || headerExtra
				? html`<div class="p-card__head">
						<div>
							${title ? html`<h2 class="p-card__title">${title}</h2>` : null}
							${subtitle ? html`<p class="p-card__subtitle">${subtitle}</p>` : null}
						</div>
						<div class="p-card__actions">
							${headerExtra || null}
							${actions.map((a) => html`<${Button} variant=${a.variant || 'plain'} href=${a.href} onClick=${a.onAction} icon=${a.icon}>${a.content}<//>`)}
						</div>
					</div>`
				: null}
			<div class="p-card__body">${children}</div>
		</section>
	`;
}

export function Divider() {
	return html`<hr class="p-divider" />`;
}

export function Stack({ gap = 12, row, align, justify, wrap, children, class: cls, style }) {
	return html`<div class=${cx('p-stack', row && 'p-stack--row', wrap && 'p-stack--wrap', cls)} style=${{ gap: gap + 'px', alignItems: align, justifyContent: justify, ...(style || {}) }}>${children}</div>`;
}

export function Text({ as = 'p', variant = 'body', tone, children, class: cls }) {
	const T = as;
	return html`<${T} class=${cx('p-text', `p-text--${variant}`, tone && `p-text--${tone}`, cls)}>${children}<//>`;
}

/** <Banner tone="info|success|warning|critical" title onDismiss action={content,onAction,href}>…</Banner> */
export function Banner({ tone = 'info', title, children, onDismiss, action, secondaryAction }) {
	const icon = { info: 'info', success: 'check', warning: 'alert', critical: 'alert' }[tone];
	return html`
		<div class=${cx('p-banner', `p-banner--${tone}`)} role=${tone === 'critical' ? 'alert' : 'status'}>
			<span class="p-banner__icon"><${Icon} name=${icon} size=${18} /></span>
			<div class="p-banner__content">
				${title ? html`<p class="p-banner__title">${title}</p>` : null}
				${children ? html`<div class="p-banner__text">${children}</div>` : null}
				${action || secondaryAction
					? html`<div class="p-banner__actions">
							${action ? html`<${Button} size="slim" href=${action.href} onClick=${action.onAction}>${action.content}<//>` : null}
							${secondaryAction ? html`<${Button} size="slim" variant="plain" href=${secondaryAction.href} onClick=${secondaryAction.onAction}>${secondaryAction.content}<//>` : null}
						</div>`
					: null}
			</div>
			${onDismiss ? html`<button class="p-banner__close" onClick=${onDismiss} aria-label="Dismiss"><${Icon} name="x" size=${16} /></button>` : null}
		</div>
	`;
}

let fieldSeq = 0;
const useFieldId = (id) => {
	const r = useRef(id || `p-field-${++fieldSeq}`);
	return r.current;
};

/** <TextField label value onInput(v) type helpText prefix suffix placeholder multiline error id /> */
export function TextField({ label, value, onInput, type = 'text', helpText, prefix, suffix, placeholder, multiline, error, id, labelHidden, min, max, step, disabled, maxLength }) {
	const fid = useFieldId(id);
	const control = multiline
		? html`<textarea id=${fid} class="p-input p-input--multi" rows=${typeof multiline === 'number' ? multiline : 3} value=${value ?? ''} placeholder=${placeholder} disabled=${disabled} maxlength=${maxLength} onInput=${(e) => onInput?.(e.target.value)}></textarea>`
		: html`<div class=${cx('p-input-wrap', error && 'has-error', disabled && 'is-disabled')}>
				${prefix ? html`<span class="p-input__affix">${prefix}</span>` : null}
				<input id=${fid} class="p-input" type=${type} value=${value ?? ''} placeholder=${placeholder} min=${min} max=${max} step=${step} disabled=${disabled} maxlength=${maxLength} onInput=${(e) => onInput?.(type === 'number' ? e.target.valueAsNumber : e.target.value)} />
				${suffix ? html`<span class="p-input__affix">${suffix}</span>` : null}
			</div>`;
	return html`
		<div class="p-field">
			${label ? html`<label class=${cx('p-label', labelHidden && 'p-visually-hidden')} for=${fid}>${label}</label>` : null}
			${control}
			${error ? html`<p class="p-field__error">${error}</p>` : helpText ? html`<p class="p-help">${helpText}</p>` : null}
		</div>
	`;
}

/** <Select label value options=[{label,value}|string] onChange(v) helpText id /> */
export function Select({ label, value, options = [], onChange, helpText, id, labelHidden, disabled }) {
	const fid = useFieldId(id);
	return html`
		<div class="p-field">
			${label ? html`<label class=${cx('p-label', labelHidden && 'p-visually-hidden')} for=${fid}>${label}</label>` : null}
			<div class="p-select">
				<select id=${fid} value=${value} disabled=${disabled} onChange=${(e) => onChange?.(e.target.value)}>
					${options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o)).map((o) => html`<option value=${o.value} selected=${String(o.value) === String(value)}>${o.label}</option>`)}
				</select>
				<${Icon} name="chevronDown" size=${16} />
			</div>
			${helpText ? html`<p class="p-help">${helpText}</p>` : null}
		</div>
	`;
}

/** <Checkbox label checked onChange(bool) helpText id /> */
export function Checkbox({ label, checked, onChange, helpText, id, disabled }) {
	const fid = useFieldId(id);
	return html`
		<div class="p-check">
			<input type="checkbox" id=${fid} checked=${!!checked} disabled=${disabled} onChange=${(e) => onChange?.(e.target.checked)} />
			<div>
				<label for=${fid}>${label}</label>
				${helpText ? html`<p class="p-help">${helpText}</p>` : null}
			</div>
		</div>
	`;
}

/** <Switch label checked onChange(bool) helpText id /> */
export function Switch({ label, checked, onChange, helpText, id, disabled }) {
	const fid = useFieldId(id);
	return html`
		<div class="p-switch-row">
			<div class="p-switch-row__text">
				<label for=${fid}>${label}</label>
				${helpText ? html`<p class="p-help">${helpText}</p>` : null}
			</div>
			<button id=${fid} type="button" role="switch" aria-checked=${String(!!checked)} disabled=${disabled} class=${cx('p-switch', checked && 'is-on')} onClick=${() => onChange?.(!checked)}><span></span></button>
		</div>
	`;
}

/** <ChoiceList title choices=[{label,value,helpText}] selected onChange(v) id /> (radio) */
export function ChoiceList({ title, choices, selected, onChange, name }) {
	const n = useFieldId(name);
	return html`
		<fieldset class="p-choices">
			${title ? html`<legend class="p-label">${title}</legend>` : null}
			${choices.map(
				(c) => html`<label class="p-choice">
					<input type="radio" name=${n} value=${c.value} checked=${selected === c.value} onChange=${() => onChange?.(c.value)} />
					<span><span class="p-choice__label">${c.label}</span>${c.helpText ? html`<span class="p-help">${c.helpText}</span>` : null}</span>
				</label>`,
			)}
		</fieldset>
	`;
}

/** <Tabs tabs=[{id,label,badge}] selected onSelect(id) /> */
export function Tabs({ tabs, selected, onSelect }) {
	return html`
		<div class="p-tabs" role="tablist">
			${tabs.map((t) => html`<button role="tab" type="button" aria-selected=${String(selected === t.id)} class=${cx('p-tab', selected === t.id && 'is-active')} onClick=${() => onSelect?.(t.id)}>${t.label}${t.badge != null ? html`<span class="p-tab__badge">${t.badge}</span>` : null}</button>`)}
		</div>
	`;
}

/**
 * <IndexTable headings=['Product', …] rows=[{id, cells:[…], href?, onClick?}] selectable selected=[ids]
 *   onSelectionChange(ids) bulkActions=[{content,onAction}] empty=${vnode} />
 */
export function IndexTable({ headings, rows, selectable, selected = [], onSelectionChange, bulkActions = [], empty, condensedAt = 640 }) {
	const all = rows.length > 0 && rows.every((r) => selected.includes(r.id));
	const toggle = (id) => onSelectionChange?.(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
	if (!rows.length && empty) return empty;
	return html`
		<div class="p-table-wrap">
			${selectable && selected.length
				? html`<div class="p-table__bulk">
						<label class="p-table__check"><input type="checkbox" checked=${all} onChange=${() => onSelectionChange?.(all ? [] : rows.map((r) => r.id))} aria-label="Select all" /></label>
						<span>${selected.length} selected</span>
						<div class="p-table__bulk-actions">${bulkActions.map((a) => html`<${Button} size="slim" onClick=${() => a.onAction(selected)}>${a.content}<//>`)}</div>
					</div>`
				: null}
			<table class="p-table">
				<thead>
					<tr>
						${selectable ? html`<th class="p-table__check"><input type="checkbox" checked=${all} onChange=${() => onSelectionChange?.(all ? [] : rows.map((r) => r.id))} aria-label="Select all" /></th>` : null}
						${headings.map((h) => html`<th>${h}</th>`)}
					</tr>
				</thead>
				<tbody>
					${rows.map(
						(r) => html`<tr class=${cx((r.href || r.onClick) && 'is-clickable', selected.includes(r.id) && 'is-selected')} onClick=${(e) => {
							if (e.target.closest('a,button,input,label,select')) return;
							if (r.href) location.hash = r.href.replace(/^#/, '');
							else r.onClick?.();
						}}>
							${selectable ? html`<td class="p-table__check"><input type="checkbox" checked=${selected.includes(r.id)} onChange=${() => toggle(r.id)} aria-label="Select row" /></td>` : null}
							${r.cells.map((c, i) => html`<td data-label=${typeof headings[i] === 'string' ? headings[i] : ''}>${c}</td>`)}
						</tr>`,
					)}
				</tbody>
			</table>
		</div>
	`;
}

/** <EmptyState heading action={content,onAction,href} illustration="cube">text</EmptyState> */
export function EmptyState({ heading, children, action, secondaryAction, illustration = 'cube' }) {
	return html`
		<div class="p-empty">
			<div class="p-empty__art"><${Icon} name=${illustration} size=${40} /></div>
			<h3 class="p-empty__heading">${heading}</h3>
			${children ? html`<p class="p-empty__text">${children}</p>` : null}
			<div class="p-empty__actions">
				${action ? html`<${Button} variant="primary" href=${action.href} onClick=${action.onAction}>${action.content}<//>` : null}
				${secondaryAction ? html`<${Button} href=${secondaryAction.href} onClick=${secondaryAction.onAction}>${secondaryAction.content}<//>` : null}
			</div>
		</div>
	`;
}

/** <Modal open title onClose size="small|base|large" primaryAction secondaryActions>…</Modal> (s-modal) */
export function Modal({ open, title, onClose, size = 'base', primaryAction, secondaryActions = [], children }) {
	useEffect(() => {
		if (!open) return;
		const on = (e) => e.key === 'Escape' && onClose?.();
		window.addEventListener('keydown', on);
		return () => window.removeEventListener('keydown', on);
	}, [open]);
	if (!open) return null;
	return html`
		<div class="p-modal-backdrop" onClick=${(e) => e.target === e.currentTarget && onClose?.()}>
			<div class=${cx('p-modal', `p-modal--${size}`)} role="dialog" aria-modal="true" aria-label=${title}>
				<div class="p-modal__head">
					<h2>${title}</h2>
					<button class="p-modal__close" onClick=${onClose} aria-label="Close"><${Icon} name="x" size=${18} /></button>
				</div>
				<div class="p-modal__body">${children}</div>
				${primaryAction || secondaryActions.length
					? html`<div class="p-modal__foot">
							${secondaryActions.map((a) => html`<${Button} onClick=${a.onAction} variant=${a.variant || 'secondary'}>${a.content}<//>`)}
							${primaryAction ? html`<${Button} variant=${primaryAction.destructive ? 'critical' : 'primary'} onClick=${primaryAction.onAction} disabled=${primaryAction.disabled}>${primaryAction.content}<//>` : null}
						</div>`
					: null}
			</div>
		</div>
	`;
}

/**
 * Contextual save bar (App Bridge `data-save-bar`): sits over the admin top bar while a form is dirty.
 * <SaveBar dirty onSave onDiscard message="Unsaved changes" />
 */
export function SaveBar({ dirty, onSave, onDiscard, message = 'Unsaved changes' }) {
	if (!dirty) return null;
	return html`
		<div class="p-savebar" role="region" aria-label="Save bar">
			<span class="p-savebar__msg"><${Icon} name="alert" size=${16} /> ${message}</span>
			<div class="p-savebar__actions">
				<button class="p-savebar__discard" onClick=${onDiscard}>Discard</button>
				<button class="p-savebar__save" onClick=${onSave}>Save</button>
			</div>
		</div>
	`;
}

/* ---------- toast (App Bridge shopify.toast.show) ---------- */

const toastSubs = new Set();
let toastSeq = 0;
export function toast(message, { error = false } = {}) {
	const t = { id: ++toastSeq, message, error };
	toastSubs.forEach((f) => f(t));
}
export function ToastHost() {
	const [items, setItems] = useState([]);
	useEffect(() => {
		const f = (t) => {
			setItems((xs) => [...xs, t]);
			setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 3200);
		};
		toastSubs.add(f);
		return () => toastSubs.delete(f);
	}, []);
	return html`<div class="p-toasts" aria-live="polite">${items.map((t) => html`<div class=${cx('p-toast', t.error && 'is-error')}>${t.message}</div>`)}</div>`;
}

/**
 * Full-screen app window (<s-app-window>): admin-owned top bar with exit, our page inside.
 * <AppWindow title="Edit 3D: Lounge Chair" exitHref="#admin.products" actions=${vnode} badge=${vnode}>…</AppWindow>
 */
export function AppWindow({ title, exitHref, onExit, actions, badge, children, class: cls }) {
	useEffect(() => {
		document.documentElement.classList.add('has-app-window');
		return () => document.documentElement.classList.remove('has-app-window');
	}, []);
	return html`
		<div class=${cx('p-appwin', cls)} role="dialog" aria-modal="true" aria-label=${title}>
			<div class="p-appwin__bar">
				<div class="p-appwin__app"><span class="p-appicon p-appicon--sm"><${Icon} name="cube" size=${14} /></span><span>3D Configurator</span></div>
				<div class="p-appwin__title">${title} ${badge || null}</div>
				<div class="p-appwin__actions">
					${actions || null}
					${exitHref ? html`<a class="p-appwin__exit" href=${exitHref} aria-label="Exit"><${Icon} name="x" size=${18} /></a>` : html`<button class="p-appwin__exit" onClick=${onExit} aria-label="Exit"><${Icon} name="x" size=${18} /></button>`}
				</div>
			</div>
			<div class="p-appwin__body">${children}</div>
		</div>
	`;
}

/** Key/value list for summaries: <DescriptionList items=[[term, desc], …] /> */
export function DescriptionList({ items }) {
	return html`<dl class="p-dl">${items.map(([t, d]) => html`<div class="p-dl__row"><dt>${t}</dt><dd>${d}</dd></div>`)}</dl>`;
}

/** Thin progress bar 0–100. */
export function ProgressBar({ value, tone = 'primary', label }) {
	return html`<div class="p-progress" role="progressbar" aria-valuenow=${value} aria-valuemin="0" aria-valuemax="100" aria-label=${label}><span class=${`is-${tone}`} style=${{ width: Math.max(0, Math.min(100, value)) + '%' }}></span></div>`;
}

/** Small "which Shopify surface is this" chip used across screens. */
export function SurfaceTag({ children }) {
	return html`<span class="p-surface-tag"><${Icon} name="puzzle" size=${12} />${children}</span>`;
}
