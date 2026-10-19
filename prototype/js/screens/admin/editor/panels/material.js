// Port of components/MaterialEditor: base colour, metalness, roughness for every selected mesh
// (materials are keyed by MESH name), material-slot readout and material presets.
import { html } from '../../../../core/ui.js';
import { editor, useEditor } from '../editor-store.js';
import { getMaterialConfig } from '../../../../shared/effective-config.js';
import { ColorField, EYEBROW_CLASS, FIELD_LABEL_CLASS, MONO_TEXT_CLASS, SURFACE_CLASS, SliderRow, formatPercent } from '../../../../shared/editor-ui.js';
import { PresetsManager } from './presets.js';

const ROW_RULE = 'border-b border-[color:var(--wc3d-ui-rule)]';

function commonNum(meshes, materials, key, fallback) {
	if (!meshes.length) return fallback;
	const first = getMaterialConfig(materials, meshes[0])?.[key];
	for (let i = 1; i < meshes.length; i++) if (getMaterialConfig(materials, meshes[i])?.[key] !== first) return fallback;
	return typeof first === 'number' ? first : fallback;
}

function commonStr(meshes, materials, key) {
	if (!meshes.length) return '';
	const first = getMaterialConfig(materials, meshes[0])?.[key] ?? '';
	for (let i = 1; i < meshes.length; i++) if ((getMaterialConfig(materials, meshes[i])?.[key] ?? '') !== first) return '';
	return first;
}

export default function MaterialPanel() {
	const meshes = useEditor((s) => s.selection) || [];
	const target = useEditor((s) => s.target);
	const viewer = useEditor((s) => s.viewer);
	useEditor((s) => s.modelInfo);
	const cfg = useEditor(() => editor.raw()) || {};
	const isVariation = target !== 'default' && target != null;

	if (!meshes.length) return null;

	const materials = cfg.materials;
	const baseColor = commonStr(meshes, materials, 'baseColor');
	const metalness = commonNum(meshes, materials, 'metalness', 0);
	const roughness = commonNum(meshes, materials, 'roughness', 0.5);
	const patchAll = (patch) => editor.patchMaterials(meshes, patch);
	const materialNames = viewer?.getMaterialNamesForMeshes ? viewer.getMaterialNamesForMeshes(meshes) : [];

	return html`<div class="px-4 py-3.5">
		<div class="flex items-center justify-between gap-2 mb-1.5">
			<span class=${EYEBROW_CLASS}>Material</span>
			${isVariation && html`<span class="wc3d-badge wc3d-badge-brand">Override</span>`}
		</div>

		<div class=${`grid grid-cols-[1fr_auto] items-center gap-3 py-2 ${ROW_RULE}`}>
			<span class=${FIELD_LABEL_CLASS}>Base color</span>
			<${ColorField} label="Base color" value=${baseColor} onChange=${(hex) => patchAll({ baseColor: hex })} showHexInput=${false}>
				<span class=${MONO_TEXT_CLASS}>${baseColor || '—'}</span>
			<//>
		</div>

		<${SliderRow} variant="inline" label="Metalness" value=${metalness} format=${formatPercent} onChange=${(v) => patchAll({ metalness: v })} />
		<${SliderRow} variant="inline" label="Roughness" value=${roughness} format=${formatPercent} onChange=${(v) => patchAll({ roughness: v })} />

		${materialNames.length > 0 &&
		html`<div class=${`${SURFACE_CLASS} mt-3 px-3 py-2.5`}>
			<div class=${`${EYEBROW_CLASS} mb-1`}>Material slots</div>
			${materialNames.map((name) => html`<div key=${name} class=${`${MONO_TEXT_CLASS} py-0.5 truncate`} title=${name}>${name}</div>`)}
		</div>`}

		<${PresetsManager}
			type="material"
			getData=${() => ({ baseColor: baseColor || '#ffffff', metalness, roughness })}
			onApply=${(data) => data && patchAll(data)}
		/>
	</div>`;
}
