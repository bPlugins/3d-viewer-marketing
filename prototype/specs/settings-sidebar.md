# Settings sidebar

The section tabs on **3D Models → Settings** become a sidebar on wide screens. The merchant can collapse it to icons and drag it wider or narrower. Admin-only, no setting and no saved option, so it has no flag.

## Layout

```
┌──────────────────┬──────────────────────────────────────────────┐
│ [◧ Collapse menu]│ Display & Placements                         │
│ ┌──────────────┐ ⋮ Configure where and how the 3D player …     │
│ │▣ Display & … │ ⋮                                              │
│ │☀ Scene & …   │ ⋮ 3D Viewer Position   [cards …]               │
│ │◫ Customer …  │ ⋮                                              │
│ │⚙ Viewer …    │   ⋮ = drag handle                              │
│ │⧉ Features    │                                                │
│ │</> Shortcodes│                                                │
│ │◎ Data & …    │                              [Save changes]    │
│ └──────────────┘                                                │
└──────────────────┴──────────────────────────────────────────────┘
```

- Shown when the settings panel is at least 720 px wide and the script runs. Narrower, the tab grid stays as before (3 then 2 columns). Without the script, all sections stay stacked under the tab row.
- The sidebar is sticky below the admin bar. The default width is 240 px.
- **Collapse menu** (top of the sidebar) shrinks it to a 64 px icon rail. The button turns into **Expand menu**, and each tab shows its name as a tooltip. Tab names stay available to screen readers.
- **Drag handle** in the gap on the sidebar's end edge. It works like the 3D Viewer page splitter:
  - Drag sets the width, from 180 to 360 px. CSS also caps it at 40 % of the panel.
  - Double-click, or Enter, resets it to the default.
  - With focus, ←/→ change it by 10 px, or 50 px with Shift. Home and End jump to the minimum and maximum. RTL mirrors the arrows.
  - It is a `separator` named "Menu width", with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`.
  - It is hidden while the sidebar is collapsed.

## State

Per browser, in `localStorage` key `wc3d-settings-sidebar` as `{ collapsed, width }`, with `width: null` for the default. It is a viewing preference, so it never goes through Save changes. The template's pre-paint script applies it before first paint.

## Plugin

`templates/admin/settings.php` (markup + pre-paint), `assets/js/admin-settings.js` (behaviour), `src/admin/list/settings.css` (layout), `SettingsPage::SIDEBAR_STORAGE_KEY`. The prototype copies the CSS verbatim, and `screens/admin/settings.js` mirrors the behaviour.
