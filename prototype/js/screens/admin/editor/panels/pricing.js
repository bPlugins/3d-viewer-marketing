// "Option Pricing" (planned, flag option-pricing): price rules on the plain customizer list,
// stored in config.pricing. Prices are computed by shared/options.js; this panel only edits rules.
import { html, useState, useEffect, useRef } from '../../../../core/ui.js';
import { useStore } from '../../../../core/store.js';
import { editor, useEditor } from '../editor-store.js';
import { EmptyState, EYEBROW_CLASS, HELP_CLASS, INPUT_SM_CLASS, LINK_CLASS, LINK_MUTED_CLASS, ROW_DIVIDER_CLASS, SELECT_CLASS, SURFACE_CLASS } from '../../../../shared/editor-ui.js';
import { basePriceOf, formatDelta, normalizeRule, ruleAmount, RULE_TYPES } from '../../../../shared/options.js';
import { viewerSettingsFor } from '../../../../shared/product-3d.js';

const ROW_CLASS = `py-2.5 ${ROW_DIVIDER_CLASS}`;
const LABEL_CLASS = 'flex-1 min-w-0 flex items-center gap-2 text-[12px] font-medium leading-snug text-slate-700 dark:text-slate-200';
const AMOUNT_CLASS = `${INPUT_SM_CLASS} !w-[76px] flex-shrink-0 text-end tabular-nums`;
const TYPE_CLASS = `${SELECT_CLASS} wc3d-input-sm !w-[60px] flex-shrink-0`;
const DOT_CLASS = 'w-4 h-4 flex-shrink-0 rounded-full border border-black/10 dark:border-white/15';
const CUSTOM_DOT = 'conic-gradient(#ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)';
const NUMBER_RE = /^-?\d*\.?\d*$/;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const lc = (s) => String(s ?? '').trim().toLowerCase();
const partName = (mesh) => String(mesh).replace(/_/g, ' ');
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

/** Text field that keeps the shopper's draft ("-", "1.") while typing and reports parsed numbers. */
function AmountInput({ value, onValue, label, disabled, placeholder = '0.00' }) {
	const focused = useRef(false);
	const [text, setText] = useState(value == null ? '' : String(value));
	// Keep the draft only while it still means the stored value (undo while focused resyncs).
	useEffect(() => {
		const t = text.trim();
		const same = value == null ? t === '' || !Number.isFinite(Number(t)) : Number(t) === value;
		if (!focused.current || !same) setText(value == null ? '' : String(value));
	}, [value]);
	const onInput = (e) => {
		const raw = e.currentTarget.value.replace(',', '.');
		setText(raw);
		const t = raw.trim();
		if (t === '') return onValue(null);
		if (!NUMBER_RE.test(t)) return;
		const n = Number(t);
		if (Number.isFinite(n) && t !== '-' && t !== '.' && t !== '-.') onValue(n);
	};
	return html`<input
		type="text"
		inputmode="decimal"
		aria-label=${label}
		placeholder=${placeholder}
		disabled=${disabled}
		value=${text}
		onFocus=${() => (focused.current = true)}
		onBlur=${() => {
			focused.current = false;
			setText(value == null ? '' : String(value));
		}}
		onInput=${onInput}
		class=${AMOUNT_CLASS}
	/>`;
}

/** One compact rule row: label, amount, $/% type, optional sale amount. `rule` null = no charge. */
export function RuleRow({ label, name, rule, onChange, disabled, bases }) {
	const r = normalizeRule(rule);
	// Type and sale survive clearing the amount while retyping it (an empty amount stores no rule).
	const [pending, setPending] = useState({ type: 'fixed' });
	const [saleOpen, setSaleOpen] = useState(false);
	const type = r?.type ?? pending.type;
	const hasSale = r?.sale != null;

	const write = (next) => onChange(next && next.amount != null ? next : null);
	const setAmount = (n) => {
		if (n == null) {
			if (r) setPending({ type: r.type, sale: r.sale });
			return write(null);
		}
		const sale = r ? r.sale : pending.sale;
		write({ type, amount: n, ...(sale != null ? { sale } : {}) });
	};
	const setType = (t) => (r ? write({ ...r, type: t }) : setPending((p) => ({ ...p, type: t })));
	const setSale = (n) => {
		if (!r) return;
		// Keeps the field mounted while the sale is cleared and retyped.
		setSaleOpen(true);
		const { sale, ...rest } = r;
		write(n == null ? rest : { ...rest, sale: n });
	};
	const removeSale = () => {
		setSaleOpen(false);
		const { sale, ...rest } = r;
		write(rest);
	};

	const charged = r ? bases.map((b) => ruleAmount(r, b)).sort((a, b) => a - b) : [0];
	const lo = charged[0];
	const hi = charged[charged.length - 1];
	const pctHint = lo === hi ? `${formatDelta(lo) || '$0.00'} on this price` : `${formatDelta(lo) || '$0.00'} to ${formatDelta(hi) || '$0.00'} on variation prices`;
	const showSale = !!r && (hasSale || saleOpen);
	const showPct = !!r && type === 'percent';
	const showSaleLink = !!r && !showSale && !disabled;

	return html`<div class=${ROW_CLASS}>
		<div class="flex items-center gap-2">
			<span class=${LABEL_CLASS}>${label}</span>
			<${AmountInput} label=${`${name} amount`} value=${r?.amount} onValue=${setAmount} disabled=${disabled} />
			<select
				aria-label=${`${name} price type`}
				value=${type}
				disabled=${disabled}
				onChange=${(e) => setType(e.currentTarget.value)}
				class=${TYPE_CLASS}
			>
				<option value="fixed" title=${RULE_TYPES.fixed}>$</option>
				<option value="percent" title=${RULE_TYPES.percent}>%</option>
			</select>
		</div>
		${showSale &&
		html`<div class="flex items-center gap-2 mt-1.5">
			<span class=${`flex-1 min-w-0 text-end ${HELP_CLASS}`}>Sale</span>
			<${AmountInput} label=${`${name} sale amount`} value=${r?.sale} onValue=${setSale} disabled=${disabled} />
			<span class="w-[60px] flex-shrink-0 text-center">
				${!disabled && html`<button type="button" onClick=${removeSale} aria-label=${`Remove ${name} sale`} class=${LINK_MUTED_CLASS}>Remove</button>`}
			</span>
		</div>`}
		${(showPct || showSaleLink) &&
		html`<div class="flex items-center justify-end gap-3 mt-1">
			${showPct && html`<span class=${`${HELP_CLASS} tabular-nums`}>${pctHint}</span>`}
			${showSaleLink && html`<button type="button" onClick=${() => setSaleOpen(true)} aria-label=${`${name} sale price`} class=${LINK_CLASS}>Sale price</button>`}
		</div>`}
	</div>`;
}

/** Immutable set at pricing[path]; null removes the rule and prunes empty parents. */
function withRule(pricing, path, rule) {
	const next = clone(isObj(pricing) ? pricing : {});
	const parents = [next];
	let node = next;
	for (const key of path.slice(0, -1)) {
		if (!isObj(node[key])) node[key] = {};
		node = node[key];
		parents.push(node);
	}
	const leaf = path[path.length - 1];
	if (rule) node[leaf] = rule;
	else delete node[leaf];
	for (let i = path.length - 2; i >= 0; i--) {
		if (Object.keys(parents[i + 1]).length) break;
		delete parents[i][path[i]];
	}
	return next;
}

/** Writes only the changed top-level keys, so edits coalesce in undo like other sections. */
function writePricing(cur, next, onVariation) {
	if (!onVariation && !Object.keys(next).length) return editor.replace('pricing', undefined);
	const patch = {};
	for (const k of new Set([...Object.keys(cur || {}), ...Object.keys(next)])) {
		if (JSON.stringify(cur?.[k]) !== JSON.stringify(next[k])) patch[k] = next[k];
	}
	if (Object.keys(patch).length) editor.patch('pricing', patch);
}

export default function PricingPanel() {
	const target = useEditor((s) => s.target);
	const productId = useEditor((s) => s.productId);
	const own = useEditor(() => editor.raw()?.pricing);
	const defaults = useEditor((s) => s.base?.config?.pricing);
	const meshes = useEditor(() => editor.effective()?.meshes) || {};
	const palette = useStore((s) => viewerSettingsFor(s, productId).colorPalette.join(','));
	const base = useStore((s) => basePriceOf(s, productId, target === 'default' ? 0 : Number(target)));
	// Default rules on a variable product apply to each variation without its own prices.
	const bases = useStore((s) => {
		const p = s.products?.[productId];
		if (target !== 'default' || p?.type !== 'variable') return [base];
		const vids = (p.variations || []).filter((vid) => s.variationConfigs?.[vid]?.config?.pricing == null);
		return vids.length ? vids.map((vid) => basePriceOf(s, productId, vid)) : [base];
	});

	const isVariation = target !== 'default' && target != null;
	const inherited = isVariation && own == null;
	const pricing = (inherited ? defaults : own) || {};
	const colors = [...new Set(palette.split(',').map(lc).filter(Boolean))];

	const set = (path) => (rule) => {
		if (inherited) return;
		writePricing(own, withRule(own, path, rule), isVariation);
	};

	const partRows = [];
	for (const [mesh, m] of Object.entries(meshes)) {
		if (m?.customizable) partRows.push({ key: mesh + ':color', label: `Recolor ${partName(mesh)}`, path: ['parts', mesh, 'color'] });
		if (m?.optional) {
			const verb = m.visible === false ? 'Add' : 'Remove';
			partRows.push({ key: mesh + ':toggle', label: `${verb} ${partName(mesh)}`, path: ['parts', mesh, 'toggle'] });
		}
	}
	const ruleAt = (path) => path.reduce((n, k) => (isObj(n) ? n[k] : undefined), pricing) ?? null;
	const row = ({ key, label, name = label, path }) => html`<${RuleRow} key=${key} label=${label} name=${name} rule=${ruleAt(path)} onChange=${set(path)} disabled=${inherited} bases=${bases} />`;

	return html`<div class="px-4 py-3.5 space-y-4">
		<p class=${`${HELP_CLASS} m-0`}>Charge extra when customers change a part. Prices are added to the product price in the cart.</p>

		${isVariation &&
		(inherited
			? html`<div class=${`${SURFACE_CLASS} flex items-center gap-2.5 p-2.5`}>
					<span class="flex-1 min-w-0 text-[12px] font-semibold text-slate-700 dark:text-slate-200">Inherited from Default</span>
					<button type="button" onClick=${() => editor.replace('pricing', clone(defaults) || {})} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm">
						Set prices for this variation
					</button>
				</div>`
			: html`<div class=${`${SURFACE_CLASS} flex items-center gap-2.5 p-2.5`}>
					<span class="flex-1 min-w-0 text-[12px] font-semibold text-slate-700 dark:text-slate-200">Prices for this variation</span>
					<button type="button" onClick=${() => editor.replace('pricing', undefined)} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm">Use Default prices</button>
				</div>`)}

		<div>
			<div class=${`${EYEBROW_CLASS} mb-1`}>Part prices</div>
			${partRows.length
				? html`<div>${partRows.map(row)}</div>`
				: html`<${EmptyState} variant="dashed" class="mt-2" title="Mark a mesh as Customizable or Toggleable on Frontend to price it." />`}
			<p class=${`${HELP_CLASS} m-0 mt-2`}>Use a negative amount for a discount.</p>
		</div>

		<div>
			<div class=${`${EYEBROW_CLASS} mb-1`}>Colour premiums</div>
			<div>
				${colors.map((hex) =>
					row({
						key: hex,
						name: hex,
						label: html`<span class=${DOT_CLASS} style=${{ background: hex }} aria-hidden="true"></span><span class="font-mono text-[11.5px]">${hex}</span>`,
						path: ['colors', hex],
					}),
				)}
				${row({
					key: 'custom',
					name: 'Custom colour',
					label: html`<span class=${DOT_CLASS} style=${{ background: CUSTOM_DOT }} aria-hidden="true"></span><span>Custom colour (picker)</span>`,
					path: ['custom_color'],
				})}
			</div>
		</div>
	</div>`;
}
