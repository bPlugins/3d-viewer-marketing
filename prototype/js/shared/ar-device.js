// usdz-export, prototype only: simulated AR device (store setup in the prototype bar, like "Cart page").
import { html, cx } from '../core/ui.js';
import { store, useStore } from '../core/store.js';
import { useFeature } from '../core/features.js';

export const AR_DEVICES = [
	['desktop', 'Desktop'],
	['ios', 'iPhone'],
	['android', 'Android'],
];

const valid = (d) => (AR_DEVICES.some(([k]) => k === d) ? d : 'desktop');

export const setArDevice = (d) => store.patch('demo.arDevice', valid(d));

/** The simulated device, or null when the flag is off (the viewer then uses detectArDevice()). */
export function useArDevice() {
	const on = useFeature('usdz-export');
	const device = useStore((s) => valid(s.demo?.arDevice));
	return on ? device : null;
}

export function ArDeviceSwitch() {
	const on = useFeature('usdz-export');
	const device = useStore((s) => valid(s.demo?.arDevice));
	const fail = useStore((s) => !!s.demo?.arFail);
	if (!on) return null;
	return html`<nav class="proto-seg proto-seg--small proto-ar-device" aria-label="AR device">
		<span class="proto-seg__label">AR device</span>
		${AR_DEVICES.map(([k, label]) => html`<button key=${k} class=${cx(device === k && 'is-on')} aria-pressed=${device === k} onClick=${() => setArDevice(k)}>${label}</button>`)}
		<label class="proto-ar-device__fail" title="Make the next AR export fail, to see the fallback">
			<input type="checkbox" checked=${fail} onChange=${(e) => store.patch('demo.arFail', e.currentTarget.checked)} /> Fail export
		</label>
	</nav>`;
}
