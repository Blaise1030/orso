<script setup lang="ts">
import UIcon from "@nuxt/ui/components/Icon.vue";

/** Hero tile: cropped editor with real body copy and an open slash menu. */
const props = defineProps<{
  title: string;
  body: string[];
  slashHint: string;
}>();

const items = [
  { id: "h2", label: "Heading 2", icon: "i-hugeicons-heading-02" },
  { id: "bullet", label: "Bullet list", icon: "i-hugeicons-left-to-right-list-bullet" },
  { id: "quote", label: "Quote", icon: "i-hugeicons-quote-down", active: true },
  { id: "code", label: "Code block", icon: "i-hugeicons-code-square" },
] as const;
</script>

<template>
  <div class="relative size-full overflow-hidden" aria-hidden="true">
    <div class="absolute inset-y-0 left-[8%] right-[-12%] top-[12%] rounded-md border border-line bg-surface-raised shadow-raised">
      <div class="border-b border-line px-4 py-2.5">
        <div class="flex gap-1.5">
          <span class="size-2 rounded-full bg-ridge" />
          <span class="size-2 rounded-full bg-ridge" />
          <span class="size-2 rounded-full bg-ridge" />
        </div>
      </div>
      <div class="relative p-5 md:p-6">
        <p class="text-heading font-medium tracking-normal text-ink">{{ props.title }}</p>
        <div class="mt-4 space-y-3">
          <p v-for="(paragraph, index) in props.body" :key="index" class="max-w-[36ch] text-small leading-6 text-muted">
            {{ paragraph }}
          </p>
        </div>
        <div class="relative mt-5">
          <span class="font-mono text-body text-ink">{{ props.slashHint }}</span>
          <div
            role="listbox"
            class="absolute top-7 left-0 z-10 w-48 overflow-hidden rounded-md border border-line bg-surface-raised py-1 shadow-raised"
          >
            <div
              v-for="item in items"
              :key="item.id"
              role="option"
              class="flex items-center gap-2 px-2.5 py-1.5 text-small text-ink"
              :class="'active' in item && item.active ? 'bg-sand' : ''"
            >
              <UIcon :name="item.icon" class="size-4 shrink-0 text-muted" />
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
