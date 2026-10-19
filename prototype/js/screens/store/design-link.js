// saved-designs: the short link (#store.design.<code> = https://store/?wc3d_design=<code>).
// Like the plugin's template_redirect: on to the product page with the code, or the shop with a notice.
import { html, useEffect } from '../../core/ui.js';
import { store } from '../../core/store.js';
import { isOn } from '../../core/features.js';
import { lookupDesign, productToken } from '../../shared/saved-designs.js';
import { StoreTheme, pushNotice } from './theme.js';

export default function DesignLink({ params = [] }) {
	useEffect(() => {
		// The host renders the previous screen once under the next token; act only on a design link.
		if (!location.hash.startsWith('#store.design.')) return;
		const state = store.get();
		const r = isOn('saved-designs') ? lookupDesign(state, params[0]) : null;
		if (r?.status === 'ok') return void location.replace('#' + productToken(state, r.record));
		location.replace('#store.shop');
		if (r) pushNotice({ type: 'info', text: r.status === 'gone' ? 'This design is no longer available.' : 'This design link has expired or does not exist.' });
	}, []);
	return html`<${StoreTheme}><p class="wc3d-design-redirect">Opening design…</p><//>`;
}
