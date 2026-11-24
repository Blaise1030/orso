<script setup lang="ts">
import { computed } from "vue";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import UButton from "@nuxt/ui/components/Button.vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import UTextarea from "@nuxt/ui/components/Textarea.vue";
import { getNamedBlock } from "./namedBlocks";

/**
 * Form UI for a registered named HTML block. Props are TipTap node attrs; the
 * Markdown serializer writes them back as `data-*` on the aside wrapper.
 */
const props = defineProps(nodeViewProps);

const definition = computed(() => getNamedBlock(String(props.node.attrs.block ?? "")));
const values = computed(() => (props.node.attrs.props ?? {}) as Record<string, string>);

function setProp(key: string, value: string) {
  props.updateAttributes({ props: { ...values.value, [key]: value } });
}
</script>

<template>
  <NodeViewWrapper
    class="named-block"
    data-testid="named-block"
    :contenteditable="false"
    :data-block="definition?.id ?? ''"
  >
    <div class="named-block__bar">
      <span class="named-block__label">{{ definition?.label ?? "Unknown block" }}</span>
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-hugeicons-delete-02"
        title="Remove block"
        aria-label="Remove block"
        data-testid="named-block-remove"
        @mousedown.prevent
        @click="props.deleteNode()"
      />
    </div>
    <div v-if="definition" class="named-block__fields">
      <UFormField
        v-for="prop in definition.props"
        :key="prop.key"
        :label="prop.label"
        :required="prop.required"
      >
        <UTextarea
          v-if="prop.type === 'textarea'"
          :model-value="values[prop.key] ?? ''"
          :data-testid="`named-block-prop-${prop.key}`"
          :rows="3"
          autoresize
          @update:model-value="setProp(prop.key, String($event ?? ''))"
        />
        <UInput
          v-else
          :model-value="values[prop.key] ?? ''"
          :type="prop.type === 'url' ? 'url' : 'text'"
          :data-testid="`named-block-prop-${prop.key}`"
          @update:model-value="setProp(prop.key, String($event ?? ''))"
        />
      </UFormField>
    </div>
    <p v-else class="named-block__missing" role="status">
      Unknown block “{{ props.node.attrs.block }}”. Remove it or register the definition.
    </p>
  </NodeViewWrapper>
</template>
