# 3D Viewer + 3D Product Configurator: Marketing Feature Bible

**Brand:** bPlugins · **Compiled:** 17 Oct 2026 · **Source:** a read-only code audit of three plugins in `wp-content/plugins/`. Every feature below was checked in code unless it is marked ⚠️.

The detailed reports, with file references, are in [research/](research/).

**What this is for:**
- landing pages
- emails (Halloween, Black Friday/Cyber Monday, launches)
- video scripts
- social posts and images
- ads

> **Read [section 11 (Do not claim)](#11-do-not-claim--fix-before-reuse) and [section 12 (Open decisions)](#12-open-decisions-for-raju) before writing copy.** Several older readmes and landing drafts contain claims the code no longer supports.

---

## 1. The product family at a glance

| | **3D Viewer (Free)** | **3D Viewer Pro** (premium plugin) | **3D Product Configurator for WooCommerce** |
|---|---|---|---|
| Version | 2.0.0 | 2.0.0 (releases **Tue 17 Nov 2026**); 1.10.0 shipped 1 Oct 2026 | 1.1.0 |
| What it is | Embed interactive 3D models and AR anywhere in WordPress | Everything in Free, plus hotspots, galleries, analytics, a pro WooCommerce setup and more | A live 3D product configurator: shoppers build the product, see the price, and buy it |
| Where to get it | wordpress.org | bplugins.com (Freemius) | **Included with the 3D Viewer Pro or Max plan.** It is no longer sold on its own. |
| Formats | GLB/glTF + about 20 CAD/3D-print formats | Same, on WooCommerce product pages too | GLB/glTF |
| Needs | WP 6.5+, PHP 7.4+ | WP 6.5+, PHP 7.4+ | WP 6.2+, PHP 7.4+, WooCommerce 7.0+, 3D Viewer 1.8.0+ |
| One-liner | "Turn flat product photos into interactive 3D your visitors can rotate, zoom and place in their room with AR, no code required." | "Turn 3D views into sales: shoppable hotspots, AR, real-world dimensions and analytics that show what 3D earns you." | "Let customers design it in 3D. Then buy it." |

**The bundle story (the core of a Black Friday message):** one 3D Viewer Pro licence gives you the pro viewer **and** the full 3D Product Configurator. SaaS configurators charge **monthly fees plus a cut of every sale**. This one is self-hosted, has no fee per sale or per view, and keeps your data in WooCommerce.

---

## 2. Headline numbers (all verified in code)

| Number | What it refers to |
|---|---|
| **~20** | 3D file formats: GLB, glTF, OBJ, STL, FBX, STEP/STP, IGES/IGS, 3DS, 3MF, DAE, PLY, OFF, 3DM, AMF, IFC, BREP, WRL, FCSTD, BIM |
| **2** | Viewer engines: Google model-viewer (fast, AR-ready) and Online 3D Viewer (CAD and 3D-print files) |
| **3** | AR modes: WebXR, Android Scene Viewer, iOS Quick Look. Plus a **desktop-to-phone QR code** |
| **7** | Hotspot types: Info, Link, Image, Video, Product (add to cart), Animation, Waypoint |
| **10** | Pin icons per hotspot, including numbered pins and your own logo |
| **6** | WooCommerce product-page positions: above, below, replace image, on first gallery image, dedicated "3D View" tab, popup |
| **5** | Measurement units on the real-world dimensions ruler: mm, cm, m, in, ft |
| **8** | Drag-and-drop zones for viewer buttons |
| **9** | Cloud storage providers: S3, Cloudflare R2, DigitalOcean Spaces, Wasabi, Backblaze B2, Bunny Storage, Bunny Stream, Google Drive, Dropbox |
| **8** | Themes tested in 2.0.0: Astra, Storefront, OceanWP, Kadence, Twenty Twenty-Five, Blocksy, GeneratePress, Hello Elementor |
| **17** | Live demos built into the plugin dashboard |
| **13** | Feature modules in the Configurator |
| **10** | Studio lighting presets in the Configurator (HDRI) |
| **4** | Option-group display styles: swatches, thumbnails, buttons, dropdown |
| **9** | Fonts available for shopper personalization |
| **50** | Undo/redo steps for shoppers |
| **~12 KB** | Configurator storefront script. The 3D engine loads only when needed. |
| **0** | Third-party requests from the Configurator storefront; cookies used by 3D analytics; fees per sale |
| **7-day** | Free trial of Pro, no card required (Freemius) |
| **14-day** | Money-back guarantee (⚠️ the wording varies; see section 12) |

---

## 3. 3D Viewer (Free): complete feature list

### Display 3D anywhere
- **2 Gutenberg blocks:**
  - "3D Model Viewer" (full settings)
  - "3D Viewer" (simple; always auto-rotates)
- **2 shortcodes:** `[3d_viewer id="…"]` and `[3d_viewer_product]`
- **2 Elementor widgets:**
  - "3D Model Viewer", which has nearly every viewer setting
  - "3D Product Model"
- **Classic shortcode generator** (a 3D Viewer post type with tabs for Model, Settings, Style and Preview)
- Works in theme templates via `do_shortcode`

### File formats
- **Lite viewer** (Google model-viewer): GLB and glTF, including Draco and KTX2-compressed models. Recommended for the web and needed for AR.
- **Advanced viewer** (Online 3D Viewer): OBJ, 3DS, STL, PLY, glTF/GLB, OFF, 3DM, FBX, DAE, WRL, 3MF, AMF, IFC, STEP, IGES, BREP, FCSTD, BIM.
- **Uploads allowed by default:** GLB, glTF, OBJ, 3DS, STEP, STL, FBX, 3DML, DAE, WRL, 3MF, MTL, HDR, USDZ. Each type can be switched on or off.
- **Message to use:** "Show STL, STEP, OBJ and FBX files **for free**, with no conversion."

### Augmented reality (free)
- WebXR, Scene Viewer and Quick Look, with an optional USDZ file for iPhone
- Place on the **floor or a wall**
- **Desktop visitors scan a QR code** and AR opens on their phone
- Message: "Augmented Reality is free: no upgrade, no add-on."

### Look and lighting (free)
- Environment lighting: Neutral, Legacy or a custom image
- **HDR skybox** background
- Exposure (0.1–5)
- Soft shadow on or off
- Background color
- Poster image while the model loads

### Visitor controls
- Rotate, zoom and pan with mouse or touch
- Fullscreen, including a new exit-fullscreen button
- Zoom +/− buttons
- **Screenshot button**, which saves a PNG
- **3D file download button**
- Loading percentage or progress bar

### WooCommerce (free)
- **"3D Product Settings" box** on each product: model, poster, position and background
- **Positions:**
  - above the image
  - below the image
  - replace the image
  - on the first gallery image, with "View in 3D" and "View image" toggles
- **Theme support:** block (FSE) themes, plus a Theme Compatibility Mode and custom selectors for other themes
- Limits: GLB/glTF only, and no AR on product pages (Pro adds both)

### Speed, safety, admin
- Lazy loading. Scripts load **only on pages that have a viewer**.
- **Upload security:** files that hide code (`model.php.glb`, disguised HTML or scripts) are blocked.
- A broken model shows a clear error instead of spinning forever. If JavaScript fails, a backup viewer appears.
- **New card-based admin (2.0.0)** with one-click switch back to Classic.
- **Live preview** with Desktop, Tablet and Mobile views.
- **3-step Guided Setup** with a 2-minute tutorial video.
- **Help & Demos dashboard** with 17 live demos, a feature comparison and in-dashboard checkout.
- Self-hosted Inter font: no calls to Google Fonts.
- **Downgrade-safe:** Pro data is kept if you move to Free.
- Data is deleted on uninstall only if you choose that.

---

## 4. 3D Viewer Pro: everything Pro adds

### 4.1 Hotspots: interactive, shoppable 3D
- **Click the model to drop a pin.** It saves the pin's position and the camera angle.
- **7 hotspot types:**
  - **Info:** the camera flies to the spot and shows a title and text
  - **Link:** web, email, phone, SMS, **WhatsApp, Viber, Skype**
  - **Image:** a picture with a caption
  - **Video:** YouTube (privacy-enhanced), Vimeo or MP4. Nothing loads until the visitor opens it.
  - **Product:** a live WooCommerce card with image, price, **struck-through sale price** and **AJAX Add to cart**. This is "shoppable 3D".
  - **Animation:** plays a model animation once, on loop or back and forth
  - **Waypoint:** camera fly-to only, which makes **guided 3D product tours**
- **Display per hotspot:** always visible, on hover, **full-page popup** or pin only
- **10 pin icons:** text, info, plus, dot, **numbered**, link, play, cart, question, **your own logo**
- **4 style presets:** Simple Tag, Always Visible Card, Hover Popup Card, Minimal Icon Badge
- Pin size and colors can be set
- Cards stay inside the viewer and are keyboard- and screen-reader friendly

### 4.2 Real-world dimensions
- A ruler overlay shows width, height and depth, either as a button or always on
- Units: mm, cm, m, in, ft
- On WooCommerce it can **read the product's own shipping dimensions**
- A "real size" override fixes models exported at the wrong scale

### 4.3 Multiple models and galleries
- Several models in one viewer, with a **thumbnail strip** and **arrows**
- Each model has its own lighting, AR, hotspots, initial view and real size

### 4.4 Camera and motion
- **Auto-rotate**, with delay and speed. A negative speed reverses the direction.
- **Set the initial camera view** for each model
- Lock horizontal or vertical rotation
- Initial zoom from 0.5 to 10×
- Reset-view button

### 4.5 Animation and variants
- Autoplay embedded animations and choose the default clip
- **Animation picker** for visitors
- **Variant picker** (glTF material variants): **show every colorway from one file**

### 4.6 Lighting
- **Tone mapping:** Neutral, ACES, AgX
- Exposure up to 10
- Grounded skybox height
- Use the environment as the skybox
- Background image

### 4.7 Texture editor (experimental)
- Change a material's color
- Swap or upload textures
- Adjust metalness and roughness
- **Recolor without re-exporting the model**

### 4.8 Mobile and speed
- **Mobile poster mode:** load 3D, **show an image with a "tap to load 3D" button**, or image only. This helps page-speed scores (LCP).
- **Reduce Motion:** respects the operating system's accessibility setting
- **Custom loading spinner:** GIF, WebP, SVG or PNG

### 4.9 Control layout
- **Drag-and-drop the viewer buttons into 8 zones**
- Labels: off, tooltip or inline text
- Rename any button
- Control size, spacing and edge offset

### 4.10 Advanced viewer extras
- Show edges or wireframe, with color and threshold
- Download button

### 4.11 WooCommerce Pro
- **A different 3D model per variation:** shoppers pick red and see the red model. Works with **Swatchly** and Select2 dropdowns.
- **Product 3D galleries** with several models per product
- **All ~20 formats** on product pages
- **AR on product pages**
- **6 positions**, including a **dedicated "3D View" tab** and a **popup opened by any element** on the page
- **Shop-page 3D:** a 3D icon or the live model on shop, category and related-product cards
- **Presets:** reusable viewer settings for products
- "3D Product Model" Elementor widget for Theme Builder product templates

### 4.12 3D & AR Analytics (built in)
- **KPIs:**
  - 3D views
  - interaction rate
  - average time in 3D
  - **AR launches** (iOS/Android split)
  - **add-to-cart after viewing 3D**
- **Charts and reports:**
  - QR funnel: desktop QR → AR on phone → placed in the room
  - load health by device
  - top models and top pages
  - date ranges and **CSV export**
- **Optional GA4 forwarding**
- **Privacy:** no cookies, no IP addresses, respects Do Not Track and Global Privacy Control

### 4.13 Cloud storage for large models
- **9 providers**
- Files are served by signed URLs
- Companion plugin is free for Pro sites

### 4.14 Workflow tools
- **Visual Editor:** load a model, click to place hotspots and frame camera angles, then copy the values into any editor
- **Fix for models that render white:** a one-click converter for legacy Spec/Gloss GLBs. The original file is kept.
- Duplicate a viewer
- List and grid view with previews
- AJAX save
- Unsaved-changes warning
- **Elementor parity:** the widget matches the block setting for setting. Hotspots can be placed by clicking in the Elementor canvas.
- Custom ID, class and CSS

### 4.15 Trust and safety
- **7-day free trial, no card**
- **If the licence lapses, nothing breaks or is deleted:**
  - viewers keep rendering
  - analytics keeps collecting
  - Pro data is preserved
- Accessibility work: real buttons, focus rings, Escape closes overlays, WCAG AA contrast in the admin, RTL fixes
- Spanish translation included. Translation-ready.

---

## 5. 3D Product Configurator for WooCommerce: complete feature list

### 5.1 One model, every variation
- Upload **one GLB**. Each WooCommerce variation can:
  - show or hide parts
  - recolor
  - swap textures
  - change metalness and roughness
  - apply a material variant
  - set its own camera, lighting, animation and hotspots
  - **use a completely different model**
- **Changing a variation updates the model instantly**, with no page reload
- **Auto-Map Assistant:** matches WooCommerce attribute values to mesh names automatically, then applies the result to every variation in one click

### 5.2 No-code, full-screen 3D editor
- **Layout:**
  - mesh tree
  - click-to-select in the 3D view
  - variations overview (Linked/Unlinked, override counts)
  - light and dark editor theme
- **Per-part settings:**
  - visibility
  - color (hex)
  - texture image
  - **shopper-friendly label**
  - "Customizable" or "Toggleable on frontend"
- **Materials:**
  - base color, metalness and roughness
  - **glTF material variants** from Blender or Substance, with **auto-map by name**
- **Scene:**
  - **10 lighting presets** (Studio, Apartment, City, Dawn, Forest, Lobby, Night, Park, Sunset, Warehouse)
  - light intensity
  - contact shadows
  - background: transparent, color, image or blurred environment
  - grid
  - **ground floor with reflections**
- **Animation:** autoplay clip, loop, playback speed
- **Hotspots:** click to place, link to a URL or a **WooCommerce product with Add to Cart**, camera fly-to
- **Camera:**
  - initial view
  - **4 gallery angles** (Perspective, Front, Side, Back)
  - rotate, zoom and pan locks
  - angle and distance limits
- **AR settings:**
  - USDZ upload
  - "Allow resizing in AR". Turn it off to lock the model to its real size.
- **Model health check:**
  - triangle, vertex, material and texture counts, and file size
  - warnings for heavy models
- **Mobile performance:**
  - Battery Saver
  - pixel-ratio limit
  - turn off reflections and shadows on mobile
- **Reusable presets:** materials, camera views, lighting, animation
- **JSON import and export**, with a model-match check. Clone a setup across products.
- **Editing safeguards:**
  - undo/redo with a separate history per variation
  - unsaved-changes counter
  - leave-page warning

### 5.3 What shoppers get
- **Live customizer:** a side drawer or a **large modal**. The modal has a bigger viewer, the options, the variation selects, quantity, a **live total** and the real Add to Cart button. The model never reloads.
- **Option groups:**
  - Color, Material, Parts or Material variant
  - shown as **swatches, thumbnails, buttons or dropdowns**
  - can be **required**
  - can have a default choice
- **Conditional logic:** show options only when they make sense (e.g. "walnut legs only with oak top"), with clear "not available, using Y" notes
- **Option pricing:**
  - fixed or percent prices, sale prices and discounts
  - a Product / Options / Total box above Add to Cart
  - **the price is recalculated on the server, so shoppers can't tamper with it**
- **Personalization:**
  - shoppers add their own **text or logo/image** to the model and see it live in 3D
  - 9 fonts, a set color palette, character limits
  - adjust size, rotation and position
- **Quick swatches and a custom color picker**, with color names such as "Emerald (#10b981)"
- **Undo/redo** (Ctrl/⌘+Z), up to 50 steps
- **Share design:**
  - a short link with a QR code and an image preview
  - **Saved designs in My Account**
  - designs can be reopened and added to the cart
- **AR of the shopper's own design:**
  - **iPhone:** the model is built on the device
  - **Android:** the model is generated on the device
  - desktop shoppers get a QR code
- **3D toolbar:** zoom, reset, auto-rotate, download, fullscreen, Customize, View in AR
- **Gallery of angles**
- Keyboard controls

### 5.4 After "Add to cart": orders you can't misread
- A **picture of the configured product** replaces the product image in:
  - the cart and mini-cart
  - checkout, including **Cart and Checkout blocks**
  - order pages
  - the admin order screen
  - **emails**
- A "3D Customization" summary on every order line: parts, named colors, options, prices
- **Interactive 3D order preview** for the store owner and the customer
- Prices are frozen on the order
- **"Order again" restores the design**

### 5.5 Store-owner tools
- **Coverage dashboard:**
  - products with 3D
  - variations covered
  - missing iOS AR file
  - missing posters
  - oversized models
  - bulk "Generate posters" and "Assign model"
- **Model from a URL (CDN)**, with a built-in check for reachability, size and CORS
- Saved-designs admin tab
- **Placement:**
  - replace image
  - first gallery image
  - popup
  - "3D View" tab
  - shortcode `[wc3d_viewer]`
  - **Gutenberg block**
  - **Elementor widget**
- **Shop pages:** a "3D" badge and an optional **"View in 3D" quick-view popup**
- Works with quick view, infinite scroll, AJAX, block themes, classic themes, optimizers and RTL
- Developers: REST API (`wc3d/v1`) and about 45 hooks

### 5.6 Fast, private, compatible
- **Poster first:** the 3D engine loads on click, on scroll or immediately. The storefront script is about 12 KB.
- Draco, KTX2 and Meshopt decoders are **served from your own store**. **No third-party requests on the storefront.**
- **HPOS** and **Cart/Checkout blocks** compatibility declared
- **Self-hosted:**
  - **no fee per sale, per view or per product**
  - unlimited products
  - the data stays in WooCommerce

---

## 6. Comparison table (for pricing pages)

| Feature | Free | Pro | Pro + Configurator (included) |
|---|:-:|:-:|:-:|
| GLB/glTF + ~20 CAD/3D-print formats (blocks, shortcodes, Elementor) | ✅ | ✅ | ✅ |
| AR (WebXR, Scene Viewer, Quick Look) + desktop QR | ✅ | ✅ | ✅ |
| HDR skybox, environment, exposure, shadow | ✅ | ✅ | ✅ |
| Fullscreen, zoom, screenshot, download buttons | ✅ | ✅ | ✅ |
| WooCommerce product 3D (GLB/glTF, 4 positions) | ✅ | ✅ | ✅ |
| All formats + AR on product pages, tab and popup positions | – | ✅ | ✅ |
| Hotspots (7 types incl. shoppable product cards) | – | ✅ | ✅ |
| Multiple models / gallery / per-variation model | – | ✅ | ✅ |
| Auto-rotate, initial view, rotation locks, zoom level | – | ✅ | ✅ |
| Animation and variant pickers, tone mapping, texture editor | – | ✅ | ✅ |
| Real-world dimensions ruler | – | ✅ | ✅ |
| Mobile poster mode, reduce motion, custom spinner | – | ✅ | ✅ |
| Drag-and-drop control layout and labels | – | ✅ | ✅ |
| Shop-page 3D, presets | – | ✅ | ✅ |
| 3D & AR Analytics + GA4 | – | ✅ | ✅ |
| Cloud storage (9 providers) | – | ✅ | ✅ |
| Visual Editor | – | ✅ | ✅ |
| Per-variation mesh/color/texture config, no-code 3D editor | – | – | ✅ |
| Option groups, conditional logic, option pricing | – | – | ✅ |
| Text/logo personalization on the model | – | – | ✅ |
| AR of the shopper's configured design | – | – | ✅ |
| Configured-product image in cart, orders and emails + 3D order preview | – | – | ✅ |
| Share links, QR, saved designs | – | – | ✅ |

"–" means the feature isn't in that edition. In the third column, "Pro + Configurator" is the same Pro licence. ⚠️ The free AR row covers blocks, shortcodes and Elementor only. On free WooCommerce product pages there is no AR.

---

## 7. What's new (for "update" and launch emails)

### 3D Viewer 2.0.0 (17 Nov 2026), mainly the admin experience
- **New card-based admin**, with one-click switch back to Classic
- **Full-page editor with a resizable live preview**
- AJAX save
- One "3D Source" field (upload or URL)
- List and grid view with previews
- **Redesigned Help & Demos dashboard** and Analytics page
- **WCAG AA contrast**
- Spanish translation
- Exit-fullscreen button, and fixed iPhone fullscreen
- Screenshots named after the model
- Numbered thumbnail chips
- Download button in the Advanced viewer
- **Upload security:** disguised script files are blocked
- Ten more file types available
- Drafts and private viewers are hidden from visitors
- **WooCommerce fixes for 8 popular themes**

### 3D Viewer 1.10.0 (1 Oct 2026), the big viewer release
Most users are upgrading from 1.9.x, so treat all of this as **new** in copy:
- **7 hotspot types**, including **shoppable product hotspots** and video
- **Real-world dimensions ruler**
- **3D & AR Analytics**, with no cookies and GA4 forwarding
- **Cloud Storage** (9 providers)
- **Mobile poster mode**, Reduce Motion and custom spinner
- **Drag-and-drop control layout**, button labels and download button
- Legacy-material (white model) fixer
- Accessibility overhaul
- Elementor parity, including click-to-place hotspots

### 3D Product Configurator 1.1.0
- **Option groups** with swatches
- **Conditional logic**
- **Option pricing**
- **Text and logo personalization**
- **Material variants**
- **Cart and order snapshot image**
- **AR of the configured design**
- **Share links and saved designs**
- **Gutenberg block** and Elementor widget
- **Coverage dashboard**
- **Model from URL**
- Customizer modal
- Shopper undo/redo
- Licensing change: now included with **3D Viewer Pro** (previously Max)

---

## 8. Audiences and use cases

| Segment | Hook | Lead features | Demo URL (3d-viewer.bplugins.com) |
|---|---|---|---|
| **Furniture and home** | "Six fabrics × three legs = 36 photo shoots. Or one 3D model." / "Will it fit?" | variations, AR at real size, dimensions ruler, option pricing | `/product/curved-velvet-sofa-pick-from-5-fabrics/`, `/product/tufted-accent-chair-see-it-in-your-room-ar/` |
| **Personalized gifts, print, merch** | "Can you put her name on it?" | text and logo personalization, snapshot in the order | `/product/personalised-water-bottle-add-your-name-or-logo/` |
| **Jewelry** | "Let them build the ring." | metal and stone options, engraving, 3D zoom (AR shows the ring in the room, not on the hand) | `/product/solitaire-ring-design-your-own/` |
| **Made-to-order** (cabinets, doors, sheds) | "The order that didn't need a follow-up email." | required options, conditional rules, exact build in the order | — |
| **Fashion and accessories** (sneakers, watches, sunglasses, bags) | "Spin it. Build it. Buy it." | swatches, share design, saved designs | `/product/custom-sneaker/`, `/product/chronograph-watch-save-share-your-design/`, `/product/aviator-sunglasses-build-your-pair/` |
| **Electronics, gadgets, cars** | "See every side before you buy." | hotspot tours, gallery angles, video hotspots | `/product/concept-sports-car-viewpoint-gallery/` |
| **Engineering, CAD, 3D printing** | "Show STL, STEP, OBJ and FBX free, with no conversion." | Advanced viewer, edges and wireframe, download | `/wordpress-stl-viewer/` |
| **Education, museums, portfolios, architecture** | "Let them explore it." | hotspots with video and images, waypoint tours, IFC/BIM | — |
| **Agencies and developers** | "3D anywhere, without fighting the theme." | blocks, Elementor, shortcodes, REST API, hooks, 8 tested themes | — |
| **Existing 3D Viewer Pro customers** | "Good news: you already have it." | Configurator is included | — |
| **Shoppers looking at SaaS** (Zakeke, Expivi, Threekit) | "A configurator that runs inside your store." | self-hosted, no fee per sale or view | — |

Other uses mentioned in the readme: research and prototyping, packaging and mockups, game and digital assets.

---

## 9. Messaging toolkit

### Taglines already in use (reuse or test)
- "Flat photos tell. 3D models sell."
- "Let customers design it in 3D. Then buy it."
- "Sell in 3D. Let customers see it, spin it, and make it theirs."
- "One model. Every variation." / "One upload does the work of a hundred photo shoots."
- "Spin it. Build it. Buy it."
- "Shoppers build it. You get the exact build."
- "Don't read about it. Build one."
- "Put it in their living room (their version, not yours)."

### Founder story: the "three rules" (from launch email E06)
1. The price has to be right: it is recalculated on the server.
2. The order has to say exactly what was built.
3. AR has to show *their* version.

### Objection handling
| Objection | Answer |
|---|---|
| "Will 3D slow my store?" | A poster shows first and 3D loads on click or scroll. Scripts load only where a viewer is used. Mobile poster mode is available. The Configurator script is about 12 KB. |
| "I don't have 3D models." | GLB comes from Blender, Shopify-style 3D scans, CAD and photogrammetry. STL/STEP/OBJ/FBX are shown directly. ⚠️ AI model generation is **not** shipped, so don't promise it. |
| "Will it work with my theme?" | Tested on 8 popular themes, plus a block-theme fallback and a compatibility mode with custom selectors. |
| "My models are huge." | Cloud storage with 9 providers, Draco/KTX2/Meshopt compressed models, and a model health check. |
| "Privacy and GDPR?" | Analytics use no cookies and no IPs, and respect DNT/GPC. The Configurator storefront makes no third-party requests. |
| "What if I stop paying?" | Nothing breaks and nothing is deleted. Viewers keep working. |
| "SaaS configurators charge per sale." | Here there is no fee per sale, per view or per product. Data stays in WooCommerce. |
| "Is AR hard?" | One toggle, no app. iPhone and Android are supported, and desktop visitors scan a QR code. |
| "Will shoppers mess up custom orders?" | Required options, conditional rules, server-side pricing, and a picture plus a 3D preview of the exact build on every order. |

### Competitive angles
- **vs SaaS** (Zakeke $19–99/month + 1.7–1.9% per order, VividWorks €447+/month, Threekit, Expivi): self-hosted, no platform fee, native WooCommerce orders.
- **vs WP plugins** (WP Configurator ~$299/yr with no AR, Staggs, Visody, AR for WooCommerce, AtlasAR): we claim we're the only one combining variation-bound 3D, priced options, personalization, AR of the configured design and an order snapshot in one self-hosted plugin. ⚠️ Competitor prices come from internal research dated Sept 2026; re-check them before publishing.
- **vs photos and 2D layered configurators:** with photos, every combination needs its own shoot; here you get one model, rotation and zoom, AR, and a new color in seconds.

### Social proof
| Proof point | Status |
|---|---|
| 3D Viewer has **9,000+ active installs** | ⚠️ Confirm on wordpress.org |
| 24 reviews on 3D Viewer | ⚠️ Confirm on wordpress.org |
| bPlugins "212K+ users" | Unverified |
| Two readme testimonials: diegoparoni (support), blunoa (lighting, Pro) | Real |
| Configurator testimonials, reviews or case studies | **None exist.** Don't use the placeholder testimonials in the landing mockup. |

---

## 10. Visual, video and campaign resources

### Best "wow moments" to film or screenshot
1. Pick a color and the 3D model changes instantly, with no reload.
2. Type a name and it appears on the product in 3D.
3. The price total updates as options change.
4. Scan the QR code on desktop and the shopper's own design appears in their room in AR.
5. Click a hotspot, the product card opens, and **Add to cart** works without leaving the model.
6. The dimensions ruler appears on the model in cm or inches.
7. In the cart and the order email, the product image is the shopper's exact design.
8. A "View 3D Preview" on the order shows the store owner exactly what to build.
9. Auto-Map matches all variations in one click.
10. The analytics dashboard shows AR launches and add-to-carts.
11. A STEP or STL file displays in WordPress for free.
12. Drag the viewer buttons into place.

### Existing assets you can reuse (paths in [research/05-marketing-assets.md](research/05-marketing-assets.md))
- **Configurator:**
  - 25 launch emails with A/B subject lines (`docs/launch-emails/`)
  - a full social kit with posts for X, LinkedIn, FB, IG, TikTok, Reddit, Product Hunt and others (`docs/social-launch/SOCIAL-LAUNCH.md`)
  - **23 finished social videos** plus images (`/Volumes/External/wc3d-social-launch/`)
  - 25-part tutorial series (unlisted)
  - 17 doc micro-videos
  - about 40 landing screenshots (`landing-page/assets/img/`)
  - 9 demo products
  - brand logos (`assets/brand/`)
- **3D Viewer:**
  - 61-second intro video (`3d-viewer/promo/`)
  - 17 demo thumbnails
  - about 133 docs screenshots (`3d-viewer-premium/docs/img/`)
  - 22 tutorial scripts (`docs/VIDEO_SCRIPTS.md`)
  - a use-case and objection map (`docs/FEATURE-USECASES-2.0.0.md`, partly stale)
- **Outdated, don't use:**
  - the Configurator intro and quick-start videos plus narrations (old name "WC 3D Model Viewer Pro")
  - prototype tutorials
  - `plan/woo-theme-compat-repro/*.png` (bug reproductions)

### Key dates (today: Sat 17 Oct 2026)
| Date | Event |
|---|---|
| **Sat 31 Oct** | Halloween, 14 days away. Nothing has been written yet. |
| **10 Nov** | Configurator SEO pages planned to go live |
| **Tue 17 Nov** | **3D Viewer 2.0.0 release** + BFCM early-bird for the list (48 h) per the existing plan |
| **20 Nov – 2 Dec** | Public BFCM sale (existing plan) |
| **Fri 27 Nov** | Black Friday |
| **Mon 30 Nov** | Cyber Monday |

Existing BFCM offer (`3d-viewer-premium/MARKETING_PLAN_BFCM_2026.md`):
- **40% off the first year** of annual plans
- **30% off lifetime**
- **30% off tier upgrades** for existing customers (email only)

The plan doesn't mention the Configurator. **Adding "plus the 3D Product Configurator, included" is the strongest BF hook available.**

### Halloween angle ideas (none exist yet)
- **AR:** "Put a 3D jack-o'-lantern in your room": an AR demo with a pumpkin GLB from a free model library.
- **Spooky product configurator:** costume and mask colors, custom candles or mugs with names, using personalization.
- **"Don't let flat photos haunt your conversions":** a light pre-BF teaser that previews the 17 Nov 2.0.0 release.

---

## 11. Do not claim / fix before reuse

### Not built: never claim these
| Don't claim | Reason |
|---|---|
| Exploded view | Not built |
| AI 3D generation | Not built |
| Model compression or optimizer | Not built |
| Viewer access restriction by role | Not built |
| Dokan multivendor | Built but not shipped |
| Quick View support (3D Viewer) | Not supported. The Configurator has its own quick-view popup. |
| Native Divi, Bricks, Beaver or WPBakery modules | None exist. These builders work via shortcode. |
| Shopify version | Planned, about 8–9 months away. It exists only as a prototype. |

### Configurator claims to drop
- "Clearcoat", "texture maps" (only one color-texture override exists), "floor texture"
- "Set the camera FOV"
- "Max texture resolution"
- "GPU performance modes" (say "Battery Saver mode")
- "Upload your own HDRI" (the button exists, but uploads are blocked)
- "Draco/Meshopt detection" (say compressed models **load**)
- "No limits", "lightning quick"

### Other cautions
- **"Max plan only"** for the Configurator is **wrong**. The code unlocks it with **Pro or Max**. Fix it in these files:
  - `docs/LANDING-PAGE-FEATURES.md`
  - the landing README
  - `llms.txt`
  - `3d-product-configurator.html`
  - `wp-blocks/software.html`
  - the live hub page
- Don't call poster, progress bar, fullscreen, lighting/exposure/shadow, skybox, AR, model URLs or the Elementor widget "Pro". They are **free**. These sources have it wrong and need fixing:
  - 3D Viewer readme "Pro features" list
  - Freemius feature list
  - `docs/index.html`
  - the landing mockup ("AR is Pro")
- Don't say "OBJ/STL/FBX need Pro". They're free in blocks, shortcodes and Elementor. Only the WooCommerce product box needs Pro for them.
- The readme FAQ says "GLB/glTF only" and "FBX: No". It's stale.
- **Draco decoder setting** in 3D Viewer has no effect, though Draco models still load. Don't feature the setting.
- `[3d_viewer]` only uses `id`. Don't document other attributes.
- Don't claim dimensions appear **inside** Quick Look or Scene Viewer AR.
- **Presets** apply to WooCommerce products only.
- **Unsourced stats** in the 3D Viewer landing mockup: "+94% conversion", "−40% returns", "66% want 3D". Remove them, or use the sourced ones instead: Rebecca Minkoff/Shopify 44% add-to-cart and 65% orders; Build.com 22% fewer returns. Re-check the links.
- Pick **US or UK spelling** (color/colour, personalize/personalise); assets currently mix both.
- The Configurator snapshot works in **Cart and Checkout blocks** and classic cart/checkout. ⚠️ One asset says the email/admin snapshot is "block checkout only". Test both before claiming.

---

## 12. Open decisions for Raju

1. **Price:**
   - The 3D Viewer landing mockup shows Pro at **$59.99/yr** and Max at **$83.88/yr**.
   - Internal docs say **$49.99**.
   - The Configurator product page still says **"$XX / month"**.
   - Confirm live prices, and decide whether Max is still sold (code calls it "legacy").
2. **Guarantee wording:** there are 4 versions of the 14-day refund. Pick one that matches https://bplugins.com/refund-policy/.
3. **BFCM offer for the Configurator:** keep it as part of the 3D Viewer deal ("included")? Decide on an upgrade offer for Free → Pro users who sell variable products.
4. **Brand look for campaigns:** the logo uses indigo/pink with Inter. The site uses blue `#146ef5` / orange `#ff7a00` with Manrope. Choose one for seasonal creatives.
5. **Pricing page:** `bplugins.com/products/3d-viewer/pricing/` doesn't mention the Configurator yet.
6. **Cross-sell:** 3D Viewer's free and premium readmes don't mention the Configurator. A one-line mention would reach the 9k+ installs.
7. **Halloween:** run a light teaser, or save the energy for the 17 Nov release and BFCM?

---

## 13. Source reports

| Report | Covers |
|---|---|
| [research/01-free.md](research/01-free.md) | Free plugin: every block setting, shortcode, Elementor, WooCommerce, admin, free-vs-Pro gates, roadmap hints |
| [research/02-premium-viewer.md](research/02-premium-viewer.md) | Pro viewer: every block setting, hotspots, AR, camera, lighting, dimensions, mobile, controls, Visual Editor, what's new |
| [research/03-premium-admin-woo.md](research/03-premium-admin-woo.md) | Pro WooCommerce, Elementor, settings, analytics, cloud, licensing, themes, docs topics, screenshot paths |
| [research/04-wc-configurator-code.md](research/04-wc-configurator-code.md) | Configurator: all 13 modules, editor, shopper flow, WooCommerce integration, settings, REST, tech |
| [research/05-marketing-assets.md](research/05-marketing-assets.md) | Existing positioning, 25 emails, videos, tutorials, brand kit, media inventory, claims to verify, gaps |
