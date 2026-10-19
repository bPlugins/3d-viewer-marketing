// Port of components/ImportExportControls + validateConfig.ts. Export shows the JSON in a
// textarea with Copy (the prototype never downloads); import reads a file or pasted JSON.
import { html, useState, useRef, useEffect } from '../../../../core/ui.js';
import { useStore } from '../../../../core/store.js';
import { editor, useEditor } from '../editor-store.js';
import { legacyMaterialKey } from '../../../../shared/effective-config.js';
import { modelFor } from '../../../../shared/product-3d.js';
import {
	Accordion,
	DIVIDER_CLASS,
	EYEBROW_CLASS,
	HELP_CLASS,
	InfoBanner,
	MONO_TEXT_CLASS,
	READOUT_KEY_CLASS,
	READOUT_ROW_CLASS,
	READOUT_VALUE_CLASS,
	SURFACE_CLASS,
	TEXTAREA_CLASS,
	LINK_CLASS,
} from '../../../../shared/editor-ui.js';
import { ArrowDownTrayIcon, ArrowsRightLeftIcon, CloudUploadIcon } from '../../../../shared/icons.js';

// ── validateConfig.ts ───────────────────────────────────────────────────────

const bool = { kind: 'boolean' };
const num = { kind: 'number' };
const str = { kind: 'string' };
const vec3 = { kind: 'vec3' };
const oneOf = (...values) => ({ kind: 'enum', values });
const obj = (fields, extra = {}) => ({ kind: 'object', fields, ...extra });
const record = (of, extra = {}) => ({ kind: 'record', of, ...extra });
const textureRef = obj({ attachment_id: num, url: str });

const CONFIG_FIELDS = {
	schema_version: num,
	meshes: record(obj({ visible: bool, color: str, material: str, texture: textureRef, customizable: bool, optional: bool })),
	materials: record(obj({ type: str, baseColor: str, metalness: num, roughness: num, clearcoat: num, textures: record(textureRef) })),
	camera: obj(
		{
			preset_id: num,
			position: vec3,
			target: vec3,
			fov: num,
			lock: obj({ rotate: bool, zoom: bool, pan: bool, minPolarAngle: num, maxPolarAngle: num, minAzimuthAngle: num, maxAzimuthAngle: num, minDistance: num, maxDistance: num }),
		},
		{ nullable: true },
	),
	environment: obj(
		{
			preset: str,
			customHdriUrl: str,
			customHdriId: num,
			intensity: num,
			shadowsEnabled: bool,
			shadowIntensity: num,
			reflectionIntensity: num,
			backgroundType: oneOf('transparent', 'color', 'image', 'preset', 'custom'),
			backgroundColor: str,
			backgroundImageUrl: str,
			backgroundImageId: num,
			backgroundBlur: num,
			floorEnabled: bool,
			floorColor: str,
			floorTextureUrl: str,
			floorTextureId: num,
			floorGridEnabled: bool,
			floorReflection: bool,
			floorRoughness: num,
			floorMetalness: num,
			floorShadowOpacity: num,
			background: bool,
		},
		{ nullable: true },
	),
	animations: obj({ autoplay: str, loop: bool, speed: num }, { nullable: true }),
	hotspots: {
		kind: 'array',
		of: obj(
			{ id: str, anchor_mesh: str, offset: vec3, label: str, icon: str, description: str, target_url: str, linked_product_id: num, camera_position: vec3, camera_target: vec3 },
			{ required: ['id'] },
		),
	},
	optimization: obj(
		{
			autoOptimize: bool,
			dracoEnabled: bool,
			lodEnabled: bool,
			gpuPerformanceMode: oneOf('high-performance', 'default', 'low-power'),
			maxTextureResolution: oneOf(512, 1024, 2048, 0),
			mobileDisableReflection: bool,
			mobileDisableShadows: bool,
			pixelRatioLimit: num,
		},
		{ nullable: true },
	),
	ar: obj({ enabled: bool, usdzId: num, usdzUrl: str, scale: oneOf('auto', 'fixed') }, { nullable: true }),
	gallery_presets: record(obj({ position: vec3, target: vec3, thumbnail: str }, { required: ['position', 'target'] }), {
		nullable: true,
		knownKeys: ['perspective', 'front', 'side', 'back'],
	}),
};
const CONFIG_SPEC = obj(CONFIG_FIELDS);
const SCHEMA_VERSION = 1;
const MAX_ERRORS = 5;
const INVALID = Symbol('invalid');

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const expectedLabel = (spec) =>
	({ boolean: 'true or false', number: 'a number', string: 'text', vec3: 'three numbers [x, y, z]', array: 'a list' })[spec.kind] || 'an object';

/** → {config|null, errors, unknown, newerVersion}; any error rejects the file. */
export function validateConfig(input) {
	const errors = [];
	const unknown = [];
	const fail = (path, spec) => {
		errors.push(`${path}: expected ${expectedLabel(spec)}.`);
		return INVALID;
	};
	const asMap = (value) => (Array.isArray(value) && value.length === 0 ? {} : isPlainObject(value) ? value : null);

	const check = (value, spec, path) => {
		switch (spec.kind) {
			case 'boolean':
			case 'string':
				return typeof value === spec.kind ? value : fail(path, spec);
			case 'number':
				return typeof value === 'number' && Number.isFinite(value) ? value : fail(path, spec);
			case 'vec3':
				return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number' && Number.isFinite(n)) ? value : fail(path, spec);
			case 'enum':
				if (typeof value !== 'string' && typeof value !== 'number') return fail(path, spec);
				if (!spec.values.includes(value)) unknown.push(`${path} = ${JSON.stringify(value)}`);
				return value;
			case 'array':
				if (!Array.isArray(value)) return fail(path, spec);
				return value.map((item, i) => check(item, spec.of, `${path}[${i}]`));
			case 'record': {
				const map = asMap(value);
				if (!map) return fail(path, spec);
				const out = {};
				for (const [key, item] of Object.entries(map)) {
					if (item === null || key === '__proto__') continue;
					if (spec.knownKeys && !spec.knownKeys.includes(key)) unknown.push(`${path}.${key}`);
					out[key] = check(item, spec.of, `${path}["${key}"]`);
				}
				return out;
			}
			case 'object': {
				const map = asMap(value);
				if (!map) return fail(path, spec);
				const out = {};
				for (const [key, item] of Object.entries(map)) {
					if (key === '__proto__') continue;
					const field = hasOwn(spec.fields, key) ? spec.fields[key] : undefined;
					if (!field) {
						unknown.push(path ? `${path}.${key}` : key);
						out[key] = item;
						continue;
					}
					if (item === null) {
						if (field.nullable) out[key] = null;
						continue;
					}
					out[key] = check(item, field, path ? `${path}.${key}` : key);
				}
				for (const key of spec.required ?? []) {
					if (!hasOwn(out, key)) errors.push(`${path ? `${path}.${key}` : key} is missing.`);
				}
				return out;
			}
		}
		return value;
	};

	const reject = (message) => ({ config: null, errors: [message], unknown, newerVersion: false });
	if (!isPlainObject(input)) return reject('The file does not contain a configuration object.');
	if (!Object.keys(input).some((k) => hasOwn(CONFIG_FIELDS, k))) return reject('The file does not contain any 3D viewer settings.');

	const config = check(input, CONFIG_SPEC, '');
	const version = typeof config.schema_version === 'number' && config.schema_version >= 1 ? config.schema_version : SCHEMA_VERSION;
	config.schema_version = version;
	const newerVersion = version > SCHEMA_VERSION;

	if (errors.length > MAX_ERRORS) {
		const more = errors.length - MAX_ERRORS;
		errors.splice(MAX_ERRORS);
		errors.push(more === 1 ? `…and ${more} more problem.` : `…and ${more} more problems.`);
	}
	return { config: errors.length > 0 ? null : config, errors, unknown, newerVersion };
}

// ── Panel ───────────────────────────────────────────────────────────────────

const MAX_UNKNOWN_SHOWN = 8;
const CONFIG_KEYS = Object.keys(CONFIG_FIELDS);

/** importConfig(): replace the active target's whole config (unknown keys kept). */
function importConfig(parsed) {
	if (typeof editor.importConfig === 'function') return editor.importConfig(parsed);
	const current = editor.raw() || {};
	const keys = new Set([...Object.keys(current), ...Object.keys(parsed)]);
	keys.forEach((k) => editor.replace(k, hasOwn(parsed, k) ? parsed[k] : undefined));
	return undefined;
}

async function copyText(text, el) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		try {
			el?.select();
			return document.execCommand('copy');
		} catch {
			return false;
		}
	}
}

export default function ImportExportPanel() {
	const target = useEditor((s) => s.target);
	const productId = useEditor((s) => s.productId);
	const info = useEditor((s) => s.modelInfo);
	const viewer = useEditor((s) => s.viewer);
	const activeCfg = useEditor(() => editor.raw());
	const state = useStore((s) => s);
	const isVariation = target !== 'default' && target != null;

	const [active, setActive] = useState('export');
	const [message, setMessage] = useState(null);
	const [verification, setVerification] = useState(null);
	const [exported, setExported] = useState(null);
	const [copied, setCopied] = useState(false);
	const [pasting, setPasting] = useState(false);
	const [pasted, setPasted] = useState('');
	const fileRef = useRef(null);
	const exportRef = useRef(null);

	// A new target means a different config: drop the stale export text.
	useEffect(() => setExported(null), [target]);

	const toggle = (sec) => setActive((cur) => (cur === sec ? null : sec));

	const handleExport = () => {
		if (!activeCfg) return setMessage({ type: 'error', text: 'No configuration found to export.' });
		try {
			const { attachment } = modelFor(state, productId, isVariation ? target : 0);
			const modelName = attachment?.filename ? attachment.filename.replace(/\.[^/.]+$/, '') : 'model';
			const scope = isVariation ? `variant-${target}` : 'default';
			setExported({ name: `wc3d-config-${modelName}-${scope}.json`, json: JSON.stringify(activeCfg, null, 2) });
			setCopied(false);
			setMessage({ type: 'success', text: 'Viewer configuration exported successfully!' });
		} catch {
			setMessage({ type: 'error', text: 'Failed to export configuration.' });
		}
	};

	const verify = (filename, content) => {
		let raw;
		try {
			raw = JSON.parse(content);
		} catch {
			return setMessage({ type: 'error', text: 'Invalid configuration file. Please ensure it is a valid WC3D JSON config file.' });
		}
		const result = validateConfig(raw);
		if (!result.config) return setMessage({ type: 'error', text: 'This file is not a valid 3D viewer configuration:', details: result.errors });
		const parsed = result.config;

		const meshNameList = viewer?.getMeshNames?.() ?? info?.meshes ?? [];
		const meshNames = new Set(meshNameList);
		const legacyNames = new Set(meshNameList.map(legacyMaterialKey));
		let matchedMeshes = 0;
		let totalMeshes = 0;
		let matchedMaterials = 0;
		let totalMaterials = 0;
		if (parsed.meshes && meshNames.size > 0) {
			const names = Object.keys(parsed.meshes);
			totalMeshes = names.length;
			matchedMeshes = names.filter((n) => meshNames.has(n)).length;
		}
		if (parsed.materials && meshNames.size > 0) {
			const keys = Object.keys(parsed.materials);
			totalMaterials = keys.length;
			matchedMaterials = keys.filter((k) => meshNames.has(k) || legacyNames.has(k)).length;
		}
		setVerification({
			filename,
			parsed,
			totalMeshes,
			matchedMeshes,
			totalMaterials,
			matchedMaterials,
			hasCamera: !!parsed.camera,
			hasEnvironment: !!parsed.environment,
			hasOptimization: !!parsed.optimization,
			hotspotCount: parsed.hotspots?.length ?? 0,
			isMismatchedModel: (totalMeshes > 0 && matchedMeshes === 0) || (totalMaterials > 0 && matchedMaterials === 0),
			unknown: result.unknown,
			newerVersion: result.newerVersion,
		});
		setMessage(null);
		setPasting(false);
		setPasted('');
	};

	const onFile = (e) => {
		const file = e.currentTarget.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => verify(file.name, typeof reader.result === 'string' ? reader.result : '');
		reader.onerror = () => setMessage({ type: 'error', text: 'The file could not be read.' });
		reader.readAsText(file);
		e.currentTarget.value = '';
	};

	const apply = () => {
		if (!verification) return;
		importConfig(verification.parsed);
		setMessage({ type: 'success', text: 'Configuration loaded into preview! Review the updates in the 3D canvas and click "Save changes" to persist.' });
		setVerification(null);
	};

	const onDropKey = (e) => {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		fileRef.current?.click();
	};

	const yesNo = (v) => (v ? 'Yes' : 'No');
	const matchesLabel = (m, t) => `${m} / ${t} matches`;

	const verdict = (v) => {
		if (v.isMismatchedModel)
			return html`<${InfoBanner} tone="danger" title="Model Mismatch Warning">
				<p>None of the configured meshes or materials match this 3D model. Applying this configuration might have no visual effect or lead to unexpected behavior. Proceed anyway?</p>
			<//>`;
		if (v.matchedMeshes < v.totalMeshes || v.matchedMaterials < v.totalMaterials)
			return html`<${InfoBanner} tone="warning" title="Partial Mismatch Warning">
				<p>Some meshes or materials in the config do not exist in this 3D model. Only matching elements will be loaded. Proceed?</p>
			<//>`;
		return html`<${InfoBanner} tone="success" compact>Verification successful: Perfect model match!<//>`;
	};

	const unknownBanner = (v) => {
		if (!v.unknown.length && !v.newerVersion) return null;
		const shown = v.unknown.slice(0, MAX_UNKNOWN_SHOWN);
		const more = v.unknown.length - shown.length;
		return html`<${InfoBanner} tone="warning" title="Unrecognised settings">
			${v.newerVersion && html`<p>The file was exported by a newer version of the plugin.</p>`}
			${v.unknown.length > 0 &&
			html`<p>
					${v.unknown.length === 1
						? 'This setting is not used by this version of the plugin and may have no effect:'
						: 'These settings are not used by this version of the plugin and may have no effect:'}
				</p>
				<p class="font-mono text-[11px] break-all">${shown.join(', ')}${more > 0 ? ` (+${more} more)` : ''}</p>`}
		<//>`;
	};

	const row = (k, v) => html`<div class=${READOUT_ROW_CLASS}><span class=${READOUT_KEY_CLASS}>${k}</span><span class=${READOUT_VALUE_CLASS}>${v}</span></div>`;

	return html`<div class=${DIVIDER_CLASS}>
		<div class="px-4 pt-3.5 pb-3">
			<h4 class=${`${EYEBROW_CLASS} m-0`}>
				<${ArrowsRightLeftIcon} size=${14} class="text-brand-500 dark:text-brand-400" />Import & Export Config
			</h4>
		</div>

		${message &&
		html`<div class="px-4 pb-3">
			<${InfoBanner} tone=${message.type === 'success' ? 'success' : 'danger'} padding="p-3" role=${message.type === 'error' ? 'alert' : 'status'} onDismiss=${() => setMessage(null)}>
				<div>${message.text}</div>
				${message.details?.length > 0 &&
				html`<ul class="list-disc ps-4 m-0 mt-1 space-y-0.5 font-mono text-[11px] break-words">
					${message.details.map((d) => html`<li key=${d} class="m-0">${d}</li>`)}
				</ul>`}
			<//>
		</div>`}

		<${Accordion} variant="nested-compact" title="Export Config" open=${active === 'export'} onToggle=${() => toggle('export')} bodyClassName="px-4 py-3.5 space-y-3">
			<p class=${HELP_CLASS}>
				Download the current camera parameters, physical ground configurations, mesh visibilities, material properties, hotspots, and performance tunings as a portable JSON file.
			</p>
			<button type="button" onClick=${handleExport} class="wc3d-btn wc3d-btn-soft w-full"><${ArrowDownTrayIcon} size=${15} />Export Configuration</button>
			${exported &&
			html`<div class="space-y-1.5">
				<div class="flex items-center justify-between gap-2">
					<span class=${`${MONO_TEXT_CLASS} truncate`} title=${exported.name}>${exported.name}</span>
					<button
						type="button"
						class="wc3d-btn wc3d-btn-ghost wc3d-btn-sm flex-shrink-0"
						onClick=${async () => {
							setCopied(await copyText(exported.json, exportRef.current));
							setTimeout(() => setCopied(false), 1600);
						}}
					>
						${copied ? 'Copied' : 'Copy'}
					</button>
				</div>
				<textarea ref=${exportRef} readOnly rows=${10} spellcheck=${false} aria-label=${exported.name} class=${`${TEXTAREA_CLASS} font-mono text-[11px] leading-snug resize-y`} value=${exported.json}></textarea>
			</div>`}
		<//>

		<${Accordion} variant="nested-compact" title="Import Config" open=${active === 'import'} onToggle=${() => toggle('import')} bodyClassName="px-4 py-3.5 space-y-3">
			<input type="file" ref=${fileRef} onChange=${onFile} accept=".json,application/json" class="hidden" tabIndex=${-1} aria-hidden="true" />
			${!verification
				? html`
						<p class=${HELP_CLASS}>Upload a previously exported .json file to copy or clone a layout from another product variation directly into this editor session.</p>
						<div
							role="button"
							tabIndex=${0}
							onClick=${() => fileRef.current?.click()}
							onKeyDown=${onDropKey}
							class="wc3d-dashed group flex flex-col items-center gap-1 px-4 py-5 text-center cursor-pointer select-none transition-colors hover:border-brand-500 dark:hover:border-brand-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
						>
							<span class="wc3d-icon-tile wc3d-icon-tile-brand w-9 h-9 mb-1.5"><${CloudUploadIcon} size=${18} /></span>
							<span class="block text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Click to upload JSON file</span>
							<span class="block text-[11.5px] text-slate-500 dark:text-slate-400">Supports only valid WC3D .json backups</span>
						</div>
						${pasting
							? html`<div class="space-y-2">
									<textarea
										rows=${6}
										spellcheck=${false}
										aria-label="Paste JSON"
										placeholder='{ "schema_version": 1, … }'
										value=${pasted}
										onInput=${(e) => setPasted(e.currentTarget.value)}
										class=${`${TEXTAREA_CLASS} font-mono text-[11px] leading-snug resize-y`}
									></textarea>
									<div class="flex gap-2">
										<button type="button" class="wc3d-btn wc3d-btn-ghost wc3d-btn-sm flex-1" onClick=${() => setPasting(false)}>Cancel</button>
										<button type="button" class="wc3d-btn wc3d-btn-primary wc3d-btn-sm flex-1" disabled=${!pasted.trim()} onClick=${() => verify('pasted-config.json', pasted)}>Verify JSON</button>
									</div>
								</div>`
							: html`<div class="text-center"><button type="button" class=${LINK_CLASS} onClick=${() => setPasting(true)}>Paste JSON instead</button></div>`}
					`
				: html`<div class="space-y-3">
						<div class="wc3d-card overflow-hidden">
							<div class="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">
								<span class="min-w-0 text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 truncate" title=${verification.filename}>${verification.filename}</span>
								<span class="wc3d-badge wc3d-badge-brand wc3d-badge-dot flex-shrink-0">Ready to verify</span>
							</div>
							<div class=${`${SURFACE_CLASS} m-3 overflow-hidden text-[12px]`}>
								${verification.totalMeshes > 0 && row('Mesh Overrides', matchesLabel(verification.matchedMeshes, verification.totalMeshes))}
								${verification.totalMaterials > 0 && row('Material Overrides', matchesLabel(verification.matchedMaterials, verification.totalMaterials))}
								${row('Camera Parameters', yesNo(verification.hasCamera))}
								${row('Environment & Floor', yesNo(verification.hasEnvironment))}
								${row('Optimization Presets', yesNo(verification.hasOptimization))}
								${verification.hotspotCount > 0 && row('Hotspots', `${verification.hotspotCount} configured`)}
							</div>
							<div class="px-3 pb-3 space-y-2 empty:hidden">${unknownBanner(verification)} ${verdict(verification)}</div>
						</div>
						<div class="flex gap-2">
							<button type="button" onClick=${() => setVerification(null)} class="wc3d-btn wc3d-btn-ghost flex-1">Cancel</button>
							<button type="button" onClick=${apply} class="wc3d-btn wc3d-btn-primary flex-1">Apply to Preview</button>
						</div>
					</div>`}
		<//>
	</div>`;
}

export { CONFIG_KEYS };
