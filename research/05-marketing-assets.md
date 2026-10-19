# 05 — Marketing assets & positioning: 3D Product Configurator for WooCommerce (v1.1.0, bPlugins)

Read-only survey, 17 Oct 2026. Root: `/Users/raju/Local Sites/dev/app/public/wp-content/plugins/wc-3d-model-viewer-pro` (written as `<WC3D>` below).

**Read these first:**
1. **The licensing message disagrees across files.** In code (`<WC3D>/includes/Licensing.php`, `PARENT_PLANS = ['pro','max']`), the plugin unlocks with the **3D Viewer Pro plan or higher**. It is "no longer sold on its own"; only older standalone licences still work. Files that agree with the code: the launch emails, the latest WP block pages and the 1.1.0 readme changelog. Files that still say "Max plan only": `docs/LANDING-PAGE-FEATURES.md` (its "Do not claim" table is wrong on this point), `landing-page/README.md`, `llms.txt`, the old static `pages/*.html`, `3d-product-configurator.html`, one row in `wp-blocks/software.html`, and (according to the email notes) the live hub page. Settle this before Halloween/BF copy goes out.
2. **There is no Halloween or Black Friday copy for the configurator.** The only BFCM material is a **3D Viewer** growth plan: `3d-viewer-premium/MARKETING_PLAN_BFCM_2026.md`.
3. **The configurator's price is undecided.** `3d-product-configurator.html` shows "$XX / month". Every newer asset says "included in the yearly 3D Viewer Pro/Max plan".

---

## 1. Positioning & messaging

**Product name:** 3D Product Configurator for WooCommerce, renamed from "WC 3D Model Viewer (Pro)" in 1.0.1. Brand: **bPlugins**.

**Core one-liners (verbatim)**
- readme short description: "A live 3D product configurator for WooCommerce. Turn flat product photos into interactive 3D models, customize them per variation, let shoppers configure them live, and view in augmented reality."
- `docs/MARKETING.md`: "**Sell in 3D. Let customers see it, spin it, and make it theirs.**" … "One model. Infinite variations." … "One upload does the work of a hundred photoshoots." … closing line: "give every product a dimension your competitors can't."
- `landing-page/3d-product-configurator.html` (product page): H1 "**Let customers design it in 3D. Then buy it.**" Final CTA: "Your products deserve more than a photo". Pricing headline: "One monthly price for any catalog size. We never take a cut of your sales."
- `landing-page/apple-style.html`: "**3D Product Configurator. Built by your shoppers.**" / "Shoppers spin it, color it, sign it and buy it, right on your product page." Section heads: "Every finish. One model." · "Every part is yours to set." · "Their initials. On the model." · "The price follows every pick." · "Then on their desk. In AR." · "A bigger stage for the sale." · "Set it all up. Write no code." · "Everything after the first spin." · "Put it anywhere."
- `apple-style-v2.html`: "**Don't read about it. Build one.**" · "Only the options that make sense." · "Put the 3D where it sells." · "Light until they ask for 3D." · CTA "Let them build it. Every feature comes with the licence. There are no tiers to compare."
- `apple-style-v3.html` ("Night" variant): "**Spin it. Build it. Buy it.**" · "Let the product do the talking." · "Light it. Take it apart." · "Six things that happen along the way." · "Send it. Then see it in the room."
- SEO hub (page 1): H1 "The 3D Product Configurator for WooCommerce". Sub-headline: "Let shoppers build their product on a live 3D model, with every choice priced, saved to the order and viewable in AR. No code, no SaaS subscription."
- Launch email E03 banner: "Shoppers build it. You get the exact build."
- Founder story (E06), the "three rules": (1) the price has to be right (recalculated on the server), (2) the order has to say exactly what was built, (3) AR has to show *their* version.

**Main value props (repeated across all assets)**
1. One model, every variation: updates in place with no reload; auto-map assistant.
2. Live customizer: drawer or large modal with the real Add to Cart, undo/redo (50 steps).
3. Option groups, conditional logic and live, server-recalculated pricing.
4. Personalization: text or image decals on the model.
5. AR with no app (Quick Look, Scene Viewer, desktop QR), including the shopper's configured design.
6. Orders you can't misread: "3D Customization" line, snapshot image, interactive 3D order preview.
7. Share links, QR codes and saved designs (My Account).
8. No-code full-screen editor.
9. Fast pages: "Click to interact" poster, ~12 KB storefront script, nothing loaded from third parties.
10. Self-hosted: no fee per sale, per view or per product; unlimited products; data stays in WooCommerce.

**Competitive framing (from the SEO plan and `resource/COMPETITOR-LANDSCAPE-ANALYSIS.md`)**
- Main angle vs SaaS (Zakeke, Expivi, VividWorks, Threekit, Vectary…): "A 3D Product Configurator That Runs Inside Your Store". Self-hosted, no per-view/per-order/monthly platform fee, native WooCommerce cart and orders. The SaaS comparison table includes an honest "Best for" row.
- vs 2D layered configurators and photos: a comparison table in the hub brief with rows for every combination, rotate/zoom, AR, adding a new color, and the order showing the build. Named competitors are kept off the hub.
- Product-page comparison (`3d-product-configurator.html`): "bPlugins vs Some hosted apps", with rows for price as you grow, fee on every sale, and product limit.
- Competitors named in research (not to appear in published copy until checked): wpconfigurator.com ($299/yr, no AR), Staggs ($69), WCB, 3D Product Customizer ($99.99 lifetime), Visody ($29.99/yr), DevDiggers AR for WooCommerce ($59/yr), AR Display ($200/yr), rcreators ($125), Zakeke ($19–99/mo + 1.7–1.9%/order), Kickflip, VividWorks (€447–847/mo).
- Claimed white space: "Nobody on wordpress.org combines variation-bound 3D state + priced add-on options + AR + order snapshot in one self-hosted plugin." The analysis dates from Sept 2026 against v1.0.0. Option pricing, decals, block, material variants and coverage have since shipped, so the claim is stronger now. Its "where we stand" table is stale.
- Pricing recommendation in the analysis: $59–79/yr for one site, plus a lifetime option, plus the "free with Max" bundle as a wedge against Staggs and Zakeke.

## 2. Audiences & use cases

**Primary buyer:** a WooCommerce store owner (or their developer) selling products with options: colors, materials, parts or personalization.

**Industry pages and segments that already have copy:**
| Segment | Where | Hook |
|---|---|---|
| Furniture & home (sofas, chairs, tables, beds, modular shelving, lighting) | SEO page 3, email E17 | "Six fabrics × three legs × chaise = 36 photo sets"; "Will it fit?"; AR at real size |
| Personalized gifts / print / merch / promo / trophies | SEO page 2, E10, E19 | "Can you put her name on it?"; logos, names, inside jokes |
| Jewelry / rings | SEO page 7, E18 | metal, stone, engraving. Honest note: AR shows the ring in the room, not on the hand |
| Made-to-order: cabinets, doors, sheds | SEO page 9, E20 | required picks, rules, exact build sheet |
| Sneakers / apparel accessories / bags / bikes / outdoor / watches / sunglasses / lamps | product page FAQ, demo store | demo products |
| Agencies & developers | E21; "Agencies" page planned but not built | shortcode, block, Elementor, REST API, filters |
| Existing 3D Viewer Pro/Max customers | E05 | "Good news: you already have it" |
| SaaS shoppers (Zakeke/Expivi alternatives) | SEO page 4 | self-hosted, no platform fee |

Industries suggested for later pages: watch configurator, bike configurator, shoe configurator. The SEO plan does not target "WordPress 3D model viewer" or "GLB viewer"; those terms are left to the 3D Viewer plugin.

**Planned blog posts (12)** support the landing pages: what is a product configurator, best WooCommerce configurator plugins 2026, AR in ecommerce, USDZ from GLB, 3D vs photography, 360 vs 3D, custom furniture, ring builder, Zakeke alternatives, personalized products, conditional options. None appear to be written.

## 3. Pricing / tiers & links

**What the code says:** the plugin unlocks with 3D Viewer **Pro or Max** (parent Freemius `bp3d_fs()->is_plan()`), or with a legacy standalone Freemius licence (`wc3d_fs`, id 32278, "no longer sold"). It can also run as an extension inside 3D Viewer 1.8.0+.

**3D Viewer plan prices** (from the `landing-page/index.html` mockup; check against the live pricing page):
- Free: $0 (wp.org)
- **Pro: $59.99/yr**, 1 site ("3 & unlimited-site plans at checkout")
- **Max: $83.88/yr**, 1 site
- A "Yearly save 22%" / "Lifetime" toggle exists, but no lifetime prices are shown.
- The competitor doc lists 3D Viewer Pro at $49.99. That disagrees with $59.99, so verify.
- Shopify app prototype (example only): Free $0 / Growth $19/mo / Business $49/mo, with a 14-day free trial (`prototype/shopify/admin/plans.js`).

**Guarantee:** 14-day money-back guarantee. The wording differs between assets:
- WP block pages (`src/blocks.js` → `bpl/guarantee`): "Ask within 14 days for a full refund if the plugin is missing a feature you needed, did not work as expected, or left you with a problem you could not resolve — including issues caused by third-party software." It is signed by Abu Hayat, Founder, bPlugins.
- Product page: "Ask for a refund within 14 days of your first payment. Renewal charges aren't refundable."
- 3D Viewer index mockup: "14-day 100% money-back guarantee — if we can't fix an issue that makes it unusable."
- Emails E25/E23: "If it isn't a fit within 14 days, ask for a refund." This is unconditional, which is looser than the policy.
- The landing README says it was checked against https://bplugins.com/refund-policy/ on 14 Oct 2026.

**Repeated pricing claims:** "No fee per sale or per view", "Unlimited products & models", "Updates & support included", "One license for both plugins".

**URLs**
| Purpose | URL |
|---|---|
| Configurator hub (current, used in emails, social and the latest pages) | https://bplugins.com/products/woocommerce-product-configurator/ |
| SEO child pages (drafts, WP IDs 23080–23088) | `/products/woocommerce-product-configurator/{product-customizer, 3d-furniture-configurator, augmented-reality, 3d-product-viewer, jewelry-ring-builder, product-options-pricing, cabinets-doors-sheds}/` plus `/3d-product-configurator/` |
| Older product URL (only in `3d-product-configurator.html`) | https://bplugins.com/products/3d-product-configurator-for-woocommerce/ (inconsistent) |
| Pricing (all "See pricing" CTAs) | https://bplugins.com/products/3d-viewer/pricing/ (per the README, this page does **not** mention the configurator yet) |
| Docs | https://bplugins.com/docs/product-configurator-for-woocommerce/ |
| Refund policy / support | https://bplugins.com/refund-policy/ · https://bplugins.com/support/ |
| Demo store | https://3d-viewer.bplugins.com |
| Demo products | `/product/custom-sneaker/`, `personalised-water-bottle-add-your-name-or-logo/`, `curved-velvet-sofa-pick-from-5-fabrics/`, `solitaire-ring-design-your-own/`, `aviator-sunglasses-build-your-pair/`, `copper-barn-lamp-your-design-in-the-cart-order/`, `chronograph-watch-save-share-your-design/`, `concept-sports-car-viewpoint-gallery/`, `tufted-accent-chair-see-it-in-your-room-ar/` |
| 3D Viewer product / wp.org | https://bplugins.com/products/3d-viewer/ · https://wordpress.org/plugins/3d-viewer/ |
| Welcome video | https://youtu.be/Bw-wdlcxVKw |

**Default CTAs:** "See pricing" plus "Try the live demo" (block pages). Others in use: "Get the Configurator" / "Try the demo" (product page), "Buy" / "Buy the configurator" (apple-style), "Get 3D Viewer Pro" / "Download Free" (3D Viewer page). Email buttons are demo-first: "Try the live demo store", "Design the demo sneaker", and so on.

## 4. Existing emails

`<WC3D>/docs/launch-emails/launch-emails.html` is an interactive viewer for **25 launch emails**. The data is JSON in `<script id="data">`. Each email has subject A/B, preheader, segment, send day, one button and HTML with an Outlook VML fallback. Merge tags: `{{first_name}}`, `{{launch_date}}`, `{{sender_name}}`, `{{unsubscribe_url}}`, `{{company_address}}`. Links carry UTMs (`utm_campaign=wc3d-launch`). JPG fallbacks are in `docs/launch-emails/images/`. The built-in note says to fix the Max-vs-Pro wording before sending. Pricing wording in the emails: "3D Viewer Pro plan or higher, no fee per sale or per view, 14-day money-back."

| ID | Send | Segment | Subject (A / B) | Angle → button |
|---|---|---|---|---|
| E01 | L−5 | All | Your product photos only show one version / Something new for your product pages | Teaser → Take a sneak peek |
| E02 | L−2 | All | The sneaker that came back / Why custom orders get returned | Story teaser (return label) → Design the demo sneaker |
| E03 | Launch AM | All | It's live: a 3D product configurator for WooCommerce / Let shoppers build it before they buy it | Long announcement: what shoppers get, what you get, cost → Try the live demo store |
| E04 | Launch PM | Inactive 90d | Shoppers can now build your product in 3D / New for WooCommerce: 3D + live prices + AR | Short → Play with the demo |
| E05 | Launch | 3D Viewer Pro & Max customers | Good news: you already have it / Your 3D Viewer plan just got bigger | Included in your plan; update 3D Viewer to 1.8.0+ → Build your first 3D product |
| E06 | L+1 | All | Why we built this (and the three rules we set) / A short note from the team | Founder letter → See what we made |
| E07 | L+3 | All | Click "Customize" and watch it change / A customizer your shoppers will actually use | Customizer → Open the customizer demo |
| E08 | L+5 | All | One 3D model. Every variation. / Stop uploading a model per colour | Variations → Watch variations switch live |
| E09 | L+7 | All | Charge for the walnut legs (and hide what doesn't fit) / Option prices, swatches and rules, in 3D | Pricing and logic → Build the demo sunglasses |
| E10 | L+9 | All | "Can you put her name on it?" / Let shoppers write on your product | Personalization story → Write on the demo bottle |
| E11 | L+11 | All | Put it in their living room (their version, not yours) / AR on iPhone and Android, no app | Configured AR → Try AR on your phone |
| E12 | L+13 | All | The order that didn't need a follow-up email / What happens after "Add to cart" | Orders story (furniture workshop) → Build a lamp and check out |
| E13 | L+15 | All | A 3D editor that doesn't need a 3D artist / Click a part. Change it. Save. | Editor → Watch the editor tour |
| E14 | L+17 | All | Sell the cushion from the chair / Hotspots that add to cart | Product hotspots → Find the hotspots |
| E15 | L+19 | All | "Which one do you like?" / Share links and saved designs for shoppers | Share/save → Design a watch and share it |
| E16 | L+21 | All | Will 3D slow down my store? / Fast pages, even with 3D | Performance objection → Open the demo on your phone |
| E17 | L+23 | Furniture & home | A sofa, a Saturday and five velvets / For furniture stores: let them pick the fabric | Story ($1,290 sofa) → Try the sofa |
| E18 | L+25 | Jewellery | Let them build the ring / A ring builder for WooCommerce | → Build the demo ring |
| E19 | L+27 | Print, merch, gifts | Logos, names and inside jokes / For print and merch stores: live previews | → Personalise the demo bottle |
| E20 | L+29 | Made-to-order | For stores that build things after the order / Cabinets, doors and sheds, configured in 3D | → See it on the demo store |
| E21 | L+31 | Agencies & devs | For agencies: 3D anywhere, without fighting the theme / Shortcode, block, Elementor and a REST API | → Watch: embed it anywhere |
| E22 | L+33 | New buyers / trial | Set up your first 3D product today / Five steps to your first 3D product | Onboarding → Watch: your first 3D product |
| E23 | L+35 | Clicked, no buy | Your questions, answered / Do I need a 3D model? (and 7 other questions) | FAQ objections (models, themes, swatches, speed, fees, data, refund) → See plans and pricing |
| E24 | L+3 resend | Didn't open E03 | In case you missed it: 3D shopping for WooCommerce / Did this get buried? | Resend → Try the live demo |
| E25 | L+40 | Clicked, no buy | Try it for 14 days on your own store / The best test is your own product | Guarantee close → Choose a plan |

Tone: plain, specific and demo-first, with story emails mixed in. US/UK spelling is mixed ("colour", "customise", "personalise" alongside "color" on the landing pages). Pick one.

**Social copy:** `<WC3D>/docs/social-launch/SOCIAL-LAUNCH.md` (1,452 lines; nothing posted yet) has ready posts for X (single post and 8-post thread), LinkedIn, Facebook (page and group), Instagram (feed, carousel, Reels, Story), TikTok, YouTube Shorts and community post, Reddit (r/woocommerce, r/Wordpress), Product Hunt, the wp.org forum, a newsletter blurb and Pinterest. It also has per-platform copy for 10 feature videos. Example X post: "Our 3D Product Configurator for WooCommerce is live… On 3D Viewer Pro? It's already yours."

## 5. Video / voiceover scripts

| Asset | Path | Length | Content / notes |
|---|---|---|---|
| Intro marketing video | `docs/wc3d-intro.mp4`, script `docs/VIDEO_INTRO_SCRIPT.md` | 1:21 | "What and why": hero sneaker, duck customizer recolor, per-variation model swap, hotspots, placements, admin/editor, end card "Interactive 3D · AR · Live Customizer · Per-variation models". Ava TTS. **Uses the old name "WC 3D Model Viewer Pro"**, so it is outdated |
| Quick-start tutorial | `docs/wc3d-quick-start-tutorial.mp4`, script `docs/VIDEO_TUTORIAL_SCRIPT.md` | 3:34 (script targets ~5 min) | 7 scenes: hook, requirements, add model, placement, shortcode, advanced overview, outro. Old name |
| Raw walkthrough + narrations | `docs/WC 3D Model Viewer.mp4` (raw, 5:12, 215 MB); narrated versions: `docs/WC 3D Model Viewer (Narrated).mp4`, `docs/voiceover/...(Narrated - Alex).mp4`, `...(Narrated - Chris).mp4` | 5:12 | 26 segments: new product → GLB → front-end → loading behaviour → 5 viewer positions → shop page → variable product (Blue/Gray/Red cap) → editor recolor per variation → global settings. Scripts: `docs/voiceover/NARRATION_SCRIPT.md` (Alex), `NARRATION_SCRIPT-chris.md` (ElevenLabs Chris), `docs/voiceover-zoe/NARRATION_SCRIPT.md` (Zoe) plus mp3 tracks and segments. All say "Welcome to WC 3D Model Viewer Pro", so they are **outdated (old name, pre-1.1 features)** |
| **Tutorial series (25 videos, current)** | `docs/voiceover/series/*.mp4` (+ `-thumb.jpg`, `.srt`, `.chapters.txt`); links in `docs/voiceover/series/youtube-series-links.txt` | various | Unlisted on YouTube; ElevenLabs "Mark" voice; 2560×1440. See section 6 |
| Doc micro-videos (17) | `docs/voiceover/doc-videos/*-narrated-chris.mp4` (+ `hq/` 1440p, `thumbnails/`, `*-script.json`); links in `doc-videos/youtube-links.txt` | short | Install from zip, add model, turn on 3D, loading view, image texture, import config, hotspot, create group, personalization area, turn on modal, share, map attribute to parts, order in 3D, generate posters, troubleshooting "model does not load" |
| Social launch videos | `/Volumes/External/wc3d-social-launch/all-videos/` (23 files) | 30 s vertical, 32 s square, 69 s landscape + 10 features × (9:16, 1:1) at 21–28 s | Burned-in captions, navy/cyan wipes, "Mark" voice, −14 LUFS. Features: customizer, live pricing, personalization, AR, variations, cart & orders, share designs, hotspots, 3D editor, fast & everywhere. Each has a cover, `.srt` and `.txt` script/shot list |
| Prototype tutorials | `docs/proto-tutorial-*.mp4.timeline.json` (timelines only); `scratch/proto-tutorials/` | — | Internal walkthroughs of the *clickable prototype* before release. Narration says "nothing here is released yet". **Not for marketing** |
| YouTube clean-up list | `docs/voiceover/youtube-videos-to-delete.txt` | — | 18 outdated unlisted uploads to delete (the decision rests with Raju) |

SEO plan video needs that are not yet made: one 60–120 s YouTube demo **per landing page**, and a 90 s hub demo titled "WooCommerce Product Configurator: 3D, AR and personalization demo".

## 6. Tutorials

Current series, all unlisted (`docs/voiceover/series/youtube-series-links.txt`; recorder sources in `scratch/tutorial-series/videos/*.mjs`):
00 Welcome · 01 Install & Set Up (requirements, licence, feature switches) · 02 Your First 3D Product (v1/v2/v3 exist) · 03 Prepare & Host Your Models (GLB, Blender, URL) · 04 Poster, Loading & Display · 05 Tour of the 3D Editor · 06 Materials, Textures & Presets · 07 Fast on Every Phone · 08 Camera, Gallery Views & Limits · 09 Lighting, Background & Animation · 10 Toolbar, Keyboard & Hotspots (+short) · 11 AR on iPhone & Android · 12 Customizer Basics: drawer & modal (+short) · 13 Option Groups, Swatches & Pricing · 14 Conditional Logic · 15 Personalization · 16 Share Links & Saved Designs · 17a Variable Products in 3D · 17b Auto-map & Material Variants · 18 Placement, Shop Pages, Cart & Orders · 19a Models List & Coverage · 19b Global Settings & Feature Modules · 20 Embed Anywhere (shortcode, block, Elementor) · 21a/21b Troubleshooting.

`scratch/tutorial-series/` is the automated film pipeline: Playwright, WP Playground, ElevenLabs, ffmpeg. `CHECKLIST.md` says: "Open the local file for Raju and wait for his OK. Never upload before that."
`scratch/proto-tutorials/` holds per-feature prototype recordings (block, conditional-logic, coverage, decals, external-url, materials-variants, option-groups, option-pricing, order-snapshot, saved-designs, undo-redo-drawer, usdz-export, smoke). They contain storyboards, VO and raw mkv. Only `smoke.mp4` is a finished render.
`scratch/customizer-modal/` (~22k files) is **QA/regression evidence** for the Customizer-modal feature: before/after/flag-off/drawer screenshot comparisons, desktop, mobile-a11y, spec-compat and regression review rounds r1–r3, plus capture/compare scripts. No marketing value. `scratch/docs-media/` is the docs screenshot pipeline.

## 7. Brand kit

**Plugin logo** (`<WC3D>/assets/brand/`):
- `logo-mark.svg`, `logo-icon.svg`: cube on an orbit ring ("swatch cube", option A)
- `logo-horizontal-light.svg` / `logo-horizontal-dark.svg`: mark + "3D Product Configurator" (Inter 800) / "for WooCommerce" (Inter 500)
- `icon-128x128.png`, `icon-256x256.png`
- `options/a–e*.svg` + `options/compare.png`: 5 icon concepts (swatch cube, tricolor cube, line cube 360, 3D bag, cube swatch fan)
- Logo palette: indigo `#6366f1` / `#4338ca` / `#818cf8`, navy `#312e81` / `#0f172a`, accents pink `#f472b6`, amber `#fbbf24`, mint `#34d399`. Font: **Inter**.

**Landing pages (bPlugins site style)**, from `landing-page/assets/landing.css`: brand blue `#146ef5` (deep `#0d5ad1`, soft `#e7edf8`), ink `#070127`, body `#485781`, accent orange `#ff7a00`, ok `#20b759`, radius 18px. Font: **Manrope**.
**Apple-style variants:** `#146ef5` blue, night `#101012`, paper `#f3f4f7`, coral `#e8735f`, glacier `#a7c4dc`, sand `#e3dccf`. Font: **Hanken Grotesk**.
**Social videos:** "navy and cyan" wipes.
**Problem:** there is no single brand guide. The indigo/pink Inter logo palette doesn't match the blue/orange Manrope site palette. Choose one for campaign creatives.
Other logos: `prototype/live-demo/img/brand/bplugins-logo.svg`, `3d-viewer-logo.svg`, `wc-3d-model-viewer.png` (old name); `3d-viewer/promo/pipeline/cards/logo.svg`, `brand.css`.

## 8. Media asset inventory (paths)

**Clean marketing screenshots:** `<WC3D>/landing-page/assets/img/` (webp, most with png). The README says most are docs captures with red callouts that need a clean recapture.
- `3d-editor-mesh-tree-and-panels`: full-screen editor
- `ar-qr-code-configured-design`, `ar-scan-qr-code-desktop`: AR QR
- `cart-line-3d-customization`: cart line meta
- `conditional-logic-rules`, `coverage-dashboard`, `variations-overview-auto-map`, `frame-auto-map`
- `customizer-drawer-option-prices-undo`, `customizer-live-price-total`, `customizer-modal-options`, `customizer-modal-option-prices`, `customizer-modal-text-personalization`, `live-price-total-box`, `option-pricing-part-prices`
- `frame-order-3d-preview`, `frame-personalization-area`, `saved-designs-my-account`, `product-hotspot-add-to-cart`, `product-page-3d-viewer-gallery-angles`, `viewer-position-settings`
- Demo-store shots: `demo-bottle-text`, `demo-car-viewer(-wide)`, `demo-chair-ar`, `demo-chair-viewer`, `demo-lamp-modal`, `demo-ring-modal`, `demo-sneaker-modal`, `demo-sofa-modal`, `demo-sunglasses-modal`, `demo-watch-modal`, `demo-watch-share`
- JPG copies for email (`wc3d-lp-*.jpg`, 29 files): `<WC3D>/docs/launch-emails/images/`. WP Media Library IDs are in `landing-page/wp/media.json`.

**Docs screenshots and short videos:** `<WC3D>/docs/media/{getting-started, 3d-models, 3d-editor, look-and-behavior, interactive-features, product-customizer, woocommerce, admin-tools, reference, troubleshooting}/` (102 slots: 85 screenshots, 17 videos). Hosted URLs are in `docs/media-links.txt` (bplugins.com/wp-content/uploads/2026/10/docs-3d-product-configurator-for-woocommerce-NNN-*.webp). Shot list: `docs/product-configurator-media-checklist.md`.

**Social images:** `/Volumes/External/wc3d-social-launch/images/`: x-launch 1600×900, linkedin 1200×627, facebook 1200×630, og 1200×630, instagram square and portrait, carousel-01…06 (hook, customizer, pricing, AR, orders, CTA), story 1080×1920, pinterest 1000×1500, `_sheet.jpg`.

**Interactive demos:**
- Landing three.js stand-ins: `landing-page/assets/demo3d.js` (chair, sofa, tumbler, ring, lamp, cabinet, shed); `studio3d.js` (headphones); `landing.js` (demo customizer modal)
- Live-demo prototype: `prototype/live-demo/` (fox, duck, astronaut glb/usdz, sheen-chair, shoe) and dashboard thumbnails in `prototype/live-demo/img/dashboard/*.webp` (getting-started, running-shoe, watch, ar, configurator, mobile, media-hotspots, cube, skybox)
- `scratch/tutorial-series/assets/showroom-chair.glb`
- Demo content importer: `docs/wc3d-demo-content(.zip)` (CC-BY models)

## 9. Claims to verify (cross-check against code)

**Confirmed or likely OK:** `frontend.js` is 12,052 bytes in `assets/build`, which supports the "~12 KB storefront script" claim (CSS not counted). Pro+Max unlocking is confirmed in `Licensing.php`. 10 lighting presets, Studio bundled and the rest downloaded on demand.

**Need verification (specific numbers and behaviour):**
- Undo/redo "up to 50 steps"; "9 fonts" (system fonts); decal uploads "PNG/JPG/WEBP up to 5 MB"; share link lifetimes 30d/90d/6mo/1y/never; Android AR file "kept on your server up to 24 hours"
- "Cart price recalculated on the server, never from the browser"; "server ignores changes to parts you didn't allow"
- "Later rule/price changes do not alter placed orders"; "Order again restores the design"
- Snapshot in emails and admin, but only on block checkout (copy must say so)
- Draco, Meshopt and **KTX2** load with bundled decoders
- "No third-party requests on the storefront" (the AR QR is generated locally; HDRI is local after download)
- "Works with variation swatch plugins that use standard events"; Elementor widget; quick view / infinite scroll auto-init
- Model health check thresholds; JSON import/export with match preview
- "4 gallery angles that recolor live with the shopper's choices"

**Aspirational or wrong in existing copy (per `docs/LANDING-PAGE-FEATURES.md` §13 "Do not claim"):** `readme.txt` and `docs/MARKETING.md` still say:
- "clearcoat" (no control)
- "texture maps" (only one color-map texture)
- "configurable floor (… texture …)" (no floor texture)
- "set the default view, FOV" (no FOV control)
- "GPU performance modes, max texture resolution" (only Battery Saver; max texture was removed)
- "or your own HDRI" (uploads are blocked)
- "Draco / meshopt compression detection" (not shown to merchants)
- MARKETING.md "No limits" and "lightning quick" are vague and unbacked

These files need cleanup before wp.org or marketing reuse.

**Other risky claims:**
- `landing-page/index.html` (3D Viewer page) cites "+94% conversion" (attributed to "Shopify commerce research"), "−40% returns" ("industry studies") and "66% of shoppers want 3D & AR". None have links; the SEO plan forbids unsourced stats. The testimonials are marked "Placeholder — replace". It also says "AR Quick View" is Pro-only, but the 3D Viewer readme now says **AR is free**.
- `3d-product-configurator.html` stats are sourced: Rebecca Minkoff/Shopify 44% add-to-cart, 65% order (AR); Build.com/AR Insider 2022 22% fewer returns. They are still third-party figures, so re-check the links.
- Social-proof numbers disagree: "212K+ users of our plugins", "1,058+ WordPress.org reviews across our plugins", "3D Viewer 9,000+ installs" vs "10,000+ active users" (index mockup). The BFCM plan baseline is 9,000+ installs and only 24 reviews on 3D Viewer.
- "Updates & support included", "Cancel anytime" and "$XX / month" on the product page conflict with yearly plans.
- Guarantee wording varies (see section 3). E25's unconditional "If it isn't a fit… you'll get your money back" may go beyond the refund policy.
- "No limits" / "Unlimited products": check that the Pro/Max site limits and terms don't restrict this.
- `LANDING-PAGE-FEATURES.md` itself says "Max only". That is out of date against the code.

## 10. Shopify / other platform plans

- **A Shopify version is planned but not built.** `<WC3D>/docs/SHOPIFY-ROADMAP.md` (status: plan, 15 Oct 2026) describes a public Shopify App Store app: "3D Product Configurator for Shopify" by bPlugins.
  - Stack: React Router template, three.js/R3F engine, Postgres + Fly.io + R2, Cart Transform Function for option pricing, Managed Pricing billing.
  - Timeline: about 33 build weeks plus 4–8 weeks of review, so **~8–9 months to listing** with 3 engineers. A custom-distribution beta is possible around week 20.
  - Caveats: no option pricing for subscription products; `lineUpdate` is Plus-only.
- `<WC3D>/prototype/shopify/` is a **clickable browser-only prototype** of that app: Polaris-like admin (home, products, editor, presets, orders, designs, catalog, settings, plans), storefront (product, customizer, cart, checkout, thanks), and customer account. Demo data only, with Basic/Plus and USD/EUR toggles. Example plans: Free / Growth $19 / Business $49 per month with a 14-day trial, explicitly labelled "example pricing".
- `<WC3D>/prototype/live-demo/` is a **public, browser-only fake WP admin** running 3D Viewer Free/Pro and the configurator extension on demo data (localStorage per visitor, Free↔Pro switch, guided tours). It is meant as a no-install "try it" demo, but no hosted URL was found. If it is deployed, it could be a strong campaign CTA.
- `resource/DOKAN-COMPATIBILITY-REPORT.md` exists (multivendor). The competitor doc lists multivendor as "don't build" for now.

## 11. Gaps (missing marketing material)

1. **No Halloween, Black Friday or Cyber Monday material for the configurator**: no offer, coupon, deal page, banner, email sequence, social creatives or in-plugin notice. The SEO plan only notes BF on 27 Nov and that ads/retargeting (not SEO) must carry BFCM. Phase-1 pages are due live by 10 Nov.
2. **No decided price or offer.** The configurator is bundled into the 3D Viewer Pro/Max plans, so any BF deal is really a 3D Viewer deal. The pricing page doesn't mention the configurator. No offer is defined for upgrading existing customers to Pro or Max.
3. Licensing copy disagrees (Max-only vs Pro+Max); see the top of this file.
4. **No real testimonials, reviews or case studies** for the configurator. The 3D Viewer mockup uses placeholders. No merchant results.
5. **No public comparison table vs named competitors** (Zakeke, Staggs, WP Configurator, Expivi). Only generic tables exist ("hosted apps", "2D/photos"). The "Zakeke alternatives" blog post is planned but not written.
6. No published hub demo video (90 s) and none of the per-page 60–120 s demos. The intro and quick-start videos use the old name. The 25-video series is unlisted.
7. No unified brand guide. The logo palette and font differ from the landing pages. There is no campaign key visual or template for seasonal creatives (a Halloween theme, for example).
8. No lead magnet, webinar, free-trial flow or Agencies page. No affiliate or partner kit.
9. Supporting blog posts (12 planned) are unwritten. llms.txt is a draft and still says "Max plan".
10. Old static landing pages and screenshots carry docs callouts; clean recaptures are needed. The ring page reuses chair shots.
11. readme.txt for wp.org and `MARKETING.md` contain "Do not claim" items, and the readme Screenshots captions are generic (6 items).
12. The 3D Viewer free and premium readmes **do not mention the configurator at all**, so there is no cross-sell from the 9k+ install base.
13. Schema `offers` and price are not set. Freemius purchase-conversion tracking in GA4 must be set up before pages go live (SEO plan).

## 12. Notes on 3d-viewer free / premium promo material

- `/Users/raju/Local Sites/dev/app/public/wp-content/plugins/3d-viewer/promo/`: `3d-viewer-intro.mp4` (1:08, 1920×1080, Ava TTS voiceover + ambient bed), `poster.png`, and `pipeline/` (Playwright record/shot/assemble scripts, title/feature/photo/outro HTML cards, `brand.css`, `logo.svg`, `audio/vo.sh`). It covers the generic viewer, not the configurator.
- `3d-viewer/readme.txt` (v2.0.0): "3D Viewer – Turn Product Pages into Interactive 3D Experiences". It says "**Augmented Reality is free**", lists GLB/GLTF/OBJ/STL/FBX/DAE/PLY/3DS formats, and lists Pro features (Elementor widget with full settings, external URLs, lighting/shadow/exposure, poster + progress bar, auto-rotate/fullscreen/autoplay, custom camera, WooCommerce 3D gallery, hotspots). Links: product page, docs (`/docs/3d-viewer/`), pricing (`/products/3d-viewer/pricing`), support, live demo (`/products/3d-viewer/#demos`), YouTube `_9vKv5pEClM`, GitHub `bPlugins/3d-viewer-wp`. 10 screenshots: Add New 3D, Configuration, Single/Multiple Preview, product top/bottom of image, image replaced (Pro), variable product, Settings, Gutenberg block and settings. **No prices** and **no configurator mention** in the readme.
- `3d-viewer-premium/readme.txt`: the same screenshots and links. Its changelog notes "Premium extensions can be installed and activated for free when the Max Plan is active" (an older policy). `readme-new.txt` is empty.
- `3d-viewer-premium/MARKETING_PLAN_BFCM_2026.md` is the **only BFCM plan** found, and it covers 3D Viewer. Key points:
  - Baseline: 9k installs, 24 reviews, AtlasAR attacking with a comparison SERP.
  - Months 1–3 cover the support SLA, landing and pricing fixes, a review engine, SEO, videos, sponsorships, case studies, trial emails, and BFCM production (deal page `/black-friday/`, banner, 5-send sequence, 15+ roundup submissions, feature freeze around 15 Oct).
  - **Offer:** early-bird for the list on 17 Nov (48 h), public sale 20 Nov–2 Dec, **40% off the first year of annual plans**, **30% off lifetime**, **30% off tier upgrades for existing customers** (email only). BF is 27 Nov, CM is 30 Nov.
  - Targets: 12k installs, 60+ reviews, 3–4× monthly revenue.
  - It does not mention the configurator or Halloween. Its checklist status can't be confirmed from files.
- `3d-viewer-premium/docs/`: `VIDEO_SCRIPTS.md` (19 tutorial scripts for 3D Viewer), `FEATURE-USECASES-2.0.0.md`, `MEDIA_CHECKLIST.md`, `index.html` docs, and `img/docs-3d-viewer-*.webp` screenshots (analytics, AR QR, dimensions, camera, hotspots and more). These are useful for a bundle-level BF campaign.
- `<WC3D>/landing-page/index.html` is a **3D Viewer** landing mockup ("Flat photos tell. 3D models sell."), not a configurator page. It has the Free/Pro $59.99/Max $83.88 pricing block, placeholder testimonials and unsourced stats. It sits in the configurator's folder, which is easy to confuse.
