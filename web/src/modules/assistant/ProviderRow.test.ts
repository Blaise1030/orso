// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import type { RuntimeStatus, SetupProvider } from "@/core/types";
import ProviderRow from "./ProviderRow.vue";
import { deriveRow, LABELS, PROVIDER_NAMES, siteBuilderRow } from "./rows";

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

function render(p: SetupProvider) {
  return mount(ProviderRow, { props: { row: deriveRow(p) } });
}

const action = (w: ReturnType<typeof render>) => w.get("[data-testid='assistant-action-opencode']");

const site = (over: Partial<RuntimeStatus> = {}) =>
  mount(ProviderRow, { props: { row: siteBuilderRow(runtime({ version: "24.0.0", ...over })) } });
const siteAction = (w: ReturnType<typeof site>) => w.get("[data-testid='assistant-action-node']");

describe("ProviderRow phases", () => {
  it("offers Set up before the assistant is installed", async () => {
    const w = render(
      provider("opencode", {
        runtime: runtime({ phase: "notDownloaded", version: null, source: null }),
        installed: false,
        chatReady: false,
        freeModels: true,
        signedIn: null,
      }),
    );

    expect(w.text()).toContain("OpenCode");
    expect(w.text()).toContain("Free models, no account needed.");
    expect(w.text()).toContain("Recommended");
    expect(action(w).text()).toBe(LABELS.setUp);
    expect(w.find("[data-testid='assistant-status-opencode']").exists()).toBe(false);
    expect(w.find("[data-testid='assistant-version-opencode']").exists()).toBe(false);
    expect(w.attributes("data-action")).toBe("setup");

    await action(w).trigger("click");
    expect(w.emitted("action")).toEqual([["setup"]]);
  });

  it("shows Connected and Connect once the assistant is signed in", async () => {
    const w = render(provider("claude"));

    expect(w.get("[data-testid='assistant-status-claude']").text()).toBe(LABELS.connected);
    expect(w.get("[data-testid='assistant-action-claude']").text()).toBe(LABELS.connect);

    await w.get("[data-testid='assistant-action-claude']").trigger("click");
    expect(w.emitted("action")).toEqual([["connect"]]);
  });

  it("asks to sign in, and Connect opens the sign-in steps", async () => {
    const w = render(provider("claude", { signedIn: false, chatReady: false }));

    expect(w.get("[data-testid='assistant-status-claude']").text()).toBe(LABELS.signInRequired);
    expect(w.get("[data-testid='assistant-action-claude']").text()).toBe(LABELS.connect);

    await w.get("[data-testid='assistant-action-claude']").trigger("click");
    expect(w.emitted("action")).toEqual([["signIn"]]);
  });

  it("keeps OpenCode connected on free models without a sign-in", () => {
    const w = render(provider("opencode", { signedIn: null, chatReady: true, freeModels: true }));

    expect(w.get("[data-testid='assistant-status-opencode']").text()).toBe(LABELS.connected);
    expect(w.text()).not.toContain(LABELS.signInRequired);
    expect(action(w).text()).toBe(LABELS.connect);
  });

  it("says Not ready, not Connected, when a signed-in assistant can't chat", async () => {
    const w = render(provider("claude", { signedIn: true, chatReady: false, reason: "Adapter exited." }));

    expect(w.get("[data-testid='assistant-status-claude']").text()).toBe(LABELS.notReady);
    expect(w.text()).not.toContain(LABELS.connected);
    await w.get("[data-testid='assistant-action-claude']").trigger("click");
    expect(w.emitted("action")).toEqual([["setup"]]);
  });
});

describe("ProviderRow site builder downloads", () => {
  it("offers Download before the first download", async () => {
    const w = site({ phase: "notDownloaded", version: null, source: null });

    expect(siteAction(w).text()).toBe(LABELS.download);
    expect(w.get("[data-testid='assistant-size-node']").text()).toBe("About 150 MB");
    await siteAction(w).trigger("click");
    expect(w.emitted("action")).toEqual([["download"]]);
  });

  it("shows the percentage, a progress bar and Cancel while downloading", async () => {
    const w = site({ phase: "downloading", progress: 42, version: null });

    expect(w.get("[data-testid='assistant-progress-node']").text()).toContain("42%");
    expect(w.find("[data-testid='assistant-progress-node'] [role='progressbar']").exists()).toBe(true);
    expect(siteAction(w).text()).toBe(LABELS.cancel);
    await siteAction(w).trigger("click");
    expect(w.emitted("action")).toEqual([["cancel"]]);
  });

  it("waits on Setting up… while finishing", () => {
    const w = site({ phase: "finishing" });

    expect(w.get("[data-testid='assistant-status-node']").text()).toBe(LABELS.settingUp);
    expect(w.find("[data-testid='assistant-status-node'] .animate-spin").exists()).toBe(true);
    expect(w.find("[data-testid='assistant-action-node']").exists()).toBe(false);
  });

  it("marks a failed download and offers Retry", async () => {
    const w = site({ phase: "downloadError", message: "The connection dropped.", version: null });

    expect(w.get("[data-testid='assistant-status-node']").text()).toBe(LABELS.downloadFailed);
    // The explanation is a toast from the store, not an inline alert.
    expect(w.find("[data-testid='assistant-error-node']").exists()).toBe(false);
    expect(siteAction(w).text()).toBe(LABELS.retry);
    await siteAction(w).trigger("click");
    expect(w.emitted("action")).toEqual([["retry"]]);
  });

  it("offers Update when a newer version is available", async () => {
    const w = site({ phase: "updateAvailable", version: "24.0.0" });

    expect(w.get("[data-testid='assistant-status-node']").text()).toBe(LABELS.updateAvailable);
    expect(siteAction(w).text()).toBe(LABELS.update);
    await siteAction(w).trigger("click");
    expect(w.emitted("action")).toEqual([["update"]]);
  });
});

describe("ProviderRow details", () => {
  it("shows the version and where a ready copy came from", () => {
    const managed = render(provider("opencode"));
    expect(managed.get("[data-testid='assistant-version-opencode']").text()).toBe(
      "Version 2.2.5 · Downloaded by orso",
    );

    const system = render(
      provider("claude", { runtime: runtime({ source: "system", version: "2.1.263" }) }),
    );
    expect(system.get("[data-testid='assistant-version-claude']").text()).toBe(
      "Version 2.1.263 · Already on your Mac",
    );
  });

  it("leaves out a size the daemon did not report", () => {
    const w = site({ phase: "notDownloaded", version: null, source: null, downloadBytes: undefined });
    expect(w.find("[data-testid='assistant-size-node']").exists()).toBe(false);
  });

  it("labels the actions for screen readers", () => {
    expect(site({ phase: "notDownloaded", version: null, source: null }).get("[data-testid='assistant-action-node']").attributes("aria-label")).toBe(
      "Download Site builder",
    );
    expect(site({ phase: "downloading", progress: 10 }).get("[data-testid='assistant-action-node']").attributes("aria-label")).toBe(
      "Cancel downloading Site builder",
    );

    const signIn = render(provider("claude", { signedIn: false, chatReady: false }));
    expect(signIn.get("[data-testid='assistant-action-claude']").attributes("aria-label")).toBe(
      "Connect Claude",
    );
  });

  it("disables the action while the host is busy", () => {
    const w = mount(ProviderRow, { props: { row: deriveRow(provider("opencode")), busy: true } });
    expect(w.get("[data-testid='assistant-action-opencode']").attributes("disabled")).toBeDefined();
  });

  it("never uses developer words", () => {
    const rows = [
      provider("opencode", {
        runtime: runtime({ phase: "notDownloaded", version: null, source: null }),
        installed: false,
        chatReady: false,
      }),
      provider("codex", { signedIn: false, chatReady: false }),
      provider("claude", { signedIn: true, chatReady: false }),
      provider("cursor", { runtime: runtime({ phase: "updateAvailable" }) }),
    ].map((p) => mount(ProviderRow, { props: { row: deriveRow(p) } }));
    rows.push(site({ phase: "downloadError", message: "The connection dropped." }));

    const copy = rows.map((w) => w.text()).join(" ");
    expect(copy).toContain("Download failed");
    expect(copy).toContain(LABELS.setUp);
    expect(copy).not.toMatch(/\b(agent|cli|acp|sdk|npx|path|runtime)\b/i);
  });
});
