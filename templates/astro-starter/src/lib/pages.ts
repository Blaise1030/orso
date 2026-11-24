import { loadPosts } from "./posts";

export interface SitePage {
  /** Site path, e.g. `/posts/hello-orso/`. */
  path: string;
  /** Last change (YYYY-MM-DD), when known. */
  lastmod?: string;
}

/**
 * Paths of the static `.astro` pages in src/pages (no `[param]` routes, no `_` files, no 404),
 * so a page you add shows up in the sitemap without editing this file.
 */
const staticPaths = () =>
  Object.keys(import.meta.glob("../pages/**/*.astro"))
    .map((file) => file.replace(/^\.\.\/pages/, "").replace(/\.astro$/, ""))
    .filter((route) => !/\[|\/_|^\/404$/.test(route))
    .map((route) => route.replace(/\/index$/, "/").replace(/([^/])$/, "$1/"));

/** Every page of the built site: static pages and sample posts. */
export async function sitePages(): Promise<SitePage[]> {
  const posts = await loadPosts();
  const pages: SitePage[] = [
    ...staticPaths().map((path) => ({ path })),
    ...posts.map((post) => ({ path: `/posts/${post.id}/`, lastmod: post.data.date })),
  ];
  const seen = new Set<string>();
  return pages
    .filter((page) => !seen.has(page.path) && seen.add(page.path))
    .sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
}
