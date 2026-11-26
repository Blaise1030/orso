<script setup lang="ts">
import { ref } from "vue";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UChatMessage from "@nuxt/ui/components/ChatMessage.vue";
import UChatPrompt from "@nuxt/ui/components/ChatPrompt.vue";
import UChatPromptSubmit from "@nuxt/ui/components/ChatPromptSubmit.vue";
import UIcon from "@nuxt/ui/components/Icon.vue";
import UTextarea from "@nuxt/ui/components/Textarea.vue";

/** Live agent panel chrome for the marketing features card — same Nuxt UI as ChatPanel/ChatComposer. */
const props = defineProps<{
  userMessage: string;
  assistantMessage: string;
  prompt: string;
  placeholder: string;
  pageContext: string;
  modelLabel: string;
  askLabel: string;
  sendLabel: string;
  attachLabel: string;
}>();

const text = ref(props.prompt);
</script>

<template>
  <div
    class="flex size-full min-h-0 flex-col gap-3 overflow-hidden"
    aria-hidden="true"
    @click.prevent
    @keydown.prevent
  >
    <div class="min-h-0 flex-1 space-y-3 overflow-hidden rounded-md border border-line bg-surface-raised/90 p-3 shadow-raised backdrop-blur-sm">
      <UChatMessage
        id="demo-user"
        role="user"
        side="right"
        variant="soft"
        compact
        :parts="[{ type: 'text', text: props.userMessage }]"
        :ui="{ content: 'text-small' }"
      />
      <UChatMessage
        id="demo-assistant"
        role="assistant"
        side="left"
        variant="naked"
        compact
        :parts="[{ type: 'text', text: props.assistantMessage }]"
        :ui="{ content: 'text-small text-muted' }"
      />
    </div>

    <UChatPrompt
      as="div"
      variant="outline"
      class="w-full shrink-0"
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
          :maxrows="3"
          tabindex="-1"
          :placeholder="props.placeholder"
          class="w-full"
          :ui="{ base: 'max-h-24 min-h-10 px-0 py-1 text-small' }"
          readonly
        />
      </template>

      <template #footer>
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            icon="i-hugeicons-shield-01"
            trailing-icon="i-hugeicons-arrow-down-01"
            :label="props.askLabel"
            tabindex="-1"
            class="h-7 shrink-0 whitespace-nowrap"
            :ui="{ trailingIcon: 'text-muted' }"
          />
        </div>
        <UChatPromptSubmit
          status="ready"
          size="sm"
          icon="i-hugeicons-arrow-up-01"
          tabindex="-1"
          class="shrink-0"
          :aria-label="props.sendLabel"
        />
      </template>
    </UChatPrompt>
  </div>
</template>
