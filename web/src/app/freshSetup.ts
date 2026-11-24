// Dev only: onboarding pretends nothing is set up, so the whole flow can be
// tested on a machine where everything already is. On when Settings → "Setup
// guide" opens onboarding in a dev build; never in production.
//
// Each item counts as not done until its command succeeds in onboarding's
// terminal this session; after that the real status applies again. Git is left
// alone: `xcode-select --install` fails when Git is already there.

import { reactive, ref } from "vue";
import type { SetupProvider, SetupStatus } from "@/core/types";
import { installGuide } from "@/modules/assistant/install";
import { GH_COMMANDS } from "@/modules/github/guide";

export const freshSetup = ref(false);

/** Commands that succeeded in the terminal while fresh setup was on. */
const ran = reactive(new Set<string>());

export function enableFreshSetup(on: boolean) {
  freshSetup.value = import.meta.env.DEV && on;
  ran.clear();
}

export function markRan(command: string) {
  if (freshSetup.value) ran.add(command);
}

function done(command: string | null | undefined): boolean {
  return command == null || ran.has(command);
}

/** The provider as fresh setup shows it: not installed / signed in until its command ran. */
export function freshProvider(p: SetupProvider): SetupProvider {
  if (!freshSetup.value) return p;
  const guide = installGuide(p.id);
  if (!guide) return p;
  const installed = p.installed && done(guide.install);
  const signedIn = installed && done(guide.signIn) ? p.signedIn : false;
  return {
    ...p,
    installed,
    signedIn,
    chatReady: p.chatReady && installed && signedIn !== false,
    runtime:
      installed || !p.runtime
        ? p.runtime
        : { ...p.runtime, phase: "notDownloaded", version: null, source: null, progress: null },
  };
}

export function freshStatus(s: SetupStatus): SetupStatus;
export function freshStatus(s: SetupStatus | null): SetupStatus | null;
export function freshStatus(s: SetupStatus | null): SetupStatus | null {
  if (!s || !freshSetup.value) return s;
  const gh = s.gh && done(GH_COMMANDS.install);
  return {
    ...s,
    gh,
    githubSignedIn: gh && done(GH_COMMANDS.signIn) && s.githubSignedIn,
    providers: s.providers.map(freshProvider),
  };
}

/** Whether fresh setup hides a real GitHub sign-in (the store's `user`). */
export function freshHidesGithubUser(): boolean {
  return freshSetup.value && !done(GH_COMMANDS.signIn);
}
