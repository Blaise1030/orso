<script setup lang="ts">
import UAlert from "@nuxt/ui/components/Alert.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import { desktopUpdate, dismissDesktopUpdate } from "@/app/desktopUpdateStore";

const props = withDefaults(defineProps<{ openUrl?: (url: string) => void }>(), {
  openUrl: (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  },
});
</script>

<template>
  <UAlert
    v-if="desktopUpdate"
    color="neutral"
    variant="outline"
    icon="i-hugeicons-download-01"
    title="Update available"
    close
    class="bg-default fixed right-4 bottom-4 z-50 w-80 shadow-md"
    role="status"
    data-testid="update-notice"
  >
    <template #description>
      <p>orso v{{ desktopUpdate.version }} is ready to download.</p>
      <UButton
        size="sm"
        class="mt-2"
        data-testid="update-download"
        @click="props.openUrl(desktopUpdate.downloadUrl)"
      >
        Download update
      </UButton>
    </template>
    <template #close>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-hugeicons-cancel-01"
        aria-label="Dismiss"
        data-testid="update-dismiss"
        @click="dismissDesktopUpdate()"
      />
    </template>
  </UAlert>
</template>
