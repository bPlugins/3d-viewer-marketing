# 3D Viewer Premium 2.0.0 — Admin, WooCommerce, Integrations & Infrastructure Feature Inventory

Plugin root: `/Users/raju/Local Sites/dev/app/public/wp-content/plugins/3d-viewer-premium` (brand: bPlugins, text domain `3d-viewer`, namespace `BP3D\`).
Scope: admin, settings, WooCommerce, page builders, CPT/library, REST/DB, licensing, onboarding, docs, plans. Block/front-end viewer options are covered by another agent; they are only mentioned here where they touch WooCommerce or admin.
Everything below was read in code unless marked **(unverified)**. "Pro" = needs an active licence (`can_use_premium_code()`); "Pro build" = present in the premium zip but not licence-gated.

---

## 1. WooCommerce features (exhaustive)

### 1.1 Global switch and loading
- **Store-wide on/off**: Settings › WooCommerce Settings › "Woocommerce" (`3d_woo_switcher`, default on). Off removes the product meta box and the front-end replacement (`inc/Field/SettingsPro.php`, `inc/Woocommerce/ProductMetaPro.php`).
- Woo services load on `woocommerce_after_register_post_type` (`inc/Init.php`).

### 1.2 Product meta box "3D Viewer Settings" (Pro, `inc/Woocommerce/ProductMetaPro.php`)
Per-product fields, stored in post meta `_bp3d_product_`:
- **Viewer engine**: Lite (Google model-viewer, GLB/glTF) or Advanced (Online3DViewer, other formats).
- **Product 3D Models** (repeater, unlimited rows; several rows = a slider/gallery). Per row:
  - 3D Source (upload from Media Library or paste URL; Media picker filtered to 3D files; Cloud Storage button when the companion plugin is active).
  - **Per-variation selects**: one select per variation attribute (e.g. "Color variation"), auto-generated from the product's variations, value "All" or a specific term. Shoppers see the matching model when they pick that option.
  - (Lite only) 3D Poster, Environment Image, Skybox Image, Exposure (0.1–10).
  - (Lite only) **Enable AR**, optional separate **iOS source** (USDZ), **AR Placement** (Floor/Wall), **AR Mode** (WebXR / Scene Viewer / Quick Look).
  - **Real Size** override (width/height/depth) for files exported at the wrong scale (labels only).
  - **Hotspots** repeater (shared definition `inc/Field/HotspotFields.php`): types Info, Link, Image, Waypoint, Animation, Video, and **Product** (only when WooCommerce is active); pin icon (text, info, plus, dot, number, link, play, cart, question, custom image), display (always / hover tooltip / popup / pin only), link URL + button text + new tab, image + alt, video URL, animation name/repeat, product picker (REST search), position/normal/orbit/target/fov.
  - **Initial View** (camera JSON pasted from the Visual Editor) + "Open Visual Editor" button.
- **Shop listing switches**:
  - "Display 3D icon to see models in shop pages and product listings" (`replace_model_with_thumbnail`).
  - "Display 3D models in shop pages and product listings" (`show_model_instead_thumbnail`) — card opens on the 3D model instead of the photo.
- **3D Viewer Position** (6 options): None · Top of the product image · Bottom of the product image · **Replace Product Image with 3D** · **Show 3D on First Image of WooCommerce Gallery** (merge/toggle on first slide) · **Dedicated Tab** ("3D View" product tab).
- **Template/Preset**: pick a saved Preset (CPT `bp3d-preset`); a preset overrides Thumbnail List, Arrows, Zoom, Height, Background, Hotspot Style and store-wide viewer options. Draft/trashed presets still listed so they aren't lost.
- Show Thumbnail List (models without posters get numbered chips), Enable Zoom (defaults from global), Show Arrows.
- **Hotspot pin styling** (per product): Default Hotspot Style (Simple Tag, Always Visible Card, Hover Popup Card, Minimal Icon Badge) + Pin Size (16–64 px), Pin Icon Colour, Pin Background.
- **Real-world dimensions** (Lite only): Show Dimensions Off / Ruler button / Always on; **Dimensions Come From** = the product's own WooCommerce shipping dimensions (store's dimension unit) or measured from the model; line colour.
- Height (px/em/pt, default 320 px), Background colour.
- **Popup 3D Models** (repeater): Selector (class/#id/image src on the page that opens the popup), viewer (Lite/Advanced), model, poster, environment, skybox, Target id. Popup reuses hotspots authored for the same model URL; Esc closes it (`inc/Woocommerce/SingleProductPro.php`).
- Shortcode display: `[3d_viewer_product id=N]` and a PHP template snippet.
- In-box **Update** button (save without scrolling to Publish).
- Admin notice on **variable products** reminding to re-map variations after variation edits (dismissable for 30 days).
- Free-plugin migration: products configured with the free plugin's flat keys (`bp3d_model_src`) are auto-surfaced and render in Pro; lapsed-licence saves never wipe Pro data (`preserveProData`).

Free / lapsed-licence box (`inc/Woocommerce/ProductMeta.php`): one model, poster, exposure, position, background; Pro fields shown read-only as upsell.

### 1.3 Single product page rendering (`inc/Woocommerce/SingleProduct.php`, `Product.php`)
- Replaces `woocommerce_show_product_images` with its own gallery wrapper on compatible themes; places the viewer top/bottom/replace; merge-with-first-image via `woocommerce_product_thumbnails`; "3D View" tab via `woocommerce_product_tabs`.
- **Theme Compatibility Mode** / incompatible themes (block themes, Twenty Twenty-Four, Twenty Twenty-Three, Woostify, Raft, eStore, Customify, B Technologies): viewer printed in footer and moved into the gallery by JS using configurable selectors.
- Per-variation model switching on the front end (`src/hooks/useVariations.ts`): WooCommerce default variation form, **Swatchly** swatches plugin support, Select2 dropdown observer.
- **Product hotspot** cards fetch price/sale price from the WooCommerce **Store API** on open and offer **AJAX Add to cart** + "View product" (`src/blocks/3d-viewer/hotspots/types/product.tsx`, `productApi.ts`) — shoppable 3D.
- AR link (QR code on desktop opens the product page on phone), store-wide control labels/corners (see Settings).
- Shop-grid viewers stay lazy (Eager never applied on grids).

### 1.4 Shop / archive / listings (`inc/Woocommerce/ProductsPro.php`)
- 3D icon (and optionally the model itself) on product cards in shop, category, related products via `woocommerce_product_get_image`. Icon "View in 3D" / "View image" toggles.
- **OceanWP adapter** (theme's own loop hooks, grid + list copies).
- Excluded from mini-cart, Storefront sticky add-to-cart bar, prev/next links (prevents wrong-product viewers).
- Filter `bp3d_shop_loop_show_3d` to turn off per spot.
- Rendering in listings does not need a licence once configured; enabling it needs the Pro box (docs note, verified in code: `ProductsPro.php` has no licence check).
- **Quick View: not supported** (OceanWP Quick View explicitly out of scope, planned 2.1.0 — `plan/WOO-THEME-COMPAT-FIX-PLAN.md` D6).
- Block-based product grids (Product Collection block) and cart thumbnails: **(unverified)** per docs notes.

### 1.5 Elementor for WooCommerce
- **"3D Product Model"** Elementor widget (`inc/Addons/BP3DProductModel.php`): renders the current product's model on single-product templates (Theme Builder); responsive Width/Height; helpful empty-state card in the editor ("This product has no 3D model yet" + Edit product link).

### 1.6 Shortcode
- `[3d_viewer_product]` — renders the current global product's model anywhere on the product page/template (the `id` attribute is only used for a post-type check; it always shows the current product). Also `[3d_viewer id=PRODUCT_ID]` accepts product IDs.

### 1.7 Global WooCommerce settings (Settings › WooCommerce Settings) — see §4 for full list
Shadow, moving controls, zoom, progress bar, loading type, **mobile image mode** (Load 3D / Image tap-to-load / Image only + tap text + breakpoint), **reduce motion on mobile**, auto-rotate (+speed, delay), autoplay, fullscreen; plus control labels/corners/size/spacing/offset for Woo viewers (General tab).

### 1.8 Woo analytics
- Add-to-cart after 3D view, AR launches, hotspot clicks and variant switches are tracked per product/model (see §6).

### 1.9 Theme compatibility work (2.0.0, `plan/woo-theme-compat-repro/REPRO-REPORT.md`, readme changelog)
Tested on: **Astra 4.13.10, Storefront 4.6.2 (sidebar & full-width), OceanWP 4.2.4, Kadence 1.5.2, Twenty Twenty-Five 1.5 (block theme), Blocksy, GeneratePress 3.6.1, Hello Elementor 3.5.1**. Neve not tested. Fixes in 2.0.0 changelog: Storefront layout/mobile squeeze and sticky bar, OceanWP shop/related icons + Customizer width, Blocksy merge sizing, viewer width in Kadence/Hello/GeneratePress/OceanWP, photo showing through model, empty thumbnail list, zoom trigger placement, Theme Compatibility Mode fallback. Per-theme CSS exists for storefront, oceanwp, kadence, generatepress, hello_elementor.

---

## 2. Page builders & editors
- **Gutenberg**: blocks `b3dviewer/modelviewer` ("Model Viewer"), `b3dviewer/preset` ("Model Viewer Preset", used inside Preset CPT), and legacy `tdvb/td-viewer` ("3D Viewer", `3d-viewer-block/`) (`inc/Addons/Blocks.php`).
- **Elementor** (`inc/Addons/AddonsPro.php`):
  - **"3D Model Viewer"** widget (`inc/Addons/ModelViewer.php`, ~1,800 lines). Panels: Model (viewer, single/multiple, model, decoder, bin file, poster, initial view, models repeater with per-model environment/exposure/AR), Lighting & Environment (environment preset, image, skybox, skybox height, tone mapping), AR (enable, iOS source, placement, mode), Options (fullscreen, mouse control, lazy load, shadow, autoplay, auto-rotate + speed + delay, zoom + zoom level, zoom in/out button, camera/capture button, **download button**, reset view button, lock left-right / up-down rotation, variant selector, animation selector, default animation, loading %, progress bar, exposure), Advanced Viewer (show edge, edge colour, edge threshold), Mobile (image mode, tap text, breakpoint, reduce motion), Controls (labels, per-control corners and text), Dimensions (mode, unit, colour, real size), Hotspots/Annotations (**click-to-place hotspots in Elementor canvas**, default style, pin size/colour/background, all hotspot types incl. Product), Style (alignment, responsive width/height, background colour/image, thumb size, progress bar colour, control size/spacing/offset), Additional (ID, class, CSS editor).
  - **"3D Product Model"** widget (see §1.5).
  - Custom bPlugins badge + cube icon in the Elementor panel; editor helper JS; live preview in canvas.
  - Rule in code base: Elementor widget mirrors the Gutenberg block field-for-field.
- **Shortcode** `[3d_viewer id=N]` — works in any builder (Divi, Bricks, Beaver, WPBakery etc. via shortcode modules). **No native Divi/Bricks/Beaver/Oxygen/WPBakery modules found in code.**
- **Classic editor CPT meta box** (Codestar or new bfields UI) with tabs Model · Settings · Elements · Style · Preview (`inc/Field/ViewerPro.php`, ~100 fields) + Live Preview.
- Setup wizard detects Elementor and routes Elementor users to a new page.

---

## 3. Model library / CPT
- **CPT `bp3d-model-viewer`** ("3D Viewer"): non-public, own admin menu with 3D cube icon, `show_in_rest`, editor either block (template-locked to the Model Viewer block) or classic meta box per post (`_bp3d_is_gutenberg`), toggled by "Enable Gutenberg" (`inc/Base/PostTypeModelViewer.php`).
- List screen: **Shortcode column with one-click copy**, **Duplicate** row action (copies meta, regenerates block uniqueIds), View action removed, Publish relabelled "Save", custom update messages.
- **Modern list view** (`inc/Base/ViewerListModern.php`): poster preview, format, viewer type (Lite/Advanced), model count, status columns, and a **list/grid toggle** saved per user.
- Shortcode area after title + "Live Preview" side box (classic UI); full-page editor with resizable live preview and AJAX Update in the modern UI.
- Draft/private/password-protected viewers are not shown to visitors.
- **CPT `bp3d-preset`** (Pro, submenu "Presets"): saves a viewer configuration via the preset block; **applies to WooCommerce products only** (admin notice says so). No public URL.
- No import/export of viewers/settings beyond WordPress core tools; `inc/Base/Import.php` is an internal data migration (legacy `model_src.url` → `model_link`), not a user-facing importer.
- Media library: extended MIME types (settings-controlled, 26 extensions), model pickers restricted to 3D files with friendly error; uploads with a 3D extension but HTML/script content rejected (changelog).

---

## 4. Admin & settings (every option)

### 4.1 Admin menu (under "3D Viewer")
All 3D Viewers · Add New · Presets (Pro) · Visual Editor · Analytics · Help & Demos · Settings · Extensions (extension manager, "New" badge) · Cloud Storage (when companion plugin active) · Setup Wizard (hidden) · Freemius Account pages.

### 4.2 Settings page (`3dviewer-settings`, option `_bp3d_settings_`, `inc/Field/SettingsPro.php`)
**General Settings**
- Enable Gutenberg (`gutenberg_enabled`) — new viewers use the block editor.
- Allowed Mime Types (`allowed_mime_types`) tile grid: glb, gltf, obj, 3ds, step, stp, stl, fbx, 3dm, 3dml, dae, wrl, 3mf, ply, off, amf, ifc, brep, brp, iges, igs, fcstd, bim, mtl, hdr, usdz (14 ticked by default).
- Delete data on uninstall (default off).
- Loading Spinner: Default / Custom image / None; Spinner Image (GIF, animated WebP, SVG, PNG); Spinner Size (24–300 px); Spinner Background.
- Control Placement: Classic corners / Drag-and-drop zones (8 positions, Gutenberg widget; Elementor selects).
- Control Labels (WooCommerce viewers): Off / Tooltip / Inline text.
- Per-control corner (top-left/right, bottom-left/right) for Zoom, Fullscreen, Capture image, Download model, Reset view, Dimensions, View in AR.
- Per-control custom label text (Zoom in, Zoom out, Fullscreen, Capture image, Download model, Reset view, Dimensions, View in AR).
- Control Size (24–64 px, def 35), Control Spacing (0–40, def 10), Control Edge Offset (0–60, def 10).

**Analytics** (`AnalyticsPro::settingsSection()`)
- Record anonymous 3D engagement (on for new installs; opt-in notice for updated sites).
- Ignore logged-in editors (default on).
- Respect Do Not Track / Global Privacy Control (default on).
- Keep detailed rows for 30 / 90 / 180 / 365 days (daily totals forever).
- Also send events to **Google Analytics 4** (uses site's existing gtag or GTM dataLayer; events prefixed `bp3d_`).

**Preset** (defaults for new classic viewers): Width, Height, Background Color, Autoplay, Shadow Intensity, Preload (poster until interaction), Moving Controls, Enable Zoom, Progressbar, Loading Type (Auto/Lazy/Eager), Auto Rotate, Auto Rotate Speed (−180..180), Auto Rotation Delay, Fullscreen.

**WooCommerce Settings**: Woocommerce on/off, Theme Compatibility Mode, Shadow Intensity, Moving Controls, Enable Zoom, Progressbar, Loading Type, On Mobile Devices (Load 3D model / Image, tap to load / Image only), Tap Button Text, Mobile Breakpoint (px), Reduce Motion on Mobile, Auto Rotate (default on), Auto Rotate Speed, Auto Rotation Delay, Autoplay, Fullscreen.

**WooCommerce Selectors**: Gallery, Gallery Item, Gallery Item Active, Gallery Thumbnail Item, Gallery Trigger selectors; **Custom CSS** code editor.

(Free/lapsed `inc/Field/Settings.php` has a "Shortcode Generator" section instead of General.)

### 4.3 Two admin interfaces (`inc/Base/AdminUi.php`)
- **New "Modern" card-based UI** (bfields, `lib/bfields`) and **Classic** (Codestar) over the same data; switch any time from Settings, the editor's Publish box or a notice; per-site option `bp3d_admin_ui`; one-time warning if a save comes from a page open in the other interface. bfields field types: text, textarea, number, switcher, select, button_set, checkbox, radio, color, media, upload, slider, spinner, dimensions, spacing, group, repeater, fieldset, field_group, code_editor, content, date, icon, image_select, link.
- Unsaved-changes warning on Settings (`admin/js/settings-dirty.js`).
- WCAG AA contrast in new UI, RTL fixes (changelog).

### 4.4 Help & Demos dashboard (React SPA, `inc/admin.php`, `src/admin/dashboard`)
Screens: Welcome (how-to for Gutenberg / Shortcode / Elementor), **Demos** (17 live demos on 3d-viewer.bplugins.com: one-block viewer, camera controls, control layout, HDR lighting, hotspot styles, image & video hotspots, product tour, AR product viewer, configurator with 5 colourways, animated models, colour change without re-export, model gallery, mobile poster, real-world dimensions, STL/CAD viewer, 3D hero section, environment & skybox), **Tools › Fix legacy materials**, Pricing + Feature comparison (free only), **Licence Activation** (Pro), Extensions, Our Plugins (install/activate other bPlugins plugins).

### 4.5 Visual Editor (`inc/admin.php`, `src/admin/visual-editor`)
Standalone page: load a model, click to place hotspots, frame a camera angle and copy Initial View / hotspot JSON into any editor (CPT, Elementor, Woo product). Nothing saved. Lite viewer only.

### 4.6 Legacy material ("white model") converter (`inc/Base/SpecGloss*.php`, `src/utils/specGloss`)
Background scan of Media Library after each update for Specular-Glossiness GLBs; admin notice; dashboard tool lists affected files and **where they're used**, converts in-browser (glTF-Transform) to a new Media Library copy (original untouched), "Convert all", link original↔converted. Editor warnings too.

### 4.7 Analytics page (see §6)

### 4.8 Notices
Upgrade notice (free/lapsed only), analytics opt-in notice, variable-product notice, legacy-material notice, footer text.

---

## 5. Setup wizard & onboarding (`inc/Base/SetupWizard.php`, `inc/Base/Ajax.php`, `src/admin/setup-wizard`)
- Freemius `first-path` sends new activations to the wizard; page hidden from menu; all third-party notices suppressed on it.
- **Step 1 – Model / Welcome**: personalised greeting, highlights (Easy Setup, Interactive Experience, Works Everywhere), "Watch the 2-minute tutorial" (https://youtu.be/Tno8LiebxaI), Let's Get Started.
- **Step 2 – Customize**: feature tour cards with Included/Pro badges — Wide Format Support, Gutenberg & Elementor, WooCommerce Viewers, Responsive & Mobile Ready, Augmented Reality, Hotspots & Initial View (Pro), And much more (Pro). "Activate licence" button if not licensed. Exit Setup.
- **Step 3 – Publish**: choose preferred method — Gutenberg / Elementor / Shortcode — each with 3-step instructions; saves `bp3d_onboarding_method` and sets Enable Gutenberg accordingly; "Add Your First 3D Model" (Elementor → new page) or "Explore Help & Demos".
- Stepper ticks completed steps; source images `admin/images/onboarding/`.

---

## 6. REST / DB / infrastructure

### 6.1 REST routes (namespace `bp3d/v1`)
| Route | Method | Permission | Purpose |
|---|---|---|---|
| `/track` | POST | public (rate-limited, validated) | Front-end analytics beacon (`inc/Rest/Track.php`, `inc/Services/TrackService.php`) |
| `/analytics/summary`, `/analytics/timeline`, `/analytics/top?by=model|post`, `/analytics/diagnostics` | GET | analytics capability + licence | Analytics page data (`inc/Rest/Reports.php`) |
| `/products?term=&include=` | GET | can edit products, Woo active | Product picker for Product hotspots (`inc/Rest/Products.php`) |
| `/pipe-check` | GET | edit_posts | Editor connectivity check (`inc/Addons/Blocks.php`) |

AJAX: `bp3d_save_setup`, `bp3d_cloud_sign`, `bp3d_specgloss_scan/link/lookup/dismiss`, `bp3d_analytics_dismiss`, `dismiss_product_edit_notice`, `bp3d_pipe_checker`, Freemius licence actions `bpl_8795_activate_license / get_license_status / deactivate_license / get_license_details`. admin-post: `bp3d_analytics_export` (CSV), `bp3d_analytics_notice`, `bp3d_switch_admin_ui`, duplicate action.

### 6.2 Database tables (Pro build, `inc/Database/*`) — analytics only (no model-library table)
- `wp_bp3d_analytics_views`: one row per viewer instance per page view — post/product/model key, placement (block, shortcode, product-gallery, inline, shop-loop-item, popup, woocommerce-tab, elementor), engine (lite/advanced), device (mobile/desktop), mode (model/image), loaded, load_failed, load_ms, interacted, dwell_seconds, hotspot_clicks, variant_switches, fullscreen, dims_toggled, ar_qr_shown, ar_launched, ar_mode, ar_source (button/qr), ar_placed, added_to_cart, timestamps. No IP/user/cookie.
- `wp_bp3d_analytics_daily`: daily rollup by day/post/product/model/device/engine/mode/placement (kept forever).
- `wp_bp3d_analytics_models`: model_key → URL, label, first/last seen.
- Nightly cron rollup at 03:00 site time + catch-up when the page opens (works with WP-Cron disabled); retention purge; per-IP rate limits (filters `bp3d_analytics_rate_limits`, `bp3d_trusted_proxies`); privacy-policy text auto-added to WP privacy guide.
- **Analytics page** (`3D Analytics`): KPI tiles with vs-previous-period deltas (3D views, Interaction rate, Avg time in 3D, AR launches with iOS/Android split, Add-to-cart %), Views & AR launches timeline (chart or table), Load health per device (finished %, errors, median load), **QR funnel** (desktop QR → AR on phone → placed in room), Top models & Top pages/products tables, date ranges (7/30/90/365/custom), **CSV export** (timeline, pages, models; formula-injection safe), diagnostics line. Visible to admins or WooCommerce shop managers. Collection keeps running if the licence lapses; viewing needs the licence ("Nothing recorded while the licence was inactive is lost").

### 6.3 Other infra
- **Cloud Storage** integration (`inc/Base/CloudStoragePro.php`): companion "Cloud Storage for bPlugins" plugin (offered free in Extensions to Pro sites); S3, Cloudflare R2, DigitalOcean Spaces, Wasabi, Backblaze B2, Bunny Edge Storage, Bunny Stream, Google Drive, Dropbox; picker button in block, meta box, Elementor, Woo product rows; signed URLs at render time; rendering never licence-checked (only picking new files). Companion requires WP 6.6+/PHP 8.1+.
- **Extension manager** (`vendor/bp-extension-manager`): remote catalogue `3d-viewer.bplugins.com/wp-json/bpes/v1/catalog/3d-viewer-premium`; local fallback lists **3D Product Configurator for WooCommerce** (separate plugin `wc-3d-model-viewer-pro`, per-variation model customisation, video https://youtu.be/xl99YlbFw18) and **Cloud Storage**; in-dashboard Freemius checkout.
- Module loader (`inc/Helper/ModuleManager.php`) for `modules/*` sub-plugins (none shipped currently).
- Options stored: `_bp3d_settings_`, `bp3d_admin_ui`, `bp3d_onboarding_method`, `bp3d_setup_wizard_completed`, specgloss/analytics state; meta `_bp3dimages_`, `_bp3d_product_`, `_bp3d_is_gutenberg`.
- Uninstall via Freemius `after_uninstall` (`inc/uninstall.php`): only if "Delete data on uninstall" is on; multisite-aware (per site); skips if the free plugin is still installed; drops analytics tables, options, viewer & preset posts and plugin meta.
- Developer filters: `bp3d_{gutenberg|classic|elementor|woocommerce|woocommerce_popup}_model_attribute`, `bp3d_shop_loop_show_3d`, `bp3d_hotspot_type_options`, `bp3d_analytics_enabled`, `bp3d_analytics_capability`, `bp3d_analytics_flush_ms`, `bp3d_analytics_rate_limits`, `bp3d_trusted_proxies`, `bp3d_admin_ui`, `3dviewer_product_attributes`.

---

## 7. Licensing
- **Freemius** (id 8795, slug `3d-viewer`, premium suffix "Pro"); **7-day free trial, no card required**; affiliate programme enabled ("selected"); paid plans **Pro** and legacy **Max** ("Includes all the premium extensions"; code comment calls Max legacy). Pricing hidden for paying users.
- In-dashboard **Activation screen**: state (active/expired/cancelled/trial/inactive), plan, masked key, expiry or lifetime, trial end, activations/quota (localhost not counted), account link, sync, deactivate.
- Graceful degradation: lapsed licence never deletes Pro data, existing cloud models keep rendering, shop-listing 3D keeps rendering, analytics keeps collecting; Pro editing UI locks.
- Pro price **(unverified)**: `MARKETING_PLAN_BFCM_2026.md` says price parity with AtlasAR at $49.99.

---

## 8. Compatibility & themes
- Requires **WordPress 6.5+**, **PHP 7.4+**, tested up to **WP 7.1** (readme). Real PHP floor for analytics install is WP 6.2 (`%i`), per `plan/POSTPONED-WORK.md` C8.
- WooCommerce: product pages, variable products, shop/category/related; Swatchly swatches; Select2 variation dropdowns. **No HPOS / cart-checkout-blocks compatibility declaration found** in code (plugin does not touch orders; Woo may list it as "uncertain") **(unverified impact)**.
- Themes: see §1.9 (8 tested themes); fallback for block themes and listed incompatible themes via Theme Compatibility Mode + custom selectors.
- Page builders: Gutenberg, Elementor (2 widgets), shortcode for everything else.
- Caching/optimisation plugins: viewer initialises when scripts are deferred (WP Rocket, LiteSpeed, Autoptimize per `docs/FEATURE-USECASES-2.0.0.md`).
- Multisite: uninstall per site; no network-specific features.
- **Translation**: text domain `3d-viewer`, `languages/3d-viewer.pot`, **Spanish (es_ES)** .po/.mo + JS JSON translations; all React screens use `wp_set_script_translations`.
- **Accessibility**: controls/arrows/thumbnails/QR panel are real buttons with accessible names, keyboard focus and visible ring, Esc closes panels/popups; labelled variant/animation selectors; model name as alt text; control labels (tooltip/inline); reduce-motion respects OS preference; WCAG AA contrast in new admin UI; RTL fixes; e2e `a11y.spec.ts`.
- Privacy: analytics without cookies/IP/personal data, DNT/GPC respected, privacy-policy text added.

---

## 9. Docs topics (`docs/`)
Built user docs (`docs/index.html`, bDocs JSON `docs/3d-viewer.bdocs.json`, 36 pages in `docs/src/pages`, verified source notes in `docs/src/notes`):
1 Introduction · 2 Installation & Activation · 3 Setup Wizard · 4 Quick Start · 5 Choosing Your Editor · 6 Create and Embed a Viewer · 7 File Types & Uploads · 8 Model Sources · 9 Cloud Storage · 10 Multiple Models · 11 Lite & Advanced Viewer · 12 Poster & Loading · 13 Mobile Options · 14 Size & Layout · 15 Camera, Zoom & Rotation · 16 On-Screen Controls · 17 Control Placement & Labels · 18 Lighting, Shadows & Background · 19 Animations & Material Variants · 20 Presets · 20 Textures (Experimental) · 21 Visual Editor · 22 Hotspots · 23 Dimensions & Ruler · 24 Augmented Reality · 25 3D & AR Analytics · 26 Add a 3D Model to a Product · 27 Position, Gallery & Theme Fit · 28 Variable Products · 29 Widget, Shortcode, Shop & Popups · 30 Global Settings · 31 Shortcode Reference · 32 Blocks, Widgets & Page Builders · 33 Troubleshooting · 34 FAQ · 35 New & Classic Interface.
FAQ covers: formats, size limits, free vs Pro, AR devices, what visitors see in AR, Woo, page speed, multiple models, page builders, translation, data storage, uninstall, model download, free+Pro together, lapsed licence, help.
Marketing-ready source docs: `docs/FEATURE-USECASES-2.0.0.md` (feature → use case → business scenario, objection map, segment cheat sheet, "what not to claim"), `docs/VIDEO_SCRIPTS.md` (22 tutorial scripts, priority 1/2), `docs/MEDIA_CHECKLIST.md` (133/143 screenshots, 2/7 videos done).
Published videos: intro https://youtube.com/watch?v=_9vKv5pEClM, quick start https://youtube.com/watch?v=ofC8XbdAuVE, 2-min tutorial https://youtu.be/Tno8LiebxaI.

---

## 10. Useful screenshots / media for marketing (paths relative to plugin root)
Hosted copies: `docs/uploaded-image-links.txt` (new.bplugins.com/wp-content/uploads/2026/09/…).
**Hero / result shots**: `docs/img/docs-3d-viewer-introduction-viewer-front-end.webp`, `…-quick-start-result.webp`, `…-create-viewer-result.webp`, `…-multiple-models-result.webp`, `…-lighting-background-result.webp`, `…-camera-rotation-result.webp`, `…-viewer-engines-result.webp`, `…-viewer-engines-edges.webp`.
**WooCommerce**: `docs/img/docs-3d-viewer-woo-setup-result.webp`, `…-woo-display-result.webp`, `…-woo-display-positions.webp`, `…-woo-variations-result.webp`, `…-woo-variations-rows.webp`, `…-woo-shop-listing.webp`, `…-woo-shop-popup.webp`, `…-woo-shop-widget.webp`, `…-woo-setup-model-row.webp`, `…-global-settings-woocommerce.webp`.
**Hotspots / AR / dimensions**: `…-hotspots-result.webp`, `…-hotspots-styles.webp`, `…-hotspots-types-frontend.webp`, `…-hotspots-popup.webp`, `…-augmented-reality-qr-code.webp`, `…-on-screen-controls-qr-overlay.webp`, `…-on-screen-controls-all-buttons.webp`, `…-dimensions-frontend.webp`, `…-dimensions-result.webp`, `…-control-placement-result.webp`, `…-control-placement-zones-gutenberg.webp`, `…-textures-result.webp`, `…-animations-variants-result.webp`.
**Admin / workflow**: `…-analytics-report.webp`, `…-analytics-top-tables.webp`, `…-analytics-settings.webp`, `…-visual-editor-overview.webp`, `…-visual-editor-result.webp`, `…-setup-wizard-step-model.webp`, `…-setup-wizard-step-customize.webp`, `…-setup-wizard-step-publish.webp`, `…-create-viewer-all-viewers.webp`, `…-cloud-storage-extensions.webp`, `…-troubleshooting-fix-legacy-materials.webp`, `…-mobile-options-phone.webp`, `…-blocks-widgets-panel-elementor.webp`, `…-hotspots-section-elementor.webp`, `…-file-types-allowed-mime-types.webp`, `…-loading-poster-loading-state.webp`.
**Demo thumbnails** (in-plugin demo cards): `admin/images/dashboard/demo-*.webp` (hero, ar, configurator, hotspots, media-hotspots, product-tour, dimensions, mobile, stl, gallery, hdr-lighting, skybox, animated, colours, camera-controls, viewer-controls, getting-started), product renders `demo-armchair/sneaker/watch/headphones/drone/vr-headset/office-chair/running-shoe/canvas-shoe/cube/turntable.webp`.
**Onboarding art**: `admin/images/onboarding/onboarding-image.webp`, `onboarding-bg.webp`.
**Video**: `.docs/Short Tutorial - 3D Viewer (Narrated).mp4` (~93 MB) + `.srt`, thumbnails `.docs/Short Tutorial - 3D Viewer (Thumbnail@2x).png`, YouTube metadata `.docs/short tutorial - YOUTUBE_METADATA.md`.
**Avoid for marketing**: `plan/woo-theme-compat-repro/*/*.png` are pre-fix bug reproductions. Docs note MEDIA_CHECKLIST R9 says 39 admin screenshots needed recapture on the final UI — check currency before use.

---

## 11. Plans / roadmap (`plan/`)
**Shipped (plan/done)**: Analytics, Cloud Storage integration, Dimensions ruler, Edge display, Mobile image mode, Reduce motion + custom loader. Also in code: hotspot types S1+S2 (image, waypoint, video, product, animation), spec/gloss converter, control labels/positions/placement widget, new admin UI, AJAX save, onboarding redesign, model-source merge, Woo theme compat fixes, responsive size.
**Planned / parked (none built)**:
- 2.1.0 candidates: Thumb strip size per device + position (L18), **Viewer access restriction** by role/login/user (L17), **WooCommerce auto thumbnails** (auto-generated posters per model row), OceanWP Quick View, mouse-wheel zoom option (L15), popup hash trigger (L16), Draco decoder cleanup (L14), Cloud picker on poster/HDR fields (L11), control-placement widget on classic surfaces (L10).
- **Dokan multivendor module** (vendor 3D authoring; target premium 2.1.0 / free 1.11.0, launch ~Jan 2027).
- **AI text/image → 3D generation** (Tripo3D/Meshy BYO key) — approved then postponed, no date.
- **Model compression/optimisation** (glTF-Transform in browser) — draft, unscheduled.
- Exploded view (F4), Advanced-viewer progress indication.

---

## 12. Messaging cautions found in code/docs
- Do not claim dimensions inside Quick Look/Scene Viewer; dimensions are Lite viewer only (`docs/FEATURE-USECASES-2.0.0.md`).
- Do not claim model compression or AI generation (not shipped).
- `docs/FEATURE-USECASES-2.0.0.md` (10 Sep) is partly stale: it calls product hotspots "roadmap" and says "no configurator", but code now ships the Product hotspot (Store API + add to cart) and the Extensions catalogue offers "3D Product Configurator for WooCommerce"; `plan/POSTPONED-WORK.md` L8 also lists S2 hotspot types as postponed though they are in code.
- The free/lapsed Woo meta box text says "The premium version also supports obj, stl, …" while `MARKETING_PLAN_BFCM_2026.md` flags "OBJ/STL/FBX are Pro-only" as a false claim (Advanced viewer formats are free in the free plugin). Align copy.
- readme "Pro Features" list (poster, progress bar, external URLs) may not match the current free/Pro split **(unverified; free plugin repo not read)**.
- Presets apply to WooCommerce products only.

---

## 13. File references
- Boot/licensing: `3d-viewer-premium.php`, `inc/Init.php`, `inc/Base/LicenseActivation.php`, `inc/admin.php`, `inc/uninstall.php`
- WooCommerce: `inc/Woocommerce/ProductMetaPro.php`, `ProductMeta.php`, `Product.php`, `SingleProduct.php`, `SingleProductPro.php`, `ProductsPro.php`; `src/hooks/useVariations.ts`; `src/blocks/3d-viewer/hotspots/types/product.tsx`
- Settings/UI: `inc/Field/SettingsPro.php`, `inc/Field/Settings.php`, `inc/Field/ViewerPro.php`, `inc/Field/HotspotFields.php`, `inc/Base/AdminUi.php`, `inc/Helper/Registrar.php`, `lib/bfields/`
- CPT: `inc/Base/PostTypeModelViewer.php`, `inc/Base/ViewerListModern.php`, `inc/Base/PostTypePreset.php`, `inc/Base/Presets.php`, `inc/Base/ModelSource.php`, `inc/Base/ExtendMimeType.php`, `inc/Helper/Utils.php`
- Elementor/blocks: `inc/Addons/AddonsPro.php`, `ModelViewer.php`, `BP3DProductModel.php`, `Blocks.php`; shortcodes `inc/Shortcode/Shortcode.php`, `ShortcodePro.php`
- Analytics: `inc/Base/AnalyticsPro.php`, `inc/Rest/Track.php`, `inc/Rest/Reports.php`, `inc/Services/TrackService.php`, `RollupService.php`, `inc/Model/ReportsModel.php`, `inc/Database/*`, `src/admin/analytics/*`, `src/utils/analytics/Tracker.ts`
- Cloud/specgloss: `inc/Base/CloudStoragePro.php`, `CloudStorageAjax.php`, `SpecGlossScanner.php`, `SpecGlossAjax.php`, `SpecGlossNotice.php`, `src/admin/dashboard/Components/LegacyMaterials.tsx`
- Onboarding/dashboard: `inc/Base/SetupWizard.php`, `inc/Base/Ajax.php`, `src/admin/setup-wizard/*`, `src/admin/dashboard/*` (demos in `utils/data.tsx`, plan features in `Components/dash/features.ts`), `src/admin/visual-editor/*`
- Extensions: `public/extensions.json`, `vendor/bp-extension-manager`
- Docs: `docs/src/pages/*.html`, `docs/src/notes/*.md`, `docs/FEATURE-USECASES-2.0.0.md`, `docs/VIDEO_SCRIPTS.md`, `docs/MEDIA_CHECKLIST.md`, `docs/img/*`, `readme.txt` (2.0.0 + 1.10.0 changelog)
- Plans: `plan/POSTPONED-WORK.md`, `plan/woo-theme-compat-repro/REPRO-REPORT.md`, `plan/WOO-THEME-COMPAT-FIX-PLAN.md`, `plan/done/*`, `plan/*-PLAN.md`, `MARKETING_PLAN_BFCM_2026.md`
- Tests (feature hints): `tests/e2e/*.spec.ts` (a11y, analytics, cloudstorage, dimensions, elementor, hotspots*, loader, mobile-image, onboarding, presets, responsive-size, specgloss, viewer-list, woo-theme-compat, woocommerce, zoom-level, ajax-save, crossmode)
