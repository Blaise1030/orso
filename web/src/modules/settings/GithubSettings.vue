<script setup lang="ts">
// App settings → GitHub. Git and the GitHub tools are optional for local work;
// signing in only matters when a site is shared or published. orso signs in to
// GitHub through the GitHub CLI: the guide shows the Terminal commands to install
// it and run `gh auth login`, and ticks off each step once it's done.
import { computed, onMounted, ref, watch } from "vue";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UIcon from "@nuxt/ui/components/Icon.vue";
import GhGuide from "@/modules/github/GhGuide.vue";
import { toast } from "@/lib/toast";
import { useGithubStore } from "@/modules/github/store";
import SettingsRow from "./SettingsRow.vue";
import SettingsSection from "./SettingsSection.vue";

const gh = useGithubStore();

const checking = ref(false);

const status = computed(() => gh.setup);
const githubSignedIn = computed(() => gh.user != null || status.value?.githubSignedIn === true);
const loading = computed(() => !status.value && !gh.setupError);

/** The git and GitHub-tools rows share one shape; the guide below says how to get them. */
const tools = computed(() => [
  {
    id: "git",
    icon: "i-hugeicons-git-branch",
    title: "Git",
    description: "Keeps the history of every change to your sites.",
    ready: status.value?.git === true,
  },
  {
    id: "tools",
    icon: "i-hugeicons-git-pull-request",
    title: "GitHub tools",
    description: "Connects your sites to GitHub.",
    ready: status.value?.gh === true,
  },
]);

async function recheck() {
  checking.value = true;
  try {
    await gh.loadSetup();
  } finally {
    checking.value = false;
  }
}

// A failed check is a toast with Check again, not an inline alert.
watch(
  () => gh.setupError,
  (failed) => {
    if (failed) {
      toast.error("We couldn't check GitHub just now", {
        id: "github-setup-check",
        description: "Make sure orso is still running, then check again.",
        duration: 0,
        actions: [{ label: "Check again", onClick: () => void recheck() }],
      });
    } else {
      toast.dismiss("github-setup-check");
    }
  },
);

onMounted(() => {
  if (!gh.setup) void recheck();
});
</script>

<template>
  <SettingsSection label="Account" icon="i-hugeicons-user-circle" data-testid="github-settings">
    <template #actions>
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-hugeicons-refresh"
        loading-icon="i-hugeicons-refresh"
        label="Recheck"
        :loading="checking"
        :disabled="checking"
        data-testid="github-settings-recheck"
        @click="recheck"
      />
    </template>

    <p
      v-if="loading"
      class="text-muted flex items-center gap-2 p-4 text-sm"
      data-testid="github-settings-loading"
    >
      <UIcon name="i-hugeicons-loading-03" class="size-3.5 animate-spin" /> Checking your setup…
    </p>

    <template v-else-if="status">
      <SettingsRow
        v-for="tool in tools"
        :key="tool.id"
        :icon="tool.icon"
        :description="tool.description"
        :data-testid="`github-settings-${tool.id}`"
      >
        <template #title>
          <UIcon
            :name="tool.ready ? 'i-hugeicons-checkmark-circle-02' : 'i-hugeicons-alert-circle'"
            :class="tool.ready ? 'text-success' : 'text-muted'"
            class="size-3.5"
          />
          {{ tool.title }}
        </template>
        <template #actions>
          <UBadge
            color="neutral"
            :variant="tool.ready ? 'subtle' : 'outline'"
            :label="tool.ready ? 'Ready' : 'Optional'"
          />
        </template>
      </SettingsRow>

      <SettingsRow icon="i-hugeicons-user-circle" data-testid="github-settings-account">
        <template #title>
          <UIcon
            :name="githubSignedIn ? 'i-hugeicons-checkmark-circle-02' : 'i-hugeicons-alert-circle'"
            :class="githubSignedIn ? 'text-success' : 'text-muted'"
            class="size-3.5"
          />
          GitHub account
        </template>
        <template #description>
          <template v-if="githubSignedIn">
            <template v-if="gh.user">Signed in as {{ gh.user.login }}. </template>
            <template v-else>You're signed in to GitHub. </template>
            Share previews and publish when you are ready.
          </template>
          <template v-else>Sign in so orso can open your sites and share your changes. Follow the steps below.</template>
        </template>

        <template #actions>
          <UBadge
            color="neutral"
            :variant="githubSignedIn ? 'subtle' : 'outline'"
            :label="githubSignedIn ? 'Ready' : 'Optional'"
          />
        </template>
      </SettingsRow>

      <div v-if="!githubSignedIn || tools.some((tool) => !tool.ready)" class="p-4">
        <GhGuide />
      </div>
    </template>
  </SettingsSection>
</template>
