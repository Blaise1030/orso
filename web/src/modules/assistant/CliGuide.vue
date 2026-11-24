<script setup lang="ts">
// The install guide for one assistant: the vendor's own Terminal commands to
// install it and sign in, each ticked off once the daemon sees it done. orso
// never downloads the assistant or runs its sign-in itself: "Run in Terminal"
// opens Terminal running the vendor's command. The store polls while a guide is
// open, so the steps tick off by themselves. Presentational: the
// parent owns the store and passes `checking` / handles `recheck`.
import { computed } from "vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UIcon from "@nuxt/ui/components/Icon.vue";
import CommandBlock from "@/components/CommandBlock.vue";
import { installGuide } from "./install";
import type { AssistantRow } from "./rows";

const props = defineProps<{
  row: AssistantRow;
  /** A recheck is running. */
  checking?: boolean;
  /** Shown inside the assistant's card: no card of its own, just a divider above. */
  embedded?: boolean;
}>();

const emit = defineEmits<{ recheck: [] }>();

const guide = computed(() => installGuide(props.row.id));
const installed = computed(() => props.row.phase === "ready" || props.row.phase === "updateAvailable");
const signedIn = computed(() => !guide.value?.signIn || props.row.provider.signedIn === true);
/** Installed and signed in, but the chat check still fails: say why. */
const stuckReason = computed(() =>
  installed.value && signedIn.value && !props.row.chatReady ? props.row.provider.reason : null,
);
</script>

<template>
  <section
    v-if="guide"
    class="flex flex-col gap-4 text-sm"
    :class="
      embedded
        ? 'border-default text-default border-t pt-4'
        : 'border-default bg-default rounded-lg border p-4'
    "
    :aria-label="`Set up ${row.name}`"
    :data-testid="`assistant-guide-${row.id}`"
  >
    <ol class="flex flex-col gap-4">
      <!-- 1. Install -->
      <li class="flex gap-3" :data-done="installed ? 'true' : undefined" :data-testid="`assistant-guide-install-${row.id}`">
        <span
          class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-medium"
          :class="installed ? 'bg-success/15 text-success' : 'bg-elevated text-muted'"
          aria-hidden="true"
        >
          <UIcon v-if="installed" name="i-hugeicons-tick-02" class="size-3.5" />
          <template v-else>1</template>
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <p class="text-highlighted font-medium">
            {{ installed ? `${row.name} is installed` : `Install ${row.name}` }}
          </p>
          <template v-if="!installed">
            <p class="text-muted">orso opens Terminal and runs {{ row.name }}'s installer:</p>
            <CommandBlock
              runnable
              :command="guide.install"
              what="the install command"
              :copy-testid="`assistant-guide-copy-install-${row.id}`"
            />
            <a
              :href="guide.docsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted hover:text-default self-start text-xs underline"
            >
              Other ways to install {{ row.name }}
            </a>
          </template>
        </div>
      </li>

      <!-- 2. Sign in -->
      <li
        v-if="guide.signIn"
        class="flex gap-3"
        :data-done="signedIn ? 'true' : undefined"
        :data-testid="`assistant-guide-sign-in-${row.id}`"
      >
        <span
          class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-medium"
          :class="signedIn ? 'bg-success/15 text-success' : 'bg-elevated text-muted'"
          aria-hidden="true"
        >
          <UIcon v-if="signedIn" name="i-hugeicons-tick-02" class="size-3.5" />
          <template v-else>2</template>
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <p class="text-highlighted font-medium">
            {{ signedIn ? `Signed in to ${row.name}` : `Sign in to ${row.name}` }}
          </p>
          <template v-if="!signedIn">
            <p class="text-muted">
              {{ installed ? "Run this" : "Then run this" }} in Terminal, and finish signing in on the page
              that opens in your browser:
            </p>
            <CommandBlock
              runnable
              :command="guide.signIn"
              what="the sign-in command"
              :copy-testid="`assistant-guide-copy-sign-in-${row.id}`"
            />
          </template>
        </div>
      </li>
      <li v-else class="text-muted flex gap-3">
        <span class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>No account needed: {{ row.name }} starts with free models.</p>
      </li>
    </ol>

    <div class="border-default flex flex-wrap items-center justify-between gap-2 border-t pt-3">
      <p class="text-muted flex min-w-0 items-center gap-1.5 text-xs" aria-live="polite">
        <template v-if="stuckReason">{{ stuckReason }}</template>
        <template v-else>
          <UIcon name="i-hugeicons-loading-03" class="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
          orso checks for you every few seconds.
        </template>
      </p>
      <UButton
        color="neutral"
        variant="outline"
        size="xs"
        icon="i-hugeicons-refresh"
        label="Check again"
        :loading="checking"
        :disabled="checking"
        :data-testid="`assistant-guide-recheck-${row.id}`"
        @click="emit('recheck')"
      />
    </div>
  </section>
</template>
