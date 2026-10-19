// hdri-download: "Lighting Presets" row in Settings → Scene & Performance (specs/hdri-download.md §B).
// Acts at once through REST; not part of the Save form.
import { html, cx, useRef, useState } from '../../core/ui.js';
import { useStore } from '../../core/store.js';
import { useFeature } from '../../core/features.js';
import { PhpIcon } from '../../shared/icons.js';
import { ENVIRONMENT_PRESETS, ENVIRONMENT_PRESET_FILES } from '../../engine/viewer.js';
import {
	FLAG,
	PRESETS_ZIP_URL,
	isInstalled,
	installedSource,
	missingPresets,
	downloadPresets,
	downloadAll,
	uploadPresetFiles,
	useHdriJobs,
	presetLabel,
	presetSize,
	sizeOf,
	listText,
} from '../../shared/hdri.js';

const SOURCE_LABEL = { bundled: 'Included', download: 'Downloaded', upload: 'Uploaded' };

function Status({ preset }) {
	const s = useStore();
	const { jobs, batch } = useHdriJobs();
	const job = jobs[preset];
	if (isInstalled(s, preset)) return html`<span class="wc3d-badge wc3d-badge-dot wc3d-badge-success">${SOURCE_LABEL[installedSource(s, preset)] || 'Downloaded'}</span>`;
	if (job?.status === 'downloading') return html`<span class="wc3d-badge wc3d-badge-brand">Downloading ${job.progress}%</span>`;
	const action = (label) =>
		html`<button type="button" class="wc3d-link" disabled=${!!batch} onClick=${() => downloadPresets([preset])}>${label}</button>`;
	if (job?.status === 'error') return html`<span class="wc3d-hdri-list__status"><span class="wc3d-badge wc3d-badge-dot wc3d-badge-danger">Failed</span>${action('Retry')}</span>`;
	return html`<span class="wc3d-hdri-list__status"><span class="wc3d-badge wc3d-badge-dot">Not downloaded</span>${action('Download')}</span>`;
}

function UploadResult({ result }) {
	if (!result) return null;
	const { added, already, skipped } = result;
	const lines = [];
	if (added.length) lines.push(['success', `Added ${added.length} preset${added.length > 1 ? 's' : ''}: ${listText(added.map(presetLabel))}.`]);
	if (already.length) lines.push(['info', `Already installed: ${listText(already.map(presetLabel))}.`]);
	if (skipped.length)
		lines.push(['error', `Skipped ${skipped.length} file${skipped.length > 1 ? 's' : ''}: ${skipped.map((f) => `${f.name} ${f.reason}`).join('; ')}.`]);
	if (!lines.length) lines.push(['error', 'No files were uploaded.']);
	return html`<div class="wc3d-hdri-result" role="status">
		${lines.map(([tone, text]) => html`<p key=${text} class=${'wc3d-hdri-result__line is-' + tone}>${text}</p>`)}
	</div>`;
}

export function LightingPresetsRow() {
	const on = useFeature(FLAG);
	const s = useStore();
	const { jobs, batch } = useHdriJobs();
	const input = useRef(null);
	const [result, setResult] = useState(null);
	const [reading, setReading] = useState(false);
	if (!on) return null;

	const missing = missingPresets(s);
	const total = ENVIRONMENT_PRESETS.length;
	const failed = missing.some((p) => jobs[p]?.status === 'error');

	const onFiles = async (e) => {
		const el = e.currentTarget;
		const files = [...(el.files || [])];
		el.value = '';
		if (!files.length) return;
		setReading(true);
		setResult(await uploadPresetFiles(files));
		setReading(false);
	};

	return html`<div class="wc3d-row wc3d-hdri-row">
		<span class="wc3d-row__icon"><${PhpIcon} name="sun" /></span>
		<div class="wc3d-row__main">
			<span class="wc3d-row__title" id="wc3d_hdri-title">
				Lighting Presets
				<span class=${cx('wc3d-badge wc3d-badge-dot', missing.length ? '' : 'wc3d-badge-success')}>${total - missing.length} of ${total} installed</span>
			</span>
			<p class="wc3d-row__desc">
				Studio comes with the plugin. The other presets are downloaded once from GitHub into your uploads folder when you need them. Shoppers' browsers always load them from your own site.
			</p>
		</div>
		<div class="wc3d-row__control wc3d-hdri-actions">
			${missing.length > 0 &&
			html`<button type="button" class="wc3d-btn wc3d-btn-soft" disabled=${!!batch} onClick=${downloadAll}>
				<${PhpIcon} name="download" size=${17} />
				${batch ? `Downloading ${Math.min(batch.done + 1, batch.total)} of ${batch.total}…` : `${failed ? 'Try again' : 'Download all'} (${sizeOf(missing)})`}
			</button>`}
			<button type="button" class="wc3d-btn wc3d-btn-soft" disabled=${reading} onClick=${() => input.current?.click()}>
				<${PhpIcon} name="upload" size=${17} />${reading ? 'Checking files…' : 'Upload files…'}
			</button>
			<input ref=${input} type="file" accept=".zip,.hdr" multiple hidden onChange=${onFiles} />
		</div>
		<div class="wc3d-hdri-body">
			<ul class="wc3d-hdri-list" aria-labelledby="wc3d_hdri-title">
				${ENVIRONMENT_PRESETS.map(
					(p) => html`<li key=${p} class="wc3d-hdri-list__item">
						<span class="wc3d-hdri-list__name">${presetLabel(p)}</span>
						<span class="wc3d-hdri-list__file">${presetSize(p)} · ${ENVIRONMENT_PRESET_FILES[p]}</span>
						<${Status} preset=${p} />
					</li>`
				)}
			</ul>

			<p class="wc3d-row__desc wc3d-hdri-help">
				Server can't reach GitHub? <a href=${PRESETS_ZIP_URL} target="_blank" rel="noopener noreferrer">Download the presets zip</a> (about 13 MB) on your computer and upload it here.
			</p>
			<${UploadResult} result=${result} />
		</div>
	</div>`;
}
