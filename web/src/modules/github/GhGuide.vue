<script setup lang="ts">
// Connect GitHub through the GitHub CLI the user installs and signs in to in
// Terminal. orso does not run a sign-in of its own: it uses `gh` for GitHub
// calls and git credentials, and polls setup status while this guide is shown
// so each step ticks off once it's done.
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UIcon from "@nuxt/ui/components/Icon.vue";
import CommandBlock from "@/components/CommandBlock.vue";
import { GH_COMMANDS, GH_GUIDE_POLL_MS } from "./guide";
import { useGithubStore } from "./store";
import { freshHidesGithubUser, freshStatus } from "@/app/freshSetup";

const gh = useGithubStore();
const checking = ref(false);

/** Dev fresh setup pretends the tools and sign-in aren't done yet. */
const setup = computed(() => (gh.setup ? freshStatus(gh.setup) : null));
const gitReady = computed(() => setup.value?.git !== false);
const ghReady = computed(() => setup.value?.gh === true);
const signedIn = computed(
  () => (gh.user != null && !freshHidesGithubUser()) || setup.value?.githubSignedIn === true,
);
const done = computed(() => gitReady.value && ghReady.value && signedIn.value);

interface Step {
  id: "git" | "install" | "sign-in";
  title: string;
  doneTitle: string;
  ready: boolean;
}

const steps = computed<Step[]>(() => [
  ...(gitReady.value
    ? []
    : [{ id: "git" as const, title: "Install Git", doneTitle: "Git is installed", ready: false }]),
  { id: "install", title: "Install the GitHub tools", doneTitle: "The GitHub tools are installed", ready: ghReady.value },
  { id: "sign-in", title: "Sign in to GitHub", doneTitle: "Signed in to GitHub", ready: signedIn.value },
]);

async function recheck() {
  if (checking.value) return;
  checking.value = true;
  try {
    await gh.loadSetup();
  } finally {
    checking.value = false;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

function stop() {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

onMounted(() => {
  if (!gh.setup) void recheck();
});
watch(
  done,
  (finished) => {
    if (finished) stop();
    else if (timer === null) timer = setInterval(() => void recheck(), GH_GUIDE_POLL_MS);
  },
  { immediate: true },
);
onBeforeUnmount(stop);
</script>

<template>
  <section
    v-if="!done"
    class="border-default bg-default flex flex-col gap-4 rounded-lg border p-4 text-sm"
    aria-label="Connect GitHub"
    data-testid="github-guide"
  >
    <ol class="flex flex-col gap-4">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        class="flex gap-3"
        :data-done="step.ready ? 'true' : undefined"
        :data-testid="`github-guide-${step.id}`"
      >
        <span
          class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-medium"
          :class="step.ready ? 'bg-success/15 text-success' : 'bg-elevated text-muted'"
          aria-hidden="true"
        >
          <UIcon v-if="step.ready" name="i-hugeicons-tick-02" class="size-3.5" />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <p class="text-highlighted font-medium">{{ step.ready ? step.doneTitle : step.title }}</p>

          <template v-if="!step.ready && step.id === 'git'">
            <p class="text-muted">Run this in Terminal, then follow the window that opens:</p>
            <CommandBlock runnable :command="GH_COMMANDS.git" what="the Git install command" copy-testid="github-guide-copy-git" />
          </template>

          <template v-else-if="!step.ready && step.id === 'install'">
            <p class="text-muted">{{ gitReady && index === 0 ? "Run this in Terminal:" : "Then run:" }}</p>
            <CommandBlock runnable :command="GH_COMMANDS.install" what="the install command" copy-testid="github-guide-copy-install" />
            <a
              href="https://cli.github.com"
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted hover:text-default self-start text-xs underline"
            >
              No Homebrew? Download the installer from GitHub
            </a>
          </template>

          <template v-else-if="!step.ready && step.id === 'sign-in'">
            <p class="text-muted">
              {{ ghReady ? "Run this in Terminal" : "Then run this" }}. It shows a one-time code: press
              Enter to open GitHub in your browser, and paste the code there.
            </p>
            <CommandBlock runnable :command="GH_COMMANDS.signIn" what="the sign-in command" copy-testid="github-guide-copy-sign-in" />
          </template>
        </div>
      </li>
    </ol>

    <div class="border-default flex flex-wrap items-center justify-between gap-2 border-t pt-3">
      <p class="text-muted flex min-w-0 items-center gap-1.5 text-xs" aria-live="polite">
        <UIcon name="i-hugeicons-loading-03" class="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
        orso checks for you every few seconds.
      </p>
      <UButton
        color="neutral"
        variant="outline"
        size="xs"
        icon="i-hugeicons-refresh"
        label="Check again"
        :loading="checking"
        :disabled="checking"
        data-testid="github-guide-recheck"
        @click="recheck"
      />
    </div>
  </section>
</template>
