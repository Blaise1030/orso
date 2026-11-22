# Agent guide — Astro starter

Static Astro site. The home page is a get-started shell written in code; sample posts live in a Markdown content collection.

## Content model

- Collection schemas, loaders and preview paths live in `src/content/collections.js` as `collections`. Edit this file to add a collection or change a field. Each collection uses `orsoGlob` from `./integrations/orso/index.js`. Each entry is `{ collection, previewPath? }`. `astro.config.mjs` passes `collections` to `orso({ collections })`; `src/content.config.ts` re-exports from `virtual:orso/collections`.
- Starter ships one sample model:
  - `posts` ← `src/content/posts/*.md`: `title`, `date` (`YYYY-MM-DD`). Page: `/posts/{id}/`.
- An entry's id is its file name without `.md`.

## File map

- `src/site.ts` — site name, tagline, `description`, `url`, `docsUrl`, `ogImage`, header `nav` / `cta`, footer.
- `src/pages/index.astro` — get-started home (steps + CTAs).
- `src/pages/posts/` — `/posts/` list and `/posts/{id}/` detail.
- `src/lib/posts.ts` — `loadPosts()` (newest first) and `formatDate`.
- `src/lib/pages.ts` / `src/lib/seo.ts` — sitemap paths and absolute URL / JSON-LD helpers.
- `src/layouts/Base.astro` — document chrome; imports `src/styles/global.css`.
- `src/pages/robots.txt.ts`, `sitemap.xml.ts` — build-time SEO stubs.
- `integrations/orso/` — Orso integration sources (no content models). Do not edit; a scaffold overwrites this folder.

## Conventions

- Home copy: edit `src/pages/index.astro`. Nav and footer: `src/site.ts`.
- New content type: edit `collections.js`, add a folder under `src/content/`, add routes as needed.
- Links: root-relative paths (`/posts/hello-orso/`). Use `absoluteUrl()` only for full URLs.
- Styling: Tailwind utilities + design tokens in `src/styles/global.css`. `npm test` runs the design-token check.
- Keep the Orso-managed preview server running; do not `npm run build` after ordinary edits.

## Deployment

Static `dist/` only. Default CI is Cloudflare Workers via `.github/workflows/deploy.yml` + `wrangler.toml`. See `README.md`.
