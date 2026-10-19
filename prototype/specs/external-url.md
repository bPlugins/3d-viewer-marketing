# Model from a URL

Prototype spec for roadmap item 12 (`resource/COMPETITOR-LANDSCAPE-ANALYSIS.md` §5): use a GLB (or the iOS USDZ) hosted on a CDN instead of uploading it to the media library.

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `external-url` | "External URL" source next to the media library wherever a model is chosen; URL check; External badge wherever the model shows | 1–2 d |

Flag off = the shipped product, unchanged: no tab, no link, no badge, and external records are hidden from every media list.

## Data: an external attachment (new keys only)

An external model is an **attachment record with no file**, so every existing id field keeps working untouched: `_wc3d_model_id`, the variation `model_id`, `ar.usdzId`/`ar.usdzUrl`, coverage, thumbnails, the order preview.

```js
attachments[id] = {
  id, kind: 'model' | 'usdz',
  source: 'url',                    // new: marks an external record
  url: 'https://cdn.example.com/models/travel-mug.glb', // new: the file address, as entered (trimmed)
  title: 'travel-mug', filename: 'travel-mug.glb',      // from the URL path
  mime: 'model/gltf-binary' | 'model/gltf+json' | 'model/vnd.usdz+zip',
  sizeBytes,                        // from the check (Content-Length)
  date,
  check: { status: 'ok' | 'warn', checkedAt, contentType, cors: true | null }, // new: last check
  demo?,                            // prototype only: which demo model the URL stands for
}
```

- Re-using the same address re-uses the record (matched on `kind` + `url`), so the library never fills with duplicates.
- For the iOS AR file the config stores `ar: { usdzId, usdzUrl }` as today; `usdzUrl` is simply the external address.
- Only addresses that pass the check can be saved. `check` is refreshed every time "Check URL" runs on that address.
- Seed: `561` (`https://cdn.example.com/models/lounge-chair-teal.glb`, unassigned) and `562` (`https://cdn.example.com/models/lounge-chair.usdz`, unassigned), visible in the media lists with the flag on. Travel Mug (145) has no model, ready to try it on.

## Shared core: `js/shared/external-url.js`

| Export | Use |
| --- | --- |
| `validateUrl(text, kind)` | Sync rules → `{ok, url, ext, error}` |
| `checkUrl(url, kind)` | The "server" check → Promise of `{status: 'ok'\|'warn'\|'error', rows, message, …}` |
| `useExternalUrl(kind, initialUrl?)` | Hook for a media modal: `{pane, ready, use()}`; `use()` calls `saveExternal(result)` |
| `saveExternal(result)` | The "server" save: creates or re-uses the attachment (`store.nextId('attachments')`), refreshes `check` |
| `isExternal(att)`, `urlHost(url)`, `inLibrary(att)` | Record tests; `inLibrary` hides external records with the flag off |
| `<ExternalTag att />`, `<ExternalHost att prefix? />`, `<ExternalDetails att />` | "External" badge; badge + host line; media sidebar details |
| `DEMO_URLS` | Demo addresses listed under the field (prototype only) |

### Validation (as you type, before any request)

| Rule | Message |
| --- | --- |
| Not a URL | "Enter a full address starting with https://." |
| `http://` (other than the site's own domain) | "Use an https:// address. Browsers block http:// files on an https:// store." |
| Path (query ignored) not ending in `.glb`/`.gltf` (model) or `.usdz` (AR file) | "The address must end in .glb or .gltf." / "The address must end in .usdz." |
| Longer than 2,048 characters | "The address is too long (2,048 characters max)." |

### Check URL

The plugin asks its own server to fetch the headers (and the first bytes) of the file, sending the store's `Origin`. The prototype must not contact other hosts, so it simulates the answer from the URL text; addresses on the prototype's own origin and `blob:` URLs are fetched for real and load for real.

Result rows (label · value, each with an ok / note / fail mark):

| Row | Values |
| --- | --- |
| Reachable | "Yes (200 OK)" · "No (404 Not Found)" |
| File size | "2.3 MB" · "148 MB, over the 64 MB limit" |
| Cross-origin (CORS) | "Allowed for demo.store" · "Blocked for demo.store" · "Not needed for AR files" (usdz) |
| Content type | "model/gltf-binary" · "text/html (a web page, not a model file)" |

Simulated outcomes, first match wins (lowercased URL):

| URL contains | Outcome | Message |
| --- | --- | --- |
| `404`, `missing` | error | "Nothing was found at this address. Check the link, and that the file is public." |
| `private`, `cors` | error | "The file is there, but its host doesn't allow your store to load it. Ask the host to allow demo.store (Access-Control-Allow-Origin)." |
| `dl=0`, `/view`, `drive.google` | error | "This link opens a web page, not the file. Use the file's direct link." |
| `huge`, `-scan`, `scans/` | error | "The file is 148 MB. Use a model under 64 MB so the product page stays fast." |
| a file name with no demo model | error | the 404 message |
| a `.gltf` file | warn | "A .gltf file loads its .bin file and textures from the same folder. They need the same CORS access." |
| a name that maps to a demo model (sofa/couch → wide chair, lamp, chair, mug/cup, table/stool) | ok | no message |

Same-origin and `blob:` addresses get a real fetch: status, size, `Content-Type`, and the `glTF` / JSON / `PK` magic bytes; CORS reads "Same site, not needed". They are saved without `demo` and the viewer loads the URL itself.

Result heading: "Ready to use" (ok), "Ready to use, with a note" (warn), "Can't use this URL" (error).

## Admin UI

### Media modals (product "3D Model" tab, coverage bulk assign, editor pickers)

Both media frames gain a third router tab **"External URL"** when the frame picks a model (`kind="model"` / `filter: 'model'`) or the AR file (`urlKind: 'usdz'`):

- Field label "Model URL" (or "USDZ file URL"), placeholder `https://cdn.example.com/models/chair.glb`, help "Paste a direct link to a .glb or .gltf file." (usdz: "Paste a direct link to a .usdz file.").
- "Check URL" button (Enter in the field does the same); "Checking…" while it runs. Editing the address clears the result.
- Result box with the heading, the four rows and the message.
- Caveats box "About external models":
  - "The file stays on the other host. Nothing is copied to your site."
  - "The host must allow your store's domain (CORS), or the viewer can't load the model."
  - "Draco and Meshopt compressed models work: the decoders ship with the plugin, so nothing else is loaded from other hosts."
  - "If the file moves or is removed, the viewer shows an error. Check the URL again after changing it on the host."
- Prototype hint: "No request leaves the page. Try a demo address:" with clickable demo URLs (click = fill + check) (a working one per demo model, plus 404, CORS, web page, too large and .gltf cases).
- The frame's primary button ("Use this model" / "Use this file") is enabled only after a passing check of the current address (tooltip "Check the URL first."); it creates or re-uses the record and selects it like a library pick.
- Media Library tab: external records show the External badge on the tile; the details sidebar shows the badge, "File URL:" = the external address and "Last checked: <date>".
- Editor pickers: `useMediaPicker({…, urlKind})`; the variation model picker (`filter: 'model'`) gets the tab automatically, the AR panel passes `urlKind: 'usdz'`.

### Product "3D Model" tab (launcher)

- GLB Model empty state gets a link under the box: "Use a URL instead", opening the frame on the External URL tab.
- File state for an external model: file name, then the External badge and "GLB file · cdn.example.com" (or "glTF file · …") instead of "3D GLB Model Asset".
- "Change" on an external model opens the frame on the External URL tab with the address filled in, so the merchant can check it again or replace it.

### Where the model name shows

External badge + host (full URL in the tooltip) in: 3D Models list "Model File" column, editor overview header ("External · cdn.example.com · travel-mug.glb · 3 meshes" instead of the "GLB" badge), editor "Custom GLB Model" (variation) card, AR panel USDZ card, coverage Model and AR columns.

## Storefront

- `modelOf()` is unchanged for demo-mapped records (they carry `demo`). An external record without `demo` returns `{url}` only when the URL is same-origin (blob: included), loaded by the same GLTFLoader path as uploads; the prototype never loads from another host.
- Nothing else changes: product page, shop modal, shortcode, block, cart "View in 3D", order preview and snapshots all resolve the model through `modelFor()`.
- AR: `usdzUrl` is the external address; iOS Quick Look opens it directly (no CORS needed).

## Cart and orders

No change. Carts and orders store product/variation ids and the shopper layer, never the model address. The order preview loads whatever model the product has now, as today.

## Interactions with other flags

- `coverage`: external models count as a model; size comes from the check. "Assign model" uses the same frame, so it gets the External URL tab. Oversized flag uses `sizeBytes` from the check.
- `usdz-export`: the generated AR file is built from the loaded scene, so an external GLB works as long as it loaded (CORS ok). The external USDZ in the AR panel wins over generation, as an uploaded one does.
- `materials-variants`: variants are read from the loaded GLB, so they work for external files the same way.
- `order-snapshot`, `saved-designs`, `block`, `decals`, `option-*`, `conditional-logic`, `undo-redo-drawer`: no interaction; they work on whatever `modelFor()` returns.

## Plugin notes (for the real build)

- **Storage**: an attachment post with no file: `post_mime_type` = model mime, `guid` = URL, post meta `_wc3d_external_url` (the URL) and `_wc3d_external_check` (JSON: status, size, content type, CORS, checked at). Filter `wp_get_attachment_url` (and `wp_prepare_attachment_for_js` for `url`, `filesizeInBytes`, a `wc3dExternal` flag) for those posts. Every existing reader (`VariationConfigRepository::with_model_url`, `ProductViewerSettings`, `ViewerBootstrapBuilder`, `OrderPreview`, `ModelsController::format_model`) then gets the external URL with no change, and `wc3d/asset_url` still runs on it.
- **REST**: `POST /wc3d/v1/models/external` `{url, kind}` → validate, check, create or re-use the attachment, return it as `wp.media` JSON. `POST /wc3d/v1/models/check-url` → check only. Capability `upload_files` + `edit_products`, nonce as the other routes.
- **Check**: `wp_safe_remote_head()` (falls back to a ranged `wp_safe_remote_get( bytes=0-11 )`) with header `Origin: home_url()`; read status, `Content-Length`, `Content-Type`, `Access-Control-Allow-Origin` (`*` or the store origin = ok); verify the `glTF` magic for .glb, `asset.version` for .gltf, `PK`/`usdh` for .usdz (same rules as `MimeTypes::verify_glb_filetype`). `wp_safe_remote_*` already refuses private/loopback addresses (SSRF). Limit 64 MB, filterable (`wc3d/external_url/max_bytes`); timeout 10 s.
- **Model parse**: the editor needs the server's `scene_schema` (mesh tree, inspector, mesh count: `useActiveModel` → `getModel`/`registerModel`), so external models must be parsed too. `ModelsController::register_model` and `ModelRepository::get_or_create_for_attachment` use `get_attached_file()`, which is empty for external posts and returns 404 today. Branch on `_wc3d_external_url`: download the file once with `download_url()` (size capped at the limit) to a temp file, run `GlbParser::validate_magic` + `parse_from_file`, store the model row as for uploads (hash from `ETag`/`Content-Length` + URL), then delete the temp file. Re-parse when "Check URL" reports a different hash. `format_model` takes `filename` from the URL path and `sizeBytes` from `_wp_attachment_metadata['filesize']`, which the create route sets from the check. `.gltf` hits the same limit as an uploaded `.gltf` today (`GlbParser` reads GLB only).
- **UI**: the launcher uses `wp.media` frames; add the tab as a custom `wp.media.controller.State` + view (`src/admin/launcher/`), and the editor's `useMediaPicker` (`src/admin/editor/hooks/useMediaPicker.ts`) gets the same state, with `urlKind` for the AR file. Badge + host in `ListTable.php` (Model File column) and the editor overview.
- **Storefront**: GLTFLoader already uses `crossOrigin = 'anonymous'`; Draco/Meshopt decoders stay local. Add `<link rel="preconnect" href="https://<host>" crossorigin>` on product pages whose model is external. A load failure shows the viewer's existing error state.
- **Backward compat**: no schema change; `schema_version` stays 1. Old products, variation rows, carts and orders are untouched. Deactivating the feature (or downgrading) leaves the posts as attachments with an unknown file; the viewer then gets the `guid` URL, which is still the external address.
- **Not in scope**: signed URLs (roadmap item 15), copying the file into the media library ("Import to Media Library" could be a later button), periodic re-checks.
