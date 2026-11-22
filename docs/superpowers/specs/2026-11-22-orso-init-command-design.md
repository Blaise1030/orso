# `orso init` — copy integration + starter `orso.json`

**Date:** 2026-11-22  
**Status:** Approved  
**Related:** [Astro starter template](./2026-11-22-astro-starter-template-design.md), [integrations/orso copy](./2026-11-07-orso-astro-integrations-copy-design.md)

## Problem

Adopting Orso on an existing Astro site today means a sparse `git clone` + `rsync` into `integrations/orso/` and hand-writing `orso.json` when needed. That is the shadcn *idea* (sources in the project) without the shadcn *UX* (one local command).

## Goals

- Ship `orso init [dir]` on the **existing Orso binary** (no separate npm CLI package).
- Copy embedded `packages/astro/src` → `{dir}/integrations/orso/` (same embed as scaffold; exclude `panel/`, tests).
- Always ensure a starter `{dir}/orso.json` (create if missing; replace only with `--force`).
- Print the `orso()` import/snippet; do **not** edit `astro.config`.
- Update `setup-orso` to call `orso init` instead of sparse-checkout.

## Non-goals

- Auto-patching `astro.config` or `content.config`.
- Installing npm deps (`yaml`, etc.).
- Creating sample collections/models.
- In-app “Add Orso” button (may call the same `run` later).
- Publishing `@orso/init` on npm.

## CLI

```
orso init [dir] [--force]
```

- `dir` defaults to `.`; must exist and be a directory.
- Refresh `integrations/orso/` every run (delete folder then extract, so stale files go away).
- Write starter `orso.json` if absent; with `--force`, overwrite it.
- Exit `0` on success; non-zero + short `orso: …` stderr on failure.

### Starter `orso.json`

Match daemon defaults for npm:

```json
{
  "install": "npm install --no-audit --no-fund --no-progress",
  "dev": "npm run dev -- --port {port} --host {host} --ignore-lock"
}
```

### Printed snippet (stdout)

Relative import from site root, e.g.:

```js
import { orso } from "./integrations/orso/index.js";

// in defineConfig:
integrations: [/* … */, orso()],
```

## Architecture

| Piece | Role |
|-------|------|
| `src/init.rs` | `run(dir, force) -> Result` |
| `src/static.rs` | Public helper to extract `OrsoAstro` into `integrations/orso` |
| `src/main.rs` | `Command::Init { dir, force }` |
| `skills/setup-orso` | Phase 2 step 1 → `orso init` |
| README | One-liner for existing sites |

## Success criteria

- `orso init` in an empty temp dir creates `integrations/orso/index.js` and `orso.json`.
- Second run without `--force` keeps a modified `orso.json` and refreshes the integration folder.
- `--force` replaces `orso.json`.
- No new npm package; ships with the normal Orso release binary.
