<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import UTabs from "@nuxt/ui/components/Tabs.vue";
import type { AppShotData } from "../../lib/appShotTypes";
import AppShot from "./AppShot.vue";

const order = ["content", "preview", "publish"] as const;
type TabValue = (typeof order)[number];
type TabCopy = { label: string; description: string; alt: string };

/** `copy` is `home.hero.tabs` from src/i18n/messages, one entry per tab. */
const props = defineProps<{ shots: Record<TabValue, AppShotData>; copy: Record<TabValue, TabCopy> }>();
const tabs = order.map((value) => ({ value, ...props.copy[value] }));

const SLIDE_MS = 6000;
const value = ref<string>(tabs[0].value);
const progress = ref(0);
const paused = ref(false);
const reducedMotion = ref(false);
const activeIndex = computed(() => tabs.findIndex((tab) => tab.value === value.value));

let media: MediaQueryList | undefined;
const syncMotion = () => (reducedMotion.value = !!media?.matches);
let frame = 0;

/** Advances the active tab every SLIDE_MS, filling its progress bar; hover or focus pauses it. */
function run() {
  cancelAnimationFrame(frame);
  if (reducedMotion.value || paused.value) return;
  let last = performance.now();
  const tick = (now: number) => {
    progress.value = Math.min(1, progress.value + (now - last) / SLIDE_MS);
    last = now;
    if (progress.value >= 1) {
      progress.value = 0;
      value.value = tabs[(activeIndex.value + 1) % tabs.length].value;
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}

onMounted(() => {
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  syncMotion();
  media.addEventListener("change", syncMotion);
  run();
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  media?.removeEventListener("change", syncMotion);
});
watch([value, paused, reducedMotion], run);

function select(next: string | number) {
  progress.value = 0;
  value.value = String(next);
}
function fill(index: number) {
  if (index < activeIndex.value) return 1;
  if (index > activeIndex.value) return 0;
  return reducedMotion.value ? 1 : progress.value;
}
function onFocusOut(event: FocusEvent) {
  if (!(event.currentTarget as Element).contains(event.relatedTarget as Node | null)) paused.value = false;
}
</script>

<template>
  <UTabs
    :model-value="value"
    :items="[...tabs]"
    variant="link"
    color="neutral"
    :unmount-on-hide="false"
    class="gap-0 bg-surface"
    :ui="{
      list: 'relative z-10 w-full items-stretch gap-0 overflow-x-auto rounded-none border-b border-line p-0 lg:overflow-visible',
      indicator: 'hidden',
      label: 'flex flex-col items-start gap-1 overflow-visible whitespace-normal',
      trigger:
        'relative w-64 min-w-64 shrink-0 grow-0 flex-col items-start justify-start gap-1 rounded-none px-0 py-4 pb-5 text-left focus-visible:outline-none lg:w-auto lg:min-w-0 lg:flex-1 lg:grow lg:px-0 lg:py-5 lg:pb-6 lg:pr-8',
      content: 'mt-6 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden',
    }"
    @update:model-value="select"
    @pointerenter="paused = true"
    @pointerleave="paused = false"
    @focusin="paused = true"
    @focusout="onFocusOut"
  >
    <template #default="{ item, index }">
      <span class="text-body font-medium text-ink">{{ item.label }}</span>
      <span class="text-small leading-snug font-normal whitespace-normal text-muted">{{ item.description }}</span>
      <span class="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-line" aria-hidden="true">
        <span class="block h-full origin-left bg-ink" :style="{ width: `${fill(index) * 100}%` }" />
      </span>
    </template>
    <template #content="{ item, index }">
      <!-- Block image on its own line, like a Markdown figure. -->
      <figure class="m-0 w-full border border-line bg-surface">
        <AppShot
          :shot="props.shots[item.value]"
          :alt="item.alt"
          sizes="(min-width: 80rem) 76rem, 100vw"
          :eager="index === 0"
          :play="item.value === 'preview'"
          class="block h-auto w-full"
        />
      </figure>
    </template>
  </UTabs>
</template>
