// Port of components/PresetsManager/PresetsManager.tsx, backed by the global store.presets
// (wp_wc3d_presets is global and written immediately, like the REST calls).
import { html, useState, useEffect, useRef } from '../../../../core/ui.js';
import { store, useStore } from '../../../../core/store.js';
import { EYEBROW_CLASS, HELP_CLASS, IconButton, INPUT_SM_CLASS, LABEL_CLASS, LINK_CLASS, SURFACE_CLASS } from '../../../../shared/editor-ui.js';
import { PlusIcon, Trash2Icon } from '../../../../shared/icons.js';

const ERROR_CLASS = 'text-[11.5px] font-medium text-[color:var(--wc3d-ui-danger-fg)]';

const DEFAULT_LABEL = {
	material: 'Material Presets',
	camera: 'Camera View Presets',
	environment: 'Lighting Presets',
	animation: 'Animation Presets',
};

// src/shared/api/presets.ts isPresetData(): unknown keys allowed, known keys typed.
const SPEC = {
	material: { type: 'string', baseColor: 'string', metalness: 'number', roughness: 'number', clearcoat: 'number', textures: 'object' },
	camera: { preset_id: 'number', position: 'vec3', target: 'vec3', fov: 'number', lock: 'object' },
	environment: {
		preset: 'string',
		customHdriUrl: 'string',
		customHdriId: 'number',
		intensity: 'number',
		shadowsEnabled: 'boolean',
		shadowIntensity: 'number',
		reflectionIntensity: 'number',
		backgroundType: 'string',
		backgroundColor: 'string',
		backgroundImageUrl: 'string',
		backgroundImageId: 'number',
		backgroundBlur: 'number',
		floorEnabled: 'boolean',
		floorColor: 'string',
		floorTextureUrl: 'string',
		floorTextureId: 'number',
		floorGridEnabled: 'boolean',
		floorReflection: 'boolean',
		floorRoughness: 'number',
		floorMetalness: 'number',
		floorShadowOpacity: 'number',
	},
	animation: { autoplay: 'string', loop: 'boolean', speed: 'number' },
};

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const matches = (kind, v) => {
	if (kind === 'number') return typeof v === 'number' && Number.isFinite(v);
	if (kind === 'vec3') return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
	if (kind === 'object') return isPlainObject(v);
	return typeof v === kind;
};
export function isPresetData(type, data) {
	const spec = SPEC[type];
	if (!spec || !isPlainObject(data)) return false;
	return Object.entries(data).every(([k, v]) => !spec[k] || v === undefined || v === null || matches(spec[k], v));
}

// Drop undefined fields so a saved preset matches the JSON the REST API would store.
const clean = (data) => JSON.parse(JSON.stringify(data));

export function PresetsManager({ type, getData, getCurrentData, onApply, label, class: cls, className }) {
	const all = useStore((s) => s.presets || {});
	const presets = Object.values(all)
		.filter((p) => p && p.type === type)
		.sort((a, b) => a.id - b.id);

	const [isSaving, setIsSaving] = useState(false);
	const [nameInput, setNameInput] = useState('');
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [confirmId, setConfirmId] = useState(null);
	const inputRef = useRef(null);

	useEffect(() => {
		if (isSaving) inputRef.current?.focus();
	}, [isSaving]);

	const read = getData || getCurrentData;
	const wrapClass = cls ?? className ?? 'mt-4 pt-3.5 border-t border-[color:var(--wc3d-ui-rule)]';

	const handleSave = (e) => {
		e.preventDefault();
		setError('');
		const name = nameInput.trim();
		if (!name) return setError('Please enter a name.');
		const data = read?.();
		if (!data) return setError('Nothing to save.');
		const id = store.nextId('presets');
		store.patch(`presets.${id}`, { id, type, name, data: clean(data) });
		setNameInput('');
		setIsSaving(false);
	};

	const handleApply = (preset) => {
		if (!isPresetData(type, preset.data)) {
			setNotice('This preset could not be applied: its data is invalid or from an incompatible version.');
			return;
		}
		setNotice('');
		onApply?.(preset.data);
	};

	const onRowKeyDown = (e, preset) => {
		if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
		e.preventDefault();
		handleApply(preset);
	};

	const remove = (id) => {
		store.set((s) => {
			const next = { ...(s.presets || {}) };
			delete next[id];
			return { ...s, presets: next };
		});
		setConfirmId(null);
	};

	return html`
		<div class=${wrapClass || undefined}>
			<div class="flex items-center justify-between gap-2 mb-2.5">
				<span class=${EYEBROW_CLASS}>${label ?? DEFAULT_LABEL[type]}</span>
				${!isSaving &&
				html`<button type="button" onClick=${() => setIsSaving(true)} class=${LINK_CLASS}>
					<${PlusIcon} size=${12} strokeWidth=${2.5} />Save current
				</button>`}
			</div>

			${isSaving &&
			html`<form onSubmit=${handleSave} class=${`${SURFACE_CLASS} mb-2.5 p-3`}>
				<label for=${`wc3d-preset-name-${type}`} class=${LABEL_CLASS}>Save preset as</label>
				<div class="flex items-center gap-1.5">
					<input
						ref=${inputRef}
						id=${`wc3d-preset-name-${type}`}
						type="text"
						value=${nameInput}
						onInput=${(e) => setNameInput(e.currentTarget.value)}
						placeholder="e.g. Shiny Gold"
						class=${`${INPUT_SM_CLASS} flex-1 min-w-0`}
					/>
					<button type="submit" class="wc3d-btn wc3d-btn-sm wc3d-btn-primary">Save</button>
					<button
						type="button"
						onClick=${() => {
							setIsSaving(false);
							setError('');
						}}
						class="wc3d-btn wc3d-btn-sm wc3d-btn-ghost"
					>
						Cancel
					</button>
				</div>
				${error && html`<div role="alert" class=${`mt-1.5 ${ERROR_CLASS}`}>${error}</div>`}
			</form>`}

			${presets.length === 0
				? html`<div class=${`wc3d-dashed px-3 py-3 text-center ${HELP_CLASS}`}>No custom presets saved yet.</div>`
				: html`<div class="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto wc3d-scroll pe-1">
						${presets.map(
							(preset) => html`
								<div
									key=${preset.id}
									role="button"
									tabIndex=${0}
									onClick=${() => handleApply(preset)}
									onKeyDown=${(e) => onRowKeyDown(e, preset)}
									class="group flex items-center justify-between gap-3 flex-shrink-0 h-9 ps-3 pe-1.5 rounded-[8px] border border-[color:var(--wc3d-ui-border)] bg-[var(--wc3d-ui-card)] hover:border-[color:var(--wc3d-ui-primary)] hover:bg-[var(--wc3d-ui-strip)] cursor-pointer transition-colors duration-150"
								>
									<span class="text-[12.5px] font-medium text-[color:var(--wc3d-ui-title)] truncate">${preset.name}</span>
									<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
										<span class="text-[11.5px] font-semibold text-[color:var(--wc3d-ui-primary)]">Apply</span>
										<${IconButton}
											variant="danger"
											label="Delete Preset"
											icon=${html`<${Trash2Icon} size=${13} />`}
											onClick=${(e) => {
												e.stopPropagation();
												setConfirmId(preset.id);
											}}
										/>
									</div>
								</div>
								${confirmId === preset.id &&
								html`<div key=${'c' + preset.id} role="alertdialog" class=${`${SURFACE_CLASS} flex-shrink-0 p-2.5 space-y-2`}>
									<p class="m-0 text-[12px] text-[color:var(--wc3d-ui-title)]">Are you sure you want to delete this preset?</p>
									<div class="flex justify-end gap-1.5">
										<button type="button" class="wc3d-btn wc3d-btn-sm wc3d-btn-ghost" onClick=${() => setConfirmId(null)}>Cancel</button>
										<button type="button" class="wc3d-btn wc3d-btn-sm wc3d-btn-danger" onClick=${() => remove(preset.id)}>OK</button>
									</div>
								</div>`}
							`,
						)}
					</div>`}
			${notice && html`<div role="alert" class=${`mt-1.5 ${ERROR_CLASS}`}>${notice}</div>`}
		</div>
	`;
}

export default PresetsManager;
