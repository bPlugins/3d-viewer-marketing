// Block inspector → Style tab, the Additional panel and the free build's Upgrade panel
// (3d-viewer-premium Tabs/Style/Style.tsx, Tabs/Style/Additional.tsx, Upgrade.tsx).
import { html } from '../../../js/core/ui.js';
import { Panel, Range, Text, TextArea, Color, Unit, MediaField, DeviceSwitch } from '../editor-controls.js';
import { normalizeControls, CONTROLS_DEFAULTS } from '../render.js';
import { openProModal } from '../../core/bus.js';

const HELP = {
	controlSize: 'Width and height of each control button, in pixels. Inline labels keep this height and grow sideways.',
	controlGap: 'Space between controls stacked in the same corner, in pixels.',
	controlOffset: 'Distance from the viewer edge to the controls, in pixels.',
	bgImage: 'Shown behind the model. A skybox, or an environment image used as the skybox, covers it.',
	additionalCSS:
		"Write full CSS rules with a selector, or they have no effect. Give the viewer an ID above and target it, for example: #my-viewer model-viewer { border-radius: 12px; }. WordPress's own Advanced › Additional CSS is different: it takes plain properties, no selector, and styles only the block's outer box.",
};

export function StyleTab({ a, set, ctx }) {
	const styles = a.styles || {};
	const setStyles = (patch) => set({ styles: { ...styles, ...patch } });
	const dev = ctx.device;
	const resp = (v, fb) => (v && typeof v === 'object' ? v[dev] ?? v.desktop ?? fb : v || fb);
	const setResp = (key, value) => {
		const cur = styles[key];
		const base = cur && typeof cur === 'object' ? cur : { desktop: cur, tablet: cur, mobile: cur };
		setStyles({ [key]: { ...base, [dev]: value } });
	};
	const controls = normalizeControls(a.controls);
	const setControls = (patch) => set({ controls: { ...CONTROLS_DEFAULTS, ...controls, ...patch } });
	const device = html`<${DeviceSwitch} device=${dev} onChange=${ctx.setDevice} />`;
	return html`<div class="components-panel">
		<${Panel} id="style" icon="style" title="Style" open=${ctx.open.style} onToggle=${(v) => ctx.toggle('style', v)}>
			<${Unit} label=${html`<span class="ld-be-gap5">Width ${device}</span>`} value=${resp(styles.width, '100%')} units=${[{ value: 'px', label: 'px', default: 500 }, { value: '%', label: '%', default: 100 }]} onChange=${(v) => setResp('width', v)} />
			<${Unit} label=${html`<span class="ld-be-gap5">Height ${device}</span>`} value=${resp(styles.height, '400px')} units=${[{ value: 'px', label: 'px', default: 500 }, { value: '%', label: '%', default: 100 }, { value: 'vh', label: 'vh', default: 100 }]} onChange=${(v) => setResp('height', v)} />
			<${Unit} label="Thumb Size" value=${styles.thumbSize || '90px'} units=${[{ value: 'px', label: 'px', default: 100 }]} onChange=${(thumbSize) => setStyles({ thumbSize })} />
			<${Range} pro label="Control Size (px)" info=${HELP.controlSize} value=${controls.size} min=${24} max=${64} onChange=${(size) => setControls({ size })} />
			<${Range} pro label="Control Spacing (px)" info=${HELP.controlGap} value=${controls.gap} min=${0} max=${40} onChange=${(gap) => setControls({ gap })} />
			<${Range} pro label="Control Edge Offset (px)" info=${HELP.controlOffset} value=${controls.offset} min=${0} max=${60} onChange=${(offset) => setControls({ offset })} />
			<${Color} label="Background Color" value=${styles.bgColor || '#ffffff'} defaultColor="#ffffff" onChange=${(bgColor) => setStyles({ bgColor })} />
			<div class="components-panel__row"><label><strong>Note: Color will be ignored if a background image is used</strong></label></div>
			<br />
			<${MediaField} pro label="Background Image" info=${HELP.bgImage} placeholder="Background Image" value=${styles.bgImage} onChange=${(bgImage) => setStyles({ bgImage })} onBrowse=${(cb) => ctx.media('image', cb)} />
			${a.progressBar && html`<${Color} label="ProgressBar Color" value=${styles.progressBarColor || '#666'} defaultColor="#666" onChange=${(progressBarColor) => setStyles({ progressBarColor })} />`}
		<//>
	</div>`;
}

export function AdditionalPanel({ a, set, ctx }) {
	const additional = a.additional || {};
	const setAdd = (patch) => set({ additional: { ...additional, ...patch } });
	return html`<${Panel} id="additional" icon="additional" title="Additional" open=${ctx.open.additional} onToggle=${(v) => ctx.toggle('additional', v)}>
		<${Text} pro className="mt10" label="ID" value=${additional.ID} onChange=${(ID) => setAdd({ ID })} />
		<${Text} label="Class" value=${additional.Class || ''} onChange=${(Class) => setAdd({ Class })} />
		<${TextArea} pro className="mt10" label="CSS" help=${HELP.additionalCSS} value=${additional.CSS} onChange=${(CSS) => setAdd({ CSS })} />
	<//>`;
}

/** Upgrade.tsx, shown only without a licence. */
export function UpgradePanel() {
	return html`<div class="components-panel__body is-opened ld-be-upgrade-wrap">
		<div class="bp3d-upgrade-panel">
			<h2>Upgrade to Pro</h2>
			<p>Upgrade to 3D Viewer Pro to unlock all the features of 3D Viewer.</p>
			<div class="ld-be-flex">
				<button type="button" class="button button-primary" onClick=${() => openProModal('')}>Upgrade to Pro</button>
				<a class="button button-primary" href="https://wordpress.org/support/plugin/3d-viewer" target="_blank" rel="noopener noreferrer">Support</a>
			</div>
		</div>
	</div>`;
}

