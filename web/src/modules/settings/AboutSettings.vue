<script setup lang="ts">
// App settings → About. Small and factual: the running version, where the data
// lives, and a way out to the project.
import { onMounted, ref } from "vue";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import ULink from "@nuxt/ui/components/Link.vue";
import { desktopUpdate } from "@/app/desktopUpdateStore";
import { useDaemon } from "@/core/daemon";
import SettingsRow from "./SettingsRow.vue";
import SettingsSection from "./SettingsSection.vue";

const REPO_URL = "https://github.com/Blaise1030/orso";
const DOCS_URL = `${REPO_URL}/tree/main/docs`;

const daemon = useDaemon();
const version = ref<string | null>(null);
const unavailable = ref(false);

onMounted(async () => {
  try {
    const health = await daemon.api.health();
    version.value = health.version;
  } catch {
    unavailable.value = true;
  }
});

function openDownload() {
  const url = desktopUpdate.value?.downloadUrl;
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <SettingsSection label="About" icon="i-hugeicons-information-circle" data-testid="about-settings">
    <SettingsRow
      icon="i-hugeicons-information-circle"
      title="Version"
      description="The version of orso running on this Mac."
    >
      <template #actions>
        <UBadge color="neutral" variant="subtle" data-testid="about-version">
          {{ version ? `v${version.replace(/^v/, "")}` : unavailable ? "Unknown" : "Checking…" }}
        </UBadge>
      </template>
    </SettingsRow>

    <SettingsRow
      v-if="desktopUpdate"
      icon="i-hugeicons-download-01"
      title="Update available"
      :description="`orso v${desktopUpdate.version} is ready to download.`"
      data-testid="about-update"
    >
      <template #actions>
        <UButton size="sm" data-testid="about-update-download" @click="openDownload">
          Download
        </UButton>
      </template>
    </SettingsRow>

    <SettingsRow
      icon="i-hugeicons-hard-drive"
      title="Your data stays local"
      description="Sites, content, and history live on this Mac. Nothing is uploaded unless you publish or share."
    />

    <SettingsRow icon="i-hugeicons-link-square-02" title="Links">
      <template #description>
        <ULink :to="DOCS_URL" target="_blank" class="text-highlighted underline underline-offset-4">
          Documentation
        </ULink>
        and
        <ULink :to="REPO_URL" target="_blank" class="text-highlighted underline underline-offset-4">
          orso on GitHub
        </ULink>.
      </template>
    </SettingsRow>
  </SettingsSection>
</template>
