<script setup lang="ts">
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UCard from "@nuxt/ui/components/Card.vue";
import UIcon from "@nuxt/ui/components/Icon.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import UTextarea from "@nuxt/ui/components/Textarea.vue";

defineProps<{
  titleLabel: string;
  titleValue: string;
  descriptionLabel: string;
  descriptionValue: string;
  pathLabel: string;
  pathValue: string;
  scriptsLabel: string;
  scriptsValue: string;
  stylesLabel: string;
  stylesValue: string;
  tabMeta: string;
  tabIssues: string;
}>();
</script>

<template>
  <div
    class="flex size-full min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface-raised shadow-raised"
    aria-hidden="true"
    @click.prevent
    @keydown.prevent
  >
    <div class="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
      <div class="flex min-w-0 items-center gap-2">
        <UBadge color="neutral" variant="soft" size="sm" :label="tabMeta" />
        <UBadge color="neutral" variant="outline" size="sm" :label="tabIssues" />
      </div>
      <UButton color="neutral" variant="ghost" size="xs" icon="i-hugeicons-cancel-01" tabindex="-1" />
    </div>

    <div class="text-muted flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-label">
      <span class="inline-flex items-center gap-1">
        <UIcon name="i-hugeicons-code" class="size-3 shrink-0" />
        <span class="tabular-nums">{{ scriptsValue }}</span>
        <span>{{ scriptsLabel }}</span>
      </span>
      <span class="inline-flex items-center gap-1">
        <UIcon name="i-hugeicons-paint-board" class="size-3 shrink-0" />
        <span class="tabular-nums">{{ stylesValue }}</span>
        <span>{{ stylesLabel }}</span>
      </span>
    </div>

    <div class="min-h-0 flex-1 space-y-3 overflow-hidden px-3 pb-3">
      <UCard variant="outline" :ui="{ root: 'rounded-md', body: 'space-y-3 p-3 sm:p-3' }">
        <label class="block">
          <span class="text-label font-medium text-muted">{{ titleLabel }}</span>
          <UInput :model-value="titleValue" size="sm" color="neutral" variant="outline" class="mt-1" tabindex="-1" readonly />
        </label>
        <label class="block">
          <span class="text-label font-medium text-muted">{{ descriptionLabel }}</span>
          <UTextarea
            :model-value="descriptionValue"
            :rows="2"
            color="neutral"
            variant="outline"
            class="mt-1"
            :ui="{ base: 'text-small' }"
            tabindex="-1"
            readonly
          />
        </label>
        <label class="block">
          <span class="text-label font-medium text-muted">{{ pathLabel }}</span>
          <UInput :model-value="pathValue" size="sm" color="neutral" variant="outline" class="mt-1 font-mono" tabindex="-1" readonly />
        </label>
      </UCard>
    </div>
  </div>
</template>
