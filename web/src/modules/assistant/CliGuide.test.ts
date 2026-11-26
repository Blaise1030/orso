// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import type { RuntimeStatus, SetupProvider } from "@/core/types";
import CliGuide from "./CliGuide.vue";
import { INSTALL_GUIDES } from "./install";
import { deriveRow, PROVIDER_NAMES } from "./rows";

const runtime = (over: Partial<RuntimeStatus> = {}): RuntimeStatus => ({
  phase: "ready",
  version: "2.1.0",
  source: "system",
  progress: null,
  message: null,
  ...over,
});

const notInstalled = runtime({ phase: "notDownloaded", version: null, source: null });

const provider = (id: string, over: Partial<SetupProvider> = {}): SetupProvider => ({
  id,
  name: PROVIDER_NAMES[id] ?? id,
  available: true,
  runtime: runtime(),
  installed: true,
  signedIn: true,
  chatReady: true,
  freeModels: id === "opencode",
  reason: null,
  ...over,
});

function render(p: SetupProvider, checking = false) {
  return mount(CliGuide, { props: { row: deriveRow(p), checking } });
}

const byId = (w: ReturnType<typeof render>, id: string) => w.get(`[data-testid='${id}']`);

describe("CliGuide", () => {
  it("shows the install command with a copy button before the assistant is installed", () => {
    const w = render(
      provider("claude", { runtime: notInstalled, installed: false, signedIn: null, chatReady: false }),
    );

    const install = byId(w, "assistant-guide-install-claude");
    expect(install.text()).toContain("Install Claude");
    expect(install.text()).toContain(INSTALL_GUIDES.claude!.install);
    expect(install.attributes("data-done")).toBeUndefined();
    expect(w.find("[data-testid='assistant-guide-copy-install-claude']").exists()).toBe(true);
    expect(w.get("a").attributes("href")).toBe(INSTALL_GUIDES.claude!.docsUrl);
  });

  it("shows Claude's own sign-in command as the second step", () => {
    const w = render(
      provider("claude", { runtime: notInstalled, installed: false, signedIn: null, chatReady: false }),
    );

    const signIn = byId(w, "assistant-guide-sign-in-claude");
    expect(signIn.text()).toContain("Sign in to Claude");
    expect(signIn.text()).toContain("claude auth login");
    expect(w.find("[data-testid='assistant-guide-copy-sign-in-claude']").exists()).toBe(true);
  });

  it("shows OpenCode's own sign-in command as the second step", () => {
    const w = render(
      provider("opencode", { runtime: notInstalled, installed: false, signedIn: null, chatReady: false }),
    );

    const signIn = byId(w, "assistant-guide-sign-in-opencode");
    expect(signIn.text()).toContain("Sign in to OpenCode");
    expect(signIn.text()).toContain("opencode auth login");
    expect(w.find("[data-testid='assistant-guide-copy-sign-in-opencode']").exists()).toBe(true);
  });

  it("ticks off install once installed, and sign-in once signed in", () => {
    const signedOut = render(provider("codex", { signedIn: false, chatReady: false }));
    const install = byId(signedOut, "assistant-guide-install-codex");
    expect(install.attributes("data-done")).toBe("true");
    expect(install.text()).toContain("Codex is installed");
    expect(install.text()).not.toContain(INSTALL_GUIDES.codex!.install);
    expect(byId(signedOut, "assistant-guide-sign-in-codex").attributes("data-done")).toBeUndefined();
    expect(signedOut.text()).toContain("codex login");

    const signedIn = render(provider("codex", { signedIn: true, chatReady: false }));
    const signIn = byId(signedIn, "assistant-guide-sign-in-codex");
    expect(signIn.attributes("data-done")).toBe("true");
    expect(signIn.text()).toContain("Signed in to Codex");
    expect(signIn.text()).not.toContain("codex login");
  });

  it("says why an installed, signed-in assistant still can't chat", () => {
    const w = render(
      provider("claude", { signedIn: true, chatReady: false, reason: "The adapter exited (exit 1)." }),
    );
    expect(w.text()).toContain("The adapter exited (exit 1).");
    expect(w.text()).not.toContain("orso checks for you every few seconds.");
  });

  it("says it checks on its own while steps are open", () => {
    const w = render(provider("cursor", { signedIn: false, chatReady: false }));
    expect(w.text()).toContain("orso checks for you every few seconds.");
    expect(w.text()).toContain("cursor-agent login");
  });

  it("emits recheck, and disables it while a check runs", async () => {
    const w = render(provider("claude", { signedIn: false, chatReady: false }));
    await byId(w, "assistant-guide-recheck-claude").trigger("click");
    expect(w.emitted("recheck")).toHaveLength(1);

    const busy = render(provider("claude", { signedIn: false, chatReady: false }), true);
    expect(byId(busy, "assistant-guide-recheck-claude").attributes("disabled")).toBeDefined();
  });

  it("renders nothing for an assistant without a guide", () => {
    const w = render(provider("custom", { signedIn: false, chatReady: false }));
    expect(w.find("[data-testid='assistant-guide-custom']").exists()).toBe(false);
  });
});
