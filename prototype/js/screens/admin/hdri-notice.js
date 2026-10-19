// hdri-download: notice on the 3D Models screens while saved products use presets that aren't downloaded (specs/hdri-download.md §C).
import { html, useState } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { useFeature } from '../../core/features.js';
import { Notice } from '../../shared/admin-ui.js';
import { FLAG, missingUsed, downloadPresets, useHdriJobs, presetLabel, sizeOf, listText } from '../../shared/hdri.js';

function productsText(s, ids) {
	const names = ids.map((id) => s.products[id]?.name).filter(Boolean);
	return names.length > 3 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : listText(names);
}

export function HdriNotice() {
	const on = useFeature(FLAG);
	const s = useStore();
	const { jobs } = useHdriJobs();
	const [outcome, setOutcome] = useState(null); // { ok } | { failed, error }
	const [running, setRunning] = useState(null); // presets being downloaded from this notice
	if (!on) return null;

	if (running) {
		const current = running.find((p) => jobs[p]?.status === 'downloading');
		const n = running.indexOf(current) + 1;
		return html`<${Notice} type="info"><p>${current ? `Downloading ${presetLabel(current)}… (${n} of ${running.length})` : 'Downloading lighting presets…'}</p><//>`;
	}
	if (outcome?.ok)
		return html`<${Notice} type="success" dismissible onDismiss=${() => setOutcome(null)}>
			<p>Lighting presets downloaded. Your products show their chosen lighting again.</p>
		<//>`;

	const used = missingUsed(s);
	if (!used.length) return null;
	const presets = used.map((u) => u.preset);
	const key = presets.join();
	if (!outcome && s.hdri?.dismissed === key) return null;

	const ids = [...new Set(used.flatMap((u) => u.productIds))];
	const run = async () => {
		setOutcome(null);
		setRunning(presets);
		const failed = await downloadPresets(presets);
		setRunning(null);
		setOutcome(failed.length ? { failed, error: jobs[failed[0]]?.error } : { ok: true });
	};
	const actions = html`<p>
		<button type="button" class="button button-primary" onClick=${run}>${outcome?.failed ? 'Try again' : 'Download now'}</button>
		${' '}<a href="#admin.settings.scene">${outcome?.failed ? 'Upload the files in Settings' : 'Other options'}</a>
	</p>`;

	if (outcome?.failed)
		return html`<${Notice} type="error">
			<p><strong>Couldn’t download the lighting presets.</strong> ${outcome.error || ''}</p>
			${actions}
		<//>`;

	return html`<${Notice} type="warning" dismissible onDismiss=${() => store.patch('hdri.dismissed', key)}>
		<p>
			<strong>Some products use lighting that isn’t downloaded yet.</strong>
			${' '}${productsText(s, ids)} ${ids.length === 1 ? 'uses' : 'use'} ${listText(presets.map(presetLabel))} lighting (${sizeOf(presets)}).
			Shoppers see Studio lighting until it’s downloaded.
		</p>
		${actions}
	<//>`;
}
