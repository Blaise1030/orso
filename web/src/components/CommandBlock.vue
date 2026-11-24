<script setup lang="ts">
// One Terminal command, used by the setup guides (assistants and GitHub). The
// command is shown as-is: it is the vendor's own command. "Run in Terminal" asks
// the daemon to open Terminal running it, so the user never pastes anything;
// copy stays for anyone who'd rather run it themselves.
import { inject, ref } from "vue";
import UButton from "@nuxt/ui/components/Button.vue";
import { errorMessage } from "@orso/utils";
import { useDaemon } from "@/core/daemon";
import { toast } from "@/lib/toast";
import { COMMAND_RUNNER } from "./commandRunner";

const props = defineProps<{
  command: string;
  /** What the copy button copies, for its label: "the install command". */
  what: string;
  /** `data-testid` for the copy button; the run button gets the same with `-run`. */
  copyTestid?: string;
  /** Offer "Run in Terminal" (the daemon must allow this command). */
  runnable?: boolean;
}>();

/** Onboarding runs commands in its built-in terminal; elsewhere they open the Terminal app. */
const runner = inject(COMMAND_RUNNER, null);

const copied = ref(false);
const opening = ref(false);
const opened = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;
let openTimer: ReturnType<typeof setTimeout> | undefined;

function copy() {
  void navigator.clipboard?.writeText(props.command).catch(() => {});
  copied.value = true;
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copied.value = false), 1500);
}

async function run() {
  if (runner) {
    runner(props.command);
    return;
  }
  if (opening.value) return;
  opening.value = true;
  try {
    await useDaemon().api.runInTerminal(props.command);
    opened.value = true;
    clearTimeout(openTimer);
    openTimer = setTimeout(() => (opened.value = false), 4000);
  } catch (e) {
    toast.error("Couldn't open Terminal", {
      description: `${errorMessage(e)} You can copy the command and run it in Terminal yourself.`,
    });
  } finally {
    opening.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="bg-elevated flex items-center gap-1 rounded-md">
      <code class="min-w-0 flex-1 overflow-x-auto px-3 py-2 font-mono text-xs whitespace-nowrap">{{ command }}</code>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        class="me-1"
        :icon="copied ? 'i-hugeicons-tick-02' : 'i-hugeicons-copy-01'"
        :aria-label="copied ? 'Copied' : `Copy ${what}`"
        :data-testid="copyTestid"
        @click="copy"
      />
    </div>
    <div v-if="runnable" class="flex flex-wrap items-center gap-2">
      <UButton
        size="sm"
        icon="i-hugeicons-command-line"
        :label="runner ? 'Run' : 'Run in Terminal'"
        :loading="opening"
        :disabled="opening"
        :data-testid="copyTestid ? `${copyTestid}-run` : undefined"
        @click="run"
      />
      <p v-if="opened" class="text-muted text-xs" aria-live="polite">
        Opened in Terminal. Follow the steps there.
      </p>
    </div>
  </div>
</template>
