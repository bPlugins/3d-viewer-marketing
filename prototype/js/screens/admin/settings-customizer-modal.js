// customizer-modal: "Customizer layout" row in Settings → Customer Drawer.
import { html } from '../../core/ui.js';
import { useFeature } from '../../core/features.js';
import { PhpIcon } from '../../shared/icons.js';
import { layoutOf } from '../../shared/product-3d.js';

export function CustomizerLayoutRow({ draft, set }) {
	if (!useFeature('customizer-modal')) return null;
	const id = 'wc3d_customizer_layout';
	return html`<div class="wc3d-row">
		<span class="wc3d-row__icon"><${PhpIcon} name="layout" /></span>
		<div class="wc3d-row__main">
			<label class="wc3d-row__title" for=${id}>Customizer layout</label>
			<p class="wc3d-row__desc" id=${id + '-desc'}>
				How the Customize button opens on product pages. Drawer slides in beside the 3D viewer. Modal opens a large window with a bigger viewer, the options, the live total and Add to cart.
			</p>
		</div>
		<div class="wc3d-row__control">
			<select id=${id} class="wc3d-select" name="wc3d_settings[customizer_layout]" aria-describedby=${id + '-desc'} value=${layoutOf(draft)} onChange=${(e) => set('customizer_layout', e.currentTarget.value)}>
				<option value="drawer">Drawer</option>
				<option value="modal">Modal</option>
			</select>
		</div>
	</div>`;
}

/** Options::sanitize() for the key; nothing is written with the flag off, so a stored value is kept. */
export function sanitizeLayout(input, on) {
	return on ? { customizer_layout: layoutOf(input) } : {};
}
