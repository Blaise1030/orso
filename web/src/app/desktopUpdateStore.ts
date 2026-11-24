import { ref } from "vue";
import {
  checkForDesktopUpdate,
  dismissUpdate,
  type DesktopUpdateInfo,
} from "./desktopUpdateCheck";
import { isMacDesktop } from "@/lib/desktop";

/** Shared soft-update result for the toast and About settings. */
export const desktopUpdate = ref<DesktopUpdateInfo | null>(null);

let started = false;

/** Kick off a background check once per app load on macOS desktop. */
export function startDesktopUpdateCheck(currentVersion: string) {
  if (!isMacDesktop() || started) return;
  started = true;
  void checkForDesktopUpdate(currentVersion).then((info) => {
    desktopUpdate.value = info;
  });
}

export function dismissDesktopUpdate() {
  const current = desktopUpdate.value;
  if (!current) return;
  dismissUpdate(current.version);
  desktopUpdate.value = null;
}

/** Test helper. */
export function resetDesktopUpdateStore() {
  desktopUpdate.value = null;
  started = false;
}
