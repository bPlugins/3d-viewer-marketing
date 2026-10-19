// Personalization (flag decals): the drawer's "Personalize" section and dragging a design on the
// model. Data rules live in shared/decals.js; the engine draws (engine/decals.js). Spec: specs/decals.md.
import { html, useState, useEffect, useRef, cx, money } from '../../core/ui.js';
import { Icon } from '../../shared/icons.js';
import { formatDelta, ruleAmount, ruleRegular } from '../../shared/options.js';
import { DECAL_FONTS, DECAL_ERRORS, decalAreas, decalsOf, areaContent, hasContent, blankContent, decalKey, readImageFile, hiddenAreas } from '../../shared/decals.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pct = (v) => `${Math.round(v * 100)}%`;
const signedPct = (v) => (Math.round(v * 100) > 0 ? '+' : '') + Math.round(v * 100) + '%';

/** The rendered shopper layer plus the designs (the engine reads `decals` from it). */
export function withDecalLayer(base, custom) {
	const d = custom?.decals;
	if (!d || !Object.keys(d).length) return base;
	return { ...(base || {}), decals: d };
}

/** Custom with one area's content replaced (null removes it). */
function patchDecals(custom, id, content) {
	const d = { ...decalsOf(custom) };
	if (content) d[id] = content;
	else delete d[id];
	const next = { ...(custom || {}) };
	if (Object.keys(d).length) next.decals = d;
	else delete next.decals;
	return next;
}

/**
 * Active area, its dashed outline on the model while the drawer is open, and dragging a design on
 * the model (orbit pauses while dragging). Returns { active, setActive }.
 */
export function useDecalDrag({ on, ctl, ready, open, config, custom, setCustom }) {
	const areas = on ? decalAreas(config) : [];
	const [picked, setActive] = useState(null);
	const active = areas.some((a) => a.id === picked) ? picked : areas[0]?.id || null;
	const live = useRef({});
	live.current = { areas, custom, setCustom, setActive };

	useEffect(() => {
		const v = ctl.current;
		if (!ready || !v?.decals) return;
		v.decals.setGuide(on && open ? active : null);
	}, [on, open, active, ready]);
	useEffect(() => () => ctl.current?.decals?.setGuide(null), []);

	useEffect(() => {
		const v = ctl.current;
		if (!on || !open || !ready || !v?.decals) return;
		const el = v.element;
		let drag = null;
		let raf = 0;
		const filledAt = (e) => {
			const hit = v.decals.areaAt(e.clientX, e.clientY);
			if (!hit) return null;
			const area = live.current.areas.find((a) => a.id === hit.id);
			const c = area && areaContent(area, decalsOf(live.current.custom)[hit.id]);
			return area ? { hit, area, c, filled: hasContent(area, c) } : null;
		};
		const down = (e) => {
			if (e.pointerType === 'mouse' && e.button !== 0) return;
			const f = filledAt(e);
			if (!f) return;
			live.current.setActive(f.area.id);
			if (!f.filled) return;
			const start = v.decals.areaCoords(f.area.id, e.clientX, e.clientY);
			if (!start) return;
			e.stopPropagation();
			e.preventDefault();
			drag = { id: f.area.id, area: f.area, start, c: f.c, pointerId: e.pointerId };
			try {
				el.setPointerCapture(e.pointerId);
			} catch {
				// Pointer already released.
			}
			el.style.cursor = 'grabbing';
		};
		const move = (e) => {
			if (!drag) {
				if (e.pointerType !== 'mouse' || raf || e.buttons) return;
				raf = requestAnimationFrame(() => {
					raf = 0;
					el.style.cursor = filledAt(e)?.filled ? 'move' : '';
				});
				return;
			}
			e.stopPropagation();
			const p = v.decals.areaCoords(drag.id, e.clientX, e.clientY);
			if (!p) return;
			const x = clamp(drag.c.x + p.u - drag.start.u, -0.5, 0.5);
			const y = clamp(drag.c.y + p.v - drag.start.v, -0.5, 0.5);
			const { custom: cur, setCustom: set } = live.current;
			set(patchDecals(cur, drag.id, { ...drag.c, x, y }), { label: drag.area.label });
		};
		const up = (e) => {
			if (!drag) return;
			e.stopPropagation();
			try {
				el.releasePointerCapture(drag.pointerId);
			} catch {
				// Already released.
			}
			drag = null;
			el.style.cursor = '';
		};
		el.addEventListener('pointerdown', down, true);
		el.addEventListener('pointermove', move, true);
		el.addEventListener('pointerup', up, true);
		el.addEventListener('pointercancel', up, true);
		return () => {
			cancelAnimationFrame(raf);
			el.style.cursor = '';
			el.removeEventListener('pointerdown', down, true);
			el.removeEventListener('pointermove', move, true);
			el.removeEventListener('pointerup', up, true);
			el.removeEventListener('pointercancel', up, true);
		};
	}, [on, open, ready]);

	return { active, setActive };
}

function Badge({ amount, regular }) {
	const was = regular != null && regular !== amount ? formatDelta(regular) : '';
	if (!amount && !was) return null;
	return html`<span class="wc3d-customer-drawer__price">${was && html`<del>${was}</del>`}<span>${formatDelta(amount) || money(0)}</span></span>`;
}

function Range({ id, label, value, min, max, step = 0.01, format, onInput }) {
	return html`<div class="wc3d-decal__range">
		<label for=${id} class="wc3d-decal__range-label">${label}</label>
		<input id=${id} type="range" min=${min} max=${max} step=${step} value=${value} onInput=${(e) => onInput(Number(e.currentTarget.value))} />
		<output for=${id} class="wc3d-decal__range-value">${format(value)}</output>
	</div>`;
}

function DecalArea({ area, raw, pricing, base, active, hidden, onActivate, onChange }) {
	const uid = 'wc3d-decal-' + String(area.id).replace(/[^A-Za-z0-9_-]/g, '');
	const c = areaContent(area, raw) || blankContent(area);
	const filled = hasContent(area, c);
	const [error, setError] = useState('');
	const fileRef = useRef(null);
	const update = (patch) => onChange({ ...c, ...patch });
	const amount = pricing ? ruleAmount(area.price, base) : 0;
	const regular = pricing ? ruleRegular(area.price, base) : null;

	const upload = (e) => {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		setError('');
		readImageFile(file).then(
			({ image, name }) => update({ kind: 'image', image, name }),
			(msg) => setError(typeof msg === 'string' ? msg : DECAL_ERRORS.read)
		);
	};

	// The area's mesh is hidden by a part choice: kept for when it shows again, not charged or stored.
	if (hidden) {
		return html`<div class="wc3d-customer-drawer__item wc3d-decal is-hidden" data-wc3d-group=${decalKey(area.id)}>
			<div class="wc3d-customer-drawer__item-label"><span>${area.label}</span></div>
			<p class="wc3d-decal__help">Not used while ${area.mesh.replace(/_/g, ' ')} is hidden.</p>
		</div>`;
	}

	return html`<div class=${cx('wc3d-customer-drawer__item wc3d-decal', active && 'is-active')} data-wc3d-group=${decalKey(area.id)} onFocusIn=${onActivate} onPointerDown=${onActivate}>
		<div class="wc3d-customer-drawer__item-label">
			<span id=${uid + '-label'}>${area.label}${area.required && html`<span class="wc3d-customer-drawer__required" aria-hidden="true">${' *'}</span>`}</span>
			<span class="wc3d-decal__head-end">
				${pricing && html`<${Badge} amount=${amount} regular=${regular} />`}
				${raw && html`<button type="button" onClick=${() => (setError(''), onChange(null))} class="wc3d-customer-drawer__reset-item-btn" title="Reset to default" aria-label=${`Clear ${area.label}`}><${Icon} name="sf-reset" /></button>`}
			</span>
		</div>

		${area.kinds.length > 1 &&
		html`<div class="wc3d-customer-drawer__pills wc3d-decal__kinds" role="radiogroup" aria-label=${`${area.label}: type`}>
			${area.kinds.map(
				(k) => html`<button key=${k} type="button" role="radio" aria-checked=${c.kind === k ? 'true' : 'false'} class=${cx('wc3d-customer-drawer__pill', c.kind === k && 'active')} onClick=${() => update({ kind: k })}>
					${k === 'text' ? 'Text' : 'Image'}
				</button>`
			)}
		</div>`}

		${c.kind === 'text'
			? html`<div class="wc3d-decal__fields">
					<div class="wc3d-decal__text">
						<input
							id=${uid + '-text'}
							type="text"
							class="wc3d-decal__input"
							placeholder="Your text"
							maxlength=${area.max_chars}
							value=${c.text}
							aria-labelledby=${uid + '-label'}
							aria-describedby=${uid + '-count'}
							aria-required=${area.required ? 'true' : undefined}
							onInput=${(e) => update({ text: e.currentTarget.value })}
						/>
						<span id=${uid + '-count'} class=${cx('wc3d-decal__counter', c.text.length >= area.max_chars && 'is-full')}>${c.text.length}/${area.max_chars}</span>
					</div>
					${area.fonts.length > 1 &&
					html`<div>
						<label for=${uid + '-font'} class="wc3d-decal__label">Font</label>
						<select id=${uid + '-font'} class="wc3d-customer-drawer__select" value=${c.font} style=${{ fontFamily: DECAL_FONTS[c.font] }} onChange=${(e) => update({ font: e.currentTarget.value })}>
							${area.fonts.map((f) => html`<option key=${f} value=${f} style=${{ fontFamily: DECAL_FONTS[f] }}>${f}</option>`)}
						</select>
					</div>`}
					${area.colors.length > 1 &&
					html`<div>
						<span id=${uid + '-color'} class="wc3d-decal__label">Color</span>
						<div class="wc3d-customer-drawer__colors-grid" role="radiogroup" aria-labelledby=${uid + '-color'}>
							${area.colors.map(
								(hex) => html`<button
									key=${hex}
									type="button"
									role="radio"
									aria-checked=${c.color === hex ? 'true' : 'false'}
									aria-label=${hex}
									title=${hex}
									class=${cx('wc3d-customer-drawer__color-bubble', c.color === hex && 'active')}
									style=${{ backgroundColor: hex }}
									onClick=${() => update({ color: hex })}
								></button>`
							)}
						</div>
					</div>`}
				</div>`
			: html`<div class="wc3d-decal__fields">
					${c.image &&
					html`<div class="wc3d-decal__file">
						<img class="wc3d-decal__file-img" src=${c.image} alt="" />
						<span class="wc3d-decal__file-name" title=${c.name}>${c.name}</span>
						<button type="button" class="wc3d-decal__link" onClick=${() => update({ image: undefined, name: undefined })}>Remove</button>
					</div>`}
					<label class="wc3d-decal__upload">
						<input ref=${fileRef} type="file" accept="image/png,image/jpeg,image/webp" class="wc3d-decal__file-input" aria-describedby=${uid + '-help'} onChange=${upload} />
						<${Icon} name="upload" size=${14} />
						<span>${c.image ? 'Replace image' : 'Upload image'}</span>
					</label>
					<p id=${uid + '-help'} class="wc3d-decal__help">PNG, JPG or WEBP, up to 5 MB.</p>
					${error && html`<p class="wc3d-decal__error" role="alert">${error}</p>`}
				</div>`}

		${filled &&
		html`<div class="wc3d-decal__adjust">
			${area.min_size < area.max_size && html`<${Range} id=${uid + '-size'} label="Size" min=${area.min_size} max=${area.max_size} value=${c.size} format=${pct} onInput=${(size) => update({ size })} />`}
			<${Range} id=${uid + '-rot'} label="Rotate" min=${-180} max=${180} step=${1} value=${c.rotation} format=${(v) => `${Math.round(v)}°`} onInput=${(rotation) => update({ rotation })} />
			<${Range} id=${uid + '-x'} label="Horizontal" min=${-0.5} max=${0.5} value=${c.x} format=${signedPct} onInput=${(x) => update({ x })} />
			<${Range} id=${uid + '-y'} label="Vertical" min=${-0.5} max=${0.5} value=${c.y} format=${signedPct} onInput=${(y) => update({ y })} />
			<div class="wc3d-decal__adjust-foot">
				<span class="wc3d-decal__help">Drag your design on the model to move it.</span>
				<button type="button" class="wc3d-decal__link" disabled=${!c.x && !c.y && !c.rotation && c.size === area.max_size} onClick=${() => update({ x: 0, y: 0, rotation: 0, size: area.max_size })}>Reset position</button>
			</div>
		</div>`}
	</div>`;
}

/** Drawer section: one block per area of the config. */
export function DecalSections({ config, custom, setCustom, pricing, base, ui }) {
	const areas = decalAreas(config);
	if (!areas.length) return null;
	const d = decalsOf(custom);
	const hidden = hiddenAreas(config, custom);
	return html`<div class="wc3d-customer-drawer__section wc3d-decals">
		<h5 class="wc3d-customer-drawer__section-title">Personalize</h5>
		${areas.map(
			(a) => html`<${DecalArea}
				key=${a.id}
				area=${a}
				raw=${d[a.id] || null}
				pricing=${pricing}
				base=${base}
				active=${ui?.active === a.id}
				hidden=${hidden.has(a.id)}
				onActivate=${() => ui?.setActive(a.id)}
				onChange=${(next) => setCustom(patchDecals(custom, a.id, next), { label: a.label })}
			/>`
		)}
	</div>`;
}
