// block: a WordPress page (#store.page.<slug>) built with blocks or Elementor, showing viewer blocks/widgets.
import { html } from '../../core/ui.js';
import { useStore } from '../../core/store.js';
import { useFeature } from '../../core/features.js';
import { pageBySlug } from '../../shared/block.js';
import { StoreTheme } from './theme.js';
import { PageBlocks, ElementorContent } from './block-theme.js';

export function FlagOff() {
	return html`<div class="bt-flagoff">
		<p><strong>Turn on the Product viewer block feature</strong> to see this screen.</p>
		<p>Turn on "Product viewer block" in <a href="#admin.settings.modules">WooCommerce → 3D Models → Settings → Features</a>.</p>
	</div>`;
}

export default function PageScreen({ params }) {
	const on = useFeature('block');
	const state = useStore();
	const page = on ? pageBySlug(state, params?.[0] || '') : null;
	if (!on) return html`<${StoreTheme} crumbs=${[['Home', '#store.shop'], ['Page']]}><${FlagOff} /><//>`;
	if (!page) {
		return html`<${StoreTheme} crumbs=${[['Home', '#store.shop'], ['Page not found']]}>
			<div class="st-404">
				<h1>Oops! That page can’t be found.</h1>
				<p>It looks like nothing was found at this location.</p>
				<p><a class="button" href="#store.shop">Return to shop</a></p>
			</div>
		<//>`;
	}
	const edit = page.builder === 'elementor' ? '#admin.elementor.' + page.id : '#admin.site-editor.page.' + page.id;
	return html`<${StoreTheme} crumbs=${[['Home', '#store.shop'], [page.title]]}>
		<article class=${'page type-page bt-page' + (page.builder === 'elementor' ? ' bt-page--elementor' : '')}>
			<header class="entry-header bt-page__head">
				<h1 class="entry-title">${page.title}</h1>
				<a class="bt-page__edit" href=${edit}>${page.builder === 'elementor' ? 'Edit with Elementor' : 'Edit page'}</a>
			</header>
			${page.builder === 'elementor' ? html`<${ElementorContent} widgets=${page.elementor} />` : html`<${PageBlocks} blocks=${page.blocks} />`}
		</article>
	<//>`;
}
