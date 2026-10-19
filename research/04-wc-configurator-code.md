# 3D Product Configurator for WooCommerce (v1.1.0): feature inventory from the code

Audit of `/Users/raju/Local Sites/dev/app/public/wp-content/plugins/wc-3d-model-viewer-pro`, done read-only. Every feature below was checked in PHP or TS source, not taken from names alone. Items marked **(unverified)** were not traced end to end. Items marked **(claim gap)** appear in readme.txt or the plugin description but are not exposed in the shipped code.

---

## Overview

- **Name:** 3D Product Configurator for WooCommerce. Formerly "WC 3D Model Viewer" (renamed in 1.0.1). Text domain `wc-3d-model-viewer`. Freemius slug `wc-3d-model-viewer` / `wc-3d-model-viewer-pro`, Freemius id 32278.
- **Brand:** bPlugins. Plugin URI `https://bplugins.com/products/woocommerce-product-configurator`. The extension card lists the author as bPlugins; the plugin header says `Author: Raju`.
- **What it is:** a premium **extension of bPlugins' "3D Viewer" plugin**. It registers with the 3D Viewer extension manager (`BPEM`) for both the free (`3d-viewer`) and premium (`3d-viewer-premium`) hosts, and needs 3D Viewer **1.8.0 or later** (`Extension::get_min_parent_version`). It is unlocked by a **3D Viewer Pro or Max plan**. It can also boot on its own with its own Freemius licence (the legacy path).
- **Core idea:** you upload one GLB/glTF per product. Each WooCommerce variation then changes it: show or hide meshes, recolor, override textures, edit material properties, apply material variants, set camera, lighting, animation, hotspots and AR, or use a different model. Shoppers can also customize the product live, and their choices are stored on the cart line and the order.
- **Stack:** React 19, three.js 0.160, @react-three/fiber 9, drei 10, zustand, and qrcode. React is bundled with the plugin rather than taken from WordPress. Server side is PHP 7.4+ with PSR-4 classes under `WC3D\`.
- **Architecture:**
  - A core plugin plus **13 self-contained "feature modules"**. Each module is auto-discovered from `includes/Modules/<Name>/Module.php` and has a twin in `src/modules/<id>/`.
  - Merchants switch modules on or off under Settings → Features.
  - The `WC3D_DISABLE_MODULES` constant can kill all modules or a listed subset.
  - `npm run zip -- --without=<id>` builds a release that leaves a module out.
- **Nested `wc-3d-model-viewer-pro/` folder:** this is the **packaged build/dist copy**. It is the same content as `wc-3d-model-viewer-pro.zip` (4.1 MB, 466 files). It has no tests or dev files, has `assets/build/*.asset.php`, and ships only the Studio HDRI (`assets/hdri/studio_small_03_1k.hdr`). It is not a separate product.

---

## Modules

All 13 modules inherit `AbstractModule::default_enabled() = true` and `default_enabled_on_update() = false`. So **new installs get every module on**, and **existing sites that update keep them off** until the merchant turns them on. No module overrides these defaults. CustomizerModal has extra legacy logic, described in its section.

Several modules declare `needs_customizer(): true`. The Features card then notes that they need the customer drawer.

Settings are stored in `wc3d_modules['settings'][<id>]`.

### 1. Customizer modal (`customizer-modal`)
- On a product's own single product page, **Customize opens a large dialog** instead of the side drawer.
- The dialog contains:
  - a bigger live viewer
  - the customizer options
  - the WooCommerce variation selects
  - quantity
  - a **live total**
  - the product's real **Add to cart**
- The viewer DOM is portalled between the page and the dialog, so **the model never reloads**.
- The browser Back button closes the dialog (`modal-history.ts`).
- Falls back to the drawer for grouped products, other products' viewers, shop pages and shortcode pages.
- Needs the customizer to be on for the product.
- Legacy rule: if the old `customizer_layout = modal` setting was used, the module is on. New installs get it on.
- No settings of its own.
- Files: `includes/Modules/CustomizerModal/Module.php`, `src/modules/customizer-modal/`.

### 2. Undo and redo for customers (`undo-redo-drawer`)
- Adds **Undo/Redo buttons** next to "Reset Customizations" in the drawer and in the modal.
- Keyboard shortcuts work while focus is in the viewer: **Ctrl/⌘+Z**, **Ctrl+Shift+Z / ⇧⌘Z / Ctrl+Y**.
- History covers every shopper change, including keys added by other modules.
  - Changes made within 400 ms are merged into one step.
  - History is capped at 50 steps.
  - A screen-reader live region announces each step.
- History lives in memory only; nothing is stored.
- No settings.

### 3. Option pricing (`option-pricing`)
- **Extra charge or discount per color, per part (recolor or toggle on/off), per custom color (picker), or per option-group choice.** This applies to text/image areas too.
- Rule types:
  - **fixed amount**
  - **percent of price**
  - optional **sale amount**
  - **negative amounts give discounts**
- Rules are set per product default or **per variation**; a variation can inherit or override.
- Shopper-facing:
  - price notes on swatches and parts
  - an "Options" total in the drawer
  - a **Product / Options / Total box above Add to cart**
  - the live total in the modal
- **The cart price is recomputed on the server from the saved rules.** The form only posts choices, so shoppers cannot tamper with prices. Hook: `woocommerce_before_calculate_totals`.
- Percent-priced choices show "+15%" until a variation gives the base price.
- Order lines freeze what was charged, with one visible meta row per option line.
- The editor warns when option groups replace the plain part and color prices.

### 4. Option groups with swatches (`option-groups`)
- Merchants build named **option groups** with:
  - label and optional description
  - **type**: Color, Material or Parts. Material variants add a "variant" type.
  - **display**: **Swatches, Thumbnails, Buttons or Dropdown**
  - "Applies to": target meshes
  - **Required** (Add to cart is blocked until the shopper picks)
  - **Default choice**
  - **per-choice price**, which needs Option pricing
  - thumbnail image per choice
- What each choice can do:
  - Color choices set base color.
  - Material choices set base color, roughness and metalness.
  - Parts choices set which meshes show; unchecked meshes are hidden.
- Groups replace the plain "Colors & Materials" and "Options & Parts" lists in the customizer.
- Editor workflow:
  - **"Create from customizer settings"** converts existing customizable/toggleable meshes into groups and carries their prices over.
  - Groups and choices can be reordered.
  - The open choice is previewed live in the editor viewport.
  - Meshes can be picked from the tree or by clicking in the viewport.
  - Groups and choices are set per product default or per variation (inherit or override).
- Server side:
  - validates required groups
  - stores every resolved pick on the cart line, plus the baked materials and meshes
- Exposes PHP and JS hooks for other modules.

### 5. Conditional logic (`conditional-logic`), which requires Option groups
- **Show a group, or offer a choice, only when conditions match.** Conditions can be:
  - a **WooCommerce variation attribute** (is / is not)
  - an **earlier group's pick** (is / is not / has a choice / has no choice)
- Matching is **all or any**. A group can only depend on groups above it.
- Enforced on the server: hidden groups and unavailable choices are never stored, charged or required.
- Shopper-facing: "X is not available with this selection. Using Y." notes, announced through a polite ARIA live region.
- Editor: conditions blocks, a "Conditional" badge, and a preview line such as "With default choices: shown for A, hidden for B".

### 6. Material variants (`materials-variants`)
- Uses the **KHR_materials_variants** material sets embedded in a GLB, exported from Blender, Substance 3D Painter and similar tools.
- Merchant options:
  - pick a variant **per product or per variation**
  - **"Auto-map by name"** matches WooCommerce variation names to variant names
  - **customer choice** via a "Material variant" option group, which needs Option groups
- Variants are read in the browser from the GLB, so models uploaded earlier need no re-parse.
- Editor color edits are applied on top of the variant.
- The chosen variant is stored on the cart line and applied in the order preview.

### 7. Text and image decals (`personalization`)
- Shoppers put **their own text or image on a merchant-defined area** of the model, and see it live on the 3D model.
- Merchant settings per area:
  - label
  - mesh
  - placement: side (Front/Back/Left/Right/Top/Bottom), x/y, width/height, rotation
  - allowed kinds (Text, Image, or Text & image)
  - **fonts**: Inter, Arial, Georgia, Times New Roman, Verdana, Trebuchet MS, Courier New, Impact, Brush Script MT
  - a **color list**
  - **max characters**
  - smallest and largest size
  - **required**
  - **price per filled area**, which needs Option pricing
- Shoppers can adjust the **size, rotation and horizontal/vertical position** of their design using sliders.
- Image uploads:
  - PNG, JPG or WEBP, up to 5 MB
  - re-encoded to at most 1024 px
  - stored in `uploads/wc3d/decals/`
  - rate-limited to 30 uploads per 10 minutes per IP
- The design appears as a row on the cart line, checkout, order and emails, and in the order's 3D preview.
- Areas on hidden parts are not stored, charged or required.
- Not built: dragging the design directly on the model, multi-line text, curved text.

### 8. Cart and order snapshot (`order-snapshot`)
- A **600×600 picture of the configured product replaces the product thumbnail** in all of these places:
  - classic cart and mini cart
  - checkout review
  - **Cart and Checkout blocks**
  - order received / view order pages
  - the admin order screen
  - **emails**
- The picture is captured in the browser at Add to cart.
- The server validates it as a real JPEG/PNG of at most 600 KB and 1200 px, then stores it in `uploads/wc3d/snapshots/` with de-duplication by hash.
- "Order again" restores the line with its stored choices and picture.

### 9. AR of the configured product (`usdz-export`)
- **AR shows the shopper's design**: colors, materials, chosen options and hidden parts.
  - **iPhone/iPad:** a USDZ is generated on the device (three's USDZExporter) and opened in Quick Look.
  - **Android:** a GLB is generated on the device (GLTFExporter), uploaded to `wc3d/v1/ar-file`, and opened in Scene Viewer.
  - **Desktop:** the QR code link carries the variation and the design.
- Also shows the AR button on iOS **even when no USDZ was uploaded**.
- Reliability:
  - caches the last 8 builds per page
  - 20-second timeout and 50 MB cap
  - falls back to the uploaded file if the build fails
  - an "Open AR" second tap is used if the build outlasts the browser's user-gesture window
- Generated files are cleaned up daily (deleted after 24 h). Android uploads are rate-limited to 20 per 10 minutes per IP.
- **Setting:** "AR shows the customer's configuration". It is **off by default**, so the module is active but does nothing until the merchant turns this on.
- Per-product opt-out in the editor's "AR & Quick Look" panel, which also has a **Test AR export** button.
- Fires the `wc3d_ar_launch` action and a matching JS event, usable for analytics.

### 10. Share link and saved designs (`saved-designs`)
- A **"Share design"** button in the drawer or modal footer, plus a link under Add to cart. It opens a share sheet with:
  - a picture of the design
  - an option summary
  - a **short link** (`?wc3d_design=V3G2JA`, 6 characters) with **Copy link** and a **QR code**
- Opening the link restores the product, variation and choices, and shows a "Design CODE loaded" notice with "Start over".
  - The link page is set to `noindex` and uses the design picture as its `og:image`.
- **My Account → Saved designs** for logged-in customers: list, rename, add to cart, copy link, delete.
- Admin tab **WooCommerce → 3D Models → Saved designs**, with views All / Accounts / Links / Expired and per-row delete.
- Identical designs share one code. Each link records a view count.
- Settings:
  - **Share links** (on)
  - **Saved designs in My Account** (on)
  - **Link lifetime**: 30 days, 90 days (default), 6 months, 1 year, or Never. Account designs never expire.
- A daily cron purges expired links. Guest share links are rate-limited to 30 per 10 minutes per IP.
- Data lives in its own table, `{prefix}wc3d_saved_designs`.

### 11. Product viewer block (`product-viewer-block`)
- A **Gutenberg block "3D Product Viewer"** (`wc3d/product-viewer`) for block-theme Single Product templates, pages and posts.
- Block attributes:
  - product picker, or the current product
  - variation
  - placement: gallery or standalone
  - aspect: 1/1, 4/3, 16/9 or fixed height
  - width and height
  - customizer: product / show / hide
  - per-control toggles
  - gallery position
  - background: product / transparent / color
  - align wide or full
- Placing the block in the Single Product template **replaces the automatic placement**. It can also hide the WooCommerce gallery blocks.
- The editor canvas shows a static poster preview.
- Also provides an **Elementor widget** (`wc3d-product-viewer`) with the same options.

### 12. Coverage dashboard (`model-coverage`)
- A **Coverage tab** on WooCommerce → 3D Models with stat cards:
  - Products with 3D
  - Variations covered
  - Missing iOS AR file
  - Missing poster
  - Oversized models
  - Drafts with 3D
- A report table with an issues column and a filter. Issues include:
  - no 3D
  - no model
  - model file missing
  - oversized
  - no iOS AR file
  - AR file not matched to a variation's own model
  - no poster
- **Bulk actions:** Assign model… (with undo), Enable 3D, Disable 3D, **Generate posters**. Poster generation renders an 800×800 image in the browser and uploads it to the Media Library.
- After the first editor save, a poster is generated automatically for any product that has none. It stands in for a missing product image.
- Setting: "Flag models over [10] MB" (range 1 to 500).

### 13. Model from a URL (`external-url`)
- Adds an **"External URL" tab** to every model and USDZ media picker, so merchants can use a GLB, glTF or USDZ **hosted on a CDN**.
- **Check URL** tests, from the store server:
  - reachability
  - size
  - **CORS**
  - content type and magic bytes
  - plus a warning for .gltf files, whose dependencies also need CORS
- Uses `wp_safe_remote_*`, so private and loopback addresses are blocked.
- The file is downloaded once (64 MB cap) to parse the scene. It is re-parsed only when the file changes (ETag/size hash).
- "External · host" badges appear in the Models list, Coverage, the product panel and the editor.
- The storefront adds a preconnect hint for the external host.

---

## Merchant editor capabilities

The editor is a **full-screen React editor** opened from the product's "3D Model" tab ("Open 3D Customizer") or from the Models list. Files are in `src/admin/editor/`.

### Layout
- Top bar with breadcrumbs (Products → Variations → Default), "View Product" and "Edit Product".
- Live 3D **ScenePreview** canvas.
- Resizable left sidebar with the **Mesh tree** (SceneTree), showing the hierarchy, groups, an animations list, and Show/Hide eye toggles.
- **Light/dark editor theme**, saved in localStorage.

### Variations overview
- A grid of all WooCommerce variations with these states:
  - "Linked" or "Unlinked"
  - number of overrides
  - number of meshes changed
- Search, plus filters All / Linked / Unlinked. "Edit default look" opens the base configuration.

### Attribute Auto-Map Assistant
- Pick a WooCommerce attribute. The assistant **fuzzy-matches each attribute value to mesh names**. You can refine the links by hand.
- Option: **exclusive visibility**, which shows this option's meshes and hides the meshes mapped to other options.
- "Apply mapping" writes the overrides into every affected variation.

### Variation tabs
- Per variation: "This variant changes…" lists the overrides. Each override can be removed on its own, or "Clear all".
- Values not set on a variation are inherited from the default configuration.

### Mesh inspector
Works on the selected mesh or group. You can select by clicking in the viewport or in the tree; group selection edits every mesh in the group.
- **Visible / Hidden** (shows Mixed for groups)
- **Color override** with an editable hex field
- **Texture (image) override** from the Media Library
- **Shopper label**: a friendly name shown in the customizer, cart and orders
- **"Customizable on Frontend"**: the shopper can recolor this part
- **"Toggleable on Frontend"**: the shopper can show or hide this part
- Warnings:
  - when the customizer is off
  - when a competing color option or a variation also recolors the part

### Material editor
- **Base color, Metalness, Roughness** per material slot, using variation-aware overrides.
- **(claim gap)** readme.txt says "clearcoat and texture maps" for materials. The `MaterialConfig` schema has `clearcoat` and `textures`, but the editor shows only base color, metalness and roughness. Texture replacement exists only as the per-mesh "Texture (image)" override.

### Material swapping
- Real material swaps use **KHR_materials_variants** (module 6).
- The core "materials" feature edits material *properties*.
- `MeshConfig.material` exists in the schema, but no editor UI for it was found **(unverified)**.

### Alternative 3D Model per variation
- VariationModelSelector: "Custom 3D Model", a different GLB or glTF for that variation only.

### Scene & Lighting (EnvironmentPicker)
- Environment preset; see Viewer/rendering settings below.
- **Upload Custom HDRI** (.hdr or .exr).
- Lighting intensity.
- **Contact shadows** on/off and shadow opacity.
- Background:
  - Transparent
  - Solid color
  - Background image
  - Display environment map, with **environment blur**
- Floor:
  - **Show grid helper**
  - **Physical ground floor** with color, texture, roughness and metalness
  - **"Premium Floor Reflections"**
- One-click **download of missing lighting presets** from inside the editor.

### Animations
- **Autoplay clip**, or None (static), with each clip's duration shown.
- **Loop playback**.
- **Playback speed**.
- Per-variation override.

### Hotspots
- **Click on the model to place** a hotspot, attached to a mesh with an X/Y/Z offset.
- Fields:
  - label
  - tooltip description
  - icon: Information / External Link / WooCommerce Product / Warning-Alert
  - target URL
  - **linked WooCommerce product**, which gives the hotspot an Add to Cart / View Product button
  - **captured camera view**, so clicking the hotspot flies the camera there
- Per-variation hotspots, inherited unless edited.

### Camera
- **Capture initial view** per variation or default.
- Field of view (FOV) is stored in the schema; the readme's "camera FOV setting" fix confirms it is used **(unverified UI)**.
- **Gallery View Presets**: capture custom viewpoints and thumbnails for 4 gallery angles (Perspective, Front, Side, Back), or use the auto-generated ones.
- **Allow visitor gestures**: Rotate, Zoom and Pan toggles.
- **Angle limits**: vertical and horizontal min/max in degrees.
- **Distance limits**: min and max.
- A "Get current position" readout helps set the limits.

### AR & Quick Look
- Enable AR.
- Upload a USDZ for iOS.
- **Allow resizing in AR**. Turning it off locks the model to real-world size; Scene Viewer gets `resizable=false`.
- With the usdz-export module: an on-device export switch and Test AR export.

### Performance & Optimization
- **Model Validation (Health)** shows:
  - triangles
  - vertices
  - unique materials
  - unique textures
  - file size
- Health warnings for more than 150k triangles, more than 15 MB, or more than 15 materials.
- **GPU performance mode**: Balanced, High Performance, or Battery Saver (low pixel ratio).
- **Mobile pixel-ratio limit**.
- **Disable mobile reflections**.
- **Disable mobile shadows**.
- **(claim gap)** readme.txt lists "max texture resolution". The code comment in `OptimizationControls.tsx` says autoOptimize, dracoEnabled, lodEnabled and maxTextureResolution "have no runtime consumer, so they have no controls".

### Reusable presets (PresetsManager)
- Save and apply named **Material, Camera View, Lighting and Animation presets**.
- Stored site-wide in the `wc3d_presets` table and exposed over REST.

### Import & Export
- **Export the config as JSON**: meshes, materials, camera, environment and floor, optimization, hotspots.
- **Import JSON** with a **model-match check** ("x / y matches", perfect / partial / mismatch warnings).
- Section-by-section selection.
- The import is applied to the preview first, then saved.
- Lets you clone a layout between products and variations.

### Customer Options, Option Pricing, Personalization and Material Variants panels
- These are added to the inspector by modules 3 to 7.

### Editing workflow
- **Undo/Redo**: Ctrl+Z / Ctrl+Y / ⌘⇧Z, with a separate history per variation and for the default.
- Slider and typing changes are merged into one undo step.
- **Reset default** or **Reset variation**.
- Save status (Saving… / Saved / Failed), an **unsaved-changes count**, a leave-page warning, and nonce refresh for long sessions.

### Other admin entry points
- **Product "3D Model" tab** (WooCommerce product data panel):
  - Enable 3D Model
  - choose model (GLB or glTF), shown with its poster, type and size
  - custom poster image
  - "Show on shop page"
  - per-product overrides that default to "Use global (value)": viewer position, background, loading behavior, customizer panel, gallery and gallery position
  - copy-ready shortcode
  - Open 3D Customizer button

---

## Shopper experience

### Viewer
- Real-time rotate, zoom and pan, with **auto-framing**.
- **Keyboard control**: arrow keys rotate, + and − zoom. The canvas has an accessible name.
- Reduced-motion support.

### Lazy poster
- A lightweight poster (custom image or the product image) shows first. The 3D engine loads **on click**, when **scrolled into view**, or **eagerly**.
- The frontend entry script is about 12 KB; three.js is in lazy-loaded chunks.
- Loading overlay text: "Loading 3D Model…".

### Placement options
Set globally and overridable per product:
- Replace the product image
- On the first gallery image
- **Popup/modal** button overlay
- A **"3D View" product tab**
- None (shortcode only)

Further ways to place the viewer:
- **Shortcode** `[wc3d_viewer id="42"]`. Attributes: `variation`, `aspect`, `height`, `width`, `customizer`, `controls`, `gallery_position`, `background`, `class`.
- **Block** and **Elementor widget** (module 11).

### Toolbar
Toggled in settings:
- Zoom +/−
- Reset view
- Auto-rotate play/pause
- **Download 3D model**
- **Fullscreen**
- **Customize** button
- **View in AR**

### Gallery strip of angles
- Perspective, Front, Side and Back thumbnails animate the camera to each view.
- Position: bottom, top, right side, or below the model.

### Live variation switching
- Choosing a WooCommerce variation **updates the model in place, with no reload**.
  - It listens to `found_variation` / `reset_data`.
  - It tolerates late or delay-loaded jQuery.
  - Several viewers on one page only update their own product.

### Hotspots
- Labeled pins with tooltips that fly the camera to a view.
- Links, or a **linked product with Add to Cart / View Product**.

### Customizer
A drawer by default, or a modal with module 1.
- **Colors & Materials**:
  - a palette of quick swatches, with a configurable global palette
  - a **Custom Color picker**
  - reset per part
- **Options & Parts**: show or hide optional parts.
- **Reset Customizations**.
- Colors are named in swatches and the cart (e.g. "Emerald (#10b981)"), using `Utils/ColorName.php`.

The modules add to this:
- option groups with swatches, thumbnails, buttons or dropdown
- required picks
- conditional options
- per-option prices with a live total
- text and image personalization
- material variants
- undo/redo
- share link, QR code and saved designs

### Add to cart with configuration
- The shopper's choices are posted in a hidden field (`wc3d_custom_config`, max 64 KB).
- The server re-sanitizes them against the merchant's setup; only parts the merchant made customizable are accepted.
- Different configurations become separate cart lines.

### Cart, checkout and order display
- A **"3D Customization"** summary row lists:
  - part: color (named + hex)
  - metalness and roughness
  - shown/hidden parts
  - option lines and prices
- With module 8, a configured-product image replaces the thumbnail on cart, checkout, orders and emails.
- Order item meta `_wc3d_custom_config` plus a summary key.
- "Order again" keeps the configuration.

### Order 3D preview
- A **"View 3D Preview"** button opens an interactive 3D view of the customer's exact configuration.
- Available on the **admin order screen** and on the **customer's order pages**.

### AR
- **iOS Quick Look** (uploaded USDZ).
- **Android Scene Viewer** (the GLB).
- **Desktop QR code**, generated locally with no third-party service.
- Optional fixed real-world scale.
- Module 9 adds AR of the configured design.

### Shop and archive
- **"3D" badge** on product cards.
- Optional **"View in 3D" quick-view popup**. It can be on globally or per product with "Show on shop page".
- Works with block themes and custom loops; the badge is moved into the image container.

### Dynamic content
- Viewers inserted after page load are mounted automatically by a MutationObserver. This covers quick view, infinite scroll and AJAX.

### Price changes
- None in core. **Only with Option pricing** (module 3). With it, the price is recomputed on the server.

---

## Viewer/rendering settings

### HDRI lighting presets
All are 1K `.hdr` files. Their names come from `HdriLibrary::PRESETS`:

| Preset | File |
|---|---|
| **Studio** (default, bundled) | studio_small_03_1k.hdr |
| Apartment | lebombo_1k.hdr |
| City | potsdamer_platz_1k.hdr |
| Dawn | kiara_1_dawn_1k.hdr |
| Forest | forest_slope_1k.hdr |
| Lobby | st_fagans_interior_1k.hdr |
| Night | dikhololo_night_1k.hdr |
| Park | rooitou_park_1k.hdr |
| Sunset | venice_sunset_1k.hdr |
| Warehouse | empty_warehouse_01_1k.hdr |

- The dev repo has all 10 in `assets/hdri/`. **The shipped zip bundles only Studio**, which brings the zip down from about 16 MB to about 4 MB.
- The other 9 are **downloaded on demand by an admin click**, in the editor or under Settings → Scene & Performance → Lighting Presets ("Download all").
  - Sources: GitHub `bPlugins/3d-viewer-assets@v1`, then jsDelivr, then a pmndrs/drei-assets fallback.
  - Each file is checked against a **fixed SHA-256** hash and saved to `uploads/wc3d-hdri/`.
  - A manual upload of a zip or .hdr files is also possible.
- **Shoppers' browsers always load lighting from the store itself**, never from a third party.
- **Custom HDRI**: upload your own .hdr or .exr.

### Decoders (bundled locally, no CDN)
- **Draco**: `assets/decoders/draco/draco_decoder.wasm` and `draco_wasm_wrapper.js`.
- **KTX2 / Basis Universal textures**: `assets/decoders/basis/basis_transcoder.wasm` and `.js`, used by three's KTX2Loader.
- **Meshopt**: three's `MeshoptDecoder` is bundled into the JS (drei's default CDN is deliberately not used).
- The server-side GLB parser flags `KHR_draco_mesh_compression` and `EXT_meshopt_compression`.

### Other rendering settings
- **Environment**:
  - intensity
  - contact shadows and shadow opacity
  - reflection intensity
  - background: transparent / color / image / environment map, with blur
  - floor: color / texture / grid / reflection / roughness / metalness
- **Camera**:
  - position and target
  - FOV
  - rotate, zoom and pan locks
  - polar and azimuth angle limits
  - min and max distance
  - 4 gallery presets
- **Animations**: autoplay clip, loop, speed.
- **Global background** (Settings): Transparent / Solid color / Custom image. Overridable per product.
- **Performance**:
  - GPU mode (high-performance / default / low-power)
  - pixel-ratio limit
  - mobile reflections and shadows can be turned off
  - loading trigger: click / scroll / eager
- **GLB scene parsing** on upload, server side: meshes, materials, animations with durations, cameras, node hierarchy. `.glb` uploads must have a valid glTF header.

---

## WooCommerce integration

- **Variable products:** each variation has its own config row (`wc3d_variation_configs`) that inherits from the product default.
  - Variations can use their own model.
  - Variation attributes drive Conditional logic.
  - The Auto-map assistant maps attributes to meshes.
- **Simple products:** a single default configuration.
- Grouped products fall back to the drawer.
- **Cart:**
  - `woocommerce_add_cart_item_data` and session restore
  - `woocommerce_get_item_data` for display
  - unique lines per configuration
  - server-side price recalculation (Option pricing)
  - required-option validation (Option groups, Personalization)
- **Checkout and orders:**
  - `woocommerce_checkout_create_order_line_item` stores `_wc3d_custom_config` and the summary
  - option prices are frozen on the order
  - the order snapshot image is stored
  - order-again support
- **Emails:** the configuration summary appears as order item meta. The snapshot image replaces the product image in emails (module 8).
- **Order 3D preview:** on admin order item meta and on customer order view pages.
- **HPOS:** compatibility with `custom_order_tables` is declared.
- **Cart and Checkout blocks:** compatibility with `cart_checkout_blocks` is declared.
  - Configurations show and are saved in block cart/checkout.
  - The configuration is captured by the classic add-to-cart form on the product page.
  - The snapshot image works in the blocks.
- **My Account:** a "Saved designs" endpoint (module 10).
- **Product data tab:** a "3D Model" panel.
- **Data cleanup:** configs are removed when a product, variation or model attachment is **permanently** deleted. Trashing keeps them.
- Not part of the cart integration, but related: the WooCommerce setup wizard redirect is suppressed (`woocommerce_prevent_automatic_wizard_redirect`).

---

## Admin & settings

**Menu:** **WooCommerce → 3D Models**, with these tabs:
- **Models**: products list with 3D status, model file, variation count, last modified, and an Edit action.
- **Coverage** (module 12).
- **Saved designs** (module 10).
- **Settings**.
- A "Watch Video Guide" link (`https://youtu.be/xl99YlbFw18`, filterable).
- The empty state offers "Create product".

**Settings sections** (the sidebar can be collapsed to icons and resized):

| Section | Settings (default) |
|---|---|
| Display & Placements | 3D Viewer Position (replace image) · Shop Listing 3D Badge (on) · Shop Listing Quick View (off) |
| Scene & Performance | Background Style (transparent) / color / image · 3D Loading Behavior (click) · **Lighting Presets** download/upload manager |
| Customer Drawer | Enable Configurator Side Panel (off in code defaults; **on for new installs** via Installer) · Quick Color Selection Palette (11 colors) |
| Viewer Toolbar | Zoom buttons (off) · Reset camera (off) · Auto-rotate (off) · Download model (on in defaults; **off for new installs**) · Gallery of Different Sides (on) · Gallery Position (bottom) |
| Features | on/off cards for the 13 modules, each with its own settings |
| Shortcodes & Help | shortcode reference and how to find the product ID |
| Data & Uninstall | "Delete all 3D configurator data when the plugin is uninstalled" (off; order data always kept; multisite-aware) |

**REST API (`wc3d/v1`):**
- `models` (list and details)
- product config and variation configs, including `products/{id}/variations`
- `presets` (CRUD)
- `environments`: list, `{preset}/download`, `upload`
- module routes:
  - `models/check-url` and `models/external`
  - `products/{id}/poster`
  - `decal-image`
  - `ar-file`
  - `designs` (CRUD, plus `{code}`)
  - `product-viewer-block/products`

**Developer hooks:** about 45 `wc3d/*` filters and actions, including:
- `wc3d/asset_url` (CDN rewriting)
- `wc3d/config/before_save` and `wc3d/config/after_load`
- `wc3d/parser/scene`
- `wc3d/frontend/should_render` and `wc3d/frontend/viewer_position`
- `wc3d/model/uploaded`
- `wc3d/options/*`
- `wc3d/order/summary`
- `wc3d_ar_launch`

Module and editor slot APIs exist on the JS side.

**Other admin details:**
- **Onboarding:** there is no wizard. There are empty states, a "save the product first" hint, a video guide link, and the 3D Viewer Extensions page toggle. On activation the plugin auto-enables in 3D Viewer's Extensions page.
- **Capabilities:** shop managers can save settings. REST checks `edit_products`, `upload_files` and `manage_woocommerce` as appropriate.
- **Uploads:** MIME support for `.glb`, `.gltf` and `.usdz`, with magic-byte checks.

---

## Tech/performance/compatibility

### Requirements
- **WordPress 6.2+** (tested up to 7.0)
- **PHP 7.4+** (the main file guards on older PHP)
- **WooCommerce 7.0+** (tested to 10.9)
- **3D Viewer 1.8.0+** as the host for licensing

### Performance
- Lazy engine behind a poster.
- The frontend entry is about 12 KB; three.js and the viewer canvas are in lazy chunks; each module's JS and CSS loads only when needed.
- Locally served Draco, KTX2 and meshopt decoders.
- Mobile GPU and pixel-ratio controls.
- Shop pages are faster when many products have 3D (a transient caches the "has shop viewer" check).
- Gallery thumbnails are captured once per model.
- A persistent object cache group `wc3d` is used.

### Compatibility
- Block themes and classic themes.
- Blocksy fix (shop badge placement).
- Elementor widget.
- Page builders and widgets via the shortcode.
- Quick view and infinite scroll.
- Delay-JS optimizers (late jQuery).
- Signed or CDN URLs with query strings.
- Multisite uninstall.
- RTL CSS builds.

### Privacy
- The storefront makes **no third-party requests**: HDRI and QR code are local.
- External calls happen only on an admin click, for HDRI downloads or External URL checks.

### Accessibility
- Keyboard orbit, focus outlines and an ARIA live region.
- Reduced motion.
- Keyboard support in the AR QR dialog.
- Modal focus handling (`useModalDialog`).

### Security
- Nonces and REST permission checks.
- Shopper configs are sanitized to the merchant's customizable parts.
- Rate limits on uploads, design creation and AR files.
- Image re-encoding.
- `wp_safe_remote_*` for remote fetches.
- The licence-bypass constant works only on local/development environments.

### Internationalization
- `languages/wc-3d-model-viewer.pot`; JS strings are translatable.

### Tests
**PHPUnit** (the `tests/*.php` files plus `includes/Modules/*/tests`):
- GlbParser
- CartItemData
- EffectiveConfig
- Sanitizer
- Shortcode
- HdriLibrary
- Licensing
- module tests: Conditions, Pricing, Groups, Decals, Snapshots, Designs, ArFiles, UrlCheck, Report, and others

**Vitest** (`tests/unit`):
- resolveEffectiveConfig
- editorStore
- galleryLayout
- colorName
- hdriPresets
- moduleHost

**Playwright e2e** (`tests/e2e`):
- admin-dashboard
- admin-product-panel
- admin-settings
- configurator-cart
- customizer-drawer
- editor-save
- frontend-placements
- modules-settings
- multi-viewer
- rest-api
- shop-loop
- variations

Plus one e2e spec per module in `src/modules/*/e2e/`.

### Data storage
- 4 core tables: `wc3d_models`, `wc3d_product_configs`, `wc3d_variation_configs`, `wc3d_presets`.
- 1 module table: `wc3d_saved_designs`.
- Options: `wc3d_settings`, `wc3d_modules`.
- Product meta: `_wc3d_*`.
- Uploads: `uploads/wc3d/{snapshots,decals,designs,ar}` and `uploads/wc3d-hdri`.

---

## Tiers/licensing

- **There is no Free/Pro feature split inside the plugin.** `Plugin::boot()` loads either everything or nothing, based on `Licensing::is_unlocked()`.
- The plugin is unlocked when any of these is true:
  - **3D Viewer (bPlugins) on the `pro` or `max` plan** (`PARENT_PLANS`)
  - its own Freemius premium licence (`wc3d_fs()->can_use_premium_code()`; legacy, existing licences keep working)
  - the dev bypass constant, which works only on local and dev environments
- Positioning in code:
  - "it comes with the 3D Viewer Pro plan or higher"
  - Freemius pricing links go to 3D Viewer's pricing page
  - "No longer sold on its own"
  - the "Activate License" link is hidden from the Plugins screen
- When locked, the admin notice reads: "3D Product Configurator for WooCommerce is inactive: it comes with the 3D Viewer Pro plan or higher. → See 3D Viewer plans".
- The header has `Premium Host Only: true`, and the extension card shows `premium_host_only` when the plugin has no own licence.
- Module toggles are merchant on/off switches, **not** plan gates.

---

## File references (absolute)

Root: `/Users/raju/Local Sites/dev/app/public/wp-content/plugins/wc-3d-model-viewer-pro/`

**Main plugin files:**
- Main file: `wc-3d-model-viewer.php` (header, Freemius, BPEM registration, HPOS and blocks declaration, uninstall)
- `readme.txt` (changelog 1.0.0 → 1.1.0)
- Licensing: `includes/Licensing.php`, `includes/Extension.php`, `includes/Plugin.php`

**Settings and admin:**
- Settings: `includes/Settings/Options.php`, `templates/admin/settings.php`, `templates/admin/settings-hdri.php`, `includes/Data/Installer.php` (new-install defaults and tables)
- Product panel: `includes/Admin/ProductPanel.php`, `templates/admin/product-panel.php`, `includes/Domain/ProductMeta.php`

**Storefront and WooCommerce:**
- Cart and order: `includes/Frontend/CartItemData.php`, `includes/Domain/OptionLines.php`, `includes/Frontend/OrderPreview.php`, `includes/Frontend/ListingIcon.php`, `includes/Frontend/Render.php`, `includes/Frontend/Shortcode.php`
- Config inheritance: `includes/Domain/EffectiveConfig.php`, `src/shared/schema/resolveEffectiveConfig.ts`, `src/shared/schema/types.ts`

**Rendering and models:**
- HDRI: `includes/Domain/HdriLibrary.php`, `assets/hdri/`
- Decoders: `assets/decoders/{draco,basis}/`, `src/shared/engine/Decoders.ts`
- Parser: `includes/Parser/GlbParser.php`

**Editor:**
- `src/admin/editor/` (Inspector.tsx, components/*: SceneTree, MeshVisibilityEditor, MaterialEditor, EnvironmentPicker, CameraEditor, AnimationEditor, HotspotsEditor, ARSettings, OptimizationControls, PresetsManager, ImportExportControls, VariationsOverview/AutoMapAssistant, VariationModelSelector, VariationTabs)

**Storefront JS:**
- `src/frontend/` (Viewer.tsx, ar.ts, wc-bridge.ts, scan.ts, components/CustomizerDrawer.tsx, CustomizerOptions.tsx, ControlsStack.tsx, GalleryStrip.tsx, ArQrModal.tsx), `src/shared/engine/HotspotsViewer.tsx`

**Modules:**
- `includes/Modules/*/Module.php` and `README.md`, `src/modules/*/`, `includes/Modules/Registry.php`, `includes/Modules/AbstractModule.php`

**REST and tests:**
- REST: `includes/Rest/*.php`, plus module `RestController.php` / `*Controller.php`
- Tests: `tests/`, `tests/e2e/`, `tests/unit/`, `includes/Modules/*/tests/`, `src/modules/*/e2e/`

**Dist copy:**
- `wc-3d-model-viewer-pro/` (nested, the packaged build) and `wc-3d-model-viewer-pro.zip`
