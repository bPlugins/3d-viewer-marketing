// 3D Viewer → Presets (Pro): the bp3d-preset post list (edit.php?post_type=bp3d-preset).
// Labels and the scope notice come from 3d-viewer-premium/inc/Base/PostTypePreset.php; the row
// actions are core's minus View and Quick Edit, which the plugin removes.
import { html, useState, cx } from '../../js/core/ui.js';
import { store, useStore } from '../../js/core/store.js';
import { go } from '../../js/core/router.js';
import { WpAdmin } from '../../js/screens/admin/chrome.js';
import { listDate } from '../../js/screens/admin/products.js';
import { toast } from '../core/bus.js';

const STATE_LABEL = { draft: 'Draft', pending: 'Pending', private: 'Private' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const statusOf = (p) => p.status || 'publish';
const titleOf = (p) => p.title || '(no title)';
const monthKey = (d) => String(d || '').slice(0, 7);
const monthLabel = (k) => `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
const plural = (n, one, many) => (n === 1 ? one : many.replace('%s', n));

// The editor's "Move to trash" lands here with core's ?trashed=1 notice, shown once.
let pending = null;
export const queuePresetNotice = (n) => (pending = n);

export default function Presets() {
	const all = useStore((s) => Object.values(s.vpresets || {}));
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

	const counts = all.reduce((c, p) => ((c[statusOf(p)] = (c[statusOf(p)] || 0) + 1), c), {});
	counts.all = all.filter((p) => statusOf(p) !== 'trash').length;
	const months = [...new Set(all.filter((p) => statusOf(p) !== 'trash').map((p) => monthKey(p.date)))].sort().reverse();
	const rows = all
		.filter((p) => (view === 'all' ? statusOf(p) !== 'trash' : statusOf(p) === view))
		.filter((p) => !query || titleOf(p).toLowerCase().includes(query.toLowerCase()))
		.filter((p) => !month || monthKey(p.date) === month)
		.sort((x, y) => {
			const d = sort.by === 'title' ? titleOf(x).localeCompare(titleOf(y)) : String(x.date).localeCompare(String(y.date)) || Number(x.id) - Number(y.id);
			return sort.dir === 'asc' ? d : -d;
		});
	const allChecked = rows.length > 0 && rows.every((r) => checked.includes(r.id));

	const trash = (ids) => {
		store.set((s) => {
			const next = { ...s.vpresets };
			ids.forEach((id) => (next[id] = { ...next[id], status: 'trash', prevStatus: statusOf(next[id]) }));
			return { ...s, vpresets: next };
		});
		setChecked([]);
		setNotice({ kind: 'trash', ids });
	};
	const restore = (ids) => {
		store.set((s) => {
			const next = { ...s.vpresets };
			ids.forEach((id) => next[id] && (next[id] = { ...next[id], status: next[id].prevStatus || 'draft', prevStatus: undefined }));
			return { ...s, vpresets: next };
		});
		setChecked([]);
		setNotice({ kind: 'restore', ids });
	};
	const remove = (ids) => {
		store.set((s) => {
			const next = { ...s.vpresets };
			ids.forEach((id) => delete next[id]);
			return { ...s, vpresets: next };
		});
		setChecked([]);
		setNotice({ kind: 'delete', ids });
	};
	const applyBulk = () => {
		if (!checked.length || bulk === '-1') return;
		if (bulk === 'trash') trash(checked);
		if (bulk === 'untrash') restore(checked);
		if (bulk === 'delete') remove(checked);
		if (bulk === 'edit') {
			if (checked.length === 1) go('v3d.preset.' + checked[0]);
			else toast('Bulk Edit is not part of this demo. Open one preset at a time.');
		}
		setBulk('-1');
	};

	const viewLink = (key, label) =>
		counts[key] || key === 'all'
			? html`<li class=${key} key=${key}><a href="#v3d.presets" class=${cx(view === key && 'current')} aria-current=${view === key ? 'page' : undefined} onClick=${(e) => (e.preventDefault(), setView(key), setChecked([]))}>${label} <span class="count">(${counts[key] || 0})</span></a></li>`
			: null;
	const views = [viewLink('all', 'All'), viewLink('publish', 'Published'), viewLink('draft', 'Drafts'), viewLink('trash', 'Trash')].filter(Boolean);
	const sortLink = (by, label) => {
		const on = sort.by === by;
		const next = on && sort.dir === 'asc' ? 'desc' : on ? 'asc' : by === 'title' ? 'asc' : 'desc';
		return html`<a href="#v3d.presets" onClick=${(e) => (e.preventDefault(), setSort({ by, dir: next }))}>
			<span>${label}</span>
			<span class="sorting-indicators"><span class=${cx('sorting-indicator', 'asc', on && sort.dir === 'asc' && 'is-on')} aria-hidden="true"></span><span class=${cx('sorting-indicator', 'desc', on && sort.dir === 'desc' && 'is-on')} aria-hidden="true"></span></span>
		</a>`;
	};
	const head = (where) => html`<tr>
		<td id=${where === 'head' ? 'cb' : undefined} class="manage-column column-cb check-column">
			<input type="checkbox" aria-label="Select All" checked=${allChecked} onChange=${(e) => setChecked(e.currentTarget.checked ? rows.map((r) => r.id) : [])} />
		</td>
		<th scope="col" class=${cx('manage-column', 'column-title', 'column-primary', sort.by === 'title' ? 'sorted ' + sort.dir : 'sortable asc')}>${sortLink('title', 'Title')}</th>
		<th scope="col" class=${cx('manage-column', 'column-date', sort.by === 'date' ? 'sorted ' + sort.dir : 'sortable desc')}>${sortLink('date', 'Date')}</th>
	</tr>`;
	const pager = html`<div class="tablenav-pages one-page"><span class="displaying-num">${plural(rows.length, '1 item', '%s items')}</span></div>`;
	const n = notice?.ids?.length || 0;
	// WP_List_Table::search_box() prints nothing while the list is empty and no search is running.
	const hasItems = view === 'trash' ? (counts.trash || 0) > 0 : counts.all > 0;

	return html`<${WpAdmin} current="v3d-presets" title="Presets">
		<div class="wrap ld-presets-list">
			<h1 class="wp-heading-inline">Presets</h1>
			<a href="#v3d.preset.new" class="page-title-action">Add New</a>
			${query && html`<span class="subtitle">Search results for: <strong>${query}</strong></span>`}
			<hr class="wp-header-end" />
			<div class="notice notice-info"><p>Presets apply to WooCommerce products only. Pick one in a product's 3D Viewer Settings › Template/Preset. Blocks, shortcodes and Elementor widgets don't use presets.</p></div>
			${notice &&
			html`<div id="message" class="updated notice notice-success is-dismissible">
				<p>
					${notice.kind === 'trash' && html`${plural(n, '1 post moved to the Trash.', '%s posts moved to the Trash.')} <a href="#v3d.presets" onClick=${(e) => (e.preventDefault(), restore(notice.ids))}>Undo</a>`}
					${notice.kind === 'restore' && plural(n, '1 post restored from the Trash.', '%s posts restored from the Trash.')}
					${notice.kind === 'delete' && plural(n, '1 post permanently deleted.', '%s posts permanently deleted.')}
				</p>
				<button type="button" class="notice-dismiss" onClick=${() => setNotice(null)}><span class="screen-reader-text">Dismiss this notice.</span></button>
			</div>`}

			<h2 class="screen-reader-text">Filter posts list</h2>
			<ul class="subsubsub">${views.map((v, i) => html`${v}${i < views.length - 1 ? html`<span class="sep"> |</span> ` : ''}`)}</ul>

			<form onSubmit=${(e) => (e.preventDefault(), setQuery(q.trim()))}>
				${(hasItems || query) &&
				html`<p class="search-box">
					<label class="screen-reader-text" for="post-search-input">Search Presets:</label>
					<input type="search" id="post-search-input" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} />
					<input type="submit" id="search-submit" class="button" value="Search Presets" />
				</p>`}
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
					${months.length > 0 &&
					html`<div class="alignleft actions">
						<label for="filter-by-date" class="screen-reader-text">Filter by date</label>
						<select id="filter-by-date" value=${monthDraft} onChange=${(e) => setMonthDraft(e.currentTarget.value)}>
							<option value="">All dates</option>
							${months.map((k) => html`<option key=${k} value=${k}>${monthLabel(k)}</option>`)}
						</select>
						<input type="button" class="button" value="Filter" onClick=${() => setMonth(monthDraft)} />
					</div>`}
					${view === 'trash' && rows.length > 0 && html`<div class="alignleft actions"><input type="button" class="button apply" value="Empty Trash" onClick=${() => remove(rows.map((r) => r.id))} /></div>`}
					${pager}
					<br class="clear" />
				</div>
				<h2 class="screen-reader-text">Posts list</h2>
				<table class="wp-list-table widefat fixed striped table-view-list posts ld-presets-table">
					<thead>${head('head')}</thead>
					<tbody id="the-list">
						${!rows.length && html`<tr class="no-items"><td class="colspanchange" colspan="3">${view === 'trash' ? 'No presets found in Trash.' : 'No presets found.'}</td></tr>`}
						${rows.map((p) => {
							const st = statusOf(p);
							return html`<tr key=${p.id} id=${'post-' + p.id} class=${cx('iedit', 'type-bp3d-preset', 'status-' + st, expanded[p.id] && 'is-expanded')}>
								<th scope="row" class="check-column">
									<input type="checkbox" aria-label=${'Select ' + titleOf(p)} checked=${checked.includes(p.id)} onChange=${(e) => setChecked(e.currentTarget.checked ? [...checked, p.id] : checked.filter((x) => x !== p.id))} />
								</th>
								<td class="title column-title has-row-actions column-primary page-title" data-colname="Title">
									<strong>
										${st === 'trash' ? html`<span class="row-title">${titleOf(p)}</span>` : html`<a class="row-title" href=${'#v3d.preset.' + p.id} aria-label=${`“${titleOf(p)}” (Edit)`}>${titleOf(p)}</a>`}
										${STATE_LABEL[st] && view !== st && html`<span class="post-state"> — <span class="post-state">${STATE_LABEL[st]}</span></span>`}
									</strong>
									<div class="row-actions">
										${st === 'trash'
											? html`<span class="untrash"><a href="#v3d.presets" aria-label=${`Restore “${titleOf(p)}” from the Trash`} onClick=${(e) => (e.preventDefault(), restore([p.id]))}>Restore</a> | </span>
													<span class="delete"><a href="#v3d.presets" class="submitdelete" aria-label=${`Delete “${titleOf(p)}” permanently`} onClick=${(e) => (e.preventDefault(), remove([p.id]))}>Delete Permanently</a></span>`
											: html`<span class="edit"><a href=${'#v3d.preset.' + p.id} aria-label=${`Edit “${titleOf(p)}”`}>Edit</a> | </span>
													<span class="trash"><a href="#v3d.presets" class="submitdelete" aria-label=${`Move “${titleOf(p)}” to the Trash`} onClick=${(e) => (e.preventDefault(), trash([p.id]))}>Trash</a></span>`}
									</div>
									<button type="button" class="toggle-row" onClick=${() => setExpanded({ ...expanded, [p.id]: !expanded[p.id] })}><span class="screen-reader-text">Show more details</span></button>
								</td>
								<td class="date column-date" data-colname="Date">${st === 'publish' ? 'Published' : 'Last Modified'}<br />${listDate(st === 'publish' ? p.date : p.modified || p.date)}</td>
							</tr>`;
						})}
					</tbody>
					<tfoot>${head('foot')}</tfoot>
				</table>
				<div class="tablenav bottom">${pager}<br class="clear" /></div>
			</form>
		</div>
	<//>`;
}
