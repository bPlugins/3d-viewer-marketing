// Presets: reusable material, environment, camera and animation settings for the editor.
import { html, useState } from '../../js/core/ui.js';
import { store, useStore } from '../core/store.js';
import { AdminFrame } from './chrome.js';
import { Page, Card, Button, Badge, Modal, TextField, Select, Switch, Text, Icon, toast } from '../ui/polaris.js';

const TYPES = [
	{ id: 'material', label: 'Materials', one: 'Material', icon: 'palette', text: 'Colour and finish you apply to parts in one click.' },
	{ id: 'environment', label: 'Environments', one: 'Environment', icon: 'sun', text: 'Lighting and shadows for the scene.' },
	{ id: 'camera', label: 'Camera views', one: 'Camera view', icon: 'camera', text: 'Starting angle and distance.' },
	{ id: 'animation', label: 'Animations', one: 'Animation', icon: 'play', text: 'Which clip plays, how fast and whether it loops.' },
];

const ENV_PRESETS = ['studio', 'apartment', 'city', 'dawn', 'forest', 'lobby', 'night', 'park', 'sunset', 'warehouse'];
const DEFAULTS = {
	material: { baseColor: '#b08d57', metalness: 0, roughness: 0.5 },
	environment: { preset: 'studio', intensity: 1, shadowsEnabled: true, shadowIntensity: 0.5 },
	camera: { position: [1.8, 1.15, 2.15], target: [0, 0.38, 0] },
	animation: { clip: 'Shade_Tilt', loop: true, speed: 1 },
};
const vec = (a) => (a || []).map((n) => Number(n).toFixed(2)).join(', ');

function summary(p) {
	const d = p.data || {};
	if (p.type === 'material') return html`<span class="as-chip" style=${{ background: d.baseColor }}></span>${d.baseColor} · metalness ${d.metalness} · roughness ${d.roughness}`;
	if (p.type === 'environment') return `${d.preset} lighting · intensity ${d.intensity}${d.shadowsEnabled ? ' · shadows' : ''}`;
	if (p.type === 'camera') return `Position ${vec(d.position)} · target ${vec(d.target)}`;
	return `${d.clip} · ${d.speed}× · ${d.loop ? 'loops' : 'plays once'}`;
}

const clamp01 = (v, old) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : old);

export default function Presets() {
	const s = useStore();
	const [edit, setEdit] = useState(null); // {id|null, type, name, data}
	const [del, setDel] = useState(null);
	const all = Object.values(s.presets);

	const open = (type, p) => setEdit(p ? JSON.parse(JSON.stringify(p)) : { id: null, type, name: '', data: { ...DEFAULTS[type] } });
	const setData = (k, v) => setEdit({ ...edit, data: { ...edit.data, [k]: v } });
	const save = () => {
		const id = edit.id || store.nextId('presets');
		store.patch(['presets', id], { id, type: edit.type, name: edit.name.trim(), data: edit.data });
		toast(edit.id ? 'Preset saved' : 'Preset created');
		setEdit(null);
	};
	const remove = () => {
		store.patch('presets', (ps) => {
			const next = { ...ps };
			delete next[del.id];
			return next;
		});
		toast('Preset deleted');
		setDel(null);
	};

	const d = edit?.data || {};
	const fields =
		edit?.type === 'material'
			? html`
					<div class="as-row2">
						<label class="p-field"><span class="p-label">Base colour</span><span class="as-colorpick as-colorpick--field"><input type="color" value=${d.baseColor} onInput=${(e) => setData('baseColor', e.target.value)} /><span>${d.baseColor}</span></span></label>
						<${TextField} label="Metalness" type="number" min=${0} max=${1} step=${0.05} value=${d.metalness} onInput=${(v) => setData('metalness', clamp01(v, d.metalness))} helpText="0 = fabric or wood, 1 = metal" />
					</div>
					<${TextField} label="Roughness" type="number" min=${0} max=${1} step=${0.05} value=${d.roughness} onInput=${(v) => setData('roughness', clamp01(v, d.roughness))} helpText="0 = mirror-like, 1 = matte" />
				`
			: edit?.type === 'environment'
				? html`
						<div class="as-row2">
							<${Select} label="Lighting" value=${d.preset} options=${ENV_PRESETS.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))} onChange=${(v) => setData('preset', v)} />
							<${TextField} label="Intensity" type="number" min=${0} max=${3} step=${0.1} value=${d.intensity} onInput=${(v) => setData('intensity', Number.isFinite(v) ? v : d.intensity)} />
						</div>
						<${Switch} label="Shadows" checked=${d.shadowsEnabled} onChange=${(v) => setData('shadowsEnabled', v)} />
						${d.shadowsEnabled ? html`<${TextField} label="Shadow strength" type="number" min=${0} max=${1} step=${0.05} value=${d.shadowIntensity} onInput=${(v) => setData('shadowIntensity', clamp01(v, d.shadowIntensity))} />` : null}
					`
				: edit?.type === 'camera'
					? html`
							<div class="as-row2">
								<${TextField} label="Position (x, y, z)" value=${vec(d.position)} disabled />
								<${TextField} label="Target (x, y, z)" value=${vec(d.target)} disabled />
							</div>
							<div class="as-callout"><${Icon} name="camera" size=${16} /><span>Captured in the editor. Frame the product, then choose <strong>Save view as preset</strong> in the Camera panel.</span></div>
						`
					: edit?.type === 'animation'
						? html`
								<div class="as-row2">
									<${TextField} label="Clip name" value=${d.clip} onInput=${(v) => setData('clip', v)} helpText="Must match a clip in the model file." />
									<${TextField} label="Speed" type="number" min=${0.1} max=${4} step=${0.1} suffix="×" value=${d.speed} onInput=${(v) => setData('speed', Number.isFinite(v) ? v : d.speed)} />
								</div>
								<${Switch} label="Loop" checked=${d.loop} onChange=${(v) => setData('loop', v)} />
							`
						: null;

	return html`
		<${AdminFrame} current="app.presets" appTitle="Presets">
			<${Page} title="Presets" subtitle="Save settings once and reuse them on any product in the editor." primaryAction=${{ content: 'Create preset', icon: 'plus', onAction: () => open('material') }}>
				${TYPES.map((t) => {
					const items = all.filter((p) => p.type === t.id);
					return html`
						<${Card} title=${t.label} subtitle=${t.text} actions=${t.id === 'camera' ? [] : [{ content: `Add ${t.one.toLowerCase()}`, icon: 'plus', onAction: () => open(t.id) }]}>
							${items.length
								? html`<ul class="as-presets">
										${items.map(
											(p) => html`<li class="as-preset">
												<span class="as-preset__icon"><${Icon} name=${t.icon} size=${16} /></span>
												<div class="as-preset__text">
													<span class="as-preset__name">${p.name}</span>
													<span class="as-preset__sum">${summary(p)}</span>
												</div>
												<div class="as-preset__actions">
													<${Button} size="slim" variant="tertiary" icon="edit" title=${`Edit ${p.name}`} onClick=${() => open(t.id, p)} />
													<${Button} size="slim" variant="tertiary" icon="trash" title=${`Delete ${p.name}`} onClick=${() => setDel(p)} />
												</div>
											</li>`,
										)}
									</ul>`
								: html`<${Text} tone="subdued">${t.id === 'camera' ? 'No camera views yet. Save one from the editor’s Camera panel.' : `No ${t.label.toLowerCase()} yet.`}<//>`}
						<//>
					`;
				})}
			<//>
			<${Modal}
				open=${!!edit}
				title=${edit?.id ? `Edit ${edit.name || 'preset'}` : 'Create preset'}
				onClose=${() => setEdit(null)}
				primaryAction=${{ content: edit?.id ? 'Save' : 'Create', onAction: save, disabled: !edit?.name?.trim() }}
				secondaryActions=${[{ content: 'Cancel', onAction: () => setEdit(null) }]}
			>
				${edit
					? html`
							<div class="as-row2">
								<${TextField} label="Name" value=${edit.name} onInput=${(v) => setEdit({ ...edit, name: v })} placeholder="e.g. Brushed brass" maxLength=${60} />
								${edit.id
									? html`<div class="p-field"><span class="p-label">Type</span><span><${Badge}>${TYPES.find((t) => t.id === edit.type).one}<//></span></div>`
									: html`<${Select} label="Type" value=${edit.type} options=${TYPES.map((t) => ({ value: t.id, label: t.one }))} onChange=${(v) => setEdit({ ...edit, type: v, data: { ...DEFAULTS[v] } })} />`}
							</div>
							${fields}
						`
					: null}
			<//>
			<${Modal}
				open=${!!del}
				size="small"
				title="Delete preset?"
				onClose=${() => setDel(null)}
				primaryAction=${{ content: 'Delete', destructive: true, onAction: remove }}
				secondaryActions=${[{ content: 'Cancel', onAction: () => setDel(null) }]}
			>
				<${Text}>"${del?.name}" will be removed from the preset list. Products that already use it keep their settings.<//>
			<//>
		<//>
	`;
}
