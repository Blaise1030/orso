// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createFakeDaemon, type FakeDaemon } from "@/test/fakeDaemon";
import type { Project } from "@/core/types";
import { useProjectsStore } from "./store";

const h = vi.hoisted(() => ({
  daemon: null as unknown as FakeDaemon,
  toastError: vi.fn(),
}));
vi.mock("@/core/daemon", () => ({ useDaemon: () => h.daemon }));
vi.mock("@/lib/toast", () => ({ toast: { error: h.toastError } }));

import ProjectSetupPrompt from "./ProjectSetupPrompt.vue";

const bare = (over: Partial<Project> = {}): Project => ({
  id: "bare",
  name: "Bare",
  port: 4000,
  devserver: "needsSetup",
  autoApprove: false,
  repo: null,
  ...over,
});

beforeEach(() => {
  h.toastError.mockClear();
  setActivePinia(createPinia());
});

describe("ProjectSetupPrompt", () => {
  it("asks before writing orso.json, then inits and updates the store", async () => {
    const initProject = vi.fn(async () =>
      bare({ devserver: "starting" }),
    );
    h.daemon = createFakeDaemon({ initProject });
    const store = useProjectsStore();
    store.projects = [bare()];
    store.loaded = true;

    const w = mount(ProjectSetupPrompt, { props: { projectId: "bare" } });
    expect(w.get("[data-testid='project-setup-prompt']").text()).toContain("Set up this project");
    expect(w.get("[data-testid='project-setup-confirm']").text()).toMatch(/Set up/i);
    expect(initProject).not.toHaveBeenCalled();

    await w.get("[data-testid='project-setup-confirm']").trigger("click");
    await flushPromises();

    expect(initProject).toHaveBeenCalledWith("bare");
    expect(store.projects[0]!.devserver).toBe("starting");
  });

  it("toasts when init fails", async () => {
    h.daemon = createFakeDaemon({
      initProject: vi.fn(async () => {
        throw new Error("disk full");
      }),
    });
    useProjectsStore().projects = [bare()];

    const w = mount(ProjectSetupPrompt, { props: { projectId: "bare" } });
    await w.get("[data-testid='project-setup-confirm']").trigger("click");
    await flushPromises();
    expect(h.toastError).toHaveBeenCalledWith("disk full");
  });
});
