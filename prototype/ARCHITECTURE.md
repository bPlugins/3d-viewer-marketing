# Prototype architecture

A clickable copy of WC 3D Model Viewer Pro, used to try a feature before it is built in the plugin.
Plain ES modules, no build step. Preact + htm for UI, three.js for 3D, Tailwind (play CDN, the plugin's own config) for editor class names.
Run it with `npm start` (`scripts/serve.js`, `PORT` env, default 8787).

## Hard rules

- Never import from the plugin's `src/` or `includes/`. The prototype is self-contained so it can be published as an artifact.
- External scripts only from `cdn.jsdelivr.net/npm/`, `cdnjs.cloudflare.com`, `unpkg.com`, `cdn.tailwindcss.com`. No other network requests (no fetch to other hosts, no remote images, no remote Draco/wasm). Fonts and HDRIs are published files: the dev server maps `hdri/` → `assets/hdri/` and `fonts/` → `src/admin/shared/fonts/`.
- No `alert()`, `confirm()`, `prompt()`, `window.print()`, or `<a download>`. Build confirmations into the page (editor: `NativeDialog` in `topbar.js`). Export shows JSON in a textarea instead of downloading.
- Wrap every `localStorage`/`sessionStorage` access in try/catch (`core/store.js` already does).
- Copy is verbatim from the plugin. Where a spec quotes a string, use it exactly. Prefer the plugin's real CSS and class names.
- Do not use `Date.now()`-style ids in seed data; use `store.nextId(collection)`.
- Every route must load with no console errors at 1440px and 390px, with no horizontal page scroll at 390px.

## Files

```
index.html                 shell, Tailwind config, import map (three)
css/base.css               prototype bar + plugin tokens (.wc3d-ui/.wc3d-app scopes)
css/wp-admin.css           WP admin frame (admin bar, left menu, list tables, buttons, notices)
css/admin-list.css         3D Models page shell + list table (copy of src/admin/list/*.css)
css/settings.css           Settings tab
css/editor.css             editor component classes (.wc3d-btn, .wc3d-seg, …) in plain CSS
css/product-panel.css      product edit screen + "3D Model" tab (launcher) + order edit
css/storefront.css         demo theme (header, shop grid, product page, tabs)
css/viewer.css             storefront viewer (copy of the plugin's storefront CSS)
css/cart.css               cart, checkout, order received
css/cart-blocks.css        Cart and Checkout blocks; css/email.css = order emails
css/<feature>.css          one per planned feature (ar-export, block, conditional-logic, coverage, customizer-modal, decals, drawer-history, external-url, hdri, saved-designs), selectors scoped to it
js/app.js                  router host + prototype bar (area switch, links, Planned features, Reset demo data)
js/routes.js               ROUTES (token → screen module) and MENU (prototype bar links)
js/core/ui.js              html, Preact hooks, render, cx(), money()
js/core/router.js          useRoute(), go(token), parseHash()
js/core/store.js           store, useStore(), setIn(), getIn()
js/core/features.js        FEATURES, useFeature(id), isOn(id), toggleFeature(id, on); MODULES, moduleCards(toggles), canToggle(f), alwaysOn(f) for feature modules
js/data/seed.js            demo data (single source of truth for shapes), DEFAULT_SETTINGS, DEFAULT_PALETTE
js/engine/                 three.js: demo models, viewer controller, Viewer3D component, thumbnails
js/shared/                 icons, editor UI primitives, admin UI primitives, config helpers, product image
js/screens/admin/          wp-admin screens (chrome.js = WP admin frame)
js/screens/admin/editor/   full-screen 3D editor (editor-store.js, panels/*)
js/screens/store/          storefront screens (theme.js = demo theme + cart helpers, viewer-ui.js = storefront viewer)
js/screens/roadmap.js      roadmap page
js/shared/options.js       option pricing + option groups core (the "server": prices, rows, validation)
js/shared/snapshot.js      order-snapshot capture and <LineImage>
js/shared/decals.js        decals (personalization) core: areas, content sanitising, rows, required check, image upload
js/engine/decals.js        decals engine layer (projected mesh + CanvasTexture per area), v.decals
js/screens/store/decals.js decals drawer section + drag on the model; editor body in editor/panels/decals.js; css/decals.css
js/data/decal-logo.js      local PNG for the seeded decal order; js/data/block-seed.js = default template and pages
js/engine/material-variants.js  KHR_materials_variants: demo variants, GLB extension reader, per-viewer switcher; editor panels/material-variants.js
js/shared/ar-export.js     usdz-export core (when to build, USDZ/GLB export, cache, QR link); shared/ar-device.js = prototype bar AR device switch
js/screens/store/ar-export.js   AR button + iPhone/Android sheets + design QR modal; editor panels/ar-export.js, admin/settings-ar.js
js/shared/block.js         block / Elementor widget attributes, template helpers, viewer overrides, ThemeSwitch, useBlockTheme(); admin/block-controls.js = product search for both editors
js/screens/store/block-theme.js block-theme Single Product template; store/page.js = block/Elementor pages; admin/site-editor.js, admin/elementor.js
js/shared/saved-designs.js saved-designs core (codes, records, lookup, expiry); store/saved-designs.js = Share design + sheet + restore
js/screens/store/account.js     My Account (Dashboard, Orders, Saved designs); store/design-link.js = short link; admin/saved-designs.js, admin/settings-saved-designs.js
js/screens/store/conditional-logic.js  drawer filter, fallback note, live region; editor panels/conditions.js = rule builder
js/screens/store/drawer-history.js     undo-redo-drawer: useDrawerHistory(), DrawerHistoryButtons, registerHistoryLabel()
js/screens/store/customizer-modal.js   customizer-modal: CustomizerModal (dialog, inert, history), ModalPanel, useMovableHost(); a feature module, toggled in Settings → Features
js/shared/hdri.js          hdri-download core: preset sizes + SHA-256, installed set, simulated downloadPresets(), real hash-checked uploadPresetFiles(), useHdriJobs(), HdriFailSwitch; editor panels/environment-download.js, admin/settings-hdri.js (Lighting Presets row)
js/screens/store/gallery-lane.js   gallery-lane: useGalleryLane() measures the strip's free lane; css/gallery-lane.css; screens/gallery-lane.js = Now/Proposed compare page
js/screens/admin/settings-features.js  Settings → Features tab: one card per feature module (specs/modules.md); helpers in core/features.js
js/screens/store/price-summary.js      option-pricing Product / Options / Total box (PriceSummary, hasPricedOptions), used by the form and the modal
js/shared/coverage.js      coverage report rows + bulk writers; admin/coverage.js = Coverage tab
js/shared/external-url.js  external-url: URL check, records, External badge/tab pieces used by the media frames
js/screens/admin/editor/panels/options.js, pricing.js  Customer Options and Option Pricing sections
specs/                     feature specs agreed before the plugin build: customizer-commerce.md (option pricing, option groups, order snapshot), materials-variants.md, usdz-export.md, decals.md, block.md, saved-designs.md, conditional-logic.md, undo-redo-drawer.md, coverage.md, external-url.md, customizer-modal.md, hdri-download.md, gallery-lane.md
```

## Routing

Hash tokens, dot-separated: `#admin.models`, `#admin.settings` (optional section: `#admin.settings.toolbar`; keys general, scene, configurator, toolbar, modules, shortcode, data; `modules` is the Features tab), `#admin.editor.101` (product id; optional 4th segment = variation id, e.g. `#admin.editor.101.203`), `#admin.products`, `#admin.product.101` (`new` = Add New), `#admin.orders`, `#admin.order.1001`, `#store.shop`, `#store.product.lounge-chair` (slug), `#store.cart`, `#store.checkout`, `#store.order.1001`, `#store.email.1003.customer` (or `.admin`), `#proto.roadmap`. Planned features add `#admin.coverage` (Models tab while `coverage` is off), `#admin.designs`, `#store.design.<CODE>` (forwards to `#store.product.<slug>.design.<CODE>`), `#store.account[.saved-designs|.orders]`, `#admin.site-editor[.page.<id>]`, `#admin.elementor.<id>`, `#store.page.<slug>`, `#proto.gallery-lane`. With `demo.cartPage = 'blocks'` ("Cart page" switch in the prototype bar), `#store.cart` / `#store.checkout` render the Cart and Checkout blocks (`cart-blocks.js`, `checkout-blocks.js`).
Screens default-export a component `({ params })` where `params` are the segments after the screen (`['101']`). The host keys the screen by the full token, so a token change remounts it. Navigate with `go('admin.editor.101')` or `<a href="#admin.editor.101">`. Screens with no bar link highlight a parent (`MENU_PARENT` in app.js).

## Data (js/core/store.js + js/data/seed.js)

`store.get()` returns the whole state; `store.patch('products.101.meta._wc3d_enabled', 'yes')` (path string or array; value or `old => new`); `store.set(s => ({...s, …}))`; `store.reset()` reloads the seed; `useStore(s => s.settings)` re-renders on change. Mirrored to localStorage key `wc3d-prototype` with `__v: VERSION`. State keys:

- `settings` — the `wc3d_settings` option (keys exactly as the plugin; seed turns `enable_customizer` on for the demo).
- `attachments[id]` — media: `{id, kind: 'model'|'usdz'|'image', demo?, title, filename, mime, sizeBytes?, color?, blobUrl?}`. A model with `demo` renders `DEMO_MODELS[demo]`; one with `blobUrl` (uploaded in a media modal, memory only) loads through GLTFLoader.
- `products[id]` — `{id, name, slug, type, status: 'publish'|'draft'|'pending'|'private'|'trash', price, sku, short, description, category, image: {model, bg}, dateCreated, dateModified, attributes:[{name, options}], variations:[ids], meta:{_wc3d_* post meta}, wc?}`. `wc` holds WooCommerce product-data fields edited on the product screen (`salePrice, stockStatus, stockQty, manageStock, featured, tags, gallery, taxStatus, taxClass, shippingClass, weight, length, width, height, upsells, crossSells, purchaseNote, menuOrder, reviews, virtual, downloadable, visibility, catalogVisibility, soldIndividually`), all optional.
- `variations[id]` — `{id, parentId, attributes:{Name: value}, price, sku, swatch?}`.
- `productConfigs[productId]` — `{model_id, config}` (default scene config, `VariationConfigData`).
- `variationConfigs[variationId]` — `{model_id, config}` (diff over the default; `model_id` 0 = inherit).
- `presets[id]` — `{id, type: 'material'|'environment'|'animation'|'camera', name, data}`.
- `cart.items[]` — `{key, productId, variationId, qty, custom: {materials?, meshes?}|null}`; key `"<pid>-<vid>-l<n>"` (merged line) or `u<n>` (customized, always its own line).
- `orders[id]` — `{id, date, status: a key of ORDER_STATUSES or 'trash', prevStatus?, customer:{name, email, address, phone?}, payment, paymentMethod?, billing?, shipping?, shippingTo?, customerNote?, notes?: [{id, date, text, system?, customer?}], items:[{id, productId, variationId, qty, total, custom}]}`. `notes` are admin order notes (read them with `noteList(order)` from `screens/admin/orders.js`); the checkout's "Order notes" field is `customerNote`.
- `productConfigs[*].config.pricing` / `.options` — option pricing rules and option groups (shapes in `specs/customizer-commerce.md`); variations replace them whole.
- Cart items and order items may carry `custom.options`, `snapshotId`; order items also `basePrice` and frozen `options` rows.
- `snapshots[id]` — `{id, url (data URL), width, height, productId}`; unreferenced ones are pruned.
- `demo.cartPage` — `'classic' | 'blocks'`, prototype store setup.
- `demo.theme`, `wpTemplates`, `wpPages` — planned `block` (specs/block.md): block-theme switch, the Single Product template and pages (blocks or Elementor). Routes `#admin.site-editor[.page.<id>]`, `#admin.elementor.<id>`, `#store.page.<slug>`. `MENU` entries may carry a flag id as 3rd item (shown only while it is on).
- `config.material_variant` (`null` inherit, `''` GLB materials, else a variant name; variations replace it), option group type `'variant'` (choices carry `variant`, `color`), `custom.material_variant` — planned `materials-variants`.
- `settings.ar_configured`, `config.ar.configured` (`false` opts a product out), `demo.arDevice` (`desktop|ios|android`), `demo.arFail` — planned `usdz-export`.
- `config.decals[]` (areas: `{id, label, mesh, placement, kinds, fonts, colors, max_chars, min_size, max_size, required, price}`), `custom.decals[areaId]` (`{kind, text, font, color, image, name, size, x, y, rotation}`) — planned `decals`.
- `config.options[].conditions` / `.choices[].conditions` (`{match: 'all'|'any', rules: [{source: 'attribute', name, op, value} | {source: 'group', groupId, op, choiceId}]}`) — planned `conditional-logic`.
- `savedDesigns[code]` (`{code, seq, productId, variationId, created, customerId, name, views, lastViewed?, custom}`), `savedDesignSeq`, `customers[id]`, `demo.customerId`, `settings.share_links`, `.share_links_account`, `.share_link_lifetime` — planned `saved-designs`.
- `settings.coverage_max_model_mb`; generated posters are image attachments with `source: 'wc3d-poster', parentId` — planned `coverage`.
- `attachments[id]` with `source: 'url', url, check: {status, checkedAt, contentType, cors}` — planned `external-url` (listed only while the flag is on).
- `flags['customizer-modal']` — the feature module's Settings → Features toggle (the seed is a new install = on), read through `viewerSettingsFor().customizerModal`. The old `settings.customizer_layout` key is no longer read or written; a stored value stays as inert data.
- `hdri.installed[preset]` (`{source: 'bundled'|'download'|'upload', at}`; missing = Studio only), `demo.hdriFail` — planned `hdri-download`. With the flag on, the viewer renders a preset that isn't installed as Studio (`setPresetAvailability()` in `engine/viewer.js`).
- `flags[featureId]` — prototype feature switches; for a feature module (`module: true`) the flag is its Settings → Features toggle (the `wc3d_modules` option) and outlives shipping. Ids no feature knows are a removed module's kept decision. `FEATURES[].requires` / `.note` show a dependency note in Planned features and the roadmap.

Per-viewer UI conveniences (not demo data): WP menu fold and editor sidebar width/theme in localStorage, last Settings tab in sessionStorage.

## Engine API (js/engine)

```js
import { DEMO_MODELS, MODEL_INFO, CLIP_DURATIONS } from './engine/demo-models.js';
// DEMO_MODELS[key] = { title, build(THREE) => { scene: THREE.Group, animations: THREE.AnimationClip[] } }
// MODEL_INFO[key]  = { meshes, materials, animations, triangles, vertices, textures, sizeBytes }
// Keys: 'lounge-chair' (Frame, Legs, Seat_Cushion, Back_Cushion, Armrest_Left, Armrest_Right, Pillow),
//       'lounge-chair-wide' (same names, wider), 'table-lamp' (Base, Arm, Shade, Bulb; clips Shade_Tilt, Arm_Swing),
//       'mug' (Body, Handle, Glaze_Inner), 'side-table' (Top, Legs, Shelf).

import { createViewer, ENVIRONMENT_PRESETS, ENVIRONMENT_PRESET_FILES, resolvePresetFile, DEFAULT_FOV, GALLERY_DIRECTIONS } from './engine/viewer.js';
const v = createViewer(containerEl, { config, model, custom, interactive: true, editor: false, background, loadDelay, offscreen, width, height });
// model: { demo: 'lounge-chair' } | { url: blobUrl }   config: effective VariationConfigData
v.setModel(model, {force}) → Promise<info>   v.setConfig(effectiveConfig)   v.getConfig()   v.setCustom({materials, meshes})
v.setCamera({position, target, fov}, {animate = true, duration = 600})   v.resetCamera({animate})   v.refit()
v.getCamera() → {position, target, fov, distance, polar, azimuth}   v.getAutoView('perspective'|'front'|'side'|'back') → {position, target}
v.zoom(+1|-1)   v.setAutoRotate(bool)   v.getAutoRotate()
v.playAnimation(name, {loop, speed})   v.stopAnimation()   v.getAnimations() → [{name, duration}]
v.screenshot({width, height, maxSide, type, quality, background}) → dataURL
v.setSelection(meshNames)   v.setOutline(bool)
v.on(event, cb) → unsubscribe   v.off(event, cb)
//   'select' {mesh|null, additive, point?, worldPoint?} · 'camera' · 'ready' info · 'progress' 0–100 · 'error' err
v.project(meshName, offset) → {x, y, visible, occluded, behind}   v.hotspotWorld(meshName, offset) → [x, y, z]
v.getModelInfo()   v.getMeshNames()   v.getHierarchy()   v.getMaterialNamesForMeshes(names)
v.getMaterialVariants() → [{name, meshes, swatch}]   v.setMaterialVariant(name|''|null)   v.getMaterialVariant()  // materials-variants (engine/material-variants.js); config.material_variant / custom.material_variant pick one
v.whenIdle() → Promise (model + environment loaded)   v.setSize(w, h)   v.render()   v.invalidate()   v.dispose()
v.canvas   v.element   v.three = { THREE, scene, camera, renderer, controls, shadows, model }  // raw access for prototyping
// offscreen viewers also have v.renderOffscreen(bg) → canvas
// decals: v.decals.setPreview(map, areas?) setGuide(id) areaAt(x, y) areaCoords(id, x, y) facePoint(id, x, y); renders config.decals[].content

import { Viewer3D } from './engine/Viewer3D.js';
// <Viewer3D config model custom interactive editor selection outline autoRotate background loadDelay
//           onReady(controller, info) onSelect(e) onProgress(pct) onError(err) onCamera(controller) class style>overlays<//>
// Re-applies changed props, disposes on unmount.

import { renderThumbnail, clearThumbnailCache } from './engine/thumbnail.js'; // (model, config, {width, height, bg}) → Promise<dataURL>, cached
```

`config` passed to the viewer is always the resolved effective config. `custom` is the shopper layer (`{materials: {mesh: {baseColor}}, meshes: {mesh: {visible}}}`, plus `options`, `material_variant`, `decals` with their flags) applied on top; anything that should reach the cart, saved designs, undo or the snapshot lives in it. HDRIs load with `fetch` + three's HDR parser.

## Shared helpers (js/shared)

```js
import { resolveEffectiveConfig, defaultConfig, emptyVariationConfig, applyShopperChoices,
         getMaterialConfig, patchMaterialConfig, mergeMaterialLayers, legacyMaterialKey } from './shared/effective-config.js';
// port of src/shared/schema/resolveEffectiveConfig.ts; applyShopperChoices(config, choices) bakes the cart layer in

import { POSITIONS, LOADING_TRIGGERS, modelOf, modelFor, effectiveFor, attachmentUrl, backgroundFor, applyBackground,
         is3DAvailable, viewerSettingsFor, cartSummary } from './shared/product-3d.js';
// modelFor(state, pid, vid?) → { attachment, model: {demo}|{url}|null, hasOwnModel }
// effectiveFor(state, pid, vid?, {background = true}) → effective config (product background applied)
// viewerSettingsFor(state, pid) → { available, position, loadingTrigger, customizerEnabled, showGallery, showOnShop,
//   showListingIcon, posterId, poster, posterUrl, background, controls: {zoom, reset, autorotate, download, gallery}, colorPalette,
//   customizerModal: bool }   customizerModal = the customizer-modal feature module's toggle (block editor previews force false)
// cartSummary(custom) → 'Seat Cushion (Color: #ef4444); Pillow: Hidden'

import { ProductImage, productImageUrl, illustrationUrl } from './shared/product-image.js'; // <ProductImage product variationId size fluid />

import { Icon, PhpIcon, StoreIcon, BrandLogo, YouTubeIcon, ICON_NAMES, POSITION_CARDS, PositionPreview } from './shared/icons.js';
// <Icon name size /> covers every plugin icon set, SVG paths verbatim:
//   editor set bare ('camera', 'cube', …; also named exports CameraIcon, CubeIcon, … like icons.tsx),
//   storefront set 'sf-*' (<StoreIcon name="zoom-in" />), PHP SettingsPage set 'php-*' (<PhpIcon name="box" />), plus 'logo', 'youtube'.

import * as EUI from './shared/editor-ui.js';
// Accordion, Toggle, ToggleRow, SliderRow, Checkbox, ColorField, FieldRow, IconButton, InfoBanner, EmptyState, ChunkBoundary, useId,
// class constants (INPUT_CLASS, SELECT_CLASS, EYEBROW_CLASS, SURFACE_CLASS, LINK_*, READOUT_*, …), formatPercent/formatMultiplier.
// Same props as src/admin/editor/components/ui/*.tsx.

import { PageHead, ModelsPage, WcToggle, Notice, VIDEO_GUIDE_URL } from './shared/admin-ui.js';
// PHP-screen widgets: <ModelsPage active="models|settings" notices>…</ModelsPage> = .wrap.wc3d-ui-wrap › PageHead › .wc3d-tab-panel
```

## Admin frame and screen helpers

```js
import { WpAdmin, Glyph, MENU_IDS } from './screens/admin/chrome.js';
// <WpAdmin current="wc3d-models" title fullscreen>…</WpAdmin>; current = a MENU_IDS id or alias models|settings3d|product|order|editor
import { Dashicon, flash, useFlash, WpNotice, nowStr, priceText, stockOf, STOCK_LABELS, TYPE_LABELS } from './screens/admin/products.js';
// flash(notice) queues a WP notice for the next screen (like ?message=1); useFlash() reads it once
import { ORDER_STATUSES, orderTotal, addressLines, itemMeta, itemName, StatusMark, noteList } from './screens/admin/orders.js';
import { MediaModal } from './screens/admin/product-edit.js';      // WP media frame: <MediaModal kind="model|image" title button onSelect onClose initialTab? initialUrl? />
import { useMediaPicker } from './screens/admin/editor/panels/alt-model.js';
// editor media picker: const p = useMediaPicker({title, button, filter?: 'image'|'model'|'hdri', urlKind?: 'model'|'usdz', onSelect(att)}); p.open(); render p.modal
// Both get the "External URL" tab while external-url is on (initialTab 'url').
import { previewPayload, PreviewButton } from './screens/admin/order-edit.js'; // OrderPreview.php button rules
```

## Storefront (js/screens/store)

```js
import { StoreTheme, Notices, addToCart, removeFromCart, pushNotice, clearNotices, addedToCartNotice,
         unitPrice, cartCount, cartTotal, lineName } from './screens/store/theme.js';
// <StoreTheme crumbs=${[['Home', '#store.shop'], ['Shop']]}>…</StoreTheme>
// addToCart({productId, variationId, qty, custom}) → line key (customized lines never merge)
import { StorefrontViewer, ViewerModal, OrderPreviewRoot, ArQrModal, usePosterUrl, detectArDevice, qrSvgUrl } from './screens/store/viewer-ui.js';
// <StorefrontViewer productId variationId custom onCustomChange mode="replace|tab|shortcode|inline|modal|listing" />
//   mode modal/listing mounts at once; listing forces the customizer off. custom/onCustomChange = controlled shopper layer.
// <ViewerModal open onClose listing id>…</ViewerModal>   <OrderPreviewRoot productId variationId choices /> (thank-you + admin order modal)
// qrSvgUrl(text) draws a QR look-alike locally (not scannable). Portal and useModalDialog(onClose, returnFocusRef) are shared by the feature sheets.
// Planned props: openGroup/onGroupShown (open the drawer on a group or decal area), overrides + style (block: customizer, controls,
//   background, loading trigger), keepCustom (saved-designs: mount at once and keep the restored layer),
//   cart (customizer-modal: the page form bridge {product, chosen, setChosen, variation, qty, setQty, needSel, submit}).
// customizer-modal: in Modal layout the Viewer renders its wrapper into one host element (useMovableHost) that moves into
//   the dialog and back, so the canvas, camera and model survive. CustomizerOptions / DrawerTools / useFocusGroup are the
//   drawer pieces both layouts render.
// The drawer writes through useDrawerHistory().set (undo-redo-drawer); with the flag off that is the raw setter.
```

## Editor store (js/screens/admin/editor/editor-store.js)

Local to the editor; writes to the global store only on Save. Re-reads saved data when the global store changes while nothing is unsaved.

```js
import { editor, useEditor, EMPTY_VARIATION, isEqualValue, variationLabel, variationAttributeName } from './editor-store.js';
useEditor(s => s.selection)  // shallow-compared selector
// state: { productId, loadStatus: 'idle'|'loading'|'ready'|'missing', view: 'overview'|'editor', target: 'default'|variationId,
//          attachmentId, base: {model_id, config}, variations: {vid: {model_id, config}}, saved: {base, variations},
//          selection: string[], selectionName, selectionIsGroup, placingHotspot, status: 'idle'|'saving'|'saved'|'error', saveError,
//          dirty, dirtyDefault, dirtyVariationIds, dirtyCount, past, future, canUndo, canRedo, viewer, modelInfo, modelKey }
editor.init(productId, {keep}) editor.refresh() editor.discard()
editor.raw()                 // raw config of the active target (variation diff or default)
editor.effective()           // resolved config the viewport shows
editor.patch(section, patch) // merge into a section; null clears (default: drop key, variation: store null = inherit)
editor.replace(section, value)
editor.patchMeshes(names, patch) / editor.patchMaterials(names, patch) // per mesh entry; undefined value removes the field
editor.hotspots() editor.setHotspots(listOrFn) editor.addHotspot(h) editor.removeHotspot(id) editor.updateHotspot(id, patch)
editor.patchGallery(map)     // null value deletes a key
editor.importConfig(cfg) editor.setVariationModel(attachmentId) // 0 = inherit
editor.setVariationKey(key, {vid: value}) // one whole-value key on several variations, one undo step (undefined = inherit)
editor.removeOverride(meshName) editor.clearOverrides() editor.applyAutoMap(attributeName, mapping, exclusive)
editor.select(names, {name, isGroup, additive}) editor.setPlacingHotspot(bool)
editor.undo() editor.redo() editor.commitTransaction() editor.save() editor.resetTarget()
editor.openTarget('default'|vid) editor.setView('overview'|'editor') editor.setViewer(controller) editor.setModelInfo(info)
editor.activeModel() editor.hasOwnModel() editor.wcVariations() editor.variation(id) editor.targetLabel() editor.isVariationDirty(id)
```

Undo keeps 50 steps and merges edits that land within 400 ms. The UI has no multi-select (the plugin has none); `additive` is kept for API parity.

## Adding a feature prototype

1. Set its `status` to `'prototyped'` in `js/core/features.js` (only those can be switched on in "Planned features").
2. Gate every new piece of UI with `useFeature('<id>')`, so switching the flag off shows the shipped product.
3. Put new data under new keys (additive), give it seed values, bump `VERSION` in `core/store.js`.
4. When the feature ships in the plugin, set `status: 'shipped'` and remove the flag checks. A feature module (`module: true`, specs/modules.md) keeps its flag instead: it mirrors the Settings → Features toggle, and its readers stay on `useFeature('<id>')` / `flags[id]`.
