// WooCommerce product edit screen (post.php?post=ID&action=edit) with the plugin's
// "3D Model" product-data tab (templates/admin/product-panel.php, spec 07 §1 / spec 02 §5).
// Edits live in a session draft (like the open browser tab); Update/Publish writes the store.
import { html, useState, useEffect, useRef, cx, money } from '../../core/ui.js';
import { store, useStore, setIn } from '../../core/store.js';
import { go } from '../../core/router.js';
import { WpAdmin } from './chrome.js';
import { ProductImage } from '../../shared/product-image.js';
import { attachmentUrl, POSITIONS } from '../../shared/product-3d.js';
import { useExternalUrl, inLibrary, isExternal, ExternalTag, ExternalHost, ExternalDetails } from '../../shared/external-url.js';
import { useFeature } from '../../core/features.js';
import { DEFAULT_SETTINGS } from '../../data/seed.js';
import { Slot, applyFilter } from '../../shared/slots.js';
import { Dashicon, WpNotice, useFlash, flash, nowStr, publishDate, longDate, parseDate, MONTH_ABBR, allCategories, categoriesOf, STOCK_LABELS, TYPE_LABELS } from './products.js';

// ── Drafts: survive navigation in this session, like a tab left open ─────────
const drafts = new Map();
const lastTab = new Map();

const META_KEYS = ['_wc3d_enabled', '_wc3d_model_id', '_wc3d_poster_id', '_wc3d_show_on_shop', '_wc3d_position', '_wc3d_background_type', '_wc3d_background_color', '_wc3d_background_image_id', '_wc3d_loading_trigger', '_wc3d_enable_customizer', '_wc3d_show_gallery'];
const WC_DEFAULTS = {
	salePrice: '',
	taxStatus: 'taxable',
	taxClass: '',
	manageStock: false,
	stockQty: '',
	stockStatus: 'instock',
	soldIndividually: false,
	weight: '',
	length: '',
	width: '',
	height: '',
	shippingClass: '',
	upsells: [],
	crossSells: [],
	purchaseNote: '',
	menuOrder: 0,
	reviews: true,
	virtual: false,
	downloadable: false,
	visibility: 'public',
	password: '',
	catalogVisibility: 'visible',
	featured: false,
	tags: [],
	gallery: [],
};

function draftFrom(p) {
	const meta = { ...(p.meta || {}) };
	META_KEYS.forEach((k) => {
		if (meta[k] === undefined) meta[k] = k.endsWith('_id') ? 0 : '';
	});
	// The colour field is pre-filled #ffffff when no meta is saved (product-panel.php).
	if (!meta._wc3d_background_color) meta._wc3d_background_color = '#ffffff';
	return {
		name: p.name || '',
		slug: p.slug || '',
		description: p.description || '',
		short: p.short || '',
		type: p.type || 'simple',
		status: p.status || 'auto-draft',
		price: p.price ?? '',
		sku: p.sku || '',
		category: p.category || '',
		image: p.image ?? null,
		dateCreated: p.dateCreated || '',
		wc: { ...WC_DEFAULTS, ...(p.wc || {}) },
		meta,
	};
}

// ProductPanel::save() sanitizing: flags 'yes'|'', enums in list else deleted, ids absint, hex.
const ENUMS = {
	_wc3d_position: Object.keys(POSITIONS),
	_wc3d_background_type: ['transparent', 'color', 'image'],
	_wc3d_loading_trigger: ['click', 'scroll', 'eager'],
	_wc3d_enable_customizer: ['yes', 'no'],
	_wc3d_show_gallery: ['yes', 'no'],
};
function sanitizeMeta(m) {
	const out = { ...m };
	out._wc3d_enabled = m._wc3d_enabled === 'yes' ? 'yes' : '';
	out._wc3d_show_on_shop = m._wc3d_show_on_shop === 'yes' ? 'yes' : '';
	for (const k of ['_wc3d_model_id', '_wc3d_poster_id', '_wc3d_background_image_id']) out[k] = Math.max(0, parseInt(m[k], 10) || 0);
	for (const [k, list] of Object.entries(ENUMS)) out[k] = list.includes(m[k]) ? m[k] : '';
	const hex = String(m._wc3d_background_color || '').trim();
	out._wc3d_background_color = /^#([0-9a-f]{3}){1,2}$/i.test(hex) ? hex.toLowerCase() : '';
	return out;
}

const slugify = (s) =>
	String(s || '')
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const sizeFormat = (b) => {
	if (!b) return '';
	const u = ['B', 'KB', 'MB', 'GB'];
	let i = 0;
	let n = b;
	while (n >= 1024 && i < u.length - 1) (n /= 1024), i++;
	return `${Math.round(n)} ${u[i]}`;
};

// ── Generic WP bits ──────────────────────────────────────────────────────────
function Postbox({ id, title, header, children, class: cls, insideClass }) {
	const [closed, setClosed] = useState(false);
	return html`<div id=${id} class=${cx('postbox', closed && 'closed', cls)}>
		<div class="postbox-header">
			<h2 class="hndle">${header || title}</h2>
			<div class="handle-actions">
				<button type="button" class="handlediv" aria-expanded=${!closed} onClick=${() => setClosed(!closed)}>
					<span class="screen-reader-text">Toggle panel: ${title}</span>
					<span class="toggle-indicator" aria-hidden="true"><${Dashicon} name=${closed ? 'arrow-down' : 'arrow-up'} /></span>
				</button>
			</div>
		</div>
		<div class=${cx('inside', insideClass)}>${children}</div>
	</div>`;
}

function HelpTip({ tip }) {
	return html`<span class="woocommerce-help-tip" tabindex="0" aria-label=${tip} data-tip=${tip}></span>`;
}

// ── Media modal (wp.media frame) ───────────────────────────────────────────
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;
const MODEL_EXT = /\.(glb|gltf)$/i;

function AttachmentThumb({ att }) {
	if (att.kind === 'image') return html`<div class="thumbnail"><div class="centered"><img src=${attachmentUrl(att)} draggable="false" alt="" /></div></div>`;
	return html`<div class="thumbnail">
		<div class="centered wc3d-media-doc"><${Dashicon} name="media-document" /></div>
		<div class="filename"><div>${att.filename}</div></div>
	</div>`;
}

/**
 * <MediaModal kind="model|image" title button onSelect(att) onClose />
 * Library filtered like the plugin's frames (model/gltf-binary + model/gltf+json, or images).
 */
export function MediaModal({ kind, title, button, onSelect, onClose, initialTab, initialUrl }) {
	const attachments = useStore((s) => s.attachments || {});
	const list = Object.values(attachments)
		.filter((a) => (kind === 'model' ? a.kind === 'model' : a.kind === 'image'))
		.filter(inLibrary)
		.sort((a, b) => b.id - a.id);
	// external-url: third router tab for model frames.
	const extOn = useFeature('external-url');
	const urlTab = extOn && kind === 'model';
	const ext = useExternalUrl('model', initialUrl);
	const [tab, setTab] = useState(urlTab && initialTab === 'url' ? 'url' : list.length ? 'library' : 'upload');
	const [sel, setSel] = useState(0);
	const [search, setSearch] = useState('');
	const [errors, setErrors] = useState([]);
	const [drag, setDrag] = useState(false);
	const fileRef = useRef(null);
	const selected = sel ? attachments[sel] : null;

	useEffect(() => {
		const onKey = (e) => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', onKey);
		document.body.classList.add('modal-open');
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.classList.remove('modal-open');
		};
	}, []);

	const upload = (files) => {
		const errs = [];
		let lastId = 0;
		for (const file of files) {
			const ok = kind === 'model' ? MODEL_EXT.test(file.name) : IMAGE_EXT.test(file.name) || /^image\//.test(file.type);
			if (!ok) {
				errs.push(file.name);
				continue;
			}
			const id = store.nextId('attachments');
			const isModel = kind === 'model';
			const att = {
				id,
				kind: isModel ? 'model' : 'image',
				title: file.name.replace(/\.[^.]+$/, ''),
				filename: file.name,
				mime: isModel ? (/\.gltf$/i.test(file.name) ? 'model/gltf+json' : 'model/gltf-binary') : file.type || 'image/jpeg',
				sizeBytes: file.size,
				blobUrl: URL.createObjectURL(file),
				date: nowStr(),
			};
			store.patch(['attachments', id], att);
			lastId = id;
		}
		setErrors(errs);
		if (lastId) {
			setSel(lastId);
			setTab('library');
		}
	};

	const shown = list.filter((a) => !search || `${a.title} ${a.filename}`.toLowerCase().includes(search.toLowerCase()));
	const accept = kind === 'model' ? '.glb,.gltf,model/gltf-binary,model/gltf+json' : 'image/*';

	return html`<div class="wc3d-media-wrap" role="dialog" aria-modal="true" aria-labelledby="media-frame-title">
		<div class="media-modal wp-core-ui">
			<button type="button" class="media-modal-close" onClick=${onClose}>
				<span class="media-modal-icon"><${Dashicon} name="no-alt" /><span class="screen-reader-text">Close dialog</span></span>
			</button>
			<div class="media-modal-content">
				<div class="media-frame mode-select wp-core-ui hide-menu">
					<div class="media-frame-title" id="media-frame-title"><h1>${title}</h1></div>
					<div class="media-frame-router">
						<div role="tablist" aria-orientation="horizontal" class="media-router">
							<button type="button" role="tab" class=${cx('media-menu-item', tab === 'upload' && 'active')} aria-selected=${tab === 'upload'} onClick=${() => setTab('upload')}>Upload files</button>
							<button type="button" role="tab" class=${cx('media-menu-item', tab === 'library' && 'active')} aria-selected=${tab === 'library'} onClick=${() => setTab('library')}>Media Library</button>
							${urlTab && html`<button type="button" role="tab" class=${cx('media-menu-item', tab === 'url' && 'active')} aria-selected=${tab === 'url'} onClick=${() => setTab('url')}>External URL</button>`}
						</div>
					</div>
					<div class="media-frame-content">
						<input ref=${fileRef} type="file" accept=${accept} hidden onChange=${(e) => (upload([...e.currentTarget.files]), (e.currentTarget.value = ''))} />
						${tab === 'url' && urlTab
							? ext.pane
							: tab === 'upload'
							? html`<div
									class=${cx('uploader-inline', drag && 'drag-over')}
									onDragOver=${(e) => (e.preventDefault(), setDrag(true))}
									onDragLeave=${() => setDrag(false)}
									onDrop=${(e) => (e.preventDefault(), setDrag(false), upload([...e.dataTransfer.files]))}
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
										<div class="post-upload-ui"><p class="max-upload-size">Maximum upload file size: 64 MB.</p></div>
									</div>
								</div>`
							: html`<div class="attachments-browser">
									<div class="media-toolbar">
										<div class="media-toolbar-secondary">
											<label class="screen-reader-text" for="media-attachment-filters">Filter media</label>
											<select id="media-attachment-filters" class="attachment-filters">
												<option>${kind === 'model' ? 'All media items' : 'Images'}</option>
											</select>
										</div>
										<div class="media-toolbar-primary search-form">
											<label for="media-search-input" class="media-search-input-label">Search media</label>
											<input type="search" id="media-search-input" class="search" value=${search} onInput=${(e) => setSearch(e.currentTarget.value)} />
										</div>
									</div>
									<div class="attachments-wrapper">
										${errors.length > 0 &&
										html`<div class="upload-errors">${errors.map((n) => html`<div class="upload-error" key=${n}><span class="upload-error-filename">“${n}” has failed to upload.</span> <span class="upload-error-message">Sorry, you are not allowed to upload this file type.</span></div>`)}</div>`}
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
															onClick=${() => setSel(sel === a.id ? 0 : a.id)}
															onDblClick=${() => onSelect(a)}
															onKeyDown=${(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSel(a.id))}
														>
															<div class=${cx('attachment-preview', 'type-' + (a.kind === 'image' ? 'image' : 'application'), 'landscape')}><${AttachmentThumb} att=${a} /><${ExternalTag} att=${a} class="wc3d-ext-tile-badge" /></div>
															${sel === a.id &&
															html`<button type="button" class="check" tabindex="-1" onClick=${(e) => (e.stopPropagation(), setSel(0))}>
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
												<div class="thumbnail thumbnail-${selected.kind === 'image' ? 'image' : 'application'}">
													${selected.kind === 'image' ? html`<img src=${attachmentUrl(selected)} draggable="false" alt="" />` : html`<${Dashicon} name="media-document" />`}
												</div>
												<div class="details">
													<div class="filename"><strong>${selected.filename}</strong></div>
													${selected.date && html`<div class="uploaded">${longDate(selected.date).replace(/ at .*/, '')}</div>`}
													${selected.sizeBytes && html`<div class="file-size">${sizeFormat(selected.sizeBytes)}</div>`}
												</div>
											</div>
											<span class="setting" data-setting="title"><label class="name">Title</label><input type="text" value=${selected.title} readonly /></span>
											${isExternal(selected) && extOn
												? html`<${ExternalDetails} att=${selected} />`
												: html`<span class="setting"><label class="name">File URL:</label><input type="text" class="attachment-details-copy-link" readonly value=${'https://demo.store/wp-content/uploads/2026/09/' + selected.filename} /></span>`}
										</div>`}
									</div>
								</div>`}
					</div>
					<div class="media-frame-toolbar">
						<div class="media-toolbar">
							<div class="media-toolbar-secondary">
								${selected && tab !== 'url' && html`<div class="media-selection one"><div class="selection-info"><span class="count">1 item selected</span></div></div>`}
							</div>
							<div class="media-toolbar-primary search-form">
								${tab === 'url' && urlTab
									? html`<button type="button" class="button media-button button-primary button-large media-button-select" disabled=${!ext.ready} title=${ext.ready ? undefined : 'Check the URL first.'} onClick=${() => {
											const att = ext.use();
											if (att) onSelect(att);
										}}>${button}</button>`
									: html`<button type="button" class="button media-button button-primary button-large media-button-select" disabled=${!selected} onClick=${() => selected && onSelect(selected)}>${button}</button>`}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="media-modal-backdrop" onClick=${onClose}></div>
	</div>`;
}

// ── Iris colour picker (wpColorPicker) ───────────────────────────────────────
function hexToRgb(hex) {
	let h = String(hex || '').replace('#', '');
	if (h.length === 3) h = h.split('').map((c) => c + c).join('');
	if (!/^[0-9a-f]{6}$/i.test(h)) return null;
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function rgbToHsv([r, g, b]) {
	(r /= 255), (g /= 255), (b /= 255);
	const mx = Math.max(r, g, b);
	const mn = Math.min(r, g, b);
	const d = mx - mn;
	let h = 0;
	if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
	return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
}
function hsvToHex(h, s, v) {
	const f = (n) => {
		const k = (n + h / 60) % 6;
		return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
	};
	return '#' + [f(5), f(3), f(1)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
const IRIS_PALETTE = ['#000000', '#ffffff', '#dd3333', '#dd9933', '#eeee22', '#81d742', '#1e73be', '#8224e3'];

function Iris({ value, onChange }) {
	const rgb = hexToRgb(value) || [255, 255, 255];
	const [hsv, setHsv] = useState(() => rgbToHsv(rgb));
	const sq = useRef(null);
	const strip = useRef(null);
	useEffect(() => {
		const cur = hexToRgb(value);
		if (cur && hsvToHex(...hsv) !== value.toLowerCase()) setHsv(rgbToHsv(cur));
	}, [value]);
	const drag = (ref, fn) => (e) => {
		e.preventDefault();
		const el = ref.current;
		const move = (ev) => {
			const r = el.getBoundingClientRect();
			fn(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
		};
		move(e);
		const up = () => (window.removeEventListener('pointermove', move), window.removeEventListener('pointerup', up));
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	};
	const set = (h, s, v) => {
		setHsv([h, s, v]);
		onChange(hsvToHex(h, s, v));
	};
	const [h, s, v] = hsv;
	return html`<div class="iris-picker iris-border">
		<div class="iris-picker-inner">
			<div class="iris-square" ref=${sq} style=${{ background: `hsl(${h}, 100%, 50%)` }} onPointerDown=${drag(sq, (x, y) => set(h, x, 1 - y))}>
				<div class="iris-square-inner iris-square-horiz"></div>
				<div class="iris-square-inner iris-square-vert"></div>
				<span class="iris-square-handle" style=${{ left: s * 100 + '%', top: (1 - v) * 100 + '%' }}></span>
			</div>
			<div class="iris-slider iris-strip" ref=${strip} onPointerDown=${drag(strip, (x, y) => set((1 - y) * 359.9, s, v))}>
				<span class="iris-slider-handle" style=${{ top: (1 - h / 360) * 100 + '%' }}></span>
			</div>
		</div>
		<div class="iris-palette-container">
			${IRIS_PALETTE.map((c) => html`<button type="button" key=${c} class="iris-palette" style=${{ backgroundColor: c }} aria-label=${c} onClick=${() => onChange(c)}></button>`)}
		</div>
	</div>`;
}

function ColorPicker({ id, value, onChange }) {
	const [open, setOpen] = useState(false);
	const [text, setText] = useState(value);
	const box = useRef(null);
	useEffect(() => setText(value), [value]);
	useEffect(() => {
		if (!open) return;
		const off = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
		document.addEventListener('pointerdown', off);
		return () => document.removeEventListener('pointerdown', off);
	}, [open]);
	const valid = hexToRgb(value);
	return html`<div class=${cx('wp-picker-container', open && 'wp-picker-active')} ref=${box}>
		<button type="button" class="button wp-color-result" aria-expanded=${open} style=${{ backgroundColor: valid ? value : '' }} onClick=${() => setOpen(!open)}>
			<span class="wp-color-result-text">Select Color</span>
		</button>
		<span class=${cx('wp-picker-input-wrap', !open && 'hidden')}>
			<label>
				<span class="screen-reader-text">Color value</span>
				<input
					type="text"
					id=${id}
					class="wc3d-color-picker wp-color-picker"
					value=${text}
					onInput=${(e) => {
						const v = e.currentTarget.value;
						setText(v);
						if (hexToRgb(v) || v === '') onChange(v);
					}}
				/>
			</label>
			<input type="button" class="button wp-picker-clear button-small" value="Clear" aria-label="Clear color" onClick=${() => onChange('')} />
		</span>
		<div class="wp-picker-holder">${open && html`<${Iris} value=${valid ? value : '#ffffff'} onChange=${onChange} />`}</div>
	</div>`;
}

// ── "3D Model" tab (launcher) ────────────────────────────────────────────────
function Switch({ id, checked, onChange }) {
	return html`<label class="wc3d-switch">
		<input type="checkbox" id=${id} name=${id} value="yes" checked=${checked} onChange=${(e) => onChange(e.currentTarget.checked)} />
		<span class="wc3d-slider"></span>
	</label>`;
}

function Uploader({ wrapId, inputId, value, fileName, empty, fileIcon = 'format-image', fileMeta, filenameClass, onPick, onRemove, imageClass }) {
	const has = !!Number(value);
	return html`<div>
		<input type="hidden" id=${inputId} name=${inputId} value=${String(value || '')} />
		<div class=${cx('wc3d-meta-file-uploader', imageClass, has ? 'has-file' : 'no-file')} id=${wrapId}>
			<div class="wc3d-uploader-empty-state">
				<${Dashicon} name=${empty.icon} />
				<div class="wc3d-uploader-text">
					<h4>${empty.title}</h4>
					${empty.sub && html`<p>${empty.sub}</p>`}
				</div>
				<button type="button" class="button button-secondary" onClick=${onPick}>${empty.button}</button>
			</div>
			<div class="wc3d-uploader-file-state">
				<${Dashicon} name=${fileIcon} style="color:var(--wc3d-primary)" />
				<div class="wc3d-uploader-file-info">
					<span class=${filenameClass}>${fileName}</span>
					<span class="wc3d-uploader-file-meta">${fileMeta}</span>
				</div>
				<div class="wc3d-uploader-actions">
					<button type="button" class="button button-secondary" onClick=${onPick}>Change</button>
					<button type="button" class="button button-link-delete" disabled=${!has} onClick=${onRemove}>Remove</button>
				</div>
			</div>
		</div>
	</div>`;
}

function SelectRow({ id, label, value, options, desc, onChange }) {
	return html`<div class="wc3d-meta-field-row">
		<span class="wc3d-meta-field-label">${label}</span>
		<div class="wc3d-meta-field-control">
			<select id=${id} name=${id} value=${value} onChange=${(e) => onChange(e.currentTarget.value)}>
				${options.map(([v, l]) => html`<option value=${v} key=${v}>${l}</option>`)}
			</select>
			<span class="wc3d-meta-field-desc">${desc}</span>
		</div>
	</div>`;
}

const yesNo = (useGlobal) => [
	['', useGlobal],
	['yes', 'Yes (Enabled)'],
	['no', 'No (Disabled)'],
];
const BG_LABELS = { transparent: 'Transparent', color: 'Solid Color', image: 'Custom Image' };
const TRIGGER_LABELS = { click: 'Click to Interact', scroll: 'Auto-load when visible', eager: 'Load immediately' };

/** ProductPanel::use_global_labels(): "Use global (…)" with the current global value. */
function useGlobalLabels(settings) {
	const g = { ...DEFAULT_SETTINGS, ...settings };
	const onOff = (v) => (v ? 'On' : 'Off');
	const values = {
		position: POSITIONS[g.position] || POSITIONS.replace_image,
		background_type: BG_LABELS[g.background_type] || BG_LABELS.transparent,
		loading_trigger: TRIGGER_LABELS[g.loading_trigger] || TRIGGER_LABELS.click,
		enable_customizer: onOff(g.enable_customizer),
		show_gallery: onOff(g.show_gallery),
	};
	return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, `Use global (${v})`]));
}

/** ProductPanel::model_file_meta(): "GLB · 2.3 MB" (size_format( $size, 1 )); '' when neither is known. */
function modelFileMeta(att) {
	if (!att) return '';
	const ext = String(att.filename || '').split('.').pop().toLowerCase();
	const type = { glb: 'GLB', gltf: 'glTF' }[ext] || '';
	let size = '';
	if (att.sizeBytes) {
		const u = ['B', 'KB', 'MB', 'GB'];
		let i = 0;
		let n = att.sizeBytes;
		while (n >= 1024 && i < u.length - 1) (n /= 1024), i++;
		size = `${n.toFixed(1)} ${u[i]}`;
	}
	return [type, size].filter(Boolean).join(' · ');
}

function ShortcodeField({ productId }) {
	const [bubbles, setBubbles] = useState([]);
	const input = useRef(null);
	const seq = useRef(0);
	const text = `[wc3d_viewer id="${productId}"]`;
	const show = () => {
		const id = ++seq.current;
		setBubbles((b) => [...b, id]);
		setTimeout(() => setBubbles((b) => b.filter((x) => x !== id)), 1200);
	};
	const fallback = () => {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
		document.body.appendChild(ta);
		ta.focus();
		ta.select();
		try {
			if (document.execCommand('copy')) show();
		} catch (err) {
			console.error('Fallback copy failed:', err);
		}
		document.body.removeChild(ta);
	};
	const copy = (e) => {
		e.preventDefault();
		if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(show).catch(fallback);
		else fallback();
	};
	return html`<div class="wc3d-meta-field-row shortcode-row">
		<span class="wc3d-meta-field-label">Viewer Shortcode</span>
		<div class="wc3d-meta-field-control">
			<div class="wc3d-shortcode-copy-wrapper">
				<input ref=${input} type="text" id="wc3d_shortcode" value=${text} readonly onClick=${() => input.current?.select()} />
				<button type="button" class="wc3d-copy-shortcode-btn" title="Copy to clipboard" onClick=${copy}><${Dashicon} name="admin-page" /></button>
				${bubbles.map((id) => html`<span key=${id} class="wc3d-copied-feedback">Copied!</span>`)}
			</div>
			<span class="wc3d-meta-field-desc">Copy and paste this shortcode anywhere to render the player.</span>
		</div>
	</div>`;
}

function LauncherPanel({ productId, meta, setMeta, attachments }) {
	const [modal, setModal] = useState(null);
	// Labels: saved attachments show their title; a fresh pick shows filename (model) / title (images).
	const [picked, setPicked] = useState({});
	const label = (key, id, pickedField) => {
		const att = attachments[id];
		if (!att) return '';
		return picked[key] === id ? att[pickedField] || att.title : att.title;
	};
	const bgType = meta._wc3d_background_type;
	const extOn = useFeature('external-url');
	const [startTab, setStartTab] = useState('');
	const open = (which, tab = '') => (setStartTab(tab), setModal(which));
	const modelAtt = attachments[Number(meta._wc3d_model_id)];
	const useGlobal = useGlobalLabels(useStore((s) => s.settings));
	const MODALS = {
		model: { kind: 'model', title: 'Select a GLB model', button: 'Use this model', key: '_wc3d_model_id' },
		poster: { kind: 'image', title: 'Choose a poster image', button: 'Use image', key: '_wc3d_poster_id' },
		bg: { kind: 'image', title: 'Choose a background image', button: 'Use image', key: '_wc3d_background_image_id' },
	};
	const m = modal && MODALS[modal];
	return html`<div id="wc3d_product_panel" class="panel woocommerce_options_panel">
		<input type="hidden" name="wc3d_product_panel_nonce" value="prototype" />
		<div class="wc3d-product-editor-wrapper">
			<div class="wc3d-panel-header">
				<div class="wc3d-panel-title-area">
					<span class="wc3d-panel-logo">📦</span>
					<h3>3D Model Configuration & Customizer</h3>
				</div>
				<p class="wc3d-panel-tagline">Configure interactive 3D rendering and customized material hotspot features for your customers.</p>
			</div>

			<div class="wc3d-panel-grid">
				<div class="wc3d-panel-card">
					<h4 class="wc3d-card-title">Model Files & Visibility</h4>

					<div class="wc3d-meta-toggle-row">
						<div class="wc3d-meta-toggle-info">
							<span class="wc3d-meta-toggle-label">Enable 3D Model</span>
							<span class="wc3d-meta-toggle-desc">Show the 3D viewer on the product page.</span>
						</div>
						<${Switch} id="_wc3d_enabled" checked=${meta._wc3d_enabled === 'yes'} onChange=${(on) => setMeta({ _wc3d_enabled: on ? 'yes' : '' })} />
					</div>

					<div class="wc3d-meta-field-row">
						<span class="wc3d-meta-field-label">3D Model</span>
						<${Uploader}
							wrapId="wc3d-model-uploader-wrap"
							inputId="_wc3d_model_id"
							value=${meta._wc3d_model_id}
							fileName=${label('model', Number(meta._wc3d_model_id), 'filename')}
							empty=${{ icon: 'cloud-upload', title: 'Upload/Select 3D Model', sub: 'GLB or glTF (.glb, .gltf). GLB recommended.', button: 'Choose file' }}
							fileIcon="media-document"
							fileMeta=${extOn && isExternal(modelAtt) ? html`<${ExternalHost} att=${modelAtt} prefix=${modelAtt.mime === 'model/gltf+json' ? 'glTF file' : 'GLB file'} />` : modelFileMeta(modelAtt) || '3D model file'}
							filenameClass="wc3d-model-filename"
							onPick=${() => open('model', extOn && isExternal(modelAtt) ? 'url' : '')}
							onRemove=${() => setMeta({ _wc3d_model_id: '' })}
						/>
						${extOn && !Number(meta._wc3d_model_id) && html`<button type="button" class="wc3d-ext-launch" onClick=${() => open('model', 'url')}>Use a URL instead</button>`}
					</div>

					<div class="wc3d-meta-field-row">
						<span class="wc3d-meta-field-label">Custom Poster Image</span>
						<${Uploader}
							wrapId="wc3d-poster-uploader-wrap"
							inputId="_wc3d_poster_id"
							value=${meta._wc3d_poster_id}
							fileName=${label('poster', Number(meta._wc3d_poster_id), 'title')}
							empty=${{ icon: 'format-image', title: 'Choose Poster Image', sub: 'Optional. Fallback to product featured image.', button: 'Choose image' }}
							fileMeta="Static Placeholder Image"
							filenameClass="wc3d-poster-filename"
							onPick=${() => open('poster')}
							onRemove=${() => setMeta({ _wc3d_poster_id: '0' })}
						/>
					</div>

					<div class="wc3d-meta-toggle-row">
						<div class="wc3d-meta-toggle-info">
							<span class="wc3d-meta-toggle-label">Show on shop page</span>
							<span class="wc3d-meta-toggle-desc">Show a "View in 3D" button on this product's listing card, even while the global Shop Listing Quick View setting is off.</span>
						</div>
						<${Switch} id="_wc3d_show_on_shop" checked=${meta._wc3d_show_on_shop === 'yes'} onChange=${(on) => setMeta({ _wc3d_show_on_shop: on ? 'yes' : '' })} />
					</div>
				</div>

				<div class="wc3d-panel-card">
					<h4 class="wc3d-card-title">Appearance & Interaction</h4>

					<${SelectRow}
						id="_wc3d_position"
						label="Viewer Position"
						value=${meta._wc3d_position}
						options=${[['', useGlobal.position], ...Object.entries(POSITIONS)]}
						desc="Select where the 3D viewer renders on the single product page."
						onChange=${(v) => setMeta({ _wc3d_position: v })}
					/>
					<${SelectRow}
						id="_wc3d_background_type"
						label="Background Style"
						value=${bgType}
						options=${[
							['', useGlobal.background_type],
							['transparent', 'Transparent'],
							['color', 'Solid Color'],
							['image', 'Custom Image'],
						]}
						desc="Set background appearance (solid color, transparent, or custom image background)."
						onChange=${(v) => setMeta({ _wc3d_background_type: v })}
					/>

					<div class="wc3d-prod-bg-color-row" style=${bgType === 'color' ? '' : 'display:none;'}>
						<span class="wc3d-meta-field-label" style="display:block; margin-bottom: 6px;">Background Color</span>
						<${ColorPicker} id="_wc3d_background_color" value=${meta._wc3d_background_color} onChange=${(v) => setMeta({ _wc3d_background_color: v })} />
					</div>

					<div class="wc3d-prod-bg-image-row" style=${bgType === 'image' ? '' : 'display:none;'}>
						<span class="wc3d-meta-field-label" style="display:block; margin-bottom: 6px;">Background Image</span>
						<${Uploader}
							wrapId="wc3d-bg-image-uploader-wrap"
							inputId="_wc3d_background_image_id"
							imageClass="image-uploader"
							value=${meta._wc3d_background_image_id}
							fileName=${label('bg', Number(meta._wc3d_background_image_id), 'title')}
							empty=${{ icon: 'admin-appearance', title: 'Choose Background Image', button: 'Choose image' }}
							fileMeta="Background Image Asset"
							filenameClass="wc3d-prod-bg-image-filename"
							onPick=${() => open('bg')}
							onRemove=${() => setMeta({ _wc3d_background_image_id: '0' })}
						/>
					</div>

					<${SelectRow}
						id="_wc3d_loading_trigger"
						label="3D Loading Behavior"
						value=${meta._wc3d_loading_trigger}
						options=${[
							['', useGlobal.loading_trigger],
							['click', 'Click to Interact'],
							['scroll', 'Auto-load when visible'],
							['eager', 'Load immediately'],
						]}
						desc="Control when the heavy 3D rendering engine initializes."
						onChange=${(v) => setMeta({ _wc3d_loading_trigger: v })}
					/>
					<${SelectRow}
						id="_wc3d_enable_customizer"
						label="Enable Customizer Panel"
						value=${meta._wc3d_enable_customizer}
						options=${yesNo(useGlobal.enable_customizer)}
						desc="Allow shopper-side customization and add-to-cart of 3D parts/colors."
						onChange=${(v) => setMeta({ _wc3d_enable_customizer: v })}
					/>
					<${SelectRow}
						id="_wc3d_show_gallery"
						label="Gallery of Different Sides"
						value=${meta._wc3d_show_gallery}
						options=${yesNo(useGlobal.show_gallery)}
						desc="Show camera viewpoint gallery thumbnails at the bottom of the viewer."
						onChange=${(v) => setMeta({ _wc3d_show_gallery: v })}
					/>

					${productId > 0 && html`<${ShortcodeField} productId=${productId} />`}
				</div>
			</div>

			<div class="wc3d-meta-cta-group">
				${productId > 0
					? html`<a href=${'#admin.editor.' + productId} class="wc3d-gradient-btn" target="_blank" rel="noopener">
								<span class="wc3d-btn-icon">⚡</span>
								<span>Open 3D Customizer</span>
							</a>
							<p class="wc3d-cta-desc">Launches the interactive full-screen customizer panel in a new tab.</p>`
					: html`<div class="wc3d-cta-notice">
							<${Dashicon} name="info-outline" />
							<span>Save the product first to enable and open the 3D customizer.</span>
						</div>`}
			</div>
		</div>
		${m &&
		html`<${MediaModal}
			kind=${m.kind}
			title=${m.title}
			button=${m.button}
			initialTab=${startTab}
			initialUrl=${modal === 'model' && isExternal(modelAtt) ? modelAtt.url : ''}
			onClose=${() => setModal(null)}
			onSelect=${(att) => {
				setMeta({ [m.key]: att.id });
				setPicked({ ...picked, [modal]: att.id });
				setModal(null);
			}}
		/>`}
	</div>`;
}

// ── Classic editor (TinyMCE "Visual" + quicktags "Text") ─────────────────────
const QTAGS = [
	['b', '<strong>', '</strong>'],
	['i', '<em>', '</em>'],
	['b-quote', '\n\n<blockquote>', '</blockquote>\n\n'],
	['del', '<del>', '</del>'],
	['ins', '<ins>', '</ins>'],
	['ul', '<ul>\n', '\n</ul>\n\n'],
	['ol', '<ol>\n', '\n</ol>\n\n'],
	['li', '\t<li>', '</li>\n'],
	['code', '<code>', '</code>'],
	['more', '<!--more-->', ''],
];
const wordCount = (s) => (String(s).replace(/<[^>]*>/g, ' ').match(/\S+/g) || []).length;

function ClassicEditor({ id, value, onChange, rows = 12, footer }) {
	const [mode, setMode] = useState('tmce');
	const [modal, setModal] = useState(false);
	const ed = useRef(null);
	const ta = useRef(null);
	useEffect(() => {
		if (mode === 'tmce' && ed.current && document.activeElement !== ed.current) ed.current.innerHTML = value || '';
	}, [mode, value]);
	const exec = (cmd, arg) => {
		ed.current?.focus();
		document.execCommand(cmd, false, arg);
		onChange(ed.current.innerHTML);
	};
	const qt = ([, open, close]) => {
		const el = ta.current;
		const a = el.selectionStart;
		const b = el.selectionEnd;
		const next = value.slice(0, a) + open + value.slice(a, b) + close + value.slice(b);
		onChange(next);
		requestAnimationFrame(() => {
			el.focus();
			el.selectionStart = a + open.length;
			el.selectionEnd = b + open.length;
		});
	};
	const insertImage = (att) => {
		const tag = `<img class="alignnone size-medium" src="${attachmentUrl(att)}" alt="${att.title}" width="300" height="225" />`;
		if (mode === 'tmce') exec('insertHTML', tag);
		else onChange((value || '') + '\n' + tag);
		setModal(false);
	};
	const btn = (icon, label, cmd, arg) =>
		html`<button type="button" class="mce-btn-x" title=${label} aria-label=${label} onMouseDown=${(e) => e.preventDefault()} onClick=${() => exec(cmd, arg)}><${Dashicon} name=${icon} /></button>`;
	return html`<div id=${'wp-' + id + '-wrap'} class=${cx('wp-core-ui', 'wp-editor-wrap', mode === 'tmce' ? 'tmce-active' : 'html-active')}>
		<div class="wp-editor-tools">
			<div class="wp-media-buttons">
				<button type="button" class="button insert-media add_media" onClick=${() => setModal(true)}><${Dashicon} name="admin-media" class="wp-media-buttons-icon" /> Add Media</button>
			</div>
			<div class="wp-editor-tabs">
				<button type="button" class="wp-switch-editor switch-tmce" aria-pressed=${mode === 'tmce'} onClick=${() => setMode('tmce')}>Visual</button>
				<button type="button" class="wp-switch-editor switch-html" aria-pressed=${mode === 'html'} onClick=${() => setMode('html')}>Text</button>
			</div>
		</div>
		<div class="wp-editor-container">
			${mode === 'tmce'
				? html`<div class="mce-toolbar-x" role="toolbar">
							<select class="mce-format" aria-label="Paragraph" onChange=${(e) => (exec('formatBlock', e.currentTarget.value), (e.currentTarget.value = 'p'))}>
								<option value="p">Paragraph</option>
								<option value="h2">Heading 2</option>
								<option value="h3">Heading 3</option>
								<option value="h4">Heading 4</option>
								<option value="pre">Preformatted</option>
							</select>
							${btn('editor-bold', 'Bold (⌘B)', 'bold')} ${btn('editor-italic', 'Italic (⌘I)', 'italic')} ${btn('editor-ul', 'Bulleted list', 'insertUnorderedList')}
							${btn('editor-ol', 'Numbered list', 'insertOrderedList')} ${btn('editor-quote', 'Blockquote', 'formatBlock', 'blockquote')}
							${btn('editor-alignleft', 'Align left', 'justifyLeft')} ${btn('editor-aligncenter', 'Align center', 'justifyCenter')} ${btn('editor-alignright', 'Align right', 'justifyRight')}
						</div>
						<div
							ref=${ed}
							class="wc3d-mce-body"
							contenteditable="true"
							role="textbox"
							aria-multiline="true"
							style=${{ minHeight: rows * 20 + 'px' }}
							onInput=${(e) => onChange(e.currentTarget.innerHTML)}
						></div>`
				: html`<div class="quicktags-toolbar">
							${QTAGS.map((t) => html`<input type="button" key=${t[0]} class="ed_button button button-small" value=${t[0]} onClick=${() => qt(t)} />`)}
						</div>
						<textarea ref=${ta} class="wp-editor-area" id=${id} rows=${rows} value=${value} onInput=${(e) => onChange(e.currentTarget.value)}></textarea>`}
		</div>
		${footer && html`<table id="post-status-info"><tbody><tr><td id="wp-word-count">Word count: <span class="word-count">${wordCount(value)}</span></td><td class="autosave-info">${footer}</td></tr></tbody></table>`}
		${modal && html`<${MediaModal} kind="image" title="Add media" button="Insert into post" onClose=${() => setModal(false)} onSelect=${insertImage} />`}
	</div>`;
}

// ── Product data tabs ────────────────────────────────────────────────────────
const TABS = [
	{ key: 'general', label: 'General', icon: 'admin-tools', show: (t) => t !== 'grouped' },
	{ key: 'inventory', label: 'Inventory', icon: 'clipboard', show: () => true },
	{ key: 'shipping', label: 'Shipping', icon: 'car', show: (t, wc) => (t === 'simple' || t === 'variable') && !wc.virtual },
	{ key: 'linked_product', label: 'Linked Products', icon: 'admin-links', show: () => true },
	{ key: 'attribute', label: 'Attributes', icon: 'editor-ul', show: () => true },
	{ key: 'variations', label: 'Variations', icon: 'screenoptions', show: (t) => t === 'variable' },
	{ key: 'advanced', label: 'Advanced', icon: 'admin-generic', show: () => true },
	// woocommerce_product_data_tabs: wc3d_model_viewer, priority 70, show_if_simple show_if_variable.
	{ key: 'wc3d_model_viewer', label: '3D Model', icon: 'admin-tools', show: (t) => t === 'simple' || t === 'variable', target: 'wc3d_product_panel' },
];

function Field({ id, label, tip, children, cls }) {
	return html`<p class=${cx('form-field', id + '_field', cls)}>
		<label for=${id}>${label}</label>
		${children}
		${tip && html`<${HelpTip} tip=${tip} />`}
	</p>`;
}

function GeneralPanel({ d, setD, setWc }) {
	const wc = d.wc;
	return html`<div id="general_product_data" class="panel woocommerce_options_panel">
		${d.type !== 'variable' &&
		html`<div class="options_group pricing show_if_simple show_if_external">
			<${Field} id="_regular_price" label="Regular price ($)">
				<input type="text" class="short wc_input_price" id="_regular_price" value=${d.price} placeholder="" onInput=${(e) => setD({ price: e.currentTarget.value })} />
			<//>
			<${Field} id="_sale_price" label="Sale price ($)">
				<input type="text" class="short wc_input_price" id="_sale_price" value=${wc.salePrice} onInput=${(e) => setWc({ salePrice: e.currentTarget.value })} />
				<span class="description"><a href="#" class="sale_schedule" onClick=${(e) => e.preventDefault()}>Schedule</a></span>
			<//>
		</div>`}
		<div class="options_group show_if_simple show_if_external show_if_variable">
			<${Field} id="_tax_status" label="Tax status" tip="Define whether or not the entire product is taxable, or just the cost of shipping it.">
				<select id="_tax_status" class="select short" value=${wc.taxStatus} onChange=${(e) => setWc({ taxStatus: e.currentTarget.value })}>
					<option value="taxable">Taxable</option>
					<option value="shipping">Shipping only</option>
					<option value="none">None</option>
				</select>
			<//>
			<${Field} id="_tax_class" label="Tax class" tip="Choose a tax class for this product. Tax classes are used to apply different tax rates specific to certain types of product.">
				<select id="_tax_class" class="select short" value=${wc.taxClass} onChange=${(e) => setWc({ taxClass: e.currentTarget.value })}>
					<option value="">Standard</option>
					<option value="reduced-rate">Reduced rate</option>
					<option value="zero-rate">Zero rate</option>
				</select>
			<//>
		</div>
	</div>`;
}

function InventoryPanel({ d, setD, setWc }) {
	const wc = d.wc;
	return html`<div id="inventory_product_data" class="panel woocommerce_options_panel">
		<div class="options_group">
			<${Field} id="_sku" label=${html`<abbr title="Stock Keeping Unit">SKU</abbr>`} tip="SKU refers to a Stock-keeping unit, a unique identifier for each distinct product and service that can be purchased.">
				<input type="text" class="short" id="_sku" value=${d.sku} onInput=${(e) => setD({ sku: e.currentTarget.value })} />
			<//>
		</div>
		<div class="options_group">
			<p class="form-field _manage_stock_field">
				<label for="_manage_stock">Stock management</label>
				<input type="checkbox" class="checkbox" id="_manage_stock" checked=${wc.manageStock} onChange=${(e) => setWc({ manageStock: e.currentTarget.checked })} />
				<span class="description">Track stock quantity for this product</span>
			</p>
			${wc.manageStock &&
			html`<${Field} id="_stock" label="Quantity" tip="Stock quantity. If this is a variable product this value will be used to control stock for all variations, unless you define stock at variation level.">
				<input type="number" class="short wc_input_stock" id="_stock" step="1" value=${wc.stockQty} onInput=${(e) => setWc({ stockQty: e.currentTarget.value })} />
			<//>`}
			${!wc.manageStock &&
			d.type !== 'variable' &&
			html`<fieldset class="form-field _stock_status_field">
				<legend>Stock status</legend>
				<ul class="wc-radios">
					${Object.entries(STOCK_LABELS).map(
						([v, l]) => html`<li key=${v}><label><input type="radio" name="_stock_status" value=${v} class="select short" checked=${wc.stockStatus === v} onChange=${() => setWc({ stockStatus: v })} /> ${l}</label></li>`
					)}
				</ul>
			</fieldset>`}
		</div>
		<div class="options_group">
			<p class="form-field _sold_individually_field">
				<label for="_sold_individually">Sold individually</label>
				<input type="checkbox" class="checkbox" id="_sold_individually" checked=${wc.soldIndividually} onChange=${(e) => setWc({ soldIndividually: e.currentTarget.checked })} />
				<span class="description">Limit purchases to 1 item per order</span>
			</p>
		</div>
	</div>`;
}

function ShippingPanel({ d, setWc }) {
	const wc = d.wc;
	return html`<div id="shipping_product_data" class="panel woocommerce_options_panel">
		<div class="options_group">
			<${Field} id="_weight" label="Weight (kg)" tip="Weight in decimal form">
				<input type="text" class="short wc_input_decimal" id="_weight" placeholder="0" value=${wc.weight} onInput=${(e) => setWc({ weight: e.currentTarget.value })} />
			<//>
			<p class="form-field dimensions_field">
				<label for="product_length">Dimensions (cm)</label>
				<span class="wrap">
					<input id="product_length" placeholder="Length" class="input-text wc_input_decimal" size="6" type="text" value=${wc.length} onInput=${(e) => setWc({ length: e.currentTarget.value })} />
					<input placeholder="Width" class="input-text wc_input_decimal" size="6" type="text" value=${wc.width} onInput=${(e) => setWc({ width: e.currentTarget.value })} />
					<input placeholder="Height" class="input-text wc_input_decimal last" size="6" type="text" value=${wc.height} onInput=${(e) => setWc({ height: e.currentTarget.value })} />
				</span>
				<${HelpTip} tip="LxWxH in decimal form" />
			</p>
		</div>
		<div class="options_group">
			<${Field} id="product_shipping_class" label="Shipping class" tip="Shipping classes are used by certain shipping methods to group similar products.">
				<select id="product_shipping_class" class="select short" value=${wc.shippingClass} onChange=${(e) => setWc({ shippingClass: e.currentTarget.value })}>
					<option value="">No shipping class</option>
					<option value="bulky">Bulky items</option>
				</select>
			<//>
		</div>
	</div>`;
}

function ProductSearch({ id, value, exclude, onChange, placeholder = 'Search for a product…' }) {
	const products = useStore((s) => s.products || {});
	const [q, setQ] = useState('');
	const [open, setOpen] = useState(false);
	const matches = Object.values(products).filter((p) => p.status !== 'trash' && p.id !== exclude && !value.includes(p.id) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
	return html`<span class="select2-container wc3d-s2" onFocusOut=${(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
		<span class="select2-selection select2-selection--multiple">
			<ul class="select2-selection__rendered">
				${value.map(
					(pid) => html`<li class="select2-selection__choice" key=${pid}>
						<button type="button" class="select2-selection__choice__remove" aria-label="Remove item" onClick=${() => onChange(value.filter((x) => x !== pid))}>×</button>
						${products[pid]?.name || '#' + pid}
					</li>`
				)}
				<li class="select2-search select2-search--inline">
					<input id=${id} class="select2-search__field" type="search" placeholder=${value.length ? '' : placeholder} value=${q} onFocus=${() => setOpen(true)} onInput=${(e) => (setQ(e.currentTarget.value), setOpen(true))} />
				</li>
			</ul>
		</span>
		${open &&
		html`<span class="select2-dropdown">
			<ul class="select2-results__options" role="listbox">
				${matches.length
					? matches.map(
							(p) => html`<li key=${p.id} role="option" tabindex="-1" class="select2-results__option" onMouseDown=${(e) => e.preventDefault()} onClick=${() => (onChange([...value, p.id]), setQ(''))}>
								${p.name} (${p.sku ? p.sku : '#' + p.id})
							</li>`
						)
					: html`<li class="select2-results__option select2-results__message">No matches found</li>`}
			</ul>
		</span>`}
	</span>`;
}

function LinkedPanel({ d, setWc, productId }) {
	return html`<div id="linked_product_data" class="panel woocommerce_options_panel">
		<div class="options_group show_if_grouped">
			<p class="form-field">
				<label for="upsell_ids">Upsells</label>
				<${ProductSearch} id="upsell_ids" value=${d.wc.upsells} exclude=${productId} onChange=${(v) => setWc({ upsells: v })} />
				<${HelpTip} tip="Upsells are products which you recommend instead of the currently viewed product, for example, products that are more profitable or better quality or more expensive." />
			</p>
			${d.type !== 'external' &&
			d.type !== 'grouped' &&
			html`<p class="form-field">
				<label for="crosssell_ids">Cross-sells</label>
				<${ProductSearch} id="crosssell_ids" value=${d.wc.crossSells} exclude=${productId} onChange=${(v) => setWc({ crossSells: v })} />
				<${HelpTip} tip="Cross-sells are products which you promote in the cart, based on the current product." />
			</p>`}
		</div>
	</div>`;
}

function AttributesPanel({ product }) {
	const attrs = product?.attributes || [];
	const [open, setOpen] = useState({});
	return html`<div id="product_attributes" class="panel wc-metaboxes-wrapper">
		<div class="toolbar toolbar-top">
			<span class="expand-close">
				<a href="#" class="expand_all" onClick=${(e) => (e.preventDefault(), setOpen(Object.fromEntries(attrs.map((a) => [a.name, true]))))}>Expand</a> / <a href="#" class="close_all" onClick=${(e) => (e.preventDefault(), setOpen({}))}>Close</a>
			</span>
		</div>
		<div class="product_attributes wc-metaboxes">
			${!attrs.length &&
			html`<div class="add-attribute-container"><p class="wc3d-wc-empty">Add descriptive pieces of information that customers can use to search for this product on your store, such as “Material” or “Brand”.</p></div>`}
			${attrs.map(
				(a, i) => html`<div class=${cx('woocommerce_attribute', 'wc-metabox', !open[a.name] && 'closed')} key=${a.name}>
					<h3 onClick=${() => setOpen({ ...open, [a.name]: !open[a.name] })}>
						<div class="handlediv" aria-label="Click to toggle"></div>
						<div class="tips sort" data-tip="Drag and drop to set admin attribute order"></div>
						<strong class="attribute_name">${a.name}</strong>
					</h3>
					${open[a.name] &&
					html`<div class="woocommerce_attribute_data wc-metabox-content">
						<table cellpadding="0" cellspacing="0">
							<tbody>
								<tr>
									<td class="attribute_name">
										<label>Name:</label>
										<input type="text" class="attribute_name" value=${a.name} readonly />
										<div class="enable_visible"><label><input type="checkbox" class="checkbox" checked disabled /> Visible on the product page</label></div>
										<div class="enable_variation show_if_variable"><label><input type="checkbox" class="checkbox" checked=${product.type === 'variable'} disabled /> Used for variations</label></div>
									</td>
									<td rowspan="3">
										<label>Value(s):</label>
										<textarea readonly rows="3">${a.options.join(' | ')}</textarea>
									</td>
								</tr>
							</tbody>
						</table>
					</div>`}
				</div>`
			)}
		</div>
	</div>`;
}

function VariationsPanel({ product }) {
	const variations = useStore((s) => s.variations || {});
	const list = (product?.variations || []).map((id) => variations[id]).filter(Boolean);
	const [open, setOpen] = useState({});
	const attrs = product?.attributes || [];
	return html`<div id="variable_product_options" class="panel wc-metaboxes-wrapper">
		<div id="variable_product_options_inner">
			<div class="toolbar toolbar-variations-defaults">
				<div class="variations-defaults">
					<strong>Default Form Values</strong>
					${attrs.map(
						(a) => html`<select key=${a.name} disabled>
							<option>No default ${a.name}…</option>
						</select>`
					)}
				</div>
				<div class="variations-pagenav">
					<span class="displaying-num">${list.length} ${list.length === 1 ? 'variation' : 'variations'}</span>
					<span class="expand-close">(<a href="#" class="expand_all" onClick=${(e) => (e.preventDefault(), setOpen(Object.fromEntries(list.map((v) => [v.id, true]))))}>Expand</a> / <a href="#" class="close_all" onClick=${(e) => (e.preventDefault(), setOpen({}))}>Close</a>)</span>
				</div>
				<div class="clear"></div>
			</div>
			<div class="woocommerce_variations wc-metaboxes">
				${list.map(
					(v) => html`<div key=${v.id} class=${cx('woocommerce_variation', 'wc-metabox', !open[v.id] && 'closed')}>
						<h3 onClick=${(e) => e.target.tagName !== 'SELECT' && setOpen({ ...open, [v.id]: !open[v.id] })}>
							<div class="handlediv" aria-label="Click to toggle"></div>
							<strong>#${v.id} </strong>
							${Object.entries(v.attributes).map(
								([k, val]) => html`<select key=${k} disabled aria-label=${k}><option>${val}</option></select>`
							)}
							<a href="#" class="edit_variation edit" onClick=${(e) => (e.preventDefault(), e.stopPropagation(), setOpen({ ...open, [v.id]: !open[v.id] }))}>Edit</a>
						</h3>
						${open[v.id] &&
						html`<div class="woocommerce_variable_attributes wc-metabox-content">
							<div class="data">
								<p class="form-row form-row-first upload_image">
									<span class="upload_image_button tips">${v.swatch ? html`<span class="wc3d-swatch" style=${{ background: v.swatch }}></span>` : html`<${Dashicon} name="format-image" />`}</span>
								</p>
								<p class="form-row form-row-last">
									<label>SKU</label>
									<input type="text" value=${v.sku} readonly placeholder=${product.sku} />
								</p>
								<p class="form-row options">
									<label><input type="checkbox" class="checkbox" checked disabled /> Enabled</label>
									<label><input type="checkbox" class="checkbox" disabled /> Downloadable</label>
									<label><input type="checkbox" class="checkbox" disabled /> Virtual</label>
									<label><input type="checkbox" class="checkbox" disabled /> Manage stock?</label>
								</p>
								<div class="variable_pricing">
									<p class="form-row form-row-first"><label>Regular price ($)</label><input type="text" value=${v.price} readonly /></p>
									<p class="form-row form-row-last"><label>Sale price ($)</label><input type="text" value="" readonly /></p>
								</div>
								<p class="form-row form-row-full"><label>Stock status</label><select disabled><option>In stock</option></select></p>
							</div>
						</div>`}
					</div>`
				)}
			</div>
			<div class="toolbar">
				<div class="variations-pagenav"><span class="displaying-num">${list.length} ${list.length === 1 ? 'variation' : 'variations'}</span></div>
				<div class="clear"></div>
			</div>
		</div>
	</div>`;
}

function AdvancedPanel({ d, setWc }) {
	const wc = d.wc;
	return html`<div id="advanced_product_data" class="panel woocommerce_options_panel">
		<div class="options_group hide_if_external hide_if_grouped">
			<p class="form-field _purchase_note_field">
				<label for="_purchase_note">Purchase note</label>
				<textarea class="short" id="_purchase_note" rows="2" cols="20" value=${wc.purchaseNote} onInput=${(e) => setWc({ purchaseNote: e.currentTarget.value })}></textarea>
				<${HelpTip} tip="Enter an optional note to send the customer after purchase." />
			</p>
		</div>
		<div class="options_group">
			<${Field} id="menu_order" label="Menu order" tip="Custom ordering position.">
				<input type="number" class="short" id="menu_order" step="1" value=${wc.menuOrder} onInput=${(e) => setWc({ menuOrder: Number(e.currentTarget.value) || 0 })} />
			<//>
		</div>
		<div class="options_group reviews">
			<p class="form-field comment_status_field">
				<label for="comment_status">Enable reviews</label>
				<input type="checkbox" class="checkbox" id="comment_status" checked=${wc.reviews} onChange=${(e) => setWc({ reviews: e.currentTarget.checked })} />
			</p>
		</div>
	</div>`;
}

function ProductDataBox({ d, setD, setWc, setMeta, product, productId, tab, setTab, attachments }) {
	const visible = applyFilter('product-edit.tabs', TABS.filter((t) => t.show(d.type, d.wc)), d);
	const active = visible.some((t) => t.key === tab) ? tab : visible[0].key;
	const header = html`<span>Product data <span class="type_box"> —
		<label for="product-type">
			<select id="product-type" name="product-type" value=${d.type} onChange=${(e) => setD({ type: e.currentTarget.value })}>
				<optgroup label="Product Type">
					${Object.entries(TYPE_LABELS).map(([v, l]) => html`<option value=${v} key=${v}>${l}</option>`)}
				</optgroup>
			</select>
		</label>
		${d.type === 'simple' &&
		html`<label for="_virtual" class="show_if_simple tips">Virtual:
				<input type="checkbox" id="_virtual" checked=${d.wc.virtual} onChange=${(e) => setWc({ virtual: e.currentTarget.checked })} /></label>
			<label for="_downloadable" class="show_if_simple tips">Downloadable:
				<input type="checkbox" id="_downloadable" checked=${d.wc.downloadable} onChange=${(e) => setWc({ downloadable: e.currentTarget.checked })} /></label>`}
	</span></span>`;
	return html`<${Postbox} id="woocommerce-product-data" title="Product data" header=${header} insideClass="wc3d-pd-inside">
		<div class="panel-wrap product_data">
			<ul class="product_data_tabs wc-tabs" role="tablist">
				${visible.map(
					(t) => html`<li key=${t.key} class=${cx(t.key + '_options', t.key + '_tab', t.key === 'wc3d_model_viewer' && 'show_if_simple show_if_variable', active === t.key && 'active')}>
						<a href=${'#' + (t.target || t.key + '_product_data')} role="tab" aria-selected=${active === t.key} onClick=${(e) => (e.preventDefault(), setTab(t.key))}>
							<${Dashicon} name=${t.icon} class="wc3d-tab-icon" /><span>${t.label}</span>
						</a>
					</li>`
				)}
			</ul>
			${active === 'general' && html`<${GeneralPanel} d=${d} setD=${setD} setWc=${setWc} />`}
			${active === 'inventory' && html`<${InventoryPanel} d=${d} setD=${setD} setWc=${setWc} />`}
			${active === 'shipping' && html`<${ShippingPanel} d=${d} setWc=${setWc} />`}
			${active === 'linked_product' && html`<${LinkedPanel} d=${d} setWc=${setWc} productId=${productId} />`}
			${active === 'attribute' && html`<${AttributesPanel} product=${product} />`}
			${active === 'variations' && html`<${VariationsPanel} product=${product} />`}
			${active === 'advanced' && html`<${AdvancedPanel} d=${d} setWc=${setWc} />`}
			${active === 'wc3d_model_viewer' && html`<${LauncherPanel} productId=${productId} meta=${d.meta} setMeta=${setMeta} attachments=${attachments} />`}
			<div class="clear"></div>
		</div>
	<//>`;
}

// ── Sidebar boxes ───────────────────────────────────────────────────────────
function MiscRow({ cls, icon, label, value, editor }) {
	const [editing, setEditing] = useState(false);
	return html`<div class=${cx('misc-pub-section', cls)}>
		${icon && html`<${Dashicon} name=${icon} class="misc-pub-icon" />`}
		${label} <span class="misc-pub-value">${value}</span>
		${editor && !editing && html` <a href="#" class="edit-misc hide-if-no-js" role="button" onClick=${(e) => (e.preventDefault(), setEditing(true))}><span aria-hidden="true">Edit</span></a>`}
		${editing && html`<div class="misc-pub-editor">${editor(() => setEditing(false))}</div>`}
	</div>`;
}

function InlineChoice({ options, value, onOk, onCancel, extra, type = 'select' }) {
	const [v, setV] = useState(value);
	const [x, setX] = useState(extra?.value);
	return html`<div class="wc3d-inline-choice">
		${type === 'select'
			? html`<select value=${v} onChange=${(e) => setV(e.currentTarget.value)}>${options.map(([k, l]) => html`<option value=${k} key=${k}>${l}</option>`)}</select>`
			: options.map(([k, l]) => html`<label class="wc3d-radio-line" key=${k}><input type="radio" checked=${v === k} onChange=${() => setV(k)} /> ${l}</label>`)}
		${extra && html`<label class="wc3d-radio-line"><input type="checkbox" checked=${!!x} onChange=${(e) => setX(e.currentTarget.checked)} /> ${extra.label}</label>`}
		<p>
			<button type="button" class="button" onClick=${() => onOk(v, x)}>OK</button>
			<a href="#" class="cancel-post-status hide-if-no-js button-cancel" onClick=${(e) => (e.preventDefault(), onCancel())}>Cancel</a>
		</p>
	</div>`;
}

const CATALOG = [
	['visible', 'Shop and search results'],
	['catalog', 'Shop only'],
	['search', 'Search results only'],
	['hidden', 'Hidden'],
];
const STATUS_NAMES = { publish: 'Published', pending: 'Pending Review', draft: 'Draft', 'auto-draft': 'Draft', private: 'Privately Published' };

function DateEditor({ value, onOk, onCancel }) {
	const t = parseDate(value) || parseDate(nowStr());
	const [v, setV] = useState(t);
	const num = (k) => (e) => setV({ ...v, [k]: Number(e.currentTarget.value) || 0 });
	const p2 = (n) => String(n).padStart(2, '0');
	return html`<fieldset id="timestampdiv" class="wc3d-inline-choice">
		<legend class="screen-reader-text">Date and time</legend>
		<div class="timestamp-wrap">
			<select class="wc3d-mm" aria-label="Month" value=${v.mo} onChange=${num('mo')}>
				${MONTH_ABBR.map((m, i) => html`<option value=${i + 1} key=${m}>${p2(i + 1)}-${m}</option>`)}
			</select>
			<input type="text" class="wc3d-jj" aria-label="Day" size="2" maxlength="2" value=${p2(v.d)} onInput=${num('d')} />,
			<input type="text" class="wc3d-aa" aria-label="Year" size="4" maxlength="4" value=${v.y} onInput=${num('y')} /> at
			<input type="text" class="wc3d-hh" aria-label="Hour" size="2" maxlength="2" value=${p2(v.h)} onInput=${num('h')} />:<input type="text" class="wc3d-mn" aria-label="Minute" size="2" maxlength="2" value=${p2(v.mi)} onInput=${num('mi')} />
		</div>
		<p>
			<button type="button" class="button" onClick=${() => onOk(`${v.y}-${p2(v.mo)}-${p2(v.d)} ${p2(v.h)}:${p2(v.mi)}`)}>OK</button>
			<a href="#" class="cancel-timestamp hide-if-no-js button-cancel" onClick=${(e) => (e.preventDefault(), onCancel())}>Cancel</a>
		</p>
	</fieldset>`;
}

function PublishBox({ d, setD, setWc, isNew, savedStatus, onSave, onTrash, slug }) {
	const published = savedStatus === 'publish' || savedStatus === 'private';
	const visLabel = d.wc.visibility === 'private' ? 'Private' : d.wc.visibility === 'password' ? 'Password protected' : 'Public';
	return html`<${Postbox} id="submitdiv" title="Publish">
		<div class="submitbox" id="submitpost">
			<div id="minor-publishing">
				<div id="minor-publishing-actions">
					${!published && html`<div id="save-action"><input type="button" class="button" id="save-post" value="Save Draft" onClick=${() => onSave('draft')} /></div>`}
					<div id="preview-action">
						<a class="preview button" href=${'#store.product.' + (slug || '')} onClick=${(e) => isNew && e.preventDefault()}>${published ? 'Preview Changes' : 'Preview'}</a>
					</div>
					<div class="clear"></div>
				</div>
				<div id="misc-publishing-actions">
					<${MiscRow}
						cls="misc-pub-post-status"
						icon="post-status"
						label="Status:"
						value=${html`<span id="post-status-display">${STATUS_NAMES[d.status] || d.status}</span>`}
						editor=${(close) =>
							html`<${InlineChoice}
								options=${[...(published ? [['publish', 'Published']] : []), ['pending', 'Pending Review'], ['draft', 'Draft']]}
								value=${d.status === 'auto-draft' ? 'draft' : d.status}
								onOk=${(v) => (setD({ status: v }), close())}
								onCancel=${close}
							/>`}
					/>
					<${MiscRow}
						cls="misc-pub-visibility"
						icon="visibility"
						label="Visibility:"
						value=${html`<span id="post-visibility-display">${visLabel}</span>`}
						editor=${(close) =>
							html`<${InlineChoice}
								type="radio"
								options=${[
									['public', 'Public'],
									['password', 'Password protected'],
									['private', 'Private'],
								]}
								value=${d.wc.visibility}
								onOk=${(v) => (setWc({ visibility: v }), close())}
								onCancel=${close}
							/>`}
					/>
					<${MiscRow}
						cls="curtime misc-pub-curtime"
						icon="calendar-alt"
						label=${published ? 'Published on:' : 'Publish'}
						value=${html`<b>${published ? publishDate(d.dateCreated) : 'immediately'}</b>`}
						editor=${(close) => html`<${DateEditor} value=${d.dateCreated} onOk=${(v) => (setD({ dateCreated: v }), close())} onCancel=${close} />`}
					/>
					<${MiscRow}
						cls="catalog-visibility"
						label="Catalog visibility:"
						value=${html`<strong id="catalog-visibility-display">${CATALOG.find(([k]) => k === d.wc.catalogVisibility)?.[1]}${d.wc.featured ? ', Featured' : ''}</strong>`}
						editor=${(close) =>
							html`<${InlineChoice}
								type="radio"
								options=${CATALOG}
								value=${d.wc.catalogVisibility}
								extra=${{ label: 'This is a featured product', value: d.wc.featured }}
								onOk=${(v, featured) => (setWc({ catalogVisibility: v, featured: !!featured }), close())}
								onCancel=${close}
							/>`}
					/>
					<${Slot} name="product-edit.misc-actions" />
				</div>
				<div class="clear"></div>
			</div>
			<div id="major-publishing-actions">
				<div id="delete-action"><a class="submitdelete deletion" href="#admin.products" onClick=${(e) => (e.preventDefault(), onTrash())}>Move to Trash</a></div>
				<div id="publishing-action">
					<input type="button" class="button button-primary button-large" id="publish" value=${published ? 'Update' : 'Publish'} onClick=${() => onSave(published ? null : 'publish')} />
				</div>
				<div class="clear"></div>
			</div>
		</div>
	<//>`;
}

function CategoriesBox({ d, setD }) {
	const state = useStore();
	const [tab, setTab] = useState('all');
	const [adding, setAdding] = useState(false);
	const [newCat, setNewCat] = useState('');
	const [extra, setExtra] = useState([]);
	const cats = [...new Set([...allCategories(state), ...extra])].sort((a, b) => a.localeCompare(b));
	const checked = categoriesOf(d);
	const counts = {};
	Object.values(state.products || {}).forEach((p) => categoriesOf(p).forEach((c) => (counts[c] = (counts[c] || 0) + 1)));
	const used = cats.filter((c) => counts[c]).sort((a, b) => counts[b] - counts[a]).slice(0, 10);
	const toggle = (c, on) => setD({ category: (on ? [...checked, c] : checked.filter((x) => x !== c)).join(', ') });
	const list = tab === 'all' ? cats : used;
	const add = () => {
		const name = newCat.trim();
		if (!name) return;
		setExtra([...extra, name]);
		toggle(name, true);
		setNewCat('');
	};
	return html`<${Postbox} id="product_catdiv" title="Product categories">
		<div id="taxonomy-product_cat" class="categorydiv">
			<ul class="category-tabs">
				<li class=${cx(tab === 'all' && 'tabs')}><a href="#product_cat-all" onClick=${(e) => (e.preventDefault(), setTab('all'))}>All categories</a></li>
				<li class=${cx(tab === 'pop' && 'tabs')}><a href="#product_cat-pop" onClick=${(e) => (e.preventDefault(), setTab('pop'))}>Most Used</a></li>
			</ul>
			<div class="tabs-panel">
				<ul class="categorychecklist form-no-clear">
					${list.map(
						(c) => html`<li key=${c}><label class="selectit"><input type="checkbox" checked=${checked.includes(c)} onChange=${(e) => toggle(c, e.currentTarget.checked)} /> ${c}</label></li>`
					)}
				</ul>
			</div>
			<div class="wp-hidden-children">
				<a href="#product_cat-add" class="hide-if-no-js taxonomy-add-new" onClick=${(e) => (e.preventDefault(), setAdding(!adding))}>+ Add new category</a>
				${adding &&
				html`<p class="category-add wp-hidden-child">
					<label class="screen-reader-text" for="newproduct_cat">Add new category</label>
					<input type="text" id="newproduct_cat" class="form-required form-input-tip" value=${newCat} onInput=${(e) => setNewCat(e.currentTarget.value)} onKeyDown=${(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
					<label class="screen-reader-text" for="newproduct_cat_parent">Parent category:</label>
					<select id="newproduct_cat_parent" class="postform">
						<option value="-1">— Parent category —</option>
						${cats.map((c) => html`<option key=${c}>${c}</option>`)}
					</select>
					<input type="button" class="button category-add-submit" value="Add new category" onClick=${add} />
				</p>`}
			</div>
		</div>
	<//>`;
}

function TagsBox({ d, setWc }) {
	const products = useStore((s) => s.products || {});
	const [text, setText] = useState('');
	const [cloud, setCloud] = useState(false);
	const tags = d.wc.tags || [];
	const add = (raw = text) => {
		const next = raw
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
		setWc({ tags: [...new Set([...tags, ...next])] });
		setText('');
	};
	const all = [...new Set(Object.values(products).flatMap((p) => p.wc?.tags || []))].filter((t) => !tags.includes(t));
	return html`<${Postbox} id="tagsdiv-product_tag" title="Product tags">
		<div class="tagsdiv" id="product_tag">
			<div class="jaxtag">
				<div class="ajaxtag hide-if-no-js">
					<label class="screen-reader-text" for="new-tag-product_tag">Add new tag</label>
					<input type="text" id="new-tag-product_tag" class="newtag form-input-tip" size="16" value=${text} onInput=${(e) => setText(e.currentTarget.value)} onKeyDown=${(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
					<input type="button" class="button tagadd" value="Add" onClick=${() => add()} />
				</div>
				<p class="howto" id="new-tag-product_tag-desc">Separate tags with commas</p>
			</div>
			<ul class="tagchecklist" role="list">
				${tags.map(
					(t) => html`<li key=${t}>
						<button type="button" class="ntdelbutton" onClick=${() => setWc({ tags: tags.filter((x) => x !== t) })}>
							<span class="remove-tag-icon" aria-hidden="true"><${Dashicon} name="dismiss" /></span><span class="screen-reader-text">Remove term: ${t}</span>
						</button>
						${t}
					</li>`
				)}
			</ul>
		</div>
		<p class="hide-if-no-js"><button type="button" class="button-link tagcloud-link" aria-expanded=${cloud} onClick=${() => setCloud(!cloud)}>Choose from the most used tags</button></p>
		${cloud &&
		html`<p class="the-tagcloud">
			${all.length ? all.map((t) => html`<a href="#" key=${t} class="tag-cloud-link" onClick=${(e) => (e.preventDefault(), add(t))}>${t}</a> `) : 'No tags found!'}
		</p>`}
	<//>`;
}

function ImageBox({ d, setD, product }) {
	const attachments = useStore((s) => s.attachments || {});
	const [modal, setModal] = useState(false);
	const img = d.image;
	const att = img?.attachmentId ? attachments[img.attachmentId] : null;
	return html`<${Postbox} id="postimagediv" title="Product image">
		${img
			? html`<p class="hide-if-no-js">
						<a href="#" id="set-post-thumbnail" onClick=${(e) => (e.preventDefault(), setModal(true))}>
							${att ? html`<img src=${attachmentUrl(att)} alt="" class="wc3d-thumb-img" />` : html`<${ProductImage} product=${{ ...(product || { id: 0, name: d.name }), image: img }} size=${254} fluid alt="" />`}
						</a>
					</p>
					<p class="hide-if-no-js howto" id="set-post-thumbnail-desc">Click the image to edit or update</p>
					<p class="hide-if-no-js"><a href="#" id="remove-post-thumbnail" onClick=${(e) => (e.preventDefault(), setD({ image: null }))}>Remove product image</a></p>`
			: html`<p class="hide-if-no-js"><a href="#" id="set-post-thumbnail" onClick=${(e) => (e.preventDefault(), setModal(true))}>Set product image</a></p>`}
		${modal &&
		html`<${MediaModal}
			kind="image"
			title="Product image"
			button="Set product image"
			onClose=${() => setModal(false)}
			onSelect=${(a) => (setD({ image: { attachmentId: a.id, illustration: 'throw', bg: a.color || '#f1f5f9', color: '#94a3b8' } }), setModal(false))}
		/>`}
	<//>`;
}

function GalleryBox({ d, setWc }) {
	const attachments = useStore((s) => s.attachments || {});
	const [modal, setModal] = useState(false);
	const ids = (d.wc.gallery || []).filter((id) => attachments[id]);
	return html`<${Postbox} id="woocommerce-product-images" title="Product gallery">
		<div id="product_images_container">
			<ul class="product_images">
				${ids.map(
					(id) => html`<li class="image" key=${id}>
						<img src=${attachmentUrl(attachments[id])} alt="" />
						<ul class="actions"><li><a href="#" class="delete tips" aria-label="Delete image" onClick=${(e) => (e.preventDefault(), setWc({ gallery: ids.filter((x) => x !== id) }))}>Delete</a></li></ul>
					</li>`
				)}
			</ul>
		</div>
		<p class="add_product_images hide-if-no-js"><a href="#" onClick=${(e) => (e.preventDefault(), setModal(true))}>Add product gallery images</a></p>
		${modal &&
		html`<${MediaModal} kind="image" title="Add images to product gallery" button="Add to gallery" onClose=${() => setModal(false)} onSelect=${(a) => (setWc({ gallery: [...new Set([...ids, a.id])] }), setModal(false))} />`}
	<//>`;
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function ProductEdit({ params = [] }) {
	const state = useStore();
	const flashed = useFlash();
	const isNew = params[0] === 'new';
	const productId = isNew ? 0 : Number(params[0]) || 0;
	const product = productId ? state.products?.[productId] : null;
	const key = isNew ? 'new' : productId;

	const [draft, setDraftState] = useState(() => {
		const base = draftFrom(product || {});
		const saved = drafts.get(key);
		return saved && saved.base === JSON.stringify(base) ? saved.draft : base;
	});
	const [tab, setTabState] = useState(() => (params[1] && TABS.some((t) => t.key === params[1]) ? params[1] : lastTab.get(key) || 'general'));
	const [notice, setNotice] = useState(null);
	const [slugEdit, setSlugEdit] = useState(null);

	const update = (next) => {
		setDraftState(next);
		drafts.set(key, { base: JSON.stringify(draftFrom(product || {})), draft: next });
	};
	const setD = (patch) => update({ ...draft, ...patch });
	const setWc = (patch) => update({ ...draft, wc: { ...draft.wc, ...patch } });
	const setMeta = (patch) => update({ ...draft, meta: { ...draft.meta, ...patch } });
	const setTab = (t) => (setTabState(t), lastTab.set(key, t));

	if (!isNew && !product) {
		return html`<${WpAdmin} current="all-products" title="Edit product">
			<div class="wrap"><div class="notice notice-error"><p>You attempted to edit an item that does not exist. Perhaps it was deleted?</p></div></div>
		<//>`;
	}
	if (product?.status === 'trash') {
		return html`<${WpAdmin} current="all-products" title="Edit product">
			<div class="wrap"><div class="notice notice-error"><p>You cannot edit this item because it is in the Trash. Please restore it and try again.</p></div></div>
		<//>`;
	}

	const save = (forceStatus) => {
		const now = nowStr();
		let status = forceStatus || (draft.status === 'auto-draft' ? 'draft' : draft.status);
		if (forceStatus === 'publish' && draft.wc.visibility === 'private') status = 'private';
		const fields = {
			name: draft.name,
			slug: draft.slug || slugify(draft.name),
			description: draft.description,
			short: draft.short,
			type: draft.type,
			status,
			price: draft.price === '' ? '' : Number(draft.price),
			sku: draft.sku,
			category: draft.category || 'Uncategorized',
			image: draft.image,
			wc: { ...draft.wc },
			meta: sanitizeMeta(draft.meta),
			dateModified: now,
		};
		if (isNew) {
			const id = store.nextId('products');
			const created = {
				id,
				...fields,
				name: fields.name || '(no title)',
				slug: fields.slug || String(id),
				dateCreated: draft.dateCreated || now,
				attributes: [],
				variations: [],
			};
			store.patch(['products', id], created);
			applyFilter('product-edit.saved', id, 'new');
			drafts.delete('new');
			lastTab.set(id, tab);
			flash({ body: status === 'publish' ? html`Product published. <a href=${'#store.product.' + created.slug}>View Product</a>` : html`Product draft updated. <a href=${'#store.product.' + created.slug}>Preview product</a>` });
			go('admin.product.' + id);
			return;
		}
		const next = { ...product, ...fields, dateCreated: draft.dateCreated || product.dateCreated };
		store.patch(['products', productId], next);
		applyFilter('product-edit.saved', productId, key);
		const fresh = draftFrom(next);
		setDraftState(fresh);
		drafts.delete(key);
		const was = product.status;
		setNotice({
			n: (notice?.n || 0) + 1,
			body: status === 'publish' && was !== 'publish'
				? html`Product published. <a href=${'#store.product.' + next.slug}>View Product</a>`
				: status === 'publish' || status === 'private'
					? html`Product updated. <a href=${'#store.product.' + next.slug}>View Product</a>`
					: html`Product draft updated. <a href=${'#store.product.' + next.slug}>Preview product</a>`,
		});
		window.scrollTo(0, 0);
	};

	const trash = () => {
		drafts.delete(key);
		if (isNew) return go('admin.products');
		store.patch(['products', productId, 'status'], 'trash');
		flash({ body: '1 product moved to the Trash.' });
		go('admin.products');
	};

	const slug = draft.slug || slugify(draft.name);
	const title = isNew ? 'Add new product' : 'Edit product';

	return html`<${WpAdmin} current="all-products" title=${title}>
		<div class="wrap wc3d-wc-screen wc3d-product-edit">
			<h1 class="wp-heading-inline">${title}</h1>
			${!isNew && html`<a href="#admin.product.new" class="page-title-action">Add New Product</a>`}
			<hr class="wp-header-end" />
			${flashed.map((n, i) => html`<${WpNotice} key=${'f' + i} id="message">${n.body}<//>`)}
			${notice && html`<${WpNotice} key=${notice.n} id="message">${notice.body}<//>`}

			<form name="post" id="post" onSubmit=${(e) => e.preventDefault()}>
				<div id="poststuff">
					<div id="post-body" class="metabox-holder columns-2">
						<div id="post-body-content">
							<div id="titlediv">
								<div id="titlewrap">
									<label class=${cx('wc3d-title-prompt', draft.name && 'screen-reader-text')} id="title-prompt-text" for="title">Product name</label>
									<input type="text" name="post_title" size="30" id="title" spellcheck="true" autocomplete="off" value=${draft.name} onInput=${(e) => setD({ name: e.currentTarget.value })} />
								</div>
								<div class="inside">
									<div id="edit-slug-box" class="hide-if-no-js">
										${(slug || !isNew) &&
										html`<strong>Permalink:</strong>${' '}${slugEdit !== null
												? html`<span id="sample-permalink">https://demo.store/product/<input type="text" id="new-post-slug" value=${slugEdit} onInput=${(e) => setSlugEdit(e.currentTarget.value)} />/</span>
														<span id="edit-slug-buttons">
															<button type="button" class="save button button-small" onClick=${() => (setD({ slug: slugify(slugEdit) || slug }), setSlugEdit(null))}>OK</button>
															<button type="button" class="cancel button-link" onClick=${() => setSlugEdit(null)}>Cancel</button>
														</span>`
												: html`<span id="sample-permalink"><a href=${'#store.product.' + slug}>https://demo.store/product/<span id="editable-post-name">${slug}</span>/</a></span>
														<span id="edit-slug-buttons"><button type="button" class="edit-slug button button-small hide-if-no-js" aria-label="Edit permalink" onClick=${() => setSlugEdit(slug)}>Edit</button></span>`}`}
									</div>
								</div>
							</div>
							<div id="postdivrich" class="postarea wp-editor-expand">
								<${ClassicEditor}
									id="content"
									value=${draft.description}
									onChange=${(v) => setD({ description: v })}
									rows=${14}
									footer=${product?.dateModified ? html`<span id="last-edit">Last edited by Raju on ${longDate(product.dateModified)}</span>` : html`<span id="last-edit"></span>`}
								/>
							</div>
						</div>

						<div id="postbox-container-1" class="postbox-container">
							<${PublishBox} d=${draft} setD=${setD} setWc=${setWc} isNew=${isNew} savedStatus=${product?.status || 'auto-draft'} onSave=${save} onTrash=${trash} slug=${slug} />
							<${CategoriesBox} d=${draft} setD=${setD} />
							<${TagsBox} d=${draft} setWc=${setWc} />
							<${ImageBox} d=${draft} setD=${setD} product=${product} />
							<${GalleryBox} d=${draft} setWc=${setWc} />
						</div>

						<div id="postbox-container-2" class="postbox-container">
							<${ProductDataBox}
								d=${draft}
								setD=${setD}
								setWc=${setWc}
								setMeta=${setMeta}
								product=${product}
								productId=${productId}
								tab=${tab}
								setTab=${setTab}
								attachments=${state.attachments || {}}
							/>
							<${Slot} name="product-edit.after-data" productId=${productId} product=${product} isNew=${isNew} onSave=${() => save()} />
							<${Postbox} id="postexcerpt" title="Product short description">
								<${ClassicEditor} id="excerpt" value=${draft.short} onChange=${(v) => setD({ short: v })} rows=${6} />
							<//>
						</div>
					</div>
					<br class="clear" />
				</div>
			</form>
		</div>
	<//>`;
}
