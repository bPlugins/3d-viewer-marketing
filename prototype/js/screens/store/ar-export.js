// usdz-export storefront: AR button flow (build from the live scene, cache, fall back) and the
// prototype sheets that show what Quick Look / Scene Viewer / the QR link would get.
import { html, useState, useEffect, useRef, cx } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { viewerSettingsFor } from '../../shared/product-3d.js';
import { productImageUrl } from '../../shared/product-image.js';
import { optionLines, basePriceOf } from '../../shared/options.js';
import { Icon } from '../../shared/icons.js';
import { useArDevice, setArDevice } from '../../shared/ar-device.js';
import {
	arBuildAllowed, arDesign, arLook, buildArFile, arCacheKey, cachedArFile, storeArFile, hashBytes, arLink, arFileName, formatBytes, formatSeconds, AR_LINK_MAX,
} from '../../shared/ar-export.js';
import { Portal, useModalDialog, qrSvgUrl } from './viewer-ui.js';
import { protoLabel } from '../../shared/slots.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const MIN_BUSY_MS = 450; // keep "Preparing AR…" readable even when the export is quick
const basename = (u) => String(u || '').substring(String(u || '').lastIndexOf('/') + 1);

/**
 * Hook for the mounted viewer. Returns null with the flag off (the viewer keeps today's AR).
 * → { device, visible, busy, open(), ui }
 */
export function useArExport({ productId, variationId, config, custom, layer, ctl, attachment, modelKey, order = false, choices = null, buttonRef }) {
	const device = useArDevice();
	const allowed = useStore((s) => arBuildAllowed(s, config));
	const [busy, setBusy] = useState(null);
	const [sheet, setSheet] = useState(null);
	const [toast, setToast] = useState('');
	const live = useRef(true);
	useEffect(() => () => void (live.current = false), []);
	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(''), 6000);
		return () => clearTimeout(t);
	}, [toast]);
	if (!device) return null;

	const ar = config?.ar || {};
	const shopper = order ? choices : custom;
	const design = arDesign(order ? choices : layer, shopper);
	const visible = ar.enabled === true && (device !== 'ios' || !!ar.usdzUrl || allowed);

	const run = async (dev = device) => {
		if (busy) return;
		setToast('');
		const state = store.get();
		const look = arLook(state, productId, variationId, design);
		const base = { kind: dev, look, design, shopper, lockScale: ar.scale === 'fixed' };
		if (dev === 'desktop') return setSheet(base);

		const format = dev === 'ios' ? 'usdz' : 'glb';
		const usdzAtt = ar.usdzId ? state.attachments?.[ar.usdzId] : null;
		const uploaded =
			format === 'usdz'
				? ar.usdzUrl ? { name: usdzAtt?.filename || basename(ar.usdzUrl), size: usdzAtt?.sizeBytes || 0 } : null
				: attachment ? { name: attachment.filename, size: attachment.sizeBytes || 0 } : null;
		const noUsdz = format === 'usdz' && !ar.usdzUrl;
		const build = allowed && (look.configured || noUsdz);
		const sheetBase = { ...base, format, noUsdz };
		if (!build) return uploaded && setSheet({ ...sheetBase, source: 'uploaded', uploaded });

		const fail = !!state.demo?.arFail;
		const key = arCacheKey({ productId, variationId, format, modelKey, config, design });
		const hit = fail ? null : cachedArFile(key);
		if (hit && (format === 'usdz' || hit.uploadedUrl)) return setSheet({ ...sheetBase, source: 'generated', entry: hit, cached: true });

		setBusy('Preparing AR…');
		const t0 = performance.now();
		try {
			const entry = hit || storeArFile(key, { ...(await buildArFile(ctl.current, format, { fail })), format, name: arFileName(attachment, format, look.configured) });
			if (format === 'glb' && !entry.uploadedUrl) {
				if (live.current) setBusy('Uploading for Scene Viewer…');
				const hash = await hashBytes(entry.bytes);
				await wait(400);
				entry.uploadedUrl = `/wp-content/uploads/wc3d/ar/${hash.slice(0, 16)}.glb`;
			}
			await wait(Math.max(0, MIN_BUSY_MS - (performance.now() - t0)));
			if (live.current) setSheet({ ...sheetBase, source: 'generated', entry, cached: false });
		} catch (err) {
			if (!live.current) return;
			const reason = err?.message || 'The AR file could not be built.';
			if (uploaded) setSheet({ ...sheetBase, source: 'uploaded', uploaded, error: reason });
			else setToast(`AR isn't available for this design right now. ${reason}`);
		} finally {
			if (live.current) setBusy(null);
		}
	};

	const openAs = (dev) => {
		setArDevice(dev);
		setSheet(null);
		setTimeout(() => run(dev), 0);
	};

	const ui = html`
		${toast && html`<div class="wc3d-arx-toast" role="status">${toast}</div>`}
		${sheet &&
		(sheet.kind === 'desktop'
			? html`<${ArQrDesignModal} sheet=${sheet} productId=${productId} variationId=${variationId} config=${config} onOpenAs=${openAs} onClose=${() => setSheet(null)} returnFocusRef=${buttonRef} />`
			: html`<${ArDeviceSheet} sheet=${sheet} productId=${productId} variationId=${variationId} config=${config} onClose=${() => setSheet(null)} returnFocusRef=${buttonRef} />`)}
	`;

	return { device, visible, busy, open: () => run(), ui };
}

/** The AR button with the busy state (same markup as ArButton.tsx otherwise). */
export function ArExportButton({ arx, buttonRef }) {
	return html`<button
		ref=${buttonRef}
		type="button"
		onClick=${arx.open}
		disabled=${!!arx.busy}
		aria-busy=${arx.busy ? 'true' : undefined}
		class=${cx('wc3d-overlay-btn wc3d-ar-btn', arx.busy && 'wc3d-arx-busy')}
	>
		${arx.busy ? html`<span class="wc3d-arx-spinner" aria-hidden="true"></span>` : html`<${Icon} name="sf-ar" />`}<span>${arx.busy || 'View in AR'}</span>
	</button>`;
}

// ── Design rows (variation + option lines) ─────────────────────────────────

function designRows(state, productId, variationId, config, shopper) {
	const rows = [];
	const v = variationId ? state.variations?.[variationId] : null;
	if (v) for (const [name, value] of Object.entries(v.attributes || {})) rows.push({ key: 'attr-' + name, label: name, value });
	const palette = viewerSettingsFor(state, productId).colorPalette;
	try {
		for (const l of optionLines(config, shopper, basePriceOf(state, productId, variationId), { palette })) rows.push({ key: l.key || l.label, label: l.label, value: l.value, swatch: l.swatch });
	} catch {
		// Malformed shopper data: show the variation only.
	}
	return rows;
}

function DesignList({ rows }) {
	if (!rows.length) return html`<span class="wc3d-arx-muted">As shown on the product page</span>`;
	return html`<ul class="wc3d-arx-design">
		${rows.map(
			(r) => html`<li key=${r.key}>
				${r.swatch && html`<span class="wc3d-arx-dot" style=${{ background: r.swatch }} aria-hidden="true"></span>`}
				<span class="wc3d-arx-design__label">${r.label}:</span> ${r.value}
			</li>`
		)}
	</ul>`;
}

const ProtoTag = ({ children, actions }) =>
	html`<div class="proto-cart-hint wc3d-arx-proto"><span class="proto-cart-hint__tag">${protoLabel()}</span><span>${children}</span>${actions && html`<span class="wc3d-arx-openas">${actions}</span>`}</div>`;

// ── iPhone / Android sheet ─────────────────────────────────────────────────

function ArDeviceSheet({ sheet, productId, variationId, config, onClose, returnFocusRef }) {
	const state = useStore();
	const dlg = useModalDialog(onClose, returnFocusRef);
	const ios = sheet.kind === 'ios';
	const generated = sheet.source === 'generated';
	const e = sheet.entry;
	const title = ios ? 'AR Quick Look' : 'Scene Viewer';
	const fileUrl = generated ? (ios ? e.blobUrl : `${location.origin}${e.uploadedUrl}`) : '';
	const intent = !ios && generated
		? `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(fileUrl)}&mode=ar_preferred${sheet.lockScale ? '&resizable=false' : ''}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=…;end;`
		: '';
	const source = generated
		? sheet.look.configured
			? 'Generated on this device from the configured scene'
			: 'Generated on this device from the model (no USDZ uploaded)'
		: ios ? 'Uploaded USDZ' : 'Uploaded GLB';
	const rows = designRows(state, productId, variationId, config, sheet.shopper);

	return html`<${Portal}>
		<div class="wc3d-ar-modal wc3d-arx" onKeyDown=${dlg.onKeyDown}>
			<div class="wc3d-ar-modal__backdrop" role="presentation" onClick=${onClose}></div>
			<div ref=${dlg.ref} class="wc3d-ar-modal__panel wc3d-arx-sheet" role="dialog" aria-modal="true" aria-labelledby="wc3d-arx-title" tabindex="-1">
				<button type="button" onClick=${onClose} class="wc3d-ar-modal__close" aria-label="Close">×</button>
				<${ProtoTag}>What ${ios ? 'an iPhone' : 'an Android phone'} does next. The real button opens ${title} instead of this sheet.<//>
				<h4 id="wc3d-arx-title">${title}</h4>
				${generated ? html`<${ArFilePreview} entry=${e} />` : html`<${UploadedPreview} productId=${productId} name=${sheet.uploaded.name} />`}
				${sheet.error && html`<p class="wc3d-arx-error" role="alert">Couldn't build the AR file: ${sheet.error} Showing the standard model instead.</p>`}
				<dl class="wc3d-arx-rows">
					<div><dt>File</dt><dd class="wc3d-arx-mono">${generated ? e.name : sheet.uploaded.name}</dd></div>
					<div><dt>Size</dt><dd>${generated ? formatBytes(e.size) : sheet.uploaded.size ? formatBytes(sheet.uploaded.size) : '—'}</dd></div>
					${generated && html`<div><dt>Built in</dt><dd>${sheet.cached ? 'Cached, instant' : formatSeconds(e.ms)}</dd></div>`}
					<div><dt>Source</dt><dd>${source}</dd></div>
					${!generated && !sheet.error && html`<div><dt>Why</dt><dd>${!arBuildAllowed(state, config) ? 'Building the AR file is turned off for this product.' : 'Nothing is changed from the uploaded model.'}</dd></div>`}
					${generated && rows.length > 0 && html`<div><dt>Design</dt><dd><${DesignList} rows=${rows} /></dd></div>`}
					${sheet.error && rows.length > 0 && html`<div><dt>Not shown</dt><dd><${DesignList} rows=${rows} /></dd></div>`}
					<div><dt>Scale</dt><dd>${sheet.lockScale ? 'Locked to real-world size' : 'Shoppers can resize it'}</dd></div>
					${!ios && generated && html`<div><dt>Uploaded to</dt><dd class="wc3d-arx-mono">${e.uploadedUrl}</dd></div>`}
				</dl>
				${e?.warnings?.length > 0 && html`<p class="wc3d-arx-warn">${e.warnings.join(' ')}</p>`}
				${intent && html`<details class="wc3d-arx-intent"><summary>Intent URL</summary><code>${intent}</code></details>`}
				<p class="wc3d-arx-note">
					${ios
						? generated
							? 'On an iPhone, Quick Look opens now and places this model in the room. The file is built in the browser; nothing is uploaded.'
							: 'On an iPhone, Quick Look opens now with the uploaded USDZ file.'
						: generated
							? 'On Android, Scene Viewer opens now with this file.'
							: 'On Android, Scene Viewer opens now with the uploaded GLB file.'}
				</p>
				<button type="button" class="wc3d-arx-done" onClick=${onClose}>Done</button>
			</div>
		</div>
	<//>`;
}

function UploadedPreview({ productId, name }) {
	const state = useStore();
	const [url, setUrl] = useState('');
	useEffect(() => {
		let on = true;
		productImageUrl(state, state.products?.[productId], 0, 400).then((u) => on && setUrl(u), () => {});
		return () => (on = false);
	}, [productId]);
	return html`<div class="wc3d-arx-preview wc3d-arx-preview--still">
		${url && html`<img src=${url} alt=${`Uploaded model ${name}`} />`}
		<span class="wc3d-arx-preview__cap">Uploaded model, as first set up</span>
	</div>`;
}

/** Loads the generated bytes back (USDZLoader / GLTFLoader) so the preview is the file itself. */
function ArFilePreview({ entry }) {
	const ref = useRef(null);
	const [status, setStatus] = useState('loading');
	useEffect(() => {
		let disposed = false;
		let raf = 0;
		let renderer, controls, pmrem, root;
		(async () => {
			const THREE = await import('three');
			const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
			const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
			const bytes = entry.bytes;
			const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
			if (entry.format === 'usdz') {
				const { USDZLoader } = await import('three/addons/loaders/USDZLoader.js');
				root = new USDZLoader().parse(buf);
			} else {
				const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
				root = (await new GLTFLoader().parseAsync(buf, '')).scene;
			}
			const canvas = ref.current;
			if (disposed || !canvas) return;
			const w = canvas.clientWidth || 300;
			const h = canvas.clientHeight || 200;
			renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
			renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
			renderer.setSize(w, h, false);
			renderer.toneMapping = THREE.ACESFilmicToneMapping;
			const scene = new THREE.Scene();
			pmrem = new THREE.PMREMGenerator(renderer);
			scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
			scene.add(root);
			const sphere = new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());
			const r = sphere.radius || 1;
			const camera = new THREE.PerspectiveCamera(35, w / h, r / 100, r * 100);
			camera.position.copy(sphere.center).add(new THREE.Vector3(0.9, 0.55, 1.3).normalize().multiplyScalar((r / Math.sin((35 * Math.PI) / 360)) * 1.02));
			controls = new OrbitControls(camera, canvas);
			controls.target.copy(sphere.center);
			controls.enablePan = false;
			controls.enableDamping = true;
			controls.autoRotate = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
			controls.autoRotateSpeed = 1.6;
			const tick = () => {
				controls.update();
				renderer.render(scene, camera);
				raf = requestAnimationFrame(tick);
			};
			tick();
			setStatus('ready');
		})().catch((err) => {
			console.warn('[wc3d prototype] AR preview failed:', err);
			if (!disposed) setStatus('failed');
		});
		return () => {
			disposed = true;
			cancelAnimationFrame(raf);
			controls?.dispose();
			pmrem?.dispose();
			root?.traverse?.((o) => {
				if (!o.isMesh) return;
				o.geometry?.dispose();
				(Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
					if (!m) return;
					for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) m[k]?.dispose?.();
					m.dispose();
				});
			});
			renderer?.dispose();
			renderer?.forceContextLoss?.();
		};
	}, [entry]);
	return html`<div class="wc3d-arx-preview">
		<canvas ref=${ref} aria-label="Preview of the generated AR file" role="img"></canvas>
		${status === 'loading' && html`<span class="wc3d-arx-preview__cap">Loading the file…</span>`}
		${status === 'failed' && html`<span class="wc3d-arx-preview__cap">This browser can't preview the file.</span>`}
		${status === 'ready' && html`<span class="wc3d-arx-preview__cap">The generated file, drag to turn</span>`}
	</div>`;
}

// ── Desktop QR modal with the design in the link ───────────────────────────

function ArQrDesignModal({ sheet, productId, variationId, config, onOpenAs, onClose, returnFocusRef }) {
	const state = useStore();
	const dlg = useModalDialog(onClose, returnFocusRef);
	// Only the shopper's own picks travel; group defaults and the variation look rebuild on the phone.
	const full = arLink(state, productId, variationId, sheet.look.configured ? sheet.shopper : null);
	const tooLong = full.length > AR_LINK_MAX;
	const link = tooLong ? arLink(state, productId, variationId, null) : full;
	const [src, setSrc] = useState('');
	const [copied, setCopied] = useState(false);
	const urlRef = useRef(null);
	useEffect(() => {
		const t = setTimeout(() => setSrc(qrSvgUrl(link)), 120);
		return () => clearTimeout(t);
	}, [link]);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(link);
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		} catch {
			// Clipboard blocked: select the link so the shopper can copy it.
			urlRef.current?.focus();
			urlRef.current?.select();
		}
	};
	const rows = sheet.look.configured ? designRows(state, productId, variationId, config, sheet.shopper) : [];
	return html`<${Portal}>
		<div class="wc3d-ar-modal wc3d-arx" onKeyDown=${dlg.onKeyDown}>
			<div class="wc3d-ar-modal__backdrop" role="presentation" onClick=${onClose}></div>
			<div ref=${dlg.ref} class="wc3d-ar-modal__panel wc3d-arx-qr" role="dialog" aria-modal="true" aria-labelledby="wc3d-ar-title" tabindex="-1">
				<button type="button" onClick=${onClose} class="wc3d-ar-modal__close" aria-label="Close">×</button>
				<h4 id="wc3d-ar-title">Scan to view in AR</h4>
				<p>Point your phone's camera at this QR code to view the model in your space.</p>
				${src ? html`<img src=${src} alt="QR Code to view in AR" class="wc3d-ar-modal__qrcode" width="180" height="180" />` : html`<div class="wc3d-ar-modal__qrcode" aria-hidden="true"></div>`}
				${sheet.look.configured &&
				html`<div class="wc3d-arx-link">
					<p class="wc3d-arx-link__lead">${tooLong ? 'Your design is too large for a link. This link opens the product without it:' : 'This link opens your design:'}</p>
					<${DesignList} rows=${rows} />
					<div class="wc3d-arx-link__row">
						<input ref=${urlRef} class="wc3d-arx-link__url" readonly value=${link} aria-label="Link to your design" onFocus=${(e) => e.currentTarget.select()} />
						<button type="button" class="wc3d-arx-link__copy" onClick=${copy}>${copied ? 'Copied' : 'Copy link'}</button>
					</div>
				</div>`}
				<${ProtoTag}
					actions=${html`<button type="button" onClick=${() => onOpenAs('ios')}>Open as iPhone</button>
						<button type="button" onClick=${() => onOpenAs('android')}>Open as Android</button>`}
				>
					See what the phone does with this link.
				<//>
			</div>
		</div>
	<//>`;
}
