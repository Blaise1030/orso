# Desktop Update Nudge Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** On macOS desktop, soft-nudge when GitHub latest release is newer — toast + About download link.

**Architecture:** SPA fetches `releases/latest`, compares to daemon `health().version`, shares result via a small module; toast and About read it. No Tauri updater.

**Tech Stack:** Vue 3, Vitest, GitHub Releases API, `localStorage`.

**Spec:** `docs/superpowers/specs/2026-11-22-desktop-update-nudge-design.md`

## Global Constraints

- Desktop only (`isMacDesktop()`).
- Repo for API/downloads: `Blaise1030/orso` (canonical after rename; confirm assets exist).
- No silent download / restart-to-apply in v1.
- Network errors: silent no-op.
- Cache ≤1 fetch / 24h; dismiss until newer tag.

## Review Focus

- Non-desktop must not call GitHub.
- Dismissed tag must not reappear for the same tag after reload.
- Malformed / non-semver tags must not crash the shell.

---

### Task 1: Check module + unit tests

**Files:** Create `web/src/app/desktopUpdateCheck.ts`, `web/src/app/desktopUpdateCheck.test.ts`

**Interfaces:**
- `GITHUB_RELEASES_REPO = "Blaise1030/orso"`
- `isNewer(latest: string, current: string): boolean`
- `dmgUrl(arch: "aarch64-apple-darwin" | "x86_64-apple-darwin"): string`
- `detectMacArch(): … | null`
- `checkForDesktopUpdate(currentVersion: string, opts?: { fetch?, now?, storage? }): Promise<DesktopUpdateInfo | null>`
- `dismissUpdate(tag: string)`, `clearDismiss` for tests
- `DesktopUpdateInfo { version: string; downloadUrl: string }`

- [ ] **Step 1–4:** TDD compare/cache/dismiss/arch URL; no fetch when not desktop (gate at caller)
- [ ] **Step 5: Commit**

### Task 2: Toast + About + wire shell

**Files:** Modify `UpdateNotice.vue` (+ tests), `AboutSettings.vue` (+ tests), `App.vue` or shell after health

- Soft toast: “Update available”, CTA opens `downloadUrl` via `window.open` / navigate prop
- Remove dependency on `tauri://` apply flow for v1 (or keep dead path unused — prefer replace)
- About: update link when info present
- Kick check when daemon open + mac desktop + health version

- [ ] **Step 1–4:** Tests + implement
- [ ] **Step 5: Commit + push PR**
