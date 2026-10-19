// My Account (#store.account[.orders|.saved-designs]): a minimal WooCommerce account page for the demo
// theme (myaccount/navigation.php, dashboard.php, orders.php, form-login.php) plus the saved-designs endpoint.
import { html, useState, useEffect, useRef, cx, money } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { go } from '../../core/router.js';
import { useFeature } from '../../core/features.js';
import { currentCustomer, shareSettings, designsOf, storeLink, longDate, lookupDesign, productToken, renameDesign, deleteDesigns } from '../../shared/saved-designs.js';
import { StoreTheme, addToCart, captureLine, clearNotices, pushNotice, addedToCartNotice, choiceErrors, lineName } from './theme.js';
import { ProtoHint } from './cart.js';
import { DesignThumb, designRows, designPrice, Rows, CopyButton } from './saved-designs.js';

const STATUS = { pending: 'Pending payment', processing: 'Processing', 'on-hold': 'On hold', completed: 'Completed', cancelled: 'Cancelled', refunded: 'Refunded', failed: 'Failed' };

function LoginForm() {
	const state = useStore();
	const [user, setUser] = useState('nadia@example.com');
	const [error, setError] = useState('');
	const submit = (e) => {
		e.preventDefault();
		const u = user.trim().toLowerCase();
		const c = Object.values(state.customers || {}).find((x) => x.email.toLowerCase() === u || x.email.split('@')[0] === u);
		if (!c) {
			setError('Unknown email address. Check again or try your username.');
			return;
		}
		store.patch('demo.customerId', c.id);
	};
	return html`
		${error && html`<div class="woocommerce-notices-wrapper"><div class="st-notice woocommerce-error" role="alert"><span>${error}</span></div></div>`}
		<h2>Login</h2>
		<form class="woocommerce-form woocommerce-form-login login wc3d-account-login" onSubmit=${submit}>
			<p class="woocommerce-form-row form-row">
				<label for="username">Username or email address <span class="required" aria-hidden="true">*</span></label>
				<input type="text" class="woocommerce-Input input-text" name="username" id="username" autocomplete="username" value=${user} onInput=${(e) => setUser(e.currentTarget.value)} required />
			</p>
			<p class="woocommerce-form-row form-row">
				<label for="password">Password <span class="required" aria-hidden="true">*</span></label>
				<input class="woocommerce-Input input-text" type="password" name="password" id="password" autocomplete="current-password" value="demo-password" readonly />
			</p>
			<p class="form-row">
				<label class="woocommerce-form__label woocommerce-form-login__rememberme"><input class="woocommerce-form__input-checkbox" name="rememberme" type="checkbox" /> <span>Remember me</span></label>
				<button type="submit" class="woocommerce-button button woocommerce-form-login__submit" name="login" value="Log in">Log in</button>
			</p>
		</form>
		<${ProtoHint}>Demo login: nadia@example.com or tomas@example.com, any password.<//>
	`;
}

function Dashboard({ customer }) {
	return html`<p>Hello <strong>${customer.name}</strong> (not <strong>${customer.name}</strong>? <a href="#store.account.customer-logout">Log out</a>)</p>
		<p>From your account dashboard you can view your <a href="#store.account.orders">recent orders</a>, manage your shipping and billing addresses, and edit your password and account details.</p>`;
}

function Orders({ customer }) {
	const state = useStore();
	const list = Object.values(state.orders || {})
		.filter((o) => o.status !== 'trash' && o.customer?.email?.toLowerCase() === customer.email.toLowerCase())
		.sort((a, b) => String(b.date).localeCompare(String(a.date)));
	if (!list.length) {
		return html`<div class="woocommerce-info st-notice">
			<a class="woocommerce-Button button wc-forward" href="#store.shop">Browse products</a><span>No order has been made yet.</span>
		</div>`;
	}
	return html`<table class="woocommerce-orders-table woocommerce-MyAccount-orders shop_table shop_table_responsive my_account_orders account-orders-table wc3d-account-table">
		<thead>
			<tr>
				<th scope="col">Order</th>
				<th scope="col">Date</th>
				<th scope="col">Status</th>
				<th scope="col">Total</th>
				<th scope="col"><span class="screen-reader-text">Actions</span></th>
			</tr>
		</thead>
		<tbody>
			${list.map((o) => {
				const items = o.items || [];
				const total = items.reduce((n, it) => n + Number(it.total || 0), 0);
				const count = items.reduce((n, it) => n + (Number(it.qty) || 0), 0);
				return html`<tr key=${o.id} class=${'woocommerce-orders-table__row order status-' + o.status}>
					<th scope="row" data-title="Order"><a href=${'#store.order.' + o.id}>#${o.id}</a></th>
					<td data-title="Date"><time datetime=${String(o.date).replace(' ', 'T')}>${longDate(o.date)}</time></td>
					<td data-title="Status">${STATUS[o.status] || o.status}</td>
					<td data-title="Total"><span><span class="woocommerce-Price-amount amount">${money(total)}</span> for ${count} ${count === 1 ? 'item' : 'items'}</span></td>
					<td data-title="Actions"><a href=${'#store.order.' + o.id} class="woocommerce-button button view">View</a></td>
				</tr>`;
			})}
		</tbody>
	</table>`;
}

// ── Saved designs ──────────────────────────────────────────────────────────

function DesignCard({ design: d }) {
	const state = useStore();
	const p = state.products?.[d.productId];
	const r = lookupDesign(state, d.code);
	const ok = r.status === 'ok';
	const [mode, setMode] = useState(''); // '' | 'rename' | 'delete'
	const [name, setName] = useState(d.name || p?.name || '');
	const inputRef = useRef(null);
	const title = d.name || p?.name || 'Design';
	useEffect(() => {
		if (mode === 'rename') inputRef.current?.select();
	}, [mode]);

	const rename = (e) => {
		e.preventDefault();
		renameDesign(d.code, name.trim() || p?.name || '');
		setMode('');
	};
	const remove = (e) => {
		// Focus goes to the next card (or the empty state) instead of falling back to the page.
		const li = e.currentTarget.closest('li');
		const next = li?.nextElementSibling || li?.previousElementSibling;
		deleteDesigns([d.code]);
		clearNotices();
		pushNotice({ type: 'success', text: 'Design deleted.' });
		setTimeout(() => (next?.querySelector('a.button') || next?.querySelector('button') || document.querySelector('.woocommerce-MyAccount-content a'))?.focus(), 0);
	};
	const add = () => {
		const vid = r.variation?.id || 0;
		// A required group still empty (or no variation): WooCommerce sends the shopper to the product page.
		const errors = p.type === 'variable' && !vid ? ['Please choose product options by visiting “' + p.name + '”.'] : choiceErrors(state, p.id, vid, d.custom);
		if (errors.length) {
			go(productToken(state, d));
			errors.forEach((text) => pushNotice({ type: 'error', text }));
			return;
		}
		const key = addToCart({ productId: p.id, variationId: vid, qty: 1, custom: d.custom });
		if (!key) return;
		captureLine(key);
		clearNotices();
		addedToCartNotice(store.get(), p.id, 1);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	return html`<li class=${cx('wc3d-design-card', !ok && 'is-unavailable')}>
		<a class="wc3d-design-card__thumb" href=${ok ? '#' + productToken(state, d) : undefined} tabindex="-1" aria-hidden="true"><${DesignThumb} design=${d} size=${104} /></a>
		<div class="wc3d-design-card__main">
			${mode === 'rename'
				? html`<form class="wc3d-design-card__rename" onSubmit=${rename}>
						<label class="screen-reader-text" for=${'wc3d-rename-' + d.code}>Design name</label>
						<input ref=${inputRef} id=${'wc3d-rename-' + d.code} type="text" class="input-text" value=${name} maxlength="80" onInput=${(e) => setName(e.currentTarget.value)} onKeyDown=${(e) => e.key === 'Escape' && setMode('')} />
						<button type="submit" class="button">Save</button>
						<button type="button" class="wc3d-link-btn" onClick=${() => setMode('')}>Cancel</button>
					</form>`
				: html`<h3 class="wc3d-design-card__name">${title} ${ok && html`<button type="button" class="wc3d-link-btn" onClick=${() => setMode('rename')} aria-label=${'Rename ' + title}>Rename</button>`}</h3>`}
			${p ? html`<p class="wc3d-design-card__product">${ok ? html`<a href=${'#' + productToken(state, d)}>${lineName(state, d)}</a>` : lineName(state, d)}</p>` : null}
			${ok ? html`<${Rows} rows=${designRows(state, d)} amounts />` : html`<p class="wc3d-design-card__gone">This product is no longer available.</p>`}
			<p class="wc3d-design-card__meta">Saved ${longDate(d.created)} · Code ${d.code}</p>
		</div>
		<div class="wc3d-design-card__side">
			${ok && html`<span class="wc3d-design-card__price woocommerce-Price-amount amount">${money(designPrice(state, d))}</span>`}
			${mode === 'delete'
				? html`<div class="wc3d-design-card__confirm" role="group" aria-label="Confirm delete">
						<p>Delete this design? Its link stops working.</p>
						<button type="button" class="button wc3d-button-danger" onClick=${remove}>Delete</button>
						<button type="button" class="wc3d-link-btn" onClick=${() => setMode('')}>Cancel</button>
					</div>`
				: html`<div class="wc3d-design-card__actions">
						${ok &&
						html`<a class="button" href=${'#' + productToken(state, d)}>Open</a>
							<button type="button" class="button alt" onClick=${add}>Add to cart</button>
							<${CopyButton} text=${storeLink(d.code)} class="wc3d-link-btn" />`}
						<button type="button" class="wc3d-link-btn wc3d-link-btn--danger" onClick=${() => setMode('delete')}>Delete</button>
					</div>`}
		</div>
	</li>`;
}

function SavedDesigns({ customer }) {
	const state = useStore();
	const list = designsOf(state)
		.filter((d) => Number(d.customerId) === customer.id)
		.sort((a, b) => String(b.created).localeCompare(String(a.created)) || b.seq - a.seq);
	if (!list.length) {
		return html`<div class="woocommerce-info st-notice">
			<a class="woocommerce-Button button wc-forward" href="#store.shop">Browse products</a><span>No saved designs yet. Customize a product, choose Share design, then Save to my account.</span>
		</div>`;
	}
	return html`<ul class="wc3d-design-list">${list.map((d) => html`<${DesignCard} key=${d.code} design=${d} />`)}</ul>`;
}

export default function Account({ params = [] }) {
	const state = useStore();
	const on = useFeature('saved-designs');
	const customer = currentCustomer(state);
	const designs = on && shareSettings(state).account;
	let endpoint = params[0] || 'dashboard';

	useEffect(() => {
		if (endpoint !== 'customer-logout') return;
		store.patch('demo.customerId', 0);
		location.replace('#store.account');
	}, [endpoint]);

	if (endpoint === 'saved-designs' && !designs) endpoint = 'dashboard';
	const nav = [['dashboard', 'Dashboard'], ['orders', 'Orders'], designs && ['saved-designs', 'Saved designs'], ['customer-logout', 'Log out']].filter(Boolean);
	const title = { orders: 'Orders', 'saved-designs': 'Saved designs' }[endpoint];
	const crumbs = [['Home', '#store.shop'], ['My account', title ? '#store.account' : undefined], title && [title]].filter(Boolean);

	return html`<${StoreTheme} crumbs=${crumbs}>
		<article class="page type-page wc3d-account">
			<h1 class="entry-title">${title || 'My account'}</h1>
			<div class="woocommerce">
				${!customer
					? html`<${LoginForm} />`
					: html`<div class="wc3d-account__grid">
							<nav class="woocommerce-MyAccount-navigation" aria-label="Account pages">
								<ul>
									${nav.map(
										([k, label]) => html`<li key=${k} class=${cx('woocommerce-MyAccount-navigation-link', 'woocommerce-MyAccount-navigation-link--' + k, k === endpoint && 'is-active')}>
											<a href=${k === 'dashboard' ? '#store.account' : '#store.account.' + k} aria-current=${k === endpoint ? 'page' : undefined}>${label}</a>
										</li>`
									)}
								</ul>
							</nav>
							<div class="woocommerce-MyAccount-content">
								${endpoint === 'orders' ? html`<${Orders} customer=${customer} />` : endpoint === 'saved-designs' ? html`<${SavedDesigns} customer=${customer} />` : html`<${Dashboard} customer=${customer} />`}
							</div>
						</div>`}
			</div>
		</article>
	<//>`;
}
