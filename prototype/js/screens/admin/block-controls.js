// block: product picker and option lists shared by the Site Editor and Elementor mocks.
import { html, useState, cx } from '../../core/ui.js';
import { useStore } from '../../core/store.js';
import { is3DAvailable } from '../../shared/product-3d.js';
import { ProductImage } from '../../shared/product-image.js';

export const TYPE_NAMES = { simple: 'Simple product', variable: 'Variable product', grouped: 'Grouped product', external: 'External/Affiliate product' };

export const variationLabel = (v) => Object.values(v?.attributes || {}).join(', ') || '#' + v?.id;

/** Variation <option>s for a picked product: "Default" then each variation. */
export function variationOptions(state, productId) {
	const p = state.products?.[productId];
	if (!p || p.type !== 'variable') return [];
	return [[0, 'Default'], ...p.variations.map((id) => state.variations?.[id]).filter(Boolean).map((v) => [v.id, variationLabel(v)])];
}

/** Search-as-you-type product picker (block: ProductControl, Elementor: select2 query control). */
export function ProductSearch({ value, onChange, cls = 'wpse', label = 'Product' }) {
	const state = useStore();
	const [q, setQ] = useState('');
	const [open, setOpen] = useState(!value);
	const picked = value ? state.products?.[value] : null;
	const needle = q.trim().toLowerCase();
	const list = Object.values(state.products || {})
		.filter((p) => p.status === 'publish')
		.filter((p) => !needle || p.name.toLowerCase().includes(needle) || String(p.id) === needle || String(p.sku || '').toLowerCase().includes(needle));

	if (picked && !open) {
		const ok = is3DAvailable(state, picked.id);
		return html`<div class=${cls + '-picked'}>
			<${ProductImage} product=${picked} size=${80} class=${cls + '-picked__img'} alt="" />
			<div class=${cls + '-picked__main'}>
				<strong>${picked.name}</strong>
				<span>#${picked.id} · ${TYPE_NAMES[picked.type] || picked.type}</span>
				${!ok && html`<span class=${cls + '-warn'}>No 3D model</span>`}
			</div>
			<button type="button" class=${cls + '-link'} onClick=${() => setOpen(true)}>Change</button>
		</div>`;
	}
	const id = cls + '-product-search';
	return html`<div class=${cls + '-search'}>
		<label class=${cls + '-label'} for=${id}>${label}</label>
		<input id=${id} type="search" class=${cls + '-input'} placeholder="Search products" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} autocomplete="off" />
		<ul class=${cls + '-results'} role="listbox" aria-label="Products">
			${list.length
				? list.map((p) => {
						const ok = is3DAvailable(state, p.id);
						return html`<li key=${p.id}>
							<button type="button" role="option" aria-selected=${p.id === value} class=${cx(cls + '-result', p.id === value && 'is-selected')} onClick=${() => (onChange(p.id), setOpen(false), setQ(''))}>
								<span class=${cls + '-result__name'}>${p.name}</span>
								<span class=${cls + '-result__meta'}>#${p.id}${ok ? '' : html` · <span class=${cls + '-warn'}>No 3D model</span>`}</span>
							</button>
						</li>`;
					})
				: html`<li class=${cls + '-results__none'}>No products found.</li>`}
		</ul>
		${picked && html`<button type="button" class=${cls + '-link'} onClick=${() => setOpen(false)}>Cancel</button>`}
	</div>`;
}
