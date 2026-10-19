// hdri-download (specs/hdri-download.md): Studio is bundled, the other presets are downloaded on demand.
// The prototype can't contact GitHub, so downloads are simulated; uploads are hash-checked for real.
import { html, useState, useEffect } from '../core/ui.js';
import { store, useStore } from '../core/store.js';
import { useFeature } from '../core/features.js';
import { ENVIRONMENT_PRESETS, ENVIRONMENT_PRESET_FILES, setPresetAvailability } from '../engine/viewer.js';
import { clearThumbnailCache } from '../engine/thumbnail.js';
import { formatBytes } from './coverage.js';

export const FLAG = 'hdri-download';
export const BUNDLED_PRESET = 'studio';

export const PRESET_BYTES = {
	apartment: 1476953,
	city: 1540678,
	dawn: 1475077,
	forest: 1911073,
	lobby: 1524050,
	night: 1745132,
	park: 1588504,
	studio: 1680234,
	sunset: 1397783,
	warehouse: 1672140,
};

// Hard-coded in the plugin too: a file that doesn't match is discarded, whatever its source.
export const PRESET_SHA256 = {
	apartment: 'a02c9615adeba91a753c3e4737c3ce7a719273df822eeaa85d24982bd43c9ecb',
	city: '7afe4c2f9700ee78c7477c53fa355463d7dda1fdede401432d6b5f9ff0a95696',
	dawn: 'ee70fb8c8fb3e34566802191d83b299e179ecc392b97639e6c750f66e161c8e2',
	forest: '926a6bb81897919b2924f42407162b8d54be91eab2da3fe7fe19daf308cfa09a',
	lobby: '8b73849c956e2d97e7a6cfacbe9396d90a84fcbd9b24327a37a6629150055cca',
	night: '6861489f983cdc0c22435b781a3487171bd25f25f9cc52c46ac402d48e08249e',
	park: 'af15cb5ca49de469e2ee74fcb6622cb32b36e3f9ee95504fc762d9c3d62c5163',
	studio: '29267a4aa8c10de26cae758e4e3c4daadde88673798666ad657724bab7224a35',
	sunset: '0e72ed46b5316cb5fb67fc81ff85b024a09146fd89ef3811a8d2299647ada118',
	warehouse: '9b3d611cadc32c3a0c7e084ce5611c0650293881c4a041e7fa13748fe0dc6451',
};

export const HDRI_SOURCES = [
	'https://raw.githubusercontent.com/bPlugins/3d-viewer-assets/v1/hdri/',
	'https://cdn.jsdelivr.net/gh/bPlugins/3d-viewer-assets@v1/hdri/',
	'https://raw.githubusercontent.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/',
];
export const PRESETS_ZIP_URL = 'https://github.com/bPlugins/3d-viewer-assets/archive/refs/tags/v1.zip';

export const presetLabel = (p) => p.charAt(0).toUpperCase() + p.slice(1);
export const presetSize = (p) => formatBytes(PRESET_BYTES[p]);
export const sizeOf = (list) => formatBytes(list.reduce((n, p) => n + (PRESET_BYTES[p] || 0), 0));

/** "Apartment, Lobby and Sunset" */
export function listText(items) {
	return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// ── Installed set (the uploads/wc3d-hdri/ folder in the plugin) ──

const installedOf = (s) => s.hdri?.installed || { [BUNDLED_PRESET]: { source: 'bundled' } };

/** Flag off = the shipped product: every preset is bundled. */
export function isInstalled(s, preset) {
	if (!s.flags?.[FLAG] || preset === BUNDLED_PRESET || preset === 'custom' || !ENVIRONMENT_PRESET_FILES[preset]) return true;
	return !!installedOf(s)[preset];
}

export function installedSource(s, preset) {
	if (preset === BUNDLED_PRESET) return 'bundled';
	return installedOf(s)[preset]?.source || null;
}

export const missingPresets = (s) => ENVIRONMENT_PRESETS.filter((p) => !isInstalled(s, p));

// The viewer asks this before requesting a preset file; a missing one renders as Studio.
setPresetAvailability((preset) => isInstalled(store.get(), preset));
let availabilityKey = '';
store.subscribe(() => {
	const key = missingPresets(store.get()).join();
	if (key === availabilityKey) return;
	availabilityKey = key;
	clearThumbnailCache();
	setPresetAvailability((preset) => isInstalled(store.get(), preset));
});

// ── Jobs (transient: not persisted, like an in-flight REST request) ──

const jobs = {}; // preset → { status: 'downloading' | 'error', progress, error }
let batch = null; // { total, done } while "Download all" / "Download now" runs
const jobSubs = new Set();
const emitJobs = () => jobSubs.forEach((f) => f());

export function useHdriJobs() {
	const [, force] = useState(0);
	useEffect(() => {
		const f = () => force((n) => n + 1);
		jobSubs.add(f);
		return () => jobSubs.delete(f);
	}, []);
	return { jobs, batch };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The "server": POST /wc3d/v1/environments/download for one preset, simulated at about 1.2 MB/s. */
async function downloadOne(preset) {
	jobs[preset] = { status: 'downloading', progress: 0 };
	emitJobs();
	const steps = Math.max(6, Math.round(PRESET_BYTES[preset] / 120000));
	const failAt = store.get().demo?.hdriFail ? Math.round(steps * 0.4) : -1;
	for (let i = 1; i <= steps; i++) {
		await sleep(110);
		if (i === failAt) {
			jobs[preset] = {
				status: 'error',
				progress: 0,
				error: 'Your server couldn’t reach GitHub or jsDelivr (cURL error 28: Connection timed out after 30001 milliseconds).',
			};
			emitJobs();
			return false;
		}
		jobs[preset] = { status: 'downloading', progress: Math.round((i / steps) * 100) };
		emitJobs();
	}
	delete jobs[preset];
	store.patch(['hdri', 'installed'], (cur) => ({ ...(cur || installedOf(store.get())), [preset]: { source: 'download', at: new Date().toISOString() } }));
	emitJobs();
	return true;
}

/** Download presets one by one (one request each, so the UI can show progress). Resolves to the failed ones. */
export async function downloadPresets(list) {
	const todo = list.filter((p) => !isInstalled(store.get(), p) && jobs[p]?.status !== 'downloading');
	if (!todo.length) return [];
	const many = todo.length > 1;
	if (many) batch = { total: todo.length, done: 0, current: todo[0] };
	const failed = [];
	for (const p of todo) {
		if (many) batch = { ...batch, current: p };
		const ok = await downloadOne(p);
		if (!ok) failed.push(p);
		if (many) batch = { ...batch, done: batch.done + 1 };
		emitJobs();
		// One unreachable host fails them all: stop instead of waiting for nine timeouts.
		if (!ok && many) {
			todo.slice(todo.indexOf(p) + 1).forEach((rest) => failed.push(rest));
			break;
		}
	}
	batch = null;
	emitJobs();
	return failed;
}

export const downloadAll = () => downloadPresets(missingPresets(store.get()));

// ── Upload (Settings): .hdr files or the presets zip, kept only when the hash matches ──

const PRESET_BY_FILE = Object.fromEntries(Object.entries(ENVIRONMENT_PRESET_FILES).map(([p, f]) => [f, p]));

async function sha256(buf) {
	const d = await crypto.subtle.digest('SHA-256', buf);
	return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function entriesOf(file) {
	if (/\.zip$/i.test(file.name)) {
		const { unzipSync } = await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js');
		const files = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (f) => /\.hdr$/i.test(f.name) });
		return Object.entries(files).map(([path, data]) => ({ name: path.split('/').pop(), data }));
	}
	return [{ name: file.name, data: await file.arrayBuffer() }];
}

/** The "server": POST /wc3d/v1/environments/upload → { added, already, skipped: [{name, reason}] }. */
export async function uploadPresetFiles(fileList) {
	const out = { added: [], already: [], skipped: [] };
	for (const file of [...fileList]) {
		let entries;
		try {
			entries = await entriesOf(file);
		} catch {
			out.skipped.push({ name: file.name, reason: 'isn’t a readable zip file' });
			continue;
		}
		if (!entries.length) out.skipped.push({ name: file.name, reason: 'contains no .hdr files' });
		for (const { name, data } of entries) {
			const preset = PRESET_BY_FILE[name];
			if (!preset) {
				out.skipped.push({ name, reason: 'isn’t one of the preset files' });
				continue;
			}
			if ((await sha256(data)) !== PRESET_SHA256[preset]) {
				out.skipped.push({ name, reason: 'doesn’t match the original file' });
				continue;
			}
			if (isInstalled(store.get(), preset)) {
				if (!out.already.includes(preset)) out.already.push(preset);
				continue;
			}
			store.patch(['hdri', 'installed'], (cur) => ({ ...(cur || installedOf(store.get())), [preset]: { source: 'upload', at: new Date().toISOString() } }));
			out.added.push(preset);
		}
	}
	return out;
}

// ── Prototype bar (store setup, like "AR device") ──

export function HdriFailSwitch() {
	const on = useFeature(FLAG);
	const fail = useStore((s) => !!s.demo?.hdriFail);
	if (!on) return null;
	return html`<label class="proto-seg proto-seg--small proto-hdri-fail" title="Make lighting preset downloads fail, as on a server that can't reach GitHub">
		<input type="checkbox" checked=${fail} onChange=${(e) => store.patch('demo.hdriFail', e.currentTarget.checked)} />
		<span class="proto-seg__label">Fail HDRI download</span>
	</label>`;
}
