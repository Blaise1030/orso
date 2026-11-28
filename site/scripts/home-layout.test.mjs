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

test("landing page uses the site header", () => {
  const home = read("src/pages/[...locale]/index.astro");
  const base = read("src/layouts/Base.astro");
  assert.doesNotMatch(home, /header=\{false\}/);
  assert.match(base, /header\s*=\s*true/);
  assert.match(base, /\{header && \(/);
});

test("landing page content is centred at max-w-5xl", () => {
  const home = read("src/pages/[...locale]/index.astro");
  assert.match(home, /max-w-5xl/);
  assert.match(home, /mx-auto/);
});

test("landing page omits the setup copy band", () => {
  const home = read("src/pages/[...locale]/index.astro");
  assert.doesNotMatch(home, /Setup/);
});

test("logos split stack and agents, include OpenCode and Codex caption", () => {
  const logos = read("src/components/sections/Logos.astro");
  assert.doesNotMatch(logos, /home\.logos\.stack/);
  assert.doesNotMatch(logos, /home\.logos\.agents/);
  assert.match(logos, /justify-items-center/);
  assert.match(logos, /opencode/);
  assert.match(logos, /caption: "Codex"/);
  assert.match(logos, /comingSoon/);
  assert.match(logos, /nextjs/);
  assert.match(read("src/i18n/messages/en.json"), /"comingSoon": "Coming soon"/);
  assert.ok(existsSync(resolve(root, "public/logos/opencode.svg")));
  assert.ok(existsSync(resolve(root, "public/logos/nextjs.svg")));
  assert.ok(existsSync(resolve(root, "public/logos/nuxt-on-dark.svg")));
});
