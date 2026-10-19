// Demo theme "Fernway" (Online Store 2.0, Horizon-like): chrome, cart drawer and the small
// storefront primitives shared by the store screens (modal, drawer, prototype note, QR, cart lines).
import { html, render, useState, useEffect, useLayoutEffect, useMemo, useRef, cx } from '../../js/core/ui.js';
import { store, useStore } from '../core/store.js';
import { money, moneyDelta, cartTotals, transformLine, visibleProps } from '../core/commerce.js';
import { ProductImage } from '../ui/viewer.js';
import { Icon } from '../ui/icons.js';
import { SurfaceTag } from '../ui/polaris.js';

export const FREE_DELIVERY = 500;

/* ---------- portal (modals escape the theme's container-query wrapper) ---------- */

export function Portal({ children }) {
	const host = useMemo(() => {
		const el = document.createElement('div');
		el.className = 'sf-portal';
		return el;
	}, []);
	useLayoutEffect(() => {
		document.body.appendChild(host);
		return () => {
			render(null, host);
			host.remove();
		};
	}, []);
	useLayoutEffect(() => {
		render(children, host);
	});
	return null;
}

let locks = 0;
function useScrollLock(on) {
	useEffect(() => {
		if (!on) return;
		locks++;
		document.documentElement.classList.add('sf-locked');
		return () => {
			locks--;
			if (!locks) document.documentElement.classList.remove('sf-locked');
		};
	}, [on]);
}

// Escape closes only the topmost overlay.
const escStack = [];
function useEscape(on, onClose) {
	const cb = useRef(onClose);
	cb.current = onClose;
	useEffect(() => {
		if (!on) return;
		const entry = cb;
		escStack.push(entry);
		const f = (e) => e.key === 'Escape' && escStack[escStack.length - 1] === entry && entry.current?.();
		window.addEventListener('keydown', f);
		return () => {
			window.removeEventListener('keydown', f);
			escStack.splice(escStack.indexOf(entry), 1);
		};
	}, [on]);
}

/** Storefront dialog. size: small | base | large | full */
export function SfModal({ open, title, onClose, size = 'base', children, footer, class: cls, label }) {
	useScrollLock(open);
	useEscape(open, onClose);
	if (!open) return null;
	return html`<${Portal}>
		<div class="sf-overlay" onClick=${(e) => e.target === e.currentTarget && onClose?.()}>
			<div class=${cx('sf-modal', `sf-modal--${size}`, cls)} role="dialog" aria-modal="true" aria-label=${label || title}>
				${title != null
					? html`<div class="sf-modal__head">
							<h2 class="sf-modal__title">${title}</h2>
							<button type="button" class="sf-iconbtn" onClick=${onClose} aria-label="Close"><${Icon} name="x" size=${20} /></button>
						</div>`
					: null}
				<div class="sf-modal__body">${children}</div>
				${footer ? html`<div class="sf-modal__foot">${footer}</div>` : null}
			</div>
		</div>
	<//>`;
}

/** Slide-over panel from the right (bottom sheet on phones when sheet=true). */
export function SfDrawer({ open, title, onClose, children, footer, class: cls, sheet, modal = true }) {
	useScrollLock(open && modal);
	useEscape(open, onClose);
	if (!open) return null;
	return html`<${Portal}>
		<div class=${cx('sf-drawer-wrap', sheet && 'is-sheet', !modal && 'is-modeless')}>
			${modal ? html`<div class="sf-drawer-backdrop" onClick=${onClose}></div>` : null}
			<aside class=${cx('sf-drawer', cls)} role="dialog" aria-modal=${modal ? 'true' : 'false'} aria-label=${title}>
				<div class="sf-drawer__head">
					<h2 class="sf-drawer__title">${title}</h2>
					<button type="button" class="sf-iconbtn" onClick=${onClose} aria-label="Close"><${Icon} name="x" size=${20} /></button>
				</div>
				<div class="sf-drawer__body">${children}</div>
				${footer ? html`<div class="sf-drawer__foot">${footer}</div>` : null}
			</aside>
		</div>
	<//>`;
}

/** Prototype-only explainer (not part of the theme): dashed callout naming the Shopify surface. */
export function ProtoNote({ tag, title, children, onDismiss, class: cls }) {
	return html`<aside class=${cx('sf-proto', cls)}>
		<div class="sf-proto__head">
			<span class="sf-proto__label">Prototype note</span>
			${tag ? html`<${SurfaceTag}>${tag}<//>` : null}
			${onDismiss ? html`<button type="button" class="sf-proto__close" onClick=${onDismiss} aria-label="Dismiss note"><${Icon} name="x" size=${14} /></button>` : null}
		</div>
		${title ? html`<p class="sf-proto__title">${title}</p>` : null}
		<div class="sf-proto__text">${children}</div>
	</aside>`;
}

/* ---------- clipboard ---------- */

function execCopy(text) {
	try {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.setAttribute('readonly', '');
		ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
		document.body.appendChild(ta);
		ta.select();
		const ok = document.execCommand('copy');
		ta.remove();
		return ok;
	} catch {
		return false;
	}
}

/** Resolves true when the text reached the clipboard. */
export async function copyText(text) {
	try {
		if (window.isSecureContext && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// Permission denied or no focus: fall back below.
	}
	return execCopy(text);
}

/** Read-only link field + Copy button; selects the text when copying fails. */
export function CopyField({ text, label = 'Share link' }) {
	const [st, setSt] = useState('');
	const ref = useRef(null);
	const t = useRef(0);
	useEffect(() => () => clearTimeout(t.current), []);
	const copy = async () => {
		const ok = await copyText(text);
		setSt(ok ? 'copied' : 'failed');
		if (!ok) ref.current?.select();
		clearTimeout(t.current);
		t.current = setTimeout(() => setSt(''), 2200);
	};
	return html`<div class="sf-copy">
		<label class="sf-visually-hidden" for="sf-copy-field">${label}</label>
		<input id="sf-copy-field" ref=${ref} class="sf-copy__input" readonly value=${text} onFocus=${(e) => e.target.select()} />
		<button type="button" class="sf-btn sf-btn--secondary sf-copy__btn" onClick=${copy} aria-live="polite">
			<${Icon} name=${st === 'copied' ? 'check' : 'copy'} size=${16} />${st === 'copied' ? 'Copied' : st === 'failed' ? 'Press Ctrl+C' : 'Copy'}
		</button>
	</div>`;
}

/* ---------- QR code (qrcode-generator UMD from jsDelivr, drawn as SVG) ---------- */

const QR_SRC = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
let qrLib = null;
function loadQr() {
	if (window.qrcode) return Promise.resolve(window.qrcode);
	if (qrLib) return qrLib;
	qrLib = new Promise((resolve, reject) => {
		const el = document.createElement('script');
		el.src = QR_SRC;
		el.async = true;
		el.onload = () => (window.qrcode ? resolve(window.qrcode) : reject(new Error('qrcode missing')));
		el.onerror = () => reject(new Error('qrcode failed to load'));
		document.head.appendChild(el);
	});
	qrLib.catch(() => (qrLib = null));
	return qrLib;
}

export function QrCode({ text, size = 168, caption }) {
	const [svg, setSvg] = useState('');
	const [failed, setFailed] = useState(false);
	useEffect(() => {
		let live = true;
		setFailed(false);
		loadQr()
			.then((qrcode) => {
				const qr = qrcode(0, 'M');
				qr.addData(text);
				qr.make();
				const n = qr.getModuleCount();
				let d = '';
				for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
				if (live) setSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#191a1c"/></svg>`);
			})
			.catch(() => live && setFailed(true));
		return () => (live = false);
	}, [text]);
	return html`<figure class="sf-qr" style=${{ '--qr': size + 'px' }}>
		${svg ? html`<div class="sf-qr__img" dangerouslySetInnerHTML=${{ __html: svg }}></div>` : failed ? html`<div class="sf-qr__img sf-qr__fallback"><span>${text}</span></div>` : html`<div class="sf-qr__img sf-qr__loading"><span class="x-pimg__spin"></span></div>`}
		${caption ? html`<figcaption>${caption}</figcaption>` : null}
	</figure>`;
}

/* ---------- cart drawer bus ---------- */

const cartSubs = new Set();
let cartOpen = false;
export function openCart() {
	cartOpen = true;
	cartSubs.forEach((f) => f(true));
}
export function closeCart() {
	cartOpen = false;
	cartSubs.forEach((f) => f(false));
}
function useCartOpen() {
	const [open, setOpen] = useState(cartOpen);
	useEffect(() => {
		cartSubs.add(setOpen);
		return () => cartSubs.delete(setOpen);
	}, []);
	return open;
}

/* ---------- small pieces ---------- */

export const variantTitle = (s, vid) => {
	const t = s.variants[vid]?.title;
	return t && t !== 'Default Title' ? t : '';
};

export function QtyStepper({ value, onChange, min = 1, label = 'Quantity', small }) {
	const set = (n) => onChange(Math.max(min, Math.min(99, Number.isFinite(n) ? n : min)));
	return html`<div class=${cx('sf-qty', small && 'sf-qty--sm')} role="group" aria-label=${label}>
		<button type="button" onClick=${() => set(value - 1)} disabled=${value <= min} aria-label="Decrease quantity">−</button>
		<input type="number" inputmode="numeric" min=${min} max="99" value=${value} aria-label=${label} onChange=${(e) => set(parseInt(e.target.value, 10))} />
		<button type="button" onClick=${() => set(value + 1)} aria-label="Increase quantity">+</button>
	</div>`;
}

/** Line thumbnail: snapshot when the line has one (and the surface may show it), else the variant image. */
export function LineImage({ line, size = 72, snapshot = true, choices = true }) {
	if (snapshot && line.snapshot) return html`<img class="sf-line__snap" src=${line.snapshot} alt="" width=${size} height=${size} style=${{ width: size + 'px', height: size + 'px' }} />`;
	return html`<${ProductImage} productId=${line.productId} variantId=${line.variantId} size=${size} choices=${choices ? line.choices || undefined : undefined} />`;
}

/**
 * A cart line as the theme renders the Cart Transform result.
 * expand (Basic): bundle-style parent + components. update (Plus): one renamed line with the snapshot.
 */
export function CartLine({ line, s, editable, compact, imgSize = 84, onQty, onRemove, surface = 'cart' }) {
	const t = transformLine(s, line);
	const p = s.products[line.productId];
	const vt = variantTitle(s, line.variantId);
	const props = visibleProps(line.properties);
	const checkout = surface === 'checkout';
	const title = t.mode === 'update' ? t.title : p?.title;
	// Non-Plus checkout keeps the variant image; the theme cart may show the snapshot.
	const img = checkout ? (t.mode === 'update' && line.snapshot ? html`<img class="sf-line__snap" src=${line.snapshot} alt="" style=${{ width: imgSize + 'px', height: imgSize + 'px' }} />` : html`<${ProductImage} productId=${line.productId} variantId=${line.variantId} size=${imgSize} />`) : html`<${LineImage} line=${line} size=${imgSize} />`;
	return html`<li class=${cx('sf-line', compact && 'sf-line--compact', t.mode && `sf-line--${t.mode}`)}>
		<div class="sf-line__media">${img}${checkout ? html`<span class="sf-line__badge">${line.qty}</span>` : null}</div>
		<div class="sf-line__info">
			<a class="sf-line__title" href=${'#store.product.' + p?.handle}>${title}</a>
			${vt && t.mode !== 'expand' ? html`<p class="sf-line__variant">${vt}</p>` : null}
			${t.mode === 'expand'
				? html`<ul class="sf-line__components" aria-label="Included in this item">
						${t.components.map((c) => html`<li><span>${c.title}</span><span>${c.hidden ? moneyDelta(c.price) : money(c.price)}</span></li>`)}
					</ul>`
				: null}
			${props.length && !checkout
				? html`<dl class="sf-line__props">${props.map((x) => html`<div><dt>${x.name}:</dt><dd>${/^#[0-9a-f]{6}$/i.test(x.value) ? html`<span class="sf-dot" style=${{ background: x.value }}></span>${x.value}` : x.value}</dd></div>`)}</dl>`
				: null}
			${props.length && checkout ? html`<p class="sf-line__variant">${props.map((x) => x.value).join(' · ')}</p>` : null}
			${editable
				? html`<div class="sf-line__actions">
						<${QtyStepper} small value=${line.qty} onChange=${(n) => onQty?.(n)} label=${`Quantity for ${p?.title}`} />
						<button type="button" class="sf-link sf-line__remove" onClick=${onRemove} aria-label=${`Remove ${p?.title}`}><${Icon} name="trash" size=${16} /><span>Remove</span></button>
					</div>`
				: null}
		</div>
		<div class="sf-line__price">
			<span>${money(t.unit * line.qty)}</span>
			${line.qty > 1 && !checkout ? html`<small>${money(t.unit)} each</small>` : null}
		</div>
	</li>`;
}

export function setLineQty(id, qty) {
	store.patch('cart.lines', (ls) => ls.map((l) => (l.id === id ? { ...l, qty } : l)));
}
export function removeLine(id) {
	store.patch('cart.lines', (ls) => ls.filter((l) => l.id !== id));
}

function FreeDelivery({ subtotal }) {
	const left = FREE_DELIVERY - subtotal;
	const pct = Math.min(100, (subtotal / FREE_DELIVERY) * 100);
	return html`<div class="sf-free">
		<p>${left > 0 ? html`<span>You're <strong>${money(left)}</strong> away from free delivery.</span>` : html`<${Icon} name="check" size=${14} /><span>Your order ships free.</span>`}</p>
		<div class="sf-free__bar"><span style=${{ width: pct + '%' }}></span></div>
	</div>`;
}

function CartDrawer() {
	const open = useCartOpen();
	const s = useStore();
	const { lines, subtotal, count } = cartTotals(s);
	return html`<${SfDrawer}
		open=${open}
		title=${`Your cart${count ? ` (${count})` : ''}`}
		onClose=${closeCart}
		class="sf-cartdrawer"
		footer=${lines.length
			? html`<div class="sf-cartdrawer__foot">
					<div class="sf-sumrow sf-sumrow--total"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
					<p class="sf-muted sf-small">Taxes and shipping calculated at checkout.</p>
					<a class="sf-btn sf-btn--primary sf-btn--full" href="#store.checkout" onClick=${closeCart}>Check out</a>
					<a class="sf-btn sf-btn--secondary sf-btn--full" href="#store.cart" onClick=${closeCart}>View cart</a>
				</div>`
			: null}
	>
		${lines.length
			? html`<${FreeDelivery} subtotal=${subtotal} />
					<ul class="sf-lines">${lines.map(({ line }) => html`<${CartLine} key=${line.id} line=${line} s=${s} compact editable imgSize=${72} onQty=${(n) => setLineQty(line.id, n)} onRemove=${() => removeLine(line.id)} />`)}</ul>`
			: html`<div class="sf-empty sf-empty--drawer">
					<${Icon} name="bag" size=${32} />
					<p>Your cart is empty.</p>
					<a class="sf-btn sf-btn--primary" href="#store.home" onClick=${closeCart}>Continue shopping</a>
				</div>`}
	<//>`;
}

/* ---------- theme chrome ---------- */

const NAV = [
	{ label: 'Shop', href: '#store.home' },
	{ label: 'Furniture', href: '#store.home' },
	{ label: 'Lighting', href: '#store.home' },
];

function Header({ count, embedded }) {
	const [menu, setMenu] = useState(false);
	return html`<header class=${cx('sf-header', embedded && 'is-embedded')}>
		<div class="sf-header__row sf-wrap">
			<button type="button" class="sf-iconbtn sf-header__menu" aria-expanded=${String(menu)} aria-label="Menu" onClick=${() => setMenu(!menu)}><${Icon} name=${menu ? 'x' : 'menu'} size=${22} /></button>
			<a class="sf-logo" href="#store.home">Fernway</a>
			<nav class="sf-nav" aria-label="Main">${NAV.map((n) => html`<a href=${n.href}>${n.label}</a>`)}</nav>
			<div class="sf-header__icons">
				<button type="button" class="sf-iconbtn sf-header__search" aria-label="Search"><${Icon} name="search" size=${20} /></button>
				<a class="sf-iconbtn" href="#account.orders" aria-label="Account"><${Icon} name="user" size=${21} /></a>
				<button type="button" class="sf-iconbtn sf-cartbtn" aria-label=${`Cart, ${count} items`} onClick=${openCart}>
					<${Icon} name="bag" size=${21} />
					${count ? html`<span class="sf-cartbtn__count">${count}</span>` : null}
				</button>
			</div>
		</div>
		${menu ? html`<nav class="sf-mobilenav sf-wrap" aria-label="Main">${NAV.map((n) => html`<a href=${n.href} onClick=${() => setMenu(false)}>${n.label}</a>`)}<a href="#account.orders">Account</a></nav>` : null}
	</header>`;
}

function Footer() {
	return html`<footer class="sf-footer">
		<div class="sf-wrap sf-footer__grid">
			<div class="sf-footer__brand">
				<span class="sf-logo sf-logo--sm">Fernway</span>
				<p>Furniture and homeware made to last, from small workshops in Portugal and Denmark.</p>
			</div>
			<div><h3>Shop</h3><a href="#store.home">Furniture</a><a href="#store.home">Lighting</a><a href="#store.home">Kitchen</a><a href="#store.home">Textiles</a></div>
			<div><h3>Help</h3><a href="#store.home">Delivery</a><a href="#store.home">Returns</a><a href="#store.home">Care guides</a></div>
			<div><h3>Account</h3><a href="#account.orders">Orders</a><a href="#account.designs">Saved designs</a></div>
		</div>
		<div class="sf-wrap sf-footer__base"><span>© 2026 Fernway Home</span><span>Demo store · Powered by Shopify</span></div>
	</footer>`;
}

/** <StoreTheme embedded?>page</StoreTheme>: announcement bar, header, footer and the cart drawer. */
export function StoreTheme({ children, embedded, class: cls }) {
	const s = useStore();
	const count = s.cart.lines.reduce((t, l) => t + l.qty, 0);
	return html`<div class=${cx('sf', embedded && 'sf--embedded', cls)}>
		<div class="sf-announce">Free delivery over ${money(FREE_DELIVERY).replace(/\.00$/, '')}</div>
		<${Header} count=${count} embedded=${embedded} />
		<main class="sf-main">${children}</main>
		<${Footer} />
		<${CartDrawer} />
	</div>`;
}
