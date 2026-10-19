# Prompt: Halloween email campaign (6 emails, one HTML file)

Copy everything below the line and paste it as the prompt. Fill in the `[...]` fields first.

---

You are writing a Halloween email campaign for **bPlugins**, for the **3D Viewer** plugin. The emails go to **free users** of 3D Viewer (installed from wordpress.org) and the goal is to move them to **3D Viewer Pro**.

## Before you write anything

1. Read `email-rules.md` in full. Every rule in it is mandatory. The section "Added by Claude" is also to be followed.
2. Read `MARKETING-FEATURES.md`. Use only features and numbers that are verified there. Read **section 11 (Do not claim)** and **section 12 (Open decisions)** before writing. If a claim is not in that file, do not make it.
3. Do not mix in any other brand. Only bPlugins, its plugin names and its links appear in these emails.

## Campaign facts (fill in before running)

- Discount: `[XX]%` — subject lines only, never in the body.
- Offer ends: `[date]`
- Upgrade / CTA link: `[URL]`
- Contact link (for the "want a bigger discount" line): `[URL or mailto]`
- Sender name: `[name]`, Sender email: `[email]`
- Sending schedule: `[e.g. 24 Oct – 1 Nov 2026]`

## What to produce

**One HTML file** named `halloween-emails.html` that contains all 6 emails.

- No images, banners, icons or placeholders for them. Text only. Graphics will be added later.
- Simple, clean HTML that is easy to copy into an email tool: one container per email, basic inline styles, a readable font, max width around 600px.
- Each email block has, in this order:
  1. **Email number and send day** (e.g. "Email 1 — Day 1")
  2. **Subject line** (under ~50 characters; the discount % can go here)
  3. **Preview text** (adds to the subject, does not repeat it)
  4. **Body** (150–200 words)
  5. **CTA button** with the upgrade link
  6. **Plain-text version** of the same email in a `<pre>` block under it
- Add a short **table of contents** at the top of the file listing all 6 subject lines.

## Rules for every email (from `email-rules.md`)

- Structure: **Problem → Solution → Benefit.**
- You may open with a question.
- Describe the solution first **without naming the plugin**. Only after that, introduce 3D Viewer Pro as the way to get it.
- Use business language and a **business scenario** to show the problem and the benefit. Don't target a specific niche; we don't know what the reader sells. Examples must fit any store or business.
- **Max 2 links per email**: one CTA button, and at most one text link.
- The discount percentage never appears in the body.
- Keep Halloween to the subject line and the opening line. No puns in the body.
- Show urgency with the real end date, not with pressure words ("hurry", "last chance").
- Name a feature only when it's tied to an outcome (more sales, fewer returns, more trust).
- One clear CTA per email, e.g. "Upgrade to Pro".
- End **some** emails (not all) with a line like *"Want a bigger discount? Contact us."* — that line counts as the second link.

## The 6-email arc

Each email must stand on its own, but together they should build a story. Each one takes a **different problem** and a different Pro feature that solves it. Suggested arc (adjust if the feature file supports a better one):

| # | Role in the sequence | Angle |
|---|---|---|
| 1 | Open the campaign | The biggest everyday problem a free user has that Pro solves. Announce the Halloween offer. |
| 2 | Problem → feature | A second problem and the feature that fixes it. |
| 3 | Problem → feature | A third problem and feature. Include the "contact us" line. |
| 4 | Bigger picture | The bundle story: Pro includes the 3D Product Configurator; no monthly fee, no cut per sale. |
| 5 | Proof / objection | Answer the main hesitation a free user has about upgrading. |
| 6 | Closing | Offer ends on `[date]`. Short recap of what they get. Include the "contact us" line. |

Choose the features from `MARKETING-FEATURES.md` and use its verified numbers.

## Output checklist (verify before you finish)

- [ ] 6 emails, all in one HTML file, no images or image placeholders
- [ ] Every email: subject + preview + body + CTA + plain-text version
- [ ] Every body is 150–200 words and follows Problem → Solution → Benefit
- [ ] Plugin is not named until after the solution is described
- [ ] No discount % in any body
- [ ] Max 2 links per email; one CTA each
- [ ] "Contact us" line appears in some emails, not all
- [ ] No niche-specific examples
- [ ] Every claim and number exists in `MARKETING-FEATURES.md` and is not in its "Do not claim" list
- [ ] Only bPlugins branding
