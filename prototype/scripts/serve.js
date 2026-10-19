#!/usr/bin/env node
/**
 * Serves this folder locally the way the claude.ai artifact host does: every top-level
 * .html page is wrapped in the same skeleton. fonts/ and hdri/ (RGBE-in-PNG) are local copies.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROTO = ROOT;
const PORT = Number(process.env.PORT || 8787);

const MOUNTS = {};

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.webp': 'image/webp',
	'.woff2': 'font/woff2',
	'.glb': 'model/gltf-binary',
	'.hdr': 'image/vnd.radiance',
	'.md': 'text/markdown; charset=utf-8',
};

const SKELETON_HEAD = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#fafaf9}img{max-width:100%}[hidden]{display:none!important}</style></head><body>`;

function resolve(urlPath) {
	const rel = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '') || 'index.html';
	for (const [prefix, dir] of Object.entries(MOUNTS)) {
		if (rel.startsWith(prefix)) {
			return path.join(dir, rel.slice(prefix.length));
		}
	}
	return path.join(PROTO, rel);
}

http.createServer(async (req, res) => {
	const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
	const file = resolve(req.url);
	if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
		res.writeHead(404);
		res.end('Not found');
		return;
	}
	const ext = path.extname(file);
	res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
	if (path.dirname(file) === PROTO && ext === '.html') {
		res.end(SKELETON_HEAD + fs.readFileSync(file, 'utf8') + '</body></html>');
		return;
	}
	fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
	console.log(`Prototype: http://localhost:${PORT}/`);
});
