// Planned `external-url` (specs/external-url.md): a model or USDZ hosted elsewhere, stored as an
// attachment record with no file ({source: 'url', url}). checkUrl() stands in for the plugin's REST check.
import { html, useState, useRef, cx } from '../core/ui.js';
import { store } from '../core/store.js';
import { isOn, useFeature } from '../core/features.js';
import { MODEL_INFO } from '../engine/demo-models.js';
import { protoLabel } from './slots.js';

export const FLAG = 'external-url';
export const STORE_DOMAIN = 'demo.store';
export const MAX_URL = 2048;
export const MAX_BYTES = 64 * 1024 * 1024;

const MIME = { glb: 'model/gltf-binary', gltf: 'model/gltf+json', usdz: 'model/vnd.usdz+zip' };
const EXTS = { model: ['glb', 'gltf'], usdz: ['usdz'] };

// Demo stand-ins: a file name containing the word maps to that demo model (longest words first).
const ALIASES = [
	['lounge-chair-wide', 'lounge-chair-wide'],
	['sofa', 'lounge-chair-wide'],
	['couch', 'lounge-chair-wide'],
	['lamp', 'table-lamp'],
	['chair', 'lounge-chair'],
	['mug', 'mug'],
	['cup', 'mug'],
	['table', 'side-table'],
	['stool', 'side-table'],
];

export const DEMO_URLS = {
	model: [
		['https://cdn.example.com/models/travel-mug.glb', 'Works'],
		['https://cdn.example.com/models/lounge-chair-teal.glb', 'Works'],
		['https://cdn.example.com/models/arc-floor-lamp.glb', 'Works'],
		['https://assets.example.net/3d/side-table/scene.gltf', '.gltf note'],
		['https://cdn.example.com/models/missing-chair.glb', '404'],
		['https://files.partner-brand.com/private/armchair.glb', 'CORS blocked'],
		['https://www.dropbox.com/s/a1b2c3/sofa.glb?dl=0', 'Web page'],
		['https://cdn.example.com/scans/sofa-scan-8k.glb', 'Too large'],
	],
	usdz: [
		['https://cdn.example.com/models/lounge-chair.usdz', 'Works'],
		['https://cdn.example.com/models/travel-mug.usdz', 'Works'],
		['https://cdn.example.com/models/missing-lamp.usdz', '404'],
	],
};

export const isExternal = (att) => att?.source === 'url' && !!att.url;

/** Media lists: external records exist only while the feature is on. */
export const inLibrary = (att) => !isExternal(att) || isOn(FLAG);

export function urlHost(url) {
	try {
		const u = new URL(url);
		return u.protocol === 'blob:' ? 'this browser' : u.host;
	} catch {
		return '';
	}
}

const pageOrigin = () => (typeof location !== 'undefined' ? location.origin : '');

export function formatBytes(b) {
	if (!b) return '';
	if (b >= 1048576) return `${(b / 1048576).toFixed(b >= 10485760 ? 0 : 1)} MB`;
	return `${Math.max(1, Math.round(b / 1024))} KB`;
}

/** Sync rules → {ok, url, ext, local, error}. */
export function validateUrl(text, kind = 'model') {
	const raw = String(text || '').trim();
	if (!raw) return { ok: false, error: '' };
	if (raw.length > MAX_URL) return { ok: false, error: 'The address is too long (2,048 characters max).' };
	let u;
	try {
		u = new URL(raw);
	} catch {
		return { ok: false, error: 'Enter a full address starting with https://.' };
	}
	// Prototype only: blob: and same-origin addresses load for real.
	const local = u.protocol === 'blob:' || u.origin === pageOrigin();
	if (!local && u.protocol === 'http:') return { ok: false, error: 'Use an https:// address. Browsers block http:// files on an https:// store.' };
	if (!local && u.protocol !== 'https:') return { ok: false, error: 'Enter a full address starting with https://.' };
	const ext = (u.pathname.split('.').pop() || '').toLowerCase();
	const exts = EXTS[kind] || EXTS.model;
	if (u.protocol !== 'blob:' && !exts.includes(ext)) return { ok: false, error: kind === 'usdz' ? 'The address must end in .usdz.' : 'The address must end in .glb or .gltf.' };
	return { ok: true, url: raw, ext: exts.includes(ext) ? ext : exts[0], local };
}

function fileParts(url, ext) {
	let name = '';
	try {
		const u = new URL(url);
		name = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
		if (u.protocol === 'blob:') name = '';
	} catch {
		/* validated before */
	}
	if (!name) name = `external-model.${ext}`;
	// "scene.gltf" says little; use the folder name as the title.
	let title = name.replace(/\.[^.]+$/, '');
	if (/^(scene|model|index)$/i.test(title)) {
		const parts = url.split('?')[0].split('/').filter(Boolean);
		if (parts.length > 1) title = parts[parts.length - 2];
	}
	return { filename: name, title };
}

const demoFor = (text) => {
	const s = text.toLowerCase();
	const hit = ALIASES.find(([word]) => s.includes(word));
	return hit ? hit[1] : '';
};

const row = (label, value, tone) => ({ label, value, tone });
const TITLES = { ok: 'Ready to use', warn: 'Ready to use, with a note', error: "Can't use this URL" };

function result(status, base, rows, message, extra = {}) {
	return { ...base, ...extra, status, heading: TITLES[status], rows, message };
}

/** Simulated server check (the prototype never contacts other hosts). */
function simulate(v, kind) {
	const lower = v.url.toLowerCase();
	const { filename, title } = fileParts(v.url, v.ext);
	const mime = MIME[v.ext];
	const base = { url: v.url, kind, ext: v.ext, filename, title, mime };
	const corsOk = kind === 'usdz' ? row('Cross-origin (CORS)', 'Not needed for AR files', 'na') : row('Cross-origin (CORS)', `Allowed for ${STORE_DOMAIN}`, 'ok');
	const notFound = () =>
		result('error', base, [row('Reachable', 'No (404 Not Found)', 'fail'), row('File size', '—', 'na'), row('Cross-origin (CORS)', '—', 'na'), row('Content type', '—', 'na')], 'Nothing was found at this address. Check the link, and that the file is public.');

	if (/404|missing/.test(lower)) return notFound();
	const demo = demoFor(filename + ' ' + title);
	if (/private|cors/.test(lower)) {
		const size = MODEL_INFO[demo]?.sizeBytes || 2400000;
		return result(
			'error',
			base,
			[row('Reachable', 'Yes (200 OK)', 'ok'), row('File size', formatBytes(size), 'ok'), row('Cross-origin (CORS)', `Blocked for ${STORE_DOMAIN}`, 'fail'), row('Content type', mime, 'ok')],
			`The file is there, but its host doesn't allow your store to load it. Ask the host to allow ${STORE_DOMAIN} (Access-Control-Allow-Origin).`
		);
	}
	if (/dl=0|\/view|drive\.google/.test(lower)) {
		return result(
			'error',
			base,
			[row('Reachable', 'Yes (200 OK)', 'ok'), row('File size', '84 KB', 'ok'), corsOk, row('Content type', 'text/html (a web page, not a model file)', 'fail')],
			"This link opens a web page, not the file. Use the file's direct link."
		);
	}
	if (/huge|-scan|scans\//.test(lower)) {
		const size = 148 * 1048576;
		return result(
			'error',
			base,
			[row('Reachable', 'Yes (200 OK)', 'ok'), row('File size', `${formatBytes(size)}, over the 64 MB limit`, 'fail'), corsOk, row('Content type', mime, 'ok')],
			'The file is 148 MB. Use a model under 64 MB so the product page stays fast.'
		);
	}
	if (!demo) return notFound();
	const sizeBytes = Math.round((MODEL_INFO[demo]?.sizeBytes || 1048576) * (kind === 'usdz' ? 1.3 : 1));
	const rows = [row('Reachable', 'Yes (200 OK)', 'ok'), row('File size', formatBytes(sizeBytes), 'ok'), corsOk, row('Content type', mime, 'ok')];
	const extra = { demo, sizeBytes, contentType: mime, cors: kind === 'usdz' ? null : true };
	if (v.ext === 'gltf') return result('warn', base, rows, 'A .gltf file loads its .bin file and textures from the same folder. They need the same CORS access.', extra);
	return result('ok', base, rows, 'Ready to use.', extra);
}

/** Real check for addresses on this origin (and blob: URLs): status, size, type, magic bytes. */
async function checkLocal(v, kind) {
	const { filename, title } = fileParts(v.url, v.ext);
	const base = { url: v.url, kind, ext: v.ext, filename, title, mime: MIME[v.ext] };
	let res;
	try {
		res = await fetch(v.url);
	} catch {
		res = null;
	}
	if (!res || !res.ok) {
		const code = res ? `${res.status} ${res.statusText || 'Error'}`.trim() : 'no response';
		return result('error', base, [row('Reachable', `No (${code})`, 'fail'), row('File size', '—', 'na'), row('Cross-origin (CORS)', '—', 'na'), row('Content type', '—', 'na')], 'Nothing was found at this address. Check the link, and that the file is public.');
	}
	const buf = await res.arrayBuffer();
	const head = new TextDecoder().decode(new Uint8Array(buf.slice(0, 64)));
	const type = (res.headers.get('content-type') || '').split(';')[0] || 'application/octet-stream';
	const sizeBytes = buf.byteLength;
	const magicOk = kind === 'usdz' ? /^(PK|usdh)/.test(head) : head.startsWith('glTF') || /^\s*\{/.test(head);
	const ext = kind === 'model' && /^\s*\{/.test(head) ? 'gltf' : v.ext;
	const rows = [
		row('Reachable', `Yes (${res.status} OK)`, 'ok'),
		row('File size', sizeBytes > MAX_BYTES ? `${formatBytes(sizeBytes)}, over the 64 MB limit` : formatBytes(sizeBytes), sizeBytes > MAX_BYTES ? 'fail' : 'ok'),
		kind === 'usdz' ? row('Cross-origin (CORS)', 'Not needed for AR files', 'na') : row('Cross-origin (CORS)', 'Same site, not needed', 'ok'),
		row('Content type', magicOk ? type : `${type} (not a model file)`, magicOk ? 'ok' : 'fail'),
	];
	const out = { ...base, ext, mime: MIME[ext], sizeBytes, contentType: type, cors: kind === 'usdz' ? null : true, loadable: true };
	if (!magicOk) return result('error', out, rows, "This link opens a web page, not the file. Use the file's direct link.");
	if (sizeBytes > MAX_BYTES) return result('error', out, rows, `The file is ${formatBytes(sizeBytes)}. Use a model under 64 MB so the product page stays fast.`);
	return result('ok', out, rows, 'Ready to use.');
}

/** POST /wc3d/v1/models/check-url stand-in → Promise<{status, title, rows, message, url, …}>. */
export function checkUrl(text, kind = 'model') {
	const v = validateUrl(text, kind);
	if (!v.ok) return Promise.resolve(null);
	if (v.local) return checkLocal(v, kind);
	return new Promise((done) => setTimeout(() => done(simulate(v, kind)), 650));
}

const stamp = () => {
	const d = new Date();
	const p = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** POST /wc3d/v1/models/external stand-in: create or re-use the record for a passing check. */
export function saveExternal(res) {
	if (!res || res.status === 'error') return null;
	const atts = store.get().attachments || {};
	const found = Object.values(atts).find((a) => isExternal(a) && a.kind === res.kind && a.url === res.url);
	const check = { status: res.status, checkedAt: stamp(), contentType: res.contentType || res.mime, cors: res.cors ?? null };
	if (found) {
		const next = { ...found, sizeBytes: res.sizeBytes || found.sizeBytes, check };
		store.patch(['attachments', found.id], next);
		return next;
	}
	const id = store.nextId('attachments');
	const att = { id, kind: res.kind, source: 'url', url: res.url, title: res.title, filename: res.filename, mime: res.mime, sizeBytes: res.sizeBytes || 0, date: check.checkedAt, check };
	if (res.demo) att.demo = res.demo;
	store.patch(['attachments', id], att);
	return att;
}

// ── UI ──────────────────────────────────────────────────────────────────────

/** "External" badge; nothing for library files or with the flag off. */
export function ExternalTag({ att, class: cls }) {
	const on = useFeature(FLAG);
	if (!on || !isExternal(att)) return null;
	return html`<span class=${cx('wc3d-ext-badge', cls)} title=${att.url}>External</span>`;
}

/** Badge + host line: <ExternalHost att prefix="External GLB" />. */
export function ExternalHost({ att, prefix, class: cls }) {
	const on = useFeature(FLAG);
	if (!on || !isExternal(att)) return null;
	return html`<span class=${cx('wc3d-ext-host', cls)} title=${att.url}>
		<span class="wc3d-ext-badge">External</span>
		<span class="wc3d-ext-host__name">${prefix ? `${prefix} · ` : ''}${urlHost(att.url)}</span>
	</span>`;
}

const MARK = { ok: '✓', warn: '!', fail: '✕', na: '–' };

function ResultBox({ res }) {
	const tone = res.status === 'error' ? 'is-error' : res.status === 'warn' ? 'is-warn' : 'is-ok';
	return html`<div class=${cx('wc3d-ext__result', tone)} role="status">
		<h3 class="wc3d-ext__result-title">${res.heading}</h3>
		<dl class="wc3d-ext__rows">
			${res.rows.map(
				(r) => html`<div key=${r.label} class=${'wc3d-ext__row is-' + r.tone}>
					<dt>${r.label}</dt>
					<dd><span class="wc3d-ext__mark" aria-hidden="true">${MARK[r.tone]}</span>${r.value}</dd>
				</div>`
			)}
		</dl>
		${res.message && res.status !== 'ok' && html`<p class="wc3d-ext__msg">${res.message}</p>`}
	</div>`;
}

function Caveats() {
	return html`<aside class="wc3d-ext__notes">
		<h3>About external models</h3>
		<ul>
			<li>The file stays on the other host. Nothing is copied to your site.</li>
			<li>The host must allow your store's domain (CORS), or the viewer can't load the model.</li>
			<li>Draco and Meshopt compressed models work: the decoders ship with the plugin, so nothing else is loaded from other hosts.</li>
			<li>If the file moves or is removed, the viewer shows an error. Check the URL again after changing it on the host.</li>
		</ul>
	</aside>`;
}

let seq = 0;

/** Media-frame tab: const ext = useExternalUrl('model'|'usdz', initialUrl); render ext.pane; ext.ready; ext.use() → attachment. */
export function useExternalUrl(kind = 'model', initialUrl = '') {
	const [text, setText] = useState(initialUrl || '');
	const [touched, setTouched] = useState(false);
	const [busy, setBusy] = useState(false);
	const [res, setRes] = useState(null);
	const run = useRef(0);
	const idRef = useRef(null);
	if (!idRef.current) idRef.current = `wc3d-ext-url-${++seq}`;
	const id = idRef.current;
	const v = validateUrl(text, kind);

	const check = async (value = text) => {
		setTouched(true);
		const vv = validateUrl(value, kind);
		if (!vv.ok) return;
		const n = ++run.current;
		setBusy(true);
		setRes(null);
		const out = await checkUrl(value, kind);
		if (n !== run.current) return;
		setBusy(false);
		setRes(out);
	};
	const edit = (value) => {
		run.current++;
		setText(value);
		setRes(null);
		setBusy(false);
	};

	const ready = !!res && res.status !== 'error' && v.ok && res.url === v.url;
	const isUsdz = kind === 'usdz';
	const pane = html`<div class="wc3d-ext">
		<div class="wc3d-ext__main">
			<label class="wc3d-ext__label" for=${id}>${isUsdz ? 'USDZ file URL' : 'Model URL'}</label>
			<div class="wc3d-ext__field">
				<input
					id=${id}
					type="url"
					class="wc3d-ext__input"
					placeholder=${isUsdz ? 'https://cdn.example.com/models/chair.usdz' : 'https://cdn.example.com/models/chair.glb'}
					value=${text}
					spellcheck="false"
					autocomplete="off"
					aria-describedby=${id + '-help'}
					aria-invalid=${touched && text && !v.ok ? 'true' : undefined}
					onInput=${(e) => edit(e.currentTarget.value)}
					onBlur=${() => text && setTouched(true)}
					onKeyDown=${(e) => e.key === 'Enter' && (e.preventDefault(), check())}
				/>
				<button type="button" class="wc3d-ext__btn" disabled=${!text.trim() || busy} onClick=${() => check()}>${busy ? 'Checking…' : 'Check URL'}</button>
			</div>
			<p class="wc3d-ext__help" id=${id + '-help'}>${isUsdz ? 'Paste a direct link to a .usdz file.' : 'Paste a direct link to a .glb or .gltf file.'}</p>
			${touched && text && !v.ok && v.error && html`<p class="wc3d-ext__error" role="alert">${v.error}</p>`}
			${busy && html`<p class="wc3d-ext__busy" role="status"><span class="wc3d-ext__spinner" aria-hidden="true"></span>Checking ${urlHost(v.url)}…</p>`}
			${res && html`<${ResultBox} res=${res} />`}
			<div class="wc3d-ext__demo">
				<p><span class="wc3d-ext__tag">${protoLabel()}</span>No request leaves the page. Try a demo address:</p>
				<ul>
					${(DEMO_URLS[kind] || DEMO_URLS.model).map(
						([url, label]) => html`<li key=${url}>
							<button type="button" class="wc3d-ext__demo-btn" onClick=${() => (edit(url), check(url))}>
								<span class="wc3d-ext__demo-url">${url}</span>
								<span class=${cx('wc3d-ext__demo-tag', label === 'Works' ? 'is-ok' : label.startsWith('.') ? 'is-warn' : 'is-error')}>${label}</span>
							</button>
						</li>`
					)}
				</ul>
			</div>
		</div>
		<${Caveats} />
	</div>`;

	return { pane, ready, use: () => (ready ? saveExternal(res) : null) };
}

/** Details-sidebar lines for a selected external record (File URL + last check). */
export function ExternalDetails({ att }) {
	const on = useFeature(FLAG);
	if (!on || !isExternal(att)) return null;
	return html`<div class="wc3d-ext-details">
		<span class="wc3d-ext-badge">External</span>
		<label>File URL:</label>
		<input type="text" readonly value=${att.url} onFocus=${(e) => e.currentTarget.select()} />
		${att.check?.checkedAt && html`<div class="wc3d-ext-details__checked">Last checked: ${att.check.checkedAt}</div>`}
	</div>`;
}
