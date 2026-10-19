// WordPress media modal ("Select or Upload Media", wp.media select frame): Upload files / Media Library.
// The library lists the demo's sample models and images. "Upload files" keeps a local file in the
// browser as a blob: URL; nothing is sent anywhere.
import { html, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { MODELS } from '../ui/models.js';
import { uploads, fileName } from './render.js';
import { copyText } from './list.js';

const UPLOADS = 'https://demo.bplugins.local/wp-content/uploads/2026/10/';
const IMG = (f) => new URL('../img/dashboard/' + f, import.meta.url).href;
const SIZES = { 'astronaut.glb': 2869044, 'duck.glb': 120484, 'fox.glb': 162852, 'sheen-chair.glb': 4125648, 'shoe.glb': 7833592, 'astronaut.usdz': 2145297 };

const LIBRARY = [
	...Object.values(MODELS).map((m, i) => ({ id: 'm' + i, kind: 'model', url: UPLOADS + m.file, name: m.file, title: m.title, size: SIZES[m.file], date: 'October 1, 2026' })),
	{ id: 'u0', kind: 'model', url: UPLOADS + 'astronaut.usdz', name: 'astronaut.usdz', title: 'Astronaut (iOS)', size: SIZES['astronaut.usdz'], date: 'October 1, 2026' },
	...[
		['demo-sneaker.webp', 'Sneaker'],
		['demo-running-shoe.webp', 'Running shoe'],
		['demo-armchair.webp', 'Armchair'],
		['demo-office-chair.webp', 'Office chair'],
		['demo-headphones.webp', 'Headphones'],
		['demo-watch.webp', 'Watch'],
		['demo-drone.webp', 'Drone'],
		['demo-vr-headset.webp', 'VR headset'],
		['headphones.webp', 'Studio headphones'],
	].map(([f, title], i) => ({ id: 'i' + i, kind: 'image', url: IMG(f), name: f, title, size: 0, date: 'October 1, 2026' })),
];

const ACCEPT = { model: '.glb,.gltf,.usdz,model/gltf-binary,model/gltf+json', image: 'image/*', any: '.glb,.gltf,.usdz,image/*' };
const kindOfFile = (f) => (/\.(glb|gltf|usdz)$/i.test(f.name) ? 'model' : /^image\//.test(f.type) ? 'image' : 'other');
const fmtSize = (n) => (!n ? '' : n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

let host = null;
let opened = 0;
/** openMedia({ type: 'model' | 'image', title, onSelect(url) }) */
export function openMedia(opts) {
	host?.(opts);
}

const fileIcon = html`<svg viewBox="0 0 48 64" width="48" height="64" aria-hidden="true"><path d="M2 2h30l14 14v46H2z" fill="#f6f7f7" stroke="#c3c4c7" stroke-width="2" /><path d="M32 2v14h14" fill="#dcdcde" stroke="#c3c4c7" stroke-width="2" /><path d="M24 27l10 5.5v11L24 49l-10-5.5v-11zM14 32.5 24 38l10-5.5M24 38v11" fill="none" stroke="#2271b1" stroke-width="2" stroke-linejoin="round" /></svg>`;

export function MediaHost() {
	const [opts, setOpts] = useState(null);
	useEffect(() => {
		host = (o) => setOpts({ ...o, k: ++opened });
		return () => (host = null);
	}, []);
	if (!opts) return null;
	return html`<${MediaModal} key=${opts.k} opts=${opts} onClose=${() => setOpts(null)} />`;
}

function MediaModal({ opts, onClose }) {
	const type = opts.type || 'any';
	const [tab, setTab] = useState('library');
	const [, bump] = useState(0);
	const [sel, setSel] = useState(null);
	const [q, setQ] = useState('');
	const [drag, setDrag] = useState(false);
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState('');
	const fileRef = useRef(null);
	const box = useRef(null);

	useEffect(() => {
		const onKey = (e) => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', onKey);
		document.body.classList.add('wc3d-modal-open');
		box.current?.querySelector('.media-modal-close')?.focus();
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.classList.remove('wc3d-modal-open');
		};
	}, []);

	const session = [...uploads.entries()].map(([url, u], i) => ({ id: 's' + i, kind: u.kind, url, name: u.name, title: u.name.replace(/\.[^.]+$/, ''), size: u.size, date: u.date })).reverse();
	const items = [...session, ...LIBRARY].filter((it) => (type === 'any' || it.kind === type) && (!q || (it.title + ' ' + it.name).toLowerCase().includes(q.toLowerCase())));
	const picked = items.find((it) => it.id === sel) || null;

	const add = (files) => {
		setError('');
		let last = null;
		for (const f of files) {
			const kind = kindOfFile(f);
			if (type !== 'any' && kind !== type) {
				setError(`“${f.name}” has failed to upload. Sorry, you are not allowed to upload this file type.`);
				continue;
			}
			const url = URL.createObjectURL(f);
			uploads.set(url, { name: f.name, kind, size: f.size, date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) });
			last = url;
		}
		if (last) {
			bump((n) => n + 1);
			setTab('library');
			setSel('s' + (uploads.size - 1));
		}
	};
	const choose = () => {
		if (!picked) return;
		opts.onSelect(picked.url);
		onClose();
	};

	return html`<div class="ld-media" role="presentation">
		<div class="media-modal-backdrop" onClick=${onClose}></div>
		<div class="media-modal wp-core-ui" role="dialog" aria-modal="true" aria-labelledby="ld-media-title" ref=${box}>
			<button type="button" class="media-modal-close" onClick=${onClose}><span class="media-modal-icon" aria-hidden="true">×</span><span class="screen-reader-text">Close dialog</span></button>
			<div class="media-modal-content">
				<div class="media-frame-title"><h1 id="ld-media-title">${opts.title || 'Select or Upload Media'}</h1></div>
				<div class="media-frame-router" role="tablist" aria-label="Media">
					<button type="button" role="tab" class=${cx('media-menu-item', tab === 'upload' && 'active')} aria-selected=${tab === 'upload'} onClick=${() => setTab('upload')}>Upload files</button>
					<button type="button" role="tab" class=${cx('media-menu-item', tab === 'library' && 'active')} aria-selected=${tab === 'library'} onClick=${() => setTab('library')}>Media Library</button>
				</div>
				<div class="media-frame-content">
					${tab === 'upload'
						? html`<div
								class=${cx('uploader-inline', drag && 'drag-over')}
								onDragOver=${(e) => (e.preventDefault(), setDrag(true))}
								onDragLeave=${() => setDrag(false)}
								onDrop=${(e) => {
									e.preventDefault();
									setDrag(false);
									add([...(e.dataTransfer?.files || [])]);
								}}
							>
								<div class="uploader-inline-content">
									<h2 class="upload-instructions drop-instructions">Drop files to upload</h2>
									<p class="drop-instructions">or</p>
									<button type="button" class="browser button button-hero" onClick=${() => fileRef.current?.click()}>Select Files</button>
									<input ref=${fileRef} type="file" hidden multiple accept=${ACCEPT[type]} onChange=${(e) => (add([...(e.currentTarget.files || [])]), (e.currentTarget.value = ''))} />
									<p class="max-upload-size">Maximum upload file size: 128 MB.</p>
									<p class="ld-media__note">Demo: your file stays in this browser tab. Nothing is uploaded.</p>
									${error && html`<div class="upload-error"><strong>${error}</strong></div>`}
								</div>
							</div>`
						: html`<div class="attachments-browser">
								<div class="media-toolbar">
									<div class="media-toolbar-secondary">
										<label for="ld-media-filter" class="screen-reader-text">Filter media</label>
										<select id="ld-media-filter" class="attachment-filters" disabled=${type !== 'any'}>
											<option>${type === 'image' ? 'Images' : type === 'model' ? '3D models' : 'All media items'}</option>
										</select>
										<select class="attachment-filters" aria-label="Filter by date"><option>All dates</option><option>October 2026</option></select>
									</div>
									<div class="media-toolbar-primary search-form">
										<label for="ld-media-search" class="media-search-input-label">Search media</label>
										<input type="search" id="ld-media-search" class="search" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} />
									</div>
								</div>
								<div class="ld-media__body">
									<ul class="attachments" role="listbox" aria-label="Attachments">
										${items.map(
											(it) => html`<li key=${it.id} role="option" aria-selected=${sel === it.id} class=${cx('attachment', sel === it.id && 'selected details')} tabindex="0" onClick=${() => setSel(sel === it.id ? null : it.id)} onDblClick=${() => (opts.onSelect(it.url), onClose())} onKeyDown=${(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSel(it.id))}>
												<div class="attachment-preview">
													${it.kind === 'image'
														? html`<div class="thumbnail"><img src=${it.url} alt="" draggable="false" /></div>`
														: html`<div class="thumbnail is-file">${fileIcon}<div class="filename"><div>${it.name}</div></div></div>`}
												</div>
												${sel === it.id && html`<span class="check" aria-hidden="true">✓</span>`}
											</li>`
										)}
										${!items.length && html`<li class="ld-media__none">No media items found.</li>`}
									</ul>
									${picked &&
									html`<aside class="media-sidebar">
										<div class="attachment-details">
											<h2>Attachment details</h2>
											<div class="attachment-info">
												<div class="thumbnail">${picked.kind === 'image' ? html`<img src=${picked.url} alt="" />` : fileIcon}</div>
												<div class="details">
													<div class="filename"><strong>${fileName(picked.url) || picked.name}</strong></div>
													<div class="uploaded">${picked.date}</div>
													${picked.size ? html`<div class="file-size">${fmtSize(picked.size)}</div>` : ''}
												</div>
											</div>
											<label class="setting"><span class="name">Title</span><input type="text" value=${picked.title} readOnly /></label>
											<label class="setting"><span class="name">File URL:</span><input type="text" value=${picked.url} readOnly onFocus=${(e) => e.currentTarget.select()} /></label>
											<div class="setting copy-to-clipboard-container">
												<button type="button" class="button button-small copy-attachment-url" onClick=${() => (copyText(picked.url), setCopied(true), setTimeout(() => setCopied(false), 1500))}>Copy URL to clipboard</button>
												${copied && html`<span class="success" role="status">Copied!</span>`}
											</div>
										</div>
									</aside>`}
								</div>
							</div>`}
				</div>
				<div class="media-frame-toolbar">
					<div class="media-toolbar">
						<div class="media-toolbar-secondary">${picked && html`<span class="ld-media__count">1 item selected</span>`}</div>
						<div class="media-toolbar-primary">
							<button type="button" class="button media-button button-primary button-large media-button-select" disabled=${!picked} onClick=${choose}>Select</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>`;
}
