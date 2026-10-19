// Inspector bodies: Customer options (groups, choices, conditions, shopper preview) and Pricing.
import { html, useState, cx } from '../../../js/core/ui.js';
import { MODEL_INFO } from '../../../js/engine/demo-models.js';
import { useStore } from '../../core/store.js';
import { visibleGroups, ruleAmount, money, moneyDelta } from '../../core/commerce.js';
import { Badge, Banner, Button, Checkbox, Icon, ProgressBar, Select, TextField } from '../../ui/polaris.js';
import { useEd, effective, rawConfig, onVariant, activeFile, targetVariantId, targetLabel, setWhole, setPreview, clearOverride, uniqueId } from './state.js';
import { previewOptions } from './viewport.js';
import { ColorField, IconBtn, MeshChips, OverrideNote, PriceRule, Slider, meshLabel } from './fields.js';

const TYPES = [
	{ value: 'color', label: 'Colour' },
	{ value: 'material', label: 'Material' },
	{ value: 'parts', label: 'Parts (show or hide)' },
];
const DISPLAYS = [
	{ value: 'swatch', label: 'Swatches' },
	{ value: 'thumbnail', label: 'Thumbnails' },
	{ value: 'button', label: 'Buttons' },
	{ value: 'dropdown', label: 'Dropdown' },
];
const PALETTE = ['#d8c8a8', '#3f3f46', '#0f766e', '#c2410c', '#1e3a5f', '#7c9a7e', '#be185d'];

export function basePrice(s, ed) {
	const vid = targetVariantId(s, ed);
	return s.variants[vid]?.price ?? s.products[ed.pid]?.price ?? 0;
}

function meshList(s, ed) {
	if (ed.meshNames.length) return ed.meshNames;
	const f = activeFile(s, ed);
	return MODEL_INFO[f?.demo]?.meshes || [];
}

const moveIn = (list, i, dir) => {
	const j = i + dir;
	if (j < 0 || j >= list.length) return list;
	const next = list.slice();
	[next[i], next[j]] = [next[j], next[i]];
	return next;
};

/* ---------- conditions ---------- */

export function Conditions({ value, onChange, groupsBefore, productOptions, title = 'Show this group only when' }) {
	const cond = value || { match: 'all', rules: [] };
	const rules = cond.rules || [];
	const commit = (next) => onChange(next.rules.length ? next : undefined);
	const setRule = (i, patch) => commit({ ...cond, rules: rules.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
	const sources = [
		...productOptions.map((o) => ({ label: `Variant option: ${o.name}`, value: `option:${o.name}` })),
		...groupsBefore.map((g) => ({ label: `Customer pick: ${g.label}`, value: `group:${g.id}` })),
	];
	const add = () => {
		const src = sources[0]?.value;
		if (!src) return;
		const [kind, ref] = src.split(':');
		const rule = kind === 'option' ? { source: 'option', name: ref, op: 'is', value: productOptions.find((o) => o.name === ref)?.values?.[0] || '' } : { source: 'group', groupId: ref, op: 'is', choiceId: groupsBefore.find((g) => g.id === ref)?.choices?.[0]?.id || '' };
		commit({ match: cond.match || 'all', rules: [...rules, rule] });
	};
	return html`
		<div class="ed-cond">
			<div class="ed-cond__head">
				<span class="p-label">${title}</span>
				${rules.length > 1
					? html`<div class="p-select ed-cond__match">
							<select aria-label="Match" value=${cond.match || 'all'} onChange=${(e) => commit({ ...cond, match: e.target.value })}>
								<option value="all" selected=${cond.match !== 'any'}>all rules match</option>
								<option value="any" selected=${cond.match === 'any'}>any rule matches</option>
							</select>
							<${Icon} name="chevronDown" size=${14} />
						</div>`
					: null}
			</div>
			${rules.length ? null : html`<p class="p-help">Always shown.</p>`}
			${rules.map((r, i) => {
				const srcVal = r.source === 'option' ? `option:${r.name}` : `group:${r.groupId}`;
				const opt = productOptions.find((o) => o.name === r.name);
				const grp = groupsBefore.find((g) => g.id === r.groupId);
				return html`<div class="ed-rule">
					<div class="p-select">
						<select aria-label="Rule source" value=${srcVal} onChange=${(e) => {
							const [kind, ref] = e.target.value.split(':');
							const next = rules.slice();
							next[i] = kind === 'option' ? { source: 'option', name: ref, op: 'is', value: productOptions.find((o) => o.name === ref)?.values?.[0] || '' } : { source: 'group', groupId: ref, op: 'is', choiceId: groupsBefore.find((g) => g.id === ref)?.choices?.[0]?.id || '' };
							commit({ ...cond, rules: next });
						}}>
							${sources.map((o) => html`<option value=${o.value} selected=${o.value === srcVal}>${o.label}</option>`)}
							${sources.some((o) => o.value === srcVal) ? null : html`<option value=${srcVal} selected>Missing: ${r.name || r.groupId}</option>`}
						</select>
						<${Icon} name="chevronDown" size=${14} />
					</div>
					<div class="p-select ed-rule__op">
						<select aria-label="Operator" value=${r.op} onChange=${(e) => setRule(i, { op: e.target.value })}>
							<option value="is" selected=${r.op === 'is'}>is</option>
							<option value="is_not" selected=${r.op === 'is_not'}>is not</option>
							${r.source === 'group' ? html`<option value="has_choice" selected=${r.op === 'has_choice'}>has a pick</option><option value="no_choice" selected=${r.op === 'no_choice'}>has no pick</option>` : null}
						</select>
						<${Icon} name="chevronDown" size=${14} />
					</div>
					${r.op === 'is' || r.op === 'is_not'
						? html`<div class="p-select">
								<select aria-label="Value" value=${r.source === 'option' ? r.value : r.choiceId} onChange=${(e) => setRule(i, r.source === 'option' ? { value: e.target.value } : { choiceId: e.target.value })}>
									${r.source === 'option'
										? (opt?.values || []).map((v) => html`<option value=${v} selected=${v === r.value}>${v}</option>`)
										: (grp?.choices || []).map((c) => html`<option value=${c.id} selected=${c.id === r.choiceId}>${c.label}</option>`)}
								</select>
								<${Icon} name="chevronDown" size=${14} />
							</div>`
						: html`<span></span>`}
					<${IconBtn} icon="x" label="Remove rule" onClick=${() => commit({ ...cond, rules: rules.filter((_, k) => k !== i) })} />
				</div>`;
			})}
			${sources.length
				? html`<${Button} size="slim" variant="plain" icon="plus" onClick=${add}>Add rule<//>`
				: html`<p class="p-help">Rules use the product's variant options (like Color) or a group above this one.</p>`}
		</div>
	`;
}

/* ---------- choices ---------- */

function ChoiceEditor({ group, choice, index, count, onChange, onRemove, onMove, base, groupsBefore, productOptions, logic, pricing }) {
	const [cond, setCond] = useState(!!choice.conditions?.rules?.length);
	const isColor = group.type === 'color' || group.type === 'material';
	return html`
		<li class="ed-choice">
			<div class="ed-choice__row">
				<span class="ed-handle" aria-hidden="true"><${Icon} name="drag" size=${14} /></span>
				${isColor
					? html`<${ColorField}
							compact
							label=${`${choice.label} colour`}
							value=${choice.color}
							onChange=${(c) => onChange({ color: c, ...(group.type === 'material' ? { material: { ...(choice.material || {}), baseColor: c } } : {}) }, `choice.color.${choice.id}`)}
						/>`
					: null}
				<div class="p-input-wrap ed-choice__label"><input class="p-input" aria-label="Choice label" value=${choice.label} onInput=${(e) => onChange({ label: e.target.value }, `choice.label.${choice.id}`)} /></div>
				<span class="ed-flip"><${IconBtn} icon="chevronDown" label="Move up" disabled=${index === 0} onClick=${() => onMove(-1)} /></span>
				<${IconBtn} icon="chevronDown" label="Move down" disabled=${index === count - 1} onClick=${() => onMove(1)} />
				<${IconBtn} icon="trash" label=${`Remove ${choice.label}`} tone="critical" onClick=${onRemove} />
			</div>
			${group.type === 'material'
				? html`<div class="ed-choice__mat">
						<${Slider} label="Metalness" value=${choice.material?.metalness ?? 0} onChange=${(v) => onChange({ material: { ...(choice.material || {}), metalness: v } }, `choice.metal.${choice.id}`)} />
						<${Slider} label="Roughness" value=${choice.material?.roughness ?? 0.5} onChange=${(v) => onChange({ material: { ...(choice.material || {}), roughness: v } }, `choice.rough.${choice.id}`)} />
					</div>`
				: null}
			${group.type === 'parts'
				? html`<${MeshChips} label="Parts shown with this choice" names=${group.targets || []} value=${choice.show || []} onChange=${(v) => onChange({ show: v })} />`
				: null}
			${pricing ? html`<${PriceRule} value=${choice.price} base=${base} onChange=${(p) => onChange({ price: p }, `choice.price.${choice.id}`)} />` : null}
			${logic
				? cond
					? html`<${Conditions} title="Show this choice only when" value=${choice.conditions} groupsBefore=${groupsBefore} productOptions=${productOptions} onChange=${(c) => onChange({ conditions: c })} />`
					: html`<${Button} size="slim" variant="plain" onClick=${() => setCond(true)}>Only show this choice when…<//>`
				: null}
		</li>
	`;
}

/* ---------- groups ---------- */

function GroupEditor({ group, index, groups, update, meshNames, base, productOptions, modules, labels }) {
	const patch = (p, key = null) => update((list) => list.map((g) => (g.id === group.id ? { ...g, ...p } : g)), key);
	const choices = group.choices || [];
	const setChoices = (fn, key = null) => patch({ choices: fn(choices) }, key);
	const addChoice = () => {
		const n = choices.length + 1;
		const label = group.type === 'parts' ? (n === 1 ? 'With' : `Option ${n}`) : `Choice ${n}`;
		const id = uniqueId(label, choices.map((c) => c.id));
		const color = PALETTE[choices.length % PALETTE.length];
		const c = { id, label, ...(group.type !== 'parts' ? { color } : { show: [...(group.targets || [])] }), ...(group.type === 'material' ? { material: { baseColor: color, roughness: 0.5, metalness: 0 } } : {}) };
		setChoices((cs) => [...cs, c]);
	};
	return html`
		<div class="ed-group__body">
			<${TextField} label="Group name" value=${group.label} onInput=${(v) => patch({ label: v }, `group.label.${group.id}`)} />
			<div class="ed-grid2">
				<${Select} label="Type" value=${group.type} options=${TYPES} onChange=${(v) => patch({ type: v })} />
				<${Select} label="Display as" value=${group.display || 'swatch'} options=${DISPLAYS} onChange=${(v) => patch({ display: v })} />
			</div>
			<${MeshChips} label="Applies to" names=${meshNames} labels=${labels} value=${group.targets || []} onChange=${(v) => patch({ targets: v })} />
			<${Select} label="Default choice" value=${group.default || ''} options=${[{ label: 'None', value: '' }, ...choices.map((c) => ({ label: c.label, value: c.id }))]} onChange=${(v) => patch({ default: v })} />
			<${Checkbox} label="Required" checked=${!!group.required} onChange=${(v) => patch({ required: v })} helpText="Shoppers must pick before adding to cart." />
			<${TextField} label="Description" value=${group.description || ''} placeholder="Optional help text under the group name" onInput=${(v) => patch({ description: v || undefined }, `group.desc.${group.id}`)} />
			<div class="p-field">
				<span class="p-label">Choices</span>
				<ul class="ed-choices">
					${choices.map(
						(c, i) => html`<${ChoiceEditor}
							key=${c.id}
							group=${group}
							choice=${c}
							index=${i}
							count=${choices.length}
							base=${base}
							groupsBefore=${groups.slice(0, index)}
							productOptions=${productOptions}
							logic=${modules['conditional-logic']}
							pricing=${modules['option-pricing']}
							onChange=${(p, key) => setChoices((cs) => cs.map((x) => (x.id === c.id ? { ...x, ...p } : x)), key)}
							onRemove=${() => patch({ choices: choices.filter((x) => x.id !== c.id), default: group.default === c.id ? '' : group.default })}
							onMove=${(dir) => setChoices((cs) => moveIn(cs, i, dir))}
						/>`,
					)}
				</ul>
				<${Button} size="slim" icon="plus" onClick=${addChoice}>Add choice<//>
			</div>
			${modules['conditional-logic'] ? html`<${Conditions} value=${group.conditions} groupsBefore=${groups.slice(0, index)} productOptions=${productOptions} onChange=${(c) => patch({ conditions: c })} />` : null}
		</div>
	`;
}

function ShopperPreview({ config, ed, opts, base }) {
	const choices = { options: ed.preview };
	const groups = visibleGroups(config, choices, opts);
	const hidden = (config.options || []).length - groups.length;
	if (!(config.options || []).length) return null;
	return html`
		<div class="ed-preview">
			<div class="ed-preview__head">
				<span class="p-label">Shopper preview</span>
				<span class="p-help">${Object.entries(opts).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'Default variant'}</span>
			</div>
			${groups.map((g) => {
				const cur = ed.preview[g.id] ?? g.default;
				return html`<div class="ed-preview__group">
					<span class="ed-preview__label">${g.label}${g.required ? html`<span class="ed-req" aria-label="required">*</span>` : null}</span>
					<div class="ed-preview__choices">
						${g.choices.map((c) => {
							const delta = c.price ? ruleAmount(c.price, base) : 0;
							const title = `${c.label}${delta ? ` (${moneyDelta(delta)})` : ''}`;
							const pick = () => setPreview({ ...ed.preview, [g.id]: c.id });
							return g.type !== 'parts' && c.color && g.display !== 'button' && g.display !== 'dropdown'
								? html`<button type="button" class=${cx('ed-sw', cur === c.id && 'is-on')} style=${{ '--sw': c.color }} title=${title} aria-label=${title} aria-pressed=${String(cur === c.id)} onClick=${pick}></button>`
								: html`<button type="button" class=${cx('ed-pill', cur === c.id && 'is-on')} title=${title} aria-pressed=${String(cur === c.id)} onClick=${pick}>${c.label}</button>`;
						})}
					</div>
				</div>`;
			})}
			${hidden > 0 ? html`<p class="p-help">${hidden} group${hidden > 1 ? 's' : ''} hidden by conditions right now.</p>` : null}
		</div>
	`;
}

export function OptionsPanel({ product }) {
	const s = useStore();
	const ed = useEd();
	const [open, setOpen] = useState(null);
	const eff = effective(ed);
	const groups = eff.options || [];
	const modules = s.app.modules;
	const meshNames = meshList(s, ed);
	const labels = Object.fromEntries(meshNames.map((n) => [n, meshLabel(eff, n)]));
	const base = basePrice(s, ed);
	const opts = previewOptions(s, ed);
	const update = (fn, key) => setWhole('options', (list) => fn(list || []), key);
	const add = () => {
		const id = uniqueId('group', groups.map((g) => g.id));
		update((list) => [...list, { id, label: `Option group ${list.length + 1}`, type: 'color', display: 'swatch', targets: ed.selection ? [ed.selection] : [], required: false, default: '', choices: [] }]);
		setOpen(id);
	};
	if (!modules['option-groups']) {
		return html`<${Banner} tone="info" title="Option groups are off" action=${{ content: 'Open Settings', href: '#admin.settings' }}>Turn on Option groups in Settings → Features to build swatches, materials and parts choices.<//>`;
	}
	return html`
		<${OverrideNote} on=${onVariant(ed) && rawConfig(ed).options !== undefined} what="option groups" onClear=${() => clearOverride(['options'])} />
		${onVariant(ed) && rawConfig(ed).options === undefined ? html`<p class="p-help">Editing here gives ${targetLabel(ed)} its own option groups.</p>` : null}
		<ul class="ed-groups">
			${groups.map((g, i) => {
				const isOpen = open === g.id;
				return html`<li class=${cx('ed-group', isOpen && 'is-open')} key=${g.id}>
					<div class="ed-group__head">
						<span class="ed-handle" aria-hidden="true"><${Icon} name="drag" size=${16} /></span>
						<button type="button" class="ed-group__title" aria-expanded=${String(isOpen)} onClick=${() => setOpen(isOpen ? null : g.id)}>
							<span class="ed-group__name">${g.label || 'Untitled group'}</span>
							<span class="ed-group__meta">
								<${Badge}>${TYPES.find((t) => t.value === g.type)?.label.split(' ')[0] || g.type}<//>
								<span>${(g.choices || []).length} choices</span>
								${g.required ? html`<span>· Required</span>` : null}
								${g.conditions?.rules?.length ? html`<span class="ed-cond-flag" title="Has conditions"><${Icon} name="bolt" size=${12} /> Conditional</span>` : null}
							</span>
						</button>
						<span class="ed-flip"><${IconBtn} icon="chevronDown" label="Move up" disabled=${i === 0} onClick=${() => update((list) => moveIn(list, i, -1))} /></span>
						<${IconBtn} icon="chevronDown" label="Move down" disabled=${i === groups.length - 1} onClick=${() => update((list) => moveIn(list, i, 1))} />
						<${IconBtn} icon="trash" label=${`Delete ${g.label}`} tone="critical" onClick=${() => update((list) => list.filter((x) => x.id !== g.id))} />
					</div>
					${isOpen ? html`<${GroupEditor} group=${g} index=${i} groups=${groups} update=${update} meshNames=${meshNames} labels=${labels} base=${base} productOptions=${product.options || []} modules=${modules} />` : null}
				</li>`;
			})}
		</ul>
		${groups.length ? null : html`<p class="ed-p ed-muted">No option groups yet. Groups replace the plain colour pickers with named choices like “Frame finish”.</p>`}
		<${Button} icon="plus" onClick=${add}>Add option group<//>
		<${ShopperPreview} config=${eff} ed=${ed} opts=${opts} base=${base} />
	`;
}

/* ---------- pricing ---------- */

/** Compact price map the Cart Transform Function reads from the product metafield. */
export function pricingPayload(draft) {
	const map = (cfg) => {
		const out = {};
		for (const g of cfg?.options || []) for (const c of g.choices || []) if (c.price) (out[g.id] ||= {})[c.id] = [c.price.type === 'percent' ? 'p' : 'f', c.price.amount, ...(c.price.sale != null ? [c.price.sale] : [])];
		for (const a of cfg?.decals || []) if (a.price) (out._d ||= {})[a.id] = [a.price.type === 'percent' ? 'p' : 'f', a.price.amount];
		return out;
	};
	const payload = { d: map(draft.base) };
	for (const [key, r] of Object.entries(draft.rules || {})) if (r.config?.options || r.config?.decals) payload[key] = map(r.config);
	for (const [vid, v] of Object.entries(draft.variants)) if (v.config?.options || v.config?.decals) payload[vid] = map(v.config);
	return payload;
}

export function PricingPanel() {
	const s = useStore();
	const ed = useEd();
	const eff = effective(ed);
	const base = basePrice(s, ed);
	if (!s.app.modules['option-pricing']) return html`<${Banner} tone="info" title="Option pricing is off" action=${{ content: 'Open Settings', href: '#admin.settings' }}>Turn on Option pricing in Settings → Features to charge extra for choices.<//>`;
	const rows = [];
	for (const g of eff.options || []) for (const c of g.choices || []) if (c.price) rows.push({ k: `${g.id}.${c.id}`, what: g.label, choice: c.label, rule: c.price });
	for (const a of eff.decals || []) if (a.price) rows.push({ k: `decal.${a.id}`, what: 'Personalization', choice: a.label, rule: a.price });
	const bytes = JSON.stringify(pricingPayload(ed.draft)).length;
	const pct = (bytes / 10240) * 100;
	const plus = s.shop.plan === 'plus';
	const ruleText = (r) => (r.type === 'percent' ? `${r.sale ?? r.amount}%` : r.sale != null ? html`<s>${money(r.amount)}</s> ${money(r.sale)}` : money(r.amount));
	return html`
		${rows.length
			? html`<div class="ed-tablewrap"><table class="ed-table">
					<thead><tr><th>Choice</th><th>Rule</th><th class="ed-num">At ${money(base)}</th></tr></thead>
					<tbody>
						${rows.map((r) => html`<tr><td><span class="ed-table__what">${r.what}</span>${r.choice}</td><td>${ruleText(r.rule)}</td><td class="ed-num">${moneyDelta(ruleAmount(r.rule, base))}</td></tr>`)}
					</tbody>
				</table></div>`
			: html`<p class="ed-p ed-muted">No priced choices yet. Add a price to a choice in Customer options.</p>`}
		<div class="ed-plan">
			<div class="ed-plan__row"><${Icon} name="function" size=${16} /><strong>How the cart charges it</strong><${Badge} tone="info">${plus ? 'Plus' : 'Basic'} plan<//></div>
			<p class="p-help">${plus ? 'On Plus, the Cart Transform Function uses lineUpdate: one cart line with the new price, a “(customized)” title and the design snapshot.' : 'On Basic and Advanced, the Cart Transform Function uses lineExpand: the product line plus a “3D customization” line that carries the extra charge.'}</p>
		</div>
		<${Banner} tone="warning" title="Subscriptions (selling plans) can't use option pricing">Shopify skips the Cart Transform for lines with a selling plan, so shoppers would pay the base price.<//>
		<div class="ed-meter">
			<div class="ed-meter__row"><span>Pricing data: ${(bytes / 1024).toFixed(1)} KB of 10 KB</span><${Badge} tone=${pct > 100 ? 'critical' : pct > 70 ? 'warning' : 'success'}>${Math.round(pct)}%<//></div>
			<${ProgressBar} value=${pct} tone=${pct > 100 ? 'critical' : pct > 70 ? 'warning' : 'success'} label="Pricing data size" />
			<p class="p-help">The Function reads prices from a product metafield, which is limited to 10 KB.</p>
		</div>
	`;
}
