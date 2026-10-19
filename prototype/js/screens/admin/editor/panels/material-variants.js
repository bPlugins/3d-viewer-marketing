// "Material Variants" (planned, flag materials-variants): the GLB's KHR_materials_variants, the variant
// each target shows (config.material_variant), the variation mapping and the scene-tree preview list.
// Spec: prototype/specs/materials-variants.md.
import { html, useState, useEffect, useRef } from '../../../../core/ui.js';
import { useStore } from '../../../../core/store.js';
import { useFeature } from '../../../../core/features.js';
import { editor, useEditor, variationLabel } from '../editor-store.js';
import { EmptyState, EYEBROW_CLASS, HELP_CLASS, InfoBanner, LABEL_CLASS, ColorField, SELECT_CLASS, SURFACE_CLASS } from '../../../../shared/editor-ui.js';
import { getMaterialConfig } from '../../../../shared/effective-config.js';
import { Icon } from '../../../../shared/icons.js';
import { demoVariantList } from '../../../../engine/material-variants.js';

export const VARIANT_TYPE_LABEL = 'Material variant';
const MODEL = 'Model materials';
const NONE = [];
const BARE_BTN = 'bg-transparent border-0 p-0 m-0 [font:inherit] text-inherit cursor-pointer';
const META_CLASS = 'text-[11.5px] text-slate-500 dark:text-slate-400';

const plural = (n, one, many) => (n === 1 ? one : many).replace('%d', n);
const partName = (mesh) => String(mesh).replace(/_/g, ' ');
const andList = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const lc = (s) => String(s ?? '').trim().toLowerCase();

// ── Model variants ───────────────────────────────────────────────────────────

/** {list: [{name, meshes, swatch}], known}: demo models list theirs at once, an uploaded GLB once loaded. */
export function useModelVariants() {
	const { modelKey, info } = useEditor((s) => ({ modelKey: s.modelKey, info: s.modelInfo?.variants }));
	const demo = editor.activeModel().attachment?.demo;
	if (demo) return { list: demoVariantList(demo), known: true, modelKey };
	return { list: Array.isArray(info) ? info : NONE, known: Array.isArray(info), modelKey };
}

/** "3 material variants" for the overview's model card ('' when none). */
export function variantCountLabel(attachment, modelInfo) {
	const n = attachment?.demo ? demoVariantList(attachment.demo).length : Array.isArray(modelInfo?.variants) ? modelInfo.variants.length : 0;
	return n ? plural(n, '%d material variant', '%d material variants') : '';
}

export function Swatches({ colors = [], size = 14 }) {
	const list = colors.length ? colors.slice(0, 3) : ['#cbd5e1'];
	return html`<span class="inline-flex flex-shrink-0" aria-hidden="true">
		${list.map(
			(c, i) => html`<span
				key=${i}
				class="rounded-full border border-white dark:border-slate-900 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
				style=${{ width: size + 'px', height: size + 'px', background: c, marginInlineStart: i ? -size * 0.35 + 'px' : 0 }}
			></span>`,
		)}
	</span>`;
}

// ── Viewport preview (shared by the scene tree rows) ─────────────────────────
let previewName = null;
const previewSubs = new Set();
function setPreview(name) {
	previewName = name;
	previewSubs.forEach((f) => f(name));
}
function usePreview() {
	const [v, setV] = useState(previewName);
	useEffect(() => {
		previewSubs.add(setV);
		return () => previewSubs.delete(setV);
	}, []);
	return v;
}

/** Scene tree: the GLB's variants; a row click previews it in the viewport (nothing is saved). */
export function VariantTreeList() {
	const on = useFeature('materials-variants');
	const { list, modelKey } = useModelVariants();
	const viewer = useEditor((s) => s.viewer);
	const target = useEditor((s) => s.target);
	const shown = useEditor(() => editor.effective()?.material_variant) || '';
	const preview = usePreview();

	const overridden = useRef(false);
	useEffect(() => {
		const next = on ? preview : null;
		// Flag off and nothing previewed: leave the viewer alone (no extra material pass).
		if (!viewer?.setMaterialVariant || (next === null && !overridden.current)) return;
		viewer.setMaterialVariant(next);
		overridden.current = next !== null;
	}, [viewer, preview, on]);
	useEffect(() => setPreview(null), [target, modelKey, on]);
	const viewerRef = useRef(viewer);
	viewerRef.current = viewer;
	useEffect(
		() => () => {
			setPreview(null);
			if (overridden.current) viewerRef.current?.setMaterialVariant?.(null);
		},
		[],
	);

	if (!on || !list.length) return null;
	return html`<div class="flex items-center justify-between gap-2 mt-4 mb-1.5 px-1">
			<span class=${EYEBROW_CLASS}>Material variants</span>
			<span class="wc3d-badge" title=${plural(list.length, '%d material variant', '%d material variants')}>${list.length}</span>
		</div>
		<div class="flex flex-col gap-px" data-wc3d-variant-tree>
			${list.map((v) => {
				const active = preview === v.name;
				return html`<button
					key=${v.name}
					type="button"
					aria-pressed=${active}
					title=${active ? 'End the preview' : 'Preview in the viewport'}
					onClick=${() => setPreview(active ? null : v.name)}
					class=${`${BARE_BTN} flex items-center gap-2 h-7 px-1.5 rounded-md text-start text-[12px] transition-colors ${active ? 'bg-[var(--wc3d-ui-strip)] text-[color:var(--wc3d-ui-primary)] font-semibold' : 'text-[color:var(--wc3d-ui-text-2)] hover:bg-[var(--wc3d-ui-tile)]'}`}
				>
					<${Icon} name="layers" size=${12} class="flex-shrink-0 text-[color:var(--wc3d-ui-desc)]" />
					<span class="truncate">${v.name}</span>
					<span class="ms-auto flex items-center gap-1 flex-shrink-0">
						${shown === v.name && html`<span class="inline-flex" title="Shown for this target"><${Icon} name="check-circle" size=${13} class="text-[color:var(--wc3d-ui-success-fg)]" /></span>`}
						${active && html`<span class="wc3d-badge wc3d-badge-brand">Preview</span>`}
					</span>
				</button>`;
			})}
		</div>`;
}

// ── Inspector section ────────────────────────────────────────────────────────

function ChoiceCard({ checked, title, meta, swatch, onPick }) {
	return html`<button
		type="button"
		role="radio"
		aria-checked=${checked ? 'true' : 'false'}
		onClick=${onPick}
		class=${`wc3d-card ${BARE_BTN} w-full flex items-center gap-2.5 p-2.5 text-start transition-colors ${checked ? '!border-brand-500 bg-[var(--wc3d-ui-strip)]' : 'hover:border-slate-300 dark:hover:border-slate-700'}`}
	>
		<span class=${`inline-flex items-center justify-center w-4 h-4 flex-shrink-0 rounded-full border ${checked ? 'border-brand-500' : 'border-slate-300 dark:border-slate-600'}`} aria-hidden="true">
			${checked && html`<span class="w-2 h-2 rounded-full bg-brand-500"></span>`}
		</span>
		${swatch}
		<span class="flex flex-col min-w-0">
			<span class=${`text-[12.5px] truncate ${checked ? 'font-semibold text-[color:var(--wc3d-ui-primary)]' : 'font-medium text-[color:var(--wc3d-ui-title)]'}`}>${title}</span>
			${meta && html`<span class=${`${META_CLASS} truncate`}>${meta}</span>`}
		</span>
	</button>`;
}

/** Unique whole-word match of a variation's attribute values in the variant names. */
function autoMatch(variation, names) {
	const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const hits = new Set();
	for (const value of Object.values(variation?.attributes || {})) {
		const v = lc(value);
		if (!v) continue;
		const re = new RegExp(`(^|[^\\p{L}\\p{N}])${esc(v)}($|[^\\p{L}\\p{N}])`, 'iu');
		names.filter((n) => re.test(n)).forEach((n) => hits.add(n));
	}
	return hits.size === 1 ? [...hits][0] : null;
}

const valueOf = (v) => (v == null ? 'inherit' : v === '' ? 'model' : 'v:' + v);
const storedOf = (key) => (key === 'inherit' ? undefined : key === 'model' ? '' : key.slice(2));

function VariationMapping({ list }) {
	const records = useEditor((s) => s.variations);
	const attachmentId = useEditor((s) => s.attachmentId);
	const defaultName = useEditor((s) => s.base?.config?.material_variant) || '';
	useStore((g) => g.variations);
	const variations = editor.wcVariations();
	const [result, setResult] = useState('');
	const names = list.map((v) => v.name);
	if (!variations.length) return null;

	const own = (vid) => {
		const m = Number(records[vid]?.model_id) || 0;
		return m > 0 && m !== attachmentId;
	};
	const autoMap = () => {
		const values = {};
		let matched = 0;
		for (const v of variations) {
			if (own(v.id)) continue;
			const name = autoMatch(v, names);
			if (!name) continue;
			matched++;
			values[v.id] = name;
		}
		editor.setVariationKey('material_variant', values);
		setResult(matched ? plural(matched, 'Mapped %d variation.', 'Mapped %d variations.') : 'No variation names match a material variant.');
	};

	return html`<div class="pt-3 border-t border-slate-100 dark:border-slate-800">
		<div class="flex items-center justify-between gap-2 mb-1.5">
			<span class=${EYEBROW_CLASS}>Variations</span>
			<button type="button" onClick=${autoMap} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm" title="Match each variation's attribute value to a variant name">
				<${Icon} name="sparkles" size=${13} />Auto-map by name
			</button>
		</div>
		${result && html`<p role="status" class=${`${HELP_CLASS} m-0 mb-1.5`}>${result}</p>`}
		<div class=${`${SURFACE_CLASS} overflow-hidden`}>
			${variations.map((v) => {
				const label = variationLabel(v);
				const cur = records[v.id]?.config?.material_variant;
				const missing = typeof cur === 'string' && cur && !names.includes(cur);
				return html`<div key=${v.id} class="flex items-center gap-2 px-2.5 py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
					${v.swatch ? html`<span class="w-3 h-3 flex-shrink-0 rounded-full border border-black/10" style=${{ background: v.swatch }} aria-hidden="true"></span>` : null}
					<span class="flex-1 min-w-0 truncate text-[12px] font-medium text-[color:var(--wc3d-ui-title)]" title=${label}>${label}</span>
					${own(v.id)
						? html`<span class=${META_CLASS} title="This variation uses its own model: set its variant in that variation.">Own model</span>`
						: html`<select
								aria-label=${`Material variant for ${label}`}
								value=${valueOf(cur)}
								onChange=${(e) => editor.setVariationKey('material_variant', { [v.id]: storedOf(e.currentTarget.value) })}
								class=${`${SELECT_CLASS} !w-[58%] !min-w-0 !h-8 !text-[12px]`}
							>
								<option value="inherit">Use Default${defaultName ? ` (${defaultName})` : ''}</option>
								<option value="model">${MODEL}</option>
								${list.map((x) => html`<option key=${x.name} value=${'v:' + x.name}>${x.name}</option>`)}
								${missing && html`<option value=${'v:' + cur}>${cur} (missing)</option>`}
							</select>`}
				</div>`;
			})}
		</div>
		<p class=${`${HELP_CLASS} m-0 mt-1.5`}>Auto-map matches attribute values to variant names, e.g. “Teal” → “Walnut & Teal Leather”.</p>
	</div>`;
}

function CustomerChoice({ list, shown }) {
	const groupsOn = useFeature('option-groups');
	const options = useEditor(() => editor.raw()?.options);
	const [added, setAdded] = useState('');
	if (!groupsOn) return null;
	const current = Array.isArray(options) ? options : NONE;
	const exists = current.some((g) => g?.type === 'variant');
	const create = () => {
		const ids = new Set(current.map((g) => g?.id));
		let id = 'material';
		for (let n = 2; ids.has(id); n++) id = `material-${n}`;
		const choices = list.map((v, i) => ({ id: 'v' + (i + 1), label: v.name, variant: v.name, color: v.swatch[0] || '#cccccc' }));
		const def = choices.find((c) => c.variant === shown) || choices[0];
		editor.replace('options', [...current, { id, label: 'Material', type: 'variant', display: 'thumbnail', targets: [], required: false, default: def?.id || '', choices }]);
		setAdded('Added “Material” to Customer Options.');
	};
	return html`<div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
		<span class=${EYEBROW_CLASS}>Customer choice</span>
		<p class=${`${HELP_CLASS} m-0`}>Let customers pick a variant in the 3D customizer.</p>
		<button type="button" onClick=${create} disabled=${exists} title=${exists ? 'Already added' : undefined} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm w-full">
			<${Icon} name="swatch-book" size=${13} />Create option group
		</button>
		${added && html`<p role="status" class=${`${HELP_CLASS} m-0`}>${added}</p>`}
	</div>`;
}

export default function MaterialVariantsPanel() {
	const target = useEditor((s) => s.target);
	const { list, known } = useModelVariants();
	const raw = useEditor(() => editor.raw()?.material_variant);
	const inherited = useEditor((s) => s.base?.config?.material_variant) || '';
	const effective = useEditor(() => editor.effective());
	const isVariation = target !== 'default' && target != null;
	const variable = useStore((g) => g.products?.[editor.get().productId]?.type === 'variable');

	if (!known) return html`<div class=${`px-4 py-3.5 ${HELP_CLASS}`}>Reading the model…</div>`;
	if (!list.length)
		return html`<div class="px-4 py-3.5">
			<${EmptyState}
				variant="panel"
				icon=${html`<${Icon} name="layers" size=${16} />`}
				title=${html`<span class="block font-semibold text-[color:var(--wc3d-ui-title)]">This model has no material variants</span>
					<span class="block mt-1">Export them from Blender, Substance 3D Painter or another glTF tool (KHR_materials_variants), then upload the model again.</span>`}
			/>
		</div>`;

	const shown = typeof effective?.material_variant === 'string' ? effective.material_variant : '';
	const names = list.map((v) => v.name);
	const pick = (key) => {
		setPreview(null);
		const value = storedOf(key);
		editor.replace('material_variant', !isVariation && value === '' ? undefined : value);
	};
	const sel = isVariation ? valueOf(raw) : valueOf(raw || '');
	const missing = shown && !names.includes(shown);

	// Saved colour edits on meshes the shown variant maps are drawn on top of it.
	const mapped = list.find((v) => v.name === shown)?.meshes || NONE;
	const meshNames = Object.keys(effective?.meshes || {});
	const edited = mapped.filter((m) => getMaterialConfig(effective?.materials, m, meshNames)?.baseColor || effective?.meshes?.[m]?.color || effective?.meshes?.[m]?.texture);

	return html`<div class="px-4 py-3.5 space-y-3">
		<p class=${`${HELP_CLASS} m-0`}>Material sets saved in the GLB. Each one swaps the materials of the meshes it covers.</p>
		<div>
			<span class=${`${EYEBROW_CLASS} block mb-1.5`}>${isVariation ? 'Shown for this variation' : 'Shown on this product'}</span>
			<div role="radiogroup" aria-label=${isVariation ? 'Shown for this variation' : 'Shown on this product'} class="space-y-1.5">
				${isVariation &&
				html`<${ChoiceCard} checked=${sel === 'inherit'} title="Use Default" meta=${`Default: ${inherited || MODEL}`} swatch=${html`<${Icon} name="reset" size=${14} class="flex-shrink-0 text-slate-400" />`} onPick=${() => pick('inherit')} />`}
				<${ChoiceCard} checked=${sel === 'model'} title=${MODEL} meta="The GLB's own materials" swatch=${html`<${Icon} name="cube" size=${14} class="flex-shrink-0 text-slate-400" />`} onPick=${() => pick('model')} />
				${list.map(
					(v) => html`<${ChoiceCard}
						key=${v.name}
						checked=${sel === 'v:' + v.name}
						title=${v.name}
						meta=${plural(v.meshes.length, '%d mesh', '%d meshes')}
						swatch=${html`<${Swatches} colors=${v.swatch} />`}
						onPick=${() => pick('v:' + v.name)}
					/>`,
				)}
			</div>
		</div>
		${missing && html`<${InfoBanner} tone="warning" compact>“${shown}” is not in this model, so its own materials show.<//>`}
		${!missing && edited.length > 0 && html`<${InfoBanner} tone="info" compact>Material edits on ${andList(edited.map(partName))} apply on top of this variant.<//>`}
		${!isVariation && variable && html`<${VariationMapping} list=${list} />`}
		${!isVariation && html`<${CustomerChoice} list=${list} shown=${shown} />`}
	</div>`;
}

// ── Customer Options integration (panels/options.js, type 'variant') ─────────

/** Variant select + swatch colour for a variant-type choice. */
export function VariantChoiceFields({ choice: c, onLive, onCommit, onFlush }) {
	const { list } = useModelVariants();
	const names = list.map((v) => v.name);
	const cur = typeof c.variant === 'string' ? c.variant : '';
	const missing = cur && !names.includes(cur);
	const id = 'wc3d-vc-' + String(c.id).replace(/[^A-Za-z0-9_-]/g, '');
	const choose = (name) => {
		const prev = list.find((v) => v.name === cur);
		const next = list.find((v) => v.name === name);
		const relabel = !c.label || c.label === cur || /^Choice \d+$/.test(c.label);
		const recolor = !c.color || (prev && prev.swatch[0] === c.color);
		onCommit({ ...c, variant: name, ...(relabel ? { label: name || MODEL } : {}), ...(recolor && next?.swatch[0] ? { color: next.swatch[0] } : {}) });
	};
	return html`<div class="space-y-3">
		<div>
			<label for=${id} class=${LABEL_CLASS}>Variant</label>
			<select id=${id} value=${cur} onChange=${(e) => choose(e.currentTarget.value)} class=${SELECT_CLASS}>
				<option value="">${MODEL}</option>
				${list.map((v) => html`<option key=${v.name} value=${v.name}>${v.name}</option>`)}
				${missing && html`<option value=${cur}>${cur} (missing)</option>`}
			</select>
		</div>
		<div>
			<span class=${LABEL_CLASS}>Swatch colour</span>
			<${ColorField} label=${`${c.label || 'Choice'} swatch colour`} value=${c.color || '#cccccc'} onChange=${(hex) => onLive({ ...c, color: hex })} onChangeEnd=${onFlush} />
		</div>
	</div>`;
}

/** A new variant-type choice: the next variant no choice uses yet. */
export function newVariantChoice(blank, choices, list) {
	const used = new Set((choices || []).map((c) => c?.variant));
	const v = list.find((x) => !used.has(x.name)) || list[0];
	return v ? { ...blank, label: v.name, variant: v.name, color: v.swatch[0] || '#cccccc' } : { ...blank, variant: '', color: '#cccccc' };
}
