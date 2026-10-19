# Customizer commerce: option pricing, option groups, cart and order snapshot

Prototype spec for roadmap items 1, 2 and 4 (`resource/COMPETITOR-LANDSCAPE-ANALYSIS.md` §5).
Built in this order, each behind its own flag in `js/core/features.js`:

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `option-pricing` | Charge extra per colour or part (fixed or %), live total, server decides the price | 4–6 d |
| `option-groups` | Merchant-defined groups (label, thumbnail, display, default, required, price) instead of the raw mesh list | 5–7 d |
| `order-snapshot` | Picture of the configured product + summary on the cart line, Cart/Checkout blocks, order and email | 2–3 d |

Every flag off = the shipped product, unchanged. Flags combine: groups without pricing shows groups with no prices; pricing without groups prices the plain list.

## Shared core: `js/shared/options.js`

This module is the "server". Every price, summary row and validation message comes from it. UI code never adds prices itself.

| Function | Use |
| --- | --- |
| `optionFlags()` | `{pricing, groups}` from the prototype flags |
| `normalizeRule`, `ruleAmount(rule, base)`, `ruleRegular(rule, base)`, `formatDelta(n)` | Price rule maths and the `+$15.00` / `−$12.00` badge text |
| `pricingOf`, `hasPricing`, `colorPrice(config, mesh, hex, base, palette)`, `togglePrice(config, mesh, base)` | Pricing on the plain list |
| `groupsOf`, `usesGroups`, `selectedChoices`, `groupLayer`, `inactiveGroups`, `shopperLayer`, `sanitizeCustom`, `validateChoices` | Option groups |
| `optionLines(config, custom, base, ctx)`, `quote(...)`, `quoteFor(state, pid, vid, custom)`, `lineUnitPrice(state, item)`, `basePriceOf` | Summary rows and prices |
| `isEmptyCustom(c)` | Shopper layer empty test that also counts `options` |
| `materialBallUrl(material)`, `suggestGroups(config, palette)` | Swatch picture; groups built from the old per-mesh flags |

`effectiveFor()` already resolves `pricing` and `options` (variation value replaces the default's whole value, like `hotspots`).

### Price rule

```js
{ type: 'fixed' | 'percent', amount: Number, sale?: Number }
```

- `amount` may be negative (a discount, e.g. "No pillow −$15").
- `percent` is a percentage of the line's base price (variation price, else product price).
- `sale` set → charged amount is `sale`, the badge shows `amount` struck through.
- Rounded to cents. A line total never goes below $0.

### Pricing on the plain list: `config.pricing`

```js
pricing: {
  parts: { [mesh]: { color?: Rule, toggle?: Rule } },  // recolour surcharge / show-or-hide surcharge
  colors: { [lowercase #hex]: Rule },                   // premium for a palette colour, per part painted with it
  custom_color?: Rule,                                  // free colour picker, per part
}
```

A shopper change costs money only when it differs from the default: a recolour charges `parts[mesh].color` plus either the colour's premium (palette colour) or `custom_color` (picker colour). Picking the default colour again is free. Showing a hidden optional part or hiding a shown one charges `parts[mesh].toggle`.

### Option groups: `config.options`

```js
options: [{
  id, label, description?,
  type: 'color' | 'material' | 'parts',
  display: 'swatch' | 'thumbnail' | 'button' | 'dropdown',
  targets: [mesh],          // meshes the group paints, or the meshes a parts group switches
  required: Boolean,        // no default + required → add to cart refused until picked
  default: choiceId | '',
  choices: [{ id, label,
    color?: '#hex',                                   // type color
    material?: { baseColor, roughness, metalness },   // type material
    show?: [mesh],                                    // type parts: targets in `show` visible, others hidden
    thumbnailId?: attachmentId,                       // image shown for display 'thumbnail'
    price?: Rule }],
}]
```

- With the flag on and at least one group saved, the drawer shows groups only. The plain "Colors & Materials" / "Options & Parts" lists and the global palette are not shown for that product.
- A group's chosen choice is the shopper's pick, else the default, else none. Choice prices are added as they are, so a default with a price is included from the start (merchants usually leave defaults at $0).
- A colour or material group whose every target is hidden by a parts choice is inactive: shown greyed out in the drawer, not listed, not charged and not required (e.g. "Pillow fabric" while "No pillow" is picked).

### Shopper layer (cart item `custom`)

```js
{ materials?, meshes?,          // what the viewer renders (as today)
  options?: { [groupId]: choiceId } }  // groups only
```

On add to cart `sanitizeCustom()` drops unknown picks, stores every resolved option and bakes `materials`/`meshes` from them, so the order preview and the old "3D Customization" summary keep working. The posted form carries choices only, never a price: `lineUnitPrice()` recomputes the line from the saved rules (the plugin does this in `woocommerce_before_calculate_totals`).

At checkout each order item freezes what was charged: `basePrice`, `total`, `options: [{key, label, value, swatch?, amount, regular?}]` (the `optionLines` rows) and, with the snapshot, `snapshotId`. Later rule changes never change an order.

## Feature 1: Option pricing (`option-pricing`)

### Editor: Inspector section "Option Pricing"

New section in `inspector.js` (after the mesh panel, before "Scene & Lighting"), body in `panels/pricing.js`. Shown only with the flag on.

- Intro line: "Charge extra when customers change a part. Prices are added to the product price in the cart."
- **Part prices**: one row per mesh marked "Customizable on Frontend" (label "Recolor <Part>") and per mesh marked "Toggleable on Frontend" (label "Remove <Part>" when the part is shown by default, "Add <Part>" when hidden). Each row: a rule editor. Empty state when no mesh is flagged: "Mark a mesh as Customizable or Toggleable on Frontend to price it."
- **Colour premiums**: the global palette swatches, each with a rule editor (empty = no premium), plus "Custom colour (picker)".
- **Rule editor** (one compact row): amount input, type select (`$` fixed / `%` of price), optional "Sale" amount behind a "Sale price" link. Negative amounts allowed; help text "Use a negative amount for a discount."
- Variation target: shows "Inherited from Default" with "Set prices for this variation" (copies the default's rules into the variation) and, once overridden, "Use Default prices" (removes the variation's `pricing`).
- Writes through `editor.patch('pricing', …)` / `editor.replace('pricing', …)` so undo/redo, dirty state and Save work like every other section.

### Storefront

- **Drawer**: each swatch gets a price badge (only when non-zero, e.g. `+$15.00`, sale shown as struck regular + sale); the swatch `title` reads "#ef4444 · +$25.00". Toggle rows show the toggle price next to the label. The footer gains an "Options" row above "Reset Customizations": `Options +$40.00`.
- **Product page**: under the variation price and above the quantity/button, a price box (`.wc3d-price-summary`) shown when the product has any rule: rows "Product" (base), "Options" (signed sum), "Total" (bold). Updates live as the shopper changes the drawer or the variation. For a variable product with no variation picked: "Choose an option to see the total."
- **Cart, mini cart, checkout**: unit price and subtotal use `lineUnitPrice`. Item data shows one row per option line instead of the single "3D Customization" text: `Seat Cushion: #ef4444 (+$15.00)`, sorted as listed. Zero amounts show no price.
- **Order received, admin order, orders list preview**: rows from the frozen `item.options` (fall back to `optionLines` for old orders, then to the old summary).
- Prototype hint (`ProtoHint`) on the product page: "The total is a preview. The form posts only the choices; the server recomputes the price from the saved rules."

## Feature 2: Option groups with swatches (`option-groups`)

### Editor: Inspector section "Customer Options"

Body in `panels/options.js`, section placed above "Option Pricing" (both after the mesh panel). Shown only with the flag on.

- Group list: cards with drag handle (or up/down buttons), label, type badge, "N choices", "Required" badge, target mesh count. Click a card to expand it.
- Expanded group: Label, Description (optional), Type (Colour / Material / Parts), Display (Swatches / Thumbnails / Buttons / Dropdown), Applies to (chips of target meshes; "Use selected meshes" takes the tree selection; clicking a chip selects that mesh in the viewport), Required toggle, Default (select of choices + "None"), delete group (confirm inline).
- Choices list inside a group: label, value editor by type (colour field; material = colour + roughness + metalness sliders; parts = checkboxes of the group's targets to show), thumbnail (media picker, image) shown for Thumbnails display, price rule editor (only when `option-pricing` is on), reorder, remove, "Add choice".
- "Add group" button. Empty state: "No option groups yet. Customers see the meshes marked Customizable or Toggleable." with "Create from customizer settings" (calls `suggestGroups`, appends, non-destructive) and "Add group".
- Choosing a choice row previews it in the viewport (temporary, cleared on collapse).
- Variation target: inherited/override pattern as for pricing ("Set options for this variation" / "Use Default options").
- Writes through `editor.replace('options', list)`.

### Storefront

- The Customize button shows when the product has groups even with no customizable meshes (the mug).
- Drawer sections, one per group: title = label + `*` when required, the selected value after it in muted text ("Frame finish · Walnut"), optional description, then the choices in the group's display:
  - Swatches: round colour bubbles (existing bubble style) with price badges.
  - Thumbnails: tiles with image (`thumbnailId` → attachment image, else `materialBallUrl`), label, price.
  - Buttons: pill buttons with label and price.
  - Dropdown: a select, prices in the option text ("Black (+$2.00)").
- Selected state: `aria-pressed`/`aria-checked`; each group is a `role="radiogroup"` with an accessible name.
- Inactive group: greyed, choices disabled, note "Not used with <choice label>".
- Reset Customizations returns every group to its default.
- Add to cart with a required group unpicked: WooCommerce error notice `“Glaze” is a required field.` and the drawer opens on that group.
- Viewer renders `shopperLayer(config, custom)`, so defaults show from the first frame.

## Feature 3: Cart and order snapshot (`order-snapshot`)

- **Capture**: on Add to cart (product page, shop-loop AJAX add, hotspot linked-product add, Order again), a 600×600 JPEG of the configured product, auto-framed like the product thumbnails (offscreen render of the effective config + the stored shopper layer, the same for every shopper; product background colour). Identical pictures are stored once is stored in `state.snapshots[id]` and the cart line gets `snapshotId`. The plugin uploads it to `uploads/wc3d/snapshots/` (not the Media Library) and stores the path on the cart item and order item meta `_wc3d_snapshot`. Lines without a picture (old carts and orders) keep the WooCommerce product image.
- **Cart (classic)**, mini cart, **checkout** review: line image = snapshot; option rows as in feature 1 (with the swatch dot); a "View in 3D" link on the cart line opens the 3D preview modal of the configured product.
- **Cart and Checkout blocks**: new block-based pages (`wp-block-woocommerce-cart` / `-checkout` markup) chosen by the demo store setup switch ("Cart page: Classic / Blocks" in the prototype bar on storefront screens; it is store setup, not a plugin feature, so it works with every flag off). The plugin fills them through the Store API (`item_data` via `woocommerce_get_item_data`, image via `woocommerce_store_api_cart_item_images`). With the flag off, blocks show the product image and the single "3D Customization" row, as the shipped plugin does.
- **Order received** and **admin order**: line image = snapshot, option rows, existing "View 3D Preview" kept. Admin order item: "View image" link opens the snapshot in a modal (the plugin may also offer the file).
- **Emails**: customer "Processing order" and admin "New order" previews (`#store.email.<order>.<customer|admin>`) with product image, option rows and prices in the order table, linked from order received and the admin order's Order actions.
- **Order again** (completed orders on order received): adds the lines back with their stored options and snapshot, as saved (no re-sanitising, no required-group check, so old orders keep their plain-list lines). WooCommerce hides its own button on the thank-you page, so the plugin prints one there; on My Account → View order it hooks `woocommerce_order_again_cart_item_data`.

## Plugin notes (for the real build)

- New keys only: `pricing` and `options` inside the saved config JSON, `options`/`_wc3d_snapshot` on cart and order items. `schema_version` stays 1. Configs, carts and orders saved before the update behave exactly as today.
- Price is never read from the request. `woocommerce_before_calculate_totals` (guarded with `did_action` so it runs once per calculation) sets `price = base + recomputed options`.
- `resolveEffectiveConfig.ts` and `EffectiveConfig.php` gain the two whole-value keys; keep both twins identical.
- Cart lines: customized plain-list lines never merge (`wc3d_unique_key`), but lines whose option-group picks are identical do merge, so `wc3d_unique_key` must skip lines that carry `options`.
- Lines and orders saved before option groups carry no `options` and keep the plain list (`lineFlags`), even with groups switched on.
- Groups apply only where the shopper sees the drawer (3D available and customizer on for the product); elsewhere the line is priced and summarised as a plain product.
- Thumbnails on order screens: WooCommerce's order-details and email tables have no image column, so the plugin prepends the picture through `woocommerce_order_item_name` (and `woocommerce_email_order_items_args` `show_image` for emails) instead of overriding templates. The prototype draws a column for clarity.
