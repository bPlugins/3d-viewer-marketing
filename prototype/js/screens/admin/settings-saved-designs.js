// saved-designs: rows inside its Settings → Features card (share links, My Account, link lifetime, counts).
import { html } from '../../core/ui.js';
import { useStore } from '../../core/store.js';
import { WcToggle } from '../../shared/admin-ui.js';
import { SHARE_DEFAULTS, LIFETIMES, designsOf, isExpired } from '../../shared/saved-designs.js';

const PREFIX = 'wc3d_modules[settings][saved-designs]';
const val = (draft, k) => (draft[k] === undefined ? SHARE_DEFAULTS[k] : draft[k]);

function Toggle({ k, title, desc, draft, set }) {
	const id = 'wc3d_module_saved-designs_' + k;
	return html`<div class="wc3d-row">
		<div class="wc3d-row__main">
			<label class="wc3d-row__title" for=${id} id=${id + '-title'}>${title}</label>
			<p class="wc3d-row__desc" id=${id + '-desc'}>${desc}</p>
		</div>
		<div class="wc3d-row__control">
			<${WcToggle} id=${id} name=${`${PREFIX}[${k}]`} labelledBy=${id + '-title'} describedBy=${id + '-desc'} checked=${!!val(draft, k)} onChange=${(v) => set(k, v)} />
		</div>
	</div>`;
}

export function ShareLinksRows({ draft, set }) {
	const state = useStore();
	const all = designsOf(state);
	const accounts = all.filter((d) => d.customerId).length;
	const links = all.filter((d) => !d.customerId && !isExpired(d, state)).length;
	const id = 'wc3d_module_saved-designs_share_link_lifetime';
	return html`
		<${Toggle}
			k="share_links"
			title="Share links"
			desc="Show a Share design button in the customer drawer and under Add to cart. The link opens the product with the customer's choices."
			draft=${draft}
			set=${set}
		/>
		<${Toggle} k="share_links_account" title="Saved designs in My Account" desc="Logged-in customers can save designs and find them under My Account → Saved designs." draft=${draft} set=${set} />
		<div class="wc3d-row">
			<div class="wc3d-row__main">
				<label class="wc3d-row__title" for=${id}>Link lifetime</label>
				<p class="wc3d-row__desc" id=${id + '-desc'}>Shared links stop working after this time. Designs saved to an account do not expire.</p>
			</div>
			<div class="wc3d-row__control">
				<select
					id=${id}
					class="wc3d-select"
					name=${PREFIX + '[share_link_lifetime]'}
					aria-describedby=${id + '-desc'}
					value=${String(val(draft, 'share_link_lifetime'))}
					onChange=${(e) => set('share_link_lifetime', Number(e.currentTarget.value))}
				>
					${LIFETIMES.map(([d, label]) => html`<option key=${d} value=${String(d)}>${label}</option>`)}
				</select>
			</div>
		</div>
		<div class="wc3d-row">
			<div class="wc3d-row__main">
				<span class="wc3d-row__title">Saved designs</span>
				<p class="wc3d-row__desc">${links} shared ${links === 1 ? 'link' : 'links'}, ${accounts} saved in customer accounts.</p>
			</div>
			<div class="wc3d-row__control"><a class="wc3d-btn wc3d-btn-ghost" href="#admin.designs">View saved designs</a></div>
		</div>
	`;
}
