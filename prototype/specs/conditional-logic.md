# Conditional logic: show or hide options by variation or other choices

Prototype spec for roadmap item 9 (`resource/COMPETITOR-LANDSCAPE-ANALYSIS.md` §5).
Builds on option groups (`specs/customizer-commerce.md`, feature 2).

| Flag | Feature | Estimate in the plugin |
| --- | --- | --- |
| `conditional-logic` | Show a group, or offer a choice, only when the variation or earlier picks match (all / any), enforced by the server | 3–4 d |

Depends on `option-groups`. Flag off = the shipped product (plus option groups as they are); saved conditions are kept but ignored. With `option-groups` off there is nothing to act on: the editor shows one note and nothing else changes.

## Data (new keys only)

A group and a choice may carry `conditions`. Missing, `null` or no rules = always shown (every config saved today).

```js
conditions: {
  match: 'all' | 'any',          // default 'all'
  rules: [
    { source: 'attribute', name: 'Color', op: 'is' | 'is_not', value: 'Teal' },
    { source: 'group', groupId: 'pillow', op: 'is' | 'is_not' | 'is_set' | 'is_empty', choiceId?: 'with' },
  ],
}
// config.options[i].conditions          → show the group
// config.options[i].choices[j].conditions → offer the choice
```

- **Attribute rules** compare the line's variation attributes (case-insensitive; WooCommerce stores the term name on the variation, `cart_item['variation']` for "Any …" attributes). No variation picked yet = empty value: `is` fails, `is_not` passes.
- **Group rules** compare the resolved choice of an **earlier** group (the shopper's pick, else that group's default; none when that group is hidden). `is_set` = has a choice, `is_empty` = none.
- **No cycles**: a group (and its choices) can only reference groups above it. Rules pointing at the same group, a later group or a deleted group/choice are ignored; a rule set whose rules are all ignored = always shown. The editor says so on the rule.
- Groups are resolved once, top to bottom. A visible group whose choices are all unavailable is treated as hidden.
- Variations that replace `options` (variation target) carry their own conditions, like the rest of the group.

## Shared core: `js/shared/options.js` (the "server")

| Function | Use |
| --- | --- |
| `withAttributes(config, attrs)`, `attributesFor(state, pid, vid)`, `configFor(state, pid, vid)` | Attach the variation's attributes to an effective config (a `Symbol` key, never saved or posted). Conditions are evaluated only on a config that carries them and with the flag on. |
| `resolveGroups(config, custom)` | `{ chosen, hidden: Set, available: {gid: choice[]}, dropped: {gid: {picked, used}} }` — the single pass every other function reads |
| `selectedChoices` | now `resolveGroups().chosen`: a pick of an unavailable choice falls back to the default if that is available, else none; hidden groups resolve to none |
| `hiddenGroups(config, custom)`, `availableChoices(config, custom, gid)` | Drawer helpers |
| `inactiveGroups` | **also** returns condition-hidden groups, so `optionLines`, `validateChoices`, `firstMissingGroup` skip them with no change (not listed, not charged, not required) |
| `conditionsMet(conditions, ctx)`, `hasConditions(c)`, `ruleIssue(rule, groups, index)` | Rule maths; `ruleIssue` gives the editor's "ignored" reason |

`quoteFor`, `groupedConfig` (and so `choiceErrors`, `addToCart`, `lineUnitPrice`) wrap their config with `configFor`, so the cart, mini cart, checkout and add-to-cart validation all apply conditions with the line's own variation. `sanitizeCustom` keeps storing only resolved choices, so hidden groups' and unavailable choices' picks never reach the cart.

## Editor

Inside "Customer Options" (option-groups panel), only with the flag on:

- **Group card**: badge "Conditional" (icon `eye`) next to the type badge when the group has rules. Expanded body gets a **Conditions** block after "Default":
  - Empty: link button "Add condition" + help "Show this group only for some variations or after other choices."
  - With rules: sentence row "Show this group when [all|any] of these are true" (`all` / `any` select), then one rule row each:
    `[Source select]` → options "Attribute: Color" per product attribute (variable products only: attribute rules read the line's variation, so a simple product's informational attributes would never match) and "Group: Pillow" per **earlier** group; then `[op select]` ("is", "is not", plus "has a choice", "has no choice" for groups); then `[value select]` (attribute values, or the group's choices; hidden for has/has no choice); remove button `×` ("Remove condition").
  - "Add condition" adds `Attribute: first attribute is first value`, else `Group: previous group is its first choice`; disabled with help "Add a product attribute or a group above this one first." when neither exists.
  - Help under the rules: "Groups can only depend on groups above them."
  - An ignored rule shows a warning line: "This rule is ignored: move “Pillow” above this group." / "This rule is ignored: the group or choice was deleted."
  - **Preview hint** (help text): with default choices above, per variation — "With default choices: shown for Charcoal and Teal, hidden for Sand." Simple products: "With default choices: shown." / "hidden."
- **Choice editor**: same block, sentence "Offer this choice when [all|any] of these are true", sources = attributes + groups above the choice's group. Choice rows with rules show a small `eye` icon with title "Has conditions".
- With `option-groups` off: Inspector shows a "Conditional Logic" section with only: "Conditions show or hide option groups. Turn on Option groups to use them." plus a prototype-only "Turn on Option groups" button (switches the flag; the plugin has no such state). `features.js` marks the flag `requires: ['option-groups']`.
- The builder's group list (sources, "above" checks, preview) is the same filtered list the panel renders and `groupsOf` resolves (variant groups only with `materials-variants` on), so card order and rule order always agree.
- Writes through the panel's existing `editor.replace('options', …)` writer (undo, dirty, Save as today). Reordering groups never rewrites rules; a rule that becomes "later" is shown as ignored.
- Files: builder in `panels/conditions.js` (`ConditionsBlock`, `useConditionContext`, badges); hook-ins in `panels/options.js` and `inspector.js`.

### Seed (lounge chair, mug)

- Lounge chair "Pillow fabric": shown when Pillow is "With pillow"; its "Navy velvet" choice offered when Color is Charcoal **or** Teal.
- Mug "Inside": "Black" offered only when Glaze is "Ink" (pick Ink → Black, then Sand → note "Black is not available with this selection. Using Cream.").

## Storefront drawer

- Hidden groups are not rendered; unavailable choices are not rendered (swatches, thumbnails, pills, dropdown options).
- Appearing groups and choices fade/slide in (180 ms, none with `prefers-reduced-motion`).
- A polite live region (`.wc3d-sr-only`, `aria-live="polite"`) announces each change after a pick or variation change: "Pillow fabric is now shown." / "Pillow fabric is now hidden." / "Navy velvet is now available." / "Navy velvet is no longer available." (joined with a space).
- A picked choice that became unavailable: the group falls back to its default (or none) and shows the note "Navy velvet is not available with this selection. Using Rust." / "… with this selection." (no default). The note goes when the shopper picks again; if the choice becomes available again the earlier pick returns.
- The parts-inactive state ("Not used with No pillow", greyed) is unchanged for groups without conditions.
- Product page price box, required-field errors and Add to cart all use the same resolution (hidden required groups never block).
- Files: `js/screens/store/conditional-logic.js` (`useConditionView`, `droppedNote`), `css/conditional-logic.css`; hook-ins in `viewer-ui.js` (`GroupList`, `GroupSection` `note`/`animate` props, the Viewer's config memo) and `product.js` (`configFor`).

## Cart and orders

- Add to cart: the server re-resolves with the line's variation; hidden groups' and unavailable choices' picks are dropped (default used if available) before storing `custom.options`. No new cart or order keys.
- Cart totals recompute from the saved rules as today (a line whose stored pick is now unavailable is priced as resolved). Orders stay frozen (`item.options`).
- Order again: unchanged (lines added back as saved).

## Interactions

- `option-pricing`: hidden groups and unavailable choices cost nothing; the price box and the drawer footer follow.
- `order-snapshot`: the picture renders `custom.materials/meshes` baked from the resolved choices, so hidden groups never paint.
- Variation change still resets the shopper's picks (shipped behaviour); attribute rules re-run on the new variation.

## Exact copy

| Where | String |
| --- | --- |
| Badge | Conditional |
| Group sentence | Show this group when %s of these are true |
| Choice sentence | Offer this choice when %s of these are true |
| Match options | all / any |
| Ops | is / is not / has a choice / has no choice |
| Source options | Attribute: %s / Group: %s |
| Buttons | Add condition / Remove condition |
| Empty help (group) | Show this group only for some variations or after other choices. |
| Empty help (choice) | Offer this choice only for some variations or after other choices. |
| No source | Add a product attribute or a group above this one first. |
| Order help | Groups can only depend on groups above them. |
| Ignored | This rule is ignored: move “%s” above this group. / This rule is ignored: the group or choice was deleted. |
| Preview | With default choices: shown for %s, hidden for %s. / With default choices: shown. / hidden. |
| Groups off | Conditions show or hide option groups. Turn on Option groups to use them. |
| Drawer note | %1$s is not available with this selection. Using %2$s. / %s is not available with this selection. |
| Live region | %s is now shown. / %s is now hidden. / %s is now available. / %s is no longer available. |

## Plugin notes (for the real build)

- **Shape**: `conditions` on group and choice objects inside the saved config JSON (`options` is a whole-value key, so variations replace it whole). `schema_version` stays 1; `resolveEffectiveConfig.ts` / `EffectiveConfig.php` need no change.
- **PHP** (`includes/Domain/OptionPricing.php` from the option-groups build): `resolve_groups( $config, $picks, $attributes )` one top-to-bottom pass, used by `sanitize`, `validate`, `lines` and the price. Attributes: `$variation->get_variation_attributes()` merged with `$cart_item['variation']` (fills "Any …"), keys without `attribute_`/`pa_`, values compared case-insensitively against term name **and** slug.
- **Hooks**: `woocommerce_add_cart_item_data` (`CartItemData::add_cart_item_data`) re-resolves with `$variation_id` and the posted `attribute_*`; `woocommerce_add_to_cart_validation` skips hidden required groups; `woocommerce_before_calculate_totals` prices resolved choices only; `woocommerce_get_item_data` lists resolved rows only.
- **TS**: storefront drawer (`src/frontend/components/CustomizerDrawer.tsx`) gets the variation attributes from `found_variation` (`variation.attributes`, already in `wc-bridge.ts`) and `reset_data` → `{}`; the same `resolveGroups` port lives in `src/shared/options/` so the drawer and PHP agree. Editor UI in the option-groups panel (`src/admin/editor/...`), product attributes from the editor bootstrap (`ViewerBootstrapBuilder` already sends variations; add `attributes: [{name, options}]`).
- **REST save**: `Sanitizer` keeps `conditions` only with known `source`/`op`, strings trimmed, max 20 rules per set; unknown ids are kept (ignored at runtime) so a reorder never loses rules.
- **Backward compat**: configs without `conditions` resolve exactly as today (no rules = shown); carts and orders saved before carry no new keys; orders keep their frozen rows. Turning the feature off (or downgrading) leaves `conditions` in the JSON, ignored.
