// WordPress → Dashboard (index.php), WP 6.x look. The core Welcome panel is replaced by the demo's own
// "start here" panel; the widgets are core's (Site Health Status, At a Glance, Activity, Quick Draft) plus
// WooCommerce's, in wp_dashboard_setup() order. Screen Options, Help and the box controls work for the visit.
import { html, useState, cx } from '../../js/core/ui.js';
import { useStore } from '../../js/core/store.js';
import { go } from '../../js/core/router.js';
import { WpAdmin } from '../../js/screens/admin/chrome.js';
import { usePlan, setPlan, useExt } from '../core/plan.js';
import { toast } from '../core/bus.js';
import { TOURS } from '../core/tours.js';
import { startTour } from '../ui/tour.js';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');
const ordinal = (d) => d + (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');
/** wp_dashboard_recent_posts(): 'M jS' (or Today), then the time. */
function activityDate(s) {
	const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(s || ''));
	if (!m) return '';
	const h = +(m[4] || 0);
	const now = new Date();
	const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` === `${m[1]}-${m[2]}-${m[3]}`;
	const day = today ? 'Today' : `${MON[+m[2] - 1]} ${ordinal(+m[3])}${+m[1] !== now.getFullYear() ? ' ' + m[1] : ''}`;
	return `${day}, ${((h + 11) % 12) + 1}:${pad(+(m[5] || 0))} ${h < 12 ? 'am' : 'pm'}`;
}
const longDay = (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

const I = (d) => html`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
	cube: I(html`<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m12 12 8-4.5M12 12v9M12 12 4 7.5" />`),
	pro: I(html`<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8L3.5 9.2l5.9-.9L12 3Z" />`),
	cart: I(html`<path d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" />`),
	store: I(html`<path d="M4 10v10h16V10" /><path d="M2 10 4 4h16l2 6" /><path d="M2 10a3.3 3.3 0 0 0 6.7 0 3.3 3.3 0 0 0 6.6 0 3.3 3.3 0 0 0 6.7 0" /><path d="M10 20v-5h4v5" />`),
};

// wp_dashboard_setup(): core boxes, then plugins' (all 'normal' unless they say 'side').
const WIDGETS = [
	['dashboard_site_health', 'Site Health Status'],
	['dashboard_right_now', 'At a Glance'],
	['dashboard_activity', 'Activity'],
	['dashboard_quick_press', 'Quick Draft'],
	['woocommerce_dashboard_recent_reviews', 'WooCommerce Recent Reviews'],
	['woocommerce_dashboard_status', 'WooCommerce Status'],
];
const TITLE = Object.fromEntries(WIDGETS);
// Screen state for this visit (WP keeps it in user meta): columns, hidden and closed boxes, welcome panel, drafts.
const screen = {
	cols: [['dashboard_site_health', 'dashboard_right_now', 'dashboard_activity', 'woocommerce_dashboard_recent_reviews', 'woocommerce_dashboard_status'], ['dashboard_quick_press']],
	hidden: {},
	closed: {},
	welcome: true,
	drafts: [],
};

const HELP_TABS = [
	['overview', 'Overview', () => html`<p>Welcome to your WordPress Dashboard!</p><p>The Dashboard is the first place you will come to every time you log into your site. It is where you will find all your WordPress tools. If you need help, just click the “Help” tab above the screen title.</p>`],
	['help-navigation', 'Navigation', () => html`<p>The left-hand navigation menu provides links to all of the WordPress administration screens, with submenu items displayed on hover. You can minimize this menu to a narrow icon strip by clicking on the Collapse Menu arrow at the bottom.</p><p>Links in the Toolbar at the top of the screen connect your dashboard and the front end of your site, and provide access to your profile and helpful WordPress information.</p>`],
	['help-layout', 'Layout', () => html`<p>You can use the following controls to arrange your Dashboard screen to suit your workflow. This is true on most other administration screens as well.</p><p><strong>Screen Options</strong> — Use the Screen Options tab to choose which Dashboard boxes to show.</p><p><strong>Drag and Drop</strong> — To rearrange the boxes, drag and drop by clicking on the title bar of the selected box and releasing when you see a gray dotted-line rectangle appear in the location you want to place the box.</p><p><strong>Box Controls</strong> — Click the title bar of the box to expand or collapse it. Some boxes added by plugins may have configurable content, and will show a “Configure” link in the title bar if you hover over it.</p>`],
	['help-content', 'Content', () => html`<p>The boxes on your Dashboard screen are:</p><p><strong>Welcome</strong> — Shows links for some of the most common tasks when setting up a new site.</p><p><strong>Site Health Status</strong> — Informs you of any potential issues that should be addressed to improve the performance or security of your website.</p><p><strong>At a Glance</strong> — Displays a summary of the content on your site and identifies which theme and version of WordPress you are using.</p><p><strong>Activity</strong> — Shows the upcoming scheduled posts, recently published posts, and the most recent comments on your posts and allows you to moderate them.</p><p><strong>Quick Draft</strong> — Allows you to create a new post and save it as a draft. Also displays links to the 5 most recent draft posts you've started.</p><p><strong>WordPress Events and News</strong> — Upcoming events near you as well as the latest news from the official WordPress project and the <a href="https://planet.wordpress.org/" target="_blank" rel="noopener">WordPress Planet</a>.</p>`],
];

/** Screen Options / Help tabs and the panel they open (wp-admin/includes/class-wp-screen.php). */
function ScreenMeta({ hidden, onHide, welcome, onWelcome }) {
	const [open, setOpen] = useState('');
	const [helpTab, setHelpTab] = useState('overview');
	const tab = HELP_TABS.find((t) => t[0] === helpTab);
	return html`<div id="screen-meta" class="ld-dash-wp-screenmeta">
		${open === 'options' &&
		html`<div id="screen-options-wrap" class="ld-dash-wp-panel" aria-label="Screen Options Tab">
			<fieldset class="metabox-prefs">
				<legend>Screen elements</legend>
				<p>Some screen elements can be shown or hidden by using the checkboxes. Expand or collapse the elements by clicking on their headings, and arrange them by dragging their headings or by clicking on the up or down arrows.</p>
				${WIDGETS.map(([id, title]) => html`<label key=${id} for=${id + '-hide'}><input class="hide-postbox-tog" type="checkbox" id=${id + '-hide'} checked=${!hidden[id]} onChange=${(e) => onHide(id, !e.currentTarget.checked)} />${title}</label>`)}
				<label for="wp_welcome_panel-hide"><input type="checkbox" id="wp_welcome_panel-hide" checked=${welcome} onChange=${(e) => onWelcome(e.currentTarget.checked)} />Welcome</label>
			</fieldset>
		</div>`}
		${open === 'help' &&
		html`<div id="contextual-help-wrap" class="ld-dash-wp-panel ld-dash-wp-help" aria-label="Contextual Help Tab">
			<div class="contextual-help-tabs">
				<ul>
					${HELP_TABS.map(([id, label]) => html`<li key=${id} class=${cx(helpTab === id && 'active')}><a href=${'#tab-panel-' + id} aria-controls=${'tab-panel-' + id} onClick=${(e) => (e.preventDefault(), setHelpTab(id))}>${label}</a></li>`)}
				</ul>
			</div>
			<div class="contextual-help-sidebar">
				<p><strong>For more information:</strong></p>
				<p><a href="https://wordpress.org/documentation/article/dashboard-screen/" target="_blank" rel="noopener">Documentation on Dashboard</a></p>
				<p><a href="https://wordpress.org/support/forums/" target="_blank" rel="noopener">Support forums</a></p>
			</div>
			<div class="contextual-help-tabs-wrap"><div id=${'tab-panel-' + helpTab} class="help-tab-content active">${tab[2]()}</div></div>
		</div>`}
		<div id="screen-meta-links" class="ld-dash-wp-meta">
			${open !== 'help' && html`<div id="screen-options-link-wrap" class="hide-if-no-js screen-meta-toggle"><button type="button" id="show-settings-link" class=${cx('show-settings', 'ld-dash-wp-metalink', open === 'options' && 'screen-meta-active')} aria-controls="screen-options-wrap" aria-expanded=${open === 'options'} onClick=${() => setOpen(open === 'options' ? '' : 'options')}>Screen Options</button></div>`}
			${open !== 'options' && html`<div id="contextual-help-link-wrap" class="hide-if-no-js screen-meta-toggle"><button type="button" id="contextual-help-link" class=${cx('show-settings', 'ld-dash-wp-metalink', open === 'help' && 'screen-meta-active')} aria-controls="contextual-help-wrap" aria-expanded=${open === 'help'} onClick=${() => setOpen(open === 'help' ? '' : 'help')}>Help</button></div>`}
		</div>
	</div>`;
}

/** A dashboard box with WP 5.5+'s Move up / Move down / Toggle panel buttons. */
function Postbox({ id, closed, onToggle, onMove, first, last, children }) {
	const title = TITLE[id];
	return html`<div id=${id} class=${cx('postbox', closed && 'closed')}>
		<div class="postbox-header">
			<h2 class="hndle">${title}</h2>
			<div class="handle-actions hide-if-no-js">
				<button type="button" class="handle-order-higher" aria-disabled=${first} aria-describedby=${id + '-handle-order-higher-description'} onClick=${() => !first && onMove(-1)}>
					<span class="screen-reader-text">Move up</span><span class="order-higher-indicator" aria-hidden="true"></span>
				</button>
				<span class="hidden" id=${id + '-handle-order-higher-description'}>Move ${title} box up</span>
				<button type="button" class="handle-order-lower" aria-disabled=${last} aria-describedby=${id + '-handle-order-lower-description'} onClick=${() => !last && onMove(1)}>
					<span class="screen-reader-text">Move down</span><span class="order-lower-indicator" aria-hidden="true"></span>
				</button>
				<span class="hidden" id=${id + '-handle-order-lower-description'}>Move ${title} box down</span>
				<button type="button" class="handlediv" aria-expanded=${!closed} onClick=${onToggle}>
					<span class="screen-reader-text">Toggle panel: ${title}</span><span class="toggle-indicator" aria-hidden="true"></span>
				</button>
			</div>
		</div>
		<div class="inside">${children}</div>
	</div>`;
}

function Welcome({ onDismiss }) {
	const plan = usePlan();
	const ext = useExt();
	const proTour = TOURS.find((t) => t.id === 'pro');
	const seePro = () => {
		if (plan !== 'pro') setPlan('pro');
		if (proTour) startTour(proTour.id);
		else go('v3d.list');
	};
	const cards = [
		{
			icon: ICONS.cube,
			title: 'Create your first 3D viewer',
			text: 'Add a model, choose the controls, and copy the shortcode. It takes about a minute.',
			action: html`<a class="button button-primary" href="#v3d.edit.new">Add a 3D viewer</a>`,
		},
		{
			icon: ICONS.pro,
			title: 'See what Pro adds',
			text:
				plan === 'pro'
					? 'You are on 3D Viewer Pro: hotspots, presets, the Visual Editor and 3D Analytics are unlocked.'
					: 'Switch this demo to 3D Viewer Pro. Your viewers stay as they are, and the Pro controls unlock.',
			action: plan === 'pro' ? html`<a class="button" href="#v3d.analytics">Open 3D Analytics</a>` : html`<button type="button" class="button" onClick=${seePro}>Try Pro in this demo</button>`,
		},
		{
			icon: ICONS.cart,
			title: 'Sell configurable products',
			text: 'Let shoppers change colours, parts and materials on a 3D model with the 3D Product Configurator for WooCommerce.',
			action: html`<a class="button" href="#v3d.extensions">${ext === 'active' ? 'Manage extensions' : 'See the extension'}</a>`,
		},
		{
			icon: ICONS.store,
			title: 'Visit the demo store',
			text: 'See your viewers the way shoppers do, on a real-looking storefront.',
			action: html`<a class="button" href="#store.viewer">Visit the store</a>`,
		},
	];
	return html`<div id="welcome-panel" class="welcome-panel ld-dash-wp-welcome">
		<button type="button" class="welcome-panel-close" aria-label="Dismiss the welcome panel" onClick=${onDismiss}>Dismiss</button>
		<div class="welcome-panel-content">
			<div class="welcome-panel-header">
				<div class="welcome-panel-header-image" aria-hidden="true"></div>
				<h2>Welcome to the 3D Viewer live demo</h2>
				<p>A clickable copy of WordPress running 3D Viewer${plan === 'pro' ? ' Pro' : ''}. Everything stays in your browser, so try anything.</p>
			</div>
			<div class="welcome-panel-column-container">
				${cards.map(
					(c) => html`<div class="welcome-panel-column" key=${c.title}>
						<span class="welcome-panel-icon">${c.icon}</span>
						<div class="welcome-panel-column-content">
							<h3>${c.title}</h3>
							<p>${c.text}</p>
							${c.action}
						</div>
					</div>`
				)}
			</div>
		</div>
	</div>`;
}

const notInDemo = (what) => (e) => (e?.preventDefault?.(), toast(`${what} are not part of this demo.`));

export default function Dashboard() {
	const s = useStore();
	const [, bump] = useState(0);
	const refresh = () => bump((n) => n + 1);
	const products = Object.values(s.products || {}).filter((p) => p.status !== 'trash' && p.status !== 'auto-draft');
	const orders = Object.values(s.orders || {});
	const orderTotal = (o) => (typeof o.total === 'number' ? o.total : (o.items || []).reduce((t, i) => t + (Number(i.total) || 0), 0));
	const paid = orders.filter((o) => ['processing', 'completed'].includes(o.status));
	const net = paid.reduce((t, o) => t + orderTotal(o), 0);
	const sold = {};
	paid.forEach((o) => (o.items || []).forEach((i) => (sold[i.productId] = (sold[i.productId] || 0) + (i.qty || 1))));
	const topId = Object.keys(sold).sort((a, b) => sold[b] - sold[a])[0];
	const top = topId ? s.products?.[topId] : null;
	const processing = orders.filter((o) => o.status === 'processing').length;
	const onHold = orders.filter((o) => o.status === 'on-hold').length;
	const outOfStock = products.filter((p) => p.wc?.stockStatus === 'outofstock').length;
	const [draft, setDraft] = useState({ title: '', content: '' });

	const move = (col, i, dir) => {
		const cols = screen.cols.map((c) => c.slice());
		const [id] = cols[col].splice(i, 1);
		// postboxes.handleOrder: past the end of a column the box moves into the next one.
		if (dir < 0 && i === 0) cols[col - 1].push(id);
		else if (dir > 0 && i === screen.cols[col].length - 1) cols[col + 1].unshift(id);
		else cols[col].splice(i + dir, 0, id);
		screen.cols = cols;
		refresh();
		setTimeout(() => document.querySelector(`#${id} .${dir < 0 ? 'handle-order-higher' : 'handle-order-lower'}`)?.focus(), 0);
	};
	const saveDraft = (e) => {
		e.preventDefault();
		const title = draft.title.trim();
		const content = draft.content.trim();
		if (!title && !content) return;
		screen.drafts = [{ title, content, date: new Date() }, ...screen.drafts].slice(0, 5);
		setDraft({ title: '', content: '' });
		refresh();
	};

	const body = {
		dashboard_site_health: html`<div class="ld-dash-wp-health">
			<div class="ld-dash-wp-health__ring" aria-hidden="true"></div>
			<div>
				<p class="ld-dash-wp-health__label">Good</p>
				<p>Your site’s health is looking good, but there are still some things you can do to improve its performance and security.</p>
				<p>Take a look at the <strong>2 items</strong> on the <a href="#" onClick=${(e) => (e.preventDefault(), toast('Site Health is not part of this demo.'))}>Site Health screen</a>.</p>
			</div>
		</div>`,
		dashboard_right_now: html`<div class="main">
			<ul class="ld-dash-wp-glance">
				<li class="post-count"><a href="#" onClick=${notInDemo('Posts')}>1 Post</a></li>
				<li class="page-count"><a href="#" onClick=${notInDemo('Pages')}>6 Pages</a></li>
				<li class="comment-count"><a href="#" onClick=${notInDemo('Comments')}>1 Comment</a></li>
			</ul>
			<p id="wp-version-message">WordPress 6.9 running <a href="#" onClick=${notInDemo('Themes')}>Storefront</a> theme.</p>
		</div>`,
		dashboard_activity: html`<div id="activity-widget">
			<div id="published-posts" class="activity-block">
				<h3>Recently Published</h3>
				<ul class="ld-dash-wp-activity">
					<li><span>${activityDate('2026-09-28 09:12')}</span> <a href="#" aria-label="Edit “Hello world!”" onClick=${notInDemo('Posts')}>Hello world!</a></li>
				</ul>
			</div>
			<div id="latest-comments" class="activity-block">
				<h3>Recent Comments</h3>
				<ul class="ld-dash-wp-comments">
					<li class="comment">
						<span class="ld-dash-wp-avatar" aria-hidden="true"></span>
						<div class="dashboard-comment-wrap">
							<p class="comment-meta">From <a href="https://wordpress.org/" target="_blank" rel="noopener">A WordPress Commenter</a> on <a href="#" onClick=${notInDemo('Posts')}>Hello world!</a></p>
							<blockquote><p>Hi, this is a comment. To get started with moderating, editing, and deleting comments, please visit the Comments screen in…</p></blockquote>
							<p class="row-actions">
								${['Unapprove', 'Reply', 'Edit', 'Spam', 'Trash', 'View'].map((a, i) => html`<span key=${a}>${i ? ' | ' : ''}<a href="#" onClick=${notInDemo('Comments')}>${a}</a></span>`)}
							</p>
						</div>
					</li>
				</ul>
				<h3 class="screen-reader-text">View more comments</h3>
				<ul class="subsubsub ld-dash-wp-commentviews">
					${[['All', 1], ['Mine', 0], ['Pending', 0], ['Approved', 1], ['Spam', 0], ['Trash', 0]].map(([l, n], i, a) => html`<li key=${l}><a href="#" onClick=${notInDemo('Comments')}>${l} <span class="count">(${n})</span></a>${i < a.length - 1 ? ' |' : ''}</li>`)}
				</ul>
			</div>
		</div>`,
		dashboard_quick_press: html`<form class="ld-dash-wp-draft initial-form" onSubmit=${saveDraft}>
				<div class="input-text-wrap">
					<label for="title">Title</label>
					<input type="text" id="title" autocomplete="off" value=${draft.title} onInput=${(e) => setDraft({ ...draft, title: e.currentTarget.value })} />
				</div>
				<div class="textarea-wrap">
					<label for="content">Content</label>
					<textarea id="content" placeholder="What’s on your mind?" rows="3" value=${draft.content} onInput=${(e) => setDraft({ ...draft, content: e.currentTarget.value })}></textarea>
				</div>
				<p class="submit"><input type="submit" class="button button-primary" value="Save Draft" /></p>
			</form>
			${screen.drafts.length > 0 &&
			html`<div class="drafts ld-dash-wp-drafts">
				<p class="view-all"><a href="#" onClick=${notInDemo('Posts')}>View all drafts</a></p>
				<h2 class="hide-if-no-js">Your Recent Drafts</h2>
				<ul>
					${screen.drafts.map(
						(d, i) => html`<li key=${i}>
							<div class="draft-title"><a href="#" onClick=${notInDemo('Posts')}>${d.title || '(no title)'}</a><time>${longDay(d.date)}</time></div>
							${d.content && html`<p>${d.content.split(/\s+/).slice(0, 10).join(' ')}${d.content.split(/\s+/).length > 10 ? '…' : ''}</p>`}
						</li>`
					)}
				</ul>
			</div>`}`,
		woocommerce_dashboard_recent_reviews: html`<p>There are no product reviews yet.</p>`,
		woocommerce_dashboard_status: html`<ul class="wc_status_list ld-dash-wp-wc">
			<li class="sales-this-month"><a href="#admin.orders"><strong>${'$' + net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> net sales this month</a></li>
			${top && html`<li class="best-seller-this-month"><a href=${'#admin.product.' + top.id}><strong>${top.name}</strong> top seller this month (sold ${sold[topId]})</a></li>`}
			<li class="processing-orders"><a href="#admin.orders"><strong>${processing} ${processing === 1 ? 'order' : 'orders'}</strong> awaiting processing</a></li>
			<li class="on-hold-orders"><a href="#admin.orders"><strong>${onHold} ${onHold === 1 ? 'order' : 'orders'}</strong> on-hold</a></li>
			<li class="low-in-stock"><a href="#admin.products"><strong>0 products</strong> low in stock</a></li>
			<li class="out-of-stock"><a href="#admin.products"><strong>${outOfStock} ${outOfStock === 1 ? 'product' : 'products'}</strong> out of stock</a></li>
		</ul>`,
	};

	const visible = (col) => screen.cols[col].filter((id) => !screen.hidden[id]);
	return html`<${WpAdmin} current="dashboard-home" title="Dashboard">
		<${ScreenMeta}
			hidden=${screen.hidden}
			onHide=${(id, hide) => ((screen.hidden = { ...screen.hidden, [id]: hide }), refresh())}
			welcome=${screen.welcome}
			onWelcome=${(on) => ((screen.welcome = on), refresh())}
		/>
		<div class="wrap ld-dash-wp">
			<h1>Dashboard</h1>
			${screen.welcome && html`<${Welcome} onDismiss=${() => ((screen.welcome = false), refresh())} />`}

			<div id="dashboard-widgets-wrap">
				<div id="dashboard-widgets" class="metabox-holder ld-dash-wp-cols">
					${screen.cols.map(
						(ids, col) => html`<div class="postbox-container" key=${col}>
							<div class=${cx('meta-box-sortables', !visible(col).length && 'empty-container')} data-emptystring="Drag boxes here">
								${ids.map(
									(id, i) =>
										!screen.hidden[id] &&
										html`<${Postbox}
											key=${id}
											id=${id}
											closed=${!!screen.closed[id]}
											first=${col === 0 && i === 0}
											last=${col === screen.cols.length - 1 && i === ids.length - 1}
											onToggle=${() => ((screen.closed = { ...screen.closed, [id]: !screen.closed[id] }), refresh())}
											onMove=${(dir) => move(col, i, dir)}
										>${body[id]}<//>`
								)}
							</div>
						</div>`
					)}
				</div>
			</div>
		</div>
	<//>`;
}
