// Port of components/EnvironmentPicker ("Scene & Lighting"): four nested accordions, one open
// at a time, field-level patches into `environment`, lighting presets at the bottom.
import { html, useState } from '../../../../core/ui.js';
import { useStore } from '../../../../core/store.js';
import { editor, useEditor } from '../editor-store.js';
import {
	Accordion,
	ColorField,
	EmptyState,
	FieldRow,
	SliderRow,
	ToggleRow,
	formatMultiplier,
	formatPercent,
	LABEL_CLASS,
	LINK_DANGER_CLASS,
	MONO_TEXT_CLASS,
	SELECT_CLASS,
	SURFACE_CLASS,
	useId,
} from '../../../../shared/editor-ui.js';
import { ArrowUpTrayIcon } from '../../../../shared/icons.js';
import { PresetsManager } from './presets.js';
import { useMediaPicker } from './alt-model.js';
import { PresetDownloadGlyph, PresetDownloadBar, PresetDownloadSummary, PresetDownloadBanner, usePresetDownloads } from './environment-download.js';

export const ENVIRONMENT_PRESETS = ['apartment', 'city', 'dawn', 'forest', 'lobby', 'night', 'park', 'studio', 'sunset', 'warehouse'];

const PRESET_BUTTON = 'h-8 min-w-0 px-2 m-0 rounded-[8px] border border-solid text-[12px] leading-none font-medium cursor-pointer shadow-none transition-colors truncate ';
const PRESET_ACTIVE = 'bg-[var(--wc3d-ui-primary-fill)] border-[color:var(--wc3d-ui-primary-fill)] text-white font-semibold';
const PRESET_IDLE =
	'bg-[var(--wc3d-ui-card)] border-[color:var(--wc3d-ui-border)] text-[color:var(--wc3d-ui-title)] hover:border-[color:var(--wc3d-ui-border-strong)] hover:bg-[var(--wc3d-ui-tile)]';
const TOGGLE_ROW = 'py-1 border-b border-[color:var(--wc3d-ui-rule)]';
const BODY = 'px-4 py-3.5 space-y-4';
const CUSTOM_SPAN = ENVIRONMENT_PRESETS.length % 3 === 1 ? 'col-span-2' : 'col-span-3';

const patchEnv = (patch) => editor.patch('environment', patch);

export default function EnvironmentPanel() {
	const env = useEditor(() => editor.raw()?.environment) || {};
	const [active, setActive] = useState('lighting');
	const bgTypeId = useId();

	const currentPreset = env.preset ?? 'studio';
	const dl = usePresetDownloads();
	const intensity = env.intensity ?? 1.0;
	const shadowsEnabled = env.shadowsEnabled !== false;
	const shadowIntensity = env.shadowIntensity ?? 0.6;
	const backgroundType = env.backgroundType ?? 'transparent';
	const backgroundColor = env.backgroundColor ?? '#ffffff';
	const backgroundBlur = env.backgroundBlur ?? 0.0;
	const floorEnabled = !!env.floorEnabled;
	const floorColor = env.floorColor ?? '#ffffff';
	const floorReflection = !!env.floorReflection;
	const floorGridEnabled = !!env.floorGridEnabled;
	const floorRoughness = env.floorRoughness ?? 1.0;
	const floorMetalness = env.floorMetalness ?? 0.0;

	const section = (sec) => ({
		variant: 'nested',
		open: active === sec,
		onToggle: (next) => setActive(next ? sec : null),
		bodyClassName: BODY,
	});

	const hdriPicker = useMediaPicker({
		title: 'Choose an HDR/EXR environment map',
		button: 'Use this file',
		filter: 'hdri',
		onSelect: (att) => att?.url && patchEnv({ preset: 'custom', customHdriUrl: att.url, customHdriId: att.id }),
	});
	const bgImagePicker = useMediaPicker({
		title: 'Choose a background image',
		button: 'Use this image',
		filter: 'image',
		onSelect: (att) => att?.url && patchEnv({ backgroundImageUrl: att.url, backgroundImageId: att.id }),
	});

	// Blob URLs (prototype uploads) carry no filename, so show the attachment's.
	const hdriAtt = useStore((s) => s.attachments?.[env.customHdriId]);
	const hdriName = hdriAtt?.blobUrl && hdriAtt.blobUrl === env.customHdriUrl ? hdriAtt.filename : (env.customHdriUrl || '').substring((env.customHdriUrl || '').lastIndexOf('/') + 1);

	return html`<div>
		<${Accordion} title="Lighting & Presets" ...${section('lighting')}>
			<div>
				<span class=${LABEL_CLASS}>Environment Preset</span>
				<div class="grid grid-cols-3 gap-1.5">
					${ENVIRONMENT_PRESETS.map((preset) => {
						const isActive = currentPreset === preset;
						return html`<button
							key=${preset}
							type="button"
							aria-pressed=${isActive}
							onClick=${() => {
								patchEnv({ preset });
								dl.on && dl.request(preset);
							}}
							title=${dl.on ? dl.title(preset) : undefined}
							aria-busy=${dl.on && dl.busy(preset) ? 'true' : undefined}
							class=${PRESET_BUTTON + 'capitalize ' + (isActive ? PRESET_ACTIVE + ' ' : PRESET_IDLE) + (dl.on ? ' relative overflow-hidden' : '')}
						>
							${preset}${dl.on && html`<${PresetDownloadGlyph} preset=${preset} /><${PresetDownloadBar} preset=${preset} />`}
						</button>`;
					})}
					<button
						type="button"
						aria-pressed=${currentPreset === 'custom'}
						onClick=${hdriPicker.open}
						class=${PRESET_BUTTON + CUSTOM_SPAN + ' flex items-center justify-center gap-1.5 ' + (currentPreset === 'custom' ? PRESET_ACTIVE : PRESET_IDLE)}
					>
						<${ArrowUpTrayIcon} size=${14} class="flex-shrink-0" />
						${env.customHdriUrl ? 'Custom HDRI Active' : 'Upload Custom HDRI…'}
					</button>
				</div>
				<${PresetDownloadSummary} />
			</div>

			<${PresetDownloadBanner} preset=${currentPreset} />

			${currentPreset === 'custom' &&
			env.customHdriUrl &&
			html`<div class=${`${SURFACE_CLASS} flex items-center justify-between gap-3 px-2.5 py-2`}>
				<span class=${`${MONO_TEXT_CLASS} truncate flex-1`} title=${env.customHdriUrl}>${hdriName}</span>
				<button type="button" onClick=${() => patchEnv({ preset: 'studio', customHdriUrl: undefined, customHdriId: undefined })} class=${LINK_DANGER_CLASS}>Reset</button>
			</div>`}

			<${SliderRow} label="Lighting Intensity" value=${intensity} onChange=${(v) => patchEnv({ intensity: v })} max=${4} step=${0.1} format=${formatMultiplier} />
		<//>

		<${Accordion} title="Shadow Controls" ...${section('shadows')}>
			<${ToggleRow} label="Contact Shadows" class=${TOGGLE_ROW} checked=${shadowsEnabled} onChange=${(c) => patchEnv({ shadowsEnabled: c })} />
			${shadowsEnabled &&
			html`<${SliderRow} label="Shadow Opacity" value=${shadowIntensity} onChange=${(v) => patchEnv({ shadowIntensity: v })} step=${0.05} format=${formatPercent} />`}
		<//>

		<${Accordion} title="Background Settings" ...${section('background')}>
			<div>
				<label for=${bgTypeId} class=${LABEL_CLASS}>Background Style</label>
				<select id=${bgTypeId} value=${backgroundType} onChange=${(e) => patchEnv({ backgroundType: e.currentTarget.value })} class=${SELECT_CLASS}>
					<option value="transparent">Transparent / Neutral Default</option>
					<option value="color">Solid Background Color</option>
					<option value="image">Background Image File</option>
					<option value="preset">Display Environment Map Preset</option>
				</select>
			</div>

			${backgroundType === 'color' &&
			html`<${FieldRow} label="Select Color" class="py-1">
				<${ColorField} label="Background color" value=${backgroundColor} onChange=${(hex) => patchEnv({ backgroundColor: hex })} />
			<//>`}

			${backgroundType === 'image' &&
			html`<div class="space-y-2">
				<${FieldRow} label="Background Image">
					<div class="flex gap-1.5">
						<button type="button" onClick=${bgImagePicker.open} class="wc3d-btn wc3d-btn-sm wc3d-btn-soft">${env.backgroundImageUrl ? 'Replace' : 'Choose…'}</button>
						${env.backgroundImageUrl &&
						html`<button type="button" onClick=${() => patchEnv({ backgroundImageUrl: undefined, backgroundImageId: undefined })} class="wc3d-btn wc3d-btn-sm wc3d-btn-danger">Clear</button>`}
					</div>
				<//>
				${env.backgroundImageUrl
					? html`<img src=${env.backgroundImageUrl} alt="" class="block w-full max-h-[110px] object-cover rounded-lg border border-[color:var(--wc3d-ui-border)]" />`
					: html`<${EmptyState} variant="slot" title="No background image loaded." />`}
			</div>`}

			${(backgroundType === 'preset' || currentPreset === 'custom') &&
			html`<${SliderRow} label="Environment Map Blur" value=${backgroundBlur} onChange=${(v) => patchEnv({ backgroundBlur: v })} step=${0.02} format=${formatPercent} />`}
		<//>

		<${Accordion} title="Floor & Grid Settings" ...${section('floor')}>
			<${ToggleRow} label="Show Grid Helper" class=${TOGGLE_ROW} checked=${floorGridEnabled} onChange=${(c) => patchEnv({ floorGridEnabled: c })} />
			<${ToggleRow} label="Physical Ground Floor" class=${TOGGLE_ROW} checked=${floorEnabled} onChange=${(c) => patchEnv({ floorEnabled: c })} />
			${floorEnabled &&
			html`<div class="space-y-4 pt-1">
				<${FieldRow} label="Floor Color">
					<${ColorField} label="Floor Color" value=${floorColor} onChange=${(hex) => patchEnv({ floorColor: hex })} />
				<//>
				<${ToggleRow} label="Premium Floor Reflections" class=${TOGGLE_ROW} checked=${floorReflection} onChange=${(c) => patchEnv({ floorReflection: c })} />
				<${SliderRow} label="Floor Roughness" value=${floorRoughness} onChange=${(v) => patchEnv({ floorRoughness: v })} step=${0.05} format=${formatPercent} />
				<${SliderRow} label="Floor Metalness" value=${floorMetalness} onChange=${(v) => patchEnv({ floorMetalness: v })} step=${0.05} format=${formatPercent} />
			</div>`}
		<//>

		<div class="px-4 py-3.5 border-t border-[color:var(--wc3d-ui-rule)]">
			<${PresetsManager} class="" type="environment" getData=${() => editor.raw()?.environment ?? {}} onApply=${(data) => data && patchEnv(data)} />
		</div>
		${hdriPicker.modal} ${bgImagePicker.modal}
	</div>`;
}
