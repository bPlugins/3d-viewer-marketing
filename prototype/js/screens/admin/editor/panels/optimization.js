// Port of components/OptimizationControls: model health readout and the mobile/GPU settings.
// autoOptimize, dracoEnabled, lodEnabled, maxTextureResolution have no controls and stay untouched.
import { html, useState } from '../../../../core/ui.js';
import { editor, useEditor } from '../editor-store.js';
import { useFeature } from '../../../../core/features.js';
import { useModelVariants } from './material-variants.js';
import { Accordion, HELP_CLASS, InfoBanner, LABEL_CLASS, ROW_DIVIDER_CLASS, SELECT_CLASS, SURFACE_CLASS, SliderRow, ToggleRow, formatMultiplier, useId } from '../../../../shared/editor-ui.js';

const LARGE_FILE_BYTES = 15 * 1024 * 1024;
const TOGGLE_ROW = 'pb-3 border-b border-slate-100 dark:border-slate-800';
const STAT_ROW = `flex items-center justify-between gap-3 px-3 py-2 text-[12px] ${ROW_DIVIDER_CLASS}`;
const STAT_KEY = 'text-slate-500 dark:text-slate-400';
const STAT_VALUE = 'tabular-nums font-semibold text-slate-800 dark:text-slate-100';
const STAT_DANGER = 'tabular-nums font-semibold text-[color:var(--wc3d-ui-danger-fg)]';
const STAT_WARN = 'tabular-nums font-semibold text-[color:var(--wc3d-ui-warn-fg)]';

const patchOpt = (patch) => editor.patch('optimization', patch);
const count = (v) => (Array.isArray(v) ? v.length : Number(v) || 0);

export default function OptimizationPanel() {
	const opt = useEditor(() => editor.raw()?.optimization) || {};
	const info = useEditor((s) => s.modelInfo);
	const variantsOn = useFeature('materials-variants');
	const variants = useModelVariants().list;
	const [active, setActive] = useState('stats');
	const gpuModeId = useId();

	const stats = info ? { triangles: Number(info.triangles) || 0, vertices: Number(info.vertices) || 0, materials: count(info.materials), textures: count(info.textures) } : null;
	const sizeBytes = info?.sizeBytes ?? null;

	const gpuPerformanceMode = opt.gpuPerformanceMode ?? 'default';
	const pixelRatioLimit = opt.pixelRatioLimit ?? 1.5;

	const section = (sec, bodyClassName) => ({ variant: 'nested-compact', open: active === sec, onToggle: (next) => setActive(next ? sec : null), bodyClassName });

	const hasSize = sizeBytes !== null && sizeBytes > 0;
	const isLargeFile = hasSize && sizeBytes > LARGE_FILE_BYTES;
	const isHighTriangles = !!stats && stats.triangles > 150000;
	const isHighMaterials = !!stats && stats.materials > 15;

	return html`<div>
		<${Accordion} title="Model Validation (Health)" ...${section('stats', 'px-4 py-3.5 space-y-3')}>
			${stats
				? html`
						<div class=${`${SURFACE_CLASS} overflow-hidden`}>
							<div class=${STAT_ROW}><span class=${STAT_KEY}>Polygons (Triangles)</span><span class=${isHighTriangles ? STAT_DANGER : STAT_VALUE}>${stats.triangles.toLocaleString()}</span></div>
							<div class=${STAT_ROW}><span class=${STAT_KEY}>Vertices Count</span><span class=${STAT_VALUE}>${stats.vertices.toLocaleString()}</span></div>
							<div class=${STAT_ROW}><span class=${STAT_KEY}>Unique Materials</span><span class=${isHighMaterials ? STAT_WARN : STAT_VALUE}>${stats.materials}</span></div>
							<div class=${STAT_ROW}><span class=${STAT_KEY}>Unique Textures</span><span class=${STAT_VALUE}>${stats.textures}</span></div>
							${variantsOn && html`<div class=${STAT_ROW}><span class=${STAT_KEY}>Material Variants</span><span class=${STAT_VALUE}>${variants.length}</span></div>`}
							${hasSize &&
							html`<div class=${STAT_ROW}><span class=${STAT_KEY}>File Size (GLB)</span><span class=${isLargeFile ? STAT_DANGER : STAT_VALUE}>${(sizeBytes / (1024 * 1024)).toFixed(2)} MB</span></div>`}
						</div>
						${isHighTriangles || isLargeFile || isHighMaterials
							? html`<${InfoBanner} tone="warning" title="Model Health Warnings" padding="p-3">
									<ul class="list-disc ps-4 m-0 space-y-1">
										${isHighTriangles && html`<li>Triangle count is high (>150k). This can drag frame rates on mobile. Consider decimating the mesh before uploading.</li>`}
										${isLargeFile && html`<li>File size exceeds 15MB. Consider compressing meshes with Draco or resizing high-res maps in Blender.</li>`}
										${isHighMaterials && html`<li>High material count (>15). Try packing textures into combined atlas slots to lower draw call overhead.</li>`}
									</ul>
								<//>`
							: html`<${InfoBanner} tone="success" compact>Model health status: Excellent!<//>`}
					`
				: html`<div class=${`py-2 text-center ${HELP_CLASS}`}>Loading model diagnostics…</div>`}
		<//>

		<${Accordion} title="Mobile & GPU Optimizations" ...${section('gpu', 'px-4 py-3.5 space-y-4')}>
			<div>
				<label for=${gpuModeId} class=${LABEL_CLASS}>GPU Performance Mode</label>
				<select id=${gpuModeId} value=${gpuPerformanceMode} onChange=${(e) => patchOpt({ gpuPerformanceMode: e.currentTarget.value })} class=${SELECT_CLASS}>
					<option value="default">Balanced (Default)</option>
					<option value="high-performance">High Performance (Max detail)</option>
					<option value="low-power">Battery Saver (Lock low-DPR)</option>
				</select>
			</div>
			<${SliderRow} label="Mobile Pixel Ratio Limit" value=${pixelRatioLimit} onChange=${(v) => patchOpt({ pixelRatioLimit: v })} min=${1} max=${2} step=${0.1} format=${formatMultiplier} />
			<${ToggleRow} label="Disable Mobile Reflections" class=${TOGGLE_ROW} checked=${!!opt.mobileDisableReflection} onChange=${(c) => patchOpt({ mobileDisableReflection: c })} />
			<${ToggleRow} label="Disable Mobile Shadows" class=${TOGGLE_ROW} checked=${!!opt.mobileDisableShadows} onChange=${(c) => patchOpt({ mobileDisableShadows: c })} />
		<//>
	</div>`;
}
