// customizer-modal (specs/customizer-modal.md): Customize opens a large dialog. The mounted viewer moves into it
// (one live canvas), next to the options panel with the variation selects, live total and Add to cart.
import { html, render as preactRender, useState, useEffect, useLayoutEffect, useRef, useMemo, cx, money } from '../../core/ui.js';
import { useStore } from '../../core/store.js';
import { useFeature } from '../../core/features.js';
import { validateChoices, configFor, quoteFor } from '../../shared/options.js';
import { decalErrors } from '../../shared/decals.js';
import { CustomizerOptions, DrawerTools, useFocusGroup, useModalDialog } from './viewer-ui.js';
import { PriceSummary, hasPricedOptions } from './price-summary.js';
import { ShareDesignButton } from './saved-designs.js';

// Same queries as the sheet and short-landscape layouts in css/customizer-modal.css; both use the compact bar.
const NARROW = '(max-width: 768px) and (min-height: 541px), (max-width: 1100px) and (orientation: portrait)';
const SHORT = '(max-height: 540px) and (orientation: landscape)';
const COMPACT = `${NARROW}, ${SHORT}`;
const UNRENDERED = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'TEMPLATE']);

function useCompact() {
	const read = () => {
		try {
			return window.matchMedia(COMPACT).matches;
		} catch {
			return false;
		}
	};
	const [compact, setCompact] = useState(read);
	useEffect(() => {
		let mq;
		try {
			mq = window.matchMedia(COMPACT);
		} catch {
			return;
		}
		const on = () => setCompact(mq.matches);
		mq.addEventListener?.('change', on);
		return () => mq.removeEventListener?.('change', on);
	}, []);
	return compact;
}

/**
 * Renders `tree` into one persistent host element and keeps that host in `target` (the dialog's stage) or,
 * when target is null, in the returned slot. Moving the host never remounts the tree (react-reverse-portal).
 */
export function useMovableHost(tree, target, on) {
	const slotRef = useRef(null);
	const host = useMemo(() => {
		const el = document.createElement('div');
		el.className = 'wc3d-viewer-host';
		return el;
	}, []);
	useLayoutEffect(() => {
		if (!on) return;
		const dest = target || slotRef.current;
		if (dest && host.parentNode !== dest) dest.appendChild(host);
		preactRender(tree, host);
	});
	useLayoutEffect(() => {
		if (!on) return;
		return () => {
			preactRender(null, host);
			host.remove();
		};
	}, [on]);
	// Back to the page before the dialog unmounts, so focus can return to the Customize button.
	const home = () => {
		if (slotRef.current && host.parentNode !== slotRef.current) slotRef.current.appendChild(host);
	};
	return { slotRef, home };
}

/**
 * The dialog shell: header, stage (the viewer host is appended there), inert background, scroll lock,
 * and one same-URL history entry so Back closes it. onClose closes at once; closeRef gets the UI close.
 */
export function CustomizerModal({ title, productId, onClose, closeRef, setStage, openerRef }) {
	const rootRef = useRef(null);
	const live = useRef({});
	live.current.onClose = onClose;
	const titleId = 'wc3d-cm-title-' + productId;

	// Declared before useModalDialog: on unmount the page leaves `inert` before focus returns to it.
	useEffect(() => {
		const st = live.current;
		const mine = rootRef.current?.parentNode;
		const others = [...document.body.children].filter((el) => el !== mine && !el.inert && !UNRENDERED.has(el.tagName));
		others.forEach((el) => (el.inert = true));
		document.body.classList.add('wc3d-customizer-modal-open');

		const hash = location.hash;
		let restore = null;
		st.pushed = false;
		st.popped = false;
		st.closing = false;
		try {
			// Per history entry: set before the push so returning to the page's entry does not scroll.
			restore = history.scrollRestoration;
			history.scrollRestoration = 'manual';
			history.pushState({ wc3dCustomizer: true }, '');
			st.pushed = true;
		} catch {
			// Sandboxed frame: the modal works without Back support.
		}
		const restoreScroll = () => {
			try {
				if (restore) history.scrollRestoration = restore;
			} catch {
				// Same as above.
			}
		};
		const onPop = () => {
			st.popped = true;
			st.onClose();
		};
		window.addEventListener('popstate', onPop);

		return () => {
			window.removeEventListener('popstate', onPop);
			clearTimeout(st.fallback);
			others.forEach((el) => (el.inert = false));
			document.body.classList.remove('wc3d-customizer-modal-open');
			if (st.pushed && !st.popped && !st.closing && location.hash === hash && history.state?.wc3dCustomizer) {
				// Closed without Back (add to cart re-rendered the page): drop our entry.
				window.addEventListener('popstate', restoreScroll, { once: true });
				history.back();
			} else restoreScroll();
			// The Customize button went away with the old viewer: focus the cart notice instead.
			if (!openerRef?.current?.isConnected) requestAnimationFrame(() => document.querySelector('.woocommerce-notices-wrapper [role="alert"]')?.focus({ preventScroll: true }));
		};
	}, []);

	const requestClose = () => {
		const st = live.current;
		if (st.closing) return;
		st.closing = true;
		if (!st.pushed || st.popped) return st.onClose();
		history.back();
		// The popstate closes it; close anyway if the frame ignores back().
		st.fallback = setTimeout(() => !st.popped && st.onClose(), 1500);
	};
	if (closeRef) closeRef.current = requestClose;
	const dlg = useModalDialog(requestClose, openerRef);

	return html`
		<div ref=${rootRef} class="wc3d-customizer-modal" onKeyDown=${dlg.onKeyDown}>
			<div class="wc3d-customizer-modal__backdrop" role="presentation" onClick=${requestClose}></div>
			<div ref=${dlg.ref} class="wc3d-customizer-modal__dialog" role="dialog" aria-modal="true" aria-labelledby=${titleId} tabindex="-1">
				<div class="wc3d-customizer-modal__header">
					<h2 id=${titleId} class="wc3d-customizer-modal__title">${title}</h2>
					<button type="button" class="wc3d-customizer-modal__close" aria-label="Close" onClick=${requestClose}>✕</button>
				</div>
				<div ref=${setStage} class="wc3d-customizer-modal__body"></div>
			</div>
		</div>
	`;
}

/**
 * Options panel inside the moved viewer wrapper (so the drawer's undo shortcuts still apply): variation
 * selects, the drawer body, then the footer with the total, tools, quantity, Add to cart and Done.
 */
export function ModalPanel({ config, custom, setCustom, history, palette, editable, toggleable, productId, variationId, grouped, personal, flags, focusGroup, onFocused, decals, cart, showErrors, onAdd, onDone }) {
	const state = useStore();
	const pricing = useFeature('option-pricing');
	const decalsOn = useFeature('decals');
	const compact = useCompact();
	const scrollRef = useRef(null);
	const attrsRef = useRef(null);
	const [tries, setTries] = useState(0);
	useFocusGroup(scrollRef, true, focusGroup, onFocused, 200);

	const product = cart?.product || state.products?.[productId];
	const variation = cart?.variation || null;
	const variable = product?.type === 'variable';
	const chosen = cart?.chosen || {};
	const anyChosen = Object.values(chosen).some(Boolean);

	// The page form's checks, re-run as the shopper picks, so a line goes once its group is filled.
	const cfg = configFor(state, productId, variationId);
	const errors = showErrors && (grouped || personal) ? [...validateChoices(cfg, custom, flags), ...decalErrors(cfg, custom, decalsOn)] : [];

	// No variation picked: focus the first empty select (the page form shows the same message).
	useEffect(() => {
		if (!tries || !cart?.needSel) return;
		[...(attrsRef.current?.querySelectorAll('select') || [])].find((el) => !el.value)?.focus();
	}, [tries, cart?.needSel]);

	const priced = pricing && product && hasPricedOptions(state, product, flags.groups);
	const total = !product || (variable && !variation) ? null : priced ? quoteFor(state, product.id, variation?.id || 0, custom, { pricing: true, groups: flags.groups }).total : (variation?.price ?? product.price);
	const tools = html`<div class=${cx('wc3d-customizer-modal__tools', history && 'wc3d-customer-drawer__footer--history')}><${DrawerTools} history=${history} setCustom=${setCustom} /></div>`;
	const qid = 'wc3d-cm-qty-' + productId;
	const add = () => {
		setTries((n) => n + 1);
		onAdd();
	};

	return html`
		<section class="wc3d-customizer-modal__panel" aria-label="Customize Product">
			<div ref=${scrollRef} class="wc3d-customizer-modal__scroll wc3d-scroll">
				${variable &&
				cart &&
				html`<div ref=${attrsRef} class="wc3d-customizer-modal__attributes">
					${product.attributes.map((a) => {
						const id = `wc3d-cm-pa_${a.name.toLowerCase()}-${productId}`;
						return html`<div key=${a.name} class="wc3d-customizer-modal__field">
							<label class="wc3d-customer-drawer__section-title" for=${id}>${a.name}</label>
							<select id=${id} class="wc3d-customer-drawer__select" value=${chosen[a.name] || ''} onChange=${(e) => cart.setChosen({ ...chosen, [a.name]: e.currentTarget.value })}>
								<option value="">Choose an option</option>
								${a.options.map((o) => html`<option key=${o} value=${o}>${o}</option>`)}
							</select>
						</div>`;
					})}
					${anyChosen && html`<a class="reset_variations wc3d-customizer-modal__clear" href="#" onClick=${(e) => (e.preventDefault(), cart.setChosen({}))}>Clear</a>`}
					${cart.needSel && html`<p class="wc3d-customizer-modal__error" role="alert">Please select some product options before adding this product to your cart.</p>`}
				</div>`}
				${errors.length > 0 &&
				html`<div class="wc3d-customizer-modal__errors" role="alert">
					<ul>${errors.map((t) => html`<li key=${t}>${t}</li>`)}</ul>
				</div>`}
				<div class="wc3d-customizer-modal__options">
					<${CustomizerOptions} config=${config} custom=${custom} setCustom=${setCustom} palette=${palette} editable=${editable} toggleable=${toggleable} productId=${productId} variationId=${variationId} grouped=${grouped} flags=${flags} decals=${decals} />
				</div>
				<${ShareDesignButton} productId=${productId} variationId=${variationId} custom=${custom} />
				${compact && tools}
			</div>
			<div class="wc3d-customizer-modal__footer">
				${!compact && pricing && product && html`<${PriceSummary} product=${product} variation=${variation} custom=${custom} hint=${false} />`}
				${compact &&
				html`<div class="wc3d-customizer-modal__total" aria-live="polite">
					${total == null && product ? html`<span class="wc3d-customizer-modal__total-empty">Choose an option to see the total.</span>` : html`<span>Total</span><strong class="woocommerce-Price-amount amount">${money(total)}</strong>`}
				</div>`}
				${!compact && tools}
				<div class="wc3d-customizer-modal__buy">
					${cart &&
					html`<div class="quantity wc3d-customizer-modal__qty">
							<label class="screen-reader-text" for=${qid}>${product.name} quantity</label>
							<input type="number" id=${qid} class="input-text qty text" value=${cart.qty} min="1" step="1" inputmode="numeric" autocomplete="off" aria-label="Product quantity" onInput=${(e) => cart.setQty(e.currentTarget.value)} />
						</div>
						<button type="button" class=${cx('button alt wc3d-customizer-modal__add', variable && !variation && 'disabled wc-variation-selection-needed')} onClick=${add}>Add to cart</button>`}
					<button type="button" class="button wc3d-customizer-modal__done" onClick=${onDone}>Done</button>
				</div>
			</div>
		</section>
	`;
}
