# Secured agent git allowlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Default-deny agent `git` via the PATH shim except an allowlist that still supports inspect / edit / commit / sync on the current change.

**Architecture:** Extend `src/git_shim.rs`: `is_allowed` + deny `-c`/`--exec-path`; `run` keeps `ORSO_ALLOW_CHECKOUT` for app HEAD moves only.

**Tech Stack:** Rust, existing `git_shim` unit tests.

**Spec:** `docs/superpowers/specs/2026-11-25-secured-agent-toolbelt-design.md` (slice 1)

## Task 1: Allowlist policy + tests in `git_shim.rs`

**Files:** `src/git_shim.rs`

- [x] Add `is_allowed` / forbidden-global checks and update `run` messages
- [x] Expand unit tests: allow matrix, deny matrix (`push`, `reset`, `pull`, `branch -d`, `remote add`, `-c` escape)
- [x] Keep existing head-moving + `ORSO_ALLOW_CHECKOUT` behaviour
- [x] `cargo test --lib git_shim::`
