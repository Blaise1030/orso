<script setup lang="ts">
/** Still illustration: a Markdown file diff with red deletions and green additions. */
defineProps<{ file: string }>();

const lines = [
  { kind: "hunk", text: "@@ -1,7 +1,7 @@" },
  { kind: "ctx", text: "---" },
  { kind: "del", text: 'title: "Hello world"' },
  { kind: "add", text: 'title: "Welcome to Orso"' },
  { kind: "ctx", text: 'description: "A short intro."' },
  { kind: "ctx", text: "---" },
  { kind: "ctx", text: "" },
  { kind: "del", text: "A starter page for the site." },
  { kind: "add", text: "Your repository is already a CMS." },
  { kind: "ctx", text: "" },
  { kind: "ctx", text: "Edit in Orso. Every save is a commit." },
] as const;
</script>

<template>
  <div class="flex size-full flex-col p-4" aria-hidden="true">
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-surface-raised shadow-raised">
      <div class="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <span class="size-2 rounded-full bg-status-danger/80" />
        <span class="size-2 rounded-full bg-status-draft/80" />
        <span class="size-2 rounded-full bg-status-live/80" />
        <p class="ml-1 truncate font-mono text-label text-muted">{{ file }}</p>
        <span class="ml-auto shrink-0 font-mono text-label text-muted">diff</span>
      </div>
      <div class="min-h-0 flex-1 overflow-hidden bg-surface py-1 font-mono text-label leading-5">
        <div
          v-for="(line, index) in lines"
          :key="index"
          class="flex gap-3 px-3"
          :class="{
            'bg-status-danger/10 text-status-danger': line.kind === 'del',
            'bg-status-live/10 text-status-live': line.kind === 'add',
            'text-muted': line.kind === 'hunk',
            'text-ink': line.kind === 'ctx',
          }"
        >
          <span class="w-3 shrink-0 select-none text-center opacity-80">
            {{ line.kind === "del" ? "−" : line.kind === "add" ? "+" : " " }}
          </span>
          <span class="min-w-0 truncate whitespace-pre">{{ line.text || " " }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
