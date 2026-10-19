# 3D Viewer Pro: Tutorial Series Plan

**Brand:** bPlugins · **Drafted:** 17 Oct 2026 · **Sources:** [research/01-free.md](research/01-free.md), [research/02-premium-viewer.md](research/02-premium-viewer.md), [research/03-premium-admin-woo.md](research/03-premium-admin-woo.md), [MARKETING-FEATURES.md](MARKETING-FEATURES.md), and the existing `3d-viewer-premium/docs/VIDEO_SCRIPTS.md`.

> **Update, 17 Oct 2026:** the finished tutorials are in [tutorials/](tutorials/README.md). They use the **Modern** viewer editor as the main screen instead of the Gutenberg block, and they are grouped as 31 tutorials. The Gutenberg block and Elementor have their own tutorials, 27 and 28. Where this plan and the tutorials differ, follow the tutorials.

**At a glance:** 33 episodes in 7 modules, about 2 h 20 min in total. Every episode shows the **free options first**, then the **Pro options** for the same topic. Every option in the block, classic editor, Elementor widget, WooCommerce product box and Settings screen is assigned to an episode. Section 6 is the coverage check.

---

## 1. How every episode is built

| Part | Length | What happens |
|---|---|---|
| Hook | 5–10 s | The finished result on the front end, before any admin screen. |
| **FREE** | most of the episode | Recorded on the **free plugin site**. A green "FREE" badge stays in the corner. Every free option for the topic, in the order it appears in the panel. |
| Divider card | 2–3 s | "Pro adds:" plus the Pro options about to be shown. |
| **PRO** | the rest | Recorded on the **Pro site**, with the licence active. An orange "PRO" badge stays in the corner. Every Pro option for the topic. |
| Recap and next | 10 s | One line per option group. End card with the next episode and one "Try Pro free for 7 days" link. |

- **Pro-only topics** such as hotspots or analytics still open with a FREE part. It is short, 20 seconds at most. It shows what a free user sees there, such as the locked notice, or the free way to get close, like pasting a public URL instead of using cloud storage.
- **YouTube chapters** mark the start of the FREE and PRO parts, so viewers can jump straight to either one.
- **Title pattern:** "3D Viewer for WordPress #07: Lighting, environment and skybox (Free + Pro)".

### Why two demo sites
The Pro block shows some free features as Pro: AR, environment image, skybox, exposure and shadow. The free plugin gives them away (`research/02` §2.2–2.3, `research/01` §3a). If everything were recorded on the Pro site, the FREE and PRO labels would follow the Pro block, and they would be wrong for free users. So:

- **Site A:** WordPress, **3D Viewer (free) 2.0.0**, WooCommerce, Elementor.
- **Site B:** the same content with **3D Viewer Pro 2.0.0**, licensed, plus the Cloud Storage companion plugin.

Both sites use the same models, pages and products, so the cut from FREE to PRO looks continuous. The automated pipeline in the Configurator repo can build both from one blueprint. It uses Playwright, WP Playground, ElevenLabs and ffmpeg, and lives in `scratch/tutorial-series/`.

### Main editor
Options are shown in the **Gutenberg "3D Model Viewer" block**, which is the most complete surface. The classic shortcode generator and Elementor each get their own episode, 29 and 30, which cover where the same options live and the few options only they have. Every episode ends with one "other editors" line, the same convention as `VIDEO_SCRIPTS.md`.

### Version
Record on **2.0.0**, the new card-based admin, which releases on Tue 17 Nov 2026. Videos recorded on 1.10.0 would show an outdated admin within a month.

### Props
Reuse the fixed prop set from `VIDEO_SCRIPTS.md`: `chair.glb` with one animation, `chair.usdz`, `sneaker.glb`, `lamp.glb`, `bracket.stl`, `studio.hdr` and `chair-poster.jpg`. Add the following:
- a GLB with glTF material variants, for episode 14
- an animated GLB with two or more clips, for episodes 14 and 17
- a Spec/Gloss legacy GLB, for episode 32
- a variable product with three colors, each with its own GLB, for episode 25

---

## 2. Episode list

Minutes are estimates. **F** = free part, **P** = Pro part.

### Module A · Getting started (≈19 min)

**01 · Welcome: what 3D Viewer does (1.5 min)**
- F: Front-end tour of rotate, zoom, fullscreen, AR with the desktop QR code, and an STL file in the Advanced viewer.
- P: Front-end tour of hotspots, the ruler, a gallery and analytics. One sentence: the Configurator is included with Pro.

**02 · Install, Guided Setup and activate Pro (4 min)**
- F: Install from wordpress.org. Guided Setup in 3 steps: Model with the 2-minute video, Customize with feature tiles, and Publish, where you choose Gutenberg, Elementor or Shortcode. Help & Demos has six areas: Welcome, Demos with 17 live demos and search, Feature Comparison, Pricing, Extensions and Our Plugins. Then the admin interface switch between Modern and Classic, and the "New to 3D Viewer?" notice.
- P: Install the Pro zip. The free plugin deactivates itself, and the data is kept. The licence activation screen shows state, plan, masked key, expiry, activations and the sync and deactivate buttons. Then the 7-day trial with no card, the new menu items (Presets, Visual Editor, Analytics, Cloud Storage), and the Extensions screen. Downgrade-safe: Pro data survives a move back to free.

**03 · Your first viewer: block, simple block and shortcode (5 min)**
- F: The "3D Model Viewer" block, from the empty state to pasting a URL or uploading, plus Copy Shortcode. The simple "3D Viewer" block with Model Source (Upload or Link), Width, Height, 3D Model Alignment, Controls via mouse/touch, Zoom and Loading Type, and auto-rotate always on. Then 3D Viewer › Add New, Live Preview with Desktop, Tablet and Mobile, expand, reset, zoom, fullscreen and refresh, the list screen with the shortcode copy chip, and Quick Edit. Draft and private viewers are hidden from visitors.
- P: Duplicate a viewer, list and grid view with previews, AJAX save and the unsaved-changes warning. *(Gate to confirm: see section 5.)*

**04 · Model sources, formats and the two viewers (5 min)**
- F: Lite versus Advanced viewer and when to pick each. Formats per engine, and the format notice. Settings › Allowed Mime Types with its 14 defaults. Model pickers accept 3D files only, and disguised script files are blocked on upload. Paste any public model URL.
- P: The 10 extra upload types: PLY, OFF, 3DM, AMF, IFC, BREP/BRP, IGES/IGS, STP, FCSTD and BIM. A short pointer to Cloud Storage in episode 05.
- *Skip:* the "Use Decoder" and "Bin File" settings, because they have no effect.

**05 · Cloud storage for large models (4 min)**
- F (short): Host the file anywhere public and paste the URL.
- P: Install "Cloud Storage for bPlugins" from Extensions. It is free for Pro sites and needs WP 6.6+ and PHP 8.1+. Connect a provider; 9 are supported: S3, R2, Spaces, Wasabi, B2, Bunny Storage, Bunny Stream, Google Drive and Dropbox. Then the Cloud Storage button in the block, the classic editor, Elementor and the WooCommerce rows, and how files are served by signed URLs. Covers the Google Drive warning about file names in the Advanced viewer. Files keep rendering if the licence lapses.

### Module B · Look and feel (≈17 min)

**06 · Poster, loading and spinner (4 min)**
- F: Model Poster, Lazy Load in the block, and Loading Type (Auto, Lazy or Eager) in the classic editor and simple block. Show Loading Percentage, Show Progressbar, and the clear error message when a model fails to load.
- P: Progress bar color in the Style tab. The custom loading spinner in Settings: Default, Custom image or None, with image types GIF, WebP, SVG and PNG, size from 24 to 300 px, and a background.

**07 · Lighting, environment and skybox (5 min)**
- F: Environment Image (Neutral, Legacy or Custom), Custom Environment Image, HDR Skybox Image, Exposure from 0.1 to 5, and shadow. Enable Shadow in the block, or Shadow Intensity from 0 to 1 in the classic editor. Background Color.
- P: Exposure up to 10. Tone Mapping (Neutral, ACES or AgX). Skybox Height for a grounded skybox. Use Environment as Skybox, which only appears with a custom image. Background Image. Lighting can be set per model in a gallery; episode 20 covers that.

**08 · Size, background and custom styling (4 min)**
- F: Responsive Width and Height for desktop, tablet and mobile, in px, % or vh. Background Color. Align in the classic editor.
- P: Background Image, Thumb Size, and the Additional panel with ID, Class and CSS. Custom CSS supports the `>` and `&` selectors.

**09 · Mobile: fast pages and reduced motion (4 min)**
- F: Responsive size from episode 08, touch rotate, zoom and pan, and lazy loading.
- P: Mobile panel. "On mobile devices" offers three choices: Load the 3D model, Show image with tap to load 3D, or Show image only. Tap button text, Mobile breakpoint from 320 to 1280 px with 768 as the default, and Reduce motion on mobile, which also respects the operating system setting. Show the difference on a real phone.

### Module C · Interaction (≈25 min)

**10 · On-screen buttons (4 min)**
- F: Fullscreen with the exit fullscreen button, Mouse Control, Zoom In/Out buttons, the Camera/Capture button (a PNG named after the model), and the 3D File Download button. Then the default positions of each button.
- P: Show Reset View button.

**11 · Control layout and labels (4 min)**
- F (short): The fixed default layout.
- P: Control labels (Off, Tooltip or Inline text), with your own wording for each button. Per-control corners. The opt-in drag-and-drop layout with 8 zones and a tray, set under Settings › Control Placement; it works in Gutenberg only, and Elementor uses selects. Control Size from 24 to 64, Spacing from 0 to 40, and Edge Offset from 0 to 60.

**12 · Camera, zoom and rotation (5 min)**
- F: Mouse Control for orbit, zoom and pan, Enable Zoom in the classic editor, the simple block's always-on auto-rotate, and Set, See and Remove Initial View in the Advanced viewer. *(Gate to confirm.)*
- P: Auto Rotate with Rotation Delay and Rotate Per Second; a negative speed reverses the direction. Lock Left-Right or Lock Up-Down, but only one at a time. Enable Zoom, Initial Zoom from 0.5 to 10, and Set Current as Initial View with See and Remove, saved per model. Reset view rewinds the auto-rotate. The custom angle exists only in the shortcode and classic editor.

**13 · Augmented reality (5 min)**
- F: Enable AR, 3D Model (iOS) as a USDZ file, AR Placement (Floor or Wall), and AR Mode (WebXR, Scene Viewer or Quick Look, with the others as fallbacks). Desktop visitors get a QR code. **Film on a real iPhone and a real Android phone.**
- P: AR per model in a gallery, AR on WooCommerce product pages (episode 23), and AR events in analytics (episode 22).
- *Don't say* that the ruler shows inside AR.

**14 · Animations and color variants (4 min)**
- F (short): The free "available in premium" notice. The model shows but does not animate.
- P: Autoplay, Enable Animation Selector, Default Animation and Enable Variant Selector, which reads glTF material variants from one file. Then the "Autoplay is off" notice.

**15 · Texture editor, experimental (3 min)**
- F (short): The locked "applying textures" notice.
- P: Selected Material, which shakes to show which part it is. Base Color Factor, Available Textures, Upload a Texture, the Metallic factor and the Roughness factor. Changes are replayed for visitors. Label the editor as experimental on screen.

### Module D · Show more with Pro (≈25 min)

**16 · Hotspots, part 1: placing and styling pins (5 min)**
- F (short): The "Hotspots & Initial View: Pro" tile.
- P: Add Hotspot, then click the model. Then the four Default Styles: Simple Tag, Always Visible Card, Hover Popup Card and Minimal Icon Badge. Pin Size from 16 to 64, Pin Icon Color and Pin Background. Per hotspot: Name, Type, Display, Pin Icon and Pin Image. Display is one of Use viewer setting, Always visible, Tooltip on hover, Popup or Pin only. Pin Icon is one of 10 choices, including Number and Custom image. Then Description, Edit Manually for Position, Normal, Camera Orbit, Camera Target and FOV with copy buttons, and reordering. Covers how cards behave and that Escape closes them.

**17 · Hotspots, part 2: the seven types (6 min)**
- P: Each type in turn:
  - **Info:** the camera flies to the spot.
  - **Link:** web, mailto, tel, sms, WhatsApp, Viber or Skype, with button text and an option to open in a new tab.
  - **Image:** with alt text.
  - **Video:** YouTube in privacy-enhanced mode, Vimeo, or an MP4, WebM or OGG file.
  - **Animation:** plays once, loops, or goes back and forth.
  - **Waypoint:** combined with numbered pins, it makes a guided tour.
  - **Product:** a short preview here; episode 26 covers it in full.

**18 · Visual Editor (3 min)**
- P: Load a GLB from the media library, a URL or the cloud. Click to place hotspots and copy their values. Copy the current or initial view. Try lighting, AR, options, dimensions and textures on the live model; nothing is saved. Then where it is linked from: the classic editor, the WooCommerce product box and Elementor.

**19 · Real-world dimensions (3 min)**
- P: Show dimensions (Off, With a ruler button or Always on), Unit (mm, cm, m, in or ft), Line color, the read-out measured from the file, and Real size for width, height and depth. Real size changes the labels only, never the model.

**20 · Multiple models gallery (4 min)**
- F (short): A free viewer shows one model. A multi-model viewer made in Pro shows only its first model in free.
- P: Use Multiple Model, a sortable list. Each model has its own URL, poster, lighting, AR, real size, hotspots and initial view. Then Show Thumbnail List, Show Arrows, Thumb Size, numbered chips for models without a poster, and the scrollbar for long lists.

**21 · Advanced viewer for CAD and 3D-print files (4 min)**
- F: Pick the Advanced engine and load an STL, STEP or OBJ file for free with no conversion. Fullscreen, Mouse Control, the Zoom In/Out button and Download. The environment is built in, and the background color applies.
- P: The Zoom toggle, Show Edge with Edge Color, and Edge Threshold from 0 to 90 degrees. Thumbnails and arrows for several CAD files, and all formats on WooCommerce product pages.

### Module E · Measure (≈5 min)

**22 · 3D and AR Analytics (5 min)**
- F (short): The analytics upsell.
- P, settings: Record anonymous 3D engagement, Ignore logged-in editors, Respect Do Not Track and Global Privacy Control, Keep detailed rows for 30, 90, 180 or 365 days, and Also send to GA4.
- P, the Analytics page: KPI tiles with change versus the previous period, covering views, interaction rate, average time in 3D, AR launches split by iOS and Android, and add-to-cart. Then the timeline as a chart or table, load health by device, and the QR funnel. Top models and top pages, date ranges, CSV export and the diagnostics line.
- P, privacy: no cookies and no IP addresses. Data keeps collecting if the licence lapses.

### Module F · WooCommerce (≈27 min)

The intro card says this module is only for WooCommerce stores, so other viewers can skip it.

**23 · Add 3D to a product (5 min)**
- F: The "3D Product Settings" box with 3D Source (GLB or glTF), 3D Poster, 3D Viewer Position and Background. Global WooCommerce Settings: WooCommerce on or off, Theme Compatibility Mode, Moving Controls, Enable Zoom and Loading Type.
- P: The viewer engine, so any format works on the product page. The Product 3D Models list. Per row: poster, environment, skybox, exposure up to 10, Enable AR with iOS file, placement and mode, Real Size, hotspots, and Initial View with Open Visual Editor. Then Height, Background and the Update button inside the box.

**24 · Position, gallery and theme fit (5 min)**
- F: Positions are None, Top, Bottom, Replace image, or the first gallery image with "View in 3D" and "View image" toggles. Then Theme Compatibility Mode, and the WooCommerce Selectors: Gallery, Gallery Item, Gallery Item Active, Gallery Thumbnail Item and Gallery Trigger.
- P: The dedicated "3D View" tab. A product gallery slider with Show Thumbnail List, Arrows and Zoom. Custom CSS in WooCommerce Selectors. Mention the 8 tested themes.

**25 · A model for every variation (4 min)**
- F (short): A free product has one model for all variations.
- P: The variation selects on each model row, with "All" as a wildcard and a default model before the shopper picks. Works with Swatchly and Select2. Covers the notice to re-map after editing variations. One line: for recoloring parts of one model, see the Configurator series.

**26 · Shoppable hotspots and product dimensions (4 min)**
- P: The Product hotspot: product search, a live card with the struck-through sale price, AJAX Add to cart and View product. Hotspot pin styling per product. Dimensions taken from the product's own shipping dimensions or measured from the model.

**27 · Shop pages, popups, widget and shortcode (5 min)**
- F: The `[3d_viewer_product]` shortcode and the Elementor "3D Product Model" widget.
- P: A 3D icon, or the live model, on shop, category and related-product cards. Popup 3D Models with Selector, viewer, model, poster, environment, skybox and Target id; Escape closes it. Then the PHP template snippet.
- *Don't say* that Quick View is supported.

**28 · Presets and store-wide settings (4 min)**
- P: The Presets screen and the preset block options, then picking a preset on a product. State that **presets apply to WooCommerce products only**. Pro WooCommerce settings: Shadow Intensity, Progressbar, On mobile devices with tap text and breakpoint, Reduce Motion, Auto Rotate with speed and delay (on by default), Autoplay and Fullscreen.

### Module G · Editors, settings and help (≈21 min)

**29 · Classic editor and shortcodes (4 min)**
- F: The classic generator tabs Model, Settings, Style and Preview. Fields only it has: Enable Zoom, Shadow Intensity as a slider, and Align. The `[3d_viewer id="…"]` and `[3d_viewer_product]` shortcodes, and `do_shortcode` in theme templates. Settings › Enable Gutenberg.
- P: The Elements tab, every Pro field in the box, the custom angle, and the Open Visual Editor link.
- *Don't show* any shortcode attribute other than `id`.

**30 · Elementor and other page builders (5 min)**
- F: The "3D Model Viewer" widget and all its free fields, the Style tab, and the "3D Product Model" widget.
- P: The widget matches the block setting for setting. Click to place hotspots in the Elementor canvas, and use the 8-position control selects. Then Divi, Bricks, Beaver and WPBakery through the shortcode; none has a native module.

**31 · Global settings tour (5 min)**
- F: The settings sections: General (Allowed Mime Types and Delete data on uninstall), WooCommerce Settings, Shortcode Generator, WooCommerce Selectors and the admin interface switch.
- P: General, with Enable Gutenberg, spinner, control placement, labels, corners, size, spacing and offset. Then the Analytics section, the Preset defaults for new classic viewers, Pro WooCommerce settings and Custom CSS. Covers what keeps working when a licence lapses, and that uninstall deletes data only when that option is on.

**32 · Troubleshooting and the white-model fix (5 min)**
- F: The model won't load, which shows the error message. The Lite viewer refuses a non-GLB file, so switch to Advanced. The format notice when a type is turned off. Theme Compatibility Mode, the "WebGL context lost" message, and cache or defer plugins.
- P: Help & Demos › Tools › Fix legacy materials: scan, see where each file is used, convert or convert all, and the original is kept. Re-mapping variations, and the licence status screen.

**33 · Bonus: the 3D Product Configurator is included (2 min)**
- P: Install it from Extensions with the Pro licence. A 30-second front-end preview. Then a link to the existing 25-part Configurator playlist. It has no free version, so this episode has no FREE part.

---

## 3. Production

| Item | Plan |
|---|---|
| Capture | 1920×1080, 30 fps, as in `VIDEO_SCRIPTS.md`. Or 2560×1440, to match the Configurator series. **Decision needed.** |
| Voice | The ElevenLabs "Mark" voice used in the Configurator series keeps the brand consistent. Second person and present tense. Name each control exactly as it is labeled. |
| Scripts | Start from the 22 scripts in `VIDEO_SCRIPTS.md`. They are Pro-only, so add a FREE part to each and write the 11 that don't exist. Those are episodes 01, 05, 09, 11, 14, 17, 19, 22, 26, 31 and 33. |
| Pipeline | The automated recorder in `scratch/tutorial-series/`, run against two Playground sites. The FREE and PRO badges and the divider card are overlays added in ffmpeg. |
| Phone shots | Episodes 09 and 13 need screen recordings from a real iPhone and a real Android phone. |
| Captions | An `.srt` file and a chapters file per episode, as in the Configurator series. |
| Review | Raju approves each final file before it is uploaded, as the pipeline checklist requires. |
| Docs | Embed each episode in the matching docs page in `docs/index.html`, which already has 22 video slots. |

---

## 4. Schedule (proposed)

| Dates | Work |
|---|---|
| 19–24 Oct | Confirm the gates in section 5 with development. Build both demo sites on the 2.0.0 release candidate. Prepare the props. Finish scripts for Modules A–C. |
| 26 Oct – 6 Nov | Record and voice Modules A–D, episodes 01–21. |
| 9–13 Nov | Record Modules E–G, episodes 22–33. Raju reviews. |
| **Tue 17 Nov** | 2.0.0 release. Publish Modules A–E, episodes 01–22, as one playlist, and embed them in the docs. |
| 20 Nov – 2 Dec | During the sale, publish Module F on 24 Nov and Module G on 1 Dec. Use episodes 16, 17, 19 and 22 in sale emails as "see it in action" links. |

If time runs short, do these first: 03, 07, 13, 16, 17, 19, 20, 22, 23 and 25. They cover what people use most and the strongest Pro reasons to upgrade.

---

## 5. Check before recording

These items are unclear between the free plugin and Pro. Confirm each one so the FREE and PRO labels are right.

1. **AR, environment, skybox, exposure and shadow** are free in the free plugin but shown as Pro in the Pro block. Label them FREE. Consider fixing the Pro block's labels too.
2. Is the **Reset View button** in the free 2.0.0 block? The free report doesn't list it.
3. Is **Set Initial View in the Advanced viewer** in free?
4. Do the **progress bar color** and the **Class** field have controls in free? The free report says the color has no control.
5. Are **Duplicate, list and grid view, AJAX save and the unsaved-changes warning** in free 2.0.0, or only in Pro?
6. Are **Edge Color and Edge Threshold** usable without Show Edge, which is Pro?
7. Does AR open by itself after the QR scan, or does the phone need a tap? This is unconfirmed in code. Film whatever actually happens.
8. Is the email and admin order snapshot working with classic checkout, for the Configurator preview in episode 33? Only claim it if tested.

**Never show:** the Draco decoder setting as a feature, shortcode attributes other than `id`, Dokan, Quick View, exploded view, AI generation, model compression, or dimensions inside AR (`MARKETING-FEATURES.md` §11).

---

## 6. Coverage check: every settings area has an episode

| Settings area | Episodes |
|---|---|
| Block › Model panel | 03, 04, 05, 06, 12, 20 |
| Block › Lighting & Environment | 07 |
| Block › AR | 13 |
| Block › Texture (experimental) | 15 |
| Block › Options, Lite viewer | 06, 07, 10, 12, 14, 20 |
| Block › Options, Advanced viewer | 21 |
| Block › Mobile | 09 |
| Block › Controls | 11 |
| Block › Dimensions | 19 |
| Block › Hotspots | 16, 17 |
| Block › Style | 08, 11 |
| Block › Additional (ID, Class, CSS) | 08 |
| Simple "3D Viewer" block | 03 |
| Classic shortcode generator | 29 |
| Elementor "3D Model Viewer" and "3D Product Model" | 30, 27 |
| WooCommerce product box, free and Pro | 23, 24, 25, 26, 27 |
| Presets | 28 |
| Visual Editor | 18 |
| Settings › General, Mime Types, Spinner, Controls | 04, 06, 11, 31 |
| Settings › Analytics, plus the Analytics page | 22 |
| Settings › Preset defaults and WooCommerce Settings | 23, 28, 31 |
| Settings › WooCommerce Selectors and Custom CSS | 24 |
| Guided Setup, Help & Demos, Licence, Extensions | 02, 05, 33 |
| Tools › Fix legacy materials | 32 |
| Cloud Storage companion | 05 |

---

## 7. Decisions for Raju

1. **Structure.** This plan splits FREE then PRO **inside each episode**. The alternative is a free season followed by a Pro season. The per-episode split keeps each topic in one place, and it shows free users what they're missing at the moment they need it.
2. **The Configurator.** Should it get one bridge episode linking the existing 25-part series, as planned here, or be covered again inside this series?
3. **Resolution and voice.** Match the Configurator series at 1440p with "Mark", or the docs convention at 1080p?
4. **Release.** Publish Modules A–E on 17 Nov with 2.0.0, or hold everything until the whole series is done?
