// 3D order preview in an app window: the frozen design, loaded eagerly (/app/orders/:id/preview).
import { html, useState, useRef } from '../../js/core/ui.js';
import { useStore } from '../core/store.js';
import { money, modelFor, configuredConfig, visibleProps } from '../core/commerce.js';
import { AppWindow, Button, Badge, Modal, Text, Icon, toast } from '../ui/polaris.js';
import { Viewer3D, DesignImage } from '../ui/viewer.js';
import { copyText, CopyFallback } from './designs.js';

const VIEWS = [
	{ id: 'perspective', label: 'Perspective' },
	{ id: 'front', label: 'Front' },
	{ id: 'side', label: 'Side' },
	{ id: 'back', label: 'Back' },
];

export default function Preview({ params }) {
	const s = useStore();
	const o = s.orders[Number(params[0])];
	const line = o?.lines.find((l) => l.id === Number(params[1])) || o?.lines.find((l) => l.designCode);
	const ctl = useRef(null);
	const [ready, setReady] = useState(false);
	const [view, setView] = useState('perspective');
	const [snapOpen, setSnapOpen] = useState(false);
	const [fallback, setFallback] = useState(null);

	if (!o || !line) {
		return html`<${AppWindow} title="Order preview" exitHref="#admin.orders"><div class="x-missing"><h2>This order line has no 3D design</h2><a href="#admin.orders">Back to orders</a></div><//>`;
	}
	const p = s.products[line.productId];
	const v = s.variants[line.variantId];
	const design = s.designs[line.designCode] || { productId: line.productId, variantId: line.variantId, choices: null };
	const { model } = modelFor(s, line.productId, line.variantId);
	const config = configuredConfig(s, line.productId, line.variantId, design.choices);
	const presets = config.gallery_presets || {};
	const add = line.addons.reduce((t, a) => t + a.amount, 0);

	const goView = (id) => {
		setView(id);
		const c = ctl.current;
		if (!c) return;
		c.setCamera(presets[id] || c.getAutoView(id), { animate: true });
	};
	const copy = async () => ((await copyText(line.designCode)) ? toast('Design code copied') : setFallback(line.designCode));

	return html`
		<${AppWindow} title=${`Order ${o.name} · ${p?.title}`} exitHref=${`#admin.order.${o.id}`} badge=${html`<${Badge} tone="info">Frozen<//>`}>
			<div class="as-preview">
				<div class="as-preview__stage">
					${model
						? html`<${Viewer3D}
								class="as-preview__canvas"
								model=${model}
								config=${config}
								onReady=${(c) => {
									ctl.current = c;
									setReady(true);
								}}
							/>`
						: html`<div class="as-preview__nomodel"><${Text} tone="subdued">The 3D model for this product was removed. The snapshot still shows what was ordered.<//></div>`}
					${model && !ready ? html`<div class="as-preview__loading"><span class="x-pimg__spin"></span>Loading the ordered design…</div>` : null}
					<div class="as-preview__views" role="group" aria-label="Camera views">
						${VIEWS.map((x) => html`<button type="button" class=${view === x.id ? 'is-on' : ''} aria-pressed=${String(view === x.id)} disabled=${!ready} onClick=${() => goView(x.id)}>${x.label}</button>`)}
					</div>
				</div>
				<aside class="as-preview__panel">
					<div class="as-preview__head">
						<${Text} variant="headingLg">${p?.title}<//>
						<${Text} tone="subdued">${v && v.title !== 'Default Title' ? `${v.title} · ` : ''}Qty ${line.qty} · Order ${o.name}<//>
					</div>
					<div class="as-preview__section">
						<h3>Configuration</h3>
						<dl class="as-oblock__rows">${visibleProps(line.properties).map((pr) => html`<div><dt>${pr.name}</dt><dd>${pr.value}</dd></div>`)}</dl>
					</div>
					<div class="as-preview__section">
						<h3>Price</h3>
						<ul class="as-oblock__addons">
							<li><span>${p?.title}${v && v.title !== 'Default Title' ? ` / ${v.title}` : ''}</span><span class="as-num">${money(line.base)}</span></li>
							${line.addons.map((a) => html`<li><span>${a.label}</span><span class="as-num">+${money(a.amount)}</span></li>`)}
							<li class="is-strong"><span>Each</span><span class="as-num">${money(line.base + add)}</span></li>
							${line.qty > 1 ? html`<li class="is-strong"><span>Line total (× ${line.qty})</span><span class="as-num">${money((line.base + add) * line.qty)}</span></li>` : null}
						</ul>
					</div>
					<div class="as-preview__section">
						<h3>Design code</h3>
						<div class="as-preview__code"><span class="as-mono">${line.designCode}</span><${Button} size="slim" icon="copy" onClick=${copy}>Copy<//></div>
					</div>
					<div class="as-preview__section">
						<h3>Snapshot</h3>
						<button type="button" class="as-preview__snap" onClick=${() => setSnapOpen(true)} aria-label="Open snapshot">
							${line.snapshot ? html`<img src=${line.snapshot} alt="" width="72" height="72" />` : html`<${DesignImage} design=${design} size=${72} />`}
							<span>Open snapshot</span>
						</button>
					</div>
					<p class="as-preview__frozen"><${Icon} name="lock" size=${14} /> Configuration frozen at checkout. Later edits to the product don't change it.</p>
				</aside>
			</div>
			<${Modal} open=${snapOpen} title=${`Snapshot · ${o.name}`} onClose=${() => setSnapOpen(false)} secondaryActions=${[{ content: 'Close', onAction: () => setSnapOpen(false) }]}>
				<div class="as-snap-full">${line.snapshot ? html`<img src=${line.snapshot} alt=${`Snapshot of ${p?.title}`} />` : html`<${DesignImage} design=${design} fluid />`}</div>
				<${Text} tone="subdued" variant="caption">Captured when the shopper added the product to the cart (600 × 600).<//>
			<//>
			<${CopyFallback} title="Copy design code" text=${fallback} onClose=${() => setFallback(null)} />
		<//>
	`;
}
