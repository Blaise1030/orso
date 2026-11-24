// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createFakeDaemon, type FakeDaemon } from "@/test/fakeDaemon";
import type { SetupStatus } from "@/core/types";

const h = vi.hoisted(() => ({ daemon: null as unknown as FakeDaemon }));
vi.mock("@/core/daemon", () => ({ useDaemon: () => h.daemon }));

import GhGuide from "./GhGuide.vue";
import { GH_COMMANDS, GH_GUIDE_POLL_MS } from "./guide";

const signedOut = { configured: false, deviceFlow: false, source: null, user: null };

const setup = (over: Partial<SetupStatus> = {}): SetupStatus => ({
  git: true,
  gh: false,
  githubSignedIn: false,
  providers: [],
  projectsDir: "/p",
  ...over,
});

function mountGuide(setupStatus: () => Promise<SetupStatus>, githubStatus: () => Promise<unknown> = async () => signedOut) {
  const setupSpy = vi.fn(setupStatus);
  h.daemon = createFakeDaemon({ setupStatus: setupSpy, githubStatus: vi.fn(githubStatus) });
  setActivePinia(createPinia());
  return { w: mount(GhGuide, { attachTo: document.body }), setupSpy };
}

enableAutoUnmount(afterEach);
afterEach(() => vi.useRealTimers());

describe("GhGuide", () => {
  it("shows the gh install and sign-in commands when neither is done", async () => {
    const { w } = mountGuide(async () => setup());
    await flushPromises();
    expect(w.find("[data-testid='github-guide-git']").exists()).toBe(false);
    expect(w.get("[data-testid='github-guide-install']").text()).toContain(GH_COMMANDS.install);
    expect(w.get("[data-testid='github-guide-install']").text()).toContain("No Homebrew?");
    expect(w.get("[data-testid='github-guide-sign-in']").text()).toContain(GH_COMMANDS.signIn);
  });

  it("adds a Git step first when Git is missing", async () => {
    const { w } = mountGuide(async () => setup({ git: false }));
    await flushPromises();
    const steps = w.findAll("li").map((li) => li.attributes("data-testid"));
    expect(steps).toEqual(["github-guide-git", "github-guide-install", "github-guide-sign-in"]);
    expect(w.get("[data-testid='github-guide-git']").text()).toContain(GH_COMMANDS.git);
  });

  it("ticks the install step once gh is found", async () => {
    const { w } = mountGuide(async () => setup({ gh: true }));
    await flushPromises();
    expect(w.get("[data-testid='github-guide-install']").attributes("data-done")).toBe("true");
    expect(w.get("[data-testid='github-guide-install']").text()).toContain("The GitHub tools are installed");
    expect(w.get("[data-testid='github-guide-sign-in']").attributes("data-done")).toBeUndefined();
  });

  it("renders nothing once Git, gh and the account are ready", async () => {
    const { w } = mountGuide(async () => setup({ gh: true, githubSignedIn: true }));
    await flushPromises();
    expect(w.find("[data-testid='github-guide']").exists()).toBe(false);
  });

  it("re-checks every few seconds until signed in, then stops", async () => {
    vi.useFakeTimers();
    let signedIn = false;
    const { setupSpy } = mountGuide(async () => setup({ gh: true, githubSignedIn: signedIn }));
    await vi.advanceTimersByTimeAsync(0);
    const first = setupSpy.mock.calls.length;

    await vi.advanceTimersByTimeAsync(GH_GUIDE_POLL_MS);
    expect(setupSpy.mock.calls.length).toBe(first + 1);

    signedIn = true;
    await vi.advanceTimersByTimeAsync(GH_GUIDE_POLL_MS);
    const done = setupSpy.mock.calls.length;
    await vi.advanceTimersByTimeAsync(GH_GUIDE_POLL_MS * 3);
    expect(setupSpy.mock.calls.length).toBe(done);
  });
});
