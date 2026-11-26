<script setup lang="ts">
// Assistant setup: the list of assistants (each with an install guide: the
// vendor's Terminal commands, polled until done) and the site-builder download. It works embedded (SetupCheck) and inside a dialog:
// the data comes from the assistant store, `initial` is a read-only fallback
// for previews and tests, and the caller owns Continue / dismissal.
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UIcon from "@nuxt/ui/components/Icon.vue";
import ProviderRow from "./ProviderRow.vue";
import CliGuide from "./CliGuide.vue";
import { buildRows, siteBuilderRow, type AssistantRow, type RowAction } from "./rows";
import { useAssistantStore, type AssistantSnapshot } from "./store";

const props = withDefaults(
  defineProps<{
    /** Read-only data for previews/tests. When set, the component does not self-load. */
    initial?: AssistantSnapshot | null;
    /** Load the snapshot when the store has none. Default true. */
    autoload?: boolean;
    /** Render a caller-dismissed Continue button. Embedded callers leave it off. */
    showContinue?: boolean;
  }>(),
  { initial: null, autoload: true, showContinue: false },
);

const emit = defineEmits<{
  /** The caller should move on / close its dialog. */
  continue: [];
  /** The user picked a ready assistant; the caller opens a chat with it. */
  connect: [id: string];
}>();

const store = useAssistantStore();

const snapshot = computed(() => props.initial ?? store.snapshot);
const ready = computed(() => snapshot.value !== null);
const rows = computed<AssistantRow[]>(() =>
  props.initial ? buildRows(props.initial.providers) : store.rows,
);
const siteBuilder = computed<AssistantRow>(() =>
  props.initial ? siteBuilderRow(props.initial.node) : store.siteBuilder,
);
const showSiteBuilder = computed(() => snapshot.value?.node != null);
const loading = computed(() => !ready.value && !store.error);

onMounted(() => {
  if (!props.autoload || props.initial || store.snapshot) return;
  void store.load();
});

/** In the setup dialog, open the first assistant that still needs install/sign-in. */
const openedInitialGuide = ref(false);
watch(
  rows,
  (next) => {
    if (!props.showContinue || openedInitialGuide.value || props.initial || !next.length) return;
    const needs = next.find(
      (row) => row.signInRequired || row.action === "setup" || row.action === "signIn",
    );
    if (!needs) return;
    openedInitialGuide.value = true;
    store.openGuide(needs.id);
  },
  { immediate: true },
);

const rechecking = ref(false);

async function recheck() {
  rechecking.value = true;
  try {
    await store.load();
  } finally {
    rechecking.value = false;
  }
}

/** An assistant's install guide shows until it can chat (incl. OpenCode Console). */
function showGuide(row: AssistantRow): boolean {
  return (!row.chatReady || row.signInRequired) && store.guideOpen(row.id);
}

function toggleGuide(id: string) {
  if (store.guideOpen(id)) store.closeGuide(id);
  else store.openGuide(id);
}

function onAction(row: AssistantRow, action: RowAction) {
  switch (action) {
    case "setup":
    case "signIn":
      toggleGuide(row.id);
      break;
    // Only the site builder downloads.
    case "download":
    case "update":
      void store.download(row.id);
      break;
    case "retry":
      void store.retry(row.id);
      break;
    case "cancel":
      void store.cancel(row.id);
      break;
    case "connect":
      emit("connect", row.id);
      break;
    case "none":
      break;
  }
}

// Leaving setup stops the guides' polling.
onBeforeUnmount(() => {
  for (const id of [...store.guides]) store.closeGuide(id);
});
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="assistant-setup">
    <p
      v-if="loading"
      class="text-muted flex items-center gap-2 text-sm"
      data-testid="assistant-loading"
    >
      <UIcon name="i-hugeicons-loading-03" class="size-3.5 animate-spin" aria-hidden="true" />
      Checking your setup…
    </p>


    <template v-else>
      <section class="flex flex-col gap-2" data-testid="assistant-assistants">
        <div class="flex flex-col gap-1">
          <h3 class="text-highlighted text-sm font-medium">Assistants</h3>
          <p class="text-muted text-xs">
            Pick an assistant to make the changes you ask for. You can add another later.
          </p>
        </div>

        <div v-if="!rows.length" class="text-muted flex flex-wrap items-center gap-2 text-sm">
          <p>No assistants were found.</p>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            icon="i-hugeicons-refresh"
            label="Check again"
            :loading="rechecking"
            :disabled="rechecking"
            data-testid="assistant-recheck"
            @click="recheck"
          />
        </div>

        <ul v-else class="flex flex-col divide-y divide-default" data-testid="assistant-rows">
          <template v-for="row in rows" :key="row.id">
            <ProviderRow :row="row" @action="onAction(row, $event)" />
            <li v-if="showGuide(row)" class="pb-3">
              <CliGuide :row="row" :checking="rechecking" @recheck="recheck" />
            </li>
          </template>
        </ul>

      </section>

      <section
        v-if="showSiteBuilder"
        class="flex flex-col gap-2"
        data-testid="assistant-site-builder"
      >
        <div class="flex flex-col gap-1">
          <h3 class="text-highlighted text-sm font-medium">Site builder</h3>
          <p class="text-muted text-xs">
            orso needs this to create a project and preview your site. You can start chatting
            first.
          </p>
        </div>
        <ul class="flex flex-col divide-y divide-default">
          <ProviderRow :row="siteBuilder" @action="onAction(siteBuilder, $event)" />
        </ul>
      </section>
    </template>

    <div v-if="showContinue" class="flex justify-end">
      <UButton label="Continue" data-testid="assistant-continue" @click="emit('continue')" />
    </div>
  </div>
</template>
