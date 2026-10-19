// usdz-export: per-product switch, status per device and a test export in "AR & Quick Look".
import { html, useState } from '../../../../core/ui.js';
import { useStore } from '../../../../core/store.js';
import { useFeature } from '../../../../core/features.js';
import { editor, useEditor } from '../editor-store.js';
import { DIVIDER_CLASS, HELP_CLASS, InfoBanner, LINK_CLASS, READOUT_KEY_CLASS, READOUT_ROW_CLASS, READOUT_VALUE_CLASS, ROW_DIVIDER_CLASS, SURFACE_CLASS, ToggleRow } from '../../../../shared/editor-ui.js';
import { buildArFile, formatBytes, formatSeconds } from '../../../../shared/ar-export.js';

/** Help text for the empty USDZ box while the build is on, else null (shipped text). */
export function useNoUsdzText(ar) {
	const on = useFeature('usdz-export');
	const setting = useStore((s) => !!s.settings?.ar_configured);
	return on && setting && ar?.configured !== false ? 'No USDZ uploaded. iPhone and iPad get one built from the model on the device.' : null;
}

export function ArExportSection({ ar }) {
	const on = useFeature('usdz-export');
	const setting = useStore((s) => !!s.settings?.ar_configured);
	const viewer = useEditor((s) => s.viewer);
	const [test, setTest] = useState(null);
	if (!on) return null;

	const build = setting && ar.configured !== false;
	const hasUsdz = !!ar.usdzUrl;
	const ios = build
		? hasUsdz
			? 'Generated on the device from the configured scene. Uploaded USDZ used when nothing is changed.'
			: 'Generated on the device from the configured scene (no USDZ uploaded).'
		: hasUsdz ? 'Uploaded USDZ' : 'Hidden (no USDZ uploaded)';
	const android = build ? 'Generated GLB, uploaded for Scene Viewer. Uploaded GLB used when nothing is changed.' : 'Uploaded GLB';

	const runTest = async () => {
		setTest({ status: 'running' });
		try {
			const usdz = await buildArFile(viewer, 'usdz');
			const glb = await buildArFile(viewer, 'glb');
			setTest({ status: 'done', usdz, glb });
		} catch (err) {
			setTest({ status: 'error', message: err?.message || 'The export failed.' });
		}
	};

	return html`<div class=${`space-y-2.5 pt-3 ${DIVIDER_CLASS}`}>
		<${ToggleRow}
			label="Show the customer's design in AR"
			description="Off always opens the uploaded files."
			checked=${build}
			disabled=${!setting}
			onChange=${(c) => editor.patch('ar', { configured: c ? undefined : false })}
		/>
		${!setting &&
		html`<p class=${HELP_CLASS}>Turn on "AR shows the customer's configuration" first: <a class=${LINK_CLASS} href="#admin.settings.modules">Settings → Features</a></p>`}
		<div class=${SURFACE_CLASS}>
			${[['iPhone & iPad', ios], ['Android', android]].map(
				([label, text]) => html`<div key=${label} class=${`px-3 py-2 ${ROW_DIVIDER_CLASS}`}>
					<div class="text-[12px] font-semibold text-slate-800 dark:text-slate-100">${label}</div>
					<p class=${`${HELP_CLASS} m-0`}>${text}</p>
				</div>`
			)}
		</div>
		<div class="flex items-center gap-2">
			<button type="button" class="wc3d-btn wc3d-btn-soft wc3d-btn-sm" disabled=${!viewer || test?.status === 'running'} onClick=${runTest}>
				${test?.status === 'running' ? 'Exporting…' : 'Test AR export'}
			</button>
			<span class=${HELP_CLASS}>Exports the scene as shown here.</span>
		</div>
		${test?.status === 'done' &&
		html`<div class=${SURFACE_CLASS}>
				<div class=${READOUT_ROW_CLASS}><span class=${READOUT_KEY_CLASS}>USDZ (iOS)</span><span class=${READOUT_VALUE_CLASS}>${formatBytes(test.usdz.bytes.byteLength)} · ${formatSeconds(test.usdz.ms)}</span></div>
				<div class=${READOUT_ROW_CLASS}><span class=${READOUT_KEY_CLASS}>GLB (Android)</span><span class=${READOUT_VALUE_CLASS}>${formatBytes(test.glb.bytes.byteLength)} · ${formatSeconds(test.glb.ms)}</span></div>
			</div>
			${test.usdz.warnings.length
				? html`<${InfoBanner} tone="warning" compact=${true}>${test.usdz.warnings.join(' ')}<//>`
				: html`<${InfoBanner} tone="success" compact=${true}>Every visible part exports to both formats.<//>`}`}
		${test?.status === 'error' && html`<${InfoBanner} tone="danger" compact=${true}>${test.message}<//>`}
	</div>`;
}
