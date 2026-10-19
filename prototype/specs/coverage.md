# Coverage dashboard

Prototype spec for roadmap item 11 (`resource/COMPETITOR-LANDSCAPE-ANALYSIS.md` §5): one screen that shows which products have 3D, what each one is missing (iOS AR file, poster, a model that is too heavy) and fixes it in bulk.

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `coverage` | "Coverage" tab on WooCommerce → 3D Models: stat cards, a report table, bulk assign / enable / disable / generate posters | 2 d |

Flag off = the shipped product: no tab, and `#admin.coverage` shows the Models tab. Nothing on the storefront, cart or orders changes; bulk actions write the same meta keys the product screen writes, so the storefront follows on its own.

## Files

| File | Role |
| --- | --- |
| `js/shared/coverage.js` | The "server": `coverageRow`, `coverageReport`, `ISSUES`, `FILTERS`, bulk writers `assignModel`, `setEnabled`, `generatePosters`, `maxModelBytes`, `formatBytes` |
| `js/screens/admin/coverage.js` | The tab (route `admin.coverage`) |
| `css/coverage.css` | Stat cards, chips, confirm strip, column widths (`.wc3d-coverage`) |
| Hook-ins | `admin-ui.js` (tab in `PageHead`), `routes.js`, `app.js` (`MENU_PARENT`), `index.html` (stylesheet), `seed.js` (demo products) |

## Data (new keys only)

| Key | Where | Shape |
| --- | --- | --- |
| `coverage_max_model_mb` | `wc3d_settings` | Number, default `10` (read with a fallback; not seeded, old options behave as 10) |
| `source: 'wc3d-poster'`, `parentId` | generated poster attachment | Marks a poster the dashboard made (plugin: attachment meta `_wc3d_generated_poster` = product id) |

Everything else is read from what exists: `_wc3d_enabled`, `_wc3d_model_id`, `_wc3d_poster_id` (post meta), `config.ar.{enabled, usdzId, usdzUrl}` (product config), `variationConfigs[vid].model_id` / `.config`, attachment `sizeBytes`. No cart, order or config shape changes.

### Row (computed, never stored)

```js
coverageRow(state, product, { maxBytes }) → {
  id, product,
  status: 'ready' | 'off' | 'no-model' | 'missing-file' | 'none',
  modelId, model /* attachment | null */, sizeBytes,
  ar: { enabled, usdzUrl, filename },
  posterId, poster /* attachment | null */,
  variations: { total, covered, ownModel, withOverrides, mismatchedAr: [label] },
  oversized: [{ label, filename, sizeBytes }],
  issues: [issueId],
}
```

| status | Rule | 3D Status cell |
| --- | --- | --- |
| `ready` | `_wc3d_enabled = yes` and the model attachment exists (= `is_available()`) | "Enabled" (green) |
| `missing-file` | enabled, model id set, attachment gone | "Model missing" (red) |
| `no-model` | enabled, no model id | "No model" (red) |
| `off` | not enabled, model id set | "Not enabled" |
| `none` | not enabled, no model | "Not enabled" |

### Issues (chips, filters)

| id | When | Chip | Tone |
| --- | --- | --- | --- |
| `no-3d` | status `off` or `none` | No 3D | neutral |
| `no-model` | status `no-model` | No model | danger |
| `missing-file` | status `missing-file`, or a variation's own model is gone | Model file missing | danger |
| `oversized` | default or any own variation model `sizeBytes` > threshold | Oversized | danger |
| `no-usdz` | ready and the default config has no `ar.usdzUrl` | No iOS AR file | warning |
| `ar-mismatch` | ready, a variation has its own model but no own `ar.usdzUrl`, while the default has one (iPhone shoppers would see the default model in AR) | AR file not matched | warning |
| `no-poster` | ready and no `_wc3d_poster_id` | No poster | muted |

A row with none of these shows a green "All set" chip. Chip `title` explains it (e.g. "3-seat has its own model but uses the default iOS AR file.").

### Filters (cards + select)

`all` · `without-3d` (status ≠ ready) · `with-3d` · `no-usdz` (`no-usdz` or `ar-mismatch`) · `no-poster` · `oversized` · `missing` (`no-model` or `missing-file`) · `variations` (variable products with variations not covered) · `draft` (draft/pending/private and ready).

Products counted: simple and variable products not in the Trash (the Models tab's set).

## Admin UI: 3D Models → Coverage

Tab between Models and Settings in the page head (`PageHead`, icon `layers`). Inside `.wc3d-panel.wc3d-list.wc3d-coverage`:

**Head.** Title "3D coverage". Description "See which products show 3D and what each one is missing. Select products to fix them in bulk." Right side: search "Search products…" (as on the Models tab; name, SKU, model file name).

**Stat cards** (buttons, `aria-pressed`; click sets the table filter, click again clears it). Seed values shown:

| Card | Value | Foot (count > 0 / count 0) | Filter |
| --- | --- | --- | --- |
| Products with 3D | `6 / 12` + bar | "6 without 3D" / "Every product has 3D" | `without-3d` |
| Variations covered | `7 / 9` + bar | "2 not covered" / "All covered" | `variations` |
| Missing iOS AR file | `5` | "No View in AR on iPhone and iPad" / "Every 3D product has one" | `no-usdz` |
| Missing poster | `5` | "Shows the product image until 3D loads" / "Every 3D product has one" | `no-poster` |
| Oversized models | `1` | "Over 10 MB" / "None over 10 MB" | `oversized` |
| Drafts with 3D | `1` | "Not visible to shoppers yet" / "None" | `draft` |

Foot text is amber; at 0 it turns green with a check. Under the cards, right-aligned: "Flag models over [10] MB" (number input, 1–500, saved to `coverage_max_model_mb` on change/Enter, notice "Settings saved."; an empty or invalid entry goes back to the saved value).

**Table** (WP list table, `.wc3d-list` styles; 10 per page; WP responsive mode under 782 px):

| Column | Content |
| --- | --- |
| cb | checkbox; header "Select All" |
| (thumbnail) | product image 40 px |
| Product (primary, sortable) | name link (editor), " — Draft" post state, "Simple product" / "Variable product", row actions **Edit in 3D Editor** · **Edit product** · **Assign model** · **View** (View/Preview by status) |
| 3D Status | badge (table above) |
| Model File (sortable by size) | attachment title + size ("2.3 MB"); size red with "Over 10 MB" when oversized; "—" / "(missing)" |
| iOS AR file | USDZ filename, or "—"; "AR off" in muted text when the model is set and AR is off |
| Poster | 32 px poster thumbnail, or "—" |
| Variations | "3 variations" + "1 own model · 2 with overrides"; "—" for simple |
| Issues (sortable, default desc) | chips |

Filter select (labels: "All products", "Without 3D", "With 3D", "Missing iOS AR file", "Missing poster", "Oversized models", "Missing model", "Variations not covered", "Drafts with 3D"), button "Filter". Sorting: Product (name), Model File (size), Issues (weighted: danger 3, warning 2, other 1; then name). Default: Issues desc, so problems come first. Search, filter, sort and page survive a trip to the editor and back. Narrow card (< 1100 px) drops Poster and Variations, < 900 px also thumbnail and iOS AR file; the chips still say it. Under 782 px: WP responsive rows (toggle), with the issue chips always visible.

**Bulk actions** (select + Apply, top tablenav): "Assign model…", "Enable 3D", "Disable 3D", "Generate posters". Apply with nothing selected: warning notice "Please select at least one item to perform this action on." (WP core copy).

- **Assign model…** opens the WP media frame (`MediaModal kind="model"`, title "Assign a 3D model", button "Use this model"; upload works too). Then an inline confirm strip: "Assign “ceramic-mug” to 2 products", checkbox "Turn on 3D for these products" (checked), and when some already have a model: "1 product already has a model (Lounge Chair). It is replaced; its scene settings stay, and settings for parts the new model does not have are ignored." Buttons "Assign model" / "Cancel". On confirm: `_wc3d_model_id` = attachment id (and `_wc3d_enabled = yes` when checked), `dateModified` = now. Notice "Model assigned to 2 products." with "Open in 3D Editor" when one product. Row action **Assign model** runs the same flow for one product.
- **Enable 3D**: `_wc3d_enabled = yes`. Notice "3D turned on for 2 products." plus, when some have no model, " 1 has no model yet, so shoppers still see the product image."
- **Disable 3D**: `_wc3d_enabled = ''` (model, config and poster kept). Notice "3D turned off for 2 products." with **Undo** (restores the previous values; notice "3D settings restored.").
- **Generate posters**: confirm strip "Generate posters for 3 products": "An 800 × 800 picture of each product's 3D scene is added to the Media Library and set as its poster." Products without a working model: "1 product has no model and is skipped." Products with a poster: checkbox "Replace existing posters (1 product has one)", unchecked = skipped. Buttons "Generate posters" / "Cancel". The counts are taken when the strip opens and hold still during the run. Progress line in the strip "Generating posters… 1 of 3" (strip buttons, bulk Apply and the row action **Assign model** disabled). Done: "Posters generated for 3 products." Errors listed: "Could not generate a poster for Modular Sofa."
  - Render: offscreen `renderThumbnail(model, effectiveFor(pid, 0, {background:false}), {width: 800, height: 800, bg})`, auto-framed, JPEG; `bg` = product background colour when set, else the product image background, else `#ffffff`.
  - Saved as an image attachment `{kind:'image', title:'<slug>-3d-poster', filename:'<slug>-3d-poster.jpg', mime:'image/jpeg', url: dataURL, source:'wc3d-poster', parentId}`, then `_wc3d_poster_id`. The storefront poster (`usePosterUrl`) picks it up.

Selection clears after every action. Rows update live (the table reads the store). Notices print above the page head, like every WP notice on this page, and the page scrolls to them.

### Demo data (seed, additive)

Products 141–146 (attachments 541–545, variations 241–244) give a realistic mix next to 101–106: **Modular Sofa** (variable; 18.6 MB default model and a 22 MB own model on "3-seat", USDZ on the default only → Oversized + AR file not matched), **Pendant Lamp** (model assigned, 3D off), **Velvet Armchair** (draft with 3D), **Linen Cushion** (3D on, no model), **Travel Mug** and **Nesting Side Tables** (no 3D; good targets for Assign model… with `ceramic-mug` / `oak-side-table`). They also appear on the shop, Products and Models screens with the flag off (seed data, not UI).

## Storefront, cart, orders

No UI. Changes made here show up exactly as if made on the product screen: enabled + model → the viewer appears; disabled → the product image; poster → the click/scroll placeholder.

## Interactions with other flags

- `external-url`: a model from a URL has no `sizeBytes` → Model File shows the host and "Size unknown"; never oversized. Assign model… gets the URL tab from the shared `MediaModal` when that flag is on.
- `usdz-export`: when `arBuildAllowed()` is true for the product default (flag + `settings.ar_configured` + AR on + no `ar.configured: false`), `row.ar.built` is set, `no-usdz` / `ar-mismatch` are not raised and the iOS AR cell reads "Built on the device" (or "Built on the device for custom designs" under an uploaded USDZ). Products with AR off still count as missing. A bulk "Generate AR files" would be its own action.
- `materials-variants`: count GLB material variants in the Variations column ("3 material variants") later; no change now.
- `block`: no interaction (placement only).
- `option-pricing`, `option-groups`, `saved-designs`, `decals`, `conditional-logic`, `undo-redo-drawer`, `order-snapshot`: none; the dashboard never touches `pricing`, `options` or carts/orders. A future column "Customer options" could show `options.length`.

## Plugin notes (for the real build)

- **Screen:** `ModelsListPage::render_tabbed_page()` gains `'coverage' => ['label' => __('Coverage'), 'icon' => 'layers']`, rendered by a new `Admin/CoverageTable.php` (`WP_List_Table`, bulk actions via `get_bulk_actions()` / `process_bulk_action()` with the list nonce, sortable columns via `get_sortable_columns()`), stat cards printed above it. Pro/"Extension" gate if the item stays paid.
- **Queries:** one `WP_Query` for product ids (simple + variable, not trash) + `update_meta_cache`, one `SELECT product_id, default_model_id, config` from `wc3d_product_configs`, one from `wc3d_variation_configs`, `filesize( get_attached_file() )` cached in attachment meta `_wc3d_filesize` (filled on upload / first view). Cards come from the same rows; cache the report in a transient cleared on `save_post_product`, `wc3d_config_saved` and `delete_attachment`.
- **Bulk writes** go through `ProductMeta::sanitize()` + `update_post_meta` like `ProductPanel::save()`, then `ModelRepository::get_or_create_for_attachment()` (parse) and `delete_transient('wc3d_has_shop_viewer')`. Never touch `wc3d_product_configs` rows: an existing scene config stays and is resolved against the new model as today.
- **Generate posters** runs in the browser (the plugin's viewer bundle renders offscreen; WP has no GPU), one product at a time, uploads each JPEG to `/wp/v2/media` with `post_parent` = product and meta `_wc3d_generated_poster`, then sets `_wc3d_poster_id` through a REST route (`wc3d/v1/products/<id>/poster`, `edit_product` capability).
- **Long runs:** posters are made one product at a time while the tab stays open; leaving the page stops the run, and posters already made stay. Selections larger than one list page go through the same loop (no background job needed).
- **Model file missing** = the attachment post is gone or `get_attached_file()` no longer exists on disk (the prototype only knows the first case).
- **Threshold** is a new `wc3d_settings` key `coverage_max_model_mb` (default 10, absint 1–500) in `Options::defaults()` and the sanitizer; old installs read the default.
- **Backward compat:** read-only report plus writes to existing meta keys; no migration, no schema change. Old configs, carts and orders behave exactly as today.
