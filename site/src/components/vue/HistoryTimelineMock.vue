<script setup lang="ts">
import UAvatar from "@nuxt/ui/components/Avatar.vue";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UIcon from "@nuxt/ui/components/Icon.vue";
import USeparator from "@nuxt/ui/components/Separator.vue";

export type TimelineItem = {
  summary: string;
  author: string;
  sha: string;
  time: string;
  current?: boolean;
};

defineProps<{
  dayLabel: string;
  items: TimelineItem[];
  currentLabel: string;
}>();
</script>

<template>
  <div
    class="flex size-full min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface-raised p-3 shadow-raised"
    aria-hidden="true"
  >
    <p class="shrink-0 px-1 pb-2 text-label font-medium text-muted">{{ dayLabel }}</p>
    <ol class="m-0 flex min-h-0 list-none flex-col gap-2 overflow-hidden p-0">
      <li v-for="(item, i) in items" :key="item.sha" class="relative flex items-start gap-2">
        <USeparator
          v-if="i < items.length - 1"
          orientation="vertical"
          class="absolute top-8 -bottom-2 left-3 h-auto w-px"
        />
        <UAvatar
          icon="i-hugeicons-git-commit"
          size="xs"
          class="mt-2.5 shrink-0"
          :class="item.current ? 'bg-accent text-on-accent' : 'bg-sand'"
        />
        <div class="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-surface px-3 py-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-small font-medium text-ink">{{ item.summary }}</p>
            <p class="mt-0.5 flex items-center gap-1.5 truncate text-label text-muted">
              <UAvatar :alt="item.author" size="3xs" class="shrink-0" />
              <span>{{ item.author }} · {{ item.sha }} · {{ item.time }}</span>
            </p>
          </div>
          <UBadge v-if="item.current" color="neutral" variant="soft" size="sm" class="shrink-0" :label="currentLabel" />
          <UIcon name="i-hugeicons-arrow-right-01" class="size-4 shrink-0 text-muted" />
        </div>
      </li>
    </ol>
  </div>
</template>
