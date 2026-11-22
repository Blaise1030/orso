# Desktop update nudge (soft download link)

**Date:** 2026-11-22  
**Status:** Approved — implementing on PR #114  
**Related:** [Desktop release](../../desktop-release.md), existing `UpdateNotice` / `desktopUpdate.ts`

## Problem

macOS desktop users can stay on an old build indefinitely. Releases publish DMGs on GitHub, but the app never tells them a newer version exists. A full in-app updater (silent download + restart) is not set up and needs signing/notarization work first.

## Goals

- On the **macOS desktop app only**, detect when GitHub’s latest release is newer than the running daemon version.
- Notify via:
  1. A dismissible corner toast on launch (when outdated).
  2. An update affordance in **Settings → About**.
- Primary action opens a **download** (arch-specific DMG via `releases/latest/download`, or the releases page as fallback) — no silent install.
- Failures (offline, rate limit, parse errors) stay silent.

## Non-goals

- Tauri updater plugin / silent download / “Restart to apply”.
- Notarization or changing the ad-hoc signing story.
- Nudges in the browser or PWA.
- Linux desktop (no shipped desktop app UX in v1).
- Blocking the app until the user updates.

## Approach

**Web-side check in the SPA** after the running version is known from `health()`. Reuse/adapt the existing corner notice; do not require the shell to inject `__ORSO_UPDATE__` for this soft nudge (that contract was aimed at a downloaded update).

## Surfaces

### Toast

- Gate: `isMacDesktop()`.
- When: after `health().version` is available and latest > current, and the latest tag has not been dismissed.
- Copy: e.g. title “Update available”, body with `vX.Y.Z`, CTA “Download update”.
- Dismiss: store dismissed tag in `localStorage`; show again only when a *newer* tag appears.

### About

- Keep current version badge.
- When outdated: row/link “Update available — vX.Y.Z” → same download URL as the toast.
- When up to date: no extra chrome required in v1.

## Version check

| Item | Decision |
|------|----------|
| Source | `GET https://api.github.com/repos/<owner>/<repo>/releases/latest` with `Accept: application/vnd.github+json` |
| Repo | The GitHub repo that publishes desktop release assets (confirm against `desktop-release.yml` / current remotes — prefer `Blaise1030/orso` if that is where releases land; keep one constant in code) |
| Compare | Strip leading `v` from `tag_name` and running version; semver greater-than |
| Cache | `localStorage`: last fetch time + latest tag; refetch at most every 24h (or immediately if no cache) |
| Errors | No-op (no toast, About unchanged except still showing current version) |

### Download URL

Prefer:

`{repo}/releases/latest/download/orso-{aarch64-apple-darwin|x86_64-apple-darwin}.dmg`

Detect arch from the desktop environment / UA. If unknown, fall back to `{repo}/releases/latest` (HTML releases page).

## Architecture (web)

| Piece | Role |
|-------|------|
| `desktopUpdateCheck.ts` (name flexible) | fetch, parse, compare, cache, dismiss, download URL |
| `UpdateNotice.vue` (+ types) | soft-nudge toast; CTA opens download URL |
| App shell | kick off check once on desktop after health |
| `AboutSettings.vue` | update link when outdated |

Shared state (small store or module) so toast and About see the same “latest / downloadUrl / dismissed” result.

## Testing

- Unit: semver compare; cache TTL; dismiss until newer tag; download URL per arch; no network call when not desktop.
- Component: toast CTA; About shows update when mocked latest > current.
- No e2e dependency on live GitHub in CI (mock `fetch`).

## Success criteria

- Outdated desktop build shows toast (once per new tag until dismiss) and About link.
- CTA downloads/opens the correct latest DMG (or releases page).
- Browser/PWA never hit the releases API for this feature.
- Network failures do not surface as errors.

## Open decisions (resolved in brainstorming)

| Topic | Decision |
|-------|----------|
| Notify style | Soft nudge + download (not silent updater) |
| Placement | Toast + About |
| Latest source | GitHub `releases/latest` API |
| Implementation | SPA-side check on desktop |
