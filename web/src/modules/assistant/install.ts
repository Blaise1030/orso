// How to install and sign in to each assistant yourself. orso does not download
// the assistants or run their sign-in: the user runs each CLI's own commands in
// Terminal (sign-in completes in the CLI's own flow), and setup polls until the
// daemon reports the CLI on the PATH and signed in.
//
// Commands come from each vendor's official install docs (linked by `docsUrl`).

export interface InstallGuide {
  /** One-line install command for macOS, pasted into Terminal. */
  install: string;
  /**
   * The CLI's own sign-in command, or `null` when the assistant works without
   * an account (OpenCode's free models).
   */
  signIn: string | null;
  /** The vendor's install page, for other install methods and troubleshooting. */
  docsUrl: string;
}

export const INSTALL_GUIDES: Record<string, InstallGuide> = {
  opencode: {
    install: "curl -fsSL https://opencode.ai/v2/install | bash",
    signIn: null,
    docsUrl: "https://opencode.ai/docs",
  },
  claude: {
    install: "curl -fsSL https://claude.ai/install.sh | bash",
    signIn: "claude auth login",
    docsUrl: "https://code.claude.com/docs/en/setup",
  },
  codex: {
    install: "curl -fsSL https://chatgpt.com/codex/install.sh | sh",
    signIn: "codex login",
    docsUrl: "https://learn.chatgpt.com/codex/cli",
  },
  cursor: {
    install: "curl https://cursor.com/install -fsS | bash",
    signIn: "cursor-agent login",
    docsUrl: "https://cursor.com/docs/cli/installation",
  },
};

export function installGuide(id: string): InstallGuide | null {
  return INSTALL_GUIDES[id] ?? null;
}

/** How often an open guide asks the daemon whether the install or sign-in finished. */
export const GUIDE_POLL_MS = 3000;
