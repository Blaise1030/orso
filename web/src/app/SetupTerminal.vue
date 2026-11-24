<script setup lang="ts">
// Onboarding's built-in terminal: runs one setup command at a time (the vendor's
// own installer or sign-in) in a pseudo-terminal on the daemon, streamed over
// `/ws/terminal`, rendered by wterm with the Ghostty core. The daemon only runs
// the guides' commands, and the session is that command: when it exits, the
// terminal stops taking input until the next one starts.
//
// The Ghostty core (WASM) is loaded only when this panel mounts, so it never
// weighs on the rest of the app.
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { Terminal, type WTerm } from "@wterm/vue";
import type { GhosttyCore } from "@wterm/ghostty";
import "@wterm/vue/css";
import { useDaemon } from "@/core/daemon";

export type RunState = "idle" | "running" | "done" | "failed";

const props = defineProps<{
  /** The friendly line above the terminal while a command runs, e.g. "Installing OpenCode". */
  label?: string | null;
}>();

const emit = defineEmits<{
  exit: [command: string, code: number | null];
  /** The run state and its friendly status line, for the form to show. */
  status: [state: RunState, text: string | null];
}>();

const daemon = useDaemon();

/** The Ghostty core; null until loaded, or if it fails (wterm's built-in core is used then). */
const core = shallowRef<GhosttyCore | null>(null);
const coreSettled = ref(false);
void import("@wterm/ghostty")
  .then(({ GhosttyCore }) => GhosttyCore.load({ scrollbackLines: 2000 }))
  .then((loaded) => (core.value = loaded))
  .catch(() => {})
  .finally(() => (coreSettled.value = true));

const term = shallowRef<WTerm | null>(null);
const state = ref<RunState>("idle");
const command = ref<string | null>(null);
const size = { cols: 80, rows: 24 };
let socket: WebSocket | null = null;
/** A run asked for before the terminal was ready. */
let queued: string | null = null;

function socketUrl(cmd: string): string {
  const config = daemon.config.value;
  const url = new URL("/ws/terminal", config.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (config.token) url.searchParams.set("t", config.token);
  url.searchParams.set("command", cmd);
  url.searchParams.set("cols", String(size.cols));
  url.searchParams.set("rows", String(size.rows));
  return url.toString();
}

function closeSocket() {
  if (!socket) return;
  socket.onclose = null;
  socket.onmessage = null;
  socket.close();
  socket = null;
}

// orso's own lines (the greeting, the command line, done/failed) type in like
// someone is writing them; the command's real output streams as it arrives.
// Starting a new command cuts any typing short.
const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
let typing = 0;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Writes `text` a character at a time (escape sequences whole); false if cut short. */
async function typeOut(wt: WTerm, text: string, msPerChar = 14): Promise<boolean> {
  const gen = typing;
  if (reduceMotion) {
    wt.write(text);
    return true;
  }
  for (const token of text.match(/\x1b\[[0-9;]*[A-Za-z]|\r\n|[\s\S]/gu) ?? []) {
    if (gen !== typing) return false;
    wt.write(token);
    if (!token.startsWith("\x1b") && token.trim()) await sleep(msPerChar);
  }
  return gen === typing;
}

/** Writes `lines` one after another, like they're being drawn; false if cut short. */
async function drawLines(wt: WTerm, lines: string[], msPerLine = 45): Promise<boolean> {
  const gen = typing;
  for (const line of lines) {
    if (gen !== typing) return false;
    wt.write(line);
    if (!reduceMotion) await sleep(msPerLine);
  }
  return gen === typing;
}

/** Start `cmd`, stopping whatever was running. */
async function run(cmd: string) {
  if (!term.value) {
    queued = cmd;
    return;
  }
  closeSocket();
  const gen = ++typing;
  const wt = term.value;
  command.value = cmd;
  state.value = "running";
  wt.write("\x1b[2J\x1b[3J\x1b[H");
  await typeOut(wt, `\x1b[2m$ ${cmd}\x1b[0m\r\n\r\n`, 10);
  // Another run started while this one was typing its command line.
  if (gen !== typing) return;

  const ws = new WebSocket(socketUrl(cmd));
  ws.binaryType = "arraybuffer";
  let exited = false;
  ws.onmessage = (event) => {
    if (typeof event.data === "string") {
      try {
        const msg = JSON.parse(event.data) as { type?: string; code?: number | null };
        if (msg.type === "exit") {
          exited = true;
          void finish(cmd, msg.code ?? null);
        }
      } catch {
        // Ignore anything that isn't a control message.
      }
      return;
    }
    wt.write(new Uint8Array(event.data as ArrayBuffer));
  };
  ws.onclose = () => {
    // Closed without an exit report: the daemon went away or refused the command.
    if (!exited && socket === ws) {
      wt.write("\r\n\x1b[31morso lost the connection to this command.\x1b[0m\r\n");
      void finish(cmd, null);
    }
  };
  socket = ws;
  wt.focus();
}

async function finish(cmd: string, code: number | null) {
  const ok = code === 0;
  state.value = ok ? "done" : "failed";
  socket = null;
  const wt = term.value;
  if (wt) {
    await typeOut(
      wt,
      ok
        ? "\r\n\x1b[32m✓ Done.\x1b[0m\r\n"
        : "\r\n\x1b[33mThat didn't finish. Scroll up to see what happened, then try again.\x1b[0m\r\n",
    );
  }
  emit("exit", cmd, code);
}

/** orso's bear, greeting the user before the first command runs. */
const BEAR = [
  " .--.         .--.",
  " |  |_________|  |",
  " |               |",
  " |   [o]   [o]   |",
  " |      [Y]      |",
  " |     '---'     |",
  " |_______________|",
];

async function greet(wt: WTerm) {
  const dim = "\x1b[2m";
  const reset = "\x1b[0m";
  wt.write("\r\n");
  if (!(await drawLines(wt, BEAR.map((line) => `${line}\r\n`)))) return;
  wt.write("\r\n");
  if (!(await typeOut(wt, `  \x1b[1mHi, I'm orso.${reset}\r\n`, 35))) return;
  await typeOut(wt, `  ${dim}Each step on the left runs here. Nothing to do yet.${reset}\r\n`);
}

function onReady(wt: WTerm) {
  term.value = wt;
  void greet(wt);
  if (queued) {
    const next = queued;
    queued = null;
    void run(next);
  }
}

function onData(data: string) {
  if (state.value === "running" && socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "input", data }));
  }
}

function onResize(cols: number, rows: number) {
  size.cols = cols;
  size.rows = rows;
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "resize", cols, rows }));
  }
}

onBeforeUnmount(() => {
  typing++;
  closeSocket();
  core.value?.dispose();
});

/** The friendly status line for the step the user is on (shown outside the terminal). */
const status = computed(() => {
  if (state.value === "running") return props.label ? `${props.label}…` : "Running…";
  if (state.value === "done") return props.label ? `${props.label}: done` : "Done";
  if (state.value === "failed") return "That didn't finish";
  return null;
});

watch([state, status], () => emit("status", state.value, status.value));

defineExpose({ run, state, command });
</script>

<template>
  <section
    class="setup-terminal bg-muted text-default flex min-h-0 flex-col"
    aria-label="Setup terminal"
    data-testid="setup-terminal"
    :data-state="state"
  >
    <Terminal
      v-if="coreSettled"
      :core="core ?? undefined"
      auto-resize
      :cursor-blink="state === 'running'"
      aria-label="Setup terminal input"
      class="min-h-0 flex-1 px-5 py-6"
      @ready="onReady"
      @data="onData"
      @resize="onResize"
    />
  </section>
</template>

<style scoped>
/* Follows the app's light/dark theme: background and text come from the UI tokens,
   and the 16 ANSI colors from a palette for each. */
.setup-terminal :deep(.wterm) {
  --term-bg: var(--ui-bg-muted);
  --term-fg: var(--ui-text);
  --term-cursor: var(--ui-text-muted);
  --term-selection-bg: color-mix(in oklab, var(--ui-primary) 25%, transparent);
  --term-font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  --term-font-size: 13px;

  --term-color-0: #383a42;
  --term-color-1: #c4372b;
  --term-color-2: #3f8a3e;
  --term-color-3: #9a6b3f;
  --term-color-4: #3c6fd9;
  --term-color-5: #a626a4;
  --term-color-6: #0f7f9e;
  --term-color-7: #6b6f7a;
  --term-color-8: #8a8f99;
  --term-color-9: #d9473a;
  --term-color-10: #4b9d49;
  --term-color-11: #b07c47;
  --term-color-12: #4a7ef0;
  --term-color-13: #b73ab5;
  --term-color-14: #1490b3;
  --term-color-15: #383a42;
}

:global(.dark) .setup-terminal :deep(.wterm) {
  --term-color-0: #1e1e1e;
  --term-color-1: #f2685d;
  --term-color-2: #7cc47a;
  --term-color-3: #d7b98e;
  --term-color-4: #6aa6ef;
  --term-color-5: #d08ad0;
  --term-color-6: #5fcfbd;
  --term-color-7: #c8c8c8;
  --term-color-8: #808080;
  --term-color-9: #ff7b70;
  --term-color-10: #8fd68c;
  --term-color-11: #e6c99f;
  --term-color-12: #82b8f7;
  --term-color-13: #dd9ddd;
  --term-color-14: #74dccb;
  --term-color-15: #ffffff;
}
</style>
