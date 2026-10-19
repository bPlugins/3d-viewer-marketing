// Block inspector → Settings tab (3d-viewer-premium Components/Backend/settings.tsx + Tabs/General/*).
// Panel order, labels, options and which controls are Pro (isPremium passed) are copied from there.
import { html, useState, useEffect } from '../../../js/core/ui.js';
import { useStore } from '../../../js/core/store.js';
import { Panel, SubPanel, Toggle, Select, Range, Text, TextArea, Color, BtnGroup, MediaField, Notice, ItemsPanel, CopyText, Label, Ico } from '../editor-controls.js';
import { currentModel, hotspotsOf, fileName, normalizeControls, CONTROLS_DEFAULTS, PINS_DEFAULTS, DIM_DEFAULTS, MOBILE_DEFAULTS, LABELS, formatDim, HOTSPOT_TYPES, typeOf, displayOverride, resolveDisplay, hasDisplayChoice, parseVideoUrl } from '../render.js';
import { toast } from '../../core/bus.js';
import { useIsPro } from '../../core/plan.js';

// src/utils/constant.ts helpText (the ones these panels use).
export const HELP = {
	viewerType: 'Choose between Lite and Advanced viewer modes. Lite is optimized for GLB and GLTF files with strong performance and essential features. Advanced supports almost all 3D file types but offers a more streamlined feature set.',
	modelUrl: 'Specifies the URL of the 3D model file to be displayed in the viewer.',
	modelPoster: 'Shown while the 3D model loads, in either viewer. Also used as the mobile image when Mobile image mode is on.',
	useMultiple: 'Enables multiple models in a single viewer, allowing users to switch between different 3D models.',
	skyboxImage: 'Sets a skybox image that appears as the background and provides environmental lighting for the model.',
	skyboxHeight: 'Controls the vertical height of the skybox environment. Adjust this to better align the background and lighting with your model.',
	useDecoder: 'Selects which decoder to use for loading the model. Choose Draco if your model is compressed, or None for standard models.',
	autoRotate: 'Automatically rotates the 3D model without user interaction. Great for showcasing products.',
	rotationDelay: 'Sets the delay time before automatic rotation starts after the model loads or after user interaction stops.',
	rotationPerSecond: 'Controls how fast the model rotates automatically. Higher values mean faster rotation.',
	autoplay: 'Automatically starts model animation when the viewer loads.',
	zoom: 'Enables zooming in and out of the 3D model using mouse scroll or touch gestures.',
	zoomLevel: 'Sets the default zoom level of the model. Higher values zoom in closer.',
	zoomInOutBtn: 'Displays zoom in and zoom out buttons on the viewer interface.',
	mouseControl: 'Allows users to rotate, pan, and interact with the model using a mouse or touch input.',
	fullscreen: 'Shows a fullscreen button so users can view the model in fullscreen mode.',
	cameraBtn: 'Displays a camera button that lets users capture the current view of the model.',
	downloadBtn: 'Displays a button that lets visitors download the 3D model file.',
	isNavigation: 'Shows navigation controls for switching between multiple models.',
	isPagination: 'Displays pagination dots or thumbnails when multiple models are available.',
	variant: 'Enables model variants if your 3D file supports multiple variations.',
	shadow: 'Adds realistic shadows beneath the model to improve depth and realism.',
	exposure: 'Adjusts the brightness of the model scene. Higher values make the model brighter.',
	tonMapping: "Controls how colors and brightness are mapped for rendering. Use 'neutral' for balanced output, or try other modes for different looks.",
	arEnabled: 'Enables AR (Augmented Reality) so visitors can view the 3D model in their real environment on supported devices.',
	modeliSOSrc: 'Specifies the iOS-specific model file (.usdz) used for viewing the 3D model in AR on Apple devices.',
	arPlacement: "Defines how the model is placed in AR. Choose 'floor' to place the model on the ground or 'wall' to attach it to a vertical surface.",
	arMode: "Selects the AR viewing mode. 'Quick Look' is used for iOS devices, while other modes enable AR on supported Android devices.",
	environmentImage: 'Sets an environment image to improve lighting and reflections on the model.',
	useEnvironmentAsSkybox: 'Uses the environment image as the background skybox instead of a solid color.',
	loadingPercentage: 'Shows the loading percentage while the 3D model is being loaded.',
	progressBar: 'Displays a progress bar during model loading to indicate loading status.',
	lockXAxisRotation: 'Prevents the model from rotating around the Y axis (left and right). Only one lock works at a time: if both are on, only Lock Up-Down Rotation applies.',
	lockYAxisRotation: 'Prevents the model from rotating around the X axis (up and down). Only one lock works at a time: if both are on, only Lock Up-Down Rotation applies.',
	animationSelector: 'Enables animation selector if the model contains animations.',
	hotspotStyle: 'The starting look for every hotspot on this viewer. Any hotspot can override it with its own Display and Pin Icon.',
	hotspotPinIcon: "What this hotspot's pin shows: its name as a label, or one of the badge icons. Defaults to whatever the viewer Style does - an Animation hotspot defaults to Play, which turns into Pause while its clip runs.",
	hotspotDisplay: 'How this hotspot shows its content: always visible, as a tooltip on hover, or in a popup over the page. Defaults to whatever the viewer Style does.',
	baseColorFactor: 'Adjusts the base color intensity of the material. This color blends with the applied texture.',
	metallicFactor: 'Adjusts how metallic the material looks. Higher values create a more metal-like surface.',
	roughnessFactor: 'Adjusts how rough or smooth the surface appears. Lower values make the surface shinier.',
	mobileImageMode: 'On phones, show the poster image instead of loading the 3D model — either until the visitor taps to view in 3D, or permanently. Needs a poster. Saves the model download and rendering on mobile.',
	mobileTapLabel: 'Text on the button visitors tap to load the 3D model. Leave empty for "View in 3D".',
	mobileBreakpoint: 'Screens up to this width count as mobile. Touch-only devices are judged by their shorter edge, so a phone in landscape still counts.',
	mobileReduceMotion: 'Turns off the model animation and Auto Rotate on phones, and for visitors whose device asks for reduced motion. Visitors can still rotate and zoom. Lite viewer only. With Show image only, no model loads on phones, so only the reduced-motion part applies.',
	dimensionsMode: 'Draw width, height and depth lines around the model with real-world measurements. Show them behind a ruler button visitors press, or from the moment the model loads. Lite viewer only.',
	dimensionsUnit: 'Unit the measurements are shown in. Also the unit the real-size fields below expect.',
	realSize: "Type the product's real size if the 3D file was exported at the wrong scale. Fill one axis and the others scale to match. Changes the labels only - it does not resize the model or its size in AR.",
	controlLabels: "Show each control's name next to its icon - as a tooltip on hover and keyboard focus, or as permanent inline text. Screen readers announce the name in every mode.",
	controlText: 'Your own wording for this control. Leave empty to use the translated default, so the label follows the site language.',
	controlCorner: 'Which corner of the viewer this control sits in. Controls sharing a corner stack in their usual order. The fullscreen close button always stays top right.',
	pinSize: 'Diameter of the hotspot badge, in pixels. Text pins are unaffected.',
	resetView: 'Displays a reset view button on the viewer interface.',
};

const ENVIRONMENTS = [
	{ label: 'Neutral', value: '' },
	{ label: 'Legacy', value: 'legacy' },
];
const TONE = [
	{ label: 'Neutral', value: 'neutral' },
	{ label: 'ACES', value: 'aces' },
	{ label: 'agX', value: 'agx' },
];
const AR_PLACEMENT = [
	{ label: 'Floor', value: 'floor' },
	{ label: 'Wall', value: 'wall' },
];
const AR_MODES = [
	{ label: 'WebXR', value: 'webxr' },
	{ label: 'Scene Viewer', value: 'scene-viewer' },
	{ label: 'Quick Look', value: 'quick-look' },
];
const VIEWERS = [
	{ label: 'Lite', value: 'modelViewer', title: 'Support only .glb, .glTF' },
	{ label: 'Advanced', value: 'O3DViewer', title: 'Support .obj, .3ds, .stl, .ply, .gltf, .off, .3dm, .fbx, .dae, .wrl, .3mf, .amf, .ifc, .brep, .step, .iges, .fcstd, and .bim  file types' },
];

const isCustomEnv = (v) => !!v && v !== 'legacy' && v !== 'neutral';
const lightingSummary = (src) => (src?.skyboxImage ? 'Skybox' : !src?.environmentImage ? '' : ENVIRONMENTS.find((o) => o.value === src.environmentImage)?.label || fileName(src.environmentImage));
const realSizeSummary = (r) => {
	const axes = [r?.width, r?.height, r?.depth];
	return axes.some((v) => Number(v) > 0) ? axes.map((v) => (Number(v) > 0 ? String(v) : '–')).join(' × ') : '';
};

/** Lighting.tsx: environment, upload, skybox switch, exposure, tone mapping (single or per-model). */
function Lighting({ value, onChange, media }) {
	const env = value.environmentImage || '';
	const envOptions = ENVIRONMENTS.some((o) => o.value === env) ? ENVIRONMENTS : [...ENVIRONMENTS, { label: fileName(env), value: env }];
	const isPro = useIsPro();
	return html`
		<hr />
		<${Select} pro label="Environment Image" info=${HELP.environmentImage} options=${envOptions} value=${env} onChange=${(v) => onChange('environmentImage', v)} />
		<div class="bInfoControl mt5">
			<button type="button" class="components-button button button-primary bp3d_upload_environment_btn" disabled=${!isPro} onClick=${() => media('image', (url) => onChange('environmentImage', url))}>
				<span class="dashicons dashicons-upload" aria-hidden="true"></span> Upload Environment Image
			</button>
		</div>
		<br />
		${(isCustomEnv(env) || value.useEnvironmentAsSkybox) &&
		html`<${Toggle} pro label="Use Environment as Skybox" info=${HELP.useEnvironmentAsSkybox} checked=${value.useEnvironmentAsSkybox} onChange=${() => onChange('useEnvironmentAsSkybox', !value.useEnvironmentAsSkybox)} />`}
		<${Range} pro className="mt20" label="Exposure" info=${HELP.exposure} value=${value.exposure ?? 1} min=${0.1} max=${10} step=${0.1} onChange=${(v) => onChange('exposure', v)} />
		<${Select} pro label="Tone Mapping" info=${HELP.tonMapping} options=${TONE} value=${value.toneMapping || 'neutral'} onChange=${(v) => onChange('toneMapping', v)} />
	`;
}

function RealSizeFields({ unit, value, measured, onChange }) {
	const axes = [['width', 'Width', 'x'], ['height', 'Height', 'y'], ['depth', 'Depth', 'z']];
	const set = (k, raw) => {
		const next = { ...(value || {}) };
		const n = parseFloat(raw);
		if (Number.isFinite(n) && n > 0) next[k] = n;
		else delete next[k];
		onChange(next);
	};
	return html`<p class="components-base-control__help">Real size (optional)</p>
		${axes.map(([k, l, ax]) => html`<${Text} key=${k} pro type="number" className="mt10" label=${`${l} (${unit})`} info=${HELP.realSize} value=${value?.[k] ?? ''} placeholder=${measured ? formatDim(measured[ax], unit) : ''} onChange=${(v) => set(k, v)} />`)}`;
}

// ── Model (ModelForm.tsx) ──────────────────────────────────────────────────

function ModelPanel({ a, set, setModel, ctx }) {
	const { pro } = ctx;
	const multiple = !!a.multiple && pro;
	const model = currentModel(a, 0, false);
	const models = a.models?.length ? a.models : [{ modelUrl: '', poster: '', hotspots: [] }];
	const setModels = (next) => set({ models: next });
	const updateItem = (i, patch) => setModels(models.map((m, k) => (k === i ? { ...m, ...patch } : m)));
	const dims = { ...DIM_DEFAULTS, ...(a.dimensions || {}) };
	const state = multiple ? `${a.models.length} ${a.models.length === 1 ? 'model' : 'models'}` : fileName(model.modelUrl);

	const itemSettings = (m, i) => html`
		<${SubPanel} title="Model" state=${fileName(m.modelUrl)} initialOpen=${true}>
			<${MediaField} label="Model URL" placeholder="Model URL" value=${m.modelUrl} onChange=${(modelUrl) => updateItem(i, { modelUrl, initialView: null })} onBrowse=${(cb) => ctx.media('model', cb)} />
			<${MediaField} label="Model Poster" placeholder="Model Poster" value=${m.poster} onChange=${(poster) => updateItem(i, { poster })} onBrowse=${(cb) => ctx.media('image', cb)} />
			<div class="components-panel__row ld-be-row">
				<label>Use Decoder</label>
				<${Select} options=${[{ label: 'None', value: 'none' }, { label: 'Draco', value: 'draco' }]} value=${m.decoder || 'none'} onChange=${(decoder) => updateItem(i, { decoder })} />
			</div>
		<//>
		<${SubPanel} title="Lighting & environment" state=${lightingSummary(m)}>
			${!m.useEnvironmentAsSkybox && html`<${MediaField} pro label="HDR skybox image" placeholder="HDR skybox image" value=${m.skyboxImage} onChange=${(v) => updateItem(i, { skyboxImage: v })} onBrowse=${(cb) => ctx.media('image', cb)} />`}
			${(m.skyboxImage || m.useEnvironmentAsSkybox) && html`<${Text} pro label="Skybox Height" placeholder="Skybox Height" value=${m.skyboxHeight} onChange=${(v) => updateItem(i, { skyboxHeight: v })} />`}
			<${Lighting} value=${m} media=${ctx.media} onChange=${(k, v) => updateItem(i, { [k]: v })} />
		<//>
		<${SubPanel} title="AR" state=${m.arEnabled ? 'On' : ''}>
			<${Toggle} pro label="Enable AR" checked=${m.arEnabled} onChange=${() => updateItem(i, { arEnabled: !m.arEnabled })} />
			${m.arEnabled &&
			html`<${MediaField} label="3D Model (iOS)" placeholder="3D Model (iOS)" value=${m.modelISOSrc} onChange=${(v) => updateItem(i, { modelISOSrc: v })} onBrowse=${(cb) => ctx.media('model', cb)} />
				<${Select} label="AR Placement" options=${AR_PLACEMENT} value=${m.arPlacement || 'floor'} onChange=${(v) => updateItem(i, { arPlacement: v })} />
				<${Select} label="AR Mode" options=${AR_MODES} value=${m.arMode || 'quick-look'} onChange=${(v) => updateItem(i, { arMode: v })} />`}
		<//>
		${dims.mode !== 'off' &&
		html`<${SubPanel} title="Dimensions" state=${realSizeSummary(m.realSize)}>
			<${RealSizeFields} unit=${dims.unit} value=${m.realSize} measured=${i === ctx.index ? ctx.info.size : null} onChange=${(realSize) => updateItem(i, { realSize })} />
		<//>`}
		<button type="button" class="components-button is-primary mt10 btn-fullwidth" onClick=${() => ctx.showHotspots()}>Add/Edit Hotspots</button>
	`;

	return html`<${Panel} id="model" icon="model" title="Model" state=${state} open=${ctx.open.model} onToggle=${(v) => ctx.toggle('model', v)}>
		<${BtnGroup} label="3D Viewer" info=${HELP.viewerType} value=${a.currentViewer || 'modelViewer'} options=${a.placement === 'visual-editor' ? VIEWERS.slice(0, 1) : VIEWERS} onChange=${(v) => v !== 'modelViewer' && toast('The Advanced viewer (Online 3D Viewer) is not part of this demo. Lite is shown.')} />
		${a.placement !== 'visual-editor' &&
		html`<div class="components-panel__row">
			<${Toggle} pro label="Use Multiple Model?" info=${HELP.useMultiple} checked=${a.multiple} onChange=${() => {
				const on = !a.multiple;
				// The first slide starts as the current single model, so switching on keeps what was there.
				set(on && !a.models?.[0]?.modelUrl ? { multiple: on, models: [{ ...model, hotspots: model.hotspots || [] }, ...(a.models || []).slice(1)] } : { multiple: on });
				ctx.setIndex(0);
			}} />
		</div>`}
		${multiple
			? html`<${ItemsPanel}
					items=${models}
					itemLabel="Model"
					active=${ctx.index}
					setActive=${(i) => i >= 0 && ctx.setIndex(i)}
					onChange=${setModels}
					newItem=${{ modelUrl: '', poster: '', useDecoder: 'none', hotspots: [] }}
					render=${itemSettings}
				/>`
			: html`
				<${MediaField} label="Model URL" info=${HELP.modelUrl} placeholder="Model URL" value=${model.modelUrl} onChange=${(modelUrl) => setModel({ modelUrl, initialView: null })} onBrowse=${(cb) => ctx.media('model', cb)} />
				<${MediaField} label="Model Poster" info=${HELP.modelPoster} placeholder="Model Poster" value=${model.poster} onChange=${(poster) => setModel({ poster })} onBrowse=${(cb) => ctx.media('image', cb)} />
				<${Select} label="Use Decoder" info=${HELP.useDecoder} options=${[{ label: 'None', value: 'none' }, { label: 'Draco', value: 'Draco' }]} value=${model.decoder || 'none'} onChange=${(decoder) => setModel({ decoder })} />
				${model.decoder === 'Draco' && html`<${MediaField} label="Bin File" placeholder="Bin File" value=${model.binFile} onChange=${(binFile) => setModel({ binFile })} onBrowse=${(cb) => ctx.media('any', cb)} />`}
				${pro && html`<button type="button" class="components-button is-primary mt10 btn-fullwidth" onClick=${() => ctx.showHotspots()}>Add/Edit Hotspots</button>`}
			`}
	<//>`;
}

// ── Lighting & Environment, AR (single model) ─────────────────────────────

function LightingPanel({ a, set, setModel, ctx }) {
	const model = currentModel(a, 0, false);
	return html`<${Panel} id="lighting" icon="lighting" title="Lighting & Environment" state=${lightingSummary({ skyboxImage: model.skyboxImage, environmentImage: a.environmentImage })} open=${ctx.open.lighting} onToggle=${(v) => ctx.toggle('lighting', v)}>
		${!a.useEnvironmentAsSkybox && html`<${MediaField} pro label="HDR skybox image" info=${HELP.skyboxImage} placeholder="HDR Image src" value=${model.skyboxImage} onChange=${(skyboxImage) => setModel({ skyboxImage })} onBrowse=${(cb) => ctx.media('image', cb)} />`}
		${(model.skyboxImage || a.useEnvironmentAsSkybox) && html`<${Text} pro label="Skybox Height" info=${HELP.skyboxHeight} placeholder="Skybox Height" value=${model.skyboxHeight} onChange=${(skyboxHeight) => setModel({ skyboxHeight })} />`}
		<${Lighting} value=${a} media=${ctx.media} onChange=${(k, v) => set({ [k]: v })} />
	<//>`;
}

function ARPanel({ a, setModel, ctx }) {
	const model = currentModel(a, 0, false);
	return html`<${Panel} id="ar" icon="ar" title="AR" state=${model.arEnabled ? 'On' : ''} open=${ctx.open.ar} onToggle=${(v) => ctx.toggle('ar', v)}>
		<${Toggle} label="Enable AR" info=${HELP.arEnabled} checked=${model.arEnabled} onChange=${() => setModel({ arEnabled: !model.arEnabled })} />
		${model.arEnabled &&
		html`<${MediaField} label="3D Model (iOS)" info=${HELP.modeliSOSrc} placeholder="3D Model for iOS (Optional)" value=${model.modelISOSrc} onChange=${(modelISOSrc) => setModel({ modelISOSrc })} onBrowse=${(cb) => ctx.media('model', cb)} />
			<${Select} label="AR Placement" info=${HELP.arPlacement} options=${AR_PLACEMENT} value=${model.arPlacement || 'floor'} onChange=${(arPlacement) => setModel({ arPlacement })} />
			<${Select} label="AR Mode" info=${HELP.arMode} options=${AR_MODES} value=${model.arMode || 'quick-look'} onChange=${(arMode) => setModel({ arMode })} />`}
	<//>`;
}

// ── Texture (Experimental) — Pro, single model ────────────────────────────

const toHex = (f) => '#' + (f || [1, 1, 1]).slice(0, 3).map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('');
const toFactor = (hex, a = 1) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).concat(a);

function TexturePanel({ a, set, ctx }) {
	const mats = ctx.info.materials || [];
	const [cur, setCur] = useState('');
	const name = mats.some((m) => m.name === cur) ? cur : mats[0]?.name || '';
	const mat = mats.find((m) => m.name === name);
	const applied = a.appliedTextures || {};
	const own = applied[name] || {};
	const update = (channel, value) => set({ appliedTextures: { ...applied, modelUrl: currentModel(a, 0, false).modelUrl, [name]: { ...own, [channel]: value } } });
	const base = own.baseColor?.factor || mat?.base;
	const mr = own.metallicRoughness?.factor || [mat?.metal ?? 1, mat?.rough ?? 1];
	return html`<${Panel} id="texture" icon="texture" title="Texture (Experimental)" open=${ctx.open.texture} onToggle=${(v) => ctx.toggle('texture', v)}>
		${!mats.length
			? html`<p>No material found</p>`
			: html`
				<${Select} label="Selected Material" options=${mats.map((m) => ({ label: m.name || '(unnamed)', value: m.name }))} value=${name} onChange=${setCur} />
				<${SubPanel} title="Base Color" boxed initialOpen=${true}>
					<div class="bp3d_factor_reset_btn">
						<${Color} pro label="Factor" info=${HELP.baseColorFactor} value=${toHex(base)} defaultColor=${toHex(mat?.base)} onChange=${(hex) => update('baseColor', { factor: toFactor(hex, base?.[3] ?? 1) })} />
					</div>
				<//>
				<${SubPanel} title="Metallic Roughness" boxed>
					<${Range} pro label="Metallic factor" info=${HELP.metallicFactor} value=${Number(mr[0].toFixed(2))} min=${0} max=${1} step=${0.01} onChange=${(v) => update('metallicRoughness', { factor: [v, mr[1]] })} />
					<${Range} pro label="Roughness factor" info=${HELP.roughnessFactor} value=${Number(mr[1].toFixed(2))} min=${0} max=${1} step=${0.01} onChange=${(v) => update('metallicRoughness', { factor: [mr[0], v] })} />
				<//>
			`}
	<//>`;
}

// ── Options ────────────────────────────────────────────────────────────────

function OptionsPanel({ a, set, ctx }) {
	const { pro } = ctx;
	const animations = ctx.info.animations || [];
	return html`<${Panel} id="options" icon="options" title="Options" open=${ctx.open.options} onToggle=${(v) => ctx.toggle('options', v)}>
		<${Toggle} label="Fullscreen" info=${HELP.fullscreen} checked=${a.fullscreen} onChange=${() => set({ fullscreen: !a.fullscreen })} />
		<${Toggle} label="Mouse Control" info=${HELP.mouseControl} checked=${a.mouseControl} onChange=${() => set({ mouseControl: !a.mouseControl })} />
		<${Toggle} className="mt5" label="Show Loading Percentage" info=${HELP.loadingPercentage} checked=${a.loadingPercentage} onChange=${() => set({ loadingPercentage: !a.loadingPercentage })} />
		<${Toggle} className="mt5" label="Show Progressbar" info=${HELP.progressBar} checked=${a.progressBar} onChange=${() => set({ progressBar: !a.progressBar })} />
		<${Toggle} className="mt10" label="Camera/Capture Button" info=${HELP.cameraBtn} checked=${a.cameraBtn} onChange=${() => set({ cameraBtn: !a.cameraBtn })} />
		<${Toggle} className="mt10" label="Download Button" info=${HELP.downloadBtn} checked=${a.downloadBtn} onChange=${() => set({ downloadBtn: !a.downloadBtn })} />
		<${Toggle} className="mt10" label="Show Reset View Button" info=${HELP.resetView} checked=${a.resetViewBtn} onChange=${() => set({ resetViewBtn: !a.resetViewBtn })} />
		${a.mouseControl && a.zoom && html`<${Toggle} className="mt10" label="Zoom In/Out Button" info=${HELP.zoomInOutBtn} checked=${a.zoomInOutBtn} onChange=${() => set({ zoomInOutBtn: !a.zoomInOutBtn })} />`}
		<${Toggle} pro label="Enable Shadow" info=${HELP.shadow} checked=${a.shadow} onChange=${() => set({ shadow: !a.shadow })} />
		<${Toggle} pro label="Autoplay ( if animated )" info=${HELP.autoplay} checked=${a.autoplay} onChange=${() => set({ autoplay: !a.autoplay })} />
		<${Toggle} pro label="Enable Variant Selector" info=${HELP.variant} checked=${a.variant} onChange=${() => set({ variant: !a.variant })} />
		<${Toggle} pro label="Enable Animation Selector" info=${HELP.animationSelector} checked=${a.animation} onChange=${() => set({ animation: !a.animation })} />
		${a.animation &&
		animations.length > 0 &&
		!a.multiple &&
		html`<div class="components-panel__row ld-be-row">
			<label>Default Animation</label>
			<${Select} options=${[...animations.map((x) => ({ label: x, value: x })), { label: 'None', value: '' }]} value=${a.selectedAnimation || ''} onChange=${(selectedAnimation) => set({ selectedAnimation })} />
		</div>`}
		${a.animation && !a.autoplay && html`<${Notice} className="m5t10" status="warning">Autoplay is off, so no animation plays when the page loads. Visitors start one from the Animations menu. Turn on Autoplay to play it on load.<//>`}
		<${Toggle} pro disabled=${a.lockYAxisRotation} label="Lock Left-Right Rotation" info=${HELP.lockXAxisRotation} checked=${a.lockXAxisRotation} onChange=${() => set({ lockXAxisRotation: !a.lockXAxisRotation })} />
		<${Toggle} pro disabled=${a.lockXAxisRotation} label="Lock Up-Down Rotation" info=${HELP.lockYAxisRotation} checked=${a.lockYAxisRotation} onChange=${() => set({ lockYAxisRotation: !a.lockYAxisRotation })} />
		${a.lockXAxisRotation && a.lockYAxisRotation && html`<${Notice} className="m5t10" status="warning">Up-Down and Left-Right rotation can't both be locked. Only Lock Up-Down Rotation applies, so turn one of them off.<//>`}
		<${Toggle} pro label="Auto Rotate" info=${HELP.autoRotate} checked=${a.autoRotate} onChange=${() => set({ autoRotate: !a.autoRotate })} />
		<${Notice} className="m5t10" status="warning">Turn off Auto Rotate while you set the initial view. Otherwise the model keeps turning and the angle is hard to pick.<//>
		${a.autoRotate &&
		html`<${Text} type="number" label="Rotation Delay (ms)" info=${HELP.rotationDelay} value=${a.rotateDelay} onChange=${(v) => set({ rotateDelay: v === '' ? '' : Number(v) })} />
			<${Text} type="number" label="Rotate Per Second (deg)" info=${HELP.rotationPerSecond} value=${a.rotationPerSecond} onChange=${(v) => set({ rotationPerSecond: v === '' ? '' : Number(v) })} />`}
		<${Toggle} pro className="mt10" label="Enable Zoom" info=${HELP.zoom} checked=${a.zoom} onChange=${() => set({ zoom: !a.zoom })} />
		<${Range} pro className="mt10" label="Initial Zoom" info=${HELP.zoomLevel} value=${a.zoomLevel ?? 1} min=${0.5} max=${10} step=${0.1} onChange=${(zoomLevel) => set({ zoomLevel })} />
		<${Select} side className="m5t10" label="Lazy Load" value=${a.lazyLoad === 'lazyload' ? 'lazy' : a.lazyLoad || 'auto'} options=${[{ label: 'Auto', value: 'auto' }, { label: 'Lazy', value: 'lazy' }, { label: 'Eager', value: 'eager' }]} onChange=${(lazyLoad) => set({ lazyLoad })} />
		${(a.multiple || !pro) &&
		html`<${Toggle} pro label="Show Thumbnail List" info=${HELP.isPagination} checked=${a.isPagination} onChange=${() => set({ isPagination: !a.isPagination })} />
			<${Toggle} pro label="Show Arrows" info=${HELP.isNavigation} checked=${a.isNavigation} onChange=${() => set({ isNavigation: !a.isNavigation })} />`}
	<//>`;
}

// ── Mobile ─────────────────────────────────────────────────────────────────

function MobilePanel({ a, set, ctx }) {
	const mobile = { ...MOBILE_DEFAULTS, ...(a.mobile || {}) };
	const setMobile = (patch) => set({ mobile: { ...mobile, ...patch } });
	const poster = currentModel(a, ctx.index, ctx.pro).poster;
	return html`<${Panel} id="mobile" icon="mobile" title="Mobile" open=${ctx.open.mobile} onToggle=${(v) => ctx.toggle('mobile', v)}>
		<${Select} pro label="On mobile devices" info=${HELP.mobileImageMode} value=${mobile.imageMode} options=${[{ label: 'Load the 3D model (default)', value: 'off' }, { label: 'Show image — tap to load 3D', value: 'tap' }, { label: 'Show image only', value: 'static' }]} onChange=${(imageMode) => setMobile({ imageMode })} />
		${mobile.imageMode !== 'off' && !poster && html`<${Notice} className="m5t10" status="warning">Mobile image mode needs a poster. Add a Model Poster above, or the 3D model will load on mobile as usual.<//>`}
		${mobile.imageMode === 'tap' && html`<${Text} pro className="mt10" label="Tap button text" info=${HELP.mobileTapLabel} value=${mobile.tapLabel} placeholder="View in 3D" onChange=${(tapLabel) => setMobile({ tapLabel })} />`}
		${mobile.imageMode !== 'off' && html`<${Text} pro type="number" className="mt10" label="Mobile breakpoint (px)" info=${HELP.mobileBreakpoint} value=${mobile.breakpoint} onChange=${(v) => setMobile({ breakpoint: parseInt(v, 10) || 768 })} />`}
		<${Toggle} pro className="mt10" label="Reduce motion on mobile" info=${HELP.mobileReduceMotion} checked=${!!mobile.reduceMotion} onChange=${() => setMobile({ reduceMotion: !mobile.reduceMotion })} />
	<//>`;
}

// ── Controls ───────────────────────────────────────────────────────────────

const CONTROL_META = {
	zoom: { title: 'Zoom in / out', text: [['zoomIn', 'Zoom in'], ['zoomOut', 'Zoom out']] },
	fullscreen: { title: 'Fullscreen', text: [['fullscreen', 'Fullscreen']] },
	camera: { title: 'Capture image', text: [['camera', 'Capture image']] },
	download: { title: 'Download model', text: [['download', 'Download model']] },
	reset: { title: 'Reset view', text: [['reset', 'Reset view']] },
	dimensions: { title: 'Dimensions', text: [['dimensions', 'Dimensions']] },
	ar: { title: 'View in AR', text: [['ar', 'View in AR']] },
};
const CORNERS = [
	{ label: 'Top left', value: 'top-left' },
	{ label: 'Top right', value: 'top-right' },
	{ label: 'Bottom left', value: 'bottom-left' },
	{ label: 'Bottom right', value: 'bottom-right' },
];

function ControlsPanel({ a, set, ctx }) {
	const controls = normalizeControls(a.controls);
	const setControls = (patch) => set({ controls: { ...CONTROLS_DEFAULTS, ...controls, ...patch } });
	const m = currentModel(a, ctx.index, ctx.pro);
	const dims = { ...DIM_DEFAULTS, ...(a.dimensions || {}) };
	const enabled = {
		zoom: !!a.zoomInOutBtn && a.mouseControl && a.zoom,
		fullscreen: !!a.fullscreen,
		camera: !!a.cameraBtn,
		download: !!a.downloadBtn,
		reset: !!a.resetViewBtn,
		dimensions: dims.mode !== 'off',
		ar: !!m.arEnabled,
	};
	const visible = Object.keys(CONTROL_META).filter((k) => enabled[k]);
	const fields = visible.flatMap((k) => CONTROL_META[k].text);
	const custom = fields.filter(([k]) => (controls.text[k] || '').trim()).length;
	const placeholder = (k) => LABELS[k === 'fullscreen' ? 'fullscreenOpen' : k === 'dimensions' ? 'dimensionsShow' : k];
	return html`<${Panel} id="controls" icon="controls" title="Controls" open=${ctx.open.controls} onToggle=${(v) => ctx.toggle('controls', v)}>
		<${Select} pro label="Control labels" info=${HELP.controlLabels} value=${controls.labels} options=${[{ label: 'Off (default)', value: 'off' }, { label: 'Tooltip on hover/focus', value: 'tooltip' }, { label: 'Inline text', value: 'inline' }]} onChange=${(labels) => setControls({ labels })} />
		${visible.length === 0 && html`<p class="mt10 components-base-control__help">Turn a control on above to position it or label it.</p>`}
		${visible.map((k) => html`<${Select} key=${k} pro className="mt10" label=${CONTROL_META[k].title} info=${HELP.controlCorner} value=${controls.corner[k]} options=${CORNERS} onChange=${(corner) => setControls({ corner: { ...controls.corner, [k]: corner } })} />`)}
		${controls.labels !== 'off' &&
		html`<${SubPanel} boxed title="Label text" state=${custom > 0 ? `${custom} custom` : 'Default'}>
			${fields.map(([k, title]) => html`<${Text} key=${k} pro className="mt10" label=${title} info=${HELP.controlText} value=${controls.text[k] || ''} placeholder=${placeholder(k)} onChange=${(v) => setControls({ text: { ...controls.text, [k]: v } })} />`)}
		<//>`}
	<//>`;
}

// ── Dimensions ─────────────────────────────────────────────────────────────

function DimensionsPanel({ a, set, setModel, ctx }) {
	const dims = { ...DIM_DEFAULTS, ...(a.dimensions || {}) };
	const setDims = (patch) => set({ dimensions: { ...dims, ...patch } });
	const size = ctx.info.size;
	const multiple = !!a.multiple;
	const model = currentModel(a, 0, false);
	return html`<${Panel} id="dimensions" icon="ruler" title="Dimensions" open=${ctx.open.dimensions} onToggle=${(v) => ctx.toggle('dimensions', v)}>
		<${Select} pro label="Show dimensions" info=${HELP.dimensionsMode} value=${dims.mode} options=${[{ label: 'Off', value: 'off' }, { label: 'With a ruler button', value: 'button' }, { label: 'Always on', value: 'always' }]} onChange=${(mode) => setDims({ mode })} />
		${dims.mode !== 'off' &&
		html`<${Select} pro className="mt10" label="Unit" info=${HELP.dimensionsUnit} value=${dims.unit} options=${[{ label: 'Millimetres (mm)', value: 'mm' }, { label: 'Centimetres (cm)', value: 'cm' }, { label: 'Metres (m)', value: 'm' }, { label: 'Inches (in)', value: 'in' }, { label: 'Feet (ft)', value: 'ft' }]} onChange=${(unit) => setDims({ unit })} />
			<${Color} label="Line colour" value=${dims.color} defaultColor="" onChange=${(color) => setDims({ color })} />
			<p class="components-base-control__help">${size ? `Measured from the file: ${formatDim(size.x, dims.unit)} × ${formatDim(size.y, dims.unit)} × ${formatDim(size.z, dims.unit)} ${dims.unit}` : 'Measured size appears once the model has loaded in the preview.'}</p>
			${!multiple && html`<${RealSizeFields} unit=${dims.unit} value=${model.realSize} measured=${size} onChange=${(realSize) => setModel({ realSize })} />`}`}
	<//>`;
}

// ── Hotspots/Annotations ───────────────────────────────────────────────────

const TYPES = [
	{ label: 'Info', value: 'info' },
	{ label: 'Link', value: 'link' },
	{ label: 'Image', value: 'image' },
	{ label: 'Waypoint', value: 'waypoint' },
	{ label: 'Animation', value: 'animation' },
	{ label: 'Video', value: 'video' },
	{ label: 'Product', value: 'product' },
];
// Merged on a type change, missing keys only (registry.ts `defaults`).
const TYPE_DEFAULTS = {
	info: { title: '', desc: '' },
	link: { linkUrl: '', linkText: '', openInNewTab: false },
	image: { imageUrl: '', imageAlt: '' },
	waypoint: {},
	animation: { animationName: '', animationRepeat: 'once' },
	video: { videoUrl: '' },
	product: { productId: 0 },
};
const PIN_ICONS = [
	{ label: 'Use viewer setting', value: '' },
	{ label: 'Text (name)', value: 'text' },
	{ label: 'Info', value: 'info' },
	{ label: 'Plus', value: 'plus' },
	{ label: 'Dot', value: 'dot' },
	{ label: 'Number', value: 'number' },
	{ label: 'Link', value: 'link' },
	{ label: 'Play', value: 'play' },
	{ label: 'Cart', value: 'cart' },
	{ label: 'Question', value: 'question' },
	{ label: 'Custom image', value: 'custom' },
];

/** ComboboxControl over the demo store's published products (the plugin searches /bp3d/v1/products). */
function ProductCombo({ value, onChange }) {
	const products = useStore((s) => s.products || {});
	const list = Object.values(products).filter((p) => (p.status || 'publish') === 'publish');
	const current = products[value];
	const [q, setQ] = useState('');
	const [open, setOpen] = useState(false);
	const id = 'ld-pc-' + useState(() => Math.random().toString(36).slice(2, 8))[0];
	const found = list.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 20);
	return html`<div class="components-base-control ld-be-field mt10 ld-be-combo">
		<label class="components-base-control__label" for=${id}>Product</label>
		<div class="components-input-control__container">
			<input id=${id} type="text" class="components-text-control__input" role="combobox" aria-expanded=${open} aria-autocomplete="list" value=${open ? q : current?.name || ''} onFocus=${() => (setQ(''), setOpen(true))} onBlur=${() => setTimeout(() => setOpen(false), 150)} onInput=${(e) => setQ(e.currentTarget.value)} />
			${value ? html`<button type="button" class="ld-be-iconbtn ld-be-combo__reset" aria-label="Reset" onClick=${() => onChange(0)}><${Ico} name="close" size=${18} /></button>` : ''}
		</div>
		${open &&
		html`<ul class="ld-be-combo__list" role="listbox">
			${found.length ? found.map((p) => html`<li key=${p.id} role="option" aria-selected=${p.id === Number(value)} onMouseDown=${(e) => (e.preventDefault(), onChange(p.id), setOpen(false))}>${p.name}</li>`) : html`<li class="is-empty">No items found</li>`}
		</ul>`}
	</div>`;
}

function HotspotSettings({ h, update, style, ctx, ve = false }) {
	const [manual, setManual] = useState(false);
	const type = typeOf(h);
	const display = resolveDisplay(h, style);
	// Hotspots.tsx ItemSettings: is there a card to write into?
	const showText = display !== 'none' && (displayOverride(h) ? hasDisplayChoice(type) : HOTSPOT_TYPES[type].annotation(style));
	const animations = ctx.info.animations || [];
	const changeType = (next) => update({ ...Object.fromEntries(Object.entries(TYPE_DEFAULTS[next] || {}).filter(([k]) => h[k] === undefined)), type: next });
	const simpleTag = (what) => display === 'none' && html`<${Notice} status="info" className="mt10">Simple Tag shows the label only. Set Display above, or pick a card style, to show the ${what}.<//>`;
	return html`
		<${Text} label=${html`<${Label} info="Shown on the pin, and as the card's heading when the pin is a badge icon.">Name<//>`} value=${h.title ?? h.name ?? 'Title'} onChange=${(title) => update({ title })} />
		${!ve &&
		html`<${Select} className="mt10" label=${html`<${Label} info="What this hotspot does when clicked, and which fields it offers.">Type<//>`} value=${type} options=${TYPES} onChange=${changeType} />
		${hasDisplayChoice(type) &&
		html`<${Select} className="mt10" label=${html`<${Label} info=${HELP.hotspotDisplay}>Display<//>`} value=${h.display || ''} options=${[{ label: 'Use viewer setting', value: '' }, { label: 'Always visible', value: 'always' }, { label: 'Tooltip on hover', value: 'hover' }, ...(HOTSPOT_TYPES[type].canPopup ? [{ label: 'Popup', value: 'popup' }] : []), { label: 'Pin only (no content)', value: 'none' }]} onChange=${(d) => update({ display: d })} />`}
		<${Select} className="mt10" label=${html`<${Label} info=${HELP.hotspotPinIcon}>Pin Icon<//>`} value=${h.pinIcon || ''} options=${PIN_ICONS} onChange=${(pinIcon) => update({ pinIcon })} />
		${h.pinIcon === 'custom' && html`<${MediaField} className="mt10" label="Pin Image" placeholder="Image URL" value=${h.customIcon} onChange=${(customIcon) => update({ customIcon })} onBrowse=${(cb) => ctx.media('image', cb)} />`}
		${showText && html`<${TextArea} className="mt10" rows=${3} label=${html`<${Label} info="The text inside the card. Hidden when Display is set to Pin only.">Description<//>`} value=${h.desc} onChange=${(desc) => update({ desc })} />`}
		${type === 'link' &&
		html`<${Text} className="mt10" label="Link URL" placeholder="https://example.com" value=${h.linkUrl} onChange=${(linkUrl) => update({ linkUrl })} />
			${showText && html`<${Text} className="mt10" label="Link Button Text" placeholder="Visit Link" value=${h.linkText} onChange=${(linkText) => update({ linkText })} />`}
			<${Toggle} className="mt10" label="Open in new tab" checked=${h.openInNewTab === true} onChange=${(v) => update({ openInNewTab: v })} />`}
		${type === 'image' &&
		html`${simpleTag('image')}
			<${MediaField} className="mt10" label="Image" placeholder="Image URL" value=${h.imageUrl} onChange=${(imageUrl) => update({ imageUrl })} onBrowse=${(cb) => ctx.media('image', cb)} />
			<${Text} className="mt10" label=${html`<${Label} info="Describes the picture for screen readers and when it fails to load. Falls back to the hotspot name.">Image Alt Text<//>`} value=${h.imageAlt} onChange=${(imageAlt) => update({ imageAlt })} />`}
		${type === 'animation' &&
		(animations.length
			? html`<${Select} className="mt10" label=${html`<${Label} info="The clip this hotspot plays, listed from the model in the preview.">Animation Name<//>`} value=${h.animationName || ''} options=${[{ label: 'Select an animation', value: '' }, ...animations.map((x) => ({ label: x, value: x }))]} onChange=${(animationName) => update({ animationName })} />
					<${Select} className="mt10" label=${html`<${Label} info="How long the clip runs. Once ends by itself; the other two run until the hotspot is clicked again.">Repeat<//>`} value=${h.animationRepeat || 'once'} options=${[{ label: 'Once', value: 'once' }, { label: 'Loop until clicked again', value: 'loop' }, { label: 'Back and forth until clicked again', value: 'pingpong' }]} onChange=${(animationRepeat) => update({ animationRepeat })} />
					${h.animationName && !animations.includes(h.animationName) && html`<${Notice} status="warning" className="mt10">This model has no animation with that name, so clicking the hotspot does nothing.<//>`}`
			: html`<${Text} className="mt10" label="Animation Name" value=${h.animationName} onChange=${(animationName) => update({ animationName })} help="This model has no animations, or it is still loading." />`)}
		${type === 'video' &&
		html`${simpleTag('video')}
			<${Text} className="mt10" label=${html`<${Label} info="YouTube, Vimeo, or a direct MP4, WebM or OGG file. The player loads only when the visitor opens the card.">Video URL<//>`} placeholder="https://www.youtube.com/watch?v=..." value=${h.videoUrl} onChange=${(videoUrl) => update({ videoUrl })} />
			${h.videoUrl && !parseVideoUrl(h.videoUrl) && html`<${Notice} status="warning" className="mt10">This link is not a supported video, so nothing will play.<//>`}`}
		${type === 'product' && html`${simpleTag('product')}<${ProductCombo} value=${Number(h.productId) || 0} onChange=${(productId) => update({ productId })} />`}
		<${Toggle} className="mt10" label="Edit Manually" checked=${manual} onChange=${setManual} />`}
		${(manual || ve) &&
		html`<${CopyText} label="Hotspot Position" value=${h.position} onChange=${(position) => update({ position })} onCopy=${ctx.copy} />
			<${CopyText} label="Hotspot Normal" value=${h.normal} onChange=${(normal) => update({ normal })} onCopy=${ctx.copy} />
			<${CopyText} label="Camera Orbit" value=${h.orbit} onChange=${(orbit) => update({ orbit })} onCopy=${ctx.copy} />
			<${CopyText} label="Camera Target" value=${h.target} onChange=${(target) => update({ target })} onCopy=${ctx.copy} />
			<${CopyText} label="FOV (Field Of View)" value=${h.fov} onChange=${(fov) => update({ fov })} onCopy=${ctx.copy} />`}
	`;
}

function HotspotsPanel({ a, set, ctx }) {
	const { pro } = ctx;
	const multiple = a.multiple && pro;
	const m = currentModel(a, ctx.index, pro);
	const value = hotspotsOf(a, m);
	const style = a.hotspotStyle || 'style-2';
	const pins = { ...PINS_DEFAULTS, ...(a.pins || {}) };
	const setPins = (patch) => set({ pins: { ...pins, ...patch } });
	const [active, setActive] = useState(value.length - 1);
	useEffect(() => setActive(value.length - 1), [value.length, ctx.index]);
	const onChange = (next) => {
		if (multiple) set({ models: a.models.map((x, i) => (i === ctx.index ? { ...x, hotspots: next } : x)) });
		else set({ model: { ...currentModel(a, 0, false), hotspots: next } });
	};
	return html`<${Panel} id="hotspots" className="hotspots" icon="hotspot" title="Hotspots/Annotations" badge=${pro ? '' : 'PRO'} open=${ctx.open.hotspots} onToggle=${(v) => ctx.toggle('hotspots', v)}>
		${a.placement !== 'visual-editor' &&
		html`<${Select} pro side className="mt5" label="Default Style" info=${HELP.hotspotStyle} value=${style} options=${[{ label: 'Simple Tag (Text Only)', value: 'style-1' }, { label: 'Always Visible Card', value: 'style-2' }, { label: 'Hover Popup Card', value: 'style-3' }, { label: 'Minimal Icon Badge', value: 'style-4' }]} onChange=${(hotspotStyle) => set({ hotspotStyle })} />
		<${Range} pro className="mt10" label="Pin Size (px)" info=${HELP.pinSize} value=${pins.size} min=${16} max=${64} step=${1} onChange=${(size) => setPins({ size })} />
		<${Color} label="Pin Icon Color" value=${pins.color} defaultColor=${PINS_DEFAULTS.color} onChange=${(color) => setPins({ color })} />
		<${Color} label="Pin Background" value=${pins.background} defaultColor=${PINS_DEFAULTS.background} onChange=${(background) => setPins({ background })} />`}
		<${ItemsPanel}
			items=${value}
			itemLabel="Hotspot"
			titleOf=${(h) => h.title ?? 'Title'}
			active=${Math.min(active, value.length - 1)}
			setActive=${setActive}
			onChange=${onChange}
			minItem=${0}
			hideAdd
			render=${(h, i) => html`<${HotspotSettings} key=${i} h=${h} style=${style} ctx=${ctx} ve=${a.placement === 'visual-editor'} update=${(patch) => onChange(value.map((x, k) => (k === i ? { ...x, ...patch } : x)))} />`}
		/>
		${ctx.placing && html`<p>Click on the model in the preview to add a hotspot.</p>`}
		<p></p>
		<button type="button" class="components-button is-primary add-hotspot" disabled=${!pro || ctx.placing} onClick=${() => ctx.setPlacing(true)}>Add Hotspot${pro ? '' : '  - Pro'}</button>
	<//>`;
}

/** The Settings tab, in settings.tsx order. */
export function SettingsTab(props) {
	const { a, ctx } = props;
	const single = !(a.multiple && ctx.pro);
	const model = currentModel(a, 0, false);
	return html`<div class="components-panel">
		<${ModelPanel} ...${props} />
		${single && html`<${LightingPanel} ...${props} /><${ARPanel} ...${props} />`}
		${model.modelUrl && single && ctx.pro && html`<${TexturePanel} ...${props} />`}
		<${OptionsPanel} ...${props} />
		${a.placement !== 'visual-editor' && html`<${MobilePanel} ...${props} /><${ControlsPanel} ...${props} />`}
		<${DimensionsPanel} ...${props} />
		<${HotspotsPanel} ...${props} />
	</div>`;
}
