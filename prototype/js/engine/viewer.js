// Imperative three.js viewer used by the editor viewport, the storefront viewer,
// order previews and thumbnails. Mirrors src/shared/engine (SceneEnvironment,
// ModelController, AutoFitCamera, lockProps, tweenCamera, ModelAnimator).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { DEMO_MODELS, MODEL_INFO } from './demo-models.js';
import { getMaterialConfig, legacyMaterialKey, applyShopperChoices } from '../shared/effective-config.js';
import { createDecalLayer } from './decals.js';
import { createVariantSwitcher, demoVariantSource, gltfVariantSource, variantOf } from './material-variants.js';

// ── Environment presets (environmentPresets.ts) ──────────────────────────────
export const ENVIRONMENT_PRESETS = ['apartment', 'city', 'dawn', 'forest', 'lobby', 'night', 'park', 'studio', 'sunset', 'warehouse'];
export const ENVIRONMENT_PRESET_FILES = {
	apartment: 'lebombo_1k.hdr',
	city: 'potsdamer_platz_1k.hdr',
	dawn: 'kiara_1_dawn_1k.hdr',
	forest: 'forest_slope_1k.hdr',
	lobby: 'st_fagans_interior_1k.hdr',
	night: 'dikhololo_night_1k.hdr',
	park: 'rooitou_park_1k.hdr',
	studio: 'studio_small_03_1k.hdr',
	sunset: 'venice_sunset_1k.hdr',
	warehouse: 'empty_warehouse_01_1k.hdr',
};
export const resolvePresetFile = (preset) => ENVIRONMENT_PRESET_FILES[preset] || ENVIRONMENT_PRESET_FILES.studio;
const HDRI_BASE = 'hdri/';

// hdri-download: presets not on the server render as Studio, with no request for the missing file.
let presetAvailable = () => true;
const liveViewers = new Set();
export function setPresetAvailability(fn) {
	presetAvailable = fn;
	liveViewers.forEach((apply) => apply());
}

export const DEFAULT_FOV = 45;
export const FIT_DIRECTION = new THREE.Vector3(0.7, 0.5, 1).normalize();
export const GALLERY_DIRECTIONS = {
	perspective: new THREE.Vector3(0.7, 0.5, 1).normalize(),
	front: new THREE.Vector3(0, 0, 1),
	side: new THREE.Vector3(1, 0, 0),
	back: new THREE.Vector3(0.7, 0.5, -1).normalize(),
};
const SELECTION_COLOR = 0x1b5cf0;

// Built-in presets ship as RGBE-in-PNG (scripts/prototype-hdri.mjs) because the artifact
// host does not serve .hdr: each texel is two RGB pixels, mantissas then exponent.
async function decodeRgbePng(blob) {
	const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
	const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(bmp.width, bmp.height) : Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height });
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	ctx.drawImage(bmp, 0, 0);
	const px = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
	const width = bmp.width / 2, height = bmp.height;
	bmp.close?.();
	const data = new Uint16Array(width * height * 4);
	const one = THREE.DataUtils.toHalfFloat(1);
	for (let i = 0, n = width * height; i < n; i++) {
		const s = i * 8;
		const scale = Math.pow(2, px[s + 4] - 128) / 255;
		data[i * 4] = THREE.DataUtils.toHalfFloat(Math.min(px[s] * scale, 65504));
		data[i * 4 + 1] = THREE.DataUtils.toHalfFloat(Math.min(px[s + 1] * scale, 65504));
		data[i * 4 + 2] = THREE.DataUtils.toHalfFloat(Math.min(px[s + 2] * scale, 65504));
		data[i * 4 + 3] = one;
	}
	return { data, width, height, type: THREE.HalfFloatType };
}

// HDR files are decoded once per page and shared by every renderer.
const hdrCache = new Map();
function loadHdr(url) {
	if (!hdrCache.has(url)) {
		const packed = url.startsWith(HDRI_BASE) && url.endsWith('.hdr');
		const src = packed ? url.replace(/\.hdr$/, '.png') : url;
		// Plain fetch + parse: FileLoader's progress stream makes Chrome log a spurious ERR_ABORTED.
		const p = fetch(src)
			.then((r) => {
				if (!r.ok) throw new Error(`HDRI ${src} responded with ${r.status}`);
				return packed ? r.blob() : r.arrayBuffer();
			})
			.then(async (body) => {
				const d = packed ? await decodeRgbePng(body) : new RGBELoader().parse(body);
				const tex = new THREE.DataTexture(d.data, d.width, d.height, THREE.RGBAFormat, d.type);
				tex.colorSpace = THREE.LinearSRGBColorSpace;
				tex.minFilter = tex.magFilter = THREE.LinearFilter;
				tex.generateMipmaps = false;
				tex.flipY = true;
				tex.mapping = THREE.EquirectangularReflectionMapping;
				tex.needsUpdate = true;
				return tex;
			});
		p.catch(() => hdrCache.delete(url));
		hdrCache.set(url, p);
	}
	return hdrCache.get(url);
}

const round3 = (v) => Math.round(v * 1000) / 1000;
const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;
const DEG = Math.PI / 180;

function isShown(obj) {
	for (let o = obj; o; o = o.parent) if (!o.visible) return false;
	return true;
}

/** Copy material values; a physical clone keeps its PHYSICAL define when copied from a standard original. */
function copyMaterial(dst, src) {
	if (dst.isMeshPhysicalMaterial && !src.isMeshPhysicalMaterial) {
		THREE.MeshStandardMaterial.prototype.copy.call(dst, src);
		dst.defines = { STANDARD: '', PHYSICAL: '' };
		dst.clearcoat = 0;
		dst.clearcoatRoughness = 0;
	} else {
		dst.copy(src);
	}
	dst.needsUpdate = true;
	return dst;
}

function toPhysical(mat) {
	const p = new THREE.MeshPhysicalMaterial();
	return copyMaterial(p, mat);
}

function modelKey(model) {
	if (!model) return '';
	return model.demo ? 'demo:' + model.demo : model.url ? 'url:' + model.url : '';
}

// ── Contact shadows (port of drei <ContactShadows>) ─────────────────────────
class ContactShadows {
	constructor() {
		this.res = 512;
		this.rt = new THREE.WebGLRenderTarget(this.res, this.res);
		this.rtBlur = new THREE.WebGLRenderTarget(this.res, this.res);
		this.rt.texture.generateMipmaps = this.rtBlur.texture.generateMipmaps = false;
		this.group = new THREE.Group();
		this.group.name = 'wc3d-shadows';
		this.group.userData.isSystem = true;
		this.group.position.y = -0.01;
		const inner = new THREE.Group();
		inner.rotation.x = Math.PI / 2;
		this.group.add(inner);
		const plane = new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2);
		this.material = new THREE.MeshBasicMaterial({ map: this.rt.texture, transparent: true, depthWrite: false });
		this.mesh = new THREE.Mesh(plane, this.material);
		this.mesh.scale.set(1, -1, 1);
		this.mesh.rotation.x = -Math.PI / 2;
		this.mesh.renderOrder = 1;
		inner.add(this.mesh);
		this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1.5);
		inner.add(this.camera);
		this.blurPlane = new THREE.Mesh(plane);
		// Parentless on purpose: rendered on its own, in world XZ, facing the shadow camera.
		this.blurPlane.visible = false;
		this.depth = new THREE.MeshDepthMaterial();
		this.depth.depthTest = this.depth.depthWrite = false;
		this.depth.onBeforeCompile = (shader) => {
			shader.uniforms.ucolor = { value: new THREE.Color(0x000000) };
			shader.fragmentShader = shader.fragmentShader
				.replace('void main() {', 'uniform vec3 ucolor;\nvoid main() {')
				.replace('vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );');
		};
		this.hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
		this.vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
		this.hBlur.depthTest = this.vBlur.depthTest = false;
		this.blur = 2.2;
	}
	setSize(scale, far) {
		this.mesh.scale.set(scale, -scale, scale);
		this.blurPlane.scale.set(scale, 1, scale);
		Object.assign(this.camera, { left: -scale / 2, right: scale / 2, top: scale / 2, bottom: -scale / 2, far });
		this.camera.updateProjectionMatrix();
	}
	blurPass(renderer, blur) {
		this.blurPlane.visible = true;
		this.blurPlane.material = this.hBlur;
		this.hBlur.uniforms.tDiffuse.value = this.rt.texture;
		this.hBlur.uniforms.h.value = blur / 256;
		renderer.setRenderTarget(this.rtBlur);
		renderer.render(this.blurPlane, this.camera);
		this.blurPlane.material = this.vBlur;
		this.vBlur.uniforms.tDiffuse.value = this.rtBlur.texture;
		this.vBlur.uniforms.v.value = blur / 256;
		renderer.setRenderTarget(this.rt);
		renderer.render(this.blurPlane, this.camera);
		this.blurPlane.visible = false;
	}
	update(renderer, scene, hide) {
		if (!this.group.visible) return;
		const bg = scene.background;
		const ov = scene.overrideMaterial;
		scene.updateMatrixWorld();
		const hidden = hide.filter((o) => o && o.visible);
		hidden.forEach((o) => (o.visible = false));
		this.mesh.visible = false;
		scene.background = null;
		scene.overrideMaterial = this.depth;
		const clear = renderer.getClearAlpha();
		renderer.setClearAlpha(0);
		renderer.setRenderTarget(this.rt);
		renderer.clear();
		renderer.render(scene, this.camera);
		this.blurPass(renderer, this.blur);
		this.blurPass(renderer, this.blur * 0.4);
		renderer.setRenderTarget(null);
		renderer.setClearAlpha(clear);
		scene.overrideMaterial = ov;
		scene.background = bg;
		this.mesh.visible = true;
		hidden.forEach((o) => (o.visible = true));
	}
	dispose() {
		this.rt.dispose();
		this.rtBlur.dispose();
		this.material.dispose();
		this.depth.dispose();
		this.hBlur.dispose();
		this.vBlur.dispose();
		this.mesh.geometry.dispose();
	}
}

/**
 * createViewer(container, {config, model, custom, interactive, editor, background, offscreen, width, height, loadDelay})
 */
export function createViewer(container, opts = {}) {
	const offscreen = !!opts.offscreen;
	const interactive = opts.interactive !== false && !offscreen;
	const listeners = new Map();
	const emit = (name, payload) => (listeners.get(name) || []).slice().forEach((cb) => cb(payload));

	// DOM
	const root = document.createElement('div');
	root.className = 'wc3d-engine';
	root.style.cssText = 'position:absolute;inset:0;overflow:hidden;';
	if (!offscreen && container) {
		if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
		container.appendChild(root);
	}

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1;
	renderer.setClearColor(0x000000, 0);
	const canvas = renderer.domElement;
	canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none;' + (interactive ? 'touch-action:none;' : '');
	root.appendChild(canvas);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(DEFAULT_FOV, 1, 0.01, 100);
	camera.position.set(0, 0, 5);

	const controls = new OrbitControls(camera, canvas);
	controls.enableDamping = true;
	controls.autoRotateSpeed = 1.5;
	controls.enabled = interactive;

	const ambient = new THREE.AmbientLight(0xffffff, 0.4);
	const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
	keyLight.position.set(5, 10, 5);
	scene.add(ambient, keyLight);

	const shadows = new ContactShadows();
	scene.add(shadows.group);

	const grid = new THREE.GridHelper(30, 30, '#888888', '#cccccc');
	grid.name = 'wc3d-grid';
	grid.userData.isSystem = true;
	grid.visible = false;
	scene.add(grid);

	const floorMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 });
	const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMat);
	floor.name = 'wc3d-floor';
	floor.userData.isSystem = true;
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = -0.012;
	floor.visible = false;
	scene.add(floor);
	let reflector = null;

	const pmrem = new THREE.PMREMGenerator(renderer);
	const envTargets = new Map();

	const holder = new THREE.Group();
	holder.name = 'wc3d-model-holder';
	scene.add(holder);

	// State
	let width = opts.width || 1;
	let height = opts.height || 1;
	let disposed = false;
	let modelRoot = null; // built/loaded scene (named nodes)
	let modelWrap = null; // grounding wrapper
	let currentKey = '';
	let modelInfo = null;
	let clips = [];
	let mixer = null;
	let activeAction = null;
	let animKey = '';
	const meshMap = new Map();
	const originals = new Map();
	const originalTransforms = new Map();
	const clones = new Map();
	const usedClones = new Set();
	const textureCache = new Map();
	const variants = createVariantSwitcher({ originals }); // materials-variants
	let config = opts.config || null;
	let custom = opts.custom || null;
	let appliedCameraKey = null;
	let home = null; // {position, target}
	let envKey = '';
	let envPromise = Promise.resolve();
	let modelPromise = Promise.resolve(null);
	let modelGen = 0;
	let selection = [];
	let selectionHelpers = [];
	let outline = true;
	let autoRotate = false;
	let tween = null;
	let dirty = true;
	let rafId = 0;
	let onScreen = true;
	let bgCss = '';
	const clock = new THREE.Clock();

	// ── Loop ──────────────────────────────────────────────────────────────────
	function invalidate() {
		dirty = true;
		if (offscreen || disposed || rafId || !onScreen) return;
		rafId = requestAnimationFrame(frame);
	}

	function render() {
		if (disposed) return;
		selectionHelpers.forEach((h) => h.update());
		if (shadows.group.visible) shadows.update(renderer, scene, [floor, grid, reflector, ...selectionHelpers]);
		renderer.render(scene, camera);
		dirty = false;
		emit('camera');
	}

	function frame() {
		rafId = 0;
		if (disposed) return;
		const dt = Math.min(clock.getDelta(), 0.25);
		let keep = false;
		if (tween) keep = stepTween() || keep;
		if (controls.update()) keep = true;
		if (autoRotate) keep = true;
		if (mixer && activeAction && activeAction.isRunning()) {
			mixer.update(dt);
			keep = true;
		}
		if (dirty || keep) render();
		if (keep && onScreen) rafId = requestAnimationFrame(frame);
	}

	controls.addEventListener('change', invalidate);
	controls.addEventListener('start', () => {
		cancelTween();
		invalidate();
	});

	// ── Sizing ────────────────────────────────────────────────────────────────
	function pixelRatio() {
		const opt = config?.optimization || {};
		const dpr = window.devicePixelRatio || 1;
		if (opt.gpuPerformanceMode === 'low-power') return 1;
		if (isMobile()) return Math.min(dpr, typeof opt.pixelRatioLimit === 'number' ? opt.pixelRatioLimit : 1.5);
		return Math.min(Math.max(dpr, 1), 2);
	}

	function setSize(w, h) {
		width = Math.max(1, Math.round(w));
		height = Math.max(1, Math.round(h));
		renderer.setPixelRatio(offscreen ? 1 : pixelRatio());
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		if (reflector) reflector.getRenderTarget().setSize(Math.round(width * 0.75), Math.round(height * 0.75));
		invalidate();
	}

	let ro = null;
	let io = null;
	if (!offscreen && container) {
		const r = container.getBoundingClientRect();
		setSize(r.width || 300, r.height || 300);
		ro = new ResizeObserver((entries) => {
			const box = entries[0].contentRect;
			if (box.width && box.height) setSize(box.width, box.height);
		});
		ro.observe(container);
		io = new IntersectionObserver((entries) => {
			onScreen = entries[entries.length - 1].isIntersecting;
			if (onScreen) {
				clock.getDelta();
				invalidate();
			}
		});
		io.observe(container);
	} else {
		setSize(width, height);
	}

	const onVisibility = () => {
		if (!document.hidden) {
			clock.getDelta();
			invalidate();
		}
	};
	document.addEventListener('visibilitychange', onVisibility);

	// ── Camera ────────────────────────────────────────────────────────────────
	function modelBox() {
		const box = new THREE.Box3();
		if (modelWrap) {
			modelWrap.updateMatrixWorld(true);
			box.setFromObject(modelWrap);
		}
		return box;
	}

	function fitBounds() {
		const box = modelBox();
		if (box.isEmpty()) return null;
		const sphere = box.getBoundingSphere(new THREE.Sphere());
		const radius = Math.max(sphere.radius, 0.01);
		const halfV = (camera.fov * Math.PI) / 360;
		const aspect = Number.isFinite(camera.aspect) && camera.aspect > 0 ? camera.aspect : 1;
		const half = Math.min(halfV, Math.atan(Math.tan(halfV) * aspect));
		return { center: sphere.center.clone(), radius, dist: (radius / Math.sin(half)) * 1.1 };
	}

	function applyLock(lock) {
		controls.enableRotate = lock?.rotate !== false;
		controls.enableZoom = lock?.zoom !== false;
		controls.enablePan = lock?.pan !== false;
		const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
		controls.minPolarAngle = n(lock?.minPolarAngle) !== undefined ? lock.minPolarAngle * DEG : 0;
		controls.maxPolarAngle = n(lock?.maxPolarAngle) !== undefined ? lock.maxPolarAngle * DEG : Math.PI;
		controls.minAzimuthAngle = n(lock?.minAzimuthAngle) !== undefined ? lock.minAzimuthAngle * DEG : -Infinity;
		controls.maxAzimuthAngle = n(lock?.maxAzimuthAngle) !== undefined ? lock.maxAzimuthAngle * DEG : Infinity;
		controls.minDistance = n(lock?.minDistance) ?? 0;
		controls.maxDistance = n(lock?.maxDistance) ?? Infinity;
	}

	/** AutoFitCamera: saved view if position+target, else bounds fit. Sets the orbit "home". */
	function fitCamera() {
		const cam = config?.camera || null;
		const fov = typeof cam?.fov === 'number' && Number.isFinite(cam.fov) ? Math.min(179, Math.max(1, cam.fov)) : DEFAULT_FOV;
		camera.fov = fov;
		camera.updateProjectionMatrix();
		const hasView = Array.isArray(cam?.position) && cam.position.length === 3 && Array.isArray(cam?.target) && cam.target.length === 3;
		let centre;
		let dist;
		if (hasView) {
			camera.position.fromArray(cam.position.map(Number));
			centre = new THREE.Vector3().fromArray(cam.target.map(Number));
			dist = camera.position.distanceTo(centre);
		} else {
			const b = fitBounds();
			if (!b) return;
			centre = b.center;
			dist = b.dist;
			camera.position.copy(centre).addScaledVector(FIT_DIRECTION, dist);
		}
		cancelTween();
		camera.lookAt(centre);
		camera.near = Math.max(0.001, dist * 0.005);
		camera.far = dist * 50;
		camera.updateProjectionMatrix();
		controls.target.copy(centre);
		controls.update();
		controls.saveState();
		home = { position: camera.position.clone(), target: centre.clone() };
		invalidate();
	}

	function cancelTween() {
		tween = null;
	}

	function stepTween() {
		const t = Math.min((performance.now() - tween.start) / tween.duration, 1);
		const e = 1 - Math.pow(1 - t, 3);
		controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
		if (tween.toPosition) camera.position.lerpVectors(tween.fromPos, tween.toPosition, e);
		else camera.position.copy(controls.target).add(tween.offset);
		if (tween.toFov != null) {
			camera.fov = tween.fromFov + (tween.toFov - tween.fromFov) * e;
			camera.updateProjectionMatrix();
		}
		controls.update();
		dirty = true;
		if (t >= 1) tween = null;
		return true;
	}

	function startTween(toPosition, toTarget, duration = 600, toFov = null) {
		tween = {
			start: performance.now(),
			duration,
			fromPos: camera.position.clone(),
			fromTarget: controls.target.clone(),
			offset: new THREE.Vector3().subVectors(camera.position, controls.target),
			toPosition,
			toTarget,
			fromFov: camera.fov,
			toFov,
		};
		if (offscreen) {
			tween.start -= duration;
			stepTween();
		}
		invalidate();
	}

	// ── Environment (SceneEnvironment.tsx) ────────────────────────────────────
	function envTarget(key, build) {
		if (!envTargets.has(key)) envTargets.set(key, build());
		return envTargets.get(key);
	}

	function roomEnvironment() {
		return envTarget('room', () => {
			const room = new RoomEnvironment(renderer);
			const rt = pmrem.fromScene(room, 0.04);
			room.dispose?.();
			return { rt, equirect: null };
		});
	}

	async function loadEnv(url) {
		const tex = await loadHdr(url);
		return envTarget(url, () => ({ rt: pmrem.fromEquirectangular(tex), equirect: tex }));
	}

	function applyEnvironment() {
		const env = config?.environment || null;
		const opt = config?.optimization || null;
		const mobile = isMobile();
		const disableShadows = !!(mobile && opt?.mobileDisableShadows);
		const disableReflection = !!(mobile && opt?.mobileDisableReflection);

		const preset = env?.preset || 'studio';
		const intensity = env && env.intensity !== undefined ? Number(env.intensity) : 1;
		const isEnvBg = env?.backgroundType === 'preset' || env?.backgroundType === 'custom';
		const blur = Number(env?.backgroundBlur) || 0;
		ambient.intensity = intensity * 0.4;
		keyLight.intensity = intensity * 0.8;

		// Shadows
		const shadowsOn = env ? env.shadowsEnabled !== false && !disableShadows : !disableShadows;
		shadows.group.visible = shadowsOn;
		shadows.material.opacity = env ? (env.shadowIntensity !== undefined ? Number(env.shadowIntensity) : 0.6) : 0.5;
		shadows.blur = env ? 2.2 : 2;

		// Floor & grid
		grid.visible = !!env?.floorGridEnabled;
		floor.visible = !!env?.floorEnabled;
		floorMat.color.set(env?.floorColor || '#ffffff');
		floorMat.roughness = env?.floorRoughness !== undefined ? Number(env.floorRoughness) : 1;
		floorMat.metalness = env?.floorMetalness !== undefined ? Number(env.floorMetalness) : 0;
		const wantReflect = floor.visible && !!env?.floorReflection && !disableReflection;
		if (wantReflect && !reflector) {
			reflector = new Reflector(new THREE.PlaneGeometry(50, 50), {
				textureWidth: Math.round(width * 0.75),
				textureHeight: Math.round(height * 0.75),
				clipBias: 0.003,
				color: 0x888888,
			});
			reflector.name = 'wc3d-floor-reflector';
			reflector.userData.isSystem = true;
			reflector.rotation.x = -Math.PI / 2;
			reflector.position.y = -0.0125;
			scene.add(reflector);
		}
		if (reflector) reflector.visible = wantReflect;
		floorMat.transparent = wantReflect;
		floorMat.opacity = wantReflect ? 0.85 : 1;
		floorMat.needsUpdate = true;

		// Background (wrapper CSS, or the HDRI itself for preset/custom)
		const type = env?.backgroundType || 'transparent';
		let css = '';
		if (isEnvBg) css = '';
		else if (type === 'transparent') css = opts.background || 'transparent';
		else if (type === 'color') css = env.backgroundColor || '#ffffff';
		else if (type === 'image') css = env.backgroundImageUrl ? `url("${env.backgroundImageUrl}") center / cover no-repeat, #e7e1d8` : opts.background && opts.background !== 'transparent' ? opts.background : '#f1f5f9';
		else css = '#111';
		bgCss = css;
		root.style.background = css;
		scene.backgroundBlurriness = blur;

		// Environment map
		const url = preset === 'custom' && env?.customHdriUrl ? env.customHdriUrl : HDRI_BASE + resolvePresetFile(presetAvailable(preset) ? preset : 'studio');
		const key = url + '|' + isEnvBg;
		if (key !== envKey) {
			envKey = key;
			const mine = key;
			const fallbackUrl = HDRI_BASE + resolvePresetFile('studio');
			envPromise = loadEnv(url)
				.catch((err) => {
					if (url === fallbackUrl) throw err;
					console.warn('[wc-3d-model-viewer] Failed to load HDRI, falling back to the default studio preset:', url);
					return loadEnv(fallbackUrl);
				})
				.catch(() => roomEnvironment())
				.then((entry) => {
					if (disposed || envKey !== mine) return;
					scene.environment = entry.rt.texture;
					scene.background = isEnvBg ? entry.equirect || entry.rt.texture : null;
					invalidate();
				});
		} else if (scene.environment) {
			const entry = [...envTargets.values()].find((e) => e.rt.texture === scene.environment);
			scene.background = isEnvBg && entry ? entry.equirect || entry.rt.texture : null;
		}
		invalidate();
	}

	// ── Mesh / material config (ModelController.ts) ───────────────────────────
	function restoreAll() {
		for (const [name, orig] of originals) {
			const mesh = meshMap.get(name);
			if (!mesh) continue;
			mesh.visible = orig.visible;
			if (orig.material) mesh.material = orig.material;
		}
	}

	const disposeSlot = (slot) => (Array.isArray(slot) ? slot : [slot]).forEach((m) => m?.dispose());

	/** Per-mesh clone of the original material, reset to the original once per apply pass. */
	function uniqueMaterial(mesh, physical = false) {
		const orig = originals.get(mesh.name)?.material;
		if (!orig) return null;
		const first = (slot) => (Array.isArray(slot) ? slot[0] : slot);
		let slot = clones.get(mesh.name);
		if (slot && physical && !Array.isArray(slot) && !slot.isMeshPhysicalMaterial) {
			const p = toPhysical(slot);
			slot.dispose();
			slot = p;
			clones.set(mesh.name, slot);
			if (usedClones.has(mesh.name)) mesh.material = slot;
		}
		if (!slot) {
			if (Array.isArray(orig)) slot = orig.map((m) => m.clone());
			else slot = physical && !orig.isMeshPhysicalMaterial ? toPhysical(orig) : orig.clone();
			clones.set(mesh.name, slot);
		} else if (!usedClones.has(mesh.name)) {
			if (Array.isArray(slot) && Array.isArray(orig)) slot.forEach((m, i) => copyMaterial(m, orig[i]));
			else if (!Array.isArray(slot) && !Array.isArray(orig)) copyMaterial(slot, orig);
		}
		usedClones.add(mesh.name);
		mesh.material = slot;
		return first(slot);
	}

	function loadTexture(url) {
		if (!textureCache.has(url)) {
			textureCache.set(
				url,
				new THREE.TextureLoader().loadAsync(url).then((tex) => {
					tex.colorSpace = THREE.SRGBColorSpace;
					tex.flipY = false;
					return tex;
				})
			);
		}
		return textureCache.get(url);
	}

	let matGen = 0;
	function applyMaterials() {
		if (!modelRoot) return Promise.resolve();
		const cfg = applyShopperChoices(config || { schema_version: 1 }, custom);
		// materials-variants: the variant becomes the meshes' base; a clone of the old base is re-made.
		for (const name of variants.sync(variantOf(cfg), () => !disposed && applyMaterials())) {
			if (clones.has(name)) disposeSlot(clones.get(name));
			clones.delete(name);
		}
		restoreAll();
		usedClones.clear();
		matGen++;
		const gen = matGen;
		const pending = [];

		for (const [name, mc] of Object.entries(cfg.meshes || {})) {
			const mesh = meshMap.get(name);
			if (!mesh || !mc) continue;
			if (mc.visible !== undefined) mesh.visible = !!mc.visible;
			if (mc.color || mc.texture?.url) {
				const mat = uniqueMaterial(mesh);
				if (mc.color && mat.color) {
					mat.color.set(mc.color);
					if (!mc.texture?.url) mat.map = null;
				}
				if (mc.texture?.url) {
					pending.push(
						loadTexture(mc.texture.url)
							.then((tex) => {
								if (disposed || gen !== matGen) return;
								mat.map = tex;
								mat.needsUpdate = true;
								invalidate();
							})
							.catch(() => {})
					);
				}
			}
		}

		if (cfg.materials) {
			const names = [...meshMap.keys()];
			const targets = new Set();
			let legacy = null;
			for (const key of Object.keys(cfg.materials)) {
				if (meshMap.has(key)) {
					targets.add(key);
					continue;
				}
				if (!legacy) {
					legacy = new Map();
					for (const n of names) if (!legacy.has(legacyMaterialKey(n))) legacy.set(legacyMaterialKey(n), n);
				}
				if (legacy.has(key)) targets.add(legacy.get(key));
			}
			for (const name of targets) {
				const mc = getMaterialConfig(cfg.materials, name, names);
				const mesh = meshMap.get(name);
				if (!mc || !mesh) continue;
				if (!mc.baseColor && mc.metalness === undefined && mc.roughness === undefined && mc.clearcoat === undefined) continue;
				const mat = uniqueMaterial(mesh, mc.clearcoat !== undefined);
				if (mc.baseColor && mat.color) {
					mat.color.set(mc.baseColor);
					if (!cfg.meshes?.[name]?.texture?.url) mat.map = null;
				}
				if (mc.metalness !== undefined) mat.metalness = Number(mc.metalness);
				if (mc.roughness !== undefined) mat.roughness = Number(mc.roughness);
				if (mc.clearcoat !== undefined && 'clearcoat' in mat) mat.clearcoat = Number(mc.clearcoat);
				mat.needsUpdate = true;
			}
		}

		for (const [name, slot] of clones) {
			if (usedClones.has(name)) continue;
			disposeSlot(slot);
			clones.delete(name);
		}
		decals.sync(cfg);
		refreshSelection();
		invalidate();
		return Promise.all(pending);
	}

	// ── Animations (ModelAnimator.tsx) ────────────────────────────────────────
	function restorePose() {
		for (const [obj, t] of originalTransforms) {
			obj.position.copy(t.position);
			obj.quaternion.copy(t.quaternion);
			obj.scale.copy(t.scale);
		}
	}

	function playClip(name, { loop = true, speed = 1 } = {}) {
		if (!mixer) return false;
		const clip = clips.find((c) => c.name === name);
		if (!clip) return false;
		const action = mixer.clipAction(clip);
		action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
		action.clampWhenFinished = !loop;
		action.setEffectiveTimeScale(typeof speed === 'number' ? speed : 1);
		action.paused = false;
		if (activeAction && activeAction !== action) {
			action.reset().play();
			action.crossFadeFrom(activeAction, 0.2, true);
		} else if (!action.isRunning()) {
			action.reset().play();
		}
		activeAction = action;
		clock.getDelta();
		invalidate();
		return true;
	}

	function stopClips() {
		if (!mixer) return;
		mixer.stopAllAction();
		activeAction = null;
		const pose = clips.find((c) => c.name === 'Standing') || clips.find((c) => c.name === 'Idle') || clips.find((c) => c.name === 'idle') || clips.find((c) => c.name === 'standing');
		if (pose) {
			const a = mixer.clipAction(pose);
			a.reset().play();
			a.paused = true;
			mixer.update(0);
		} else {
			restorePose();
		}
		invalidate();
	}

	function applyAnimations() {
		const a = config?.animations || null;
		const key = currentKey + JSON.stringify(a || null);
		if (key === animKey) return;
		animKey = key;
		if (a?.autoplay && clips.some((c) => c.name === a.autoplay)) playClip(a.autoplay, { loop: a.loop !== false, speed: typeof a.speed === 'number' ? a.speed : 1 });
		else stopClips();
	}

	// ── Selection ────────────────────────────────────────────────────────────
	function refreshSelection() {
		selectionHelpers.forEach((h) => {
			scene.remove(h);
			h.geometry.dispose();
			h.material.dispose();
		});
		selectionHelpers = [];
		if (!outline || !modelRoot) return;
		for (const name of selection) {
			const obj = modelRoot.getObjectByName(name);
			if (!obj) continue;
			const helper = new THREE.BoxHelper(obj, SELECTION_COLOR);
			helper.name = 'wc3d-selection';
			helper.userData.isSystem = true;
			helper.renderOrder = 10;
			scene.add(helper);
			selectionHelpers.push(helper);
		}
		invalidate();
	}

	// ── Model loading ─────────────────────────────────────────────────────────
	function disposeModel() {
		if (!modelWrap) return;
		variants.reset();
		decals.clear();
		holder.remove(modelWrap);
		const isUrl = currentKey.startsWith('url:');
		modelWrap.traverse((o) => {
			if (!o.isMesh) return;
			o.geometry?.dispose();
		});
		for (const orig of originals.values()) {
			(Array.isArray(orig.material) ? orig.material : [orig.material]).forEach((m) => {
				if (!m) return;
				if (isUrl) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) m[k]?.dispose?.();
				m.dispose();
			});
		}
		clones.forEach(disposeSlot);
		clones.clear();
		usedClones.clear();
		meshMap.clear();
		originals.clear();
		originalTransforms.clear();
		mixer?.stopAllAction();
		mixer = null;
		activeAction = null;
		clips = [];
		modelRoot = modelWrap = null;
		animKey = '';
		refreshSelection();
	}

	function statsOf(obj) {
		let triangles = 0;
		let vertices = 0;
		const mats = new Set();
		const texs = new Set();
		obj.traverse((o) => {
			if (!o.isMesh) return;
			const g = o.geometry;
			const pos = g.attributes.position;
			vertices += pos ? pos.count : 0;
			triangles += g.index ? g.index.count / 3 : pos ? pos.count / 3 : 0;
			(Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
				if (!m) return;
				mats.add(m.name || m.uuid);
				for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) if (m[k]) texs.add(m[k].uuid);
			});
		});
		return { triangles: Math.round(triangles), vertices, materials: [...mats], textures: texs.size };
	}

	function hierarchyOf(obj) {
		const node = { name: obj.name };
		if (obj.isMesh) node.mesh = obj.name;
		if (obj.children.length) node.children = obj.children.map(hierarchyOf);
		return node;
	}

	function attach(built, info) {
		modelRoot = built.scene;
		modelRoot.userData.isModel = true;
		clips = built.animations || [];
		modelWrap = new THREE.Group();
		modelWrap.name = 'wc3d-model';
		modelWrap.add(modelRoot);
		holder.add(modelWrap);
		// Centre on X/Z and rest on Y = 0 (computeGroundOffset).
		modelWrap.updateMatrixWorld(true);
		const box = new THREE.Box3().setFromObject(modelRoot);
		if (!box.isEmpty()) {
			const c = box.getCenter(new THREE.Vector3());
			modelWrap.position.set(-c.x, -box.min.y, -c.z);
		}
		modelRoot.traverse((o) => {
			originalTransforms.set(o, { position: o.position.clone(), quaternion: o.quaternion.clone(), scale: o.scale.clone() });
			if (o.isMesh && o.name) {
				meshMap.set(o.name, o);
				originals.set(o.name, { visible: o.visible, material: o.material });
			}
		});
		mixer = clips.length ? new THREE.AnimationMixer(modelRoot) : null;
		variants.attach(built.variants || null);
		// Shadow plane follows the model footprint.
		const size = modelBox().getSize(new THREE.Vector3());
		const foot = Math.max(size.x, size.z);
		shadows.setSize(Math.min(10, Math.max(foot * 2.4, 0.5)), Math.min(1.5, Math.max(size.y * 1.6, 0.25)));
		modelInfo = {
			...info,
			meshes: [...meshMap.keys()],
			clips: clips.map((c) => ({ name: c.name, duration: Math.round(c.duration * 10) / 10 })),
			animations: clips.map((c) => c.name),
			hierarchy: modelRoot.children.map(hierarchyOf),
			variants: variants.list(),
		};
		return modelInfo;
	}

	function setModel(model, { force = false } = {}) {
		const key = modelKey(model);
		if (key === currentKey && !force) return modelPromise;
		const gen = ++modelGen;
		disposeModel();
		currentKey = key;
		modelInfo = null;
		appliedCameraKey = null;
		invalidate();
		if (!model || !key) {
			modelPromise = Promise.resolve(null);
			return modelPromise;
		}
		emit('progress', 0);
		const finish = (built, info) => {
			if (disposed || gen !== modelGen) return null;
			const out = attach(built, info);
			const tex = applyMaterials();
			applyAnimations();
			fitCamera();
			appliedCameraKey = cameraKey();
			emit('progress', 100);
			return tex.then(() => {
				if (disposed || gen !== modelGen) return null;
				invalidate();
				emit('ready', out);
				return out;
			});
		};
		if (model.demo) {
			const def = DEMO_MODELS[model.demo];
			if (!def) {
				const err = new Error(`Unknown demo model "${model.demo}"`);
				emit('error', err);
				modelPromise = Promise.resolve(null);
				return modelPromise;
			}
			const delay = Number(opts.loadDelay) || 0;
			modelPromise = new Promise((resolve) => {
				if (!delay) return resolve();
				const t0 = performance.now();
				const tick = () => {
					if (disposed || gen !== modelGen) return resolve();
					const p = Math.min(1, (performance.now() - t0) / delay);
					emit('progress', Math.round(p * 99));
					if (p < 1) setTimeout(tick, 60);
					else resolve();
				};
				tick();
			}).then(() => {
				if (disposed || gen !== modelGen) return null;
				const info = MODEL_INFO[model.demo];
				return finish({ ...def.build(THREE), variants: demoVariantSource(model.demo) }, { ...info, materials: info.materials.slice() });
			});
			return modelPromise;
		}
		modelPromise = new Promise((resolve) => {
			new GLTFLoader().load(
				model.url,
				(gltf) => {
					if (disposed || gen !== modelGen) return resolve(null);
					const stats = statsOf(gltf.scene);
					resolve(finish({ scene: gltf.scene, animations: gltf.animations, variants: gltfVariantSource(gltf) }, { ...stats, sizeBytes: model.sizeBytes || 0 }));
				},
				(e) => {
					if (gen === modelGen && e.total) emit('progress', Math.min(99, Math.round((e.loaded / e.total) * 100)));
				},
				(err) => {
					if (gen !== modelGen) return resolve(null);
					console.error('[wc-3d-model-viewer] Model failed to load:', err);
					emit('error', err);
					resolve(null);
				}
			);
		});
		return modelPromise;
	}

	// ── Config ────────────────────────────────────────────────────────────────
	function cameraKey() {
		const c = config?.camera || {};
		return JSON.stringify([c.position || null, c.target || null, c.fov ?? null, currentKey]);
	}

	function setConfig(next) {
		config = next || null;
		applyLock(config?.camera?.lock);
		applyEnvironment();
		if (!offscreen && pixelRatio() !== renderer.getPixelRatio()) setSize(width, height);
		if (modelRoot) {
			applyMaterials();
			applyAnimations();
			const k = cameraKey();
			if (k !== appliedCameraKey) {
				appliedCameraKey = k;
				fitCamera();
			}
		}
		invalidate();
	}

	// ── Picking ───────────────────────────────────────────────────────────────
	const raycaster = new THREE.Raycaster();
	const ndc = new THREE.Vector2();
	function pickables() {
		const out = [];
		modelRoot?.traverse((o) => {
			if (o.isMesh && isShown(o)) out.push(o);
		});
		return out;
	}
	function pick(clientX, clientY) {
		if (!modelRoot) return null;
		const r = canvas.getBoundingClientRect();
		ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
		raycaster.setFromCamera(ndc, camera);
		return raycaster.intersectObjects(pickables(), false)[0] || null;
	}

	let down = null;
	const onDown = (e) => {
		down = { x: e.clientX, y: e.clientY, button: e.button };
	};
	const onUp = (e) => {
		if (!down) return;
		const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
		const btn = down.button;
		down = null;
		if (moved > 5 || btn !== 0 || !(listeners.get('select') || []).length) return;
		const hit = pick(e.clientX, e.clientY);
		const additive = e.shiftKey || e.metaKey || e.ctrlKey;
		if (!hit) return emit('select', { mesh: null, additive });
		const local = hit.object.worldToLocal(hit.point.clone());
		emit('select', { mesh: hit.object.name, additive, point: local.toArray().map(round3), worldPoint: hit.point.toArray().map(round3) });
	};
	let hoverRaf = 0;
	const onMove = (e) => {
		if (!opts.editor || down || hoverRaf) return;
		hoverRaf = requestAnimationFrame(() => {
			hoverRaf = 0;
			canvas.style.cursor = pick(e.clientX, e.clientY) ? 'pointer' : '';
		});
	};
	if (interactive) {
		canvas.addEventListener('pointerdown', onDown);
		canvas.addEventListener('pointerup', onUp);
		canvas.addEventListener('pointermove', onMove);
	}

	// ── Projection (hotspots) ────────────────────────────────────────────────
	const tmp = new THREE.Vector3();
	function worldPoint(meshName, offset) {
		if (!modelRoot) return null;
		const anchor = meshName ? modelRoot.getObjectByName(meshName) : modelRoot;
		if (!anchor) return null;
		anchor.updateWorldMatrix(true, false);
		const [x = 0, y = 0, z = 0] = offset || [];
		return { point: new THREE.Vector3(Number(x) || 0, Number(y) || 0, Number(z) || 0).applyMatrix4(anchor.matrixWorld), anchor };
	}

	function project(meshName, offset) {
		const wp = worldPoint(meshName, offset);
		if (!wp) return { x: 0, y: 0, visible: false, occluded: false };
		tmp.copy(wp.point).project(camera);
		const behind = tmp.z > 1 || tmp.z < -1;
		const x = (tmp.x * 0.5 + 0.5) * width;
		const y = (-tmp.y * 0.5 + 0.5) * height;
		const inView = x >= -20 && y >= -20 && x <= width + 20 && y <= height + 20;
		let occluded = false;
		if (!behind) {
			const dir = new THREE.Vector3().subVectors(wp.point, camera.position);
			const dist = dir.length();
			raycaster.set(camera.position, dir.normalize());
			const hit = raycaster.intersectObjects(pickables(), false)[0];
			occluded = !!hit && hit.distance < dist - Math.max(0.01, dist * 0.01);
		}
		return { x, y, visible: !behind && inView && isShown(wp.anchor), occluded, behind };
	}

	// ── Screenshot ───────────────────────────────────────────────────────────
	function screenshot({ width: w, height: h, maxSide, type = 'image/png', quality = 0.92, background } = {}) {
		render();
		const src = canvas;
		let ow = src.width;
		let oh = src.height;
		if (w && h) {
			ow = w;
			oh = h;
		} else if (maxSide) {
			const s = Math.min(1, maxSide / Math.max(src.width, src.height, 1));
			ow = Math.max(1, Math.round(src.width * s));
			oh = Math.max(1, Math.round(src.height * s));
		}
		const out = document.createElement('canvas');
		out.width = ow;
		out.height = oh;
		const ctx = out.getContext('2d');
		const env = config?.environment;
		const fill = background || (env?.backgroundType === 'color' ? env.backgroundColor || '#ffffff' : type === 'image/png' ? null : '#ffffff');
		if (fill) {
			ctx.fillStyle = fill;
			ctx.fillRect(0, 0, ow, oh);
		}
		// cover-crop into the requested box
		const s = Math.max(ow / src.width, oh / src.height);
		const dw = src.width * s;
		const dh = src.height * s;
		ctx.drawImage(src, (ow - dw) / 2, (oh - dh) / 2, dw, dh);
		return out.toDataURL(type, quality);
	}

	// decals (planned): customer text/image projected on merchant-picked areas.
	const decals = createDecalLayer({ THREE, camera, canvas, getMesh: (n) => meshMap.get(n), pick, invalidate });

	// ── Public controller ─────────────────────────────────────────────────────
	const api = {
		decals,
		canvas,
		/** Raw three.js objects, for prototyping features the API does not cover yet. */
		three: { THREE, scene, camera, renderer, controls, shadows, get model() { return modelRoot; } },
		get element() {
			return root;
		},
		setModel,
		setConfig,
		setCustom(next) {
			custom = next || null;
			applyMaterials();
		},
		getConfig: () => config,
		setCamera({ position, target, fov } = {}, { animate = true, duration = 600 } = {}) {
			const toT = target ? new THREE.Vector3().fromArray(target.map(Number)) : controls.target.clone();
			const toP = position ? new THREE.Vector3().fromArray(position.map(Number)) : null;
			const toF = typeof fov === 'number' ? Math.min(179, Math.max(1, fov)) : null;
			if (!animate) {
				cancelTween();
				controls.target.copy(toT);
				if (toP) camera.position.copy(toP);
				if (toF != null) {
					camera.fov = toF;
					camera.updateProjectionMatrix();
				}
				controls.update();
				invalidate();
				return;
			}
			startTween(toP, toT, duration, toF);
		},
		getCamera() {
			const p = camera.position;
			const t = controls.target;
			return {
				position: [p.x, p.y, p.z],
				target: [t.x, t.y, t.z],
				fov: camera.fov,
				distance: p.distanceTo(t),
				polar: controls.getPolarAngle() / DEG,
				azimuth: controls.getAzimuthalAngle() / DEG,
			};
		},
		resetCamera({ animate = true } = {}) {
			if (!home) return fitCamera();
			if (animate) startTween(home.position.clone(), home.target.clone(), 500);
			else {
				camera.position.copy(home.position);
				controls.target.copy(home.target);
				controls.update();
				invalidate();
			}
		},
		/** Re-run the auto-fit / saved-view framing (editor "Reset View"). */
		refit() {
			fitCamera();
		},
		/** Auto-generated gallery view: bounds centre + direction × fit distance. */
		getAutoView(name = 'perspective') {
			const b = fitBounds();
			if (!b) return null;
			const dir = GALLERY_DIRECTIONS[name] || FIT_DIRECTION;
			const pos = b.center.clone().addScaledVector(dir, b.dist);
			return { position: pos.toArray().map(round3), target: b.center.toArray().map(round3) };
		},
		zoom(dir) {
			const factor = dir > 0 ? 0.85 : 1.18;
			cancelTween();
			const offset = new THREE.Vector3().subVectors(camera.position, controls.target).multiplyScalar(factor);
			camera.position.copy(controls.target).add(offset);
			controls.update();
			invalidate();
		},
		setAutoRotate(on) {
			autoRotate = !!on;
			controls.autoRotate = autoRotate;
			clock.getDelta();
			invalidate();
		},
		getAutoRotate: () => autoRotate,
		playAnimation(name, o = {}) {
			animKey = '';
			return playClip(name, o);
		},
		stopAnimation() {
			animKey = '';
			stopClips();
		},
		getAnimations: () => clips.map((c) => ({ name: c.name, duration: c.duration })),
		screenshot,
		setSelection(names) {
			selection = Array.isArray(names) ? names.filter(Boolean) : names ? [names] : [];
			refreshSelection();
		},
		setOutline(on) {
			outline = !!on;
			refreshSelection();
		},
		on(name, cb) {
			if (!listeners.has(name)) listeners.set(name, []);
			listeners.get(name).push(cb);
			return () => api.off(name, cb);
		},
		off(name, cb) {
			const arr = listeners.get(name);
			if (arr) listeners.set(name, arr.filter((f) => f !== cb));
		},
		project,
		/** Hotspot anchor + offset in world space, e.g. to orbit around it. */
		hotspotWorld(meshName, offset) {
			const wp = worldPoint(meshName, offset);
			return wp ? wp.point.toArray() : null;
		},
		getModelInfo: () => modelInfo,
		/** materials-variants: [{name, meshes, swatch}] of the loaded model. */
		getMaterialVariants: () => variants.list(),
		/** Preview a variant ('' = GLB materials); null = back to the config's variant. */
		setMaterialVariant(name) {
			variants.setOverride(name);
			applyMaterials();
		},
		getMaterialVariant: () => variants.current(),
		getMeshNames: () => [...meshMap.keys()],
		getHierarchy: () => (modelRoot ? modelRoot.children.map(hierarchyOf) : []),
		getMaterialNamesForMeshes(names) {
			const out = new Set();
			for (const n of names || []) {
				const mat = originals.get(n)?.material;
				(Array.isArray(mat) ? mat : [mat]).forEach((m) => m && out.add(m.name || m.uuid));
			}
			return [...out];
		},
		/** Resolves once the model, environment map and textures are in. */
		whenIdle: () => Promise.all([modelPromise, envPromise]).then(() => decals.idle()).then(() => new Promise((r) => setTimeout(r, 0))),
		setSize,
		render,
		invalidate,
		dispose() {
			if (disposed) return;
			disposed = true;
			liveViewers.delete(applyEnvironment);
			cancelAnimationFrame(rafId);
			cancelAnimationFrame(hoverRaf);
			ro?.disconnect();
			io?.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			canvas.removeEventListener('pointerdown', onDown);
			canvas.removeEventListener('pointerup', onUp);
			canvas.removeEventListener('pointermove', onMove);
			controls.dispose();
			outline = false;
			refreshSelection();
			disposeModel();
			envTargets.forEach((e) => e.rt.dispose());
			envTargets.clear();
			pmrem.dispose();
			shadows.dispose();
			floor.geometry.dispose();
			floorMat.dispose();
			grid.geometry.dispose();
			grid.material.dispose();
			if (reflector) {
				reflector.getRenderTarget().dispose();
				reflector.material.dispose();
				reflector.geometry.dispose();
			}
			textureCache.forEach((p) => p.then((t) => t.dispose()).catch(() => {}));
			listeners.clear();
			renderer.dispose();
			renderer.forceContextLoss();
			root.remove();
		},
	};

	if (offscreen) {
		api.renderOffscreen = (bg) => {
			if (bg) renderer.setClearColor(bg, 1);
			render();
			renderer.setClearColor(0x000000, 0);
			return canvas;
		};
	}

	applyLock(config?.camera?.lock);
	applyEnvironment();
	liveViewers.add(applyEnvironment);
	if (opts.model) setModel(opts.model);
	return api;
}
