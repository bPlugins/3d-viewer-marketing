// saved-designs (storefront): "Share design" button + share sheet, restoring a design on the product
// page, and design pictures/summaries shared with My Account and the admin list. Spec: specs/saved-designs.md.
import { html, render as preactRender, useState, useEffect, useLayoutEffect, useRef, useMemo, cx, money } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { useFeature } from '../../core/features.js';
import { viewerSettingsFor, effectiveFor } from '../../shared/product-3d.js';
import { usesDecals } from '../../shared/decals.js';
import { ProductImage } from '../../shared/product-image.js';
import { quoteFor, optionFlags, usesGroups } from '../../shared/options.js';
import { renderSnapshot } from '../../shared/snapshot.js';
import {
	saveDesign, findDesign, shareSettings, storeLink, protoToken, expiresAt, longDate, currentCustomer, lookupDesign, normalizeCode, countView,
} from '../../shared/saved-designs.js';
import { pushNotice, lineName } from './theme.js';
import { qrSvgUrl } from './viewer-ui.js';
import { protoLabel } from '../../shared/slots.js';

export const ShareIcon = ({ size = 16 }) =>
	html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>`;

// ── Clipboard ──────────────────────────────────────────────────────────────

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

/** <CopyButton text class>Copy link</CopyButton>: "Copied" for 2 s; on failure asks for Ctrl+C. */
export function CopyButton({ text, class: cls, label = 'Copy link', onFail }) {
	const [st, setSt] = useState('');
	const t = useRef(0);
	useEffect(() => () => clearTimeout(t.current), []);
	const click = async () => {
		const ok = await copyText(text);
		setSt(ok ? 'copied' : 'failed');
		if (!ok) onFail?.();
		clearTimeout(t.current);
		t.current = setTimeout(() => setSt(''), 2000);
	};
	return html`<button type="button" class=${cx(cls, st === 'copied' && 'is-copied')} onClick=${click} aria-live="polite">
		${st === 'copied' ? 'Copied' : st === 'failed' ? 'Press Ctrl+C to copy' : label}
	</button>`;
}

// ── Picture and summary of a design ────────────────────────────────────────

/** <DesignThumb design size />: the configured product rendered like the cart snapshots (cached). */
export function DesignThumb({ design: d, size = 96, class: cls }) {
	const state = useStore();
	const p = state.products?.[d.productId];
	const [url, setUrl] = useState('');
	const key = JSON.stringify([d.productId, d.variationId, d.custom]);
	useEffect(() => {
		let live = true;
		if (!p) return;
		renderSnapshot(store.get(), d.productId, d.variationId || 0, d.custom).then((u) => live && setUrl(u || ''), () => {});
		return () => (live = false);
	}, [key, !!p]);
	if (!p) return html`<span class=${cx('wc3d-design-thumb is-missing', cls)} style=${{ width: size + 'px', height: size + 'px' }} aria-hidden="true"></span>`;
	if (!url) return html`<${ProductImage} product=${p} variationId=${d.variationId || 0} size=${size} class=${cx('wc3d-design-thumb', cls)} />`;
	return html`<img class=${cx('proto-pimg wc3d-design-thumb', cls)} src=${url} alt=${p.name} width=${size} height=${size} style=${{ width: size + 'px', height: size + 'px', background: p.image?.bg }} />`;
}

/** Option rows of a design ({label, value, swatch}) from the product's current setup. */
export function designRows(state, d) {
	if (!state.products?.[d.productId]) return [];
	return quoteFor(state, d.productId, d.variationId || 0, d.custom, optionFlags()).lines;
}

export function designPrice(state, d) {
	return quoteFor(state, d.productId, d.variationId || 0, d.custom, optionFlags()).total;
}

/** OptionLines::display_value(): "Walnut (+$67.35)"; free choices show the value only. */
const displayValue = (l) => {
	const a = Math.round((Number(l.amount) || 0) * 100) / 100;
	return a ? `${l.value} (${a > 0 ? '+' : '−'}${money(Math.abs(a))})` : l.value;
};

export function Rows({ rows, max = 99, amounts = false }) {
	if (!rows.length) return null;
	const shown = rows.slice(0, max);
	return html`<ul class="wc3d-design-rows">
		${shown.map((l) => html`<li key=${l.key}>${l.swatch && html`<span class="wc3d-swatch-dot" style=${{ background: l.swatch }} aria-hidden="true"></span>`}<span>${l.label}: ${amounts ? displayValue(l) : l.value}</span></li>`)}
		${rows.length > shown.length && html`<li class="wc3d-design-rows__more">+${rows.length - shown.length} more</li>`}
	</ul>`;
}

// ── Modal plumbing (same behaviour as the AR QR modal) ─────────────────────

function Portal({ children }) {
	const host = useMemo(() => {
		const el = document.createElement('div');
		el.className = 'wc3d-portal';
		document.body.appendChild(el);
		return el;
	}, []);
	useLayoutEffect(() => {
		preactRender(children, host);
	});
	useLayoutEffect(
		() => () => {
			preactRender(null, host);
			host.remove();
		},
		[]
	);
	return null;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function useDialog(onClose, returnFocusRef) {
	const ref = useRef(null);
	const close = useRef(onClose);
	close.current = onClose;
	useEffect(() => {
		const prev = document.activeElement;
		ref.current?.focus();
		// On the document, so Escape still works after an inline form inside the sheet unmounts.
		const onKey = (e) => {
			if (e.key !== 'Escape') return;
			e.stopImmediatePropagation();
			close.current();
		};
		document.addEventListener('keydown', onKey, true);
		return () => {
			document.removeEventListener('keydown', onKey, true);
			(returnFocusRef?.current || prev)?.focus?.();
		};
	}, []);
	const onKeyDown = (e) => {
		if (e.key !== 'Tab') return;
		const items = [...ref.current.querySelectorAll(FOCUSABLE)];
		if (!items.length) return e.preventDefault();
		const first = items[0];
		const last = items[items.length - 1];
		if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	};
	return { ref, onKeyDown };
}

// ── Share sheet ────────────────────────────────────────────────────────────

function AccountBlock({ design: d, product, onNavigate }) {
	const state = useStore();
	const customer = currentCustomer(state);
	const [naming, setNaming] = useState(false);
	const [name, setName] = useState(product.name);
	const [saved, setSaved] = useState(false);
	const inputRef = useRef(null);
	useEffect(() => {
		if (naming) inputRef.current?.select();
	}, [naming]);

	if (!customer) {
		return html`<div class="wc3d-share__account">
			<p>Log in to save this design to your account. <a href="#store.account" onClick=${onNavigate}>Log in</a></p>
		</div>`;
	}
	const mine = findDesign(state, { productId: d.productId, variationId: d.variationId, custom: d.custom, customerId: customer.id });
	const view = html`<a href="#store.account.saved-designs" onClick=${onNavigate}>View saved designs</a>`;
	if (mine) {
		return html`<div class="wc3d-share__account is-saved" role="status">
			<p>${saved ? 'Saved to your account.' : html`Already in your saved designs as “${mine.name || product.name}”.`} ${view}</p>
		</div>`;
	}
	if (!naming) {
		return html`<div class="wc3d-share__account">
			<button type="button" class="wc3d-share__btn" onClick=${() => setNaming(true)}>Save to my account</button>
		</div>`;
	}
	const submit = (e) => {
		e.preventDefault();
		saveDesign({ productId: d.productId, variationId: d.variationId, custom: d.custom, customerId: customer.id, name: name.trim() || product.name });
		setSaved(true);
		setNaming(false);
	};
	return html`<form class="wc3d-share__account wc3d-share__name" onSubmit=${submit}>
		<label for="wc3d-share-name">Design name</label>
		<div class="wc3d-share__name-row">
			<input ref=${inputRef} id="wc3d-share-name" type="text" class="wc3d-share__input" value=${name} maxlength="80" onInput=${(e) => setName(e.currentTarget.value)} />
			<button type="submit" class="wc3d-share__btn wc3d-share__btn--primary">Save</button>
			<button type="button" class="wc3d-share__btn wc3d-share__btn--ghost" onClick=${() => setNaming(false)}>Cancel</button>
		</div>
	</form>`;
}

/** Creates (or reuses) the record, then shows the link, Copy link, QR and Save to my account. */
export function ShareSheet({ productId, variationId = 0, custom, onClose, returnFocusRef }) {
	const state = useStore();
	const dlg = useDialog(onClose, returnFocusRef);
	const [code, setCode] = useState('');
	const fieldRef = useRef(null);
	useEffect(() => {
		// Stands in for POST /wc3d/v1/designs.
		const t = setTimeout(() => setCode(saveDesign({ productId, variationId, custom }).record.code), 350);
		return () => clearTimeout(t);
	}, []);
	const d = code ? state.savedDesigns?.[code] : null;
	const product = state.products?.[productId];
	const settings = shareSettings(state);
	const link = d ? storeLink(d.code) : '';
	const exp = d ? expiresAt(d, state) : null;
	const rows = d ? designRows(state, d) : [];
	const qr = useMemo(() => (link ? qrSvgUrl(link) : ''), [link]);
	// A narrow field shows the end of the link, where the code is.
	useEffect(() => {
		const el = fieldRef.current;
		if (el) el.scrollLeft = el.scrollWidth;
	}, [link]);
	if (!product) return null;

	return html`<${Portal}>
		<div class="wc3d-ar-modal wc3d-share-modal" onKeyDown=${dlg.onKeyDown}>
			<div class="wc3d-ar-modal__backdrop" role="presentation" onClick=${onClose}></div>
			<div ref=${dlg.ref} class="wc3d-ar-modal__panel wc3d-share" role="dialog" aria-modal="true" aria-labelledby="wc3d-share-title" tabindex="-1">
				<button type="button" onClick=${onClose} class="wc3d-ar-modal__close" aria-label="Close">×</button>
				<h4 id="wc3d-share-title">Share your design</h4>
				${!d
					? html`<div class="wc3d-share__loading" role="status"><span class="wc3d-hotspot-spinner"></span><span>Creating link…</span></div>`
					: html`
							<div class="wc3d-share__summary">
								<${DesignThumb} design=${d} size=${72} />
								<div class="wc3d-share__summary-text">
									<strong>${lineName(state, d)}</strong>
									<${Rows} rows=${rows} max=${3} />
								</div>
							</div>
							<label class="wc3d-share__label" for="wc3d-share-link">Link</label>
							<div class="wc3d-share__link-row">
								<input ref=${fieldRef} id="wc3d-share-link" class="wc3d-share__input wc3d-share__link" type="text" readonly value=${link} onFocus=${(e) => e.currentTarget.select()} />
								<${CopyButton} text=${link} class="wc3d-share__btn wc3d-share__btn--primary wc3d-share__copy" onFail=${() => fieldRef.current?.select()} />
							</div>
							<div class="wc3d-share__qr">
								<img src=${qr} alt="QR code for the design link" width="120" height="120" />
								<p>Scan to open this design on a phone.</p>
							</div>
							${settings.account && html`<${AccountBlock} design=${d} product=${product} onNavigate=${onClose} />`}
							<p class="wc3d-share__note">Anyone with the link can open this design.${exp ? ` The link expires on ${longDate(exp)}.` : ''}</p>
							<div class="proto-cart-hint wc3d-share__hint">
								<span class="proto-cart-hint__tag">${protoLabel()}</span>
								<span>Copy link copies the store address. To try the link here, use <a href=${'#' + protoToken(d.code)} onClick=${onClose}>Open link</a>.</span>
							</div>
						`}
			</div>
		</div>
	<//>`;
}

function leaveFullscreen() {
	try {
		if (document.fullscreenElement) Promise.resolve(document.exitFullscreen?.()).catch(() => {});
		else if (document.webkitFullscreenElement) document.webkitExitFullscreen?.();
	} catch {
		// Nothing to leave.
	}
}

function useShare() {
	const on = useFeature('saved-designs');
	const links = useStore((s) => shareSettings(s).links);
	const [open, setOpen] = useState(false);
	const btnRef = useRef(null);
	return { show: on && links, open, setOpen, btnRef, start: () => (leaveFullscreen(), setOpen(true)) };
}

/** Customer drawer footer button (null with the flag or the setting off). */
export function ShareDesignButton({ productId, variationId = 0, custom }) {
	const s = useShare();
	if (!s.show) return null;
	return html`<button ref=${s.btnRef} type="button" class="wc3d-customer-drawer__share-btn" onClick=${s.start}><${ShareIcon} size=${14} /><span>Share design</span></button>
		${s.open && html`<${ShareSheet} productId=${productId} variationId=${variationId} custom=${custom} onClose=${() => s.setOpen(false)} returnFocusRef=${s.btnRef} />`}`;
}

/** Product page link under the add-to-cart form (woocommerce_after_add_to_cart_form). */
export function ShareDesignLink({ product, variation, custom }) {
	const s = useShare();
	const vs = useStore((st) => viewerSettingsFor(st, product.id));
	// Only where the drawer has something to pick (same test as the viewer's Customize button).
	const choices = useStore((st) => {
		const cfg = effectiveFor(st, product.id, variation?.id || 0);
		return Object.values(cfg.meshes || {}).some((m) => m?.customizable || m?.optional) || usesGroups(cfg, optionFlags()) || usesDecals(cfg);
	});
	if (!s.show || !vs.available || !vs.customizerEnabled || !choices) return null;
	return html`<p class="wc3d-share-link-wrap">
			<button ref=${s.btnRef} type="button" class="wc3d-share-link" onClick=${s.start}><${ShareIcon} /><span>Share design</span></button>
		</p>
		${s.open && html`<${ShareSheet} productId=${product.id} variationId=${variation?.id || 0} custom=${custom} onClose=${() => s.setOpen(false)} returnFocusRef=${s.btnRef} />`}`;
}

// ── Restore (product page #store.product.<slug>.design.<code>) ──────────────

/**
 * Reads the design param once: { code, chosen, custom } to start the page from, or null.
 * Raises the "loaded" / "expired" notices and counts the view.
 */
export function useRestoredDesign(product, params) {
	const on = useFeature('saved-designs');
	const [res] = useState(() => {
		if (!on || !product || params?.[1] !== 'design' || !params?.[2]) return null;
		const code = normalizeCode(params[2]);
		const r = lookupDesign(store.get(), code);
		if (r.status === 'ok' && r.product.id !== product.id) return { status: 'missing', code };
		if (r.status !== 'ok') return { status: r.status, code };
		return {
			status: 'ok',
			code: r.record.code,
			chosen: r.variation ? { ...r.variation.attributes } : {},
			custom: r.record.custom ? JSON.parse(JSON.stringify(r.record.custom)) : null,
			lost: r.lostVariation,
		};
	});
	useEffect(() => {
		if (!res) return;
		if (res.status === 'ok') {
			countView(res.code);
			pushNotice({ type: 'info', text: `Design ${res.code} loaded.`, action: { href: '#store.product.' + product.slug, label: 'Start over' } });
			if (res.lost) pushNotice({ type: 'info', text: 'Some choices in this design are no longer available.' });
		} else if (res.status === 'gone') pushNotice({ type: 'info', text: 'This design is no longer available.' });
		else pushNotice({ type: 'info', text: 'This design link has expired or does not exist.' });
	}, []);
	return res?.status === 'ok' ? res : null;
}

