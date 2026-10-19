// Left sidebar: what you edit (default, one layer per option value like "Size: Wide", variant exceptions) and the scene tree
// of meshes with per-mesh visible / customer can recolor / customer can hide / label.
import { html, useState, cx } from '../../../js/core/ui.js';
import { useStore } from '../../core/store.js';
import { variantsOf, ruleKey } from '../../core/commerce.js';
import { Icon, Badge, Button, Checkbox, TextField, Modal } from '../../ui/polaris.js';
import { useEd, activeFile, effective, rawConfig, onVariant, hasOverride, setTarget, resetVariant, select, patchEntry, clearOverride, currentLayer, ruleTarget, targetLabel } from './state.js';
import { IconBtn, meshLabel } from './fields.js';

function TargetRow({ t, on, swatch, glyph, label, ov }) {
	return html`<li>
		<button type="button" role="option" aria-selected=${String(on)} class=${cx('ed-variant', on && 'is-on')} onClick=${() => setTarget(t)}>
			${swatch ? html`<span class="ed-variant__swatch" style=${{ background: swatch }}></span>` : html`<span class="ed-variant__swatch ed-variant__swatch--all">${glyph}</span>`}
			<span class="ed-variant__name">${label}</span>
			${ov ? html`<span class="ed-dot" title="Has overrides" aria-label="Has overrides"></span>` : null}
		</button>
	</li>`;
}

function VariantSwitcher({ product }) {
	const s = useStore();
	const ed = useEd();
	const [confirm, setConfirm] = useState(false);
	const [q, setQ] = useState('');
	const variants = variantsOf(s, product.id);
	const single = variants.length <= 1 && variants[0]?.title === 'Default Title';
	const cur = currentLayer(ed);
	const ruleCount = Object.values(ed.draft.rules || {}).filter(hasOverride).length;
	const exceptions = Object.values(ed.draft.variants).filter(hasOverride).length;
	const shown = q ? variants.filter((v) => v.title.toLowerCase().includes(q.toLowerCase())) : variants;
	const swatchFor = (name, value) => variants.find((v) => v.options?.[name] === value && v.swatch && name === 'Color')?.swatch;

	return html`
		<div class="ed-panel">
			<div class="ed-panel__head">
				<h2 class="ed-panel__title">Set up by option</h2>
				${ruleCount ? html`<span class="ed-panel__meta">${ruleCount} with overrides</span>` : null}
			</div>
			<ul class="ed-variants" role="listbox" aria-label="Edit for">
				<${TargetRow} t="default" on=${ed.target === 'default'} glyph=${html`<${Icon} name="layers" size=${12} />`} label="Default (all variants)" />
			</ul>
			${single
				? html`<p class="p-help ed-pad">This product has no variants. Every edit applies to the product.</p>`
				: (product.options || []).map(
						(o) => html`<div class="ed-optgroup">
							<p class="ed-optgroup__name">${o.name}</p>
							<ul class="ed-variants" role="listbox" aria-label=${o.name}>
								${o.values.map((val) => {
									const t = ruleTarget(ruleKey(o.name, val));
									return html`<${TargetRow} t=${t} on=${ed.target === t} swatch=${swatchFor(o.name, val)} glyph=${val.slice(0, 1)} label=${val} ov=${hasOverride(ed.draft.rules?.[ruleKey(o.name, val)])} />`;
								})}
							</ul>
						</div>`,
					)}
			${single ? null : html`<p class="p-help ed-pad">Set each ${(product.options || []).map((o) => o.name.toLowerCase()).join(' and ')} once. Every variant combines its values, so ${variants[variants.length - 1]?.title} gets both.</p>`}
		</div>
		${single
			? null
			: html`<div class="ed-panel">
					<div class="ed-panel__head">
						<h2 class="ed-panel__title">Variant exceptions</h2>
						<span class="ed-panel__meta">${exceptions} of ${variants.length}</span>
					</div>
					${variants.length > 8 ? html`<div class="ed-pad"><${TextField} label="Find a variant" labelHidden placeholder="Find a variant" value=${q} onInput=${setQ} /></div>` : null}
					<ul class="ed-variants" role="listbox" aria-label="Variants">
						${shown.map((v) => html`<${TargetRow} t=${v.id} on=${ed.target === v.id} swatch=${v.swatch || '#d4d4d4'} label=${v.title} ov=${hasOverride(ed.draft.variants[v.id])} />`)}
					</ul>
					<p class="p-help ed-pad">Only for a variant that differs from its option values, like a special edition.</p>
				</div>`}
		${cur
			? html`<div class="ed-variant-tools">
					<span class="ed-variant-tools__label">Editing <strong>${targetLabel(ed)}</strong></span>
					${hasOverride(cur) ? html`<${Badge} tone="attention">Overrides default<//>` : html`<${Badge}>Same as default<//>`}
					<${Button} size="slim" variant="tertiary" icon="reset" disabled=${!hasOverride(cur)} onClick=${() => setConfirm(true)}>Reset to default<//>
				</div>`
			: null}
		<${Modal}
			open=${confirm}
			size="small"
			title=${`Reset ${targetLabel(ed)}?`}
			onClose=${() => setConfirm(false)}
			primaryAction=${{ content: 'Reset', destructive: true, onAction: () => (resetVariant(), setConfirm(false)) }}
			secondaryActions=${[{ content: 'Cancel', onAction: () => setConfirm(false) }]}
		>
			<p class="ed-p">All overrides for <strong>${targetLabel(ed)}</strong> are removed, including its own model. It shows the default setup again. You can undo this.</p>
		<//>
	`;
}

function MeshRow({ name, depth, config }) {
	const ed = useEd();
	const mc = config.meshes?.[name] || {};
	const own = onVariant(ed) && !!rawConfig(ed).meshes?.[name];
	const on = ed.selection === name;
	const hidden = mc.visible === false;
	return html`
		<li class=${cx('ed-mesh', on && 'is-on', hidden && 'is-hidden')}>
			<div class="ed-mesh__row" style=${{ paddingLeft: 8 + depth * 14 + 'px' }}>
				<button type="button" class="ed-mesh__name" aria-pressed=${String(on)} onClick=${() => select(on ? null : name)}>
					<${Icon} name="cube" size=${14} />
					<span>${meshLabel(config, name)}</span>
					${own ? html`<span class="ed-dot" title="Overridden for this variant"></span>` : null}
				</button>
				<span class="ed-mesh__flags">
					${mc.customizable ? html`<span class="ed-flag" title="Customer can recolor"><${Icon} name="palette" size=${13} /></span>` : null}
					${mc.optional ? html`<span class="ed-flag" title="Customer can hide"><${Icon} name="eyeOff" size=${13} /></span>` : null}
				</span>
				<${IconBtn} icon=${hidden ? 'eyeOff' : 'eye'} label=${hidden ? `Show ${name}` : `Hide ${name}`} onClick=${() => patchEntry('meshes', name, { visible: hidden ? undefined : false })} />
			</div>
			${on
				? html`<div class="ed-mesh__edit">
						<${TextField} label="Label shoppers see" value=${mc.label || ''} placeholder=${name.replace(/_/g, ' ')} onInput=${(v) => patchEntry('meshes', name, { label: v || undefined }, `label.${name}`)} />
						<${Checkbox} label="Visible" checked=${!hidden} onChange=${(v) => patchEntry('meshes', name, { visible: v ? undefined : false })} />
						<${Checkbox} label="Customer can recolor" helpText="Shows a colour picker for this part in the customizer." checked=${!!mc.customizable} onChange=${(v) => patchEntry('meshes', name, { customizable: v || undefined })} />
						<${Checkbox} label="Customer can hide" helpText="Shoppers can switch this part off." checked=${!!mc.optional} onChange=${(v) => patchEntry('meshes', name, { optional: v || undefined })} />
						${own ? html`<${Button} variant="plain" onClick=${() => clearOverride(['meshes', 'materials'], name)}>Use default for this part<//>` : null}
					</div>`
				: null}
		</li>
	`;
}

function TreeNode({ node, depth, config }) {
	if (node.mesh && !node.children) return html`<${MeshRow} name=${node.mesh} depth=${depth} config=${config} />`;
	return html`
		<li class="ed-tree__group">
			${node.mesh
				? html`<${MeshRow} name=${node.mesh} depth=${depth} config=${config} />`
				: html`<div class="ed-tree__node" style=${{ paddingLeft: 8 + depth * 14 + 'px' }}><${Icon} name="layers" size=${13} /> ${node.name || 'Group'}</div>`}
			${node.children ? html`<ul class="ed-tree">${node.children.map((c) => html`<${TreeNode} node=${c} depth=${depth + 1} config=${config} />`)}</ul>` : null}
		</li>
	`;
}

export function SceneTree() {
	const s = useStore();
	const ed = useEd();
	const file = activeFile(s, ed);
	const config = effective(ed);
	const nodes = ed.hierarchy.length ? ed.hierarchy : ed.meshNames.map((n) => ({ name: n, mesh: n }));
	return html`
		<div class="ed-panel ed-panel--grow">
			<div class="ed-panel__head">
				<h2 class="ed-panel__title">Parts</h2>
				<span class="ed-panel__meta">${ed.meshNames.length} meshes</span>
			</div>
			${nodes.length
				? html`<ul class="ed-tree ed-tree--root">${nodes.map((n) => html`<${TreeNode} node=${n} depth=${0} config=${config} />`)}</ul>`
				: file
					? html`<div class="ed-loading"><span class="x-pimg__spin"></span> Loading the model…</div>`
					: html`<p class="p-help ed-pad">No model yet. Pick one in the Model section.</p>`}
			<p class="p-help ed-pad">Click a part here or on the model to edit its material.</p>
		</div>
	`;
}

export function Sidebar({ product }) {
	return html`<${VariantSwitcher} product=${product} /><${SceneTree} />`;
}
