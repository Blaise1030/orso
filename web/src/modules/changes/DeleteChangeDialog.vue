<script setup lang="ts">
import { computed } from "vue";
import { toast } from "@/lib/toast";
import type { ModalProps } from "@nuxt/ui";
import UButton from "@nuxt/ui/components/Button.vue";
import UModal from "@nuxt/ui/components/Modal.vue";
import type { Change } from "@/core/types";
import { errorMessage } from "@orso/utils";
import { useChangesStore } from "./store";

const props = defineProps<{ projectId: string }>();
/** The change to delete; the dialog is open while it is set. */
const change = defineModel<Change | null>("change", { required: true });

const store = useChangesStore();
const content = { "data-testid": "delete-change" } as ModalProps["content"];

const busy = computed(() => change.value !== null && store.deleting === change.value.branch);
/** A pull request that is still under way gets closed; a merged or closed one is left as is. */
const closesPr = computed(() => {
  const s = change.value?.prState;
  return s !== undefined && s !== "merged" && s !== "closed";
});
const isActive = computed(() => change.value !== null && store.active?.branch === change.value.branch);

async function confirm() {
  const target = change.value;
  if (!target) return;
  try {
    const { closedPr } = await store.deleteChange(props.projectId, target.branch);
    change.value = null;
    toast.success(closedPr ? `Deleted “${target.title}” and closed #${closedPr}` : `Deleted “${target.title}”`);
  } catch (e) {
    toast.error(errorMessage(e));
  }
}
</script>

<template>
  <UModal
    :open="change !== null"
    :content="content"
    :title="change ? `Delete “${change.title}”?` : ''"
    @update:open="(open) => !open && !busy && (change = null)"
  >
    <template #body>
      <ul class="text-muted list-disc space-y-1 pl-5 text-sm" data-testid="delete-change-consequences">
        <li>Its edits are deleted for good, including any that were never shared.</li>
        <li v-if="closesPr" data-testid="delete-change-closes-pr">Its pull request is closed without publishing.</li>
        <li>Its branch is deleted from GitHub too, if it was shared.</li>
        <li v-if="isActive">You'll be taken back to the live site.</li>
      </ul>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          label="Cancel"
          data-testid="delete-change-cancel"
          :disabled="busy"
          @click="change = null"
        />
        <UButton
          color="error"
          :label="busy ? 'Deleting…' : 'Delete change'"
          data-testid="delete-change-confirm"
          :disabled="busy"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
