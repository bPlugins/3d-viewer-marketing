// Product page (#store.product.<handle>): theme media + info columns with our app block
// "3D Configurator" (viewer per placement, customizer, price box, share, AR).
import { html, useState, useRef, useEffect, cx } from '../../js/core/ui.js';
import { store, useStore } from '../core/store.js';
import { money, moneyDelta, productByHandle, firstVariant, has3D, customizerOn, missingRequired, addToCart, createDesign, modelFor } from '../core/commerce.js';
import { ProductImage, StoreViewer, captureSnapshot } from '../ui/viewer.js';
import { Icon } from '../ui/icons.js';
import { toast } from '../ui/polaris.js';
import { StoreTheme, ProtoNote, QtyStepper, openCart } from './theme.js';
import { useHistory, customizerContext, isCustomized, CustomizerModal, CustomizerDrawer, VariantPicker, PriceBox, EMPTY } from './customizer.js';
import { ShareModal, ArModal, View3DModal } from './modals.js';

/* ---------- pending design (set by the share-link route, read once by the product page) ---------- */

const PENDING_KEY = 'sf3d-pending-design';
let pending = null;

export function setPendingDesign(code) {
	pending = code;
	try {
		sessionStorage.setItem(PENDING_KEY, code);
	} catch {
		// Blocked storage: the module variable is enough within this tab.
	}
}

function takePendingDesign(s, productId) {
	let code = pending;
	try {
		code = code || sessionStorage.getItem(PENDING_KEY);
	} catch {
		// Same as above.
	}
	const d = code ? s.designs[code] : null;
	if (!d || d.productId !== productId) return null;
	pending = null;
	try {
		sessionStorage.removeItem(PENDING_KEY);
	} catch {
		// Same as above.
	}
	return d;
}

/* ---------- helpers ---------- */

const VIEW_LABELS = { perspective: 'Angle', front: 'Front', side: 'Side', back: 'Back' };

function addRelated(s, pid) {
	const v = firstVariant(s, pid);
	if (!v) return;
	addToCart({ productId: pid, variantId: v.id, qty: 1 });
	toast(`Added to cart: ${s.products[pid].title}`);
	openCart();
}

function Collapsible({ title, icon, children, open: initial = false, onToggle }) {
	return html`<details class="sf-collapse" open=${initial} onToggle=${(e) => onToggle?.(e.currentTarget.open)}>
		<summary>${icon ? html`<${Icon} name=${icon} size=${18} />` : null}<span>${title}</span><${Icon} name="chevronDown" size=${18} class="sf-collapse__chev" /></summary>
		<div class="sf-collapse__body">${children}</div>
	</details>`;
}

function NotFound() {
	return html`<div class="sf-wrap sf-notfound">
		<h1 class="sf-h1">This product isn't available</h1>
		<p class="sf-muted">It may be a draft or no longer sold.</p>
		<a class="sf-btn sf-btn--primary" href="#store.home">Back to the shop</a>
	</div>`;
}

/**
 * The product page body. Exported for the share-link route and the theme editor preview.
 * initial = {variantId, choices, design} restores a saved design.
 */
export function ProductView({ handle, initial = null, embedded = false }) {
	const s = useStore();
	const product = productByHandle(s, handle);
	const pid = product?.id;
	const [restored] = useState(() => initial?.design || (product ? takePendingDesign(store.get(), product.id) : null));
	const [vid, setVid] = useState(() => restored?.variantId || initial?.variantId || (product ? firstVariant(s, product.id)?.id : null));
	const hist = useHistory(restored?.choices ? JSON.parse(JSON.stringify(restored.choices)) : initial?.choices || EMPTY);
	const [qty, setQty] = useState(1);
	const [czOpen, setCzOpen] = useState(false);
	const [shareCode, setShareCode] = useState(null);
	const [arOpen, setArOpen] = useState(false);
	const [quick, setQuick] = useState(false);
	const [noteOff, setNoteOff] = useState(false);
	const [missing, setMissing] = useState([]);
	const [adding, setAdding] = useState(false);
	const [eager, setEager] = useState(false);
	const [media, setMedia] = useState('3d');
	const [tab3d, setTab3d] = useState(false);
	const [restoreNote, setRestoreNote] = useState(!!restored);
	const live = useRef(false);
	const ctl = useRef(null);
	const pendingView = useRef(null);
	const mediaRef = useRef(null);

	useEffect(() => {
		if (missing.length && product) setMissing(missingRequired(s, pid, vid, customizerContext(s, pid, vid, hist).clean));
	}, [JSON.stringify(hist.value)]);

	if (!product || product.status !== 'active' || !s.variants[vid]) return html`<${NotFound} />`;

	const st = s.app.settings;
	const blocks = s.app.blocks?.product || [];
	const modelOk = has3D(s, pid);
	const show3D = modelOk && (s.app.embedEnabled || blocks.includes('configurator'));
	const czOn = show3D && customizerOn(s, pid);
	const ctx = customizerContext(s, pid, vid, hist);
	const variant = ctx.variant;
	const placement = st.placement || 'replace_image';
	const aspect = st.aspect || '1 / 1';
	const toolbar = st.toolbar || {};
	const priced = czOn && ctx.sum.addons !== 0;
	const choicesForCart = czOn ? ctx.clean : null;
	// The drawer needs the page viewer on screen; other placements use the dialog.
	const layout = st.customizer_layout === 'modal' && s.app.modules['customizer-modal'] ? 'modal' : placement === 'replace_image' || placement === 'gallery_first' ? 'drawer' : 'modal';
	const views = ctx.cfg.gallery_presets ? Object.entries(ctx.cfg.gallery_presets).filter(([k]) => VIEW_LABELS[k]) : [];
	const setChoices = (next, key) => hist.set(next, key);

	const openCustomizer = () => {
		if (layout === 'drawer') {
			if (!live.current) setEager(true);
			setMedia('3d');
			if (window.innerWidth < 760) mediaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
		setCzOpen(true);
	};

	const add = async (fromCustomizer) => {
		const miss = czOn ? missingRequired(s, pid, vid, ctx.clean) : [];
		if (miss.length) {
			setMissing(miss);
			if (!fromCustomizer) openCustomizer();
			return;
		}
		setMissing([]);
		setAdding(true);
		let snapshot = null;
		if (czOn && isCustomized(ctx.clean) && s.app.modules['order-snapshot']) {
			try {
				snapshot = await captureSnapshot(pid, vid, ctx.clean, 600);
			} catch {
				snapshot = null;
			}
		}
		addToCart({ productId: pid, variantId: vid, qty, choices: choicesForCart, snapshot });
		setAdding(false);
		setCzOpen(false);
		toast(`Added to cart: ${product.title}${isCustomized(choicesForCart) ? ' (customized)' : ''}`);
		openCart();
	};

	const share = () => {
		const code = createDesign({ productId: pid, variantId: vid, choices: ctx.clean, kind: 'saved', customerId: s.demo.customerId, name: '' });
		setShareCode(code);
	};

	const goView = (key) => {
		const v = ctx.cfg.gallery_presets[key];
		setMedia('3d');
		if (ctl.current) ctl.current.setCamera(v, { animate: true });
		else {
			pendingView.current = v;
			setEager(true);
		}
	};

	const viewer = (extraCls = '') => html`<${StoreViewer}
		key=${eager ? 'eager' : 'poster'}
		productId=${pid}
		variantId=${vid}
		choices=${ctx.clean}
		custom=${ctx.custom}
		trigger=${eager ? 'eager' : st.loading_trigger || 'click'}
		toolbar=${toolbar}
		style=${{ aspectRatio: aspect }}
		class=${cx('sf-pviewer', extraCls)}
		onReady=${(c) => {
			live.current = true;
			ctl.current = c;
			if (pendingView.current) {
				c.setCamera(pendingView.current, { animate: false });
				pendingView.current = null;
			}
		}}
		onAR=${() => setArOpen(true)}
		onCart=${(id) => addRelated(store.get(), id)}
	/>`;

	const still = (cls = '') => html`<div class=${cx('sf-pstill', cls)} style=${{ aspectRatio: aspect }}><${ProductImage} productId=${pid} variantId=${vid} fluid /></div>`;

	const viewChips = views.length && show3D
		? html`<div class="sf-views" role="group" aria-label="Views">${views.map(([k]) => html`<button type="button" class="sf-chip" onClick=${() => goView(k)}>${VIEW_LABELS[k]}</button>`)}</div>`
		: null;

	let mediaCol;
	if (!show3D) {
		mediaCol = html`${modelOk && !noteOff
				? html`<${ProtoNote} tag="App embed · 3D core" title="3D is off" onDismiss=${() => setNoteOff(true)}>
						This product has a 3D model, but the shop hasn't switched on the app. <a href="#theme.editor">Turn on the app embed in the theme editor</a>, or add the "3D Configurator" block to the product template.
					<//>`
				: null}
			${still()}`;
	} else if (placement === 'gallery_first') {
		mediaCol = html`<div class="sf-stack" aria-label="Product media">
			<div class="sf-stack__item">${viewer()}</div>
			<div class="sf-stack__item">${still()}</div>
		</div>
		<p class="sf-stack__hint sf-small sf-muted">Swipe for photos</p>
		${viewChips}`;
	} else if (placement === 'modal') {
		mediaCol = html`<div class="sf-pmodal">
			${still()}
			<button type="button" class="sf-btn sf-btn--onmedia" onClick=${() => setQuick(true)}><${Icon} name="cube" size=${18} /> View in 3D</button>
		</div>`;
	} else if (placement === 'block_only') {
		mediaCol = still();
	} else {
		mediaCol = html`${media === '3d' ? viewer() : still()}
			<div class="sf-thumbs" role="group" aria-label="Media">
				<button type="button" class=${cx('sf-thumb', media === '3d' && 'is-on')} onClick=${() => setMedia('3d')} aria-label="3D model" aria-pressed=${String(media === '3d')}>
					<${ProductImage} productId=${pid} variantId=${vid} size=${64} choices=${ctx.clean} /><span class="sf-thumb__badge"><${Icon} name="cube" size=${12} /> 3D</span>
				</button>
				<button type="button" class=${cx('sf-thumb', media === 'photo' && 'is-on')} onClick=${() => setMedia('photo')} aria-label="Photo" aria-pressed=${String(media === 'photo')}>
					<${ProductImage} productId=${pid} variantId=${vid} size=${64} />
				</button>
				${media === '3d' ? viewChips : null}
			</div>`;
	}

	const urlText = `/products/${product.handle}${product.variants.length > 1 ? `?variant=${vid}` : ''}${restored ? `${product.variants.length > 1 ? '&' : '?'}3d_design=${restored.code}` : ''}`;

	return html`<div class="sf-wrap sf-product">
		<div class="sf-crumbs">
			<nav aria-label="Breadcrumb"><a href="#store.home">Home</a><span aria-hidden="true">/</span><a href="#store.home">${product.type}</a><span aria-hidden="true">/</span><span>${product.title}</span></nav>
			<code class="sf-url" title="The theme keeps the URL in sync with the selected variant">${urlText}</code>
		</div>
		<div class="sf-product__grid">
			<div class="sf-product__media" ref=${mediaRef}>${mediaCol}</div>
			<div class="sf-product__info">
				<p class="sf-eyebrow">${product.vendor}</p>
				<h1 class="sf-h1">${product.title}</h1>
				<div class="sf-pprice" aria-live="polite">
					<span class="sf-pprice__now">${money(priced ? ctx.sum.total : variant.price)}</span>
					${priced ? html`<span class="sf-pprice__note">Includes options ${moneyDelta(ctx.sum.addons)}</span>` : null}
				</div>
				<p class="sf-small sf-muted">Taxes included. Shipping calculated at checkout.</p>

				${restored && restoreNote
					? html`<div class="sf-restored" role="status">
							<${Icon} name="sparkle" size=${18} />
							<div><strong>Saved design opened</strong><span>${restored.name || 'Shared design'} · ${restored.code}</span></div>
							<button type="button" class="sf-link sf-small" onClick=${() => { hist.reset(); setRestoreNote(false); }}>Start over</button>
						</div>`
					: null}

				<${VariantPicker} s=${s} product=${product} variant=${variant} onVariant=${setVid} />

				<div class="sf-buy">
					<div class="sf-buy__row">
						<${QtyStepper} value=${qty} onChange=${setQty} label=${`${product.title} quantity`} />
						<button type="button" class="sf-btn sf-btn--primary sf-buy__add" onClick=${() => add(false)} disabled=${adding}>${adding ? 'Adding…' : 'Add to cart'}</button>
					</div>
					${czOn
						? html`<button type="button" class="sf-btn sf-btn--secondary sf-btn--full sf-buy__cz" onClick=${openCustomizer}>
								<${Icon} name="palette" size=${18} /> ${isCustomized(ctx.clean) ? 'Edit your design' : 'Customize'}
							</button>`
						: null}
					${missing.length && !czOpen ? html`<p class="sf-cz__err" role="alert">Still to choose: ${missing.join(', ')}.</p>` : null}
				</div>

				${czOn && ctx.sum.lines.length ? html`<${PriceBox} sum=${ctx.sum} />` : null}
				${czOn && isCustomized(ctx.clean) && s.app.modules['saved-designs']
					? html`<button type="button" class="sf-link sf-sharelink" onClick=${share}><${Icon} name="share" size=${16} /> Save & share design</button>`
					: null}

				${blocks.includes('button') && modelOk
					? html`<button type="button" class="sf-btn sf-btn--ghost sf-btn--full" onClick=${() => setQuick(true)}><${Icon} name="cube" size=${18} /> View in 3D</button>`
					: null}

				<p class="sf-pdesc">${product.description}</p>

				<div class="sf-collapses">
					${show3D && placement === 'block_only'
						? html`<${Collapsible} title="3D view" icon="cube" onToggle=${setTab3d}>${tab3d ? viewer('sf-pviewer--tab') : null}<//>`
						: null}
					<${Collapsible} title="Materials and care" icon="layers"><p>Wipe with a soft, damp cloth. Keep out of direct sunlight to protect the finish. Removable covers wash at 30°C.</p><//>
					<${Collapsible} title="Delivery and returns" icon="bag"><p>Free delivery over ${money(500)}. Ships in 5 to 7 working days. Return within 30 days in original condition.</p><//>
				</div>

				${blocks.includes('viewer') && s.products[1002] && pid !== 1002
					? html`<section class="sf-anyviewer">
							<h2 class="sf-h3">Pairs well with</h2>
							<${StoreViewer} productId=${1002} variantId=${firstVariant(s, 1002)?.id} trigger=${st.loading_trigger || 'click'} toolbar=${{ ...toolbar, ar: false }} style=${{ aspectRatio: '4 / 3' }} />
							<a class="sf-link" href="#store.product.arc-table-lamp">${s.products[1002].title} · ${money(s.products[1002].price)}</a>
						</section>`
					: null}
			</div>
		</div>

		${czOn && layout === 'modal'
			? html`<${CustomizerModal} open=${czOpen} onClose=${() => setCzOpen(false)} ctx=${ctx} setChoices=${setChoices} onVariant=${setVid} qty=${qty} setQty=${setQty} onAdd=${() => add(true)} adding=${adding} missing=${missing} onShare=${s.app.modules['saved-designs'] ? share : null} onAR=${() => setArOpen(true)} onCart=${(id) => addRelated(store.get(), id)} />`
			: null}
		${czOn && layout === 'drawer'
			? html`<${CustomizerDrawer} open=${czOpen} onClose=${() => setCzOpen(false)} ctx=${ctx} setChoices=${setChoices} qty=${qty} setQty=${setQty} onAdd=${() => add(true)} adding=${adding} missing=${missing} onShare=${s.app.modules['saved-designs'] ? share : null} />`
			: null}
		${shareCode ? html`<${ShareModal} code=${shareCode} onClose=${() => setShareCode(null)} />` : null}
		${arOpen ? html`<${ArModal} productId=${pid} variantId=${vid} choices=${ctx.clean} onClose=${() => setArOpen(false)} />` : null}
		${quick ? html`<${View3DModal} productId=${pid} variantId=${vid} choices=${czOn ? ctx.clean : null} onClose=${() => setQuick(false)} />` : null}
		${embedded ? null : html`<div class="sf-proto-foot"><${ProtoNote} tag="App block · 3D Configurator">
			Placement <strong>${placement.replace('_', ' ')}</strong>, loading on <strong>${st.loading_trigger}</strong>, customizer <strong>${czOn ? layout : 'off'}</strong>. Change these in the <a href="#theme.editor">theme editor</a> or the app's <a href="#admin.settings">settings</a>. Model: ${modelFor(s, pid, vid).file?.filename || 'none'}.
		<//></div>`}
	</div>`;
}

export default function ProductScreen({ params }) {
	return html`<${StoreTheme}><${ProductView} handle=${params[0] || 'lounge-chair'} /><//>`;
}
