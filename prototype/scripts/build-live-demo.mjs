#!/usr/bin/env node
/**
 * Builds the live demo (live-demo.html) into a folder of static files.
 *
 *   node scripts/build-live-demo.mjs [outDir]              static host: index.html (wrapped), models as .glb
 *   node scripts/build-live-demo.mjs --artifact [outDir]   claude.ai artifact: unwrapped live-demo.html, models as .b64.js
 *
 * Default outDir: dist/live-demo (or dist/live-demo-artifact). Roadmap-only pages are left out.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROTO = ROOT;
const args = process.argv.slice(2);
const artifact = args.includes('--artifact');
const OUT = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(ROOT, artifact ? 'dist/live-demo-artifact' : 'dist/live-demo'));

// Dev-only screens (roadmap, planned-feature compare pages) never go public.
const SKIP = new Set(['js/screens/roadmap.js', 'js/screens/gallery-lane.js', 'live-demo/README.md']);
const SKELETON_HEAD = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#fafaf9}img{max-width:100%}[hidden]{display:none!important}</style></head><body>`;

let files = 0;
let bytes = 0;
function write(rel, data) {
	const dest = path.join(OUT, rel);
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.writeFileSync(dest, data);
	files++;
	bytes += Buffer.byteLength(data);
}

function copyTree(srcDir, relBase) {
	for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
		const src = path.join(srcDir, entry.name);
		const rel = path.posix.join(relBase, entry.name);
		if (entry.name.startsWith('.') || SKIP.has(rel)) continue;
		if (entry.isDirectory()) {
			copyTree(src, rel);
			continue;
		}
		const ext = path.extname(entry.name);
		if (rel.startsWith('live-demo/models/')) {
			if (!artifact) write(rel, fs.readFileSync(src));
			// The artifact host serves neither .glb nor .usdz: ship base64 modules (see ui/models.js).
			else if (ext === '.glb') write(rel + '.b64.js', `export default '${fs.readFileSync(src).toString('base64')}';\n`);
			continue;
		}
		if (artifact && rel === 'live-demo/ui/models.js') {
			write(rel, fs.readFileSync(src, 'utf8').replace('const PACKED = false;', 'const PACKED = true;'));
			continue;
		}
		write(rel, fs.readFileSync(src));
	}
}

// Only ever clears a folder this script built before (marker file), never anything else.
const MARKER = '.live-demo-build';
if (fs.existsSync(OUT) && fs.readdirSync(OUT).length) {
	if (!fs.existsSync(path.join(OUT, MARKER))) {
		console.error(`${OUT} is not empty and was not built by this script. Pick another folder.`);
		process.exit(1);
	}
	fs.rmSync(OUT, { recursive: true });
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, MARKER), '');
copyTree(path.join(PROTO, 'css'), 'css');
copyTree(path.join(PROTO, 'js'), 'js');
copyTree(path.join(PROTO, 'live-demo'), 'live-demo');
copyTree(path.join(ROOT, 'fonts'), 'fonts');
copyTree(path.join(ROOT, 'hdri'), 'hdri');

const page = fs.readFileSync(path.join(PROTO, 'live-demo.html'), 'utf8');
if (artifact) write('live-demo.html', page);
else write('index.html', SKELETON_HEAD + page + '</body></html>');

console.log(`${files} files, ${(bytes / 1048576).toFixed(1)} MB → ${path.relative(ROOT, OUT) || OUT}`);
