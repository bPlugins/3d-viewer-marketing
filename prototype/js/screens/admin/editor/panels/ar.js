// Port of components/ARSettings ("AR & Quick Look"): field-level patches into `ar`.
import { html } from '../../../../core/ui.js';
import { useStore } from '../../../../core/store.js';
import { editor, useEditor } from '../editor-store.js';
import { DIVIDER_CLASS, FieldRow, HELP_CLASS, SURFACE_CLASS, ToggleRow } from '../../../../shared/editor-ui.js';
import { CubeIcon } from '../../../../shared/icons.js';
import { useMediaPicker } from './alt-model.js';
import { ArExportSection, useNoUsdzText } from './ar-export.js';
import { isOn } from '../../../../core/features.js';
import { isExternal, ExternalHost } from '../../../../shared/external-url.js';

const patchAr = (patch) => editor.patch('ar', patch);

export default function ArPanel() {
	const ar = useEditor(() => editor.raw()?.ar) || {};
	const att = useStore((s) => (ar.usdzId ? s.attachments?.[ar.usdzId] : null));

	const enabled = ar.enabled === true;
	const usdzUrl = ar.usdzUrl ?? '';
	// Blob URLs (prototype uploads) carry no filename, so show the attachment's.
	const usdzFilename = usdzUrl ? (att?.blobUrl && att.blobUrl === usdzUrl ? att.filename : usdzUrl.substring(usdzUrl.lastIndexOf('/') + 1)) : '';
	const allowResize = ar.scale !== 'fixed';
	const noUsdzText = useNoUsdzText(ar); // usdz-export

	// No type filter: older USDZ uploads may be stored as application/octet-stream.
	const usdzPicker = useMediaPicker({
		title: 'Choose a USDZ model file',
		button: 'Use this file',
		urlKind: 'usdz', // external-url
		onSelect: (a) => a?.url && patchAr({ usdzId: a.id, usdzUrl: a.url }),
	});

	return html`<div class="p-4 space-y-4">
		<${ToggleRow} label="Enable Augmented Reality" checked=${enabled} onChange=${(c) => patchAr({ enabled: c })} />
		${enabled &&
		html`<div class="space-y-2.5">
			<${FieldRow} label="USDZ File (iOS)">
				<div class="flex items-center gap-2">
					<button type="button" onClick=${usdzPicker.open} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm">${usdzUrl ? 'Replace' : 'Choose…'}</button>
					${usdzUrl &&
					html`<button type="button" onClick=${() => patchAr({ usdzId: undefined, usdzUrl: undefined })} class="wc3d-btn wc3d-btn-danger wc3d-btn-sm">Clear</button>`}
				</div>
			<//>
			${usdzUrl
				? html`<div class=${`${SURFACE_CLASS} flex items-center gap-2.5 p-2`}>
						<span class="wc3d-icon-tile wc3d-icon-tile-brand"><${CubeIcon} size=${15} /></span>
						${isExternal(att) && isOn('external-url')
							? html`<div class="flex-1 min-w-0">
									<span class="block min-w-0 text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate" title=${usdzFilename}>${usdzFilename}</span>
									<${ExternalHost} att=${att} />
								</div>`
							: html`<span class="min-w-0 text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate" title=${usdzFilename}>${usdzFilename}</span>`}
					</div>`
				: html`<div class="wc3d-dashed px-4 py-3.5">
						<p class=${`${HELP_CLASS} text-center`}>
							${noUsdzText || 'No USDZ model provided. Android Scene Viewer uses the GLB, but iOS Quick Look requires a USDZ file — the AR button stays hidden on iOS until one is added.'}
						</p>
					</div>`}
			<${ToggleRow}
				label="Allow resizing in AR"
				description="Off locks the model to its real-world size."
				class=${`pt-3 ${DIVIDER_CLASS}`}
				checked=${allowResize}
				onChange=${(c) => patchAr({ scale: c ? 'auto' : 'fixed' })}
			/>
			<${ArExportSection} ar=${ar} />
		</div>`}
		${usdzPicker.modal}
	</div>`;
}
