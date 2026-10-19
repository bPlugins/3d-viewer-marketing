// Sample models (glTF Sample Assets / model-viewer shared assets). Credits are shown in the demo's About box.
// Files live in live-demo/models/. Hosts that refuse .glb (the claude.ai artifact host) get
// models/<file>.b64.js instead (written by scripts/build-live-demo.mjs --artifact), loaded as a blob URL.
export const MODELS = {
	astronaut: {
		title: 'Astronaut',
		file: 'astronaut.glb',
		ios: 'astronaut.usdz',
		animations: [],
		credit: 'Astronaut by Poly (Google), CC-BY 3.0',
	},
	fox: {
		title: 'Fox',
		file: 'fox.glb',
		animations: ['Survey', 'Walk', 'Run'],
		credit: 'Fox: low-poly model by PixelMannen (CC0); rigging and animation by @tomkranis (CC-BY 4.0); glTF by @AsoboStudio and @scurest',
	},
	duck: {
		title: 'Rubber Duck',
		file: 'duck.glb',
		animations: [],
		credit: 'Duck © 2006 Sony Computer Entertainment Inc., SCEA Shared Source License 1.0',
	},
	'sheen-chair': {
		title: 'Sheen Chair',
		file: 'sheen-chair.glb',
		animations: [],
		credit: 'SheenChair © 2020 Wayfair LLC, CC-BY 4.0',
	},
	shoe: {
		title: 'Sneaker',
		file: 'shoe.glb',
		animations: [],
		variants: ['midnight', 'beach', 'street'],
		credit: 'MaterialsVariantsShoe © 2020 Shopify Inc., CC-BY 4.0',
	},
};

const BASE = new URL('../models/', import.meta.url);
const cache = new Map();

/** Resolves a model key (or a URL / blob: URL) to something <model-viewer src> can load. */
export function modelSrc(keyOrUrl) {
	const m = MODELS[keyOrUrl];
	if (!m) return Promise.resolve(keyOrUrl || '');
	if (!cache.has(keyOrUrl)) cache.set(keyOrUrl, load(m.file));
	return cache.get(keyOrUrl);
}

// `npm run live-demo:build -- --artifact` sets this to true: that host has only the .b64.js copies.
const PACKED = false;

async function load(file) {
	const url = new URL(file, BASE).href;
	if (!PACKED) {
		try {
			const res = await fetch(url, { method: 'HEAD' });
			if (res.ok && !/text\/html/.test(res.headers.get('content-type') || '')) return url;
		} catch {
			// Fall through to the packed copy.
		}
	}
	const mod = await import(new URL(file + '.b64.js', BASE).href);
	const bytes = Uint8Array.from(atob(mod.default), (c) => c.charCodeAt(0));
	return URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
}

/** Viewer attrs store media URLs (…/uploads/2026/10/fox.glb); map one back to its sample key, or pass it through. */
export function modelKeyFromUrl(url = '') {
	const file = String(url).split(/[?#]/)[0].split('/').pop();
	return Object.keys(MODELS).find((k) => MODELS[k].file === file) || url;
}

/** Model options for <select>s: [[key, title], …]. */
export const MODEL_OPTIONS = Object.entries(MODELS).map(([k, m]) => [k, m.title]);
