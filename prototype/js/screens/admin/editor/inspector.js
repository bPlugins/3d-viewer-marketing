// Inspector (src/admin/editor/Inspector.tsx): right panel, one section per concern, in the spec's
// order. Each body is ./panels/<name>.js (default export, no props), loaded lazily with a
// per-section fallback so one missing or failing panel never breaks the others.
import { html, useState, useEffect } from '../../../core/ui.js';
import { Icon } from '../../../shared/icons.js';
import { Accordion, ChunkBoundary, EmptyState } from '../../../shared/editor-ui.js';
import { useEditor } from './editor-store.js';
import { useFeature } from '../../../core/features.js';

const loaders = {
	'mesh-visibility': () => import('./panels/mesh-visibility.js'),
	material: () => import('./panels/material.js'),
	environment: () => import('./panels/environment.js'),
	animations: () => import('./panels/animations.js'),
	hotspots: () => import('./panels/hotspots.js'),
	camera: () => import('./panels/camera.js'),
	ar: () => import('./panels/ar.js'),
	optimization: () => import('./panels/optimization.js'),
	'alt-model': () => import('./panels/alt-model.js'),
	'import-export': () => import('./panels/import-export.js'),
	pricing: () => import('./panels/pricing.js'),
	options: () => import('./panels/options.js'),
	'material-variants': () => import('./panels/material-variants.js'),
	conditions: () => import('./panels/conditions.js'),
	decals: () => import('./panels/decals.js'),
};
const cache = new Map();

function loadPanel(name) {
	if (!cache.has(name)) {
		const p = loaders[name]()
			.then((m) => {
				if (typeof m.default !== 'function') throw new Error(`panels/${name}.js has no default export`);
				return { Comp: m.default };
			})
			.catch((error) => {
				console.warn(`[editor] panel "${name}" unavailable:`, error?.message || error);
				cache.delete(name);
				return { error };
			});
		cache.set(name, p);
	}
	return cache.get(name);
}

const Unavailable = ({ name }) =>
	html`<${EmptyState} variant="dashed" class="mx-4 my-3" title=${`This section could not be loaded (panels/${name}.js).`} />`;

/** Mounts panels/<name>.js; shows nothing while loading and a small notice if it fails. */
function Panel({ name }) {
	const [state, setState] = useState(null);
	useEffect(() => {
		let live = true;
		loadPanel(name).then((r) => live && setState(r));
		return () => (live = false);
	}, [name]);
	if (!state) return null;
	if (state.error) return html`<${Unavailable} name=${name} />`;
	const { Comp } = state;
	return html`<${ChunkBoundary} fallback=${html`<${Unavailable} name=${name} />`}><${Comp} /><//>`;
}

const SECTION_ICON = 'w-[15px] h-[15px]';

function Section({ title, icon, panel, keepMounted = false }) {
	return html`<${Accordion} title=${title} keepMounted=${keepMounted} icon=${html`<${Icon} name=${icon} class=${SECTION_ICON} />`}>
		<${Panel} name=${panel} />
	<//>`;
}

export function Inspector() {
	const { isVariation, hasSelection } = useEditor((s) => ({ isVariation: s.target !== 'default', hasSelection: s.selection.length > 0 }));
	const pricing = useFeature('option-pricing');
	const groups = useFeature('option-groups');
	const variants = useFeature('materials-variants');
	const decals = useFeature('decals');
	return html`<aside
		class="w-[320px] min-w-[280px] max-md:w-full max-md:min-w-0 max-md:overflow-visible max-md:border-t flex-shrink-0 box-border bg-white border-s border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-y-auto wc3d-scroll"
	>
		${isVariation && html`<${Section} title="Alternative 3D Model" icon="cube" panel="alt-model" />`}
		<${Panel} name="mesh-visibility" />
		${hasSelection && html`<${Section} title="Material" icon="palette" panel="material" keepMounted />`}
		${groups && html`<${Section} title="Customer Options" icon="palette-bubble" panel="options" />`}
		${pricing && html`<${Section} title="Option Pricing" icon="tag" panel="pricing" />`}
		${decals && html`<${Section} title="Personalization" icon="brush" panel="decals" />`}
		${variants && html`<${Section} title="Material Variants" icon="layers" panel="material-variants" />`}
		<${Section} title="Scene & Lighting" icon="lighting" panel="environment" keepMounted />
		<${Section} title="Animations" icon="play" panel="animations" keepMounted />
		<${Section} title="Hotspots" icon="map-pin" panel="hotspots" />
		<${Section} title="Camera" icon="camera" panel="camera" keepMounted />
		<${Section} title="AR & Quick Look" icon="layers" panel="ar" />
		<${Section} title="Performance & Optimization" icon="cpu" panel="optimization" />
		<${Section} title="Import & Export" icon="upload" panel="import-export" />
	</aside>`;
}

export default Inspector;
