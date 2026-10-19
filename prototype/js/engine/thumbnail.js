// Product thumbnails from one shared offscreen renderer, rendered one at a time and cached by JSON key.
import { createViewer } from './viewer.js';

const cache = new Map();
let viewer = null;
let queue = Promise.resolve();

// Thumbnails show the product, auto-framed, without scene chrome (hotspots, grid, env background).
function thumbConfig(config) {
	const c = config || { schema_version: 1 };
	const env = c.environment || null;
	return {
		...c,
		hotspots: [],
		camera: null,
		environment: env ? { ...env, backgroundType: 'transparent', floorGridEnabled: false, floorReflection: false } : null,
		optimization: null,
	};
}

/** (model, config, {width, height, bg}) → Promise<dataURL>. */
export function renderThumbnail(model, config, { width = 300, height = 300, bg = '' } = {}) {
	if (!model) return Promise.resolve('');
	const key = JSON.stringify([model.demo || model.url, config || null, width, height, bg]);
	if (cache.has(key)) return cache.get(key);
	const job = queue.then(async () => {
		viewer = viewer || createViewer(document.createElement('div'), { offscreen: true, width, height, interactive: false });
		viewer.setSize(width, height);
		viewer.setConfig(thumbConfig(config));
		await viewer.setModel(model);
		viewer.setConfig(thumbConfig(config));
		await viewer.whenIdle();
		viewer.refit();
		const canvas = viewer.renderOffscreen(bg || null);
		return canvas.toDataURL(bg ? 'image/jpeg' : 'image/png', 0.9);
	});
	job.catch(() => cache.delete(key));
	cache.set(key, job);
	queue = job.catch(() => {});
	return job;
}

export function clearThumbnailCache() {
	cache.clear();
}
