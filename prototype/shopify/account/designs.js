// Customer account · "Saved designs" full-page extension (customer-account.page.render).
import { html, useState } from '../../js/core/ui.js';
import { store, useStore } from '../core/store.js';
import { money, addToCart, priceSummary } from '../core/commerce.js';
import { DesignImage } from '../ui/viewer.js';
import { Icon } from '../ui/icons.js';
import { SurfaceTag, toast } from '../ui/polaris.js';
import { copyText, variantTitle } from '../store/theme.js';
import { shareUrl, expiryText, isExpired } from '../store/modals.js';
import { AccountFrame } from './chrome.js';

function DesignCard({ s, d }) {
	const [renaming, setRenaming] = useState(false);
	const [name, setName] = useState(d.name || '');
	const [confirm, setConfirm] = useState(false);
	const p = s.products[d.productId];
	const vt = variantTitle(s, d.variantId);
	const sum = priceSummary(s, d.productId, d.variantId, d.choices);
	const expired = isExpired(d);
	const save = () => {
		store.patch(['designs', d.code, 'name'], name.trim());
		setRenaming(false);
		toast('Design renamed');
	};
	const copy = async () => {
		const ok = await copyText('https://' + shareUrl(s, d.code));
		toast(ok ? 'Link copied' : `Copy failed. The link is ${shareUrl(s, d.code)}`, { error: !ok });
	};
	const add = () => {
		addToCart({ productId: d.productId, variantId: d.variantId, qty: 1, choices: d.choices });
		toast(`Added to cart: ${p?.title}`);
	};
	const del = () => {
		store.set((st) => {
			const designs = { ...st.designs };
			delete designs[d.code];
			return { ...st, designs };
		});
		toast('Design deleted');
	};
	return html`<li class="sf-dcard">
		<div class="sf-dcard__img"><${DesignImage} design=${d} fluid />${expired ? html`<span class="sf-dcard__expired">Expired</span>` : null}</div>
		<div class="sf-dcard__body">
			${renaming
				? html`<form class="sf-dcard__rename" onSubmit=${(e) => (e.preventDefault(), save())}>
						<label class="sf-visually-hidden" for=${'rn-' + d.code}>Design name</label>
						<input id=${'rn-' + d.code} class="sf-input" value=${name} maxlength="60" placeholder=${p?.title} onInput=${(e) => setName(e.target.value)} />
						<button type="submit" class="sf-btn sf-btn--primary sf-btn--sm">Save</button>
						<button type="button" class="sf-btn sf-btn--ghost sf-btn--sm" onClick=${() => (setName(d.name || ''), setRenaming(false))}>Cancel</button>
					</form>`
				: html`<h2 class="sf-dcard__name">${d.name || p?.title}</h2>`}
			<p class="sf-small sf-muted">${p?.title}${vt ? ` · ${vt}` : ''} · ${money(sum.total)}</p>
			<p class="sf-small sf-muted">Saved ${d.createdAt.slice(0, 10)} · ${expiryText(d)} · ${d.views} ${d.views === 1 ? 'view' : 'views'}</p>
			${confirm
				? html`<div class="sf-dcard__confirm" role="alert">
						<p>Delete this design? The share link stops working.</p>
						<div><button type="button" class="sf-btn sf-btn--danger sf-btn--sm" onClick=${del}>Delete</button><button type="button" class="sf-btn sf-btn--ghost sf-btn--sm" onClick=${() => setConfirm(false)}>Keep it</button></div>
					</div>`
				: html`<div class="sf-dcard__actions">
						<a class="sf-btn sf-btn--secondary sf-btn--sm" href=${'#store.design.' + d.code}>Open</a>
						<button type="button" class="sf-btn sf-btn--primary sf-btn--sm" onClick=${add} disabled=${!p || p.status !== 'active'}>Add to cart</button>
						<div class="sf-dcard__more">
							<button type="button" class="sf-iconbtn" title="Rename" aria-label="Rename" onClick=${() => setRenaming(true)}><${Icon} name="edit" size=${17} /></button>
							<button type="button" class="sf-iconbtn" title="Copy link" aria-label="Copy link" onClick=${copy}><${Icon} name="link" size=${17} /></button>
							<button type="button" class="sf-iconbtn" title="Delete" aria-label="Delete" onClick=${() => setConfirm(true)}><${Icon} name="trash" size=${17} /></button>
						</div>
					</div>`}
		</div>
	</li>`;
}

export default function Designs() {
	const s = useStore();
	const list = Object.values(s.designs)
		.filter((d) => d.kind === 'saved' && d.customerId === s.demo.customerId)
		.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
	return html`<${AccountFrame} current="designs">
		<div class="sf-acct__page">
			<div class="sf-acct__ext-tag"><${SurfaceTag}>customer-account.page.render<//><span class="sf-small sf-muted">3D Configurator app</span></div>
			<h1 class="sf-acct__title">Saved designs</h1>
			<p class="sf-muted sf-acct__lede">Designs you saved with "Save & share design". Open one to keep editing, or add it straight to your cart.</p>
			${list.length
				? html`<ul class="sf-dgrid">${list.map((d) => html`<${DesignCard} key=${d.code} s=${s} d=${d} />`)}</ul>`
				: html`<div class="sf-empty">
						<${Icon} name="heart" size=${36} />
						<h2 class="sf-h3">No saved designs yet</h2>
						<p class="sf-muted">Customize a product and press "Save & share design" to keep it here.</p>
						<a class="sf-btn sf-btn--primary" href="#store.product.lounge-chair">Design a lounge chair</a>
					</div>`}
		</div>
	<//>`;
}
