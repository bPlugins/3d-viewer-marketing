// saved-designs: WooCommerce → 3D Models → Saved designs tab (#admin.designs, AdminPage::render_tab()), a WP list
// table of wp_wc3d_saved_designs rows: views, row actions, delete expired links. Spec: specs/saved-designs.md.
import { html, useState, cx } from '../../core/ui.js';
import { useStore } from '../../core/store.js';
import { useFeature } from '../../core/features.js';
import { designsOf, isExpired, expiresAt, longDate, storeLink, productToken, deleteDesigns, lookupDesign } from '../../shared/saved-designs.js';
import { DesignThumb, CopyButton } from '../store/saved-designs.js';
import { lineName } from '../store/theme.js';
import { WpAdmin } from './chrome.js';
import { ModelsPage } from '../../shared/admin-ui.js';
import ModelsList from './models-list.js';

const VIEWS = [
	['all', 'All'],
	['accounts', 'In accounts'],
	['links', 'Shared links'],
	['expired', 'Expired'],
];

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function SavedDesignsAdmin() {
	const on = useFeature('saved-designs');
	const state = useStore();
	const [view, setView] = useState('all');
	const [confirm, setConfirm] = useState(''); // code | 'expired'
	const [notice, setNotice] = useState('');

	const all = designsOf(state).sort((a, b) => String(b.created).localeCompare(String(a.created)) || b.seq - a.seq);
	const expired = all.filter((d) => isExpired(d, state));
	const match = { all: () => true, accounts: (d) => !!d.customerId, links: (d) => !d.customerId && !isExpired(d, state), expired: (d) => isExpired(d, state) };
	const counts = Object.fromEntries(VIEWS.map(([k]) => [k, all.filter(match[k]).length]));
	const rows = all.filter(match[view]);

	const remove = (codes, text) => {
		deleteDesigns(codes);
		setConfirm('');
		setNotice(text);
	};
	const head = () => html`<tr>
		<th scope="col" class="manage-column column-design column-primary">Design</th>
		<th scope="col" class="manage-column column-product">Product</th>
		<th scope="col" class="manage-column column-customer">Customer</th>
		<th scope="col" class="manage-column column-created">Created</th>
		<th scope="col" class="manage-column column-expires">Expires</th>
		<th scope="col" class="manage-column column-views num">Views</th>
	</tr>`;

	// Module off: no tab, so ModelsListPage falls back to the Models tab.
	if (!on) return html`<${ModelsList} />`;

	return html`<${WpAdmin} current="wc3d-models" title="3D Models">
		<${ModelsPage} active="designs">
		<div class="wc3d-panel wc3d-list wc3d-saved-designs-admin wc3d-designs-admin">
			<div class="wc3d-panel__head">
				<div class="wc3d-list__intro">
					<h2 class="wc3d-panel__title">Saved designs</h2>
					<p class="wc3d-panel__desc">Links customers shared and designs they saved to their account. Shared links expire after the link lifetime; saved designs do not.</p>
				</div>
			</div>
			${notice && html`<div key=${notice} class="notice notice-success inline"><p>${notice}</p></div>`}
			<ul class="subsubsub">
				${VIEWS.map(
					([k, l], i) => html`<li class=${k} key=${k}>
						<a href="#admin.designs" class=${cx(view === k && 'current')} aria-current=${view === k ? 'page' : undefined} onClick=${(e) => (e.preventDefault(), setView(k))}>
							${l} <span class="count">(${counts[k]})</span>
						</a>${i < VIEWS.length - 1 ? ' |' : ''}
					</li>`
				)}
			</ul>
			<div class="wc3d-saved-designs-admin__purge">
				${confirm === 'expired' && expired.length
					? html`<span class="wc3d-saved-designs-admin__confirm wc3d-inline-confirm" role="group" aria-label="Confirm delete">
							<span>Delete ${plural(expired.length, 'expired link', 'expired links')}? This cannot be undone.</span>
							<button type="button" class="button button-link-delete" onClick=${() => remove(expired.map((d) => d.code), `${plural(expired.length, 'expired link', 'expired links')} deleted.`)}>Delete</button>
							<button type="button" class="button" onClick=${() => setConfirm('')}>Cancel</button>
						</span>`
					: html`<button type="button" class="button" disabled=${!expired.length} onClick=${() => setConfirm('expired')}>Delete expired links</button>`}
			</div>
			<div class="tablenav top">
				<div class="tablenav-pages one-page"><span class="displaying-num">${plural(rows.length, 'item', 'items')}</span></div>
				<br class="clear" />
			</div>
			<table class="wp-list-table widefat fixed striped table-view-list wc3d-designs-table">
				<thead>${head()}</thead>
				<tbody id="the-list">
					${!rows.length && html`<tr class="no-items"><td class="colspanchange" colspan="6">No saved designs found.</td></tr>`}
					${rows.map((d) => {
						const r = lookupDesign(state, d.code);
						const p = state.products?.[d.productId];
						const customer = d.customerId ? state.customers?.[d.customerId] : null;
						const exp = expiresAt(d, state);
						const dead = isExpired(d, state);
						return html`<tr key=${d.code} class=${cx(dead && 'is-expired')}>
							<td class="column-design has-row-actions column-primary" data-colname="Design">
								<div class="wc3d-designs-table__design">
									<${DesignThumb} design=${d} size=${48} />
									<div>
										<strong><code>${d.code}</code></strong>
										${d.name && html`<span class="wc3d-designs-table__name">${d.name}</span>`}
										${confirm === d.code
											? html`<div class="wc3d-inline-confirm" role="group" aria-label="Confirm delete">
													<span>Delete design ${d.code}? Its link stops working.</span>
													<button type="button" class="button button-small button-link-delete" onClick=${() => remove([d.code], `Design ${d.code} deleted.`)}>Delete</button>
													<button type="button" class="button button-small" onClick=${() => setConfirm('')}>Cancel</button>
												</div>`
											: html`<div class="row-actions">
													${r.status === 'ok' && html`<span class="view"><a href=${'#' + productToken(state, d)}>View on store</a> | </span>`}
													<span class="copy"><${CopyButton} text=${storeLink(d.code)} class="button-link" /> | </span>
													<span class="trash"><a href="#admin.designs" class="submitdelete" onClick=${(e) => (e.preventDefault(), setConfirm(d.code))}>Delete</a></span>
												</div>`}
									</div>
								</div>
							</td>
							<td class="column-product" data-colname="Product">${p ? html`<a href=${'#admin.product.' + p.id}>${lineName(state, d)}</a>` : html`<span class="description">Deleted product</span>`}</td>
							<td class="column-customer" data-colname="Customer">${customer ? customer.name : 'Guest'}</td>
							<td class="column-created" data-colname="Created">${longDate(d.created)}</td>
							<td class="column-expires" data-colname="Expires">${dead ? html`<span class="wc3d-designs-table__expired">Expired</span>` : exp ? longDate(exp) : 'Never'}</td>
							<td class="column-views num" data-colname="Views">${Number(d.views) || 0}</td>
						</tr>`;
					})}
				</tbody>
				<tfoot>${head()}</tfoot>
			</table>
		</div>
		<//>
	<//>`;
}
