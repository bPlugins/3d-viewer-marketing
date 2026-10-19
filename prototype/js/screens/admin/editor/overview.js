// VariationsOverview (components/VariationsOverview): model summary card, search + Linked/Unlinked
// filter, variation cards grouped by first attribute, Auto-Map Assistant launcher.
import { html, useState, useMemo, useRef } from '../../../core/ui.js';
import { useStore } from '../../../core/store.js';
import { useFeature } from '../../../core/features.js';
import { Icon } from '../../../shared/icons.js';
import { EmptyState, INPUT_CLASS, SEG_CLASS } from '../../../shared/editor-ui.js';
import { MODEL_INFO } from '../../../engine/demo-models.js';
import { editor, useEditor, variationLabel, variationAttributeName } from './editor-store.js';
import { AutoMapAssistant } from './auto-map.js';
import { isOn } from '../../../core/features.js';
import { isExternal, urlHost, ExternalTag } from '../../../shared/external-url.js';
import { variantCountLabel } from './panels/material-variants.js';

// ── variationColors.ts ──
function parseHex(hex) {
	const m = String(hex).replace('#', '');
	const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
	const n = parseInt(full, 16);
	if (Number.isNaN(n)) return { r: 200, g: 200, b: 200 };
	return { r: Math.floor(n / 65536) % 256, g: Math.floor(n / 256) % 256, b: n % 256 };
}
export function lighten(hex, amt) {
	const { r, g, b } = parseHex(hex);
	return `rgb(${Math.round(r + (255 - r) * amt)}, ${Math.round(g + (255 - g) * amt)}, ${Math.round(b + (255 - b) * amt)})`;
}
export function darken(hex, amt) {
	const { r, g, b } = parseHex(hex);
	return `rgb(${Math.round(r * (1 - amt))}, ${Math.round(g * (1 - amt))}, ${Math.round(b * (1 - amt))})`;
}
export function sphereBackground(color, textureUrl) {
	if (textureUrl) return `url(${textureUrl}) center/cover`;
	if (color) return `radial-gradient(circle at 35% 30%, ${lighten(color, 0.35)} 0%, ${color} 55%, ${darken(color, 0.25)} 100%)`;
	return 'radial-gradient(circle at 35% 30%, #f3f4f6 0%, #cbd5e1 55%, #9ca3af 100%)';
}

function summarise(cfg, pricing = false, groups = false, variant = false) {
	if (!cfg) return { overrideCount: 0, meshChanged: 0 };
	const meshKeys = Object.keys(cfg.meshes || {});
	const matKeys = Object.keys(cfg.materials || {});
	let color;
	for (const k of matKeys) if (!color && cfg.materials[k]?.baseColor) color = cfg.materials[k].baseColor;
	for (const k of meshKeys) if (!color && cfg.meshes[k]?.color) color = cfg.meshes[k].color;
	let textureUrl;
	for (const k of meshKeys) if (!textureUrl && cfg.meshes[k]?.texture?.url) textureUrl = cfg.meshes[k].texture.url;
	for (const k of matKeys) {
		const tex = cfg.materials[k]?.textures;
		const first = tex ? Object.values(tex)[0]?.url : undefined;
		if (!textureUrl && first) textureUrl = first;
	}
	const priced = pricing && cfg.pricing != null ? 1 : 0;
	const grouped = groups && cfg.options != null ? 1 : 0;
	const varianted = variant && cfg.material_variant != null ? 1 : 0;
	return { overrideCount: meshKeys.length + matKeys.length + priced + grouped + varianted, meshChanged: meshKeys.length, color, textureUrl };
}

const plural = (n, one, many) => (n === 1 ? one : many).replace('%d', n);

function VariationCard({ variation, record, label, unsaved }) {
	const pricing = useFeature('option-pricing');
	const groups = useFeature('option-groups');
	const variantOn = useFeature('materials-variants');
	const summary = useMemo(() => summarise(record?.config, pricing, groups, variantOn), [record, pricing, groups, variantOn]);
	const bound = !!record;
	return html`<button
		type="button"
		onClick=${() => editor.openTarget(variation.id)}
		class=${'wc3d-card group relative flex flex-col p-0 m-0 text-start overflow-hidden cursor-pointer transition-[border-color,box-shadow] duration-150 hover:border-slate-300 hover:shadow-card-h dark:hover:border-slate-600 ' +
		(bound ? '' : 'border-dashed border-slate-300 dark:border-slate-700')}
	>
		<div class="relative flex items-center justify-center w-full h-28 bg-[var(--wc3d-ui-tile)]">
			${bound
				? html`<div class="w-16 h-16 rounded-full shadow-inner ring-1 ring-black/5 dark:ring-white/10" style=${{ background: sphereBackground(summary.color, summary.textureUrl) }} aria-hidden="true"></div>`
				: html`<${Icon} name="link-off" size=${30} class="text-slate-300 dark:text-slate-600" />`}
			${unsaved && html`<span class="wc3d-badge wc3d-badge-warning absolute top-2 start-2">Unsaved</span>`}
			<span class=${'wc3d-badge wc3d-badge-dot absolute top-2 end-2 ' + (bound ? 'wc3d-badge-success' : 'wc3d-badge-warning')}>
				${bound ? plural(summary.overrideCount, '%d override', '%d overrides') : 'Not bound'}
			</span>
		</div>
		<div class="flex flex-col gap-1 w-full box-border px-3.5 py-3 border-t border-slate-200 dark:border-slate-800">
			<div class="flex items-center justify-between gap-2">
				<span class="font-semibold text-[13.5px] leading-snug text-slate-900 dark:text-slate-100 truncate">${label}</span>
				<span class="text-[12px] text-slate-400 dark:text-slate-500 tabular-nums flex-shrink-0">#${variation.id}</span>
			</div>
			<div class="flex items-center justify-between gap-2 text-[12px] text-slate-500 dark:text-slate-400">
				${bound
					? html`<span class="inline-flex items-center gap-1.5 min-w-0 truncate">
							<${Icon} name="cube" size=${12} class="flex-shrink-0" />
							${plural(summary.meshChanged, '%d mesh changed', '%d meshes changed')}
						</span>`
					: html`<span class="font-medium text-brand-500 dark:text-brand-400 truncate">Click to bind →</span>`}
				<${Icon}
					name="chevron-right"
					size=${14}
					class="flex-shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity rtl:-scale-x-100"
				/>
			</div>
		</div>
	</button>`;
}

function AttributeGroup({ name, variations, records, dirtyIds }) {
	const linked = variations.filter((v) => !!records[v.id]).length;
	const total = variations.length;
	const pct = total > 0 ? (linked / total) * 100 : 0;
	return html`<section class="wc3d-card p-5">
		<header class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
			<div class="flex items-center gap-2 min-w-0">
				<h3 class="m-0 text-[15px] font-bold leading-snug text-slate-900 dark:text-slate-100 truncate">${name}</h3>
				<span class="wc3d-badge tabular-nums">${total}</span>
			</div>
			<div class="flex flex-shrink-0 items-center gap-3 text-[12px] text-slate-500 dark:text-slate-400">
				<div class="relative w-28 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
					<div class="absolute inset-y-0 start-0 rounded-full bg-emerald-500 transition-[width] duration-300" style=${{ width: `${pct}%` }}></div>
				</div>
				<span class="font-medium tabular-nums">${linked} / ${total} linked</span>
			</div>
		</header>
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
			${variations.map(
				(v) => html`<${VariationCard} key=${v.id} variation=${v} record=${records[v.id]} label=${variationLabel(v)} unsaved=${dirtyIds.includes(v.id)} />`
			)}
		</div>
	</section>`;
}

function FilterChip({ label, active, onClick, dot }) {
	return html`<button type="button" onClick=${onClick} aria-pressed=${active} class="inline-flex items-center justify-center gap-2 h-[34px] px-3.5 text-[13px] tabular-nums">
		${dot && html`<span aria-hidden="true" class=${'w-2 h-2 rounded-full flex-shrink-0 ' + dot + (active ? ' ring-2 ring-white/70' : '')}></span>`}
		${label}
	</button>`;
}

/** <VariationsOverview product /> */
export function VariationsOverview({ product }) {
	const { records, dirtyIds, attachmentId, modelInfo } = useEditor((s) => ({
		records: s.variations,
		dirtyIds: s.dirtyVariationIds,
		attachmentId: s.attachmentId,
		modelInfo: s.modelInfo,
	}));
	const allVariations = useStore((g) => g.variations);
	const wcVariations = useMemo(() => (product?.variations || []).map((id) => allVariations?.[id]).filter(Boolean), [product, allVariations]);
	const attachment = useStore((g) => (attachmentId ? g.attachments?.[attachmentId] || null : null));
	const [filter, setFilter] = useState('all');
	const [query, setQuery] = useState('');
	const [autoMapOpen, setAutoMapOpen] = useState(false);
	const hasOpenedAutoMap = useRef(false);
	if (autoMapOpen) hasOpenedAutoMap.current = true;
	const opener = useRef(null);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return wcVariations.filter((v) => {
			const bound = !!records[v.id];
			if (filter === 'linked' && !bound) return false;
			if (filter === 'unlinked' && bound) return false;
			if (q && !variationLabel(v).toLowerCase().includes(q)) return false;
			return true;
		});
	}, [wcVariations, records, filter, query]);

	const groups = useMemo(() => {
		const map = new Map();
		for (const v of filtered) {
			const key = variationAttributeName(v) || 'Variations';
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(v);
		}
		return [...map.entries()];
	}, [filtered]);

	let emptyTitle = 'No variations match the current filter.';
	if (!wcVariations.length) emptyTitle = 'No variations on this product.';
	else if (query) emptyTitle = 'No variations match your search.';

	const totalLinked = wcVariations.filter((v) => !!records[v.id]).length;
	const totalUnlinked = wcVariations.length - totalLinked;
	const hasModel = !!attachment;
	const meshCount = (modelInfo?.meshes || (attachment?.demo && MODEL_INFO[attachment.demo]?.meshes) || []).length;
	const variantsMeta = useFeature('materials-variants') && hasModel ? variantCountLabel(attachment, modelInfo) : '';
	const modelMeta = hasModel ? `${attachment.filename || 'untitled'} · ${plural(meshCount, '%d mesh', '%d meshes')}${variantsMeta ? ' · ' + variantsMeta : ''}` : 'No model attached';

	return html`<div class="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-slate-950 wc3d-scroll overflow-y-auto">
		<div class="box-border max-w-7xl w-full mx-auto px-8 py-7 space-y-5 max-sm:px-4 max-sm:py-5">
			<div class="wc3d-card flex flex-wrap items-center gap-x-4 gap-y-3 p-5">
				<span class="wc3d-icon-tile wc3d-icon-tile-brand w-14 h-14 rounded-lg"><${Icon} name="cube" size=${26} strokeWidth=${1.75} /></span>
				<div class="flex-1 min-w-[180px]">
					<h2 class="m-0 text-[18px] font-bold leading-tight text-slate-900 dark:text-slate-100 truncate">${product?.name}</h2>
					<div class="mt-1.5 flex items-center gap-2 flex-wrap text-[13px] text-slate-500 dark:text-slate-400">
						${attachment?.filename &&
						(isOn('external-url') && isExternal(attachment)
							? html`<${ExternalTag} att=${attachment} /><span class="truncate" title=${attachment.url}>${urlHost(attachment.url)} ·</span>`
							: html`<span class="wc3d-badge">GLB</span>`)}
						<span class="truncate">${modelMeta}</span>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-2 ms-auto">
					${wcVariations.length > 0 &&
					hasModel &&
					html`<button
						type="button"
						ref=${opener}
						onClick=${() => setAutoMapOpen(true)}
						class="wc3d-btn wc3d-btn-lg wc3d-btn-soft"
						title="Automatically map variation attributes to matching 3D meshes"
					>
						<${Icon} name="sparkles" size=${15} />
						Auto-map assistant
					</button>`}
					<button type="button" onClick=${() => editor.openTarget('default')} class="wc3d-btn wc3d-btn-lg wc3d-btn-ghost" title="Edit the base model (default configuration)">
						<${Icon} name="gear" size=${15} />
						Edit default look
					</button>
				</div>
			</div>

			${wcVariations.length > 0 &&
			html`<div class="flex flex-wrap items-center gap-3">
				<div class="relative flex-1 min-w-[220px] max-w-md">
					<${Icon} name="search" size=${18} class="absolute start-3.5 top-1/2 -translate-y-1/2 text-brand-500 dark:text-brand-400 pointer-events-none" />
					<input
						type="search"
						value=${query}
						onInput=${(e) => setQuery(e.currentTarget.value)}
						placeholder="Search variations…"
						class=${`${INPUT_CLASS} !h-[42px] !ps-11 !pe-3.5 !text-[14px] placeholder:!text-[color:var(--wc3d-ui-search-placeholder)]`}
					/>
				</div>
				<div class=${`${SEG_CLASS} ms-auto p-1 gap-1`}>
					<${FilterChip} label=${`All ${wcVariations.length}`} active=${filter === 'all'} onClick=${() => setFilter('all')} />
					<${FilterChip} label=${`Linked ${totalLinked}`} active=${filter === 'linked'} onClick=${() => setFilter('linked')} dot="bg-emerald-500" />
					<${FilterChip} label=${`Unlinked ${totalUnlinked}`} active=${filter === 'unlinked'} onClick=${() => setFilter('unlinked')} dot="bg-amber-500" />
				</div>
			</div>`}

			${groups.length === 0
				? html`<${EmptyState}
						variant="page"
						icon=${html`<${Icon} name=${wcVariations.length === 0 ? 'layers' : 'search'} size=${20} class="text-slate-400" />`}
						title=${emptyTitle}
						description=${wcVariations.length === 0
							? 'Add WooCommerce attribute variations on the product page to start customising the 3D model per variation.'
							: 'Try a different keyword or filter.'}
					/>`
				: html`<div class="space-y-5">
						${groups.map(([name, vars]) => html`<${AttributeGroup} key=${name} name=${name} variations=${vars} records=${records} dirtyIds=${dirtyIds} />`)}
					</div>`}
		</div>
		${hasOpenedAutoMap.current &&
		html`<${AutoMapAssistant}
			product=${product}
			isOpen=${autoMapOpen}
			onClose=${() => {
				setAutoMapOpen(false);
				opener.current?.focus();
			}}
		/>`}
	</div>`;
}

export default VariationsOverview;
