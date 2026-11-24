// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { createFakeDaemon, type FakeDaemon } from "@/test/fakeDaemon";

const h = vi.hoisted(() => ({ daemon: null as unknown as FakeDaemon }));
vi.mock("@/core/daemon", () => ({ useDaemon: () => h.daemon }));

import GithubAccount from "./GithubAccount.vue";

const empty = { render: () => null };
let router: Router;

function mountWith(status: unknown, api: Record<string, unknown> = {}) {
  h.daemon = createFakeDaemon({ githubStatus: vi.fn(async () => status), ...api });
  setActivePinia(createPinia());
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: empty },
      { path: "/settings", component: empty },
    ],
  });
  return mount(GithubAccount, { attachTo: document.body, global: { plugins: [router] } });
}

enableAutoUnmount(afterEach);

describe("GithubAccount", () => {
  it("renders nothing when the daemon has no GitHub status", async () => {
    h.daemon = createFakeDaemon({ githubStatus: vi.fn(async () => { throw new Error("404"); }) });
    setActivePinia(createPinia());
    router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: empty }] });
    const w = mount(GithubAccount, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();
    expect(w.find("[data-testid='github-sign-in']").exists()).toBe(false);
  });

  it("signed out, links to Settings → GitHub instead of signing in itself", async () => {
    const start = vi.fn();
    const w = mountWith({ configured: true, deviceFlow: true, source: null, user: null }, { githubDeviceStart: start });
    await flushPromises();
    const connect = w.find("[data-testid='github-sign-in']");
    expect(connect.text()).toContain("Connect GitHub");
    await connect.trigger("click");
    await flushPromises();
    expect(start).not.toHaveBeenCalled();
    expect(router.currentRoute.value.fullPath).toBe("/settings?tab=github");
  });

  it("shows the signed-in account", async () => {
    const w = mountWith({
      configured: true, deviceFlow: true, source: "oauth",
      user: { login: "ada", id: 1, name: "Ada", avatarUrl: "a.png" },
    });
    await flushPromises();
    expect(w.find("[data-testid='github-account']").text()).toContain("Ada");
    await w.find("[data-testid='github-account']").trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("Sign out");
  });

  it("offers Settings in the account menu", async () => {
    const w = mountWith({
      configured: true, deviceFlow: true, source: "oauth",
      user: { login: "ada", id: 1, name: "Ada", avatarUrl: "a.png" },
    });
    await flushPromises();
    await w.find("[data-testid='github-account']").trigger("click");
    await flushPromises();
    const settings = [...document.body.querySelectorAll("[role='menuitem']")].find((m) =>
      m.textContent?.includes("Settings"),
    ) as HTMLElement;
    expect(settings).toBeTruthy();
    settings.click();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/settings");
  });

  it("shows the GitHub CLI account without a Sign out item", async () => {
    const w = mountWith({
      configured: true, deviceFlow: false, source: "cli",
      user: { login: "ada", id: 1, name: "Ada", avatarUrl: "a.png" },
    });
    await flushPromises();
    const trigger = w.find("[data-testid='github-account']");
    expect(trigger.text()).toContain("Ada");
    await trigger.trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("Signed in with GitHub CLI (gh)");
    expect(document.body.textContent).not.toContain("Sign out");
  });

  it("offers Connect GitHub when only the CLI could sign in and it is logged out", async () => {
    const w = mountWith({ configured: false, deviceFlow: false, source: null, user: null });
    await flushPromises();
    expect(w.find("[data-testid='github-sign-in']").text()).toContain("Connect GitHub");
    expect(w.find("[data-testid='github-account']").exists()).toBe(false);
  });
});
