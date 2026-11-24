// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createFakeDaemon, type FakeDaemon } from "@/test/fakeDaemon";

const h = vi.hoisted(() => ({
  daemon: null as unknown as FakeDaemon,
  toastError: vi.fn(),
}));
vi.mock("@/core/daemon", () => ({ useDaemon: () => h.daemon }));
vi.mock("@/lib/toast", () => ({ toast: { error: h.toastError } }));

import CommandBlock from "./CommandBlock.vue";
import { INSTALL_GUIDES } from "@/modules/assistant/install";
import { GH_COMMANDS } from "@/modules/github/guide";

enableAutoUnmount(afterEach);
afterEach(() => h.toastError.mockReset());

function mountBlock(runInTerminal: (command: string) => Promise<unknown>, runnable = true) {
  const spy = vi.fn(runInTerminal);
  h.daemon = createFakeDaemon({ runInTerminal: spy });
  const w = mount(CommandBlock, {
    props: { command: "claude auth login", what: "the sign-in command", copyTestid: "copy", runnable },
  });
  return { w, spy };
}

describe("CommandBlock", () => {
  it("asks the daemon to run the command in Terminal", async () => {
    const { w, spy } = mountBlock(async () => ({ opened: true }));
    await w.get("[data-testid='copy-run']").trigger("click");
    await flushPromises();
    expect(spy).toHaveBeenCalledWith("claude auth login");
    expect(w.text()).toContain("Opened in Terminal");
    expect(h.toastError).not.toHaveBeenCalled();
  });

  it("says Terminal didn't open and points at copying instead", async () => {
    const { w } = mountBlock(async () => {
      throw new Error("Opening Terminal only works on a Mac.");
    });
    await w.get("[data-testid='copy-run']").trigger("click");
    await flushPromises();
    expect(h.toastError).toHaveBeenCalledWith(
      "Couldn't open Terminal",
      expect.objectContaining({ description: expect.stringContaining("copy the command") }),
    );
    expect(w.text()).not.toContain("Opened in Terminal");
  });

  it("offers only copy when not runnable", () => {
    const { w } = mountBlock(async () => ({}), false);
    expect(w.find("[data-testid='copy-run']").exists()).toBe(false);
    expect(w.find("[data-testid='copy']").exists()).toBe(true);
  });
});

describe("the daemon's Terminal allowlist", () => {
  // The daemon runs only the commands in src/terminal/mod.rs `ALLOWED`; every command a
  // guide offers to run must be there, word for word, or its button fails.
  const rust = readFileSync(resolve(__dirname, "../../../src/terminal/mod.rs"), "utf8");
  const allowed = new Set(
    [...(rust.match(/pub const ALLOWED[^;]*;/s)?.[0] ?? "").matchAll(/^\s*"([^"]+)",/gm)].map((m) => m[1]),
  );

  const guideCommands = [
    ...Object.values(INSTALL_GUIDES).flatMap((g) => [g.install, ...(g.signIn ? [g.signIn] : [])]),
    ...Object.values(GH_COMMANDS),
  ];

  it.each(guideCommands)("allows %s", (command) => {
    expect(allowed.has(command)).toBe(true);
  });

  it("allows nothing the guides don't show", () => {
    expect([...allowed].sort()).toEqual([...new Set(guideCommands)].sort());
  });
});
