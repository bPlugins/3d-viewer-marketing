# AR of the configured product

Prototype spec for roadmap item 5 (`resource/COMPETITOR-LANDSCAPE-ANALYSIS.md` §5): build the AR file from the scene the shopper is looking at, instead of the base model.

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `usdz-export` | iOS Quick Look gets a USDZ and Android Scene Viewer a GLB built on the device from the configured scene; desktop QR link carries the design | 3–4 d |

Flag off = the shipped product, unchanged (the AR button, Quick Look / Scene Viewer hand-off and QR modal behave as today, and the prototype device switch is hidden).

## When a file is built

"Configured" = what the viewer shows differs from the uploaded files:

1. the shopper layer is not empty (plain-list colours or hidden parts, option-group picks and defaults, any later shopper keys such as decals), or
2. a variation is picked that has no USDZ of its own and either has its own model (`model_id`) or a config that changes `meshes`/`materials`. Otherwise iOS would open the product's USDZ, which shows a different model or look.

| Device | Configured | Not configured |
| --- | --- | --- |
| iPhone / iPad | Build USDZ → Quick Look | Uploaded USDZ → Quick Look (as today). No USDZ uploaded → build from the base scene, so the AR button now shows on iOS without a USDZ |
| Android | Build GLB → upload → Scene Viewer | Uploaded GLB → Scene Viewer (as today) |
| Desktop | QR modal; the link carries the variation and the design | QR modal with the page link (as today) |

The build only runs when the global setting is on and the product (or variation) has not opted out. Otherwise everything works as today.

## Data (new keys only)

| Where | Key | Shape | Default when absent |
| --- | --- | --- | --- |
| `wc3d_settings` | `ar_configured` | `bool` | `false` (old installs keep today's AR). Seed sets `true` for the demo |
| Saved config `ar` (product default + variation diff, field-merged like the other `ar` fields) | `configured` | `false` only; absent = follow the setting | follow the setting |
| Cart / order | none | | |

`schema_version` stays 1. `ar.enabled`, `usdzId`, `usdzUrl`, `scale` keep their meaning; `scale: 'fixed'` still adds `#allowsContentScaling=0` / `&resizable=false`.

Prototype-only store setup (not plugin data): `demo.arDevice` (`'desktop' | 'ios' | 'android'`, default desktop) and `demo.arFail` (bool) from the prototype bar.

## Settings: Customer Drawer section

New toggle row after "Quick Color Selection Palette" (shown only with the flag on):

- Title: **AR shows the customer's configuration**
- Description: "iPhone, iPad and Android build the AR model from what the shopper sees: colors, materials, chosen options and hidden parts. With nothing changed, or if the phone can't build it, AR opens the uploaded USDZ or GLB."
- Field `wc3d_settings[ar_configured]`, sanitized as a boolean.

## Editor: "AR & Quick Look" panel

Below "Allow resizing in AR", while AR is enabled (flag on):

- Toggle **Show the customer's design in AR**, description "Off always opens the uploaded files." Writes `ar.configured: false` (on = removes the key). Disabled when the global setting is off, with the note: Turn on "AR shows the customer's configuration" in Settings → Customer Drawer first. (link to the section).
- Status list (one line per device), e.g.
  - iPhone & iPad: "Generated on the device from the configured scene. Uploaded USDZ used when nothing is changed." / "Generated on the device from the configured scene (no USDZ uploaded)."
  - Android: "Generated GLB, uploaded for Scene Viewer. Uploaded GLB used when nothing is changed."
  - Off: "Uploaded USDZ" / "Uploaded GLB" (today's behaviour).
- The empty-USDZ help text changes, when the build is on, to: "No USDZ uploaded. iPhone and iPad get one built from the model on the device."
- **Test AR export** button: exports the editor viewport's current scene (the active target, as previewed) to USDZ and GLB and shows size, time and warnings, e.g. "2 parts use a material Quick Look can't show and will be left out." or "Every visible part exports to both formats." Useful for checking a model before turning the setting on.

## Storefront

AR button (`.wc3d-ar-btn`) visibility with the build on: `ar.enabled && (device !== 'ios' || usdzUrl || build allowed)`.

On tap:

1. Not configured → today's path (uploaded file). The prototype shows what happens in a sheet (see below).
2. Configured → the button switches to a busy state: spinner + **Preparing AR…**, `aria-busy="true"`, disabled. The export runs from the live viewer scene (`USDZExporter` with `quickLookCompatible: true` / `GLTFExporter` binary, `onlyVisible`) on the model node, so it contains exactly what is on screen. Android then uploads the GLB (**Uploading for Scene Viewer…**).
3. The result is cached per configuration (product, variation, model, resolved meshes/materials, shopper layer, format), so a second tap is instant. The cache lives for the page view; the plugin keeps the last 8 builds and revokes their blob URLs on eviction.
4. Hand-off: iOS `openQuickLook(blobUrl, lockScale)` (Quick Look accepts a blob URL, the same approach model-viewer uses). Android `sceneViewerIntent(uploadedUrl, lockScale)`.
5. Failure (exporter throws, takes over 20 s, or the file is over 50 MB) → fall back to the uploaded file with the reason ("Couldn't build the AR file: <reason> Showing the standard model instead."). iOS without a USDZ → a notice over the viewer for 6 s: "AR isn't available for this design right now. <reason>" (no hand-off).

Desktop QR modal (flag on, configured): same title and text as today, plus "This link opens your design:" with the design rows, the link (`<permalink>?attribute_…=…&wc3d_ar=<base64url>`), and **Copy link**. The QR is drawn from that link. Only the shopper's own picks travel (`custom`: plain-list colours/parts, option-group picks, later keys); group defaults and the variation look are rebuilt on the phone. On the phone the plugin restores the variation (WooCommerce `attribute_*` params) and the design (sanitized like a cart line), then shows the AR button as usual. With `saved-designs` the link becomes the saved design's short link. A link over 2,000 characters (e.g. an uploaded decal image) can't be a QR code or pass server URL limits: the prototype then shows "Your design is too large for a link. This link opens the product without it:" and drops `wc3d_ar`; the plugin should use the saved-design short link there.

### Prototype only

- Prototype bar (storefront, flag on): **AR device: Desktop / iPhone / Android** and a **Fail export** checkbox. It replaces `detectArDevice()` for the viewer.
- Instead of Quick Look / Scene Viewer, a sheet shows what the phone would do (marked "Prototype"):
  - Title "AR Quick Look" (iOS) or "Scene Viewer" (Android).
  - 3D preview of the generated file itself (re-loaded with `USDZLoader` / `GLTFLoader`), auto-rotating, draggable.
  - Rows: File (`lounge-chair-configured.usdz`), Size, Built in (`0.42 s` or "Cached, instant"), Source ("Generated on this device from the configured scene" / "Generated on this device from the model (no USDZ uploaded)" / "Uploaded USDZ" / "Uploaded GLB"), Why (uploaded file: "Nothing is changed from the uploaded model." / "Building the AR file is turned off for this product."), Design (variation + option rows; "Not shown" after a failure), Scale ("Locked to real-world size" / "Shoppers can resize it").
  - Uploaded file: the product image stands in for the preview ("Uploaded model, as first set up").
  - Android adds "Uploaded to" (`/wp-content/uploads/wc3d/ar/<hash>.glb`) and the intent URL.
  - Footer note: iOS "On an iPhone, Quick Look opens now and places this model in the room. The file is built in the browser; nothing is uploaded." Android "On Android, Scene Viewer opens now with this file."
- The QR modal adds "See what the phone does with this link: **Open as iPhone** / **Open as Android**", which switches the device and runs that flow with the same design.

## Cart and orders

No change. The cart line, order and snapshot are untouched by AR.

## Interaction with other flags

- `option-groups`: the layer includes group defaults, so a grouped product is always "configured" and always builds. Design rows come from `optionLines`.
- `option-pricing`: no effect (AR shows no prices).
- `order-snapshot`: independent. Both read the same configured scene; a later step could reuse one offscreen render.
- Any feature that adds shopper keys to `custom` (decals, materials-variants) is exported automatically as long as it renders inside the model node, and invalidates the cache through the layer key.

## Plugin notes (for the real build)

- **Settings**: `includes/Settings/Options.php`: `Options::DEFAULTS` gains `'ar_configured' => false` and the boolean loop in `Options::sanitize()` gains `'ar_configured'`. Settings template row in the Customer Drawer section. Absent on old installs = off (sanitize starts from `DEFAULTS`), so AR behaves as today until the merchant turns it on.
- **Config**: `ArConfig.configured?: false` in `src/shared/schema/types.ts`; `Sanitizer::sanitize_ar()` keeps it only when explicitly `false` (see below). `resolveEffectiveConfig.ts` / `EffectiveConfig.php` already field-merge `ar`. `src/admin/editor/components/ImportExportControls/validateConfig.ts` (import) accepts it. A variation diff can only add `false`; a variation can't turn the build back on when the product default opted out.
- **Sanitizer**: `Sanitizer::sanitize_ar()` uses `isset()`, so it must add `if ( isset( $ar['configured'] ) && ! $ar['configured'] ) $out['configured'] = false;` (never store `true`).
- **Localized data**: `includes/Frontend/Assets.php` settings array gains `'ar' => [ 'configured' => (bool) $settings['ar_configured'] ]` next to `customizer`.
- **Frontend** (`src/frontend/ar.ts`, `components/ArButton.tsx`):
  - `isArButtonVisible(ar, device, canBuild)` in `components/ArButton.tsx` (called from `Viewer.tsx` with `activeAr`); `ArButton`'s iOS branch builds when configured instead of calling `openQuickLook(ar.usdzUrl, …)` directly.
  - "Configured" needs the variation record (`model_id`, own `ar.usdzUrl`, own meshes/materials), not only the resolved config: pass it with the variation data the viewer already receives.
  - New lazy chunk `ar-export.ts` (`USDZExporter`, `GLTFExporter` from `three/examples/jsm`, fflate comes with it): `buildArFile(scene, format)`, per-configuration cache, 20 s timeout. Loaded on first tap only, so the viewer bundle does not grow.
  - Export the model group (not the scene), so lights, shadows, floor, hotspots and helpers are left out. R3F gives access through the existing model ref.
  - iOS: Quick Look must open from the tap. The export usually finishes within the gesture window; if Safari blocks the late click, keep the blob and switch the button to **Open AR** for a second tap.
- **Android upload**: REST `POST wc3d/v1/ar-file` (nonce, product id, GLB body). Server checks the product has AR on and the setting is on, GLB magic + JSON chunk, size ≤ 50 MB and ≤ 3× the source model, rate limit per IP; stores `uploads/wc3d/ar/<sha1>.glb` (content hash = dedupe), returns the URL. Daily cron deletes files older than 24 h (generated cache, never user data). Fallback if the request fails: uploaded GLB with reason. Alternative to evaluate: WebXR in Chrome instead of Scene Viewer (no upload).
- **QR link**: `wc3d_ar` query param = base64url JSON `{v, c}` (variation id, shopper layer). On load, sanitize like a cart line (`sanitizeCustom`) and drop it if invalid; never trust prices from it (there are none).
- **Analytics hook** (roadmap item 14): `do_action`/JS event `wc3d_ar_launch` with `{source: 'generated'|'uploaded', device, cached}`.
- Backward compat: no data migration; old configs (no `configured`), old settings (no `ar_configured`), carts and orders behave exactly as today.
