# Material variants (KHR_materials_variants)

Prototype spec for roadmap item 6 (`resource/COMPETITOR-LANDSCAPE-ANALYSIS.md` §5): read the material variants a GLB carries, list them in the editor, map them to WooCommerce variations or to a customer option, and apply them in the viewer.

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `materials-variants` | Parse variants, list + preview in the editor, per-variation mapping, "Material variant" option group type | 2–3 d |

Flag off = the shipped product, unchanged. Saved `material_variant` keys and `variant` groups are kept but ignored (the viewer shows the GLB's own materials, the groups are hidden).

## What a variant is

A GLB with `KHR_materials_variants` lists named variants at the root (`extensions.KHR_materials_variants.variants: [{name}]`) and, per mesh primitive, which material each variant uses (`primitive.extensions.KHR_materials_variants.mappings: [{material, variants: [index]}]`). A primitive with no mapping for a variant keeps its own material. Blender, Substance 3D Painter and most glTF tools export it.

Applying a variant swaps the whole material (textures, normal maps, sheen, everything) of every mapped mesh. Layer order, bottom to top:

1. GLB material, or the active variant's material for meshes it maps
2. Mesh and material edits saved in the editor (`config.meshes`, `config.materials`)
3. Shopper choices (`custom`)

So editor colour edits still win over a variant on the meshes they touch. The editor says so (see "Edits on top" below).

Variants are stored **by name**, not index: names survive a re-export that reorders them and read well in the JSON. A saved name the model no longer has shows the GLB's own materials and a warning in the editor.

## Data (new keys only)

### Config: `material_variant`

```js
config.material_variant?: string | null
// undefined / null  → inherit (variation) or none (default)
// ''               → the GLB's own materials, explicitly (a variation can opt out of the default's variant)
// 'Walnut & Teal Leather' → that variant
```

- Lives in the product default config and in variation configs. **Whole value**, like `hotspots`: a variation's value replaces the default's; `null`/missing inherits.
- `resolveEffectiveConfig()` gains `material_variant: variation.material_variant ?? base.material_variant`.
- A variation with its own model resolves the same way; a name its model does not have simply shows that model's own materials.

### Option group type `variant` (with `option-groups`)

```js
{ id, label, description?, type: 'variant', display, targets: [],   // targets unused: a variant maps its own meshes
  required, default,
  choices: [{ id, label, variant: 'Walnut & Teal Leather' | '',     // '' = the GLB's own materials
              color?: '#hex',                                        // swatch / dot / ball colour
              thumbnailId?, price?: Rule }] }
```

- `groupLayer()` returns `material_variant` for the chosen choice; `shopperLayer()` / `sanitizeCustom()` carry it.
- A variant group is never inactive (it has no targets).
- `groupsOf()` accepts the type only while `materials-variants` is on.

### Shopper layer (cart item `custom`)

```js
{ materials?, meshes?, options?, material_variant?: string }
```

Baked from the variant group on add to cart, like `materials`/`meshes`. `applyShopperChoices()` copies it onto the config, so the order preview, the snapshot and thumbnails render it. The posted form still carries choices only (`options`); `material_variant` is recomputed server-side from the group.

### Engine API (prototype `js/engine/viewer.js`, plugin `ModelController.ts`)

```js
v.getMaterialVariants() → [{ name, meshes: [meshName], swatch: ['#hex', …] }]   // [] when the model has none
v.setMaterialVariant(name | '' | null)   // editor preview; null = back to the config's variant
v.getMaterialVariant() → name | ''       // what is on screen
getModelInfo().variants                 // same list as getMaterialVariants()
```

Demo models carry authored variants (`js/engine/material-variants.js`, the prototype's "GLB"):

| Model | Variants |
| --- | --- |
| `lounge-chair`, `lounge-chair-wide` | Natural Oak & Sand Linen · Black Ash & Charcoal Bouclé · Walnut & Teal Leather |
| `side-table` | Natural Oak · Smoked Oak · Black Ash · Walnut |
| `table-lamp` | Brass & Linen · Black & Sage · Chrome & Charcoal |
| `mug` | none (empty state) |

An uploaded GLB is read through three's `GLTFLoader` (`gltf.userData.gltfExtensions.KHR_materials_variants` + each mesh's `userData.gltfExtensions.KHR_materials_variants.mappings`, materials loaded on demand with `parser.getDependency('material', i)`), so a real variant GLB works in the prototype too.

## Editor

### Inspector section "Material Variants"

Body in `panels/material-variants.js`, placed after "Option Pricing" and before "Scene & Lighting". Shown only with the flag on.

- No variants: empty state **"This model has no material variants"**, description "Export them from Blender, Substance 3D Painter or another glTF tool (KHR_materials_variants), then upload the model again."
- Intro: "Material sets saved in the GLB. Each one swaps the materials of the meshes it covers."
- **Choice list** (radio cards), eyebrow "Shown on this product" (Default) or "Shown for this variation":
  - Variation only: **Use Default** · description "Default: <name>" or "Default: Model materials".
  - **Model materials** · "The GLB's own materials".
  - One card per variant: swatch dots, name, "N meshes".
  - Clicking a card writes `material_variant` (`editor.replace`), so undo, dirty state and Save work as everywhere. Default + "Model materials" drops the key.
- **Missing**: saved name not in the model → warning "“<name>” is not in this model, so its own materials show."
- **Edits on top**: when the shown variant maps meshes that also have saved colour edits → info "Material edits on <Seat Cushion, Back Cushion and Pillow> apply on top of this variant."
- **Variations** (Default target of a variable product): one row per WooCommerce variation (label + attribute swatch) with a select **Use Default / Model materials / <variants>**. A variation with its own model shows "Own model" (set it in that variation). Writes all rows as one undo step (`editor.setVariationKey('material_variant', {vid: value})`); an untouched variation does not gain a config row by choosing "Use Default".
  - **Auto-map by name**: matches each variation's attribute values against variant names as whole words (case-insensitive; "Teal" → "Walnut & Teal Leather"); only unique matches are applied. Result line: "Mapped 1 variation." / "Mapped %d variations." / "No variation names match a material variant."
- **Customer choice** (only with `option-groups` on): "Let customers pick a variant in the 3D customizer." + **Create option group** → appends a `variant` group "Material" (display Thumbnails, one choice per variant, default = the shown one) to Customer Options. Result: "Added “Material” to Customer Options." Disabled with the title "Already added" when a variant group exists.

### Variation overrides

A variation's own `material_variant` (a name or `''`) counts as one override, like option prices and customer options: the "This variant changes" card lists **Material variant** (its remove button sets it back to inherit), "Clear all" drops it, and the overview's variation card counts it in "N overrides". Flag off: not counted.

### Scene tree

Under the animations list: eyebrow **"Material variants"** with a count badge, one row per variant (layers icon, name). Clicking a row previews it in the viewport (`aria-pressed`, a "Preview" badge); clicking again, changing target or leaving the editor ends the preview. The variant the target shows has a check mark. Nothing is saved by previewing.

### Model info

"Performance & Optimization → Model Validation (Health)" gains a row **"Material Variants"** with the count. The overview's model card reads "<file> · 7 meshes · 3 material variants".

### Customer Options (`panels/options.js`, with `option-groups`)

- Type select gains **Material variant** (flag on only). Badge "Material variant", icon layers.
- A variant group has no "Applies to" (no targets, card meta shows choices only).
- Choice editor: **Variant** select (Model materials + every variant; a missing saved name is listed as "<name> (missing)"), **Swatch colour** (`color`), thumbnail and price as for other types.
- "Add choice" picks the next unused variant, its name as label and its first swatch colour.
- With the flag off, variant groups are hidden from the list but kept in the saved JSON.

## Storefront

- **Variation mapping**: picking a variation re-resolves the config (as today), so its `material_variant` applies with no extra UI. The gallery thumbnails and the product/variation images render it.
- **Variant group** in the drawer: the usual displays. Swatches and pills use `color`; thumbnails use `thumbnailId`, else a ball in `color`. The group's selected value shows after the title ("Material · Walnut & Teal Leather").
- A variant group choice wins over the variation's mapped variant (it is the shopper's pick); with no pick and no default, the variation's variant shows.
- **Cart, checkout, order, email**: the variant group is a normal option row, `Material: Walnut & Teal Leather (+$40.00)`, swatch dot from `color`. A variant that comes only from the variation adds no row: the variation's attribute (e.g. "Color: Teal") already names it.
- Snapshot and the order "View 3D Preview" show the variant (both apply the shopper layer through `applyShopperChoices`).

## Demo data

- Lounge Chair: Charcoal → "Black Ash & Charcoal Bouclé", Teal → "Walnut & Teal Leather" (variation configs). Sand is unmapped, so "Auto-map by name" has one to find ("Sand" → "Natural Oak & Sand Linen").
- Oak Side Table: a "Wood finish" variant group (Natural oak, Smoked oak +$20, Black ash +$30, Walnut +15%), used when `option-groups` is on too.
- Ceramic Mug: no variants (empty state).

## Interactions with other flags

- `option-groups`: adds the `variant` type. Colour/material groups that target meshes a variant maps paint on top of the variant (same layer rule as editor edits).
- `option-pricing`: variant choices take a price rule like any choice. Variation-mapped variants have no price (the variation's price covers it).
- `order-snapshot`: snapshots render the variant; nothing else.

## Plugin notes (for the real build)

- **Parser** `includes/Parser/GlbParser.php`: `normalize()` adds `variants: [{index, name}]` (from `extensions.KHR_materials_variants.variants`, names `sanitize_text_field`, fallback "Variant N") and `variant_meshes: {name: [mesh names]}` from the primitive mappings. `SceneSchema` (`src/shared/schema/types.ts`) gains optional `variants?` / `variant_meshes?`. Models parsed before the update have no key: re-parse lazily when the editor opens a model whose schema lacks `variants` (`ModelRepository`), never in a bulk migration.
- **Engine** `src/shared/engine/ModelController.ts`: `applyConfig()` order = restore originals → swap variant materials (from the GLTF parser: `parser.getDependency('material', i)` + `assignFinalMaterial`, cached per mesh/variant) → mesh config → material config. Clones made for material edits are re-made when the base material changes (type may change Standard → Physical). Dispose variant materials with the model. Editor preview = a transient override in `uiSlice`, never saved.
- **Config**: `VariationConfigData.material_variant?: string | null` (`types.ts`); `resolveEffectiveConfig.ts` and `includes/Domain/EffectiveConfig.php` gain the whole-value key (keep the twins identical). `apply_shopper_choices` copies `material_variant`. `schema_version` stays 1.
- **Saving** (REST config endpoints + the config sanitizer): accept `material_variant` only as a string (`sanitize_text_field`, max 191 chars) or `null`; drop anything else. Do not check the name against the model on save (the model can be replaced later; the viewer falls back). Variation overrides summary (`VariationTabs.tsx`, overview cards) counts it as one override.
- **Demo/look**: dark variant materials need roughness ≥ 0.6. Below that, flat surfaces (a table top) mirror the environment and a black finish reads tan. Worth a line in the merchant docs on authoring variants.
- **Option groups** (`OptionPricing.php` twin of `shared/options.js`): type `variant`, choice `variant`; `sanitize_cart_item` bakes `material_variant` from the chosen choice only (never from the request). Unknown names are kept as stored (the viewer falls back to the GLB materials).
- **Editor UI**: `Inspector.tsx` section (`MaterialVariantsSection`), `SceneTree.tsx` list, `OptimizationControls` row, `OptionGroupsSection` type. Mapping rows write the variation drafts in one history step (`configSlice`), like the Auto-Map Assistant.
- **AR**: Android Scene Viewer and iOS Quick Look load the file, not our scene: they show the GLB default. model-viewer's `variantName` can be set for WebXR. The configured-AR feature (`usdz-export`) must bake the active variant.
- **Backward compatibility**: configs without `material_variant`, carts and orders without `custom.material_variant` and groups without type `variant` behave exactly as today. Models without the extension show the empty state; nothing is written to them.
