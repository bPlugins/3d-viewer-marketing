// option-pricing: the live Product / Options / Total box, shared by the add-to-cart form and the customizer modal.
import { html, money } from '../../core/ui.js';
import { useStore } from '../../core/store.js';
import { viewerSettingsFor, effectiveFor } from '../../shared/product-3d.js';
import { useFeature } from '../../core/features.js';
import { quoteFor, formatDelta, hasOptionRules } from '../../shared/options.js';
import { ProtoHint } from './cart.js';

/** true when the product (or any variation) has option price rules the summary shows. */
export function hasPricedOptions(state, product, groups) {
	const flags = { pricing: true, groups };
	const vids = product.type === 'variable' ? product.variations : [];
	// With groups only group choice prices count; the plain-list rules apply without them.
	return [0, ...vids].some((vid) => hasOptionRules(effectiveFor(state, product.id, vid, { background: false }), flags));
}

/** option-pricing: live Product / Options / Total box (a preview; the cart recomputes the price). */
export function PriceSummary({ product, variation, custom, hint = true }) {
	const state = useStore();
	const flags = { pricing: true, groups: useFeature('option-groups') };
	const vs = viewerSettingsFor(state, product.id);
	if (!vs.available || !vs.customizerEnabled) return null;
	if (!hasPricedOptions(state, product, flags.groups)) return null;
	const note = hint && html`<${ProtoHint} class="proto-cart-hint--dev">The total is a preview. The form posts only the choices; the server recomputes the price from the saved rules.<//>`;
	if (product.type === 'variable' && !variation) {
		return html`<div class="wc3d-price-summary is-empty"><p class="wc3d-price-summary__empty">Choose an option to see the total.</p></div>${note}`;
	}
	const q = quoteFor(state, product.id, variation?.id || 0, custom, flags);
	return html`
		<div class="wc3d-price-summary" aria-live="polite">
			<div class="wc3d-price-summary__row"><span>Product</span><span class="woocommerce-Price-amount amount">${money(q.base)}</span></div>
			<div class="wc3d-price-summary__row"><span>Options</span><span class="woocommerce-Price-amount amount">${formatDelta(q.options) || money(0)}</span></div>
			<div class="wc3d-price-summary__row wc3d-price-summary__total"><span>Total</span><strong class="woocommerce-Price-amount amount">${money(q.total)}</strong></div>
		</div>
		${note}
	`;
}
