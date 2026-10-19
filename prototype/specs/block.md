# Product viewer block and Elementor widget

Prototype spec for roadmap item 7 (`resource/COMPETITOR-LANDSCAPE-ANALYSIS.md` §5): a thin wrapper over the existing viewer render, with a product picker, placement and size, that works inside the WooCommerce **Single Product** template of a block theme (FSE), on any page or post, and as an Elementor widget.

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `block` | `wc3d/product-viewer` block + Elementor widget, block-theme gallery replacement | 2–3 d |

Flag off = the shipped product, unchanged: no new menu links, no theme switch, no block anywhere, the product page renders exactly as today.

## Why

The plugin places the viewer through `woocommerce_single_product_image_thumbnail_html`. That filter runs for classic themes and for the legacy **Product Image Gallery** block, but not for WooCommerce's newer **Product Gallery** block, and a block theme gives the merchant no way to put the viewer anywhere else on the template. Pages and posts only have the `[wc3d_viewer id=""]` shortcode. Every competitor ships a block.

## Data (new keys only)

### Block attributes (`wc3d/product-viewer`, saved in the block comment)

```js
{
  productId: 0,          // 0 = current product (Single Product template / product context); -1 = "Choose a product" with none picked (renders nothing); else a product id
  variationId: 0,        // 0 = follow the variation form (current product) or the default config (picked product)
  placement: 'gallery',  // 'gallery' = replace the product gallery | 'standalone' = keep the gallery (current product in a product template only)
  aspect: '1/1',         // '1/1' | '4/3' | '16/9' | 'fixed'
  height: 480,           // px, used when aspect is 'fixed' (240–1000)
  width: 100,            // % of the content width: 25 | 50 | 75 | 100
  align: '',             // '' | 'center' | 'wide' | 'full' (WordPress block alignment)
  customizer: 'product', // 'product' (the product's setting) | 'show' | 'hide'
  controls: null,        // null = the global toolbar settings; else { zoom, reset, autorotate, download, gallery } booleans
  background: 'product', // 'product' | 'transparent' | 'color'
  backgroundColor: '#ffffff',
  className: '',         // Additional CSS class(es)
}
```

Missing attributes take these defaults, so a block saved by an older version renders the same. Defaults when inserted: in a product template `productId: 0`, `aspect: '1/1'`, `placement: 'gallery'`; anywhere else `productId: -1`, `aspect: '16/9'`. The root's background behind the poster is `--wc3d-block-bg` (the Color, `transparent`, else a light grey).

### Elementor widget settings (`wc3d-product-viewer`, in `_elementor_data`)

Same keys and meaning, under Elementor control ids: `product_source` (`current` | `pick`), `product_id`, `variation_id`, `aspect_ratio`, `height` (slider, px), `show_customizer`, `use_global_controls` + `show_zoom`, `show_reset`, `show_autorotate`, `show_download`, `show_gallery`, `background_type`, `background_color`, `border_radius` (Style tab, px), `_css_classes` (Advanced). The widget's `render()` maps them to the block attributes and calls the same renderer. The prototype stores the widget settings with the block attribute names plus `radius`.

### Prototype state

| Key | Shape | Plugin equivalent |
| --- | --- | --- |
| `wpTemplates['single-product']` | `{ slug, title, blocks: Block[] }` | `wp_template` post `woocommerce/woocommerce//single-product` (theme or user copy) |
| `wpPages[id]` | `{ id, title, slug, status, builder: 'blocks' \| 'elementor', blocks?: Block[], elementor?: Widget[] }` | `page` post content / `_elementor_data` |
| `demo.theme` | `'classic' \| 'block'` | Demo store setup (which theme is active), not a plugin setting |

`Block = { id, name, attrs?, inner?: Block[] }`, `Widget = { id, type, settings }`. Seed: the Single Product template without the block (a fresh install), page 701 "Living room lookbook" (blocks, three viewers) and page 702 "Meet the mug" (Elementor, one widget). Code falls back to the same defaults when the keys are missing, so older browser copies work.

No product meta, config JSON, cart or order key changes.

## Render rules (`ViewerBlock::render`)

1. Resolve the product: `productId` else the block context `postId` when it is a product (Single Product template, Products/Query loop) else nothing. Only the queried product (`get_queried_object_id()`) counts as the current product for rule 4; a product from a loop context is treated like a picked one (customizer off).
2. Not available (`ProductViewerSettings::is_available()` false: 3D off or no model) → empty output, like the shortcode. In the editor: a placeholder instead.
3. Output `ViewerMarkup::root()` with wrapper class `wc3d-viewer-block` (+ alignment and `className`), never the `#wc3d-viewer-root` id, and a style with the aspect ratio or height and width. The bootstrap payload gets the block overrides: `customizerEnabled`, `showGallery` + toolbar flags, background (replaces the product's).
4. **Customizer only for the current product.** The drawer writes to the add-to-cart form's `wc3d_custom_config`, so a picked product (on a page, or another product in the template) always renders with the customizer off. The inspector shows the control disabled with a note.
5. **Variation**: current product with `variationId` 0 follows the variation form through the existing WC bridge (product-scoped bus). A picked product shows the chosen variation's config, else the default.
6. **Automatic placement off on that page.** When the resolved Single Product template contains a `wc3d/product-viewer` block for the current product, `Render::attach_for_current_product()` skips every automatic placement (replace image, first gallery image, modal, tab) for that request. The block is the placement.
7. **Placement `gallery`**: the template's gallery blocks (`woocommerce/product-image-gallery`, `woocommerce/product-gallery`) render nothing for products that have 3D. Products without 3D keep their gallery (the block renders nothing). **Placement `standalone`**: the gallery stays, images only.
8. Without any viewer block in the template, a block theme works as today: the legacy gallery block runs the classic filter, so the product's own placement applies.

## Admin: Site Editor mock (`#admin.site-editor`)

Full screen, like Appearance → Editor. Route params: none = the Single Product template, `page.<id>` = a page in the same editor. Flag off: "Turn on the Product viewer block feature" message with a link to Planned features.

- **Top bar**: back to 3D Models, block inserter toggle (+), Undo, Redo, List View, document title ("Single Product · Template" / "<Page> · Page", click to switch document), product preview select (template only: "Preview: Lounge Chair"), View, Save (disabled when nothing changed; "Saving…" then snackbar "Template updated." / "Page updated." with View link).
- **Canvas**: the template rendered with the preview product: Header, Breadcrumbs, Store Notices, Columns (Product Image Gallery | Title, Price, Excerpt, Add to Cart with Options, Product Meta), Product Details, Related Products, Footer. Click selects a block (blue outline, block toolbar: move up, move down; for the viewer block also Align None/Center/Wide/Full on pages, and an Options menu with Duplicate and Delete). The viewer block renders the live viewer (eager load; interactive once selected). A gallery hidden by a `gallery` placement shows dimmed with the note "Hidden on the storefront: the 3D Product Viewer block replaces the gallery for products with a 3D model."
- **Inserter**: search box "Search", categories Text, Media, Design, WooCommerce. "3D Product Viewer" is listed under WooCommerce and found by "3d", "model", "viewer", "ar", "glb", "product". Description "Show a product's interactive 3D model, with the customizer and AR." Other blocks are shown inert. Insert = after the selected block (same parent), at the end of a selected Column, else at the end of the content (before the footer). Keyword search matches word prefixes only ("cart" does not find it).
- **List View**: block tree; click to select.
- **Settings sidebar**, tabs Template/Page and Block:
  - Template tab: "Single Product" card ("Displays a single product.") and a "3D viewer" panel: "Products use their own placement (3D Models → Settings → Placement)." or "The 3D Product Viewer block places the viewer on this template. The product's own placement is turned off here."
  - Block tab for the viewer block: block card, then panels
    - **Product**: radios "Current product" / "Choose a product" (Current product only in a product template). Product search ("Search products"), results with "#id" and "No 3D model" for unavailable products. Variation select ("Follow the variation form" for current; "Default" + variations for a picked variable product).
    - **Placement** (product template, current product): "Replace the product gallery" / "Next to the gallery". Help: "The product's own placement is turned off on this template."
    - **Size**: Aspect ratio (Square, 4:3, 16:9, Fixed height), Height (px), Width (25/50/75/100%).
    - **Viewer**: Customizer select ("Use the product setting", "Show", "Hide"; disabled for a picked product: "The customizer needs the product's add-to-cart form, so it is available for the current product only."), toggle "Use the global toolbar settings" else five toggles: Zoom buttons, Reset view, Auto-rotate, Download, Gallery of different sides.
    - **Background**: "Product setting", "Transparent", "Color" + colour field.
    - **Advanced** (closed): Additional CSS class(es); shortcode equivalent with Copy.
  - Placeholders: no product → "Choose a product to show its 3D model."; product without 3D → "<Product> has no 3D model. Turn on 3D on its 3D Model tab." (link to the product).
- Undo/redo inside the editor session (50 steps). Leaving without saving drops the changes.

## Admin: Elementor mock (`#admin.elementor.<pageId>`)

Smaller. Left panel + canvas. Nothing selected: "Elements" with search; "3D Product Viewer" under WooCommerce (click to add after the selected widget, else at the end). Widget selected: "Edit 3D Product Viewer" with tabs **Content** (Product: source, product, variation; Viewer: customizer, global controls + five toggles), **Style** (Size: aspect ratio, height; Box: background, colour, border radius), **Advanced** (CSS Classes). Canvas widgets: hover outline, click to select, handle with Remove. Top bar: page title, "View page", "Update" (disabled when unchanged).

## Storefront

- **Theme switch** (prototype bar, storefront): "Theme: Classic / Block". Store setup, like the Cart page switch, but shown only with the flag on (flag off = today's prototype, so the product page ignores `demo.theme`). The Site Editor's View/snackbar link switches it to Block.
- **Block theme product page** (`#store.product.<slug>`, theme Block): rendered from `wpTemplates['single-product']` with `wp-block-*` markup. Gallery, add-to-cart form (with the option-pricing box), meta, details tabs and related products are the existing components. A current-product viewer block uses the page's variation and shopper layer, so the drawer → Add to cart → cart line works as on the classic page. Required option groups open the drawer on the block viewer.
- **Pages** (`#store.page.<slug>`): page title + blocks or Elementor widgets. Viewer blocks of picked products: no customizer, no cart. Theme nav gains "Lookbook" (flag on).
- Phones (≤600px): the block root keeps a 320px minimum height, so a 16:9 block still fits the toolbar and the gallery strip.
- Classes: `.wp-block-wc3d-product-viewer` wrapper (`alignwide`, `alignfull`, `aligncenter`, `has-custom-width`), inner `.wc3d-viewer-root.wc3d-viewer-block`.

## Cart and order

Unchanged. The block is only a placement. A current-product block posts the same `wc3d_custom_config`; picked products cannot add to cart from the block. The order-snapshot picture keeps the product background (block background is presentation only).

## Interactions with other flags

- `option-pricing`, `option-groups`: the drawer in the block is the same Viewer; prices and groups work for the current product. Picked products show no drawer.
- `order-snapshot`: unchanged.
- Customizer features (`decals`, `conditional-logic`, `undo-redo-drawer`, `saved-designs`, `materials-variants`): everything lives in the Viewer and the shopper layer, so it works in the block for the current product. `saved-designs`: a restore link targets the current-product block (it mounts at once and keeps the restored choices, `keepCustom`), and the "Share design" link sits under the Add to Cart with Options block (`woocommerce_after_add_to_cart_form` fires inside that block in the plugin too).
- `usdz-export`: AR in the block uses the configured scene like any viewer.
- `coverage`: may list pages/templates whose viewer block points at a product without 3D.
- `external-url`: the block renders whatever model the product resolves.

## Plugin notes (for the real build)

- `blocks/product-viewer/block.json` (apiVersion 3, `category: woocommerce`, `usesContext: ["postId", "postType"]`, `supports: { align: ["center", "wide", "full"], className: true, html: false }`), `render.php` → new `includes/Frontend/ViewerBlock.php`, editor script `src/blocks/product-viewer/` (TS/React, `@wordpress/block-editor`, `ServerSideRender`-free: mount the storefront Viewer in the editor with the payload from a **new** route `GET /wc3d/v1/products/{id}/bootstrap` (`edit_products`; returns `ViewerBootstrapBuilder::for_product()`; the existing routes are `/products`, `/products/{id}`, `/products/{id}/config` and the variation routes). Register on `init` with `register_block_type( __DIR__ . '/blocks/product-viewer' )`; the plugin requires WP 6.2, where apiVersion 3 runs as v2 (the edit uses `useBlockProps`, so both work).
- Shortcode parity: `[wc3d_viewer]` gains the same optional attributes (`variation`, `aspect`, `height`, `width`, `customizer`, `controls`, `background`, `class`). Missing attributes = today's output.
- `ViewerBootstrapBuilder::build()` gets an optional overrides array; `for_product()` stays as is. Overrides never change the memo key of the plain payload.
- Placement detection: on `wp` for `is_product()` with `wp_is_block_theme()`, resolve the template (`resolve_block_template()` / `get_block_template()`), `parse_blocks()` recursively (template parts too) and look for `wc3d/product-viewer` with no `productId`. Found → skip only the position `switch` in `Render::attach_for_current_product()`: still set `$this->product_id`, and keep `render_hidden_config_input()` on `woocommerce_before_add_to_cart_button`, because the block's customizer writes the shopper's choices into `#wc3d_custom_config` (`useCartConfigSync`). With `placement: gallery` also `pre_render_block` returns '' for the two gallery blocks when the product is available. Filter `wc3d/block/takes_over_placement` for themes that build the page elsewhere.
- Elementor: `includes/Integrations/Elementor/ViewerWidget.php` registered on `elementor/widgets/register` only when Elementor is active; category `woocommerce-elements`; Current product works in Elementor Pro single-product templates (`get_the_ID()`).
- Assets: enqueue through `Assets::enqueue_once()` from the render callback (covers templates and builders, like the shortcode).
- Backward compatibility: no stored data changes. Sites without the block render exactly as today; classic themes ignore the template logic; old shortcodes keep their output; uninstall has nothing new to remove (blocks live in post content).
