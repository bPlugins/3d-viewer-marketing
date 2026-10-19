// Shopper customizer (app block "3D Configurator"): option groups, personalization, plain colours,
// undo/redo, price box, plus the modal and drawer layouts. State lives in the product page.
import { html, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { money, moneyDelta, effectiveFor, visibleGroups, resolvedPicks, shopperLayer, ruleAmount, priceSummary, variantsOf } from '../core/commerce.js';
import { StoreViewer } from '../ui/viewer.js';
import { Icon } from '../ui/icons.js';
import { SfModal, SfDrawer, QtyStepper } from './theme.js';

export const EMPTY = { options: {}, decals: {} };
const DECAL_FONT_CSS = { Georgia: 'Georgia, serif', 'Times New Roman': '"Times New Roman", serif', Arial: 'Arial, sans-serif', Inter: 'Inter, sans-serif', Verdana: 'Verdana, sans-serif', 'Courier New': '"Courier New", monospace' };

/* ---------- shopper undo/redo (module undo-redo, 50 steps) ---------- */

export function useHistory(initial) {
	const [h, setH] = useState(() => ({ past: [], present: initial, future: [], merge: null }));
	const set = (next, mergeKey = null) =>
		setH((x) => {
			const value = typeof next === 'function' ? next(x.present) : next;
			if (JSON.stringify(value) === JSON.stringify(x.present)) return x;
			// Typing in one field folds into a single step.
			if (mergeKey && mergeKey === x.merge) return { ...x, present: value };
			return { past: [...x.past, x.present].slice(-50), present: value, future: [], merge: mergeKey };
		});
	return {
		value: h.present,
		set,
		canUndo: h.past.length > 0,
		canRedo: h.future.length > 0,
		undo: () => setH((x) => (x.past.length ? { past: x.past.slice(0, -1), present: x.past[x.past.length - 1], future: [x.present, ...x.future], merge: null } : x)),
		redo: () => setH((x) => (x.future.length ? { past: [...x.past, x.present], present: x.future[0], future: x.future.slice(1), merge: null } : x)),
		reset: (v = EMPTY) => setH((x) => ({ past: [...x.past, x.present].slice(-50), present: v, future: [], merge: null })),
		replace: (v) => setH({ past: [], present: v, future: [], merge: null }),
	};
}

/** Choices as the cart/server would keep them: hidden groups, stale picks and decals on hidden parts drop out. */
export function cleanChoices(s, pid, vid, choices) {
	const cfg = effectiveFor(s, pid, vid);
	const vo = s.variants[vid]?.options;
	const groups = visibleGroups(cfg, choices, vo);
	const options = {};
	for (const [gid, cid] of Object.entries(choices?.options || {})) if (groups.find((g) => g.id === gid)?.choices.some((c) => c.id === cid)) options[gid] = cid;
	const layer = shopperLayer(cfg, { options, parts: choices?.parts }, vo);
	const decals = {};
	if (s.app.modules.personalization)
		for (const a of cfg.decals || []) {
			const d = choices?.decals?.[a.id];
			if (d && String(d.text || '').trim() && layer.meshes[a.mesh]?.visible !== false) decals[a.id] = { ...d, text: String(d.text).trim() };
		}
	const out = { options, decals };
	if (choices?.colors && Object.keys(choices.colors).length) out.colors = { ...choices.colors };
	if (choices?.parts && Object.keys(choices.parts).length) out.parts = { ...choices.parts };
	return out;
}

export const isCustomized = (c) => !!c && ['options', 'decals', 'colors', 'parts'].some((k) => Object.keys(c[k] || {}).length);

/** Everything the customizer UI needs, derived once per render. */
export function customizerContext(s, pid, vid, hist) {
	const cfg = effectiveFor(s, pid, vid);
	const variant = s.variants[vid];
	const clean = cleanChoices(s, pid, vid, hist.value);
	const grouped = !!s.app.modules['option-groups'] && (cfg.options || []).length > 0;
	return {
		s,
		pid,
		vid,
		cfg,
		variant,
		product: s.products[pid],
		hist,
		choices: hist.value,
		clean,
		grouped,
		custom: shopperLayer(cfg, clean, variant?.options),
		sum: priceSummary(s, pid, vid, clean),
	};
}

/* ---------- pieces ---------- */

function ChoicePrice({ amount, regular }) {
	if (!amount && regular == null) return null;
	return html`<span class="sf-cz__price">${regular != null && regular !== amount ? html`<del>${moneyDelta(regular)}</del>` : null}<span class=${cx(regular != null && 'is-sale')}>${moneyDelta(amount)}</span></span>`;
}

const swatchOf = (g, c) => (g.type === 'material' ? c.material?.baseColor || c.color : c.color) || '';

function GroupSection({ g, picked, base, onPick, missing }) {
	const amount = (c) => ruleAmount(c.price, base);
	const regular = (c) => (c.price?.sale != null ? ruleAmount({ ...c.price, sale: undefined }, base) : null);
	const label = (c) => (amount(c) ? `${c.label}, ${moneyDelta(amount(c))}` : c.label);
	const id = 'sf-g-' + g.id;
	const radio = (c, cls, body, style) => html`<button type="button" role="radio" aria-checked=${String(picked?.id === c.id)} aria-label=${label(c)} title=${label(c)} class=${cx(cls, picked?.id === c.id && 'is-on')} style=${style} onClick=${() => onPick(c.id)}>${body}</button>`;
	let body;
	if (g.display === 'dropdown') {
		body = html`<div class="sf-select"><select aria-labelledby=${id} value=${picked?.id || ''} onChange=${(e) => onPick(e.target.value)}>
			${!picked ? html`<option value="">Choose an option</option>` : null}
			${g.choices.map((c) => html`<option value=${c.id} selected=${picked?.id === c.id}>${amount(c) ? `${c.label} (${moneyDelta(amount(c))})` : c.label}</option>`)}
		</select><${Icon} name="chevronDown" size=${16} /></div>`;
	} else if (g.display === 'thumbnail') {
		body = html`<div class="sf-cz__thumbs" role="radiogroup" aria-labelledby=${id}>${g.choices.map((c) =>
			radio(c, 'sf-cz__thumb', html`<span class="sf-cz__ball" style=${{ '--c': swatchOf(g, c) || '#ccc' }}></span><span class="sf-cz__thumb-label">${c.label}</span><${ChoicePrice} amount=${amount(c)} regular=${regular(c)} />`),
		)}</div>`;
	} else if (g.display === 'button') {
		body = html`<div class="sf-cz__pills" role="radiogroup" aria-labelledby=${id}>${g.choices.map((c) =>
			radio(c, 'sf-cz__pill', html`${swatchOf(g, c) ? html`<span class="sf-dot" style=${{ background: swatchOf(g, c) }}></span>` : null}<span>${c.label}</span><${ChoicePrice} amount=${amount(c)} regular=${regular(c)} />`),
		)}</div>`;
	} else {
		body = html`<div class="sf-cz__swatches" role="radiogroup" aria-labelledby=${id}>${g.choices.map((c) =>
			html`<div class="sf-cz__swatch">${radio(c, 'sf-cz__dot', null, { background: swatchOf(g, c) || '#ccc' })}<${ChoicePrice} amount=${amount(c)} regular=${regular(c)} /></div>`,
		)}</div>`;
	}
	return html`<section class=${cx('sf-cz__group', missing && 'is-missing')} data-group=${g.id}>
		<h3 class="sf-cz__label" id=${id}>${g.label}${g.required ? html`<span class="sf-req" aria-label="required"> *</span>` : null}${picked ? html`<span class="sf-cz__value"> · ${picked.label}</span>` : null}</h3>
		${g.description ? html`<p class="sf-cz__desc">${g.description}</p>` : null}
		${body}
		${missing ? html`<p class="sf-cz__err" role="alert">Choose a ${g.label.toLowerCase()}.</p>` : null}
	</section>`;
}

function DecalArea({ area, value, disabled, disabledNote, base, onChange }) {
	const d = value || {};
	const text = d.text || '';
	const font = d.font || area.fonts?.[0] || 'Georgia';
	const color = d.color || area.colors?.[0] || '#111827';
	const set = (patch, key) => onChange({ kind: 'text', size: area.max_size || 1, x: 0, y: 0, rotation: 0, text, font, color, ...patch }, key);
	const id = 'sf-decal-' + area.id;
	const amount = area.price ? ruleAmount(area.price, base) : 0;
	return html`<section class=${cx('sf-cz__group sf-cz__decal', disabled && 'is-disabled')}>
		<h3 class="sf-cz__label"><label for=${id}>${area.label}</label>${area.required ? html`<span class="sf-req" aria-label="required"> *</span>` : null}${amount ? html`<span class="sf-cz__value"> · ${moneyDelta(amount)} when added</span>` : null}</h3>
		${disabled ? html`<p class="sf-cz__desc">${disabledNote}</p>` : null}
		<div class="sf-cz__textrow">
			<input id=${id} class="sf-input" type="text" value=${text} maxlength=${area.max_chars} disabled=${disabled} placeholder=${area.max_chars <= 3 ? 'e.g. SR' : 'Type your text'} style=${{ fontFamily: DECAL_FONT_CSS[font] || font }} onInput=${(e) => set({ text: e.target.value }, 'decal-text-' + area.id)} />
			<span class="sf-cz__count" aria-live="polite">${text.length}/${area.max_chars}</span>
		</div>
		${(area.fonts || []).length > 1
			? html`<div class="sf-cz__fontrow">
					<label class="sf-small sf-muted" for=${id + '-font'}>Font</label>
					<div class="sf-select sf-select--sm"><select id=${id + '-font'} disabled=${disabled} value=${font} onChange=${(e) => set({ font: e.target.value })}>${area.fonts.map((f) => html`<option value=${f} selected=${f === font}>${f}</option>`)}</select><${Icon} name="chevronDown" size=${14} /></div>
				</div>`
			: null}
		<div class="sf-cz__swatches sf-cz__swatches--sm" role="radiogroup" aria-label=${`${area.label} colour`}>
			${(area.colors || []).map((c) => html`<button type="button" role="radio" disabled=${disabled} aria-checked=${String(c === color)} aria-label=${c} title=${c} class=${cx('sf-cz__dot', c === color && 'is-on')} style=${{ background: c }} onClick=${() => set({ color: c })}></button>`)}
			${text ? html`<button type="button" class="sf-link sf-small" disabled=${disabled} onClick=${() => onChange(null)}>Clear</button>` : null}
		</div>
	</section>`;
}

function PlainCustomizer({ ctx, setChoices, palette }) {
	const meshes = Object.entries(ctx.cfg.meshes || {});
	const colorable = meshes.filter(([, m]) => m.customizable);
	const optional = meshes.filter(([, m]) => m.optional);
	if (!colorable.length && !optional.length) return null;
	const c = ctx.choices;
	return html`
		${colorable.map(([name, m]) => {
			const cur = c.colors?.[name] || ctx.cfg.materials?.[name]?.baseColor || '#cccccc';
			const pick = (hex, key) => setChoices({ ...c, colors: { ...(c.colors || {}), [name]: hex } }, key);
			return html`<section class="sf-cz__group">
				<h3 class="sf-cz__label">${m.label || name.replace(/_/g, ' ')}<span class="sf-cz__value"> · ${cur}</span></h3>
				<div class="sf-cz__swatches" role="radiogroup" aria-label=${m.label || name}>
					${palette.map((hex) => html`<button type="button" role="radio" aria-checked=${String(hex === cur)} aria-label=${hex} title=${hex} class=${cx('sf-cz__dot', hex === cur && 'is-on')} style=${{ background: hex }} onClick=${() => pick(hex)}></button>`)}
					<label class="sf-cz__free" title="Any colour"><input type="color" value=${cur} aria-label=${`Any colour for ${m.label || name}`} onInput=${(e) => pick(e.target.value, 'color-' + name)} /><${Icon} name="palette" size=${16} /></label>
				</div>
			</section>`;
		})}
		${optional.length
			? html`<section class="sf-cz__group">
					<h3 class="sf-cz__label">Parts</h3>
					${optional.map(([name, m]) => {
						const on = c.parts?.[name] ?? true;
						return html`<label class="sf-check"><input type="checkbox" checked=${on} onChange=${(e) => setChoices({ ...c, parts: { ...(c.parts || {}), [name]: e.target.checked } })} /><span>Show ${(m.label || name).toLowerCase()}</span></label>`;
					})}
				</section>`
			: null}
	`;
}

/** Product / Options / Total, with each add-on line. */
export function PriceBox({ sum, compact }) {
	return html`<div class=${cx('sf-pricebox', compact && 'sf-pricebox--compact')} aria-live="polite">
		<div class="sf-sumrow"><span>Product</span><span>${money(sum.base)}</span></div>
		${!compact && sum.lines.length
			? html`<ul class="sf-pricebox__lines">${sum.lines.map((l) => html`<li><span>${l.label}</span><span>${l.regular != null && l.regular !== l.amount ? html`<del>${moneyDelta(l.regular)}</del> ` : null}${moneyDelta(l.amount)}</span></li>`)}</ul>`
			: null}
		<div class="sf-sumrow"><span>Options</span><span>${sum.addons ? moneyDelta(sum.addons) : money(0)}</span></div>
		<div class="sf-sumrow sf-sumrow--total"><span>Total</span><strong>${money(sum.total)}</strong></div>
	</div>`;
}

/** Shopify-style pill buttons per product option. */
export function VariantPicker({ s, product, variant, onVariant, idPrefix = 'sf-opt' }) {
	if (!product.options?.length) return null;
	const vs = variantsOf(s, product.id);
	const choose = (name, value) => {
		const want = { ...(variant?.options || {}), [name]: value };
		const v = vs.find((x) => product.options.every((o) => x.options[o.name] === want[o.name])) || vs.find((x) => x.options[name] === value);
		if (v) onVariant(v.id);
	};
	return html`${product.options.map((o) => html`<fieldset class="sf-variant">
		<legend class="sf-cz__label">${o.name}<span class="sf-cz__value"> · ${variant?.options[o.name]}</span></legend>
		<div class="sf-variant__pills">
			${o.values.map((val) => {
				const v = vs.find((x) => x.options[o.name] === val);
				const on = variant?.options[o.name] === val;
				return html`<label class=${cx('sf-variant__pill', on && 'is-on')}>
					<input type="radio" class="sf-visually-hidden" name=${`${idPrefix}-${product.id}-${o.name}`} checked=${on} onChange=${() => choose(o.name, val)} />
					${v?.swatch && o.name === 'Color' ? html`<span class="sf-dot" style=${{ background: v.swatch }}></span>` : null}${val}
				</label>`;
			})}
		</div>
	</fieldset>`)}`;
}

/** All option controls for the current product (groups → decals → plain fallback). */
export function CustomizerBody({ ctx, setChoices, showMissing }) {
	const { s, cfg, variant, choices } = ctx;
	const base = ctx.sum.base;
	const vo = variant?.options;
	const groups = ctx.grouped ? visibleGroups(cfg, choices, vo) : [];
	const picks = ctx.grouped ? resolvedPicks(cfg, choices, vo) : {};
	const hiddenGroups = ctx.grouped && s.app.modules['conditional-logic'] ? (cfg.options || []).filter((g) => !groups.find((x) => x.id === g.id)) : [];
	const pick = (gid, cid) => setChoices({ ...choices, options: { ...(choices.options || {}), [gid]: cid } });
	const areas = s.app.modules.personalization ? cfg.decals || [] : [];
	const layer = shopperLayer(cfg, { options: ctx.clean.options, parts: choices.parts }, vo);
	const missing = showMissing || [];
	return html`<div class="sf-cz">
		${groups.map((g) => {
			const full = (cfg.options || []).find((x) => x.id === g.id);
			const fewer = full && full.choices.length > g.choices.length;
			return html`<div key=${g.id}>
				<${GroupSection} g=${g} picked=${choices.options?.[g.id] || g.default ? picks[g.id] : null} base=${base} onPick=${(cid) => pick(g.id, cid)} missing=${missing.includes(g.label)} />
				${fewer ? html`<p class="sf-cz__note"><${Icon} name="info" size=${14} /> More choices with other ${Object.keys(vo || {}).join(' / ').toLowerCase() || 'options'}.</p>` : null}
			</div>`;
		})}
		${hiddenGroups.map((g) => html`<p key=${g.id} class="sf-cz__note sf-cz__note--hidden"><${Icon} name="eyeOff" size=${14} /> ${g.label} isn't used with your current choices.</p>`)}
		${areas.map((a) => {
			const hidden = layer.meshes[a.mesh]?.visible === false;
			return html`<${DecalArea} key=${a.id} area=${a} base=${base} value=${choices.decals?.[a.id]} disabled=${hidden} disabledNote=${`Add the ${(cfg.meshes?.[a.mesh]?.label || a.mesh).toLowerCase()} to personalize it.`} onChange=${(d, key) => {
				const decals = { ...(choices.decals || {}) };
				if (d) decals[a.id] = d;
				else delete decals[a.id];
				setChoices({ ...choices, decals }, key);
			}} />`;
		})}
		${!ctx.grouped ? html`<${PlainCustomizer} ctx=${ctx} setChoices=${setChoices} palette=${s.app.settings.palette || []} />` : null}
	</div>`;
}

export function CustomizerTools({ ctx }) {
	const { hist, s } = ctx;
	return html`<div class="sf-cz__tools">
		${s.app.modules['undo-redo']
			? html`<button type="button" class="sf-iconbtn sf-iconbtn--line" onClick=${hist.undo} disabled=${!hist.canUndo} title="Undo (Ctrl+Z)" aria-label="Undo"><${Icon} name="undo" size=${18} /></button>
					<button type="button" class="sf-iconbtn sf-iconbtn--line" onClick=${hist.redo} disabled=${!hist.canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><${Icon} name="redo" size=${18} /></button>`
			: null}
		<button type="button" class="sf-link sf-small" onClick=${() => hist.reset()} disabled=${!isCustomized(ctx.choices)}>Reset</button>
	</div>`;
}

/** Footer line: live total + options delta, with undo/redo/reset. */
function TotalBar({ ctx }) {
	return html`<div class="sf-czbar">
		<div class="sf-czbar__total" aria-live="polite"><span class="sf-small sf-muted">Total</span><strong>${money(ctx.sum.total)}</strong>${ctx.sum.addons ? html`<span class="sf-small sf-muted">incl. options ${moneyDelta(ctx.sum.addons)}</span>` : null}</div>
		<${CustomizerTools} ctx=${ctx} />
	</div>`;
}

function useUndoKeys(on, ctx) {
	const ref = useRef(ctx);
	ref.current = ctx;
	useEffect(() => {
		if (!on) return;
		const f = (e) => {
			if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || !ref.current.s.app.modules['undo-redo']) return;
			if (e.target.closest?.('input[type="text"], textarea')) return;
			e.preventDefault();
			e.shiftKey ? ref.current.hist.redo() : ref.current.hist.undo();
		};
		window.addEventListener('keydown', f);
		return () => window.removeEventListener('keydown', f);
	}, [on]);
}

function BuyRow({ ctx, qty, setQty, onAdd, adding, onDone }) {
	return html`<div class="sf-cz__buy">
		<${QtyStepper} value=${qty} onChange=${setQty} label=${`${ctx.product.title} quantity`} />
		<button type="button" class="sf-btn sf-btn--primary sf-cz__add" onClick=${onAdd} disabled=${adding}>${adding ? 'Adding…' : `Add to cart · ${money(ctx.sum.total * qty)}`}</button>
		${onDone ? html`<button type="button" class="sf-btn sf-btn--secondary" onClick=${onDone}>Done</button>` : null}
	</div>`;
}

/** Customizer as a large dialog: big live viewer + options panel + live total + Add to cart. */
export function CustomizerModal({ open, onClose, ctx, setChoices, onVariant, qty, setQty, onAdd, adding, onShare, missing, onAR, onCart }) {
	useUndoKeys(open, ctx);
	if (!open) return null;
	const { s, product, variant } = ctx;
	return html`<${SfModal} open=${open} onClose=${onClose} size="full" title=${`Customize ${product.title}`} class="sf-czmodal">
		<div class="sf-czmodal__grid">
			<div class="sf-czmodal__stage">
				<${StoreViewer} productId=${product.id} variantId=${variant.id} choices=${ctx.clean} custom=${ctx.custom} trigger="eager" toolbar=${s.app.settings.toolbar} onAR=${onAR} onCart=${onCart} class="sf-czmodal__viewer" />
			</div>
			<section class="sf-czmodal__panel" aria-label="Options">
				<div class="sf-czmodal__scroll">
					<${VariantPicker} s=${s} product=${product} variant=${variant} onVariant=${onVariant} idPrefix="sf-cm" />
					<${CustomizerBody} ctx=${ctx} setChoices=${setChoices} showMissing=${missing} />
					${missing?.length ? html`<p class="sf-cz__err" role="alert">Still to choose: ${missing.join(', ')}.</p>` : null}
					<${PriceBox} sum=${ctx.sum} />
					${onShare ? html`<button type="button" class="sf-btn sf-btn--ghost sf-btn--full" onClick=${onShare}><${Icon} name="share" size=${16} /> Save & share design</button>` : null}
				</div>
				<div class="sf-czmodal__foot">
					<${TotalBar} ctx=${ctx} />
					<${BuyRow} ctx=${ctx} qty=${qty} setQty=${setQty} onAdd=${onAdd} adding=${adding} onDone=${onClose} />
				</div>
			</section>
		</div>
	<//>`;
}

/** Customizer as a side drawer next to the page's own viewer. */
export function CustomizerDrawer({ open, onClose, ctx, setChoices, qty, setQty, onAdd, adding, onShare, missing }) {
	useUndoKeys(open, ctx);
	return html`<${SfDrawer}
		open=${open}
		onClose=${onClose}
		modal=${false}
		sheet
		title=${`Customize ${ctx.product.title}`}
		class="sf-czdrawer"
		footer=${html`<div class="sf-czdrawer__foot">
			<${TotalBar} ctx=${ctx} />
			<${BuyRow} ctx=${ctx} qty=${qty} setQty=${setQty} onAdd=${onAdd} adding=${adding} />
		</div>`}
	>
		<${CustomizerBody} ctx=${ctx} setChoices=${setChoices} showMissing=${missing} />
		${missing?.length ? html`<p class="sf-cz__err" role="alert">Still to choose: ${missing.join(', ')}.</p>` : null}
		${ctx.sum.lines.length ? html`<${PriceBox} sum=${ctx.sum} />` : null}
		${onShare ? html`<button type="button" class="sf-btn sf-btn--ghost sf-btn--full" onClick=${onShare}><${Icon} name="share" size=${16} /> Save & share design</button>` : null}
	<//>`;
}
