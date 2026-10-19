#!/usr/bin/env node
/**
 * Smoke-checks the live demo (live-demo.html): opens routes, fails on console errors,
 * saves screenshots. Needs `npm start` (or PORT=… node scripts/serve.js) running.
 *
 *   node scripts/live-demo-smoke.mjs [--port 8790] [--page live-demo.html] [--out <dir>] [--plan free|pro]
 *        [--ext none|installed|active] [--width 1440] [--mobile] [route …]
 * --page index.html smokes a static build (scripts/build-live-demo.mjs) served from its folder.
 * With no routes it walks every route that needs no id. Exit code 1 on any error.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

// @playwright/test comes from this folder's node_modules (npm install), or from PW_FROM=<path to a package.json>.
const require = createRequire(process.env.PW_FROM || new URL('../package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const args = process.argv.slice(2);
const opt = (name, def) => {
	const i = args.indexOf('--' + name);
	if (i === -1) return def;
	const v = args[i + 1];
	args.splice(i, 2);
	return v;
};
const flag = (name) => {
	const i = args.indexOf('--' + name);
	if (i === -1) return false;
	args.splice(i, 1);
	return true;
};
const port = opt('port', process.env.PORT || '8787');
const entry = opt('page', 'live-demo.html');
const out = opt('out', '');
const plan = opt('plan', '');
const ext = opt('ext', '');
const width = Number(opt('width', '1440'));
const mobile = flag('mobile');

const routes = args.length
	? args
	: ['wp.dashboard', 'wp.plugins', 'v3d.list', 'v3d.edit.201', 'v3d.edit.new', 'v3d.settings', 'v3d.help', 'v3d.extensions', 'v3d.presets', 'v3d.preset.new', 'v3d.visual', 'v3d.analytics', 'admin.products', 'admin.product.101', 'admin.orders', 'admin.order.1001', 'admin.models', 'admin.settings.modules', 'admin.editor.101', 'admin.site-editor', 'store.viewer', 'store.viewer.201', 'store.shop', 'store.product.lounge-chair', 'store.cart', 'store.checkout', 'store.account', 'store.page.lookbook'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
let current = '';
page.on('console', (m) => m.type() === 'error' && errors.push(`[${current}] console: ${m.text()}`));
page.on('pageerror', (e) => errors.push(`[${current}] pageerror: ${e.message}`));
page.on('response', (r) => r.status() >= 400 && errors.push(`[${current}] HTTP ${r.status()} ${r.url()}`));

const base = `http://localhost:${port}/${entry}`;
await page.goto(base);
if (plan || ext) {
	await page.evaluate(
		({ plan, ext }) => {
			const raw = localStorage.getItem('bp3d-live-demo');
			if (!raw) return;
			const s = JSON.parse(raw);
			s.lv = { ...s.lv, ...(plan && { plan }), ...(ext && { ext }) };
			localStorage.setItem('bp3d-live-demo', JSON.stringify(s));
		},
		{ plan, ext }
	);
	await page.reload();
}
if (out) fs.mkdirSync(out, { recursive: true });

for (const r of routes) {
	current = r;
	await page.goto(`${base}#${r}`);
	await page.waitForTimeout(1500);
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
	if (overflow > 1) errors.push(`[${r}] horizontal overflow ${overflow}px`);
	const failed = await page.locator('.proto-msg--error').count();
	if (failed) errors.push(`[${r}] screen failed to load: ${await page.locator('.proto-msg--error').innerText()}`);
	if (out) await page.screenshot({ path: path.join(out, `${r}${mobile ? '-390' : ''}.png`), fullPage: false });
	console.log('ok', r);
}

await browser.close();
if (errors.length) {
	console.error(errors.join('\n'));
	process.exit(1);
}
console.log('No errors.');
