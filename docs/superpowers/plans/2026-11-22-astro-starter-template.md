# Astro Starter Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Acme marketing scaffold with a Next-style get-started Astro starter that ships one site-owned `posts` sample model (not in `orso-astro`).

**Architecture:** Rename `templates/astro-marketing` → `templates/astro-starter`. Strip blog/help/marketing surfaces. Keep home as a static instructional page; define `posts` only in `src/content/collections.js` with list/detail routes and `previewPath`. Scaffold embed and call sites follow the new path; `packages/astro` stays model-agnostic.

**Tech Stack:** Astro 7 content collections, `orsoGlob` / `orso({ collections })`, Node test runner (`scripts/*.test.mjs`), Rust `rust-embed` template extract, Vue template gallery copy.

**Spec:** `docs/superpowers/specs/2026-11-22-astro-starter-template-design.md`

## Global Constraints

- Sample model lives only in the template; never add `posts` / marketing presets to `packages/astro`.
- `posts` fields: `title` (string), `date` (YYYY-MM-DD string with existing date editor meta pattern), markdown body.
- `previewPath`: `({ slug }) => `/posts/${slug}/``.
- Home is static (not CMS-driven); primary CTA “View sample posts” → `/posts`; secondary “Read the docs” → `site.docsUrl`.
- Prefer existing light CSS tokens; no marketing section stack; no hero cards.
- Keep deploy workflow + cheap `robots.txt` / `sitemap.xml`; drop `llms.txt` / `llms-full.txt` and legal pages with the Acme surface.
- `site.docsUrl` = `https://projectorso.cc` (product/docs entry); `site.url` stays `https://example.com`.

## Review Focus

- Scaffolded projects must not receive template-local `integrations/orso` that somehow reintroduces old models — extract still injects `packages/astro/src` only.
- Manifest / Content sidebar must list exactly `posts` after sync (no leftover blog/help names).
- Empty `src/content/posts/` must still build and show a posts-list empty state (not crash).
- Unknown `/posts/{slug}/` must 404 (Astro default), not render a blank shell.
- Renamed embed path: `Template::get` must fail closed for deleted blog/help paths and succeed for new starter paths.

## File structure

| Path | Responsibility |
|------|----------------|
| `templates/astro-starter/` | Renamed scaffold root (`package.json` name `astro-starter`) |
| `…/src/content/collections.js` | Single `posts` collection + `previewPath` |
| `…/src/content/posts/*.md` | 2–3 demo posts |
| `…/src/lib/posts.ts` | `loadPosts()` sorted by `date` desc |
| `…/src/lib/pages.ts` | Sitemap paths: static + posts only |
| `…/src/pages/index.astro` | Get-started shell |
| `…/src/pages/posts/index.astro` | List (+ empty state) |
| `…/src/pages/posts/[slug].astro` | Detail |
| `…/src/site.ts` | Starter name, `docsUrl`, minimal nav/footer |
| `…/scripts/manifest.test.mjs` | Assert collections `["posts"]` |
| `…/scripts/content-pages.test.mjs` | Home CTAs + posts HTML |
| `src/static.rs` | `#[folder = "templates/astro-starter/"]` |
| `web/…/TemplateGallery.vue` | Gallery title/description/testid for starter |

Delete (under the renamed template): blog/help content trees; `src/pages/blog/**`, `help/**`, `privacy.astro`, `terms.astro`, `llms*.ts`; `src/lib/blog.ts`, `help.ts`; marketing/blog/help/legal components under `src/components/` (keep `Wordmark`, `PageHeader`, `Base` layout as needed).

---

### Task 1: Rename scaffold to `astro-starter`

**Files:**
- Rename: `templates/astro-marketing/` → `templates/astro-starter/`
- Modify: `templates/astro-starter/package.json` (`name`: `astro-starter`); deploy default worker name if present; `src/static.rs` folder + docs; `src/projects.rs` template commit message / comments; `justfile`; `tests/settings.rs`, `tests/static.rs` path strings that reference the folder; `scripts/sync-orso-integration.sh`; `skills/setup-orso/SKILL.md` path mentions for *this* scaffold
- Modify: `web/src/modules/projects/TemplateGallery.vue` + `TemplateGallery.test.ts` / `ProjectsGrid.test.ts` copy and `data-testid` (`template-astro-starter`)
- Leave alone: historical URLs inside `src/github.rs` fixtures unless a test fails; historical `docs/superpowers/**` narrative (optional one-line “superseded by starter” only if editing those files anyway); `site/` package naming

**Interfaces:**
- Consumes: existing `Template` embed API.
- Produces: embed root `templates/astro-starter/`; package name `astro-starter`.

- [ ] **Step 1: Rename directory** with `git mv templates/astro-marketing templates/astro-starter`

- [ ] **Step 2: Update package name + Rust `#[folder = "templates/astro-starter/"]` + justfile prefixes + sync/skill paths that target this scaffold**

- [ ] **Step 3: Update product UI** in `TemplateGallery.vue` — title “Astro starter”, description for get-started + sample posts, `data-testid="template-astro-starter"`; fix Vitest selectors

- [ ] **Step 4: Run** `cargo test --test static content_editor_template_files_are_embedded` (blog paths still present — expect PASS) and the TemplateGallery web unit test — expect PASS

- [ ] **Step 5: Commit**

```bash
git add -A templates/astro-starter src/static.rs src/projects.rs justfile tests/settings.rs scripts/sync-orso-integration.sh skills/setup-orso/SKILL.md web/src/modules/projects/TemplateGallery.vue web/src/modules/projects/TemplateGallery.test.ts web/src/modules/projects/ProjectsGrid.test.ts
git commit -m "chore: rename astro-marketing scaffold to astro-starter"
```

---

### Task 2: `posts` collection + manifest test

**Files:**
- Modify: `templates/astro-starter/src/content/collections.js`
- Create: `templates/astro-starter/src/content/posts/hello-orso.md`, `second-post.md` (optional third)
- Modify: `templates/astro-starter/scripts/manifest.test.mjs`
- Delete later (Task 3): old content trees — for this task you may leave old folders on disk until routes are gone, but `collections.js` must export **only** `posts`

**Interfaces:**
- Consumes: `orsoGlob` from `../../integrations/orso/index.js`; existing `contentCollection` helper pattern.
- Produces:
  - `export const collections = { posts: { collection: posts, previewPath: ({ slug }) => `/posts/${slug}/` } }`
  - Schema properties: `title: z.string()`, `date` as YYYY-MM-DD string with `.meta({ editor: { type: "date", knownRefinement: true } })` (same refine pattern as today’s `pubDate`)
  - Loader: `orsoGlob({ base: "./src/content/posts", pattern: "*.md" })` (no `/en` locale folder)

- [ ] **Step 1: Write failing `manifest.test.mjs` assertions**

```js
assert.deepEqual(manifest.collections.map(({ name }) => name), ["posts"]);
assert.deepEqual(byName.posts.loader, { base: "src/content/posts", pattern: "*.md" });
assert.equal(byName.posts.fields.properties.date.type, "date");
assert.equal(byName.posts.fields.properties.title.type, "string");
```

- [ ] **Step 2: Run** `node --test templates/astro-starter/scripts/manifest.test.mjs` (or `npm test --prefix templates/astro-starter` once build deps allow) — expect FAIL on collection names

- [ ] **Step 3: Implement `posts`-only `collections.js` + sample markdown** (`title`, `date`, short body). Do not add fields beyond the spec.

- [ ] **Step 4: Run manifest test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add templates/astro-starter/src/content/collections.js templates/astro-starter/src/content/posts templates/astro-starter/scripts/manifest.test.mjs
git commit -m "feat(astro-starter): ship site-owned posts sample collection"
```

---

### Task 3: Posts routes, strip Acme surfaces, content-page tests

**Files:**
- Create: `templates/astro-starter/src/lib/posts.ts` — `loadPosts(): Promise<Entry[]>` sorted by `date` descending
- Create: `templates/astro-starter/src/pages/posts/index.astro`, `[slug].astro`
- Modify: `templates/astro-starter/src/lib/pages.ts` — static paths + `/posts/{id}/` only
- Modify: `templates/astro-starter/scripts/content-pages.test.mjs`
- Modify: `tests/static.rs` `content_editor_template_files_are_embedded` present/absent lists
- Delete: blog/help content dirs; `src/pages/blog/**`, `help/**`, `privacy.astro`, `terms.astro`, `llms.txt.ts`, `llms-full.txt.ts`; `src/lib/blog.ts`, `help.ts`; components only used by those surfaces (`sections/**`, `Blog*`, `Help*`, `DocList`, `LegalPage`, `Artwork` if unused)

**Interfaces:**
- Consumes: `getCollection("posts")` / `render` from `astro:content`; `collections.posts.previewPath` contract from Task 2.
- Produces: routes `/posts/`, `/posts/{slug}/`; empty list copy pointing to add a post / docs.

- [ ] **Step 1: Rewrite failing `content-pages.test.mjs`**

Assert on built `dist` (same build-then-read pattern as today):

- Home HTML matches get-started cues (e.g. `View sample posts`, `href="/posts/"`, docs link to `https://projectorso.cc`) — home assertions that need the new index land fully in Task 4; for this task assert posts routes:
- `html(root, "posts")` lists sample titles
- `html(root, "posts/hello-orso")` renders markdown from the sample body
- Does **not** match `/blog/` or `/help/` routes (build should not emit those dirs)
- Fixture: empty `posts` dir still builds; list page contains empty-state text you choose (pin the exact string in the test)
- Sitemap includes `/posts/hello-orso/`; robots still points at `https://example.com/sitemap.xml`

- [ ] **Step 2: Run content-pages tests — expect FAIL**

- [ ] **Step 3: Implement `loadPosts`, posts pages, slim `pages.ts`; delete Acme trees; update `tests/static.rs` embedded paths** to e.g. `src/pages/posts/index.astro`, `src/pages/posts/[slug].astro`, `src/content/posts/hello-orso.md`; assert old blog/help paths are **absent**

- [ ] **Step 4: Run** `npm test --prefix templates/astro-starter` and `cargo test --test static content_editor_template_files_are_embedded` — expect PASS

- [ ] **Step 5: Commit**

```bash
git add templates/astro-starter tests/static.rs
git commit -m "feat(astro-starter): posts routes and remove Acme blog/help surface"
```

---

### Task 4: Get-started home + `site.ts` / Base chrome

**Files:**
- Modify: `templates/astro-starter/src/pages/index.astro`
- Modify: `templates/astro-starter/src/site.ts`
- Modify: `templates/astro-starter/src/layouts/Base.astro` as needed for minimal header/footer (no Features/Pricing/Blog/Help nav)
- Modify: `templates/astro-starter/scripts/content-pages.test.mjs` home assertions
- Modify: `templates/astro-starter/DESIGN.md`, `AGENTS.md`, `README.md` (fold docs into this task)

**Interfaces:**
- Consumes: `site.name`, `site.docsUrl`, `site.url`, optional thin `nav`/`footer`.
- Produces: home structure — brand, 3 steps (edit `src/pages/index.astro`; edit a sample post; save for preview), primary “View sample posts”, secondary “Read the docs”, footer Learn / Examples / Orso.

- [ ] **Step 1: Extend content-pages home assertions** for the CTA labels and `href="https://projectorso.cc"` (or `site.docsUrl`), and absence of section ids `hero`/`pricing`/etc.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement home + `site.ts` (`name` not Acme — e.g. site name “Starter” or “Orso starter”; `docsUrl: "https://projectorso.cc"`); simplify Base nav/footer; rewrite AGENTS/README/DESIGN for the starter content model

- [ ] **Step 4: Run** `npm test --prefix templates/astro-starter` — expect PASS. Keep design-tokens test green.

- [ ] **Step 5: Commit**

```bash
git add templates/astro-starter
git commit -m "feat(astro-starter): Next-style get-started home and starter docs"
```

---

### Task 5: Plugin docs + package fixtures stay model-agnostic

**Files:**
- Modify: `packages/astro/README.md` path `astro-marketing` → `astro-starter`
- Modify: `packages/astro/test/fixtures/schemas.mjs` comment — fixture may keep blog-shaped schema for **unit** tests of the plugin, but comment must not say the starter ships that model; do **not** add a posts preset export from the package
- Modify: any remaining **product** references that still say the scaffold is marketing (`CHANGELOG` only if you normally update it in the same PR)

**Interfaces:**
- Produces: documented ownership — models in template; plugin has none.

- [ ] **Step 1: Grep** `astro-marketing` under `packages/astro`, `src/`, `justfile`, `skills/`, `web/src` (ignore historical specs/plans unless broken)

- [ ] **Step 2: Fix remaining product/path references**; run `npm test --prefix packages/astro` — expect PASS

- [ ] **Step 3: Commit**

```bash
git add packages/astro
git commit -m "docs(orso-astro): point scaffold docs at astro-starter"
```

---

### Task 6: Extract smoke + final verification

**Files:** none new required; may extend `src/static.rs` unit test `extract_template_copies_integrations_orso` if assertions mention marketing content.

- [ ] **Step 1: Run** `cargo test extract_template` (or the existing extract unit tests in `static.rs`) — expect PASS; manually or via test assert extracted tree has `src/content/posts` and **no** `src/content/blog`

- [ ] **Step 2: Run** `npm test --prefix templates/astro-starter` and `just test` subset if practical — expect PASS

- [ ] **Step 3: Commit** only if Step 1 needed code changes; otherwise no empty commit

---

## Self-review notes (author)

- Spec coverage: rename, get-started home, posts model ownership, strip Acme, tests, plugin boundary — each has a task.
- Empty posts + 404 + embed path checks called out in Review Focus and Task 3/6.
- No `marketingCollections` revival in `packages/astro`.
