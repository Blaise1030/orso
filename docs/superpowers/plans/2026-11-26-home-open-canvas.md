# Home open-canvas craft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Orso marketing homepage (`site/` `/`) into an open-canvas, Gui-like craft while keeping Orso tokens, copy, and mocks.

**Architecture:** Craft-only changes in home section components and `ProductTabs.vue`: remove document frames (`max-w-7xl border-x`), painting stages, and hairline cages; separate sections with whitespace; product mocks on surface/`sand` with `shadow-raised` + `border-line`. Update `site/DESIGN.md` Layout/Art/Components for home. No token or font rewrite; blog/help/chrome untouched.

**Tech Stack:** Astro 7, Vue 3 islands, Nuxt UI, Tailwind v4 tokens in `site/src/styles/global.css`, node:test via `site/scripts/*.test.mjs`

**Spec:** `docs/superpowers/specs/2026-11-26-home-open-canvas-design.md`

## Global Constraints

- Home (`/`) only — do not restyle blog, help, header, or footer
- Keep Geist and existing colour tokens — no Inter Tight, no Gui `#0066FF`, no new hex in components
- Reuse existing `home.*` i18n keys and product mocks — no new copy keys unless a layout-breaking line must shorten
- Do not edit `zh.json` / `ms.json` by hand (Crowdin)
- No scroll-triggered section reveals; existing motion rules stand
- Do not commit unless the user explicitly asks
- After ordinary component edits prefer live preview; run `npm run build` in `site/` only when verifying production HTML / content-pages tests

## Review Focus

- Mobile stack of how-it-works steps: copy then mock, readable without horizontal overflow
- ProductTabs without painting still contrast on `surface` in light and dark
- Section ids `#product` `#logos` `#how-it-works` `#bands` `#proof` `#faq` `#cta` remain for nav
- Home HTML must not load painting stage assets for hero/how-it-works
- design-tokens test: no new colour literals in touched home files

---

## File map

| File | Responsibility |
| --- | --- |
| `site/scripts/content-pages.test.mjs` | Assert open-canvas markers (no painting URLs on home; ids/`<ol>`/`bands`) |
| `site/src/components/vue/ProductTabs.vue` | Hero product surface without painting stage |
| `site/src/components/sections/Hero.astro` | Open hero frame |
| `site/src/components/sections/Logos.astro` | Quiet strip, no document border |
| `site/src/components/sections/HowItWorks.astro` | Open numbered steps, no Painting |
| `site/src/components/sections/Bands.astro` | Open essays, no border cages |
| `site/src/components/sections/{Proof,Faq,Cta}.astro` | Drop outer border frames |
| `site/DESIGN.md` | Document home open-canvas vs interiors |

---

### Task 1: Failing home open-canvas assertions

**Files:**
- Modify: `site/scripts/content-pages.test.mjs`
- Test: same file (runs against `site/dist` after build)

**Interfaces:**
- Consumes: built `dist/index.html` via existing `html(root, "")`
- Produces: assertions later tasks must satisfy

- [ ] **Step 1: Extend the home assertions in `built sample Blog and Help articles…`**

Keep existing id / `<ol>` / `bands` / no `capabilities` checks. Add:

```js
assert.doesNotMatch(home, /\/paintings\/(?:danube|bridge|toledo|rocks)/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && npm run build && node --test --test-concurrency=1 scripts/content-pages.test.mjs`

Expected: FAIL on the paintings assertion (hero/how-it-works still embed stages)

- [ ] **Step 3: Commit** — skip unless user asks

---

### Task 2: Hero product surface + logos strip

**Files:**
- Modify: `site/src/components/vue/ProductTabs.vue`
- Modify: `site/src/components/sections/Hero.astro`
- Modify: `site/src/components/sections/Logos.astro`

**Interfaces:**
- Consumes: existing `shots` / `copy` props on ProductTabs; Hero i18n keys unchanged
- Produces: hero without painting URLs; logos without `border-x`

- [ ] **Step 1: In `ProductTabs.vue`, remove `paintingUrl` / `paintingSize` / stage `<img>`; wrap tab frame in `border border-line bg-surface shadow-raised`**

Keep tab list, progress underline, and `AppShot` behaviour. Content area: plain `bg-sand` or `bg-surface` behind the shot (token utilities only).

- [ ] **Step 2: In `Hero.astro`, drop `max-w-7xl border-x border-line`; use open `page` + generous `pt-section` / `md:pt-section-wide`; keep `#product` and ProductTabs**

- [ ] **Step 3: In `Logos.astro`, ensure no `border-x` document frame; keep quiet intro + inline logos and `#logos`**

- [ ] **Step 4: Build + run content-pages test**

Run: `cd site && npm run build && node --test --test-concurrency=1 scripts/content-pages.test.mjs`

Expected: paintings assertion may still fail if HowItWorks still paints; hero danube must be gone. If the regex still fails solely due to HowItWorks, that is OK for this task — note it and continue to Task 3. If danube remains, fix ProductTabs before continuing.

- [ ] **Step 5: Commit** — skip unless user asks

---

### Task 3: How it works + bands open rows

**Files:**
- Modify: `site/src/components/sections/HowItWorks.astro`
- Modify: `site/src/components/sections/Bands.astro`

**Interfaces:**
- Consumes: existing `home.howItWorks.*` and `home.bands.*` keys; same Vue mocks
- Produces: no Painting import/usage; no `border-x` / `border-b` cages; open rows with whitespace

- [ ] **Step 1: Rewrite `HowItWorks.astro` craft**

Remove `Painting` import and all painting markup. Section: open paper, `#how-it-works`, title/body, `<ol>` of three steps. Each step: `md:grid-cols-12` open row (copy `md:col-span-5`, mock `md:col-span-7`), mock in `rounded-md border border-line bg-surface shadow-raised` (or `bg-sand` plate). Gaps via `py-section` / space-y, not `border-b` cages. Keep step keys edit → preview → agent and mock wiring.

- [ ] **Step 2: Rewrite `Bands.astro` craft**

Keep `#bands` and three essays (git, branches, stack). Drop `border-x border-b` section cages and full-bleed sand slabs; alternate text/mock; whitespace between articles; branch mock in the same light panel treatment as steps.

- [ ] **Step 3: Build + run content-pages test**

Run: `cd site && npm run build && node --test --test-concurrency=1 scripts/content-pages.test.mjs`

Expected: PASS including `doesNotMatch` paintings assertion

- [ ] **Step 4: Commit** — skip unless user asks

---

### Task 4: Proof / FAQ / CTA frames + DESIGN.md

**Files:**
- Modify: `site/src/components/sections/Proof.astro`
- Modify: `site/src/components/sections/Faq.astro`
- Modify: `site/src/components/sections/Cta.astro`
- Modify: `site/DESIGN.md`

**Interfaces:**
- Consumes: unchanged section content/ids
- Produces: open-paper closing sections; DESIGN.md documents home open-canvas

- [ ] **Step 1: Soften Proof / FAQ / CTA**

Drop outer `border` / `border-x` document frames. Keep internal hairlines only where they clarify a split (CTA facts strip, proof column rule). Keep ids and copy.

- [ ] **Step 2: Update `site/DESIGN.md`**

Rewrite Layout / Art / Components home bullets to match open-canvas (no painting stages on home; whitespace over boxes; ProductTabs without painted stage). Explicitly note interiors (blog/help) keep the existing desk look.

- [ ] **Step 3: Verify**

Run: `cd site && npm run build && node --test --test-concurrency=1 scripts/content-pages.test.mjs scripts/design-tokens.test.mjs`

Expected: content-pages PASS; design-tokens — no new failures in touched home files (pre-existing DownloadButton failures may remain; do not expand them)

- [ ] **Step 4: Refresh preview**

Restart `astro preview` on the port the user is viewing (typically `127.0.0.1:4321`) so the preview tab shows the new home.

- [ ] **Step 5: Commit** — skip unless user asks

---

## Self-review notes

- Spec coverage: open paper, no paintings, hero/logos/how-it-works/bands/proof/faq/cta, DESIGN.md, tests — all tasked
- Review Focus lines covered by Task 1 paintings assertion, Task 3 mobile stack (implementer checks preview), Task 4 tokens run, ids preserved throughout
- Proportion: craft plan, no transcribed component bodies
