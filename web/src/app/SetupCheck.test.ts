// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
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

import SetupCheck from "./SetupCheck.vue";
import { useAssistantStore } from "@/modules/assistant/store";
import { PROVIDER_NAMES } from "@/modules/assistant/rows";

const runtime = (over: Partial<RuntimeStatus> = {}): RuntimeStatus => ({
  phase: "ready",
  version: "2.2.5",
  source: "managed",
  progress: null,
  message: null,
  downloadBytes: 157_286_400,
  ...over,
});

const notDownloaded = (): RuntimeStatus =>
  runtime({ phase: "notDownloaded", version: null, source: null, progress: null });

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

const freshProvider = (id: string): SetupProvider =>
  provider(id, {
    available: false,
    runtime: notDownloaded(),
    installed: false,
    signedIn: null,
    chatReady: false,
    freeModels: id === "opencode",
  });

const status = (over: Partial<SetupStatus> = {}): SetupStatus => ({
  git: true,
  gh: true,
  githubSignedIn: true,
  node: runtime({ version: "24.0.0" }),
  providers: [provider("opencode", { freeModels: true, signedIn: null })],
  projectsDir: "/Users/ada/orso-projects",
  ...over,
});

const fresh = (): SetupStatus =>
  status({
    node: notDownloaded(),
    providers: ["opencode", "claude", "codex", "cursor"].map(freshProvider),
  });

const signedOut = { configured: true, deviceFlow: true, source: null, user: null };

function mountCheck(
  api: Record<string, unknown> = {},
  value: SetupStatus | (() => Promise<SetupStatus>) = status(),
) {
  h.daemon = createFakeDaemon({
    setupStatus: vi.fn(typeof value === "function" ? value : async () => value),
    // Keep the status authoritative: the empty runtime snapshot merges nothing over it.
    setupRuntimes: vi.fn(async () => ({ providers: [] })),
    githubStatus: vi.fn(async () => signedOut),
    ...api,
  });
  setActivePinia(createPinia());
  return mount(SetupCheck, { attachTo: document.body });
}

const testId = (w: ReturnType<typeof mount>, id: string) =>
  w.get(`[data-testid='${id}']`);

async function toSite(w: ReturnType<typeof mount>) {
  await flushPromises();
  if (w.find("[data-testid='onboarding-step-site']").exists()) return;
  if (w.find("[data-testid='onboarding-step-github']").exists()) {
    await testId(w, "onboarding-dot-2").trigger("click");
    await flushPromises();
    return;
  }
  // A ready assistant's step 1 continues with the bottom Continue button.
  await testId(w, "onboarding-next").trigger("click");
  await flushPromises();
}

async function toGithub(w: ReturnType<typeof mount>) {
  await flushPromises();
  if (w.find("[data-testid='onboarding-step-github']").exists()) return;
  await toSite(w);
  if (w.find("[data-testid='onboarding-step-github']").exists()) return;
  await testId(w, "onboarding-next").trigger("click");
  await flushPromises();
}

enableAutoUnmount(afterEach);
afterEach(() => vi.clearAllMocks());

/** The radio-card option (Nuxt UI `URadioGroup` item) that holds the element with this testid. */
function option(w: ReturnType<typeof mountCheck>, id: string) {
  const item = w.findAll("[data-slot='item']").find((i) => i.find(`[data-testid='${id}']`).exists());
  if (!item) throw new Error(`no radio option holds ${id}`);
  return item;
}
/** The option's radio control, which carries `aria-checked` and takes the click. */
function radio(w: ReturnType<typeof mountCheck>, id: string) {
  return option(w, id).get("[role='radio']");
}

describe("onboarding step 1: assistant", () => {
  it("renders four cards, OpenCode selected, with its install guide and no download button", async () => {
    const w = mountCheck({}, fresh());
    await flushPromises();

    expect(w.find("[data-testid='onboarding-step-assistant']").exists()).toBe(true);
    expect(w.find("[data-testid='onboarding-step-site']").exists()).toBe(false);
    expect(w.text()).toContain("Set up your assistant.");
    expect(w.text()).toContain(
      "Pick the assistant that makes changes to your site, then set it up in Terminal. OpenCode is free to start; the others use the account you already have.",
    );

    const ids = ["opencode", "claude", "codex", "cursor"];
    for (const id of ids) {
      expect(w.find(`[data-testid='onboarding-provider-${id}']`).exists()).toBe(true);
      expect(testId(w, `onboarding-not-installed-${id}`).text()).toBe("Not installed");
    }

    expect(radio(w, "onboarding-provider-opencode").attributes("aria-checked")).toBe("true");
    for (const id of ["claude", "codex", "cursor"]) {
      expect(radio(w, `onboarding-provider-${id}`).attributes("aria-checked")).toBe("false");
    }

    const guide = testId(w, "assistant-guide-opencode");
    expect(guide.text()).toContain("Install OpenCode");
    expect(guide.text()).toContain("curl -fsSL https://opencode.ai/v2/install | bash");
    expect(guide.find("[data-testid='assistant-guide-copy-install-opencode']").exists()).toBe(true);
    expect(guide.text()).toContain("opencode auth login");

    expect(w.find("[data-testid^='onboarding-setup-']").exists()).toBe(false);
    expect(w.find("[data-testid='onboarding-existing']").exists()).toBe(false);
    expect(testId(w, "onboarding-next").attributes("disabled")).toBeDefined();
    expect(w.findAll("[data-testid^='onboarding-dot-']")).toHaveLength(3);
    expect(testId(w, "onboarding-dot-1").attributes("aria-current")).toBe("step");
    expect(w.find("[data-testid='onboarding-skip']").exists()).toBe(true);
  });

  it("switches the guide with the selection, and polls only for the selected assistant", async () => {
    const w = mountCheck({}, fresh());
    await flushPromises();
    const store = useAssistantStore();
    expect(store.guides).toEqual(["opencode"]);

    await radio(w, "onboarding-provider-claude").trigger("click");
    await flushPromises();

    expect(radio(w, "onboarding-provider-claude").attributes("aria-checked")).toBe("true");
    expect(w.findAll("[role='radio'][aria-checked='true']")).toHaveLength(1);
    expect(w.find("[data-testid='assistant-guide-opencode']").exists()).toBe(false);
    const guide = testId(w, "assistant-guide-claude");
    expect(guide.text()).toContain("curl -fsSL https://claude.ai/install.sh | bash");
    expect(guide.text()).toContain("claude auth login");
    expect(store.guides).toEqual(["claude"]);
  });

  it("ticks off install for an installed, signed-out assistant and shows its sign-in command", async () => {
    const w = mountCheck(
      {},
      status({
        providers: [
          freshProvider("opencode"),
          provider("claude", { runtime: runtime({ source: "system" }), signedIn: false, chatReady: false }),
        ],
      }),
    );
    await flushPromises();

    await radio(w, "onboarding-provider-claude").trigger("click");
    await flushPromises();

    expect(testId(w, "onboarding-status-claude").text()).toContain("Sign-in required");
    expect(w.find("[data-testid='onboarding-not-installed-claude']").exists()).toBe(false);
    expect(testId(w, "assistant-guide-install-claude").attributes("data-done")).toBe("true");
    const signIn = testId(w, "assistant-guide-sign-in-claude");
    expect(signIn.attributes("data-done")).toBeUndefined();
    expect(signIn.text()).toContain("claude auth login");
  });

  it("moves on once the user finishes in Terminal and the check sees it", async () => {
    let next = status({
      providers: [freshProvider("opencode"), provider("claude", { signedIn: false, chatReady: false })],
      node: notDownloaded(),
    });
    const setupStatus = vi.fn(async () => next);
    const w = mountCheck({ setupStatus }, async () => next);
    await flushPromises();
    await radio(w, "onboarding-provider-claude").trigger("click");
    await flushPromises();
    expect(w.find("[data-testid='onboarding-step-assistant']").exists()).toBe(true);

    next = status({
      providers: [freshProvider("opencode"), provider("claude", { signedIn: true, chatReady: true })],
      node: notDownloaded(),
    });
    await testId(w, "assistant-guide-recheck-claude").trigger("click");
    await flushPromises();

    expect(w.find("[data-testid='onboarding-step-site']").exists()).toBe(true);
    expect(useAssistantStore().guides).toEqual([]);
  });

  it("lets the user go back and pick a ready assistant without a guide", async () => {
    const w = mountCheck(
      {},
      status({
        providers: [
          provider("opencode", { freeModels: true, signedIn: null }),
          provider("claude", { runtime: runtime({ source: "system" }), signedIn: true, chatReady: true }),
        ],
      }),
    );
    await flushPromises();

    // Already connected → the form moves past the assistant step; jump back to pick another.
    expect(testId(w, "onboarding-step-assistant").attributes("data-active")).toBeUndefined();
    await testId(w, "onboarding-dot-1").trigger("click");
    await flushPromises();

    await radio(w, "onboarding-provider-claude").trigger("click");
    await flushPromises();
    expect(radio(w, "onboarding-provider-claude").attributes("aria-checked")).toBe("true");
    expect(w.find("[data-testid^='assistant-guide-']").exists()).toBe(false);
    expect(testId(w, "onboarding-next").attributes("disabled")).toBeUndefined();
  });

  it("moves on when the assistant is already ready", async () => {
    const w = mountCheck();
    await flushPromises();

    // Assistant + site builder are already ready in the default fixture → GitHub step.
    expect(testId(w, "onboarding-step-github").attributes("data-active")).toBe("true");
    // Done steps stay above in the scroll, but aren't the active one.
    expect(testId(w, "onboarding-step-assistant").attributes("data-active")).toBeUndefined();
  });

  it("skips the assistant step when OpenCode is already connected", async () => {
    const w = mountCheck(
      {},
      status({
        providers: [provider("opencode", { freeModels: true, signedIn: null })],
        node: notDownloaded(),
      }),
    );
    await flushPromises();

    expect(testId(w, "onboarding-step-site").attributes("data-active")).toBe("true");
    expect(testId(w, "onboarding-step-assistant").attributes("data-active")).toBeUndefined();
    expect(w.text()).toContain("Add the site builder.");
  });

  it("rechecks from the guide and skips setup", async () => {
    let next = fresh();
    const setupStatus = vi.fn(async () => next);
    const setupRuntimes = vi.fn(async () => ({ providers: [] }));
    const w = mountCheck({ setupStatus, setupRuntimes }, async () => next);
    await flushPromises();

    await testId(w, "assistant-guide-recheck-opencode").trigger("click");
    await flushPromises();
    expect(setupStatus).toHaveBeenCalled();
    expect(setupRuntimes).toHaveBeenCalled();

    next = status();
    await testId(w, "assistant-guide-recheck-opencode").trigger("click");
    await flushPromises();
    expect(w.find("[data-testid='onboarding-step-github']").exists()).toBe(true);

    await testId(w, "onboarding-skip").trigger("click");
    expect(w.emitted("continue")).toHaveLength(1);
  });

  it("closes its guide when it unmounts, so polling stops", async () => {
    const w = mountCheck({}, fresh());
    await flushPromises();
    const store = useAssistantStore();
    expect(store.guides).toEqual(["opencode"]);

    w.unmount();
    expect(store.guides).toEqual([]);
  });
});

describe("onboarding step 2: site builder", () => {
  it("gates Continue on the site builder and downloads it", async () => {
    const downloadRuntime = vi.fn(async () => runtime({ phase: "downloading", progress: 0 }));
    const cancelRuntime = vi.fn(async () => notDownloaded());
    const w = mountCheck(
      { downloadRuntime, cancelRuntime },
      status({
        providers: [provider("opencode", { freeModels: true, signedIn: null })],
        node: notDownloaded(),
      }),
    );
    await flushPromises();

    await toSite(w);
    expect(w.text()).toContain("Add the site builder.");
    expect(w.text()).toContain(
      "orso uses this to install packages and preview your site. It is downloaded once.",
    );
    expect(testId(w, "onboarding-site-primary").text()).toContain("Download");
    expect(testId(w, "onboarding-next").attributes("disabled")).toBeDefined();

    await testId(w, "onboarding-site-primary").trigger("click");
    await flushPromises();
    expect(downloadRuntime).toHaveBeenCalledWith("node");
    expect(w.find("[data-testid='onboarding-site-progress']").exists()).toBe(true);
    expect(testId(w, "onboarding-site-primary").text()).toContain("Cancel");

    h.daemon.emit({ type: "setup.runtime", runtime: "node", phase: "downloading", progress: 65 });
    await nextTick();
    expect(testId(w, "onboarding-site-progress").text()).toContain("65%");

    await testId(w, "onboarding-site-primary").trigger("click");
    await flushPromises();
    expect(cancelRuntime).toHaveBeenCalledWith("node");

    h.daemon.emit({
      type: "setup.runtime",
      runtime: "node",
      phase: "ready",
      version: "24.0.0",
      source: "managed",
    });
    await nextTick();
    expect(testId(w, "onboarding-next").attributes("disabled")).toBeUndefined();

    await testId(w, "onboarding-next").trigger("click");
    await flushPromises();
    expect(w.find("[data-testid='onboarding-step-github']").exists()).toBe(true);
  });

  it("retries a failed site-builder download", async () => {
    const retryRuntime = vi.fn(async () => runtime({ phase: "downloading", progress: 1 }));
    const w = mountCheck(
      { retryRuntime },
      status({
        providers: [provider("opencode", { freeModels: true, signedIn: null })],
        node: runtime({ phase: "downloadError", version: null, message: "Network" }),
      }),
    );
    await flushPromises();
    await toSite(w);

    expect(testId(w, "onboarding-site-primary").text()).toContain("Retry");
    expect(toastMock.error).toHaveBeenCalledWith(
      "We couldn't download the site builder",
      expect.objectContaining({ description: "Check your connection and try again. (Network)" }),
    );
    await testId(w, "onboarding-site-primary").trigger("click");
    await flushPromises();
    expect(retryRuntime).toHaveBeenCalledWith("node");
    expect(testId(w, "onboarding-site-primary").text()).toContain("Cancel");
  });

  it("shows the site-builder version and source when ready", async () => {
    const w = mountCheck();
    await flushPromises();
    await toSite(w);

    expect(testId(w, "onboarding-site-primary").text()).toContain("Continue");
    expect(w.text()).toContain("Version 24.0.0");
    expect(w.text()).toContain("Downloaded by orso");
    expect(testId(w, "onboarding-next").attributes("disabled")).toBeUndefined();
  });
});

describe("onboarding step 3: GitHub", () => {
  it("keeps GitHub optional and skips it", async () => {
    const w = mountCheck();
    await flushPromises();
    await toGithub(w);

    expect(w.text()).toContain("Connect GitHub.");
    expect(w.text()).toContain(
      "Share previews and publish when you are ready. You can do this later.",
    );
    expect(w.find("[data-testid='onboarding-git']").exists()).toBe(true);
    expect(w.find("[data-testid='onboarding-github-tools']").exists()).toBe(true);
    expect(w.find("[data-testid='onboarding-github-account']").exists()).toBe(true);

    await testId(w, "onboarding-github-skip").trigger("click");
    expect(w.emitted("continue")).toHaveLength(1);
  });

  it("finishes with Start building", async () => {
    const w = mountCheck();
    await flushPromises();
    await toGithub(w);

    expect(testId(w, "onboarding-next").text()).toContain("Start building");
    await testId(w, "onboarding-next").trigger("click");
    expect(w.emitted("continue")).toHaveLength(1);
  });

  it("guides the GitHub sign-in in Terminal when the account is missing", async () => {
    const w = mountCheck({}, status({ githubSignedIn: false }));
    await flushPromises();
    await toGithub(w);

    expect(testId(w, "onboarding-github-account").text()).toContain(
      "Sign in so orso can open your sites and share your changes.",
    );
    // No in-app sign-in: the guide shows gh's own command instead.
    expect(w.find("[data-testid='setup-sign-in']").exists()).toBe(false);
    expect(testId(w, "github-guide-install").attributes("data-done")).toBe("true");
    expect(testId(w, "github-guide-sign-in").text()).toContain("gh auth login --web");
  });

  it("hides the GitHub guide once Git, gh and the account are all ready", async () => {
    const w = mountCheck({}, status());
    await flushPromises();
    await toGithub(w);
    expect(w.find("[data-testid='github-guide']").exists()).toBe(false);
  });

  it("walks back through the steps", async () => {
    const w = mountCheck();
    await flushPromises();
    await toGithub(w);

    await testId(w, "onboarding-back").trigger("click");
    await flushPromises();
    expect(w.find("[data-testid='onboarding-step-site']").exists()).toBe(true);

    await testId(w, "onboarding-back").trigger("click");
    await flushPromises();
    expect(w.find("[data-testid='onboarding-step-assistant']").exists()).toBe(true);
    expect(testId(w, "onboarding-back").attributes("disabled")).toBeDefined();
  });

  it("lets a completed dot jump back", async () => {
    const w = mountCheck();
    await flushPromises();
    await toGithub(w);

    await testId(w, "onboarding-dot-1").trigger("click");
    await flushPromises();
    expect(w.find("[data-testid='onboarding-step-assistant']").exists()).toBe(true);
  });
});

describe("onboarding copy and failures", () => {
  it("never shows developer words in any step", async () => {
    const w = mountCheck();
    await flushPromises();

    const banned = /\b(agent|cli|acp|sdk|npx|path|runtime)\b|vibe coding/i;
    expect(w.text()).not.toMatch(banned);

    await toSite(w);
    expect(w.text()).not.toMatch(banned);

    await testId(w, "onboarding-next").trigger("click");
    await flushPromises();
    expect(w.find("[data-testid='onboarding-step-github']").exists()).toBe(true);
    expect(w.text()).not.toMatch(banned);
  });

  it("shows a friendly message, not the raw error, when the check fails", async () => {
    const w = mountCheck({}, async () => {
      throw new NetworkError("cannot reach daemon at http://127.0.0.1:7800");
    });
    await flushPromises();

    expect(toastMock.error).toHaveBeenCalledWith(
      "We couldn't check your setup just now",
      expect.objectContaining({ description: "Make sure orso is still running, then check again." }),
    );
    expect(JSON.stringify(toastMock.error.mock.calls)).not.toContain("127.0.0.1");
    expect(w.text()).not.toContain("cannot reach daemon");
    expect(w.text()).not.toContain("127.0.0.1");
  });
});
