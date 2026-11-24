// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createFakeDaemon, type FakeDaemon } from "@/test/fakeDaemon";
import ChangesBranchPicker from "./ChangesBranchPicker.vue";
import { useChangesStore } from "./store";

const h = vi.hoisted(() => ({
  daemon: null as unknown as FakeDaemon,
  toastError: vi.fn(),
}));
vi.mock("@/core/daemon", () => ({ useDaemon: () => h.daemon }));
vi.mock("@/lib/toast", () => ({ toast: { error: h.toastError, success: vi.fn(), info: vi.fn() } }));

afterEach(() => {
  document.body.innerHTML = "";
});

function mountPicker(
  opts: { active?: { branch: string; title: string } | null; api?: Record<string, unknown> } = {},
) {
  h.daemon = createFakeDaemon({
    listChanges: vi.fn(async () => []),
    ...opts.api,
  });
  setActivePinia(createPinia());
  const store = useChangesStore();
  store.active = opts.active === undefined ? { branch: "content/lw", title: "LW" } : opts.active;
  const wrapper = mount(ChangesBranchPicker, {
    props: { projectId: "site" },
    attachTo: document.body,
  });
  return { store, wrapper };
}

async function openMenu(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('[data-testid="changes-menu"]').trigger("click");
  await flushPromises();
}

describe("ChangesBranchPicker", () => {
  it("always offers Live site in the menu", async () => {
    const { wrapper } = mountPicker();
    await openMenu(wrapper);
    const live = document.body.querySelector('[data-testid="live-site"]');
    expect(live?.textContent).toContain("Live site");
    expect(live?.textContent).toContain("main");
  });

  it("returns to the live site when Live site is chosen", async () => {
    const { store, wrapper } = mountPicker();
    const goLive = vi.spyOn(store, "goLive").mockResolvedValue();
    await openMenu(wrapper);
    document.body.querySelector<HTMLElement>('[data-testid="live-site"]')!.click();
    await flushPromises();
    expect(goLive).toHaveBeenCalledWith("site");
  });

  it("marks Live site selected when there is no active change", async () => {
    const { wrapper } = mountPicker({ active: null });
    expect(wrapper.get('[data-testid="active-change"]').text()).toBe("main");
    await openMenu(wrapper);
    const check = document.body.querySelector('[data-testid="live-site"] svg');
    expect(check?.classList.contains("opacity-100")).toBe(true);
  });

  it("uses a command search field to filter changes", async () => {
    const { wrapper } = mountPicker();
    await openMenu(wrapper);
    const search = document.body.querySelector<HTMLInputElement>('[data-testid="changes-search"]');
    expect(search).toBeTruthy();
    expect(search?.placeholder).toBe("Search changes…");
    // The search field filters a listbox of changes (the command palette).
    expect(search?.closest('[role="listbox"], :has([role="listbox"])')?.querySelector('[data-testid="change-item"], [data-testid="live-site"]')).toBeTruthy();
  });

  it("creates a change through the API instead of asking the agent", async () => {
    const createChange = vi.fn(async () => ({
      branch: "content/seo-audit",
      title: "SEO audit",
      lastEdited: null,
    }));
    h.daemon = createFakeDaemon({
      listChanges: vi.fn(async () => []),
      createChange,
      tree: vi.fn(async () => ({ entries: [] })),
      getActiveChange: vi.fn(async () => ({
        branch: "content/seo-audit",
        title: "SEO audit",
        lastEdited: null,
      })),
      listChats: vi.fn(async () => []),
      listProviders: vi.fn(async () => ({ providers: [] })),
    });
    setActivePinia(createPinia());
    useChangesStore().active = { branch: "main", title: "main" };
    const wrapper = mount(ChangesBranchPicker, {
      props: { projectId: "site" },
      attachTo: document.body,
    });
    await openMenu(wrapper);
    document.body.querySelector<HTMLElement>('[data-testid="new-change"]')!.click();
    await flushPromises();

    const input = document.body.querySelector("[role=dialog] input") as HTMLInputElement;
    expect(input).toBeTruthy();
    input.value = "SEO audit";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    (document.body.querySelector("[role=dialog] button[type=submit]") as HTMLButtonElement).click();
    await flushPromises();

    expect(createChange).toHaveBeenCalledWith("site", "SEO audit");
    wrapper.unmount();
  });

  describe("deleting a change", () => {
    const OPEN = { branch: "content/draft", title: "Draft", prState: "draft" as const };

    function mountWithChanges(deleteChange = vi.fn(async () => ({ branch: "main", closedPr: 7 }))) {
      const api = {
        listChanges: vi.fn(async () => [{ branch: "content/lw", title: "LW" }, OPEN]),
        deleteChange,
        changeStatus: vi.fn(async () => null),
        changeHasEdits: vi.fn(async () => true),
        tree: vi.fn(async () => []),
        liveUrl: vi.fn(async () => null),
      };
      return { ...mountPicker({ api }), deleteChange };
    }

    function rowDelete(branch: string) {
      return document.body.querySelector<HTMLElement>(
        `[data-testid="change-item"][data-branch="${branch}"] [data-testid="change-delete"]`,
      );
    }

    it("offers delete on change rows only, not on Live site", async () => {
      const { wrapper } = mountWithChanges();
      await openMenu(wrapper);
      expect(rowDelete("content/draft")).not.toBeNull();
      expect(document.body.querySelector('[data-testid="live-site"] [data-testid="change-delete"]')).toBeNull();
    });

    it("asks before deleting, without switching to the change", async () => {
      const { store, wrapper, deleteChange } = mountWithChanges();
      const switchTo = vi.spyOn(store, "switchTo");
      await openMenu(wrapper);
      rowDelete("content/draft")!.click();
      await flushPromises();
      expect(switchTo).not.toHaveBeenCalled();
      expect(deleteChange).not.toHaveBeenCalled();
      const dialog = document.body.querySelector('[data-testid="delete-change"]');
      expect(dialog?.textContent).toContain("Delete “Draft”?");
      expect(document.body.querySelector('[data-testid="delete-change-closes-pr"]')).not.toBeNull();

      document.body.querySelector<HTMLElement>('[data-testid="delete-change-confirm"]')!.click();
      await flushPromises();
      expect(deleteChange).toHaveBeenCalledWith("site", "content/draft");
      expect(store.items.map((c) => c.branch)).toEqual(["content/lw"]);
      expect(store.active?.branch).toBe("content/lw");
    });

    it("cancel leaves the change alone", async () => {
      const { wrapper, deleteChange } = mountWithChanges();
      await openMenu(wrapper);
      rowDelete("content/draft")!.click();
      await flushPromises();
      document.body.querySelector<HTMLElement>('[data-testid="delete-change-cancel"]')!.click();
      await flushPromises();
      expect(deleteChange).not.toHaveBeenCalled();
      expect(document.body.querySelector('[data-testid="delete-change"]')).toBeNull();
    });

    it("keeps the dialog open and reports a refusal", async () => {
      const refuse = vi.fn(async () => {
        throw new Error("You don't have permission to close this change's pull request");
      });
      const { store, wrapper } = mountWithChanges(refuse);
      await openMenu(wrapper);
      rowDelete("content/draft")!.click();
      await flushPromises();
      document.body.querySelector<HTMLElement>('[data-testid="delete-change-confirm"]')!.click();
      await flushPromises();
      expect(h.toastError).toHaveBeenCalledWith("You don't have permission to close this change's pull request");
      expect(document.body.querySelector('[data-testid="delete-change"]')).not.toBeNull();
      expect(store.items.map((c) => c.branch)).toContain("content/draft");
    });
  });
});
