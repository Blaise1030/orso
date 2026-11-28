<script setup lang="ts">
import { ref } from "vue";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UIcon from "@nuxt/ui/components/Icon.vue";
import { site } from "../../site";

/** Preview + chat workspace: landing page on the left, agent thread on the right. */
const props = defineProps<{
  desktopLabel: string;
  mobileLabel: string;
  headline: string;
  chatUser: string;
  chatStatus: string;
  chatReply: string;
  chatPrompt: string;
}>();

const device = ref<"desktop" | "mobile">("desktop");
</script>

<template>
  <div class="flex size-full flex-col gap-2 p-3" aria-hidden="true" @click.prevent>
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

    <div
      class="flex min-h-0 flex-1 overflow-hidden rounded-md border border-line bg-surface-raised shadow-raised"
      :class="device === 'mobile' ? 'flex-col' : 'flex-row'"
    >
      <!-- Site preview -->
      <div
        class="flex min-h-0 min-w-0 flex-col border-line"
        :class="device === 'mobile' ? 'h-[45%] border-b' : 'w-[58%] border-r'"
      >
        <div class="flex gap-1 border-b border-line px-2 py-1.5">
          <span class="size-1.5 rounded-full bg-ridge" />
          <span class="size-1.5 rounded-full bg-ridge" />
          <span class="size-1.5 rounded-full bg-ridge" />
        </div>
        <div class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2">
          <div class="flex items-center gap-1">
            <span class="size-2 shrink-0 rounded-sm bg-ink" />
            <span class="truncate text-label font-medium text-ink">{{ site.name }}</span>
          </div>
          <p class="text-label leading-4 font-medium tracking-tight text-ink">{{ props.headline }}</p>
          <div class="space-y-1">
            <div class="h-1 w-full rounded-full bg-sand" />
            <div class="h-1 w-3/4 rounded-full bg-sand" />
          </div>
          <div class="flex gap-1">
            <span class="h-3 w-10 rounded-sm bg-accent" />
            <span class="h-3 w-8 rounded-sm border border-line-strong" />
          </div>
          <div class="min-h-0 flex-1 rounded-sm border border-line bg-sand" />
          <div class="grid shrink-0 grid-cols-2 gap-1">
            <div class="aspect-[5/4] rounded-sm border border-line bg-sand/70" />
            <div class="aspect-[5/4] rounded-sm border border-line bg-sand/70" />
          </div>
        </div>
      </div>

      <!-- Agent chat -->
      <div class="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
        <div class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2">
          <div class="flex justify-end">
            <div class="max-w-[95%] rounded-md bg-sand px-2 py-1.5">
              <p class="text-label leading-4 text-ink">{{ props.chatUser }}</p>
            </div>
          </div>
          <div class="flex items-center gap-0.5 text-label text-muted">
            <UIcon name="i-hugeicons-arrow-down-01" class="size-3 shrink-0" />
            <span class="truncate">{{ props.chatStatus }}</span>
          </div>
          <p class="text-label leading-4 text-muted">{{ props.chatReply }}</p>
        </div>
        <div class="shrink-0 border-t border-line p-1.5">
          <div class="rounded-md border border-line bg-sand/40 px-1.5 py-1">
            <UBadge color="neutral" variant="soft" size="sm" class="mb-1 max-w-full" label="Preview · /" />
            <p class="truncate text-label text-muted">{{ props.chatPrompt }}</p>
            <div class="mt-1 flex items-center justify-between">
              <UIcon name="i-hugeicons-attachment-01" class="size-3 text-muted" />
              <span class="flex size-5 items-center justify-center rounded-sm bg-accent">
                <UIcon name="i-hugeicons-arrow-up-01" class="size-3 text-on-accent" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
