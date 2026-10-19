// How Pro controls look while the demo runs the free plugin. Copies the premium build's
// unlicensed look (bpl-tools BControlPro + ProModal): label at 75% opacity, blue "Pro" pill,
// any change opens "Upgrade to PRO" instead of applying.
import { html, useEffect, useRef } from '../../js/core/ui.js';
import { useBus, openProModal, closeProModal } from '../core/bus.js';
import { useIsPro, setPlan } from '../core/plan.js';
import { LINKS } from '../core/links.js';

/** Blue "Pro" pill after a control label (only while on free). */
export function ProPill({ always = false }) {
	const pro = useIsPro();
	if (pro && !always) return null;
	return html`<span class="ld-pro-pill">Pro</span>`;
}

/** "PRO" badge on a panel title (only while on free). */
export function ProBadge() {
	const pro = useIsPro();
	return pro ? null : html`<span class="ld-pro-badge">PRO</span>`;
}

/**
 * Wrap any Pro-only control: <ProLock label="Auto Rotate">…control…<//>.
 * On Pro it renders the children untouched. On free the children are dimmed and inert,
 * and a transparent button on top opens the upgrade modal.
 */
export function ProLock({ label, children, block = false }) {
	const pro = useIsPro();
	if (pro) return children;
	return html`<div class=${'ld-lock' + (block ? ' ld-lock--block' : '')}>
		<div class="ld-lock__inner" inert>${children}</div>
		<button type="button" class="ld-lock__hit" aria-label=${(label ? label + ': ' : '') + 'available in 3D Viewer Pro'} onClick=${() => openProModal(label)}></button>
	</div>`;
}

/** Hook form for custom controls: const lock = useProGate(); onChange={(v) => lock('Auto Rotate') || apply(v)} */
export function useProGate() {
	const pro = useIsPro();
	return (label) => {
		if (pro) return false;
		openProModal(label);
		return true;
	};
}

export function ProModal() {
	const modal = useBus((s) => s.proModal);
	const ref = useRef(null);
	useEffect(() => {
		if (!modal) return undefined;
		const back = document.activeElement;
		ref.current?.querySelector('.ld-pro-modal__go')?.focus();
		// Esc closes; Tab stays inside the dialog.
		const onKey = (e) => {
			if (e.key === 'Escape') return closeProModal();
			if (e.key !== 'Tab' || !ref.current) return;
			const f = [...ref.current.querySelectorAll('button, a[href]')];
			const i = f.indexOf(document.activeElement);
			if (e.shiftKey && i <= 0) (e.preventDefault(), f[f.length - 1].focus());
			else if (!e.shiftKey && (i === -1 || i === f.length - 1)) (e.preventDefault(), f[0].focus());
		};
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('keydown', onKey);
			if (back?.isConnected) back.focus({ preventScroll: true });
		};
	}, [modal]);
	if (!modal) return null;
	return html`<div class="ld-modal-back" onClick=${(e) => e.target === e.currentTarget && closeProModal()}>
		<div class="ld-pro-modal" role="dialog" aria-modal="true" aria-labelledby="ld-pro-title" aria-describedby="ld-pro-desc" ref=${ref}>
			<button type="button" class="ld-pro-modal__x" aria-label="Close" onClick=${closeProModal}>×</button>
			<div class="ld-pro-modal__lock" aria-hidden="true">
				<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
			</div>
			<h2 id="ld-pro-title" class="ld-pro-modal__eyebrow">Upgrade to PRO</h2>
			<p class="ld-pro-modal__title">Unlock all the pro features with PRO version</p>
			<p id="ld-pro-desc" class="ld-pro-modal__feature">
				${modal.feature && html`<strong>${modal.feature}</strong> is part of 3D Viewer Pro. `}You’re just one step away from using this premium feature. Upgrade your plan to access powerful tools, priority support, and more.
			</p>
			<p class="ld-pro-modal__note">This is a demo, so you can switch to Pro right now. Everything you made stays.</p>
			<div class="ld-pro-modal__acts">
				<button type="button" class="ld-pro-modal__go" onClick=${() => { closeProModal(); setPlan('pro'); }}>Try Pro in this demo</button>
				<a class="ld-pro-modal__ghost" href=${LINKS.pricing} target="_blank" rel="noopener">Upgrade to Pro <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg></a>
			</div>
		</div>
	</div>`;
}

export function Toast() {
	const t = useBus((s) => s.toast);
	return t ? html`<div class="ld-toast" role="status" key=${t.id}>${t.message}</div>` : null;
}
