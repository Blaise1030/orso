# Secured agent toolbelt (design)

Date: 2026-11-25  
Status: Approved (brainstorming)  
Tracker: GitHub Issues, Blaise1030/cms

## Summary

Keep vendor coding CLIs (Claude, Codex, OpenCode, Cursor) as the agent engine. Add an orso **policy plane** so fewer destructive operations succeed for non-technical users. Skills on disk steer; shims and ACP policy enforce.

## Goals

1. Agents can still inspect and edit the current change and sync with `main`.
2. Destructive or product-owned git/product actions are hard-blocked or require explicit approval.
3. `auto_approve` means “auto-allow the safe class”, not “disable the CLI sandbox”.
4. **Users keep their existing MCP servers** configured on Claude / Codex / OpenCode / Cursor. orso must not wipe, replace, or default-deny those tools.

## Non-goals (v1)

- Replacing CLIs with an owned Think-style agent.
- OS-level sandbox / blocking absolute `/usr/bin/git`.
- Closed tool surface identical to VibeSDK (`workspaceBash = false`).
- orso becoming an MCP host that re-declares the user’s servers (agents keep loading MCP from their own config).

## Architecture

```
UI chat → ACP → vendor CLI
                ↑
         orso policy: PATH git shim + ACP allow/ask/deny + skills files
```

### Layer 1 — Git shim allowlist (slice 1)

Extend `src/git_shim.rs` from “block HEAD-moving checkout/switch” to **default-deny** except an allowlist.

**Allow**

| Command | Notes |
| --- | --- |
| `status`, `diff`, `log`, `show`, `ls-files`, `rev-parse`, `blame`, `describe` | Read / inspect |
| `branch` | List only (no `-d/-D/-m/-c/-C`, no create) |
| `remote`, `remote -v` | List only (no add/remove/set-url) |
| `add`, `commit`, `rm`, `mv` | Work on current change |
| `restore` | Working tree / index restore |
| `checkout` / path forms | Only path restores (`checkout -- <paths>`, `checkout <tree-ish> -- <paths>`); bare `checkout` with no args may pass as no-op |
| `fetch` | |
| `merge`, `merge --abort` | Sync with main; recover |

**Deny (examples):** HEAD-moving `checkout`/`switch` (unless `ORSO_ALLOW_CHECKOUT=1` for the app), `push`, `pull`, `rebase`, `reset`, `clean`, `stash`, `worktree`, mutating `branch`/`tag`/`remote`/`config`, unknown subcommands.

**Escape:** `-c` / `--exec-path` that could redefine aliases: strip or deny `-c` for agents (prefer deny any `-c` / `--exec-path` in the shim argv).

**Messages:** Distinct stderr, e.g. `orso: git <cmd> is not allowed from the assistant` vs the existing draft-switch message.

**App:** `ORSO_ALLOW_CHECKOUT=1` still permits the app’s HEAD-moving checkout/switch only.

### Layer 2 — ACP permission policy + safer `auto_approve` (slice 2)

Classify ACP `session/request_permission` (and tool metadata when present):

- **Auto-allow:** in-project reads/edits, `orso ctl *`, allowlisted git.
- **Ask:** network, package install, ambiguous shell.
- **Allow / ask (never blanket-deny):** MCP tool calls from the user’s existing agent MCP config.
- **Deny:** destructive shell, path escape, publish/share equivalents.

`auto_approve` auto-allows the safe class only; stop appending `--dangerously-skip-permissions` / `--force` / Opencode `permission: allow` as the default meaning of that toggle.

**MCP preservation (required):**

- ACP `session/new` must send `mcpServers` as an **array** (adapters return `-32602` if it is omitted/`undefined`). `[]` means no *client-provided* servers; per ACP, MCP the agent loads from its own user config is unaffected.
- OpenCode: today’s `OPENCODE_CONFIG_DIR` points at a daemon-owned dir that **replaces** the user’s global OpenCode config — that can drop their MCP. Slice 2 must overlay orso instructions/hooks without discarding the user’s MCP (and other) config.
- Cursor / Claude / Codex: keep using the user’s normal config home; do not write empty MCP manifests over it.

### Layer 3 — Skills (done / soft)

VibeSDK frontend-design skills vendored under `{orso.json root}/.agents/skills/` on init. Soft guidance only.

## Phasing

1. **Slice 1:** Git allowlist in `git_shim.rs` + unit tests.
2. **Slice 2:** ACP policy + `auto_approve` semantics.
3. Later: optional OS sandbox; document residual bypass (absolute git path).

## Success criteria

- Agent `git push` / `git reset --hard` / `git checkout other-branch` fail via the shim with a clear message.
- Agent `git status` / `git add` / `git commit` / `git fetch` / `git merge origin/main` / path `checkout -- file` still work.
- App draft switching still works with `ORSO_ALLOW_CHECKOUT=1`.
- Existing project skills unrelated to git are unchanged.
