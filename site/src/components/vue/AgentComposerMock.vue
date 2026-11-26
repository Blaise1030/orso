<script setup lang="ts">
import { ref } from "vue";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UChatMessage from "@nuxt/ui/components/ChatMessage.vue";
import UChatPrompt from "@nuxt/ui/components/ChatPrompt.vue";
import UChatPromptSubmit from "@nuxt/ui/components/ChatPromptSubmit.vue";
import UIcon from "@nuxt/ui/components/Icon.vue";
import UTextarea from "@nuxt/ui/components/Textarea.vue";

/** Agent panel chrome for how-it-works — one panel: thread + composer (Orso chat shape). */
const props = defineProps<{
  userMessage: string;
  assistantMessage: string;
  statusMessage: string;
  prompt: string;
  placeholder: string;
  previewContext: string;
  viewport: string;
  elementLabel: string;
  stepsWorking: string;
  stepsDone: string;
  modelLabel: string;
  autoLabel: string;
  sendLabel: string;
  attachLabel: string;
}>();

const text = ref(props.prompt);
</script>

<template>
  <div
    class="flex size-full min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface-raised shadow-raised"
    aria-hidden="true"
    @click.prevent
    @keydown.prevent
  >
    <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
      <div class="flex flex-col items-end gap-1.5">
        <div class="flex max-w-full flex-wrap justify-end gap-1">
          <UBadge color="neutral" variant="soft" size="sm" class="max-w-full" :label="props.previewContext" />
          <UBadge color="neutral" variant="soft" size="sm" :label="props.viewport" />
        </div>
        <UChatMessage
          id="demo-user"
          role="user"
          side="right"
          variant="soft"
          compact
          :parts="[]"
          :ui="{ container: 'max-w-[95%] pb-0', content: 'text-small space-y-0' }"
        >
          <template #content>
            <UBadge
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-hugeicons-cursor-pointer-01"
              :label="props.elementLabel"
              class="mb-1.5 max-w-full bg-surface/60 font-mono"
              :ui="{ label: 'truncate' }"
            />
            <span class="whitespace-pre-wrap">{{ props.userMessage }}</span>
          </template>
        </UChatMessage>
      </div>

      <div class="flex min-w-0 flex-col gap-2 text-small">
        <div class="flex items-center gap-1 text-muted">
          <UIcon name="i-hugeicons-arrow-down-01" class="size-3.5 shrink-0" />
          <span class="truncate">{{ props.stepsWorking }}</span>
        </div>
        <p class="text-muted">{{ props.statusMessage }}</p>
        <div class="flex items-center gap-1 text-muted">
          <UIcon name="i-hugeicons-arrow-down-01" class="size-3.5 shrink-0" />
          <span class="truncate">{{ props.stepsDone }}</span>
        </div>
        <p class="text-ink">{{ props.assistantMessage }}</p>
      </div>
    </div>

    <div class="shrink-0 border-t border-line p-2">
      <UChatPrompt
        as="div"
        variant="soft"
        class="w-full"
        :ui="{ root: 'bg-sand/50 ring-0', header: 'flex-wrap gap-1' }"
      >
        <template #header>
          <UBadge color="neutral" variant="soft" size="sm" class="max-w-full gap-1">
            <span class="min-w-0 truncate">{{ props.previewContext }}</span>
            <UIcon name="i-hugeicons-cancel-01" class="size-3 shrink-0 opacity-60" />
          </UBadge>
          <UBadge color="neutral" variant="soft" size="sm" class="gap-1">
            <span>{{ props.viewport }}</span>
            <UIcon name="i-hugeicons-cancel-01" class="size-3 shrink-0 opacity-60" />
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
            :ui="{ base: 'max-h-20 min-h-8 px-0 py-1 text-small' }"
            readonly
          />
        </template>

        <template #footer>
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-hugeicons-attachment-01"
              tabindex="-1"
              class="shrink-0"
              :aria-label="props.attachLabel"
            />
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              trailing-icon="i-hugeicons-arrow-down-01"
              tabindex="-1"
              class="h-7 max-w-28 min-w-0"
              :ui="{ trailingIcon: 'size-3 text-muted' }"
            >
              <span class="min-w-0 truncate">{{ props.modelLabel }}</span>
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-hugeicons-shield-01"
              trailing-icon="i-hugeicons-arrow-down-01"
              :label="props.autoLabel"
              tabindex="-1"
              class="h-7 shrink-0"
              :ui="{ trailingIcon: 'size-3 text-muted' }"
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
  </div>
</template>
