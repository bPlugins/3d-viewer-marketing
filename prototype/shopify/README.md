# Shopify app prototype

Clickable prototype of the planned **3D Product Configurator for Shopify** (bPlugins). It follows `docs/SHOPIFY-ROADMAP.md` and runs on demo data.
- Page: `prototype/shopify.html`. Code lives in `prototype/shopify/`.
- Run locally with `npm start`, then open `/shopify.html`.
- It reuses the WP prototype's engine (`../js/engine/*`), Preact + htm (`../js/core/ui.js`) and the config resolver (`../js/shared/effective-config.js`).

## Hard rules (same as the WP prototype)

**Imports and network**
- Never import from the plugin's `src/` or `includes/`.
- From the WP prototype, import only `js/core/ui.js`, `js/engine/*` and `js/shared/effective-config.js`.
- Script CDNs allowed: jsDelivr (`cdn.jsdelivr.net/npm/`), cdnjs, unpkg. No other network requests: no remote images and no fetch to other hosts.

**Blocked browser APIs**
- No `alert()`, `confirm()`, `prompt()`, `window.print()` or `<a download>`. Build confirmations into the page with `Modal` or inline UI.
- Wrap every `localStorage` access in try/catch. `core/store.js` already does this.

**Data**
- No `Date.now()`-style ids in data. Use `store.nextId(collection)` or `nextDesignCode()`.

**Quality bar for every route**
- No console errors at 1440px or 390px.
- No horizontal page scroll at 390px.
- Side gutter written as `max(16px, env(safe-area-inset-left/right, 0px))`.

**Look and branding**
- One light look; no dark mode.
- Never use a real vendor's logo. The admin chrome is a generic "Admin". Say "Shopify" only as the platform name in text.

**Copy**
- Plain, active voice.
- Name things the way merchants and shoppers recognise them.
- No lorem ipsum.

**Comments**
- 1–2 lines, only where intent isn't obvious.

## Files and ownership

```
shopify.html                 page shell (CSS links, import map). Owner: lead
shopify/app.js               router host + prototype bar (Plan Basic/Plus, Currency USD/EUR, Reset). Owner: lead
shopify/routes.js            ROUTES token → lazy screen module + surface label. Owner: lead
shopify/guide.js             #guide map. Owner: lead
shopify/core/store.js        store, useStore(sel), setIn, getIn
shopify/core/seed.js         demo data (single source of truth for shapes)
shopify/core/commerce.js     money, config resolution, option logic, pricing, line properties, designs, cart, Cart Transform, orders
shopify/core/router.js       useRoute(), go(token), parseHash()
shopify/ui/icons.js          <Icon name size/>; names in ICON_NAMES
shopify/ui/polaris.js        Polaris-like components (see below)
shopify/ui/viewer.js         ProductImage, DesignImage, captureSnapshot, StoreViewer, Viewer3D, renderThumbnail
shopify/admin/chrome.js      <AdminFrame current appTitle appActions>
shopify/css/base.css         prototype bar, shared viewer/hotspot/product image styles, guide
shopify/css/admin.css        admin frame + .p-* components
shopify/css/store.css        storefront tokens (--sf-*)

shopify/admin/{home,products,presets,designs,settings,plans,catalog,product,orders,order,preview}.js   admin screens (.as-* in css/admin-screens.css)
shopify/admin/editor/        index (app window), state (draft, undo, save/publish), sidebar, viewport, inspector, panels-*, fields (.ed-* in css/editor.css)
shopify/store/               theme (chrome + cart drawer), product (ProductView, setPendingDesign), customizer, modals, order-parts, home, cart, checkout, thanks, design (.sf-* in css/store-screens.css)
shopify/account/             chrome, orders, order, designs
shopify/theme/editor.js      theme editor (.te-* in css/theme-editor.css)
```

`app.js` mirrors `app.modules.personalization` / `material-variants` into the WP prototype's engine flags (`flags.decals`, `flags['materials-variants']`), because the shared engine reads those.

Only edit files you own. If a shared file needs a change (commerce.js, polaris.js, viewer.js, seed.js), keep it additive: add new exports and new seed keys, and never rename or change existing ones. Each change must be one small, focused edit, so parallel work doesn't collide. Re-read the file right before you edit it.

## Routing

Routes are hash tokens separated by dots, e.g. `#admin.editor.1001.2003`.
- A screen module default-exports `({ params, token })`. `params` holds the segments after `area.screen`.
- Navigate with `<a href="#store.cart">` or `go('store.cart')`.
- Screens load lazily, and a failing screen shows an error box without breaking the others.

| Token | Screen |
|---|---|
| `admin.home` | App Home dashboard |
| `admin.products` | 3D products / coverage |
| `admin.presets` | Presets |
| `admin.designs` | Saved designs |
| `admin.settings[.tab]` | Settings |
| `admin.plans` | Plans |
| `admin.editor.<pid>[.<vid>]` | Editor in an app window |
| `admin.catalog` | Native products list |
| `admin.product.<pid>` | Native product page + our admin block |
| `admin.orders` | Native orders list |
| `admin.order.<id>` | Native order page + our admin block |
| `admin.preview.<orderId>.<lineId>` | 3D order preview in an app window |
| `theme.editor` | Theme editor |
| `store.home` | Collection grid |
| `store.product.<handle>` | Product page |
| `store.cart` | Cart |
| `store.checkout` | Checkout |
| `store.thanks.<orderId>` | Thank-you page |
| `store.design.<code>` | Share link restore |
| `account.orders` | Customer orders |
| `account.order.<id>` | Customer order status |
| `account.designs` | Customer saved designs |

## Data (core/seed.js)

| Key | Contents |
|---|---|
| `shop` | `{name, domain, plan: 'basic'\|'plus', currency, theme}` |
| `app` | `{plan: 'free'\|'growth'\|'business', installedAt, embedEnabled, onboarding{model,editor,embed,block,preview}, blocks{product:[...]}, modules{<id>: bool}, settings{placement, loading_trigger, customizer, customizer_layout, toolbar{zoom,reset,autorotate,fullscreen,ar}, palette[], share_link_lifetime, ar_configured, shop_badge, coverage_max_model_mb}}` |
| `files[id]` | Shopify Files MODEL_3D: `{id, kind:'model3d', demo, filename, sizeBytes, status, usdz, triangles, draco?}` |
| `products[id]` | `{id, title, handle, status:'active'\|'draft', vendor, type, price, options:[{name, values}], variants:[ids], media:[fileIds], image:{model,bg}\|{swatch}, description, inventory}` |
| `variants[id]` | `{id, productId, title, options:{Color:'Sand'}, price, sku, swatch?}` (`'Default Title'` for single-variant products) |
| `configs[pid]` | `{enabled, modelFileId, config, updatedAt, publishedAt, customizer:'inherit'\|'on'\|'off'}`. `config` is the WP plugin's schema_version 1: `meshes`, `materials`, `camera`, `environment`, `animations`, `hotspots`, `optimization`, `ar`, `options[]`, `decals[]`, `gallery_presets`. Option groups have `{id,label,type:'color'\|'material'\|'parts',display,targets,required,default,description,conditions,choices:[{id,label,color,material,show,price:{type:'fixed'\|'percent',amount,sale?},conditions}]}`. Condition rules: `{source:'group',groupId,op:'is'\|'is_not'\|'has_choice'\|'no_choice',choiceId}` or `{source:'option',name,op,value}` (variant option) |
| `configs[pid].optionRules` | `{'Color=Teal': {modelFileId\|null, config}, 'Size=Wide': {...}}`: one layer per option value, set once and combined for every variant that has that value |
| `variantConfigs[vid]` | `{modelFileId\|null, config}`: per-variant exceptions on top of the option rules |

Resolution order: product default ← option rules (in product option order) ← variant exception. Option rules always inherit meshes and materials, even when they bring their own model (e.g. the wide chair), because the mesh names are the same. A variant's own model inherits nothing, which is the WP rule. Code: `resolveLayers` / `rulesFor` / `layerModelId` in commerce.js.
| `presets[id]` | `{id, type:'material'\|'environment'\|'camera'\|'animation', name, data}` |
| `customers[id]` | `{id, name, email}` |
| `designs[code]` | `{code, kind:'saved'\|'cart', productId, variantId, customerId, name, createdAt, expiresAt, views, choices}` |
| `orders[id]` | `{id, name, date, customerId, financial, fulfillment, shipping, lines:[{id, productId, variantId, qty, designCode, transform:'expand'\|'update'\|null, base, addons:[{label,amount}], properties:[{name,value}], snapshot?}]}` |
| `cart` | `{lines:[{key, id, productId, variantId, qty, choices, designCode, properties, snapshot}], note}` |
| `demo` | `{customerId (logged-in shopper), currency:'USD'\|'EUR', seq}` |

**`choices`** is the shopper's input and the shape stored on designs and cart lines:
- `{options: {groupId: choiceId}, decals: {areaId: {kind:'text', text, font, color, size, x, y, rotation}}, colors?: {mesh: hex}, parts?: {mesh: bool}}`
- `colors` and `parts` come from the plain customizer, for meshes flagged `customizable` or `optional`.

## core/commerce.js API

**Money and lookups**
- `money(n)` gives `"$449.00"`, or `"€413.08"` when the bar's currency is EUR. `moneyDelta(n)` gives `"+$15.00"`.
- `productByHandle(s, handle)`, `variantsOf(s, pid)`, `firstVariant(s, pid)`, `has3D(s, pid)`, `customizerOn(s, pid)`.

**Config and options**
- `modelFor(s, pid, vid)` returns `{file, model:{demo}, hasOwnModel}`.
- `effectiveFor(s, pid, vid)` returns the effective config.
- `visibleGroups(config, choices, variantOptions)` applies conditional logic.
- `resolvedPicks(config, choices, variantOptions)` returns `{groupId: choice}` (the default when nothing is picked).
- `shopperLayer(config, choices, variantOptions)` returns `{materials, meshes, decals}` and is passed as `custom` to the viewer.
- `configuredConfig(s, pid, vid, choices)` returns the effective config with choices baked in.

**Pricing**
- `ruleAmount(rule, base)`
- `priceLines(s, pid, vid, choices)` returns `[{label, amount, regular?}]`.
- `priceSummary(...)` returns `{base, lines, addons, total}`.
- `missingRequired(...)` returns the labels still missing.

**Designs, cart and orders**
- `lineProperties(s, pid, vid, choices, code)` returns `[{name, value}]`, including the hidden `_3d_design` and `_3d_hash`.
- `visibleProps(props)`
- `createDesign({productId, variantId, choices, kind, name, customerId})` returns the code. `nextDesignCode()`, `nowStr()`.
- `addToCart({productId, variantId, qty, choices, snapshot})` creates a cart design and its properties, and returns the code.
- `transformLine(s, line)` returns `{mode: null|'expand'|'update', unit, sum, components?, title?, image?}`. Basic uses expand (`lineExpand`); Plus uses update (`lineUpdate`).
- `cartTotals(s)`, `placeOrder()` (returns the order id), `orderTotals(s, order)`.

## ui/polaris.js

**Layout**
- `Page({title, subtitle, backHref, primaryAction:{content,onAction,href,disabled,loading,icon}, secondaryActions:[{content,onAction,href,icon,variant}], titleMeta, width:'default'|'narrow'|'full'})`
- `Layout`, `Layout.Main`, `Layout.Side`
- `Card({title, subtitle, actions:[{content,onAction,href,icon}], flush, headerExtra})`
- `Divider`, `Stack({gap,row,align,justify,wrap})`, `Text({as, variant:'body'|'heading'|'headingLg'|'caption'|'mono', tone:'subdued'|'success'|'critical'})`

**Actions and status**
- `Button({variant:'primary'|'secondary'|'tertiary'|'plain'|'critical', size:'slim'|'medium'|'large', icon, href, onClick, disabled, loading, full, pressed, title})`, `ButtonGroup`
- `Badge({tone:'success'|'warning'|'critical'|'info'|'attention'|'new'|'neutral', icon})`
- `Banner({tone, title, onDismiss, action, secondaryAction})`

**Form fields**
- `TextField({label, value, onInput, type, helpText, prefix, suffix, placeholder, multiline, error, id, labelHidden, min, max, step, maxLength})`
- `Select({label, value, options, onChange, helpText, id, labelHidden})`
- `Checkbox({label, checked, onChange, helpText, id})`
- `Switch({label, checked, onChange, helpText, id})`
- `ChoiceList({title, choices:[{label,value,helpText}], selected, onChange})`

**Navigation and data**
- `Tabs({tabs:[{id,label,badge}], selected, onSelect})`
- `IndexTable({headings, rows:[{id, cells, href?, onClick?}], selectable, selected, onSelectionChange, bulkActions:[{content,onAction(ids)}], empty})`
- `EmptyState({heading, action, secondaryAction, illustration})`
- `DescriptionList({items:[[term, desc]]})`, `ProgressBar({value, tone})`
- `SurfaceTag` is a small dashed chip naming the Shopify surface, for example "admin.order-details.block.render".

**Overlays and feedback**
- `Modal({open, title, onClose, size:'small'|'base'|'large', primaryAction:{content,onAction,disabled,destructive}, secondaryActions})`
- `SaveBar({dirty, onSave, onDiscard, message})` is the contextual save bar. It is fixed over the admin top bar.
- `toast(message, {error})` shows a toast.
- `AppWindow({title, exitHref|onExit, actions, badge, children})` is the full-screen `<s-app-window>`.

## ui/viewer.js

- `ProductImage({productId, variantId, size, fluid, choices})` renders the product's demo model as an image on its background colour. Products without 3D get a fabric swatch.
- `DesignImage({design, size, fluid})` renders a configured design.
- `captureSnapshot(pid, vid, choices, size=600)` returns `Promise<dataURL JPEG>`.
- `StoreViewer({productId, variantId, choices, custom, trigger:'click'|'scroll'|'eager', toolbar, onReady(ctl), onCart(pid), onAR(), configOverride, class, style, children})` shows the poster first and loads three.js after the trigger. It includes hotspots, a toolbar and an AR button.
- `Viewer3D` is the raw engine wrapper. Props: `config model custom interactive editor selection outline autoRotate background onReady(ctl,info) onSelect({mesh}) onCamera(ctl)`.
- Controller API: see `prototype/ARCHITECTURE.md` → "Engine API" (`setCamera`, `getCamera`, `screenshot`, `project`, `getMeshNames`, `getHierarchy`, `getAnimations`, `playAnimation`, `zoom`, `resetCamera`, `setSelection`, …).
- Demo models: `lounge-chair` (Frame, Legs, Seat_Cushion, Back_Cushion, Armrest_Left, Armrest_Right, Pillow), `table-lamp` (Base, Arm, Shade, Bulb; clips Shade_Tilt, Arm_Swing), `mug` (Body, Handle, Glaze_Inner), `side-table` (Top, Legs, Shelf), `lounge-chair-wide`.

## Testing

The dev server runs on :8790 in this session. The smoke script prints console errors and horizontal scroll at 1440 and 390, and saves screenshots:

```
OUT=<dir> node <scratchpad>/smoke.cjs admin.home store.cart
```

Run it from the repo root.
