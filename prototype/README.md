# WC 3D Model Viewer — prototype

A clickable copy of the plugin (WP admin screens, the 3D editor, the storefront, cart and orders) running on demo data in the browser.
New features are built here first, reviewed, and only then implemented in the plugin.

It lives outside the plugin repo (moved from `wc-3d-model-viewer-pro/prototype/` on 2026-10-18), so it never ships.
Three entries share this folder: `index.html` (WC 3D configurator), `shopify.html` (Shopify app, see `shopify/README.md`)
and `live-demo.html` (3D Viewer Free/Pro + configurator live demo, see `live-demo/README.md`).

## Run it

```bash
npm start                    # http://localhost:8787  (PORT=… to change)
npm install                  # once, only for the smoke test (Playwright)
npm run live-demo:smoke -- --port 8787 [--plan pro] [--ext active] [--mobile]
npm run live-demo:build [-- --artifact] [outDir]   # static site (dist/live-demo) or artifact copy
```

The dev server wraps every top-level `.html` page the same way the artifact host does. `fonts/` is a copy of the plugin's
`src/admin/shared/fonts/`, and `hdri/*.png` are the plugin's `assets/hdri/*.hdr` packed as lossless RGBE-in-PNG (two RGB
pixels per texel), because the artifact host does not serve `.hdr`; the viewer decodes them. To refresh them after the
plugin's HDRIs change, run the plugin repo's `node scripts/prototype-hdri.mjs <this folder>/hdri`.

Opening a page directly from disk does not work (ES modules need a server).

## Published copy

The same files are published as private claude.ai artifacts so the prototypes can be opened or shared with a link.
Republishing the same entry updates the same link. Map `hdri/*.png` and `fonts/*` from this folder.

## Demo data

All data lives in `js/data/seed.js` and is kept in the browser's localStorage after the first click. **Reset demo data** in the top bar restores the seed.

**Planned features** in the top bar switches each roadmap feature on or off (or all at once). Each one has a spec in `specs/`.

## Prototyping a feature

1. Pick the feature in `js/core/features.js` and set `status: 'prototyped'`.
2. Gate the new UI with `useFeature('<id>')`, so switching it off in **Planned features** shows the shipped product.
3. Add any new data under new keys in `seed.js` and bump `VERSION` in `js/core/store.js`.
4. Review it in the browser, agree on it, then build it in the plugin.
5. When it ships, set `status: 'shipped'` and remove the flag checks. A feature module (`module: true`) keeps its flag as its Settings → Features toggle (see [specs/modules.md](specs/modules.md)).

Structure, file ownership and the shared APIs are in [ARCHITECTURE.md](ARCHITECTURE.md).
