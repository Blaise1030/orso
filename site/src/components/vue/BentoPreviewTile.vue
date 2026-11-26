<script setup lang="ts">
import { ref } from "vue";
import UButton from "@nuxt/ui/components/Button.vue";

const props = defineProps<{
  desktopLabel: string;
  mobileLabel: string;
  pageTitle: string;
}>();

const device = ref<"desktop" | "mobile">("desktop");
</script>

<template>
  <div class="flex size-full flex-col gap-3 p-4" aria-hidden="true" @click.prevent>
    <div class="flex gap-1">
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

    <div class="flex min-h-0 flex-1 items-end justify-center">
      <div
        class="flex flex-col overflow-hidden rounded-md border border-line bg-surface-raised shadow-raised transition-[width] duration-gentle"
        :class="device === 'mobile' ? 'h-[85%] w-[7.5rem]' : 'h-full w-full'"
      >
        <div class="flex gap-1 border-b border-line px-2.5 py-2">
          <span class="size-1.5 rounded-full bg-ridge" />
          <span class="size-1.5 rounded-full bg-ridge" />
          <span class="size-1.5 rounded-full bg-ridge" />
        </div>
        <div class="flex flex-1 flex-col gap-2 p-3">
          <p class="text-small font-medium text-ink">{{ props.pageTitle }}</p>
          <div class="h-2 w-4/5 rounded-full bg-sand" />
          <div class="h-2 w-3/5 rounded-full bg-sand" />
          <div class="mt-1 min-h-10 flex-1 rounded-md bg-sand" />
        </div>
      </div>
    </div>
  </div>
</template>
