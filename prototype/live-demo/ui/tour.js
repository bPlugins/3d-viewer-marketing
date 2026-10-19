// Tour runner: a step card next to a real element, with a highlight ring and a dimmed backdrop.
// State lives on the bus (bus.tour = { id, index, dir, run }); tours are defined in core/tours.js.
import { html, render, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { go } from '../../js/core/router.js';
import { bus, useBus } from '../core/bus.js';
import { TOURS } from '../core/tours.js';

const DOCK = '(max-width: 600px)';
const PAD = 6;
const GAP = 14;
const WAIT_MS = 5000;
let run = 0;

const docked = () => typeof matchMedia === 'function' && matchMedia(DOCK).matches;
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function startTour(id) {
	if (!TOURS.some((t) => t.id === id)) return;
	bus.set({ tour: { id, index: 0, dir: 1, run: ++run } });
}

export function endTour() {
	if (!bus.get().tour) return;
	bus.set({ tour: null });
	const opener = [...document.querySelectorAll('.ld-bar button')].find((b) => /tour/i.test(b.textContent));
	opener?.focus({ preventScroll: true });
}

function moveTo(index, dir) {
	const cur = bus.get().tour;
	if (cur) bus.set({ tour: { ...cur, index, dir, run: ++run } });
}

/** Visible and laid out on the page (WP flyout menus park off-screen, the phone menu slides left). */
function shown(el) {
	if (!el?.isConnected) return false;
	const r = el.getBoundingClientRect();
	if (r.width < 1 || r.height < 1) return false;
	if (r.right <= 0 || r.left >= innerWidth || r.top + scrollY < -3000) return false;
	return getComputedStyle(el).visibility !== 'hidden';
}

/** step.target: selector, list of selectors (first visible wins) or a function returning either or an element. */
export function resolveTarget(target) {
	let t = typeof target === 'function' ? target() : target;
	if (!t) return null;
	if (t instanceof Element) return shown(t) ? t : null;
	for (const sel of [].concat(t)) {
		if (sel instanceof Element) {
			if (shown(sel)) return sel;
			continue;
		}
		const el = [...document.querySelectorAll(sel)].find(shown);
		if (el) return el;
	}
	return null;
}

const routeMatches = (token, keep) => {
	const now = location.hash.replace(/^#/, '') || 'wp.dashboard';
	return keep ? keep.test(now) : now === token;
};

/** Bottom edge of sticky/fixed bars (demo bar, WP admin bar, editor top bars) the target must clear. */
function safeTop() {
	let top = 0;
	for (const el of document.querySelectorAll('.ld-bar, .wpa-bar, .ld-be-header, .wc3d-topbar')) {
		const pos = getComputedStyle(el).position;
		if (pos !== 'fixed' && pos !== 'sticky') continue;
		const r = el.getBoundingClientRect();
		if (r.height && r.top < 200) top = Math.max(top, r.bottom);
	}
	return top + 8;
}

/** Nearest ancestor that scrolls vertically (editor sidebars, modal panels), or null for the page. */
function scroller(el) {
	for (let n = el.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
		const oy = getComputedStyle(n).overflowY;
		if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n;
	}
	return null;
}

/** Scrolls the target into the free part of the screen: centred if it fits, else top-aligned. */
function reveal(el, cardH, dockTop) {
	const behavior = reduced() ? 'auto' : 'smooth';
	const top = docked() && dockTop ? Math.max(safeTop(), cardH + 24) : safeTop();
	const bottom = innerHeight - (docked() && !dockTop ? cardH + 24 : 8);
	const into = (r, lo, hi) => (r.height >= hi - lo ? 8 : (hi - lo - r.height) / 2);
	const box = scroller(el);
	if (box) {
		const cr = box.getBoundingClientRect();
		const r = el.getBoundingClientRect();
		const lo = Math.max(cr.top, top);
		const hi = Math.min(cr.bottom, bottom);
		if (r.top < lo || r.bottom > hi) box.scrollTo({ top: box.scrollTop + r.top - lo - into(r, lo, hi), behavior });
		el = box;
	}
	const r = el.getBoundingClientRect();
	if ((r.top >= top && r.bottom <= bottom) || (box && r.top < bottom && r.bottom > top)) return;
	window.scrollTo({ top: scrollY + r.top - top - into(r, top, bottom), behavior });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let mount = null;
/** Renders the tour into its own body-level root, so it stays above (and outside) every screen. */
export function TourHost() {
	useEffect(() => {
		if (!mount) {
			mount = document.createElement('div');
			mount.className = 'ld-tour-root';
			document.body.appendChild(mount);
			// The customizer modal marks every other body child inert; the tour has to stay usable over it.
			new MutationObserver(() => mount.inert && (mount.inert = false)).observe(mount, { attributes: true, attributeFilter: ['inert'] });
		}
		// Outside this effect flush: Preact drops effects queued by a render() made during one.
		setTimeout(() => render(html`<${TourRoot} />`, mount));
	}, []);
	return null;
}

function TourRoot() {
	const tour = useBus((s) => s.tour);
	const def = tour && TOURS.find((t) => t.id === tour.id);
	if (!def) return null;
	return html`<${Step} key=${tour.run} def=${def} index=${tour.index} dir=${tour.dir} />`;
}

function Step({ def, index, dir }) {
	const steps = def.steps;
	const step = steps[index];
	const last = index === steps.length - 1;
	// prep → wait (target loading) → show | missing (no target after WAIT_MS)
	const [phase, setPhase] = useState('prep');
	const [slow, setSlow] = useState(false);
	const [lost, setLost] = useState(false);
	const [busy, setBusy] = useState(false);
	const [atTop, setAtTop] = useState(step.dock === 'top');
	const el = useRef(null);
	const card = useRef(null);
	const parts = useRef({});
	const leaving = useRef(false);

	const next = async () => {
		if (leaving.current) return;
		leaving.current = true;
		setBusy(true);
		try {
			await step.leave?.();
		} catch {
			// A failed helper must not trap the visitor in the tour.
		}
		if (last) endTour();
		else moveTo(index + 1, 1);
	};
	const back = () => index > 0 && moveTo(index - 1, -1);

	// Enter the step: skip, route, before(), then wait for the target.
	useEffect(() => {
		let live = true;
		(async () => {
			if (step.skip?.()) {
				const to = index + (dir < 0 ? -1 : 1);
				if (to < 0) moveTo(index + 1, 1);
				else if (to >= steps.length) endTour();
				else moveTo(to, dir);
				return;
			}
			const route = typeof step.route === 'function' ? step.route() : step.route;
			if (route && !routeMatches(route, step.keep)) go(route);
			try {
				await step.before?.();
			} catch {
				// Keep going; the card explains when the target is missing.
			}
			if (!live) return;
			setPhase('wait');
			const t0 = Date.now();
			let found = null;
			while (live && !(found = resolveTarget(step.target)) && Date.now() - t0 < WAIT_MS) {
				if (Date.now() - t0 > 600) setSlow(true);
				await sleep(100);
			}
			if (!live) return;
			el.current = found;
			if (found) reveal(found, card.current?.offsetHeight || 0, step.dock === 'top');
			setPhase(found ? 'show' : 'missing');
		})();
		return () => (live = false);
	}, []);

	// Focus the card once it is placed, so keyboard and screen reader users land on it.
	useEffect(() => {
		if (phase === 'show' || phase === 'missing') card.current?.focus({ preventScroll: true });
	}, [phase]);

	// Follow the target every frame (scrolling, layout shifts, re-renders) and poll doneWhen.
	useEffect(() => {
		if (phase !== 'show' && phase !== 'missing') return undefined;
		let raf = 0;
		let lastPoll = 0;
		let goneSince = 0;
		let doneWasFalse = false;
		const tick = (now) => {
			raf = requestAnimationFrame(tick);
			if (now - lastPoll > 200) {
				lastPoll = now;
				if (!shown(el.current)) {
					el.current = resolveTarget(step.target);
					if (el.current) reveal(el.current, card.current?.offsetHeight || 0, step.dock === 'top');
				}
				if (step.doneWhen) {
					const done = !!step.doneWhen();
					if (!done) doneWasFalse = true;
					else if (doneWasFalse) return void next();
				}
			}
			const r = el.current ? el.current.getBoundingClientRect() : null;
			if (!r) goneSince ||= now;
			else goneSince = 0;
			setLost(!!goneSince && now - goneSince > 1000);
			place(r);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [phase]);

	// advanceOn: a click on a matching element moves to the next step once the click has run.
	useEffect(() => {
		if (!step.advanceOn) return undefined;
		const on = (e) => e.target.closest?.(step.advanceOn) && setTimeout(next, 60);
		document.addEventListener('click', on, true);
		return () => document.removeEventListener('click', on, true);
	}, []);

	// Esc ends the tour anywhere; arrows page through it while focus is on the card.
	useEffect(() => {
		const on = (e) => {
			const inCard = card.current?.contains(e.target);
			if (e.key === 'Escape') {
				if (inCard) e.stopPropagation();
				endTour();
			} else if (inCard && e.key === 'ArrowRight' && !busy) {
				e.preventDefault();
				next();
			} else if (inCard && e.key === 'ArrowLeft') {
				e.preventDefault();
				back();
			}
		};
		document.addEventListener('keydown', on, true);
		return () => document.removeEventListener('keydown', on, true);
	});

	function place(r) {
		const p = parts.current;
		if (!p.top) return;
		const vw = innerWidth;
		const vh = innerHeight;
		let x = 0;
		let y = 0;
		let w = 0;
		let h = 0;
		if (r) {
			x = Math.max(0, r.left - PAD);
			y = Math.max(0, r.top - PAD);
			w = Math.max(0, Math.min(vw, r.right + PAD) - x);
			h = Math.max(0, Math.min(vh, r.bottom + PAD) - y);
		}
		const has = !!r && w > 0 && h > 0;
		const box = (n, l, t, bw, bh) => (n.style.cssText = `left:${l}px;top:${t}px;width:${Math.max(0, bw)}px;height:${Math.max(0, bh)}px`);
		if (!has) {
			box(p.top, 0, 0, vw, vh);
			box(p.bottom, 0, 0, 0, 0);
			box(p.left, 0, 0, 0, 0);
			box(p.right, 0, 0, 0, 0);
			box(p.hole, 0, 0, 0, 0);
			p.ring.style.display = 'none';
		} else {
			box(p.top, 0, 0, vw, y);
			box(p.bottom, 0, y + h, vw, vh - y - h);
			box(p.left, 0, y, x, h);
			box(p.right, x + w, y, vw - x - w, h);
			if (step.click) box(p.hole, 0, 0, 0, 0);
			else box(p.hole, x, y, w, h);
			p.ring.style.display = '';
			box(p.ring, x, y, w, h);
		}
		const c = card.current;
		if (!c) return;
		// Phones: dock at the top when the target sits low and the page cannot scroll it clear of the card.
		if (docked()) return setAtTop(step.dock === 'top' || (has && y > vh * 0.45 && y + h > vh - c.offsetHeight - 16));
		const cw = c.offsetWidth;
		const ch = c.offsetHeight;
		let cx_ = (vw - cw) / 2;
		let cy = (vh - ch) / 2;
		if (has) {
			const clampY = (v) => Math.min(Math.max(8, v), vh - ch - 8);
			const clampX = (v) => Math.min(Math.max(8, v), vw - cw - 8);
			if (x + w + GAP + cw <= vw - 8) (cx_ = x + w + GAP), (cy = clampY(y));
			else if (x - GAP - cw >= 8) (cx_ = x - GAP - cw), (cy = clampY(y));
			else if (y + h + GAP + ch <= vh - 8) (cx_ = clampX(x)), (cy = y + h + GAP);
			else if (y - GAP - ch >= 8) (cx_ = clampX(x)), (cy = y - GAP - ch);
			// No room outside the target: sit inside it, bottom-left unless the step says otherwise.
			else (cx_ = step.place === 'right' ? vw - cw - 16 : 16), (cy = vh - ch - 16);
		}
		c.style.left = Math.round(cx_) + 'px';
		c.style.top = Math.round(cy) + 'px';
	}

	const title = typeof step.title === 'function' ? step.title() : step.title;
	const body = typeof step.body === 'function' ? step.body() : step.body;
	const visible = phase === 'show' || phase === 'missing' || slow;
	const note = phase === 'missing' || (phase === 'show' && lost) ? 'This part of the screen is not showing right now. Press Next to carry on.' : phase !== 'show' && slow ? 'Loading the screen…' : '';
	const ref = (k) => (n) => (parts.current[k] = n);
	const keep = (e) => e.preventDefault(); // a click on the backdrop leaves focus on the card
	const id = 'ld-tour-' + def.id + '-' + index;

	return html`<div class=${cx('ld-tour', step.click && 'ld-tour--click')} data-tour-step=${index + 1}>
		<div class="ld-tour-dim" ref=${ref('top')} onMouseDown=${keep}></div>
		<div class="ld-tour-dim" ref=${ref('bottom')} onMouseDown=${keep}></div>
		<div class="ld-tour-dim" ref=${ref('left')} onMouseDown=${keep}></div>
		<div class="ld-tour-dim" ref=${ref('right')} onMouseDown=${keep}></div>
		<div class="ld-tour-hole" ref=${ref('hole')} onMouseDown=${keep}></div>
		<div class="ld-tour-ring" ref=${ref('ring')} style="display:none" aria-hidden="true"></div>
		<section
			ref=${card}
			class=${cx('ld-tour-card', visible && 'is-in', (phase === 'prep' || phase === 'wait') && 'is-wait', atTop && 'is-top')}
			role="dialog"
			aria-modal="false"
			aria-labelledby=${id + '-t'}
			aria-describedby=${id + '-b'}
			tabindex="-1"
		>
			<div aria-live="polite" aria-atomic="true">
				<p class="ld-tour-card__count">${def.title} · Step ${index + 1} of ${steps.length}</p>
				<h2 class="ld-tour-card__title" id=${id + '-t'}>${title}</h2>
				<p class="ld-tour-card__body" id=${id + '-b'}>${body}</p>
				${note && html`<p class="ld-tour-card__note">${note}</p>`}
			</div>
			<div class="ld-tour-card__acts">
				${!last && html`<button type="button" class="ld-tour-card__skip" onClick=${endTour}>Skip tour</button>`}
				<span class="ld-tour-card__sp"></span>
				${index > 0 && html`<button type="button" class="ld-tour-btn" onClick=${back}>Back</button>`}
				<button type="button" class="ld-tour-btn ld-tour-btn--primary" disabled=${busy} onClick=${next}>${last ? 'Done' : 'Next'}</button>
			</div>
		</section>
	</div>`;
}
