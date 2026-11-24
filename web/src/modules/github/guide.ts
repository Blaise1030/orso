// The GitHub CLI commands the GitHub guide shows (from GitHub's own docs:
// https://cli.github.com and `gh auth login --help`), and how often it re-checks.

export const GH_COMMANDS = {
  /** Apple's Command Line Tools, which include Git. */
  git: "xcode-select --install",
  install: "brew install gh",
  /** Browser sign-in: gh shows a one-time code to paste on github.com. */
  signIn: "gh auth login --web",
} as const;

/** How often the guide re-checks while the user works in Terminal. */
export const GH_GUIDE_POLL_MS = 3000;
