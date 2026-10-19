// Small editor controls in the admin's visual language: collapsible sections, sliders, colour fields,
// segmented buttons, mesh chips and the price-rule editor shared by options and personalization.
import { html, useState, cx } from '../../../js/core/ui.js';
import { Icon, Badge, Button } from '../../ui/polaris.js';
import { money } from '../../core/commerce.js';
import { targetLabel } from './state.js';

const HEX = /^#[0-9a-f]{6}$/i;
let seq = 0;
const nextId = () => `ed-f-${++seq}`;

/** Collapsible inspector card. */
export function Section({ title, icon, badge, open: initial = false, actions, children, id }) {
	const [open, setOpen] = useState(initial);
	const [bodyId] = useState(nextId);
	return html`
		<section class=${cx('ed-sec', open && 'is-open')} data-section=${id}>
			<div class="ed-sec__head">
				<button type="button" class="ed-sec__toggle" aria-expanded=${String(open)} aria-controls=${bodyId} onClick=${() => setOpen(!open)}>
					<${Icon} name=${icon} size=${16} />
					<span class="ed-sec__title">${title}</span>
					${badge || null}
					<span class="ed-sec__chev"><${Icon} name="chevronDown" size=${16} /></span>
				</button>
				${open && actions ? html`<div class="ed-sec__actions">${actions}</div>` : null}
			</div>
			${open ? html`<div class="ed-sec__body" id=${bodyId}>${children}</div>` : null}
		</section>
	`;
}

/** "Override" chip + "Use default" link for a section overridden by an option value or a variant. */
export function OverrideNote({ on, onClear, what = 'this section' }) {
	if (!on) return null;
	return html`<div class="ed-override"><${Badge} tone="attention">Override<//><span>${targetLabel()} has its own ${what}.</span><${Button} variant="plain" onClick=${onClear}>Use default<//></div>`;
}

export const OverrideBadge = ({ on }) => (on ? html`<span class="ed-dot" title="Overridden here" aria-label="Overridden here"></span>` : null);

/** Range slider with the value read out. */
export function Slider({ label, value, min = 0, max = 1, step = 0.01, onChange, format, help }) {
	const [id] = useState(nextId);
	const v = Number.isFinite(Number(value)) ? Number(value) : min;
	return html`
		<div class="ed-slider">
			<div class="ed-slider__row"><label for=${id}>${label}</label><output for=${id}>${format ? format(v) : v.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}</output></div>
			<input id=${id} type="range" min=${min} max=${max} step=${step} value=${v} onInput=${(e) => onChange(Number(e.target.value))} />
			${help ? html`<p class="p-help">${help}</p>` : null}
		</div>
	`;
}

/** Colour swatch picker + hex text. */
export function ColorField({ label, value, onChange, compact }) {
	const [id] = useState(nextId);
	const hex = HEX.test(value || '') ? value : '#cccccc';
	return html`
		<div class=${cx('ed-color', compact && 'ed-color--compact')}>
			${label ? html`<label class="p-label" for=${id}>${label}</label>` : null}
			<div class="ed-color__row">
				<input type="color" class="ed-color__swatch" value=${hex} aria-label=${label || 'Colour'} onInput=${(e) => onChange(e.target.value)} />
				${compact
					? null
					: html`<div class="p-input-wrap"><input id=${id} class="p-input ed-mono" value=${value || ''} maxlength="7" placeholder="#rrggbb" onInput=${(e) => HEX.test(e.target.value) && onChange(e.target.value.toLowerCase())} /></div>`}
			</div>
		</div>
	`;
}

/** Segmented control: options [{value, label, icon}] */
export function Seg({ value, options, onChange, label, full }) {
	return html`
		<div class=${cx('ed-seg', full && 'ed-seg--full')} role="group" aria-label=${label}>
			${options.map(
				(o) => html`<button type="button" class=${cx('ed-seg__btn', value === o.value && 'is-on')} aria-pressed=${String(value === o.value)} onClick=${() => onChange(o.value)}>
					${o.icon ? html`<${Icon} name=${o.icon} size=${14} />` : null}<span>${o.label}</span>
				</button>`,
			)}
		</div>
	`;
}

/** Multi-select of meshes as toggle chips. */
export function MeshChips({ label, names, value = [], onChange, labels = {} }) {
	return html`
		<div class="p-field">
			${label ? html`<span class="p-label">${label}</span>` : null}
			<div class="ed-chips">
				${names.map((n) => {
					const on = value.includes(n);
					return html`<button type="button" class=${cx('ed-chip', on && 'is-on')} aria-pressed=${String(on)} onClick=${() => onChange(on ? value.filter((x) => x !== n) : [...value, n])}>
						${on ? html`<${Icon} name="check" size=${12} />` : null}${labels[n] || n.replace(/_/g, ' ')}
					</button>`;
				})}
				${names.length ? null : html`<span class="p-help">Meshes appear once the model has loaded.</span>`}
			</div>
		</div>
	`;
}

/** Price rule: none | fixed | percent, amount and an optional sale amount. */
export function PriceRule({ value, onChange, base }) {
	const type = value?.type || 'none';
	const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v));
	const preview = value ? (value.type === 'percent' ? Math.round(base * (value.sale ?? value.amount ?? 0)) / 100 : Number(value.sale ?? value.amount ?? 0)) : 0;
	return html`
		<div class="ed-price">
			<div class="p-select ed-price__type">
				<select aria-label="Price rule" value=${type} onChange=${(e) => onChange(e.target.value === 'none' ? undefined : { type: e.target.value, amount: value?.amount ?? 0, ...(e.target.value === 'fixed' && value?.sale != null ? { sale: value.sale } : {}) })}>
					<option value="none" selected=${type === 'none'}>No extra charge</option>
					<option value="fixed" selected=${type === 'fixed'}>Fixed amount</option>
					<option value="percent" selected=${type === 'percent'}>Percent of price</option>
				</select>
				<${Icon} name="chevronDown" size=${16} />
			</div>
			${type !== 'none'
				? html`
						<div class="p-input-wrap ed-price__amt">
							${type === 'fixed' ? html`<span class="p-input__affix">$</span>` : null}
							<input class="p-input" type="number" step="0.01" aria-label="Amount" value=${value.amount ?? 0} onInput=${(e) => onChange({ ...value, amount: num(e.target.value) ?? 0 })} />
							${type === 'percent' ? html`<span class="p-input__affix">%</span>` : null}
						</div>
						${type === 'fixed'
							? html`<div class="p-input-wrap ed-price__amt" title="Sale price (optional)">
									<span class="p-input__affix">Sale</span>
									<input class="p-input" type="number" step="0.01" aria-label="Sale amount" placeholder="—" value=${value.sale ?? ''} onInput=${(e) => onChange({ ...value, sale: num(e.target.value) })} />
								</div>`
							: null}
						<span class="ed-price__out">${preview >= 0 ? '+' : ''}${money(preview)}</span>
					`
				: null}
		</div>
	`;
}

export function IconBtn({ icon, label, onClick, disabled, pressed, tone }) {
	return html`<button type="button" class=${cx('ed-ibtn', pressed && 'is-on', tone && `ed-ibtn--${tone}`)} title=${label} aria-label=${label} aria-pressed=${pressed === undefined ? undefined : String(!!pressed)} disabled=${disabled} onClick=${onClick}><${Icon} name=${icon} size=${16} /></button>`;
}

export const meshLabel = (config, name) => config?.meshes?.[name]?.label || String(name).replace(/_/g, ' ');
export const fmtBytes = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);
export const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
