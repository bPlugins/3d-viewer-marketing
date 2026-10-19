// 3D Viewer → All 3D Viewers (edit.php?post_type=bp3d-model-viewer): WordPress's list table with the
// plugin's Shortcode column and Duplicate row action (inc/Base/PostTypeModelViewer.php). The "New" interface
// (the default) adds Preview / Viewer / Status columns and a list / grid toggle (inc/Base/ViewerListModern.php);
// Classic (lv.adminUi === 'classic') keeps WordPress's table.
import { html, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { store, useStore } from '../../js/core/store.js';
import { go } from '../../js/core/router.js';
import { WpAdmin } from '../../js/screens/admin/chrome.js';
import { listDate, nowStr } from '../../js/screens/admin/products.js';
import { isBlockPost, resolveSource } from './meta.js';

export const shortcodeOf = (id) => `[3d_viewer id="${id}"]`;

/** Clipboard API, else a hidden textarea + execCommand (same as the plugin's copyText). */
export function copyText(text) {
	const fallback = () => {
		try {
			const ta = document.createElement('textarea');
			ta.value = text;
			ta.setAttribute('readonly', '');
			ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			ta.remove();
		} catch {
			// Nothing else to try; the chip still says Copied, like the plugin.
		}
	};
	try {
		if (window.isSecureContext && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(fallback);
		else fallback();
	} catch {
		fallback();
	}
}

function ShortcodeChip({ id }) {
	const [copied, setCopied] = useState(false);
	const t = useRef(0);
	useEffect(() => () => clearTimeout(t.current), []);
	const sc = shortcodeOf(id);
	const copy = () => {
		copyText(sc);
		setCopied(true);
		clearTimeout(t.current);
		t.current = setTimeout(() => setCopied(false), 1500);
	};
	return html`<div class=${cx('b3dviewer_front_shortcode', 'ld-list-sc', copied && 'is-copied')}>
		<input value=${sc} readOnly aria-label="Shortcode" onFocus=${(e) => e.currentTarget.select()} onClick=${copy} />
		<span class="htooltip" role="status">${copied ? 'Copied' : 'Copy To Clipboard'}</span>
		<button type="button" class="ld-list-sc__copy" aria-label=${`Copy shortcode: ${sc}`} onClick=${copy}>
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path d="M8 4V16C8 17.1046 8.89543 18 10 18L18 18C19.1046 18 20 17.1046 20 16V7.24162C20 6.7034 19.7831 6.18789 19.3982 5.81161L16.0829 2.56999C15.7092 2.2046 15.2074 2 14.6847 2H10C8.89543 2 8 2.89543 8 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
				<path d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V9C4 7.89543 4.89543 7 6 7H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>
	</div>`;
}

/** The Modern list's chip (renderShortcodeColumn, isModernList branch). */
function ModernShortcode({ id }) {
	const [copied, setCopied] = useState(false);
	const t = useRef(0);
	useEffect(() => () => clearTimeout(t.current), []);
	const sc = shortcodeOf(id);
	const copy = (e) => {
		e.preventDefault();
		copyText(sc);
		setCopied(true);
		clearTimeout(t.current);
		t.current = setTimeout(() => setCopied(false), 1500);
	};
	return html`<button type="button" class=${cx('bp3d-list-shortcode', copied && 'is-copied')} aria-label=${'Copy shortcode: ' + sc} title="Copy To Clipboard" onClick=${copy}>
		<code>${sc}</code>
		<span class="bp3d-list-shortcode__icon" aria-hidden="true">
			<svg class="bp3d-list-shortcode__copy" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
			<svg class="bp3d-list-shortcode__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
		</span>
	</button>`;
}

const urlOf = (v) => String((v && typeof v === 'object' ? v.url : v) || '').trim();
const formatOf = (url) => {
	const ext = (String(url).split(/[?#]/)[0].split('/').pop() || '').split('.');
	return ext.length > 1 && /^[a-z0-9]{1,6}$/i.test(ext[ext.length - 1]) ? ext[ext.length - 1].toUpperCase() : '';
};

/** ViewerListModern::summary(): poster, format, viewer and model count, from saved data only. */
export function viewerSummary(v) {
	let model = '';
	let poster = '';
	let viewer = 'modelViewer';
	let count = 0;
	if (isBlockPost(v)) {
		const a = v.attrs || {};
		const models = (a.models || []).filter((m) => m && typeof m === 'object');
		const cur = a.multiple ? models[0] || {} : a.model?.modelUrl ? a.model : { ...(models[0] || {}), ...(a.model || {}), modelUrl: a.model?.modelUrl || models[0]?.modelUrl || '' };
		model = urlOf(cur.modelUrl);
		poster = urlOf(cur.poster);
		viewer = a.currentViewer || 'modelViewer';
		count = a.multiple ? models.filter((m) => urlOf(m.modelUrl)).length : model ? 1 : 0;
	} else {
		const meta = v.meta || {};
		model = urlOf(resolveSource(meta));
		poster = urlOf(meta.bp_3d_poster);
		count = model ? 1 : 0;
		const type = Array.isArray(meta.bp_3d_model_type) ? meta.bp_3d_model_type[0] : meta.bp_3d_model_type;
		const rows = Array.isArray(meta.bp_3d_models) ? meta.bp_3d_models.filter((r) => r && typeof r === 'object') : [];
		if ((type || 'msimple') !== 'msimple' && urlOf(rows[0]?.model_link)) {
			model = urlOf(rows[0].model_link);
			poster = urlOf(meta.bp_3d_posters?.[0]?.poster_img ?? rows[0].poster_src);
			count = rows.filter((r) => urlOf(r.model_link)).length;
		}
		viewer = meta.currentViewer || 'modelViewer';
	}
	return { poster, format: model ? formatOf(model) : '', viewer: viewer === 'O3DViewer' ? 'advanced' : 'lite', count };
}

const STATUS_LABEL = { publish: 'Published', draft: 'Draft', pending: 'Pending', future: 'Scheduled', private: 'Private', trash: 'Trash' };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthKey = (d) => String(d || '').slice(0, 7);
const monthLabel = (k) => `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
const plural = (n, one, many) => (n === 1 ? one : many.replace('%s', n));

// A notice handed over by the editor (Move to trash), shown once on the next visit, like WP's ?trashed=1.
let pending = null;
export const queueListNotice = (n) => (pending = n);

export default function ViewerList() {
	const viewers = useStore((s) => s.viewers || {});
	const modern = useStore((s) => (s.lv?.adminUi || 'modern') === 'modern');
	const listView = useStore((s) => (s.lv?.listView === 'grid' ? 'grid' : 'list'));
	const [view, setView] = useState('all');
	const [q, setQ] = useState('');
	const [query, setQuery] = useState('');
	const [month, setMonth] = useState('');
	const [monthDraft, setMonthDraft] = useState('');
	const [sort, setSort] = useState({ by: 'date', dir: 'desc' });
	const [checked, setChecked] = useState([]);
	const [bulk, setBulk] = useState('-1');
	const [expanded, setExpanded] = useState({});
	const [notice, setNotice] = useState(() => {
		const n = pending;
		pending = null;
		return n;
	});

	const all = Object.values(viewers);
	const counts = { all: 0, mine: 0, publish: 0, draft: 0, trash: 0 };
	all.forEach((v) => {
		counts[v.status] = (counts[v.status] || 0) + 1;
		if (v.status !== 'trash') {
			counts.all++;
			if (v.author === 'demo') counts.mine++;
		}
	});
	const months = [...new Set(all.filter((v) => v.status !== 'trash').map((v) => monthKey(v.date)))].sort().reverse();
	const rows = all
		.filter((v) => {
			if (view === 'all') {
				if (v.status === 'trash') return false;
			} else if (view === 'mine') {
				if (v.status === 'trash' || v.author !== 'demo') return false;
			} else if (v.status !== view) return false;
			if (query && !String(v.title || '').toLowerCase().includes(query.toLowerCase())) return false;
			if (month && monthKey(v.date) !== month) return false;
			return true;
		})
		.sort((x, y) => {
			const d = sort.by === 'title' ? String(x.title || '').localeCompare(String(y.title || '')) : String(x.date).localeCompare(String(y.date)) || Number(x.id) - Number(y.id);
			return sort.dir === 'asc' ? d : -d;
		});

	const setStatus = (ids, status) => store.set((s) => ({ ...s, viewers: ids.reduce((acc, id) => ({ ...acc, [id]: { ...acc[id], status, ...(status === 'trash' ? { prevStatus: acc[id].status } : {}) } }), s.viewers) }));
	const trash = (ids) => {
		setStatus(ids, 'trash');
		setChecked([]);
		setNotice({ kind: 'trash', ids });
	};
	const restore = (ids) => {
		store.set((s) => ({ ...s, viewers: ids.reduce((acc, id) => ({ ...acc, [id]: { ...acc[id], status: acc[id].prevStatus || 'draft' } }), s.viewers) }));
		setChecked([]);
		setNotice({ kind: 'restore', ids });
	};
	const remove = (ids) => {
		store.set((s) => {
			const next = { ...s.viewers };
			ids.forEach((id) => delete next[id]);
			return { ...s, viewers: next };
		});
		setChecked([]);
		setNotice({ kind: 'delete', ids });
	};
	const duplicate = (v) => {
		const id = String(store.nextId('viewers'));
		const now = nowStr();
		store.patch(['viewers', id], { ...structuredClone(v), id, title: (v.title || '') + ' Copy', status: 'draft', date: now, modified: now, author: 'demo' });
		go('v3d.edit.' + id);
	};
	const applyBulk = () => {
		if (!checked.length) return;
		if (bulk === 'trash') trash(checked);
		if (bulk === 'untrash') restore(checked);
		if (bulk === 'delete') remove(checked);
		if (bulk === 'edit' && checked.length === 1) go('v3d.edit.' + checked[0]);
	};

	const viewLink = (key, label) =>
		key === 'all' || counts[key]
			? html`<li class=${key}><a href="#v3d.list" class=${cx(view === key && 'current')} aria-current=${view === key ? 'page' : undefined} onClick=${(e) => (e.preventDefault(), setView(key), setChecked([]))}>${label} <span class="count">(${counts[key] || 0})</span></a></li>`
			: null;
	const views = [viewLink('all', 'All'), viewLink('mine', 'Mine'), viewLink('publish', 'Published'), viewLink('draft', 'Drafts'), viewLink('trash', 'Trash')].filter(Boolean);
	const allChecked = rows.length > 0 && rows.every((r) => checked.includes(r.id));

	const sortLink = (by, label) => {
		const on = sort.by === by;
		const next = on && sort.dir === 'asc' ? 'desc' : on ? 'asc' : by === 'title' ? 'asc' : 'desc';
		return html`<a href="#v3d.list" onClick=${(e) => (e.preventDefault(), setSort({ by, dir: next }))}>
			<span>${label}</span>
			<span class="sorting-indicators"><span class=${cx('sorting-indicator', 'asc', on && sort.dir === 'asc' && 'is-on')} aria-hidden="true"></span><span class=${cx('sorting-indicator', 'desc', on && sort.dir === 'desc' && 'is-on')} aria-hidden="true"></span></span>
		</a>`;
	};
	const head = (where) => html`<tr>
		<td id=${where === 'head' ? 'cb' : undefined} class="manage-column column-cb check-column">
			<input type="checkbox" aria-label="Select All" checked=${allChecked} onChange=${(e) => setChecked(e.currentTarget.checked ? rows.map((r) => r.id) : [])} />
		</td>
		${modern && html`<th scope="col" class="manage-column column-bp3d_thumb">Preview</th>`}
		<th scope="col" class=${cx('manage-column', 'column-title', 'column-primary', sort.by === 'title' ? 'sorted ' + sort.dir : 'sortable asc')}>${sortLink('title', 'Title')}</th>
		${modern && html`<th scope="col" class="manage-column column-bp3d_viewer">Viewer</th><th scope="col" class="manage-column column-bp3d_status">Status</th>`}
		<th scope="col" class="manage-column column-shortcode">Shortcode</th>
		<th scope="col" class=${cx('manage-column', 'column-date', sort.by === 'date' ? 'sorted ' + sort.dir : 'sortable desc')}>${sortLink('date', 'Date')}</th>
	</tr>`;

	const n = notice?.ids?.length || 0;
	const itemCount = html`<span class="displaying-num">${plural(rows.length, '1 item', '%s items')}</span>`;

	const cols = modern ? 7 : 4;
	const toggle =
		modern &&
		html`<div class="bp3d-list-view" role="group" aria-label="Layout">
			${[
				['list', 'List view', html`<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />`],
				['grid', 'Grid view', html`<rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />`],
			].map(
				([key, label, icon]) => html`<a key=${key} class=${cx('bp3d-list-view__btn', listView === key && 'is-active')} href="#v3d.list" aria-label=${label} aria-current=${listView === key ? 'true' : undefined} onClick=${(e) => (e.preventDefault(), store.patch('lv.listView', key))}>
					<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
				</a>`
			)}
		</div>`;

	return html`<${WpAdmin} current="v3d-list" title="3D Viewer">
		<div class=${cx(modern && 'ld-list-modern', modern && listView === 'grid' && 'ld-list-grid')}>
		<div class="wrap ld-list">
			<h1 class="wp-heading-inline">3D Viewer</h1>
			<a href="#v3d.edit.new" class="page-title-action">Add New</a>
			${query && html`<span class="subtitle">Search results for: <strong>${query}</strong></span>`}
			<hr class="wp-header-end" />
			${notice &&
			html`<div id="message" class="updated notice notice-success is-dismissible">
				<p>
					${notice.kind === 'trash' && html`${plural(n, '1 post moved to the Trash.', '%s posts moved to the Trash.')} <a href="#v3d.list" onClick=${(e) => (e.preventDefault(), restore(notice.ids))}>Undo</a>`}
					${notice.kind === 'restore' && plural(n, '1 post restored from the Trash.', '%s posts restored from the Trash.')}
					${notice.kind === 'delete' && plural(n, '1 post permanently deleted.', '%s posts permanently deleted.')}
				</p>
				<button type="button" class="notice-dismiss" onClick=${() => setNotice(null)}><span class="screen-reader-text">Dismiss this notice.</span></button>
			</div>`}

			<h2 class="screen-reader-text">Filter posts list</h2>
			<ul class="subsubsub">
				${views.map((v, i) => html`${v}${i < views.length - 1 ? html`<span class="sep"> |</span> ` : ''}`)}
			</ul>

			<form id="posts-filter" onSubmit=${(e) => (e.preventDefault(), setQuery(q.trim()))}>
				<p class="search-box">
					<label class="screen-reader-text" for="post-search-input">Search Viewers:</label>
					<input type="search" id="post-search-input" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} />
					<input type="submit" id="search-submit" class="button" value="Search Viewers" />
				</p>

				<div class="tablenav top">
					<div class="alignleft actions bulkactions">
						<label for="bulk-action-selector-top" class="screen-reader-text">Select bulk action</label>
						<select id="bulk-action-selector-top" value=${bulk} onChange=${(e) => setBulk(e.currentTarget.value)}>
							<option value="-1">Bulk actions</option>
							${view === 'trash'
								? html`<option value="untrash">Restore</option><option value="delete">Delete permanently</option>`
								: html`<option value="edit">Edit</option><option value="trash">Move to Trash</option>`}
						</select>
						<input type="button" class="button action" value="Apply" onClick=${applyBulk} />
					</div>
					<div class="alignleft actions">
						<label for="filter-by-date" class="screen-reader-text">Filter by date</label>
						<select id="filter-by-date" value=${monthDraft} onChange=${(e) => setMonthDraft(e.currentTarget.value)}>
							<option value="">All dates</option>
							${months.map((k) => html`<option key=${k} value=${k}>${monthLabel(k)}</option>`)}
						</select>
						<input type="button" id="post-query-submit" class="button" value="Filter" onClick=${() => setMonth(monthDraft)} />
					</div>
					${toggle}
					<div class="tablenav-pages one-page">${itemCount}</div>
					<br class="clear" />
				</div>

				<h2 class="screen-reader-text">Posts list</h2>
				<table class="wp-list-table widefat fixed striped table-view-list posts ld-list-table">
					<thead>${head('head')}</thead>
					<tbody id="the-list">
						${!rows.length &&
						html`<tr class="no-items"><td class="colspanchange" colspan=${cols}>${view === 'trash' ? 'No 3D viewers found in Trash.' : 'No 3D viewers found.'}</td></tr>`}
						${rows.map((v) => {
							const sum = modern ? viewerSummary(v) : null;
							return html`<tr key=${v.id} id=${'post-' + v.id} class=${cx('iedit', 'type-bp3d-model-viewer', 'status-' + v.status, expanded[v.id] && 'is-expanded')}>
								<th scope="row" class="check-column">
									<input type="checkbox" aria-label=${'Select ' + (v.title || '(no title)')} checked=${checked.includes(v.id)} onChange=${(e) => setChecked(e.currentTarget.checked ? [...checked, v.id] : checked.filter((x) => x !== v.id))} />
								</th>
								${modern &&
								html`<td class="bp3d_thumb column-bp3d_thumb" data-colname="Preview">
									<span class=${'bp3d-list-thumb bp3d-list-thumb--' + sum.viewer}>
										${sum.poster
											? html`<img src=${sum.poster} alt="" loading="lazy" decoding="async" />`
											: html`<svg class="bp3d-list-thumb__icon" aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" /><path d="m3 7 9 5 9-5M12 12v10" /></svg>`}
										${sum.format && html`<span class="bp3d-list-thumb__format">${sum.format}</span>`}
									</span>
								</td>`}
								<td class="title column-title has-row-actions column-primary page-title" data-colname="Title">
									<strong>
										${v.status === 'trash'
											? html`<span class="row-title">${v.title || '(no title)'}</span>`
											: html`<a class="row-title" href=${'#v3d.edit.' + v.id} aria-label=${`“${v.title || '(no title)'}” (Edit)`}>${v.title || '(no title)'}</a>`}
										${!modern && v.status === 'draft' && html`<span class="post-state"> — <span class="post-state">Draft</span></span>`}
									</strong>
									<div class="row-actions">
										${v.status === 'trash'
											? html`<span class="untrash"><a href="#v3d.list" aria-label=${`Restore “${v.title}” from the Trash`} onClick=${(e) => (e.preventDefault(), restore([v.id]))}>Restore</a> | </span>
													<span class="delete"><a href="#v3d.list" class="submitdelete" aria-label=${`Delete “${v.title}” permanently`} onClick=${(e) => (e.preventDefault(), remove([v.id]))}>Delete Permanently</a></span>`
											: html`<span class="edit"><a href=${'#v3d.edit.' + v.id} aria-label=${`Edit “${v.title}”`}>Edit</a> | </span>
													<span class="trash"><a href="#v3d.list" class="submitdelete" aria-label=${`Move “${v.title}” to the Trash`} onClick=${(e) => (e.preventDefault(), trash([v.id]))}>Trash</a> | </span>
													<span class="duplicate"><a href="#v3d.list" title="Duplicate this item" rel="permalink" onClick=${(e) => (e.preventDefault(), duplicate(v))}>Duplicate</a></span>`}
									</div>
									<button type="button" class="toggle-row" onClick=${() => setExpanded({ ...expanded, [v.id]: !expanded[v.id] })}><span class="screen-reader-text">Show more details</span></button>
								</td>
								${modern &&
								html`<td class="bp3d_viewer column-bp3d_viewer" data-colname="Viewer">
										<span class=${'bp3d-list-badge bp3d-list-badge--' + sum.viewer}>${sum.viewer === 'advanced' ? 'Advanced' : 'Lite'}</span>
										${(sum.format || sum.count > 1) && html`<span class="bp3d-list-meta">${[sum.format, sum.count > 1 && sum.count + ' models'].filter(Boolean).join(' · ')}</span>`}
									</td>
									<td class="bp3d_status column-bp3d_status" data-colname="Status"><span class=${'bp3d-list-status bp3d-list-status--' + v.status}>${STATUS_LABEL[v.status] || v.status}</span></td>`}
								<td class="shortcode column-shortcode" data-colname="Shortcode">${modern ? html`<${ModernShortcode} id=${v.id} />` : html`<${ShortcodeChip} id=${v.id} />`}</td>
								<td class="date column-date" data-colname="Date">
									${v.status === 'publish' ? 'Published' : 'Last Modified'}<br />${listDate(v.status === 'publish' ? v.date : v.modified || v.date)}
								</td>
							</tr>`;
						})}
					</tbody>
					<tfoot>${head('foot')}</tfoot>
				</table>
				<div class="tablenav bottom">
					<div class="tablenav-pages one-page">${itemCount}</div>
					<br class="clear" />
				</div>
			</form>
		</div>
		</div>
	<//>`;
}
