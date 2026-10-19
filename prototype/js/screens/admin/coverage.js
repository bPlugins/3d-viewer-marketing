// WooCommerce → 3D Models, Coverage tab (planned `coverage`, specs/coverage.md).
import { html, useState, useEffect, useRef, useMemo, cx } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { useFeature } from '../../core/features.js';
import { PhpIcon } from '../../shared/icons.js';
import { ModelsPage } from '../../shared/admin-ui.js';
import { ProductImage } from '../../shared/product-image.js';
import { attachmentUrl } from '../../shared/product-3d.js';
import {
	coverageReport,
	matchesFilter,
	issueTip,
	issueRank,
	sortIssues,
	formatBytes,
	isDraftish,
	assignModel,
	setEnabled,
	restoreEnabled,
	generatePosters,
	ISSUES,
	FILTERS,
	STATUS_BADGES,
	DEFAULT_MAX_MB,
} from '../../shared/coverage.js';
import { WpAdmin } from './chrome.js';
import { ExternalHost } from '../../shared/external-url.js';
import { WpNotice, TYPE_LABELS } from './products.js';
import { MediaModal } from './product-edit.js';
import ModelsList from './models-list.js';

const PER_PAGE = 10;
const STATUS_LABEL = { draft: 'Draft', pending: 'Pending', private: 'Private' };
const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
const nProducts = (n) => plural(n, 'product', 'products');

// View state survives a trip to the editor and back, like the GET query in the real URL.
const query = { s: '', filter: 'all', orderby: 'issues', order: 'desc', paged: 1 };

function StatCard({ label, value, total, foot, good, filter, active, onFilter }) {
	const pct = total ? Math.round((value / total) * 100) : 0;
	const on = active === filter;
	return html`<button
		type="button"
		class=${cx('wc3d-cov-card', on && 'is-active', good ? 'is-good' : 'is-warn')}
		aria-pressed=${on ? 'true' : 'false'}
		onClick=${() => onFilter(on ? 'all' : filter)}
	>
		<span class="wc3d-cov-card__label">${label}</span>
		<span class="wc3d-cov-card__value">
			${value.toLocaleString()}${total != null && html`<span class="wc3d-cov-card__total"> / ${total.toLocaleString()}</span>`}
		</span>
		${total != null && html`<span class="wc3d-cov-card__bar" aria-hidden="true"><span style=${{ width: pct + '%' }}></span></span>`}
		<span class="wc3d-cov-card__foot">
			${good && html`<${PhpIcon} name="check" size=${14} />`}
			${foot}
		</span>
	</button>`;
}

function IssueChips({ row }) {
	if (!row.issues.length) return html`<span class="wc3d-cov-chip is-ok"><${PhpIcon} name="check" size=${12} />All set</span>`;
	return html`<span class="wc3d-cov-chips">
		${sortIssues(row.issues).map(
			(id) => html`<span key=${id} class=${'wc3d-cov-chip is-' + ISSUES[id].tone} title=${issueTip(row, id)}>${ISSUES[id].label}</span>`
		)}
	</span>`;
}

function ModelCell({ row, maxBytes }) {
	if (!row.modelId) return html`<span class="wc3d-cell-empty">—</span>`;
	if (!row.model) return html`<span class="wc3d-cell-missing">(missing)</span>`;
	const big = row.sizeBytes > maxBytes;
	return html`<span class="wc3d-model-file">${row.model.title}</span>
		<${ExternalHost} att=${row.model} />
		<span class=${cx('wc3d-cov-sub', big && 'is-danger')}>
			${row.sizeBytes ? formatBytes(row.sizeBytes) : 'Size unknown'}${big && ` · Over ${formatBytes(maxBytes)}`}
		</span>
		${row.oversized.some((o) => o.label !== 'Default') &&
		html`<span class="wc3d-cov-sub is-danger">${row.oversized.filter((o) => o.label !== 'Default').map((o) => `${o.label}: ${formatBytes(o.sizeBytes)}`).join(', ')}</span>`}`;
}

function ArCell({ row }) {
	const usdzAtt = useStore((s) => s.attachments?.[s.productConfigs?.[row.product.id]?.config?.ar?.usdzId] || null); // external-url
	if (!row.modelId) return html`<span class="wc3d-cell-empty">—</span>`;
	return html`${row.ar.filename ? html`<span class="wc3d-model-file">${row.ar.filename}</span><${ExternalHost} att=${usdzAtt} />` : html`<span class="wc3d-cell-empty">—</span>`}
		${!row.ar.enabled && html`<span class="wc3d-cov-sub">AR off</span>`}
		${row.ar.built && html`<span class="wc3d-cov-sub">${row.ar.filename ? 'Built on the device for custom designs' : 'Built on the device'}</span>`}`;
}

function VariationsCell({ row }) {
	const v = row.variations;
	if (row.product.type !== 'variable') return html`<span class="wc3d-cell-empty">—</span>`;
	const bits = [v.ownModel && plural(v.ownModel, 'own model', 'own models'), v.withOverrides && `${v.withOverrides} with ${v.withOverrides === 1 ? 'override' : 'overrides'}`].filter(Boolean);
	return html`${plural(v.total, 'variation', 'variations')}
		${bits.length > 0 && html`<span class="wc3d-cov-sub">${bits.join(' · ')}</span>`}`;
}

function SortableTh({ id, label, orderby, order, onSort, primary }) {
	const sorted = orderby === id;
	const next = sorted ? (order === 'asc' ? 'desc' : 'asc') : id === 'name' ? 'asc' : 'desc';
	return html`<th
		scope="col"
		class=${cx('manage-column', 'column-' + id, primary && 'column-primary', sorted ? 'sorted' : 'sortable', sorted ? order : next === 'asc' ? 'desc' : 'asc')}
		aria-sort=${sorted ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
	>
		<a href="#admin.coverage" onClick=${(e) => (e.preventDefault(), onSort(id, next))}>
			<span>${label}</span>
			<span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span>
		</a>
	</th>`;
}

function Pagination({ paged, totalPages, onPage }) {
	const link = (cls, label, sym, page) =>
		html`<a class=${cls + ' button'} href="#admin.coverage" onClick=${(e) => (e.preventDefault(), onPage(page))}
			><span class="screen-reader-text">${label}</span><span aria-hidden="true">${sym}</span></a
		>`;
	const off = (sym) => html`<span class="tablenav-pages-navspan button disabled" aria-hidden="true">${sym}</span>`;
	const first = paged <= 1;
	const last = paged >= totalPages;
	return html`<span class="pagination-links">
		${first ? off('«') : link('first-page', 'First page', '«', 1)}
		${first ? off('‹') : link('prev-page', 'Previous page', '‹', paged - 1)}
		<span class="screen-reader-text">Current Page</span>
		<span class="paging-input"><span class="tablenav-paging-text">${paged} of <span class="total-pages">${totalPages}</span></span></span>
		${last ? off('›') : link('next-page', 'Next page', '›', paged + 1)}
		${last ? off('»') : link('last-page', 'Last page', '»', totalPages)}
	</span>`;
}

function Pages({ total, paged, totalPages, onPage }) {
	return html`<div class=${cx('tablenav-pages', totalPages < 2 && 'one-page', !total && 'no-pages')}>
		<span class="displaying-num">${plural(total, 'item', 'items')}</span>
		${total > 0 && html`<${Pagination} paged=${paged} totalPages=${totalPages} onPage=${onPage} />`}
	</div>`;
}

/** Inline confirmation above the table (no confirm()). */
function ConfirmStrip({ pending, state, busy, progress, onCancel, onConfirm }) {
	const [enable, setEnable] = useState(true);
	const [replace, setReplace] = useState(false);
	const ref = useRef(null);
	useEffect(() => ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }), []);
	const products = pending.ids.map((id) => state.products[id]).filter(Boolean);
	// Posters as they were when the strip opened, so the counts hold still while a run adds new ones.
	const [hadPoster] = useState(() => Object.fromEntries(products.map((p) => [p.id, Number(p.meta?._wc3d_poster_id) || 0])));

	if (pending.kind === 'assign') {
		const att = pending.att;
		const had = products.filter((p) => Number(p.meta?._wc3d_model_id) && Number(p.meta._wc3d_model_id) !== att.id);
		return html`<div ref=${ref} class="wc3d-cov-confirm" role="group" aria-labelledby="wc3d-cov-confirm-title">
			<h3 id="wc3d-cov-confirm-title" class="wc3d-cov-confirm__title">Assign “${att.title}” to ${nProducts(products.length)}</h3>
			<p class="wc3d-cov-confirm__list">${products.map((p) => p.name).join(', ')}</p>
			${had.length > 0 &&
			html`<p class="wc3d-cov-confirm__note">
				${had.length === 1 ? '1 product already has a model' : `${had.length} products already have a model`} (${had.map((p) => p.name).join(', ')}).
				${had.length === 1 ? ' It is replaced; its scene settings stay' : ' They are replaced; their scene settings stay'}, and settings for parts the new model does not have are ignored.
			</p>`}
			<label class="wc3d-cov-confirm__check"><input type="checkbox" checked=${enable} onChange=${(e) => setEnable(e.currentTarget.checked)} /> Turn on 3D for these products</label>
			<div class="wc3d-cov-confirm__actions">
				<button type="button" class="wc3d-btn wc3d-btn-save wc3d-btn-sm" onClick=${() => onConfirm({ enable })}>Assign model</button>
				<button type="button" class="wc3d-btn wc3d-btn-ghost wc3d-btn-sm" onClick=${onCancel}>Cancel</button>
			</div>
		</div>`;
	}

	// Generate posters
	const usable = products.filter((p) => state.attachments?.[Number(p.meta?._wc3d_model_id)]);
	const skipped = products.length - usable.length;
	const withPoster = usable.filter((p) => hadPoster[p.id]);
	const todo = usable.filter((p) => replace || !hadPoster[p.id]);
	return html`<div ref=${ref} class="wc3d-cov-confirm" role="group" aria-labelledby="wc3d-cov-confirm-title" aria-busy=${busy ? 'true' : 'false'}>
		<h3 id="wc3d-cov-confirm-title" class="wc3d-cov-confirm__title">Generate posters for ${nProducts(todo.length)}</h3>
		<p class="wc3d-cov-confirm__list">An 800 × 800 picture of each product's 3D scene is added to the Media Library and set as its poster.</p>
		${skipped > 0 && html`<p class="wc3d-cov-confirm__note">${skipped === 1 ? '1 product has no model and is skipped.' : `${skipped} products have no model and are skipped.`}</p>`}
		${withPoster.length > 0 &&
		html`<label class="wc3d-cov-confirm__check">
			<input type="checkbox" checked=${replace} disabled=${busy} onChange=${(e) => setReplace(e.currentTarget.checked)} />
			Replace existing posters (${withPoster.length === 1 ? '1 product has one' : `${withPoster.length} products have one`})
		</label>`}
		${busy &&
		html`<p class="wc3d-cov-progress" role="status"><span class="wc3d-cov-spinner" aria-hidden="true"></span>Generating posters… ${Math.min(progress.done + 1, progress.total)} of ${progress.total}</p>`}
		<div class="wc3d-cov-confirm__actions">
			<button type="button" class="wc3d-btn wc3d-btn-save wc3d-btn-sm" disabled=${busy || !todo.length} onClick=${() => onConfirm({ ids: todo.map((p) => p.id) })}>Generate posters</button>
			<button type="button" class="wc3d-btn wc3d-btn-ghost wc3d-btn-sm" disabled=${busy} onClick=${onCancel}>Cancel</button>
		</div>
	</div>`;
}

function ThresholdField({ settings, onSaved }) {
	const saved = Number(settings?.coverage_max_model_mb) || DEFAULT_MAX_MB;
	const [val, setVal] = useState(String(saved));
	useEffect(() => setVal(String(saved)), [saved]);
	const commit = () => {
		const n = Math.min(500, Math.max(1, Math.round(Number(val)) || saved));
		setVal(String(n));
		if (n !== saved) {
			store.patch('settings.coverage_max_model_mb', n);
			onSaved();
		}
	};
	return html`<label class="wc3d-cov-threshold">
		<span>Flag models over</span>
		<input
			type="number"
			class="wc3d-input"
			min="1"
			max="500"
			step="1"
			value=${val}
			onInput=${(e) => setVal(e.currentTarget.value)}
			onChange=${commit}
			onKeyDown=${(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
		/>
		<span>MB</span>
	</label>`;
}

function Coverage() {
	const state = useStore();
	const { rows, stats, maxBytes } = useMemo(() => coverageReport(state), [state.products, state.attachments, state.productConfigs, state.variationConfigs, state.variations, state.settings]);
	const [s, setS] = useState(query.s);
	const [field, setField] = useState(query.s);
	const [filter, setFilterState] = useState(query.filter);
	const [draftFilter, setDraftFilter] = useState(query.filter);
	const [orderby, setOrderby] = useState(query.orderby);
	const [order, setOrder] = useState(query.order);
	const [paged, setPaged] = useState(query.paged);
	const [checked, setChecked] = useState([]);
	const [bulk, setBulk] = useState('-1');
	const [expanded, setExpanded] = useState({});
	const [notices, setNotices] = useState([]);
	const [mediaFor, setMediaFor] = useState(null);
	const [pending, setPending] = useState(null);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState({ done: 0, total: 0 });
	const [width, setWidth] = useState(0);
	const cardRef = useRef(null);
	const nid = useRef(0);

	useEffect(() => Object.assign(query, { s, filter, orderby, order, paged }), [s, filter, orderby, order, paged]);
	useEffect(() => {
		const el = cardRef.current;
		if (!el || typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const notify = (type, body, extra = {}) => {
		setNotices([{ id: ++nid.current, type, body, ...extra }]);
		window.scrollTo(0, 0);
	};

	const shown = useMemo(() => {
		const term = s.trim().toLowerCase();
		const list = rows.filter((r) => matchesFilter(r, filter)).filter((r) => !term || [r.product.name, r.product.sku, r.model?.filename].some((t) => String(t || '').toLowerCase().includes(term)));
		const dir = order === 'asc' ? 1 : -1;
		const byName = (a, b) => a.product.name.localeCompare(b.product.name);
		const cmp = {
			name: (a, b) => byName(a, b) * dir,
			model: (a, b) => (a.sizeBytes - b.sizeBytes) * dir || byName(a, b),
			issues: (a, b) => (issueRank(a) - issueRank(b)) * dir || byName(a, b),
		}[orderby] || ((a, b) => byName(a, b));
		return list.sort(cmp);
	}, [rows, s, filter, orderby, order]);

	const total = shown.length;
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const page = Math.min(paged, totalPages);
	const pageRows = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);

	const setFilter = (f) => {
		setFilterState(f);
		setDraftFilter(f);
		setPaged(1);
		setChecked([]);
	};
	const onSort = (id, dir) => (setOrderby(id), setOrder(dir), setPaged(1));
	const onPage = (n) => (setPaged(n), setExpanded({}), window.scrollTo(0, 0));

	const allChecked = pageRows.length > 0 && pageRows.every((r) => checked.includes(r.id));
	const toggle = (id, on) => setChecked((c) => (on ? [...new Set([...c, id])] : c.filter((x) => x !== id)));

	const startAssign = (ids) => {
		setPending(null);
		setMediaFor(ids);
	};
	const applyBulk = () => {
		if (bulk === '-1') return;
		if (!checked.length) return notify('warning', 'Please select at least one item to perform this action on.');
		const ids = [...checked];
		if (bulk === 'assign') return startAssign(ids);
		if (bulk === 'posters') return setPending({ kind: 'posters', ids });
		if (bulk === 'enable') {
			setEnabled(ids, true);
			const noModel = ids.filter((id) => !state.attachments?.[Number(state.products[id]?.meta?._wc3d_model_id)]).length;
			notify('success', `3D turned on for ${nProducts(ids.length)}.${noModel ? ` ${noModel} ${noModel === 1 ? 'has' : 'have'} no model yet, so shoppers still see the product image.` : ''}`);
		}
		if (bulk === 'disable') {
			const prev = setEnabled(ids, false);
			notify('success', `3D turned off for ${nProducts(ids.length)}.`, { undo: prev });
		}
		setChecked([]);
		setBulk('-1');
	};

	const confirm = async (opts) => {
		if (pending.kind === 'assign') {
			assignModel(pending.ids, pending.att.id, opts);
			const one = pending.ids.length === 1 ? pending.ids[0] : 0;
			notify('success', html`Model assigned to ${nProducts(pending.ids.length)}.${one ? html` <a href=${'#admin.editor.' + one}>Open in 3D Editor</a>` : ''}`);
			setPending(null);
			setChecked([]);
			setBulk('-1');
			return;
		}
		setBusy(true);
		setProgress({ done: 0, total: opts.ids.length });
		const { done, failed } = await generatePosters(opts.ids, { onProgress: (d, t) => setProgress({ done: d, total: t }) });
		setBusy(false);
		setPending(null);
		setChecked([]);
		setBulk('-1');
		const names = failed.map((id) => store.get().products[id]?.name).filter(Boolean);
		if (done.length) notify(failed.length ? 'warning' : 'success', `Posters generated for ${nProducts(done.length)}.${names.length ? ` Could not generate a poster for ${names.join(', ')}.` : ''}`);
		else notify('error', `Could not generate a poster for ${names.join(', ')}.`);
	};

	const COLS = 9;
	const head = (where) => html`<tr>
		<td id=${where === 'head' ? 'cb' : undefined} class="manage-column column-cb check-column">
			<input type="checkbox" aria-label="Select All" checked=${allChecked} onChange=${(e) => setChecked(e.currentTarget.checked ? [...new Set([...checked, ...pageRows.map((r) => r.id)])] : checked.filter((id) => !pageRows.some((r) => r.id === id)))} />
		</td>
		<th scope="col" class="manage-column column-thumbnail"><span class="screen-reader-text">Image</span></th>
		<${SortableTh} id="name" label="Product" orderby=${orderby} order=${order} onSort=${onSort} primary />
		<th scope="col" class="manage-column column-status">3D Status</th>
		<${SortableTh} id="model" label="Model File" orderby=${orderby} order=${order} onSort=${onSort} />
		<th scope="col" class="manage-column column-ar">iOS AR file</th>
		<th scope="col" class="manage-column column-poster">Poster</th>
		<th scope="col" class="manage-column column-variations">Variations</th>
		<${SortableTh} id="issues" label="Issues" orderby=${orderby} order=${order} onSort=${onSort} />
	</tr>`;

	const noticeEls = notices.map(
		(n) => html`<${WpNotice} key=${n.id} type=${n.type}>
			${n.body}
			${n.undo &&
			html` <a
				href="#admin.coverage"
				onClick=${(e) => {
					e.preventDefault();
					restoreEnabled(n.undo);
					setNotices([{ id: ++nid.current, type: 'success', body: '3D settings restored.' }]);
				}}
				>Undo</a
			>`}
		<//>`
	);

	// size_format( $max_bytes ): no decimals.
	const mb = `${Math.round(maxBytes / 1048576)} MB`;
	return html`<${WpAdmin} current="wc3d-models" title="3D Models">
		<${ModelsPage} active="coverage" notices=${noticeEls}>
			<div
				ref=${cardRef}
				class=${cx('wc3d-panel wc3d-list wc3d-coverage', width && width < 1100 && 'is-cols-md', width && width < 900 && 'is-cols-sm')}
			>
				<div class="wc3d-panel__head">
					<div class="wc3d-list__intro">
						<h2 class="wc3d-panel__title">3D coverage</h2>
						<p class="wc3d-panel__desc">See which products show 3D and what each one is missing. Select products to fix them in bulk.</p>
					</div>
					<form class="wc3d-search wc3d-list__search" role="search" onSubmit=${(e) => (e.preventDefault(), setS(field.trim()), setPaged(1), setChecked([]))}>
						<label class="screen-reader-text" for="wc3d-cov-search-input">Search products:</label>
						<input type="search" id="wc3d-cov-search-input" class="wc3d-input" value=${field} placeholder="Search products…" onInput=${(e) => setField(e.currentTarget.value)} />
						<button type="submit" class="wc3d-list__search-submit">
							<${PhpIcon} name="search" size=${16} />
							<span class="screen-reader-text">Search products</span>
						</button>
					</form>
				</div>

				<div class="wc3d-cov-cards" role="group" aria-label="Coverage summary">
					<${StatCard} label="Products with 3D" value=${stats.with3d} total=${stats.total} foot=${stats.without3d ? `${stats.without3d} without 3D` : 'Every product has 3D'} good=${!stats.without3d} filter="without-3d" active=${filter} onFilter=${setFilter} />
					<${StatCard} label="Variations covered" value=${stats.varCovered} total=${stats.varTotal} foot=${stats.varTotal - stats.varCovered ? `${stats.varTotal - stats.varCovered} not covered` : 'All covered'} good=${stats.varTotal === stats.varCovered} filter="variations" active=${filter} onFilter=${setFilter} />
					<${StatCard} label="Missing iOS AR file" value=${stats.noUsdz} foot=${stats.noUsdz ? 'No View in AR on iPhone and iPad' : 'Every 3D product has one'} good=${!stats.noUsdz} filter="no-usdz" active=${filter} onFilter=${setFilter} />
					<${StatCard} label="Missing poster" value=${stats.noPoster} foot=${stats.noPoster ? 'Shows the product image until 3D loads' : 'Every 3D product has one'} good=${!stats.noPoster} filter="no-poster" active=${filter} onFilter=${setFilter} />
					<${StatCard} label="Oversized models" value=${stats.oversized} foot=${stats.oversized ? `Over ${mb}` : `None over ${mb}`} good=${!stats.oversized} filter="oversized" active=${filter} onFilter=${setFilter} />
					<${StatCard} label="Drafts with 3D" value=${stats.drafts} foot=${stats.drafts ? 'Not visible to shoppers yet' : 'None'} good=${!stats.drafts} filter="draft" active=${filter} onFilter=${setFilter} />
				</div>
				<div class="wc3d-cov-cards__meta">
					<${ThresholdField} settings=${state.settings} onSaved=${() => notify('success', 'Settings saved.')} />
				</div>

				${pending &&
				html`<${ConfirmStrip}
					key=${pending.kind + pending.ids.join()}
					pending=${pending}
					state=${state}
					busy=${busy}
					progress=${progress}
					onCancel=${() => setPending(null)}
					onConfirm=${confirm}
				/>`}

				<div class="tablenav top">
					<div class="alignleft actions bulkactions">
						<label for="bulk-action-selector-top" class="screen-reader-text">Select bulk action</label>
						<select id="bulk-action-selector-top" class="wc3d-select" value=${bulk} disabled=${busy} onChange=${(e) => setBulk(e.currentTarget.value)}>
							<option value="-1">Bulk actions</option>
							<option value="assign">Assign model…</option>
							<option value="enable">Enable 3D</option>
							<option value="disable">Disable 3D</option>
							<option value="posters">Generate posters</option>
						</select>
						<button type="button" class="wc3d-btn wc3d-btn-ghost wc3d-btn-sm action" disabled=${busy} onClick=${applyBulk}>Apply</button>
					</div>
					<div class="alignleft actions">
						<label for="wc3d-cov-filter" class="screen-reader-text">Filter by issue</label>
						<select id="wc3d-cov-filter" class="wc3d-select" value=${draftFilter} onChange=${(e) => setDraftFilter(e.currentTarget.value)}>
							${FILTERS.map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}
						</select>
						<button type="button" class="wc3d-btn wc3d-btn-ghost wc3d-btn-sm" onClick=${() => setFilter(draftFilter)}>Filter</button>
					</div>
					<${Pages} total=${total} paged=${page} totalPages=${totalPages} onPage=${onPage} />
					<br class="clear" />
				</div>

				<table class="wp-list-table widefat fixed striped table-view-list wc3d_products wc3d-cov-table">
					<thead>${head('head')}</thead>
					<tbody id="the-list">
						${pageRows.length
							? pageRows.map((r) => {
									const p = r.product;
									const [badge, tone] = STATUS_BADGES[r.status];
									const isOpen = !!expanded[p.id];
									return html`<tr key=${p.id} class=${cx(isOpen && 'is-expanded', checked.includes(p.id) && 'is-checked')}>
										<th scope="row" class="check-column">
											<input type="checkbox" aria-label=${'Select ' + p.name} checked=${checked.includes(p.id)} onChange=${(e) => toggle(p.id, e.currentTarget.checked)} />
										</th>
										<td class="thumbnail column-thumbnail" data-colname="">
											<${ProductImage} product=${p} size=${40} class="wc3d-thumb" alt="" />
										</td>
										<td class="name column-name has-row-actions column-primary" data-colname="Product">
											<strong>
												<a href=${'#admin.editor.' + p.id}>${p.name}</a>
												${isDraftish(p) && html`<span class="post-state"> — ${STATUS_LABEL[p.status]}</span>`}
											</strong>
											<span class="wc3d-cov-sub">${TYPE_LABELS[p.type] || p.type}</span>
											<div class="row-actions">
												<span class="edit"><a href=${'#admin.editor.' + p.id}>Edit in 3D Editor</a> | </span>
												<span class="edit-product"><a href=${'#admin.product.' + p.id}>Edit product</a> | </span>
												<span class="assign"><button type="button" class="button-link" disabled=${busy} onClick=${() => startAssign([p.id])}>Assign model</button> | </span>
												<span class="view"><a href=${'#store.product.' + p.slug}>${p.status === 'publish' ? 'View' : 'Preview'}</a></span>
											</div>
											<button type="button" class="toggle-row" aria-expanded=${isOpen ? 'true' : 'false'} onClick=${() => setExpanded((x) => ({ ...x, [p.id]: !x[p.id] }))}>
												<svg class="toggle-row__chevron" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
												<span class="screen-reader-text">Show more details</span>
											</button>
										</td>
										<td class="status column-status" data-colname="3D Status">
											<span class=${cx('wc3d-status wc3d-badge wc3d-badge-dot', tone === 'success' && 'wc3d-status-enabled wc3d-badge-success', tone === 'danger' && 'wc3d-cov-badge-danger', !tone && 'wc3d-status-disabled')}>${badge}</span>
										</td>
										<td class="model column-model" data-colname="Model File"><${ModelCell} row=${r} maxBytes=${maxBytes} /></td>
										<td class="ar column-ar" data-colname="iOS AR file"><${ArCell} row=${r} /></td>
										<td class="poster column-poster" data-colname="Poster">
											${r.poster ? html`<img class="wc3d-cov-poster" src=${attachmentUrl(r.poster)} alt="" title=${r.poster.filename} width="32" height="32" />` : html`<span class="wc3d-cell-empty">—</span>`}
										</td>
										<td class="variations column-variations" data-colname="Variations"><${VariationsCell} row=${r} /></td>
										<td class="issues column-issues" data-colname="Issues"><${IssueChips} row=${r} /></td>
									</tr>`;
								})
							: html`<tr class="no-items">
									<td class="colspanchange" colspan=${COLS}>
										<span class="wc3d-list-empty"><${PhpIcon} name="search" size=${16} />No products found.</span>
									</td>
								</tr>`}
					</tbody>
				</table>

				${total > 0 &&
				html`<div class="tablenav bottom">
					<${Pages} total=${total} paged=${page} totalPages=${totalPages} onPage=${onPage} />
					<br class="clear" />
				</div>`}
			</div>
			${mediaFor &&
			html`<${MediaModal}
				kind="model"
				title="Assign a 3D model"
				button="Use this model"
				onClose=${() => setMediaFor(null)}
				onSelect=${(att) => (setPending({ kind: 'assign', ids: mediaFor, att }), setMediaFor(null))}
			/>`}
		<//>
	<//>`;
}

/** Flag off: the route shows the Models tab, as the shipped plugin would. */
export default function CoverageScreen(props) {
	const on = useFeature('coverage');
	return on ? html`<${Coverage} ...${props} />` : html`<${ModelsList} ...${props} />`;
}
