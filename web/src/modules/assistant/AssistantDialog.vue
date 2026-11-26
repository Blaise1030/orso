<script setup lang="ts">
// The "Set up your assistant" dialog. It is mounted once in App.vue and opened
// through `openAssistantSetup()`, so every entry point shares one dialog.
// Layout matches onboarding: assistants on the left, built-in terminal on the
// right so "Run" watches the vendor command here instead of opening Terminal.app.
import { provide, ref } from "vue";
import UIcon from "@nuxt/ui/components/Icon.vue";
import UModal from "@nuxt/ui/components/Modal.vue";
import SetupTerminal from "@/app/SetupTerminal.vue";
import { COMMAND_RUNNER } from "@/components/commandRunner";
import AssistantSetup from "./AssistantSetup.vue";
import { assistantDialogOpen, closeAssistantSetup } from "./dialog";
import { installGuide } from "./install";
import { PROVIDER_NAMES } from "./rows";
import { useAssistantStore } from "./store";

const emit = defineEmits<{
  /** The user picked a ready assistant; the caller opens a chat with it. */
  connect: [id: string];
}>();

const store = useAssistantStore();

/** Forwarded to the dialog panel, so the testid sits on the same element as before. */
const content = { "data-testid": "assistant-dialog" } as Record<string, string>;

const terminal = ref<InstanceType<typeof SetupTerminal> | null>(null);
const terminalLabel = ref<string | null>(null);
const terminalState = ref<"idle" | "running" | "done" | "failed">("idle");
const terminalStatus = ref<string | null>(null);

function labelFor(cmd: string): string | null {
  for (const id of ["opencode", "claude", "codex", "cursor"] as const) {
    const guide = installGuide(id);
    if (!guide) continue;
    const name = PROVIDER_NAMES[id] ?? id;
    if (guide.install === cmd) return `Installing ${name}`;
    if (guide.signIn === cmd) return `Signing in to ${name}`;
  }
  return null;
}

function runCommand(cmd: string) {
  terminalLabel.value = labelFor(cmd);
  terminal.value?.run(cmd);
}

provide(COMMAND_RUNNER, runCommand);

async function onTerminalExit(_cmd: string, code: number | null) {
  if (code !== 0) return;
  await store.load();
}

function onTerminalStatus(state: typeof terminalState.value, text: string | null) {
  terminalState.value = state;
  terminalStatus.value = text;
}

function onOpenChange(open: boolean) {
  assistantDialogOpen.value = open;
}

function onContinue() {
  closeAssistantSetup();
}

function onConnect(id: string) {
  emit("connect", id);
  closeAssistantSetup();
}
</script>

<template>
  <UModal
    :open="assistantDialogOpen"
    title="Set up your assistant"
    description="Download one here, then start chatting."
    :content="content"
    :ui="{
      content: 'sm:max-w-5xl',
      // Keep the body from scrolling; only the assistants column scrolls.
      body: 'flex min-h-0 overflow-hidden p-4 sm:p-6',
    }"
    @update:open="onOpenChange"
  >
    <template #body>
      <div
        class="flex h-[min(70dvh,36rem)] min-h-0 w-full flex-col gap-4 lg:flex-row"
        data-testid="assistant-dialog-split"
      >
        <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden lg:max-w-[50%]">
          <div
            class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            data-testid="assistant-dialog-list"
          >
            <AssistantSetup show-continue @continue="onContinue" @connect="onConnect" />
          </div>
          <p
            v-if="terminalStatus"
            class="text-muted flex min-w-0 shrink-0 items-center gap-2 text-xs"
            aria-live="polite"
            data-testid="assistant-dialog-terminal-status"
          >
            <UIcon
              v-if="terminalState === 'running'"
              name="i-hugeicons-loading-03"
              class="size-3.5 shrink-0 animate-spin"
              aria-hidden="true"
            />
            <UIcon
              v-else-if="terminalState === 'done'"
              name="i-hugeicons-checkmark-circle-02"
              class="text-success size-3.5 shrink-0"
              aria-hidden="true"
            />
            <UIcon
              v-else
              name="i-hugeicons-alert-circle"
              class="text-warning size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span class="truncate">{{ terminalStatus }}</span>
          </p>
        </div>

        <div
          class="h-[36vh] shrink-0 overflow-hidden lg:h-auto lg:min-h-0 lg:w-1/2 lg:flex-1"
          data-testid="assistant-dialog-terminal"
        >
          <SetupTerminal
            ref="terminal"
            :label="terminalLabel"
            class="h-full overflow-hidden rounded-lg shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)] ring-1 ring-black/10 dark:shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)] dark:ring-white/10"
            @exit="onTerminalExit"
            @status="onTerminalStatus"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
