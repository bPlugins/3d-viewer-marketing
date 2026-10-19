# Lighting presets on demand

The plugin zip ships only the default **Studio** lighting file. The other nine presets are downloaded once, when an admin asks for them, into the site's uploads folder. The zip drops from about 15.7 MB to about 4.2 MB.

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `hdri-download` | Download buttons in the editor's Lighting section and a Lighting Presets row in Settings → Scene & Performance (download all, upload files) | 2 d |

Flag off = the shipped product, unchanged: all ten presets are bundled and always available.

Decision (2026-10-14): **option 1**, fully WordPress.org-compliant. Nothing is downloaded without an admin's click (guideline 7). No admin notice: a failed editor download already shows its own banner with Try again and the upload link. Stores updating from 1.1.x show Studio lighting for non-Studio presets until an admin downloads them (editor banner on that product, or Settings). Accepted: there is about one such store.

## Where the files come from

Public repo **`bPlugins/3d-viewer-assets`**, tag **`v1`**: the same ten files, byte-identical to `pmndrs/drei-assets` at `456060a26bbeb8fdf79326f224b6d99b8bcce736`. The plugin tries the sources in order and stops at the first that answers with a matching file:

1. `https://raw.githubusercontent.com/bPlugins/3d-viewer-assets/v1/hdri/<file>`
2. `https://cdn.jsdelivr.net/gh/bPlugins/3d-viewer-assets@v1/hdri/<file>`
3. `https://raw.githubusercontent.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/<file>`

If all three fail, the admin can upload the files (Settings). The zip to upload is GitHub's archive of the tag: `https://github.com/bPlugins/3d-viewer-assets/archive/refs/tags/v1.zip`.

Every file is checked against a SHA-256 hard-coded in the plugin (`PRESET_SHA256` in `js/shared/hdri.js`; the same table goes into PHP). A file that doesn't match is discarded, whichever source or upload it came from. Tags in the assets repo are never moved or deleted; new files go into a new tag.

## Storage and state

- Files: `wp-content/uploads/wc3d-hdri/<file>` (survives plugin updates; per site on multisite). Studio stays in `assets/hdri/` inside the plugin.
- The installed set is the folder's contents (files whose hash was verified on write). No option needed.
- Prototype state: `hdri.installed[preset] = { source: 'bundled' | 'download' | 'upload', at }` (missing → only Studio, bundled). `demo.hdriFail` = the prototype bar's "Fail download" switch.

## Viewer behaviour

- A preset that isn't installed renders as **Studio**, with no request for the missing file. PHP passes the installed list in the viewer bootstrap (storefront) and the editor root's data attributes, and `resolvePresetUrl(preset)` returns the uploads URL, the bundled Studio URL, or Studio as the fallback.
- The saved config keeps the chosen preset name (`environment.preset: 'forest'`). Downloading the file later makes the product show it, with no re-save.
- `custom` HDRIs (media library) are unaffected.

## A. Editor → Scene & Lighting → Lighting & Presets

- Each preset button that isn't downloaded shows a small download glyph. Tooltip: "Forest · not downloaded (1.9 MB). Click to download."
- Clicking it selects the preset **and** starts the download. The button shows a progress bar along its bottom edge. The viewport stays on Studio until the file arrives, then switches.
- Under the grid, while any preset is missing: "3 of 10 presets downloaded · Download all (12.6 MB)". While a batch runs: "Downloading 2 of 7…".
- When the selected preset isn't downloaded, a banner below the grid:
  - waiting: warning, "Forest lighting isn't downloaded yet" / "The preview and your store use Studio lighting until it is." / button "Download (1.9 MB)"
  - downloading: "Downloading Forest… 45%"
  - failed: danger, "Couldn't download Forest lighting." / the error / "Try again" · "Upload the files in Settings"
- Saving is never blocked: the preset name is saved and the store shows Studio until the file exists.

## B. Settings → Scene & Performance → Lighting Presets

A row after "3D Loading Behavior". It acts immediately (not part of the Save form).

- Title "Lighting Presets"; description: "Studio comes with the plugin. The other presets are downloaded once from GitHub into your uploads folder when you need them. Shoppers' browsers always load them from your own site."
- Summary "3 of 10 installed" + "Download all (12.6 MB)" + "Upload files…" (accepts `.zip` and `.hdr`, multiple).
- A list of the ten presets: name, file size, status chip (Included · Downloaded · Uploaded · Not downloaded · Downloading 45% · Failed) and a per-row "Download" / "Retry".
- Help line: "Server can't reach GitHub? Download the presets zip (16 MB) on your computer and upload it here."
- Upload result, inline: "Added 3 presets: Forest, City and Dawn." and/or "Skipped 1 file: notes.txt isn't one of the preset files." / "…: forest_slope_1k.hdr doesn't match the original file." / "Already installed: Studio."

## Plugin build notes

- REST, `manage_woocommerce`: `GET /wc3d/v1/environments` (each preset: file, bytes, installed, source), `POST /wc3d/v1/environments/download` `{presets: []}` (one file per request from the client so it can show progress; server uses `download_url()` with a 60 s timeout, verifies the hash, moves into `uploads/wc3d-hdri/`), `POST /wc3d/v1/environments/upload` (multipart; `.zip` unpacked with `unzip_file()` into a temp dir; only hash-matching `.hdr` files kept).
- Users without `manage_woocommerce` see the glyphs and banner but the button reads "Ask an administrator to download it" and is disabled.
- Sources filterable: `wc3d/hdri/sources` (array of base URLs). Document in `docs/HOOKS.md`.
- `readme.txt`: add the "External services" section (what is contacted, when, what is sent: the server's IP only; links to GitHub's and jsDelivr's terms and privacy policies). Update the FAQ line about third-party requests: still true for shoppers.
- `scripts/zip.js`: ship only `assets/hdri/studio_small_03_1k.hdr` (+ README not shipped).
- Uninstall with "delete data" on: remove `uploads/wc3d-hdri/`.
