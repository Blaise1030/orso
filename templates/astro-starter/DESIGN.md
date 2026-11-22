# Design — Astro starter

Calm get-started surface. Light tokens, clear hierarchy, plenty of space. Structure mirrors a create-app home (brand, steps, CTAs, footer links) without marketing section stacks.

## Tokens

All color, type, radius, shadow, spacing and motion values live in the `@theme` block of `src/styles/global.css`. Components use token utilities (`bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-accent`, `font-display`, `rounded-lg`, …) or `var(--…)`. Do not hard-code hex/rgb or Tailwind palette colors in components.

## Home

- Brand name is the hero signal.
- Steps use a monospace / code-like voice.
- Primary CTA → sample posts; secondary → docs (`site.docsUrl`).
- No cards in the hero; no section ids like `hero` / `pricing`.

## Posts

Simple list + article prose. Enough to prove the sample model; not a full blog product.
