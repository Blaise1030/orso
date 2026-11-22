// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import UpdateNotice from "./UpdateNotice.vue";
import { desktopUpdate, resetDesktopUpdateStore } from "./desktopUpdateStore";

afterEach(() => {
  resetDesktopUpdateStore();
});

describe("UpdateNotice", () => {
  it("stays hidden until an update is available", async () => {
    const w = mount(UpdateNotice);
    expect(w.find("[data-testid='update-notice']").exists()).toBe(false);

    desktopUpdate.value = {
      version: "1.2.3",
      downloadUrl: "https://github.com/Blaise1030/orso/releases/latest/download/orso-aarch64-apple-darwin.dmg",
    };
    await w.vm.$nextTick();
    const notice = w.find("[data-testid='update-notice']");
    expect(notice.exists()).toBe(true);
    expect(notice.text()).toContain("Update available");
    expect(notice.text()).toContain("1.2.3");
    w.unmount();
  });

  it("opens the download URL", async () => {
    const openUrl = vi.fn();
    desktopUpdate.value = {
      version: "1.2.3",
      downloadUrl: "https://example.com/orso.dmg",
    };
    const w = mount(UpdateNotice, { props: { openUrl } });
    await w.find("[data-testid='update-download']").trigger("click");
    expect(openUrl).toHaveBeenCalledWith("https://example.com/orso.dmg");
    w.unmount();
  });

  it("can be dismissed", async () => {
    desktopUpdate.value = {
      version: "1.2.3",
      downloadUrl: "https://example.com/orso.dmg",
    };
    const w = mount(UpdateNotice);
    await w.find("[data-testid='update-dismiss']").trigger("click");
    expect(w.find("[data-testid='update-notice']").exists()).toBe(false);
    expect(desktopUpdate.value).toBeNull();
    w.unmount();
  });
});
