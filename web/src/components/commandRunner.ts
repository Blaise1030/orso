import type { InjectionKey } from "vue";

/**
 * Runs a setup command somewhere the user can watch it. Onboarding provides one
 * that runs it in its built-in terminal; without a provider, `CommandBlock`
 * opens the Terminal app instead.
 */
export type CommandRunner = (command: string) => void;

export const COMMAND_RUNNER: InjectionKey<CommandRunner> = Symbol("command-runner");
