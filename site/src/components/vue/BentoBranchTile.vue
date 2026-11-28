<script setup lang="ts">
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UIcon from "@nuxt/ui/components/Icon.vue";

/** Changes trigger + live/draft rows + New change action (matches ChangesBranchPicker). */
defineProps<{
  trigger: string;
  liveLabel: string;
  draftLabel: string;
  draftMeta: string;
  newChangeLabel: string;
}>();
</script>

<template>
  <div class="flex size-full flex-col items-start justify-start gap-3 p-4" aria-hidden="true">
    <UButton
      color="neutral"
      variant="outline"
      size="sm"
      icon="i-hugeicons-git-branch"
      trailing-icon="i-hugeicons-unfold-more"
      tabindex="-1"
      class="w-fit max-w-full"
      :ui="{ leadingIcon: 'text-muted', trailingIcon: 'size-3.5 text-muted' }"
    >
      <span class="truncate">{{ trigger }}</span>
    </UButton>

    <div class="w-full max-w-sm overflow-hidden rounded-md border border-line bg-surface-raised shadow-raised">
      <div class="flex items-start gap-2 border-b border-line px-3 py-2.5 text-muted">
        <UIcon name="i-hugeicons-checkmark-circle-02" class="mt-0.5 size-4 shrink-0 opacity-0" />
        <div class="min-w-0">
          <p class="truncate text-small text-ink">{{ liveLabel }}</p>
          <p class="truncate font-mono text-label">main</p>
        </div>
      </div>
      <div class="flex items-start gap-2 border-b border-line bg-sand/60 px-3 py-2.5">
        <UIcon name="i-hugeicons-checkmark-circle-02" class="mt-0.5 size-4 shrink-0 text-accent" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-small font-medium text-ink">{{ draftLabel }}</p>
          <p class="truncate font-mono text-label text-muted">{{ draftMeta }}</p>
        </div>
        <UBadge color="neutral" variant="soft" size="sm" label="Draft" class="shrink-0" />
      </div>
      <div class="flex items-center gap-2 px-3 py-2.5 text-ink">
        <UIcon name="i-hugeicons-plus-sign" class="size-4 shrink-0 text-muted" />
        <p class="truncate text-small">{{ newChangeLabel }}</p>
      </div>
    </div>
  </div>
</template>
