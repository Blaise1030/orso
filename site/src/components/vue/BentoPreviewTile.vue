<script setup lang="ts">
import { ref } from "vue";
import UButton from "@nuxt/ui/components/Button.vue";
import { site } from "../../site";

const props = defineProps<{
  desktopLabel: string;
  mobileLabel: string;
  headline: string;
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

    <div class="flex min-h-0 flex-1 items-stretch justify-center">
      <div
        class="flex flex-col overflow-hidden rounded-md border border-line bg-surface-raised shadow-raised transition-[width] duration-gentle"
        :class="device === 'mobile' ? 'h-full w-[8rem]' : 'h-full w-full'"
      >
        <div class="flex gap-1 border-b border-line px-2.5 py-2">
          <span class="size-1.5 rounded-full bg-ridge" />
          <span class="size-1.5 rounded-full bg-ridge" />
          <span class="size-1.5 rounded-full bg-ridge" />
        </div>

        <!-- Miniature Orso landing: brand → headline → CTAs → product shot → how-it-works cells -->
        <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2.5" :class="device === 'mobile' ? 'p-2' : 'p-3'">
          <div class="flex items-center gap-1.5">
            <span class="size-2.5 shrink-0 rounded-sm bg-ink" />
            <span class="truncate text-label font-medium text-ink">{{ site.name }}</span>
          </div>
          <p
            class="font-medium tracking-tight text-ink"
            :class="device === 'mobile' ? 'text-label leading-4' : 'text-small leading-5'"
          >
            {{ props.headline }}
          </p>
          <div class="space-y-1">
            <div class="h-1 w-full rounded-full bg-sand" />
            <div class="h-1 w-4/5 rounded-full bg-sand" />
            <div class="h-1 w-3/5 rounded-full bg-sand" />
          </div>
          <div class="flex flex-wrap gap-1">
            <span class="h-4 w-14 rounded-sm bg-accent" />
            <span class="h-4 w-12 rounded-sm border border-line-strong" />
          </div>
          <div class="min-h-0 flex-1 rounded-sm border border-line bg-sand" />
          <div class="grid shrink-0 grid-cols-2 gap-1">
            <div class="aspect-square rounded-sm border border-line bg-sand/70" />
            <div class="aspect-square rounded-sm border border-line bg-sand/70" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
