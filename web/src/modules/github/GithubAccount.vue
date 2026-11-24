<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { toast } from "@/lib/toast";
import UAvatar from "@nuxt/ui/components/Avatar.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UDropdownMenu from "@nuxt/ui/components/DropdownMenu.vue";
import type { DropdownMenuItem } from "@nuxt/ui";
import { useDaemon } from "@/core/daemon";
import { errorMessage } from "@orso/utils";
import { useGithubStore } from "./store";

/**
 * `rail`: a larger avatar, an icon-only button, and a menu opening to the right, for the project sidebar.
 * Signed out, the button opens Settings → GitHub, whose guide walks through installing the GitHub
 * CLI and running `gh auth login` in Terminal (orso has no GitHub sign-in of its own).
 */
const props = defineProps<{ rail?: boolean }>();

/** Settings → GitHub, where the GitHub guide lives. */
const CONNECT_TO = { path: "/settings", query: { tab: "github" } };

const gh = useGithubStore();

const daemon = useDaemon();
/** The daemon answered `/api/github/status`; older daemons without it keep the control hidden. */
const loaded = ref(false);

// Load once the daemon is reachable (and again after a reconnect).
watch(
  daemon.status,
  (s) => {
    if (s !== "open") return;
    gh.load()
      .then(() => (loaded.value = true))
      .catch(() => {
        // Older daemons have no /api/github: keep the control hidden.
      });
  },
  { immediate: true },
);

watch(
  () => gh.error,
  (e) => {
    if (e) toast.error(e);
  },
);

async function signOut() {
  try {
    await gh.signOut();
  } catch (e) {
    toast.error(`Sign-out failed: ${errorMessage(e)}`);
  }
}

const menuItems = computed<DropdownMenuItem[]>(() => {
  const items: DropdownMenuItem[] = [];
  if (gh.source === "cli") {
    items.push({ label: "Signed in with GitHub CLI (gh)", disabled: true });
  } else {
    items.push({ label: "Sign out", icon: "i-hugeicons-logout-03", onSelect: () => void signOut() });
  }
  items.push({
    label: "Settings",
    icon: "i-hugeicons-settings-01",
    to: "/settings",
    "data-testid": "github-settings",
  });
  return items;
});

const menuContent = computed(() => ({
  side: props.rail ? ("right" as const) : ("bottom" as const),
  align: "end" as const,
}));
</script>

<template>
  <template v-if="loaded || gh.user">
    <UDropdownMenu v-if="gh.user" :items="menuItems" :content="menuContent">
      <UButton
        color="neutral"
        variant="ghost"
        square
        class="justify-center rounded-full p-0"
        :class="rail ? 'size-9' : 'size-7'"
        :title="gh.user.name || gh.user.login"
        data-testid="github-account"
      >
        <UAvatar :src="gh.user.avatarUrl" alt="" :size="rail ? 'sm' : '2xs'" />
        <span class="sr-only">{{ gh.user.name || gh.user.login }}</span>
      </UButton>
    </UDropdownMenu>
    <UButton
      v-else-if="rail"
      color="neutral"
      variant="ghost"
      square
      class="size-9 justify-center"
      icon="i-hugeicons-login-03"
      title="Connect GitHub"
      aria-label="Connect GitHub"
      data-testid="github-sign-in"
      :to="CONNECT_TO"
    />
    <UButton
      v-else
      color="neutral"
      variant="outline"
      size="sm"
      icon="i-hugeicons-login-03"
      label="Connect GitHub"
      data-testid="github-sign-in"
      :to="CONNECT_TO"
    />
  </template>
</template>
