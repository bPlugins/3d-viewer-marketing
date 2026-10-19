# 3D Viewer (FREE) v2.0.0 — Feature Inventory (code-verified)

Plugin path: `/Users/raju/Local Sites/dev/app/public/wp-content/plugins/3d-viewer`
Brand: bPlugins. Freemius product id 8795. Git branch audited: `feature/new-admin-ui` (clean tree, HEAD `7e198dd`).
Method: read PHP/TS source, block.json files, built zip listing. Readme claims were cross-checked against code; mismatches are flagged **[MISMATCH]**. Uncertain items are marked *(unverified)*.

---

## 1. Overview & positioning

- **Name / title:** "3D Viewer – Turn Product Pages into Interactive 3D Experiences" (`3d-viewer.php` header, readme.txt).
- **Short description (readme.txt):** "Embed interactive 3D models, 360° product views, and AR experiences in WordPress. Supports GLB, GLTF, OBJ, STL, FBX – WooCommerce ready."
- **Headline (readme):** "Turn flat product photos into interactive 3D experiences your visitors can rotate, zoom, and even place in their own room with Augmented Reality – no code required."
- **WP.org tags:** `3d model viewer`, `360 product view`, `augmented reality`, `woocommerce`, `glb`.
- **Key positioning message in readme & UI:** "Augmented Reality is free… no upgrade, no add-on." Environment + HDR skybox images also "now free" (since 1.9.3). AR moved to free in 1.9.2.
- **Use cases listed in readme:** WooCommerce stores, education & training, architecture & engineering, gaming/digital assets, art & design portfolios, research & prototyping, packaging & mockups.
- **Testimonials in readme:** diegoparoni ("most valid plugin… support is also very good"), blunoa ("3D model is perfectly loaded and you can adjust the light. I am using the PRO version").
- **Two viewer engines** (core differentiator):
  - **Lite** = Google `<model-viewer>` web component (GLB/glTF, AR, environment/skybox, poster, exposure, shadow, capture). Tagged "Recommended" in the Modern UI with perks "GLB and glTF", "Augmented reality" (`inc/Base/AdminUi.php:192-196`).
  - **Advanced** = Online 3D Viewer (o3dv, Three.js) for CAD/print formats (OBJ, STL, FBX, STEP and more).
- **Ways to embed:** 2 Gutenberg blocks, `[3d_viewer]` + `[3d_viewer_product]` shortcodes, 2 Elementor widgets, WooCommerce product metabox (auto-placement on product page).
- **Requirements:** WordPress 6.5+, PHP 7.4+, tested up to WP 7.1; WebGL browser. WooCommerce only for product features; Elementor only for widgets.
- **Docs/links:** product https://bplugins.com/products/3d-viewer/, docs https://bplugins.com/docs/3d-viewer/, pricing …/pricing, demos https://3d-viewer.bplugins.com/, YouTube `_9vKv5pEClM` (intro), `ofC8XbdAuVE` (quick start), onboarding tutorial `https://youtu.be/Tno8LiebxaI`. GitHub: https://github.com/bPlugins/3d-viewer-wp. Community: facebook.com/groups/1828495198556137.

---

## 2. Supported formats

### 2a. By viewer engine (what can render)

| Engine | Formats | Source |
|---|---|---|
| **Lite** (`<model-viewer>`) | `.glb`, `.gltf` (+ Draco-compressed and KTX2/Basis textures — decoders fetched from gstatic only when needed). AR iOS source: `.usdz`. | `src/blocks/3d-viewer/data.ts` ("Support only .glb, .glTF"); readme External Services |
| **Advanced** (Online 3D Viewer) | `.obj`, `.3ds`, `.stl`, `.ply`, `.gltf`, `.glb`, `.off`, `.3dm`, `.fbx`, `.dae`, `.wrl`, `.3mf`, `.amf`, `.ifc`, `.step/.stp`, `.iges/.igs`, `.brep`, `.fcstd`, `.bim` | `data.ts` label; extension strings confirmed inside `public/js/o3dv.min.js`. STEP/IGES/BREP/3DM/IFC decoders (occt-import-js, rhino3dm, web-ifc, draco3d) load from jsDelivr on demand. |

### 2b. Upload whitelist in FREE (what the Media Library accepts)

`inc/Helper/Utils.php` `SUPPORTED_MIME_TYPES` — 14 keys, **all enabled by default** (since 1.9.3), each switchable in Settings → Allowed Mime Types:
`glb, gltf, obj, 3ds, step, stl, fbx, 3dml, dae, wrl, 3mf, mtl (OBJ material), hdr (skybox), usdz (iOS AR)`.

- NOT in the free upload whitelist: `ply, off, 3dm, amf, ifc, brep/brp, iges/igs, stp, fcstd, bim` — todo.txt says Pro adds 12 more upload keys. They can still be rendered by the Advanced viewer if supplied by URL (block/Elementor URL fields accept any URL) *(unverified end-to-end; the media picker's client filter lists them but the server refuses the upload)*. An uninstall reason in todo.txt: "no permite formato .ply".
- **WooCommerce in free = GLB/GLTF only** (Lite viewer). In-UI text: "The free product viewer displays GLB and GLTF models. Premium adds OBJ, STL, 3DM, 3DS, 3MF, AMF, BIM, BREP, DAE, FBX, FCSTD, IFC, IGES, STEP, OFF, PLY and WRL." (`inc/Woocommerce/ProductMeta.php`).
- Model pickers show and accept 3D files only (library filtered; uploader refuses non-3D files with a clear message) — `inc/Base/ExtendMimeType.php::restrictModelPickerUploads`.
- **Upload security hardening:** blocks double-extension uploads (`model.php.glb`), PHP magic-mime, HTML/SVG/JS markup disguised as a model (incl. XML/DAE deep scan) — `ExtendMimeType.php`.

**[MISMATCH]** Readme says "Supported 3D File Formats: .GLB, .GLTF, .OBJ, .STL, .FBX, .DAE, .PLY, .3DS"; plugin header lists many more; PLY is renderable but not uploadable in free.

---

## 3. Block settings (exhaustive)

### 3a. Block "3D Model Viewer" — `b3dviewer/modelviewer` (main block)
Category `design`, keywords "3D Viewer / 3D Embedder / 3D Model Viewer", align left/center/right, server-rendered (`render.php`), React view script. Sidebar has **Settings** and **Style** tabs. On the 3D Viewer CPT screen a **Copy Shortcode** button appears. Empty state: "Add Your 3D Model — Paste a model URL or upload a file to get started." (URL box + upload button, keeps block height).
Files: `src/blocks/3d-viewer/block.json`, `Components/Backend/Tabs/General/ModelForm.tsx`, `Options.tsx`, `O3DVOptions.tsx`, `Tabs/Style/Style.tsx`.

**Settings tab → Model panel**

| Setting | Options / range | Default | Notes |
|---|---|---|---|
| Format notice | — | — | Green dot "All supported 3D formats are enabled…" or red notice if the model's format is disabled, with link to Settings |
| 3D Viewer | Lite / Advanced (button group) | Lite (`modelViewer`) | Help text explains Lite vs Advanced. In visual-editor placement only Lite |
| Model URL | URL text + Media Library upload | — | Any URL accepted in the block; media picker limited to enabled 3D formats |
| Model Poster | image upload/URL | — | Lite only. Shown until model loads |
| Environment Image | Neutral / Legacy / (Custom when a URL is set) | Neutral | Lite only. Lighting & reflections |
| Custom Environment Image | image upload/URL | — | Lite only. URL pre-checked; broken URL is ignored instead of breaking the viewer |
| HDR Skybox Image | image upload/URL (.hdr, JPG, PNG) | — | Lite only. Background + environmental lighting; skybox-height 0m |
| Use Decoder | None / Draco | none | Lite only. **Has no runtime effect** — value only written as `data-decoder`; model-viewer auto-decodes Draco from gstatic (verified `ModelViewer.tsx`) |
| Bin File | upload | — | Shown when Draco chosen; **not consumed anywhere at runtime** (verified) |
| Enable AR | toggle | off | Lite only |
| 3D Model (iOS) | file upload (`.usdz`) | — | When AR on; sets `ios-src` |
| AR Placement | Floor / Wall | Floor | When AR on |
| AR Mode | webxr / Scene Viewer / Quick Look | quick-look (block default) | Chosen mode is tried first; the other two remain as fallbacks |
| Premium Features panel (locked) | — | — | "Multiple models, tone mapping and applying textures are available in the premium version" |

**Settings tab → Options panel (Lite viewer, shown for glb/gltf)**

| Setting | Options | Default | Notes |
|---|---|---|---|
| Fullscreen | toggle | on | Fullscreen button + Exit fullscreen button (new 2.0.0) + top-right close |
| Mouse Control | toggle | on | `camera-controls` (rotate/pan/zoom by mouse or touch). In editor controls activate only on hover so the page can scroll |
| Lazy Load | toggle | on | `loading="lazy"` vs `eager` |
| Show Loading Percentage | toggle | off | % overlay while loading |
| Show Progressbar | toggle | on | model-viewer default progress bar (colour attr `progressBarColor` #666, no UI control) |
| Camera/Capture Button | toggle | off | Downloads a PNG screenshot (`model.png`) of current view |
| 3D File Download Button | toggle | off | Downloads the model file |
| Zoom In/Out Button | toggle | off | +/- buttons |
| Enable Shadow | toggle | on | `shadow-intensity=1`, `shadow-softness=1` |
| Exposure | slider 0.1–5, step 0.1 | 1 | Scene brightness |
| Premium notice (locked) | — | — | "autoplay, variant selector, animation selector, lock left-right, up-down rotation, auto rotate, zoom, set initial zoom available in premium version" |

**Settings tab → Options panel (Advanced viewer)**

| Setting | Default | Notes |
|---|---|---|
| Fullscreen | on | |
| Zoom In/Out Button | off | Simulated wheel zoom |
| Mouse Control | on | Notice: "Mouse control does not work in Editor (Backend)." |
| (implicit) zoom | on | `O3DVSettings.zoom`, no UI in block |
| (implicit) environment | bundled "Fisherman's Bastion" cubemap | `Basic3DViewer.tsx`; background colour applied to canvas |

**Style tab** (hidden in visual-editor placement)

| Setting | Options | Default |
|---|---|---|
| Width (responsive: desktop/tablet/mobile) | px / % | 100% all devices (hidden when used on a Woo product) |
| Height (responsive) | px / % / vh | 400px desktop, 300px tablet, 300px mobile |
| Background Color | colour picker | transparent (picker shows #fff) |

**Attributes present in block.json without a UI control:** `rotate` (false), `zoom` (true), `preload` ("auto"), `placement`, `woo`, `attributes.tonMapping` ("neutral"), `O3DVSettings.isPagination/isNavigation/camera/showEdge` (Pro leftovers), `styles.progressBarColor`, `styles.thumbSize`, `styles.bgImage` (supported in CSS, no control).

**Viewer runtime UI (all embeds):** bottom-right = zoom +/-, fullscreen/exit; bottom-left = camera capture, "View in AR" (QR), download; top-right = exit-fullscreen close. Controls are accessible `<button>`s with aria-labels (changed in 2.0.0). Load error message "The 3D model could not be loaded." instead of infinite spinner (1.9.3). Fallback: if JS fails, a plain `<model-viewer camera-controls>` backup view shows after 5s.

### 3b. Block "3D Viewer" — `tdvb/td-viewer` (simple/legacy block, still registered & in inserter)
Files: `3d-viewer-block/build/block.json`, `render.php`. Category `media`, align wide/full.

| Setting | Options | Default |
|---|---|---|
| Model Source (.glb or .gltf) | Upload / Link | Upload |
| Width | text (0 = auto) | 100% |
| Height | text (0 = 350px) | 350px |
| 3D Model Alignment | left / center / right | center |
| Controls via mouse/touch | toggle | on |
| Zoom | toggle (needs mouse/touch on) | on |
| Loading Type | Auto / Lazy / Eager | Auto |
| **Auto-rotate** | hard-coded ON in render.php (no toggle) | always on |

Note: this simple block gives free users an always-auto-rotating GLB embed, while auto-rotate is a Pro toggle in the main block.

---

## 4. Shortcode

| Shortcode | Behaviour | File |
|---|---|---|
| `[3d_viewer id="123"]` | Renders a saved 3D Viewer (CPT `bp3d-model-viewer`); works for viewers built with the classic metabox or the Gutenberg block. Status gate: drafts/private/scheduled/password-protected viewers show only to their editors; trashed to no one. Enqueues only the engine needed (model-viewer or o3dv). | `inc/Shortcode/Shortcode.php` |
| `[3d_viewer_product id="…"]` | Renders a WooCommerce product's 3D model anywhere; `id` defaults to the current product (fixed in 2.0.0 to show that product's model on any page). | same |

- Shortcode visible/copyable in: CPT list column (copy chip in Modern UI), under title on edit screen (Classic), block sidebar "Copy Shortcode".
- Theme template use: `<?php echo do_shortcode('[3d_viewer id="…"]'); ?>`.
- Filters for devs: `bp3d_classic_model_attribute`, `bp3d_gutenberg_model_attribute`, `bp3d_woocommerce_model_attribute`.

### 4a. CPT "3D Viewer → Add New" (classic shortcode generator) — metabox fields
File `inc/Field/Viewer.php` (meta key `_bp3dimages_`). Tabs: **Model / Settings / Style / Preview**.

| Tab | Field | Options / default |
|---|---|---|
| Model | Viewer | Lite / Advanced (mode cards in Modern UI) |
| Model | 3D Source | media upload (+URL box in Modern UI) |
| Model | Decoder | None / Draco (Lite) + Draco File upload |
| Model | 3D Poster Image | media + URL (Lite) |
| Model → Lighting & Environment | Environment Image | Neutral / Legacy / Custom (default Neutral) |
| | Custom Environment Image | upload/URL |
| | HDR Skybox Image | upload/URL (.hdr/JPG/PNG) |
| | Exposure (Modern places here; Classic on Settings) | slider 0.1–5, default 1 |
| | Shadow Intensity | slider 0–1 step 0.1, default 1 |
| Settings | Moving Controls | on |
| | Enable Zoom | on (Lite) |
| | Full Screen Button | on |
| | Zoom In/Out Button | default on (new viewers) |
| | Camera Button | off (Lite) |
| | 3D File Download Button | off |
| | Loading Type | Auto / Lazy / Eager (default Auto) |
| | Progressbar | on |
| | Enable AR | off (Lite) |
| | 3D Source for iOS (Optional) | .usdz upload/URL |
| | AR Placement | Floor / Wall |
| | AR Mode | WebXR / Scene Viewer / Quick Look (default WebXR) |
| Style | Width | dimensions, default 100 % |
| | Height | px / em / pt, default 320px |
| | Align | Left / Center / Right (default Center) |
| | Background Color | default transparent |
| Preview | Live preview mount | — |

Note: the CPT metabox exposes **Enable Zoom** and **Shadow Intensity (0–1)** which the main block does not (block only has shadow on/off).

---

## 5. Page builder integrations

### Elementor (free — two widgets, category "General", custom cube icon)
File `inc/Addons/Addons.php`, `ModelViewer.php`, `BP3DProductModel.php`, `src/public/elementor.tsx`.

**Widget "3D Model Viewer"** (`3dModelViewer`) — Content tab:
format notice; Viewer (Lite/Advanced); Select Model (custom file picker with preview, Replace, Remove; paste URL); Use Decoder (None/Draco) + bin file; Select Poster; Environment Image (Neutral/Legacy/Custom) + Custom Environment Image; HDR Skybox Image; Fullscreen Button (on); Mouse Control (on); Lazy Load (off); Show Progress Bar (on); Enable Zoom (on); Zoom In/Out Button (off); Camera/Capture Button (off); 3D File Download Button (off); Show Loading Percentage (off); Enable Shadow (on); Exposure (0.1–5, 1); Enable AR (off) → 3D Source for iOS (USDZ), AR Placement (Floor/Wall), AR Mode (WebXR/Scene Viewer/Quick Look).
Style tab: Width (px/%/vw, default 100%), Height (px/vh, default 500px), Background Color.
Editor: keeps configured height with a placeholder when no model is chosen; libraries always loaded in preview; robust against script deferral/optimisers.

**Widget "3D Product Model"** (`BP3DProductModel`) — renders `[3d_viewer_product]` for the current product; Style: Width, Height.

**[MISMATCH]** readme "Pro features include: Drag-and-drop Elementor widget with full viewer settings" — the free plugin already ships a near-full-featured Elementor widget. Old `docs/index.html` also calls Elementor widgets Pro.

### Other integrations
- **Dokan (multi-vendor)** — full module exists in source (`inc/Integrations/Dokan/*`, `src/integrations/dokan/*`): vendors add GLB, poster, USDZ, AR switch, viewer position, background colour from both Dokan editors; owner screen "Marketplace (Dokan)", off by default. **NOT shipped in 2.0.0**: not registered in `inc/Init.php` and excluded from the zip (`package.json` zip script; confirmed via `unzip -l`). Roadmap item.
- No Beaver/Divi/Bricks widgets. Theme-specific CSS fixes exist for Flatsome, WoodMart, Woostify, B Technologies; changelog mentions Divi fixes.

---

## 6. WooCommerce features (free)

Product edit screen metabox **"3D Product Settings"** (`inc/Woocommerce/ProductMeta.php`, meta `_bp3d_product_`):

| Field | Options |
|---|---|
| Format notice + support note | "The free product viewer displays GLB and GLTF models. Premium adds OBJ, STL, …" |
| 3D Source | upload or paste model URL ("GLB and GLTF are supported; other formats need Premium") |
| 3D Poster | upload/URL — shown until model loads or fails |
| 3D Viewer Position | None (default) / Top of the product image / Bottom of the product image / Replace Product Image with 3D / Show 3D on First Image of WooCommerce Gallery |
| Background | colour, default transparent |

Global **Settings → WooCommerce Settings** (`inc/Field/Settings.php`): WooCommerce on/off (on), Theme Compatibility Mode, Moving Controls, Enable Zoom, Loading Type (Auto/Lazy/Eager). **WooCommerce Selectors** section: Gallery, Gallery Item, Gallery Item Active, Gallery Thumbnail Item, Gallery Trigger selectors (custom theme support).

What happens on the product page (`SingleProduct.php`, `Product.php`, `Product3DViewer.tsx`, `manageIncompatibleTheme.tsx`):
- **Top / Bottom / Replace:** core `woocommerce_show_product_images` is removed and rebuilt with the viewer above/below the main image, or the image replaced (thumbnails hidden for Replace).
- **Show 3D on First Image:** viewer is inserted into the gallery thumbnails hook with **"View in 3D" / "View image" toggle buttons** on the first image; hides Woo zoom trigger while 3D active.
- Viewer auto-sizes to match the gallery image dimensions; fullscreen, mouse control, zoom, progress bar come from global settings.
- **Block themes & incompatible themes** (Twenty Twenty-Four, Twenty Twenty-Three, Woostify, Raft, eStore, Customify, B Technologies, any FSE theme, or when Theme Compatibility Mode is on): viewer is placed client-side into the gallery with fallbacks for `.woocommerce-product-gallery`, Woostify `.product-gallery`, and Woo's Product Gallery block (Ollie, Purple); Merge falls back to Top if the theme has no thumbnail hook.
- **Not in free (verified absent in code):** AR on product pages (product attributes carry no AR keys), Advanced-viewer formats, multiple models/3D gallery, per-variation models, popups, shop/listing 3D, presets, hotspots.

**[MISMATCH]** Readme FAQ/quick-start mentions "3D Viewer Settings metabox" (actual title "3D Product Settings"). Readme screenshots 6–7 ("Product image replaced with 3D Pro", "Show 3D based on product variable") show Pro features.

---

## 7. Admin & UX

- **Menu (CPT "3D Viewer", custom logo icon, position 15):** All 3D Viewers (list), Add New, **Help & Demos** (orange label), Settings, Extensions (BPEM manager), Freemius Upgrade/Pricing (styled blue button). Hidden: Guided Setup.
- **New admin interface (2.0.0, "bfields")** with one-click switch back to **Classic (Codestar)** — notice "3D Viewer has a new interface…", switch in Settings and in the Publish box; lockable via `BP3D_ADMIN_UI` constant or `bp3d_admin_ui` filter. Modern list table with copy-shortcode chip; card layout; viewer mode cards. Quick Edit restored.
- **Live Preview** on the viewer edit screen: side card (Modern) or metabox + Preview tab (Classic); device switch Desktop/Tablet/Mobile, expand to larger modal, Reset view, Zoom in/out, Fullscreen, Refresh; helpful states ("The Lite viewer opens only .glb and .gltf files, not %s. Switch the 3D Viewer to Advanced.", WebGL-context-lost message).
- **Editor choice:** Settings → Shortcode Generator → "Enable Gutenberg" makes new viewers use the block editor (block template locked) instead of the classic metabox.
- **Settings page sections:** General (Allowed Mime Types tile grid; Delete data on uninstall), WooCommerce Settings, Shortcode Generator, WooCommerce Selectors, Admin interface switch.
- **Guided Setup (onboarding):** auto-redirect once after fresh activation; 3 steps — **Model** (welcome + "Watch the 2-minute tutorial" video modal), **Customize** (feature tiles: Wide Format Support, Gutenberg & Elementor, WooCommerce Viewers, Responsive & Mobile Ready, Augmented Reality = Included; Hotspots & Initial View, "And much more" = Pro), **Publish** (choose Gutenberg / Elementor / Shortcode with step-by-step instructions, CTA "Add Your First 3D Model"). Progress is tracked and shown in Help & Demos until completed; dismissible notice "New to 3D Viewer? Take the 1-minute guided setup…". Full-screen, notice-free.
- **Help & Demos dashboard (React):** Welcome (hero, Quick Access, Getting Started tabs Gutenberg/Elementor/Shortcode, changelog, Pro card, community/review/feature-request/support links), **Demos** (17 live demos, filter by category, search, in-dashboard preview modal, Pro badges), **Feature Comparison** (live from bPlugins/Freemius API, searchable, "Pro only" tags), **Pricing** (Monthly/Yearly/Lifetime, 1 / 3 / Unlimited sites, Pro and Max plans, money-back guarantee, FAQ, Freemius checkout in-dashboard), **Extensions**, **Our Plugins** (install/activate other bPlugins plugins).
- **Inter font self-hosted** (no Google Fonts calls). Translation-ready (`3d-viewer.pot`, only en_US shipped).
- **Pro/Free data compatibility:** free saves preserve Pro-only data (downgrade-safe); Pro "link" and multi-model viewers still render (first model) in free.

---

## 8. Performance & tech

- **Libraries:** Google `<model-viewer>` (Three.js r174, Lit 3.2.1) for Lite; Online 3D Viewer (Three.js r163, fflate, Chevrotain) for Advanced; React (WP core ReactDOM) front-end; `qrcode` for AR hand-off. Both libraries bundled locally (`public/js/`).
- **Conditional loading:** front-end bundle + engine only enqueued where a viewer is rendered (block `render.php`, shortcode, Woo product with a model, Elementor widget); model-viewer loaded as an ES **script module**; Advanced engine loaded only for Advanced viewers. External decoders fetched only when a model needs them (Draco/KTX2 via gstatic; STEP/IGES/BREP/3DM/IFC via jsDelivr).
- **Lazy loading:** `loading` = lazy/auto/eager (model-viewer defers until visible for auto/lazy). Lazy Load fixed for blocks and Woo in 2.0.0.
- **Robustness:** broken env/skybox URLs pre-checked and skipped; 404 model shows message; Advanced viewer no longer double-downloads (2.0.0); WebGL context cleaned up on unmount; ResizeObserver keeps canvas sized in tabs; JS-failure fallback `<model-viewer>`.
- **Responsive:** per-device width/height in block; touch rotate/zoom/pan; iPhone fullscreen fallback.
- **AR runtime:** `ar`, `ar-placement`, `ar-modes`, `ios-src` set on model-viewer; desktop "View in AR" opens a **QR code** linking to the same page with `?bp3d-action=view-ar`, which auto-launches AR on the phone (`ARQRCode.tsx`).
- **Freemius SDK:** opt-in usage tracking; Freemius update checks disabled (updates via wp.org). Activation auto-deactivates 3D Viewer Premium if active (they are mutually exclusive).
- **External calls:** bPlugins API + wp.org plugins API + Freemius checkout, admin dashboard only (documented in readme).
- **Uninstall (`uninstall.php`):** opt-in only ("Delete data on uninstall" switch, default off). Skips entirely if `3d-viewer-premium` is installed (even inactive). When enabled: deletes all viewer posts, plugin options, onboarding user meta, CSF transient.

---

## 9. Free-vs-Pro gates found in the free UI (what Premium adds)

| Where | Locked text / item |
|---|---|
| Block → Model panel | "Premium Features: Multiple models, tone mapping and applying textures are available in the premium version" |
| Block → Options panel | "autoplay, variant selector, animation selector, lock left-right, up-down rotation, auto rotate, zoom, set initial zoom available in premium version" |
| Woo product metabox | "Premium adds OBJ, STL, 3DM, 3DS, 3MF, AMF, BIM, BREP, DAE, FBX, FCSTD, IFC, IGES, STEP, OFF, PLY and WRL" (Advanced formats on product pages) |
| Onboarding Customize | Pro: "Hotspots & Initial View"; "Axis locking, auto-rotate, custom camera angle and hotspot annotations" |
| Dashboard Welcome Pro card | "Interactive hotspots and annotations", "Multiple models in one viewer gallery", "A 3D model for each WooCommerce variation" |
| Feature comparison (Freemius copy, `features.ts`) | External model URLs; Preset configurations; Auto-rotation 360°; Full viewer settings on Elementor; Multiple models gallery; Per-variant models; Lighting/shadow/exposure; Auto-rotate & autoplay; Custom camera angle; Max plan = all premium extensions |
| Demos tab (Pro badge) | Camera controls (starting view, reset, lock); customisable control layout (rename/resize/reorder 7 buttons); HDR lighting comparison; 4 hotspot styles; image & video hotspots; interactive 3D product tour; AR with ruler/true-to-size; 3D product configurator (5 colourways); animated models with clickable pins; change model colours/textures; 3D model gallery (thumbnails/arrows); mobile poster optimisation; real-world dimensions |
| Extensions | "3D Product Configurator for WooCommerce" (per-variation model customisation) — included with Pro licence |
| readme Pro list | External URLs (S3, Drive, CDN); lighting/shadow/exposure; poster + progress bar; auto-rotate, fullscreen, autoplay; custom camera angle; Woo 3D gallery multiple models; hotspots |
| PRO_FEATURES_ARCHITECTURE.md / docs | Presets CPT, Visual Editor, popup models, shop-listing 3D icon/model, custom CSS/ID/class, progress bar colour, axis locks, rotate speed/delay, zoom level, texture editing, tone mapping, show edges (Advanced) |

**[MISMATCH] list for marketing hygiene** (free already has these, yet some copy calls them Pro): poster image, progress bar, fullscreen, exposure, shadow, environment/skybox, AR, capture & zoom buttons, Elementor widget with full settings, model URL entry in block/Elementor/Woo. Sources of stale copy: readme "Pro features include" list (poster/progress bar/fullscreen/lighting), Freemius feature list "Adjust lighting, shadow intensity, and exposure", `docs/index.html` Free-vs-Pro table, dashboard Getting Started says "adjust… auto-rotate… right in the block sidebar" (auto-rotate is Pro in the main block).

---

## 10. Roadmap hints (todo.txt / temp.txt / code)

- Dokan multi-vendor module (built, not shipped).
- Requested: cycle for multiple models, thumbnail size, orientation/scale, randomize multiple models, factor option in classic editor, all new features in Elementor, enable/disable variation selector, protect file from download, loader when switching model by variation, icon per hotspot, border-radius in style tab.
- Free 2.0.0 port list: more upload mime keys from Pro (12 extra formats), `normaliseLoading` (Auto/Lazy/Eager select in Elementor), CPT labels, bfields 1.1.1 sync, quoted background-image URLs.
- Parity gap noted: fullscreen, zoom buttons, capture, lazy load are in Gutenberg but (historically) not in classic generator.
- Uninstall reasons collected (useful for objection-handling copy): model didn't show / keeps loading, "too slow", wanted thumbnail-click load, Woo gallery broken / "no option to add as one picture", no .ply / .idw, mouse control not intuitive, wanted auto-rotation with limits, wanted model change by options/variations, Elementor blocks, annoying backend notices.
- temp.txt: only a PHP/WP compatibility audit prompt (no roadmap).

---

## 11. Demo / marketing assets found

- `promo/3d-viewer-intro.mp4` (61 s, 1920×1080, voiceover) + `promo/poster.png`; `promo/pipeline/` Playwright+ffmpeg recording pipeline (models: Astronaut, DamagedHelmet, ToyCar, BoomBox; scenes: block page, Woo product "Sci-Fi Collector Helmet", Elementor drag-and-drop).
- `docs/onboarding-video-script.md` — 75 s guided-setup screencast script with shot list (+45 s cut).
- `docs/index.html` — full documentation site (Pro-oriented, partly outdated re: free features).
- `admin/images/dashboard/demo-*.webp` — 17 demo thumbnails (getting-started, camera-controls, viewer-controls, hdr-lighting, hotspots, media-hotspots, product-tour, ar, configurator, animated, colours, gallery, mobile, dimensions, stl, hero, skybox) + headphones, need-help.
- `admin/images/onboarding/*` (onboarding image, bg, logo mark); `public/images/logo/wc-3d-model-viewer.png`.
- Live demo site pages (from `src/admin/dashboard/utils/data.tsx`): `https://3d-viewer.bplugins.com/<slug>/` — free demos: `3d-model-viewer-for-wordpress`, `wordpress-stl-viewer` ("Show STL, STEP, OBJ and FBX files for free, with no conversion"), `3d-hero-section`, `3d-model-environment-skybox`.
- tests/e2e screenshots gallery script (`tests/e2e/scripts/make-gallery.mjs`) can produce UI screenshots.
- readme screenshots list (10): Add New 3D; 3D Configuration; Single and Multiple Preview; 3D Product at top of image; 3D Product at bottom of image; Product image replaced with 3D Pro; Show 3D based on product variable; Settings; Gutenberg Block; Gutenberg Block Settings.

---

## 12. File references for key claims

| Claim | File |
|---|---|
| Block attributes/defaults | `src/blocks/3d-viewer/block.json` (identical to `build/blocks/3d-viewer/block.json`) |
| Block Model panel incl. AR, env, skybox, poster, decoder, Pro panel | `src/blocks/3d-viewer/Components/Backend/Tabs/General/ModelForm.tsx` |
| Block Options & Pro notice | `.../Tabs/General/Options.tsx`, `O3DVOptions.tsx` |
| Responsive width/height/bg | `.../Tabs/Style/Style.tsx`, `Components/Common/Style.tsx` |
| Viewer buttons (zoom, fullscreen, capture, AR, download) | `src/blocks/3d-viewer/Components/Common/Viewer.tsx` |
| AR + QR hand-off | `.../Common/ModelViewer.tsx`, `.../Common/ARQRCode.tsx` |
| Advanced engine | `.../Common/Basic3DViewer.tsx`, `public/js/o3dv.min.js` |
| Legacy simple block with auto-rotate | `3d-viewer-block/build/block.json`, `render.php` |
| Upload whitelist + security | `inc/Helper/Utils.php` (`SUPPORTED_MIME_TYPES`), `inc/Base/ExtendMimeType.php` |
| Shortcodes + status gate | `inc/Shortcode/Shortcode.php`, `inc/Helper/Utils.php::buildViewerAttributes` |
| CPT metabox fields | `inc/Field/Viewer.php` |
| Global settings | `inc/Field/Settings.php` |
| Woo metabox / placement / theme fallbacks | `inc/Woocommerce/ProductMeta.php`, `SingleProduct.php`, `Product.php`, `src/public/Components/Product3DViewer.tsx`, `src/utils/manageIncompatibleTheme.tsx`, `src/blocks/3d-viewer/Components/Common/ShopLoopItemComponents.tsx` |
| Elementor widgets | `inc/Addons/Addons.php`, `ModelViewer.php`, `BP3DProductModel.php`, `src/public/elementor.tsx` |
| Conditional enqueue / script module | `inc/Addons/Blocks.php`, `src/blocks/3d-viewer/render.php`, `inc/Base/EnqueueAssets.php` |
| Admin UI switch | `inc/Base/AdminUi.php` |
| Menus, dashboard, setup | `inc/admin.php`, `src/admin/dashboard/**`, `src/admin/onboarding/**`, `inc/Base/Onboarding.php`, `OnboardingNotice.php` |
| Live preview | `src/admin/preview/index.tsx`, `inc/Base/PostTypeModelViewer.php` |
| Demos list & Pro flags | `src/admin/dashboard/utils/data.tsx` |
| Extensions catalog | `public/extensions.php` |
| Uninstall | `uninstall.php` |
| Activation behaviour, Freemius | `3d-viewer.php` |
| Dokan (unshipped) | `inc/Integrations/Dokan/README.md`, `package.json` zip exclusions |
| Roadmap | `todo.txt`, `PRO_FEATURES_ARCHITECTURE.md` (written for v1.8.13; partly stale) |
