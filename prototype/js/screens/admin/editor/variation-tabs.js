// VariationTabs (components/VariationTabs): "This variant changes" summary card, or
// "Back to overview" on the default target.
import { html } from '../../../core/ui.js';
import { Icon } from '../../../shared/icons.js';
import { EYEBROW_CLASS, IconButton, SURFACE_CLASS } from '../../../shared/editor-ui.js';
import { useFeature } from '../../../core/features.js';
import { editor, useEditor } from './editor-store.js';

const BackIcon = () => html`<${Icon} name="arrow-left" size=${14} class="flex-shrink-0 rtl:-scale-x-100" />`;

function DiffRow({ meshName, onRemove = () => editor.removeOverride(meshName) }) {
	return html`<div class=${`${SURFACE_CLASS} group flex items-center gap-2 h-8 ps-2.5 pe-1 box-border`}>
		<span class="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0"></span>
		<span class="flex-1 min-w-0 text-[12px] font-medium text-[color:var(--wc3d-ui-title)] truncate" title=${meshName}>${meshName}</span>
		<span class="text-[11px] text-slate-500 dark:text-slate-400">override</span>
		<${IconButton}
			variant="danger"
			label="Remove this override"
			icon=${html`<${Icon} name="close" size=${12} />`}
			onClick=${(e) => {
				e.stopPropagation();
				onRemove();
			}}
			class="!p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
		/>
	</div>`;
}

/** <VariationTabs variationLabel canReturn /> */
export function VariationTabs({ variationLabel, canReturn = true }) {
	const { target, cfg } = useEditor((s) => ({ target: s.target, cfg: editor.raw() }));
	const pricing = useFeature('option-pricing');
	const groups = useFeature('option-groups');
	const variantOn = useFeature('materials-variants');
	const openOverview = () => editor.setView('overview');

	if (target === 'default') {
		return canReturn
			? html`<div class="px-4 py-3.5">
					<button type="button" onClick=${openOverview} class="wc3d-btn wc3d-btn-ghost w-full"><${BackIcon} />Back to overview</button>
				</div>`
			: null;
	}

	const keys = Array.from(new Set([...Object.keys(cfg.meshes || {}), ...Object.keys(cfg.materials || {})]));
	// option-pricing / option-groups: the variation's own price rules / option groups count as one override each.
	const priced = pricing && cfg.pricing != null;
	const grouped = groups && cfg.options != null;
	const varianted = variantOn && cfg.material_variant != null; // materials-variants: one override
	const total = keys.length + (priced ? 1 : 0) + (grouped ? 1 : 0) + (varianted ? 1 : 0);
	const more = keys.length - 8;

	return html`<div class="px-4 py-3.5 space-y-2.5">
		<div class="flex items-center justify-between gap-2">
			<span class=${EYEBROW_CLASS}>This variant changes</span>
			<span class=${`wc3d-badge tabular-nums ${total > 0 ? 'wc3d-badge-brand' : ''}`}>${total}</span>
		</div>
		${total === 0
			? html`<p class="m-0 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">No overrides yet. Edit a mesh on the right to start.</p>`
			: html`<div class="space-y-1.5">
					${grouped && html`<${DiffRow} key="options:" meshName="Customer options" onRemove=${() => editor.replace('options', undefined)} />`}
					${priced && html`<${DiffRow} key="pricing:" meshName="Option prices" onRemove=${() => editor.replace('pricing', undefined)} />`}
					${varianted && html`<${DiffRow} key="variant:" meshName="Material variant" onRemove=${() => editor.replace('material_variant', undefined)} />`}
					${keys.slice(0, 8).map((k) => html`<${DiffRow} key=${k} meshName=${k} />`)}
					${more > 0 && html`<p class="m-0 px-1 text-[11.5px] text-slate-500 dark:text-slate-400">+ ${more} more…</p>`}
				</div>`}
		<div class="flex items-center gap-2 pt-1">
			${canReturn &&
			html`<button type="button" onClick=${openOverview} class="wc3d-btn wc3d-btn-ghost flex-1 min-w-0" title="Return to the variations grid"><${BackIcon} />Overview</button>`}
			${total > 0 &&
			html`<button type="button" onClick=${() => editor.clearOverrides()} class="wc3d-btn wc3d-btn-soft flex-1 min-w-0" title="Clear all overrides for this variation (still needs Save)">Clear all</button>`}
		</div>
		${variationLabel && html`<p class="m-0 text-[11.5px] text-slate-500 dark:text-slate-400 truncate" title=${variationLabel}>Editing: ${variationLabel}</p>`}
	</div>`;
}

export default VariationTabs;
