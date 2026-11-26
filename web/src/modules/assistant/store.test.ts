import { afterEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createFakeDaemon, type FakeDaemon } from "@/test/fakeDaemon";
import type {
  RuntimeStatus,
  SetupProvider,
  SetupSnapshot,
  SetupStatus,
} from "@/core/types";

const h = vi.hoisted(() => ({ daemon: null as unknown as FakeDaemon }));
vi.mock("@/core/daemon", () => ({ useDaemon: () => h.daemon }));
const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  warning: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({ toast: toastMock }));

import { GUIDE_POLL_MS } from "./install";
import { useAssistantStore } from "./store";

const runtime = (over: Partial<RuntimeStatus> = {}): RuntimeStatus => ({
  phase: "ready",
  version: "2.2.5",
  source: "managed",
  progress: null,
  message: null,
  ...over,
});

const provider = (id: string, over: Partial<SetupProvider> = {}): SetupProvider => ({
  id,
  name: id,
  available: true,
  runtime: runtime(),
  installed: true,
  signedIn: true,
  chatReady: true,
  freeModels: false,
  reason: null,
  ...over,
});

const status = (over: Partial<SetupStatus> = {}): SetupStatus => ({
  git: true,
  gh: true,
  githubSignedIn: true,
  node: runtime({ version: "24.0.0" }),
  providers: [provider("opencode")],
  projectsDir: "/projects",
  ...over,
});

const snapshot = (over: Partial<SetupSnapshot> = {}): SetupSnapshot => ({
  node: runtime({ version: "24.0.0" }),
  // The runtimes endpoint only needs download state; names and account fields
  // come from /api/setup/status.
  providers: [{ id: "opencode", name: "opencode", runtime: runtime() }],
  ...over,
});

function setup(api: Record<string, (...a: never[]) => unknown>) {
  h.daemon = createFakeDaemon(api);
  setActivePinia(createPinia());
  return useAssistantStore();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => vi.clearAllMocks());

describe("assistant store", () => {
  it("loads and merges the status with the runtime snapshot", async () => {
    const store = setup({
      setupStatus: vi.fn(async () =>
        status({ providers: [provider("opencode", { name: "OpenCode", runtime: runtime({ version: "1.0.0" }) })] }),
      ),
      setupRuntimes: vi.fn(async () =>
        snapshot({
          providers: [
            provider("opencode", { name: "OpenCode", runtime: runtime({ phase: "downloading", progress: 37 }) }),
          ],
        }),
      ),
    });

    await store.load();

    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.node).toMatchObject({ phase: "ready", version: "24.0.0" });
    expect(store.providers[0]).toMatchObject({
      id: "opencode",
      name: "OpenCode",
      runtime: { phase: "downloading", progress: 37 },
    });
  });

  it("keeps the status when an older daemon has no runtime snapshot", async () => {
    const store = setup({
      setupStatus: vi.fn(async () => status()),
      setupRuntimes: vi.fn(async () => {
        throw new Error("not found");
      }),
    });

    await store.load();

    expect(store.error).toBeNull();
    expect(store.providers).toHaveLength(1);
    expect(store.providers[0]!.runtime).toMatchObject({ phase: "ready", version: "2.2.5" });
  });

  it("records a load failure", async () => {
    const store = setup({
      setupStatus: vi.fn(async () => {
        throw new Error("boom");
      }),
      setupRuntimes: vi.fn(async () => snapshot()),
    });

    await store.load();

    expect(store.error).toBe("boom");
    expect(store.snapshot).toBeNull();
    expect(store.loading).toBe(false);
  });

  it("starts a download optimistically, then merges the daemon's answer", async () => {
    const answer = deferred<RuntimeStatus>();
    const downloadRuntime = vi.fn(() => answer.promise);
    const store = setup({
      setupStatus: vi.fn(async () =>
        status({ providers: [provider("opencode", { runtime: runtime({ phase: "notDownloaded" }) })] }),
      ),
      setupRuntimes: vi.fn(async () => snapshot()),
      downloadRuntime,
    });
    await store.load();

    const pending = store.download("opencode");
    expect(store.providers[0]!.runtime).toMatchObject({
      phase: "downloading",
      progress: 0,
      message: null,
    });
    expect(downloadRuntime).toHaveBeenCalledWith("opencode");

    answer.resolve(runtime({ phase: "downloading", progress: 12 }));
    await pending;
    expect(store.providers[0]!.runtime).toMatchObject({ phase: "downloading", progress: 12 });
  });

  it("cancels a download and restores the previous ready copy", async () => {
    const cancelRuntime = vi.fn(async () => runtime({ phase: "ready", version: "2.2.5" }));
    const store = setup({
      setupStatus: vi.fn(async () =>
        status({
          providers: [
            provider("opencode", { runtime: runtime({ phase: "downloading", progress: 55 }) }),
          ],
        }),
      ),
      setupRuntimes: vi.fn(async () => snapshot()),
      cancelRuntime,
    });
    await store.load();

    await store.cancel("opencode");

    expect(cancelRuntime).toHaveBeenCalledWith("opencode");
    expect(store.providers[0]!.runtime).toMatchObject({
      phase: "ready",
      version: "2.2.5",
      progress: null,
    });
  });

  it("cancels a first download back to not downloaded", async () => {
    const store = setup({
      setupStatus: vi.fn(async () =>
        status({
          providers: [
            provider("opencode", {
              runtime: runtime({ phase: "downloading", version: null, progress: 10 }),
            }),
          ],
        }),
      ),
      setupRuntimes: vi.fn(async () => snapshot()),
      cancelRuntime: vi.fn(async () =>
        runtime({ phase: "notDownloaded", version: null, source: null }),
      ),
    });
    await store.load();

    await store.cancel("opencode");

    expect(store.providers[0]!.runtime).toMatchObject({
      phase: "notDownloaded",
      version: null,
      progress: null,
    });
  });

  it("retries a failed download", async () => {
    const retryRuntime = vi.fn(async () => runtime({ phase: "downloading", progress: 1 }));
    const store = setup({
      setupStatus: vi.fn(async () =>
        status({
          providers: [
            provider("opencode", { runtime: runtime({ phase: "downloadError", message: "offline" }) }),
          ],
        }),
      ),
      setupRuntimes: vi.fn(async () => snapshot()),
      retryRuntime,
    });
    await store.load();

    await store.retry("opencode");

    expect(retryRuntime).toHaveBeenCalledWith("opencode");
    expect(store.providers[0]!.runtime).toMatchObject({ phase: "downloading", progress: 1 });
  });

  it("turns a failed retry into Download failed with its message", async () => {
    const store = setup({
      setupStatus: vi.fn(async () =>
        status({
          providers: [
            provider("opencode", { runtime: runtime({ phase: "downloadError", message: "offline" }) }),
          ],
        }),
      ),
      setupRuntimes: vi.fn(async () => snapshot()),
      retryRuntime: vi.fn(async () => {
        throw new Error("network down");
      }),
    });
    await store.load();

    await store.retry("opencode");

    expect(store.providers[0]!.runtime).toMatchObject({
      phase: "downloadError",
      progress: null,
      message: "network down",
    });
  });

  it("merges setup.runtime events into the snapshot", async () => {
    const store = setup({
      setupStatus: vi.fn(async () => status()),
      setupRuntimes: vi.fn(async () => snapshot()),
    });
    await store.load();

    h.daemon.emit({ type: "setup.runtime", runtime: "opencode", phase: "downloading", progress: 64 });
    expect(store.providers[0]!.runtime).toMatchObject({ phase: "downloading", progress: 64 });

    h.daemon.emit({ type: "setup.runtime", runtime: "opencode", phase: "finishing", progress: null });
    expect(store.providers[0]!.runtime).toMatchObject({ phase: "finishing", progress: null });

    h.daemon.emit({
      type: "setup.runtime",
      runtime: "opencode",
      phase: "ready",
      version: "2.2.6",
      source: "managed",
      progress: null,
    });
    expect(store.providers[0]!.runtime).toMatchObject({
      phase: "ready",
      version: "2.2.6",
      source: "managed",
    });

    h.daemon.emit({
      type: "setup.runtime",
      runtime: "node",
      phase: "ready",
      version: "24.1.0",
      source: "managed",
    });
    expect(store.node).toMatchObject({ phase: "ready", version: "24.1.0" });
  });

  it("ignores events for an unknown runtime", async () => {
    const store = setup({
      setupStatus: vi.fn(async () => status()),
      setupRuntimes: vi.fn(async () => snapshot()),
    });
    await store.load();
    const before = store.snapshot;

    h.daemon.emit({ type: "setup.runtime", runtime: "acp", phase: "downloading", progress: 5 });

    expect(store.snapshot).toBe(before);
  });

  it("filters chat-ready providers and recommends OpenCode", async () => {
    const store = setup({
      setupStatus: vi.fn(async () =>
        status({
          providers: [
            provider("cursor", { chatReady: false }),
            provider("claude", { chatReady: true }),
            provider("opencode", { chatReady: true, freeModels: true, signedIn: null }),
          ],
        }),
      ),
      setupRuntimes: vi.fn(async () => snapshot({ providers: [] })),
    });
    await store.load();

    expect(store.chatReadyProviders.map((p) => p.id)).toEqual(["opencode", "claude"]);
    expect(store.recommended?.id).toBe("opencode");
    expect(store.rows.map((r) => r.id)).toEqual(["opencode", "claude", "cursor"]);
  });

  it("verifies an assistant", async () => {
    const verifyProvider = vi.fn(async () => ({ chatReady: true, reason: null }));
    const store = setup({
      setupStatus: vi.fn(async () => status()),
      setupRuntimes: vi.fn(async () => snapshot()),
      verifyProvider,
    });
    await store.load();

    await store.verify("opencode");

    expect(verifyProvider).toHaveBeenCalledWith("opencode");
    expect(store.providers[0]).toMatchObject({ chatReady: true, reason: null });
  });

  it("polls setup status every GUIDE_POLL_MS while a guide is open, and stops when it closes", async () => {
    vi.useFakeTimers();
    try {
      const setupStatus = vi.fn(async () =>
        status({ providers: [provider("claude", { name: "Claude", signedIn: false, chatReady: false })] }),
      );
      const store = setup({ setupStatus, setupRuntimes: vi.fn(async () => snapshot({ providers: [] })) });
      await store.load();
      expect(setupStatus).toHaveBeenCalledTimes(1);

      store.openGuide("claude");
      await vi.advanceTimersByTimeAsync(0);
      expect(store.guideOpen("claude")).toBe(true);

      await vi.advanceTimersByTimeAsync(GUIDE_POLL_MS);
      expect(setupStatus).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(GUIDE_POLL_MS);
      expect(setupStatus).toHaveBeenCalledTimes(3);

      store.closeGuide("claude");
      await vi.advanceTimersByTimeAsync(0);
      expect(store.guideOpen("claude")).toBe(false);
      await vi.advanceTimersByTimeAsync(GUIDE_POLL_MS * 3);
      expect(setupStatus).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens a guide once per assistant and keeps polling while any guide is open", async () => {
    vi.useFakeTimers();
    try {
      const setupStatus = vi.fn(async () => status());
      const store = setup({ setupStatus, setupRuntimes: vi.fn(async () => snapshot()) });
      await store.load();

      store.openGuide("claude");
      store.openGuide("claude");
      store.openGuide("codex");
      expect(store.guides).toEqual(["claude", "codex"]);

      store.closeGuide("claude");
      await vi.advanceTimersByTimeAsync(GUIDE_POLL_MS);
      expect(setupStatus).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes a guide and says so once its assistant turns ready", async () => {
    vi.useFakeTimers();
    try {
      const setupStatus = vi
        .fn()
        .mockResolvedValueOnce(
          status({ providers: [provider("claude", { name: "Claude", signedIn: false, chatReady: false })] }),
        )
        .mockResolvedValue(status({ providers: [provider("claude", { name: "Claude" })] }));
      const store = setup({ setupStatus, setupRuntimes: vi.fn(async () => snapshot({ providers: [] })) });
      await store.load();
      store.openGuide("claude");
      await vi.advanceTimersByTimeAsync(0);

      await vi.advanceTimersByTimeAsync(GUIDE_POLL_MS);

      expect(store.guideOpen("claude")).toBe(false);
      expect(toastMock.success).toHaveBeenCalledWith("Claude is ready", expect.objectContaining({ id: "guide-claude" }));
      // Closed: no more polling.
      await vi.advanceTimersByTimeAsync(GUIDE_POLL_MS * 2);
      expect(setupStatus).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops polling when the store is disposed", async () => {
    vi.useFakeTimers();
    try {
      const setupStatus = vi.fn(async () => status());
      const store = setup({ setupStatus, setupRuntimes: vi.fn(async () => snapshot()) });
      await store.load();
      store.openGuide("claude");
      await vi.advanceTimersByTimeAsync(0);

      store.$dispose();
      await vi.advanceTimersByTimeAsync(GUIDE_POLL_MS * 3);
      expect(setupStatus).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("disables OpenCode chat after signing out", async () => {
    const store = setup({
      setupStatus: vi.fn(async () =>
        status({
          providers: [provider("opencode", { signedIn: true, chatReady: true, freeModels: true })],
        }),
      ),
      setupRuntimes: vi.fn(async () => snapshot()),
      signOutProvider: vi.fn(async () => ({ signedOut: true as const })),
    });
    await store.load();

    await store.signOut("opencode");

    expect(store.providers[0]).toMatchObject({ signedIn: false, chatReady: false });
  });

  it("disables chat after signing out of an account-only assistant", async () => {
    const store = setup({
      setupStatus: vi.fn(async () =>
        status({ providers: [provider("claude", { signedIn: true, chatReady: true })] }),
      ),
      setupRuntimes: vi.fn(async () => snapshot()),
      signOutProvider: vi.fn(async () => ({ signedOut: true as const })),
    });
    await store.load();

    await store.signOut("claude");

    expect(store.providers[0]).toMatchObject({ signedIn: false, chatReady: false });
  });

  it("reloads after reconnect and after events.lagged", async () => {
    const setupStatus = vi.fn(async () => status());
    const store = setup({
      setupStatus,
      setupRuntimes: vi.fn(async () => snapshot()),
    });
    await store.load();
    expect(setupStatus).toHaveBeenCalledTimes(1);

    h.daemon.simulateReconnect();
    await vi.waitFor(() => expect(setupStatus).toHaveBeenCalledTimes(2));

    h.daemon.emit({ type: "events.lagged", missed: 3 });
    await vi.waitFor(() => expect(setupStatus).toHaveBeenCalledTimes(3));
  });

  it("unsubscribes from events when the store is disposed", async () => {
    const store = setup({
      setupStatus: vi.fn(async () => status()),
      setupRuntimes: vi.fn(async () => snapshot()),
    });
    await store.load();
    expect(h.daemon.subscriberCount()).toBeGreaterThan(0);

    store.$dispose();

    expect(h.daemon.subscriberCount()).toBe(0);
  });

  it("reads the saved order and lists rows and ready assistants in it", async () => {
    const store = setup({
      setupStatus: vi.fn(async () =>
        status({
          providers: [provider("opencode"), provider("codex", { chatReady: false }), provider("claude")],
          assistantOrder: ["codex", "claude"],
        }),
      ),
      setupRuntimes: vi.fn(async () => {
        throw new Error("old daemon");
      }),
    });
    await store.load();
    expect(store.order).toEqual(["codex", "claude"]);
    expect(store.rows.map((r) => r.id)).toEqual(["codex", "claude", "opencode"]);
    expect(store.chatReadyProviders.map((p) => p.id)).toEqual(["claude", "opencode"]);
    expect(store.ordered(["opencode", "claude"])).toEqual(["claude", "opencode"]);
  });

  it("keeps lists as given while no order is saved", async () => {
    const store = setup({
      setupStatus: vi.fn(async () => status({ assistantOrder: null })),
      setupRuntimes: vi.fn(async () => snapshot()),
    });
    await store.load();
    expect(store.order).toBeNull();
    expect(store.ordered(["cursor", "opencode"])).toEqual(["cursor", "opencode"]);
  });

  it("saves a new order, and puts the old one back when the daemon refuses", async () => {
    const save = vi.fn(async (order: string[]) => ({ order }));
    const store = setup({ saveAssistantOrder: save });
    await store.setOrder(["claude", "opencode"]);
    expect(save).toHaveBeenCalledWith(["claude", "opencode"]);
    expect(store.order).toEqual(["claude", "opencode"]);

    save.mockRejectedValueOnce(new Error("disk full"));
    await store.setOrder(["opencode", "claude"]);
    expect(store.order).toEqual(["claude", "opencode"]);
  });
});
