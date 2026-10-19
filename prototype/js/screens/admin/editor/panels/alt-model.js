// "Alternative 3D Model" section (components/VariationModelSelector) plus the in-page
// stand-in for the WordPress media modal that every Choose…/Replace button opens.
import { html, render, useState, useEffect, useRef, cx } from '../../../../core/ui.js';
import { store, useStore } from '../../../../core/store.js';
import { editor, useEditor } from '../editor-store.js';
import { attachmentUrl } from '../../../../shared/product-3d.js';
import { EYEBROW_CLASS, HELP_CLASS, LINK_DANGER_CLASS, SURFACE_CLASS } from '../../../../shared/editor-ui.js';
import { Icon, CubeIcon, UploadIcon } from '../../../../shared/icons.js';
import { useFeature } from '../../../../core/features.js';
import { useExternalUrl, inLibrary, ExternalTag, ExternalHost, ExternalDetails } from '../../../../shared/external-url.js';

// ── Media modal ─────────────────────────────────────────────────────────────

const KIND_BY_EXT = { glb: 'model', gltf: 'model', usdz: 'usdz', hdr: 'hdri', exr: 'hdri' };
const ACCEPT = { image: 'image/*', model: '.glb,.gltf', hdri: '.hdr,.exr', usdz: '.usdz' };

function kindOf(file) {
	const ext = (file.name.split('.').pop() || '').toLowerCase();
	if (KIND_BY_EXT[ext]) return KIND_BY_EXT[ext];
	return file.type.startsWith('image/') ? 'image' : 'file';
}

/** URL the config stores for an attachment (WP gives a full uploads URL; the prototype keeps what it can show). */
export function mediaUrl(att) {
	if (!att) return '';
	return attachmentUrl(att) || att.url || att.filename || '';
}

const formatSize = (b) => (!b ? '' : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function MediaTile({ att, selected, onPick }) {
	const isImage = att.kind === 'image';
	return html`<li class="list-none m-0 p-0">
		<button
			type="button"
			aria-pressed=${selected}
			aria-label=${att.filename}
			onClick=${onPick}
			class=${cx(
				'relative block w-full aspect-square p-0 m-0 border-0 cursor-pointer overflow-hidden bg-[#f0f0f1] shadow-[inset_0_0_15px_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(0,0,0,0.05)]',
				selected && 'outline outline-[3px] outline-offset-[-3px] outline-[#2271b1]',
			)}
		>
			${isImage
				? html`<img src=${mediaUrl(att)} alt="" class="block w-full h-full object-cover" />`
				: html`<span class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2 text-[#50575e]">
						<${Icon} name=${att.kind === 'hdri' ? 'lighting' : 'cube'} size=${34} strokeWidth=${1.5} />
						<span class="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-white/90 text-[11px] leading-tight text-[#1d2327] truncate text-center">${att.filename}</span>
					</span>`}
			<${ExternalTag} att=${att} class="wc3d-ext-tile-badge" />
			${selected &&
			html`<span class="absolute top-0 right-0 w-6 h-6 flex items-center justify-center bg-[#2271b1] text-white shadow-[0_0_0_1px_#fff,0_0_0_2px_#2271b1]">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
			</span>`}
		</button>
	</li>`;
}

function MediaModal({ title, button, filter, urlKind, onSelect, onClose }) {
	const attachments = useStore((s) => s.attachments || {});
	const [tab, setTab] = useState('library');
	const [picked, setPicked] = useState(null);
	const fileRef = useRef(null);
	const dialogRef = useRef(null);
	// external-url: "External URL" tab for model and USDZ pickers.
	const extKind = urlKind || (filter === 'model' || filter === 'usdz' ? filter : '');
	const urlTab = useFeature('external-url') && !!extKind;
	const ext = useExternalUrl(extKind || 'model');

	const items = Object.values(attachments)
		.filter((a) => !filter || a.kind === filter)
		.filter(inLibrary)
		.sort((a, b) => b.id - a.id);
	const current = picked ? attachments[picked] : null;

	useEffect(() => {
		dialogRef.current?.focus();
		const onKey = (e) => e.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const upload = (e) => {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		const id = store.nextId('attachments');
		const kind = kindOf(file);
		const title = file.name.replace(/\.[^.]+$/, '');
		store.patch(`attachments.${id}`, { id, kind, title, filename: file.name, mime: file.type || 'application/octet-stream', sizeBytes: file.size, blobUrl: URL.createObjectURL(file) });
		setPicked(id);
		setTab('library');
	};

	return html`<div class="fixed inset-0 z-[100000]" role="presentation">
		<div class="absolute inset-0 bg-black/70" onClick=${onClose}></div>
		<div
			ref=${dialogRef}
			tabIndex=${-1}
			role="dialog"
			aria-modal="true"
			aria-label=${title}
			class="absolute inset-0 sm:inset-[30px] flex flex-col bg-white text-[#1d2327] shadow-[0_5px_15px_rgba(0,0,0,0.7)] outline-none text-[13px]"
		>
			<div class="flex items-center justify-between h-[50px] flex-shrink-0 ps-4">
				<h1 class="m-0 text-[22px] font-semibold leading-[50px] truncate">${title}</h1>
				<button type="button" aria-label="Close dialog" onClick=${onClose} class="w-[50px] h-[50px] flex items-center justify-center bg-transparent border-0 cursor-pointer text-[#646970] hover:text-[#135e96]">
					<${Icon} name="close" size=${20} />
				</button>
			</div>
			<div class="flex gap-0 px-4 border-b border-[#dcdcde] flex-shrink-0">
				${[
					['upload', 'Upload files'],
					['library', 'Media Library'],
					...(urlTab ? [['url', 'External URL']] : []),
				].map(
					([k, label]) => html`<button
						key=${k}
						type="button"
						aria-pressed=${tab === k}
						onClick=${() => setTab(k)}
						class=${cx(
							'h-10 px-2.5 me-1 bg-transparent border-0 border-b-4 border-solid cursor-pointer text-[14px]',
							tab === k ? 'border-[#1d2327] text-[#1d2327] font-semibold' : 'border-transparent text-[#2271b1] hover:text-[#135e96]',
						)}
					>
						${label}
					</button>`,
				)}
			</div>
			<div class="flex flex-1 min-h-0">
				${tab === 'url' && urlTab
					? html`<div class="flex-1 min-w-0 min-h-0">${ext.pane}</div>`
					: tab === 'upload'
					? html`<div class="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
							<p class="m-0 text-[20px]">Drop files to upload</p>
							<p class="m-0 text-[#50575e]">or</p>
							<button type="button" class="h-10 px-4 rounded-[3px] border border-[#2271b1] bg-[#f6f7f7] text-[#2271b1] cursor-pointer text-[14px]" onClick=${() => fileRef.current?.click()}>Select Files</button>
							<input ref=${fileRef} type="file" accept=${ACCEPT[filter] || undefined} class="hidden" onChange=${upload} />
							<p class="m-0 text-[12px] text-[#646970]">Maximum upload file size: 64 MB.</p>
						</div>`
					: html`<div class="flex-1 min-w-0 overflow-y-auto p-4">
							${items.length === 0
								? html`<p class="m-0 py-10 text-center text-[#646970] text-[14px]">No items found.</p>`
								: html`<ul class="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-4 m-0 p-0">
										${items.map((a) => html`<${MediaTile} key=${a.id} att=${a} selected=${picked === a.id} onPick=${() => setPicked(picked === a.id ? null : a.id)} />`)}
									</ul>`}
						</div>`}
				${current &&
				tab === 'library' &&
				html`<aside class="hidden md:block w-[267px] flex-shrink-0 overflow-y-auto border-s border-[#dcdcde] bg-[#f6f7f7] p-4">
					<h2 class="m-0 mb-3 text-[12px] font-semibold uppercase text-[#646970]">Attachment details</h2>
					${current.kind === 'image' && html`<img src=${mediaUrl(current)} alt="" class="block w-[120px] h-[90px] object-cover mb-3" />`}
					<div class="font-semibold break-all">${current.filename}</div>
					<div class="text-[#646970] mt-1">${current.mime}</div>
					${current.sizeBytes ? html`<div class="text-[#646970]">${formatSize(current.sizeBytes)}</div>` : null}
					<${ExternalDetails} att=${current} />
				</aside>`}
			</div>
			<div class="flex items-center justify-end gap-3 h-[60px] flex-shrink-0 px-4 border-t border-[#dcdcde]">
				${tab === 'url' && urlTab &&
				html`<button
					type="button"
					disabled=${!ext.ready}
					title=${ext.ready ? undefined : 'Check the URL first.'}
					onClick=${() => {
						const att = ext.use();
						if (!att) return;
						onSelect({ ...att, url: att.url });
						onClose();
					}}
					class="h-8 px-3 rounded-[3px] border border-[#2271b1] bg-[#2271b1] text-white text-[13px] cursor-pointer disabled:bg-[#f6f7f7] disabled:text-[#a7aaad] disabled:border-[#dcdcde] disabled:cursor-default"
				>
					${button}
				</button>`}
				<button
					type="button"
					hidden=${tab === 'url' && urlTab}
					disabled=${!current}
					onClick=${() => {
						if (!current) return;
						onSelect({ ...current, url: mediaUrl(current) });
						onClose();
					}}
					class="h-8 px-3 rounded-[3px] border border-[#2271b1] bg-[#2271b1] text-white text-[13px] cursor-pointer disabled:bg-[#f6f7f7] disabled:text-[#a7aaad] disabled:border-[#dcdcde] disabled:cursor-default"
				>
					${button}
				</button>
			</div>
		</div>
	</div>`;
}

/** Render children into a body-level .wc3d-app host so the fixed modal escapes the inspector's scroll box. */
export function Portal({ children }) {
	const host = useRef(null);
	if (!host.current && typeof document !== 'undefined') {
		host.current = document.createElement('div');
		host.current.className = 'wc3d-app';
	}
	useEffect(() => {
		document.body.appendChild(host.current);
		return () => {
			render(null, host.current);
			host.current.remove();
		};
	}, []);
	useEffect(() => {
		render(children, host.current);
	});
	return null;
}

/** useMediaPicker({title, button, filter: 'image'|'model'|'hdri'|undefined, urlKind?: 'model'|'usdz', onSelect(att)}) → {open, modal}. Render `modal`. */
export function useMediaPicker(options) {
	const [open, setOpen] = useState(false);
	const opts = useRef(options);
	opts.current = options;
	const modal = open
		? html`<${Portal}
				><${MediaModal}
					title=${options.title}
					button=${options.button}
					filter=${options.filter}
					urlKind=${options.urlKind}
					onSelect=${(att) => opts.current.onSelect(att)}
					onClose=${() => setOpen(false)}
			/><//>`
		: null;
	return { open: () => setOpen(true), modal };
}

// ── VariationModelSelector ──────────────────────────────────────────────────

export default function AltModelPanel() {
	const target = useEditor((s) => s.target);
	const variations = useEditor((s) => s.variations);
	const attachments = useStore((s) => s.attachments || {});
	const isVariation = target !== 'default' && target != null;
	const modelId = isVariation ? Number(variations?.[target]?.model_id) || 0 : 0;
	const att = modelId ? attachments[modelId] : null;
	const modelName = att?.filename || (modelId ? `ID: ${modelId}` : '');

	const picker = useMediaPicker({
		title: 'Choose an alternative 3D GLB Model',
		button: 'Use this model',
		filter: 'model',
		onSelect: (a) => a?.id && editor.setVariationModel(a.id),
	});

	if (!isVariation) return null;

	return html`<div class="px-4 py-3.5">
		<div class=${`${EYEBROW_CLASS} mb-1`}>Custom GLB Model</div>
		<p class=${`${HELP_CLASS} mb-3`}>Upload a different GLB model to show only for this specific variation, overriding the product default model.</p>
		<div class="space-y-2.5">
			${modelId > 0
				? html`<div class=${`${SURFACE_CLASS} flex items-center gap-2.5 p-2.5`}>
						<span class="wc3d-icon-tile wc3d-icon-tile-brand" aria-hidden="true"><${CubeIcon} size=${15} /></span>
						<div class="flex-1 min-w-0">
							<span class="block text-[11.5px] leading-tight text-[color:var(--wc3d-ui-desc)]">Active Model File</span>
							<span class="block mt-0.5 text-[13px] font-semibold text-[color:var(--wc3d-ui-title)] truncate" title=${modelName}>${modelName}</span>
							<${ExternalHost} att=${att} />
						</div>
						<button type="button" onClick=${() => editor.setVariationModel(0)} class=${`${LINK_DANGER_CLASS} flex-shrink-0`}>Remove</button>
					</div>`
				: html`<div class=${`wc3d-dashed flex items-center justify-center px-4 py-4 text-center ${HELP_CLASS}`}>Using default product 3D model.</div>`}
			<button type="button" onClick=${picker.open} class="wc3d-btn wc3d-btn-soft w-full">
				<${UploadIcon} size=${15} class="flex-shrink-0" />
				${modelId > 0 ? 'Replace GLB Model' : 'Choose Custom GLB Model…'}
			</button>
		</div>
		${picker.modal}
	</div>`;
}
