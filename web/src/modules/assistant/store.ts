import { defineStore } from "pinia";
import { computed, onScopeDispose, ref, watch } from "vue";
import { useDaemon } from "@/core/daemon";
import type {
  RuntimePhase,
  RuntimeStatus,
  SetupProvider,
  SetupRuntimeEvent,
  SetupSnapshot,
  SetupStatus,
} from "@/core/types";
import { errorMessage } from "@orso/utils";
import { toast } from "@/lib/toast";
import { GUIDE_POLL_MS } from "./install";
import { PROVIDER_NAMES, buildRows, orderIds, orderProviders, siteBuilderRow } from "./rows";

const PHASES: readonly RuntimePhase[] = [
  "notDownloaded",
  "downloading",
  "finishing",
  "ready",
  "downloadError",
  "updateAvailable",
];

/** One toast id for "couldn't check your setup", shared with the onboarding screen. */
export const SETUP_CHECK_TOAST = "setup-check";

/** "Couldn't check your setup": sticky, with a "Check again" that re-runs the check. */
export function toastSetupCheckFailed(recheck: () => void) {
  toast.error("We couldn't check your setup just now", {
    id: SETUP_CHECK_TOAST,
    description: "Make sure orso is still running, then check again.",
    duration: 0,
    actions: [{ label: "Check again", onClick: recheck }],
  });
}

const EMPTY_RUNTIME: RuntimeStatus = {
  phase: "notDownloaded",
  version: null,
  source: null,
  progress: null,
  message: null,
};

/** The node + assistant state both setup endpoints describe. */
export interface AssistantSnapshot {
  node: RuntimeStatus | null;
  providers: SetupProvider[];
}

function isRuntimeStatus(value: unknown): value is RuntimeStatus {
  return (
    typeof value === "object" &&
    value !== null &&
    "phase" in value &&
    PHASES.includes((value as RuntimeStatus).phase)
  );
}

/**
 * Fold the runtime snapshot into one status entry. Names and older fields stay
 * from `/status`; download and readiness fields come from `/runtimes` when it
 * sends them. `signedIn: null` and `freeModels: false` are meaningful values,
 * so they win over the status copy.
 */
function mergeProvider(base: SetupProvider, update: SetupProvider): SetupProvider {
  return {
    ...base,
    name: base.name || update.name,
    available: base.available ?? update.available,
    runtime: update.runtime ?? base.runtime,
    installed: update.installed ?? base.installed,
    signedIn: update.signedIn !== undefined ? update.signedIn : base.signedIn,
    chatReady: update.chatReady ?? base.chatReady,
    freeModels: update.freeModels ?? base.freeModels,
    reason: update.reason !== undefined ? update.reason : base.reason,
  };
}

/**
 * Fold `GET /api/setup/runtimes` into `GET /api/setup/status`. The runtime
 * snapshot wins for download state; the status keeps names and older fields.
 * A daemon without `/runtimes` still yields a usable snapshot from `/status`.
 */
function mergeSnapshot(status: SetupStatus, runtimes: SetupSnapshot | null): AssistantSnapshot {
  if (!runtimes) return { node: status.node ?? null, providers: status.providers ?? [] };
  const extra = new Map((runtimes.providers ?? []).map((p) => [p.id, p] as const));
  const providers = (status.providers ?? []).map((provider) => {
    const runtime = extra.get(provider.id);
    return runtime ? mergeProvider(provider, runtime) : provider;
  });
  const known = new Set(providers.map((p) => p.id));
  for (const provider of runtimes.providers ?? []) {
    if (!known.has(provider.id)) providers.push(provider);
  }
  return { node: runtimes.node ?? status.node ?? null, providers };
}

/**
 * Assistant setup: what the daemon reports for each assistant (installed by the
 * user, signed in, ready to chat), the site-builder download, and which install
 * guides are open. Actions are optimistic so a row reacts
 * on click; daemon events (`setup.runtime`) then correct the snapshot.
 */
export const useAssistantStore = defineStore("assistant", () => {
  const daemon = useDaemon();

  const snapshot = ref<AssistantSnapshot | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  /**
   * The user's assistant order (App settings → Assistants), first choice first;
   * `null` until they reorder. The daemon keeps it, so it holds across browsers
   * and desktop relaunches; the first ready assistant in it starts new chats.
   */
  const order = ref<string[] | null>(null);

  const node = computed<RuntimeStatus | null>(() => snapshot.value?.node ?? null);
  const providers = computed<SetupProvider[]>(() => snapshot.value?.providers ?? []);
  /** Providers that can open a chat right now, in the user's order. */
  const chatReadyProviders = computed(() =>
    orderProviders(
      providers.value.filter((p) => p.chatReady === true),
      order.value,
    ),
  );
  /** OpenCode is the recommendation; fall back to the first ready assistant. */
  const recommended = computed<SetupProvider | null>(
    () =>
      providers.value.find((p) => p.id === "opencode") ??
      chatReadyProviders.value[0] ??
      providers.value[0] ??
      null,
  );
  const rows = computed(() => buildRows(providers.value, order.value));
  const siteBuilder = computed(() => siteBuilderRow(node.value));

  function runtimeFor(id: string): RuntimeStatus | null {
    if (id === "node") return snapshot.value?.node ?? null;
    return snapshot.value?.providers.find((p) => p.id === id)?.runtime ?? null;
  }

  function mergeRuntime(
    current: RuntimeStatus | null | undefined,
    patch: Partial<RuntimeStatus>,
  ): RuntimeStatus {
    return { ...EMPTY_RUNTIME, ...current, ...patch };
  }

  /** Replace runtime fields for `node` or one assistant, keeping event-only fields. */
  function patchRuntime(id: string, patch: Partial<RuntimeStatus>) {
    const current = snapshot.value;
    if (!current) return;
    if (id === "node") {
      snapshot.value = { ...current, node: mergeRuntime(current.node, patch) };
      return;
    }
    snapshot.value = {
      ...current,
      providers: current.providers.map((provider) => {
        if (provider.id !== id) return provider;
        const runtime = mergeRuntime(provider.runtime, patch);
        const installed =
          runtime.phase === "ready" || runtime.phase === "updateAvailable"
            ? true
            : provider.installed;
        return { ...provider, runtime, installed };
      }),
    };
  }

  function patchProvider(id: string, patch: Partial<SetupProvider>) {
    const current = snapshot.value;
    if (!current) return;
    snapshot.value = {
      ...current,
      providers: current.providers.map((provider) =>
        provider.id === id ? { ...provider, ...patch } : provider,
      ),
    };
  }

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const [status, runtimes] = await Promise.all([
        daemon.api.setupStatus(),
        // An older daemon has no runtime snapshot; the status alone is enough.
        Promise.resolve()
          .then(() => daemon.api.setupRuntimes())
          .catch(() => null as SetupSnapshot | null),
      ]);
      snapshot.value = mergeSnapshot(status, runtimes);
      order.value = status.assistantOrder?.length ? status.assistantOrder : null;
      toast.dismiss(SETUP_CHECK_TOAST);
    } catch (e) {
      error.value = errorMessage(e);
      toastSetupCheckFailed(() => void load());
    } finally {
      loading.value = false;
    }
  }

  /** Sort ids (any provider list) into the user's order; with none saved they stay as given. */
  function ordered(ids: readonly string[]): string[] {
    return order.value ? orderIds(ids, order.value) : [...ids];
  }

  /**
   * Save a new assistant order. The list reorders at once; if the daemon refuses,
   * it goes back to the order it had and says so.
   */
  async function setOrder(ids: string[]) {
    const before = order.value;
    order.value = [...ids];
    try {
      await daemon.api.saveAssistantOrder(ids);
    } catch (e) {
      order.value = before;
      toast.error(`Couldn't save the assistant order: ${errorMessage(e)}`);
    }
  }

  /** Start a download, or retry a failed one; the row reacts before the POST resolves. */
  async function runDownload(id: string, call: () => Promise<RuntimeStatus>) {
    patchRuntime(id, { phase: "downloading", progress: 0, message: null });
    try {
      const result = await call();
      if (isRuntimeStatus(result)) patchRuntime(id, result);
    } catch (e) {
      patchRuntime(id, { phase: "downloadError", progress: null, message: errorMessage(e) });
    }
  }

  async function download(id: string) {
    await runDownload(id, () => daemon.api.downloadRuntime(id));
  }

  async function retry(id: string) {
    await runDownload(id, () => daemon.api.retryRuntime(id));
  }

  /** Stop a download; the daemon restores the previous ready copy, if any. */
  async function cancel(id: string) {
    const current = runtimeFor(id);
    // A ready/update copy has a version; a first download has nothing to fall back to.
    const hadCopy =
      current?.version != null || current?.phase === "ready" || current?.phase === "updateAvailable";
    patchRuntime(id, {
      phase: hadCopy ? "ready" : "notDownloaded",
      progress: null,
      message: null,
    });
    try {
      const result = await daemon.api.cancelRuntime(id);
      if (isRuntimeStatus(result)) patchRuntime(id, result);
    } catch (e) {
      // Keep the optimistic state; the next snapshot or event corrects it.
      patchRuntime(id, { message: errorMessage(e) });
    }
  }

  /** Check that an assistant can actually start a chat. */
  async function verify(id: string) {
    try {
      const result = await daemon.api.verifyProvider(id);
      patchProvider(id, { chatReady: result.chatReady, reason: result.reason ?? null });
    } catch (e) {
      const message = errorMessage(e);
      patchProvider(id, { chatReady: false, reason: message });
      error.value = message;
    }
  }

  /**
   * Install guides the user has open, by provider id. orso does not download the
   * assistants or run their sign-in: the guide shows the CLI's own commands to
   * run in Terminal, and the store polls setup status while any guide is open so
   * the row turns ready on its own once the user has finished.
   */
  const guides = ref<string[]>([]);

  function openGuide(id: string) {
    if (!guides.value.includes(id)) guides.value = [...guides.value, id];
  }

  function closeGuide(id: string) {
    guides.value = guides.value.filter((open) => open !== id);
  }

  function guideOpen(id: string): boolean {
    return guides.value.includes(id);
  }

  let guidePoll: ReturnType<typeof setInterval> | null = null;

  function stopGuidePoll() {
    if (guidePoll !== null) clearInterval(guidePoll);
    guidePoll = null;
  }

  watch(
    () => guides.value.length > 0,
    (polling) => {
      if (polling && guidePoll === null) {
        guidePoll = setInterval(() => {
          if (!loading.value) void load();
        }, GUIDE_POLL_MS);
      } else if (!polling) {
        stopGuidePoll();
      }
    },
  );

  // A guided assistant that turns ready closes its guide and says so.
  // OpenCode can report chatReady while Console still needs reconnect — only
  // celebrate when signedIn is true for that assistant.
  watch(providers, (next) => {
    for (const id of guides.value) {
      const provider = next.find((p) => p.id === id);
      if (!provider?.chatReady) continue;
      if (id === "opencode" && provider.signedIn !== true) continue;
      closeGuide(id);
      toast.success(`${nameOf(id)} is ready`, { id: `guide-${id}` });
    }
  });

  async function signOut(id: string) {
    try {
      await daemon.api.signOutProvider(id);
      const provider = providers.value.find((p) => p.id === id);
      patchProvider(id, {
        signedIn: false,
        // OpenCode free models still need Console login before chat works.
        chatReady: false,
        reason: null,
      });
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  /** Merge one live download event; fields the event omits keep their snapshot value. */
  function applyRuntimeEvent(event: SetupRuntimeEvent) {
    if (event.runtime !== "node" && !providers.value.some((p) => p.id === event.runtime)) return;
    const patch: Partial<RuntimeStatus> = { phase: event.phase };
    if (event.version !== undefined) patch.version = event.version;
    if (event.source !== undefined) patch.source = event.source;
    if (event.progress !== undefined) patch.progress = event.progress;
    if (event.message !== undefined) patch.message = event.message;
    patchRuntime(event.runtime, patch);
  }

  function nameOf(id: string): string {
    if (id === "node") return "the site builder";
    return providers.value.find((p) => p.id === id)?.name || PROVIDER_NAMES[id] || id;
  }

  /**
   * Download failures are toasts. The row (or onboarding CTA) already says
   * "Download failed" with a Retry button; the toast adds what went wrong.
   * One toast per failure: it comes back only after the runtime leaves the
   * error phase and fails again.
   */
  const failedDownloads = new Set<string>();
  watch(
    snapshot,
    (next) => {
      const runtimes: [string, RuntimeStatus | undefined][] = [
        ["node", next?.node ?? undefined],
        ...(next?.providers ?? []).map((p) => [p.id, p.runtime] as [string, RuntimeStatus | undefined]),
      ];
      for (const [id, runtime] of runtimes) {
        if (runtime?.phase !== "downloadError") {
          if (failedDownloads.delete(id)) toast.dismiss(`download-${id}`);
          continue;
        }
        if (failedDownloads.has(id)) continue;
        failedDownloads.add(id);
        toast.error(`We couldn't download ${nameOf(id)}`, {
          id: `download-${id}`,
          description: runtime.message
            ? `Check your connection and try again. (${runtime.message})`
            : "Check your connection and try again.",
          actions: [{ label: "Retry", onClick: () => void retry(id) }],
        });
      }
    },
    { immediate: true },
  );

  const offs = [
    daemon.on("setup.runtime", applyRuntimeEvent),
    daemon.onReconnected(() => void load()),
    daemon.on("events.lagged", () => void load()),
  ];
  onScopeDispose(() => {
    offs.forEach((off) => off());
    stopGuidePoll();
  });

  return {
    snapshot,
    loading,
    error,
    guides,
    order,
    node,
    providers,
    chatReadyProviders,
    recommended,
    rows,
    siteBuilder,
    load,
    ordered,
    setOrder,
    download,
    retry,
    cancel,
    verify,
    signOut,
    openGuide,
    closeGuide,
    guideOpen,
  };
});
