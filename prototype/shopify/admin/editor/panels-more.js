// Inspector bodies: Personalization (decal areas), Hotspots and Import / export.
import { html, useState, useRef, cx } from '../../../js/core/ui.js';
import { useStore } from '../../core/store.js';
import { Badge, Banner, Button, Checkbox, Icon, Select, TextField, toast } from '../../ui/polaris.js';
import { useEd, getEd, effective, rawConfig, onVariant, targetLabel, setWhole, setSample, setPlacing, setHotspotSel, clearOverride, importConfig, uniqueId, select } from './state.js';
import { ColorField, IconBtn, MeshChips, OverrideNote, PriceRule, Seg, Slider, meshLabel } from './fields.js';
import { basePrice } from './panels-options.js';

const FONTS = ['Inter', 'Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Courier New', 'Impact', 'Brush Script MT'];
const SIDES = ['front', 'back', 'left', 'right', 'top', 'bottom'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Personalization ---------- */

function AreaEditor({ area, update, meshNames, eff, base, sample }) {
	const patch = (p, key = null) => update((list) => list.map((a) => (a.id === area.id ? { ...a, ...p } : a)), key);
	const place = (p, key) => patch({ placement: { ...(area.placement || {}), ...p } }, key);
	const [newColor, setNewColor] = useState('#d4af37');
	const kinds = area.kinds || ['text'];
	return html`
		<div class="ed-group__body">
			<${TextField} label="Label shoppers see" value=${area.label} onInput=${(v) => patch({ label: v }, `decal.label.${area.id}`)} />
			<div class="ed-grid2">
				<${Select} label="Part" value=${area.mesh} options=${meshNames.map((n) => ({ label: meshLabel(eff, n), value: n }))} onChange=${(v) => patch({ mesh: v })} />
				<${Select} label="Side" value=${area.placement?.side || 'front'} options=${SIDES.map((s) => ({ label: cap(s), value: s }))} onChange=${(v) => place({ side: v })} />
			</div>
			<div class="ed-grid2">
				<${Slider} label="Area width" value=${area.placement?.width ?? 0.5} min=${0.1} max=${1} step=${0.01} format=${(v) => `${Math.round(v * 100)}%`} onChange=${(v) => place({ width: v }, `decal.w.${area.id}`)} />
				<${Slider} label="Area height" value=${area.placement?.height ?? 0.4} min=${0.1} max=${1} step=${0.01} format=${(v) => `${Math.round(v * 100)}%`} onChange=${(v) => place({ height: v }, `decal.h.${area.id}`)} />
			</div>
			<div class="p-field">
				<span class="p-label">Shoppers can add</span>
				<div class="ed-checks ed-checks--row">
					<${Checkbox} label="Text" checked=${kinds.includes('text')} onChange=${(v) => patch({ kinds: v ? [...new Set([...kinds, 'text'])] : kinds.filter((k) => k !== 'text') })} />
					<${Checkbox} label="Image upload" checked=${kinds.includes('image')} onChange=${(v) => patch({ kinds: v ? [...new Set([...kinds, 'image'])] : kinds.filter((k) => k !== 'image') })} />
				</div>
			</div>
			${kinds.includes('text')
				? html`
						<${MeshChips} label="Fonts" names=${FONTS} value=${area.fonts || []} onChange=${(v) => patch({ fonts: v })} />
						<div class="p-field">
							<span class="p-label">Text colours</span>
							<div class="ed-colors">
								${(area.colors || []).map(
									(c) => html`<span class="ed-colors__item">
										<span class="ed-sw ed-sw--static" style=${{ '--sw': c }}></span>
										<button type="button" aria-label=${`Remove ${c}`} onClick=${() => patch({ colors: area.colors.filter((x) => x !== c) })}><${Icon} name="x" size=${11} /></button>
									</span>`,
								)}
								<span class="ed-colors__add">
									<${ColorField} compact label="New text colour" value=${newColor} onChange=${setNewColor} />
									<${Button} size="slim" onClick=${() => !area.colors?.includes(newColor) && patch({ colors: [...(area.colors || []), newColor] })}>Add<//>
								</span>
							</div>
						</div>
						<${TextField} label="Max characters" type="number" min=${1} max=${60} value=${area.max_chars ?? 12} onInput=${(v) => patch({ max_chars: Number.isFinite(v) ? Math.max(1, Math.round(v)) : 12 }, `decal.max.${area.id}`)} />
					`
				: null}
			<${Checkbox} label="Required" checked=${!!area.required} onChange=${(v) => patch({ required: v })} helpText="Shoppers must fill this in before adding to cart." />
			<div class="p-field">
				<span class="p-label">Price</span>
				<${PriceRule} value=${area.price} base=${base} onChange=${(p) => patch({ price: p }, `decal.price.${area.id}`)} />
			</div>
			<${TextField}
				label="Preview with sample text"
				value=${sample || ''}
				maxLength=${area.max_chars || 60}
				placeholder="Type to preview on the model"
				helpText="Only for this preview. It is not saved."
				onInput=${(v) => setSample({ ...getEd().sample, [area.id]: v })}
			/>
		</div>
	`;
}

export function PersonalizationPanel() {
	const s = useStore();
	const ed = useEd();
	const [open, setOpen] = useState(null);
	const eff = effective(ed);
	const areas = eff.decals || [];
	const meshNames = ed.meshNames.length ? ed.meshNames : Object.keys(eff.meshes || {});
	if (!s.app.modules.personalization) return html`<${Banner} tone="info" title="Personalization is off" action=${{ content: 'Open Settings', href: '#admin.settings' }}>Turn on Personalization in Settings → Features to let shoppers add text or images.<//>`;
	const update = (fn, key) => setWhole('decals', (list) => fn(list || []), key);
	const add = () => {
		const id = uniqueId('area', areas.map((a) => a.id));
		update((list) => [...list, { id, label: 'Personalization', mesh: ed.selection || meshNames[0] || '', placement: { side: 'front', x: 0.5, y: 0.5, width: 0.5, height: 0.4, rotation: 0 }, kinds: ['text'], fonts: ['Georgia'], colors: ['#111827', '#ffffff'], max_chars: 12, min_size: 0.5, max_size: 1, required: false }]);
		setOpen(id);
	};
	return html`
		<${OverrideNote} on=${onVariant(ed) && rawConfig(ed).decals !== undefined} what="personalization areas" onClear=${() => clearOverride(['decals'])} />
		<ul class="ed-groups">
			${areas.map((a) => {
				const isOpen = open === a.id;
				return html`<li class=${cx('ed-group', isOpen && 'is-open')} key=${a.id}>
					<div class="ed-group__head">
						<span class="ed-group__icon"><${Icon} name=${(a.kinds || []).includes('image') ? 'image' : 'text'} size=${16} /></span>
						<button type="button" class="ed-group__title" aria-expanded=${String(isOpen)} onClick=${() => setOpen(isOpen ? null : a.id)}>
							<span class="ed-group__name">${a.label}</span>
							<span class="ed-group__meta"><span>${meshLabel(eff, a.mesh)} · ${cap(a.placement?.side || 'front')}</span>${a.max_chars ? html`<span>· ${a.max_chars} chars</span>` : null}${a.required ? html`<span>· Required</span>` : null}</span>
						</button>
						<${IconBtn} icon="trash" label=${`Delete ${a.label}`} tone="critical" onClick=${() => update((list) => list.filter((x) => x.id !== a.id))} />
					</div>
					${isOpen ? html`<${AreaEditor} area=${a} update=${update} meshNames=${meshNames} eff=${eff} base=${basePrice(s, ed)} sample=${ed.sample[a.id]} />` : null}
				</li>`;
			})}
		</ul>
		${areas.length ? null : html`<p class="ed-p ed-muted">No personalization areas yet. An area is where shoppers can add a name, initials or a logo.</p>`}
		<${Button} icon="plus" onClick=${add}>Add personalization area<//>
	`;
}

/* ---------- Hotspots ---------- */

const round3 = (a) => a.map((n) => Math.round(n * 1000) / 1000);

export function HotspotsPanel({ product }) {
	const s = useStore();
	const ed = useEd();
	const eff = effective(ed);
	const list = eff.hotspots || [];
	const open = ed.hotspotSel;
	const meshNames = ed.meshNames.length ? ed.meshNames : Object.keys(eff.meshes || {});
	const update = (fn, key = null) => setWhole('hotspots', (l) => fn(l || []), key);
	const patch = (id, p, key) => update((l) => l.map((h) => (h.id === id ? { ...h, ...p } : h)), key);
	const products = Object.values(s.products).filter((p) => p.id !== product.id && p.status === 'active');
	return html`
		<${OverrideNote} on=${onVariant(ed) && rawConfig(ed).hotspots !== undefined} what="hotspots" onClear=${() => clearOverride(['hotspots'])} />
		<ul class="ed-groups">
			${list.map((h, i) => {
				const isOpen = open === h.id;
				return html`<li class=${cx('ed-group', isOpen && 'is-open')} key=${h.id}>
					<div class="ed-group__head">
						<span class="ed-hsnum">${i + 1}</span>
						<button type="button" class="ed-group__title" aria-expanded=${String(isOpen)} onClick=${() => setHotspotSel(isOpen ? null : h.id)}>
							<span class="ed-group__name">${h.label || 'Untitled hotspot'}</span>
							<span class="ed-group__meta"><span>On ${meshLabel(eff, h.anchor_mesh)}</span>${h.icon === 'cart' ? html`<${Badge} tone="info" icon="cart">Product<//>` : h.icon === 'link' ? html`<${Badge} icon="link">Link<//>` : null}</span>
						</button>
						<${IconBtn} icon="trash" label=${`Delete ${h.label}`} tone="critical" onClick=${() => (update((l) => l.filter((x) => x.id !== h.id)), setHotspotSel(null))} />
					</div>
					${isOpen
						? html`<div class="ed-group__body">
								<${TextField} label="Label" value=${h.label} onInput=${(v) => patch(h.id, { label: v }, `hs.label.${h.id}`)} />
								<${TextField} label="Description" multiline=${3} value=${h.description || ''} onInput=${(v) => patch(h.id, { description: v }, `hs.desc.${h.id}`)} />
								<div class="ed-grid2">
									<${Select}
										label="Type"
										value=${h.icon || 'info'}
										options=${[
											{ label: 'Information', value: 'info' },
											{ label: 'Link', value: 'link' },
											{ label: 'Add product to cart', value: 'cart' },
										]}
										onChange=${(v) => patch(h.id, { icon: v })}
									/>
									<${Select} label="Pinned to" value=${h.anchor_mesh} options=${meshNames.map((n) => ({ label: meshLabel(eff, n), value: n }))} onChange=${(v) => patch(h.id, { anchor_mesh: v })} />
								</div>
								${h.icon === 'cart'
									? html`<${Select}
											label="Linked product"
											value=${h.linked_product_id || ''}
											options=${[{ label: 'Choose a product…', value: '' }, ...products.map((p) => ({ label: p.title, value: p.id }))]}
											onChange=${(v) => patch(h.id, { linked_product_id: v ? Number(v) : undefined })}
											helpText="Shoppers can add it to the cart from the hotspot."
										/>`
									: null}
								${h.icon === 'link' ? html`<${TextField} label="Link" value=${h.url || ''} placeholder="/pages/care-guide" onInput=${(v) => patch(h.id, { url: v }, `hs.url.${h.id}`)} />` : null}
								<div class="p-field">
									<span class="p-label">Camera</span>
									<div class="ed-btnrow">
										<${Button} size="slim" icon="camera" disabled=${!ed.ctl} onClick=${() => {
											const c = ed.ctl.getCamera();
											patch(h.id, { camera: { position: round3(c.position), target: round3(c.target) } });
										}}>${h.camera ? 'Update fly-to view' : 'Use current view as fly-to'}<//>
										${h.camera ? html`<${Button} size="slim" variant="tertiary" onClick=${() => ed.ctl?.setCamera(h.camera, { animate: true })}>Fly to<//>` : null}
										${h.camera ? html`<${Button} size="slim" variant="tertiary" onClick=${() => patch(h.id, { camera: undefined })}>Remove<//>` : null}
									</div>
									<p class="p-help">When shoppers open the hotspot, the camera flies to this view.</p>
								</div>
								<p class="p-help ed-mono">Offset [${round3(h.offset || [0, 0, 0]).join(', ')}]</p>
							</div>`
						: null}
				</li>`;
			})}
		</ul>
		${list.length ? null : html`<p class="ed-p ed-muted">No hotspots yet. Hotspots point out details like materials or care.</p>`}
		${ed.placing
			? html`<${Banner} tone="info" title="Click the model to place the hotspot" action=${{ content: 'Cancel', onAction: () => setPlacing(false) }} />`
			: html`<${Button} icon="plus" disabled=${!ed.ctl} onClick=${() => setPlacing(true)}>Add hotspot<//>`}
	`;
}

/* ---------- Import / export ---------- */

export function ImportExportPanel() {
	const ed = useEd();
	const [mode, setMode] = useState('raw');
	const [text, setText] = useState('');
	const [error, setError] = useState('');
	const out = useRef(null);
	const variant = onVariant(ed);
	const json = JSON.stringify(variant && mode === 'effective' ? effective(ed) : rawConfig(ed), null, 2);
	const copy = () => {
		out.current?.select();
		try {
			navigator.clipboard?.writeText(json).then(
				() => toast('Configuration copied'),
				() => toast('Selected. Press Ctrl+C to copy'),
			);
		} catch {
			toast('Selected. Press Ctrl+C to copy');
		}
	};
	const doImport = () => {
		let parsed;
		try {
			parsed = JSON.parse(text);
		} catch {
			return setError('This is not valid JSON.');
		}
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return setError('Paste a configuration object.');
		if (parsed.schema_version !== 1) return setError(`Unsupported schema_version: ${parsed.schema_version ?? 'missing'}. Expected 1.`);
		setError('');
		importConfig(parsed);
		setText('');
		select(null);
		toast(variant ? `Imported into ${targetLabel(ed)}. Save to publish.` : 'Configuration imported. Save to publish.');
	};
	return html`
		<div class="p-field">
			<span class="p-label">Export</span>
			${variant
				? html`<${Seg}
						label="Export"
						value=${mode}
						options=${[
							{ value: 'raw', label: 'Variant overrides' },
							{ value: 'effective', label: 'Full result' },
						]}
						onChange=${setMode}
					/>`
				: null}
			<textarea ref=${out} class="p-input--multi ed-code" rows="8" readonly aria-label="Exported configuration" value=${json}></textarea>
			<div class="ed-btnrow"><${Button} size="slim" icon="copy" onClick=${copy}>Copy<//><span class="p-help">${(json.length / 1024).toFixed(1)} KB · schema_version 1</span></div>
		</div>
		<div class="p-field">
			<label class="p-label" for="ed-import">Import</label>
			<textarea id="ed-import" class="p-input--multi ed-code" rows="6" placeholder='{"schema_version": 1, "meshes": {}, …}' value=${text} onInput=${(e) => (setText(e.target.value), setError(''))}></textarea>
			${error ? html`<p class="p-field__error">${error}</p>` : html`<p class="p-help">Replaces ${variant ? `the overrides for ${targetLabel(ed)}` : 'the product setup'}. You can undo it. Configs exported from the WooCommerce plugin import as-is.</p>`}
			<div class="ed-btnrow"><${Button} size="slim" icon="upload" disabled=${!text.trim()} onClick=${doImport}>Import configuration<//></div>
		</div>
	`;
}
