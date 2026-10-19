// Plugins → Installed Plugins (plugins.php). Names, versions, descriptions and URIs come from the plugin
// headers (3d-viewer/3d-viewer.php, 3d-viewer-premium.php, wc-3d-model-viewer.php, woocommerce.php); the extra
// links are the ones Freemius adds before Deactivate ("Upgrade" on free, "Change License" on a licensed Pro,
// "Activate License" on the configurator, which has no licence of its own).
import { html, useState, cx } from '../../js/core/ui.js';
import { WpAdmin } from '../../js/screens/admin/chrome.js';
import { usePlan, useExt, activateExtension, deactivateExtension } from '../core/plan.js';
import { toast, openProModal } from '../core/bus.js';
import { LINKS } from '../core/links.js';

const NOT_IN_DEMO = 'That is not part of this demo.';
const KEEP_ACTIVE = 'This plugin keeps the demo running, so it stays active. Use Free / Pro in the demo bar to switch versions.';
const EXT = 'wc-3d-model-viewer-pro';
// Auto-update choices for this visit (WP keeps them in the auto_update_plugins option).
let autoUpdates = {};

function rowsFor(plan, ext) {
	const rows = [];
	rows.push(
		plan === 'pro'
			? {
					id: '3d-viewer-premium',
					name: '3D Viewer – Display Interactive 3D Models',
					desc: 'Easily display interactive 3D models on the web. Supported File type .glb, .gltf,obj 3ds stl ply off 3dm fbx dae wrl 3mf amf ifc brep step iges fcstd bim',
					version: '2.0.0',
					author: 'bPlugins',
					authorUrl: LINKS.home,
					active: true,
					keep: true,
					actions: [
						['activate-license 3d-viewer', 'Change License', () => toast(NOT_IN_DEMO)],
						['deactivate', 'Deactivate', () => toast(KEEP_ACTIVE)],
					],
					meta: [['Visit plugin site', LINKS.home]],
				}
			: {
					id: '3d-viewer',
					name: '3D Viewer – Turn Product Pages into Interactive 3D Experiences',
					desc: 'Easily display interactive 3D models on the web. Supported File type .glb, .gltf,obj 3ds stl ply off 3dm fbx dae wrl 3mf amf ifc brep step iges fcstd bim',
					version: '2.0.0',
					author: 'bPlugins',
					authorUrl: LINKS.home,
					active: true,
					keep: true,
					actions: [
						['upgrade', 'Upgrade', () => openProModal()],
						['deactivate', 'Deactivate', () => toast(KEEP_ACTIVE)],
					],
					meta: [['View details', LINKS.wporg]],
				}
	);
	if (ext !== 'none') {
		const on = ext === 'active';
		rows.push({
			id: EXT,
			name: '3D Product Configurator for WooCommerce',
			desc: 'Customize a GLB/GLTF 3D model per WooCommerce product variation — show/hide meshes, change colors, swap textures and materials, configure animations, all visually with no code required.',
			version: '1.1.0',
			author: 'bPlugins',
			authorUrl: LINKS.home,
			active: on,
			actions: on
				? [
						['activate-license wc-3d-model-viewer', 'Activate License', () => toast(plan === 'pro' ? 'No licence needed: 3D Viewer Pro already unlocks the configurator.' : 'A separate configurator licence is not part of this demo. Switch to Pro in the demo bar to unlock it.')],
						['deactivate', 'Deactivate', null],
					]
				: [
						['activate', 'Activate', null],
						['delete', 'Delete', () => toast(NOT_IN_DEMO)],
					],
			meta: [['Visit plugin site', LINKS.configurator]],
		});
	}
	rows.push({
		id: 'woocommerce',
		name: 'WooCommerce',
		desc: 'An ecommerce toolkit that helps you sell anything. Beautifully.',
		version: '10.9.4',
		author: 'Automattic',
		authorUrl: 'https://woocommerce.com',
		active: true,
		keep: true,
		actions: [
			['settings', 'Settings', () => toast('WooCommerce settings are not part of this demo.')],
			['deactivate', 'Deactivate', () => toast(KEEP_ACTIVE)],
		],
		meta: [['View details', 'https://wordpress.org/plugins/woocommerce/'], ['Docs', 'https://woocommerce.com/documentation/'], ['API docs', 'https://woocommerce.github.io/code-reference/'], ['Community support', 'https://wordpress.org/support/plugin/woocommerce/']],
	});
	return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export default function Plugins() {
	const plan = usePlan();
	const ext = useExt();
	const [view, setView] = useState('all');
	const [q, setQ] = useState('');
	const [checked, setChecked] = useState([]);
	const [bulk, setBulk] = useState('-1');
	const [auto, setAutoState] = useState(autoUpdates);
	const [notice, setNotice] = useState('');
	const setAuto = (next) => ((autoUpdates = next), setAutoState(next));

	const all = rowsFor(plan, ext);
	const counts = {
		all: all.length,
		active: all.filter((r) => r.active).length,
		inactive: all.filter((r) => !r.active).length,
		'auto-update-enabled': all.filter((r) => auto[r.id]).length,
		'auto-update-disabled': all.filter((r) => !auto[r.id]).length,
	};
	const rows = all
		.filter((r) => view === 'all' || (view === 'active' ? r.active : view === 'inactive' ? !r.active : view === 'auto-update-enabled' ? auto[r.id] : !auto[r.id]))
		.filter((r) => !q || `${r.name} ${r.desc} ${r.author}`.toLowerCase().includes(q.toLowerCase()));
	const allChecked = rows.length > 0 && rows.every((r) => checked.includes(r.id));
	const views = [
		['all', 'All'],
		['active', 'Active'],
		['inactive', 'Inactive'],
		['auto-update-enabled', 'Auto-updates Enabled'],
		['auto-update-disabled', 'Auto-updates Disabled'],
	].filter(([k]) => k === 'all' || counts[k] > 0);
	// WP_Plugins_List_Table::get_bulk_actions(), per status view.
	const bulkActions = [
		view !== 'active' && ['activate-selected', 'Activate'],
		view !== 'inactive' && ['deactivate-selected', 'Deactivate'],
		['update-selected', 'Update'],
		view !== 'active' && ['delete-selected', 'Delete'],
		view !== 'auto-update-enabled' && ['enable-auto-update-selected', 'Enable Auto-updates'],
		view !== 'auto-update-disabled' && ['disable-auto-update-selected', 'Disable Auto-updates'],
	].filter(Boolean);

	const activate = () => (activateExtension({ quiet: true }), setNotice('Plugin activated.'));
	const deactivate = () => (deactivateExtension(), setNotice('Plugin deactivated.'));
	const run = (key, fn) => (key === 'activate' ? activate() : key === 'deactivate' && !fn ? deactivate() : fn?.());

	const applyBulk = () => {
		if (bulk === '-1' || !checked.length) return;
		const picked = all.filter((r) => checked.includes(r.id));
		if (bulk === 'enable-auto-update-selected' || bulk === 'disable-auto-update-selected') {
			const next = { ...auto };
			picked.forEach((r) => (next[r.id] = bulk === 'enable-auto-update-selected'));
			setAuto(next);
			setNotice(bulk === 'enable-auto-update-selected' ? 'Selected plugins will be auto-updated.' : 'Selected plugins will no longer be auto-updated.');
		} else if (bulk === 'activate-selected') {
			if (picked.some((r) => r.id === EXT) && ext !== 'active') activateExtension({ quiet: true });
			setNotice('Selected plugins activated.');
		} else if (bulk === 'deactivate-selected') {
			if (picked.some((r) => r.keep)) toast(KEEP_ACTIVE);
			else {
				if (ext === 'active') deactivateExtension();
				setNotice('Selected plugins deactivated.');
			}
		} else if (bulk === 'update-selected') toast('Your plugins are all up to date.');
		else toast(NOT_IN_DEMO);
		setChecked([]);
		setBulk('-1');
	};

	const head = (where) => html`<tr>
		<td id=${where === 'head' ? 'cb' : undefined} class="manage-column column-cb check-column">
			<input type="checkbox" aria-label="Select All" checked=${allChecked} onChange=${(e) => setChecked(e.currentTarget.checked ? rows.map((r) => r.id) : [])} />
		</td>
		<th scope="col" class="manage-column column-name column-primary">Plugin</th>
		<th scope="col" class="manage-column column-description">Description</th>
		<th scope="col" class="manage-column column-auto-updates">Automatic Updates</th>
	</tr>`;
	const num = html`<div class="tablenav-pages one-page"><span class="displaying-num">${rows.length} ${rows.length === 1 ? 'item' : 'items'}</span></div>`;

	return html`<${WpAdmin} current="installed-plugins" title="Plugins">
		<div class="wrap ld-plugins">
			<h1 class="wp-heading-inline">Plugins</h1>
			<a href="#" class="page-title-action" onClick=${(e) => (e.preventDefault(), toast('Adding plugins is not part of this demo. The 3D Viewer extensions are under 3D Viewer → Extensions.'))}>Add New Plugin</a>
			<hr class="wp-header-end" />
			${notice &&
			html`<div id="message" class="updated notice is-dismissible">
				<p>${notice}</p>
				<button type="button" class="notice-dismiss" onClick=${() => setNotice('')}><span class="screen-reader-text">Dismiss this notice.</span></button>
			</div>`}
			${ext === 'none' &&
			html`<div class="notice notice-info ld-plugins-tip">
				<p>Want the WooCommerce configurator? Install it from <a href="#v3d.extensions">3D Viewer → Extensions</a> and it shows up here.</p>
			</div>`}

			<ul class="subsubsub">
				${views.map(
					([k, label], i) => html`<li class=${k} key=${k}>
						<a href="#wp.plugins" class=${cx(view === k && 'current')} aria-current=${view === k ? 'page' : undefined} onClick=${(e) => (e.preventDefault(), setView(k), setChecked([]), setBulk('-1'))}>${label} <span class="count">(${counts[k]})</span></a>${i < views.length - 1 ? ' |' : ''}
					</li>`
				)}
			</ul>

			<form onSubmit=${(e) => e.preventDefault()}>
				<p class="search-box">
					<label class="screen-reader-text" for="plugin-search-input">Search installed plugins:</label>
					<input type="search" id="plugin-search-input" class="wp-filter-search" placeholder="Search installed plugins..." value=${q} onInput=${(e) => setQ(e.currentTarget.value)} />
				</p>
				<div class="tablenav top">
					<div class="alignleft actions bulkactions">
						<label for="bulk-action-selector-top" class="screen-reader-text">Select bulk action</label>
						<select id="bulk-action-selector-top" value=${bulk} onChange=${(e) => setBulk(e.currentTarget.value)}>
							<option value="-1">Bulk actions</option>
							${bulkActions.map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}
						</select>
						<input type="button" class="button action" value="Apply" onClick=${applyBulk} />
					</div>
					${num}
					<br class="clear" />
				</div>
				<h2 class="screen-reader-text">Plugins list</h2>
				<table class="wp-list-table widefat plugins ld-plugins-table">
					<thead>${head('head')}</thead>
					<tbody id="the-list">
						${!rows.length && html`<tr class="no-items"><td class="colspanchange" colspan="4">No plugins found.</td></tr>`}
						${rows.map(
							(r) => html`<tr key=${r.id} class=${r.active ? 'active' : 'inactive'} data-slug=${r.id}>
								<th scope="row" class="check-column">
									<label class="screen-reader-text" for=${'checkbox_' + r.id}>Select ${r.name}</label>
									<input type="checkbox" id=${'checkbox_' + r.id} checked=${checked.includes(r.id)} onChange=${(e) => setChecked(e.currentTarget.checked ? [...checked, r.id] : checked.filter((x) => x !== r.id))} />
								</th>
								<td class="plugin-title column-primary">
									<strong>${r.name}</strong>
									<div class="row-actions visible">
										${r.actions.map(
											([key, label, fn], i) => html`<span class=${key} key=${key}>
												<a href="#wp.plugins" onClick=${(e) => (e.preventDefault(), run(key, fn))}>${label}</a>${i < r.actions.length - 1 ? ' | ' : ''}
											</span>`
										)}
									</div>
								</td>
								<td class="column-description desc">
									<div class="plugin-description"><p>${r.desc}</p></div>
									<div class=${cx(r.active ? 'active' : 'inactive', 'second', 'plugin-version-author-uri')}>
										Version ${r.version} | By <a href=${r.authorUrl} target="_blank" rel="noopener">${r.author}</a>
										${r.meta.map(([label, href]) => html` | <a href=${href} target="_blank" rel="noopener" key=${label}>${label}</a>`)}
									</div>
								</td>
								<td class="column-auto-updates">
									<a href="#wp.plugins" class="toggle-auto-update" onClick=${(e) => (e.preventDefault(), setAuto({ ...auto, [r.id]: !auto[r.id] }))}>
										<span class="label">${auto[r.id] ? 'Disable auto-updates' : 'Enable auto-updates'}</span>
									</a>
								</td>
							</tr>`
						)}
					</tbody>
					<tfoot>${head('foot')}</tfoot>
				</table>
				<div class="tablenav bottom">
					<div class="alignleft actions bulkactions"></div>
					${num}
					<br class="clear" />
				</div>
			</form>
		</div>
	<//>`;
}
