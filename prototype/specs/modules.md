# Feature modules and the Features tab

Prototype spec for **feature modules**: optional features the merchant switches on or off for the whole store, each living in its own folders so it can be removed by deleting them. "Feature modules" is the name in UI and docs, to keep them apart from the BPEM modules in `docs/MODULE_INTEGRATION.md`.

| Flag | Feature | Status |
| --- | --- | --- |
| any feature with `module: true` in `js/core/features.js` | One card on Settings → **Features**; the flag is the card's toggle | first module: `customizer-modal` (shipped) |

A feature module keeps its flag after it ships. The flag is the module's toggle, so the prototype bar, the roadmap page and the Features tab all switch the same thing.

## Settings → Features

- A tab on the 3D Models Settings page, labelled **Features** (icon `puzzle`), placed after **Viewer Toolbar**. Section key `modules`: `#admin.settings.modules`, panel `#wc3d-section-modules`, tab `#wc3d-tab-modules`.
- Heading **Feature modules**; description: "Switch optional features on or off for the whole store. Switching one off hides it everywhere; its saved settings are kept for when you switch it back on."
- It is part of the same settings form: one **Save changes** writes `wc3d_settings` and `wc3d_modules`, and the toggles count toward "Unsaved changes".
- One card per installed module, in the `.wc3d-row` layout of the other rows:
  - icon tile, **title** with a status badge: **Active** (green), **Off**, **Blocked** (amber)
  - description
  - one **Requires: X** badge per required module, or **Requires: X (not installed)** when that module's folders are missing
  - a reason line when blocked, e.g. "Waiting for Option groups."
  - the module's own settings under the description, if it has any (none today)
  - the toggle `wc3d_modules[enabled][<id>]` (`id="wc3d_module_<id>"`), plus a hidden `wc3d_modules[rendered][]` with the id
- A blocked card keeps its switch usable and its stored **on**. It becomes active by itself once its requirements are on.
- Hidden `wc3d_modules[_form]` once, after all cards. Only ids posted in `rendered[]` are decided on save, so a module that is not installed (or failed, or killed) keeps its stored value.
- No modules installed: "No feature modules are installed."
- The option holds ids no installed module has: muted note "Saved settings kept for N removed modules."

## Module rules

- **Removal = delete the folders.** A module is `includes/Modules/<Pascal>/` plus `src/modules/<kebab-id>/`. Deleting both and rebuilding removes it; core never names a module. `npm run zip -- --without=<id>` builds a release without it.
- **Data is kept.** Switching a module off, deleting its folders or updating the plugin never deletes its decision or settings in `wc3d_modules` (or any `wc3d_mod_<id>_*` data). Switching it back on, or reinstalling the folders, restores the previous state.
- **Uninstall** (with "Delete all data") does not remove `wc3d_modules` yet; that needs the owner's approval. So a reinstall keeps the old choices and is not treated as a new install.
- **First decision, made once per module and then frozen** (the stored decision always wins afterwards):
  1. a legacy setting, if the module has one (`customizer-modal`: stored `customizer_layout` `'modal'` = on, `'drawer'` = off; the key is never deleted)
  2. else a brand-new install gets the module's new-install default (on for `customizer-modal`)
  3. else an existing site that updates gets the update default (off), so no new UI appears after an update
- Only an explicit new-install marker counts as new. A site with no `wc3d_modules` option at all is an updated site.
- Licensing stays all-or-nothing: modules run only inside the existing licence gate.

| Site | `customizer-modal` after the update |
| --- | --- |
| Brand-new install | on |
| Saved `customizer_layout = 'modal'` (1.1.0 dev/staging, or a fresh install seeded that way) | on |
| Saved `customizer_layout = 'drawer'` | off |
| Older site, no layout key | off |

## Prototype

- `js/core/features.js`: `module: true` and `description` on the feature; `MODULES`, `moduleCards(toggles)` (status, reason, requires), `canToggle(f)` and `alwaysOn(f)` (a shipped module is not "always on").
- `js/screens/admin/settings-features.js`: the cards; `settings.js` adds the tab and saves the toggles into `flags` with the rest of the form. Ids in `flags` that no feature knows stand for a removed module.
- The seed is a new install: `flags['customizer-modal']: true`. Store `VERSION` 9.
- The demo has one module and no requirements, so Blocked and "(not installed)" show only when a module with `requires` is added.
