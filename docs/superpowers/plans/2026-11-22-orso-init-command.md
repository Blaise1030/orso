# `orso init` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add `orso init [dir] [--force]` to the Orso binary: vendor `integrations/orso/`, write starter `orso.json`, print `orso()` snippet.

**Architecture:** Rust module uses embedded `OrsoAstro`; clap subcommand in `main.rs`; setup-orso skill points at the command.

**Tech Stack:** Rust, clap, rust-embed, existing `settings` default install/dev strings.

**Spec:** `docs/superpowers/specs/2026-11-22-orso-init-command-design.md`

## Global Constraints

- No npm CLI package.
- Do not edit `astro.config`.
- Starter `orso.json` uses the same install/dev strings as `settings` defaults (`{port}` / `{host}` required in `dev`).
- Refresh `integrations/orso` every run; never leave stale files.

## Review Focus

- Path traversal / non-directory `dir` must fail cleanly.
- Existing custom `orso.json` preserved without `--force`.
- Embed excludes `panel/` (same as scaffold).

---

### Task 1: `extract_orso_integration` + `init::run`

**Files:**
- Modify: `src/static.rs` — public `extract_orso_integration(site_root: &Path) -> io::Result<()>`
- Create: `src/init.rs`
- Modify: `src/lib.rs` — `pub mod init;`
- Test: unit tests in `src/init.rs`

**Interfaces:**
- `pub fn extract_orso_integration(site_root: &Path) -> io::Result<()>` — remove `site_root/integrations/orso` if present, then `extract_embed::<OrsoAstro>(…/integrations/orso)`.
- `pub fn run(dir: &Path, force: bool) -> Result<(), String>` — validate dir; call extract; write orso.json; return Ok with message or Err.
- `pub fn starter_orso_json() -> &'static str` or build via serde_json matching settings defaults.
- `pub fn orso_config_snippet() -> &'static str`

- [ ] **Step 1: Failing tests** for init happy path, preserve orso.json, `--force`, bad dir
- [ ] **Step 2: Implement**
- [ ] **Step 3: `cargo test --lib init` PASS**
- [ ] **Step 4: Commit**

### Task 2: Clap `Init` + docs/skill

**Files:**
- Modify: `src/main.rs`
- Modify: `skills/setup-orso/SKILL.md`
- Modify: `README.md` (existing-site one-liner)

- [ ] **Step 1: Wire `Command::Init`**
- [ ] **Step 2: Update setup-orso Phase 2 step 1**
- [ ] **Step 3: Commit**
- [ ] **Step 4: Push to PR**
