<script setup lang="ts">
import { ref } from "vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UEmpty from "@nuxt/ui/components/Empty.vue";
import { toast } from "@/lib/toast";
import { errorMessage } from "@orso/utils";
import { useProjectsStore } from "./store";

const props = defineProps<{ projectId: string }>();

const store = useProjectsStore();
const busy = ref(false);

async function confirm() {
  if (busy.value) return;
  busy.value = true;
  try {
    await store.init(props.projectId);
  } catch (e) {
    toast.error(errorMessage(e));
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div
    class="flex h-full min-h-0 w-full items-center justify-center p-6"
    data-testid="project-setup-prompt"
  >
    <UEmpty
      variant="naked"
      icon="i-hugeicons-file-01"
      title="Set up this project?"
      class="max-w-md"
    >
      <template #description>
        Orso needs an
        <code class="text-highlighted">orso.json</code>
        at the project root before it starts the site preview. Set up writes that file and
        the bundled agent skills — nothing runs until you confirm.
      </template>
      <template #actions>
        <UButton
          color="primary"
          :loading="busy"
          :disabled="busy"
          label="Set up"
          data-testid="project-setup-confirm"
          @click="confirm"
        />
      </template>
    </UEmpty>
  </div>
</template>
