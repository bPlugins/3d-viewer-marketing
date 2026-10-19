# Undo and redo for customers

Prototype spec for roadmap item 10 (`resource/COMPETITOR-LANDSCAPE-ANALYSIS.md` §5).

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `undo-redo-drawer` | Undo / Redo buttons and shortcuts in the storefront customizer drawer | 1–1.5 d |

Flag off = the shipped product, unchanged. The feature is storefront only: no editor UI, no setting, no saved data.

## Behaviour

- History covers the **whole shopper layer** `custom` (`materials`, `meshes`, `options` and any key a later feature adds, such as decals). One step = the whole layer before the change, so undo never needs to know what a key means.
- Every change made in the drawer is a step: a swatch, the colour picker, a part toggle, a per-part reset, an option-group pick, **Reset Customizations**.
- **Coalescing**: changes to the same item (same mesh colour, same part, same group, same top-level key) with the same step label within 400 ms of the previous one join the current step, like the editor. A colour-picker drag, a slider drag or typing in a text field (decal text) is one step. A change touching several items never joins a step, and Reset never joins a pick (its label differs).
- **Cap**: 50 steps; the oldest is dropped.
- A new change after an undo clears the redo list.
- A change that leaves the layer as it was (picking the colour already shown) is not a step. A drag that ends where its step started removes that step.
- **History is cleared** when:
  - the variation changes or is cleared (the existing bridge already drops the shopper's choices then; old steps belong to another variation's options and prices, so restoring them could apply choices that do not exist or price differently);
  - the viewer remounts (page load, Add to cart re-renders the form, modal reopened after Add to cart);
  - something outside the drawer replaces the layer (it did not come from a step the shopper can see). A feature that wants its outside change to be undoable writes through `history.set` (below). Layers the history itself wrote that are still rendering (a fast picker drag outruns the re-render) do not count as outside changes.
- History lives in memory only (per viewer instance). Nothing is stored in the cart, the session or localStorage.

## Data

No new stored data. Cart, order, config and settings shapes are unchanged. History entries in memory:

```js
{ value: custom | null,   // the whole shopper layer before the step
  label: String }         // what the step did, for the tooltip ("Seat Cushion color")
```

## Storefront UI

Shown wherever the drawer is shown (`replace` gallery slide, `tab`, `modal`, `shortcode`/`inline`; not the shop listing modal or the order preview, which have no drawer).

### Drawer footer

The footer row becomes: **Undo** and **Redo** icon buttons, then **Reset Customizations** filling the rest. The option-pricing "Options" total stays above the row.

- Icons: `sf-undo` / `sf-redo` (same paths as the editor's undo/redo icons, storefront size 14, stroke 2.5), buttons styled like `.wc3d-customer-drawer__reset-btn` (white, slate border, 34 px square).
- `aria-label`: "Undo" / "Redo". Disabled = `aria-disabled="true"` (keeps focus and the tooltip; a click does nothing), greyed.
- Tooltip (`title`), built from the step label and the platform shortcut:
  - `Undo: Seat Cushion color (Ctrl+Z)` / `Redo: Hide Pillow (Ctrl+Shift+Z)`; on Mac `⌘Z` / `⇧⌘Z`.
  - Nothing to undo: `Nothing to undo`; nothing to redo: `Nothing to redo`.
- Screen readers: a polite live region announces `Undone: Seat Cushion color` / `Redone: Seat Cushion color`.

### Step labels (exact copy)

| Change | Label |
| --- | --- |
| Colour set on a part (swatch or picker) | `<Part> color` |
| Per-part colour reset | `Reset <Part> color` |
| Part shown / hidden | `Show <Part>` / `Hide <Part>` |
| Per-part visibility reset | `Reset <Part>` |
| Option-group pick | `<Group label>` (e.g. `Frame finish`) |
| Reset Customizations button | `Reset Customizations` |
| Several items in one step | `<n> changes` |
| Another feature's key | its registered label, else the key in words (`Decals`) |

`<Part>` is the mesh name in words, as the drawer shows it (`Seat_Cushion` → `Seat Cushion`). Copy is US English like every other plugin string.

### Keyboard

- `Ctrl+Z` / `⌘Z` = undo; `Ctrl+Shift+Z` / `⇧⌘Z` / `Ctrl+Y` = redo.
- Active while focus is anywhere inside the viewer (canvas, controls, drawer), also with the drawer closed. Clicking the 3D canvas puts focus on the viewer (the wrapper gets `tabindex="-1"`, no focus ring for mouse focus).
- Ignored in text fields (text, number, email, textarea, contenteditable) so their own undo keeps working; works on swatches, checkboxes, selects and the colour input.
- Handled keys call `preventDefault()`; with nothing to undo the key is still swallowed inside the viewer (no browser action exists there anyway).

## Cart and order

No change. Add to cart posts the layer as shown; the history is discarded with the remount.

## Interactions with other flags

- `option-pricing`: the "Options" total and price box follow the restored layer, as they follow any change.
- `option-groups`: picks are steps labelled by group; Reset (back to defaults) is a step. A restored layer goes through the same `shopperLayer()` rendering, so inactive groups and defaults behave as on a fresh pick.
- `order-snapshot`: unaffected (captured from the layer at Add to cart).
- Any feature that adds a key to `custom` (decals, materials variants as options) gets undo for free if it writes through the drawer's `setCustom`. It can name its steps with `registerHistoryLabel(key, (before, after, ctx) => label)` or per call with `setCustom(next, { label })` (`decals` passes the area label, e.g. `Monogram`; the label does not stop merging), and merge an automatic follow-up change into the shopper's step with `setCustom(next, { merge: true })`.
- `saved-designs`: the drawer's **Share design** button takes a full row above Undo / Redo / Reset (any other footer element does too; the grid uses dense flow so Reset stays beside the history buttons whatever the order).

## Prototype

- `js/screens/store/drawer-history.js`: `useDrawerHistory()` hook (stacks, coalescing, labels, keyboard, focus), `<DrawerHistoryButtons>`, `describeChange()`, `registerHistoryLabel()`.
- `viewer-ui.js` hook-in: the `Viewer` wraps its `setCustom` with the hook and hands the recording setter and `history` to the drawer; the drawer footer renders the buttons. The mount-time and variation-change clears keep using the raw setter.
- `css/drawer-history.css`.

## Plugin notes (for the real build)

- **No PHP, no data, no migration.** Nothing new is saved or posted; old configs, carts and orders behave exactly as today.
- `src/frontend/hooks/useCustomizer.ts`: keep `customMaterials` / `customMeshes` (and later `options`) in **one** state object (the layer) so a step is a single snapshot; `setColor`, `setVisibility`, `resetColor`, `resetVisibility`, `resetAll` become writes through `record(next, key, label)`. `resetAll` from `useActiveVariation` (variation change) clears history instead of recording.
- New `src/frontend/hooks/useCustomizerHistory.ts` (stacks, 400 ms coalescing on item + label, cap 50, labels). Detect outside changes against every layer the hook wrote since the last render caught up, not only the latest one: `<input type="color">` fires `input` faster than React commits, and comparing only the last write wipes the history mid-drag. and `useHistoryShortcuts(containerRef)` keydown listener on `.wc3d-viewer-wrapper` (`tabindex=-1`, `pointerdown` focuses it when nothing inside has focus).
- `CustomizerDrawer.tsx` footer: two buttons + `aria-live` region; `icons.tsx`: `UndoIcon`, `RedoIcon`; CSS in the storefront stylesheet (`.wc3d-customer-drawer__history-btn`, `.wc3d-customer-drawer__footer--history`).
- Strings through `__()` / `sprintf()` with translator comments: "Undo", "Redo", "Undo: %s", "Redo: %s", "Nothing to undo", "Nothing to redo", "Undone: %s", "Redone: %s", "%s color", "Reset %s color", "Show %s", "Hide %s", "Reset %s", "%d changes". Regenerate the POT.
- `useCartConfigSync` already mirrors whatever the layer is into `#wc3d_custom_config`, so restored layers reach the cart form with no extra code.
- Bundle impact: a few hundred bytes in the lazy viewer chunk; nothing on pages without the drawer.
