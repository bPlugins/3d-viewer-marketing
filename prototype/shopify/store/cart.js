// Cart page: lines as the theme renders the Cart Transform result (lineExpand on Basic, lineUpdate on Plus).
import { html } from '../../js/core/ui.js';
import { useStore } from '../core/store.js';
import { money, moneyDelta, cartTotals } from '../core/commerce.js';
import { Icon } from '../ui/icons.js';
import { StoreTheme, ProtoNote, CartLine, setLineQty, removeLine, FREE_DELIVERY } from './theme.js';

function TransformNote({ s, lines }) {
	const plus = s.shop.plan === 'plus';
	const customized = lines.filter((x) => x.t.mode);
	if (!customized.length) {
		return html`<${ProtoNote} tag="Cart Transform Function">Plain lines pass through the Function unchanged. Add a customized product with priced options to see what it does.<//>`;
	}
	const ex = customized[0];
	return html`<${ProtoNote} tag=${plus ? 'Cart Transform Function · lineUpdate (Plus)' : 'Cart Transform Function · lineExpand'} title=${plus ? 'One clean line with a new price, title and image' : 'Base variant plus a hidden "3D customization" component'}>
		<p>The browser only sent the shopper's choices as line properties (<code>_3d_design</code>, <code>_3d_hash</code> and readable rows). The Function read them with the product's pricing metafield and <strong>recomputed the add-on on the server</strong>: ${ex.t.sum.lines.map((l) => `${l.label} ${moneyDelta(l.amount)}`).join(', ')}. A price is never trusted from the browser.</p>
		<p>${plus
			? html`On Plus it returns <code>lineUpdate</code>: the line is renamed "${ex.t.title}", priced ${money(ex.t.unit)} and shows the design snapshot, also in checkout.`
			: html`On Basic and Advanced it returns <code>lineExpand</code>: the line becomes a bundle of the variant at ${money(ex.t.sum.base)} and an app-managed "3D customization" component at ${money(ex.t.sum.addons)}, priced with <code>fixedPricePerUnit</code>. Switch the prototype bar to Plus to compare.`}</p>
	<//>`;
}

export default function Cart() {
	const s = useStore();
	const { lines, subtotal, count } = cartTotals(s);
	return html`<${StoreTheme}>
		<div class="sf-wrap sf-cartpage">
			<h1 class="sf-h1">Your cart</h1>
			${lines.length
				? html`<div class="sf-cartpage__grid">
						<div>
							<div class="sf-cartpage__cols sf-small sf-muted" aria-hidden="true"><span>Product</span><span>Total</span></div>
							<ul class="sf-lines sf-lines--page">${lines.map(({ line }) => html`<${CartLine} key=${line.id} line=${line} s=${s} editable imgSize=${104} onQty=${(n) => setLineQty(line.id, n)} onRemove=${() => removeLine(line.id)} />`)}</ul>
							<${TransformNote} s=${s} lines=${lines} />
						</div>
						<aside class="sf-cartpage__sum">
							<div class="sf-sumrow"><span>${count} ${count === 1 ? 'item' : 'items'}</span><span>${money(subtotal)}</span></div>
							<div class="sf-sumrow sf-sumrow--total"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
							<p class="sf-small sf-muted">Taxes and shipping calculated at checkout.${subtotal >= FREE_DELIVERY ? ' Your order ships free.' : ''}</p>
							<a class="sf-btn sf-btn--primary sf-btn--full" href="#store.checkout"><${Icon} name="lock" size=${16} /> Check out</a>
							<a class="sf-link sf-small" href="#store.home">Continue shopping</a>
						</aside>
					</div>`
				: html`<div class="sf-empty">
						<${Icon} name="bag" size=${40} />
						<h2 class="sf-h3">Your cart is empty</h2>
						<p class="sf-muted">Have a look around. Every piece with a 3D badge can be customized.</p>
						<a class="sf-btn sf-btn--primary" href="#store.home">Continue shopping</a>
					</div>`}
		</div>
	<//>`;
}
