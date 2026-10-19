// "Personalization" (planned, flag decals): areas where customers add their own text or image,
// stored in config.decals. Shared rules in shared/decals.js; the engine draws (engine/decals.js).
import { html, useState, useEffect, useRef } from '../../../../core/ui.js';
import { useStore } from '../../../../core/store.js';
import { useFeature } from '../../../../core/features.js';
import { editor, useEditor } from '../editor-store.js';
import {
	Checkbox,
	ColorField,
	DIVIDER_CLASS,
	EmptyState,
	EYEBROW_CLASS,
	HELP_CLASS,
	IconButton,
	INPUT_CLASS,
	INPUT_SM_CLASS,
	LABEL_CLASS,
	LINK_DANGER_CLASS,
	SELECT_CLASS,
	SliderRow,
	SURFACE_CLASS,
	ToggleRow,
	useId,
} from '../../../../shared/editor-ui.js';
import { Icon } from '../../../../shared/icons.js';
import { basePriceOf } from '../../../../shared/options.js';
import { DECAL_FONTS, DECAL_SIDES, DEFAULT_PLACEMENT, normalizeArea } from '../../../../shared/decals.js';
import { RuleRow } from './pricing.js';

const NO_AREAS = [];
const LIVE_MS = 400;
const KIND_LABELS = { text: 'Text', image: 'Image', both: 'Text & image' };
const META_CLASS = 'text-[11.5px] text-slate-500 dark:text-slate-400';
const CHIP_CLASS =
	'inline-flex items-center max-w-full h-6 ps-1.5 pe-0.5 gap-1 box-border rounded-full border border-slate-200 dark:border-slate-700 bg-[var(--wc3d-ui-tile)] text-[11.5px] font-medium text-[color:var(--wc3d-ui-title)]';
const DOT_CLASS = 'w-3.5 h-3.5 flex-shrink-0 rounded-full border border-black/10 dark:border-white/15';
const BARE_BTN = 'bg-transparent border-0 p-0 m-0 [font:inherit] text-inherit cursor-pointer';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const lc = (s) => String(s ?? '').trim().toLowerCase();
const pct = (v) => `${Math.round(v * 100)}%`;
const deg = (v) => `${Math.round(v)}°`;
const kindKey = (kinds) => (kinds.includes('text') && kinds.includes('image') ? 'both' : kinds[0] || 'text');
const move = (list, i, d) => {
	const j = i + d;
	if (j < 0 || j >= list.length) return list;
	const next = list.slice();
	[next[i], next[j]] = [next[j], next[i]];
	return next;
};
const without = (obj, key) => {
	const { [key]: _drop, ...rest } = obj;
	return rest;
};

/** What the open area shows in the viewport: sample text, or a placeholder picture for image-only areas. */
function sampleContent(a) {
	const base = { size: a.max_size, x: 0, y: 0, rotation: 0 };
	if (!a.kinds.includes('text')) return { ...base, kind: 'image', placeholder: true };
	const text = a.max_chars >= 9 ? 'Your text' : 'ABCDEFGH'.slice(0, a.max_chars);
	return { ...base, kind: 'text', text, font: a.fonts[0], color: a.colors[0] };
}

// replace() never coalesces, so typing/dragging is held locally and written after a pause (one undo step per word or drag).
function useListWriter(target, toStored) {
	const [draft, setDraft] = useState(null);
	const pending = useRef(null);
	const timer = useRef(0);
	const flush = () => {
		clearTimeout(timer.current);
		const p = pending.current;
		if (!p) return;
		pending.current = null;
		if (editor.get().target === p.target) editor.replace('decals', p.value);
		setDraft(null);
	};
	const live = (next) => {
		pending.current = { target, value: toStored(next) };
		setDraft(next);
		clearTimeout(timer.current);
		timer.current = setTimeout(flush, LIVE_MS);
	};
	const commit = (next) => {
		clearTimeout(timer.current);
		pending.current = null;
		editor.replace('decals', toStored(next));
		setDraft(null);
	};
	useEffect(() => () => {
		clearTimeout(timer.current);
		const p = pending.current;
		pending.current = null;
		if (p && editor.get().target === p.target) editor.replace('decals', p.value);
	}, []);
	useEffect(() => {
		flush();
		setDraft(null);
	}, [target]);
	return { draft, live, commit, flush };
}

function ColorList({ colors, onChange }) {
	const [pick, setPick] = useState('#c2410c');
	const fresh = !colors.includes(lc(pick));
	return html`<div class="space-y-2">
		<div class="flex flex-wrap gap-1.5">
			${colors.map(
				(hex) => html`<span key=${hex} class=${CHIP_CLASS}>
					<span class=${DOT_CLASS} style=${{ background: hex }} aria-hidden="true"></span>
					<span class="font-mono">${hex}</span>
					<${IconButton}
						variant="danger"
						label=${`Remove ${hex}`}
						disabled=${colors.length < 2}
						icon=${html`<${Icon} name="close" size=${10} />`}
						onClick=${() => onChange(colors.filter((c) => c !== hex))}
						class="!p-1 rounded-full"
					/>
				</span>`
			)}
		</div>
		<div class="flex items-end gap-2">
			<div class="flex-1 min-w-0"><${ColorField} label="New colour" value=${pick} onChange=${setPick} /></div>
			<button type="button" class="wc3d-btn wc3d-btn-soft wc3d-btn-sm flex-shrink-0" disabled=${!fresh} onClick=${() => onChange([...colors, lc(pick)])}>
				<${Icon} name="plus" size=${12} />Add colour
			</button>
		</div>
	</div>`;
}

function AreaCard({ area: raw, index, count, expanded, selection, meshes, pricing, bases, disabled, actions }) {
	const baseId = useId();
	const bodyId = `${baseId}-body`;
	const [confirming, setConfirming] = useState(false);
	const a = normalizeArea(raw);
	const p = a.placement;
	const { patch, place, toggle, remove, flush } = actions;
	const sel = selection.find((m) => meshes.includes(m) && m !== a.mesh);
	const meshOptions = meshes.includes(a.mesh) ? meshes : [a.mesh, ...meshes];
	const setKinds = (k) => patch({ kinds: k === 'both' ? ['text', 'image'] : [k] });
	const toggleFont = (f) => {
		if (!a.fonts.includes(f)) patch({ fonts: [...a.fonts, f] });
		else if (a.fonts.length > 1) patch({ fonts: a.fonts.filter((x) => x !== f) });
	};

	return html`<div class=${'wc3d-card p-2.5 transition-colors ' + (expanded ? 'border-brand-500 dark:border-brand-400/70' : 'hover:border-slate-300 dark:hover:border-slate-700')}>
		<div class="flex items-center gap-1">
			<button
				type="button"
				onClick=${toggle}
				aria-expanded=${expanded}
				aria-controls=${bodyId}
				disabled=${disabled}
				class=${`${BARE_BTN} flex flex-1 items-center gap-2.5 min-w-0 text-start rounded-md disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40`}
			>
				<span class="wc3d-icon-tile wc3d-icon-tile-brand"><${Icon} name="brush" size=${14} /></span>
				<span class="flex flex-1 flex-col gap-1 min-w-0">
					<span class="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">${raw.label || 'Untitled area'}</span>
					<span class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
						<span class="wc3d-badge wc3d-badge-brand">${KIND_LABELS[kindKey(a.kinds)]}</span>
						${a.required && html`<span class="wc3d-badge wc3d-badge-warning">Required</span>`}
						<span class=${`${META_CLASS} whitespace-nowrap`}>${a.mesh} · ${DECAL_SIDES[p.side]}</span>
					</span>
				</span>
				${!disabled && html`<${Icon} name="chevron-right" size=${14} class=${`flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />`}
			</button>
			${!disabled &&
			html`<div class="flex flex-col flex-shrink-0">
				<${IconButton} variant="ghost" label=${`Move ${raw.label || 'area'} up`} disabled=${index === 0} onClick=${() => actions.move(-1)} icon=${html`<${Icon} name="chevron-down" size=${12} class="rotate-180" />`} class="!p-1" />
				<${IconButton} variant="ghost" label=${`Move ${raw.label || 'area'} down`} disabled=${index === count - 1} onClick=${() => actions.move(1)} icon=${html`<${Icon} name="chevron-down" size=${12} />`} class="!p-1" />
			</div>`}
		</div>

		${expanded &&
		!disabled &&
		html`<div id=${bodyId} class=${`space-y-3 mt-2.5 pt-3 ${DIVIDER_CLASS}`}>
			<div>
				<label for=${`${baseId}-label`} class=${LABEL_CLASS}>Label</label>
				<input id=${`${baseId}-label`} type="text" value=${raw.label ?? ''} onInput=${(e) => patch({ label: e.currentTarget.value }, true)} class=${INPUT_CLASS} placeholder="e.g. Engraving" />
			</div>

			<div>
				<div class="flex items-center justify-between gap-2 mb-1.5">
					<label for=${`${baseId}-mesh`} class=${`${LABEL_CLASS} !mb-0`}>Mesh</label>
					<button type="button" disabled=${!sel} onClick=${() => patch({ mesh: sel })} title=${sel ? `Use ${sel}` : 'Select a mesh in the tree or the viewport first'} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm">
						Use selected mesh
					</button>
				</div>
				<select id=${`${baseId}-mesh`} value=${a.mesh} onChange=${(e) => patch({ mesh: e.currentTarget.value })} class=${SELECT_CLASS}>
					${meshOptions.map((m) => html`<option key=${m} value=${m}>${m}</option>`)}
				</select>
			</div>

			<div class=${`pt-3 space-y-3 ${DIVIDER_CLASS}`}>
				<span class=${EYEBROW_CLASS}>Placement</span>
				<div>
					<label for=${`${baseId}-side`} class=${LABEL_CLASS}>Side</label>
					<select id=${`${baseId}-side`} value=${p.side} onChange=${(e) => place({ side: e.currentTarget.value })} class=${SELECT_CLASS}>
						${Object.entries(DECAL_SIDES).map(([k, v]) => html`<option key=${k} value=${k}>${v}</option>`)}
					</select>
				</div>
				<${SliderRow} label="Horizontal" value=${p.x} min=${0} max=${1} step=${0.01} format=${pct} onChange=${(x) => place({ x }, true)} onChangeEnd=${flush} />
				<${SliderRow} label="Vertical" value=${p.y} min=${0} max=${1} step=${0.01} format=${pct} onChange=${(y) => place({ y }, true)} onChangeEnd=${flush} />
				<${SliderRow} label="Width" value=${p.width} min=${0.05} max=${1} step=${0.01} format=${pct} onChange=${(width) => place({ width }, true)} onChangeEnd=${flush} />
				<${SliderRow} label="Height" value=${p.height} min=${0.05} max=${1} step=${0.01} format=${pct} onChange=${(height) => place({ height }, true)} onChangeEnd=${flush} />
				<${SliderRow} label="Rotation" value=${p.rotation} min=${-180} max=${180} step=${1} format=${deg} onChange=${(rotation) => place({ rotation }, true)} onChangeEnd=${flush} />
				<p class=${`${HELP_CLASS} m-0`}>Drag the dashed area on the model to move it.</p>
			</div>

			<div class=${`pt-3 space-y-3 ${DIVIDER_CLASS}`}>
				<div>
					<label for=${`${baseId}-kinds`} class=${LABEL_CLASS}>Customers can add</label>
					<select id=${`${baseId}-kinds`} value=${kindKey(a.kinds)} onChange=${(e) => setKinds(e.currentTarget.value)} class=${SELECT_CLASS}>
						${Object.entries(KIND_LABELS).map(([k, v]) => html`<option key=${k} value=${k}>${v}</option>`)}
					</select>
				</div>
				${a.kinds.includes('text') &&
				html`<div>
						<span class=${LABEL_CLASS}>Fonts</span>
						<div class="grid grid-cols-2 gap-x-2 gap-y-1.5">
							${Object.keys(DECAL_FONTS).map((f) => {
								const on = a.fonts.includes(f);
								return html`<label key=${f} class="flex items-center gap-2 min-w-0 text-[12px] text-slate-700 dark:text-slate-200 cursor-pointer">
									<${Checkbox} checked=${on} disabled=${on && a.fonts.length < 2} onChange=${() => toggleFont(f)} />
									<span class="min-w-0 truncate" style=${{ fontFamily: DECAL_FONTS[f] }}>${f}</span>
								</label>`;
							})}
						</div>
						<p class=${`${HELP_CLASS} m-0 mt-1.5`}>Customers start with ${a.fonts[0]} and the first colour.</p>
					</div>
					<div>
						<span class=${LABEL_CLASS}>Colours</span>
						<${ColorList} colors=${a.colors} onChange=${(colors) => patch({ colors })} />
					</div>
					<div class="flex items-center gap-3">
						<label for=${`${baseId}-max`} class=${`${LABEL_CLASS} !mb-0 flex-1`}>Max characters</label>
						<input
							id=${`${baseId}-max`}
							type="number"
							min="1"
							max="100"
							value=${a.max_chars}
							onInput=${(e) => {
								const n = Math.round(Number(e.currentTarget.value));
								if (Number.isFinite(n) && n >= 1) patch({ max_chars: Math.min(100, n) }, true);
							}}
							class=${`${INPUT_SM_CLASS} !w-[76px] text-end tabular-nums`}
						/>
					</div>`}
				<${SliderRow} label="Smallest size" value=${a.min_size} min=${0.1} max=${1} step=${0.05} format=${pct} onChange=${(v) => patch({ min_size: v, max_size: Math.max(v, a.max_size) }, true)} onChangeEnd=${flush} />
				<${SliderRow} label="Largest size" value=${a.max_size} min=${0.1} max=${1} step=${0.05} format=${pct} onChange=${(v) => patch({ max_size: v, min_size: Math.min(v, a.min_size) }, true)} onChangeEnd=${flush} />
				<${ToggleRow} label="Required" description="Customers must fill this area before adding to cart." checked=${a.required} onChange=${(on) => patch({ required: on })} />
			</div>

			${pricing &&
			html`<div class=${`pt-1 ${DIVIDER_CLASS}`}>
				<${RuleRow} label="Price" name=${`${raw.label || 'Area'} price`} rule=${raw.price ?? null} bases=${bases} onChange=${(rule) => actions.update((cur) => (rule ? { ...cur, price: rule } : without(cur, 'price')), true)} />
				<p class=${`${HELP_CLASS} m-0`}>Charged when the customer fills this area.</p>
			</div>`}

			<div class=${`pt-3 ${DIVIDER_CLASS}`}>
				${confirming
					? html`<div role="alertdialog" aria-label="Delete area" class=${`${SURFACE_CLASS} p-2.5 space-y-2`}>
							<p class="m-0 text-[12px] text-[color:var(--wc3d-ui-title)]">Are you sure you want to permanently delete this area?</p>
							<div class="flex justify-end gap-1.5">
								<button type="button" class="wc3d-btn wc3d-btn-sm wc3d-btn-ghost" onClick=${() => setConfirming(false)}>Cancel</button>
								<button type="button" class="wc3d-btn wc3d-btn-sm wc3d-btn-danger" onClick=${remove}>OK</button>
							</div>
						</div>`
					: html`<button type="button" onClick=${() => setConfirming(true)} class=${LINK_DANGER_CLASS}>Delete area</button>`}
			</div>
		</div>`}
	</div>`;
}

export default function DecalsPanel() {
	const target = useEditor((s) => s.target);
	const productId = useEditor((s) => s.productId);
	const own = useEditor(() => editor.raw()?.decals);
	const defaults = useEditor((s) => s.base?.config?.decals);
	const variationRecords = useEditor((s) => s.variations);
	const selection = useEditor((s) => s.selection);
	const viewer = useEditor((s) => s.viewer);
	const meshList = useEditor((s) => (s.modelInfo?.meshes || []).join('|'));
	const pricing = useFeature('option-pricing');
	const base = useStore((s) => basePriceOf(s, productId, target === 'default' ? 0 : Number(target)));
	const bases = useStore((s) => {
		const p = s.products?.[productId];
		if (target !== 'default' || p?.type !== 'variable') return [base];
		const vids = (p.variations || []).filter((vid) => s.variationConfigs?.[vid]?.config?.decals == null);
		return vids.length ? vids.map((vid) => basePriceOf(s, productId, vid)) : [base];
	});

	const isVariation = target !== 'default' && target != null;
	const inherited = isVariation && own == null;
	const toStored = (list) => (!isVariation && !list.length ? undefined : list);
	const writer = useListWriter(target, toStored);
	const saved = (inherited ? defaults : own) || NO_AREAS;
	const list = Array.isArray(writer.draft ?? saved) ? writer.draft ?? saved : NO_AREAS;
	const areas = list.filter((a) => isObj(a) && a.id);
	const meshes = (viewer?.getMeshNames?.() || (meshList ? meshList.split('|') : [])).filter(Boolean);

	const [openArea, setOpenArea] = useState(null);
	useEffect(() => setOpenArea(null), [target, inherited]);
	const open = !inherited && openArea ? areas.find((a) => a.id === openArea) : null;

	// Viewport preview of the open area: sample content + dashed outline, unsaved (draft) placement
	// included so dragging and sliders move it live; cleared on collapse/unmount.
	const openKey = open ? JSON.stringify([normalizeArea(open), list]) : '';
	useEffect(() => {
		const d = viewer?.decals;
		if (!d) return;
		if (open) {
			const a = normalizeArea(open);
			d.setPreview({ [a.id]: sampleContent(a) }, list);
			d.setGuide(a.id);
		} else {
			d.setPreview(null);
			d.setGuide(null);
		}
	}, [viewer, openKey]);
	useEffect(
		() => () => {
			viewer?.decals?.setPreview(null);
			viewer?.decals?.setGuide(null);
		},
		[viewer]
	);

	const write = (next, live = false) => (live ? writer.live(next) : writer.commit(next));
	const updateArea = (id, fn, live) => write(list.map((a) => (a?.id === id ? fn(a) : a)), live);

	// Drag the open area on the model (orbit pauses while dragging).
	const live = useRef({});
	live.current = { open, list, writer };
	useEffect(() => {
		const d = viewer?.decals;
		if (!d || !open) return;
		const el = viewer.element;
		let drag = null;
		const down = (e) => {
			if (e.button !== 0) return;
			const cur = live.current.open;
			if (!cur || d.areaAt(e.clientX, e.clientY)?.id !== cur.id) return;
			const start = d.facePoint(cur.id, e.clientX, e.clientY);
			if (!start) return;
			e.stopPropagation();
			e.preventDefault();
			drag = { id: cur.id, start, p: normalizeArea(cur).placement, pointerId: e.pointerId };
			try {
				el.setPointerCapture(e.pointerId);
			} catch {
				// Pointer already released.
			}
			el.style.cursor = 'grabbing';
		};
		const moveTo = (e) => {
			if (!drag) return;
			e.stopPropagation();
			const f = d.facePoint(drag.id, e.clientX, e.clientY);
			if (!f) return;
			const x = Math.round(Math.min(1, Math.max(0, drag.p.x + f.x - drag.start.x)) * 1000) / 1000;
			const y = Math.round(Math.min(1, Math.max(0, drag.p.y + f.y - drag.start.y)) * 1000) / 1000;
			const { list: l, writer: w } = live.current;
			w.live(l.map((a) => (a?.id === drag.id ? { ...a, placement: { ...normalizeArea(a).placement, x, y } } : a)));
		};
		const up = (e) => {
			if (!drag) return;
			e.stopPropagation();
			try {
				el.releasePointerCapture(drag.pointerId);
			} catch {
				// Already released.
			}
			drag = null;
			el.style.cursor = '';
			live.current.writer.flush();
		};
		el.addEventListener('pointerdown', down, true);
		el.addEventListener('pointermove', moveTo, true);
		el.addEventListener('pointerup', up, true);
		el.addEventListener('pointercancel', up, true);
		return () => {
			el.style.cursor = '';
			el.removeEventListener('pointerdown', down, true);
			el.removeEventListener('pointermove', moveTo, true);
			el.removeEventListener('pointerup', up, true);
			el.removeEventListener('pointercancel', up, true);
		};
	}, [viewer, open?.id]);

	const freshId = () => {
		const used = new Set([...(defaults || []), ...areas, ...Object.values(variationRecords || {}).flatMap((r) => r?.config?.decals || [])].map((a) => a?.id));
		let n = 1;
		while (used.has('area-' + n)) n++;
		return 'area-' + n;
	};
	const addArea = () => {
		const id = freshId();
		const mesh = selection.find((m) => meshes.includes(m)) || meshes[0] || '';
		write([...list, { id, label: `Area ${areas.length + 1}`, mesh, placement: { ...DEFAULT_PLACEMENT }, kinds: ['text'], fonts: ['Inter', 'Georgia'], colors: ['#000000', '#ffffff'], max_chars: 20, min_size: 0.3, max_size: 1, required: false }]);
		setOpenArea(id);
	};

	const actionsFor = (a, i) => ({
		patch: (p, liveEdit) => updateArea(a.id, (cur) => ({ ...cur, ...p }), liveEdit),
		update: (fn, liveEdit) => updateArea(a.id, fn, liveEdit),
		place: (p, liveEdit) => updateArea(a.id, (cur) => ({ ...cur, placement: { ...normalizeArea(cur).placement, ...p } }), liveEdit),
		move: (d) => write(move(list, i, d)),
		toggle: () => setOpenArea((cur) => (cur === a.id ? null : a.id)),
		remove: () => {
			write(list.filter((x) => x?.id !== a.id));
			setOpenArea(null);
		},
		flush: writer.flush,
	});

	return html`<div class="px-4 py-3.5 space-y-3" onfocusout=${writer.flush}>
		<p class=${`${HELP_CLASS} m-0`}>Let customers add their own text or image to an area of the model.</p>

		${isVariation &&
		(inherited
			? html`<div class=${`${SURFACE_CLASS} flex items-center gap-2.5 p-2.5`}>
					<span class="flex-1 min-w-0 text-[12px] font-semibold text-slate-700 dark:text-slate-200">Inherited from Default</span>
					<button type="button" onClick=${() => writer.commit(clone(defaults) || [])} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm">Set personalization for this variation</button>
				</div>`
			: html`<div class=${`${SURFACE_CLASS} flex items-center gap-2.5 p-2.5`}>
					<span class="flex-1 min-w-0 text-[12px] font-semibold text-slate-700 dark:text-slate-200">Personalization for this variation</span>
					<button type="button" onClick=${() => writer.commit(undefined)} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm">Use Default personalization</button>
				</div>`)}

		${areas.length
			? html`<div class="space-y-2">
					${areas.map(
						(a, i) => html`<${AreaCard}
							key=${a.id}
							area=${a}
							index=${i}
							count=${areas.length}
							expanded=${!inherited && openArea === a.id}
							selection=${selection}
							meshes=${meshes}
							pricing=${pricing}
							bases=${bases}
							disabled=${inherited}
							actions=${actionsFor(a, list.indexOf(a))}
						/>`
					)}
				</div>`
			: html`<${EmptyState} variant="dashed" title="No personalization areas yet." />`}
		${open && html`<p class=${`${HELP_CLASS} m-0`}>The open area is previewed in the viewport with sample content.</p>`}
		${!inherited && html`<button type="button" onClick=${addArea} class="wc3d-btn wc3d-btn-soft w-full"><${Icon} name="plus" size=${14} />Add area</button>`}
	</div>`;
}
