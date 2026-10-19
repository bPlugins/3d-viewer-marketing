// usdz-export: "AR shows the customer's configuration" row inside its Settings → Features card.
import { html } from '../../core/ui.js';
import { WcToggle } from '../../shared/admin-ui.js';

export function ArConfiguredRow({ draft, set }) {
	const id = 'wc3d_module_usdz-export_ar_configured';
	return html`<div class="wc3d-row">
		<div class="wc3d-row__main">
			<label class="wc3d-row__title" for=${id} id=${id + '-title'}>AR shows the customer's configuration</label>
			<p class="wc3d-row__desc" id=${id + '-desc'}>
				iPhone, iPad and Android build the AR model from what the shopper sees: colors, materials, chosen options and hidden parts. With nothing changed, or if the phone can't build it, AR opens the uploaded USDZ or GLB.
			</p>
		</div>
		<div class="wc3d-row__control">
			<${WcToggle} id=${id} name="wc3d_modules[settings][usdz-export][ar_configured]" labelledBy=${id + '-title'} describedBy=${id + '-desc'} checked=${!!draft.ar_configured} onChange=${(v) => set('ar_configured', v)} />
		</div>
	</div>`;
}
