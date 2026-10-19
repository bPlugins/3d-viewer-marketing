// Port of components/CameraEditor: initial view capture, live readout, gallery viewpoint
// presets with thumbnails, gesture locks, angle/distance limits and camera presets.
import { html, useState, useEffect } from '../../../../core/ui.js';
import { editor, useEditor } from '../editor-store.js';
import {
	DIVIDER_CLASS,
	EYEBROW_CLASS,
	HELP_CLASS,
	INPUT_SM_CLASS,
	IconButton,
	LINK_DANGER_CLASS,
	MONO_TEXT_CLASS,
	READOUT_KEY_CLASS,
	READOUT_ROW_CLASS,
	READOUT_VALUE_CLASS,
	ROW_DIVIDER_CLASS,
	SURFACE_CLASS,
	ToggleRow,
} from '../../../../shared/editor-ui.js';
import { CameraSnapIcon, CursorIcon, EyePreviewIcon, TrashIcon } from '../../../../shared/icons.js';
import { PresetsManager } from './presets.js';
import { CAMERA_NOT_READY } from './hotspots.js';

const ROW_BUTTON_CLASS =
	'flex-1 min-w-0 flex items-center gap-3 text-left bg-transparent border-0 p-0 m-0 [font:inherit] text-inherit cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40';
const SECTION_CLASS = `px-4 py-3.5 ${DIVIDER_CLASS}`;
const SECTION_LABEL_CLASS = `${EYEBROW_CLASS} mb-1`;
const ERROR_CLASS = 'mt-2 text-[11.5px] font-medium text-[color:var(--wc3d-ui-danger-fg)]';
const NO_CANVAS = 'Could not find the 3D preview canvas.';

const fmt = (n) => Math.round(n * 1000) / 1000;
const formatVec = (v) => v.map(fmt).join(', ');

const GALLERY_KEYS = [
	{ key: 'perspective', label: 'Perspective View' },
	{ key: 'front', label: 'Front View' },
	{ key: 'side', label: 'Side View' },
	{ key: 'back', label: 'Back View' },
];

const Row = ({ label, help, children }) => html`<div class=${`flex items-center gap-3 py-2.5 ${ROW_DIVIDER_CLASS}`}>
	<div class="flex-1 min-w-0">
		<span class="block text-[12px] font-semibold text-slate-800 dark:text-slate-100">${label}</span>
		${help && html`<p class=${`${HELP_CLASS} mt-0.5 text-[11.5px]`}>${help}</p>`}
	</div>
	${children}
</div>`;

const NumInput = ({ value, onChange, placeholder, step = 1 }) => html`<input
	type="number"
	step=${step}
	value=${value ?? ''}
	placeholder=${placeholder ?? '—'}
	onInput=${(e) => {
		const raw = e.currentTarget.value;
		if (raw === '') return onChange(undefined);
		const n = Number(raw);
		if (Number.isFinite(n)) onChange(n);
	}}
	class=${`${INPUT_SM_CLASS} w-[76px] flex-shrink-0 tabular-nums`}
	style="width:76px"
/>`;

// Seeded presets carry no thumbnail; render one from the live viewer (display only, never saved).
const thumbCache = new Map();
const thumbKey = (modelKey, p) => `${modelKey}|${p.position}|${p.target}`;

function useFallbackThumbs(viewer, modelKey, gallery) {
	const [, bump] = useState(0);
	useEffect(() => {
		if (!viewer?.screenshot || !viewer?.whenIdle || !gallery) return undefined;
		const missing = Object.values(gallery).filter((p) => p && !p.thumbnail && Array.isArray(p.position) && !thumbCache.has(thumbKey(modelKey, p)));
		if (!missing.length) return undefined;
		let live = true;
		viewer.whenIdle().then(() => {
			if (!live) return;
			const cam = viewer.getCamera();
			try {
				for (const p of missing) {
					viewer.setCamera({ position: p.position, target: p.target }, { animate: false });
					thumbCache.set(thumbKey(modelKey, p), viewer.screenshot({ maxSide: 320, type: 'image/webp', quality: 0.85 }));
				}
			} finally {
				viewer.setCamera({ position: cam.position, target: cam.target }, { animate: false });
			}
			bump((n) => n + 1);
		});
		return () => (live = false);
	}, [viewer, modelKey, gallery]);
	return (p) => p?.thumbnail || (p ? thumbCache.get(thumbKey(modelKey, p)) : '') || '';
}

export default function CameraPanel() {
	const viewer = useEditor((s) => s.viewer);
	const target = useEditor((s) => s.target);
	const raw = useEditor(() => editor.raw()) || {};
	const isVariation = target !== 'default' && target != null;

	const camera = raw.camera ?? undefined;
	const lock = camera?.lock ?? {};
	const hasInitialView = Array.isArray(camera?.position) && Array.isArray(camera?.target);
	const gallery = raw.gallery_presets ?? undefined;
	const modelKey = useEditor((s) => s.modelKey);
	const thumbOf = useFallbackThumbs(viewer, modelKey, gallery);

	const [live, setLive] = useState(null);
	const [error, setError] = useState({});

	const readCam = (where) => {
		const c = viewer?.getCamera?.();
		if (!c?.position || !c?.target) {
			setError({ [where]: CAMERA_NOT_READY });
			return null;
		}
		setError({});
		return c;
	};

	const captureView = () => {
		const c = readCam('initial');
		if (c) editor.patch('camera', { position: c.position.map(fmt), target: c.target.map(fmt) });
	};

	const clearView = () => {
		const next = { ...(camera ?? {}) };
		delete next.position;
		delete next.target;
		Object.keys(next).forEach((k) => next[k] === undefined && delete next[k]);
		if (Object.keys(next).length === 0) editor.patch('camera', null);
		else editor.replace('camera', next);
	};

	const tween = (view) => view && viewer?.setCamera?.({ position: view.position, target: view.target }, { animate: true, duration: 600 });

	const captureGallery = (key) => {
		const c = readCam('gallery');
		if (!c) return;
		let thumbnail = '';
		try {
			thumbnail = viewer.screenshot?.({ maxSide: 320, type: 'image/webp', quality: 0.85 }) || '';
		} catch {
			thumbnail = '';
		}
		if (!thumbnail) return setError({ gallery: NO_CANVAS });
		editor.patchGallery({ [key]: { position: c.position.map(fmt), target: c.target.map(fmt), thumbnail } });
	};

	const previewGallery = (key) => tween(gallery?.[key] || viewer?.getAutoView?.(key));

	const readLive = () => {
		const c = readCam('live');
		if (!c) return;
		setLive({
			position: c.position.map(fmt),
			target: c.target.map(fmt),
			distance: fmt(c.distance ?? 0),
			polar: Math.round(c.polar ?? 0),
			azimuth: Math.round(c.azimuth ?? 0),
		});
	};

	const setLock = (patch) => {
		const next = { ...lock, ...patch };
		Object.keys(next).forEach((k) => next[k] === undefined && delete next[k]);
		editor.patch('camera', { lock: next });
	};

	const err = (where) => error[where] && html`<div role="alert" class=${ERROR_CLASS}>${error[where]}</div>`;

	return html`<div>
		<div class="px-4 py-3.5">
			<div class=${SECTION_LABEL_CLASS}>Initial view</div>
			<p class=${`${HELP_CLASS} mb-3`}>
				${isVariation
					? 'Frame the model in the preview, then save it as the starting camera for this variation.'
					: 'Frame the model in the preview, then save it as the starting camera for the default view.'}
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" onClick=${captureView} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm">
					<${CameraSnapIcon} size=${14} />${hasInitialView ? 'Re-capture view' : 'Capture view'}
				</button>
				${hasInitialView &&
				html`<button type="button" onClick=${() => tween(camera)} class="wc3d-btn wc3d-btn-ghost wc3d-btn-sm"><${EyePreviewIcon} size=${14} />Preview saved</button>`}
			</div>
			${err('initial')}
			${hasInitialView &&
			html`<div class=${`${SURFACE_CLASS} mt-2.5 flex items-center gap-3 px-2.5 py-2`}>
				<p class=${`${MONO_TEXT_CLASS} m-0 flex-1 min-w-0 break-all`}>pos [${formatVec(camera.position)}] · tgt [${formatVec(camera.target)}]</p>
				<button type="button" onClick=${clearView} class=${`${LINK_DANGER_CLASS} ms-auto flex-shrink-0`}>Clear</button>
			</div>`}
		</div>

		<div class=${SECTION_CLASS}>
			<div class=${SECTION_LABEL_CLASS}>Current Viewport Position</div>
			<p class=${`${HELP_CLASS} mb-3`}>Rotate the camera in the preview, then read its current live values below to help set angle limits.</p>
			<button type="button" onClick=${readLive} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm"><${CursorIcon} size=${14} />Get current position</button>
			${err('live')}
			${live &&
			html`<div class=${`${SURFACE_CLASS} mt-3 overflow-hidden text-[11.5px]`}>
				<div class=${READOUT_ROW_CLASS}><span class=${READOUT_KEY_CLASS}>Position:</span><span class=${READOUT_VALUE_CLASS}>[${live.position.join(', ')}]</span></div>
				<div class=${READOUT_ROW_CLASS}><span class=${READOUT_KEY_CLASS}>Target:</span><span class=${READOUT_VALUE_CLASS}>[${live.target.join(', ')}]</span></div>
				<div class=${READOUT_ROW_CLASS}><span class=${READOUT_KEY_CLASS}>Distance:</span><span class=${READOUT_VALUE_CLASS}>${live.distance}</span></div>
				<div class=${READOUT_ROW_CLASS}><span class=${READOUT_KEY_CLASS}>Vertical Angle:</span><span class=${READOUT_VALUE_CLASS}>${live.polar}°</span></div>
				<div class=${READOUT_ROW_CLASS}><span class=${READOUT_KEY_CLASS}>Horizontal Angle:</span><span class=${READOUT_VALUE_CLASS}>${live.azimuth}°</span></div>
			</div>`}
		</div>

		<div class=${SECTION_CLASS}>
			<div class=${SECTION_LABEL_CLASS}>Gallery View Presets</div>
			<p class=${`${HELP_CLASS} mb-3`}>Capture custom viewpoints and thumbnail images for the 4 single product gallery angles.</p>
			<div class="space-y-2">
				${GALLERY_KEYS.map(({ key, label }) => {
					const preset = gallery?.[key];
					const has = !!preset;
					return html`<div
						key=${key}
						onClick=${() => previewGallery(key)}
						class="wc3d-card flex items-center gap-2 p-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer select-none"
						title=${has ? 'Click to preview saved custom view' : 'Click to preview auto-generated view'}
					>
						<button type="button" class=${ROW_BUTTON_CLASS}>
							<span class="relative flex-shrink-0">
								${has && thumbOf(preset)
									? html`<img src=${thumbOf(preset)} alt="" class="block w-12 h-12 rounded-md object-cover border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900" />`
									: has
										? html`<span class="block w-12 h-12 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"></span>`
										: html`<span class="wc3d-dashed w-12 h-12 rounded-md flex flex-col items-center justify-center gap-0.5 text-[9px] font-semibold text-slate-400 dark:text-slate-500 select-none text-center">
												<${CameraSnapIcon} size=${14} /><span>AUTO</span>
											</span>`}
							</span>
							<span class="flex-1 min-w-0">
								<span class="block text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">${label}</span>
								<span class="block mt-1">
									${has
										? html`<span class="wc3d-badge wc3d-badge-success wc3d-badge-dot max-w-full" title=${`pos: [${formatVec(preset.position)}]`}>Custom view saved</span>`
										: html`<span class="block text-[11.5px] text-slate-500 dark:text-slate-400">Auto-generated</span>`}
								</span>
							</span>
						</button>
						<div class="flex items-center gap-0.5 flex-shrink-0">
							<${IconButton}
								variant="ghost"
								label="Capture current 3D view and thumbnail"
								icon=${html`<${CameraSnapIcon} size=${14} />`}
								onClick=${(e) => {
									e.stopPropagation();
									captureGallery(key);
								}}
							/>
							<${IconButton}
								variant="ghost"
								label=${has ? 'Animate camera to saved custom view' : 'Animate camera to auto-generated view'}
								icon=${html`<${EyePreviewIcon} size=${14} />`}
								onClick=${(e) => {
									e.stopPropagation();
									previewGallery(key);
								}}
							/>
							${has &&
							html`<${IconButton}
								variant="danger"
								label="Clear custom preset (use auto-generated)"
								icon=${html`<${TrashIcon} size=${14} />`}
								onClick=${(e) => {
									e.stopPropagation();
									editor.patchGallery({ [key]: null });
								}}
							/>`}
						</div>
					</div>`;
				})}
			</div>
			${err('gallery')}
		</div>

		<div class=${SECTION_CLASS}>
			<div class=${SECTION_LABEL_CLASS}>Allow visitor gestures</div>
			<div>
				<${ToggleRow} class=${`py-2 ${ROW_DIVIDER_CLASS}`} label="Rotate (drag)" checked=${lock.rotate !== false} onChange=${(v) => setLock({ rotate: v ? undefined : false })} />
				<${ToggleRow} class=${`py-2 ${ROW_DIVIDER_CLASS}`} label="Zoom (scroll / pinch)" checked=${lock.zoom !== false} onChange=${(v) => setLock({ zoom: v ? undefined : false })} />
				<${ToggleRow} class=${`py-2 ${ROW_DIVIDER_CLASS}`} label="Pan (right-click drag)" checked=${lock.pan !== false} onChange=${(v) => setLock({ pan: v ? undefined : false })} />
			</div>
		</div>

		<div class=${SECTION_CLASS}>
			<div class=${SECTION_LABEL_CLASS}>Angle limits (degrees)</div>
			<${Row} label="Vertical min" help="0 = above the model, 180 = below it">
				<${NumInput} value=${lock.minPolarAngle} onChange=${(v) => setLock({ minPolarAngle: v })} placeholder="0" />
			<//>
			<${Row} label="Vertical max" help="0 = above the model, 180 = below it">
				<${NumInput} value=${lock.maxPolarAngle} onChange=${(v) => setLock({ maxPolarAngle: v })} placeholder="180" />
			<//>
			<${Row} label="Horizontal min" help="Negative = left of front, positive = right. Leave empty for unlimited.">
				<${NumInput} value=${lock.minAzimuthAngle} onChange=${(v) => setLock({ minAzimuthAngle: v })} placeholder="∞" />
			<//>
			<${Row} label="Horizontal max" help="Negative = left of front, positive = right. Leave empty for unlimited.">
				<${NumInput} value=${lock.maxAzimuthAngle} onChange=${(v) => setLock({ maxAzimuthAngle: v })} placeholder="∞" />
			<//>
		</div>

		<div class=${SECTION_CLASS}>
			<div class=${SECTION_LABEL_CLASS}>Distance limits</div>
			<${Row} label="Min distance" help="Minimum camera distance from the target. Leave empty for default.">
				<${NumInput} value=${lock.minDistance} onChange=${(v) => setLock({ minDistance: v })} placeholder="0" step=${0.1} />
			<//>
			<${Row} label="Max distance" help="Maximum camera distance from the target. Leave empty for default.">
				<${NumInput} value=${lock.maxDistance} onChange=${(v) => setLock({ maxDistance: v })} placeholder="∞" step=${0.1} />
			<//>
		</div>

		<div class="px-4 pb-3.5">
			<${PresetsManager} type="camera" getData=${() => editor.raw()?.camera || null} onApply=${(data) => data && editor.replace('camera', data)} />
		</div>
	</div>`;
}
