// Storefront dialogs shared by several screens: Save & share, AR, and "View in 3D" (quick view / order designs).
import { html } from '../../js/core/ui.js';
import { useStore } from '../core/store.js';
import { effectiveFor, shopperLayer, modelFor } from '../core/commerce.js';
import { StoreViewer } from '../ui/viewer.js';
import { Icon } from '../ui/icons.js';
import { SfModal, CopyField, QrCode, ProtoNote, variantTitle } from './theme.js';
import { isCustomized } from './customizer.js';

export const shareUrl = (s, code) => `${s.shop.domain}/apps/3d/d/${code}`;

export function expiryText(d) {
	if (!d?.expiresAt) return 'Never expires';
	if (d.expiresAt.startsWith('+')) return `Expires in ${d.expiresAt.slice(1)}`;
	return `Expires ${d.expiresAt}`;
}

export function isExpired(d) {
	return !!d?.expiresAt && !d.expiresAt.startsWith('+') && d.expiresAt < '2026-10-16';
}

/** "Save & share design": link, copy, QR and the account note. */
export function ShareModal({ code, onClose }) {
	const s = useStore();
	const d = s.designs[code];
	if (!code || !d) return null;
	const url = shareUrl(s, code);
	const customer = s.customers[d.customerId];
	return html`<${SfModal} open title="Your design is saved" onClose=${onClose} size="small" class="sf-share">
		<p class="sf-muted">Anyone with this link opens ${s.products[d.productId]?.title} with your choices. ${expiryText(d)}.</p>
		<${CopyField} text=${'https://' + url} />
		<div class="sf-share__row">
			<${QrCode} text=${'https://' + url} size=${148} caption="Scan to open on your phone" />
			<div class="sf-share__meta">
				<p class="sf-share__code"><span class="sf-small sf-muted">Design code</span><strong>${code}</strong></p>
				${customer
					? html`<p class="sf-share__acct"><${Icon} name="check" size=${16} /><span>Saved to your account. Find it under <a href="#account.designs">Saved designs</a>.</span></p>`
					: html`<p class="sf-small sf-muted">Sign in to keep your designs in your account.</p>`}
			</div>
		</div>
		<${ProtoNote} tag="App proxy · /apps/3d/d/:code">The link is served by the app proxy. It redirects to the product page with <code>?variant=${d.variantId}&3d_design=${code}</code> and the theme block restores the design.<//>
	<//>`;
}

/** AR: Quick Look on iPhone, Scene Viewer on Android, QR on desktop. */
export function ArModal({ productId, variantId, choices, onClose }) {
	const s = useStore();
	const p = s.products[productId];
	const { file } = modelFor(s, productId, variantId);
	const configured = isCustomized(choices);
	const exportOn = !!s.app.modules['usdz-export'];
	const url = `https://${s.shop.domain}/products/${p?.handle}?variant=${variantId}&3d_ar=1`;
	return html`<${SfModal} open title="View in your space" onClose=${onClose} size="base" class="sf-ar">
		<div class="sf-ar__grid">
			<div class="sf-ar__text">
				<p>See the ${p?.title.toLowerCase()} at real size in your room, using your phone's camera.</p>
				<ul class="sf-ar__list">
					<li><${Icon} name="phone" size=${18} /><span><strong>iPhone and iPad</strong> open it in AR Quick Look.</span></li>
					<li><${Icon} name="phone" size=${18} /><span><strong>Android</strong> opens it in Scene Viewer.</span></li>
				</ul>
				<p class="sf-small sf-muted">${file?.usdz === false ? 'The AR file for this model is still being prepared. Android works now; iPhone follows shortly.' : 'Uses the AR file Shopify generated from the 3D model.'}</p>
				${configured
					? exportOn
						? html`<p class="sf-ar__configured"><${Icon} name="sparkle" size=${16} /> Your configured version is exported for AR, with your colours and parts.</p>`
						: html`<p class="sf-small sf-muted">AR shows the standard ${variantTitle(s, variantId) ? variantTitle(s, variantId).toLowerCase() + ' ' : ''}model, without your custom choices.</p>`
					: null}
			</div>
			<${QrCode} text=${url} size=${160} caption="Scan with your phone" />
		</div>
	<//>`;
}

/** Quick view / order design viewer (eager). choices = the design's shopper input. */
export function View3DModal({ productId, variantId, choices, title, onClose, children }) {
	const s = useStore();
	const p = s.products[productId];
	if (!p) return null;
	const cfg = effectiveFor(s, productId, variantId);
	const custom = choices ? shopperLayer(cfg, choices, s.variants[variantId]?.options) : null;
	return html`<${SfModal} open title=${title || p.title} onClose=${onClose} size="large" class="sf-v3d">
		<div class="sf-v3d__grid">
			<${StoreViewer} productId=${productId} variantId=${variantId} choices=${choices} custom=${custom} trigger="eager" toolbar=${{ ...s.app.settings.toolbar, ar: false }} class="sf-v3d__viewer" />
			${children ? html`<div class="sf-v3d__side">${children}</div>` : null}
		</div>
	<//>`;
}
