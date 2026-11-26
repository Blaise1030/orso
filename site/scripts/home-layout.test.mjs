// Home landing layout: Gui-style single hero shot + inset how-it-works grid.
import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("hero shows one product shot, not a multi-tab grid", () => {
  const hero = read("src/components/sections/Hero.astro");
  assert.doesNotMatch(hero, /ProductTabs/);
  assert.match(hero, /AppShot/);
  assert.match(hero, /appShot\(/);
  assert.ok(!existsSync(resolve(root, "src/components/vue/ProductTabs.vue")), "ProductTabs.vue removed");
});

test("how-it-works is an ordered grid with inset figures", () => {
  const section = read("src/components/sections/HowItWorks.astro");
  assert.match(section, /<ol\b[^>]*grid/);
  assert.match(section, /md:grid-cols-2/);
  assert.match(section, /max-w-/);
  assert.match(section, /<figure\b/);
});
