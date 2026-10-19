// Port of components/HotspotsEditor: placement mode, expandable hotspot cards, product picker,
// local offset inputs and per-hotspot camera capture.
import { html, useState, useEffect, useRef } from '../../../../core/ui.js';
import { useStore } from '../../../../core/store.js';
import { editor, useEditor } from '../editor-store.js';
import {
	DIVIDER_CLASS,
	EmptyState,
	HELP_CLASS,
	INPUT_CLASS,
	INPUT_MONO_CLASS,
	LABEL_CLASS,
	LINK_DANGER_CLASS,
	MONO_TEXT_CLASS,
	SELECT_CLASS,
	SURFACE_CLASS,
	TEXTAREA_CLASS,
	useId,
} from '../../../../shared/editor-ui.js';
import { CameraIcon, ChevronRightIcon, MapPinIcon, PlusIcon } from '../../../../shared/icons.js';

const AXES = ['X', 'Y', 'Z'];
const OFFSET_STEP = 0.01;
const NO_HOTSPOTS = [];
const ERROR_CLASS = 'mt-1.5 text-[11.5px] font-medium text-[color:var(--wc3d-ui-danger-fg)]';
export const CAMERA_NOT_READY = 'Could not read camera — wait for the model to finish loading.';

const round3 = (n) => Math.round(n * 1000) / 1000;

function OffsetInput({ value, label, onCommit }) {
	const [draft, setDraft] = useState(null);
	const commit = (raw) => {
		const n = Number(raw);
		if (raw.trim() !== '' && Number.isFinite(n)) onCommit(n);
	};
	const onKeyDown = (e) => {
		if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
		e.preventDefault();
		setDraft(null);
		onCommit(round3(value + (e.key === 'ArrowUp' ? OFFSET_STEP : -OFFSET_STEP)));
	};
	const parsed = draft === null ? NaN : Number(draft);
	const isPartial = draft !== null && (draft.trim() === '' || !Number.isFinite(parsed));
	const shown = draft !== null && (isPartial || parsed === value) ? draft : String(value);
	return html`<input
		type="text"
		inputMode="decimal"
		aria-label=${label}
		value=${shown}
		onInput=${(e) => {
			setDraft(e.currentTarget.value);
			commit(e.currentTarget.value);
		}}
		onKeyDown=${onKeyDown}
		onBlur=${() => setDraft(null)}
		class=${`${INPUT_MONO_CLASS} ps-6 pe-1.5`}
		style="padding-inline:24px 6px"
	/>`;
}

function HotspotCard({ hotspot: hs, expanded, onToggle, products, update, remove }) {
	const viewer = useEditor((s) => s.viewer);
	const baseId = useId();
	const bodyId = `${baseId}-body`;
	const [confirming, setConfirming] = useState(false);
	const [camError, setCamError] = useState('');

	const setOffset = (i, num) => {
		const next = [...(hs.offset ?? [0, 0, 0])];
		next[i] = num;
		update({ offset: next });
	};

	const captureCamera = () => {
		const cam = viewer?.getCamera?.();
		if (!cam?.position || !cam?.target) return setCamError(CAMERA_NOT_READY);
		setCamError('');
		update({ camera_position: cam.position.map(round3), camera_target: cam.target.map(round3) });
	};

	const linkedMissing = hs.linked_product_id !== undefined && !products.some((p) => p.id === hs.linked_product_id);

	return html`<div
		class=${'wc3d-card p-2.5 space-y-3 relative group transition-colors ' +
		(expanded ? 'border-brand-500 dark:border-brand-400/70' : 'hover:border-slate-300 dark:hover:border-slate-700')}
	>
		<div onClick=${onToggle} class="flex items-center justify-between gap-2 cursor-pointer select-none">
			<button
				type="button"
				aria-expanded=${expanded}
				aria-controls=${bodyId}
				class="flex flex-1 items-center gap-2.5 min-w-0 text-left bg-transparent border-0 p-0 m-0 [font:inherit] text-inherit cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
			>
				<span class="wc3d-icon-tile wc3d-icon-tile-brand"><${MapPinIcon} size=${14} /></span>
				<span class="flex flex-1 flex-col min-w-0">
					<span class="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate" title=${hs.anchor_mesh}>${hs.anchor_mesh || 'Model Root'}</span>
					${!expanded && hs.label && html`<span class="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">${hs.label}</span>`}
				</span>
				<${ChevronRightIcon} size=${14} class=${`text-slate-400 dark:text-slate-500 transition-transform flex-shrink-0 ${expanded ? 'rotate-90' : ''}`} />
			</button>
			<button
				type="button"
				onClick=${(e) => {
					e.stopPropagation();
					setConfirming(true);
				}}
				class=${`${LINK_DANGER_CLASS} flex-shrink-0`}
			>
				Delete
			</button>
		</div>

		${confirming &&
		html`<div role="alertdialog" class=${`${SURFACE_CLASS} p-2.5 space-y-2`}>
			<p class="m-0 text-[12px] text-[color:var(--wc3d-ui-title)]">Are you sure you want to permanently delete this hotspot?</p>
			<div class="flex justify-end gap-1.5">
				<button type="button" class="wc3d-btn wc3d-btn-sm wc3d-btn-ghost" onClick=${() => setConfirming(false)}>Cancel</button>
				<button type="button" class="wc3d-btn wc3d-btn-sm wc3d-btn-danger" onClick=${remove}>OK</button>
			</div>
		</div>`}

		${expanded &&
		html`<div id=${bodyId} class=${`space-y-3 pt-3 ${DIVIDER_CLASS}`}>
			<div>
				<label for=${`${baseId}-label`} class=${LABEL_CLASS}>Label Text</label>
				<input id=${`${baseId}-label`} type="text" value=${hs.label ?? ''} onInput=${(e) => update({ label: e.currentTarget.value })} class=${INPUT_CLASS} placeholder="Enter annotation label…" />
			</div>
			<div>
				<label for=${`${baseId}-description`} class=${LABEL_CLASS}>Tooltip Description</label>
				<textarea
					id=${`${baseId}-description`}
					value=${hs.description ?? ''}
					onInput=${(e) => update({ description: e.currentTarget.value })}
					rows=${2}
					class=${`${TEXTAREA_CLASS} resize-none`}
					placeholder="Enter detailed description…"
				></textarea>
			</div>
			<div>
				<label for=${`${baseId}-icon`} class=${LABEL_CLASS}>Hotspot Icon</label>
				<select id=${`${baseId}-icon`} value=${hs.icon ?? 'info'} onChange=${(e) => update({ icon: e.currentTarget.value })} class=${SELECT_CLASS}>
					<option value="info">Information</option>
					<option value="link">External Link</option>
					<option value="cart">WooCommerce Product</option>
					<option value="warning">Warning / Alert</option>
				</select>
			</div>

			${hs.icon === 'link' &&
			html`<div>
				<label for=${`${baseId}-url`} class=${LABEL_CLASS}>Target URL</label>
				<input id=${`${baseId}-url`} type="url" value=${hs.target_url ?? ''} onInput=${(e) => update({ target_url: e.currentTarget.value })} class=${INPUT_CLASS} placeholder="https://example.com" />
			</div>`}

			${hs.icon === 'cart' &&
			html`<div>
				<label for=${`${baseId}-product`} class=${LABEL_CLASS}>Link to Product</label>
				<select
					id=${`${baseId}-product`}
					value=${hs.linked_product_id ?? ''}
					onChange=${(e) => update({ linked_product_id: e.currentTarget.value ? parseInt(e.currentTarget.value, 10) : undefined })}
					class=${SELECT_CLASS}
				>
					<option value="">-- Select Product --</option>
					${linkedMissing && html`<option value=${hs.linked_product_id}>Product #${hs.linked_product_id}</option>`}
					${products.map((p) => html`<option key=${p.id} value=${p.id}>${p.title}</option>`)}
				</select>
			</div>`}

			<div>
				<span class=${LABEL_CLASS}>Local Offset (X, Y, Z)</span>
				<div class="grid grid-cols-3 gap-1.5">
					${AXES.map(
						(axis, idx) => html`<div key=${axis} class="relative flex items-center">
							<span aria-hidden="true" class="absolute start-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 pointer-events-none">${axis}</span>
							<${OffsetInput} value=${hs.offset?.[idx] ?? 0} label=${`${axis} offset`} onCommit=${(v) => setOffset(idx, v)} />
						</div>`,
					)}
				</div>
			</div>

			<div class=${`pt-3 ${DIVIDER_CLASS}`}>
				<span class=${LABEL_CLASS}>Camera View Preset</span>
				<div class="flex gap-2">
					<button type="button" onClick=${captureCamera} class="wc3d-btn wc3d-btn-soft wc3d-btn-sm flex-1">
						<${CameraIcon} size=${14} />${hs.camera_position ? 'Update Cam View' : 'Capture Cam View'}
					</button>
					${hs.camera_position &&
					html`<button type="button" onClick=${() => update({ camera_position: undefined, camera_target: undefined })} class="wc3d-btn wc3d-btn-danger wc3d-btn-sm" title="Clear Custom View">Clear</button>`}
				</div>
				${camError && html`<div role="alert" class=${ERROR_CLASS}>${camError}</div>`}
				${hs.camera_position && html`<div class=${`${MONO_TEXT_CLASS} mt-1.5 break-all`}>Pos: ${hs.camera_position.join(', ')}</div>`}
			</div>
		</div>`}
	</div>`;
}

export default function HotspotsPanel() {
	const target = useEditor((s) => s.target);
	const own = useEditor(() => editor.raw()?.hotspots);
	const defaults = useEditor((s) => s.base?.config?.hotspots);
	const allProducts = useStore((s) => s.products || {});
	const isVariation = target !== 'default' && target != null;

	const isInherited = isVariation && !own && (defaults?.length ?? 0) > 0;
	const hotspots = own ?? (isVariation ? defaults : undefined) ?? NO_HOTSPOTS;
	const products = Object.values(allProducts)
		.filter((p) => p.status === 'publish')
		.map((p) => ({ id: p.id, title: p.name }))
		.sort((a, b) => a.title.localeCompare(b.title));

	const placing = useEditor((s) => s.placingHotspot);
	const [expanded, setExpanded] = useState({});

	// Auto-expand hotspots added in this context (not ones revealed by switching variation).
	const prev = useRef({ scope: target, ids: hotspots.map((h) => h.id) });
	useEffect(() => {
		const ids = hotspots.map((h) => h.id);
		const p = prev.current;
		prev.current = { scope: target, ids };
		if (p.scope !== target) return;
		const added = ids.filter((id) => !p.ids.includes(id));
		if (added.length) setExpanded((cur) => ({ ...cur, ...Object.fromEntries(added.map((id) => [id, true])) }));
	}, [hotspots, target]);

	const update = (id, patch) => editor.updateHotspot(id, patch);
	const remove = (id) => editor.removeHotspot(id);

	return html`<div class="px-4 py-3.5">
		<div class="space-y-3">
			<div>
				<button
					type="button"
					onClick=${() => editor.setPlacingHotspot(!placing)}
					aria-pressed=${placing}
					class=${'wc3d-btn w-full ' +
					(placing
						? 'bg-[var(--wc3d-ui-warn-bg)] text-[color:var(--wc3d-ui-warn-fg)] border-[color:color-mix(in_srgb,var(--wc3d-ui-warn-fg)_35%,transparent)]'
						: 'wc3d-btn-primary')}
				>
					${placing ? html`<span aria-hidden="true" class="w-2 h-2 rounded-full bg-current wc3d-pulse"></span>` : html`<${PlusIcon} size=${15} />`}
					${placing ? 'Click on 3D model to place…' : 'Add Hotspot'}
				</button>
				${placing && html`<p class=${`${HELP_CLASS} mt-2 text-center`}>Click anywhere on the model to attach a hotspot.</p>`}
			</div>

			${isInherited && html`<p class=${HELP_CLASS}>Inherited from the default configuration. Editing creates hotspots for this variation.</p>`}
			${hotspots.length === 0
				? html`<${EmptyState} variant="dashed" title="No hotspots defined." />`
				: html`<div class="space-y-2 max-h-[450px] overflow-y-auto wc3d-scroll pe-1">
						${hotspots.map(
							(hs) => html`<${HotspotCard}
								key=${hs.id}
								hotspot=${hs}
								expanded=${!!expanded[hs.id]}
								onToggle=${() => setExpanded((p) => ({ ...p, [hs.id]: !p[hs.id] }))}
								products=${products}
								update=${(patch) => update(hs.id, patch)}
								remove=${() => remove(hs.id)}
							/>`,
						)}
					</div>`}
		</div>
	</div>`;
}
