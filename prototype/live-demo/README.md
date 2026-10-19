# 3D Viewer live demo

A public, browser-only copy of a WordPress admin running **3D Viewer** (free), **3D Viewer Pro** and the
**3D Product Configurator for WooCommerce** extension, on demo data. Visitors switch Free ↔ Pro from the
demo bar. Every visitor has their own copy in localStorage (key `bp3d-live-demo`), so any number of people
can use it at once. Brand: bPlugins only.

Entry: `live-demo.html` → `live-demo/app.js`. Run `npm start` and open `/live-demo.html`.
Smoke check: `node scripts/live-demo-smoke.mjs --port 8787 [--plan pro] [--ext active] [--mobile] [--out dir] [route …]`.

## Rules

- Everything in `prototype/ARCHITECTURE.md` "Hard rules" applies (no build step, CDN allowlist, no `alert/confirm/prompt`, no `<a download>`, try/catch storage, no console errors at 1440 and 390 px, no horizontal page scroll at 390 px).
- **Look real.** Copy labels, order and structure from the real plugins' source, verbatim:
  `../../3d-viewer` (free), `../../3d-viewer-premium` (Pro), this repo (configurator). Matching screenshots:
  `3d-viewer-premium/docs/img/*.webp`. Do not invent features. Shipped features only.
- **Free vs Pro.** Free shows Pro controls **locked**, the way the premium build looks without a licence:
  wrap the control in `<ProLock label="…">`, or add `<ProPill/>` / `<ProBadge/>` and call `useProGate()`
  (`live-demo/ui/pro.js`). Switching plans never deletes data. On free, Pro-only attributes are kept but
  not applied (render as the free plugin would).
- **Reuse, don't fork.** WooCommerce/configurator screens come from `../js/screens/**` unchanged. If one needs
  a demo behaviour, add a small, additive hook there (default = today's behaviour) and keep the dev prototype
  (`index.html`) identical.
- Only shipped configurator features: flags are seeded from `FEATURES` (`status === 'shipped'`).
- Links to bPlugins use `LINKS` (`core/links.js`) and open in a new tab.
- 3D on 3D Viewer screens uses Google `<model-viewer>` via `<ModelViewer>` (`ui/mv.js`), like the plugin's
  "Lite" engine. Sample models: `MODELS` (`ui/models.js`); viewer attrs store a media URL, map it with
  `modelKeyFromUrl()`. The configurator keeps its three.js engine (`../js/engine`).
- Comments: 1–2 lines, only where intent isn't obvious. Tabs, single quotes, like the rest of `prototype/`.
  No Prettier.

## Shared APIs

```js
import { store, useStore } from '../js/core/store.js';           // state: see "Data" below
import { go } from '../js/core/router.js';                        // go('v3d.edit.201')
import { WpAdmin, Glyph } from '../js/screens/admin/chrome.js';  // <WpAdmin current="v3d-list" title="…">…<//>; fullscreen prop
import { usePlan, useIsPro, isPro, setPlan, useExt, useExtActive, extActive, installExtension, activateExtension } from './core/plan.js';
import { toast, openProModal, useBus } from './core/bus.js';
import { ProPill, ProBadge, ProLock, useProGate } from './ui/pro.js';
import { ModelViewer, ensureModelViewer } from './ui/mv.js';
import { MODELS, MODEL_OPTIONS, modelSrc, modelKeyFromUrl } from './ui/models.js';
import { blockDefaults, viewerAttrs } from './viewer/attrs.js';     // b3dviewer/modelviewer attributes (from block.json)
import { LINKS } from './core/links.js';
import { ViewerBlock } from './viewer/render.js';                 // renders one viewer block from attrs (canvas, storefront, Woo)
import { Slot, registerSlot, addFilter, applyFilter } from '../js/shared/slots.js'; // hooks into reused screens
```

`../js/shared/slots.js` is how reused configurator screens get demo behaviour: the screen renders
`<Slot name="…" />` / calls `applyFilter('…', default)`; the live demo registers them in `woo/hooks.js`
(imported by `app.js`). Nothing is registered in the dev prototype, so it stays unchanged.

Menu ids for `<WpAdmin current>`: `dashboard-home`, `installed-plugins`, `v3d-list`, `v3d-new`, `v3d-presets`,
`v3d-visual`, `v3d-analytics`, `v3d-help`, `v3d-settings`, `v3d-extensions`, `all-products`, `orders`,
`wc3d-models`. The menu itself is built in `core/menu.js` from plan + extension state.

## Routes (`routes.js`)

| Token | Screen | File |
| --- | --- | --- |
| `wp.dashboard` | WP Dashboard with a "Start here" panel | `wp/dashboard.js` |
| `wp.plugins` | Installed Plugins (3D Viewer ↔ 3D Viewer Pro row) | `wp/plugins.js` |
| `v3d.list` | All 3D Viewers | `viewer/list.js` |
| `v3d.edit.<id\|new>` | Modern meta box screen (`viewer/modern-edit.js`); the block editor (fullscreen) for posts made in it or, for new posts, with Settings → Enable Gutenberg on | `viewer/edit.js` |
| `v3d.settings[.<tab>]` | 3D Viewer Settings | `viewer/settings.js` |
| `v3d.help[.<tab>]` | Help & Demos dashboard | `viewer/help.js` |
| `v3d.extensions` | Extensions | `viewer/extensions.js` |
| `v3d.presets`, `v3d.preset.<id\|new>` | Presets (Pro) | `viewer/presets.js`, `viewer/preset-edit.js` |
| `v3d.visual` | Visual Editor (Pro) | `viewer/visual-editor.js` |
| `v3d.analytics` | 3D Analytics (Pro) | `viewer/analytics.js` |
| `store.viewer[.<id>]` | Storefront page showing 3D Viewer blocks | `store/viewer-page.js` |
| `admin.*`, `store.*` | Configurator prototype screens (reused) | `../js/screens/**` |

`need: 'pro'` routes show a gate page on free; `need: 'ext'` routes show one until the extension is active.

## Data (store, seeded by `core/seed.js`; bump `LD_VERSION` when a seed shape changes)

- Everything from `../js/data/seed.js` (products, orders, configurator settings, …).
- `lv.plan` `'free'|'pro'`, `lv.ext` `'none'|'installed'|'active'`, `lv.extOff` (Extensions screen's Enabled switch off), `lv.settings` (3D Viewer settings option; defaults in `viewer/settings-data.js`).
- `viewers[id]` — bp3d-model-viewer posts: `{ id, title, status: 'publish'|'draft'|'trash', date, modified, author, isGutenberg, meta?, attrs }`. Block-editor posts keep the block attributes in `attrs`; Modern posts keep the `_bp3dimages_` row in `meta` and a derived `attrs` (`metaToAttrs()` in `viewer/meta.js`, the Shortcode.php mapping). New id: `store.nextId('viewers')`.
- `vpresets[id]` — bp3d-preset posts (Pro): `{ id, title, date, attrs }`.
- `v3dProducts[productId]` — 3D Viewer's own WooCommerce product meta (`_bp3d_product_`), defaults in `woo/data.js`.

## Hooks into reused screens (`../js/shared/slots.js`)

Registered in `core/hooks.js` (demo-wide) and `woo/hooks.js` (3D Viewer's WooCommerce integration).

| Name | Kind | Where | Live demo use |
| --- | --- | --- | --- |
| `feature.on` | filter | `isOn` / `useFeature` | every configurator module off until the extension is active |
| `proto.label` | filter | `protoLabel()` | in-page "Prototype" notes read "Demo" |
| `wc3d.available` | filter | `is3DAvailable()` | configurator viewer only while the extension runs |
| `wc3d.order-preview` | filter | order edit / order received | hide "View 3D Preview" while it is off |
| `product-edit.tabs`, `product-edit.saved` | filter | product edit | "3D Model" tab gating, saving 3D Viewer meta |
| `product-edit.after-data` | slot | product edit | 3D Viewer's product metabox |
| `store.product.gallery`, `store.product.viewer-tab` | filter | product page | 3D Viewer's Woo viewer and Dedicated Tab |
| `store.shop.card-image` | slot | shop grid | Pro "3D" icon / 3D in shop |
| `store.nav` | slot | storefront header | "3D Showcase" link |
| `wp-admin.notices` | slot | WP admin frame | extension locked/disabled notice |

Other shell details: routes may set `doc` (document title, string or `(params, state) => string`); a menu
route starting with `https://` opens in a new tab; `configureChrome({ newItems })` takes an array or a function
of state. The smoke script takes `--page index.html` to check a static build served from its folder.

## CSS

One file per area in `live-demo/css/`: `live-demo.css` (shell), `block-editor.css`, `v3d-admin.css`
(settings, help, extensions), `viewer-modern.css` (Modern viewer editor + list, bfields' sheets scoped to `.ld-vm`), `v3d-pro.css` (presets, visual editor, analytics, WP dashboard, plugins),
`v3d-woo.css` (product metabox, storefront viewer page), `tour.css`. Scope selectors under your screen's root class.
