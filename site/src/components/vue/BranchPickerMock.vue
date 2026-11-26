<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from "@nuxt/ui";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UCommandPalette from "@nuxt/ui/components/CommandPalette.vue";
import UIcon from "@nuxt/ui/components/Icon.vue";

/** Live changes menu chrome for the marketing bento — same Nuxt UI as ChangesBranchPicker.vue. */
const props = defineProps<{
  trigger: string;
  searchPlaceholder: string;
  liveLabel: string;
  liveDescription: string;
  draftLabel: string;
  draftDescription: string;
  reviewLabel: string;
  reviewDescription: string;
  reviewBadge: string;
  newChangeLabel: string;
}>();

interface ChangeRow extends CommandPaletteItem {
  checked?: boolean;
  badge?: string;
  branch?: boolean;
}

const groups: CommandPaletteGroup<ChangeRow>[] = [
  {
    id: "changes",
    items: [
      {
        label: props.liveLabel,
        description: props.liveDescription,
        slot: "change",
        checked: false,
      },
      {
        label: props.draftLabel,
        description: props.draftDescription,
        slot: "change",
        checked: true,
        branch: true,
      },
      {
        label: props.reviewLabel,
        description: props.reviewDescription,
        slot: "change",
        checked: false,
        badge: props.reviewBadge,
        branch: true,
      },
    ],
  },
  {
    id: "actions",
    items: [{ label: props.newChangeLabel, icon: "i-hugeicons-plus-sign" }],
  },
];
</script>

<template>
  <div
    class="flex size-full min-h-0 flex-col gap-3 overflow-hidden rounded-md border border-line bg-surface-raised p-3 shadow-raised"
    aria-hidden="true"
    @click.prevent
    @keydown.prevent
  >
    <div class="shrink-0">
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-hugeicons-git-branch"
        trailing-icon="i-hugeicons-unfold-more"
        tabindex="-1"
        class="max-w-56"
        :ui="{ leadingIcon: 'text-muted', trailingIcon: 'size-3.5 text-muted' }"
      >
        <span class="truncate">{{ props.trigger }}</span>
      </UButton>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden rounded-md border border-line bg-surface">
      <UCommandPalette
        :groups="groups"
        :placeholder="props.searchPlaceholder"
        size="sm"
        class="h-full"
        :ui="{ root: 'h-full', viewport: 'max-h-none divide-y divide-line' }"
      >
        <template #change-leading="{ item }">
          <UIcon
            name="i-hugeicons-checkmark-circle-02"
            class="mt-0.5 size-4 shrink-0 text-accent"
            :class="item.checked ? 'opacity-100' : 'opacity-0'"
          />
        </template>
        <template #change-trailing="{ item }">
          <UBadge
            v-if="item.badge"
            color="neutral"
            variant="outline"
            size="sm"
            class="shrink-0"
            :label="item.badge"
          />
          <UButton
            v-if="item.branch"
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-hugeicons-delete-02"
            tabindex="-1"
            class="shrink-0 text-muted"
          />
        </template>
      </UCommandPalette>
    </div>
  </div>
</template>
