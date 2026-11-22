import { createRequire } from "node:module";

import { orsoGlob } from "../../integrations/orso/index.js";

const require = createRequire(import.meta.url);
const getZod = () => require("astro/zod").z;

/*
 * The site's content models: one Astro collection per folder under `src/content/`, each loaded
 * with `orsoGlob` so Orso can edit its entries. This file belongs to the site; edit it to add a
 * collection or change a field. `astro.config.mjs` passes `collections` to
 * `orso({ collections })`, and `src/content.config.ts` re-exports them from
 * `virtual:orso/collections`.
 */

/** @param {{ loader: unknown, schema: unknown }} config */
function contentCollection(config) {
  return { ...config, type: "content_layer" };
}

/** Sample posts for the starter — delete or replace when you define your own models. */
const posts = contentCollection({
  loader: orsoGlob({ base: "./src/content/posts", pattern: "*.md" }),
  schema: () => {
    const z = getZod();
    return z.object({
      title: z.string(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
        .refine(
          (value) => {
            const date = new Date(`${value}T00:00:00Z`);
            return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
          },
          "Use a valid calendar date",
        )
        .meta({ editor: { type: "date", knownRefinement: true } }),
    });
  },
});

/**
 * `orso({ collections })` entries, in sidebar order. `previewPath` is the page an entry is shown
 * on (`slug` is the entry id, the Markdown filename without extension).
 */
export const collections = {
  posts: { collection: posts, previewPath: ({ slug }) => `/posts/${slug}/` },
};
