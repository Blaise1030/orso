// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createFakeDaemon, type FakeDaemon } from "@/test/fakeDaemon";
import { NetworkError } from "@/core/api";
import type { RuntimeStatus, SetupProvider, SetupStatus } from "@/core/types";

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

import AssistantSetup from "./AssistantSetup.vue";
import { PROVIDER_NAMES } from "./rows";
import { useAssistantStore, type AssistantSnapshot } from "./store";

const runtime = (over: Partial<RuntimeStatus> = {}): RuntimeStatus => ({
  phase: "ready",
  version: "2.2.5",
  source: "managed",
  progress: null,
  message: null,
  downloadBytes: 157_286_400,
  ...over,
});

const provider = (id: string, over: Partial<SetupProvider> = {}): SetupProvider => ({
  id,
  name: PROVIDER_NAMES[id] ?? id,
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
  projectsDir: "/Users/ada/orso-projects",
  ...over,
});

const snapshot = (over: Partial<AssistantSnapshot> = {}): AssistantSnapshot => ({
  node: runtime({ version: "24.0.0" }),
  providers: [provider("opencode")],
  ...over,
});

/** Mount with a fresh pinia and a fake daemon; the store loads on mount. */
function mountSetup(api: Record<string, unknown> = {}) {
  h.daemon = createFakeDaemon({
    setupStatus: vi.fn(async () => status()),
    // Keep the status authoritative; `mergeSnapshot` lets the runtime snapshot
    // override download fields, and these tests set those on the status.
    setupRuntimes: vi.fn(async () => snapshot({ providers: [] })),
    ...api,
  });
  setActivePinia(createPinia());
  return mount(AssistantSetup);
}

enableAutoUnmount(afterEach);
afterEach(() => vi.clearAllMocks());

describe("AssistantSetup ordering", () => {
  it("puts OpenCode first, then the plan assistants, then the site builder", async () => {
    const w = mountSetup({
      setupStatus: vi.fn(async () =>
        status({
          providers: [
            provider("cursor"),
            provider("claude"),
            provider("codex"),
            provider("opencode", { freeModels: true, signedIn: null }),
          ],
        }),
      ),
    });
    await flushPromises();

    const ids = w.findAll("[data-testid^='assistant-row-']").map((el) => el.attributes("data-testid"));
    expect(ids).toEqual([
      "assistant-row-opencode",
      "assistant-row-codex",
      "assistant-row-claude",
      "assistant-row-cursor",
      "assistant-row-node",
    ]);

    const first = w.get("[data-testid='assistant-row-opencode']");
    expect(first.text()).toContain("Free models, no account needed.");
    expect(first.text()).toContain("Recommended");
    expect(first.text()).toContain("Connected");
  });

  it("keeps the site builder in its own section", async () => {
    const w = mountSetup();
    await flushPromises();

    const site = w.get("[data-testid='assistant-site-builder']");
    expect(site.text()).toContain("Site builder");
    expect(site.text()).toContain("Lets orso build and preview your site.");
    expect(site.text()).toContain("orso needs this to create a project and preview your site.");
    expect(w.get("[data-testid='assistant-assistants']").text()).not.toContain("Site builder");
  });

});

describe("AssistantSetup props fallback", () => {
  it("renders from `initial` without asking the daemon", async () => {
    const daemon = createFakeDaemon();
    h.daemon = daemon;
    setActivePinia(createPinia());

    const w = mount(AssistantSetup, {
      props: {
        initial: {
          node: runtime({ version: "24.0.0" }),
          providers: [provider("claude"), provider("opencode", { freeModels: true, signedIn: null })],
        },
      },
    });
    await flushPromises();

    expect(daemon.api).not.toHaveProperty("setupStatus");
    expect(
      w.findAll("[data-testid^='assistant-row-']").map((el) => el.attributes("data-testid")),
    ).toEqual(["assistant-row-opencode", "assistant-row-claude", "assistant-row-node"]);
    expect(w.get("[data-testid='assistant-row-opencode']").text()).toContain("Free models");
  });

  it("emits continue only when the caller asks for the button", async () => {
    const daemon = createFakeDaemon();
    h.daemon = daemon;
    setActivePinia(createPinia());

    const plain = mount(AssistantSetup, { props: { initial: snapshot() } });
    expect(plain.find("[data-testid='assistant-continue']").exists()).toBe(false);

    const withButton = mount(AssistantSetup, {
      props: { initial: snapshot(), showContinue: true },
    });
    await withButton.get("[data-testid='assistant-continue']").trigger("click");
    expect(withButton.emitted("continue")).toHaveLength(1);
  });
});

describe("AssistantSetup install guides", () => {
  it("opens an install guide instead of downloading, and closes it again", async () => {
    const downloadRuntime = vi.fn();
    const w = mountSetup({
      setupStatus: vi.fn(async () =>
        status({
          providers: [
            provider("claude", {
              runtime: runtime({ phase: "notDownloaded", version: null, source: null }),
              installed: false,
              signedIn: null,
              chatReady: false,
            }),
          ],
        }),
      ),
      downloadRuntime,
    });
    await flushPromises();

    const action = () => w.get("[data-testid='assistant-action-claude']");
    expect(action().text()).toBe("Set up");
    expect(w.find("[data-testid='assistant-guide-claude']").exists()).toBe(false);

    await action().trigger("click");
    await flushPromises();
    const guide = w.get("[data-testid='assistant-guide-claude']");
    expect(guide.text()).toContain("curl -fsSL https://claude.ai/install.sh | bash");
    expect(guide.text()).toContain("claude auth login");
    expect(downloadRuntime).not.toHaveBeenCalled();

    await action().trigger("click");
    await flushPromises();
    expect(w.find("[data-testid='assistant-guide-claude']").exists()).toBe(false);
  });

  it("opens the guide at the sign-in step for a signed-out assistant", async () => {
    const w = mountSetup({
      setupStatus: vi.fn(async () =>
        status({ providers: [provider("claude", { signedIn: false, chatReady: false })] }),
      ),
    });
    await flushPromises();

    expect(w.get("[data-testid='assistant-row-claude']").text()).toContain("Sign-in required");
    await w.get("[data-testid='assistant-action-claude']").trigger("click");
    await flushPromises();

    const guide = w.get("[data-testid='assistant-guide-claude']");
    expect(guide.get("[data-testid='assistant-guide-install-claude']").attributes("data-done")).toBe("true");
    expect(guide.get("[data-testid='assistant-guide-sign-in-claude']").text()).toContain("claude auth login");
  });

  it("rechecks from the guide", async () => {
    const setupStatus = vi.fn(async () =>
      status({ providers: [provider("codex", { signedIn: false, chatReady: false })] }),
    );
    const w = mountSetup({ setupStatus });
    await flushPromises();
    await w.get("[data-testid='assistant-action-codex']").trigger("click");
    await flushPromises();

    await w.get("[data-testid='assistant-guide-recheck-codex']").trigger("click");
    await flushPromises();
    expect(setupStatus).toHaveBeenCalledTimes(2);
  });

  it("closes its guides when it unmounts, so polling stops", async () => {
    const w = mountSetup({
      setupStatus: vi.fn(async () =>
        status({ providers: [provider("codex", { signedIn: false, chatReady: false })] }),
      ),
    });
    await flushPromises();
    await w.get("[data-testid='assistant-action-codex']").trigger("click");
    await flushPromises();
    const store = useAssistantStore();
    expect(store.guideOpen("codex")).toBe(true);

    w.unmount();
    expect(store.guides).toEqual([]);
  });

  it("still downloads the site builder", async () => {
    const downloadRuntime = vi.fn(async () => runtime({ phase: "downloading", progress: 0 }));
    const w = mountSetup({
      setupStatus: vi.fn(async () =>
        status({ node: runtime({ phase: "notDownloaded", version: null, source: null }) }),
      ),
      setupRuntimes: vi.fn(async () =>
        snapshot({ providers: [], node: runtime({ phase: "notDownloaded", version: null, source: null }) }),
      ),
      downloadRuntime,
    });
    await flushPromises();

    await w.get("[data-testid='assistant-action-node']").trigger("click");
    await flushPromises();
    expect(downloadRuntime).toHaveBeenCalledWith("node");
  });

  it("retries the whole setup check when loading fails", async () => {
    const setupStatus = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError("cannot reach daemon at http://127.0.0.1:7800"))
      .mockResolvedValueOnce(status());
    const w = mountSetup({ setupStatus });
    await flushPromises();

    expect(toastMock.error).toHaveBeenCalledWith(
      "We couldn't check your setup just now",
      expect.objectContaining({ duration: 0 }),
    );
    expect(JSON.stringify(toastMock.error.mock.calls)).not.toContain("127.0.0.1");

    // The toast's "Check again" re-runs the check and closes the toast.
    const [, options] = toastMock.error.mock.calls.at(-1)!;
    options.actions[0].onClick();
    await flushPromises();
    expect(setupStatus).toHaveBeenCalledTimes(2);
    expect(toastMock.dismiss).toHaveBeenCalledWith("setup-check");
    expect(w.find("[data-testid='assistant-row-opencode']").exists()).toBe(true);
  });

});

describe("AssistantSetup sign-in", () => {
  it("does not gate OpenCode on a sign-in", async () => {
    const w = mountSetup({
      setupStatus: vi.fn(async () =>
        status({
          providers: [provider("opencode", { signedIn: null, chatReady: true, freeModels: true })],
        }),
      ),
    });
    await flushPromises();

    const row = w.get("[data-testid='assistant-row-opencode']");
    expect(row.text()).toContain("Connected");
    expect(row.text()).not.toContain("Sign-in required");
    expect(w.get("[data-testid='assistant-action-opencode']").text()).toBe("Connect");
  });
});

describe("AssistantSetup copy", () => {
  it("never shows developer words", async () => {
    const w = mountSetup({
      setupStatus: vi.fn(async () =>
        status({
          providers: [
            provider("opencode", {
              runtime: runtime({
                phase: "downloadError",
                version: null,
                message: "The connection dropped.",
              }),
              chatReady: false,
            }),
            provider("codex", {
              runtime: runtime({ phase: "downloading", progress: 12 }),
              chatReady: false,
            }),
            provider("claude", {
              runtime: runtime({ phase: "finishing" }),
              chatReady: false,
              signedIn: null,
            }),
            provider("cursor", { runtime: runtime({ phase: "updateAvailable" }), signedIn: false }),
          ],
        }),
      ),
    });
    await flushPromises();

    expect(w.text()).toContain("assistant");
    expect(w.text()).not.toMatch(/\b(agent|cli|acp|sdk|npx|path|runtime)\b/i);
  });
});
