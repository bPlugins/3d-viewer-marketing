// materials-variants: KHR_materials_variants for the viewer. The demo models' authored variants (what
// their "GLB" carries), the reader for uploaded GLBs, and the per-viewer switcher used by viewer.js.
// Spec: prototype/specs/materials-variants.md.
import * as THREE from 'three';
import { isOn } from '../core/features.js';

export const VARIANTS_FLAG = 'materials-variants';

/** The variant the config (with the shopper layer baked in) asks for; '' = the GLB's own materials. */
export function variantOf(cfg) {
	return isOn(VARIANTS_FLAG) && typeof cfg?.material_variant === 'string' ? cfg.material_variant : '';
}

// ── Procedural normal maps for the demo materials (built once) ──────────────
const texCache = {};

function rng(seed) {
	let s = seed >>> 0;
	return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function normalMap(key, N, height, strength, repeat) {
	if (texCache[key]) return texCache[key];
	const c = document.createElement('canvas');
	c.width = c.height = N;
	const g = c.getContext('2d');
	const img = g.createImageData(N, N);
	const at = (x, y) => height[((y + N) % N) * N + ((x + N) % N)];
	for (let y = 0; y < N; y++)
		for (let x = 0; x < N; x++) {
			const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
			const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
			const l = Math.hypot(dx, dy, 1);
			const i = (y * N + x) * 4;
			img.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
			img.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
			img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
			img.data[i + 3] = 255;
		}
	g.putImageData(img, 0, 0);
	const t = new THREE.CanvasTexture(c);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(repeat, repeat);
	return (texCache[key] = t);
}

/** Pebbled leather: soft overlapping bumps. */
function leatherNormal() {
	const N = 128;
	const h = new Float32Array(N * N);
	const rand = rng(11);
	for (let k = 0; k < 520; k++) {
		const cx = rand() * N, cy = rand() * N, r = 1.5 + rand() * 3.5;
		for (let y = -6; y <= 6; y++)
			for (let x = -6; x <= 6; x++) {
				const d = Math.hypot(x, y) / r;
				if (d < 1) h[((Math.floor(cy) + y + N) % N) * N + ((Math.floor(cx) + x + N) % N)] += (1 - d * d) * 0.6;
			}
	}
	return normalMap('leather', N, h, 1.2, 5);
}

/** Bouclé: dense little loops. */
function boucleNormal() {
	const N = 128;
	const h = new Float32Array(N * N);
	const rand = rng(23);
	for (let k = 0; k < 420; k++) {
		const cx = rand() * N, cy = rand() * N, r = 2 + rand() * 2.5;
		for (let y = -5; y <= 5; y++)
			for (let x = -5; x <= 5; x++) {
				const d = Math.abs(Math.hypot(x, y) - r);
				if (d < 1.2) h[((Math.floor(cy) + y + N) % N) * N + ((Math.floor(cx) + x + N) % N)] += (1.2 - d) * 0.8;
			}
	}
	return normalMap('boucle', N, h, 1.6, 7);
}

// ── Demo variants (as the demo GLBs would author them) ──────────────────────
// mappings[mesh][variantIndex]: null = the mesh's own GLB material, else a factory (glbMaterial) → material.
const tint = (name, color, props = {}) => (orig) => {
	const m = orig.clone();
	m.name = name;
	m.color.set(color);
	Object.assign(m, props);
	return m;
};
const leather = (name, color) => () =>
	new THREE.MeshStandardMaterial({ name, color, roughness: 0.5, metalness: 0, normalMap: leatherNormal(), normalScale: new THREE.Vector2(0.7, 0.7) });
const boucle = (name, color) => () =>
	new THREE.MeshStandardMaterial({ name, color, roughness: 1, metalness: 0, normalMap: boucleNormal(), normalScale: new THREE.Vector2(1.1, 1.1) });
const metal = (name, color, metalness, roughness) => () => new THREE.MeshStandardMaterial({ name, color, metalness, roughness });

const sandLinen = tint('Linen_Sand', '#d8c8a8');
// Dark woods need more roughness, or flat tops mirror the environment and read tan.
const blackAsh = tint('Black_Ash', '#353437', { roughness: 0.7 });
const walnut = tint('Walnut', '#6c5446', { roughness: 0.65 });
const smoked = tint('Smoked_Oak', '#a19184', { roughness: 0.6 });

const CHAIR = {
	variants: [
		{ name: 'Natural Oak & Sand Linen', swatch: ['#c49a6c', '#d8c8a8'] },
		{ name: 'Black Ash & Charcoal Bouclé', swatch: ['#291f17', '#4a4a4f'] },
		{ name: 'Walnut & Teal Leather', swatch: ['#53331e', '#14746f'] },
	],
	mappings: {
		Frame: [null, blackAsh, walnut],
		Legs: [null, blackAsh, walnut],
		Armrest_Left: [null, blackAsh, walnut],
		Armrest_Right: [null, blackAsh, walnut],
		Seat_Cushion: [sandLinen, boucle('Boucle_Charcoal', '#4a4a4f'), leather('Leather_Teal', '#14746f')],
		Back_Cushion: [sandLinen, boucle('Boucle_Charcoal', '#4a4a4f'), leather('Leather_Teal', '#14746f')],
		Pillow: [null, boucle('Boucle_Cream', '#e9e3d6'), leather('Leather_Cognac', '#8a4b2a')],
	},
};

const DEMO_VARIANTS = {
	'lounge-chair': CHAIR,
	'lounge-chair-wide': CHAIR,
	'side-table': {
		variants: [
			{ name: 'Natural Oak', swatch: ['#c49a6c'] },
			{ name: 'Smoked Oak', swatch: ['#7c5838'] },
			{ name: 'Black Ash', swatch: ['#291f17'] },
			{ name: 'Walnut', swatch: ['#53331e'] },
		],
		mappings: {
			Top: [null, smoked, blackAsh, walnut],
			Legs: [null, smoked, blackAsh, walnut],
			Shelf: [null, smoked, blackAsh, walnut],
		},
	},
	'table-lamp': {
		variants: [
			{ name: 'Brass & Linen', swatch: ['#b08d57', '#e9e2d0'] },
			{ name: 'Black & Sage', swatch: ['#222222', '#9caf88'] },
			{ name: 'Chrome & Charcoal', swatch: ['#d6d9dc', '#3f3f46'] },
		],
		mappings: {
			Base: [null, metal('Matte_Black', '#1c1c1e', 0.2, 0.7), metal('Chrome_Base', '#d6d9dc', 1, 0.15)],
			Arm: [null, metal('Matte_Black', '#222222', 0.2, 0.7), metal('Chrome', '#d6d9dc', 1, 0.15)],
			Shade: [null, tint('Linen_Sage', '#9caf88'), tint('Linen_Charcoal', '#3f3f46')],
		},
	},
};

/** Variant list of a demo model without building it (editor, overview): [{name, meshes, swatch}]. */
export function demoVariantList(demoKey) {
	const def = DEMO_VARIANTS[demoKey];
	if (!def) return [];
	return def.variants.map((v, i) => ({ name: v.name, swatch: v.swatch.slice(), meshes: Object.keys(def.mappings).filter((m) => def.mappings[m][i] !== undefined) }));
}

/** Variant source for a built demo model. */
export function demoVariantSource(demoKey) {
	const def = DEMO_VARIANTS[demoKey];
	if (!def) return null;
	const entries = new Map();
	for (const [mesh, list] of Object.entries(def.mappings)) {
		entries.set(
			mesh,
			list.map((make, i) => ({ variants: [i], original: make === null, get: make || null })),
		);
	}
	return { names: def.variants.map((v) => v.name), swatches: def.variants.map((v) => v.swatch.slice()), entries };
}

// ── Uploaded GLBs (three's GLTFLoader keeps unknown extensions in userData) ──
const hex = (f) => '#' + new THREE.Color().setRGB(f[0] ?? 1, f[1] ?? 1, f[2] ?? 1, THREE.LinearSRGBColorSpace).getHexString();

function loadGltfMaterial(parser, mesh, index) {
	return parser.getDependency('material', index).then((mat) => {
		const prev = mesh.material;
		mesh.material = mat;
		parser.assignFinalMaterial(mesh);
		const out = mesh.material;
		mesh.material = prev;
		return out;
	});
}

export function gltfVariantSource(gltf) {
	const ext = gltf?.userData?.gltfExtensions?.KHR_materials_variants;
	const list = Array.isArray(ext?.variants) ? ext.variants : [];
	if (!list.length || !gltf.parser) return null;
	const names = list.map((v, i) => String(v?.name || `Variant ${i + 1}`));
	const json = gltf.parser.json || {};
	const swatchSets = names.map(() => new Set());
	const entries = new Map();
	gltf.scene.traverse((o) => {
		const maps = o.isMesh && o.name ? o.userData?.gltfExtensions?.KHR_materials_variants?.mappings : null;
		if (!Array.isArray(maps)) return;
		const valid = maps.filter((m) => Number.isInteger(m?.material) && Array.isArray(m?.variants));
		entries.set(
			o.name,
			valid.map((m) => ({ variants: m.variants, original: false, get: () => loadGltfMaterial(gltf.parser, o, m.material) })),
		);
		for (const m of valid) {
			const f = json.materials?.[m.material]?.pbrMetallicRoughness?.baseColorFactor;
			for (const i of m.variants) if (swatchSets[i] && swatchSets[i].size < 3) swatchSets[i].add(Array.isArray(f) ? hex(f) : '#cccccc');
		}
	});
	return { names, swatches: swatchSets.map((s) => [...s]), entries };
}

// ── Switcher (one per viewer) ────────────────────────────────────────────────

/**
 * Swaps the "original" material of each mapped mesh so the viewer's usual restore + config pass
 * layers material edits on top of the variant. sync() returns the meshes whose base changed.
 */
export function createVariantSwitcher({ originals }) {
	let names = [];
	let swatches = [];
	let entries = new Map();
	const base = new Map();
	const made = new Map();
	let override = null;
	let current = '';
	let gen = 0;

	function reset() {
		gen++;
		const own = new Set(base.values());
		for (const [mesh, mat] of base) {
			const o = originals.get(mesh);
			if (o) o.material = mat;
		}
		for (const v of made.values()) if (v && typeof v.then !== 'function' && !own.has(v)) v.dispose?.();
		base.clear();
		made.clear();
		names = [];
		swatches = [];
		entries = new Map();
		override = null;
		current = '';
	}

	function materialFor(mesh, i, onLoaded) {
		const m = (entries.get(mesh) || []).find((e) => e.variants.includes(i));
		if (!m || m.original || !m.get) return base.get(mesh);
		const key = mesh + '\n' + i;
		if (made.has(key)) {
			const v = made.get(key);
			return typeof v?.then === 'function' ? undefined : v;
		}
		const out = m.get(base.get(mesh));
		if (out && typeof out.then === 'function') {
			const mine = gen;
			const done = (mat) => {
				if (mine !== gen) return; // the model changed meanwhile
				made.set(key, mat);
				onLoaded?.();
			};
			made.set(key, out.then(done, () => done(base.get(mesh))));
			return undefined;
		}
		made.set(key, out);
		return out;
	}

	return {
		attach(src) {
			reset();
			names = src?.names || [];
			swatches = src?.swatches || [];
			entries = src?.entries || new Map();
			for (const [mesh, o] of originals) base.set(mesh, o.material);
		},
		reset,
		sync(requested, onLoaded) {
			const want = override !== null ? override : requested || '';
			const i = want ? names.indexOf(want) : -1;
			const changed = [];
			for (const [mesh, o] of originals) {
				if (!base.has(mesh)) continue;
				const mat = i < 0 ? base.get(mesh) : materialFor(mesh, i, onLoaded);
				if (mat === undefined) continue; // still loading: keep what is on screen
				if (o.material !== mat) {
					o.material = mat;
					changed.push(mesh);
				}
			}
			current = i < 0 ? '' : want;
			return changed;
		},
		setOverride(name) {
			override = name === null || name === undefined ? null : String(name);
		},
		current: () => current,
		list: () =>
			names.map((name, i) => ({
				name,
				swatch: (swatches[i] || []).slice(),
				meshes: [...entries.entries()].filter(([, list]) => list.some((e) => e.variants.includes(i))).map(([mesh]) => mesh),
			})),
	};
}
