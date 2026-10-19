// Centre: the editor viewer (selection outline, click to select or place a hotspot), its toolbar and hotspot pins.
import { html, useState, useEffect, useMemo, cx } from '../../../js/core/ui.js';
import { useStore } from '../../core/store.js';
import { shopperLayer } from '../../core/commerce.js';
import { Viewer3D } from '../../ui/viewer.js';
import { Icon, Button } from '../../ui/polaris.js';
import { useEd, effective, activeFile, onVariant, targetVariantId, select, setViewer, setPlacing, setWhole, setHotspotSel, setPreview, uniqueId } from './state.js';
import { IconBtn, meshLabel } from './fields.js';

/** Variant options used for conditions in the preview (the first variant when editing the default). */
export function previewOptions(s, ed) {
	const vid = targetVariantId(s, ed);
	return s.variants[vid]?.options || {};
}

function Pins({ hotspots, ctl, selected }) {
	const [pos, setPos] = useState({});
	useEffect(() => {
		if (!ctl || !hotspots.length) return undefined;
		let raf = 0;
		const tick = () => {
			const next = {};
			for (const h of hotspots) {
				const p = ctl.project(h.anchor_mesh || null, h.offset || [0, 0, 0]);
				if (p && p.visible) next[h.id] = { x: Math.round(p.x), y: Math.round(p.y), o: p.occluded };
			}
			setPos((old) => (JSON.stringify(old) === JSON.stringify(next) ? old : next));
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [ctl, JSON.stringify(hotspots)]);
	return html`<div class="ed-pins">
		${hotspots.map((h, i) => {
			const p = pos[h.id];
			if (!p) return null;
			return html`<button type="button" class=${cx('ed-pin', selected === h.id && 'is-on', p.o && 'is-occluded')} style=${{ left: p.x + 'px', top: p.y + 'px' }} title=${h.label} onClick=${() => setHotspotSel(selected === h.id ? null : h.id)}>
				<span>${i + 1}</span><em>${h.label}</em>
			</button>`;
		})}
	</div>`;
}

export function Viewport() {
	const s = useStore();
	const ed = useEd();
	const [grid, setGrid] = useState(false);
	const [spin, setSpin] = useState(false);
	const [progress, setProgress] = useState(0);
	const [ready, setReady] = useState(false);
	const eff = effective(ed);
	const file = activeFile(s, ed);
	const model = file?.demo ? { demo: file.demo } : null;

	const config = useMemo(() => (grid ? { ...eff, environment: { ...(eff.environment || {}), floorGridEnabled: true } } : eff), [eff, grid]);
	const opts = previewOptions(s, ed);
	const custom = useMemo(() => {
		const picks = Object.keys(ed.preview).length;
		const decals = {};
		for (const [id, text] of Object.entries(ed.sample)) {
			const area = (eff.decals || []).find((a) => a.id === id);
			if (area && text) decals[id] = { kind: 'text', text, font: area.fonts?.[0] || 'Georgia', color: area.colors?.[0] || '#111827', size: 0.9, x: 0, y: 0, rotation: 0 };
		}
		if (!picks && !Object.keys(decals).length) return null;
		const layer = picks ? shopperLayer(eff, { options: ed.preview }, opts) : { materials: {}, meshes: {} };
		return { ...layer, decals };
	}, [eff, ed.preview, ed.sample, JSON.stringify(opts)]);

	const onSelect = (e) => {
		if (ed.placing) {
			const anchor = e.mesh || ed.selection;
			if (!anchor) return;
			const offset = e.mesh && e.point ? e.point : [0, 0.3, 0];
			let newId = null;
			setWhole('hotspots', (list) => {
				const cur = list || [];
				newId = uniqueId('hotspot', cur.map((h) => h.id));
				return [...cur, { id: newId, anchor_mesh: anchor, offset, label: `Hotspot ${cur.length + 1}`, icon: 'info', description: '' }];
			});
			setPlacing(false);
			setHotspotSel(newId);
			return;
		}
		if (e.mesh) select(e.mesh === ed.selection && !e.additive ? null : e.mesh);
		else select(null);
	};

	return html`
		<div class=${cx('ed-stage', ed.placing && 'is-placing')}>
			${model
				? html`<${Viewer3D}
						class="ed-canvas"
						model=${model}
						config=${config}
						custom=${custom}
						editor
						interactive
						outline
						selection=${ed.selection ? [ed.selection] : []}
						autoRotate=${spin}
						onReady=${(ctl) => {
							setViewer(ctl);
							setReady(true);
						}}
						onProgress=${setProgress}
						onSelect=${onSelect}
					>
						${ready ? html`<${Pins} hotspots=${eff.hotspots || []} ctl=${ed.ctl} selected=${ed.hotspotSel} />` : null}
					<//>`
				: html`<div class="ed-stage__empty"><${Icon} name="cube" size=${32} /><p>No model yet. Pick one in the Model section.</p></div>`}
			${model && !ready ? html`<div class="ed-stage__loading"><span class="x-pimg__spin"></span> Loading 3D… ${Math.round(progress)}%</div>` : null}
			<div class="ed-toolbar" role="toolbar" aria-label="View">
				<${IconBtn} icon="fullscreen" label="Frame model" onClick=${() => ed.ctl?.resetCamera({ animate: true })} />
				<${IconBtn} icon="zoomIn" label="Zoom in" onClick=${() => ed.ctl?.zoom(1)} />
				<${IconBtn} icon="zoomOut" label="Zoom out" onClick=${() => ed.ctl?.zoom(-1)} />
				<span class="ed-toolbar__sep"></span>
				<${IconBtn} icon="grid" label="Grid" pressed=${grid} onClick=${() => setGrid(!grid)} />
				<${IconBtn} icon="rotate" label="Auto-rotate" pressed=${spin} onClick=${() => setSpin(!spin)} />
			</div>
			${ed.selection && !ed.placing
				? html`<div class="ed-stage__sel"><${Icon} name="cube" size=${13} /> ${meshLabel(eff, ed.selection)}<button type="button" aria-label="Clear selection" onClick=${() => select(null)}><${Icon} name="x" size=${12} /></button></div>`
				: null}
			${ed.placing
				? html`<div class="ed-stage__hint" role="status"><${Icon} name="hotspot" size=${15} /> Click the model to place the hotspot
						${ed.selection ? html`<${Button} size="slim" onClick=${() => onSelect({ mesh: null })}>Pin to ${meshLabel(eff, ed.selection)}<//>` : null}
						<${Button} size="slim" variant="tertiary" onClick=${() => setPlacing(false)}>Cancel<//>
					</div>`
				: null}
			${Object.keys(ed.preview).length
				? html`<div class="ed-stage__preview"><${Icon} name="eye" size=${13} /> Shopper preview<button type="button" onClick=${() => setPreview({})}>Clear</button></div>`
				: null}
		</div>
	`;
}
