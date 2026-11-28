# Home open-canvas craft (Gui-inspired)

Date: 2026-11-26  
Status: draft for review  
Scope: `site/` marketing homepage (`/`) only

## Intent

Scrap the current home’s “technical document” chrome and rebuild its craft so `/` reads like usegui.com: product-first, airy, open paper — while keeping Orso identity (bear, copy, Geist, existing colour tokens). Blog, help, header, and footer stay on today’s design.

## Decisions (locked)

| Choice | Decision |
| --- | --- |
| Scope | Home only (A) |
| Theme intensity | Craft rewrite; keep Orso tokens (B) |
| Approach | Open canvas (1) |
| Visual companion | Declined |

## Non-goals

- No Inter Tight, no Gui `#0066FF`, no site-wide `DESIGN.md` / `@theme` colour or font rewrite
- No blog / help / nav / footer restyle
- No new marketing copy (reuse existing `home.*` keys; shorten only if a line breaks a layout)
- No new product mocks (reuse ProductTabs, BentoHeroEditor, BentoPreviewTile, AgentComposerMock, BentoBranchTile)
- No scroll-triggered section reveals (existing motion rules stand)

## Information architecture

Keep section order and ids:

1. Hero (`#product`)
2. Logos (`#logos`)
3. How it works (`#how-it-works`, numbered `<ol>`)
4. Bands (`#bands`)
5. Proof (`#proof`)
6. FAQ (`#faq`)
7. CTA (`#cta`)

Nav anchors and `content-pages` id checks remain valid.

## Craft principles

1. **Open paper** — Home sections sit on `bg-surface`. Do not wrap the home stack in `max-w-7xl border-x` document frames.
2. **Whitespace over boxes** — Separate sections with vertical space (`py-section` / `py-section-wide`), not hairline cages around every band.
3. **No painting stages on home** — Remove `Painting` backdrops and night scrims behind hero and step/band mocks. Mocks sit on surface or a light `sand` plate.
4. **Tokens only** — Geist, existing blues, `surface` / `ink` / `muted` / `line` / `sand` / shadows. No new hex in components.
5. **Product is the illustration** — One clear product surface per beat; no decorative grids of equal cards.

## Section specs

### Hero

- Left-aligned display headline, body, Download + secondary (existing keys).
- No bordered section frame; generous top padding.
- ProductTabs (or equivalent single product surface) full width under the copy: `shadow-raised` plus a single `border-line` hairline — no painting stage.
- Keep tab behaviour and shot assets.

### Logos

- Quiet strip: one muted intro line + inline logos.
- No bordered logo cells; no section side borders.

### How it works

- Title + short body, then numbered steps `01`–`03` (edit → preview → agent).
- Each step: open row, copy left / mock right on large screens; stack on small.
- No column borders, no painting backdrop; mock in a simple rounded panel.
- Wide vertical gap between steps.

### Bands

- Three open essays: git statement, draft branches + branch mock, stack logos.
- Alternate text/mock sides; whitespace between bands only.
- No full-width sand slabs; sand only inside a mock plate if needed.

### Proof / FAQ / CTA

- Same content and structure.
- Remove outer border frames so they sit on open paper.
- Proof stays two-column quote + maker note (no new night band).
- FAQ accordion unchanged in behaviour.
- CTA keeps split + facts strip; hairlines only where they clarify the split — no heavy outer box.

## Files (expected)

| Path | Change |
| --- | --- |
| `site/src/components/sections/Hero.astro` | Open craft; drop painting stage behind tabs |
| `site/src/components/vue/ProductTabs.vue` | Remove stage painting; light panel treatment |
| `site/src/components/sections/Logos.astro` | Already quiet; drop any leftover frame |
| `site/src/components/sections/HowItWorks.astro` | Open rows; remove Painting |
| `site/src/components/sections/Bands.astro` | Open essays; drop border cages |
| `site/src/components/sections/Proof.astro` | Drop outer border frame |
| `site/src/components/sections/Faq.astro` | Drop outer border frame if present |
| `site/src/components/sections/Cta.astro` | Soften outer box |
| `site/DESIGN.md` | Update Layout / Components / Art for home open-canvas; note home ≠ interiors |
| `site/scripts/content-pages.test.mjs` | Keep id/`<ol>`/`bands` assertions; add assertion that home does not embed painting stage URLs if practical |

No change required to `zh.json` / `ms.json` (Crowdin; English fallback).

## Testing

- Desktop and mobile preview of `/`
- `node --test scripts/content-pages.test.mjs` (after build when verifying production HTML)
- `scripts/design-tokens.test.mjs` still passes for touched files (no new colour literals)
- Spot-check `/zh/` and `/ms/` fall back for any new keys (none expected)

## Success criteria

A visitor on `/` should feel a Gui-like open product landing: air, one product surface at a time, minimal chrome — while still clearly Orso (Geist, current blue, bear, existing copy). Interiors unchanged.
