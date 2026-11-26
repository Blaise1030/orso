<script setup lang="ts">
import UAccordion from "@nuxt/ui/components/Accordion.vue";

export type FaqItem = { question: string; answer: string };

const props = defineProps<{ items: FaqItem[] }>();
const items = props.items.map((faq) => ({ label: faq.question, content: faq.answer }));
</script>

<template>
  <UAccordion
    :items="items"
    class="border-t border-line"
    :ui="{
      item: 'border-line',
      trigger: 'gap-3 py-5 text-body font-normal text-ink',
      content: 'max-w-prose',
      body: 'pb-6 pt-0 text-body text-muted',
    }"
  >
    <template #leading="{ open }">
      <span class="shrink-0 font-mono text-muted" aria-hidden="true">{{ open ? "[-]" : "[+]" }}</span>
    </template>
    <template #trailing />
  </UAccordion>
</template>
