// Native admin product page with our admin action ("Edit in 3D") and product-details block extension.
import { html, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { store, useStore } from '../core/store.js';
import { go } from '../core/router.js';
import { money, variantsOf, nowStr, rulesFor } from '../core/commerce.js';
import { AdminFrame } from './chrome.js';
import { Card, Button, Badge, Switch, TextField, Select, DescriptionList, SurfaceTag, Text, Icon, SaveBar, toast } from '../ui/polaris.js';
import { ProductImage } from '../ui/viewer.js';
import { fileMB, publishState } from './products.js';
import { fmtDate } from './orders.js';

/** Admin UI extension frame: app icon, app name and the target it renders in. */
export function ExtBlock({ target, title = '3D Configurator', children }) {
	return html`
		<section class="p-card as-ext">
			<header class="as-ext__head">
				<span class="p-appicon p-appicon--sm"><${Icon} name="cube" size=${14} /></span>
				<span class="as-ext__name">${title}</span>
				<${SurfaceTag}>${target}<//>
			</header>
			<div class="as-ext__body">${children}</div>
		</section>
	`;
}

/** Native "More actions" menu; app actions appear under the app's name, as admin action extensions do. */
function MoreActions({ pid }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	useEffect(() => {
		if (!open) return;
		const off = (e) => !ref.current?.contains(e.target) && setOpen(false);
		document.addEventListener('pointerdown', off);
		return () => document.removeEventListener('pointerdown', off);
	}, [open]);
	return html`
		<div class="as-menu" ref=${ref}>
			<${Button} onClick=${() => setOpen(!open)} pressed=${open}>More actions <${Icon} name="chevronDown" size=${14} /><//>
			${open
				? html`<div class="as-menu__pop" role="menu">
						<button type="button" role="menuitem" class="as-menu__item is-inert" disabled>Duplicate</button>
						<button type="button" role="menuitem" class="as-menu__item is-inert" disabled>View on Online Store</button>
						<p class="as-menu__group">Apps</p>
						<button type="button" role="menuitem" class="as-menu__item" onClick=${() => go(`admin.editor.${pid}`)}>
							<span class="p-appicon p-appicon--xs"><${Icon} name="cube" size=${11} /></span>Edit in 3D
						</button>
						<p class="as-menu__hint"><${SurfaceTag}>admin.product-details.action.render<//></p>
					</div>`
				: null}
		</div>
	`;
}

export default function Product({ params }) {
	const s = useStore();
	const pid = Number(params[0]);
	const p = s.products[pid];
	const [draft, setDraft] = useState(null);
	useEffect(() => setDraft(null), [pid]);
	if (!p) return html`<${AdminFrame} current="products"><div class="x-missing"><h2>Product not found</h2><a href="#admin.catalog">Back to products</a></div><//>`;

	const cfg = s.configs[pid];
	const file = cfg?.modelFileId ? s.files[cfg.modelFileId] : null;
	const vs = variantsOf(s, pid);
	const single = vs.length === 1 && vs[0].title === 'Default Title';
	const form = draft || { title: p.title, description: p.description, status: p.status };
	const dirty = !!draft && (draft.title !== p.title || draft.description !== p.description || draft.status !== p.status);
	const pub = publishState(cfg);
	const media = (p.media || []).map((id) => s.files[id]).filter(Boolean);

	const toggle3D = (on) => {
		const now = nowStr();
		store.patch(['configs', pid], (c) => ({ ...c, enabled: on, updatedAt: now, publishedAt: now }));
		toast(on ? '3D turned on' : '3D turned off');
	};
	const save = () => {
		store.patch(['products', pid], (x) => ({ ...x, title: draft.title.trim() || x.title, description: draft.description, status: draft.status }));
		setDraft(null);
		toast('Product saved');
	};

	return html`
		<${AdminFrame} current="products">
			<${SaveBar} dirty=${dirty} onSave=${save} onDiscard=${() => setDraft(null)} message="Unsaved product changes" />
			<div class="p-page p-page--default">
				<header class="p-page__head">
					<a class="p-page__back" href="#admin.catalog" aria-label="Back to products"><${Icon} name="arrowLeft" size=${18} /></a>
					<div class="p-page__titles">
						<h1 class="p-page__title">${p.title} ${p.status === 'active' ? html`<${Badge} tone="success">Active<//>` : html`<${Badge} tone="info">Draft<//>`}</h1>
					</div>
					<div class="p-page__actions">
						<${MoreActions} pid=${pid} />
					</div>
				</header>
				<div class="p-layout">
					<div class="p-layout__main">
						<${Card}>
							<${TextField} label="Title" value=${form.title} onInput=${(v) => setDraft({ ...form, title: v })} />
							<${TextField} label="Description" multiline=${4} value=${form.description} onInput=${(v) => setDraft({ ...form, description: v })} />
						<//>
						<${Card} title="Media">
							<div class="as-media">
								<div class="as-media__tile as-media__tile--lead"><${ProductImage} productId=${pid} fluid /></div>
								${media.map(
									(f) => html`<a class="as-media__tile as-media__tile--3d" href=${`#admin.editor.${pid}`} title=${`Open ${f.filename} in the 3D editor`}>
										<${ProductImage} productId=${pid} fluid />
										<span class="as-media__badge"><${Icon} name="cube" size=${12} />3D</span>
										<span class="as-media__name">${f.filename}</span>
									</a>`,
								)}
								<span class="as-media__tile as-media__add is-inert" aria-disabled="true"><${Icon} name="plus" size=${18} /><span>Add</span></span>
							</div>
							${media.length ? html`<${Text} tone="subdued" variant="caption">3D models are Shopify 3D media. Click a model to open it in 3D Configurator.<//>` : null}
						<//>
						<${Card} title="Variants" flush>
							${single
								? html`<div class="as-pad"><${Text} tone="subdued">This product has no options. Price ${money(vs[0].price)} · SKU ${vs[0].sku}<//></div>`
								: html`<ul class="as-variants">
										${vs.map(
											(v) => html`<li class="as-variant">
												${v.swatch ? html`<span class="as-variant__sw" style=${{ background: v.swatch }}></span>` : html`<${ProductImage} productId=${pid} variantId=${v.id} size=${36} />`}
												<div class="as-variant__text">
													<span class="as-variant__title">${v.title}</span>
													<span class="as-variant__sku">${v.sku}</span>
												</div>
												${s.variantConfigs[v.id] || rulesFor(s.products[pid], v, s.configs[pid]?.optionRules).length
													? html`<a href=${`#admin.editor.${pid}.${v.id}`} class="as-badge-link" title=${rulesFor(s.products[pid], v, s.configs[pid]?.optionRules).map((r) => `${r.name}: ${r.value}`).join(' + ')}><${Badge} tone="new" icon="cube">${s.variantConfigs[v.id] ? '3D exception' : 'Own 3D look'}<//></a>`
													: null}
												<span class="as-variant__price">${money(v.price)}</span>
											</li>`,
										)}
									</ul>`}
						<//>
					</div>
					<div class="p-layout__side">
						<${Card} title="Status">
							<${Select} label="Status" labelHidden value=${form.status} options=${[{ value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }]} onChange=${(v) => setDraft({ ...form, status: v })} />
						<//>
						<${ExtBlock} target="admin.product-details.block.render">
							${file
								? html`
										<div class="as-ext__hero">
											<${ProductImage} productId=${pid} size=${72} />
											<div class="as-ext__hero-text">
												<span class="as-ext__file">${file.filename}</span>
												${cfg.enabled ? html`<${Badge} tone="success">Showing in 3D<//>` : html`<${Badge} tone="attention">3D off<//>`}
											</div>
										</div>
										<${Switch} label="Show this product in 3D" checked=${!!cfg.enabled} onChange=${toggle3D} />
										<${DescriptionList}
											items=${[
												['Triangles', file.triangles.toLocaleString('en-US')],
												['File size', html`${fileMB(file)} MB ${file.sizeBytes / 1048576 > s.app.settings.coverage_max_model_mb ? html`<${Badge} tone="warning">Large<//>` : null}`],
												['AR file', file.usdz ? html`<span class="as-ok"><${Icon} name="check" size=${14} />Ready</span>` : html`<${Badge} tone="warning">Not generated<//>`],
												['Storefront', pub ? html`<${Badge} tone=${pub.tone}>${pub.label}<//>` : '—'],
											]}
										/>
										<${Button} variant="primary" full href=${`#admin.editor.${pid}`} icon="cube">Open 3D editor<//>
										<${Text} tone="subdued" variant="caption">${cfg.publishedAt ? `Published to storefront ${fmtDate(cfg.publishedAt, true)}` : 'Not published to the storefront yet'}<//>
									`
								: html`
										<div class="as-ext__empty">
											<span class="as-ext__empty-art"><${Icon} name="cube" size=${22} /></span>
											<${Text} variant="heading">No 3D model yet<//>
											<${Text} tone="subdued">Add a GLB model so shoppers can spin, customize and view this product in AR.<//>
										</div>
										<${Button} full href="#admin.products" icon="plus">Add 3D model<//>
									`}
						<//>
						<${Card} title="Product organization">
							<${DescriptionList} items=${[['Type', p.type], ['Vendor', p.vendor], ['Inventory', `${p.inventory} in stock`]]} />
						<//>
					</div>
				</div>
			</div>
		<//>
	`;
}
