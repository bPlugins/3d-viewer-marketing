// Procedural demo models (metres, origin at floor centre). Mesh names are the
// "GLB" names the seed configs and the editor tree refer to; keep them stable.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ── Shared procedural textures (built once, never disposed) ─────────────────
const texCache = {};

function canvas(size) {
	const c = document.createElement('canvas');
	c.width = c.height = size;
	return c;
}

// Deterministic pseudo-random so every build looks the same.
function rng(seed) {
	let s = seed >>> 0;
	return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function woodTexture() {
	if (texCache.wood) return texCache.wood;
	const c = canvas(512);
	const g = c.getContext('2d');
	const rand = rng(7);
	g.fillStyle = '#c49a6c';
	g.fillRect(0, 0, 512, 512);
	for (let i = 0; i < 150; i++) {
		const y0 = rand() * 512;
		const amp = 2 + rand() * 6;
		const freq = 0.004 + rand() * 0.01;
		const dark = rand() < 0.55;
		g.strokeStyle = dark ? `rgba(110,72,38,${0.08 + rand() * 0.22})` : `rgba(235,205,160,${0.08 + rand() * 0.18})`;
		g.lineWidth = 0.6 + rand() * 2.4;
		g.beginPath();
		for (let x = 0; x <= 512; x += 8) {
			const y = y0 + Math.sin(x * freq + i) * amp + Math.sin(x * freq * 3.1) * amp * 0.3;
			x ? g.lineTo(x, y) : g.moveTo(x, y);
		}
		g.stroke();
	}
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = 4;
	return (texCache.wood = t);
}

function fabricNormal() {
	if (texCache.fabric) return texCache.fabric;
	const N = 128;
	const c = canvas(N);
	const g = c.getContext('2d');
	const h = new Float32Array(N * N);
	const rand = rng(3);
	for (let y = 0; y < N; y++)
		for (let x = 0; x < N; x++) {
			const warp = Math.sin((x / N) * Math.PI * 32) * 0.5 + 0.5;
			const weft = Math.sin((y / N) * Math.PI * 32) * 0.5 + 0.5;
			const over = (Math.floor((x / N) * 16) + Math.floor((y / N) * 16)) % 2;
			h[y * N + x] = (over ? warp : weft) + rand() * 0.25;
		}
	const img = g.createImageData(N, N);
	const at = (x, y) => h[((y + N) % N) * N + ((x + N) % N)];
	for (let y = 0; y < N; y++)
		for (let x = 0; x < N; x++) {
			const dx = (at(x + 1, y) - at(x - 1, y)) * 1.4;
			const dy = (at(x, y + 1) - at(x, y - 1)) * 1.4;
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
	t.repeat.set(6, 6);
	return (texCache.fabric = t);
}

// ── Materials ────────────────────────────────────────────────────────────────
const oak = (name, roughness = 0.55) => new THREE.MeshStandardMaterial({ name, color: '#ffffff', map: woodTexture(), roughness, metalness: 0 });
const fabric = (name, color, roughness = 0.92) =>
	new THREE.MeshStandardMaterial({ name, color, roughness, metalness: 0, normalMap: fabricNormal(), normalScale: new THREE.Vector2(0.55, 0.55) });

// ── Geometry helpers ─────────────────────────────────────────────────────────

/** Rounded box whose ±Y faces puff out like a cushion (analytic normals, no seams). */
function cushion(w, h, d, radius, bulgeTop, bulgeBottom = bulgeTop * 0.4) {
	const geo = new RoundedBoxGeometry(w, h, d, 5, radius);
	const p = geo.attributes.position;
	const n = geo.attributes.normal;
	const hw = w / 2;
	const hd = d / 2;
	for (let i = 0; i < p.count; i++) {
		const x = p.getX(i);
		const y = p.getY(i);
		const z = p.getZ(i);
		const u = Math.max(-1, Math.min(1, x / hw));
		const v = Math.max(-1, Math.min(1, z / hd));
		const f = (1 - u * u) * (1 - v * v);
		const b = y > 0 ? bulgeTop : -bulgeBottom;
		p.setY(i, y + b * f);
		const ny = n.getY(i);
		const gx = b * (-2 * u / hw) * (1 - v * v);
		const gz = b * (-2 * v / hd) * (1 - u * u);
		const w2 = Math.abs(ny);
		const vx = n.getX(i) - gx * w2 * Math.sign(ny || 1);
		const vz = n.getZ(i) - gz * w2 * Math.sign(ny || 1);
		const len = Math.hypot(vx, ny, vz) || 1;
		n.setXYZ(i, vx / len, ny / len, vz / len);
	}
	p.needsUpdate = n.needsUpdate = true;
	geo.computeBoundingBox();
	geo.computeBoundingSphere();
	return geo;
}

const rbox = (w, h, d, r, x = 0, y = 0, z = 0) => new RoundedBoxGeometry(w, h, d, 3, r).translate(x, y, z);

/** Tapered round leg between two points. */
function leg(from, to, rTop, rBottom, seg = 20) {
	const a = new THREE.Vector3(...from);
	const b = new THREE.Vector3(...to);
	const len = a.distanceTo(b);
	const geo = new THREE.CylinderGeometry(rTop, rBottom, len, seg, 1);
	const dir = new THREE.Vector3().subVectors(a, b).normalize();
	geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
	const mid = a.clone().add(b).multiplyScalar(0.5);
	return geo.translate(mid.x, mid.y, mid.z);
}

function mesh(name, geometry, material) {
	const m = new THREE.Mesh(geometry, material);
	m.name = name;
	m.castShadow = true;
	m.receiveShadow = true;
	return m;
}

// ── Models ───────────────────────────────────────────────────────────────────

function buildLoungeChair(wide) {
	const armX = wide ? 0.67 : 0.42;
	const root = new THREE.Group();
	root.name = wide ? 'Lounge_Chair_Wide' : 'Lounge_Chair';
	const legZf = 0.3;
	const legZb = -0.31;
	const tilt = 0.25;

	// Four tapered oak legs rising to the armrests.
	const legs = mergeGeometries([
		leg([armX, 0.585, legZf], [armX, 0, legZf + 0.01], 0.022, 0.016),
		leg([-armX, 0.585, legZf], [-armX, 0, legZf + 0.01], 0.022, 0.016),
		leg([armX, 0.585, legZb], [armX, 0, legZb - 0.015], 0.022, 0.016),
		leg([-armX, 0.585, legZb], [-armX, 0, legZb - 0.015], 0.022, 0.016),
	]);

	// Rails, seat deck and the raked back posts with a top rail.
	const post = (x) => {
		const g = new RoundedBoxGeometry(0.042, 0.52, 0.042, 2, 0.012);
		g.translate(0, 0.26, 0).rotateX(-tilt).translate(x, 0.43, legZb);
		return g;
	};
	const topY = 0.43 + 0.52 * Math.cos(tilt);
	const topZ = legZb - 0.52 * Math.sin(tilt);
	const rail = new RoundedBoxGeometry(2 * armX + 0.04, 0.055, 0.035, 2, 0.012).rotateX(-tilt).translate(0, topY - 0.02, topZ + 0.005);
	const frame = mergeGeometries([
		rbox(0.04, 0.065, legZf - legZb, 0.012, armX, 0.27, (legZf + legZb) / 2),
		rbox(0.04, 0.065, legZf - legZb, 0.012, -armX, 0.27, (legZf + legZb) / 2),
		rbox(2 * armX, 0.065, 0.04, 0.012, 0, 0.27, legZf),
		rbox(2 * armX, 0.065, 0.04, 0.012, 0, 0.27, legZb),
		rbox(2 * armX - 0.04, 0.02, legZf - legZb - 0.02, 0.006, 0, 0.31, (legZf + legZb) / 2),
		post(armX),
		post(-armX),
		rail,
	]);
	root.add(mesh('Frame', frame, oak('Oak_Frame')));
	root.add(mesh('Legs', legs, oak('Oak_Legs', 0.5)));


	const seatW = 2 * armX - 0.09;
	root.add(mesh('Seat_Cushion', cushion(seatW, 0.14, 0.66, 0.05, 0.03).translate(0, 0.39, 0.02), fabric('Fabric_Seat', '#b8b2a7')));

	const back = cushion(seatW, 0.14, 0.5, 0.05, 0.035).rotateX(Math.PI / 2 - tilt).translate(0, 0.69, -0.285);
	root.add(mesh('Back_Cushion', back, fabric('Fabric_Back', '#b8b2a7')));

	root.add(mesh('Armrest_Left', rbox(0.075, 0.035, 0.8, 0.014, -armX, 0.5975, -0.005), oak('Oak_Armrest_L', 0.45)));
	root.add(mesh('Armrest_Right', rbox(0.075, 0.035, 0.8, 0.014, armX, 0.5975, -0.005), oak('Oak_Armrest_R', 0.45)));

	const pillow = cushion(0.4, 0.1, 0.3, 0.045, 0.035, 0.03)
		.rotateX(Math.PI / 2 - 0.4)
		.rotateZ(0.12)
		.rotateY(-0.22)
		.translate(wide ? 0.3 : 0.12, 0.63, -0.15);
	root.add(mesh('Pillow', pillow, fabric('Velvet_Pillow', '#6f7d64', 0.8)));

	return { scene: root, animations: [] };
}

function buildTableLamp() {
	const root = new THREE.Group();
	root.name = 'Arc_Table_Lamp';

	const baseProfile = [
		[0, 0], [0.085, 0], [0.09, 0.004], [0.09, 0.017], [0.085, 0.023], [0.034, 0.027], [0.018, 0.033], [0.012, 0.036], [0, 0.036],
	].map(([r, y]) => new THREE.Vector2(r, y));
	const base = mesh('Base', new THREE.LatheGeometry(baseProfile, 64), new THREE.MeshStandardMaterial({ name: 'Steel_Base', color: '#2b2b2e', metalness: 0.6, roughness: 0.35 }));
	root.add(base);

	// Arm pivots on the base; its curve ends where the shade hangs.
	const end = new THREE.Vector3(0, 0.415, 0.15);
	const curve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(0, 0, 0),
		new THREE.Vector3(0, 0.18, 0),
		new THREE.Vector3(0, 0.33, 0.015),
		new THREE.Vector3(0, 0.395, 0.07),
		end,
	]);
	const armGeo = mergeGeometries([
		new THREE.TubeGeometry(curve, 72, 0.0075, 12),
		new THREE.SphereGeometry(0.013, 16, 12).translate(end.x, end.y, end.z),
		new THREE.CylinderGeometry(0.012, 0.012, 0.02, 16).translate(0, 0.004, 0),
	]);
	const arm = mesh('Arm', armGeo, new THREE.MeshStandardMaterial({ name: 'Brushed_Brass', color: '#b08d57', metalness: 0.9, roughness: 0.3 }));
	arm.position.set(0, 0.034, 0);
	root.add(arm);

	const shadeProfile = [
		[0.034, 0.004], [0.046, -0.012], [0.108, -0.125], [0.111, -0.13], [0.106, -0.128], [0.043, -0.014], [0.031, 0.002],
	].map(([r, y]) => new THREE.Vector2(r, y));
	const shadeGeo = mergeGeometries([new THREE.LatheGeometry(shadeProfile, 64), new THREE.CylinderGeometry(0.016, 0.02, 0.022, 16).translate(0, -0.006, 0)]);
	const shade = mesh(
		'Shade',
		shadeGeo,
		new THREE.MeshStandardMaterial({ name: 'Linen_Shade', color: '#e9e2d0', roughness: 0.85, metalness: 0, side: THREE.DoubleSide, normalMap: fabricNormal(), normalScale: new THREE.Vector2(0.25, 0.25) })
	);
	shade.position.copy(end);
	arm.add(shade);

	const bulb = mesh('Bulb', new THREE.SphereGeometry(0.026, 24, 16), new THREE.MeshStandardMaterial({ name: 'Bulb_Glass', color: '#fff8e6', emissive: '#ffcf7a', emissiveIntensity: 1.6, roughness: 0.2 }));
	bulb.position.set(0, -0.055, 0);
	bulb.castShadow = false;
	shade.add(bulb);

	const q = (axis, a) => new THREE.Quaternion().setFromAxisAngle(axis, a).toArray();
	const X = new THREE.Vector3(1, 0, 0);
	const Y = new THREE.Vector3(0, 1, 0);
	const tilt = new THREE.AnimationClip('Shade_Tilt', 2.4, [
		new THREE.QuaternionKeyframeTrack('Shade.quaternion', [0, 1.2, 2.4], [...q(X, 0), ...q(X, -0.5), ...q(X, 0)]),
	]);
	const swing = new THREE.AnimationClip('Arm_Swing', 4.8, [
		new THREE.QuaternionKeyframeTrack('Arm.quaternion', [0, 1.2, 2.4, 3.6, 4.8], [...q(Y, 0), ...q(Y, 0.55), ...q(Y, 0), ...q(Y, -0.55), ...q(Y, 0)]),
	]);
	return { scene: root, animations: [tilt, swing] };
}

function buildMug() {
	const root = new THREE.Group();
	root.name = 'Ceramic_Mug';
	const body = [
		[0, 0.001], [0.033, 0], [0.038, 0.003], [0.041, 0.012], [0.0425, 0.06], [0.0425, 0.092], [0.0418, 0.0955], [0.0398, 0.0962], [0.0386, 0.0952],
	].map(([r, y]) => new THREE.Vector2(r, y));
	root.add(mesh('Body', new THREE.LatheGeometry(body, 72), new THREE.MeshStandardMaterial({ name: 'Stoneware_Outer', color: '#d9d4c7', roughness: 0.4, metalness: 0 })));
	const inner = [
		[0, 0.009], [0.031, 0.009], [0.0366, 0.014], [0.0384, 0.03], [0.0386, 0.0952],
	].map(([r, y]) => new THREE.Vector2(r, y));
	root.add(mesh('Glaze_Inner', new THREE.LatheGeometry(inner, 72), new THREE.MeshStandardMaterial({ name: 'Glaze_Cream', color: '#f1ece1', roughness: 0.22, metalness: 0, side: THREE.DoubleSide })));
	const handle = new THREE.TorusGeometry(0.027, 0.0072, 14, 40, Math.PI).rotateZ(-Math.PI / 2).scale(1.05, 1, 0.85).translate(0.04, 0.052, 0);
	root.add(mesh('Handle', handle, new THREE.MeshStandardMaterial({ name: 'Stoneware_Handle', color: '#d9d4c7', roughness: 0.4, metalness: 0 })));
	return { scene: root, animations: [] };
}

function buildSideTable() {
	const root = new THREE.Group();
	root.name = 'Oak_Side_Table';
	const top = mergeGeometries([
		new THREE.CylinderGeometry(0.25, 0.25, 0.022, 72).translate(0, 0.541, 0),
		new THREE.CylinderGeometry(0.25, 0.243, 0.008, 72).translate(0, 0.526, 0),
	]);
	root.add(mesh('Top', top, oak('Oak_Top', 0.5)));
	const legs = [];
	for (let i = 0; i < 3; i++) {
		const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
		const c = Math.cos(a);
		const s = Math.sin(a);
		legs.push(leg([0.165 * c, 0.525, 0.165 * s], [0.215 * c, 0, 0.215 * s], 0.019, 0.013));
	}
	root.add(mesh('Legs', mergeGeometries(legs), oak('Oak_Legs', 0.55)));
	root.add(mesh('Shelf', new THREE.CylinderGeometry(0.192, 0.192, 0.018, 72).translate(0, 0.2, 0), oak('Oak_Shelf', 0.55)));
	return { scene: root, animations: [] };
}

export const DEMO_MODELS = {
	'lounge-chair': { title: 'Lounge Chair', build: () => buildLoungeChair(false) },
	'lounge-chair-wide': { title: 'Lounge Chair (Wide)', build: () => buildLoungeChair(true) },
	'table-lamp': { title: 'Arc Table Lamp', build: buildTableLamp },
	mug: { title: 'Ceramic Mug', build: buildMug },
	'side-table': { title: 'Oak Side Table', build: buildSideTable },
};

const CHAIR_MESHES = ['Frame', 'Legs', 'Seat_Cushion', 'Back_Cushion', 'Armrest_Left', 'Armrest_Right', 'Pillow'];
const CHAIR_MATERIALS = ['Oak_Frame', 'Oak_Legs', 'Fabric_Seat', 'Fabric_Back', 'Oak_Armrest_L', 'Oak_Armrest_R', 'Velvet_Pillow'];

// Stats as the GLB parser would report them for the "uploaded" file.
export const MODEL_INFO = {
	'lounge-chair': { meshes: CHAIR_MESHES, materials: CHAIR_MATERIALS, animations: [], triangles: 48216, vertices: 26904, textures: 3, sizeBytes: 2457600 },
	'lounge-chair-wide': { meshes: CHAIR_MESHES, materials: CHAIR_MATERIALS, animations: [], triangles: 52480, vertices: 29112, textures: 3, sizeBytes: 2662400 },
	'table-lamp': {
		meshes: ['Base', 'Arm', 'Shade', 'Bulb'],
		materials: ['Steel_Base', 'Brushed_Brass', 'Linen_Shade', 'Bulb_Glass'],
		animations: ['Shade_Tilt', 'Arm_Swing'],
		triangles: 18940,
		vertices: 10212,
		textures: 1,
		sizeBytes: 1146880,
	},
	mug: { meshes: ['Body', 'Handle', 'Glaze_Inner'], materials: ['Stoneware_Outer', 'Stoneware_Handle', 'Glaze_Cream'], animations: [], triangles: 7820, vertices: 4210, textures: 0, sizeBytes: 491520 },
	'side-table': { meshes: ['Top', 'Legs', 'Shelf'], materials: ['Oak_Top', 'Oak_Legs', 'Oak_Shelf'], animations: [], triangles: 12680, vertices: 6950, textures: 2, sizeBytes: 870400 },
};

// Clip durations (seconds), for "Walk (2.4s)"-style labels without building the model.
export const CLIP_DURATIONS = { Shade_Tilt: 2.4, Arm_Swing: 4.8 };
