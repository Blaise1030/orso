<script setup lang="ts">
import { ref } from "vue";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UChatPrompt from "@nuxt/ui/components/ChatPrompt.vue";
import UChatPromptSubmit from "@nuxt/ui/components/ChatPromptSubmit.vue";
import UIcon from "@nuxt/ui/components/Icon.vue";
import UTextarea from "@nuxt/ui/components/Textarea.vue";

/** Live chat composer chrome for the marketing features card — same Nuxt UI as ChatComposer.vue. */
const props = defineProps<{
  prompt: string;
  placeholder: string;
  pageContext: string;
  modelLabel: string;
  sendLabel: string;
  attachLabel: string;
}>();

const text = ref(props.prompt);
</script>

<template>
  <div class="flex size-full flex-col justify-end" aria-hidden="true" @click.prevent @keydown.prevent>
    <UChatPrompt
      as="div"
      variant="outline"
      class="w-full"
      :ui="{ root: 'bg-surface-raised shadow-raised', header: 'flex-wrap' }"
    >
      <template #header>
        <UBadge color="neutral" variant="soft" class="max-w-full gap-1.5">
          <UIcon name="i-hugeicons-location-01" class="size-3 shrink-0" />
          <span class="min-w-0 truncate">{{ props.pageContext }}</span>
        </UBadge>
      </template>

      <template #body>
        <UTextarea
          v-model="text"
          variant="none"
          :rows="2"
          autoresize
          :maxrows="4"
          tabindex="-1"
          :placeholder="props.placeholder"
          class="w-full"
          :ui="{ base: 'max-h-28 min-h-10 px-0 py-1 text-small' }"
          readonly
        />
      </template>

      <template #footer>
        <div class="flex min-w-0 items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-hugeicons-attachment-01"
            tabindex="-1"
            class="shrink-0"
            :aria-label="props.attachLabel"
          />
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            trailing-icon="i-hugeicons-arrow-down-01"
            tabindex="-1"
            class="h-7 max-w-40 min-w-0 whitespace-nowrap"
            :ui="{ trailingIcon: 'text-muted' }"
          >
            <span class="min-w-0 truncate">{{ props.modelLabel }}</span>
          </UButton>
        </div>
        <UChatPromptSubmit
          status="ready"
          size="sm"
          icon="i-hugeicons-arrow-up-01"
          tabindex="-1"
          :aria-label="props.sendLabel"
        />
      </template>
    </UChatPrompt>
  </div>
</template>
