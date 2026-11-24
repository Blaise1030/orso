import { afterEach, describe, expect, it } from "vitest";
import type { SetupProvider, SetupStatus } from "@/core/types";
import { enableFreshSetup, freshProvider, freshStatus, markRan } from "./freshSetup";
import { INSTALL_GUIDES } from "@/modules/assistant/install";
import { GH_COMMANDS } from "@/modules/github/guide";

const claude: SetupProvider = {
  id: "claude",
  name: "Claude Code",
  available: true,
  runtime: { phase: "ready", version: "2.1.0", source: "system", progress: null, message: null },
  installed: true,
  signedIn: true,
  chatReady: true,
  freeModels: false,
  reason: null,
};

const status: SetupStatus = {
  git: true,
  gh: true,
  githubSignedIn: true,
  providers: [claude],
  projectsDir: "/p",
} as SetupStatus;

afterEach(() => enableFreshSetup(false));

describe("fresh setup", () => {
  it("changes nothing when off", () => {
    expect(freshProvider(claude)).toBe(claude);
    expect(freshStatus(status)).toBe(status);
  });

  it("shows everything but Git as not done", () => {
    enableFreshSetup(true);
    const p = freshProvider(claude);
    expect(p).toMatchObject({ installed: false, signedIn: false, chatReady: false });
    expect(p.runtime?.phase).toBe("notDownloaded");
    expect(freshStatus(status)).toMatchObject({ git: true, gh: false, githubSignedIn: false });
  });

  it("lets the real status through once a step's command succeeded", () => {
    enableFreshSetup(true);
    markRan(INSTALL_GUIDES.claude!.install);
    expect(freshProvider(claude)).toMatchObject({ installed: true, signedIn: false, chatReady: false });
    markRan(INSTALL_GUIDES.claude!.signIn!);
    expect(freshProvider(claude)).toMatchObject({ installed: true, signedIn: true, chatReady: true });
    markRan(GH_COMMANDS.install);
    markRan(GH_COMMANDS.signIn);
    expect(freshStatus(status)).toMatchObject({ gh: true, githubSignedIn: true });
  });

  it("starts over each time it's turned on", () => {
    enableFreshSetup(true);
    markRan(INSTALL_GUIDES.claude!.install);
    enableFreshSetup(true);
    expect(freshProvider(claude).installed).toBe(false);
  });
});
