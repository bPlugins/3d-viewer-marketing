// hdri-download: download state on the Lighting & Presets buttons (specs/hdri-download.md §A).
import { html } from '../../../../core/ui.js';
import { useStore } from '../../../../core/store.js';
import { useFeature } from '../../../../core/features.js';
import { InfoBanner, LINK_CLASS } from '../../../../shared/editor-ui.js';
import { ArrowDownTrayIcon, WarningIcon } from '../../../../shared/icons.js';
import { ENVIRONMENT_PRESETS } from '../../../../engine/viewer.js';
import { FLAG, isInstalled, missingPresets, downloadPresets, downloadAll, useHdriJobs, presetLabel, presetSize, sizeOf } from '../../../../shared/hdri.js';

const ACTION_BTN = 'wc3d-btn wc3d-btn-sm wc3d-btn-soft';

export function usePresetDownloads() {
	const on = useFeature(FLAG);
	const s = useStore();
	const { jobs } = useHdriJobs();
	const missing = (p) => on && !isInstalled(s, p);
	return {
		on,
		request: (p) => missing(p) && jobs[p]?.status !== 'downloading' && downloadPresets([p]),
		busy: (p) => jobs[p]?.status === 'downloading',
		title: (p) => (missing(p) ? `${presetLabel(p)} · not downloaded (${presetSize(p)}). Click to download.` : undefined),
	};
}

export function PresetDownloadGlyph({ preset }) {
	const s = useStore();
	const { jobs } = useHdriJobs();
	if (isInstalled(s, preset) || jobs[preset]?.status === 'downloading') return null;
	return jobs[preset]?.status === 'error'
		? html`<${WarningIcon} size=${10} class="absolute top-[3px] right-[3px] text-amber-500" />`
		: html`<${ArrowDownTrayIcon} size=${10} class="absolute top-[3px] right-[3px] opacity-50" />`;
}

export function PresetDownloadBar({ preset }) {
	const { jobs } = useHdriJobs();
	const job = jobs[preset];
	if (job?.status !== 'downloading') return null;
	return html`<span aria-hidden="true" class="absolute left-0 bottom-0 h-[3px] bg-current opacity-50 transition-[width] duration-100" style=${{ width: job.progress + '%' }}></span>`;
}

export function PresetDownloadSummary() {
	const on = useFeature(FLAG);
	const s = useStore();
	const { jobs, batch } = useHdriJobs();
	if (!on) return null;
	const missing = missingPresets(s);
	if (!missing.length) return null;
	const total = ENVIRONMENT_PRESETS.length;
	const failed = missing.filter((p) => jobs[p]?.status === 'error');
	return html`<p class="mt-2 mb-0 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400" aria-live="polite">
		${batch
			? `Downloading ${Math.min(batch.done + 1, batch.total)} of ${batch.total}…`
			: html`${total - missing.length} of ${total} presets downloaded ·${' '}<button type="button" class=${LINK_CLASS} onClick=${downloadAll}>${failed.length ? 'Try again' : 'Download all'} (${sizeOf(missing)})</button>`}
	</p>`;
}

export function PresetDownloadBanner({ preset }) {
	const on = useFeature(FLAG);
	const s = useStore();
	const { jobs } = useHdriJobs();
	if (!on || isInstalled(s, preset)) return null;
	const job = jobs[preset];
	const name = presetLabel(preset);
	if (job?.status === 'downloading')
		return html`<${InfoBanner} compact role="status">Downloading ${name}… ${job.progress}%<//>`;
	if (job?.status === 'error')
		return html`<${InfoBanner} tone="danger" role="alert" title=${`Couldn’t download ${name} lighting.`}>
			<p class="m-0">${job.error}</p>
			<div class="flex flex-wrap items-center gap-3 pt-0.5">
				<button type="button" class=${ACTION_BTN} onClick=${() => downloadPresets([preset])}>Try again</button>
				<a href="#admin.settings.scene" class=${LINK_CLASS}>Upload the files in Settings</a>
			</div>
		<//>`;
	return html`<${InfoBanner} tone="warning" title=${`${name} lighting isn’t downloaded yet`}>
		<p class="m-0">The preview and your store use Studio lighting until it is.</p>
		<div class="pt-0.5">
			<button type="button" class=${ACTION_BTN} onClick=${() => downloadPresets([preset])}><${ArrowDownTrayIcon} size=${13} />Download (${presetSize(preset)})</button>
		</div>
	<//>`;
}
