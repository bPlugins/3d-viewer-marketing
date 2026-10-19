# 3D Viewer Premium 2.0.0 (bPlugins): viewer and block feature inventory

Plugin: `/Users/raju/Local Sites/dev/app/public/wp-content/plugins/3d-viewer-premium` (read-only audit, 17 Oct 2026).
Scope: Gutenberg blocks, the frontend viewer runtime (`src/blocks/3d-viewer/Components/Common`, `src/public`), utils/hooks/icons, the shortcodes, the Visual Editor, and release notes in `plan/` and `readme.txt`.
Admin settings, the WooCommerce meta box and Settings screens belong to the other agent. They appear here only where the viewer runtime touches them.

Legend: **[Pro]** = locked behind the licence in the block inspector (`isPremium` gate through `BInfoControl`/`BControlPro`). **[Free]** = no gate in the block. **(unverified)** = not proven in code or not tested in a browser.

> **Release timing matters for "new" copy.** `v1.10.0` shipped on 30 Sep / 1 Oct 2026. It is "the last shipped Stable tag" (`plan/RELEASE-GATE-REPORT-2026-10-10.md`, `plan/SUPPORT-PLAYBOOK-2.0.0.md`). 2.0.0 (release Tue 17 Nov 2026, before BFCM) is mostly an **admin-UI release**: "Gutenberg block, Elementor widgets, Visual Editor and every frontend bundle are not touched" (`plan/NEW-UI-2.0.0-PLAN.md` §0 and §2.1). Most of the big viewer features below shipped in **1.10.0**, two weeks before 2.0.0. Customers coming from 1.9.x (the large installed base) see all of them for the first time. Section 13 splits this out.

---

## 1. Blocks list

| Block | Name | Purpose | Registered at |
|---|---|---|---|
| **Model Viewer** (main) | `b3dviewer/modelviewer` | The full-featured viewer: Lite (model-viewer) or Advanced (Online3DViewer) engine, single or multiple models, hotspots, AR, lighting, dimensions, controls. Category `design`, keywords "3D Viewer", "3D Embedder", "3D Model Viewer". Supports align left/right/center. | `src/blocks/3d-viewer/block.json`, `inc/Addons/Blocks.php:83` |
| **Model Viewer Preset** | `b3dviewer/preset` | Inner block used on the Preset CPT to author reusable setting presets. The editor itself says: "Presets apply to WooCommerce products only. … Blocks, shortcodes and Elementor widgets don't use presets." Parent: `b3dviewer/block`. | `src/blocks/preset/*`, `inc/Addons/Blocks.php:84` |
| **3D Viewer** (simple, legacy) | `tdvb/td-viewer` | Minimal server-rendered `<model-viewer>`: Upload or Link source (GLB/GLTF), width, height, alignment (left/center/right), "Controls via mouse/touch", Zoom on/off, Loading Type (Auto/Lazy/Eager). Auto-rotate is always on. Category `media`. Ships prebuilt (no source in `src/`). | `3d-viewer-block/build/{block.json,render.php,index.js}`, `inc/Addons/Blocks.php:85` |

Also rendered by the same React `Viewer` component (not blocks): the `[3d_viewer]` shortcode (classic CPT), WooCommerce placements (product gallery, inline gallery, shop loop, popup, tab, product shortcode) and the Elementor widget (`src/public/elementor.tsx`, hook `frontend/element_ready/3dModelViewer.default`).

---

## 2. Main block (`b3dviewer/modelviewer`): settings tables

The inspector has two tabs, **Settings** and **Style**, plus an **Additional** panel below them. Source: `src/blocks/3d-viewer/Components/Backend/settings.tsx`. On a `bp3d-model-viewer` post there is also a **Copy Shortcode** button that copies `[3d_viewer id="N"]`. The sidebar stays hidden until a model URL exists. The canvas then shows an "Add Your 3D Model" placeholder with a URL field and upload (`Edit.tsx`).

### 2.1 Model panel (`Tabs/General/ModelForm.tsx`)

| Setting | Options / range | Notes |
|---|---|---|
| 3D Viewer (engine) | **Lite** (`modelViewer`): "Support only .glb, .glTF". **Advanced** (`O3DViewer`): "Support .obj, .3ds, .stl, .ply, .gltf, .off, .3dm, .fbx, .dae, .wrl, .3mf, .amf, .ifc, .brep, .step, .iges, .fcstd, and .bim" | `data.ts:modelViewers`. The Visual Editor offers Lite only. [Free] |
| Use Multiple Model? | toggle | [Pro]. Turns on a sortable repeater of models (Section 9). |
| Model URL | media library (3D types only) or a pasted URL, plus a **Cloud Storage** button when the companion plugin is installed and licensed | `ModelMediaControl.tsx`, `utils/modelMediaTypes.ts`. [Free] |
| Model Poster | image | Shown while loading, in both engines. Also the mobile image (Section 2.5). [Free] |
| Use Decoder | None / Draco | Lite only. With Draco a **Bin File** picker appears. **(unverified / cosmetic)**: the value only lands in a `data-decoder` attribute and `binFile` is never read by the runtime (`ModelViewer.tsx:267`). model-viewer 4.2.2 decodes Draco by itself, so Draco-compressed GLBs still work. |
| Add/Edit Hotspots button | — | Scrolls to the Hotspots panel. [Pro] |
| Set Current as Initial View / See Initial View / Remove Initial View | buttons under the canvas | Lite: saves the camera orbit, target and FOV per model (`ModelViewer.tsx:581-595`, `732-741`). [Pro] |
| Set Initial View / See Default View / Remove Default View | buttons under the canvas | Advanced viewer, single model only: saves the O3DV camera eye, center and up (`Basic3DViewer.tsx:220-245`). [Free] |

### 2.2 Lighting & Environment panel (single model; Lite only) (`LightingPanel.tsx`, `Lighting.tsx`)

| Setting | Options / range | Notes |
|---|---|---|
| HDR skybox image | image upload | [Pro]. Sets `skybox-image`. Hidden while "Use Environment as Skybox" is on. If the image fails to load (404 or CORS), the viewer drops it and still renders the model (`manageAttributes.ts:173-191`). |
| Skybox Height | text, e.g. `1.5m` | [Pro]. Appears when a skybox is set. Gives a grounded skybox (model-viewer `skybox-height`). |
| Environment Image | Neutral (default), Legacy, or a custom image URL | [Pro]. Lighting and reflections (`environment-image`). |
| Upload Environment Image | media button | [Pro]. Accepts HDR or JPG/PNG. `.hdr` is an allowed mime (`Utils::MODEL_MIME_TYPES`). |
| Use Environment as Skybox | toggle | [Pro]. Shown only for a custom environment image (changed in 2.0.0). |
| Exposure | 0.1 – 10, step 0.1, default 1 | [Pro] |
| Tone Mapping | Neutral (default), ACES, AgX | [Pro]. `data.ts:toneMappings`. |
| Enable Shadow | toggle, default on | In the Options panel. [Pro]. Sets `shadow-intensity=1`, `shadow-softness=1`. |

### 2.3 AR panel (single model; Lite only) (`AR.tsx`)

| Setting | Options | Notes |
|---|---|---|
| Enable AR | toggle | [Pro] in the block. The classic shortcode comment says "AR is a free feature, so it renders without a licence too" (`Shortcode.php:79`). |
| 3D Model (iOS) | USDZ file, media library or Cloud | [Pro]. Optional `ios-src` for Apple Quick Look. |
| AR Placement | Floor / Wall | [Pro] |
| AR Mode | WebXR / Scene Viewer / Quick Look | [Pro]. The chosen mode goes first and the other two follow as fallbacks (`ModelViewer.tsx:515`). |

AR runtime details are in Section 6.

### 2.4 Texture (Experimental) panel (single model, Lite, Pro only) (`Texture.tsx`, `utils/ModelReader.ts`)

| Setting | Options | Notes |
|---|---|---|
| Selected Material | every material in the GLB | Selecting one briefly "shakes" (highlights) it on the model. |
| Base Color › Factor | colour picker with reset | Tints the material. |
| Base Color › Available Textures | thumbnails of textures already inside the model, or none | Swap textures between materials. |
| Base Color › Upload a Texture | image upload with reset | Applies your own image as the base-colour map. |
| Metallic Roughness › Metallic factor | 0 – 1, step 0.01 | |
| Metallic Roughness › Roughness factor | 0 – 1, step 0.01 | |

Saved swaps (`appliedTextures`) are re-applied for visitors. The reader loads only when a swap exists (`ModelViewer.tsx:533`). Normal, emissive and occlusion channels are commented out (`data.ts`).

### 2.5 Options panel (Lite) (`Options.tsx`)

The panel shows only when the model extension is .glb/.gltf (query strings tolerated). Fullscreen is always shown.

| Setting | Options / range / default | Gate |
|---|---|---|
| Fullscreen | toggle, default on | Free |
| Mouse Control | toggle, default on (`camera-controls`: orbit, zoom, pan) | Free |
| Show Loading Percentage | toggle, default off. Shows a % overlay. | Free |
| Show Progressbar | toggle, default on | Free |
| Camera/Capture Button | toggle, default off. Downloads a PNG snapshot named after the model (2.0.0 improvement, `utils/captureFilename.ts`). | Free |
| Download Button | toggle, default off. Downloads the model file itself (fetched as a blob so cross-origin and signed links work) (`utils/downloadModelFile.ts`). | Free |
| Show Reset View Button | toggle. Returns to the initial view and rewinds auto-rotate. | Free |
| Zoom In/Out Button | toggle. Shown only when Mouse Control and Enable Zoom are on. | Free |
| Enable Shadow | toggle, default on | Pro |
| Autoplay (if animated) | toggle, default on | Pro |
| Enable Variant Selector | toggle. Frontend "Variant" dropdown (glTF `KHR_materials_variants`). | Pro |
| Enable Animation Selector | toggle. Frontend "Animations" dropdown. | Pro |
| Default Animation | lists the model's clips. Single model only. | (shown when selector on) |
| Lock Left-Right Rotation | toggle (theta fixed at 0deg) | Pro |
| Lock Up-Down Rotation | toggle (phi fixed at 90deg). Only one lock can apply; a notice warns when both are on. | Pro |
| Auto Rotate | toggle, default off | Pro |
| Rotation Delay (ms) | number, default 2000 | (when auto rotate on) |
| Rotate Per Second (deg) | number, default 20. Negative values reverse the direction (changelog 1.10.0). | (when auto rotate on) |
| Enable Zoom | toggle, default on | Pro |
| Initial Zoom | 0.5 – 10, step 0.1, default 1. Scales the model while the camera holds still (`manageAttributes.ts:226-253`). | Pro |
| Lazy Load | Auto / Lazy / Eager (model-viewer `loading`) | Free |
| Show Thumbnail List | toggle. Multiple models only. | Pro |
| Show Arrows | toggle. Multiple models only. | Pro |

Inline notices: "Autoplay is off…" when the animation selector is on and autoplay is off. "Turn off Auto Rotate while you set the initial view…".

Block-only gap: **Custom Angle** (`rotate`, `rotateAlongX/Y`) exists in the attributes and the shortcode (`bp_model_angle`) but has no control in the block. Elementor's controls were removed in 1.10.0 (saved values still apply).

### 2.6 Options panel (Advanced viewer, O3DV) (`O3DVOptions.tsx`)

| Setting | Options | Gate |
|---|---|---|
| Fullscreen | toggle | Free |
| Mouse Control | toggle | Free |
| Zoom | toggle | Pro |
| Zoom In/Out Button | toggle (when Zoom on) | Pro |
| Download Button | toggle (added to Advanced in 2.0.0, commit `aab3e81`) | Free |
| Show Edge | toggle. Draws a wireframe or edge outline. | Pro |
| Edge Color | colour | Free |
| Edge Threshold | 0 – 90 degrees. "Lower values show more edges; 0 outlines every triangle." | Free |
| Show Thumbnail List / Show Arrows | multiple models only | Pro |

The Advanced viewer has a built-in cube-map environment (6 bundled JPGs in `src/public/envmaps`), uses the block's background colour, shows the same spinner and poster while loading, and handles extension-less signed cloud URLs by passing the original file name (`Basic3DViewer.tsx:33-43`).

### 2.7 Mobile panel (`Mobile.tsx`; not in the Visual Editor)

| Setting | Options | Gate |
|---|---|---|
| On mobile devices | **Load the 3D model (default)** / **Show image — tap to load 3D** / **Show image only** | Pro |
| Tap button text | text, default "View in 3D" | Pro |
| Mobile breakpoint (px) | 320 – 1280, default 768. Touch-only devices are judged by their shorter edge, so a phone in landscape still counts (`hooks/useIsMobile.ts`). | Pro |
| Reduce motion on mobile | toggle. Turns off autoplay and auto-rotate on phones **and** for any visitor whose OS asks for reduced motion. Lite only. | Pro |

The mobile image needs a poster. It loads eagerly with `fetchpriority=high`, which helps LCP. Gallery arrows keep working on the image.

### 2.8 Controls panel (`Controls.tsx`, `components/ControlPlacement/*`, `utils/controls.ts`)

| Setting | Options | Gate |
|---|---|---|
| Control labels | Off (default) / Tooltip on hover and focus / Inline text | Pro |
| Per-control position (classic mode) | Top left / Top right / Bottom left / Bottom right, for each of Zoom, Fullscreen, Capture image, Download model, Reset view, Dimensions, View in AR | Pro |
| **Drag-and-drop placement widget** (zones mode) | Drag icons onto **8 zones** (4 corners plus top/bottom/left/right centre). Sets order within a zone and toggles each control on or off from the tray. | Opt-in site-wide switch: Settings › Control Placement. Gutenberg only; Elementor gets 8-position selects. |
| Label text | your own wording for each control (Zoom in, Zoom out, Fullscreen, Capture, Download, Reset, Dimensions, View in AR). Empty follows the site language. | Pro |

The fullscreen Close button always stays top right. Style tab geometry (Section 2.11) adds Control Size, Spacing and Edge Offset.

### 2.9 Dimensions panel (Lite) (`Dimensions.tsx`, `Common/Dimensions.tsx`, `utils/dimensions.ts`)

| Setting | Options | Gate |
|---|---|---|
| Show dimensions | Off / With a ruler button / Always on | Pro |
| Unit | mm, cm, m, in, ft | Pro |
| Line colour | colour (lines, corner dots, labels) | Free |
| Measured from the file | read-out of W × H × D measured from the model | info |
| Real size (optional) Width / Height / Depth | numbers. Fill one axis and the others scale to match. Changes labels only, never the model or its AR size. Per model in multiple mode. | Pro |

The overlay draws width, height and depth lines on the bounding box as live 3D hotspots and hides edges that face away from the camera.

### 2.10 Hotspots/Annotations panel (Lite) (`Hotspots.tsx`, `hotspots/*`)

| Setting | Options | Gate |
|---|---|---|
| Default Style | Simple Tag (Text Only) / Always Visible Card / Hover Popup Card / Minimal Icon Badge | Pro |
| Pin Size (px) | 16 – 64, default 28 | Pro |
| Pin Icon Color | colour, default `#15171a` | Free |
| Pin Background | colour, default `#ffffff` | Free |
| Add Hotspot | click, then click the model to drop a pin (captures position, surface normal, camera orbit, target and FOV) | Pro |
| Hotspot list | sortable repeater | — |
| Per hotspot: Name, Type, Display, Pin Icon, Pin Image, Description, type fields, Edit Manually (Position / Normal / Camera Orbit / Camera Target / FOV, each with a copy button) | see Section 5 | — |

### 2.11 Style tab (`Tabs/Style/Style.tsx`)

| Setting | Options | Gate |
|---|---|---|
| Width | per device (desktop / tablet / mobile), px or %, default 100% | Free. Hidden in a WooCommerce context. |
| Height | per device, px / % / vh, defaults 400 / 300 / 300 px | Free |
| Thumb Size | px, default 90px. Chips shrink inside small viewers. | Free |
| Control Size (px) | 24 – 64, default 35 | Pro |
| Control Spacing (px) | 0 – 40, default 10 | Pro |
| Control Edge Offset (px) | 0 – 60, default 10 | Pro |
| Background Color | colour (transparent by default) | Free |
| Background Image | image, cover-fit, behind the model (Lite) | Pro |
| ProgressBar Color | colour (when progress bar on) | Free |

Responsive breakpoints are 1024 px (tablet) and 640 px (mobile). Elementor passes its own (`Common/Style.tsx`).

### 2.12 Additional panel (`Tabs/Style/Additional.tsx`)

| Setting | Notes | Gate |
|---|---|---|
| ID | wrapper HTML id | Pro |
| Class | wrapper classes | Free |
| CSS | full CSS rules with selectors, injected after the generated styles | Pro |

---

## 3. Preset block (`b3dviewer/preset`): settings

Tabs Settings / Style (`src/blocks/preset/Options.tsx`, `Style.tsx`, `O3DVOptions.tsx`).
- **Options (Lite Viewer):** Fullscreen, Camera/Capture Button, Reset View Button, Zoom In/Out Button, Mouse Control, Loading Percentage, Progressbar. [Pro] adds Shadow, Autoplay, Variant Selector, Animation Selector, Lock Left-Right, Lock Up-Down, Auto Rotate (+ Rotate Per Second), Enable Zoom, Thumbnail List, Arrows and Hotspot Style. Lazy Load is Auto, Lazy or Eager.
- **O3DV options** and a **Style** tab (width, height, background, progress bar colour, thumb size; per `preset/block.json` defaults).
- Applies to **WooCommerce products only**.

---

## 4. Supported formats and renderers

| Engine | Library | Formats | Source |
|---|---|---|---|
| **Lite viewer** (default) | Google `<model-viewer>` **4.2.2** (`public/js/model-viewer.latest.min.js`; version cited in `manageAttributes.ts:291`) | **.glb, .gltf** (+ Draco/meshopt/KTX2 handled inside model-viewer), USDZ for iOS AR | `data.ts:modelViewers` |
| **Advanced viewer** | **Online3DViewer** (kovacsv, MIT) `public/js/o3dv.min.js`, bundling Three.js r163 (readme) | .obj, .3ds, .stl, .ply, .gltf/.glb, .off, .3dm, .fbx, .dae, .wrl, .3mf, .amf, .ifc, .brep, .step, .iges, .fcstd, .bim | `data.ts`, readme "Supported 3D File Formats" |

Upload allow-list (`inc/Helper/Utils.php` `MODEL_MIME_TYPES`): glb, gltf, obj, 3ds, step, stp, stl, fbx, 3dm, 3dml, dae, wrl, 3mf, ply, off, amf, ifc, brep, brp, iges, igs, fcstd, bim, mtl, hdr, usdz.
On by default: glb, gltf, obj, 3ds, step, stl, fbx, 3dml, dae, wrl, 3mf, mtl, hdr, usdz. 2.0.0 added "Ten more 3D file types in Allowed Mime Types, unticked by default".
- Model pickers accept 3D files only (2.0.0).
- Files with a 3D extension but script or HTML content are rejected on upload (2.0.0, `ExtendMimeType.php:102-169`).
- Readme: "PLY, OFF, 3DM, AMF, IFC, BREP, IGES, FCSTD and BIM load from an external URL only", because they are off by default.

Marketing count: about **20 file formats** in the Advanced viewer.

The readme FAQ (`readme.txt:276-284`) is **stale and contradicts the product**. It says "only .glb/.gltf" and "fbx: No". Fix it before using the readme as copy.

**Legacy-materials fix:** the editor detects Specular-Glossiness GLBs, which render white (`utils/specGloss/detect.ts`), and shows a notice. A one-click converter to metal/rough runs in a Web Worker under Help & Demos › Tools (`specGloss/convert.ts`).
**Cloud links:** Google Drive links without a file name warn that the Advanced viewer cannot read them (`utils/cloud/advancedViewer.ts`).

---

## 5. Hotspots / annotations

Lite viewer only. Source: `src/blocks/3d-viewer/hotspots/*`, `Common/Hotspots.tsx`.

**Placement:** "Add Hotspot", then click the model. Each pin stores its 3D position and surface normal, plus the camera orbit, target and FOV at that moment. The Visual Editor, the Elementor canvas (1.10.0) and the meta-box preview can place them too. Values can be edited by hand and copied. The list can be reordered.

**7 hotspot types** (`registry.ts`):

| Type | What the click does | Card content | Fields |
|---|---|---|---|
| Info | Flies the camera to the saved view | title + description | — |
| Link | Opens a URL (same or new tab) | title, description, link button | Link URL, Link Button Text, Open in new tab. Schemes: http, https, mailto, tel, sms, **whatsapp, viber, skype** (`utils/safeHref.ts`) |
| Image | Shows the image card | image + caption | Image (media / URL / Cloud), Alt text |
| Waypoint | Flies the camera only; no card in any style | — | — |
| Animation | Plays a named glTF clip: **Once / Loop until clicked again / Back-and-forth (ping-pong)**. A second click pauses. "Once" hands the model back to its previous state. The pin turns from Play into Pause. | — | Animation Name (picked from the model's clips), Repeat |
| Video | Opens a card with the player. Nothing loads until it is opened. | YouTube (privacy-enhanced **youtube-nocookie**), Vimeo, or direct MP4/WebM/OGG | Video URL |
| Product (WooCommerce) | Opens a live product card fetched from the Store API on open | product image (srcset), name, price with the **sale price struck through**, out-of-stock note, **AJAX Add to cart** or View product, plus a secondary View product link | Product search (combobox, `/bp3d/v1/products`) |

**Display per hotspot** (`display.ts`): Use viewer setting / Always visible / Tooltip on hover / **Popup** (a full-page modal with a close button; not for Link, Animation or Waypoint) / Pin only.
**Pin Icon per hotspot:** Text (name), Info, Plus, Dot, **Number** (auto-numbered walkthroughs), Link, Play, Cart, Question, **Custom image** (your logo). Pin size and colours are global (Section 2.10).
**Default Style (4 presets):** Simple Tag, Always Visible Card, Hover Popup Card, Minimal Icon Badge.

**Card UX:**
- Tooltip cards sit centred above the pin with a pointer. They flip below when there is no room, slide sideways to stay inside the viewer, and widen from 240 px to 350 px instead of scrolling (`fitCards.ts`).
- One card is open at a time. Escape, a click on the model, or starting AR closes it, and focus returns to the pin.
- The card animation respects reduced-motion.
- A broken hotspot falls back to a plain card (`HotspotBoundary.tsx`).
- Hotspot clicks are counted in Analytics.

---

## 6. AR (augmented reality)

Lite viewer. Source: `ModelViewer.tsx:507-530`, `Common/ARQRCode.tsx`.
- **Modes:** WebXR (Android Chrome), Scene Viewer (Android), Quick Look (iOS). The preferred mode goes first and the other two follow as fallbacks.
- **iOS:** optional USDZ (`ios-src`). Without one, model-viewer can generate USDZ for Quick Look on its own **(engine capability, not tested in this audit)**.
- **Placement:** floor or wall.
- **Desktop to phone handoff:** on a device that can't do AR, the AR button opens a **QR code dialog** centred over the model. The QR encodes the page URL plus `?bp3d-action=view-ar`. On the phone, the viewer tries to launch AR automatically once the model loads (`ARQRCode.tsx:42-49`). Whether browsers allow AR without a tap is **(unverified)**. The dialog is modal: Escape closes it and focus stays inside.
- **Per model** in multiple-model mode (AR toggle, USDZ, placement, mode).
- **Analytics:** QR shown, AR launch by platform, AR placed (`utils/analytics/Tracker.ts:4-5`).
- `arScale` exists in the defaults but is **not applied** (commented out).

---

## 7. Camera and interaction

| Feature | Detail | Source |
|---|---|---|
| Orbit / zoom / pan | model-viewer `camera-controls` (mouse, touch, keyboard). Toggled by Mouse Control. | `manageAttributes.ts:122` |
| Interaction prompt | Always off (`interaction-prompt="none"`), so there is no idle wiggle (fixed in 1.9.3) | `ModelViewer.tsx:267` |
| Initial view | Saved camera orbit, target and FOV per model. Each model in a gallery starts from its own view. | `utils/setView.ts` |
| Custom angle | `rotate` + X/Y degrees → `camera-orbit` (shortcode and meta box only) | `manageAttributes.ts:208-210` |
| Auto-rotate | delay (ms) and speed (deg/s, negative reverses) | `manageAttributes.ts:193-203` |
| Rotation locks | lock horizontal OR vertical orbit | `manageAttributes.ts:147-160` |
| Zoom | enable/disable, plus an Initial Zoom scale (0.5–10×) | |
| Zoom in/out buttons | Lite: `zoom(±2)`. Advanced: synthetic wheel events. | `Viewer.tsx:179-212` |
| Reset view | back to the initial view, rewinds the turntable | `Viewer.tsx:215` |
| Fullscreen | native Fullscreen API with webkit/ms prefixes, a CSS fallback with Escape, focus management, Close fixed top right, **Exit fullscreen button (new 2.0.0)**. iPhone fullscreen fixed in 2.0.0. | `utils/openFullscreen.ts` |
| Capture (screenshot) | PNG via `toDataURL()`, named after the model | `Viewer.tsx:249` |
| Download model | the original file, fetched as a blob | `utils/downloadModelFile.ts` |
| Hotspot camera fly-to | Info and Waypoint pins move the camera to the saved view | `hotspots/activate.ts:flyTo` |

**Not present** (do not market): field-of-view or zoom min/max limits, an author-set orbit limit range, animation speed or time scale, disable-pan, an interaction prompt option. Grep for `timeScale`, `min-field-of-view`, `disable-pan`: 0 hits.

---

## 8. Lighting and environment

Environment presets: Neutral, Legacy, Custom image (HDR/JPG). HDR skybox with grounded **Skybox Height**. Use Environment as Skybox. Exposure 0.1–10. Tone mapping Neutral / ACES / AgX. Soft ground shadow. Background colour or background image. All **per model** in multiple-model mode (skybox, skybox height, environment, use-as-skybox, exposure, tone mapping: `ModelForm.tsx:ItemSettings`, `ShortcodePro.php:buildModelsArray`). A failed skybox load is ignored rather than blanking the viewer. The Advanced viewer uses a fixed bundled cube-map environment.

---

## 9. Animation

- Autoplay the embedded glTF animation, on by default (Pro toggle).
- **Default Animation**: choose which clip plays first (single model).
- **Animations dropdown on the frontend**: visitors pick a clip, which then loops. "Default" restores the model's own clip.
- **Animation hotspots**: once, loop or ping-pong, with a play/pause toggle (Section 5).
- Autoplay and auto-rotate are suppressed by "Reduce motion on mobile" and by the OS reduced-motion setting when that toggle is on.
- No playback-speed control, and no general play/pause button outside hotspots.

---

## 10. Variants, materials and colour switching

- **Variant Selector**: a frontend "Variant" dropdown driven by the model's glTF `KHR_materials_variants` (`ModelViewer.tsx:477-479`, `689-693`). Colourways or finishes come from one file.
- **Texture editor (experimental)**: change base colour, swap or upload base-colour textures, adjust metallic and roughness per material (Section 2.4). It saves and replays for visitors.
- **WooCommerce variation → model**: with multiple models on a variable product, choosing a variation (colour, size and so on) switches the 3D model. Matching works per attribute, with "All" as a wildcard and a default model before any choice (`hooks/useVariations.ts`, `utils/getModelBasedOnVariants.ts`). Admin side belongs to the other agent.
- A separate extension, **"3D Product Configurator for WooCommerce"** (`public/extensions.json`), offers per-variation model customisation (not in this plugin).

---

## 11. Gallery / multiple models

Pro "Use Multiple Model?" adds a sortable repeater. Each item has its own Model URL, Poster, Decoder, Lighting & environment, AR, Real size, Hotspots and Initial view.

Frontend:
- **Thumbnail strip** (`ModelPagination.tsx`): poster thumbnails, or **numbered 3D chips** for models without a poster (2.0.0). A scrollbar appears for long lists (2.0.0). Chips shrink with small viewers.
- **Prev/next arrows** (`SliderControllder.tsx`).
- WooCommerce: `modelThumbs` row under the viewer.
- Taps on thumbnails during WebXR are ignored so they don't count as AR selects.
- Thumb Size is configurable.

---

## 12. Shortcodes (`inc/Shortcode/Shortcode.php`, `ShortcodePro.php`)

| Shortcode | Attributes actually used | Notes |
|---|---|---|
| `[3d_viewer id="N"]` | **`id` only** | `id` = a 3D Viewer post (or a product). Accepted but **ignored**: `src`, `alt`, `width`, `height`, `auto_rotate`, `camera_controls`, `zooming_3d`, `loading`, `poster` (declared in `shortcode_atts`, never read). Block-built viewer posts render the saved block. Classic posts render from meta (all settings of the meta box, including multiple models, hotspots, AR, skybox, real size, mobile, dimensions, controls, pins and the loader). Since 2.0.0, drafts, private, password-protected and trashed viewers don't render for visitors (`isViewable`). Without a licence, multiple-model viewers show the first model. |
| `[3d_viewer_product id="" width="100%" late_initialize="false"]` | effectively none | Renders the current product's 3D model (`Product::get_3d_model_html(true,'shortcode')`). `id`, `width` and `late_initialize` are parsed, but only the post-type check uses `id`; rendering uses the current product. **(unverified)**: whether it works for a product other than the current one. |

Filters for developers: `bp3d_classic_model_attribute`, `bp3d_gutenberg_model_attribute`.

---

## 13. Visual Editor

Location: **3D Viewer › Visual Editor** admin page (`inc/admin.php:110-120`, `360`). Source: `src/admin/visual-editor/VisualEditor.tsx`, which is a standalone block editor that hosts the Model Viewer block with `placement: "visual-editor"` and `isPremium: true`.

What users can do (page text: "Load a model, then click it to place hotspots or frame a camera angle and copy the values into your viewer. Nothing here is saved."):
- Load a GLB/GLTF (Lite only) from the media library, a URL or Cloud.
- Click the model to drop hotspots. Each shows its **Position, Normal, Camera Orbit, Camera Target and FOV** as fields with **copy buttons**.
- Orbit to an angle and press **Copy Current/Initial View**, which copies JSON to paste into the classic meta box or WooCommerce (`ModelViewer.tsx:714-730`).
- Try lighting, environment, AR, options, dimensions and texture settings on the live model.
- Hidden there: multiple models, Mobile, Controls, Style and Additional panels.
- Linked from the classic meta box, the WooCommerce product box and Elementor ("Open Visual Editor").

In marketing terms it is a **point-and-click hotspot and camera tool for the classic editor and WooCommerce**, not a page builder.

---

## 14. What's new

### 14a. New in 2.0.0 (release 17 Nov 2026; from `readme.txt` `= 2.0.0 =` and `plan/NEW-UI-2.0.0-PLAN.md`)
Mostly admin (covered by the other agent):
- new card-based admin interface with a one-click switch back to Classic
- full-page viewer editor with a resizable live preview
- AJAX save
- one "3D Source" field (upload or URL)
- redesigned Help & Demos with licence activation and Extensions
- redesigned Analytics page
- viewer list with preview and grid view
- Spanish for the new UI
- WCAG AA contrast

Viewer and block-side items in 2.0.0:
- **Exit fullscreen button**; iPhone fullscreen no longer hides bottom controls.
- **Capture saves the image under the model's name.**
- **Thumbnail list shows numbered chips** for poster-less models, plus a scrollbar for long lists.
- **Download button on the Advanced viewer** (commit `aab3e81`).
- **AR works on the no-licence classic shortcode** (commit `aab3e81`; `Shortcode.php:78-85`).
- Model pickers accept only 3D files. Disguised script files are rejected on upload. Ten more 3D formats are available in Allowed Mime Types.
- Draft, private and password-protected viewers are hidden from visitors.
- Use Environment as Skybox shows only with a custom image.
- WooCommerce theme-compatibility fixes (Storefront, Kadence, OceanWP, Blocksy, GeneratePress, Hello Elementor).
- Viewers each get their own HTML id. Custom CSS with `>` and `&` now works. Background images whose URL contains spaces now load.

### 14b. New since 1.9.x, shipped in 1.10.0 (1 Oct 2026). Effectively "new" for most customers and strong headline material
- **7 hotspot types:** Info, Link, Image, Waypoint, Video, Product (WooCommerce add-to-cart), Animation.
- Per-hotspot Display (incl. full-page popup) and Pin Icon (incl. Number and Custom image). Pin size and colours. Redesigned tooltip cards. Place hotspots by clicking in Elementor.
- **Real-world dimensions / ruler** (mm/cm/m/in/ft, real-size override, WooCommerce product dimensions).
- **Mobile Image mode** (tap-to-load or image-only), **Reduce Motion on Mobile**, **custom loading spinner**.
- **Control labels** (tooltip or inline), **control positions** (4 corners, or the 8-zone drag-and-drop widget), control size, spacing and offset.
- **Download Button.**
- **3D Analytics:** views, interaction rate, time in 3D, AR launches by platform, hotspot clicks, add-to-cart. GA4 forwarding. Cookieless, respects GPC/DNT.
- **Cloud Storage picker:** S3, R2, Spaces, Wasabi, B2, Bunny, Google Drive, Dropbox via the companion plugin, served from signed URLs.
- **Edge Threshold** for the Advanced viewer (Show Edges itself came in 1.9.4).
- **Spec/Gloss legacy-material converter.**
- Accessibility overhaul: real buttons, accessible names, focus rings, Escape handling, labelled selectors, model name as alt text.
- Per-device width and height in Elementor and the meta box.
- Elementor parity: hotspots, initial view, lighting.
- Zoom Level and Shadow regressions fixed.

### 14c. Earlier but recent
- 1.9.3: Link hotspots, the glassmorphic card, the error-boundary fallback, cache-plugin-safe init.
- 1.9.2: Live Preview metabox, Elementor parity, AR in Elementor.
- 1.9.1: WooCommerce "Dedicated Tab" position, texture panel updates.

### 14d. Planned only: do **not** market as shipped
- Exploded view (F4: "not started", `plan/VIEWER-UX-SPRINT-PLAN.md:5`; no code).
- AI 3D generation ("approved… Not started", `AI-GENERATION-PLAN.md:6`).
- Model optimizer/compression (draft, `MODEL-OPTIMIZATION-PLAN.md:6`).
- Viewer access restriction by role (parked).
- Woo auto-thumbnails (draft).
- Thumb size/position (target 2.1.0).
- Dokan module (draft).
- Hotspot edit modal (draft).

---

## 15. Tech and performance

- **Engines:** Google model-viewer 4.2.2 (WebGL/three.js, Lit), and Online3DViewer with three.js r163 for CAD and other formats. Each page loads only the engine it needs (`render.php:7-11`, `Shortcode.php:149-153`).
- **Rendering:** React islands (`view.js` for blocks, `frontend.js` for shortcode, WooCommerce and Elementor) that mount on `.modelViewerBlock`.
  - Cache and defer-plugin safe: it initialises even if DOMContentLoaded has already fired (`frontend.tsx:73-78`).
  - **Two fallback layers:** an error boundary renders a bare `<model-viewer>`, and a server-rendered backup `<model-viewer>` appears after 5 s if React never mounts (`render.php:32-54`).
- **Loading:**
  - lazy/eager/auto
  - poster
  - progress bar (colourable) or % counter
  - custom global spinner (image, size, background), shared by both engines
  - mobile poster-only mode
  - signed cloud URLs resolved in the editor
  - texture reader loads only when needed
  - video and product cards fetch nothing until opened
- **Responsive:** per-device width and height; container-query thumbnail sizing; touch-aware mobile detection.
- **Accessibility:**
  - all controls are buttons with accessible names (translatable, server-provided)
  - three label modes
  - focus management in fullscreen, the QR dialog and hotspot cards
  - Escape closes overlays
  - `aria-pressed` on toggles
  - reduced-motion support
  - `fetchpriority` on the mobile image
- **Security:**
  - URL allow-lists for links and media (`safeHref`)
  - video embeds rebuilt from parsed IDs (the author's URL never reaches an iframe)
  - hotspots sanitised server-side (`Utils::sanitizeHotspots`)
  - upload content sniffing
  - private and draft viewers hidden
- **Analytics:** batched beacons; GA4/dataLayer events prefixed `bp3d_`; Do-Not-Track/GPC respected; skipped inside the Elementor editor (`hooks/useViewerAnalytics.ts`, `utils/analytics/Tracker.ts`).
- **Integrations:**
  - Gutenberg (3 blocks)
  - Elementor (widgets "3D Model Viewer" and "3D Product Model", per the changelog)
  - classic shortcode
  - WooCommerce placements: product-gallery, product-gallery-inline, shop-loop-item, popup, woocommerce-tab, shortcode (`frontend.tsx:51-67`)
  - Freemius licensing
- **Tests:** about 33 Playwright e2e specs (a11y, hotspots, dimensions, mobile-image, loader, zoom-level, woo-theme-compat, AR-adjacent and more) and 28 unit test files (`tests/e2e`, `tests/unit`). Requires WP 6.5+ and PHP 7.4+, tested up to WP 7.1.

---

## 16. File references for key claims

| Claim | File(s) |
|---|---|
| Block attributes and defaults | `src/blocks/3d-viewer/block.json`, `src/blocks/3d-viewer/types.ts` |
| Engines and format list | `src/blocks/3d-viewer/data.ts`; `inc/Helper/Utils.php` (MODEL_MIME_TYPES, DEFAULT_MIME_TYPES) |
| Inspector panels | `src/blocks/3d-viewer/Components/Backend/settings.tsx`, `Tabs/General/*.tsx`, `Tabs/Style/*.tsx` |
| Runtime attribute mapping (shadow, zoom, locks, skybox, exposure, tone mapping, loading) | `src/public/manageAttributes.ts` |
| Controls bar, fullscreen, capture, download, reset, zoom | `src/blocks/3d-viewer/Components/Common/Viewer.tsx`, `src/utils/openFullscreen.ts`, `downloadModelFile.ts`, `captureFilename.ts` |
| AR and QR | `Components/Common/ModelViewer.tsx:507-530`, `Components/Common/ARQRCode.tsx` |
| Hotspot types, display, pins | `src/blocks/3d-viewer/hotspots/registry.ts`, `types/*.tsx`, `display.ts`, `pinIcons.tsx`, `editor/typeFields.tsx`, `activate.ts`, `embeds.ts` |
| Variants and animation selectors | `Components/Common/ModelViewer.tsx:477-500`, `686-705` |
| Texture editor | `Tabs/General/Texture.tsx`, `src/utils/ModelReader.ts` |
| Dimensions | `Tabs/General/Dimensions.tsx`, `Components/Common/Dimensions.tsx`, `src/utils/dimensions.ts` |
| Mobile image and reduce motion | `Tabs/General/Mobile.tsx`, `Components/Common/MobileImage.tsx`, `hooks/useIsMobile.ts`, `hooks/useReducedMotion.ts` |
| Control labels and placement | `Tabs/General/Controls.tsx`, `src/components/ControlPlacement/*`, `src/utils/controls.ts` |
| Advanced viewer (O3DV) | `Components/Common/Basic3DViewer.tsx`, `Tabs/General/O3DVOptions.tsx` |
| Gallery | `Components/Common/ModelPagination.tsx`, `SliderControllder.tsx`, `Tabs/General/ModelForm.tsx:ItemSettings` |
| Shortcodes | `inc/Shortcode/Shortcode.php`, `inc/Shortcode/ShortcodePro.php` |
| Visual Editor | `src/admin/visual-editor/VisualEditor.tsx`, `inc/admin.php:110-120,350-362` |
| Preset block | `src/blocks/preset/*` |
| Simple block | `3d-viewer-block/build/block.json`, `render.php` |
| Analytics events | `src/utils/analytics/Tracker.ts:4-5,44`, `src/hooks/useViewerAnalytics.ts` |
| Cloud storage | `src/utils/cloud/*`, `src/components/ModelMediaControl.tsx`, `public/extensions.json` |
| Spec/Gloss converter | `src/utils/specGloss/*` |
| Release notes | `readme.txt:303-506`, `plan/NEW-UI-2.0.0-PLAN.md`, `plan/SUPPORT-PLAYBOOK-2.0.0.md`, `plan/RELEASE-GATE-1.10.0.md`, `plan/done/*.md`, `plan/VIEWER-UX-SPRINT-PLAN.md` |

## 17. Uncertain or flagged items
1. The Draco decoder select and Bin File are stored but not used by the runtime. Draco still works through model-viewer.
2. `[3d_viewer]` declares 9 attributes it ignores. Only `id` works.
3. `[3d_viewer_product]` ignores `id`, `width` and `late_initialize` for rendering (unverified).
4. AR auto-launch from the QR deep link may need a user tap on some browsers (unverified).
5. USDZ auto-generation for Quick Look is a model-viewer capability, not tested here.
6. The readme FAQ contradicts the format support. The readme "Pro Features" list is dated: it doesn't mention hotspots, AR, analytics, dimensions and similar features.
7. In the block, AR is Pro-gated. In the no-licence classic shortcode, AR renders free. The free/pro positioning for AR is inconsistent.
8. The 2.0.0 date (17 Nov 2026) and the 1.10.0 ship date come from plan docs; the git tags exist (`v1.10.0`, `v2.0.0`).
