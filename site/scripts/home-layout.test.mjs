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
  assert.match(section, /mock: "publish"/);
  const messages = read("src/i18n/messages/en.json");
  assert.match(messages, /"publish"\s*:\s*\{[\s\S]*?"title"/);
});

test("landing page hides the site header", () => {
  const home = read("src/pages/[...locale]/index.astro");
  const base = read("src/layouts/Base.astro");
  assert.match(home, /header=\{false\}/);
  assert.match(base, /header\s*=\s*true/);
  assert.match(base, /\{header && \(/);
});

test("landing page content is centred at max-w-5xl", () => {
  const home = read("src/pages/[...locale]/index.astro");
  assert.match(home, /max-w-5xl/);
  assert.match(home, /mx-auto/);
});

test("landing page includes a setup copy band", () => {
  const home = read("src/pages/[...locale]/index.astro");
  assert.match(home, /Setup/);
  assert.match(read("src/components/sections/Setup.astro"), /id="setup"/);
  assert.match(read("src/i18n/messages/en.json"), /"setup"/);
});
