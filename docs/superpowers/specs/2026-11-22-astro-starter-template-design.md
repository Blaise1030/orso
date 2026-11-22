# Astro starter template (get-started + sample posts)

**Date:** 2026-11-22  
**Status:** Draft — awaiting user review  
**Related:** [Orso Astro integrations copy](./2026-11-07-orso-astro-integrations-copy-design.md), [Orso-owned collections + preview path](./2026-11-14-orso-collections-preview-path-design.md)

## Problem

The default scaffold (`templates/astro-marketing`) ships a full Acme marketing site: blog and help taxonomies, many routes, section components, and demo copy. That is a finished product demo, not a starting point. New users inherit models and pages they must delete before building their own site.

Separately, sample content models must stay **site-owned**. They must not live inside `packages/astro` / the vendored `integrations/orso` plugin. The plugin remains a model-agnostic integration (collections passed in by the site).

## Goals

- Replace the Acme marketing/blog/help template with a thin **get-started starter** (Next.js create-app style).
- Ship **one sample model**, `posts` (title, date, body), defined only in the template/site.
- Wire that model end-to-end: collection → list + detail routes → Orso `previewPath`.
- Keep `orso-astro` free of sample or marketing collection presets.
- Rename the scaffold path/package from `astro-marketing` to `astro-starter` so the name matches the product.

## Non-goals

- Changing Orso’s own marketing site under `site/`.
- Shipping a second “full demo” template alongside the starter.
- Adding blog features (categories, tags, covers, related posts) to the sample model.
- Putting sample models, `marketingCollections`, or similar presets in `packages/astro`.
- Requiring a Deploy CTA on the home page (deploy workflow may remain in the scaffold; it is not a home primary action in v1).
- i18n for the starter.

## Approach

**Instructional home + posts as “Examples”.**

- `/` is a static get-started shell (not CMS-driven).
- Sample posts live under `/posts` and `/posts/[slug]`.
- Home primary CTA → sample posts; secondary CTA → docs; footer links for Learn / Examples / Orso.

## Architecture

```
templates/astro-starter/          # renamed from astro-marketing
  src/pages/index.astro           # get-started shell
  src/pages/posts/index.astro     # list
  src/pages/posts/[slug].astro    # detail
  src/content/collections.js      # posts only
  src/content/posts/*.md          # 2–3 sample entries
  astro.config.mjs                # orso({ collections }) from site file
  integrations/orso/              # synced for local template work;
                                  # scaffold injects packages/astro/src instead

packages/astro/                   # unchanged ownership: no posts/marketing models
src/static.rs                     # embed templates/astro-starter/; extract plugin from packages/astro
```

### Ownership boundary

| Concern | Owner |
|---------|--------|
| `posts` schema, loaders, sample markdown, preview paths | Template (`astro-starter`) |
| Manifest, `orsoGlob`, virtual collections, preview bridge | `packages/astro` → `integrations/orso` |
| Scaffolded project contents | `extract_template`: template tree minus template-local `integrations/orso/**`, then copy `packages/astro/src/` → `integrations/orso/` |

Any older idea of shipping `marketingCollections` from the plugin is explicitly rejected for this starter.

## Home UX

First viewport (one composition):

1. Brand / product name as the hero signal (scaffold site name from `site.ts`, not a fake Acme product pitch).
2. Two or three short steps in a code-like voice, e.g.:
   - Edit `src/pages/index.astro`
   - Edit a sample post (Orso or `src/content/posts/…`)
   - Save and see changes in preview
3. CTAs:
   - **Primary:** “View sample posts” → `/posts`
   - **Secondary:** “Read the docs” → Orso docs URL from `site.ts`
4. Footer row: Learn (docs) · Examples (`/posts`) · Orso (product/docs site)

Visual direction: calm starter page with clear hierarchy and existing (or lightly adjusted) CSS variables. Prefer the template’s current light token base over inventing a new dark Next.js clone; the *structure* matches create-next-app, not necessarily its dark chrome.

No marketing section stack (Hero/Logos/Features/Pricing/etc.). No cards in the hero.

## Sample model: `posts`

- **Fields:** `title` (string), `date` (date), body (markdown content).
- **Files:** `src/content/posts/` — 2–3 clearly demo markdown entries.
- **Collection:** single entry in `src/content/collections.js` via `orsoGlob` + schema + editor meta as needed for Orso.
- **`previewPath`:** site-relative `/posts/{slug}/` (trailing slash consistent with existing Astro routing conventions in the repo).
- **Routes:** list + detail only. Empty list shows a short empty state that points authors toward adding a post or reading docs. Unknown slugs → normal Astro 404.

Authors are expected to delete or replace `posts` when they define their own models.

## What to remove from the current template

- Collections and content trees: `blog`, `blogCategories`, `helpDocs`, `helpCategories`, `helpSubcategories`, `helpDocsCategories`, and all sample markdown under those trees.
- Pages and libs that only serve blog/help/legal/marketing sections.
- Marketing section components and Acme-oriented copy in `DESIGN.md` / `AGENTS.md` / `site.ts`.
- Optional SEO surfaces that only existed for the full demo (e.g. llms blog dumps) — keep cheap stubs (`robots`, sitemap) only if they stay trivial with posts.

## Rename and call sites

Rename `templates/astro-marketing` → `templates/astro-starter` (folder + package `name`).

Update embed and product references, including at least:

- `src/static.rs` (`#[folder = …]`, module docs)
- `src/projects.rs` (source labels / initial commit message)
- Tests that assert template paths (`tests/static.rs`, `tests/settings.rs`, etc.)
- Docs, justfile, skills (`skills/setup-orso`, template README/AGENTS/DESIGN)
- Deploy defaults that still say `astro-marketing` where they refer to *this* scaffold (not unrelated historical URLs in fixture tests unless those fixtures are updated for consistency)

`site/` may keep its own naming; it is out of scope except where docs wrongly equate it with the scaffold.

## Testing and verification

- Template tests: collections expose only `posts`; sample files parse; content/manifest or route checks updated for home + posts (no blog/help assumptions).
- Design-token tests kept if tokens remain.
- Rust/static tests: embedded starter paths; scaffold still omits template-local `integrations/orso` and injects `packages/astro`; assert no marketing/blog/help content trees in the embed if such assertions exist or are cheap to add.
- Smoke: scaffold → `astro dev` → `/` and `/posts` render; Orso preview path opens a sample post.

## Success criteria

- New project from template opens on a get-started home, not a marketing landing page.
- Exactly one sample content model (`posts`) appears in Orso, defined in the site, not the plugin.
- User can open Examples, read a sample post, edit it via Orso, and see it in preview.
- `packages/astro` contains no sample collection definitions for this starter.

## Open decisions (resolved in brainstorming)

| Topic | Decision |
|-------|----------|
| Starter vs full demo | Replace Acme template entirely |
| Home + sample | Both: instructional home + wired `posts` |
| Home pattern | Next-style get-started; posts linked as Examples |
| Sample model | `posts` (title, date, body) |
| Model ownership | Template only; not in orso plugin |
| Primary CTA | View sample posts → `/posts` |
| Rename | `astro-marketing` → `astro-starter` now |
