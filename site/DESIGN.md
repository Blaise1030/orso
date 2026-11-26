---
version: alpha
name: Project Orso
description: Developer tools for content teams.
colors:
  surface: "#fafaf9"
  surface-raised: "#ffffff"
  sand: "#f4f4f5"
  mist: "#eaeae7"
  ridge: "#c4c4c0"
  glow: "#fafaf9"
  ink: "#18181b"
  muted: "#52525b"
  line: "#e4e4e7"
  line-strong: "#a1a1aa"
  accent: "#2563eb"
  accent-hover: "#1d4ed8"
  on-accent: "#ffffff"
  night: "#18181b"
  night-raised: "#242427"
  night-line: "#3f3f46"
  on-night: "#fafafa"
  on-night-muted: "#a1a1aa"
  status-draft: "#b45309"
  status-review: "#2563eb"
  status-live: "#15803d"
  status-danger: "#b91c1c"
  surface-dark: "#0c0c0d"
  surface-raised-dark: "#141416"
  sand-dark: "#18181a"
  mist-dark: "#222225"
  ink-dark: "#f4f4f5"
  muted-dark: "#a1a1aa"
  line-dark: "#27272a"
  line-strong-dark: "#52525b"
  accent-dark: "#60a5fa"
  accent-hover-dark: "#93c5fd"
  night-dark: "#1b1b1e"
  status-draft-dark: "#fbbf24"
  status-review-dark: "#60a5fa"
  status-live-dark: "#4ade80"
  status-danger-dark: "#f87171"
typography:
  display:
    fontFamily: "Geist"
    fontSize: clamp(2.75rem, 6vw, 4.75rem)
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: -0.035em
  title:
    fontFamily: "Geist"
    fontSize: clamp(2.25rem, 4vw, 3rem)
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: -0.035em
  heading:
    fontFamily: "Geist"
    fontSize: 1.5rem
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.015em
  body:
    fontFamily: "Geist"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.65
  small:
    fontFamily: "Geist"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist"
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  md: 0.5rem
  lg: 0.75rem
  xl: 1rem
  full: 9999px
spacing:
  base: 0.25rem
  gutter: 1.25rem
  gutter-wide: 2.5rem
  section: 4.5rem
  section-wide: 7rem
  header: 3.25rem
  rise: 0.75rem
---

## Overview

Project Orso is a working desk for a content team, so the site looks like a well-set technical document rather than a brochure. Paper and ink, white space, hairlines, and the product itself as the only illustration. Type is large and tightly set; copy is small and plain; colour is saved for status.

Every value below is a CSS variable in the `@theme` block of `src/styles/global.css`, and components use only those tokens (`scripts/design-tokens.test.mjs` enforces it). Change a value there and here together.

## Colors

Light mode is the default; dark mode follows the visitor's system setting by giving the same variables neutral values (keys ending in `-dark` above). Components never switch colours themselves.

| Token | Utility | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| `--color-surface` | `bg-surface` | `#fafaf9` proof paper | `#0c0c0d` | Page background, `theme-color` |
| `--color-surface-raised` | `bg-surface-raised` | `#ffffff` | `#141416` | Product panels, inputs, mini-site paper |
| `--color-sand` | `bg-sand` | `#f4f4f5` | `#18181a` | Quiet bands, rails, inset panels |
| `--color-mist` | `bg-mist` | `#eaeae7` | `#222225` | Selection, legal note, subtle blocks |
| `--color-ridge` | `fill-ridge` | `#c4c4c0` | `#3f3f46` | Muted illustration strokes |
| `--color-glow` | `fill-glow` | `#fafaf9` | `#e4e4e7` | Illustration highlights |
| `--color-ink` | `text-ink` | `#18181b` | `#f4f4f5` | Headings, body, primary buttons |
| `--color-muted` | `text-muted` | `#52525b` | `#a1a1aa` | Supporting text, labels, metadata |
| `--color-line` | `border-line` | `#e4e4e7` | `#27272a` | Hairline dividers and panel edges |
| `--color-line-strong` | `border-line-strong` | `#a1a1aa` | `#52525b` | Outline buttons, link underlines |
| `--color-accent` | `bg-accent`, `text-accent`, `bg-primary` | `#2663eb` | `#60a5fa` | App blue primary (Nuxt UI `--ui-primary`), focus ring, links |
| `--color-accent-hover` | `hover:bg-accent-hover` | `#1d4ed8` | `#93c5fd` | Accent hover |
| `--color-on-accent` | `text-on-accent` | `#ffffff` | `#0c0c0d` | Text on accent |
| `--color-night` | `bg-night` | `#18181b` | `#1b1b1e` | The proof band and code-style surfaces |
| `--color-night-raised` | `bg-night-raised` | `#242427` | `#232326` | Raised detail inside the proof band |
| `--color-night-line` | `border-night-line` | `#3f3f46` | `#3f3f46` | Hairlines on night |
| `--color-night-ghost` | `text-night-ghost` | `#2f2f36` | `#2f2f36` | The oversized wordmark behind the footer |
| `--color-on-night` | `text-on-night` | `#fafafa` | `#fafafa` | Type on night |
| `--color-on-night-muted` | `text-on-night-muted` | `#a1a1aa` | `#a1a1aa` | Supporting type on night |
| `--color-status-draft` | `text-status-draft` | `#b45309` | `#fbbf24` | Waiting for a person |
| `--color-status-review` | `text-status-review` | `#2563eb` | `#60a5fa` | Preview and review ready |
| `--color-status-live` | `text-status-live` | `#15803d` | `#4ade80` | Published, passing checks |
| `--color-status-danger` | `text-status-danger` | `#b91c1c` | `#f87171` | Deletions, failures |

Status colours are information, never decoration. They appear in small dots, pills and diff numbers; a page should still read correctly in monochrome. Ink on surface stays well above 7:1; muted stays readable on every surface. Rendered Markdown (`prose`) maps the typography plugin's `--tw-prose-*` variables to these tokens.

## Typography

One family: **Geist** (Vercel), self-hosted from `@fontsource-variable/geist` through Astro's font API (`--font-geist`). Astro preloads the upright variable file, uses `font-display: swap`, and generates a metric-matched fallback. `--font-sans` and `--font-display` both point at it; `--font-mono` is the system monospace stack for repo paths, hashes and field values.

The scale has six roles (`--text-*`): `label` 0.75rem/1.5, `small` 0.875rem/1.55, `body` 1rem/1.65, `heading` 1.5rem/1.25, `title` `clamp(2.25rem, 4vw, 3rem)`/1.08 and `display` `clamp(2.75rem, 6vw, 4.75rem)`/1.02. Components use the matching utilities (`text-label`, `text-small`, `text-body`, `text-heading`, `text-title`, `text-display`) and never numeric size classes; the six roles are the whole scale. (Tailwind's numeric steps, palette, radii and shadows remain defined only for Nuxt UI's internal classes; Nuxt UI's colours map onto these tokens through the `--ui-*` variables in `src/styles/global.css`.) `display` is reserved for the home hero. `title` covers page and article titles, featured posts, the closing CTA and major section headlines; `heading` covers sub-section headings, card titles and product-mock headings; `body` is all prose, navigation and controls; `small` is supporting copy and metadata in larger blocks; `label` is the smallest step for dates, categories, eyebrows and column headings. Display type is weight 500 with tight tracking (`tracking-display`, -0.035em); body copy is 400. The footer watermark uses its own `watermark` step (`clamp(7rem, 36vw, 40rem)`, line-height 0.78) as decorative artwork, not part of the text scale.

## Layout

The home page is an **open canvas**: product-first, airy, Gui-inspired craft on Orso tokens. Landing sections sit in a centred `max-w-5xl` column (`mx-auto`) on `bg-surface` and separate with one `--spacing-section` gap each (`pt-section`), not stacked `py-section` pairs and not `max-w-7xl border-x` document frames. The `page` utility supplies gutters for copy and product panels. Blog and help keep the earlier desk look (centred columns, hairline chrome); do not copy the home’s open-canvas rules onto interiors.

Home order: hero (left-aligned headline, lead, dual CTAs, one inset product shot) → logos (title, body, marks) → how-it-works grid → cost-and-setup copy band → feature bands → FAQ → footer CTA. Sections use `pt-section` (`--spacing-section`, 4.5rem) so the gap between any two is one token; the hero may use `pt-section-wide` (7rem) for page top only; the footer adds `pb-section` for the page bottom.

The hero shows a single product capture (preview shot, with clip when available) filling the `max-w-5xl` column — Gui-style, not a multi-tab grid. No sand plate and no `shadow-raised` on the shot.

## Elevation & Depth

Depth comes from tone (surface, sand, night), 1px hairlines, and a black-tinted raised shadow. `--shadow-soft` is a light lift; `--shadow-raised` is the stronger lift used on agent windows and raised chrome, not on home product figures. Carousel cards stay flat with a hairline ring, and shadows never tint with the text colour so dark mode shows a shadow rather than a glow.

## Art

The home page does **not** use painting stages or raised shadows on product plates. Product shots sit in the `max-w-5xl` column: hero fills that width; how-it-works cells up to `max-w-md`; band figures up to `max-w-xl`. Public-domain Renaissance landscapes remain available for unused section leftovers (`Ops`, `AgentBand`) and any future non-home surfaces — files, sources and licences in `public/paintings/CREDITS.md`; ids in `src/lib/paintings.ts` via `Painting.astro`. When a painting is used, crop to fill, add a flat `bg-night` scrim (20–30%), and never use it for meaning.


## Shapes

Buttons use `--radius-md` (0.5rem) and are compact, never pills. Product panels, carousel cards and the tab frame use `--radius-md`; large bands and the three feature cards are square-edged frames. `full` is reserved for status pills, tags, avatars, carousel arrows and the blog category filters.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--transition-duration-quick` | 160ms | Link and nav colour changes |
| `--transition-duration-gentle` | 320ms | Buttons, tab underline, FAQ open/close |
| `--transition-duration-slow` | 700ms | Hero words, section entrances |
| `--ease-gentle` | cubic-bezier(0.22, 0.61, 0.36, 1) | Hovers |
| `--ease-settle` | cubic-bezier(0.16, 1, 0.3, 1) | The hero sequence |
| `--motion-stagger` | 45ms | Delay between hero words |
| `--spacing-rise` | 0.75rem | Entrance travel |

There is one orchestrated page-load moment: the hero headline arrives word by word with a short blur, followed by the lead, actions and product panel. Nothing fades in on scroll. Motion after load answers an action (a tab click, an FAQ opening, a page change). Under `prefers-reduced-motion: reduce` every animation, transition, view transition and smooth scroll is switched off.

## Components

- **Header**: wordmark plus name, plain muted nav, outline secondary CTA and ink primary CTA. No pill buttons. Omitted on the landing page; Blog, Help and other interiors keep it. Nav and download remain in the footer and hero CTAs.
- **Hero**: left-aligned display headline, lead, dual CTAs, then one inset product shot.
- **Logos**: section title, short body, then two labeled rows — Stack (Astro, Markdown, GitHub, plus a stacked Next/Nuxt/Remix/Svelte cluster with a Coming soon badge) and Agents (Claude, Cursor, Codex icon+caption, OpenCode). Marks sit at `h-8`; no bordered cells on the lockups.
- **How it works**: two-by-two grid on desktop (edit → preview → agent → publish); each cell is an inset hairline figure (`max-w-md`), then a step number, title and body — usegui.com rhythm.
- **Setup**: Gui-style cost-and-setup copy — free/open source, bring your own agent, nothing to migrate.
- **Bands**: open essays (git statement, draft branches + inset figure) separated by whitespace.
- **FAQ**: stacked title and intro, then a full-width hairline accordion with FAQPage JSON-LD.
- **Blog**: one text-only featured post (date · category, large headline, excerpt) above a "Recent posts" bar with rounded category filters and a client-side search. Posts sit in a hairline grid — three columns on wide screens, two on tablet, one on mobile — with the cover or proof-sheet artwork at the top of each padded cell. A post opens with a wide hero (the cover image, or proof-sheet artwork when there is none) and, when it has several sections, a sticky "On this page" rail on desktop that collapses into a disclosure above the body on mobile.
- **Footer**: centred `max-w-5xl` column with no outer border frame. Wordmark, then stacked closing CTA (`#cta` / `#get-orso`: title, body, download + GitHub, platforms), then a four-column link grid (Product, Resources, More, Legal).

## Do's and Don'ts

Do use the tokens and shared utilities (`page`, `label`, `link`, `button`, `button-quiet`, `chip`). Keep every new product mock monochrome apart from the four status colours. Don't add hex values, Tailwind palette classes, arbitrary colour values or `dark:` colour variants outside the token file. Don't add decorative gradients, stock photography, rounded feature cards, raised shadows on home product figures, or scroll-triggered reveals.

## Voice & Tone

Calm, plain and specific. Lead with the repo reframe and the team handoff; treat the agent as a supporting capability. Say what happens: a draft, a preview, a Publish button. Headlines in sentence case and outcome-led; buttons name the outcome ("Get Orso", "See what it does"). No cleverness that hides the point.
