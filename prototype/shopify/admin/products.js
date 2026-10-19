// "3D products": coverage over every Shopify product, bulk actions and the staged-upload "Add model" flow.
import { html, useState, useEffect, useRef, cx } from '../../js/core/ui.js';
import { MODEL_INFO } from '../../js/engine/demo-models.js';
import { store, useStore } from '../core/store.js';
import { go } from '../core/router.js';
import { nowStr, variantsOf, rulesFor } from '../core/commerce.js';
import { AdminFrame } from './chrome.js';
import { Page, Card, Button, Badge, Banner, Modal, Tabs, IndexTable, TextField, Select, ProgressBar, Text, Icon, toast } from '../ui/polaris.js';
import { ProductImage } from '../ui/viewer.js';

export const fileMB = (f) => (f ? (f.sizeBytes / 1048576).toFixed(1) : '0');

/** Storefront state from the publish job: metafields written at publishedAt. */
export function publishState(cfg) {
	if (!cfg?.modelFileId) return null;
	if (!cfg.publishedAt) return { label: 'Not published', tone: 'neutral' };
	if (cfg.updatedAt > cfg.publishedAt) return { label: 'Unpublished changes', tone: 'attention' };
	return { label: 'Published', tone: 'success' };
}

/** Coverage problems for one product (Needs attention tab). */
export function issuesFor(s, pid) {
	const cfg = s.configs[pid];
	const f = cfg?.modelFileId ? s.files[cfg.modelFileId] : null;
	if (!f) return [];
	const out = [];
	if (f.sizeBytes / 1048576 > s.app.settings.coverage_max_model_mb) out.push('oversized');
	if (!f.usdz) out.push('no-ar');
	if (cfg.enabled && publishState(cfg)?.label !== 'Published') out.push('unpublished');
	return out;
}

const BASIC_CONFIG = {
	schema_version: 1,
	meshes: {},
	materials: {},
	camera: null,
	environment: { preset: 'studio', intensity: 1, backgroundType: 'transparent', shadowsEnabled: true, shadowIntensity: 0.5 },
	hotspots: [],
	ar: { enabled: true, source: 'shopify', scale: 'fixed' },
};

/** Attach a MODEL_3D file as product media and create the ProductConfig. */
export function assignModel(pid, fileId) {
	const s = store.get();
	const now = nowStr();
	const prev = s.configs[pid];
	store.set((st) => ({
		...st,
		products: { ...st.products, [pid]: { ...st.products[pid], media: [...new Set([...(st.products[pid].media || []), fileId])] } },
		configs: { ...st.configs, [pid]: { customizer: 'inherit', config: BASIC_CONFIG, ...(prev || {}), enabled: true, modelFileId: fileId, updatedAt: now, publishedAt: now } },
		app: { ...st.app, onboarding: { ...st.app.onboarding, model: true } },
	}));
}

const SAMPLES = [
	{ demo: 'side-table', label: 'Side table' },
	{ demo: 'lounge-chair', label: 'Lounge chair' },
	{ demo: 'table-lamp', label: 'Table lamp' },
	{ demo: 'mug', label: 'Mug' },
];
const STAGES = ['Uploading', 'Processing', 'Ready'];

/** Simulated stagedUploadsCreate → fileCreate → poll READY → productCreateMedia. */
export function AddModelModal({ productId, open, onClose }) {
	const s = useStore();
	const p = s.products[productId];
	const [tab, setTab] = useState('upload');
	const [picked, setPicked] = useState(null);
	const [sample, setSample] = useState('side-table');
	const [url, setUrl] = useState('');
	const [urlErr, setUrlErr] = useState('');
	const [job, setJob] = useState(null); // {stage, pct, fileName}
	const timer = useRef(0);
	const urlOn = !!s.app.modules['external-url'];

	useEffect(() => {
		if (!open) {
			clearInterval(timer.current);
			setJob(null);
			setPicked(null);
			setUrl('');
			setUrlErr('');
			setTab('upload');
		}
		return () => clearInterval(timer.current);
	}, [open, productId]);

	if (!p) return null;
	const files = Object.values(s.files);

	const run = (fileName, demo, stages = STAGES) => {
		let pct = 0;
		setJob({ stage: stages[0], pct: 0, fileName, stages });
		clearInterval(timer.current);
		timer.current = setInterval(() => {
			pct += 9;
			const stage = stages[Math.min(stages.length - 1, Math.floor((pct / 100) * (stages.length - 1)))];
			if (pct >= 100) {
				clearInterval(timer.current);
				const id = store.nextId('files');
				const info = MODEL_INFO[demo] || {};
				store.patch(['files', id], { id, kind: 'model3d', demo, filename: fileName, sizeBytes: info.sizeBytes || 1048576, status: 'READY', usdz: true, triangles: info.triangles || 10000 });
				assignModel(productId, id);
				setJob({ stage: stages[stages.length - 1], pct: 100, fileName, stages, done: true });
				return;
			}
			setJob({ stage, pct, fileName, stages });
		}, 160);
	};

	const useExisting = () => {
		assignModel(productId, picked);
		toast(`3D model added to ${p.title}`);
		onClose();
	};

	const importUrl = () => {
		const u = url.trim();
		if (!/^https:\/\/[^/]+\/.+\.(glb|gltf)(\?.*)?$/i.test(u)) return setUrlErr('Enter an https:// link that ends in .glb or .gltf.');
		setUrlErr('');
		run(u.split('/').pop().split('?')[0], sample, ['Fetching', 'Importing into Shopify Files', 'Processing', 'Ready']);
	};

	const busy = job && !job.done;
	const primary = job?.done
		? { content: 'Open 3D editor', onAction: () => { onClose(); go(`admin.editor.${productId}`); } }
		: tab === 'existing'
			? { content: 'Add to product', onAction: useExisting, disabled: !picked }
			: tab === 'url'
				? { content: 'Import', onAction: importUrl, disabled: !urlOn || busy || !url.trim() }
				: { content: 'Upload', onAction: () => run(`${p.handle}.glb`, sample), disabled: busy };

	return html`
		<${Modal} open=${open} title=${`Add 3D model to ${p.title}`} onClose=${onClose} primaryAction=${primary} secondaryActions=${[{ content: job?.done ? 'Done' : 'Cancel', onAction: onClose }]}>
			${job
				? html`
						<div class="as-upload-job">
							<div class="as-upload-job__file"><${Icon} name="cube" size=${18} /><span>${job.fileName}</span>${job.done ? html`<${Badge} tone="success">Ready<//>` : html`<${Badge} tone="info">${job.stage}…<//>`}</div>
							<${ProgressBar} value=${job.pct} tone=${job.done ? 'success' : 'primary'} label="Upload progress" />
							<ol class="as-steps">
								${job.stages.map((st, i) => {
									const at = job.stages.indexOf(job.stage);
									return html`<li class=${cx(i < at || job.done ? 'is-done' : i === at ? 'is-now' : '')}><span></span>${st}</li>`;
								})}
							</ol>
							${job.done ? html`<${Banner} tone="success" title="Model added">It's on ${p.title} as 3D media and the viewer is on. Set colours, options and the camera in the editor.<//>` : null}
						</div>
					`
				: html`
						<${Tabs} tabs=${[{ id: 'upload', label: 'Upload file' }, { id: 'existing', label: 'Choose from Files' }, { id: 'url', label: 'From URL' }]} selected=${tab} onSelect=${setTab} />
						${tab === 'upload'
							? html`
									<div class="as-drop">
										<${Icon} name="upload" size=${28} />
										<p><strong>Drop a .glb or .gltf file here</strong></p>
										<p class="p-help">Up to 500 MB. Stored as Shopify 3D media; Shopify generates the AR (USDZ) file for iPhone and iPad.</p>
									</div>
									<div class="as-proto-note">
										<${Select} label="Prototype: which demo model stands in for your file" value=${sample} options=${SAMPLES.map((x) => ({ label: x.label, value: x.demo }))} onChange=${setSample} />
									</div>
								`
							: null}
						${tab === 'existing'
							? html`
									<p class="p-help">3D models already in Shopify Files. One file can be used by several products.</p>
									<div class="as-filelist" role="radiogroup" aria-label="3D files">
										${files.map(
											(f) => html`<label class=${cx('as-filerow', picked === f.id && 'is-on')}>
												<input type="radio" name="as-file" checked=${picked === f.id} onChange=${() => setPicked(f.id)} />
												<span class="as-filerow__icon"><${Icon} name="cube" size=${16} /></span>
												<span class="as-filerow__name">${f.filename}</span>
												<span class="as-filerow__meta">${fileMB(f)} MB</span>
											</label>`,
										)}
									</div>
								`
							: null}
						${tab === 'url'
							? html`
									${urlOn ? null : html`<${Banner} tone="info" action=${{ content: 'Turn on in Settings', href: '#admin.settings.features' }}>"Model from a URL" is off. Turn it on in Settings › Features.<//>`}
									<div class=${cx(!urlOn && 'as-disabled')} title=${urlOn ? undefined : 'Turn on "Model from a URL" in Settings › Features'}>
										<${TextField} label="Model URL" value=${url} onInput=${setUrl} placeholder="https://cdn.example.com/models/linen-throw.glb" disabled=${!urlOn} error=${urlErr} helpText="HTTPS only, up to 64 MB. We fetch the file once and import it into Shopify Files, so it keeps working if your CDN link changes." />
									</div>
								`
							: null}
					`}
		<//>
	`;
}

const TABS = [
	{ id: 'all', label: 'All' },
	{ id: 'with', label: 'With 3D' },
	{ id: 'without', label: 'Without 3D' },
	{ id: 'attention', label: 'Needs attention' },
];

export default function Products() {
	const s = useStore();
	const [tab, setTab] = useState('all');
	const [q, setQ] = useState('');
	const [sel, setSel] = useState([]);
	const [undo, setUndo] = useState(null); // {prev:{pid:bool}, count}
	const [posters, setPosters] = useState(null); // {ids, pct}
	const [addFor, setAddFor] = useState(null);
	const maxMb = s.app.settings.coverage_max_model_mb;

	const all = Object.values(s.products);
	const hasModel = (pid) => !!(s.configs[pid]?.modelFileId && s.files[s.configs[pid].modelFileId]);
	const counts = {
		all: all.length,
		with: all.filter((p) => hasModel(p.id)).length,
		without: all.filter((p) => !hasModel(p.id)).length,
		attention: all.filter((p) => issuesFor(s, p.id).length).length,
	};
	const list = all
		.filter((p) => (tab === 'with' ? hasModel(p.id) : tab === 'without' ? !hasModel(p.id) : tab === 'attention' ? issuesFor(s, p.id).length : true))
		.filter((p) => !q.trim() || p.title.toLowerCase().includes(q.trim().toLowerCase()));

	const setEnabled = (ids, on) => {
		const withModel = ids.filter(hasModel);
		const prev = Object.fromEntries(withModel.map((id) => [id, !!s.configs[id].enabled]));
		const now = nowStr();
		store.patch('configs', (cs) => {
			const next = { ...cs };
			for (const id of withModel) next[id] = { ...next[id], enabled: on, updatedAt: now, publishedAt: now };
			return next;
		});
		setSel([]);
		const skipped = ids.length - withModel.length;
		if (on) toast(`3D turned on for ${withModel.length} product${withModel.length === 1 ? '' : 's'}${skipped ? ` · ${skipped} without a model skipped` : ''}`);
		else setUndo({ prev, count: withModel.length });
	};

	const undoDisable = () => {
		store.patch('configs', (cs) => {
			const next = { ...cs };
			for (const [id, on] of Object.entries(undo.prev)) next[id] = { ...next[id], enabled: on };
			return next;
		});
		setUndo(null);
		toast('3D turned back on');
	};

	const genPosters = (ids) => {
		const targets = ids.filter(hasModel);
		setSel([]);
		if (!targets.length) return toast('Select products that have a 3D model', { error: true });
		setPosters({ ids: targets, pct: 0 });
		let pct = 0;
		const t = setInterval(() => {
			pct += 100 / (targets.length * 4);
			if (pct >= 100) {
				clearInterval(t);
				setPosters(null);
				toast(`Posters generated for ${targets.length} product${targets.length === 1 ? '' : 's'}`);
				return;
			}
			setPosters({ ids: targets, pct });
		}, 220);
	};

	const rows = list.map((p) => {
		const cfg = s.configs[p.id];
		const f = hasModel(p.id) ? s.files[cfg.modelFileId] : null;
		const vs = variantsOf(s, p.id);
		const own = vs.filter((v) => s.variantConfigs[v.id] || rulesFor(p, v, cfg?.optionRules).length).length;
		const pub = publishState(cfg);
		const opts = cfg?.config?.options?.length || 0;
		return {
			id: p.id,
			onClick: f ? () => go(`admin.editor.${p.id}`) : () => setAddFor(p.id),
			cells: [
				html`<div class="as-prod">
					<${ProductImage} productId=${p.id} size=${40} />
					<div class="as-prod__text">
						<a class="as-prod__title" href=${f ? `#admin.editor.${p.id}` : `#admin.product.${p.id}`}>${p.title}</a>
						${p.status === 'draft' ? html`<${Badge} tone="info">Draft<//>` : null}
					</div>
				</div>`,
				!f ? html`<${Badge}>No model<//>` : cfg.enabled ? html`<${Badge} tone="success">Enabled<//>` : html`<${Badge} tone="attention">Off<//>`,
				f
					? html`<div class="as-file">
							<span class="as-file__name">${f.filename}</span>
							<span class="as-file__meta">${fileMB(f)} MB · ${f.triangles.toLocaleString('en-US')} triangles</span>
							<span class="as-file__flags">
								${f.sizeBytes / 1048576 > maxMb ? html`<${Badge} tone="warning" icon="alert">Over ${maxMb} MB<//>` : null}
								${!f.usdz ? html`<${Badge} tone="warning" icon="alert">${f.draco ? 'Draco: AR file not generated' : 'AR file not generated'}<//>` : null}
							</span>
						</div>`
					: html`<${Button} size="slim" icon="plus" onClick=${() => setAddFor(p.id)}>Add model<//>`,
				f ? (vs.length > 1 ? html`<span>${own} of ${vs.length}</span>` : html`<span class="as-muted">—</span>`) : html`<span class="as-muted">—</span>`,
				f ? html`<span>${opts || html`<span class="as-muted">None</span>`}</span>` : html`<span class="as-muted">—</span>`,
				pub ? html`<${Badge} tone=${pub.tone}>${pub.label}<//>` : html`<span class="as-muted">—</span>`,
			],
		};
	});

	return html`
		<${AdminFrame} current="app.products" appTitle="3D products">
			<${Page} title="3D products" subtitle="Every product in your store and its 3D setup." width="full" primaryAction=${{ content: 'Add 3D model', icon: 'plus', onAction: () => setAddFor(all.find((p) => !hasModel(p.id))?.id || all[0].id) }}>
				${!s.app.modules.coverage ? html`<${Banner} tone="info" action=${{ content: 'Turn on', href: '#admin.settings.features' }}>The coverage dashboard is off. Turn it on in Settings › Features to see size and AR checks here.<//>` : null}
				${undo
					? html`<${Banner} tone="info" title=${`3D turned off for ${undo.count} product${undo.count === 1 ? '' : 's'}`} onDismiss=${() => setUndo(null)} action=${{ content: 'Undo', onAction: undoDisable }}>Shoppers now see your product images. Your 3D setups are kept.<//>`
					: null}
				${posters
					? html`<${Card}>
							<div class="as-poster-job">
								<${Text} variant="heading">Generating posters for ${posters.ids.length} product${posters.ids.length === 1 ? '' : 's'}…<//>
								<${ProgressBar} value=${posters.pct} label="Poster progress" />
								<${Text} tone="subdued" variant="caption">Rendered in your browser at 800 × 800 and uploaded to Shopify Files. Keep this page open.<//>
							</div>
						<//>`
					: null}
				<${Card} flush>
					<div class="as-tablebar">
						<${Tabs} tabs=${TABS.map((t) => ({ ...t, badge: counts[t.id] }))} selected=${tab} onSelect=${(t) => { setTab(t); setSel([]); }} />
						<label class="as-search"><${Icon} name="search" size=${16} /><input type="search" placeholder="Search products" aria-label="Search products" value=${q} onInput=${(e) => setQ(e.target.value)} /></label>
					</div>
					<${IndexTable}
						headings=${['Product', '3D', 'Model file', 'Variant setups', 'Option groups', 'Storefront']}
						rows=${rows}
						selectable
						selected=${sel}
						onSelectionChange=${setSel}
						bulkActions=${[
							{ content: 'Enable 3D', onAction: (ids) => setEnabled(ids, true) },
							{ content: 'Disable 3D', onAction: (ids) => setEnabled(ids, false) },
							{ content: 'Generate posters', onAction: genPosters },
						]}
						empty=${html`<div class="as-empty-row"><${Text} tone="subdued">${q ? `No products match "${q}".` : tab === 'attention' ? 'Nothing needs attention. Every model is within size and has an AR file.' : 'No products here.'}<//></div>`}
					/>
				<//>
				<p class="as-foot-note">Models over ${maxMb} MB load slowly on phones. Change the limit in Settings › Features › Coverage dashboard.</p>
			<//>
			<${AddModelModal} productId=${addFor} open=${!!addFor} onClose=${() => setAddFor(null)} />
		<//>
	`;
}
