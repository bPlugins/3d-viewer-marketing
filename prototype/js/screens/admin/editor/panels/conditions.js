// Planned (flag conditional-logic): "Conditions" builder used inside the Customer Options group
// cards and choice editors. Default export = the Inspector note shown while Option groups is off.
import { html } from '../../../../core/ui.js';
import { useStore } from '../../../../core/store.js';
import { useFeature, toggleFeature } from '../../../../core/features.js';
import { useEditor, variationLabel } from '../editor-store.js';
import { EYEBROW_CLASS, HELP_CLASS, IconButton, SELECT_CLASS, SURFACE_CLASS, DIVIDER_CLASS } from '../../../../shared/editor-ui.js';
import { Icon } from '../../../../shared/icons.js';
import { hasConditions, resolveGroups, ruleIssue, RULE_OPS, withAttributes } from '../../../../shared/options.js';

const SM_SELECT = `${SELECT_CLASS} wc3d-input-sm`;
const MATCH_SELECT = `${SM_SELECT} !inline-block !w-[64px] align-middle`;
const NO_RULES = [];
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const and = (list) => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

/** Inspector section body while Option groups is off: nothing to act on. */
export default function ConditionsOff() {
	return html`<div class="px-4 py-3.5 space-y-2.5">
		<p class=${`${HELP_CLASS} m-0`}>Conditions show or hide option groups. Turn on Option groups to use them.</p>
		<button type="button" onClick=${() => toggleFeature('option-groups', true)} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm">Turn on Option groups</button>
	</div>`;
}

/**
 * Panel context for the builders, or null with the flag off.
 * groups: the panel's current list; attributes: product attributes; previews: [{label, attrs}] the list applies to.
 */
export function useConditionContext(groups) {
	const on = useFeature('conditional-logic');
	const productId = useEditor((s) => s.productId);
	const target = useEditor((s) => s.target);
	const records = useEditor((s) => s.variations);
	const product = useStore((s) => s.products?.[productId]);
	const variations = useStore((s) => s.variations);
	const variantsOn = useFeature('materials-variants');
	if (!on) return null;
	// Attribute rules read the line's variation, so only variable products offer them.
	const attributes = (product?.type === 'variable' ? product.attributes || [] : []).filter((a) => a?.name && Array.isArray(a.options) && a.options.length);
	let vids = [];
	if (product?.type === 'variable') {
		// Default options apply to each variation without options of its own.
		vids = target !== 'default' && target != null ? [Number(target)] : (product.variations || []).filter((vid) => records?.[vid]?.config?.options == null);
	}
	const previews = vids.length
		? vids.map((vid) => variations?.[vid]).filter(Boolean).map((v) => ({ label: variationLabel(v), attrs: v.attributes || {} }))
		: [{ label: '', attrs: {} }];
	// Same list (and order) as the panel's cards and the runtime: variant groups only with their flag.
	return { groups: groups.filter((g) => isObj(g) && g.id && (g.type !== 'variant' || variantsOn)), attributes, previews };
}

function defaultRule(ctx, index) {
	const a = ctx.attributes[0];
	if (a) return { source: 'attribute', name: a.name, op: 'is', value: a.options[0] };
	const g = ctx.groups[index - 1];
	if (!g) return null;
	const c = (g.choices || []).find((x) => x?.id);
	return c ? { source: 'group', groupId: g.id, op: 'is', choiceId: c.id } : { source: 'group', groupId: g.id, op: 'is_set' };
}

function RuleEditor({ rule, ctx, index, onChange, onRemove }) {
	const earlier = ctx.groups.slice(0, index);
	const isAttr = rule.source === 'attribute';
	const attr = isAttr ? ctx.attributes.find((a) => a.name.toLowerCase() === String(rule.name || '').toLowerCase()) : null;
	const ref = !isAttr ? ctx.groups.find((g) => g.id === rule.groupId) : null;
	const sourceKey = isAttr ? 'attr:' + rule.name : 'group:' + rule.groupId;
	const issue = ruleIssue(rule, ctx.groups, index);

	const setSource = (key) => {
		const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
		if (kind === 'attr') {
			const a = ctx.attributes.find((x) => x.name === id);
			return onChange({ source: 'attribute', name: id, op: 'is', value: a?.options[0] ?? '' });
		}
		const g = ctx.groups.find((x) => x.id === id);
		const c = (g?.choices || []).find((x) => x?.id);
		onChange(c ? { source: 'group', groupId: id, op: 'is', choiceId: c.id } : { source: 'group', groupId: id, op: 'is_set' });
	};
	const setOp = (op) => {
		if (isAttr) return onChange({ ...rule, op });
		const { choiceId, ...rest } = rule;
		const keep = choiceId || (ref?.choices || []).find((x) => x?.id)?.id;
		onChange(op === 'is' || op === 'is_not' ? { ...rest, op, ...(keep ? { choiceId: keep } : {}) } : { ...rest, op });
	};
	const ops = isAttr ? ['is', 'is_not'] : Object.keys(RULE_OPS);
	const needsValue = isAttr || rule.op === 'is' || rule.op === 'is_not';
	// The rule's current target stays listed even when it is no longer a valid source, so the select never lies.
	const listed = isAttr ? !!attr : earlier.some((g) => g.id === rule.groupId);
	const values = isAttr ? attr?.options || [] : (ref?.choices || []).filter((c) => c?.id);
	const value = isAttr ? rule.value ?? '' : rule.choiceId ?? '';
	const valueListed = isAttr ? values.includes(value) : values.some((c) => c.id === value);

	return html`<div class=${`${SURFACE_CLASS} p-2 space-y-1.5`}>
		<div class="flex items-center gap-1.5">
			<select aria-label="Condition source" value=${sourceKey} onChange=${(e) => setSource(e.currentTarget.value)} class=${`${SM_SELECT} flex-1 min-w-0`}>
				${!listed && html`<option value=${sourceKey}>${isAttr ? `Attribute: ${rule.name}` : `Group: ${ref?.label || rule.groupId}`}</option>`}
				${ctx.attributes.map((a) => html`<option key=${'a' + a.name} value=${'attr:' + a.name}>Attribute: ${a.name}</option>`)}
				${earlier.map((g) => html`<option key=${'g' + g.id} value=${'group:' + g.id}>Group: ${g.label || 'Untitled group'}</option>`)}
			</select>
			<${IconButton} variant="danger" label="Remove condition" icon=${html`<${Icon} name="close" size=${12} />`} onClick=${onRemove} class="!p-1" />
		</div>
		<div class="flex items-center gap-1.5">
			<select aria-label="Condition operator" value=${rule.op} onChange=${(e) => setOp(e.currentTarget.value)} class=${`${SM_SELECT} ${needsValue ? '!w-[96px] flex-shrink-0' : 'flex-1 min-w-0'}`}>
				${ops.map((op) => html`<option key=${op} value=${op}>${RULE_OPS[op]}</option>`)}
			</select>
			${needsValue &&
			html`<select
				aria-label="Condition value"
				value=${value}
				onChange=${(e) => onChange(isAttr ? { ...rule, value: e.currentTarget.value } : { ...rule, choiceId: e.currentTarget.value })}
				class=${`${SM_SELECT} flex-1 min-w-0`}
			>
				${!valueListed && html`<option value=${value}>${value || 'Choose…'}</option>`}
				${isAttr ? values.map((v) => html`<option key=${v} value=${v}>${v}</option>`) : values.map((c) => html`<option key=${c.id} value=${c.id}>${c.label || c.id}</option>`)}
			</select>`}
		</div>
		${issue &&
		html`<p class="m-0 flex items-start gap-1.5 text-[11.5px] leading-snug text-amber-700 dark:text-amber-400">
			<${Icon} name="warning" size=${12} class="flex-shrink-0 mt-[2px]" />
			<span>${issue === 'order' ? `This rule is ignored: move “${ref?.label || rule.groupId}” above this group.` : 'This rule is ignored: the group or choice was deleted.'}</span>
		</p>`}
	</div>`;
}

/** "With default choices: shown for Charcoal and Teal, hidden for Sand." */
function previewText(ctx, group, choice) {
	const yes = [];
	const no = [];
	for (const p of ctx.previews) {
		const r = resolveGroups(withAttributes({ options: ctx.groups }, p.attrs), null);
		const on = choice ? (r.available[group.id] || []).some((c) => c.id === choice.id) : !r.hidden.has(group.id);
		(on ? yes : no).push(p.label);
	}
	const [y, n] = choice ? ['offered', 'not offered'] : ['shown', 'hidden'];
	if (ctx.previews.length === 1 && !ctx.previews[0].label) return `With default choices: ${yes.length ? y : n}.`;
	if (!no.length) return `With default choices: ${y} for every variation.`;
	if (!yes.length) return `With default choices: ${n} for every variation.`;
	return `With default choices: ${y} for ${and(yes)}, ${n} for ${and(no)}.`;
}

/**
 * <ConditionsBlock ctx group index choice? onChange /> — the group's (or a choice's) conditions.
 * onChange(next|null): null removes the key.
 */
export function ConditionsBlock({ ctx, group, index, choice = null, onChange }) {
	const owner = choice || group;
	const cond = isObj(owner.conditions) ? owner.conditions : null;
	const rules = Array.isArray(cond?.rules) ? cond.rules.filter(isObj) : NO_RULES;
	const match = cond?.match === 'any' ? 'any' : 'all';
	const fresh = defaultRule(ctx, index);
	const write = (nextRules, nextMatch = match) => onChange(nextRules.length ? { match: nextMatch, rules: nextRules } : null);

	return html`<div class=${`pt-3 ${DIVIDER_CLASS} space-y-2`}>
		<div class="flex items-center justify-between gap-2">
			<span class=${EYEBROW_CLASS}>Conditions</span>
			${rules.length > 0 && html`<span class="wc3d-badge tabular-nums">${rules.length}</span>`}
		</div>
		${rules.length
			? html`<p class="m-0 text-[12px] leading-[28px] text-slate-700 dark:text-slate-200">
						${choice ? 'Offer this choice when ' : 'Show this group when '}
						<select aria-label="Match" value=${match} onChange=${(e) => write(rules, e.currentTarget.value)} class=${MATCH_SELECT}>
							<option value="all">all</option>
							<option value="any">any</option>
						</select>
						${' of these are true'}
					</p>
					<div class="space-y-1.5">
						${rules.map(
							(r, i) => html`<${RuleEditor}
								key=${i}
								rule=${r}
								ctx=${ctx}
								index=${index}
								onChange=${(next) => write(rules.map((x, j) => (j === i ? next : x)))}
								onRemove=${() => write(rules.filter((_, j) => j !== i))}
							/>`,
						)}
					</div>
					<p class=${`${HELP_CLASS} m-0`}>Groups can only depend on groups above them.</p>
					<p class=${`${HELP_CLASS} m-0 flex items-start gap-1.5`}><${Icon} name="eye" size=${12} class="flex-shrink-0 mt-[3px]" /><span>${previewText(ctx, group, choice)}</span></p>`
			: html`<p class=${`${HELP_CLASS} m-0`}>${choice ? 'Offer this choice only for some variations or after other choices.' : 'Show this group only for some variations or after other choices.'}</p>`}
		<button type="button" disabled=${!fresh} onClick=${() => fresh && write([...rules, fresh])} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm w-full">
			<${Icon} name="plus" size=${13} />Add condition
		</button>
		${!fresh && html`<p class=${`${HELP_CLASS} m-0`}>Add a product attribute or a group above this one first.</p>`}
	</div>`;
}

/** Card badge for a group with conditions. */
export function ConditionalBadge() {
	return html`<span class="wc3d-badge" title="Shown only when its conditions are met"><${Icon} name="eye" size=${11} />Conditional</span>`;
}

/** Small marker on a choice row with conditions. */
export function ChoiceConditionMark() {
	return html`<span class="inline-flex flex-shrink-0 text-slate-400 dark:text-slate-500" title="Has conditions"><${Icon} name="eye" size=${12} /><span class="sr-only">Has conditions</span></span>`;
}

export { hasConditions };
