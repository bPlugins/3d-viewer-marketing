// WooCommerce → 3D Models, Models tab (ModelsListPage.php + ListTable.php).
import { html, useState, useEffect, useRef, useMemo, cx } from '../../core/ui.js';
import { useStore } from '../../core/store.js';
import { PhpIcon } from '../../shared/icons.js';
import { ModelsPage } from '../../shared/admin-ui.js';
import { ProductImage } from '../../shared/product-image.js';
import { WpAdmin } from './chrome.js';
import { ExternalHost } from '../../shared/external-url.js';

const PER_PAGE = 20;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Search term and page survive a trip to the editor and back, like the GET query in the real URL.
const query = { s: '', paged: 1 };

/** Site Date Format "F j, Y". */
function formatDate(value) {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
	if (!m) return '';
	return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

function listProducts(products, s) {
	const term = s.trim().toLowerCase();
	return Object.values(products || {})
		.filter((p) => p.type === 'simple' || p.type === 'variable')
		.filter((p) => !term || [p.name, p.description, p.short].some((t) => String(t || '').toLowerCase().includes(term)))
		.sort((a, b) => String(b.dateCreated).localeCompare(String(a.dateCreated)) || b.id - a.id);
}

function ModelCell({ product, attachments }) {
	const id = Number(product.meta?._wc3d_model_id) || 0;
	if (!id) return html`<span class="wc3d-cell-empty">—</span>`;
	const title = attachments?.[id]?.title || '';
	if (!title) return html`<span class="wc3d-cell-missing">(missing)</span>`;
	return html`<span class="wc3d-model-file">${title}</span><${ExternalHost} att=${attachments[id]} />`;
}

function Row({ product, attachments, expanded, onToggle }) {
	const editUrl = '#admin.editor.' + product.id;
	const enabled = product.meta?._wc3d_enabled === 'yes';
	const count = product.variations?.length || 0;
	return html`<tr class=${cx(expanded && 'is-expanded')}>
		<td class="thumbnail column-thumbnail" data-colname="">
			${product.image
				? html`<${ProductImage} product=${product} size=${40} class="wc3d-thumb" alt="" />`
				: html`<div class="wc3d-thumb-placeholder"><${PhpIcon} name="box" size=${16} /></div>`}
		</td>
		<td class="name column-name has-row-actions column-primary" data-colname="Product">
			<strong><a href=${editUrl}>${product.name}</a></strong>
			<button type="button" class="toggle-row" aria-expanded=${expanded ? 'true' : 'false'} onClick=${onToggle}>
				<svg class="toggle-row__chevron" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
				<span class="screen-reader-text">Show more details</span>
			</button>
		</td>
		<td class="status column-status" data-colname="3D Status">
			${enabled
				? html`<span class="wc3d-status wc3d-status-enabled wc3d-badge wc3d-badge-success wc3d-badge-dot">Enabled</span>`
				: html`<span class="wc3d-status wc3d-status-disabled wc3d-badge wc3d-badge-dot">Not enabled</span>`}
		</td>
		<td class="model column-model" data-colname="Model File"><${ModelCell} product=${product} attachments=${attachments} /></td>
		<td class="variations column-variations" data-colname="Variations">
			${product.type === 'variable' ? plural(count, 'variation', 'variations') : html`<span class="wc3d-cell-empty">—</span>`}
		</td>
		<td class="last_edited column-last_edited" data-colname="Last Modified">${formatDate(product.dateModified)}</td>
		<td class="actions column-actions" data-colname="Actions">
			<a href=${editUrl} class="button wc3d-btn wc3d-btn-soft wc3d-btn-sm"><${PhpIcon} name="pencil" size=${16} />Edit</a>
		</td>
	</tr>`;
}

function Pagination({ paged, totalPages, onPage }) {
	const link = (cls, label, sym, page) =>
		html`<a
			class=${cls + ' button'}
			href="#admin.models"
			onClick=${(e) => {
				e.preventDefault();
				onPage(page);
			}}
			><span class="screen-reader-text">${label}</span><span aria-hidden="true">${sym}</span></a
		>`;
	const off = (sym) => html`<span class="tablenav-pages-navspan button disabled" aria-hidden="true">${sym}</span>`;
	const first = paged <= 1;
	const last = paged >= totalPages;
	return html`<span class="pagination-links">
		${first ? off('«') : link('first-page', 'First page', '«', 1)}
		${first ? off('‹') : link('prev-page', 'Previous page', '‹', Math.max(1, paged - 1))}
		<span class="screen-reader-text">Current Page</span>
		<span id="table-paging" class="paging-input"><span class="tablenav-paging-text">${paged} of <span class="total-pages">${totalPages}</span></span></span>
		${last ? off('›') : link('next-page', 'Next page', '›', Math.min(totalPages, paged + 1))}
		${last ? off('»') : link('last-page', 'Last page', '»', totalPages)}
	</span>`;
}

function TableNav({ which, total, hasItems, paged, totalPages, onPage }) {
	if (which === 'bottom' && !hasItems) return null;
	return html`<div class=${'tablenav ' + which}>
		<div class=${cx('alignleft actions bulkactions', !hasItems && 'hidden')}></div>
		<div class=${cx('tablenav-pages', totalPages < 2 && 'one-page', !hasItems && 'no-pages')}>
			<span class="displaying-num">${plural(total, 'item', 'items')}</span>
			${hasItems && html`<${Pagination} paged=${Math.min(paged, totalPages)} totalPages=${totalPages} onPage=${onPage} />`}
		</div>
		<br class="clear" />
	</div>`;
}

const COLUMNS = [
	['thumbnail', ''],
	['name', 'Product'],
	['status', '3D Status'],
	['model', 'Model File'],
	['variations', 'Variations'],
	['last_edited', 'Last Modified'],
	['actions', 'Actions'],
];

export default function ModelsList() {
	const products = useStore((s) => s.products);
	const attachments = useStore((s) => s.attachments);
	const [s, setS] = useState(query.s);
	const [field, setField] = useState(query.s);
	const [paged, setPaged] = useState(query.paged);
	const [expanded, setExpanded] = useState({});
	const [width, setWidth] = useState(0);
	const cardRef = useRef(null);

	useEffect(() => {
		query.s = s;
		query.paged = paged;
	}, [s, paged]);

	// Column drop follows the card's inner width, not the viewport.
	useEffect(() => {
		const el = cardRef.current;
		if (!el || typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const all = useMemo(() => listProducts(products, s), [products, s]);
	const total = all.length;
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const rows = all.slice((paged - 1) * PER_PAGE, paged * PER_PAGE);
	const hasItems = rows.length > 0;

	const submit = (e) => {
		e.preventDefault();
		// The hidden paged input only exists while the current result has rows, so a new search keeps the page.
		setPaged(hasItems ? paged : 1);
		setS(field.trim());
		setExpanded({});
	};

	const onPage = (n) => {
		setPaged(n);
		setExpanded({});
		window.scrollTo(0, 0);
	};

	return html`<${WpAdmin} current="wc3d-models" title="3D Models">
		<${ModelsPage} active="models">
			<form
				method="get"
				ref=${cardRef}
				class=${cx('wc3d-panel wc3d-list', width && width < 1020 && 'is-cols-md', width && width < 840 && 'is-cols-sm')}
				onSubmit=${submit}
			>
				<div class="wc3d-panel__head">
					<div class="wc3d-list__intro">
						<h2 class="wc3d-panel__title">Products</h2>
						<p class="wc3d-panel__desc">Configure per-variation 3D model customization for your WooCommerce products. Click a product to open the 3D customizer.</p>
					</div>
					${(hasItems || s) &&
					html`<div class="wc3d-search wc3d-list__search" role="search">
						<label class="screen-reader-text" for="wc3d-search-search-input">Search products:</label>
						<input
							type="search"
							id="wc3d-search-search-input"
							class="wc3d-input"
							name="s"
							value=${field}
							placeholder="Search products…"
							onInput=${(e) => setField(e.currentTarget.value)}
						/>
						<button type="submit" id="search-submit" class="wc3d-list__search-submit">
							<${PhpIcon} name="search" size=${16} />
							<span class="screen-reader-text">Search products</span>
						</button>
					</div>`}
				</div>

				<${TableNav} which="top" total=${total} hasItems=${hasItems} paged=${paged} totalPages=${totalPages} onPage=${onPage} />

				<table class="wp-list-table widefat fixed striped table-view-list wc3d_products">
					<thead>
						<tr>
							${COLUMNS.map(
								([key, label]) =>
									html`<th key=${key} scope="col" id=${key} class=${cx('manage-column', 'column-' + key, key === 'name' && 'column-primary')}>${label}</th>`
							)}
						</tr>
					</thead>
					<tbody id="the-list">
						${hasItems
							? rows.map(
									(p) =>
										html`<${Row}
											key=${p.id}
											product=${p}
											attachments=${attachments}
											expanded=${!!expanded[p.id]}
											onToggle=${() => setExpanded((x) => ({ ...x, [p.id]: !x[p.id] }))}
										/>`
								)
							: html`<tr class="no-items">
									<td class="colspanchange" colspan=${COLUMNS.length}>
										<span class="wc3d-list-empty"><${PhpIcon} name="search" size=${16} />No products found.</span>
									</td>
								</tr>`}
					</tbody>
				</table>

				<${TableNav} which="bottom" total=${total} hasItems=${hasItems} paged=${paged} totalPages=${totalPages} onPage=${onPage} />
			</form>
		<//>
	<//>`;
}
