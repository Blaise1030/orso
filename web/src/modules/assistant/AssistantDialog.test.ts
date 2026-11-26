// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createFakeDaemon, type FakeDaemon } from "@/test/fakeDaemon";
import type { SetupProvider } from "@/core/types";

const hStub = vi.hoisted(() => {
  // Lazy stub so vi.mock factories can close over it without TDZ issues.
  const run = vi.fn();
  return { daemon: null as unknown as FakeDaemon, run };
});
vi.mock("@/core/daemon", () => ({ useDaemon: () => hStub.daemon }));
vi.mock("@/app/SetupTerminal.vue", async () => {
  const { defineComponent, h, ref } = await import("vue");
  return {
    default: defineComponent({
      name: "SetupTerminal",
      props: { label: { type: String, default: null } },
      setup(_, { expose, emit }) {
        const state = ref<"idle" | "running" | "done" | "failed">("idle");
        function run(command: string) {
          hStub.run(command);
          state.value = "running";
          emit("status", "running", `Running ${command}`);
        }
        expose({ run, state });
        return () => h("div", { "data-testid": "setup-terminal" });
      },
    }),
  };
});

import AssistantDialog from "./AssistantDialog.vue";
import { assistantDialogOpen } from "./dialog";

const provider = (over: Partial<SetupProvider> = {}): SetupProvider => ({
  id: "opencode",
  name: "OpenCode",
  available: true,
  runtime: { phase: "ready", version: "1.0.0", source: "managed", progress: null, message: null },
  installed: true,
  signedIn: true,
  chatReady: true,
  freeModels: false,
  reason: null,
  ...over,
});

function mountDialog(providers: SetupProvider[] = [provider()]) {
  hStub.daemon = createFakeDaemon({
    setupStatus: vi.fn(async () => ({
      git: true,
      gh: true,
      githubSignedIn: true,
      providers,
      projectsDir: "/p",
    })),
    setupRuntimes: vi.fn(async () => ({ providers: [] })),
  });
  setActivePinia(createPinia());
  assistantDialogOpen.value = true;
  return mount(AssistantDialog, { attachTo: document.body });
}

const el = (testId: string) =>
  document.body.querySelector<HTMLElement>(`[data-testid='${testId}']`);

enableAutoUnmount(afterEach);
beforeEach(() => {
  assistantDialogOpen.value = false;
  hStub.run.mockClear();
});

describe("AssistantDialog", () => {
  it("shows the assistant setup and closes on Continue", async () => {
    mountDialog();
    await flushPromises();

    expect(document.body.textContent).toContain("Set up your assistant");
    expect(el("assistant-dialog")).not.toBeNull();
    expect(el("assistant-setup")).not.toBeNull();

    el("assistant-continue")!.click();
    await flushPromises();
    expect(assistantDialogOpen.value).toBe(false);
  });

  it("emits connect for a ready assistant and closes", async () => {
    const w = mountDialog();
    await flushPromises();

    el("assistant-action-opencode")!.click();
    await flushPromises();
    expect(w.emitted("connect")).toEqual([["opencode"]]);
    expect(assistantDialogOpen.value).toBe(false);
  });

  it("says nothing developer-facing", async () => {
    mountDialog([provider({ chatReady: false, signedIn: false })]);
    await flushPromises();
    expect(document.body.textContent).toContain("Sign-in required");
    expect(document.body.textContent).not.toMatch(/\b(agent|cli|acp|sdk|npx|path|runtime)\b/i);
  });

  it("shows a side-by-side terminal and runs guide commands there", async () => {
    mountDialog([
      provider({
        id: "codex",
        name: "Codex",
        signedIn: false,
        chatReady: false,
      }),
    ]);
    await flushPromises();

    expect(el("setup-terminal")).not.toBeNull();
    expect(el("assistant-dialog-terminal")).not.toBeNull();
    expect(el("assistant-dialog-list")?.className).toContain("overflow-y-auto");
    expect(el("assistant-dialog-terminal")?.className).toContain("overflow-hidden");

    // Dialog auto-opens the guide for the assistant that still needs sign-in.
    const run = el("assistant-guide-copy-sign-in-codex-run");
    expect(run).not.toBeNull();
    expect(run!.textContent).toContain("Run");
    expect(run!.textContent).not.toContain("Run in Terminal");

    run!.click();
    await flushPromises();
    expect(hStub.run).toHaveBeenCalledWith("codex login");
  });
});
