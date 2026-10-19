// 3D Viewer → Analytics (Pro): a copy of 3d-viewer-premium/src/admin/analytics (App, KpiTiles, Timeline,
// LoadHealth, QrFunnel, TopTable, Diagnostics). Numbers are sample data generated from the demo's viewers
// with a seeded PRNG per viewer and day, so a day always shows the same figures.
import { html, useState, useEffect, useLayoutEffect, useMemo, useRef } from '../../js/core/ui.js';
import { useStore } from '../../js/core/store.js';
import { WpAdmin } from '../../js/screens/admin/chrome.js';
import { modelKeyFromUrl, MODELS } from '../ui/models.js';
import { currentModel, hotspotsOf } from './render.js';
import { settingsDefaults } from './settings-data.js';

// ── format.ts ────────────────────────────────────────────────────────────────
const fmtInt = (n) => Math.round(n || 0).toLocaleString('en-US');
const fmtCompact = (n) => {
	const v = Math.round(n || 0);
	if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
	if (Math.abs(v) >= 10_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
	return v.toLocaleString('en-US');
};
const ratio = (num, den) => (den > 0 ? num / den : null);
const fmtPct = (value, digits = 1) => (value === null ? '—' : `${(value * 100).toFixed(digits)} %`);
const fmtDuration = (seconds) => {
	if (seconds === null) return '—';
	const s = Math.round(seconds);
	if (s < 60) return `${s} s`;
	const m = Math.floor(s / 60);
	const rest = s % 60;
	return rest ? `${m} m ${rest} s` : `${m} m`;
};
const fmtMs = (ms) => (ms === null ? '—' : `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)} s`);
const change = (current, previous) => (previous > 0 ? (current - previous) / previous : null);
const fmtChange = (delta) => {
	if (delta === null) return '';
	const pct = Math.round(Math.abs(delta) * 100);
	return pct === 0 ? '0 %' : `${delta > 0 ? '▲' : '▼'} ${pct} %`;
};
const fmtPoints = (delta) => {
	if (delta === null) return '';
	const pts = Math.abs(delta * 100).toFixed(1);
	return Number(pts) === 0 ? `${pts} pp` : `${delta > 0 ? '▲' : '▼'} ${pts} pp`;
};
const fmtAgo = (ts, now) => {
	if (!ts) return 'never';
	const diff = Math.max(0, now - ts);
	if (diff < 90) return 'just now';
	if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
	if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
	return `${Math.round(diff / 86400)} days ago`;
};
const fmtIn = (ts, now) => {
	if (!ts) return '—';
	const diff = Math.max(0, ts - now);
	if (diff < 90) return 'in a moment';
	if (diff < 3600) return `in ${Math.round(diff / 60)} min`;
	if (diff < 86400) return `in ${Math.round(diff / 3600)} h`;
	return `in ${Math.round(diff / 86400)} days`;
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (ymd, withYear = false) => {
	const [y, m, d] = ymd.split('-').map(Number);
	return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`;
};
const addDays = (ymd, days) => {
	const [y, m, d] = ymd.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
const dayDiff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const p50Bucket = (buckets) => {
	const total = buckets.reduce((a, b) => a + b, 0);
	if (total === 0) return '—';
	const labels = ['< 1 s', '1–2 s', '2–4 s', '4–8 s', '> 8 s'];
	let cumulative = 0;
	for (let i = 0; i < buckets.length; i++) {
		cumulative += buckets[i];
		if (cumulative >= total / 2) return `≈ ${labels[i]}`;
	}
	return `≈ ${labels[labels.length - 1]}`;
};
const localToday = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── sample data ──────────────────────────────────────────────────────────────
function hash(str) {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
	return h >>> 0;
}
function prng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const METRICS = [
	'page_views', 'views', 'interacted', 'dwell_seconds', 'loaded', 'ar_launched', 'ar_quick_look', 'ar_scene_viewer', 'ar_webxr',
	'ar_qr_shown', 'ar_from_qr', 'ar_placed', 'added_to_cart', 'atc_pages', 'product_page_views', 'hotspot_clicks',
	'mobile_model_views', 'mobile_loaded', 'mobile_failed', 'mobile_b1', 'mobile_b2', 'mobile_b3', 'mobile_b4', 'mobile_b5',
	'desktop_model_views', 'desktop_loaded', 'desktop_failed', 'desktop_b1', 'desktop_b2', 'desktop_b3', 'desktop_b4', 'desktop_b5',
];
const zero = () => Object.fromEntries(METRICS.map((k) => [k, 0]));
const addInto = (a, b) => {
	for (const k of METRICS) a[k] += b[k] || 0;
	return a;
};

/** One tracked item (a viewer, or a product with a 3D model) on one day. */
function dayMetrics(item, ymd) {
	// Nothing is recorded before the viewer or product went live.
	if (item.since && ymd < item.since) return zero();
	const r = prng(hash(item.key + '|' + ymd));
	const [y, m, d] = ymd.split('-').map(Number);
	const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
	const season = dow === 0 || dow === 6 ? 0.72 : 1;
	const growth = 1 + Math.max(0, 120 - dayDiff(ymd, item.today)) / 240;
	const pv = Math.round(item.weight * 11 * season * growth * (0.55 + r() * 0.9));
	const out = zero();
	if (pv <= 0) return out;
	out.page_views = pv;
	out.views = pv + Math.round(pv * r() * 0.12);
	out.interacted = Math.round(out.views * (0.34 + r() * 0.24));
	out.dwell_seconds = Math.round(out.interacted * (24 + r() * 40));
	if (item.ar) {
		out.ar_launched = Math.round(pv * (0.03 + r() * 0.07));
		out.ar_quick_look = Math.round(out.ar_launched * 0.56);
		out.ar_webxr = Math.round(out.ar_launched * 0.12);
		out.ar_scene_viewer = out.ar_launched - out.ar_quick_look - out.ar_webxr;
		out.ar_qr_shown = Math.round(pv * (0.04 + r() * 0.05));
		out.ar_from_qr = Math.round(out.ar_qr_shown * (0.2 + r() * 0.25));
		out.ar_placed = Math.round(out.ar_webxr * 0.7);
	}
	if (item.hotspots) out.hotspot_clicks = Math.round(out.interacted * (0.2 + r() * 0.3));
	if (item.product) {
		out.product_page_views = pv;
		out.atc_pages = Math.round(pv * (0.05 + r() * 0.07));
		out.added_to_cart = out.atc_pages;
	}
	const mobile = Math.round(out.views * (0.38 + r() * 0.12));
	const desktop = out.views - mobile;
	for (const [prefix, n, slow] of [['mobile', mobile, 1.6], ['desktop', desktop, 1]]) {
		const failed = r() < 0.08 ? 1 : 0;
		const loaded = Math.max(0, Math.round(n * (0.86 + r() * 0.12)) - failed);
		out[prefix + '_model_views'] = n;
		out[prefix + '_loaded'] = loaded;
		out[prefix + '_failed'] = failed;
		const shares = [0.52 / slow, 0.28, 0.12 * slow, 0.05 * slow, 0.03 * slow];
		const sum = shares.reduce((a, b) => a + b, 0);
		let left = loaded;
		shares.forEach((s, i) => {
			const v = i === 4 ? left : Math.min(left, Math.round((loaded * s) / sum));
			out[`${prefix}_b${i + 1}`] = v;
			left -= v;
		});
	}
	out.loaded = out.mobile_loaded + out.desktop_loaded;
	return out;
}

/** Tracked items from the store: published viewers, plus products that use 3D Viewer. */
function trackedItems(state, today) {
	const items = [];
	// ReportsModel::resolveLabel(): the attachment's title, else the file name.
	const label = (url, file) => MODELS[modelKeyFromUrl(url)]?.title || file;
	for (const v of Object.values(state.viewers || {})) {
		if (v.status !== 'publish') continue;
		const m = currentModel(v.attrs || {}, 0, true);
		const url = m.modelUrl || '';
		const file = String(url).split(/[?#]/)[0].split('/').pop() || '';
		const r = prng(hash('w' + v.id));
		items.push({
			key: 'viewer-' + v.id,
			today,
			since: String(v.date || '').slice(0, 10),
			weight: 0.6 + r() * 1.6,
			ar: !!m.arEnabled,
			hotspots: hotspotsOf(v.attrs || {}, m).length > 0,
			model: { key: file || 'model-' + v.id, label: label(url, file) || v.title, url },
			// The viewer post type is not public: its row links to the edit screen only.
			post: { id: v.id, title: v.title || '#' + v.id, type: '3D Viewer', permalink: '', editLink: '#v3d.edit.' + v.id },
		});
	}
	for (const pid of Object.keys(state.v3dProducts || {})) {
		const p = state.products?.[pid];
		const rows = (state.v3dProducts[pid]?.bp3d_models || []).filter((m) => m && m.model_src);
		if (!p || (p.status && p.status !== 'publish') || !rows.length) continue;
		const file = String(rows[0].model_src).split(/[?#]/)[0].split('/').pop() || '';
		const r = prng(hash('p' + pid));
		items.push({
			key: 'product-' + pid,
			today,
			since: String(p.dateCreated || '').slice(0, 10),
			weight: 0.5 + r() * 1.2,
			ar: rows.some((m) => m.enable_ar),
			product: true,
			model: { key: file || 'product-model-' + pid, label: label(rows[0].model_src, file) || p.name, url: rows[0].model_src },
			post: { id: 'p' + pid, title: p.name, type: 'Product', permalink: '#store.product.' + p.slug, editLink: '#admin.product.' + pid },
		});
	}
	return items;
}

function buildData(items, range, today) {
	const days = dayDiff(range.from, range.to) + 1;
	const prevTo = addDays(range.from, -1);
	const prevFrom = addDays(prevTo, -(days - 1));
	const current = zero();
	const previousTotals = zero();
	const timeline = [];
	const perItem = new Map(items.map((it) => [it.key, zero()]));
	for (let i = 0; i < days; i++) {
		const day = addDays(range.from, i);
		const row = { day, page_views: 0, views: 0, interacted: 0, ar_launched: 0, atc_pages: 0 };
		for (const it of items) {
			const m = dayMetrics(it, day);
			addInto(current, m);
			addInto(perItem.get(it.key), m);
			for (const k of Object.keys(row)) if (k !== 'day') row[k] += m[k];
		}
		timeline.push(row);
	}
	for (let i = 0; i < days; i++) {
		const day = addDays(prevFrom, i);
		for (const it of items) addInto(previousTotals, dayMetrics(it, day));
	}

	const models = new Map();
	for (const it of items) {
		const t = perItem.get(it.key);
		const row = models.get(it.model.key) || { key: it.model.key, label: it.model.label, url: it.model.url || '', ...zero() };
		addInto(row, t);
		models.set(it.model.key, row);
	}
	const topModels = [...models.values()].filter((r) => r.views > 0).sort((a, b) => b.views - a.views);

	// Viewers are embedded on the 3D Showcase page too: most views happen there.
	const showcase = { id: 'page-showcase', title: '3D Showcase', type: 'Page', permalink: '#store.viewer', editLink: '', ...zero() };
	const posts = [];
	for (const it of items) {
		const t = perItem.get(it.key);
		if (it.product) {
			posts.push({ ...it.post, ...t });
			continue;
		}
		const share = Object.fromEntries(METRICS.map((k) => [k, Math.round(t[k] * 0.68)]));
		addInto(showcase, share);
		posts.push({ ...it.post, ...Object.fromEntries(METRICS.map((k) => [k, t[k] - share[k]])) });
	}
	if (showcase.page_views > 0) posts.push(showcase);
	const topPosts = posts.filter((r) => r.page_views > 0).sort((a, b) => b.page_views - a.page_views);

	const rt = prng(hash('load|' + today));
	const summary = {
		from: range.from,
		to: range.to,
		days,
		previous: { from: prevFrom, to: prevTo },
		current,
		previousTotals,
		loadP50Today: { mobile: Math.round(900 + rt() * 700), desktop: Math.round(420 + rt() * 380) },
	};
	return { summary, timeline, topModels, topPosts };
}

// ── components ───────────────────────────────────────────────────────────────
const Icon = ({ children }) => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${children}</svg>`;
const DownloadIcon = () => html`<${Icon}><path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><//>`;
const ICON_VIEWS = html`<${Icon}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /><//>`;
const ICON_INTERACTION = html`<${Icon}><path d="m5 3 14 7-6 2-2 6L5 3Z" /><//>`;
const ICON_TIME = html`<${Icon}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /><//>`;
const ICON_AR = html`<${Icon}><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" /><path d="m12 12 9-5M12 12v10M12 12 3 7" /><//>`;
const ICON_CART = html`<${Icon}><path d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><//>`;

const PRESETS = [
	['7', 'Last 7 days'],
	['30', 'Last 30 days'],
	['90', 'Last 90 days'],
	['365', 'Last 12 months'],
	['custom', 'Custom…'],
];
const presetRange = (preset, today) => ({ preset, to: today, from: addDays(today, -(Number(preset) - 1)) });

function RangePicker({ range, today, onChange }) {
	const [from, setFrom] = useState(range.from);
	const [to, setTo] = useState(range.to);
	useEffect(() => {
		setFrom(range.from);
		setTo(range.to);
	}, [range.from, range.to]);
	const select = (value) => (value === 'custom' ? onChange({ ...range, preset: 'custom' }) : onChange(presetRange(value, today)));
	const apply = () => {
		if (!from || !to) return;
		const f = from > today ? today : from;
		const t = to > today ? today : to;
		onChange({ preset: 'custom', from: f <= t ? f : t, to: f <= t ? t : f });
	};
	return html`<div class="bp3d-an-range" role="group" aria-label="Date range">
		<div class="bp3d-an-seg">
			${PRESETS.map(([value, label]) => html`<button key=${value} type="button" aria-pressed=${range.preset === value} onClick=${() => value !== range.preset && select(value)}>${label}</button>`)}
		</div>
		${range.preset === 'custom' &&
		html`<span class="bp3d-an-range__custom">
			<input class="bp3d-an-input" type="date" value=${from} max=${today} onInput=${(e) => setFrom(e.currentTarget.value)} aria-label="From" />
			<span aria-hidden="true">–</span>
			<input class="bp3d-an-input" type="date" value=${to} max=${today} onInput=${(e) => setTo(e.currentTarget.value)} aria-label="To" />
			<button type="button" class="bp3d-an-btn bp3d-an-btn--soft" onClick=${apply}>Apply</button>
		</span>`}
	</div>`;
}

function Delta({ delta, text, since }) {
	if (delta === null || !text) return html`<span class="bp3d-an-tile__delta is-empty">no previous data</span>`;
	return html`<span class=${'bp3d-an-tile__delta' + (text.startsWith('▲') ? ' is-up' : text.startsWith('▼') ? ' is-down' : '')} title=${since}>
		${text} <span class="bp3d-an-tile__since">vs previous</span>
	</span>`;
}

function KpiTiles({ summary, woo }) {
	const cur = summary.current;
	const prev = summary.previousTotals;
	const since = `Previous period: ${summary.previous.from} – ${summary.previous.to}`;
	const interaction = ratio(cur.interacted, cur.views);
	const prevInteraction = ratio(prev.interacted, prev.views);
	const avgDwell = ratio(cur.dwell_seconds, cur.views);
	const prevDwell = ratio(prev.dwell_seconds, prev.views);
	const atc = ratio(cur.atc_pages, cur.product_page_views);
	const prevAtc = ratio(prev.atc_pages, prev.product_page_views);
	const ios = ratio(cur.ar_quick_look, cur.ar_launched);
	const android = ratio(cur.ar_scene_viewer + cur.ar_webxr, cur.ar_launched);
	const pts = (a, b) => (a !== null && b !== null ? a - b : null);
	const dwellDelta = avgDwell !== null && prevDwell !== null && prevDwell > 0 ? (avgDwell - prevDwell) / prevDwell : null;

	const tiles = [
		{ label: '3D views', value: fmtCompact(cur.page_views), title: fmtInt(cur.page_views), icon: ICON_VIEWS, delta: change(cur.page_views, prev.page_views), deltaText: fmtChange(change(cur.page_views, prev.page_views)), sub: cur.views !== cur.page_views ? `${fmtInt(cur.views)} viewer instances` : undefined },
		{ label: 'Interaction', value: fmtPct(interaction), icon: ICON_INTERACTION, delta: pts(interaction, prevInteraction), deltaText: fmtPoints(pts(interaction, prevInteraction)), sub: 'moved the camera or used a control' },
		{ label: 'Avg time in 3D', value: fmtDuration(avgDwell), icon: ICON_TIME, delta: dwellDelta, deltaText: fmtChange(dwellDelta), sub: 'while at least half on screen' },
		{ label: 'AR launches', value: fmtCompact(cur.ar_launched), title: fmtInt(cur.ar_launched), icon: ICON_AR, delta: change(cur.ar_launched, prev.ar_launched), deltaText: fmtChange(change(cur.ar_launched, prev.ar_launched)), sub: cur.ar_launched > 0 ? `${fmtPct(ios, 0)} iOS · ${fmtPct(android, 0)} Android` : undefined },
	];
	if (woo && (cur.product_page_views > 0 || prev.product_page_views > 0)) {
		tiles.push({ label: 'Add-to-cart', value: fmtPct(atc), icon: ICON_CART, delta: pts(atc, prevAtc), deltaText: fmtPoints(pts(atc, prevAtc)), sub: `${fmtInt(cur.atc_pages)} of 3D product views (WooCommerce)` });
	}

	return html`<div class="bp3d-an-tiles">
		${tiles.map(
			(t) => html`<div class="bp3d-an-tile" key=${t.label}>
				<div class="bp3d-an-tile__top">
					<div class="bp3d-an-tile__label">${t.label}</div>
					<span class="bp3d-an-tile__icon">${t.icon}</span>
				</div>
				<div class="bp3d-an-tile__value" title=${t.title}>${t.value}</div>
				<${Delta} delta=${t.delta} text=${t.deltaText} since=${since} />
				${t.sub && html`<div class="bp3d-an-tile__sub">${t.sub}</div>`}
			</div>`
		)}
	</div>`;
}

const CHARTS = [
	{ key: 'page_views', label: '3D views per day', color: 'var(--bp3d-an-series-1)' },
	{ key: 'ar_launched', label: 'AR launches per day', color: 'var(--bp3d-an-series-2)' },
];
const TOOLTIP_ROWS = [
	{ key: 'page_views', label: '3D views', color: 'var(--bp3d-an-series-1)' },
	{ key: 'ar_launched', label: 'AR launches', color: 'var(--bp3d-an-series-2)' },
	{ key: 'interacted', label: 'Interacted' },
	{ key: 'atc_pages', label: 'Add-to-cart' },
];
const M = { top: 14, right: 16, bottom: 26, left: 44 };
const H = 168;
const niceMax = (max) => {
	if (max <= 4) return 4;
	const pow = Math.pow(10, Math.floor(Math.log10(max)));
	const unit = max / pow;
	const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 4 ? 4 : unit <= 5 ? 5 : 10;
	return step * pow;
};

function SmallMultiple({ rows, series, width, hover, onHover }) {
	const n = rows.length;
	const plotW = width - M.left - M.right;
	const plotH = H - M.top - M.bottom;
	const max = niceMax(Math.max(0, ...rows.map((r) => Number(r[series.key]) || 0)));
	const x = (i) => M.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
	const y = (v) => M.top + plotH - (v / max) * plotH;
	const points = rows.map((r, i) => [x(i), y(Number(r[series.key]) || 0)]);
	const line = points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
	const area = n > 0 ? `${line} L${points[n - 1][0].toFixed(1)},${(M.top + plotH).toFixed(1)} L${points[0][0].toFixed(1)},${(M.top + plotH).toFixed(1)} Z` : '';
	const ticks = [0, Math.round(max / 2), max];
	const every = Math.max(1, Math.ceil(n / (width < 480 ? 4 : 7)));
	const last = n - 1;
	const fromEvent = (e) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const px = ((e.clientX - rect.left) / rect.width) * width;
		const i = n <= 1 ? 0 : Math.round(((px - M.left) / plotW) * (n - 1));
		onHover(Math.max(0, Math.min(n - 1, i)), px);
	};
	const onKey = (e) => {
		if (e.key === 'ArrowRight') onHover(Math.min(last, (hover ?? -1) + 1), x(Math.min(last, (hover ?? -1) + 1)));
		if (e.key === 'ArrowLeft') onHover(Math.max(0, (hover ?? n) - 1), x(Math.max(0, (hover ?? n) - 1)));
		if (e.key === 'Escape') onHover(null, 0);
	};
	return html`<figure class="bp3d-an-chart">
		<figcaption class="bp3d-an-chart__title"><span class="bp3d-an-chart__key" style=${{ background: series.color }} aria-hidden="true"></span>${series.label}</figcaption>
		<svg viewBox=${`0 0 ${width} ${H}`} width=${width} height=${H} role="img" aria-label=${series.label} tabindex="0" onPointerMove=${fromEvent} onPointerLeave=${() => onHover(null, 0)} onKeyDown=${onKey}>
			${ticks.map(
				(t) => html`<g key=${t}>
					<line x1=${M.left} x2=${width - M.right} y1=${y(t)} y2=${y(t)} class=${t === 0 ? 'bp3d-an-chart__baseline' : 'bp3d-an-chart__grid'} />
					<text x=${M.left - 8} y=${y(t)} dy="0.32em" text-anchor="end" class="bp3d-an-chart__tick">${fmtInt(t)}</text>
				</g>`
			)}
			${rows.map((r, i) => (i % every === 0 || i === last) && !(i !== last && last - i < every * 0.6) && html`<text key=${r.day} x=${x(i)} y=${H - 8} text-anchor=${i === last ? 'end' : i === 0 ? 'start' : 'middle'} class="bp3d-an-chart__tick">${dayLabel(r.day)}</text>`)}
			${n > 0 && html`<path d=${area} fill=${series.color} opacity="0.08" />`}
			${n > 1 && html`<path d=${line} fill="none" stroke=${series.color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`}
			${n > 0 &&
			html`<circle cx=${points[last][0]} cy=${points[last][1]} r="5" fill=${series.color} stroke="var(--bp3d-an-surface)" stroke-width="2" />
				<text x=${points[last][0] - 8} y=${points[last][1] - 8} text-anchor="end" class="bp3d-an-chart__end-label">${fmtInt(Number(rows[last][series.key]) || 0)}</text>`}
			${hover !== null &&
			rows[hover] &&
			html`<g class="bp3d-an-chart__crosshair">
				<line x1=${points[hover][0]} x2=${points[hover][0]} y1=${M.top} y2=${M.top + plotH} />
				<circle cx=${points[hover][0]} cy=${points[hover][1]} r="5" fill=${series.color} stroke="var(--bp3d-an-surface)" stroke-width="2" />
			</g>`}
		</svg>
	</figure>`;
}

function useWidth(ref) {
	const [width, setWidth] = useState(720);
	useEffect(() => {
		const measure = () => ref.current && setWidth(Math.max(240, ref.current.clientWidth));
		measure();
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
		if (ro && ref.current) ro.observe(ref.current);
		window.addEventListener('resize', measure);
		return () => {
			ro?.disconnect();
			window.removeEventListener('resize', measure);
		};
	}, []);
	return width;
}

function Timeline({ rows }) {
	const wrap = useRef(null);
	const width = useWidth(wrap);
	const [hover, setHover] = useState(null);
	const [showTable, setShowTable] = useState(false);
	const total = useMemo(() => rows.reduce((a, r) => a + (r.page_views || 0) + (r.ar_launched || 0), 0), [rows]);
	const onHover = (index, x) => setHover(index === null ? null : { index, x });
	if (!rows.length || total === 0) return html`<p class="bp3d-an-empty" ref=${wrap}>No activity in this range.</p>`;
	const tip = hover ? rows[hover.index] : null;
	const tipLeft = hover ? Math.min(Math.max(hover.x, 90), width - 90) : 0;
	return html`<div class="bp3d-an-timeline" ref=${wrap}>
		${CHARTS.map((s) => html`<${SmallMultiple} key=${s.key} rows=${rows} series=${s} width=${width} hover=${hover?.index ?? null} onHover=${onHover} />`)}
		${tip &&
		html`<div class="bp3d-an-tooltip" style=${{ left: tipLeft + 'px' }} role="status">
			<div class="bp3d-an-tooltip__day">${dayLabel(tip.day, true)}</div>
			${TOOLTIP_ROWS.map(
				(r) => html`<div class="bp3d-an-tooltip__row" key=${r.key}>
					<span class="bp3d-an-tooltip__key" style=${{ background: r.color || 'transparent' }} aria-hidden="true"></span>
					<strong>${fmtInt(tip[r.key])}</strong>
					<span>${r.label}</span>
				</div>`
			)}
		</div>`}
		<div class="bp3d-an-timeline__footer">
			<button type="button" class="bp3d-an-textlink" onClick=${() => setShowTable(!showTable)} aria-expanded=${showTable}>${showTable ? 'Hide table' : 'Show as table'}</button>
		</div>
		${showTable &&
		html`<div class="bp3d-an-table-scroll" role="region" tabindex="0" aria-label="Views and AR launches per day">
			<table class="bp3d-an-table bp3d-an-table--compact">
				<thead><tr><th>Day</th>${TOOLTIP_ROWS.map((r) => html`<th key=${r.key} class="num">${r.label}</th>`)}</tr></thead>
				<tbody>${rows.map((r) => html`<tr key=${r.day}><td>${r.day}</td>${TOOLTIP_ROWS.map((c) => html`<td key=${c.key} class="num">${fmtInt(r[c.key])}</td>`)}</tr>`)}</tbody>
			</table>
		</div>`}
	</div>`;
}

const BUCKET_LABELS = ['< 1 s', '1–2 s', '2–4 s', '4–8 s', '> 8 s'];
const BUCKET_COLORS = ['#558cff', '#3574fe', '#1b5cf0', '#003dca', '#002b94'];

function DeviceRow({ name, prefix, summary }) {
	const c = summary.current;
	const views = c[prefix + '_model_views'] || 0;
	const buckets = [1, 2, 3, 4, 5].map((i) => c[`${prefix}_b${i}`] || 0);
	const total = buckets.reduce((a, b) => a + b, 0);
	const today = summary.loadP50Today[prefix];
	const bucketText = (i) => `${BUCKET_LABELS[i]}: ${fmtInt(buckets[i])} (${fmtPct(total > 0 ? buckets[i] / total : 0, 0)})`;
	return html`<div class="bp3d-an-load__row">
		<div class="bp3d-an-load__name">${name}</div>
		<div class="bp3d-an-load__stats">
			<span><strong>${fmtPct(ratio(c[prefix + '_loaded'] || 0, views), 1)}</strong> finished loading</span>
			<span><strong>${fmtInt(c[prefix + '_failed'] || 0)}</strong> load errors</span>
			<span><strong>${p50Bucket(buckets)}</strong> median load (range)</span>
			${today !== null && html`<span><strong>${fmtMs(today)}</strong> median today</span>`}
			<span class="bp3d-an-load__n">${fmtInt(views)} viewer instances</span>
		</div>
		${total > 0 &&
		html`<div class="bp3d-an-load__dist" role="img" aria-label=${`Load time distribution, ${name}. ${BUCKET_LABELS.map((_, i) => bucketText(i)).join('; ')}`}>
			${buckets.map((n, i) => n > 0 && html`<span key=${i} class="bp3d-an-load__seg" style=${{ flexGrow: n, background: BUCKET_COLORS[i] }} title=${bucketText(i)}></span>`)}
		</div>`}
	</div>`;
}

const LoadHealth = ({ summary }) => html`<div class="bp3d-an-card">
	<div class="bp3d-an-card__head">
		<h2>Load health</h2>
		<span class="bp3d-an-card__hint">Lite and Advanced viewers, model mode only. Models load when scrolled into view, so viewers nobody reached count as not loaded, not as errors.</span>
	</div>
	<${DeviceRow} name="Mobile" prefix="mobile" summary=${summary} />
	<${DeviceRow} name="Desktop" prefix="desktop" summary=${summary} />
	<div class="bp3d-an-load__legend" aria-hidden="true">${BUCKET_LABELS.map((l, i) => html`<span key=${l}><i style=${{ background: BUCKET_COLORS[i] }}></i>${l}</span>`)}</div>
</div>`;

function QrFunnel({ summary }) {
	const c = summary.current;
	if (!c.ar_qr_shown && !c.ar_from_qr) return null;
	return html`<div class="bp3d-an-card">
		<div class="bp3d-an-card__head">
			<h2>QR funnel</h2>
			<span class="bp3d-an-card__hint">Desktop QR code → AR on the phone</span>
		</div>
		<div class="bp3d-an-funnel">
			<div class="bp3d-an-funnel__step"><strong>${fmtInt(c.ar_qr_shown)}</strong><span>QR codes shown</span></div>
			<div class="bp3d-an-funnel__arrow" aria-hidden="true">→</div>
			<div class="bp3d-an-funnel__step"><strong>${fmtInt(c.ar_from_qr)}</strong><span>AR opened from QR ${c.ar_qr_shown > 0 && html`<em>(${fmtPct(ratio(c.ar_from_qr, c.ar_qr_shown), 0)})</em>`}</span></div>
			<div class="bp3d-an-funnel__arrow" aria-hidden="true">→</div>
			<div class="bp3d-an-funnel__step"><strong>${fmtInt(c.ar_placed)}</strong><span>placed in the room (WebXR only)</span></div>
		</div>
	</div>`;
}

function TopTable({ kind, rows, woo, onExport }) {
	const title = kind === 'model' ? 'Top models' : 'Top pages, products & viewers';
	const isModel = kind === 'model';
	return html`<div class="bp3d-an-card">
		<div class="bp3d-an-card__head">
			<h2>${title}</h2>
			<button type="button" class="bp3d-an-linkbtn" onClick=${onExport}><${DownloadIcon} />CSV</button>
		</div>
		${rows.length === 0
			? html`<p class="bp3d-an-empty">No activity in this range.</p>`
			: html`<div class="bp3d-an-table-scroll" role="region" tabindex="0" aria-label=${title}>
					<table class="bp3d-an-table">
						<thead>
							<tr>
								<th>${isModel ? 'Model' : 'Item'}</th>
								<th class="num">${isModel ? 'Viewer instances' : '3D views'}</th>
								<th class="num">Interaction</th>
								<th class="num">Avg time</th>
								<th class="num">AR</th>
								${woo && html`<th class="num">Add-to-cart</th>`}
								${isModel && html`<th class="num">Hotspot clicks</th>`}
							</tr>
						</thead>
						<tbody>
							${rows.map(
								(row) => html`<tr key=${isModel ? row.key : row.id}>
									<td class="bp3d-an-table__name">
										${isModel
											? html`<span title=${row.url || row.label}>${row.label}</span>`
											: html`<span class="bp3d-an-table__namecell">
													${row.permalink ? html`<a href=${row.permalink} target="_blank" rel="noopener">${row.title}</a>` : html`<span>${row.title}</span>`}
													${row.type && html`<span class="bp3d-an-table__type">${row.type}</span>`}
													${row.editLink && html`<a class="bp3d-an-table__edit" href=${row.editLink}>Edit</a>`}
												</span>`}
									</td>
									<td class="num">${fmtInt(isModel ? row.views : row.page_views)}</td>
									<td class="num">${fmtPct(ratio(row.interacted, row.views), 0)}</td>
									<td class="num">${fmtDuration(ratio(row.dwell_seconds, row.views))}</td>
									<td class="num">${fmtInt(row.ar_launched)}</td>
									${woo && html`<td class="num">${isModel ? fmtInt(row.added_to_cart) : row.product_page_views > 0 ? fmtPct(ratio(row.atc_pages, row.product_page_views), 1) : '—'}</td>`}
									${isModel && html`<td class="num">${fmtInt(row.hotspot_clicks)}</td>`}
								</tr>`
							)}
						</tbody>
					</table>
				</div>`}
	</div>`;
}

function Diagnostics({ data, items, retention }) {
	const now = Math.floor(Date.now() / 1000);
	const midnight = new Date();
	midnight.setHours(0, 0, 0, 0);
	const rollup = Math.floor(midnight.getTime() / 1000) + 3 * 3600 + 300;
	const lastRollup = rollup <= now ? rollup : rollup - 86400;
	const raw = Math.round((data?.summary.current.views || 0) * 2.6) + items.length * 40;
	const tz = (() => {
		try {
			return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
		} catch {
			return 'UTC';
		}
	})();
	return html`<div class="bp3d-an-diagnostics">
		<p class="bp3d-an-diagnostics__line">
			<span>Last data received: ${items.length ? fmtAgo(now - 140, now) : 'never'}</span>
			<span>Last nightly rollup: ${fmtAgo(lastRollup, now)} (${addDays(localToday(), -1)})</span>
			<span>${fmtInt(raw)} detailed rows · ${fmtInt(items.length * 400)} daily rows</span>
			<span>Next rollup: ${fmtIn(lastRollup + 86400, now)}</span>
			<span>Detailed rows kept ${retention} days · times in ${tz}</span>
			<a href="#v3d.settings.analytics">Settings</a>
		</p>
	</div>`;
}

// Skeleton.tsx: the first-load placeholder in the loaded layout's shape.
const Line = ({ w, h, bar = 12, cls = '' }) => html`<span class=${'bp3d-an-skel__line ' + cls} style=${{ height: h + 'px' }}><span class="bp3d-an-skel__bar" style=${{ width: w, height: bar + 'px' }}></span></span>`;
const SkelChart = () => html`<div class="bp3d-an-skel__chart"><${Line} w="132px" h=${17} bar=${10} /><span class="bp3d-an-skel__bar bp3d-an-skel__plot"></span></div>`;
const SkelTable = () => html`<div class="bp3d-an-card bp3d-an-skel-card">
	<div class="bp3d-an-card__head"><${Line} w="40%" h=${34} bar=${16} cls="is-grow" /><span class="bp3d-an-skel__bar bp3d-an-skel__control"></span></div>
	<div class="bp3d-an-skel__thead"><${Line} w="18%" h=${18} bar=${10} /><${Line} w="36%" h=${18} bar=${10} cls="is-end" /></div>
	${[52, 40, 46, 34, 44, 38].map((w) => html`<div class="bp3d-an-skel__tr" key=${w}><${Line} w=${w + '%'} h=${20} /><${Line} w="30%" h=${20} cls="is-end" /></div>`)}
</div>`;
const Skeleton = ({ tiles }) => html`<div class="bp3d-an-skeleton" aria-hidden="true">
	<div class="bp3d-an-tiles">
		${Array.from({ length: tiles }, (_, i) => html`<div class="bp3d-an-skel-tile" key=${i}>
			<div class="bp3d-an-skel-tile__top"><${Line} w="56%" h=${20} cls="is-grow" /><span class="bp3d-an-skel__bar bp3d-an-skel__chip"></span></div>
			<${Line} w="48%" h=${36} bar=${26} cls="is-value" />
			<span class="bp3d-an-skel__bar bp3d-an-skel__pill"></span>
			<${Line} w="78%" h=${18} cls="is-sub" />
			<${Line} w="44%" h=${18} cls="is-sub-2" />
		</div>`)}
	</div>
	<div class="bp3d-an-layout">
		<div class="bp3d-an-card bp3d-an-skel-card is-span-8">
			<div class="bp3d-an-card__head"><${Line} w="44%" h=${21} bar=${16} cls="is-grow" /></div>
			<${SkelChart} /><${SkelChart} /><${Line} w="96px" h=${20} />
		</div>
		<div class="bp3d-an-col is-span-4">
			<div class="bp3d-an-card bp3d-an-skel-card">
				<div class="bp3d-an-card__head"><${Line} w="40%" h=${21} bar=${16} cls="is-grow" /><${Line} w="76%" h=${20} cls="is-hint" /></div>
				${[0, 1].map((i) => html`<div class="bp3d-an-load__row" key=${i}><${Line} w="56px" h=${18} /><div class="bp3d-an-skel__stats"><${Line} w="92%" h=${18} /><${Line} w="56%" h=${18} cls="is-stats-2" /></div><div class="bp3d-an-load__dist"><span class="bp3d-an-skel__bar"></span></div></div>`)}
				<${Line} w="72%" h=${16} cls="is-legend" />
			</div>
		</div>
		<div class="bp3d-an-col is-span-6"><${SkelTable} /></div>
		<div class="bp3d-an-col is-span-6"><${SkelTable} /></div>
	</div>
</div>`;

function csvOf(name, header, rows) {
	const q = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
	return { name, text: [header, ...rows].map((r) => r.map(q).join(',')).join('\n') };
}

function ExportDialog({ file, onClose }) {
	const ref = useRef(null);
	// Layout effect: Escape works from the first frame the dialog is on screen.
	useLayoutEffect(() => {
		ref.current?.focus();
		ref.current?.select();
		const onKey = (e) => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, []);
	return html`<div class="ld-an-modal-back" onClick=${(e) => e.target === e.currentTarget && onClose()}>
		<div class="ld-an-modal" role="dialog" aria-modal="true" aria-label="Export CSV">
			<div class="ld-an-modal__head">
				<strong>${file.name}</strong>
				<button type="button" class="ld-an-modal__x" aria-label="Close" onClick=${onClose}>×</button>
			</div>
			<p class="ld-an-modal__note">On a real site this downloads <code>${file.name}</code>. In the demo the file is shown here so you can copy it.</p>
			<textarea ref=${ref} readonly rows="12" spellcheck="false">${file.text}</textarea>
			<div class="ld-an-modal__foot"><button type="button" class="bp3d-an-btn bp3d-an-btn--primary" onClick=${onClose}>Done</button></div>
		</div>
	</div>`;
}

export default function Analytics() {
	const state = useStore();
	const today = useMemo(localToday, []);
	const [range, setRange] = useState(() => presetRange('30', today));
	const [shown, setShown] = useState(range);
	const [loading, setLoading] = useState(false);
	const [file, setFile] = useState(null);
	// The real page fetches five REST reports before anything shows; the demo keeps that first beat.
	const [firstLoad, setFirstLoad] = useState(true);
	useEffect(() => {
		const t = setTimeout(() => setFirstLoad(false), 450);
		return () => clearTimeout(t);
	}, []);
	const items = useMemo(() => trackedItems(state, today), [state.viewers, state.v3dProducts, state.products, today]);
	const data = useMemo(() => buildData(items, shown, today), [items, shown.from, shown.to, today]);
	const woo = true;

	// The real page refetches over REST; a short progress bar keeps that feel.
	useEffect(() => {
		if (range.from === shown.from && range.to === shown.to) return setShown(range);
		setLoading(true);
		const t = setTimeout(() => {
			setShown(range);
			setLoading(false);
		}, 380);
		return () => clearTimeout(t);
	}, [range.from, range.to, range.preset]);

	// AnalyticsPro::exportCsv(): same columns and file names as the download.
	const fileName = (report) => `3d-analytics-${report}-${shown.from}-to-${shown.to}.csv`;
	const site = (hash) => (hash ? 'https://demo.bplugins.local/' + hash.replace(/^#store\.(product\.)?/, (m, prod) => (prod ? 'product/' : '')).replace(/^viewer$/, '3d-showcase') + '/' : '');
	const exportTimeline = () =>
		setFile(csvOf(fileName('timeline'), ['Day', '3D page views', 'Viewer instances', 'Interacted', 'AR launches', 'Add-to-cart pages'], data.timeline.map((r) => [r.day, r.page_views, r.views, r.interacted, r.ar_launched, r.atc_pages])));
	const exportModels = () =>
		setFile(csvOf(fileName('models'), ['Model', 'URL', 'Views', 'Interacted', 'Time in 3D (s)', 'AR launches', 'Added to cart', 'Hotspot clicks'], data.topModels.map((r) => [r.label, r.url, r.views, r.interacted, r.dwell_seconds, r.ar_launched, r.added_to_cart, r.hotspot_clicks])));
	const exportPages = () =>
		setFile(csvOf(fileName('pages'), ['Page', 'Type', 'URL', '3D page views', 'Viewer instances', 'Interacted', 'Time in 3D (s)', 'AR launches', 'Add-to-cart pages'], data.topPosts.map((r) => [r.title, r.type, site(r.permalink), r.page_views, r.views, r.interacted, r.dwell_seconds, r.ar_launched, r.atc_pages])));

	const never = items.length === 0;
	const opt = { ...settingsDefaults(), ...(state.lv?.settings || {}) };
	const on = (v) => v === true || v === '1' || v === 1;
	// bp3d_analytics_started is set when Pro creates its tables; the demo site has had Pro since its first item.
	const startedAt = [...items.map((it) => it.since), ...Object.values(state.viewers || {}).map((v) => String(v.date || '').slice(0, 10))].filter(Boolean).sort()[0] || '';

	return html`<${WpAdmin} current="v3d-analytics" title="3D Analytics">
		<div class="wrap ld-an-wrap">
			<div class=${'ld-an bp3d-an' + (loading ? ' is-loading' : '')}>
				<div class="bp3d-an-bar">
					<div class="bp3d-an-bar__inner">
						<div class="bp3d-an-bar__title">
							<span class="bp3d-an-bar__logo" aria-hidden="true"></span>
							<div>
								<h1>3D Analytics</h1>
								${firstLoad
									? html`<p class="bp3d-an-rangeline bp3d-an-skel-range" aria-hidden="true"><span class="bp3d-an-skel__bar"></span></p>`
									: html`<p class="bp3d-an-rangeline">${dayLabel(data.summary.from, true)} – ${dayLabel(data.summary.to, true)} · ${data.summary.days} days</p>`}
							</div>
						</div>
						<div class="bp3d-an-header__controls">
							<${RangePicker} range=${range} today=${today} onChange=${setRange} />
							<button type="button" class="bp3d-an-btn bp3d-an-btn--secondary" onClick=${exportTimeline}><${DownloadIcon} />Export CSV</button>
						</div>
					</div>
					${loading && html`<div class="bp3d-an-bar__progress" aria-hidden="true"></div>`}
				</div>

				<div class="bp3d-an-body">
					${!on(opt.analytics_enabled) &&
					html`<div class="notice notice-warning inline">
						<p>Recording is paused — past data is still shown. <a href="#v3d.settings.analytics">Turn it on in Settings › Analytics</a></p>
					</div>`}
					<span class="screen-reader-text" role="status">${firstLoad ? 'Loading…' : ''}</span>
					${never &&
					html`<div class="bp3d-an-card bp3d-an-empty-state">
						<h2>${startedAt ? `Recording started ${dayLabel(startedAt, true)}.` : 'Recording starts with the first visitor.'}</h2>
						<p>Numbers appear as visitors use your 3D models — today’s activity shows within a minute.${on(opt.analytics_exclude_editors) ? ' Nothing is counted while you are logged in as an editor.' : ''}</p>
					</div>`}
					${firstLoad && html`<${Skeleton} tiles=${woo ? 5 : 4} />`}
					${!firstLoad &&
					html`<${KpiTiles} summary=${data.summary} woo=${woo} />
					<div class="bp3d-an-layout">
						<div class="bp3d-an-card is-span-8">
							<div class="bp3d-an-card__head"><h2>Views and AR launches per day</h2></div>
							<${Timeline} rows=${data.timeline} />
						</div>
						<div class="bp3d-an-col is-span-4">
							<${LoadHealth} summary=${data.summary} />
							<${QrFunnel} summary=${data.summary} />
						</div>
						<div class="bp3d-an-col is-span-6">
							<${TopTable} kind="model" rows=${data.topModels} woo=${woo} onExport=${exportModels} />
						</div>
						<div class="bp3d-an-col is-span-6">
							<${TopTable} kind="post" rows=${data.topPosts} woo=${woo} onExport=${exportPages} />
						</div>
					</div>`}
					<${Diagnostics} data=${data} items=${items} retention=${Number(opt.analytics_retention) || 90} />
				</div>
			</div>
		</div>
		${file && html`<${ExportDialog} file=${file} onClose=${() => setFile(null)} />`}
	<//>`;
}
