// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkForDesktopUpdate,
  detectMacArch,
  dismissUpdate,
  dmgUrl,
  isNewer,
  stripV,
} from "./desktopUpdateCheck";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isNewer", () => {
  it("compares semver and ignores a leading v", () => {
    expect(isNewer("0.1.13", "0.1.12")).toBe(true);
    expect(isNewer("v0.2.0", "0.1.99")).toBe(true);
    expect(isNewer("0.1.12", "0.1.12")).toBe(false);
    expect(isNewer("0.1.11", "0.1.12")).toBe(false);
    expect(isNewer("not-a-version", "0.1.12")).toBe(false);
  });
});

describe("detectMacArch / dmgUrl", () => {
  it("maps Intel UA to x64 DMG and others on Mac to aarch64", () => {
    expect(detectMacArch("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(
      "x86_64-apple-darwin",
    );
    expect(detectMacArch("Mozilla/5.0 (Macintosh; ARM Mac OS X 14_0)")).toBe("aarch64-apple-darwin");
    expect(dmgUrl("aarch64-apple-darwin")).toContain("orso-aarch64-apple-darwin.dmg");
  });
});

describe("checkForDesktopUpdate", () => {
  it("returns download info when latest is newer", async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () =>
      Response.json({ tag_name: "v0.2.0" }),
    ) as unknown as typeof fetch;
    const info = await checkForDesktopUpdate("0.1.12", {
      fetch: fetchImpl,
      storage,
      arch: "aarch64-apple-darwin",
      now: 1_000,
    });
    expect(info).toEqual({
      version: "0.2.0",
      downloadUrl: dmgUrl("aarch64-apple-darwin"),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("uses the 24h cache and respects dismiss until a newer tag", async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () =>
      Response.json({ tag_name: "v0.2.0" }),
    ) as unknown as typeof fetch;
    await checkForDesktopUpdate("0.1.0", {
      fetch: fetchImpl,
      storage,
      arch: null,
      now: 1_000,
    });
    dismissUpdate("0.2.0", storage);
    expect(
      await checkForDesktopUpdate("0.1.0", {
        fetch: fetchImpl,
        storage,
        arch: null,
        now: 1_000 + 60_000,
      }),
    ).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const fetchNewer = vi.fn(async () =>
      Response.json({ tag_name: "v0.3.0" }),
    ) as unknown as typeof fetch;
    const next = await checkForDesktopUpdate("0.1.0", {
      fetch: fetchNewer,
      storage,
      arch: null,
      now: 1_000 + 25 * 60 * 60 * 1000,
    });
    expect(next?.version).toBe("0.3.0");
    expect(stripV("v0.3.0")).toBe("0.3.0");
  });

  it("returns null when fetch fails", async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(
      await checkForDesktopUpdate("0.1.0", { fetch: fetchImpl, storage, now: 1 }),
    ).toBeNull();
  });
});
