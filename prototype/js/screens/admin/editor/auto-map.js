// Attribute Auto-Map Assistant (components/VariationsOverview/AutoMapAssistant.tsx): maps the
// options of one WooCommerce attribute to meshes and writes visibility overrides per variation.
import { html, useState, useEffect, useMemo, useRef } from '../../../core/ui.js';
import { useStore } from '../../../core/store.js';
import { Icon } from '../../../shared/icons.js';
import { Checkbox, EmptyState, HELP_CLASS, IconButton, LABEL_CLASS, SELECT_CLASS, SURFACE_CLASS, useId } from '../../../shared/editor-ui.js';
import { MODEL_INFO } from '../../../engine/demo-models.js';
import { editor, useEditor } from './editor-store.js';

/** Lowercase and strip whitespace, '-' and '_' for fuzzy matching. */
const cleanForMatch = (s) => String(s).toLowerCase().replace(/[\s\-_]+/g, '');

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** <AutoMapAssistant product isOpen onClose />; stays mounted after the first open, so picks survive a reopen. */
export function AutoMapAssistant({ product, isOpen = true, onClose }) {
	const { records, attachmentId, modelInfo } = useEditor((s) => ({ records: s.variations, attachmentId: s.attachmentId, modelInfo: s.modelInfo }));
	const allVariations = useStore((g) => g.variations);
	const wcVariations = useMemo(() => (product?.variations || []).map((id) => allVariations?.[id]).filter(Boolean), [product, allVariations]);
	const attachment = useStore((g) => (attachmentId ? g.attachments?.[attachmentId] || null : null));
	const meshNames = useMemo(() => modelInfo?.meshes || (attachment?.demo && MODEL_INFO[attachment.demo]?.meshes) || [], [modelInfo, attachment]);

	const dialogRef = useRef(null);
	const titleId = useId();
	const descId = useId();
	const fieldId = useId();

	const attributes = useMemo(() => {
		const names = new Set();
		for (const v of wcVariations) for (const n of Object.keys(v.attributes || {})) names.add(n);
		return [...names];
	}, [wcVariations]);

	const [selected, setSelected] = useState(() => attributes[0] || '');
	const [exclusive, setExclusive] = useState(true);
	const [mapping, setMapping] = useState({});
	const [expanded, setExpanded] = useState({});

	const options = useMemo(() => {
		if (!selected) return [];
		const opts = new Set();
		for (const v of wcVariations) {
			const o = v.attributes?.[selected];
			if (o !== undefined && o !== '') opts.add(o);
		}
		return [...opts];
	}, [wcVariations, selected]);

	const fuzzy = useMemo(() => {
		const out = {};
		for (const o of options) {
			const c = cleanForMatch(o);
			out[o] = new Set(c === '' ? [] : meshNames.filter((m) => cleanForMatch(m).includes(c)));
		}
		return out;
	}, [options, meshNames]);

	// Preset the mapping from the fuzzy matches when the attribute changes.
	useEffect(() => {
		const m = {};
		const e = {};
		for (const o of options) {
			const matched = [...(fuzzy[o] || [])];
			m[o] = matched;
			e[o] = matched.length > 0;
		}
		setMapping(m);
		setExpanded(e);
	}, [selected, options, fuzzy]);

	// Modal: focus in, Escape closes, Tab trapped.
	useEffect(() => {
		if (!isOpen) return undefined;
		dialogRef.current?.focus();
		const onKey = (e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				onClose();
				return;
			}
			if (e.key !== 'Tab' || !dialogRef.current) return;
			const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
			if (!items.length) return;
			const first = items[0];
			const last = items[items.length - 1];
			if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [isOpen]);

	const toggleMesh = (option, mesh) =>
		setMapping((prev) => {
			const cur = prev[option] || [];
			return { ...prev, [option]: cur.includes(mesh) ? cur.filter((m) => m !== mesh) : [...cur, mesh] };
		});

	const affected = useMemo(() => {
		if (!selected) return 0;
		return wcVariations.filter((v) => {
			const o = v.attributes?.[selected];
			if (o === undefined || o === '') return false;
			const r = records[v.id];
			return !(r && r.model_id > 0 && r.model_id !== attachmentId);
		}).length;
	}, [wcVariations, selected, records, attachmentId]);

	const apply = () => {
		if (!selected) return;
		editor.applyAutoMap(selected, mapping, exclusive);
		onClose();
	};

	if (!isOpen) return null;

	return html`<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
		<div
			ref=${dialogRef}
			role="dialog"
			aria-modal="true"
			aria-labelledby=${titleId}
			aria-describedby=${descId}
			tabindex="-1"
			class="w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-pop focus:outline-none"
		>
			<header class="flex items-start gap-3.5 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800">
				<span class="wc3d-icon-tile wc3d-icon-tile-brand w-9 h-9"><${Icon} name="sparkles" size=${17} /></span>
				<div class="flex-1 min-w-0">
					<h2 id=${titleId} class="m-0 text-[18px] font-bold leading-tight text-slate-900 dark:text-slate-100">Attribute Auto-Map Assistant</h2>
					<p id=${descId} class="mt-1 mb-0 text-[13px] leading-snug text-slate-500 dark:text-slate-400">
						Automatically match WooCommerce product variation attributes to meshes in the 3D model.
					</p>
				</div>
				<${IconButton}
					label="Close"
					icon=${html`<${Icon} name="close" size=${16} strokeWidth=${2.25} />`}
					onClick=${onClose}
					class="wc3d-btn wc3d-btn-sm wc3d-btn-icon -me-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
				/>
			</header>

			<div class="flex-1 overflow-y-auto wc3d-scroll px-6 py-5 space-y-6">
				<div class=${`${SURFACE_CLASS} grid grid-cols-1 sm:grid-cols-2 gap-4 p-4`}>
					<div class="min-w-0">
						<label for=${`${fieldId}-attr`} class=${LABEL_CLASS}>1. Select WooCommerce Attribute to Map</label>
						<select id=${`${fieldId}-attr`} value=${selected} onChange=${(e) => setSelected(e.currentTarget.value)} class=${`${SELECT_CLASS} !h-10 !text-[14px] !bg-white dark:!bg-slate-900`}>
							${attributes.length === 0 ? html`<option value="">No attributes found</option>` : attributes.map((a) => html`<option key=${a} value=${a}>${a}</option>`)}
						</select>
					</div>
					<div class="min-w-0">
						<span class=${LABEL_CLASS}>Attribute Option Values Detected</span>
						<div class="flex flex-wrap items-center gap-1.5 min-h-10">
							${options.map((o) => html`<span key=${o} class="wc3d-badge wc3d-badge-brand h-6 px-2.5 text-[12px]">${o}</span>`)}
						</div>
					</div>
				</div>

				<div>
					<h3 class="m-0 mb-3 text-[14px] font-semibold leading-snug text-slate-900 dark:text-slate-100">2. Review & Refine Mesh Links</h3>
					${options.length === 0
						? html`<${EmptyState} variant="dashed" title="Select an attribute above to preview option mappings." />`
						: html`<div class="space-y-2.5">
								${options.map((option, oi) => {
									const sel = mapping[option] || [];
									const open = !!expanded[option];
									const matches = fuzzy[option];
									const unselected = meshNames.filter((m) => !sel.includes(m));
									return html`<div key=${option} class="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
										<button
											type="button"
											onClick=${() => setExpanded((p) => ({ ...p, [option]: !p[option] }))}
											aria-expanded=${open}
											class="w-full flex items-center justify-between gap-3 h-12 px-4 m-0 border-0 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60 text-start cursor-pointer transition-colors focus-visible:outline-offset-[-2px]"
										>
											<span class="flex items-center gap-2.5 min-w-0">
												<span class="font-semibold text-[13.5px] text-slate-900 dark:text-slate-100 truncate">${option}</span>
												<span class=${`wc3d-badge tabular-nums${sel.length > 0 ? ' wc3d-badge-success' : ''}`}>${sel.length === 1 ? '1 mesh' : `${sel.length} meshes`}</span>
											</span>
											<${Icon} name="expand" size=${16} class=${`flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
										</button>
										${open &&
										html`<div class="p-3 border-t border-slate-200 dark:border-slate-800 bg-[var(--wc3d-ui-tile)] space-y-2.5">
											${meshNames.length === 0
												? html`<p class=${`${HELP_CLASS} m-0 px-1`}>No meshes detected in the 3D model.</p>`
												: html`<div class="max-h-[160px] overflow-y-auto wc3d-scroll space-y-0.5">
															${meshNames.map((mesh, mi) => {
																const id = `${fieldId}-mesh-${oi}-${mi}`;
																const checked = sel.includes(mesh);
																const isFuzzy = matches?.has(mesh) ?? false;
																if (!checked && !isFuzzy) return null;
																return html`<label
																	key=${mesh}
																	for=${id}
																	class="flex items-center gap-2.5 min-h-[34px] px-2 rounded-md text-[13px] text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-white dark:hover:bg-slate-900"
																>
																	<${Checkbox} id=${id} checked=${checked} onChange=${() => toggleMesh(option, mesh)} />
																	<span class="truncate">${mesh}</span>
																	${isFuzzy && !checked && html`<span class="wc3d-badge wc3d-badge-brand ms-auto flex-shrink-0">fuzzy match</span>`}
																</label>`;
															})}
															${sel.length === 0 && html`<p class=${`${HELP_CLASS} m-0 px-2 py-1.5`}>No meshes linked yet. Choose meshes below or check matches.</p>`}
														</div>
														<select
															value=""
															onChange=${(e) => {
																const val = e.currentTarget.value;
																if (val) {
																	toggleMesh(option, val);
																	e.currentTarget.value = '';
																}
															}}
															class=${`${SELECT_CLASS} !h-9 !bg-white dark:!bg-slate-900 !text-slate-700 dark:!text-slate-300`}
														>
															<option value="">+ Link custom mesh override…</option>
															${unselected.map((m) => html`<option key=${m} value=${m}>${m}</option>`)}
														</select>`}
										</div>`}
									</div>`;
								})}
							</div>`}
				</div>

				<div>
					<h3 class="m-0 mb-3 text-[14px] font-semibold leading-snug text-slate-900 dark:text-slate-100">3. Configuration Options</h3>
					<label
						for=${`${fieldId}-exclusive`}
						class="flex items-start gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
					>
						<${Checkbox}
							id=${`${fieldId}-exclusive`}
							checked=${exclusive}
							onChange=${(e) => setExclusive(e.currentTarget.checked)}
							aria-describedby=${`${fieldId}-exclusive-desc`}
							class="mt-px"
						/>
						<span class="min-w-0">
							<span class="block text-[13px] font-semibold leading-snug text-slate-900 dark:text-slate-100">Exclusive visibility (hide matching meshes of other options)</span>
							<span id=${`${fieldId}-exclusive-desc`} class=${`${HELP_CLASS} block mt-1`}>
								If checked, applying the Red mapping will show Red meshes and explicitly hide Blue and Green meshes. Unmapped meshes stay untouched.
							</span>
						</span>
					</label>
				</div>
			</div>

			<footer class="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
				<span class="text-[13px] text-slate-500 dark:text-slate-400">
					${affected > 0
						? affected === 1
							? 'Will apply overrides to 1 WooCommerce variation.'
							: `Will apply overrides to ${affected} WooCommerce variations.`
						: 'No variations will be affected.'}
				</span>
				<div class="flex items-center gap-2.5 ms-auto">
					<button type="button" onClick=${onClose} class="wc3d-btn wc3d-btn-lg wc3d-btn-ghost">Cancel</button>
					<button type="button" onClick=${apply} disabled=${affected === 0 || meshNames.length === 0} class="wc3d-btn wc3d-btn-lg wc3d-btn-primary">Apply mapping</button>
				</div>
			</footer>
		</div>
	</div>`;
}

export default AutoMapAssistant;
