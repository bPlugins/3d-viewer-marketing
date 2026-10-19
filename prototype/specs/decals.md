# Personalization: text and image decals

Prototype spec for roadmap item 3 (`resource/COMPETITOR-LANDSCAPE-ANALYSIS.md` §5): customers put their own text or image on an area of the model that the merchant picks.

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `decals` | Merchant-defined areas on a mesh; customer text (font, colour, size) or image upload rendered on the model live; move, scale, rotate; required areas; price per area; stored on the cart line and order; shown in the snapshot and 3D order preview | 6–8 d |

Flag off = the shipped product, unchanged: no editor section, no drawer section, areas and saved content are ignored by the viewer, cart, order and email. Works with or without `option-pricing`, `option-groups` and `order-snapshot`.

## Shared core: `js/shared/decals.js`

The "server" for decals, like `options.js` for options. Prices, rows, validation and sanitising come from here.

| Function | Use |
| --- | --- |
| `decalAreas(config)`, `usesDecals(config)` | Normalised areas of a config; true with the flag on and at least one area |
| `hiddenAreas(config, custom)` | Areas whose mesh the shopper's part choices hide (group "No pillow" or an unticked optional part) |
| `areaContent(area, raw)`, `hasContent(area, content)` | Clamp a customer's content to what the area allows; filled test |
| `sanitizeDecals(config, decals)` | Add-to-cart sanitising: known areas only, filled only, inactive kind dropped |
| `decalErrors(config, custom)`, `firstMissingDecal`, `decalErrorsFor(state, pid, vid, custom)` | Required areas left empty |
| `decalLines(config, custom, base, ctx)`, `hasDecalRules(config)` | Summary rows and prices (merged into `optionLines`) |
| `decalRows(state, item)` | Rows for a line when neither pricing nor groups is on |
| `readImageFile(file)` | FileReader → checked, downscaled data URL (memory only) |

Hooks into existing code (all no-ops with the flag off): `optionLines` appends decal rows, `hasOptionRules` counts area prices, `sanitizeCustom` keeps `decals`, `choiceErrors` adds decal errors, `isEmptyCustom` counts filled areas, `applyShopperChoices` bakes content into the areas, `resolveEffectiveConfig` resolves `decals` as a whole value.

### Merchant config: `config.decals`

```js
decals: [{
  id, label,                       // "Engraving"
  mesh,                            // target mesh name
  placement: {
    side: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom',  // projection direction, in the mesh's local axes
    x, y,                          // 0–1 centre across the mesh's bounding-box face (from that side)
    width, height,                 // 0.05–1 of that face
    rotation,                      // degrees, −180–180
  },
  kinds: ['text'] | ['image'] | ['text', 'image'],
  fonts: ['Inter', 'Georgia', …], // first = default
  colors: ['#1f2937', …],          // first = default
  max_chars: 20,                   // 1–100
  min_size: 0.3, max_size: 1,      // size limits, share of the area
  required: Boolean,
  price?: Rule,                    // options.js rule; charged when the area is filled
}]
```

Fonts: Inter (the plugin's own font), Arial, Georgia, Times New Roman, Verdana, Trebuchet MS, Courier New, Impact, Brush Script MT. Missing keys fall back to: side front, centre, 50 % × 30 %, text only, Inter, `#000000`, 20 characters, 20–100 %.

Variations replace `decals` whole (like `options`), so a variation can have its own areas or none.

### Shopper layer: `custom.decals`

```js
custom.decals = { [areaId]: {
  kind: 'text' | 'image',
  text?, font?, color?,            // kind text
  image?, name?,                   // kind image: data URL (prototype) / uploaded file URL (plugin), file name
  size,                            // min_size–max_size of the area
  x, y,                            // −0.5–0.5 offset of the design inside the area
  rotation,                        // degrees
} }
```

`sanitizeCustom` stores filled areas only (text trimmed and cut to `max_chars`, font and colour forced into the area's lists, numbers clamped). A line with decals is a customized line: its own cart line (identical option picks + identical decals still merge), a snapshot, "View in 3D". While the shopper edits, an area they touched but left empty (kind, font or colour picked) still counts as a customization, so the drawer keeps those picks; it is dropped on add to cart.

An area whose mesh is hidden by a part choice (e.g. Monogram with "No pillow") is inactive: not stored, charged, listed or required; the drawer shows "Not used while Pillow is hidden." and keeps the shopper's design for when the part comes back.

The design is clipped to its area: moving it is limited to the centre staying inside the area, and anything past the edge is cut off (like a print area).

## Engine: `js/engine/decals.js`

- Each filled area is a projected decal: the mesh's front-facing triangles inside the area box (built from `placement` in the mesh's local space) are clipped into a new mesh, child of the target mesh, so it follows the mesh's visibility, animation and transforms. UVs run across the box, so any GLB works without a UV layout.
- The design is drawn into a `CanvasTexture` (aspect of the area): text fitted to the area × size, image contained, both offset and rotated. Text redraws are texture-only; geometry rebuilds only when the placement changes.
- Material: lit `MeshStandardMaterial`, transparent, polygon offset (no z-fighting), not pickable.
- An image or font that fails to load is drawn once without it (no retry loop), so a broken stored file never stalls the viewer, a snapshot or `whenIdle`.
- Live viewer, offscreen thumbnails/snapshots (`whenIdle` waits for images and fonts) and the order preview (content baked by `applyShopperChoices`) all render it.
- `v.decals`: `setPreview({areaId: content}|null)`, `setGuide(areaId|null)` (dashed outline of the area), `areaAt(x, y)`, `areaCoords(id, x, y)`, `facePoint(id, x, y)` for dragging.

## Editor: Inspector section "Personalization"

After "Option Pricing" (or the mesh panel), icon brush, body in `panels/decals.js`. Shown only with the flag on.

- Intro: "Let customers add their own text or image to an area of the model."
- Area cards (like option groups): label, kind badge ("Text", "Image", "Text & image"), "Required" badge, "<mesh> · <side>", up/down, click to expand. The open card is previewed in the viewport with sample content ("Your text" / a placeholder picture) and a dashed outline.
- Expanded: Label (placeholder "e.g. Engraving"); Mesh select + "Use selected mesh"; **Placement**: Side select, sliders Horizontal, Vertical, Width, Height, Rotation, help "Drag the dashed area on the model to move it."; **Customers can add** select (Text / Image / Text & image); for text: Fonts checkboxes (help "Customers start with <font> and the first colour."), Colours (chips + colour field + "Add colour"), Max characters; Size limits sliders "Smallest size" / "Largest size"; Required toggle "Customers must fill this area before adding to cart."; Price rule row ("Charged when the customer fills this area.") with `option-pricing` on; "Delete area" with inline confirm "Are you sure you want to permanently delete this area?".
- Empty state "No personalization areas yet." and "Add area" (uses the selected mesh, else the first mesh).
- Variation target: "Inherited from Default" + "Set personalization for this variation" / "Personalization for this variation" + "Use Default personalization".
- Writes through `editor.replace('decals', list)` (typing and dragging land after a 400 ms pause: one undo step per word or drag).

## Storefront

- **Drawer**: the Customize button shows when the product has areas (even with nothing else to customize). A "Personalize" section, then one block per area: label, `*` when required, price badge. Pills "Text" / "Image" when both kinds are allowed.
  - Text: input (placeholder "Your text", `maxlength`), counter "5/20", "Font" select (each option in its font, shown when the area allows more than one), "Color" bubbles (when more than one). The reset icon next to the label ("Clear <label>") empties the area.
  - Image: "Upload image" button, help "PNG, JPG or WEBP, up to 5 MB."; after upload a thumbnail, the file name and "Remove". Errors (inline, `role="alert"`): "Use a PNG, JPG or WEBP image." / "The image must be 5 MB or smaller." / "The image could not be read. Try another file." The file is read in the browser (FileReader), downscaled to 1024 px, and kept in memory.
  - Adjust (once filled): sliders Size, Rotate, Horizontal, Vertical and "Reset position"; hint "Drag your design on the model to move it." Dragging on the model moves the design inside its area (orbit is paused while dragging).
  - The area being edited shows a dashed outline on the model while the drawer is open.
  - Reset Customizations clears the decals too; picking a variation clears them like other choices.
- **Add to cart** with a required area empty: WooCommerce error notice `“Engraving” is a required field.`, the drawer opens on that area (viewer slide/tab/modal first). Shop-loop and hotspot adds send the shopper to the product page, as for required groups.
- **Price**: area price added when filled (`option-pricing`): drawer "Options" row, product price box, cart line price.
- **Cart, mini cart, checkout (classic and blocks), order received, admin order, emails**: one row per filled area, `Engraving: “Hello” (Inter, #ffffff)` (price appended as for options, swatch dot with `order-snapshot`) and `Back logo: [thumbnail] logo.png`. Without pricing and groups the old "3D Customization" row stays and the decal rows follow it.
- **Snapshot and 3D order preview** show the decals.

## Interactions with other flags

- `option-pricing`: area prices join the quote (drawer "Options", product price box, cart price, frozen order rows). Off: no prices, rows still listed.
- `option-groups`: groups and areas share the drawer (groups first). A product with areas but no groups keeps the plain colour/part lists above "Personalize".
- `order-snapshot`: the picture includes the decals; text rows get the swatch dot of the text colour.
- `undo-redo-drawer`: every decal edit (typing, sliders, drag on the model) goes through the recording setter, labelled with the area.
- Order rows frozen with decal rows are hidden while the flag is off.

## Demo data (`seed.js`)

| Product | Area | Setup |
| --- | --- | --- |
| Ceramic Mug | Front print (Body, front) | Text or image, 4 fonts, 4 colours, 16 characters, +$6 |
| Lounge Chair | Monogram (Pillow) | Text only, 3 characters, Georgia / Brush Script / Times, +$12 |
| Lounge Chair | Back logo (Back_Cushion, upper left) | Image or text, +$25 |
| Oak Side Table | Engraving (Top, from above) | Text only, **required**, +$15 |
| Order #1004 (Sam Patel) | Mug "Hello, Sam" + chair monogram "SP" and an uploaded logo | Frozen rows with prices, snapshots and 3D preview |

## Plugin notes (for the real build)

- New keys only: `decals` in the saved config JSON, `decals` inside the shopper JSON (`wc3d_custom_config`) and on cart/order items. `schema_version` stays 1. Configs, carts and orders without `decals` behave exactly as today.
- PHP: `Sanitizer::sanitize_config` gains `sanitize_decals` (ids `sanitize_key`, mesh names `sanitize_node_name`, numbers clamped, fonts from the allowlist, colours `sanitize_hex_color`). `Sanitizer::sanitize_shopper_config` keeps `decals` for known areas only, text through `sanitize_text_field` + `mb_substr(max_chars)`.
- Images: `wc3d_custom_config` is capped by `MAX_RAW_BYTES`, so the drawer uploads the file first to `POST /wc3d/v1/decal-image` (nonce, mime sniffed with `wp_check_filetype_and_ext` + `getimagesize`, PNG/JPEG/WEBP only, no SVG, 5 MB, re-encoded with `wp_get_image_editor` to max 1024 px) into `uploads/wc3d/decals/` (not the Media Library) and posts only the returned file URL. Unreferenced uploads older than a day are removed by a cron (opt-in, like snapshots).
- `woocommerce_add_to_cart_validation` adds required-area errors (`“%s” is a required field.`); `woocommerce_add_cart_item_data` stores the sanitised decals; `woocommerce_get_item_data` and `woocommerce_checkout_create_order_line_item` add one row per area (`_wc3d_decals` hidden meta with the content, visible meta `Engraving` → `“Hello” (Inter, #ffffff)`); the image row prints a thumbnail through `woocommerce_order_item_name` / Store API `item_data` with a sanitized `<img>`.
- Price: area rules join the option-pricing recompute in `woocommerce_before_calculate_totals`; never read from the request.
- `EffectiveConfig.php` / `resolveEffectiveConfig.ts`: `decals` whole value; `apply_shopper_choices` bakes `content` into the areas so `OrderPreview` renders them.
- Target mesh: `mesh` names a single three.js `Mesh`. A glTF mesh with several materials loads as a `Group` of primitives; the editor must list the primitives (as the mesh tree does), or the layer projects onto every child mesh of the named node. Skinned/morphed meshes are out of scope for v1.
- Hidden parts: `apply_shopper_choices` visibility decides which areas are active; add-to-cart validation, the cart item data and the price recompute skip areas whose mesh is hidden, like option groups whose targets are hidden.
- Order rows: the prototype freezes decal rows only with `option-pricing` or `option-groups` (else it recomputes them from the current config). The plugin always writes the visible meta at checkout, so renaming or deleting an area later never changes an order.
- TS engine: a `DecalLayer` next to `ModelController` (projected geometry + `CanvasTexture`), driven by `effectiveConfig.decals`; `DecalGeometry` from three/addons is an alternative but does not drop back-facing triangles.
- Web fonts: the Inter file ships with the plugin; other fonts are system fonts, so the drawer only offers what renders. Canvas text waits for `document.fonts.load()`.
- Text is user content: escape everywhere it is printed (`esc_html`), never in HTML attributes without `esc_attr`.

## Open questions

- Keep decals when the shopper switches variation (today every choice is cleared)?
- Several text lines per area, or a curved text path for mugs?
- UV-region placement (paint into the mesh's own texture) as a second placement mode for merchants with UV-mapped print areas.
