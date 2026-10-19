// WooCommerce → 3D Models, Settings tab (templates/admin/settings.php + assets/js/admin-settings.js).
import { html, useState, useEffect, useRef, useCallback, cx } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { DEFAULT_SETTINGS } from '../../data/seed.js';
import { PhpIcon, PositionPreview, POSITION_CARDS } from '../../shared/icons.js';
import { ModelsPage, WcToggle } from '../../shared/admin-ui.js';
import { attachmentUrl } from '../../shared/product-3d.js';
import { WpAdmin } from './chrome.js';
import { FeaturesRows, moduleDraft } from './settings-features.js';
import { LightingPresetsRow } from './settings-hdri.js';
import { sanitizeShareSettings } from '../../shared/saved-designs.js';

const STORAGE_KEY = 'wc3d-settings-section';
const SIDEBAR_KEY = 'wc3d-settings-sidebar'; // SettingsPage::SIDEBAR_STORAGE_KEY
const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 360;
const SHORTCODE = '[wc3d_viewer id="PRODUCT_ID"]';

const SECTIONS = [
	['general', 'monitor', 'Display & Placements'],
	['scene', 'sun', 'Scene & Performance'],
	['configurator', 'panel', 'Customer Drawer'],
	['toolbar', 'sliders', 'Viewer Toolbar'],
	['modules', 'puzzle', 'Features'],
	['shortcode', 'code', 'Shortcodes & Help'],
	['data', 'database', 'Data & Uninstall'],
];
const KEYS = SECTIONS.map((s) => s[0]);

const BOOLEANS = ['show_listing_icon', 'show_listing_viewer', 'show_zoom_buttons', 'show_reset_button', 'show_autorotate_button', 'show_download_button', 'show_gallery', 'enable_customizer', 'delete_data_on_uninstall'];

const TOOLBAR_ROWS = [
	['show_zoom_buttons', 'zoom', 'Zoom Controls Buttons', 'Display dedicated (+) and (−) shortcut buttons on the viewer screen to adjust zoom.'],
	['show_reset_button', 'reset', 'Reset Camera View Button', 'Show a refresh-style button that immediately restores the initial camera focal point and distance.'],
	['show_autorotate_button', 'rotate', 'Auto-rotate Controls Button', 'Show a play/pause toggle button that rotates the 3D model automatically around the central axis.'],
	['show_download_button', 'download', 'Download 3D Model Button', 'Show a download button that allows visitors to download the 3D model file directly.'],
	['show_gallery', 'images', 'Gallery of Different Sides', 'Show thumbnail shortcuts at the bottom of the viewer to rotate/frame the camera around different angles.'],
];

// ── Options::sanitize() ──
const HEX = /^#([0-9a-f]{3}){1,2}$/i;
const sanitizeHex = (v) => (HEX.test(String(v || '').trim()) ? String(v).trim() : '');

// Report::clamp_mb(): 1–500, anything unusable is the default 10.
const clampMb = (v) => {
	const n = Math.round(Number(v)) || 0;
	return n > 0 ? Math.min(500, n) : 10;
};

function sanitize(input) {
	const out = { ...DEFAULT_SETTINGS };
	out.position = POSITION_CARDS.some((c) => c.value === input.position) ? input.position : DEFAULT_SETTINGS.position;
	for (const k of BOOLEANS) out[k] = !!input[k];
	out.ar_configured = !!input.ar_configured; // usdz-export
	Object.assign(out, sanitizeShareSettings(input)); // saved-designs
	if (input.coverage_max_model_mb !== undefined) out.coverage_max_model_mb = clampMb(input.coverage_max_model_mb); // coverage
	out.loading_trigger = ['click', 'scroll', 'eager'].includes(input.loading_trigger) ? input.loading_trigger : DEFAULT_SETTINGS.loading_trigger;
	out.background_type = ['transparent', 'color', 'image'].includes(input.background_type) ? input.background_type : DEFAULT_SETTINGS.background_type;
	out.background_color = sanitizeHex(input.background_color) || '#ffffff';
	out.background_image_id = Math.abs(parseInt(input.background_image_id, 10) || 0);
	out.customizer_color_palette = String(input.customizer_color_palette || '')
		.split(',')
		.map((t) => t.trim())
		.filter((t) => t && sanitizeHex(t))
		.join(', ');
	return out;
}

function readSection() {
	try {
		const v = window.sessionStorage.getItem(STORAGE_KEY);
		return KEYS.includes(v) ? v : '';
	} catch {
		return '';
	}
}

function rememberSection(key) {
	try {
		window.sessionStorage.setItem(STORAGE_KEY, key);
	} catch {
		// Storage blocked: the tab just isn't remembered.
	}
}

// ── Section sidebar (admin-settings.js): collapsed state and dragged width, per browser ──

function readSidebar() {
	let saved = null;
	try {
		saved = JSON.parse(window.localStorage.getItem(SIDEBAR_KEY) || 'null');
	} catch {
		saved = null;
	}
	saved = saved && typeof saved === 'object' ? saved : {};
	return { collapsed: saved.collapsed === true, width: typeof saved.width === 'number' ? saved.width : null };
}

function writeSidebar(value) {
	try {
		window.localStorage.setItem(SIDEBAR_KEY, JSON.stringify(value));
	} catch {
		// Storage blocked: the menu just isn't remembered.
	}
}

const clampWidth = (w) => Math.round(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w)));

function SidebarHandle({ sidebar, setSidebar, menuRef }) {
	const drag = useRef(null);
	const [dragging, setDragging] = useState(false);

	useEffect(() => {
		document.body.classList.toggle('wc3d-resizing', dragging);
		return () => document.body.classList.remove('wc3d-resizing');
	}, [dragging]);

	const current = () => sidebar.width || Math.round(menuRef.current?.getBoundingClientRect().width || 240);
	const dir = (el) => (getComputedStyle(el).direction === 'rtl' ? -1 : 1);
	const setWidth = (w, save = true) => setSidebar((s) => ({ ...s, width: w === null ? null : clampWidth(w) }), save);

	const onKey = (e) => {
		const step = e.shiftKey ? 50 : 10;
		const d = dir(e.currentTarget);
		const next = { ArrowRight: current() + step * d, ArrowLeft: current() - step * d, Home: SIDEBAR_MIN, End: SIDEBAR_MAX, Enter: null }[e.key];
		if (next === undefined) return;
		e.preventDefault();
		setWidth(next);
	};

	return html`<div
		class=${cx('wc3d-settings-sidebar__handle', dragging && 'is-dragging')}
		role="separator"
		aria-orientation="vertical"
		aria-controls="wc3d-settings-tabs"
		aria-label="Menu width"
		aria-valuemin=${SIDEBAR_MIN}
		aria-valuemax=${SIDEBAR_MAX}
		aria-valuenow=${sidebar.collapsed ? undefined : current()}
		title="Drag to resize, double-click to reset"
		tabindex="0"
		onPointerDown=${(e) => {
			if (e.button !== 0) return;
			e.preventDefault();
			e.currentTarget.setPointerCapture(e.pointerId);
			drag.current = { x: e.clientX, width: current(), dir: dir(e.currentTarget) };
			setDragging(true);
		}}
		onPointerMove=${(e) => {
			const d = drag.current;
			if (d) setWidth(d.width + (e.clientX - d.x) * d.dir, false);
		}}
		onPointerUp=${() => {
			if (!drag.current) return;
			drag.current = null;
			setDragging(false);
			setSidebar((s) => s, true);
		}}
		onPointerCancel=${() => {
			drag.current = null;
			setDragging(false);
		}}
		onDblClick=${() => setWidth(null)}
		onKeyDown=${onKey}
	>
		<span class="wc3d-settings-sidebar__grip" aria-hidden="true"></span>
	</div>`;
}

// The router remounts on every hash change; a section hash change must keep the unsaved form like the real page.
const SECTION_HASH = /^#admin\.settings\.[a-z]+$/;
let carry = null;
let mounted = null;

function replaceHash(key) {
	try {
		history.replaceState(null, '', '#admin.settings.' + key);
	} catch {
		// Sandboxed frame: keep the current hash.
	}
}

// ── Small pieces ──

function SectionHead({ id, title, desc }) {
	return html`<div class="wc3d-section-head">
		<h2 class="wc3d-section-title" id=${`wc3d-section-${id}-title`}>${title}</h2>
		<p class="wc3d-section-desc">${desc}</p>
	</div>`;
}

function ToggleRow({ k, icon, title, desc, draft, set }) {
	const id = 'wc3d_' + k;
	return html`<div class="wc3d-row">
		<span class="wc3d-row__icon"><${PhpIcon} name=${icon} /></span>
		<div class="wc3d-row__main">
			<label class="wc3d-row__title" for=${id} id=${id + '-title'}>${title}</label>
			<p class="wc3d-row__desc" id=${id + '-desc'}>${desc}</p>
		</div>
		<div class="wc3d-row__control">
			<${WcToggle} id=${id} name=${`wc3d_settings[${k}]`} labelledBy=${id + '-title'} describedBy=${id + '-desc'} checked=${!!draft[k]} onChange=${(v) => set(k, v)} />
		</div>
	</div>`;
}

function Swatches({ value }) {
	const colors = String(value || '')
		.split(',')
		.map((t) => t.trim())
		.filter((t) => /^#[0-9A-F]{3,6}$/i.test(t));
	return html`<div id="wc3d-color-palette-preview" class="wc3d-swatches" aria-hidden="true">
		${colors.map((c, i) => html`<span key=${i} class="wc3d-swatch" style=${{ background: c }} title=${c}></span>`)}
	</div>`;
}

// ── Iris colour picker (wp-color-picker), drawn as the new UI's "Select Color" button ──

function hexToRgb(hex) {
	let h = String(hex || '').replace('#', '');
	if (h.length === 3) h = h.replace(/./g, (c) => c + c);
	if (!/^[0-9a-f]{6}$/i.test(h)) return null;
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function rgbToHsv([r, g, b]) {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const d = max - Math.min(r, g, b);
	let h = 0;
	if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
	return [((h * 60) + 360) % 360, max ? d / max : 0, max];
}

function hsvToHex([h, s, v]) {
	const f = (n) => {
		const k = (n + h / 60) % 6;
		return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
	};
	return '#' + [f(5), f(3), f(1)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const IRIS_PALETTE = ['#000000', '#ffffff', '#dd3333', '#dd9933', '#eeee22', '#81d742', '#1e73be', '#8224e3'];

function drag(e, el, fn) {
	e.preventDefault();
	const move = (ev) => {
		const r = el.getBoundingClientRect();
		fn(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
	};
	move(e);
	const up = () => {
		window.removeEventListener('pointermove', move);
		window.removeEventListener('pointerup', up);
	};
	window.addEventListener('pointermove', move);
	window.addEventListener('pointerup', up);
}

function Iris({ value, onPick }) {
	const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(value) || [255, 255, 255]));
	const last = useRef(value);
	const sq = useRef(null);
	const strip = useRef(null);

	useEffect(() => {
		if (value === last.current) return;
		last.current = value;
		const rgb = hexToRgb(value);
		if (rgb) setHsv(rgbToHsv(rgb));
	}, [value]);

	const pick = (next) => {
		setHsv(next);
		const hex = hsvToHex(next);
		last.current = hex;
		onPick(hex);
	};

	const [h, s, v] = hsv;
	return html`<div class="iris-picker iris-border">
		<div class="iris-picker-inner">
			<div
				class="iris-square"
				ref=${sq}
				style=${{ background: `hsl(${h}, 100%, 50%)` }}
				onPointerDown=${(e) => drag(e, sq.current, (x, y) => pick([h, x, 1 - y]))}
			>
				<span class="iris-square-value" style=${{ left: s * 100 + '%', top: (1 - v) * 100 + '%' }}></span>
			</div>
			<div class="iris-slider iris-strip" ref=${strip} onPointerDown=${(e) => drag(e, strip.current, (x, y) => pick([(1 - y) * 359.9, s, v]))}>
				<span class="iris-slider-handle" style=${{ top: (1 - h / 360) * 100 + '%' }}></span>
			</div>
		</div>
		<div class="iris-palette-container">
			${IRIS_PALETTE.map(
				(c) =>
					html`<button
						type="button"
						key=${c}
						class="iris-palette"
						style=${{ backgroundColor: c }}
						aria-label=${c}
						onClick=${() => pick(rgbToHsv(hexToRgb(c)))}
					></button>`
			)}
		</div>
	</div>`;
}

function ColorPicker({ value, onChange }) {
	const [open, setOpen] = useState(false);
	const box = useRef(null);

	useEffect(() => {
		if (!open) return;
		const away = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
		const esc = (e) => e.key === 'Escape' && setOpen(false);
		document.addEventListener('mousedown', away);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('mousedown', away);
			document.removeEventListener('keydown', esc);
		};
	}, [open]);

	const swatch = sanitizeHex(value);
	return html`<div class=${cx('wp-picker-container', open && 'wp-picker-active')} ref=${box}>
		<button
			type="button"
			class="button wp-color-result"
			aria-expanded=${open ? 'true' : 'false'}
			style=${{ backgroundColor: swatch || 'transparent' }}
			onClick=${() => setOpen(!open)}
		>
			<span class="wp-color-result-text">Select Color</span>
		</button>
		${open &&
		html`<span class="wp-picker-input-wrap">
			<label>
				<span class="screen-reader-text">Background Color</span>
				<input
					type="text"
					id="wc3d_background_color"
					name="wc3d_settings[background_color]"
					class="wc3d-color-picker wc3d-input wc3d-input-mono wp-color-picker"
					value=${value}
					autocomplete="off"
					onInput=${(e) => onChange(e.currentTarget.value)}
				/>
			</label>
			<input type="button" class="button button-small wp-picker-clear" value="Clear" aria-label="Clear color" onClick=${() => onChange('')} />
		</span>`}
		${open && html`<div class="wp-picker-holder"><${Iris} value=${value} onPick=${onChange} /></div>`}
	</div>`;
}

// ── WP media modal stand-in: "Choose a background image" ──

function fileSize(bytes) {
	if (!bytes) return '';
	return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function readImage(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			const scale = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
			const c = document.createElement('canvas');
			c.width = Math.max(1, Math.round(img.naturalWidth * scale));
			c.height = Math.max(1, Math.round(img.naturalHeight * scale));
			c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
			URL.revokeObjectURL(url);
			resolve({ url: c.toDataURL('image/jpeg', 0.85), width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('not an image'));
		};
		img.src = url;
	});
}

function MediaModal({ selectedId, onSelect, onClose }) {
	const attachments = useStore((s) => s.attachments);
	const images = Object.values(attachments || {})
		.filter((a) => a.kind === 'image')
		.sort((a, b) => b.id - a.id);
	const [tab, setTab] = useState('browse');
	const [sel, setSel] = useState(images.some((a) => a.id === selectedId) ? selectedId : 0);
	const [search, setSearch] = useState('');
	const [error, setError] = useState('');
	const fileRef = useRef(null);
	const dialog = useRef(null);

	useEffect(() => {
		const esc = (e) => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', esc);
		dialog.current?.focus();
		return () => document.removeEventListener('keydown', esc);
	}, []);

	const shown = images.filter((a) => !search || (a.title + ' ' + a.filename).toLowerCase().includes(search.toLowerCase()));
	const current = sel ? attachments[sel] : null;

	const upload = async (files) => {
		setError('');
		const file = files?.[0];
		if (!file) return;
		if (!/^image\//.test(file.type)) {
			setError(`“${file.name}” has failed to upload. Sorry, you are not allowed to upload this file type.`);
			return;
		}
		try {
			const img = await readImage(file);
			const id = store.nextId('attachments');
			const title = file.name.replace(/\.[^.]+$/, '');
			store.patch(`attachments.${id}`, { id, kind: 'image', title, filename: file.name, mime: file.type, sizeBytes: file.size, url: img.url, width: img.width, height: img.height });
			setSel(id);
			setTab('browse');
		} catch {
			setError(`“${file.name}” has failed to upload.`);
		}
	};

	return html`<div class="wc3d-media-modal" role="presentation">
		<div class="media-modal-backdrop" onClick=${onClose}></div>
		<div class="media-modal" role="dialog" aria-modal="true" aria-labelledby="media-frame-title" tabindex="-1" ref=${dialog}>
			<button type="button" class="media-modal-close" onClick=${onClose}>
				<span class="media-modal-icon" aria-hidden="true">×</span>
				<span class="screen-reader-text">Close dialog</span>
			</button>
			<div class="media-frame-title" id="media-frame-title"><h1>Choose a background image</h1></div>
			<div class="media-frame-router" role="tablist" aria-orientation="horizontal">
				<button type="button" role="tab" class=${cx('media-menu-item', tab === 'upload' && 'active')} aria-selected=${tab === 'upload'} onClick=${() => setTab('upload')}>Upload files</button>
				<button type="button" role="tab" class=${cx('media-menu-item', tab === 'browse' && 'active')} aria-selected=${tab === 'browse'} onClick=${() => setTab('browse')}>Media Library</button>
			</div>
			<div class="media-frame-content">
				${tab === 'upload'
					? html`<div
							class="uploader-inline"
							onDragOver=${(e) => e.preventDefault()}
							onDrop=${(e) => {
								e.preventDefault();
								upload(e.dataTransfer?.files);
							}}
						>
							<div class="uploader-inline-content">
								<h2 class="upload-instructions">Drop files to upload</h2>
								<p class="upload-or">or</p>
								<button type="button" class="browser button button-hero" onClick=${() => fileRef.current?.click()}>Select Files</button>
								<input type="file" accept="image/*" hidden ref=${fileRef} onChange=${(e) => upload(e.currentTarget.files)} />
								${error && html`<p class="upload-error">${error}</p>`}
								<p class="max-upload-size">Maximum upload file size: 64 MB.</p>
							</div>
						</div>`
					: html`<div class="attachments-browser">
							<div class="media-toolbar">
								<div class="media-toolbar-secondary">
									<label class="screen-reader-text" for="media-attachment-filters">Filter media</label>
									<select id="media-attachment-filters" class="attachment-filters"><option>Images</option></select>
								</div>
								<div class="media-toolbar-primary search-form">
									<label for="media-search-input" class="media-search-input-label">Search media</label>
									<input type="search" id="media-search-input" class="search" value=${search} onInput=${(e) => setSearch(e.currentTarget.value)} />
								</div>
							</div>
							<div class="attachments-wrapper">
								${shown.length
									? html`<ul class="attachments" aria-label="Attachments">
											${shown.map(
												(a) => html`<li key=${a.id} class=${cx('attachment', sel === a.id && 'selected details')}>
													<button
														type="button"
														class="attachment-preview"
														aria-pressed=${sel === a.id}
														aria-label=${a.title}
														onClick=${() => setSel(sel === a.id ? 0 : a.id)}
														onDblClick=${() => onSelect(a)}
													>
														<span class="thumbnail"><img src=${attachmentUrl(a)} alt="" draggable="false" /></span>
													</button>
													${sel === a.id && html`<span class="check" aria-hidden="true">✓</span>`}
												</li>`
											)}
										</ul>`
									: html`<p class="no-media">No media items found.</p>`}
							</div>
							<div class="media-sidebar">
								${current &&
								html`<div class="attachment-details">
									<h2>Attachment details</h2>
									<div class="attachment-info">
										<div class="thumbnail"><img src=${attachmentUrl(current)} alt="" /></div>
										<div class="details">
											<div class="filename"><strong>File name:</strong> ${current.filename}</div>
											<div class="file-type"><strong>File type:</strong> ${current.mime}</div>
											${current.sizeBytes && html`<div class="file-size"><strong>File size:</strong> ${fileSize(current.sizeBytes)}</div>`}
											${current.width && html`<div class="dimensions"><strong>Dimensions:</strong> ${current.width} by ${current.height} pixels</div>`}
										</div>
									</div>
								</div>`}
							</div>
						</div>`}
			</div>
			<div class="media-frame-toolbar">
				<div class="media-toolbar-primary">
					<button type="button" class="button media-button button-primary button-large media-button-select" disabled=${!current} onClick=${() => current && onSelect(current)}>Use image</button>
				</div>
			</div>
		</div>
	</div>`;
}

function BackgroundImage({ id, onChange }) {
	const attachments = useStore((s) => s.attachments);
	const [modal, setModal] = useState(false);
	const att = id ? attachments?.[id] : null;
	const src = att ? attachmentUrl(att) : '';
	return html`<div class="wc3d-media">
		<input type="hidden" id="wc3d_background_image_id" name="wc3d_settings[background_image_id]" value=${String(id || 0)} />
		<span class="wc3d-media__chip wc3d-bg-image-preview">
			<${PhpIcon} name="image" size=${18} />
			${src && html`<img src=${src} alt="" />`}
		</span>
		<span class=${cx('wc3d-media__name wc3d-bg-image-filename', !id && 'is-empty')}>${id ? att?.title || att?.filename || '' : 'No image selected.'}</span>
		<button type="button" class="wc3d-btn wc3d-btn-soft wc3d-pick-bg-image" onClick=${() => setModal(true)}><${PhpIcon} name="upload" size=${17} />Choose image</button>
		<button type="button" class="wc3d-link wc3d-link-muted wc3d-media__remove wc3d-remove-bg-image" disabled=${!id} onClick=${() => onChange(0)}>Remove</button>
		${modal &&
		html`<${MediaModal}
			selectedId=${id}
			onClose=${() => setModal(false)}
			onSelect=${(a) => {
				setModal(false);
				onChange(a.id);
			}}
		/>`}
	</div>`;
}

function ShortcodeCopy() {
	const [copied, setCopied] = useState(false);
	const timer = useRef(0);
	useEffect(() => () => clearTimeout(timer.current), []);

	const fallback = () => {
		const ta = document.createElement('textarea');
		ta.value = SHORTCODE;
		ta.setAttribute('readonly', '');
		ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
		document.body.appendChild(ta);
		ta.select();
		let ok = false;
		try {
			ok = document.execCommand('copy');
		} catch {
			ok = false;
		}
		ta.remove();
		return ok;
	};

	const done = () => {
		setCopied(true);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setCopied(false), 1800);
	};

	const copy = () => {
		if (window.isSecureContext && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(SHORTCODE).then(done, () => fallback() && done());
		} else if (fallback()) {
			done();
		}
	};

	return html`<div class="wc3d-selector-field">
			<code class="wc3d-selector-field__code">${SHORTCODE}</code>
			<button type="button" class=${cx('wc3d-copy-btn', copied && 'is-copied')} data-copy=${SHORTCODE} aria-label="Copy to clipboard" title="Copy to clipboard" onClick=${copy}>
				<span class="wc3d-copy-btn__copy"><${PhpIcon} name="copy" size=${16} /></span>
				<span class="wc3d-copy-btn__done"><${PhpIcon} name="check" size=${16} /></span>
			</button>
		</div>
		<span class="wc3d-copy-status" role="status" aria-live="polite">${copied ? 'Copied!' : ''}</span>`;
}

// ── Screen ──

export default function Settings({ params = [] }) {
	const saved = useStore((s) => s.settings);
	const flags = useStore((s) => s.flags);
	const [kept] = useState(() => {
		const c = mounted && SECTION_HASH.test(location.hash) ? mounted.current : carry;
		carry = null;
		return c;
	});
	const [draft, setDraft] = useState(() => kept?.draft || { ...DEFAULT_SETTINGS, ...saved });
	// wc3d_modules: same form, one Save writes both options.
	const [mods, setMods] = useState(() => kept?.mods || moduleDraft(flags));
	const [status, setStatus] = useState(kept?.status || ''); // '' | 'dirty' | 'saved'
	const live = useRef({ draft, mods, status });
	live.current = { draft, mods, status };
	const [section, setSection] = useState(() => {
		const fromHash = KEYS.includes(params[0]) ? params[0] : '';
		if (fromHash) rememberSection(fromHash);
		return fromHash || readSection() || KEYS[0];
	});
	const [sticky, setSticky] = useState(false);
	const sentinel = useRef(null);
	const tabRefs = useRef({});
	const menuRef = useRef(null);
	const [sidebar, setSidebarState] = useState(readSidebar);
	const setSidebar = useCallback((fn, save = true) => {
		setSidebarState((s) => {
			const next = fn(s);
			if (save) writeSidebar(next);
			return next;
		});
	}, []);

	useEffect(() => {
		mounted = live;
		return () => {
			if (mounted === live) mounted = null;
			carry = SECTION_HASH.test(location.hash) ? live.current : null;
		};
	}, []);

	// Untouched form follows the stored option (e.g. after "Reset demo data").
	useEffect(() => {
		if (status !== 'dirty') setDraft({ ...DEFAULT_SETTINGS, ...saved });
	}, [saved]);

	useEffect(() => {
		if (status !== 'dirty') setMods(moduleDraft(flags));
	}, [flags]);

	useEffect(() => {
		const el = sentinel.current;
		if (!el || typeof IntersectionObserver === 'undefined') return;
		const io = new IntersectionObserver(
			([entry]) => {
				const rootBottom = entry.rootBounds ? entry.rootBounds.bottom : window.innerHeight;
				setSticky(!entry.isIntersecting && entry.boundingClientRect.top >= rootBottom);
			},
			{ rootMargin: '0px 0px -16px 0px' }
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	const set = useCallback((key, value) => {
		setDraft((d) => ({ ...d, [key]: value }));
		setStatus('dirty');
	}, []);

	const setModule = useCallback((id, on) => {
		setMods((m) => ({ ...m, [id]: on }));
		setStatus('dirty');
	}, []);

	const activate = (key, focus = false) => {
		setSection(key);
		rememberSection(key);
		replaceHash(key);
		if (focus) tabRefs.current[key]?.focus();
	};

	const onTabKey = (e, key) => {
		const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
		const i = KEYS.indexOf(key);
		let next = null;
		if (e.key === 'ArrowDown' || e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) next = (i + 1) % KEYS.length;
		else if (e.key === 'ArrowUp' || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) next = (i - 1 + KEYS.length) % KEYS.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = KEYS.length - 1;
		if (next === null) return;
		e.preventDefault();
		activate(KEYS[next], true);
	};

	const submit = (e) => {
		e.preventDefault();
		const clean = sanitize(draft);
		store.patch('settings', { ...(store.get().settings || {}), ...clean });
		// Only rendered (installed) modules are decided; a removed module's stored value is kept.
		store.patch('flags', (f) => ({ ...(f || {}), ...mods }));
		setDraft(clean);
		setStatus('saved');
		// options.php redirects back, so the page reloads at the top.
		window.scrollTo(0, 0);
	};

	const section_ = (key) => ({
		id: 'wc3d-section-' + key,
		class: cx('wc3d-settings-section', section === key && 'is-active'),
		role: 'tabpanel',
		'aria-labelledby': 'wc3d-tab-' + key,
		hidden: section !== key,
	});

	const bg = draft.background_type;

	return html`<${WpAdmin} current="wc3d-models" title="3D Models">
		<${ModelsPage} active="settings">
			<div class="wc3d-settings-wrapper">
				<div
					class=${cx('wc3d-settings-dashboard wc3d-panel is-tabbed', sidebar.collapsed && 'is-sidebar-collapsed')}
					style=${sidebar.width ? { '--wc3d-settings-sidebar-w': sidebar.width + 'px' } : undefined}
				>
					<div class="wc3d-settings-sidebar" ref=${menuRef}>
						<button
							type="button"
							class="wc3d-settings-sidebar__toggle"
							aria-expanded=${sidebar.collapsed ? 'false' : 'true'}
							aria-controls="wc3d-settings-tabs"
							title=${sidebar.collapsed ? 'Expand menu' : undefined}
							onClick=${() => setSidebar((s) => ({ ...s, collapsed: !s.collapsed }))}
						>
							<span class="wc3d-settings-sidebar__toggle-icon wc3d-settings-sidebar__toggle-icon--collapse"><${PhpIcon} name="panel-close" size=${17} /></span>
							<span class="wc3d-settings-sidebar__toggle-icon wc3d-settings-sidebar__toggle-icon--expand"><${PhpIcon} name="panel-open" size=${17} /></span>
							<span class="wc3d-settings-sidebar__toggle-text">${sidebar.collapsed ? 'Expand menu' : 'Collapse menu'}</span>
						</button>
						<nav id="wc3d-settings-tabs" class="wc3d-tabs wc3d-settings-tabs" aria-label="Settings" role="tablist">
							${SECTIONS.map(
								([key, icon, label]) => html`<a
									key=${key}
									href=${'#admin.settings.' + key}
									id=${'wc3d-tab-' + key}
									class=${cx('wc3d-tab', section === key && 'is-active')}
									data-section=${key}
									role="tab"
									aria-controls=${'wc3d-section-' + key}
									aria-selected=${section === key ? 'true' : 'false'}
									tabindex=${section === key ? 0 : -1}
									title=${sidebar.collapsed ? label : undefined}
									ref=${(el) => (tabRefs.current[key] = el)}
									onClick=${(e) => {
										e.preventDefault();
										activate(key);
									}}
									onKeyDown=${(e) => onTabKey(e, key)}
								>
									<${PhpIcon} name=${icon} size=${17} />
									<span>${label}</span>
								</a>`
							)}
						</nav>
						<${SidebarHandle} sidebar=${sidebar} setSidebar=${setSidebar} menuRef=${menuRef} />
					</div>

					<form method="post" class="wc3d-dashboard-content" onSubmit=${submit} novalidate>
						<section ...${section_('general')}>
							<${SectionHead}
								id="general"
								title="Display & Placements"
								desc="Configure where and how the 3D player integrates into WooCommerce product pages and shop grids."
							/>
							<div class="wc3d-rows">
								<div class="wc3d-row wc3d-row--wide">
									<span class="wc3d-row__icon"><${PhpIcon} name="layout" /></span>
									<div class="wc3d-row__main">
										<span class="wc3d-row__title" id="wc3d_position-title">3D Viewer Position</span>
									</div>
									<div class="wc3d-row__control">
										<div class="wc3d-mode-grid" role="radiogroup" aria-labelledby="wc3d_position-title">
											${POSITION_CARDS.map(
												(c) => html`<label class="wc3d-mode-card" key=${c.value}>
													<input
														type="radio"
														class="wc3d-mode-card__input"
														name="wc3d_settings[position]"
														value=${c.value}
														checked=${draft.position === c.value}
														onChange=${() => set('position', c.value)}
													/>
													<span class="wc3d-layout-preview"><${PositionPreview} position=${c.value} /></span>
													<span class="wc3d-mode-card__foot">
														<span class="wc3d-mode-card__text">
															<span class="wc3d-mode-card__name">${c.label}</span>
															${c.desc && html`<span class="wc3d-mode-card__desc">${c.desc}</span>`}
														</span>
														<span class="wc3d-mode-card__radio" aria-hidden="true"></span>
													</span>
												</label>`
											)}
										</div>
									</div>
								</div>
								<${ToggleRow}
									k="show_listing_icon"
									icon="tag"
									title="Shop Listing 3D Badge"
									desc="Displays a subtle 3D badge overlay on product cards on shop and archive listings if a model is enabled."
									draft=${draft}
									set=${set}
								/>
								<${ToggleRow}
									k="show_listing_viewer"
									icon="eye"
									title="Shop Listing Quick View"
									desc=${'Show a "View in 3D" action button on shop/category loops that opens the model inside a quick-view modal popup. Products with "Show on shop page" switched on keep their button when this is off.'}
									draft=${draft}
									set=${set}
								/>
							</div>
						</section>

						<section ...${section_('scene')}>
							<${SectionHead}
								id="scene"
								title="Default Scene Styling & Performance"
								desc="Configure the default scene backgrounds and load triggers. Individual products can override these settings."
							/>
							<div class="wc3d-rows">
								<div class="wc3d-row">
									<span class="wc3d-row__icon"><${PhpIcon} name="layers" /></span>
									<div class="wc3d-row__main">
										<label class="wc3d-row__title" for="wc3d_background_type">Background Style</label>
										<p class="wc3d-row__desc" id="wc3d_background_type-desc">Select whether to use a transparent backdrop, a custom hex color, or an image background asset.</p>
									</div>
									<div class="wc3d-row__control">
										<select
											id="wc3d_background_type"
											class="wc3d-select"
											name="wc3d_settings[background_type]"
											aria-describedby="wc3d_background_type-desc"
											value=${bg}
											onChange=${(e) => set('background_type', e.currentTarget.value)}
										>
											<option value="transparent">Transparent</option>
											<option value="color">Solid Color</option>
											<option value="image">Custom Image</option>
										</select>
									</div>
								</div>

								<div class="wc3d-row wc3d-bg-color-row" hidden=${bg !== 'color'}>
									<span class="wc3d-row__icon"><${PhpIcon} name="droplet" /></span>
									<div class="wc3d-row__main">
										<label class="wc3d-row__title" for="wc3d_background_color">Background Color</label>
									</div>
									<div class="wc3d-row__control">
										<${ColorPicker} value=${draft.background_color} onChange=${(v) => set('background_color', v)} />
									</div>
								</div>

								<div class="wc3d-row wc3d-bg-image-row" hidden=${bg !== 'image'}>
									<span class="wc3d-row__icon"><${PhpIcon} name="image" /></span>
									<div class="wc3d-row__main">
										<span class="wc3d-row__title">Background Image</span>
									</div>
									<div class="wc3d-row__control">
										<${BackgroundImage} id=${Number(draft.background_image_id) || 0} onChange=${(v) => set('background_image_id', v)} />
									</div>
								</div>

								<div class="wc3d-row">
									<span class="wc3d-row__icon"><${PhpIcon} name="zap" /></span>
									<div class="wc3d-row__main">
										<label class="wc3d-row__title" for="wc3d_loading_trigger">3D Loading Behavior</label>
										<p class="wc3d-row__desc" id="wc3d_loading_trigger-desc">
											Determine when the heavy 3D model engine and graphics assets are loaded. Eager load triggers immediately; Click/Scroll display a lightweight poster image first.
										</p>
									</div>
									<div class="wc3d-row__control">
										<select
											id="wc3d_loading_trigger"
											class="wc3d-select"
											name="wc3d_settings[loading_trigger]"
											aria-describedby="wc3d_loading_trigger-desc"
											value=${draft.loading_trigger}
											onChange=${(e) => set('loading_trigger', e.currentTarget.value)}
										>
											<option value="click">Click to Interact (Best Performance)</option>
											<option value="scroll">Auto-load when visible (Good Performance)</option>
											<option value="eager">Load immediately on page load (Legacy)</option>
										</select>
									</div>
								</div>
								<${LightingPresetsRow} />
							</div>
						</section>

						<section ...${section_('configurator')}>
							<${SectionHead}
								id="configurator"
								title="Customer Customization Drawer"
								desc="Manage settings for shopper customization (hotspot colors, optional parts toggles, and cart integrations)."
							/>
							<div class="wc3d-rows">
								<${ToggleRow}
									k="enable_customizer"
									icon="panel"
									title="Enable Configurator Side Panel"
									desc="Enables the interactive slide-out product customizer panel on the frontend single product pages. Shoppers only see it on products where at least one part is marked “Customizable on Frontend” or “Toggleable on Frontend” in the 3D editor."
									draft=${draft}
									set=${set}
								/>
								<div class="wc3d-row wc3d-row--wide">
									<span class="wc3d-row__icon"><${PhpIcon} name="palette" /></span>
									<div class="wc3d-row__main">
										<label class="wc3d-row__title" for="wc3d_customizer_color_palette">Quick Color Selection Palette</label>
										<p class="wc3d-row__desc" id="wc3d_customizer_color_palette-desc">
											A comma-separated list of quick-pick hex colors offered inside the shopper drawer (e.g. #ffffff, #000000, #ff0000).
										</p>
									</div>
									<div class="wc3d-row__control wc3d-palette">
										<input
											type="text"
											id="wc3d_customizer_color_palette"
											class="wc3d-input wc3d-input-mono"
											name="wc3d_settings[customizer_color_palette]"
											value=${draft.customizer_color_palette}
											aria-describedby="wc3d_customizer_color_palette-desc"
											spellcheck="false"
											autocomplete="off"
											onInput=${(e) => set('customizer_color_palette', e.currentTarget.value)}
										/>
										<${Swatches} value=${draft.customizer_color_palette} />
									</div>
								</div>
							</div>
						</section>

						<section ...${section_('toolbar')}>
							<${SectionHead}
								id="toolbar"
								title="Viewer Toolbar & Shortcuts"
								desc="Enable extra interactive buttons and discoverable navigation controls inside the 3D player canvas."
							/>
							<div class="wc3d-rows">
								${TOOLBAR_ROWS.map(([k, icon, title, desc]) => html`<${ToggleRow} key=${k} k=${k} icon=${icon} title=${title} desc=${desc} draft=${draft} set=${set} />`)}
							</div>
						</section>

						<section ...${section_('modules')}>
							<${SectionHead}
								id="modules"
								title="Features"
								desc="Turn optional feature modules on or off. Turning one off keeps its saved settings, so turning it back on picks up where you left off."
							/>
							<${FeaturesRows} mods=${mods} flags=${flags} set=${setModule} draft=${draft} setSetting=${set} drawerOn=${!!saved?.enable_customizer} />
						</section>

						<section ...${section_('shortcode')}>
							<${SectionHead}
								id="shortcode"
								title="Shortcode & Developer Integrations"
								desc="Learn how to render interactive models custom-tailored on pages, posts, or page-builders."
							/>
							<div class="wc3d-rows">
								<div class="wc3d-row">
									<span class="wc3d-row__icon"><${PhpIcon} name="code" /></span>
									<div class="wc3d-row__main">
										<span class="wc3d-row__title">Standard Shortcode</span>
										<p class="wc3d-row__desc">Replace PRODUCT_ID with the WooCommerce product ID. Example: <code class="wc3d-code">[wc3d_viewer id="42"]</code></p>
									</div>
									<div class="wc3d-row__control"><${ShortcodeCopy} /></div>
								</div>
								<div class="wc3d-row">
									<span class="wc3d-row__icon"><${PhpIcon} name="hash" /></span>
									<div class="wc3d-row__main">
										<span class="wc3d-row__title">Retrieve Product ID</span>
										<p class="wc3d-row__desc">
											Open the product in the WooCommerce dashboard. The ID is displayed in the page URL (e.g. post.php?post=42) or prefilled inside the product's dedicated 3D Model edit panel.
										</p>
									</div>
								</div>
								<div class="wc3d-row">
									<span class="wc3d-row__icon"><${PhpIcon} name="info" /></span>
									<div class="wc3d-row__main">
										<span class="wc3d-row__title">Requirements</span>
										<p class="wc3d-row__desc">
											${'The shortcode outputs nothing if the product does not have a 3D model enqueued or if the "Enable 3D Model" slider is disabled.'}
										</p>
									</div>
								</div>
							</div>
						</section>

						<section ...${section_('data')}>
							<${SectionHead} id="data" title="Data & Uninstall" desc="Choose what happens to your 3D configurator data when the plugin is deleted." />
							<div class="wc3d-danger-card">
								<span class="wc3d-danger-card__icon"><${PhpIcon} name="trash" size=${20} /></span>
								<div class="wc3d-row__main">
									<label class="wc3d-row__title" for="wc3d_delete_data_on_uninstall" id="wc3d_delete_data_on_uninstall-title">
										Delete all 3D configurator data when the plugin is uninstalled
									</label>
									<p class="wc3d-row__desc" id="wc3d_delete_data_on_uninstall-desc">
										When enabled, deleting the plugin permanently removes its settings, per-product 3D settings, editor configurations, presets and cached model data. Leave this off to keep your data for a later reinstall.
									</p>
								</div>
								<div class="wc3d-row__control">
									<${WcToggle}
										danger
										id="wc3d_delete_data_on_uninstall"
										name="wc3d_settings[delete_data_on_uninstall]"
										labelledBy="wc3d_delete_data_on_uninstall-title"
										describedBy="wc3d_delete_data_on_uninstall-desc"
										checked=${!!draft.delete_data_on_uninstall}
										onChange=${(v) => set('delete_data_on_uninstall', v)}
									/>
								</div>
							</div>
						</section>

						<div class=${cx('submit-wrapper wc3d-actions', sticky && 'is-sticky')}>
							<p class=${cx('wc3d-actions__status', status === 'dirty' && 'is-dirty', status === 'saved' && 'is-saved')} role="status" aria-live="polite">
								${status === 'dirty' ? 'Unsaved changes' : status === 'saved' ? 'All changes saved' : ''}
							</p>
							<button type="submit" name="submit" id="submit" class="wc3d-btn wc3d-btn-save">
								<${PhpIcon} name="save" size=${17} />
								<span>Save changes</span>
							</button>
						</div>
						<div id="wc3d-submit-sentinel" aria-hidden="true" ref=${sentinel}></div>
					</form>
				</div>
			</div>
		<//>
	<//>`;
}
