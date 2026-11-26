<script setup lang="ts">
import UIcon from "@nuxt/ui/components/Icon.vue";

/** Decorative slash menu — same commands/icons as MarkdownBodyEditor, not wired to TipTap. */
const items = [
  { id: "h1", label: "Heading 1", icon: "i-hugeicons-heading-01" },
  { id: "h2", label: "Heading 2", icon: "i-hugeicons-heading-02" },
  { id: "h3", label: "Heading 3", icon: "i-hugeicons-heading-03" },
  { id: "h4", label: "Heading 4", icon: "i-hugeicons-heading-04" },
  { id: "h5", label: "Heading 5", icon: "i-hugeicons-heading-05" },
  { id: "h6", label: "Heading 6", icon: "i-hugeicons-heading-06" },
  { id: "bullet-list", label: "Bullet list", icon: "i-hugeicons-left-to-right-list-bullet" },
  { id: "ordered-list", label: "Numbered list", icon: "i-hugeicons-left-to-right-list-number" },
  { id: "task-list", label: "Checklist", icon: "i-hugeicons-check-list" },
  { id: "quote", label: "Quote", icon: "i-hugeicons-quote-down" },
  { id: "code-block", label: "Code block", icon: "i-hugeicons-code-square" },
  { id: "divider", label: "Divider", icon: "i-hugeicons-separator-horizontal" },
] as const;

const activeId = "quote";
</script>

<template>
  <div
    role="listbox"
    aria-label="Slash commands"
    aria-hidden="true"
    class="w-52 overflow-hidden rounded-md border border-line bg-surface-raised py-1 shadow-raised"
  >
    <div
      v-for="item in items"
      :key="item.id"
      role="option"
      :aria-selected="item.id === activeId"
      class="flex items-center gap-2 px-2 py-1.5 text-small text-ink"
      :class="item.id === activeId ? 'bg-sand' : ''"
    >
      <UIcon :name="item.icon" class="size-4 shrink-0 text-muted" />
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>
