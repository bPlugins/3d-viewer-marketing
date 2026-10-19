// gallery-lane compare page (prototype only): the shipped strip layout next to the proposed one,
// on the same product at several canvas widths. Each viewer is a live, interactive copy.
import { html, useState, cx } from '../core/ui.js';
import { useStore } from '../core/store.js';
import { StorefrontViewer } from './store/viewer-ui.js';

const WIDTHS = [300, 360, 430, 510, 600, 700];
const PRODUCT_ID = 101; // Lounge chair: View in AR + Customize, the case that lifted the strip

function Chip({ on, onClick, children }) {
	return html`<button type="button" class="proto-lane__chip" aria-pressed=${on} onClick=${onClick}>${children}</button>`;
}

function Frame({ width, lane, layout }) {
	return html`
		<figure class=${cx('proto-lane__figure', lane && 'proto-lane__figure--new')} style=${{ width: width + 'px' }}>
			<figcaption>${lane ? 'Proposed' : 'Now'}</figcaption>
			<${StorefrontViewer}
				productId=${PRODUCT_ID}
				mode="inline"
				galleryLane=${lane}
				overrides=${{ loadingTrigger: 'eager', customizerModal: layout === 'modal' }}
				style="aspect-ratio:1/1;min-height:0;height:auto;margin:0;"
			/>
		</figure>
	`;
}

export default function GalleryLane() {
	const [widths, setWidths] = useState([360, 510, 700]);
	const [layout, setLayout] = useState('drawer');
	const product = useStore((s) => s.products?.[PRODUCT_ID]);
	const toggle = (w) => setWidths((list) => (list.includes(w) ? list.filter((x) => x !== w) : [...list, w].sort((a, b) => a - b)));
	return html`
		<div class="proto-lane">
			<div class="proto-lane__inner">
				<span class="proto-bar__brand">Prototype</span>
				<h1>Gallery strip placement</h1>
				<p class="proto-lane__lead">
					${product?.name || 'Product'} at different canvas widths. <strong>Now</strong> lifts the strip over the model when View in AR and
					Customize would touch it. <strong>Proposed</strong> keeps it on the bottom row: centred when there is room, pushed into the space
					between the buttons and fullscreen when not, smaller thumbnails before that, and a column above fullscreen as the last resort.
					Open Customize to see the canvas shrink beside the drawer.
				</p>
				<div class="proto-lane__controls">
					<div class="proto-lane__group" role="group" aria-label="Canvas widths">
						<span class="proto-lane__label">Canvas width</span>
						${WIDTHS.map((w) => html`<${Chip} key=${w} on=${widths.includes(w)} onClick=${() => toggle(w)}>${w}px<//>`)}
					</div>
					<div class="proto-lane__group" role="group" aria-label="Customize opens">
						<span class="proto-lane__label">Customize opens</span>
						<${Chip} on=${layout === 'drawer'} onClick=${() => setLayout('drawer')}>Drawer<//>
						<${Chip} on=${layout === 'modal'} onClick=${() => setLayout('modal')}>Modal<//>
					</div>
				</div>
				${widths.map(
					(w) => html`
						<section key=${w + layout} class="proto-lane__row">
							<h2>${w}px canvas</h2>
							<div class="proto-lane__pair">
								<${Frame} width=${w} lane=${false} layout=${layout} />
								<${Frame} width=${w} lane=${true} layout=${layout} />
							</div>
						</section>
					`
				)}
			</div>
		</div>
	`;
}
