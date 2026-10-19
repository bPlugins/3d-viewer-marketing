// Storefront viewer: viewer root (poster + lazy trigger), the mounted Viewer (loading overlay,
// controls stack, fullscreen, gallery strip, hotspots, customizer drawer, AR), the product/listing
// modal shell and the AR QR modal. Markup and copy follow src/frontend/** and frontend-static.css.
import { html, render as preactRender, useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, cx, money } from '../../core/ui.js';
import { store, useStore } from '../../core/store.js';
import { Viewer3D } from '../../engine/Viewer3D.js';
import { effectiveFor, modelFor, viewerSettingsFor, attachmentUrl } from '../../shared/product-3d.js';
import { getMaterialConfig, applyShopperChoices } from '../../shared/effective-config.js';
import { productImageUrl } from '../../shared/product-image.js';
import { Icon } from '../../shared/icons.js';
import { overrideSettings, useBlockConfig } from '../../shared/block.js';
import { useFeature } from '../../core/features.js';
import {
	basePriceOf, quoteFor, colorPrice, colorRegular, togglePrice, formatDelta, pricingOf, ruleAmount, ruleRegular,
	hasOptionRules, usesGroups, groupsOf, selectedChoices, inactiveGroups, shopperLayer, isEmptyCustom, choiceBallUrl, optionFlags,
	withAttributes, attributesFor,
} from '../../shared/options.js';
import { useConditionView } from './conditional-logic.js';
import { addToCart, captureLine, addedToCartNotice, choiceErrors, pushNotice } from './theme.js';
import { go } from '../../core/router.js';
import { useDrawerHistory, DrawerHistoryButtons } from './drawer-history.js';
import { useArExport, ArExportButton } from './ar-export.js';
import { ShareDesignButton } from './saved-designs.js';
import { DecalSections, useDecalDrag, withDecalLayer } from './decals.js';
import { usesDecals } from '../../shared/decals.js';
import { CustomizerModal, ModalPanel, useMovableHost } from './customizer-modal.js';
import { useGalleryLane } from './gallery-lane.js';
import { protoLabel } from '../../shared/slots.js';

const LOAD_DELAY = 1100; // demo "download" time so the progress overlay is visible
const CHUNK_DELAY = 450; // lazy chunk fetch between the click and the first React render
const PRESET_KEYS = ['perspective', 'front', 'side', 'back'];
const PRESET_TITLES = ['Perspective view', 'Front view', 'Side view', 'Back view'];

const ucwords = (s) => String(s).replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const isEmpty = isEmptyCustom;
const lc = (s) => String(s ?? '').trim().toLowerCase();
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** ar.ts detectArDevice(). */
export function detectArDevice() {
	const ua = navigator.userAgent || '';
	if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
	if (/android/i.test(ua)) return 'android';
	return 'desktop';
}

function fullscreenSupported() {
	const el = document.documentElement;
	return (typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function') && (document.fullscreenEnabled === true || document.webkitFullscreenEnabled === true);
}

/** customizer-modal: leave browser fullscreen before the viewer moves into the modal. */
export function exitFullscreen() {
	try {
		if (document.fullscreenElement || document.webkitFullscreenElement) Promise.resolve(document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen?.()).catch(() => {});
	} catch {
		// Not in fullscreen or blocked: nothing to leave.
	}
}

function toggleFullscreen(target) {
	try {
		let r;
		if (document.fullscreenElement || document.webkitFullscreenElement) r = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen?.();
		else r = target.requestFullscreen ? target.requestFullscreen() : target.webkitRequestFullscreen?.();
		Promise.resolve(r).catch(() => {});
	} catch {
		// Blocked by the browser (iframe without allowfullscreen, etc.): nothing to do.
	}
}

/** Viewer.tsx backgroundStyle(). */
function backgroundStyle(env) {
	const type = env?.backgroundType ?? 'transparent';
	const base = { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' };
	if (type === 'color' && env?.backgroundColor) return { ...base, backgroundColor: env.backgroundColor, backgroundImage: 'none' };
	if (type === 'image' && env?.backgroundImageUrl) return { ...base, backgroundImage: `url(${env.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
	if (type === 'transparent') return { ...base, background: 'transparent', backgroundImage: 'none' };
	return { ...base, backgroundColor: '#111', backgroundImage: 'none' };
}

/** Poster: variation image ‖ product poster ‖ featured image (all resolved to data URLs here). */
export function usePosterUrl(productId, variationId = 0) {
	const state = useStore();
	const product = state.products?.[productId];
	const settings = viewerSettingsFor(state, productId);
	const vid = variationId && state.variations?.[variationId]?.parentId === productId ? variationId : 0;
	const [url, setUrl] = useState('');
	const key = JSON.stringify([productId, vid, settings.posterUrl ? settings.posterId : 0, vid ? effectiveFor(state, productId, vid, { background: false }) : effectiveFor(state, productId, 0, { background: false })]);
	useEffect(() => {
		let live = true;
		if (!product) return;
		if (!vid && settings.posterUrl) {
			setUrl(settings.posterUrl);
			return;
		}
		productImageUrl(state, product, vid, 800).then((u) => live && setUrl(u), () => {});
		return () => (live = false);
	}, [key]);
	return url;
}

// ── Root (pre-mount poster, lazy triggers) ─────────────────────────────────

/**
 * <StorefrontViewer productId variationId custom onCustomChange mode />
 * mode: 'replace' (replace_image / gallery_first slide), 'tab', 'shortcode', 'inline',
 *       'modal' (product modal; mounts at once), 'listing' (shop modal; customizer off, no variations).
 * custom/onCustomChange make the shopper layer controlled (the add-to-cart form owns it).
 * openGroup (option-groups): a group id to open the drawer on (mounts the viewer); onGroupShown clears it.
 * galleryLane (gallery-lane): true/false forces the strip layout; undefined follows the flag.
 */
export function StorefrontViewer({ productId, variationId = 0, custom, onCustomChange, mode = 'replace', class: cls, openGroup = null, onGroupShown, overrides, style: rootStyle, keepCustom = false, cart = null, galleryLane }) {
	const state = useStore();
	// block: overrides = the block's settings (shared/block.js viewerOverrides); absent = unchanged.
	const settings = overrideSettings(viewerSettingsFor(state, productId), overrides);
	const immediate = mode === 'modal' || mode === 'listing';
	const trigger = settings.loadingTrigger;
	const vid = mode === 'listing' ? 0 : variationId;
	const poster = usePosterUrl(productId, vid);
	const [phase, setPhase] = useState(immediate || trigger === 'eager' ? 'mounted' : 'idle');
	const rootRef = useRef(null);

	const start = useCallback(() => {
		setPhase((p) => {
			if (p !== 'idle') return p;
			setTimeout(() => setPhase('mounted'), CHUNK_DELAY);
			return 'loading';
		});
	}, []);

	// scroll trigger: 10% visible mounts; no IntersectionObserver mounts at once.
	useEffect(() => {
		if (phase !== 'idle' || trigger !== 'scroll' || immediate) return;
		if (!('IntersectionObserver' in window)) return start();
		const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && (io.disconnect(), start()), { threshold: 0.1 });
		io.observe(rootRef.current);
		return () => io.disconnect();
	}, [phase, trigger]);

	useEffect(() => {
		if (openGroup && phase === 'idle') start();
	}, [openGroup]);

	// saved-designs: a design opened from a link mounts at once and keeps its choices.
	useEffect(() => {
		if (keepCustom && phase === 'idle') start();
	}, []);

	if (!settings.available) return null;
	const lazy = !immediate && trigger !== 'eager';
	const rootClass = cx(
		'wc3d-viewer-root',
		{ replace: 'wc3d-viewer-replace', tab: 'wc3d-viewer-tab', shortcode: 'wc3d-viewer-shortcode', inline: 'wc3d-viewer-inline', modal: 'wc3d-viewer-modal', listing: '', block: 'wc3d-viewer-block' }[mode],
		// The product modal root is printed lazy too; opening the modal mounts it at once.
		(lazy || (mode === 'modal' && trigger !== 'eager')) && 'wc3d-lazy-viewer',
		cls
	);
	const style = poster && phase !== 'mounted' ? `background-image: url("${poster}"); background-size: contain; background-position: center; background-repeat: no-repeat;` : undefined;

	return html`
		<div
			ref=${rootRef}
			id=${mode === 'replace' || mode === 'tab' || mode === 'modal' ? 'wc3d-viewer-root' : undefined}
			class=${rootClass}
			data-product-id=${productId}
			style=${rootStyle ? rootStyle + (style || '') : style}
			onClick=${phase === 'idle' && trigger === 'click' && lazy ? start : undefined}
		>
			${phase === 'mounted'
				? html`<${Viewer} productId=${productId} variationId=${vid} custom=${custom} onCustomChange=${onCustomChange} listing=${mode === 'listing'} posterUrl=${poster} openGroup=${openGroup} onGroupShown=${onGroupShown} overrides=${overrides} keepCustom=${keepCustom} cart=${mode === 'listing' ? null : cart} galleryLane=${galleryLane} />`
				: lazy &&
					html`<div class="wc3d-poster-overlay">
						<button type="button" class="wc3d-load-button" aria-label="Interact in 3D" disabled=${phase === 'loading'} onClick=${(e) => (e.stopPropagation(), start())}>
							${phase === 'loading'
								? html`<span class="wc3d-loading-spinner" aria-hidden="true"></span><span class="wc3d-load-button-text">Loading 3D Scene…</span>`
								: html`<span class="wc3d-load-button-icon" aria-hidden="true">⛶</span><span class="wc3d-load-button-text">Interact in 3D</span>`}
						</button>
					</div>`}
		</div>
	`;
}

/**
 * Order preview root (OrderPreview.php + ViewerMarkup::order_modal_root): eager, no poster,
 * customizer off, no variation switching, the line's shopper choices baked in.
 */
export function OrderPreviewRoot({ productId, variationId = 0, choices = null }) {
	return html`<div id="wc3d-viewer-root" class="wc3d-viewer-root wc3d-viewer-modal" data-product-id=${productId}>
		<${Viewer} productId=${productId} variationId=${variationId} order=${true} choices=${choices} posterUrl="" />
	</div>`;
}

// ── Mounted viewer ─────────────────────────────────────────────────────────

function Viewer({ productId, variationId, custom: customProp, onCustomChange, listing, posterUrl, order = false, choices = null, openGroup = null, onGroupShown, overrides, keepCustom = false, cart = null, galleryLane }) {
	const state = useStore();
	const settings = overrideSettings(viewerSettingsFor(state, productId), overrides);
	const flags = { pricing: useFeature('option-pricing'), groups: useFeature('option-groups') };
	const decalsOn = useFeature('decals');
	// Order preview: stored shopper choices are baked into the config (EffectiveConfig::apply_shopper_choices).
	// conditional-logic: the variation's attributes ride along (Symbol key, inert without the flag).
	// block: useBlockConfig swaps in the block's background (no overrides = the same object).
	const config = useBlockConfig(useMemo(() => withAttributes(applyShopperChoices(effectiveFor(state, productId, variationId), order ? choices : null), attributesFor(state, productId, variationId)), [state.productConfigs, state.variationConfigs, state.settings, state.products?.[productId]?.meta, state.attachments, productId, variationId, order, JSON.stringify(choices)]), overrides);
	const { model, attachment } = modelFor(state, productId, variationId);
	const modelKey = model ? model.demo || model.url : '';

	// Shopper layer: controlled by the add-to-cart form, else local.
	const [localCustom, setLocalCustom] = useState(null);
	const controlled = typeof onCustomChange === 'function';
	const custom = controlled ? customProp : localCustom;
	const setCustom = (next) => (controlled ? onCustomChange(isEmpty(next) ? null : next) : setLocalCustom(isEmpty(next) ? null : next));
	const customRef = useRef(custom);
	customRef.current = custom;

	const wrapRef = useRef(null);
	const arBtnRef = useRef(null);
	const hotspotsRef = useRef(null);
	const ctl = useRef(null);
	const [load, setLoad] = useState({ key: modelKey, progress: 0, ready: false, poster: 'shown' });
	const [thumbs, setThumbs] = useState([]);
	const [activeIdx, setActiveIdx] = useState(null);
	const [autoRotate, setAutoRotate] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [focusGroup, setFocusGroup] = useState(null);
	const [qrOpen, setQrOpen] = useState(false);
	const [shot, setShot] = useState(null);
	// customizer-modal: Customize opens a dialog the live viewer moves into.
	const [modalOpen, setModalOpen] = useState(false);
	const [showErrors, setShowErrors] = useState(false);
	const [stageEl, setStageEl] = useState(null);
	const customizeRef = useRef(null);
	const closeRef = useRef(null); // the dialog's close (pops its history entry)
	const fsOk = useMemo(fullscreenSupported, []);
	const arDevice = useMemo(detectArDevice, []);

	// Mounting starts from a clean shopper layer (the hidden cart input is rewritten on mount),
	// except when mounted to finish a required choice, which keeps the shopper's other picks.
	useEffect(() => {
		if (!openGroup && !keepCustom && !isEmpty(customRef.current)) setCustom(null);
	}, []);

	// Picking or clearing a variation drops the shopper's customizations (drawer stays as it was).
	const firstVid = useRef(true);
	useEffect(() => {
		if (firstVid.current) return void (firstVid.current = false);
		if (!isEmpty(customRef.current)) setCustom(null);
	}, [variationId]);

	// A different model: overlay back with progress 0, gallery back to spinners.
	if (load.key !== modelKey) {
		setLoad({ key: modelKey, progress: 0, ready: false, poster: 'shown' });
		setThumbs([]);
		setActiveIdx(null);
	}

	useEffect(() => {
		if (!load.ready || load.poster !== 'shown') return;
		setLoad((l) => ({ ...l, poster: 'fading' }));
		const t = setTimeout(() => setLoad((l) => ({ ...l, poster: 'hidden' })), 400);
		return () => clearTimeout(t);
	}, [load.ready, load.poster]);

	// Gallery captures: 350ms after ready, 1200ms after a customizer change.
	const captured = useRef(false);
	const customKey = JSON.stringify(custom || null);
	useEffect(() => {
		const v = ctl.current;
		if (!load.ready || !v) return;
		const t = setTimeout(
			() => {
				const orig = v.getCamera();
				const urls = PRESET_KEYS.map((key) => {
					const pose = config.gallery_presets?.[key] || v.getAutoView(key);
					v.setCamera({ position: pose.position, target: pose.target }, { animate: false });
					return v.screenshot({ maxSide: 256, type: 'image/png' });
				});
				v.setCamera({ position: orig.position, target: orig.target }, { animate: false });
				captured.current = true;
				setThumbs(urls);
			},
			captured.current ? 1200 : 350
		);
		return () => clearTimeout(t);
	}, [load.ready, customKey, JSON.stringify(config)]);

	const onReady = useCallback((v) => {
		ctl.current = v;
		setLoad((l) => ({ ...l, progress: 100, ready: true }));
	}, []);
	const onProgress = useCallback((p) => setLoad((l) => (l.ready ? l : { ...l, progress: p })), []);

	// Customizer lists from the active variation's resolved meshes.
	const editable = Object.entries(config.meshes || {}).filter(([, m]) => m?.customizable).map(([n]) => n);
	const toggleable = Object.entries(config.meshes || {}).filter(([, m]) => m?.optional).map(([n]) => n);
	const hasOptions = editable.length > 0 || toggleable.length > 0;
	const customizerOn = !listing && !order && settings.customizerEnabled;
	// option-groups: the groups replace the plain lists and their defaults render from the first frame.
	const grouped = !order && settings.customizerEnabled && usesGroups(config, flags);
	// decals: personalization areas open the drawer too; the designs ride on the rendered layer.
	const personal = customizerOn && usesDecals(config, decalsOn);
	const layer = withDecalLayer(grouped ? shopperLayer(config, custom, flags) : custom, personal ? custom : null);
	const showCustomize = customizerOn && (hasOptions || grouped || personal);
	const modalLayout = customizerOn && settings.customizerModal;
	const openModal = () => {
		exitFullscreen();
		setModalOpen(true);
	};
	// undo-redo-drawer: the drawer writes through a recording setter (the raw one when the flag is off).
	const history = useDrawerHistory({ show: showCustomize, custom, setCustom, config, resetKey: `${productId}-${variationId}`, rootRef: wrapRef });
	const decalUi = useDecalDrag({ on: personal, ctl, ready: load.ready, open: drawerOpen || modalOpen, config, custom, setCustom: history.set });

	useEffect(() => {
		if (!openGroup || !showCustomize) return;
		if (modalLayout) {
			openModal();
			setShowErrors(true);
		} else setDrawerOpen(true);
		setFocusGroup(openGroup);
		onGroupShown?.();
	}, [openGroup]);

	const ar = config.ar || null;
	// usdz-export: AR built from the configured scene (null with the flag off).
	const arx = useArExport({ productId, variationId, config, custom, layer, ctl, attachment, modelKey, order, choices, buttonRef: arBtnRef });
	const arVisible = arx ? arx.visible : ar?.enabled === true && (arDevice !== 'ios' || !!ar?.usdzUrl);
	const c = settings.controls;
	const showStack = c.zoom || c.reset || c.autorotate || c.download || arVisible || hasOptions || showCustomize;

	const api = {
		zoomIn: () => ctl.current?.zoom(1),
		zoomOut: () => ctl.current?.zoom(-1),
		reset: () => ctl.current?.resetCamera({ animate: false }),
		rotate: () => setAutoRotate((r) => !r),
		download: () => {
			const v = ctl.current;
			if (!v) return;
			setShot({ url: v.screenshot({ maxSide: 1400, type: 'image/png' }), file: attachment?.filename || 'model.glb', size: attachment?.sizeBytes || 0 });
		},
		ar: () => {
			if (arDevice === 'desktop') setQrOpen(true);
			// iOS Quick Look / Android Scene Viewer need a real device and file: nothing to open here.
		},
	};

	const selectPreset = (idx) => {
		if (idx === activeIdx) return;
		setActiveIdx(idx);
		const v = ctl.current;
		if (!v) return;
		const pose = config.gallery_presets?.[PRESET_KEYS[idx]] || v.getAutoView(PRESET_KEYS[idx]);
		if (pose) v.setCamera({ position: pose.position, target: pose.target }, { animate: !reducedMotion(), duration: 600 });
	};

	const showGallery = settings.showGallery !== false && load.ready;
	// A callback ref: with the modal layout the tree renders into a movable host after this effect.
	const [galleryEl, setGalleryEl] = useState(null);
	const laneFlag = useFeature('gallery-lane');
	useGalleryLane(galleryEl, galleryLane ?? laneFlag, [showStack]);

	const wrapper = html`
		<div ref=${wrapRef} class=${cx('wc3d-viewer-wrapper', modalOpen && 'wc3d-viewer-wrapper--modal')} style=${backgroundStyle(config.environment)}>
			<${Viewer3D}
				class="wc3d-canvas-container"
				config=${config}
				model=${model}
				custom=${layer}
				autoRotate=${autoRotate}
				loadDelay=${LOAD_DELAY}
				onReady=${onReady}
				onProgress=${onProgress}
				onCamera=${(v) => hotspotsRef.current?.(v)}
			>
				${load.ready && html`<${Hotspots} hotspots=${config.hotspots} ctl=${ctl} register=${(f) => (hotspotsRef.current = f)} />`}
				${load.poster !== 'hidden' &&
				html`<div class=${cx('wc3d-poster-overlay-wrapper', load.poster !== 'shown' && 'wc3d-fade-out')}>
					${posterUrl && html`<div class="wc3d-react-poster-bg" style=${{ backgroundImage: `url(${posterUrl})` }}></div>`}
					<div class="wc3d-loading-overlay-content">
						<div class="wc3d-loading-spinner-wrapper">
							<div class="wc3d-loading-spinner-circle"></div>
							<span class="wc3d-loading-percentage">${load.progress < 100 ? `${Math.round(load.progress)}%` : '100%'}</span>
						</div>
						<div class="wc3d-loading-bar-track"><div class="wc3d-loading-bar-fill" style=${{ width: `${load.progress}%` }}></div></div>
						<div class="wc3d-loading-text">${load.progress < 100 ? 'Loading 3D Model…' : 'Preparing 3D Scene…'}</div>
					</div>
				</div>`}
				${showStack &&
				html`<div class="wc3d-controls-stack">
					${c.zoom &&
					html`<button type="button" aria-label="Zoom in" title="Zoom in" onClick=${api.zoomIn} class="wc3d-overlay-btn"><${Icon} name="sf-zoom-in" /></button>
						<button type="button" aria-label="Zoom out" title="Zoom out" onClick=${api.zoomOut} class="wc3d-overlay-btn"><${Icon} name="sf-zoom-out" /></button>`}
					${c.reset && html`<button type="button" aria-label="Reset view" title="Reset view" onClick=${api.reset} class="wc3d-overlay-btn"><${Icon} name="sf-reset-view" /></button>`}
					${c.autorotate &&
					html`<button type="button" aria-pressed=${autoRotate} aria-label="Toggle auto-rotate" title=${autoRotate ? 'Pause auto-rotate' : 'Start auto-rotate'} onClick=${api.rotate} class="wc3d-overlay-btn">
						<${Icon} name=${autoRotate ? 'sf-pause' : 'sf-play'} />
					</button>`}
					${c.download && modelKey && html`<button type="button" aria-label="Download 3D Model" title="Download 3D Model" onClick=${api.download} class="wc3d-overlay-btn wc3d-download-btn"><${Icon} name="sf-download" /></button>`}
					${arVisible && (arx ? html`<${ArExportButton} arx=${arx} buttonRef=${arBtnRef} />` : html`<button ref=${arBtnRef} type="button" onClick=${api.ar} class="wc3d-overlay-btn wc3d-ar-btn"><${Icon} name="sf-ar" /><span>View in AR</span></button>`)}
					${showCustomize &&
					html`<button ref=${customizeRef} type="button" onClick=${modalLayout ? openModal : () => setDrawerOpen(!drawerOpen)} class=${cx('wc3d-overlay-btn wc3d-customize-btn', drawerOpen && 'active')} aria-haspopup=${modalLayout ? 'dialog' : undefined}>
						<${Icon} name="sf-palette" /><span>${drawerOpen ? 'Close' : 'Customize'}</span>
					</button>`}
				</div>`}
				${fsOk &&
				!modalOpen &&
				html`<button type="button" aria-label="Toggle fullscreen" onClick=${() => wrapRef.current && toggleFullscreen(wrapRef.current)} class="wc3d-overlay-btn" style="position:absolute;bottom:10px;right:10px;z-index:2">
					<${Icon} name="sf-fullscreen" />
				</button>`}
				${showGallery &&
				html`<div ref=${setGalleryEl} class="wc3d-gallery-row">
					${thumbs.length
						? thumbs.map(
								(url, idx) => html`<button key=${idx} type="button" onClick=${() => selectPreset(idx)} class=${cx('wc3d-gallery-thumb', activeIdx === idx && 'active')} title=${PRESET_TITLES[idx]}>
									<img src=${url} alt=${`View ${idx + 1}`} />
								</button>`
							)
						: [0, 1, 2, 3].map((idx) => html`<div key=${idx} class="wc3d-gallery-thumb wc3d-gallery-thumb-placeholder"><div class="wc3d-hotspot-spinner" style="margin:0"></div></div>`)}
				</div>`}
			<//>
			${showCustomize &&
			!modalLayout &&
			html`<${CustomizerDrawer} open=${drawerOpen} onClose=${() => setDrawerOpen(false)} config=${config} custom=${custom} setCustom=${history.set} history=${history.on ? history : null} palette=${settings.colorPalette} editable=${editable} toggleable=${toggleable} productId=${productId} variationId=${variationId} grouped=${grouped} flags=${flags} focusGroup=${focusGroup} onFocused=${() => setFocusGroup(null)} decals=${personal ? decalUi : null} />`}
			${modalOpen &&
			html`<${ModalPanel} config=${config} custom=${custom} setCustom=${history.set} history=${history.on ? history : null} palette=${settings.colorPalette} editable=${editable} toggleable=${toggleable} productId=${productId} variationId=${variationId} grouped=${grouped} personal=${personal} flags=${flags} focusGroup=${focusGroup} onFocused=${() => setFocusGroup(null)} decals=${personal ? decalUi : null} cart=${cart} showErrors=${showErrors} onAdd=${() => (setShowErrors(true), cart?.submit())} onDone=${() => closeRef.current?.()} />`}
			${qrOpen && html`<${ArQrModal} onClose=${() => setQrOpen(false)} returnFocusRef=${arBtnRef} />`}
			${arx?.ui}
			${shot && html`<${ShotModal} shot=${shot} onClose=${() => setShot(null)} />`}
		</div>
	`;

	// customizer-modal: the whole viewer lives in one host element that moves between the page and the dialog.
	const host = useMovableHost(wrapper, modalOpen ? stageEl : null, modalLayout);
	const closeNow = () => {
		host.home();
		setModalOpen(false);
		setShowErrors(false);
	};
	useEffect(() => {
		if (!modalLayout && modalOpen) setModalOpen(false);
	}, [modalLayout]);
	// After a move the canvas resizes; re-place hotspots and draw a frame at the new size.
	useEffect(() => {
		if (!modalLayout) return;
		let r2 = 0;
		const r1 = requestAnimationFrame(() => {
			r2 = requestAnimationFrame(() => {
				if (ctl.current) hotspotsRef.current?.(ctl.current);
				ctl.current?.invalidate?.();
			});
		});
		return () => (cancelAnimationFrame(r1), cancelAnimationFrame(r2));
	}, [modalOpen, stageEl]);

	if (!modalLayout) return wrapper;
	const title = state.products?.[productId]?.name || '';
	return html`
		<div ref=${host.slotRef} class="wc3d-viewer-slot"></div>
		${modalOpen && html`<div class="wc3d-customizer-modal__placeholder" style=${posterUrl ? { backgroundImage: `url(${posterUrl})` } : undefined} aria-hidden="true"></div>`}
		${modalOpen && html`<${Portal}><${CustomizerModal} title=${title} productId=${productId} onClose=${closeNow} closeRef=${closeRef} setStage=${setStageEl} openerRef=${customizeRef} /><//>`}
	`;
}

// ── Hotspots (HotspotsViewer.tsx) ──────────────────────────────────────────

const HOTSPOT_ICONS = {
	link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
	cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
	warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
	info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
};
const HotspotIcon = ({ icon }) =>
	html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: HOTSPOT_ICONS[icon] || HOTSPOT_ICONS.info }}></svg>`;

function Hotspots({ hotspots, ctl, register }) {
	const list = Array.isArray(hotspots) ? hotspots.filter((h) => h && h.id) : [];
	const els = useRef({});
	const [occ, setOcc] = useState({});
	const occRef = useRef({});
	const lastCheck = useRef(0);

	const update = useCallback(
		(v) => {
			const now = performance.now();
			const check = now - lastCheck.current >= 100;
			let changed = false;
			const next = { ...occRef.current };
			for (const h of list) {
				const el = els.current[h.id];
				if (!el) continue;
				const p = v.project(h.anchor_mesh || null, h.offset || [0, 0, 0]);
				el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
				el.style.display = p.behind ? 'none' : '';
				if (check && !!next[h.id] !== !!p.occluded) {
					next[h.id] = !!p.occluded;
					changed = true;
				}
			}
			if (check) lastCheck.current = now;
			if (changed) {
				occRef.current = next;
				setOcc(next);
			}
		},
		[JSON.stringify(list)]
	);

	useEffect(() => {
		register(update);
		if (ctl.current) update(ctl.current);
		// One trailing check so occlusion settles after the camera stops.
		const t = setInterval(() => ctl.current && update(ctl.current), 500);
		return () => {
			clearInterval(t);
			register(null);
		};
	}, [update]);

	if (!list.length) return null;
	return html`<div class="wc3d-hotspot-layer">
		${list.map((h) => html`<${Hotspot} key=${h.id} hotspot=${h} occluded=${!!occ[h.id]} ctl=${ctl} elRef=${(el) => (els.current[h.id] = el)} />`)}
	</div>`;
}

function Hotspot({ hotspot: h, occluded, ctl, elRef }) {
	const state = useStore();
	const [show, setShow] = useState(false);
	const [loading, setLoading] = useState(false);
	const [product, setProduct] = useState(null);
	const leave = useRef(0);

	const enter = () => {
		clearTimeout(leave.current);
		if (!occluded) setShow(true);
	};
	const out = () => {
		clearTimeout(leave.current);
		leave.current = setTimeout(() => setShow(false), 200);
	};
	useEffect(() => () => clearTimeout(leave.current), []);

	const hasLink = h.icon === 'link' && h.target_url;
	const linked = h.icon === 'cart' && h.linked_product_id ? state.products?.[h.linked_product_id] : null;
	const hasProduct = h.icon === 'cart' && !!h.linked_product_id;
	const hasContent = !!(h.description || hasLink || hasProduct);

	// GET /wc3d/v1/products/{id}: spinner on first open, then the card (404 → nothing).
	useEffect(() => {
		if (!show || !hasProduct || product) return;
		setLoading(true);
		const t = setTimeout(() => {
			setLoading(false);
			if (linked && linked.status === 'publish') setProduct(linked);
		}, 500);
		return () => {
			clearTimeout(t);
			setLoading(false);
		};
	}, [show, hasProduct]);

	const [thumb, setThumb] = useState('');
	useEffect(() => {
		if (!product) return;
		let live = true;
		productImageUrl(state, product, 0, 120).then((u) => live && setThumb(u), () => {});
		return () => (live = false);
	}, [product]);

	const click = (e) => {
		e.stopPropagation();
		setShow(!show);
		const v = ctl.current;
		if (!v) return;
		const custom = Array.isArray(h.camera_position) && h.camera_position.length === 3 && Array.isArray(h.camera_target) && h.camera_target.length === 3;
		const target = custom ? h.camera_target : v.hotspotWorld(h.anchor_mesh || null, h.offset || [0, 0, 0]);
		if (target) v.setCamera(custom ? { position: h.camera_position, target } : { target }, { animate: true, duration: 600 });
	};

	const addLinked = (e) => {
		e.preventDefault();
		// option-groups: like WC's AJAX add, a failed validation sends the shopper to the product page.
		const errors = choiceErrors(store.get(), product.id);
		if (errors.length) {
			setShow(false);
			go('store.product.' + product.slug);
			errors.forEach((text) => pushNotice({ type: 'error', text }));
			return;
		}
		captureLine(addToCart({ productId: product.id, variationId: 0, qty: 1 }));
		addedToCartNotice(store.get(), product.id, 1);
		setShow(false);
		document.querySelector('.woocommerce-notices-wrapper')?.scrollIntoView?.({ block: 'nearest' });
	};

	const tip = show && hasContent;
	const faded = !show && occluded;
	return html`
		<div class="wc3d-hotspot-anchor" ref=${elRef} style=${{ zIndex: tip ? 1000 : 10 }}>
			<div class="wc3d-hotspot-wrapper" style=${{ transition: 'opacity 0.3s ease', opacity: faded ? 0.2 : 1, pointerEvents: faded ? 'none' : 'auto' }}>
				${!occluded && html`<div class="wc3d-hotspot-ping"></div>`}
				<button type="button" onClick=${click} onMouseEnter=${enter} onMouseLeave=${out} class=${h.label ? 'wc3d-hotspot-button-pill' : 'wc3d-hotspot-button'} aria-label=${h.label || h.anchor_mesh || 'Hotspot'} aria-expanded=${hasContent ? show : undefined}>
					${h.label
						? html`${h.icon && h.icon !== 'info' && html`<span style="display:inline-flex;align-items:center;margin-right:4px"><${HotspotIcon} icon=${h.icon} /></span>`}<span>${h.label}</span>`
						: html`<${HotspotIcon} icon=${h.icon} />`}
				</button>
				${tip &&
				html`<div class="wc3d-hotspot-tooltip-wrap" role="presentation" onMouseEnter=${enter} onMouseLeave=${out} onClick=${(e) => e.stopPropagation()}>
					<div class="wc3d-hotspot-tooltip">
						${h.label && html`<span class="wc3d-hotspot-tooltip-title">${h.label}</span>`}
						${h.description && html`<span class="wc3d-hotspot-tooltip-desc">${h.description}</span>`}
						${loading && html`<div style="display:flex;justify-content:center;padding-top:6px;padding-bottom:6px"><div class="wc3d-hotspot-spinner"></div></div>`}
						${!loading &&
						hasProduct &&
						product &&
						html`<div style="display:flex;flex-direction:column">
							<div class="wc3d-hotspot-product-card">
								<img src=${thumb || undefined} alt=${product.name} class="wc3d-hotspot-product-img" />
								<div class="wc3d-hotspot-product-info">
									<span class="wc3d-hotspot-product-title" title=${product.name}>${product.name}</span>
									<span class="wc3d-hotspot-product-price">${money(product.price)}</span>
								</div>
							</div>
							<a href=${`#store.product.${product.slug}`} onClick=${addLinked} class="wc3d-hotspot-action-btn">🛒 Add to Cart</a>
							<a href=${`#store.product.${product.slug}`} class="wc3d-hotspot-secondary-btn">View Product</a>
						</div>`}
						${hasLink && html`<a href=${h.target_url} target="_blank" rel="noopener noreferrer" class="wc3d-hotspot-action-btn">🔗 Visit Link</a>`}
					</div>
					<div class="wc3d-hotspot-tooltip-arrow"></div>
				</div>`}
			</div>
		</div>
	`;
}

// ── Customizer drawer (CustomizerDrawer.tsx) ───────────────────────────────

function PriceBadge({ amount, regular }) {
	const was = regular != null && regular !== amount ? formatDelta(regular) : '';
	if (!amount && !was) return null;
	return html`<span class="wc3d-customer-drawer__price">${was && html`<del>${was}</del>`}<span>${formatDelta(amount) || money(0)}</span></span>`;
}

export { hasOptionRules };

/** The picked parts choice that hides the group's targets (for "Not used with …"). */
function hiddenBy(config, chosen, group) {
	for (const p of groupsOf(config)) {
		const c = chosen[p.id];
		if (p.type === 'parts' && c && (p.targets || []).some((m) => (group.targets || []).includes(m) && !(c.show || []).includes(m))) return c;
	}
	return null;
}

const ARROWS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Radio-group arrow keys: move to the next enabled choice and pick it. */
function radioKeys(e) {
	const d = ARROWS[e.key];
	if (!d) return;
	e.preventDefault();
	const items = [...e.currentTarget.querySelectorAll('[role="radio"]:not([disabled])')];
	if (!items.length) return;
	const next = items[(items.indexOf(document.activeElement) + d + items.length) % items.length];
	next.focus();
	next.click();
}

/** option-groups: one drawer section per group, choices in the group's display. */
function GroupSection({ group: g, choice: picked, inactive, hider, pricing, base, attachments, onPick, note = '', animate = false }) {
	// An inactive group is not shown as chosen and not charged.
	const choice = inactive ? null : picked;
	const uid = 'wc3d-opt-' + String(g.id).replace(/[^A-Za-z0-9_-]/g, '');
	const labelId = uid + '-label';
	const descId = g.description || inactive || note ? uid + '-desc' : undefined;
	const amount = (c) => (pricing && !inactive ? ruleAmount(c.price, base) : 0);
	const regular = (c) => (pricing && !inactive ? ruleRegular(c.price, base) : null);
	const withPrice = (c, sep) => (amount(c) ? `${c.label}${sep}${formatDelta(amount(c))}` : c.label);
	// Layout keeps the badge row while inactive, so the grid does not jump.
	const priced = pricing && g.choices.some((c) => ruleAmount(c.price, base) || ruleRegular(c.price, base) != null);
	const badge = (c) => pricing && !inactive && html`<${PriceBadge} amount=${amount(c)} regular=${regular(c)} />`;
	const dot = (c) => (g.type === 'color' || g.type === 'variant' ? c.color : g.type === 'material' ? c.material?.baseColor || c.color : '') || '';
	const thumbUrl = (c) => {
		const att = c.thumbnailId ? attachments?.[c.thumbnailId] : null;
		return (att && attachmentUrl(att)) || choiceBallUrl(c);
	};
	// Roving tabindex: the picked choice (else the first) is the group's tab stop.
	const radio = (c, i, cls, body, style) => html`<button
		key=${c.id}
		type="button"
		role="radio"
		aria-checked=${choice?.id === c.id ? 'true' : 'false'}
		aria-label=${withPrice(c, ', ')}
		title=${withPrice(c, ' · ')}
		tabindex=${(choice ? choice.id === c.id : i === 0) ? 0 : -1}
		disabled=${inactive}
		class=${cx(cls, choice?.id === c.id && 'active')}
		style=${style}
		onClick=${() => onPick(c)}
	>${body}</button>`;
	const radios = (cls, items) => html`<div class=${cls} role="radiogroup" aria-labelledby=${labelId} aria-describedby=${descId} aria-required=${g.required ? 'true' : undefined} aria-disabled=${inactive ? 'true' : undefined} onKeyDown=${radioKeys}>${items}</div>`;

	let body;
	if (g.display === 'dropdown') {
		body = html`<select
			class="wc3d-customer-drawer__select"
			aria-labelledby=${labelId}
			aria-describedby=${descId}
			aria-required=${g.required ? 'true' : undefined}
			disabled=${inactive}
			value=${choice?.id || ''}
			onChange=${(e) => {
				const c = g.choices.find((x) => x.id === e.currentTarget.value);
				if (c) onPick(c);
			}}
		>
			${!choice && html`<option value="">Choose an option</option>`}
			${g.choices.map((c) => html`<option key=${c.id} value=${c.id}>${amount(c) ? `${c.label} (${formatDelta(amount(c))})` : c.label}</option>`)}
		</select>`;
	} else if (g.display === 'thumbnail') {
		body = radios(
			'wc3d-customer-drawer__thumbs',
			g.choices.map((c, i) => radio(c, i, 'wc3d-customer-drawer__thumb', html`<img class="wc3d-customer-drawer__thumb-img" src=${thumbUrl(c)} alt="" /><span class="wc3d-customer-drawer__thumb-label">${c.label}</span>${badge(c)}`))
		);
	} else if (g.display === 'button') {
		body = radios(
			'wc3d-customer-drawer__pills',
			g.choices.map((c, i) => radio(c, i, 'wc3d-customer-drawer__pill', html`${dot(c) && html`<span class="wc3d-customer-drawer__pill-dot" style=${{ backgroundColor: dot(c) }}></span>`}<span>${c.label}</span>${badge(c)}`))
		);
	} else {
		body = radios(
			cx('wc3d-customer-drawer__colors-grid', priced && 'wc3d-customer-drawer__colors-grid--priced'),
			g.choices.map((c, i) => {
				const bubble = radio(c, i, 'wc3d-customer-drawer__color-bubble', null, { backgroundColor: dot(c) || '#cbd5e1' });
				return priced ? html`<div key=${c.id} class="wc3d-customer-drawer__swatch">${bubble}${badge(c)}</div>` : bubble;
			})
		);
	}

	return html`<div class=${cx('wc3d-customer-drawer__section wc3d-customer-drawer__group', inactive && 'is-inactive', animate && 'wc3d-cl-anim')} data-wc3d-group=${g.id}>
		<h5 class="wc3d-customer-drawer__section-title wc3d-customer-drawer__group-title">
			<span id=${labelId}>${g.label}</span>${g.required && html`<span class="wc3d-customer-drawer__required" aria-hidden="true">${' *'}</span>`}${choice && html`<span class="wc3d-customer-drawer__group-value">${' · ' + choice.label}</span>`}
		</h5>
		${descId &&
		html`<div id=${descId}>
			${g.description && html`<p class="wc3d-customer-drawer__group-desc">${g.description}</p>`}
			${inactive && hider && html`<p class="wc3d-customer-drawer__group-note">Not used with ${hider.label}</p>`}
			${note && html`<p class="wc3d-customer-drawer__group-note wc3d-cl-note">${note}</p>`}
		</div>`}
		${body}
	</div>`;
}

function GroupList({ config, custom, setCustom, pricing, base, attachments }) {
	const chosen = selectedChoices(config, custom);
	const off = inactiveGroups(config, custom);
	const pick = (g, c) => setCustom({ ...(custom || {}), options: { ...(custom?.options || {}), [g.id]: c.id } });
	// conditional-logic: null with the flag off; else hidden groups drop out and choices are the offered ones.
	const logic = useConditionView(config, custom);
	const list = groupsOf(config)
		.filter((g) => !logic?.hidden.has(g.id))
		.map(
			(g) => html`<${GroupSection}
				key=${g.id}
				group=${logic ? logic.group(g) : g}
				choice=${chosen[g.id]}
				inactive=${off.has(g.id)}
				hider=${off.has(g.id) ? hiddenBy(config, chosen, g) : null}
				pricing=${pricing}
				base=${base}
				attachments=${attachments}
				onPick=${(c) => pick(g, c)}
				note=${logic ? logic.note(g.id) : ''}
				animate=${!!logic}
			/>`
		);
	return logic ? [...list, logic.live] : list;
}

/** Opened on a group (failed add to cart): once shown, scroll it into view and focus its first choice. */
export function useFocusGroup(rootRef, open, focusGroup, onFocused, delay = 320) {
	useEffect(() => {
		if (!open || !focusGroup) return;
		const t = setTimeout(() => {
			const sec = [...(rootRef.current?.querySelectorAll('[data-wc3d-group]') || [])].find((el) => el.dataset.wc3dGroup === focusGroup);
			sec?.scrollIntoView({ block: 'center' });
			sec?.querySelector('button:not([disabled]), select:not([disabled])')?.focus({ preventScroll: true });
			onFocused?.();
		}, delay);
		return () => clearTimeout(t);
	}, [open, focusGroup]);
}

/** The drawer body (groups, or the plain lists, plus decal areas); the customizer modal renders it too. */
export function CustomizerOptions({ config, custom, setCustom, palette, editable, toggleable, productId, variationId, grouped = false, flags, decals = null }) {
	const state = useStore();
	const pricing = useFeature('option-pricing');
	const base = pricing ? basePriceOf(state, productId, variationId) : 0;
	// Products without rules keep the plain swatch grid even with the flag on.
	const priced = pricing && hasOptionRules(config, flags);
	const pal = palette || [];
	const mats = custom?.materials || {};
	const meshes = custom?.meshes || {};
	const without = (map, k) => {
		const n = { ...map };
		delete n[k];
		return n;
	};
	const setColor = (mesh, color) => setCustom({ ...custom, materials: { ...mats, [mesh]: { ...(mats[mesh] || {}), baseColor: color } } });
	const setVisible = (mesh, visible) => setCustom({ ...custom, meshes: { ...meshes, [mesh]: { visible } } });
	const resetColor = (mesh) => setCustom({ ...custom, materials: without(mats, mesh) });
	const resetVisible = (mesh) => setCustom({ ...custom, meshes: without(meshes, mesh) });
	const ResetItem = ({ onClick }) =>
		html`<button type="button" onClick=${onClick} class="wc3d-customer-drawer__reset-item-btn" title="Reset to default"><${Icon} name="sf-reset" /></button>`;
	const palette11 = palette?.length ? palette : ['#ffffff', '#000000', '#64748b', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];

	return html`
		${grouped && html`<${GroupList} config=${config} custom=${custom} setCustom=${setCustom} pricing=${pricing} base=${base} attachments=${state.attachments} />`}
		${!grouped &&
		editable.length > 0 &&
		html`<div class="wc3d-customer-drawer__section">
			<h5 class="wc3d-customer-drawer__section-title">Colors & Materials</h5>
			${editable.map((mesh) => {
				const color = mats[mesh]?.baseColor ?? getMaterialConfig(config.materials, mesh)?.baseColor ?? '';
				// option-pricing: the default colour is free; any other swatch costs what the cart would charge.
				const initial = pricing ? lc(getMaterialConfig(config.materials, mesh, Object.keys(config.meshes || {}))?.baseColor) : '';
				const swPrice = (sw) => (lc(sw) === initial ? 0 : colorPrice(config, mesh, sw, base, pal));
				// The picker badge is what any colour outside the palette costs on this part.
				const pickerPrice = priced ? colorPrice(config, mesh, color || '#ffffff', base, []) : 0;
				const pickerTitle = pickerPrice ? `Custom Color · ${formatDelta(pickerPrice)} for a colour outside the palette` : 'Custom Color';
				const wrap = (key, node, amount, regular) => (priced ? html`<div key=${key} class="wc3d-customer-drawer__swatch">${node}<${PriceBadge} amount=${amount} regular=${regular} /></div>` : node);
				return html`<div key=${mesh} class="wc3d-customer-drawer__item">
					<div class="wc3d-customer-drawer__item-label">
						<span>${ucwords(mesh)}</span>
						${mats[mesh] !== undefined && html`<${ResetItem} onClick=${() => resetColor(mesh)} />`}
					</div>
					<div class=${cx('wc3d-customer-drawer__colors-grid', priced && 'wc3d-customer-drawer__colors-grid--priced')}>
						${palette11.map((sw) => {
							const amount = priced ? swPrice(sw) : 0;
							return wrap(
								sw,
								html`<button
									key=${sw}
									type="button"
									onClick=${() => setColor(mesh, sw)}
									class=${cx('wc3d-customer-drawer__color-bubble', color && color.toLowerCase() === sw.toLowerCase() && 'active')}
									style=${{ backgroundColor: sw }}
									title=${amount ? `${sw} · ${formatDelta(amount)}` : sw}
								></button>`,
								amount,
								priced && amount ? colorRegular(config, mesh, sw, base, pal) : null
							);
						})}
						${wrap(
							'custom',
							html`<div class="wc3d-customer-drawer__color-custom-wrapper">
								<input type="color" value=${color && color.startsWith('#') && color.length === 7 ? color : '#ffffff'} onInput=${(e) => setColor(mesh, e.currentTarget.value)} class="wc3d-customer-drawer__color-picker-input" title=${pickerTitle} />
								<span class="wc3d-customer-drawer__color-custom-icon">🎨</span>
							</div>`,
							pickerPrice,
							pickerPrice ? colorRegular(config, mesh, color || '#ffffff', base, []) : null
						)}
					</div>
				</div>`;
			})}
		</div>`}
		${!grouped &&
		toggleable.length > 0 &&
		html`<div class="wc3d-customer-drawer__section">
			<h5 class="wc3d-customer-drawer__section-title">Options & Parts</h5>
			${toggleable.map((mesh, i) => {
				const id = `wc3d-part-${i}-${mesh}`;
				const visible = (meshes[mesh]?.visible ?? config.meshes?.[mesh]?.visible) !== false;
				return html`<div key=${mesh} class="wc3d-customer-drawer__toggle-row">
					<label for=${id} class="wc3d-customer-drawer__toggle-label" style="margin-bottom:0">
						<input id=${id} type="checkbox" checked=${visible} onChange=${(e) => setVisible(mesh, e.currentTarget.checked)} class="wc3d-customer-drawer__toggle-checkbox" />
						<span class="wc3d-customer-drawer__toggle-text">${ucwords(mesh)}</span>
						${pricing && html`<${PriceBadge} amount=${togglePrice(config, mesh, base)} regular=${ruleRegular(pricingOf(config)?.parts?.[mesh]?.toggle, base)} />`}
					</label>
					${meshes[mesh] !== undefined && html`<${ResetItem} onClick=${() => resetVisible(mesh)} />`}
				</div>`;
			})}
		</div>`}
		${decals && html`<${DecalSections} config=${config} custom=${custom} setCustom=${setCustom} pricing=${pricing} base=${base} ui=${decals} />`}
	`;
}

/** Undo / Redo (undo-redo-drawer) and Reset Customizations, as in the drawer footer. */
export function DrawerTools({ history, setCustom }) {
	return html`${history && html`<${DrawerHistoryButtons} history=${history} />`}
		<button type="button" onClick=${() => setCustom(null, { label: 'Reset Customizations' })} class="wc3d-customer-drawer__reset-btn">Reset Customizations</button>`;
}

function CustomizerDrawer({ open, onClose, config, custom, setCustom, history = null, palette, editable, toggleable, productId, variationId, grouped = false, flags, focusGroup = null, onFocused, decals = null }) {
	const state = useStore();
	const pricing = useFeature('option-pricing');
	const priced = pricing && hasOptionRules(config, flags);
	const quote = priced ? quoteFor(state, productId, variationId, custom, flags) : null;
	const rootRef = useRef(null);
	useFocusGroup(rootRef, open, focusGroup, onFocused);

	return html`
		<div ref=${rootRef} class=${cx('wc3d-customer-drawer', open && 'open')} inert=${open ? undefined : ''}>
			<div style="width:280px;height:100%;display:flex;flex-direction:column;flex-shrink:0">
				<div class="wc3d-customer-drawer__header">
					<h4 class="wc3d-customer-drawer__title">Customize Product</h4>
					<button type="button" onClick=${onClose} class="wc3d-customer-drawer__close" aria-label="Close customization panel">×</button>
				</div>
				<div class="wc3d-customer-drawer__content wc3d-scroll">
					<${CustomizerOptions} config=${config} custom=${custom} setCustom=${setCustom} palette=${palette} editable=${editable} toggleable=${toggleable} productId=${productId} variationId=${variationId} grouped=${grouped} flags=${flags} decals=${decals} />
				</div>
				<div class=${cx('wc3d-customer-drawer__footer', history && 'wc3d-customer-drawer__footer--history')}>
					${quote &&
					html`<div class="wc3d-customer-drawer__options-total" aria-live="polite">
						<span>Options</span><strong>${formatDelta(quote.options) || money(0)}</strong>
					</div>`}
					<${ShareDesignButton} productId=${productId} variationId=${variationId} custom=${custom} />
					<${DrawerTools} history=${history} setCustom=${setCustom} />
				</div>
			</div>
		</div>
	`;
}

// ── Dialog focus handling (useModalDialog) ─────────────────────────────────

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function useModalDialog(onClose, returnFocusRef) {
	const ref = useRef(null);
	useEffect(() => {
		const prev = document.activeElement;
		ref.current?.focus();
		return () => (returnFocusRef?.current || prev)?.focus?.();
	}, []);
	const onKeyDown = (e) => {
		if (e.key === 'Escape') {
			e.stopPropagation();
			e.nativeEvent?.stopImmediatePropagation?.();
			onClose();
			return;
		}
		if (e.key !== 'Tab') return;
		const items = [...ref.current.querySelectorAll(FOCUSABLE)];
		if (!items.length) return e.preventDefault();
		const first = items[0];
		const last = items[items.length - 1];
		if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	};
	return { ref, onKeyDown };
}

// ── AR QR modal (ArQrModal.tsx) ────────────────────────────────────────────

export function ArQrModal({ onClose, returnFocusRef }) {
	const dlg = useModalDialog(onClose, returnFocusRef);
	const [src, setSrc] = useState('');
	useEffect(() => {
		const t = setTimeout(() => setSrc(qrSvgUrl(location.href)), 120);
		return () => clearTimeout(t);
	}, []);
	return html`
		<${Portal}>
			<div class="wc3d-ar-modal" onKeyDown=${dlg.onKeyDown}>
				<div class="wc3d-ar-modal__backdrop" role="presentation" onClick=${onClose}></div>
				<div ref=${dlg.ref} class="wc3d-ar-modal__panel" role="dialog" aria-modal="true" aria-labelledby="wc3d-ar-title" tabindex="-1">
					<button type="button" onClick=${onClose} class="wc3d-ar-modal__close" aria-label="Close">×</button>
					<h4 id="wc3d-ar-title">Scan to view in AR</h4>
					<p>Point your phone's camera at this QR code to view the model in your space.</p>
					${src ? html`<img src=${src} alt="QR Code to view in AR" class="wc3d-ar-modal__qrcode" width="180" height="180" />` : html`<div class="wc3d-ar-modal__qrcode" aria-hidden="true"></div>`}
				</div>
			</div>
		<//>
	`;
}

/** Renders children into a <body>-level host (createPortal stand-in). */
export function Portal({ children }) {
	const host = useMemo(() => {
		const el = document.createElement('div');
		el.className = 'wc3d-portal';
		document.body.appendChild(el);
		return el;
	}, []);
	useLayoutEffect(() => {
		preactRender(children, host);
	});
	useLayoutEffect(
		() => () => {
			preactRender(null, host);
			host.remove();
		},
		[]
	);
	return null;
}

/**
 * Deterministic QR-style symbol for a string (finder, timing and alignment patterns plus
 * hashed modules). Drawn locally; not a scannable code.
 */
export function qrSvgUrl(text) {
	const N = 29;
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
	const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)), ((h ^= h >>> 16) >>> 0) / 4294967296);
	const grid = Array.from({ length: N }, () => Array(N).fill(-1));
	const finder = (r, c) => {
		for (let y = -1; y <= 7; y++)
			for (let x = -1; x <= 7; x++) {
				const yy = r + y, xx = c + x;
				if (yy < 0 || xx < 0 || yy >= N || xx >= N) continue;
				const ring = Math.max(Math.abs(y - 3), Math.abs(x - 3));
				grid[yy][xx] = y < 0 || x < 0 || y > 6 || x > 6 ? 0 : ring === 2 ? 0 : 1;
			}
	};
	finder(0, 0);
	finder(0, N - 7);
	finder(N - 7, 0);
	for (let i = 8; i < N - 8; i++) grid[6][i] = grid[i][6] = i % 2 === 0 ? 1 : 0;
	for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) grid[22 + y][22 + x] = Math.max(Math.abs(x), Math.abs(y)) === 1 ? 0 : 1;
	grid[N - 8][8] = 1;
	let rects = '';
	for (let y = 0; y < N; y++)
		for (let x = 0; x < N; x++) {
			const v = grid[y][x] === -1 ? (rnd() < 0.5 ? 1 : 0) : grid[y][x];
			if (v) rects += `M${x} ${y}h1v1h-1z`;
		}
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${N + 4} ${N + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/><path d="${rects}" fill="#000"/></svg>`;
	return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ── Download stand-in: the prototype shows a still instead of saving a file ──

function ShotModal({ shot, onClose }) {
	const dlg = useModalDialog(onClose);
	const mb = shot.size ? ` (${(shot.size / 1048576).toFixed(1)} MB)` : '';
	return html`
		<${Portal}>
			<div class="wc3d-ar-modal proto-shot" onKeyDown=${dlg.onKeyDown}>
				<div class="wc3d-ar-modal__backdrop" role="presentation" onClick=${onClose}></div>
				<div ref=${dlg.ref} class="wc3d-ar-modal__panel proto-shot__panel" role="dialog" aria-modal="true" aria-labelledby="proto-shot-title" tabindex="-1">
					<button type="button" onClick=${onClose} class="wc3d-ar-modal__close" aria-label="Close">×</button>
					<h4 id="proto-shot-title">Download 3D Model</h4>
					<img class="proto-shot__img" src=${shot.url} alt="Current view of the 3D model" />
					<p class="proto-shot__note">${protoLabel()}: the shipped plugin downloads <code>${shot.file}</code>${mb} here. This still shows the current view instead.</p>
				</div>
			</div>
		<//>
	`;
}

// ── Modal shell (#wc3d-product-modal / #wc3d-listing-modal) ────────────────

/**
 * <ViewerModal open onClose listing id>…viewer root…</ViewerModal>
 * Escape closes every open plugin modal; body.wc3d-modal-open locks page scroll; no focus trap.
 */
export function ViewerModal({ open, onClose, listing = false, id, children }) {
	useEffect(() => {
		if (!open) return;
		document.body.classList.add('wc3d-modal-open');
		const onKey = (e) => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.classList.remove('wc3d-modal-open');
		};
	}, [open]);
	return html`
		<div id=${id} class=${cx('wc3d-modal', listing && 'wc3d-listing-modal')} data-wc3d-modal hidden=${!open} role="dialog" aria-modal="true" aria-label="3D Model Viewer">
			<div class="wc3d-modal__backdrop" data-wc3d-modal-close onClick=${onClose}></div>
			<div class="wc3d-modal__panel">
				<button type="button" class="wc3d-modal__close" data-wc3d-modal-close aria-label="Close" onClick=${onClose}>×</button>
				${open ? children : html`<div class="wc3d-viewer-root"></div>`}
			</div>
		</div>
	`;
}

export default StorefrontViewer;
