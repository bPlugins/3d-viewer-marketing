// Personalization decals (flag decals): each filled area is a projected mesh (the target mesh's
// front-facing triangles clipped to the area box, in its local space) with a CanvasTexture design.
import { isOn } from '../core/features.js';
import { DECAL_FONTS, decalAreas, areaContent, hasContent } from '../shared/decals.js';

const DEG = Math.PI / 180;
const CANVAS_SIDE = 1024;
const GUIDE = 'rgba(79, 70, 229, 0.95)';
// Local axes per side: n = projection normal (towards the viewer), r = right, u = up as seen from that side.
const SIDES = {
	front: { n: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0] },
	back: { n: [0, 0, -1], r: [-1, 0, 0], u: [0, 1, 0] },
	right: { n: [1, 0, 0], r: [0, 0, -1], u: [0, 1, 0] },
	left: { n: [-1, 0, 0], r: [0, 0, 1], u: [0, 1, 0] },
	top: { n: [0, 1, 0], r: [1, 0, 0], u: [0, 0, -1] },
	bottom: { n: [0, -1, 0], r: [1, 0, 0], u: [0, 0, 1] },
};

const fontSpec = (font, px) => `${font === 'Inter' ? 600 : 400} ${Math.max(1, Math.round(px))}px ${DECAL_FONTS[font] || DECAL_FONTS.Inter}`;

/**
 * createDecalLayer({ THREE, camera, canvas, getMesh(name), pick(clientX, clientY), invalidate })
 * → { sync(cfg), clear(), idle(), setPreview(map|null), setGuide(id|null), areaAt, areaCoords, facePoint, frame }
 */
export function createDecalLayer({ THREE, camera, canvas, getMesh, pick, invalidate }) {
	const entries = new Map();
	const images = new Map();
	const pending = new Set();
	const fontLoads = new Map();
	let lastCfg = null;
	let preview = null;
	let previewAreas = null;
	let guide = null;
	const raycaster = new THREE.Raycaster();
	const ndc = new THREE.Vector2();
	const V = (a) => new THREE.Vector3().fromArray(a);

	const track = (p) => {
		pending.add(p);
		p.finally(() => pending.delete(p));
		return p;
	};

	function loadImage(url) {
		let rec = images.get(url);
		if (!rec) {
			const img = new Image();
			rec = { img, ready: false };
			rec.promise = track(
				new Promise((resolve) => {
					img.onload = () => ((rec.ready = true), resolve());
					img.onerror = () => ((rec.failed = true), resolve());
					img.src = url;
				})
			);
			images.set(url, rec);
		}
		return rec;
	}

	// ── Projection ─────────────────────────────────────────────────────────

	/** Frame of an area on a mesh: the box the design is projected through, in the mesh's local space. */
	function frameOf(mesh, placement) {
		const geo = mesh.geometry;
		if (!geo?.attributes?.position) return null;
		if (!geo.boundingBox) geo.computeBoundingBox();
		const box = geo.boundingBox;
		const size = box.getSize(new THREE.Vector3());
		const center = box.getCenter(new THREE.Vector3());
		const s = SIDES[placement.side] || SIDES.front;
		const n = V(s.n), r = V(s.r), u = V(s.u);
		const faceW = Math.abs(size.dot(r)) || 1e-3;
		const faceH = Math.abs(size.dot(u)) || 1e-3;
		const depth = Math.abs(size.dot(n)) || 1e-3;
		const onFace = center.clone().addScaledVector(r, (placement.x - 0.5) * faceW).addScaledVector(u, (placement.y - 0.5) * faceH);
		// Surface point: first hit of a ray shot from outside the box along -n.
		const ray = new THREE.Ray(onFace.clone().addScaledVector(n, depth), n.clone().negate());
		const hit = firstHit(geo, ray) || onFace;
		const t = placement.rotation * DEG;
		const r2 = r.clone().multiplyScalar(Math.cos(t)).addScaledVector(u, -Math.sin(t));
		const u2 = u.clone().multiplyScalar(Math.cos(t)).addScaledVector(r, Math.sin(t));
		const hw = (placement.width * faceW) / 2;
		const hh = (placement.height * faceH) / 2;
		return { S: hit, n, r, u, r2, u2, hw, hh, depth, center, faceW, faceH, aspect: hw / hh };
	}

	function firstHit(geo, ray) {
		const pos = geo.attributes.position;
		const idx = geo.index;
		const count = idx ? idx.count : pos.count;
		const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), out = new THREE.Vector3();
		let best = null, bestD = Infinity;
		for (let i = 0; i + 2 < count; i += 3) {
			a.fromBufferAttribute(pos, idx ? idx.getX(i) : i);
			b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1);
			c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2);
			if (!ray.intersectTriangle(a, b, c, false, out)) continue;
			const d = out.distanceTo(ray.origin);
			if (d < bestD) (bestD = d), (best = out.clone());
		}
		return best;
	}

	/** Front-facing triangles inside the box, clipped (Sutherland–Hodgman) and UV-mapped across it. */
	function buildGeometry(mesh, f) {
		const geo = mesh.geometry;
		const pos = geo.attributes.position;
		const nor = geo.attributes.normal;
		const idx = geo.index;
		const count = idx ? idx.count : pos.count;
		const lift = 0.0015 * Math.max(f.faceW, f.faceH);
		const P = [], N = [], UV = [];
		const planes = [
			[0, 1, f.hw], [0, -1, f.hw], [1, 1, f.hh], [1, -1, f.hh], [2, 1, f.depth], [2, -1, f.depth],
		];
		const tmp = new THREE.Vector3();
		const vert = (i) => {
			const p = new THREE.Vector3().fromBufferAttribute(pos, i);
			const nn = nor ? new THREE.Vector3().fromBufferAttribute(nor, i) : null;
			tmp.subVectors(p, f.S);
			return { p, n: nn, q: [tmp.dot(f.r2), tmp.dot(f.u2), tmp.dot(f.n)] };
		};
		const lerp = (A, B, t) => ({
			p: A.p.clone().lerp(B.p, t),
			n: A.n && B.n ? A.n.clone().lerp(B.n, t) : null,
			q: [0, 1, 2].map((k) => A.q[k] + (B.q[k] - A.q[k]) * t),
		});
		const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), fn = new THREE.Vector3();
		for (let i = 0; i + 2 < count; i += 3) {
			let poly = [vert(idx ? idx.getX(i) : i), vert(idx ? idx.getX(i + 1) : i + 1), vert(idx ? idx.getX(i + 2) : i + 2)];
			// Quick reject outside the box.
			if (poly.every((v) => v.q[0] > f.hw) || poly.every((v) => v.q[0] < -f.hw) || poly.every((v) => v.q[1] > f.hh) || poly.every((v) => v.q[1] < -f.hh)) continue;
			// Facing test: vertex normals when present (winding-proof), else the face normal.
			if (poly[0].n && poly[1].n && poly[2].n) fn.copy(poly[0].n).add(poly[1].n).add(poly[2].n).normalize();
			else fn.crossVectors(e1.subVectors(poly[1].p, poly[0].p), e2.subVectors(poly[2].p, poly[0].p)).normalize();
			if (fn.dot(f.n) < 0.2) continue;
			for (const [k, sgn, lim] of planes) {
				const next = [];
				for (let j = 0; j < poly.length; j++) {
					const A = poly[j], B = poly[(j + 1) % poly.length];
					const da = lim - sgn * A.q[k], db = lim - sgn * B.q[k];
					if (da >= 0) next.push(A);
					if (da >= 0 !== db >= 0) next.push(lerp(A, B, da / (da - db)));
				}
				poly = next;
				if (poly.length < 3) break;
			}
			if (poly.length < 3) continue;
			for (let j = 1; j + 1 < poly.length; j++) {
				for (const v of [poly[0], poly[j], poly[j + 1]]) {
					const nn = v.n ? v.n.clone().normalize() : f.n;
					P.push(v.p.x + nn.x * lift, v.p.y + nn.y * lift, v.p.z + nn.z * lift);
					N.push(nn.x, nn.y, nn.z);
					UV.push(v.q[0] / (2 * f.hw) + 0.5, v.q[1] / (2 * f.hh) + 0.5);
				}
			}
		}
		const out = new THREE.BufferGeometry();
		out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
		out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
		out.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
		return out;
	}

	// ── Drawing ────────────────────────────────────────────────────────────

	function draw(e, area, content, showGuide) {
		const { canvas: cv, g } = e;
		const w = cv.width, h = cv.height;
		g.clearRect(0, 0, w, h);
		let waiting = null;
		if (content) {
			g.save();
			g.translate(w / 2 + content.x * w, h / 2 - content.y * h);
			g.rotate(content.rotation * DEG);
			const bw = w * content.size, bh = h * content.size;
			if (content.kind === 'image' && content.placeholder) {
				drawPlaceholder(g, bw, bh);
			} else if (content.kind === 'image') {
				const rec = loadImage(content.image);
				if (rec.ready && rec.img.naturalWidth) {
					const iw = rec.img.naturalWidth, ih = rec.img.naturalHeight;
					const s = Math.min(bw / iw, bh / ih);
					g.drawImage(rec.img, (-iw * s) / 2, (-ih * s) / 2, iw * s, ih * s);
				} else if (!rec.ready && !rec.failed) waiting = rec.promise;
			} else {
				let px = bh * 0.78;
				const spec = fontSpec(content.font, 64);
				// One load attempt per font, so a font that fails cannot re-trigger the redraw forever.
				if (document.fonts && !fontLoads.has(spec) && !document.fonts.check(spec)) {
					const rec = { done: false };
					rec.promise = track(document.fonts.load(spec).catch(() => {}).finally(() => (rec.done = true)));
					fontLoads.set(spec, rec);
				}
				if (fontLoads.get(spec)?.done === false) waiting = fontLoads.get(spec).promise;
				g.font = fontSpec(content.font, px);
				const m = g.measureText(content.text).width;
				if (m > bw * 0.96) px *= (bw * 0.96) / m;
				g.font = fontSpec(content.font, px);
				g.fillStyle = content.color;
				g.textAlign = 'center';
				g.textBaseline = 'middle';
				g.fillText(content.text, 0, px * 0.04);
			}
			g.restore();
		}
		if (showGuide) {
			const lw = Math.max(3, Math.round(Math.min(w, h) * 0.012));
			g.save();
			g.fillStyle = content ? 'rgba(99, 102, 241, 0.06)' : 'rgba(99, 102, 241, 0.14)';
			g.fillRect(lw, lw, w - 2 * lw, h - 2 * lw);
			g.setLineDash([lw * 4, lw * 3]);
			g.lineWidth = lw;
			g.strokeStyle = GUIDE;
			g.strokeRect(lw, lw, w - 2 * lw, h - 2 * lw);
			if (!content) {
				g.fillStyle = GUIDE;
				g.font = fontSpec('Inter', Math.min(h * 0.22, w * 0.09));
				g.textAlign = 'center';
				g.textBaseline = 'middle';
				g.fillText(area.label, w / 2, h / 2);
			}
			g.restore();
		}
		e.texture.needsUpdate = true;
		if (waiting) {
			const key = e.drawKey;
			waiting.then(() => {
				if (entries.get(area.id) !== e || e.drawKey !== key) return;
				draw(e, area, content, showGuide);
				invalidate();
			});
		}
	}

	function drawPlaceholder(g, bw, bh) {
		const s = Math.min(bw, bh) * 0.9;
		g.fillStyle = 'rgba(148, 163, 184, 0.85)';
		g.fillRect(-s / 2, -s / 2, s, s);
		g.fillStyle = '#ffffff';
		g.beginPath();
		g.moveTo(-s * 0.38, s * 0.3);
		g.lineTo(-s * 0.1, -s * 0.05);
		g.lineTo(s * 0.08, s * 0.15);
		g.lineTo(s * 0.2, s * 0.02);
		g.lineTo(s * 0.38, s * 0.3);
		g.closePath();
		g.fill();
		g.beginPath();
		g.arc(s * 0.2, -s * 0.2, s * 0.08, 0, Math.PI * 2);
		g.fill();
	}

	// ── Sync with the resolved config ──────────────────────────────────────

	function removeEntry(id) {
		const e = entries.get(id);
		if (!e) return;
		e.obj.parent?.remove(e.obj);
		e.obj.geometry.dispose();
		e.material.dispose();
		e.texture.dispose();
		entries.delete(id);
	}

	function sync(cfg) {
		lastCfg = cfg;
		const areas = isOn('decals') ? decalAreas(previewAreas ? { decals: previewAreas } : cfg) : [];
		const live = new Set();
		for (const a of areas) {
			const target = getMesh(a.mesh);
			if (!target?.isMesh) continue;
			const raw = preview?.[a.id] ?? a.content;
			const content = preview?.[a.id] ? raw : hasContent(a, areaContent(a, raw)) ? areaContent(a, raw) : null;
			const showGuide = guide === a.id;
			if (!content && !showGuide) continue;
			live.add(a.id);
			let e = entries.get(a.id);
			const geoKey = target.uuid + JSON.stringify(a.placement);
			if (!e || e.geoKey !== geoKey) {
				const f = frameOf(target, a.placement);
				if (!f) continue;
				const cw = f.aspect >= 1 ? CANVAS_SIDE : Math.max(64, Math.round(CANVAS_SIDE * f.aspect));
				const ch = f.aspect >= 1 ? Math.max(64, Math.round(CANVAS_SIDE / f.aspect)) : CANVAS_SIDE;
				if (e && e.canvas.width === cw && e.canvas.height === ch && e.target === target) {
					e.obj.geometry.dispose();
					e.obj.geometry = buildGeometry(target, f);
				} else {
					removeEntry(a.id);
					const cv = document.createElement('canvas');
					cv.width = cw;
					cv.height = ch;
					const texture = new THREE.CanvasTexture(cv);
					texture.colorSpace = THREE.SRGBColorSpace;
					texture.anisotropy = 4;
					const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: 0.6, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
					const obj = new THREE.Mesh(buildGeometry(target, f), material);
					obj.name = 'wc3d-decal-' + a.id;
					obj.userData.isSystem = true;
					obj.renderOrder = 2;
					obj.raycast = () => {};
					target.add(obj);
					e = { obj, target, canvas: cv, g: cv.getContext('2d'), texture, material };
					entries.set(a.id, e);
				}
				e.geoKey = geoKey;
				e.frame = f;
				e.drawKey = null;
			}
			const drawKey = JSON.stringify([content, showGuide, a.label]);
			if (drawKey !== e.drawKey) {
				e.drawKey = drawKey;
				draw(e, a, content, showGuide);
			}
		}
		for (const id of [...entries.keys()]) if (!live.has(id)) removeEntry(id);
		invalidate();
	}

	// ── Hit testing (drag in the viewer / editor) ──────────────────────────

	function localRay(e, clientX, clientY) {
		const rect = canvas.getBoundingClientRect();
		ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
		raycaster.setFromCamera(ndc, camera);
		e.target.updateWorldMatrix(true, false);
		return raycaster.ray.clone().applyMatrix4(e.target.matrixWorld.clone().invert());
	}

	function planePoint(id, clientX, clientY) {
		const e = entries.get(id);
		if (!e?.frame) return null;
		const ray = localRay(e, clientX, clientY);
		const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(e.frame.n, e.frame.S);
		const p = ray.intersectPlane(plane, new THREE.Vector3());
		return p ? { e, p } : null;
	}

	const api = {
		sync,
		clear() {
			for (const id of [...entries.keys()]) removeEntry(id);
		},
		idle: () => Promise.all([...pending]),
		/** Editor: sample content per area id (shown even when empty) and optionally unsaved areas; null clears. */
		setPreview(map, areas = null) {
			preview = map || null;
			previewAreas = map && Array.isArray(areas) ? areas : null;
			if (lastCfg) sync(lastCfg);
		},
		/** Dashed outline on one area (the one being edited). */
		setGuide(id) {
			if ((id || null) === guide) return;
			guide = id || null;
			if (lastCfg) sync(lastCfg);
		},
		/** The rendered area under the pointer: { id, u, v } in −0.5–0.5 of the area, else null. */
		areaAt(clientX, clientY) {
			const hit = pick(clientX, clientY);
			if (!hit) return null;
			for (const [id, e] of entries) {
				if (e.target !== hit.object || !e.frame) continue;
				const d = e.target.worldToLocal(hit.point.clone()).sub(e.frame.S);
				const u = d.dot(e.frame.r2) / (2 * e.frame.hw);
				const v = d.dot(e.frame.u2) / (2 * e.frame.hh);
				if (Math.abs(u) <= 0.5 && Math.abs(v) <= 0.5) return { id, u, v };
			}
			return null;
		},
		/** Pointer on the area's plane, in area units (for moving the design). */
		areaCoords(id, clientX, clientY) {
			const r = planePoint(id, clientX, clientY);
			if (!r) return null;
			const d = r.p.sub(r.e.frame.S);
			return { u: d.dot(r.e.frame.r2) / (2 * r.e.frame.hw), v: d.dot(r.e.frame.u2) / (2 * r.e.frame.hh) };
		},
		/** Pointer on the area's plane, as 0–1 across the mesh face (for moving the area). */
		facePoint(id, clientX, clientY) {
			const r = planePoint(id, clientX, clientY);
			if (!r) return null;
			const f = r.e.frame;
			const d = r.p.sub(f.center);
			return { x: d.dot(f.r) / f.faceW + 0.5, y: d.dot(f.u) / f.faceH + 0.5 };
		},
		has: (id) => entries.has(id),
	};
	return api;
}
