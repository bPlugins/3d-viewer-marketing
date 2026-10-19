// Share link (#store.design.<code>): the app proxy page at /apps/3d/d/:code counts the view and
// redirects to the product page, which restores the design.
import { html, useEffect } from '../../js/core/ui.js';
import { store, useStore } from '../core/store.js';
import { Icon } from '../ui/icons.js';
import { StoreTheme, ProtoNote } from './theme.js';
import { setPendingDesign } from './product.js';
import { isExpired } from './modals.js';

export default function Design({ params }) {
	const s = useStore();
	const code = String(params[0] || '').toUpperCase();
	const d = s.designs[code];
	const p = d ? s.products[d.productId] : null;
	const ok = d && p && p.status === 'active' && !isExpired(d);

	useEffect(() => {
		if (!ok) return;
		store.patch(['designs', code, 'views'], (v) => (v || 0) + 1);
		const t = setTimeout(() => {
			setPendingDesign(code);
			const target = '#store.product.' + p.handle;
			try {
				location.replace(target);
			} catch {
				location.hash = target;
			}
		}, 1100);
		return () => clearTimeout(t);
	}, [code]);

	if (!ok) {
		return html`<${StoreTheme}>
			<div class="sf-wrap sf-notfound">
				<span class="sf-notfound__icon"><${Icon} name="link" size=${28} /></span>
				<h1 class="sf-h1">${d && isExpired(d) ? 'This design link has expired' : "We couldn't find that design"}</h1>
				<p class="sf-muted">${d && isExpired(d) ? 'Shared designs are kept for a limited time. Ask the person who sent it for a new link, or start your own.' : 'The link may be mistyped, or the design was deleted.'}</p>
				<a class="sf-btn sf-btn--primary" href="#store.home">Browse the shop</a>
				<${ProtoNote} tag="App proxy · /apps/3d/d/:code">Unknown or expired codes get a friendly page from the app proxy with a 404 status, so search engines drop them.<//>
			</div>
		<//>`;
	}
	return html`<${StoreTheme}>
		<div class="sf-wrap sf-opening" role="status">
			<span class="x-pimg__spin sf-opening__spin"></span>
			<h1 class="sf-h2">Opening your design…</h1>
			<p class="sf-muted">${d.name || p.title} · ${code}</p>
			<${ProtoNote} tag="App proxy · /apps/3d/d/:code">The proxy page counts the view (now ${d.views}) and redirects to <code>/products/${p.handle}?variant=${d.variantId}&3d_design=${code}</code>. Restored pages are marked <code>noindex</code>.<//>
		</div>
	<//>`;
}
