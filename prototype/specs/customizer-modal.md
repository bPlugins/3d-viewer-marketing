# Customizer modal

Prototype spec for a storefront layout change: **Customize** opens a large modal (big 3D viewer, options panel, live total, Add to cart) instead of the drawer that slides over the viewer.

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `customizer-modal` | Feature module (Settings → Features toggle; was the "Customizer layout" setting); modal with the live viewer moved in, variation selects, options, price summary, quantity and Add to cart; full-screen sheet on phones and portrait tablets | 3–4 d |

Shipped as a feature module ([modules.md](modules.md)): the flag stays and is the module's Settings → **Features** toggle. Off = the drawer exactly as today. No dependency on other flags; every drawer feature works inside the modal.

## Why

The drawer is 280 px wide inside a viewer that is often ~360–560 px wide (gallery column, 16:9 tab). Open, it leaves the model squeezed and cropped, the gallery strip collapses, and the price box and Add to cart sit outside the viewer, so the shopper has to close the drawer to see the total or buy.

## Toggle (feature module `customizer-modal`)

The "Customizer layout" select is gone. The modal is a feature module, switched on or off in Settings → **Features** (one card; [modules.md](modules.md) has the card, the option and the defaults).

- Card title **Customizer modal**; description "Customize opens a large dialog with a bigger viewer, the options, live total and Add to cart. Off: the side drawer. Needs the customizer to be enabled." No requirements, no settings of its own.
- The reader is `viewerSettingsFor().customizerModal` (= `flags['customizer-modal']`).
- First decision (plugin): a stored `customizer_layout` wins (`'modal'` = on, `'drawer'` = off, origin `legacy`); else brand-new installs get on and updated sites get off. The legacy key is never deleted or rewritten.
- The toggle applies wherever the drawer is used today: product page placements (replace image, first gallery image, product tab, the product's own "View in 3D" modal) and the current-product **Product viewer block** / Elementor widget. Shop listing quick view and order previews have no customizer, so nothing changes there. The Site Editor and Elementor canvas previews keep the drawer (a full-screen modal would cover the editor).

## Storefront

### Opening

- In Modal layout the viewer's **Customize** button (same icon and text, never switches to "Close") opens the modal. It gets `aria-haspopup="dialog"`.
- **One live viewer.** The mounted viewer (canvas, camera, loaded model, gallery strip, hotspots, AR button, decal drag, undo history) moves into the modal and back. Nothing reloads and the camera stays where the shopper left it. While the viewer is in the modal, its place on the page keeps its size and shows the poster.
- If the viewer is in browser fullscreen, fullscreen is exited first.
- A required group or decal area left empty when the shopper clicks Add to cart (page form or modal) opens the modal on that group, the way the drawer opens today (see Add to cart).

### Desktop (> 768 px, except portrait tablets)

```
┌ Lounge Chair ───────────────────────────────────────────────── ✕ ┐
│                                          │ Color [Teal        ▾]  │
│                                          │ Clear                  │
│            3D viewer (~65–70 %)          │ FRAME FINISH · Walnut  │
│                                          │ ●  ●  ●  ●             │
│  [zoom/reset/rotate/AR]                  │ …options scroll…       │
│              [▢ ▢ ▢ ▢]                   │ [Share design]         │
│                                          ├────────────────────────┤
│                                          │ Product        $449.00 │
│                                          │ Options        +$40.00 │
│                                          │ Total          $489.00 │
│                                          │ [↶][↷][Reset Customiz.]│
│                                          │ [1][ Add to cart ][Done]│
└──────────────────────────────────────────┴────────────────────────┘
```

- Dialog: `min(1280px, 100vw − 48px)` × `min(860px, 100dvh − 48px)`, centred, 12 px radius, dark backdrop (`rgba(0,0,0,.75)`, like the product modal). Opens with a 180 ms fade/scale (none with reduced motion).
- **Header**: product name (`h2`, the dialog's label), **✕** close button.
- **Viewer** (left, the rest of the width): the same controls stack as on the page (zoom, reset view, auto-rotate, download, AR, following the toolbar settings) and the gallery strip. No fullscreen button and no Customize button inside the modal. Hotspots and decal dragging work as on the page.
- **Options panel** (right, `clamp(340px, 30vw, 400px)`, white, scrolls):
  1. Variable products: one select per attribute ("Choose an option" first), the same values as the page form, plus **Clear** (shown once anything is picked). Synced both ways with the page form; a pick changes the variation and drops the customizations, as on the page.
  2. Exactly what the drawer shows today, same markup and classes: option groups, or "Colors & Materials" / "Options & Parts"; "Personalize" decal areas; conditional-logic notes and live region; inactive-group notes; price badges.
  3. **Share design** (saved-designs), full width, at the end of the list. In the modal it sits here instead of the footer.
- **Sticky footer**:
  - Price summary, only when option-pricing is on and the product has option rules (the same test and rows as the page's `.wc3d-price-summary`): **Product**, **Options**, **Total**. Variable product with no variation: "Choose an option to see the total." The drawer's separate "Options" row is not shown (the summary includes it).
  - Undo / Redo (undo-redo-drawer) and **Reset Customizations**, the same buttons as the drawer footer.
  - Quantity (synced with the page's quantity field), **Add to cart**, **Done**.

### Phones and portrait tablets (≤ 768 px and taller than 540 px, or ≤ 1100 px in portrait; checked at 390 px and 820 × 1180)

- Portrait tablets use the sheet too: a tall, narrow left column would crop the model, since the camera keeps the inline viewer's vertical field of view.
- Full-screen sheet (inset 0, no radius, `100dvh`): header (52 px), viewer `45dvh` (min 220 px), options scroll below, sticky bottom bar.
- Bottom bar: first line **Total** and the amount (the quote total when priced, else the variation or product unit price; "Choose an option to see the total." when a variable product has no variation); second line: quantity, **Add to cart** (fills the row), **Done**.
- Undo / Redo / Reset Customizations and Share design move to the end of the scroll area.
- Touch targets (sheet and short landscape): the ✕ is 44 px (40 px on desktop); colour swatches keep their 20 px look with a 40 px hit area, and plain swatch rows get a 20 px gap so the areas do not overlap. Option pills, Undo / Redo (40 × 40), Reset Customizations, Share design, decal text and font fields and option selects are at least 40 px tall; **Clear** gets a 40 px-tall padded hit area. Desktop and the drawer keep their sizes.
- Bar and panel respect `env(safe-area-inset-bottom)`. No horizontal scroll. The canvas keeps `touch-action: none`, so swipes on the model orbit and swipes on the options scroll.

### Short landscape (height ≤ 540 px in landscape, e.g. a phone held sideways; checked at 844 × 390 and 667 × 375)

- The centred dialog would leave the options list a sliver, so it goes full screen (inset 0, no radius, `100dvh`) with a 44 px header, and keeps the viewer and the options panel side by side (panel `clamp(340px, 30vw, 400px)`).
- It uses the phone bar instead of the desktop footer: one line **Total**, then quantity, **Add to cart**, **Done**; Undo / Redo / Reset Customizations and Share design move to the end of the scroll area. About 250 px of options stay visible at 844 × 390.
- Same touch targets as the sheet.

### Closing

✕, **Done**, Escape, the browser **Back** button and clicking the backdrop (desktop) all close the modal and keep every choice: the page's form, price box and hidden `wc3d_custom_config` already show them. The viewer moves back to its place with the same camera, and focus returns to the Customize button.

### Add to cart inside the modal

- Uses the page's add-to-cart path: the modal submits the product's own form (same validation, notices, `wc3d_custom_config`, cart line rules and order snapshot capture). The page form's button label is used ("Add to cart"); with no variation picked the button carries the page's `disabled wc-variation-selection-needed` classes.
- **No variation picked**: "Please select some product options before adding this product to your cart." under the modal's selects (`role="alert"`), and focus moves to the first empty select. The page form shows the same message.
- **Required group or decal area empty**: the same WooCommerce error notices are pushed on the page (`“Glaze” is a required field.`), and the modal shows them in an alert box at the top of the options panel (`.wc3d-customizer-modal__errors`, `role="alert"`). The panel scrolls the first missing group into view and focuses its first choice, like the drawer does. The list is re-checked with the same validators as the shopper picks, so a line disappears once its group or area is filled. When the error comes from the page's own Add to cart button, the modal opens on the group with the box shown.
- **Success** (WooCommerce default single-product flow, which posts the form and reloads the page): the modal closes and pops its history entry, the page re-renders as after any Add to cart (notice "“Lounge Chair” has been added to your cart." with **View cart**, customizations cleared, viewer back to its poster, scrolled to the top), and focus moves to the notice. AJAX add-to-cart themes: see Plugin notes. We did not keep the modal open with an inline "Added" message, because that is not how WooCommerce behaves on a single product page.

### Product modal placement

For a product whose placement is "View in 3D" (modal), the viewer already lives in `#wc3d-product-modal`. Customize stacks the customizer modal on top of it. Closing the customizer modal returns the viewer to the product modal, and Escape closes only the top modal.

## Accessibility

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` = the product name heading. Options panel: `<section aria-label="Customize Product">`.
- Focus moves into the dialog on open (the dialog element, or the missing group's first choice when opened by a failed Add to cart). Tab and Shift+Tab are trapped. Escape closes it, unless a sheet opened from inside (AR, Share design, Download) is on top, which closes first.
- Background: every other `<body>` child gets `inert` while the modal is open (only those the modal set are restored), and `body.wc3d-customizer-modal-open` locks page scroll. Sheets opened from inside the modal (AR QR, AR device sheet, Share design, Download still) render above it and are not inert.
- **History**: opening pushes one same-URL entry (`history.pushState({wc3dCustomizer: true}, '')`; no hash change, so the router and the route-scoped notices are unaffected). Back closes the modal. Closing any other way calls `history.back()`, and the modal closes on that `popstate` (or after 1.5 s if the frame ignores `back()`). A successful Add to cart re-renders the page with the modal still on its entry; the modal then calls `history.back()` itself, so no entry is left behind. Scroll restoration is set to manual while the modal is open, so returning to the entry does not move the page. Leaving the page through a link inside the modal (hotspot "View Product", share sheet links) leaves that same-URL entry behind; Back then shows the product page with the modal closed. If `pushState` throws (sandboxed frame), the modal works without Back support.
- Returns focus to the Customize button on close.
- Keyboard shortcuts from the drawer still work anywhere in the modal (undo/redo, radio-group arrows). The live total keeps `aria-live="polite"`.
- Reduced motion: no open animation; existing reduced-motion rules apply inside.

## Exact copy

| Where | String |
| --- | --- |
| Features card title | Customizer modal |
| Features card description | Customize opens a large dialog with a bigger viewer, the options, live total and Add to cart. Off: the side drawer. Needs the customizer to be enabled. |
| Close button | ✕, `aria-label="Close"` |
| Footer button | Done |
| Panel name (`aria-label`) | Customize Product (the drawer's title) |
| Price rows | Product / Options / Total; "Choose an option to see the total." (same as the page) |
| Phone bar | Total |
| Reused | Add to cart, Reset Customizations, Choose an option, Clear, Share design, Undo, Redo, every drawer string, WooCommerce notice texts |

## Interactions with other flags

| Flag | In the modal |
| --- | --- |
| `option-pricing` | Swatch badges as in the drawer. The footer shows the Product / Options / Total summary (phones: Total in the bar) in place of the drawer's "Options" row. The page price box keeps updating behind. |
| `option-groups` | Groups render as in the drawer. The required-group error opens the modal on the group (replaces "opens the drawer on it"). |
| `conditional-logic` | Notes, fade-ins and the live region work as in the drawer. Changing the variation in the modal re-runs attribute rules. |
| `decals` | "Personalize" section, upload, sliders. Drag on the model and the area outline are active while the modal is open. A required empty area opens the modal on it. |
| `undo-redo-drawer` | Same buttons and shortcuts. History belongs to the viewer, so it survives closing and reopening the modal, and is cleared on the same events as today. |
| `saved-designs` | Share design at the end of the options list; the sheet opens above the modal. A restored design shows in the modal as it does in the drawer. |
| `usdz-export` | The AR button in the modal's controls stack builds from the configured scene. Its sheets and the QR modal open above. |
| `materials-variants` | Variant groups behave like other groups. |
| `order-snapshot` | Captured by the same Add to cart path. |
| `block` | A current-product viewer block in the Single Product template follows the toggle and uses the same form bridge. Picked-product blocks and pages have no customizer. |

## Cart and order

No change. The modal is presentation only: the same form fields are posted and the same cart line, price, snapshot and order rows result.

## Prototype

- `js/screens/store/customizer-modal.js`: `CustomizerModal` (dialog shell, header, history, inert, scroll lock), `ModalPanel` (attribute selects, options, footer), `useMovableHost()` (persistent host element rendered with `preactRender`, appended to the page slot or the modal body), `css/customizer-modal.css` (`.wc3d-customizer-modal__*`).
- `viewer-ui.js`: the drawer body is split out (`CustomizerOptions`, `useFocusGroup`) and used by both the drawer (unchanged markup) and the modal panel. In Modal layout the `Viewer` renders through the movable host and owns the open state.
- `product.js`: quantity, the "select options" state and a ref to the form move up to the page. A `cart` bridge (product, chosen, setChosen, variation, qty, setQty, needSel, submit) is passed to the viewer for the current product (classic page and block template). `submit` dispatches a `submit` event on the page's form, so `CartForm`'s handler runs unchanged (it sanitises the quantity itself). `PriceSummary` (plus `hasPricedOptions`) moves to `price-summary.js` so both can render it; the modal passes `hint={false}`.
- `viewer-ui.js` also exports `DrawerTools` (Undo / Redo + Reset Customizations) and `exitFullscreen()`. The moved wrapper uses `overflow: clip` in the dialog: unlike `hidden` it cannot be scrolled, so scrolling a missing group into view moves only the options list.
- `admin/settings-features.js`: the Features tab card (generic for every feature module). `seed.js` seeds `flags['customizer-modal']: true` (new install), `shared/product-3d.js` (`customizerModal`), `shared/block.js` (editor previews force `customizerModal: false`).

## Plugin notes (for the real build)

> Superseded for the setting: the layout select, `DEFAULTS['customizer_layout']`, `customizer.layout` and the Installer write are replaced by the feature module (`includes/Modules/CustomizerModal/`, see [modules.md](modules.md)). The bullets below on the frontend, CSS and bundle still apply.

- **Settings** (`includes/Settings/Options.php`): `DEFAULTS['customizer_layout'] = 'drawer'`, `LAYOUTS = ['drawer', 'modal']`, `sanitize()` whitelists it (fallback `'drawer'`). `Options::all()` already merges stored values over defaults, so installs without the key read `'drawer'`. Row in `templates/admin/settings.php` after the `enable_customizer` toggle (a select row like Background Style).
- **New installs only** (`includes/Data/Installer.php::migrate()`): when there is no stored `wc3d_db_version` (first run ever) and none of `wc3d_settings` / `wc3d_activated_at` exist, `add_option( 'wc3d_settings', [ 'customizer_layout' => 'modal' ] )`. `add_option` is a no-op when the option exists, so the step is idempotent. Do **not** do this in a versioned migration or in `Activator` alone: reactivating or updating an old install must never flip it to modal. Uninstall with "Delete all data" removes the markers, so a later reinstall is a new install.
- **Localized settings** (`includes/Frontend/Assets.php`): `customizer.layout` next to `enabled` / `colorPalette`. Block and Elementor renders inherit it. Editor previews pass `layout: 'drawer'`.
- **Frontend** (`src/frontend/`):
  - `components/CustomizerDrawer.tsx`: move the body (groups / plain lists / decals) into `CustomizerOptions.tsx`; the drawer keeps its header and footer. New `components/CustomizerModal.tsx` (shell + panel + footer). Reuse the `ArQrModal` dialog pieces for focus handling.
  - **One Canvas**: `Viewer.tsx` renders the viewer tree with `createPortal(tree, hostEl)` into a persistent `hostEl` (`useState(() => document.createElement('div'))`), and a layout effect appends `hostEl` to the inline slot or the modal body (the react-reverse-portal pattern). React never remounts the portal, so the R3F `<Canvas>`, camera and loaded GLTF survive. R3F measures with `react-use-measure`: after each move, dispatch a `resize` (or call `invalidate()` after the ResizeObserver fires) so pointer raycasts and drei `<Html>` hotspots use the new rect.
  - **Form bridge** (`wc-bridge.ts`): read attribute selects and `input.qty` from `form.variations_form` / `form.cart`, and write back with jQuery `.val(v).trigger('change')` so WooCommerce's variation script runs (`found_variation` / `reset_data` already feed the viewer). Add to cart: validate on the client with the shared `validateChoices` / decal port (errors shown in the modal, no submit). If valid, `useCartConfigSync` has already written `#wc3d_custom_config`: pop the history entry, then click the real `.single_add_to_cart_button` from the product page's own entry (so the POST and a later Back do not land on the modal's entry). Server validation stays the authority. AJAX add-to-cart themes and plugins: on `added_to_cart` close the modal and let the theme show its notice or mini cart. The button label comes from `$product->single_add_to_cart_text()` in the bootstrap.
  - Escape: `modal.ts`'s `bindEscapeClose()` closes every product modal. It must skip while a customizer modal is open (check `document.body.classList.contains('wc3d-customizer-modal-open')`), so Escape closes only the top one.
- **CSS** (`assets/css/frontend-static.css`): `.wc3d-customizer-modal*` with z-index above `.wc3d-modal` (99999) and below `.wc3d-ar-modal` (999999). `inert` is supported by every browser WordPress 6.2 targets.
- **Strings** through `__()`: "Customizer layout", the description, "Drawer", "Modal", "Done", "Close", "Total". Reuse existing strings for the rest. Regenerate the POT.
- **Backward compatibility**: one new settings key, absent = today's drawer. No config, cart or order data changes. Downgrading leaves the key in the option, where it is ignored.
- Bundle: the modal ships in the lazy viewer chunk; nothing new loads on pages without the customizer.
