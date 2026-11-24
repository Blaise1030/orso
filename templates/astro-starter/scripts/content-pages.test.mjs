import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = (dir, path) => readFileSync(join(dir, "dist", path, "index.html"), "utf8");
function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), "content-pages-"));
  try {
    for (const path of ["src", "public", "integrations", "astro.config.mjs", "package.json"]) {
      cpSync(join(root, path), join(dir, path), { recursive: true });
    }
    symlinkSync(join(root, "node_modules"), join(dir, "node_modules"), "dir");
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function build(dir) {
  const result = spawnSync(process.execPath, [join(root, "node_modules/astro/bin/astro.mjs"), "build"], {
    cwd: dir,
    encoding: "utf8",
    env: process.env,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

test("built get-started home and sample posts render", () => {
  const home = html(root, "");
  assert.match(home, /View sample posts/);
  assert.match(home, /href="\/posts\/"/);
  assert.match(home, /href="https:\/\/projectorso\.cc"/);
  assert.match(home, /Get started by editing src\/pages\/index\.astro/);
  assert.doesNotMatch(home, /id="hero"/);
  assert.doesNotMatch(home, /id="pricing"/);
  assert.match(html(root, "posts"), /Hello from Orso/);
  assert.match(html(root, "posts"), /Add your own content/);
  assert.match(html(root, "posts/hello-orso"), /sample post/);
  assert.equal(existsSync(join(root, "dist/blog")), false);
  assert.equal(existsSync(join(root, "dist/help")), false);
});

test("built routes sort posts by date and handle an empty collection", () =>
  fixture((dir) => {
    mkdirSync(join(dir, "src/content/posts"), { recursive: true });
    writeFileSync(
      join(dir, "src/content/posts/a-new.md"),
      '---\ntitle: Newest article\ndate: "2026-10-11"\n---\nNew **body**',
    );
    writeFileSync(
      join(dir, "src/content/posts/z-old.md"),
      '---\ntitle: Oldest article\ndate: "2020-01-01"\n---\nOld body',
    );
    build(dir);
    const list = html(dir, "posts");
    assert.ok(list.indexOf("Newest article") < list.indexOf("Oldest article"));
    assert.match(list, /href="\/posts\/a-new\/"/);
    assert.match(html(dir, "posts/a-new"), /<strong>body<\/strong>/);

    const file = (path) => readFileSync(join(dir, "dist", path), "utf8");
    assert.match(file("robots.txt"), /^Sitemap: https:\/\/example\.com\/sitemap\.xml$/m);
    assert.match(file("sitemap.xml"), /<loc>https:\/\/example\.com\/posts\/a-new\/<\/loc>/);

    rmSync(join(dir, "src/content/posts"), { recursive: true, force: true });
    mkdirSync(join(dir, "src/content/posts"), { recursive: true });
    build(dir);
    assert.match(html(dir, "posts"), /No posts yet/);
  }));
