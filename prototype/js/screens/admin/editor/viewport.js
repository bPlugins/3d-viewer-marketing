// Center panel (Editor.tsx CenterPanel + components/ScenePreview): the 3D viewport on the
// effective config, click-to-select, hotspot placement and markers, Reset View, live pill.
import { html, useState, useEffect, useRef, useMemo, money } from '../../../core/ui.js';
import { useStore } from '../../../core/store.js';
import { Icon } from '../../../shared/icons.js';
import { ChunkBoundary, VIEWPORT_FRAME_CLASS } from '../../../shared/editor-ui.js';
import { productImageUrl } from '../../../shared/product-image.js';
import { editor, useEditor } from './editor-store.js';
import { NativeDialog } from './topbar.js';

let viewerPromise = null;
let viewerLoaded = null;
const loadViewer = () => (viewerPromise ||= import('../../../engine/Viewer3D.js').then((m) => (viewerLoaded = m)));
const NO_HOTSPOTS = [];

function getBackgroundStyle(env) {
	const type = env?.backgroundType ?? 'transparent';
	if (type === 'color' && env?.backgroundColor) return { backgroundColor: env.backgroundColor, backgroundImage: 'none' };
	if (type === 'image' && env?.backgroundImageUrl)
		return { backgroundImage: `url(${env.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
	if (type === 'transparent') return { background: 'transparent', backgroundImage: 'none' };
	return {};
}

const LoadingFrame = () => html`<div class=${VIEWPORT_FRAME_CLASS}>
	<div role="status" class="flex items-center justify-center gap-2.5 h-full text-[13px] font-medium text-slate-500 dark:text-slate-400">
		<span class="wc3d-icon-tile wc3d-icon-tile-brand wc3d-pulse"><${Icon} name="cube" size=${15} /></span>
		Loading 3D preview…
	</div>
</div>`;

const ErrorFrame = () => html`<div class=${VIEWPORT_FRAME_CLASS}>
	<div role="alert" class="flex items-center justify-center h-full px-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
		The 3D preview could not be loaded. Reload the page to try again.
	</div>
</div>`;

// ── Hotspot markers (shared/engine/HotspotsViewer.tsx, editor flavour) ────────

const SVG = (body) =>
	html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: body }} />`;
const HOTSPOT_ICONS = {
	link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
	cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
	warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
	info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
};
const hotspotIcon = (icon) => SVG(HOTSPOT_ICONS[icon] || HOTSPOT_ICONS.info);

function Hotspot({ hotspot, controller, occluded, onAskDelete }) {
	const [open, setOpen] = useState(false);
	const hideTimer = useRef(0);
	const product = useStore((g) => (hotspot.icon === 'cart' && hotspot.linked_product_id ? g.products?.[hotspot.linked_product_id] || null : null));
	const imageUrl = useStore((g) => (product ? productImageUrl(g, product, 0, 96) : ''));
	const hasLink = hotspot.icon === 'link' && hotspot.target_url;
	const hasProduct = hotspot.icon === 'cart' && hotspot.linked_product_id;
	const show = open && !occluded;

	const enter = () => {
		clearTimeout(hideTimer.current);
		if (!occluded) setOpen(true);
	};
	const leave = () => {
		clearTimeout(hideTimer.current);
		hideTimer.current = setTimeout(() => setOpen(false), 200);
	};
	useEffect(() => () => clearTimeout(hideTimer.current), []);

	const onClick = (e) => {
		e.stopPropagation();
		setOpen((v) => !v);
		if (!controller) return;
		if (hotspot.camera_position && hotspot.camera_target) {
			controller.setCamera({ position: hotspot.camera_position, target: hotspot.camera_target }, { animate: true, duration: 600 });
			return;
		}
		const world = controller.hotspotWorld(hotspot.anchor_mesh, hotspot.offset);
		if (!world) return;
		const cam = controller.getCamera();
		const off = cam.position.map((p, i) => p - cam.target[i]);
		controller.setCamera({ position: world.map((w, i) => w + off[i]), target: world }, { animate: true, duration: 600 });
	};

	return html`<div class="wc3d-hotspot-wrapper" style=${{ transition: 'opacity 0.3s ease', opacity: occluded && !show ? 0.2 : 1, pointerEvents: occluded ? 'none' : 'auto' }}>
		${!occluded && html`<div class="wc3d-hotspot-ping"></div>`}
		<button
			type="button"
			onClick=${onClick}
			onMouseEnter=${enter}
			onMouseLeave=${leave}
			class=${hotspot.label ? 'wc3d-hotspot-button-pill' : 'wc3d-hotspot-button'}
			aria-label=${hotspot.label || hotspot.anchor_mesh || 'Hotspot'}
		>
			${hotspot.label
				? html`${hotspot.icon && hotspot.icon !== 'info' && html`<span style="display:inline-flex;align-items:center;margin-right:4px;">${hotspotIcon(hotspot.icon)}</span>`}<span>${hotspot.label}</span>`
				: hotspotIcon(hotspot.icon)}
		</button>
		${show &&
		html`<div class="wc3d-hotspot-tooltip-wrap" role="presentation" onMouseEnter=${enter} onMouseLeave=${leave} onClick=${(e) => e.stopPropagation()}>
			<div class="wc3d-hotspot-tooltip">
				${hotspot.label && html`<span class="wc3d-hotspot-tooltip-title">${hotspot.label}</span>`}
				${hotspot.description && html`<span class="wc3d-hotspot-tooltip-desc">${hotspot.description}</span>`}
				${hasProduct &&
				product &&
				html`<div style="display:flex;flex-direction:column;">
					<div class="wc3d-hotspot-product-card">
						<img src=${imageUrl} alt=${product.name} class="wc3d-hotspot-product-img" />
						<div class="wc3d-hotspot-product-info">
							<span class="wc3d-hotspot-product-title" title=${product.name}>${product.name}</span>
							<span class="wc3d-hotspot-product-price">${money(product.price)}</span>
						</div>
					</div>
					<a href=${`#store.product.${product.slug}`} class="wc3d-hotspot-action-btn">🛒 Add to Cart</a>
					<a href=${`#store.product.${product.slug}`} class="wc3d-hotspot-secondary-btn">View Product</a>
				</div>`}
				${hasLink && html`<a href=${hotspot.target_url} target="_blank" rel="noopener noreferrer" class="wc3d-hotspot-action-btn">🔗 Visit Link</a>`}
				<button
					type="button"
					onClick=${(e) => {
						e.stopPropagation();
						setOpen(false);
						onAskDelete(hotspot.id);
					}}
					class="wc3d-hotspot-delete-btn"
					title="Delete Hotspot"
				>
					✕
				</button>
			</div>
			<div class="wc3d-hotspot-tooltip-arrow"></div>
		</div>`}
	</div>`;
}

function HotspotLayer({ hotspots, controller }) {
	const refs = useRef({});
	const [occ, setOcc] = useState({});
	const [asking, setAsking] = useState(null);
	const occRef = useRef({});
	const list = Array.isArray(hotspots) ? hotspots : NO_HOTSPOTS;

	useEffect(() => {
		if (!controller) return undefined;
		let lastOcc = 0;
		const update = () => {
			const now = performance.now();
			const checkOcc = now - lastOcc > 150;
			let occChanged = false;
			const nextOcc = { ...occRef.current };
			for (const h of list) {
				const el = refs.current[h.id];
				if (!el) continue;
				const p = controller.project(h.anchor_mesh, h.offset);
				el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
				el.style.display = p.visible ? '' : 'none';
				if (checkOcc && !!p.occluded !== !!nextOcc[h.id]) {
					nextOcc[h.id] = !!p.occluded;
					occChanged = true;
				}
			}
			if (checkOcc) lastOcc = now;
			if (occChanged) {
				occRef.current = nextOcc;
				setOcc(nextOcc);
			}
		};
		update();
		const off = controller.on('camera', update);
		// Occlusion settles after the camera stops; re-check once more.
		const t = setInterval(() => {
			lastOcc = 0;
			update();
		}, 500);
		return () => {
			off();
			clearInterval(t);
		};
	}, [controller, list]);

	if (!controller || !list.length) return null;
	return html`<div style="position:absolute;inset:0;pointer-events:none;z-index:5;">
		${list.map(
			(h) => html`<div key=${h.id} ref=${(el) => (refs.current[h.id] = el)} style="position:absolute;left:0;top:0;display:none;will-change:transform;">
				<${Hotspot} hotspot=${h} controller=${controller} occluded=${!!occ[h.id]} onAskDelete=${setAsking} />
			</div>`
		)}
		${asking &&
		html`<${NativeDialog}
			title="This page says"
			message="Are you sure you want to permanently delete this hotspot?"
			onOk=${() => {
				editor.removeHotspot(asking);
				setAsking(null);
			}}
			onCancel=${() => setAsking(null)}
		/>`}
	</div>`;
}

// ── ScenePreview ──────────────────────────────────────────────────────────────

function ScenePreview() {
	const [mod, setMod] = useState(viewerLoaded);
	const [failed, setFailed] = useState(false);
	const { config, selection, placing, controller, modelKey } = useEditor((s) => ({
		config: editor.effective(),
		selection: s.selection,
		placing: s.placingHotspot,
		controller: s.viewer,
		modelKey: s.modelKey,
	}));
	const model = useMemo(() => editor.activeModel().model, [modelKey]);
	const placingRef = useRef(placing);
	placingRef.current = placing;

	useEffect(() => {
		if (mod) return undefined;
		let live = true;
		loadViewer()
			.then((m) => live && setMod(m))
			.catch((e) => {
				viewerPromise = null;
				console.error(e);
				if (live) setFailed(true);
			});
		return () => (live = false);
	}, []);

	useEffect(() => () => editor.setViewer(null), []);

	if (failed) return html`<${ErrorFrame} />`;
	if (!mod) return html`<${LoadingFrame} />`;
	if (!model)
		return html`<div class=${VIEWPORT_FRAME_CLASS}>
			<div class="flex items-center justify-center h-full text-[13px] text-slate-500 dark:text-slate-400">No model selected.</div>
		</div>`;

	const { Viewer3D } = mod;
	const onSelect = ({ mesh, point }) => {
		if (placingRef.current && mesh) {
			editor.addHotspot({ id: 'hs_' + Math.random().toString(36).substring(2, 9), anchor_mesh: mesh, offset: point || [0, 0, 0], label: 'New Hotspot' });
			editor.setPlacingHotspot(false);
			return;
		}
		editor.select(mesh ? [mesh] : []);
	};

	return html`<div class=${VIEWPORT_FRAME_CLASS} style=${getBackgroundStyle(config.environment)}>
		<${Viewer3D}
			config=${config}
			model=${model}
			interactive=${true}
			editor=${true}
			selection=${selection}
			onReady=${(c) => editor.setViewer(c)}
			onSelect=${onSelect}
			style="position:absolute;inset:0;"
		>
			<${HotspotLayer} hotspots=${config.hotspots} controller=${controller} />
		<//>
		<button
			type="button"
			onClick=${() => editor.get().viewer?.refit()}
			class="wc3d-btn wc3d-btn-ghost wc3d-btn-sm absolute bottom-3 end-3 z-10 select-none shadow-[var(--wc3d-ui-shadow-pop)]"
			title="Reset camera view"
		>
			<${Icon} name="reset" size=${14} />
			<span>Reset View</span>
		</button>
	</div>`;
}

export function CenterPanel() {
	const count = useEditor((s) => s.modelInfo?.meshes?.length ?? 0);
	return html`<main class="flex-1 min-w-0 flex flex-col overflow-hidden p-4 bg-slate-50 dark:bg-slate-950 max-md:flex-none max-md:h-[420px]">
		<${ChunkBoundary} fallback=${html`<${ErrorFrame} />`}>
			<${ScenePreview} />
		<//>
		<div
			class="self-center inline-flex items-center gap-2 mt-3 h-7 px-3 box-border rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-medium text-slate-500 dark:text-slate-400"
		>
			<span class="inline-flex items-center gap-1.5 text-[color:var(--wc3d-ui-success-fg)]">
				<span class="w-1.5 h-1.5 rounded-full bg-[color:var(--wc3d-ui-on)]"></span>
				live
			</span>
			<span aria-hidden="true" class="w-px h-3 bg-slate-200 dark:bg-slate-700"></span>
			<span class="tabular-nums">${count === 1 ? `${count} mesh` : `${count} meshes`}</span>
		</div>
	</main>`;
}

export default CenterPanel;
