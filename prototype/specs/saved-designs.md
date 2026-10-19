# Share link and saved designs

Prototype spec for roadmap item 8 (`resource/COMPETITOR-LANDSCAPE-ANALYSIS.md` §5): a short link that reopens a configured product, plus an optional "Saved designs" list in My Account.

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `saved-designs` | Share design (short link, copy, QR), restore on the product page, My Account → Saved designs, admin settings and list | 3–4 d |

Flag off = the shipped product, unchanged: no Share button, no "My account" header link, no settings rows, `?wc3d_design=` ignored. Records are stored server side (not a config blob in the URL), so links stay short and old links keep working after the product setup changes.

## Data (new keys only)

### Design record: `state.savedDesigns[code]` (plugin: `wp_wc3d_saved_designs` table)

```js
{ code: 'V3G2JA',        // 6 chars from 23456789ABCDEFGHJKLMNPQRSTUVWXYZ (no 0/O/1/I)
  seq: 2,                // creation counter (the prototype derives the code from it)
  productId: 101, variationId: 203,   // 0 = simple product or no variation picked
  custom: { … } | null,  // the shopper layer, stored as-is (see below)
  created: '2026-09-24 20:14',
  customerId: 1,         // 0 = anonymous share link
  name: 'Living room chair',          // account designs only
  views: 3, lastViewed?: '2026-10-01 08:12' }
```

- **custom** is copied generically: every key the shopper layer has (`materials`, `meshes`, `options`, and later `decals`, `variant`, …) round-trips untouched. With option groups in use it is first run through `sanitizeCustom()` and merged back (`{...custom, ...sanitized}`), so every group pick is explicit (defaults included) and the baked `materials`/`meshes` make the design look right with groups switched off too. Without groups a stray `options` key is dropped, like add to cart does.
- **Identical designs share one code.** Key = product + variation + canonical JSON of `custom` (sorted keys). An anonymous share reuses an unexpired anonymous record; "Save to my account" reuses the customer's own record. Account records and anonymous links are separate rows, so deleting a saved design never breaks a link someone else holds, and vice versa.
- **Code**: the prototype scrambles `seq` (bijective 30-bit mix → 6 base-32 chars) so codes are unique and deterministic. `seq` comes from `state.savedDesignSeq`, a counter that never goes down, so a deleted record's code is never given to another design (an old link must not open someone else's design). The plugin uses random codes (`random_int` over the same alphabet, retry on the unique key); it should also skip codes that were used before (keep deleted codes in a small `wc3d_design_codes_used` check, or accept the ~1 in 10⁹ chance and say so).
- **Expiry**: an anonymous link expires `share_link_lifetime` days after `created` (computed at read time, so changing the setting applies to existing links). Designs in an account never expire. The prototype never purges, so raising the lifetime revives expired seed links (JY6DAE); in the plugin the daily purge deletes them first.
- **Picture**: the prototype renders the thumbnail on the fly (`renderSnapshot`, cached). The plugin saves a 600×600 JPEG to `uploads/wc3d/designs/<code>.jpg` when the record is created and also uses it as `og:image` on the shared product URL.

### Customers (prototype only)

`state.customers[id] = {id, name, email}` and `state.demo.customerId` (1 = logged in as Nadia Rahman, 0 = guest). The plugin uses the WordPress user.

### Settings (`wc3d_settings`)

| Key | Default | Meaning |
| --- | --- | --- |
| `share_links` | `true` | Show "Share design". Off hides the button only; links already shared keep working until they expire. |
| `share_links_account` | `true` | "Save to my account" and the My Account tab. "Save to my account" lives in the share sheet, so with `share_links` off customers keep their list but cannot add to it. |
| `share_link_lifetime` | `90` | Days; `0` = never. Choices: 30 days, 90 days, 6 months, 1 year, Never. |

Missing keys read as the defaults, so existing installs need no migration.

## Storefront

### Share design

Shown with the flag on, `share_links` on, a 3D model and the customizer enabled for the product:

- **Customer drawer** footer: a full-width "Share design" button under the Options total, above the undo/redo row (`undo-redo-drawer`) and "Reset Customizations".
- **Product page**: a "Share design" link under the add-to-cart form (`woocommerce_after_add_to_cart_form`). It shares the current variation and choices; a variable product with no variation picked shares the product with its default look. Shown only when the drawer has something to pick (customizable or optional meshes, option groups or personalization areas), the same test as the viewer's Customize button. The block theme's Single Product template prints it under the cart form too. On phones, when the drawer footer also has the options total and Undo/Redo, the drawer button shrinks to an icon beside the total.

Clicking creates (or reuses) the record, then opens the share sheet (`.wc3d-ar-modal` shell, focus trapped, Escape closes from anywhere on the page; fullscreen is left first so the sheet is visible):

- Title "Share your design"; thumbnail, line name ("Lounge Chair - Teal") and up to three option rows ("Frame finish: Walnut") plus "+N more".
- "Link" field (read-only, select on focus): `https://demo-store.test/?wc3d_design=V3G2JA`, button "Copy link" → "Copied" for 2 s (clipboard in try/catch, `execCommand` fallback; on failure the field is selected and the button reads "Press Ctrl+C to copy").
- QR of the link (`qrSvgUrl`, look-alike) with "Scan to open this design on a phone."
- Account block (`share_links_account` on):
  - logged in: "Save to my account" → inline "Design name" field (prefilled with the product name) + "Save" / "Cancel" → "Saved to your account." + "View saved designs". If the same design is already saved: "Already in your saved designs as “Living room chair”." + "View saved designs".
  - guest: "Log in to save this design to your account." with a "Log in" link.
- Note: "Anyone with the link can open this design. The link expires on December 27, 2026." (no date when lifetime is Never).
- Prototype hint: "Copy link copies the store address. To try the link here, use Open link." + "Open link" (`#store.design.<code>`).

### Opening a link

`https://store/?wc3d_design=CODE` (prototype `#store.design.CODE`) redirects to the product (`#store.product.<slug>.design.CODE`, plugin: product permalink with `?wc3d_design=CODE`). On the product page:

- The variation's attributes are preselected and the shopper layer is set to the record's `custom` before the first render: the price box, the hidden `wc3d_custom_config` input and Add to cart work at once, without opening the viewer.
- The viewer mounts at once (no poster click) and keeps the restored layer; a product-tab placement opens the "3D View" tab. The drawer shows the restored choices.
- Notice (info): "Design V3G2JA loaded." with the button "Start over" (plain product URL).
- The record's `views` goes up by one and `lastViewed` is set.
- Variation deleted or no longer matching: product with no variation picked, plus "Some choices in this design are no longer available." Option picks that no longer exist fall back to the group default (existing `selectedChoices` behaviour) and are dropped at add to cart.
- Unknown code or expired link: plain product (or the shop for `#store.design.CODE`) with the notice "This design link has expired or does not exist."
- Product deleted, not published or without 3D: shop with "This design is no longer available."
- Picking another variation clears the restored choices (existing behaviour); "Reset Customizations" clears them too.

### My Account (`#store.account`, endpoint `saved-designs`)

The demo theme gets a minimal WooCommerce My Account page (header link "My account", flag on): navigation Dashboard, Orders, Saved designs (`share_links_account` on), Log out. Guest: the WooCommerce "Login" form (prefilled demo user; any password).

**Saved designs** (`#store.account.saved-designs`), newest first, one card per design:

- Thumbnail, name (with "Rename"), product and variation link, option rows, current price (live quote; option-pricing on), "Saved September 24, 2026 · Code V3G2JA".
- Actions: "Open" (product page with the design), "Add to cart" (normal add with the stored choices; required-group errors send the shopper to the product page with the design loaded and the errors shown), "Copy link" ("Copied"), "Delete" → inline "Delete this design? Its link stops working." + "Delete" / "Cancel".
- Rename: inline field + "Save" / "Cancel"; empty names fall back to the product name.
- Product gone: card stays with "This product is no longer available." and only "Delete".
- Empty state (WooCommerce info box): "No saved designs yet. Customize a product, choose Share design, then Save to my account." with "Browse products".

## Cart and orders

- Unchanged. Opening a design only presets the form; Add to cart goes through the normal path (sanitising, required groups, option prices recomputed server side, order snapshot captured). The record is never linked to a cart line or order, and deleting or expiring a design never touches carts or orders.
- Price is never stored in a record: a link opened later shows today's prices.

## Admin

### Settings → Customer Drawer (flag on)

Rows under the palette, same `.wc3d-row` style:

- "Share links" toggle — "Show a Share design button in the customer drawer and under Add to cart. The link opens the product with the customer's choices."
- "Saved designs in My Account" toggle — "Logged-in customers can save designs and find them under My Account → Saved designs."
- "Link lifetime" select — "Shared links stop working after this time. Designs saved to an account do not expire."
- "Saved designs" — "4 shared links, 3 saved in customer accounts." + "View saved designs" (`#admin.designs`).

### Saved designs list (`#admin.designs`)

WP list table under WooCommerce → 3D Models: views All / In accounts / Shared links / Expired; columns Design (picture, code, row actions "View on store | Copy link | Delete"), Product, Customer ("Guest" for links), Created, Expires ("Never" / date / "Expired"), Views. "Delete expired links" with inline confirm ("Delete 1 expired link? This cannot be undone." → notice "1 expired link deleted."). Row delete uses an inline confirm too.

## Interactions with other flags

- `option-groups`: `custom.options` round-trips; stored sanitised with baked materials (see Data).
- `option-pricing`: the share sheet and account list show today's quote; nothing frozen in the record.
- `order-snapshot`: same renderer for the design picture; the cart line still captures its own snapshot on add.
- Future shopper-layer keys (`decals`, material variants, …) round-trip because `custom` is copied whole and dedupe uses canonical JSON. Their owners must keep `custom` JSON-only (attachment ids, not blobs) and teach `isEmptyCustom` about their key.

## Plugin notes (for the real build)

- **Table** `{$wpdb->prefix}wc3d_saved_designs` via `Installer::create_tables()` (dbDelta), bump `DB_VERSION`; no data migration: `id BIGINT AUTO_INCREMENT, code CHAR(6) UNIQUE, product_id, variation_id, customer_id (0 = guest), name VARCHAR(191), custom LONGTEXT (JSON), config_hash CHAR(64) (sha256 of product|variation|canonical JSON, indexed with customer_id for dedupe), snapshot VARCHAR(255), views INT, created_at, last_viewed_at`. New `Data/SavedDesignRepository.php` (extends `AbstractRepository`).
- **REST** `wc3d/v1/designs`: `POST` (create or reuse, any visitor, nonce + rate limit per IP for guests; body = product_id, variation_id, custom; the server runs the same sanitiser as `woocommerce_add_cart_item_data`), `GET /designs/{code}` (public, returns variation + custom), `PATCH/DELETE /designs/{code}` (owner only), admin list via `manage_woocommerce`.
- **Restore**: `template_redirect` reads `wc3d_design` on the home URL and 302s to the product permalink with the query arg; on the product page `ViewerBootstrapBuilder` adds `design: {code, variationId, custom}` to the bootstrap so the viewer preselects the variation (WC form `default_attributes` filter `woocommerce_product_get_default_attributes` for that request) and seeds `useCustomizer` + `useCartConfigSync` before mount. Notices via `wc_add_notice( …, 'notice' )`. Unknown/expired codes add the notice and render the plain product. Pages with the arg send `noindex` and a canonical to the plain permalink.
- **My Account**: `add_rewrite_endpoint( 'saved-designs', EP_ROOT | EP_PAGES )` (flush on activation/update once), `woocommerce_account_menu_items` (insert after Orders), `woocommerce_account_saved-designs_endpoint`. Add to cart from the list posts to the product's add-to-cart URL with `wc3d_custom_config` so the normal validation runs.
- **Frontend**: `CustomizerDrawer.tsx` footer button + share sheet component (reuse `ArQrModal` shell, `QrCodeImage.tsx`, `useModalDialog`); product-page link printed by PHP and wired by `scan.ts`.
- **Cleanup**: daily `wc3d_purge_designs` cron deletes expired anonymous rows and their pictures; `Data/Cleanup.php` drops the table on uninstall when "Delete all data" is on; a product's designs are kept when it is trashed and deleted with it on permanent delete.
- **Backward compatibility**: nothing existing changes shape. Old configs, carts and orders behave as today; settings without the new keys read the defaults; links outlive config edits because picks that no longer exist fall back to defaults and are sanitised at add to cart.
