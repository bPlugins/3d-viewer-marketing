// "Customer Options" (planned, flag option-groups): merchant-defined option groups stored in
// config.options. Shared maths in shared/options.js; this panel only edits the list.
import { html, useState, useEffect, useRef } from '../../../../core/ui.js';
import { useStore } from '../../../../core/store.js';
import { useFeature } from '../../../../core/features.js';
import { editor, useEditor } from '../editor-store.js';
import {
	Checkbox,
	ColorField,
	DIVIDER_CLASS,
	EmptyState,
	EYEBROW_CLASS,
	HELP_CLASS,
	IconButton,
	INPUT_CLASS,
	LABEL_CLASS,
	LINK_CLASS,
	LINK_DANGER_CLASS,
	SELECT_CLASS,
	SliderRow,
	SURFACE_CLASS,
	TEXTAREA_CLASS,
	ToggleRow,
	useId,
} from '../../../../shared/editor-ui.js';
import { Icon } from '../../../../shared/icons.js';
import { basePriceOf, formatDelta, GROUP_DISPLAYS, GROUP_TYPES, groupLayer, choiceBallUrl, ruleAmount, suggestGroups } from '../../../../shared/options.js';
import { attachmentUrl, viewerSettingsFor } from '../../../../shared/product-3d.js';
import { getMaterialConfig } from '../../../../shared/effective-config.js';
import { useMediaPicker } from './alt-model.js';
import { RuleRow } from './pricing.js';
import { VARIANT_TYPE_LABEL, VariantChoiceFields, newVariantChoice, useModelVariants } from './material-variants.js';
import { ConditionsBlock, ConditionalBadge, ChoiceConditionMark, useConditionContext, hasConditions } from './conditions.js';

const NO_GROUPS = [];
const LIVE_MS = 400;
const FALLBACK_COLOR = '#cccccc';
const DOT_CLASS = 'w-5 h-5 flex-shrink-0 rounded-full border border-black/10 dark:border-white/15 bg-center bg-cover';
const META_CLASS = 'text-[11.5px] text-slate-500 dark:text-slate-400';
const CHIP_CLASS =
	'inline-flex items-center max-w-full h-6 ps-2 pe-0.5 gap-0.5 box-border rounded-full border text-[11.5px] font-medium transition-colors';
const CHIP_IDLE = 'border-slate-200 dark:border-slate-700 bg-[var(--wc3d-ui-tile)] text-[color:var(--wc3d-ui-title)]';
const CHIP_ACTIVE = 'border-brand-500 bg-[var(--wc3d-ui-strip)] text-[color:var(--wc3d-ui-primary)]';
const BARE_BTN = 'bg-transparent border-0 p-0 m-0 [font:inherit] text-inherit cursor-pointer';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const lc = (s) => String(s ?? '').trim().toLowerCase();
const plural = (n, one, many) => (n === 1 ? one : many).replace('%d', n);
const without = (obj, key) => {
	const { [key]: _drop, ...rest } = obj;
	return rest;
};
const move = (list, i, d) => {
	const j = i + d;
	if (j < 0 || j >= list.length) return list;
	const next = list.slice();
	[next[i], next[j]] = [next[j], next[i]];
	return next;
};

// suggestGroups labels colour choices with their hex; merchants get readable names instead.
const COLOUR_NAMES = { '#ffffff': 'White', '#000000': 'Black', '#64748b': 'Slate', '#ef4444': 'Red', '#f97316': 'Orange', '#f59e0b': 'Amber', '#10b981': 'Emerald', '#3b82f6': 'Blue', '#6366f1': 'Indigo', '#8b5cf6': 'Violet', '#ec4899': 'Pink' };
const readableChoices = (g, current = 'Current colour') =>
	g.type !== 'color'
		? g
		: { ...g, choices: g.choices.map((c, i) => (c.color && c.label === c.color ? { ...c, label: COLOUR_NAMES[lc(c.color)] || (c.id === g.default ? current : `Colour ${i + 1}`) } : c)) };

/** True when a variation sets its own colour (colour group) or visibility (parts group) on a target mesh. */
function variationOverrides(g, records, names) {
	return Object.values(records || {}).some((rec) =>
		(g.targets || []).some((mesh) =>
			g.type === 'parts' ? rec?.config?.meshes?.[mesh]?.visible !== undefined : !!getMaterialConfig(rec?.config?.materials, mesh, names)?.baseColor,
		),
	);
}

// Every group/choice id seen per product this session, so a deleted id is never handed out again.
const seenIds = new Map();
function idPool(pid) {
	if (!seenIds.has(pid)) seenIds.set(pid, new Set());
	return seenIds.get(pid);
}
function remember(pool, list) {
	if (!Array.isArray(list)) return;
	for (const g of list) {
		if (g?.id) pool.add(g.id);
		for (const c of Array.isArray(g?.choices) ? g.choices : []) if (c?.id) pool.add(c.id);
	}
}
function freshId(pool, prefix) {
	let n = 1;
	while (pool.has(prefix + n)) n++;
	pool.add(prefix + n);
	return prefix + n;
}

/** Fill the new type's value field from what the choice already has (other fields are kept). */
function convertChoice(c, type, targets) {
	if (type === 'color' && !c.color) return { ...c, color: c.material?.baseColor || FALLBACK_COLOR };
	if (type === 'material' && !isObj(c.material)) return { ...c, material: { baseColor: c.color || FALLBACK_COLOR, roughness: 0.5, metalness: 0 } };
	if (type === 'parts' && !Array.isArray(c.show)) return { ...c, show: [...targets] };
	if (type === 'variant' && typeof c.variant !== 'string') return { ...c, variant: '', color: c.color || c.material?.baseColor || FALLBACK_COLOR };
	return c;
}

function choiceSwatch(group, c, attachments) {
	if (group.display === 'thumbnail' && c.thumbnailId && attachments[c.thumbnailId]) return { backgroundImage: `url("${attachmentUrl(attachments[c.thumbnailId])}")` };
	if (group.type === 'material') return { backgroundImage: `url("${choiceBallUrl(c)}")` };
	if (group.type === 'color' || group.type === 'variant') return { background: c.color || FALLBACK_COLOR };
	return null;
}

// replace() never coalesces, so typing/dragging is held locally and written after a pause or on
// blur (one undo step per word or drag); discrete edits write at once.
function useListWriter(target, toStored) {
	const [draft, setDraft] = useState(null);
	const pending = useRef(null);
	const timer = useRef(0);
	const flush = () => {
		clearTimeout(timer.current);
		const p = pending.current;
		if (!p) return;
		pending.current = null;
		if (editor.get().target === p.target) editor.replace('options', p.value);
		setDraft(null);
	};
	const live = (next) => {
		pending.current = { target, value: toStored(next) };
		setDraft(next);
		clearTimeout(timer.current);
		timer.current = setTimeout(flush, LIVE_MS);
	};
	const commit = (next) => {
		clearTimeout(timer.current);
		pending.current = null;
		editor.replace('options', toStored(next));
		setDraft(null);
	};
	useEffect(() => () => {
		clearTimeout(timer.current);
		const p = pending.current;
		pending.current = null;
		if (p && editor.get().target === p.target) editor.replace('options', p.value);
	}, []);
	useEffect(() => {
		flush();
		setDraft(null);
	}, [target]);
	return { draft, live, commit, flush };
}

function TargetChips({ targets, selection, disabled, onRemove }) {
	if (!targets.length) return html`<p class=${`${HELP_CLASS} m-0`}>No meshes yet. Select one in the mesh tree or the viewport, then use it here.</p>`;
	return html`<div class="flex flex-wrap gap-1.5">
		${targets.map((mesh) => {
			const active = selection.includes(mesh);
			return html`<span key=${mesh} class=${`${CHIP_CLASS} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}>
				<button
					type="button"
					onClick=${() => editor.select([mesh])}
					aria-pressed=${active}
					title=${`Select ${mesh} in the viewport`}
					class=${`${BARE_BTN} min-w-0 truncate`}
				>
					${mesh}
				</button>
				${!disabled &&
				html`<${IconButton}
					variant="danger"
					label=${`Remove ${mesh}`}
					icon=${html`<${Icon} name="close" size=${10} />`}
					onClick=${() => onRemove(mesh)}
					class="!p-1 rounded-full"
				/>`}
			</span>`;
		})}
	</div>`;
}

function ChoiceEditor({ group, choice: c, pricing, bases, attachments, onLive, onCommit, onFlush, onPickImage, logic = null, groupIndex = 0 }) {
	const baseId = useId();
	const targets = group.targets || [];
	const m = c.material || {};
	const setMat = (patch) => onLive({ ...c, material: { baseColor: FALLBACK_COLOR, roughness: 0.5, metalness: 0, ...m, ...patch } });
	const thumb = c.thumbnailId ? attachments[c.thumbnailId] : null;

	return html`<div class=${`${SURFACE_CLASS} p-2.5 mt-1 mb-2 space-y-3`}>
		<div>
			<label for=${`${baseId}-label`} class=${LABEL_CLASS}>Choice label</label>
			<input id=${`${baseId}-label`} type="text" value=${c.label ?? ''} onInput=${(e) => onLive({ ...c, label: e.currentTarget.value })} class=${INPUT_CLASS} />
		</div>

		${group.type === 'color' &&
		html`<div>
			<span class=${LABEL_CLASS}>Colour</span>
			<${ColorField} label=${`${c.label || 'Choice'} colour`} value=${c.color || FALLBACK_COLOR} onChange=${(hex) => onLive({ ...c, color: hex })} onChangeEnd=${onFlush} />
		</div>`}

		${group.type === 'material' &&
		html`<div class="space-y-3">
			<div>
				<span class=${LABEL_CLASS}>Base colour</span>
				<${ColorField} label=${`${c.label || 'Choice'} base colour`} value=${m.baseColor || FALLBACK_COLOR} onChange=${(hex) => setMat({ baseColor: hex })} onChangeEnd=${onFlush} />
			</div>
			<${SliderRow} label="Roughness" value=${m.roughness ?? 0.5} onChange=${(v) => setMat({ roughness: v })} onChangeEnd=${onFlush} />
			<${SliderRow} label="Metalness" value=${m.metalness ?? 0} onChange=${(v) => setMat({ metalness: v })} onChangeEnd=${onFlush} />
		</div>`}

		${group.type === 'parts' &&
		html`<div>
			<span class=${LABEL_CLASS}>Shows</span>
			${targets.length
				? html`<div class="space-y-1.5">
						${targets.map((mesh) => {
							const show = Array.isArray(c.show) ? c.show : [];
							const on = show.includes(mesh);
							return html`<label key=${mesh} class="flex items-center gap-2 text-[12px] text-slate-700 dark:text-slate-200 cursor-pointer">
								<${Checkbox} checked=${on} onChange=${() => onCommit({ ...c, show: on ? show.filter((n) => n !== mesh) : [...show, mesh] })} />
								<span class="min-w-0 truncate">${mesh}</span>
							</label>`;
						})}
					</div>
					<p class=${`${HELP_CLASS} m-0 mt-1.5`}>Unchecked meshes are hidden with this choice.</p>`
				: html`<p class=${`${HELP_CLASS} m-0`}>Add meshes to “Applies to” first.</p>`}
		</div>`}

		${group.type === 'variant' && html`<${VariantChoiceFields} choice=${c} onLive=${onLive} onCommit=${onCommit} onFlush=${onFlush} />`}

		${group.display === 'thumbnail' &&
		html`<div>
			<span class=${LABEL_CLASS}>Thumbnail</span>
			<div class="flex items-center gap-2.5">
				<span class="w-10 h-10 flex-shrink-0 rounded-md border border-slate-200 dark:border-slate-700 bg-center bg-cover" style=${choiceSwatch(group, c, attachments) || { background: 'var(--wc3d-ui-tile)' }} aria-hidden="true"></span>
				<div class="flex-1 min-w-0">
					<div class="text-[12px] font-medium text-[color:var(--wc3d-ui-title)] truncate">${thumb ? thumb.filename || thumb.title : 'No image'}</div>
					<div class="flex items-center gap-3 mt-0.5">
						<button type="button" onClick=${onPickImage} class=${LINK_CLASS}>${thumb ? 'Replace' : 'Choose image'}</button>
						${c.thumbnailId && html`<button type="button" onClick=${() => onCommit(without(c, 'thumbnailId'))} class=${LINK_DANGER_CLASS}>Remove</button>`}
					</div>
				</div>
			</div>
			${!thumb && html`<p class=${`${HELP_CLASS} m-0 mt-1.5`}>Without an image the tile shows the ${group.type === 'material' ? 'material' : 'colour'}.</p>`}
		</div>`}

		${pricing &&
		html`<div class=${`pt-1 ${DIVIDER_CLASS}`}>
			<${RuleRow}
				label="Price"
				name=${`${c.label || 'Choice'} price`}
				rule=${c.price ?? null}
				bases=${bases}
				onChange=${(rule) => onLive(rule ? { ...c, price: rule } : without(c, 'price'))}
			/>
		</div>`}

		${logic && html`<${ConditionsBlock} ctx=${logic} group=${group} index=${groupIndex} choice=${c} onChange=${(cond) => onCommit(cond ? { ...c, conditions: cond } : without(c, 'conditions'))} />`}
	</div>`;
}

function ChoiceRow({ group, choice: c, index, count, open, pricing, bases, attachments, disabled, onToggle, onMove, onRemove, ...edit }) {
	const swatch = choiceSwatch(group, c, attachments);
	// A percent rule on a variable product's Default charges a range across variation prices.
	const charged = pricing ? bases.map((b) => ruleAmount(c.price, b)).sort((a, b) => a - b) : [0];
	const lo = formatDelta(charged[0]);
	const hi = formatDelta(charged[charged.length - 1]);
	const amount = lo === hi ? lo : lo && hi && lo[0] === hi[0] ? `${lo}–${hi.slice(1)}` : `${lo || '$0.00'}–${hi || '$0.00'}`;
	const isDefault = group.default && group.default === c.id;
	return html`<div class=${`${DIVIDER_CLASS} first:border-t-0`}>
		<div class="flex items-center gap-1 min-h-[36px]">
			<button
				type="button"
				onClick=${onToggle}
				aria-expanded=${open}
				title=${disabled ? undefined : 'Edit and preview this choice'}
				class=${`${BARE_BTN} flex flex-1 items-center gap-2 min-w-0 py-1.5 text-start rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40`}
			>
				${swatch
					? html`<span class=${DOT_CLASS} style=${swatch} aria-hidden="true"></span>`
					: html`<span class="inline-flex w-5 justify-center flex-shrink-0 text-[color:var(--wc3d-ui-on)]" aria-hidden="true"><${Icon} name="toggle" size=${14} /></span>`}
				<span class=${`min-w-0 truncate text-[12px] ${open ? 'font-semibold text-[color:var(--wc3d-ui-primary)]' : 'font-medium text-[color:var(--wc3d-ui-title)]'}`}>${c.label || 'Untitled'}</span>
				${isDefault && html`<span class="wc3d-badge flex-shrink-0">Default</span>`}
				${edit.logic && hasConditions(c.conditions) && html`<${ChoiceConditionMark} />`}
				${amount && html`<span class=${`ms-auto flex-shrink-0 tabular-nums ${META_CLASS}`}>${amount}</span>`}
			</button>
			${!disabled &&
			html`<div class="flex items-center flex-shrink-0">
				<${IconButton} variant="ghost" label=${`Move ${c.label || 'choice'} up`} disabled=${index === 0} onClick=${() => onMove(-1)} icon=${html`<${Icon} name="chevron-down" size=${12} class="rotate-180" />`} class="!p-1" />
				<${IconButton} variant="ghost" label=${`Move ${c.label || 'choice'} down`} disabled=${index === count - 1} onClick=${() => onMove(1)} icon=${html`<${Icon} name="chevron-down" size=${12} />`} class="!p-1" />
				<${IconButton} variant="danger" label=${`Remove ${c.label || 'choice'}`} onClick=${onRemove} icon=${html`<${Icon} name="close" size=${12} />`} class="!p-1" />
			</div>`}
		</div>
		${open && !disabled && html`<${ChoiceEditor} group=${group} choice=${c} pricing=${pricing} bases=${bases} attachments=${attachments} ...${edit} />`}
	</div>`;
}

function GroupCard({ group: g, index, count, expanded, openChoice, selection, pricing, bases, attachments, disabled, actions, logic = null }) {
	const baseId = useId();
	const bodyId = `${baseId}-body`;
	const [confirming, setConfirming] = useState(false);
	const choices = Array.isArray(g.choices) ? g.choices : [];
	const targets = Array.isArray(g.targets) ? g.targets : [];
	const fresh = selection.filter((m) => !targets.includes(m));
	const { patch, update, updateChoice, setChoices, toggle, toggleChoice, remove, addChoice, pickImage } = actions;
	const variantsOn = useFeature('materials-variants');

	const removeTarget = (mesh) =>
		update((cur) => ({
			...cur,
			targets: targets.filter((n) => n !== mesh),
			choices: cur.type === 'parts' ? choices.map((c) => (Array.isArray(c.show) ? { ...c, show: c.show.filter((n) => n !== mesh) } : c)) : choices,
		}));
	const setType = (type) => update((cur) => ({ ...cur, type, choices: choices.map((c) => convertChoice(c, type, targets)) }));
	const removeChoice = (cid) => update((cur) => ({ ...cur, default: cur.default === cid ? '' : cur.default, choices: choices.filter((c) => c.id !== cid) }));

	return html`<div class=${'wc3d-card p-2.5 transition-colors ' + (expanded ? 'border-brand-500 dark:border-brand-400/70' : 'hover:border-slate-300 dark:hover:border-slate-700')}>
		<div class="flex items-center gap-1">
			<button
				type="button"
				onClick=${toggle}
				aria-expanded=${expanded}
				aria-controls=${bodyId}
				disabled=${disabled}
				class=${`${BARE_BTN} flex flex-1 items-center gap-2.5 min-w-0 text-start rounded-md disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40`}
			>
				<span class="wc3d-icon-tile wc3d-icon-tile-brand"><${Icon} name=${g.type === 'parts' ? 'toggle' : g.type === 'material' ? 'palette' : g.type === 'variant' ? 'layers' : 'palette-bubble'} size=${14} /></span>
				<span class="flex flex-1 flex-col gap-1 min-w-0">
					<span class="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">${g.label || 'Untitled group'}</span>
					<span class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
						<span class="wc3d-badge wc3d-badge-brand">${GROUP_TYPES[g.type] || (g.type === 'variant' ? VARIANT_TYPE_LABEL : g.type)}</span>
						${g.required && html`<span class="wc3d-badge wc3d-badge-warning">Required</span>`}
						${logic && hasConditions(g.conditions) && html`<${ConditionalBadge} />`}
						<span class=${`${META_CLASS} whitespace-nowrap`}>${plural(choices.length, '%d choice', '%d choices')}${g.type === 'variant' ? '' : ' · ' + plural(targets.length, '%d mesh', '%d meshes')}</span>
					</span>
				</span>
				${!disabled && html`<${Icon} name="chevron-right" size=${14} class=${`flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />`}
			</button>
			${!disabled &&
			html`<div class="flex flex-col flex-shrink-0">
				<${IconButton} variant="ghost" label=${`Move ${g.label || 'group'} up`} disabled=${index === 0} onClick=${() => actions.move(-1)} icon=${html`<${Icon} name="chevron-down" size=${12} class="rotate-180" />`} class="!p-1" />
				<${IconButton} variant="ghost" label=${`Move ${g.label || 'group'} down`} disabled=${index === count - 1} onClick=${() => actions.move(1)} icon=${html`<${Icon} name="chevron-down" size=${12} />`} class="!p-1" />
			</div>`}
		</div>

		${expanded &&
		!disabled &&
		html`<div id=${bodyId} class=${`space-y-3 mt-2.5 pt-3 ${DIVIDER_CLASS}`}>
			<div>
				<label for=${`${baseId}-label`} class=${LABEL_CLASS}>Label</label>
				<input id=${`${baseId}-label`} type="text" value=${g.label ?? ''} onInput=${(e) => patch({ label: e.currentTarget.value }, true)} class=${INPUT_CLASS} placeholder="e.g. Frame finish" />
			</div>
			<div>
				<label for=${`${baseId}-desc`} class=${LABEL_CLASS}>Description (optional)</label>
				<textarea
					id=${`${baseId}-desc`}
					rows=${2}
					value=${g.description ?? ''}
					onInput=${(e) => update((cur) => (e.currentTarget.value ? { ...cur, description: e.currentTarget.value } : without(cur, 'description')), true)}
					class=${`${TEXTAREA_CLASS} resize-none`}
				></textarea>
			</div>
			<div class="grid grid-cols-2 gap-2">
				<div class="min-w-0">
					<label for=${`${baseId}-type`} class=${LABEL_CLASS}>Type</label>
					<select id=${`${baseId}-type`} value=${g.type} onChange=${(e) => setType(e.currentTarget.value)} class=${SELECT_CLASS}>
						${Object.entries(GROUP_TYPES).map(([k, v]) => html`<option key=${k} value=${k}>${v}</option>`)}
						${(variantsOn || g.type === 'variant') && html`<option value="variant">${VARIANT_TYPE_LABEL}</option>`}
					</select>
				</div>
				<div class="min-w-0">
					<label for=${`${baseId}-display`} class=${LABEL_CLASS}>Display</label>
					<select id=${`${baseId}-display`} value=${g.display} onChange=${(e) => patch({ display: e.currentTarget.value })} class=${SELECT_CLASS}>
						${Object.entries(GROUP_DISPLAYS).map(([k, v]) => html`<option key=${k} value=${k}>${v}</option>`)}
					</select>
				</div>
			</div>

			${g.type !== 'variant' &&
			html`<div>
				<div class="flex items-center justify-between gap-2 mb-1.5">
					<span class=${`${LABEL_CLASS} !mb-0`}>Applies to</span>
					<button
						type="button"
						disabled=${!fresh.length}
						onClick=${() => patch({ targets: [...targets, ...fresh] })}
						title=${fresh.length ? `Add ${fresh.join(', ')}` : 'Select meshes in the tree or the viewport first'}
						class="wc3d-btn wc3d-btn-soft wc3d-btn-sm"
					>
						Use selected meshes${fresh.length ? ` (${fresh.length})` : ''}
					</button>
				</div>
				<${TargetChips} targets=${targets} selection=${selection} onRemove=${removeTarget} />
			</div>`}

			<${ToggleRow} label="Required" description="Customers must pick a choice before adding to cart." checked=${!!g.required} onChange=${(on) => patch({ required: on })} />

			<div>
				<label for=${`${baseId}-default`} class=${LABEL_CLASS}>Default</label>
				<select id=${`${baseId}-default`} value=${choices.some((c) => c.id === g.default) ? g.default : ''} onChange=${(e) => patch({ default: e.currentTarget.value })} class=${SELECT_CLASS}>
					<option value="">None</option>
					${choices.map((c) => html`<option key=${c.id} value=${c.id}>${c.label || c.id}</option>`)}
				</select>
				${g.required && !choices.some((c) => c.id === g.default) && html`<p class=${`${HELP_CLASS} m-0 mt-1.5`}>No default: add to cart waits until the customer picks one.</p>`}
			</div>

			${logic && html`<${ConditionsBlock} ctx=${logic} group=${g} index=${index} onChange=${(cond) => update((cur) => (cond ? { ...cur, conditions: cond } : without(cur, 'conditions')))} />`}

			<div class=${`pt-3 ${DIVIDER_CLASS}`}>
				<div class="flex items-center justify-between gap-2 mb-1">
					<span class=${EYEBROW_CLASS}>Choices</span>
					<span class="wc3d-badge tabular-nums">${choices.length}</span>
				</div>
				${choices.length
					? html`<div>
							${choices.map(
								(c, i) => html`<${ChoiceRow}
									key=${c.id}
									group=${g}
									choice=${c}
									index=${i}
									count=${choices.length}
									open=${openChoice === c.id}
									pricing=${pricing}
									bases=${bases}
									attachments=${attachments}
									onToggle=${() => toggleChoice(c.id)}
									onMove=${(d) => setChoices(move(choices, i, d))}
									onRemove=${() => removeChoice(c.id)}
									onLive=${(next) => updateChoice(c.id, next, true)}
									onCommit=${(next) => updateChoice(c.id, next)}
									onFlush=${actions.flush}
									onPickImage=${() => pickImage(c.id)}
									logic=${logic}
									groupIndex=${index}
								/>`,
							)}
						</div>`
					: html`<${EmptyState} variant="slot" title="No choices yet." />`}
				${openChoice && choices.some((c) => c.id === openChoice) && html`<p class=${`${HELP_CLASS} m-0 mt-1`}>The open choice is previewed in the viewport.</p>`}
				<button type="button" onClick=${addChoice} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm w-full mt-2"><${Icon} name="plus" size=${13} />Add choice</button>
			</div>

			<div class=${`pt-3 ${DIVIDER_CLASS}`}>
				${confirming
					? html`<div role="alertdialog" aria-label="Delete option group" class=${`${SURFACE_CLASS} p-2.5 space-y-2`}>
							<p class="m-0 text-[12px] text-[color:var(--wc3d-ui-title)]">Are you sure you want to permanently delete this option group?</p>
							<div class="flex justify-end gap-1.5">
								<button type="button" class="wc3d-btn wc3d-btn-sm wc3d-btn-ghost" onClick=${() => setConfirming(false)}>Cancel</button>
								<button type="button" class="wc3d-btn wc3d-btn-sm wc3d-btn-danger" onClick=${remove}>OK</button>
							</div>
						</div>`
					: html`<button type="button" onClick=${() => setConfirming(true)} class=${LINK_DANGER_CLASS}>Delete group</button>`}
			</div>
		</div>`}
	</div>`;
}

export default function OptionsPanel() {
	const target = useEditor((s) => s.target);
	const productId = useEditor((s) => s.productId);
	const own = useEditor(() => editor.raw()?.options);
	const defaults = useEditor((s) => s.base?.config?.options);
	const variationRecords = useEditor((s) => s.variations);
	const selection = useEditor((s) => s.selection);
	const viewer = useEditor((s) => s.viewer);
	const pricing = useFeature('option-pricing');
	const variantsOn = useFeature('materials-variants');
	const modelVariants = useModelVariants().list;
	const attachments = useStore((s) => s.attachments || {});
	const palette = useStore((s) => viewerSettingsFor(s, productId).colorPalette.join(','));
	const base = useStore((s) => basePriceOf(s, productId, target === 'default' ? 0 : Number(target)));
	// Default prices on a variable product apply to each variation that has no options of its own.
	const bases = useStore((s) => {
		const p = s.products?.[productId];
		if (target !== 'default' || p?.type !== 'variable') return [base];
		const vids = (p.variations || []).filter((vid) => s.variationConfigs?.[vid]?.config?.options == null);
		return vids.length ? vids.map((vid) => basePriceOf(s, productId, vid)) : [base];
	});

	const isVariation = target !== 'default' && target != null;
	const inherited = isVariation && own == null;
	const toStored = (list) => (!isVariation && !list.length ? undefined : list);
	const writer = useListWriter(target, toStored);
	const saved = (inherited ? defaults : own) || NO_GROUPS;
	const list = Array.isArray(writer.draft ?? saved) ? writer.draft ?? saved : NO_GROUPS;
	// conditional-logic: null with the flag off.
	const logic = useConditionContext(list);

	const pool = idPool(productId);
	remember(pool, defaults);
	remember(pool, list);
	for (const rec of Object.values(variationRecords || {})) remember(pool, rec?.config?.options);

	const [openGroup, setOpenGroup] = useState(null);
	const [openChoice, setOpenChoice] = useState({});
	const pickFor = useRef(null);
	useEffect(() => {
		setOpenGroup(null);
		setOpenChoice({});
	}, [target, inherited]);

	// Viewport preview of the open choice; only that group's layer, cleared on collapse/unmount.
	const pg = !inherited && openGroup ? list.find((g) => g?.id === openGroup) : null;
	const pc = pg && openChoice[pg.id] && (pg.choices || []).find((c) => c?.id === openChoice[pg.id]);
	const layer = pg && pc ? groupLayer({ options: [pg] }, { options: { [pg.id]: pc.id } }) : null;
	const layerKey = layer ? JSON.stringify(layer) : '';
	const shown = useRef(null);
	useEffect(() => {
		if (!viewer) return;
		if (layerKey) {
			viewer.setCustom(JSON.parse(layerKey));
			shown.current = viewer;
		} else if (shown.current === viewer) {
			viewer.setCustom(null);
			shown.current = null;
		}
	}, [viewer, layerKey]);
	useEffect(
		() => () => {
			shown.current?.setCustom(null);
			shown.current = null;
		},
		[],
	);

	const write = (next, live = false) => (live ? writer.live(next) : writer.commit(next));
	const updateGroup = (gid, fn, live) => write(list.map((g) => (g?.id === gid ? fn(g) : g)), live);

	const picker = useMediaPicker({
		title: 'Choose a thumbnail image',
		button: 'Use this image',
		filter: 'image',
		onSelect: (att) => {
			const p = pickFor.current;
			if (!att?.id || !p) return;
			updateGroup(p.gid, (g) => ({ ...g, choices: (g.choices || []).map((c) => (c.id === p.cid ? { ...c, thumbnailId: att.id } : c)) }));
		},
	});

	const meshNames = () => new Set(viewer?.getMeshNames?.() || editor.get().modelInfo?.meshes || []);

	const addGroup = () => {
		const known = meshNames();
		const targets = selection.filter((m) => !known.size || known.has(m));
		const id = freshId(pool, 'g');
		write([...list, { id, label: 'New group', type: 'color', display: 'swatch', targets, required: false, default: '', choices: [] }]);
		setOpenGroup(id);
	};

	const colors = [...new Set(palette.split(',').map(lc).filter(Boolean))];
	const suggestions = suggestGroups(editor.effective(), colors);
	const createFromSettings = () => {
		// Append only; ids already used (or deleted) this session get a fresh one.
		const taken = new Set(list.map((g) => g?.id));
		// On a variable product's Default, a default choice would repaint every variation's own colour.
		const names = [...meshNames()];
		const keep = (g) => (isVariation || !variationOverrides(g, variationRecords, names) ? readableChoices(g) : { ...readableChoices(g, 'Default colour'), default: '' });
		const added = suggestions.map(keep).map((g) => (taken.has(g.id) || pool.has(g.id) ? { ...g, id: freshId(pool, 'g') } : (pool.add(g.id), g)));
		remember(pool, added);
		write([...list, ...added]);
	};

	const actionsFor = (g, i) => ({
		patch: (p, live) => updateGroup(g.id, (cur) => ({ ...cur, ...p }), live),
		update: (fn, live) => updateGroup(g.id, fn, live),
		updateChoice: (cid, next, live) => updateGroup(g.id, (cur) => ({ ...cur, choices: (cur.choices || []).map((c) => (c.id === cid ? next : c)) }), live),
		setChoices: (choices) => updateGroup(g.id, (cur) => ({ ...cur, choices })),
		move: (d) => write(move(list, i, d)),
		toggle: () => setOpenGroup((cur) => (cur === g.id ? null : g.id)),
		toggleChoice: (cid) => setOpenChoice((cur) => ({ ...cur, [g.id]: cur[g.id] === cid ? null : cid })),
		remove: () => {
			write(list.filter((x) => x?.id !== g.id));
			setOpenGroup(null);
		},
		addChoice: () => {
			const choices = Array.isArray(g.choices) ? g.choices : [];
			const used = new Set(choices.map((c) => lc(c.color || c.material?.baseColor)));
			const color = colors.find((c) => !used.has(c)) || FALLBACK_COLOR;
			const id = freshId(pool, 'c');
			const blank = { id, label: `Choice ${choices.length + 1}` };
			const choice = g.type === 'material' ? { ...blank, material: { baseColor: color, roughness: 0.5, metalness: 0 } } : g.type === 'parts' ? { ...blank, show: [...(g.targets || [])] } : g.type === 'variant' ? newVariantChoice(blank, choices, modelVariants) : { ...blank, color };
			updateGroup(g.id, (cur) => ({ ...cur, choices: [...choices, choice] }));
			setOpenChoice((cur) => ({ ...cur, [g.id]: id }));
		},
		pickImage: (cid) => {
			pickFor.current = { gid: g.id, cid };
			picker.open();
		},
		flush: writer.flush,
	});

	// materials-variants off: variant groups stay saved but are not listed.
	const groups = list.filter((g) => isObj(g) && g.id && (g.type !== 'variant' || variantsOn));

	return html`<div class="px-4 py-3.5 space-y-3" onfocusout=${writer.flush}>
		<p class=${`${HELP_CLASS} m-0`}>Customers pick one choice per group in the 3D customizer. Groups replace the Customizable and Toggleable mesh lists.</p>

		${isVariation &&
		(inherited
			? html`<div class=${`${SURFACE_CLASS} flex items-center gap-2.5 p-2.5`}>
					<span class="flex-1 min-w-0 text-[12px] font-semibold text-slate-700 dark:text-slate-200">Inherited from Default</span>
					<button type="button" onClick=${() => writer.commit(clone(defaults) || [])} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm">Set options for this variation</button>
				</div>`
			: html`<div class=${`${SURFACE_CLASS} flex items-center gap-2.5 p-2.5`}>
					<span class="flex-1 min-w-0 text-[12px] font-semibold text-slate-700 dark:text-slate-200">Options for this variation</span>
					<button type="button" onClick=${() => writer.commit(undefined)} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm">Use Default options</button>
				</div>`)}

		${groups.length
			? html`<div class="space-y-2">
					${groups.map(
						(g, i) => html`<${GroupCard}
							key=${g.id}
							group=${g}
							index=${i}
							count=${groups.length}
							expanded=${!inherited && openGroup === g.id}
							openChoice=${openChoice[g.id] || null}
							selection=${selection}
							pricing=${pricing}
							bases=${bases}
							attachments=${attachments}
							disabled=${inherited}
							actions=${actionsFor(g, list.indexOf(g))}
							logic=${logic}
						/>`,
					)}
				</div>`
			: html`<${EmptyState} variant="dashed" title="No option groups yet. Customers see the meshes marked Customizable or Toggleable." />`}

		${!inherited &&
		(groups.length
			? html`<button type="button" onClick=${addGroup} class="wc3d-btn wc3d-btn-soft w-full"><${Icon} name="plus" size=${14} />Add group</button>`
			: html`<div class="flex flex-col gap-2">
					<button
						type="button"
						onClick=${createFromSettings}
						disabled=${!suggestions.length}
						title=${suggestions.length ? undefined : 'Mark a mesh as Customizable or Toggleable on Frontend first.'}
						class="wc3d-btn wc3d-btn-primary w-full"
					>
						<${Icon} name="sparkles" size=${14} />Create from customizer settings
					</button>
					<button type="button" onClick=${addGroup} class="wc3d-btn wc3d-btn-soft w-full"><${Icon} name="plus" size=${14} />Add group</button>
				</div>`)}
		${!inherited && selection.length > 0 && html`<p class=${`${HELP_CLASS} m-0`}>A new group applies to the selected ${selection.length === 1 ? 'mesh' : 'meshes'}.</p>`}
		${picker.modal}
	</div>`;
}
