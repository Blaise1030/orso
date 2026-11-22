/**
 * Soft desktop update check: compare the running version to GitHub's latest release.
 * Desktop-only callers; this module does not gate on `isMacDesktop` itself.
 */

export const GITHUB_RELEASES_REPO = "Blaise1030/orso";

const CACHE_KEY = "orso.desktopUpdate.cache";
const DISMISS_KEY = "orso.desktopUpdate.dismissed";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type MacDmgArch = "aarch64-apple-darwin" | "x86_64-apple-darwin";

export interface DesktopUpdateInfo {
  /** Latest release tag without a leading `v`. */
  version: string;
  downloadUrl: string;
}

interface CacheBlob {
  fetchedAt: number;
  version: string;
}

export function stripV(version: string): string {
  return version.trim().replace(/^v/i, "");
}

/** True when `latest` is a higher semver than `current` (pre-release / junk → false). */
export function isNewer(latest: string, current: string): boolean {
  const a = parseSemver(stripV(latest));
  const b = parseSemver(stripV(current));
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

function parseSemver(raw: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(raw);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function dmgUrl(arch: MacDmgArch): string {
  return `https://github.com/${GITHUB_RELEASES_REPO}/releases/latest/download/orso-${arch}.dmg`;
}

export function releasesPageUrl(): string {
  return `https://github.com/${GITHUB_RELEASES_REPO}/releases/latest`;
}

/** Best-effort Mac arch for the DMG asset name. */
export function detectMacArch(ua = navigator.userAgent): MacDmgArch | null {
  if (/Mac OS X|Macintosh/i.test(ua) && /ARM|aarch64|Apple Silicon/i.test(ua)) {
    return "aarch64-apple-darwin";
  }
  // Apple Silicon browsers often still report Intel in UA; prefer aarch64 when platform says so.
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
    ?.platform;
  if (platform === "macOS" || /Mac OS X|Macintosh/i.test(ua)) {
    // Chromium on Apple Silicon: `navigator.userAgentData.getHighEntropyValues` is async; sync
    // heuristic — assume aarch64 on modern Macs unless clearly Intel.
    if (/Intel/i.test(ua) && !/ARM|aarch64/i.test(ua)) return "x86_64-apple-darwin";
    return "aarch64-apple-darwin";
  }
  return null;
}

export function downloadUrlForArch(arch: MacDmgArch | null): string {
  return arch ? dmgUrl(arch) : releasesPageUrl();
}

function readCache(storage: Storage): CacheBlob | null {
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheBlob;
    if (typeof parsed.fetchedAt !== "number" || typeof parsed.version !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(storage: Storage, blob: CacheBlob) {
  storage.setItem(CACHE_KEY, JSON.stringify(blob));
}

export function dismissUpdate(version: string, storage: Storage = localStorage) {
  storage.setItem(DISMISS_KEY, stripV(version));
}

export function dismissedVersion(storage: Storage = localStorage): string | null {
  return storage.getItem(DISMISS_KEY);
}

export async function fetchLatestTag(
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const res = await fetchImpl(
      `https://api.github.com/repos/${GITHUB_RELEASES_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { tag_name?: unknown };
    if (typeof body.tag_name !== "string" || !body.tag_name.trim()) return null;
    return stripV(body.tag_name);
  } catch {
    return null;
  }
}

/**
 * Returns update info when `latest` is newer than `current` and not dismissed.
 * Uses a 24h cache of the latest tag.
 */
export async function checkForDesktopUpdate(
  currentVersion: string,
  opts: {
    fetch?: typeof fetch;
    now?: number;
    storage?: Storage;
    arch?: MacDmgArch | null;
  } = {},
): Promise<DesktopUpdateInfo | null> {
  const storage = opts.storage ?? localStorage;
  const now = opts.now ?? Date.now();
  const fetchImpl = opts.fetch ?? fetch;
  const arch = opts.arch === undefined ? detectMacArch() : opts.arch;

  let latest: string | null = null;
  const cached = readCache(storage);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    latest = cached.version;
  } else {
    latest = await fetchLatestTag(fetchImpl);
    if (latest) writeCache(storage, { fetchedAt: now, version: latest });
  }
  if (!latest) return null;
  if (!isNewer(latest, currentVersion)) return null;
  if (dismissedVersion(storage) === stripV(latest)) return null;
  return { version: latest, downloadUrl: downloadUrlForArch(arch) };
}
