---
version: alpha
name: Starter
description: Your Astro site, editable in Orso
colors:
  surface: "#f6f4ef"
  surface-raised: "#fcfbf8"
  sand: "#ece7dd"
  mist: "#dde5ea"
  ridge: "#b4c0c6"
  glow: "#fdfaf2"
  ink: "#2a2e33"
  muted: "#5b6269"
  line: "#ddd7cb"
  line-strong: "#b5ae9f"
  accent: "#3b5a72"
  accent-hover: "#2e4a60"
  on-accent: "#f6f4ef"
  surface-dark: "#25272a"
  surface-raised-dark: "#2c2f32"
  sand-dark: "#2f3235"
  mist-dark: "#2f3b45"
  ridge-dark: "#4a5862"
  glow-dark: "#d8d3c6"
  ink-dark: "#eae6de"
  muted-dark: "#a9adb0"
  line-dark: "#3c3f43"
  line-strong-dark: "#5a5f64"
  accent-dark: "#a3bdd1"
  accent-hover-dark: "#bfd2e0"
  on-accent-dark: "#1d2023"
typography:
  display:
    fontFamily: "Albert Sans"
    fontSize: 3.75rem
    fontWeight: 300
    lineHeight: 1.04
    letterSpacing: -0.025em
  h1:
    fontFamily: "Albert Sans"
    fontSize: 3rem
    fontWeight: 300
    lineHeight: 1.08
    letterSpacing: -0.025em
  h2:
    fontFamily: "Albert Sans"
    fontSize: 2.375rem
    fontWeight: 300
    lineHeight: 1.15
    letterSpacing: -0.025em
  h3:
    fontFamily: "Albert Sans"
    fontSize: 1.25rem
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: -0.012em
  body-lg:
    fontFamily: "Albert Sans"
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: "Albert Sans"
    fontSize: 1.0625rem
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Albert Sans"
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.14em
rounded:
  sm: 0.25rem
  md: 0.5rem
  lg: 1rem
  xl: 1.75rem
  full: 9999px
spacing:
  base: 0.25rem
  gutter: 1.25rem
  gutter-wide: 2.5rem
  section: 6rem
  section-wide: 9rem
  header: 4.5rem
  rise: 0.75rem
---

## Overview

Calm get-started surface. Light tokens, clear hierarchy, plenty of space. Structure mirrors a create-app home (brand, steps, CTAs, footer links) without marketing section stacks.

Every value below is a CSS variable in the `@theme` block of `src/styles/global.css`, and components use only those tokens (`scripts/design-tokens.test.mjs` enforces it). Change a value there and here together.

## Tokens

All color, type, radius, shadow, spacing and motion values live in the `@theme` block of `src/styles/global.css`. Components use token utilities (`bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-accent`, `font-display`, `rounded-lg`, …) or `var(--…)`. Do not hard-code hex/rgb or Tailwind palette colors in components.

## Home

- Brand name is the hero signal.
- Steps use a monospace / code-like voice.
- Primary CTA → sample posts; secondary → docs (`site.docsUrl`).
- No cards in the hero; no section ids like `hero` / `pricing`.

## Posts

Simple list + article prose. Enough to prove the sample model; not a full blog product.
