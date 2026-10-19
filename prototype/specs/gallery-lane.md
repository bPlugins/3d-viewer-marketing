# Gallery strip on the bottom row

Prototype spec for a storefront layout fix: the four view thumbnails (perspective, front, side, back) stay on the viewer's bottom row instead of floating over the model.

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `gallery-lane` | Strip placed in the measured lane between the controls stack and the fullscreen button; thumbnails shrink to fit; column above fullscreen as the fallback | 0.5–1 d |

A layout fix, not a feature module: no setting, no data. Off = today's strip exactly.

## Why

The strip is centred on the canvas. Below 600 px wide, with the labelled **View in AR** and **Customize** buttons, the centred strip would touch them, so today's CSS lifts it to `bottom: 50px` (one labelled button) or `88px` (both). At a common 510 px gallery column it then floats over the lower part of the model, away from every other control. The lift uses fixed numbers, so a longer translated label ("In AR ansehen") can still collide.

## Layout

Measured, not guessed: a `ResizeObserver` on the canvas container and the controls stack reads

- **left edge** = stack right edge + 12 px (10 px inset + 12 px when there is no stack)
- **right edge** = fullscreen button left edge − 12 px (10 px inset when there is no fullscreen button)

and writes them as `--wc3d-lane-left` / `--wc3d-lane-right` plus `data-wc3d-gallery="row|column|none"` on the canvas container. Label changes (Customize → Close, translations) and the drawer opening re-measure.

**Row** (lane ≥ 146 px, room for four 32 px thumbs):

- `bottom: 10px`, the same baseline as the stack and fullscreen (today's 12 px was 2 px off).
- Centred on the canvas when that clears both edges; otherwise as close to the centre as the lane allows (`left: clamp(laneLeft, 50% − strip/2, 100% − laneRight − strip)`).
- Gap shrinks first (10 → 6 px), then thumbnails (56 → 32 px), all in CSS from the lane width.

| Canvas, AR + Customize | Now | Proposed |
| --- | --- | --- |
| 700 px | centred, bottom row | centred, bottom row |
| 510 px | lifted 88 px over the model | bottom row, 56 px thumbs, 2 px right of centre |
| 360 px | lifted 88 px over the model | bottom row, ~40 px thumbs |
| 300 px | lifted, overlapping the model's legs | column of 36 px thumbs above fullscreen |
| 420 px (700 px with drawer open) | lifted | bottom row |

**Column** (lane too narrow, enough height): 36 px thumbs stacked on the right, above the fullscreen button.

**None** (neither fits, e.g. a tiny canvas beside the drawer): strip hidden, as today below 120 px.

Labels never collapse to icons for this (they stay until the existing 180 px rule).

## Plugin

- `src/frontend/Viewer.tsx`: a `useGalleryLane()` hook (callback ref on the `GalleryStrip` root; the modal layout portals the tree after the first layout effect, so a plain ref is still empty there). Lives in the `viewer-canvas` chunk; `frontend.js` size unchanged.
- `assets/css/frontend-static.css`: replace the `bottom: 50px / 88px` lifts and the 260–357 px shrink block with the `[data-wc3d-gallery]` rules; keep the no-JS default (centred, `bottom: 10px`).
- `src/modules/customizer-modal/frontend.css`: drop its gallery lift overrides; the measurement already sees the hidden Customize button.
- Themes that restyle `.wc3d-gallery-row` keep working: same class names, same markup, only an extra data attribute.

## Prototype

- Flag `gallery-lane` (Planned features). With it on, every storefront viewer uses the lane.
- **Gallery lane** page (`#proto.gallery-lane`, storefront bar while the flag is on): lounge chair (AR + Customize) at selectable canvas widths, **Now** and **Proposed** side by side, Customize opening the drawer or the modal.
