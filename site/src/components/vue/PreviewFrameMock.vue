<script setup lang="ts">
import { ref } from "vue";
import UButton from "@nuxt/ui/components/Button.vue";

const props = defineProps<{
  desktopLabel: string;
  mobileLabel: string;
  pageTitle: string;
  pageBody: string;
  url: string;
}>();

const device = ref<"desktop" | "mobile">("desktop");
</script>

<template>
  <div
    class="flex size-full min-h-0 flex-col gap-2 overflow-hidden rounded-md border border-line bg-surface-raised p-3 shadow-raised"
    aria-hidden="true"
    @click.prevent
    @keydown.prevent
  >
    <div class="flex shrink-0 items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-1.5 rounded-md border border-line bg-sand px-2 py-1">
        <span class="size-1.5 rounded-full bg-status-danger" />
        <span class="size-1.5 rounded-full bg-status-draft" />
        <span class="size-1.5 rounded-full bg-status-live" />
        <span class="ml-1 truncate font-mono text-label text-muted">{{ props.url }}</span>
      </div>
      <div class="flex shrink-0 gap-1">
        <UButton
          size="xs"
          color="neutral"
          :variant="device === 'desktop' ? 'soft' : 'ghost'"
          icon="i-hugeicons-computer"
          :label="props.desktopLabel"
          tabindex="-1"
          @click="device = 'desktop'"
        />
        <UButton
          size="xs"
          color="neutral"
          :variant="device === 'mobile' ? 'soft' : 'ghost'"
          icon="i-hugeicons-smart-phone-01"
          :label="props.mobileLabel"
          tabindex="-1"
          @click="device = 'mobile'"
        />
      </div>
    </div>

    <div class="flex min-h-0 flex-1 justify-center overflow-hidden">
      <div
        class="flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface transition-[width] duration-gentle"
        :class="device === 'mobile' ? 'w-[9.5rem]' : 'w-full'"
      >
        <div class="border-b border-line px-3 py-2">
          <div class="h-2 w-1/3 rounded-full bg-sand" />
        </div>
        <div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <p class="text-small font-medium text-ink">{{ props.pageTitle }}</p>
          <p class="text-label leading-5 text-muted">{{ props.pageBody }}</p>
          <div class="mt-1 h-16 rounded-md bg-sand" />
          <div class="h-2 w-4/5 rounded-full bg-sand" />
          <div class="h-2 w-3/5 rounded-full bg-sand" />
        </div>
      </div>
    </div>
  </div>
</template>
