// wp.media frame for 3D Viewer's upload fields (CSF "upload" type): the sample models as the Media
// Library, plus local files uploaded as blob URLs (this tab only). Same markup/CSS as the product screen's frame.
import { html, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { Dashicon } from '../../js/screens/admin/products.js';
import { MODELS } from '../ui/models.js';
import { upload } from './data.js';
import { store } from '../../js/core/store.js';

const MODEL_EXT = /\.(glb|gltf)$/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;

// Session uploads: { id, kind: 'model'|'image', title, filename, url, size }.
const uploads = [];
let seq = 0;

function library(kind) {
	const samples =
		kind === 'model'
			? Object.entries(MODELS).map(([key, m]) => ({ id: 'm-' + key, kind: 'model', title: m.file.replace(/\.[^.]+$/, ''), filename: m.file, url: upload(m.file), date: 'October 2, 2026' }))
			: [];
	return [...uploads.filter((u) => u.kind === kind).reverse(), ...samples];
}

const sizeText = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

/** <MediaFrame kind="model|image" title button onSelect(url) onClose /> */
export function MediaFrame({ kind = 'model', title, button = 'Use this file', onSelect, onClose }) {
	const [, setTick] = useState(0);
	const list = library(kind);
	const [tab, setTab] = useState(list.length ? 'library' : 'upload');
	const [sel, setSel] = useState('');
	const [search, setSearch] = useState('');
	const [errors, setErrors] = useState([]);
	const [drag, setDrag] = useState(false);
	const fileRef = useRef(null);
	const selected = list.find((a) => a.id === sel) || null;

	useEffect(() => {
		const onKey = (e) => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', onKey);
		document.body.classList.add('modal-open');
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.classList.remove('modal-open');
		};
	}, []);

	const add = (files) => {
		const errs = [];
		let last = '';
		for (const file of files) {
			// Model types also need a tick under 3D Viewer Settings > Allowed Mime Types.
			const allowed = store.get().lv?.settings?.allowed_mime_types;
			const ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1]?.toLowerCase();
			const ok = kind === 'model' ? MODEL_EXT.test(file.name) && (!Array.isArray(allowed) || allowed.includes(ext)) : IMAGE_EXT.test(file.name) || /^image\//.test(file.type);
			if (!ok) {
				errs.push(file.name);
				continue;
			}
			const item = { id: 'u-' + ++seq, kind, title: file.name.replace(/\.[^.]+$/, ''), filename: file.name, url: URL.createObjectURL(file), size: file.size, date: 'Just now' };
			uploads.push(item);
			last = item.id;
		}
		setErrors(errs);
		if (last) {
			setSel(last);
			setTab('library');
			setTick((n) => n + 1);
		}
	};

	const shown = list.filter((a) => !search || `${a.title} ${a.filename}`.toLowerCase().includes(search.toLowerCase()));
	const accept = kind === 'model' ? '.glb,.gltf,model/gltf-binary,model/gltf+json' : 'image/*';
	const thumb = (a) =>
		a.kind === 'image'
			? html`<div class="thumbnail"><div class="centered"><img src=${a.url} draggable="false" alt="" /></div></div>`
			: html`<div class="thumbnail"><div class="centered wc3d-media-doc"><${Dashicon} name="media-document" /></div><div class="filename"><div>${a.filename}</div></div></div>`;

	return html`<div class="wc3d-media-wrap ld-woo-media" role="dialog" aria-modal="true" aria-labelledby="ld-woo-media-title">
		<div class="media-modal wp-core-ui">
			<button type="button" class="media-modal-close" onClick=${onClose}>
				<span class="media-modal-icon"><${Dashicon} name="no-alt" /><span class="screen-reader-text">Close dialog</span></span>
			</button>
			<div class="media-modal-content">
				<div class="media-frame mode-select wp-core-ui hide-menu">
					<div class="media-frame-title" id="ld-woo-media-title"><h1>${title}</h1></div>
					<div class="media-frame-router">
						<div role="tablist" aria-orientation="horizontal" class="media-router">
							<button type="button" role="tab" class=${cx('media-menu-item', tab === 'upload' && 'active')} aria-selected=${tab === 'upload'} onClick=${() => setTab('upload')}>Upload files</button>
							<button type="button" role="tab" class=${cx('media-menu-item', tab === 'library' && 'active')} aria-selected=${tab === 'library'} onClick=${() => setTab('library')}>Media Library</button>
						</div>
					</div>
					<div class="media-frame-content">
						<input ref=${fileRef} type="file" accept=${accept} hidden onChange=${(e) => (add([...e.currentTarget.files]), (e.currentTarget.value = ''))} />
						${tab === 'upload'
							? html`<div
									class=${cx('uploader-inline', drag && 'drag-over')}
									onDragOver=${(e) => (e.preventDefault(), setDrag(true))}
									onDragLeave=${() => setDrag(false)}
									onDrop=${(e) => (e.preventDefault(), setDrag(false), add([...e.dataTransfer.files]))}
								>
									<div class="uploader-inline-content no-upload-message">
										<div class="upload-ui">
											<h2 class="upload-instructions drop-instructions">Drop files to upload</h2>
											<p class="upload-instructions drop-instructions">or</p>
											<button type="button" class="browser button button-hero" onClick=${() => fileRef.current?.click()}>Select Files</button>
										</div>
										<div class="upload-inline-status">
											${errors.map(
												(n) => html`<div class="upload-error" key=${n}>
													<span class="upload-error-filename">“${n}” has failed to upload.</span>
													<span class="upload-error-message">Sorry, you are not allowed to upload this file type.</span>
												</div>`
											)}
										</div>
										<div class="post-upload-ui">
											<p class="max-upload-size">Maximum upload file size: 64 MB.</p>
											<p class="ld-woo-media__note">Files you pick stay in this browser tab. Nothing is uploaded.</p>
										</div>
									</div>
								</div>`
							: html`<div class="attachments-browser">
									<div class="media-toolbar">
										<div class="media-toolbar-secondary">
											<label class="screen-reader-text" for="ld-woo-media-filter">Filter media</label>
											<select id="ld-woo-media-filter" class="attachment-filters"><option>${kind === 'model' ? 'All media items' : 'Images'}</option></select>
										</div>
										<div class="media-toolbar-primary search-form">
											<label for="ld-woo-media-search" class="media-search-input-label">Search media</label>
											<input type="search" id="ld-woo-media-search" class="search" value=${search} onInput=${(e) => setSearch(e.currentTarget.value)} />
										</div>
									</div>
									<div class="attachments-wrapper">
										${shown.length
											? html`<ul class="attachments" role="listbox" aria-label="Media list">
													${shown.map(
														(a) => html`<li
															key=${a.id}
															tabindex="0"
															role="option"
															aria-label=${a.title}
															aria-checked=${sel === a.id}
															class=${cx('attachment', sel === a.id && 'selected details')}
															onClick=${() => setSel(sel === a.id ? '' : a.id)}
															onDblClick=${() => onSelect(a.url)}
															onKeyDown=${(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSel(a.id))}
														>
															<div class=${cx('attachment-preview', 'type-' + (a.kind === 'image' ? 'image' : 'application'), 'landscape')}>${thumb(a)}</div>
															${sel === a.id &&
															html`<button type="button" class="check" tabindex="-1" onClick=${(e) => (e.stopPropagation(), setSel(''))}>
																<span class="media-modal-icon"><${Dashicon} name="yes" /></span><span class="screen-reader-text">Deselect</span>
															</button>`}
														</li>`
													)}
												</ul>`
											: html`<div class="no-media"><h2 class="upload-instructions">No items found.</h2></div>`}
									</div>
									<div class="media-sidebar">
										${selected &&
										html`<div class="attachment-details" tabindex="0">
											<h2>Attachment details</h2>
											<div class="attachment-info">
												<div class=${'thumbnail thumbnail-' + (selected.kind === 'image' ? 'image' : 'application')}>
													${selected.kind === 'image' ? html`<img src=${selected.url} draggable="false" alt="" />` : html`<${Dashicon} name="media-document" />`}
												</div>
												<div class="details">
													<div class="filename"><strong>${selected.filename}</strong></div>
													<div class="uploaded">${selected.date}</div>
													${selected.size && html`<div class="file-size">${sizeText(selected.size)}</div>`}
												</div>
											</div>
											<span class="setting" data-setting="title"><label class="name">Title</label><input type="text" value=${selected.title} readonly /></span>
											<span class="setting"><label class="name">File URL:</label><input type="text" class="attachment-details-copy-link" readonly value=${selected.url.startsWith('blob:') ? upload(selected.filename) : selected.url} /></span>
										</div>`}
									</div>
								</div>`}
					</div>
					<div class="media-frame-toolbar">
						<div class="media-toolbar">
							<div class="media-toolbar-secondary">
								${selected && html`<div class="media-selection one"><div class="selection-info"><span class="count">1 item selected</span></div></div>`}
							</div>
							<div class="media-toolbar-primary search-form">
								<button type="button" class="button media-button button-primary button-large media-button-select" disabled=${!selected} onClick=${() => selected && onSelect(selected.url)}>${button}</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="media-modal-backdrop" onClick=${onClose}></div>
	</div>`;
}
