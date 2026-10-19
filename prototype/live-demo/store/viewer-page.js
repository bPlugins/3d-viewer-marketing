// Storefront page (#store.viewer[.<id>]) in the demo theme: the published 3D Viewer posts, one block each,
// like a page built with the 3D Viewer block. With an id it shows just that viewer (View; `.preview` = the editor's unsaved edits).
import { html } from '../../js/core/ui.js';
import { useStore } from '../../js/core/store.js';
import { StoreTheme } from '../../js/screens/store/theme.js';
import { ViewerBlock } from '../viewer/render.js';

/** The editor's unsaved edits for `id`, written by its Preview link (viewer/edit.js). */
function previewOf(id) {
	try {
		const p = JSON.parse(localStorage.getItem('bp3d-live-demo-preview') || 'null');
		return p && String(p.id) === String(id) ? p : null;
	} catch {
		return null;
	}
}

function Section({ viewer, titled = true }) {
	return html`<section class="ld-sv-section" id=${'viewer-' + viewer.id}>
		${titled && html`<h2 class="ld-sv-section__title">${viewer.title || '(no title)'}</h2>`}
		<div class="ld-sv-block wp-block-b3dviewer-modelviewer">
			<${ViewerBlock} key=${viewer.id + (viewer.modified || '')} attrs=${viewer.attrs || {}} />
		</div>
	</section>`;
}

export default function ViewerPage({ params = [] }) {
	const viewers = useStore((s) => s.viewers || {});
	const id = params[0];

	if (id) {
		const draft = params[1] === 'preview' ? previewOf(id) : null;
		const saved = viewers[id];
		const viewer = draft && saved?.status !== 'trash' ? { ...(saved || { status: 'draft' }), id, title: draft.title, attrs: draft.attrs, modified: 'preview' } : saved;
		if (!viewer || viewer.status === 'trash') {
			return html`<${StoreTheme} crumbs=${[['Home', '#store.shop'], ['Page not found']]}>
				<div class="st-404">
					<h1>Oops! That page can’t be found.</h1>
					<p>It looks like nothing was found at this location.</p>
					<p><a class="button" href="#store.viewer">Back to 3D Showcase</a></p>
				</div>
			<//>`;
		}
		return html`<${StoreTheme} crumbs=${[['Home', '#store.shop'], ['3D Showcase', '#store.viewer'], [viewer.title || '(no title)']]}>
			<article class="ld-sv">
				<header class="ld-sv-head">
					<h1 class="entry-title">${viewer.title || '(no title)'}</h1>
				</header>
				<${Section} viewer=${viewer} titled=${false} />
				<p class="ld-sv-foot"><a href="#store.viewer">← All 3D viewers</a><span aria-hidden="true"> · </span><a href="#store.shop">Visit the shop</a></p>
			</article>
		<//>`;
	}

	const list = Object.values(viewers)
		.filter((v) => v.status === 'publish')
		.sort((a, b) => String(b.date).localeCompare(String(a.date)));

	return html`<${StoreTheme} crumbs=${[['Home', '#store.shop'], ['3D Showcase']]}>
		<article class="ld-sv">
			<header class="ld-sv-head">
				<h1 class="entry-title">3D Showcase</h1>
				<p class="ld-sv-lead">Every published 3D viewer on this site, added to this page with the 3D Viewer block. Drag to rotate, scroll or pinch to zoom.</p>
			</header>
			${list.length
				? list.map((v) => html`<${Section} key=${v.id} viewer=${v} />`)
				: html`<p class="ld-sv-empty">No 3D viewers are published yet.</p>`}
			<p class="ld-sv-foot"><a class="button" href="#store.shop">Visit the shop</a></p>
		</article>
	<//>`;
}
