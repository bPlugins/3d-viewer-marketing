// Native Admin › Products list, with a small 3D marker on products our app renders in 3D.
import { html, useState } from '../../js/core/ui.js';
import { useStore } from '../core/store.js';
import { has3D, variantsOf } from '../core/commerce.js';
import { AdminFrame } from './chrome.js';
import { Page, Card, Badge, Tabs, IndexTable, Icon, toast } from '../ui/polaris.js';
import { ProductImage } from '../ui/viewer.js';

export default function Catalog() {
	const s = useStore();
	const [tab, setTab] = useState('all');
	const [sel, setSel] = useState([]);
	const all = Object.values(s.products).filter((p) => tab === 'all' || p.status === tab);

	const rows = all.map((p) => {
		const n = variantsOf(s, p.id).length;
		return {
			id: p.id,
			href: `#admin.product.${p.id}`,
			cells: [
				html`<div class="as-prod">
					<${ProductImage} productId=${p.id} size=${40} />
					<div class="as-prod__text">
						<a class="as-prod__title" href=${`#admin.product.${p.id}`}>${p.title}</a>
						${has3D(s, p.id) ? html`<span class="as-3d" title="Shown in 3D by 3D Configurator"><${Icon} name="cube" size=${12} />3D</span>` : null}
					</div>
				</div>`,
				p.status === 'active' ? html`<${Badge} tone="success">Active<//>` : html`<${Badge} tone="info">Draft<//>`,
				html`<span class=${p.inventory < 10 ? 'as-low' : ''}>${p.inventory} in stock${n > 1 ? ` for ${n} variants` : ''}</span>`,
				p.type,
				p.vendor,
			],
		};
	});

	return html`
		<${AdminFrame} current="products">
			<${Page} title="Products" width="full" secondaryActions=${[{ content: 'Export', disabled: true }, { content: 'Import', disabled: true }]} primaryAction=${{ content: 'Add product', disabled: true }}>
				<${Card} flush>
					<div class="as-tablebar">
						<${Tabs} tabs=${[{ id: 'all', label: 'All' }, { id: 'active', label: 'Active' }, { id: 'draft', label: 'Draft' }]} selected=${tab} onSelect=${(t) => { setTab(t); setSel([]); }} />
					</div>
					<${IndexTable} headings=${['Product', 'Status', 'Inventory', 'Type', 'Vendor']} rows=${rows} selectable selected=${sel} onSelectionChange=${setSel} bulkActions=${[{ content: 'Bulk edit', onAction: () => toast('Bulk editing is outside this prototype') }]} />
				<//>
			<//>
		<//>
	`;
}
