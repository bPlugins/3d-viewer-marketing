// Inspector bodies: Model, Material, Scene & lighting, Camera, Animations, AR, Performance & health.
import { html, useState, useEffect, useRef, cx } from '../../../js/core/ui.js';
import { getMaterialConfig } from '../../../js/shared/effective-config.js';
import { MODEL_INFO, CLIP_DURATIONS } from '../../../js/engine/demo-models.js';
import { store, useStore } from '../../core/store.js';
import { Badge, Banner, Button, Checkbox, DescriptionList, Icon, Modal, ProgressBar, Select, Switch } from '../../ui/polaris.js';
import { useEd, effective, rawConfig, onVariant, activeFile, inheritedFile, currentLayer, isRule, targetLabel, patchEntry, patchSection, setWhole, setModelFile, clearOverride } from './state.js';
import { ColorField, OverrideNote, Seg, Slider, fmtBytes, fmtNum, meshLabel } from './fields.js';

const ENV_PRESETS = ['studio', 'apartment', 'city', 'dawn', 'forest', 'lobby', 'night', 'park', 'sunset', 'warehouse'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const round3 = (a) => a.map((n) => Math.round(n * 1000) / 1000);
const has = (ed, key) => onVariant(ed) && rawConfig(ed)[key] !== undefined;

/* ---------- Model ---------- */

function ReplaceModal({ open, onClose, currentId, onPick, product }) {
	const s = useStore();
	const [picked, setPicked] = useState(currentId);
	const [pct, setPct] = useState(null);
	const timer = useRef(0);
	useEffect(() => setPicked(currentId), [currentId, open]);
	useEffect(() => () => clearInterval(timer.current), []);

	const upload = () => {
		setPct(0);
		clearInterval(timer.current);
		timer.current = setInterval(() => {
			setPct((p) => {
				const next = Math.min(100, (p || 0) + 12);
				if (next >= 100) {
					clearInterval(timer.current);
					const src = s.files[currentId] || Object.values(s.files)[0];
					const id = store.nextId('files');
					const taken = Object.values(store.get().files).map((f) => f.filename);
					let name = `${product.handle}-v2.glb`;
					for (let n = 3; taken.includes(name); n++) name = `${product.handle}-v${n}.glb`;
					store.patch(['files', id], { id, kind: 'model3d', demo: src.demo, filename: name, sizeBytes: Math.round(src.sizeBytes * 0.92), status: 'PROCESSING', usdz: false, triangles: src.triangles });
					setTimeout(() => store.patch(['files', id], (f) => (f ? { ...f, status: 'READY', usdz: !f.draco } : f)), 1400);
					setPicked(id);
					setTimeout(() => setPct(null), 300);
				}
				return next;
			});
		}, 120);
	};

	const files = Object.values(s.files).filter((f) => f.kind === 'model3d');
	return html`<${Modal}
		open=${open}
		title="Replace model"
		onClose=${onClose}
		primaryAction=${{ content: 'Use this model', disabled: !picked || picked === currentId, onAction: () => (onPick(picked), onClose()) }}
		secondaryActions=${[{ content: 'Cancel', onAction: onClose }]}
	>
		<p class="ed-p">Pick a 3D model from your store's Files, or upload a new GLB. Files are stored as Shopify 3D media on Shopify's CDN.</p>
		<ul class="ed-files" role="radiogroup" aria-label="3D models">
			${files.map(
				(f) => html`<li>
					<label class=${cx('ed-file', picked === f.id && 'is-on')}>
						<input type="radio" name="ed-file" checked=${picked === f.id} onChange=${() => setPicked(f.id)} />
						<span class="ed-file__icon"><${Icon} name="cube" size=${18} /></span>
						<span class="ed-file__main">
							<span class="ed-file__name">${f.filename}</span>
							<span class="p-help">${fmtBytes(f.sizeBytes)} · ${fmtNum(f.triangles)} triangles${f.id === currentId ? ' · Current' : ''}</span>
						</span>
						${f.status !== 'READY' ? html`<${Badge} tone="info">Processing<//>` : f.usdz ? html`<${Badge} tone="success" icon="ar">AR ready<//>` : html`<${Badge} tone="warning">No AR file<//>`}
					</label>
				</li>`,
			)}
		</ul>
		${pct != null
			? html`<div class="ed-upload"><span>Uploading ${product.handle}-v2.glb… ${pct}%</span><${ProgressBar} value=${pct} /></div>`
			: html`<div class="ed-dropzone"><${Icon} name="upload" size=${20} /><span>Drop a .glb or .gltf file here</span><${Button} size="slim" onClick=${upload}>Upload file<//></div>`}
	<//>`;
}

export function ModelPanel({ product }) {
	const s = useStore();
	const ed = useEd();
	const [open, setOpen] = useState(false);
	const file = activeFile(s, ed);
	const v = currentLayer(ed);
	const productFile = s.files[ed.draft.modelFileId];
	const files = Object.values(s.files).filter((f) => f.kind === 'model3d' && f.status === 'READY');
	return html`
		${file
			? html`<${DescriptionList}
					items=${[
						['File', html`<span class="ed-mono">${file.filename}</span>`],
						['Size', fmtBytes(file.sizeBytes)],
						['Triangles', fmtNum(file.triangles)],
						['Storage', 'Stored as Shopify 3D media (CDN)'],
						['AR file', file.status !== 'READY' ? html`<${Badge} tone="info">Processing<//>` : file.usdz ? html`<${Badge} tone="success" icon="check">Shopify-generated USDZ<//>` : html`<${Badge} tone="warning">Not generated<//>`],
					]}
				/>`
			: html`<p class="ed-p">No model picked yet.</p>`}
		${file?.draco ? html`<${Banner} tone="warning" title="Draco compressed: AR file not generated">Shopify can't build the iPhone AR file from a Draco-compressed GLB. Upload an uncompressed GLB to offer AR on iPhone.<//>` : null}
		${v
			? html`<${Select}
					label="Use a different model"
					value=${v.modelFileId || ''}
					options=${[{ label: `${isRule(ed.target) ? 'Same as product' : 'From its options'} (${inheritedFile(s, ed)?.filename || productFile?.filename || 'none'})`, value: '' }, ...files.map((f) => ({ label: f.filename, value: f.id }))]}
					onChange=${(val) => setModelFile(val || null)}
					helpText=${isRule(ed.target) ? (v.modelFileId ? `Every variant with ${targetLabel(ed)} shows this model. Parts, materials and options still come from the default.` : `For example a wider model for every ${targetLabel(ed).toLowerCase()} variant.`) : v.modelFileId ? 'This variant shows its own model. Parts and materials come from this variant only.' : 'For one variant that looks different from its option values.'}
				/>`
			: html`<${Button} icon="upload" onClick=${() => setOpen(true)}>Replace model<//>`}
		<${ReplaceModal} open=${open} onClose=${() => setOpen(false)} currentId=${ed.draft.modelFileId} onPick=${(id) => setModelFile(id)} product=${product} />
	`;
}

/* ---------- Material ---------- */

function liveColor(ctl, name) {
	try {
		const m = ctl?.three?.scene?.getObjectByName(name)?.material;
		return m?.color ? '#' + m.color.getHexString() : null;
	} catch {
		return null;
	}
}

export function MaterialPanel() {
	const s = useStore();
	const ed = useEd();
	const sel = ed.selection;
	if (!sel) return html`<p class="ed-p ed-muted">Select a part in the list or on the model to change its colour and finish.</p>`;
	const eff = effective(ed);
	const mat = getMaterialConfig(eff.materials, sel, ed.meshNames) || {};
	const own = onVariant(ed) && !!rawConfig(ed).materials?.[sel];
	const presets = Object.values(s.presets).filter((p) => p.type === 'material');
	const groups = (eff.options || []).filter((g) => (g.targets || []).includes(sel));
	const reset = () => {
		if (onVariant(ed)) clearOverride(['materials'], sel);
		else
			setWhole('materials', (m) => {
				const next = { ...(m || {}) };
				delete next[sel];
				return next;
			});
	};
	return html`
		<div class="ed-selhead"><${Icon} name="cube" size=${14} /><strong>${meshLabel(eff, sel)}</strong>${own ? html`<${Badge} tone="attention">Variant override<//>` : null}</div>
		<${ColorField} label="Colour" value=${mat.baseColor || liveColor(ed.ctl, sel) || '#cccccc'} onChange=${(c) => patchEntry('materials', sel, { baseColor: c }, `mat.color.${sel}`)} />
		<${Slider} label="Metalness" value=${mat.metalness ?? 0} onChange=${(v) => patchEntry('materials', sel, { metalness: v }, `mat.metal.${sel}`)} />
		<${Slider} label="Roughness" value=${mat.roughness ?? 0.5} onChange=${(v) => patchEntry('materials', sel, { roughness: v }, `mat.rough.${sel}`)} />
		<div class="ed-row">
			<${Select}
				label="Apply preset"
				value=""
				options=${[{ label: 'Choose a material preset…', value: '' }, ...presets.map((p) => ({ label: p.name, value: p.id }))]}
				onChange=${(id) => id && patchEntry('materials', sel, { ...s.presets[id].data }, null)}
			/>
		</div>
		<div class="ed-row ed-row--end">
			<${Button} size="slim" variant="tertiary" icon="reset" disabled=${onVariant(ed) ? !own : !mat.baseColor && mat.metalness === undefined && mat.roughness === undefined} onClick=${reset}>${onVariant(ed) ? 'Use default material' : 'Reset to model material'}<//>
		</div>
		${groups.length ? html`<p class="p-help">Customer option${groups.length > 1 ? 's' : ''} ${groups.map((g) => `"${g.label}"`).join(', ')} can change this part on the storefront.</p>` : null}
	`;
}

/* ---------- Scene & lighting ---------- */

export function ScenePanel() {
	const s = useStore();
	const ed = useEd();
	const env = effective(ed).environment || {};
	const presets = Object.values(s.presets).filter((p) => p.type === 'environment');
	const bg = env.backgroundType === 'color' ? 'color' : 'transparent';
	return html`
		<${OverrideNote} on=${has(ed, 'environment')} what="lighting" onClear=${() => clearOverride(['environment'])} />
		<${Select}
			label="Environment"
			value=${env.preset || 'studio'}
			options=${ENV_PRESETS.map((p) => ({ label: cap(p), value: p }))}
			onChange=${(v) => patchSection('environment', { preset: v }, null)}
			helpText="Image-based lighting for reflections and soft shadows. Served from the bPlugins assets CDN."
		/>
		<${Slider} label="Light intensity" value=${env.intensity ?? 1} min=${0} max=${2.5} step=${0.05} onChange=${(v) => patchSection('environment', { intensity: v }, 'env.intensity')} />
		<${Switch} label="Contact shadows" checked=${env.shadowsEnabled !== false} onChange=${(v) => patchSection('environment', { shadowsEnabled: v }, null)} />
		${env.shadowsEnabled !== false ? html`<${Slider} label="Shadow strength" value=${env.shadowIntensity ?? 0.6} onChange=${(v) => patchSection('environment', { shadowIntensity: v }, 'env.shadow')} />` : null}
		<div class="p-field">
			<span class="p-label">Background</span>
			<${Seg}
				label="Background"
				value=${bg}
				options=${[
					{ value: 'transparent', label: 'Transparent' },
					{ value: 'color', label: 'Colour' },
				]}
				onChange=${(v) => patchSection('environment', { backgroundType: v, backgroundColor: v === 'color' ? env.backgroundColor || '#f6f3ee' : env.backgroundColor }, null)}
			/>
			<p class="p-help">${bg === 'transparent' ? 'The theme’s product media background shows through.' : 'A solid colour behind the model.'}</p>
		</div>
		${bg === 'color' ? html`<${ColorField} label="Background colour" value=${env.backgroundColor || '#f6f3ee'} onChange=${(c) => patchSection('environment', { backgroundColor: c }, 'env.bg')} />` : null}
		${presets.length
			? html`<${Select}
					label="Apply environment preset"
					value=""
					options=${[{ label: 'Choose a preset…', value: '' }, ...presets.map((p) => ({ label: p.name, value: p.id }))]}
					onChange=${(id) => id && patchSection('environment', { ...s.presets[id].data }, null)}
				/>`
			: null}
	`;
}

/* ---------- Camera ---------- */

const VIEWS = [
	['perspective', 'Perspective'],
	['front', 'Front'],
	['side', 'Side'],
	['back', 'Back'],
];

export function CameraPanel() {
	const s = useStore();
	const ed = useEd();
	const eff = effective(ed);
	const cam = eff.camera || {};
	const lock = cam.lock || {};
	const gallery = eff.gallery_presets || {};
	const presets = Object.values(s.presets).filter((p) => p.type === 'camera');
	const setLock = (patch, key) => setWhole('camera', (c) => ({ ...(c || {}), lock: { ...(c?.lock || {}), ...patch } }), key);
	const capture = () => {
		const c = ed.ctl?.getCamera();
		if (!c) return;
		setWhole('camera', (cur) => ({ ...(cur || {}), position: round3(c.position), target: round3(c.target), fov: Math.round(c.fov) }));
	};
	const captureView = (key) => {
		const c = ed.ctl?.getCamera();
		if (!c) return;
		setWhole('gallery_presets', (g) => ({ ...(g || {}), [key]: { position: round3(c.position), target: round3(c.target) } }));
	};
	const fly = (view) => view && ed.ctl?.setCamera(view, { animate: true });
	return html`
		<${OverrideNote} on=${has(ed, 'camera') || has(ed, 'gallery_presets')} what="camera" onClear=${() => clearOverride(['camera', 'gallery_presets'])} />
		<div class="ed-camstart">
			<div>
				<span class="p-label">Start view</span>
				<p class="p-help ed-mono">${cam.position ? `[${round3(cam.position).join(', ')}] → [${round3(cam.target || [0, 0, 0]).join(', ')}]` : 'Automatic: framed to fit the model'}</p>
			</div>
			<div class="ed-btnrow">
				<${Button} size="slim" icon="camera" disabled=${!ed.ctl} onClick=${capture}>Use current view as start<//>
				${cam.position ? html`<${Button} size="slim" variant="tertiary" onClick=${() => fly(cam)}>Go to start view<//>` : null}
				${cam.position
					? html`<${Button}
							size="slim"
							variant="tertiary"
							onClick=${() =>
								setWhole('camera', (c) => {
									const next = { ...(c || {}) };
									delete next.position;
									delete next.target;
									delete next.fov;
									return Object.keys(next).length ? next : null;
								})}
							>Use automatic<//>`
					: null}
			</div>
		</div>
		<div class="ed-checks">
			<${Checkbox} label="Shoppers can rotate" checked=${lock.rotate !== false} onChange=${(v) => setLock({ rotate: v ? undefined : false })} />
			<${Checkbox} label="Shoppers can zoom" checked=${lock.zoom !== false} onChange=${(v) => setLock({ zoom: v ? undefined : false })} />
			<${Checkbox} label="Shoppers can pan" checked=${lock.pan !== false} onChange=${(v) => setLock({ pan: v ? undefined : false })} />
		</div>
		<${Slider} label="Lowest viewing angle" value=${lock.minPolarAngle ?? 0} min=${0} max=${90} step=${1} format=${(v) => `${v}°`} onChange=${(v) => setLock({ minPolarAngle: v || undefined }, 'cam.minpolar')} help="0° lets shoppers look from straight above." />
		<${Slider} label="Highest viewing angle" value=${lock.maxPolarAngle ?? 180} min=${90} max=${180} step=${1} format=${(v) => `${v}°`} onChange=${(v) => setLock({ maxPolarAngle: v >= 180 ? undefined : v }, 'cam.maxpolar')} help="Keep it under 90° to stop shoppers looking under the product." />
		<div class="p-field">
			<span class="p-label">Gallery views</span>
			<div class="ed-views">
				${VIEWS.map(
					([key, label]) => html`<div class="ed-view">
						<span class="ed-view__name">${label}${gallery[key] ? html` <${Icon} name="check" size=${12} />` : null}</span>
						<${Button} size="slim" onClick=${() => captureView(key)} disabled=${!ed.ctl}>Capture<//>
						<${Button} size="slim" variant="tertiary" disabled=${!gallery[key]} onClick=${() => fly(gallery[key])}>View<//>
					</div>`,
				)}
			</div>
			<p class="p-help">Shoppers jump between these views from the viewer toolbar.</p>
		</div>
		${presets.length
			? html`<${Select}
					label="Apply camera preset"
					value=""
					options=${[{ label: 'Choose a preset…', value: '' }, ...presets.map((p) => ({ label: p.name, value: p.id }))]}
					onChange=${(id) => {
						if (!id) return;
						const d = s.presets[id].data;
						setWhole('camera', (c) => ({ ...(c || {}), position: d.position, target: d.target }));
						fly(d);
					}}
				/>`
			: null}
	`;
}

/* ---------- Animations ---------- */

export function AnimationsPanel() {
	const ed = useEd();
	const a = effective(ed).animations || {};
	const set = (patch, key = null) => setWhole('animations', (cur) => ({ loop: true, speed: 1, ...(cur || {}), ...patch }), key);
	return html`
		<${OverrideNote} on=${has(ed, 'animations')} what="animation settings" onClear=${() => clearOverride(['animations'])} />
		<${Select}
			label="Play on load"
			value=${a.autoplay || ''}
			options=${[{ label: 'Don’t play', value: '' }, ...ed.clips.map((c) => ({ label: `${c.name.replace(/_/g, ' ')} (${(c.duration || CLIP_DURATIONS[c.name] || 0).toFixed(1)}s)`, value: c.name }))]}
			onChange=${(v) => set({ autoplay: v || null })}
		/>
		<${Checkbox} label="Loop" checked=${a.loop !== false} onChange=${(v) => set({ loop: v })} />
		<${Slider} label="Speed" value=${a.speed ?? 1} min=${0.1} max=${3} step=${0.1} format=${(v) => `${v.toFixed(1)}×`} onChange=${(v) => set({ speed: v }, 'anim.speed')} />
		<div class="ed-btnrow">
			${ed.clips.map((c) => html`<${Button} size="slim" icon="play" onClick=${() => ed.ctl?.playAnimation(c.name, { loop: a.loop !== false, speed: a.speed ?? 1 })}>${c.name.replace(/_/g, ' ')}<//>`)}
			<${Button} size="slim" variant="tertiary" onClick=${() => ed.ctl?.stopAnimation()}>Stop<//>
		</div>
	`;
}

/* ---------- AR ---------- */

export function ArPanel() {
	const s = useStore();
	const ed = useEd();
	const ar = effective(ed).ar || {};
	const file = activeFile(s, ed);
	return html`
		<${OverrideNote} on=${has(ed, 'ar')} what="AR settings" onClear=${() => clearOverride(['ar'])} />
		<${Switch} label="View in your space (AR)" helpText="Shows the AR button on phones and tablets." checked=${!!ar.enabled} onChange=${(v) => patchSection('ar', { enabled: v, source: 'shopify' }, null)} />
		${ar.enabled
			? html`<div class="p-field">
					<span class="p-label">Scale</span>
					<${Seg}
						label="AR scale"
						value=${ar.scale === 'auto' ? 'auto' : 'fixed'}
						options=${[
							{ value: 'fixed', label: 'True to size' },
							{ value: 'auto', label: 'Shoppers can resize' },
						]}
						onChange=${(v) => patchSection('ar', { scale: v }, null)}
					/>
				</div>`
			: null}
		<${Banner} tone=${file?.usdz ? 'info' : 'warning'} title=${file?.usdz ? 'Shopify generates the iPhone AR file from your GLB' : 'No iPhone AR file for this model'}>
			${file?.usdz ? 'Android uses the GLB directly. There is nothing extra to upload.' : file?.draco ? 'Draco-compressed GLBs are skipped. Upload an uncompressed GLB to get one.' : 'Shopify is still processing this file.'}
		<//>
	`;
}

/* ---------- Performance & health ---------- */

function Meter({ label, value, display, warn, max, help }) {
	const tone = value > max ? 'critical' : value > warn ? 'warning' : 'success';
	return html`<div class="ed-meter">
		<div class="ed-meter__row"><span>${label}</span><${Badge} tone=${tone}>${display}<//></div>
		<${ProgressBar} value=${Math.min(100, (value / max) * 100)} tone=${tone} label=${label} />
		${help ? html`<p class="p-help">${help}</p>` : null}
	</div>`;
}

export function PerformancePanel() {
	const s = useStore();
	const ed = useEd();
	const file = activeFile(s, ed);
	const opt = effective(ed).optimization || {};
	if (!file) return html`<p class="ed-p">Pick a model first.</p>`;
	const info = MODEL_INFO[file.demo] || {};
	const mb = file.sizeBytes / 1048576;
	const issues = (file.triangles > 150000 ? 1 : 0) + (mb > 15 ? 1 : 0);
	return html`
		${issues
			? html`<${Banner} tone="critical" title="This model may load slowly on phones">Aim for under 150,000 triangles and 15 MB. Decimate the mesh or compress textures before uploading.<//>`
			: html`<${Banner} tone="success" title="Healthy model">It should load fast on phones.<//>`}
		<${Meter} label="Triangles" value=${file.triangles} display=${fmtNum(file.triangles)} warn=${100000} max=${150000} />
		<${Meter} label="File size" value=${mb} display=${fmtBytes(file.sizeBytes)} warn=${8} max=${15} help=${`Shopify's 3D model limit is 500 MB; the storefront budget is 15 MB.`} />
		<${Meter} label="Materials" value=${info.materials?.length || 0} display=${String(info.materials?.length || 0)} warn=${12} max=${20} />
		<${OverrideNote} on=${has(ed, 'optimization')} what="performance settings" onClear=${() => clearOverride(['optimization'])} />
		<${Slider} label="Mobile pixel ratio cap" value=${opt.pixelRatioLimit ?? 1.5} min=${1} max=${3} step=${0.25} format=${(v) => `${v.toFixed(2)}×`} onChange=${(v) => patchSection('optimization', { pixelRatioLimit: v }, 'opt.pr')} help="Lower is faster and cooler on phones; higher is sharper." />
		<${Checkbox} label="Power saving mode" helpText="Renders at 1× on every device." checked=${opt.gpuPerformanceMode === 'low-power'} onChange=${(v) => patchSection('optimization', { gpuPerformanceMode: v ? 'low-power' : 'default' }, null)} />
	`;
}

