//! Agent `git` policy: PATH shim default-denies except an allowlist.
//!
//! Chat agents run with a daemon-generated `git` launcher first on their
//! `PATH`; the launcher execs this binary's `git-shim` subcommand. Allowed
//! commands are `exec`'d into the real git ([`REAL_GIT_ENV`], else the next
//! `git` on `PATH`) so exit codes, stdio and argv pass through faithfully.
//!
//! The app may set [`ALLOW_ENV`] to permit a single HEAD-moving checkout/switch
//! when switching drafts; agents never get that env.

use std::ffi::{OsStr, OsString};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

#[cfg(unix)]
use std::os::unix::process::CommandExt;

use crate::config::Config;

/// Set to `1` only on the app's own checkout, permitting that single HEAD move.
pub const ALLOW_ENV: &str = "ORSO_ALLOW_CHECKOUT";
/// The real git to exec for allowed commands, resolved at spawn time.
pub const REAL_GIT_ENV: &str = "ORSO_REAL_GIT";
/// Stderr when the assistant tries to switch drafts (HEAD-moving checkout/switch).
pub const BLOCKED_MSG: &str = "orso: switching drafts is only allowed from the app";
/// Stderr when the assistant runs a git command outside the allowlist.
pub const DENIED_MSG: &str = "orso: that git command is not allowed from the assistant";
/// Marker near the top of the generated `git` launcher, used to skip it when falling back
/// to "the next git on PATH".
const SHIM_MARKER: &str = "orso git-shim";

/// `{projects_dir}/.orso/bin`, the daemon-owned dir holding the `git` launcher.
pub fn shim_dir(projects_dir: &Path) -> PathBuf {
    projects_dir.join(crate::projects::STATE_DIR).join("bin")
}

/// Whether a `git` invocation (args after the command, no leading `git`) moves HEAD.
///
/// Blocks only HEAD-moving forms: `checkout <branch>` (including the `-` alias for the
/// previous branch), `checkout -b/-B/--orphan/--detach`, and `switch` with any argument.
/// Path restores (`checkout -- <path>` and `checkout <tree-ish> -- <path>`) and every
/// non-checkout command pass through.
pub fn is_head_moving(args: &[String]) -> bool {
    let Some(start) = subcommand_start(args) else {
        return false;
    };
    match args[start].as_str() {
        "checkout" => checkout_moves_head(&args[start + 1..]),
        "switch" => !args[start + 1..].is_empty(),
        _ => false,
    }
}

/// Whether the agent may run this `git` argv (no leading `git`).
///
/// Default-deny. See the secured-agent toolbelt design for the allowlist.
pub fn is_allowed(args: &[String]) -> bool {
    if has_forbidden_globals(args) {
        return false;
    }
    let Some(start) = subcommand_start(args) else {
        // Only global flags / empty — nothing to do; harmless.
        return true;
    };
    let cmd = args[start].as_str();
    let rest = &args[start + 1..];
    match cmd {
        "status" | "diff" | "log" | "show" | "ls-files" | "rev-parse" | "blame" | "describe"
        | "add" | "commit" | "rm" | "mv" | "restore" | "fetch" => true,
        "merge" => true,
        "branch" => branch_is_list_only(rest),
        "remote" => remote_is_list_only(rest),
        "checkout" => !checkout_moves_head(rest),
        // Bare `switch` is a no-op; any args move HEAD and are denied.
        "switch" => rest.is_empty(),
        _ => false,
    }
}

/// `-c` / `--exec-path` can redefine aliases or helpers and escape the allowlist.
fn has_forbidden_globals(args: &[String]) -> bool {
    let mut i = 0;
    while let Some(a) = args.get(i) {
        match a.as_str() {
            "-c" | "--exec-path" => return true,
            _ if a.starts_with("--exec-path=") => return true,
            // `-c` attached form does not exist; `-Cdir` is cwd.
            "-C" | "--git-dir" | "--work-tree" | "--namespace" => i += 2,
            _ if a.starts_with("--git-dir=")
                || a.starts_with("--work-tree=")
                || a.starts_with("--namespace=")
                || (a.starts_with("-C") && a.len() > 2) =>
            {
                i += 1
            }
            "-P" | "--no-pager" | "--paginate" | "--no-replace-objects" | "--bare" => i += 1,
            _ => return false, // hit subcommand or unknown; not a forbidden global
        }
    }
    false
}

/// Index of the subcommand in a full `git` argv (without the leading `git`), skipping
/// global options. `None` when the argv is only global options.
fn subcommand_start(args: &[String]) -> Option<usize> {
    let mut i = 0;
    while let Some(a) = args.get(i) {
        match a.as_str() {
            // Options taking the next argument as their value.
            "-C" | "-c" | "--git-dir" | "--work-tree" | "--namespace" | "--exec-path" => i += 2,
            // Attached-value forms (`--git-dir=<dir>`, `-C<dir>`).
            _ if a.starts_with("--git-dir=")
                || a.starts_with("--work-tree=")
                || a.starts_with("--namespace=")
                || a.starts_with("--exec-path=")
                || (a.starts_with("-C") && a.len() > 2) =>
            {
                i += 1
            }
            // Flags without a value.
            "-P" | "--no-pager" | "--paginate" | "--no-replace-objects" | "--bare" => i += 1,
            _ => return Some(i),
        }
    }
    None
}

fn checkout_moves_head(args: &[String]) -> bool {
    // Split at the first `--`: with a pathspec after it this is a path restore and HEAD
    // stays put; a trailing `--` with nothing after it changes nothing, so the form
    // before it decides (`checkout other --` still switches).
    let (head, paths) = match args.iter().position(|a| a == "--") {
        Some(pos) => (&args[..pos], &args[pos + 1..]),
        None => (args, &[][..]),
    };
    if !paths.is_empty()
        && !head.iter().any(|a| {
            matches!(a.as_str(), "-b" | "-B" | "--orphan")
                || a.starts_with("--orphan=")
                || (a.starts_with("-b") && a.len() > 2)
                || (a.starts_with("-B") && a.len() > 2)
        })
    {
        return false;
    }
    let eval = if paths.is_empty() { head } else { args };
    // Branch-creating/detaching forms always move HEAD (attached values included).
    if eval.iter().any(|a| {
        matches!(a.as_str(), "-b" | "-B" | "--orphan" | "--detach")
            || a.starts_with("--orphan=")
            || (a.starts_with("-b") && a.len() > 2)
            || (a.starts_with("-B") && a.len() > 2)
    }) {
        return true;
    }
    if !paths.is_empty() {
        return false;
    }
    // No `--`: a branch argument switches HEAD. `-` is an alias for the previous branch.
    head.iter().any(|a| a == "-" || !a.starts_with('-'))
}

fn branch_is_list_only(args: &[String]) -> bool {
    for a in args {
        let s = a.as_str();
        if matches!(
            s,
            "-d" | "-D"
                | "-m"
                | "-M"
                | "-c"
                | "-C"
                | "--delete"
                | "--move"
                | "--copy"
                | "--set-upstream-to"
                | "--unset-upstream"
                | "--edit-description"
        ) || s.starts_with("--set-upstream-to=")
            || s.starts_with("--delete=")
        {
            return false;
        }
        // Non-flag argument would create or name a branch.
        if !s.starts_with('-') {
            return false;
        }
    }
    true
}

fn remote_is_list_only(args: &[String]) -> bool {
    if args.is_empty() {
        return true;
    }
    // `remote -v` / `remote --verbose` only.
    args.iter().all(|a| matches!(a.as_str(), "-v" | "--verbose"))
}

/// Ensure the `git` launcher exists in [`shim_dir`] and return that dir. `None` when there
/// is no projects dir (tests) or the launcher cannot be written.
pub fn ensure_shim_dir(config: &Config) -> Option<PathBuf> {
    if config.projects_dir.as_os_str().is_empty() {
        return None;
    }
    let dir = shim_dir(&config.projects_dir);
    let script = dir.join("git");
    let content = shim_script(&config.hook_exe_path());
    if std::fs::create_dir_all(&dir).is_err() {
        eprintln!("orso: cannot create the git launcher dir {}", dir.display());
        return None;
    }
    let fresh = std::fs::read_to_string(&script)
        .map(|existing| existing != content)
        .unwrap_or(true);
    if fresh && write_executable(&script, &content).is_err() {
        eprintln!(
            "orso: cannot write the git launcher {}; agents may run unrestricted git",
            script.display()
        );
        return None;
    }
    Some(dir)
}

/// The system git the shim execs, resolved at spawn time: the first `git` on the daemon's
/// `PATH` (the same resolution as its own `git` invocations), else the bare name.
pub fn resolve_system_git() -> OsString {
    let path = std::env::var_os("PATH").unwrap_or_default();
    for dir in std::env::split_paths(&path) {
        let cand = dir.join("git");
        if is_executable(&cand) {
            return cand.into_os_string();
        }
    }
    OsString::from("git")
}

/// The shim entry point: enforce the allowlist (and draft-switch rules), else `exec` real git.
pub fn run(args: Vec<String>) -> ExitCode {
    let app_checkout = std::env::var_os(ALLOW_ENV).as_deref() == Some(OsStr::new("1"));
    if app_checkout && is_head_moving(&args) {
        // App draft switch — fall through.
    } else if is_head_moving(&args) {
        eprintln!("{BLOCKED_MSG}");
        return ExitCode::from(1);
    } else if !is_allowed(&args) {
        eprintln!("{DENIED_MSG}");
        return ExitCode::from(1);
    }
    let git = real_git();
    #[cfg(unix)]
    {
        let err = std::process::Command::new(&git).args(&args).exec();
        eprintln!("orso: cannot run git ({}): {err}", git.to_string_lossy());
    }
    #[cfg(not(unix))]
    {
        let _ = (git, args);
    }
    ExitCode::from(1)
}

/// The real git to exec: `$ORSO_REAL_GIT` (when it names a path), else the first `git` on
/// `PATH` that is not this shim.
fn real_git() -> OsString {
    if let Some(git) = std::env::var_os(REAL_GIT_ENV) {
        if Path::new(&git).components().count() > 1 {
            return git;
        }
    }
    let path = std::env::var_os("PATH").unwrap_or_default();
    for dir in std::env::split_paths(&path) {
        let cand = dir.join("git");
        if is_executable(&cand) && !is_shim(&cand) {
            return cand.into_os_string();
        }
    }
    OsString::from("git")
}

fn is_shim(candidate: &Path) -> bool {
    use std::io::Read;
    let Ok(mut file) = std::fs::File::open(candidate) else {
        return false;
    };
    let mut head = [0u8; 512];
    let Ok(n) = file.read(&mut head) else {
        return false;
    };
    head[..n]
        .windows(SHIM_MARKER.len())
        .any(|w| w == SHIM_MARKER.as_bytes())
}

fn is_executable(path: &Path) -> bool {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        path.metadata()
            .is_ok_and(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
    }
    #[cfg(not(unix))]
    {
        path.is_file()
    }
}

fn write_executable(path: &Path, content: &str) -> std::io::Result<()> {
    std::fs::write(path, content)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(path)?.permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(path, perms)?;
    }
    Ok(())
}

/// POSIX single-quote `s` so a shell reads it back as one word.
fn sh_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', r"'\''"))
}

fn shim_script(orso: &Path) -> String {
    format!(
        "#!/bin/sh\n# {SHIM_MARKER}: allowlisted git for agents; do not edit.\nexec {} git-shim -- \"$@\"\n",
        sh_quote(&orso.to_string_lossy())
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn v(args: &[&str]) -> Vec<String> {
        args.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn head_moving_matrix() {
        for blocked in [
            &["checkout", "content/other"][..],
            &["checkout", "-"][..],
            &["checkout", "-b", "content/x"][..],
            &["checkout", "-B", "content/x"][..],
            &["checkout", "--orphan", "content/x"][..],
            &["checkout", "--detach"][..],
            &["checkout", "--detach", "main"][..],
            &["switch", "content/x"][..],
            &["switch", "-c", "content/x"][..],
            &["switch", "-C", "content/x"][..],
            &["switch", "--detach"][..],
            &["switch", "-"][..],
            &["-C", "/tmp", "checkout", "main"][..],
            &["-c", "user.name=x", "checkout", "main"][..],
            &["--git-dir=/tmp/x/.git", "checkout", "main"][..],
            &["--git-dir", "/tmp/x/.git", "checkout", "main"][..],
            &["checkout", "-bfoo", "main"][..],
            &["checkout", "--orphan=foo"][..],
            &["checkout", "other", "--"][..],
            &["-C", "/tmp", "switch", "main"][..],
        ] {
            assert!(is_head_moving(&v(blocked)), "{blocked:?} must be blocked");
        }
    }

    #[test]
    fn pass_through_head_moving_negatives() {
        for allowed in [
            &[] as &[&str],
            &["status"][..],
            &["add", "-A"][..],
            &["commit", "-m", "x"][..],
            &["fetch", "origin", "main"][..],
            &["merge", "origin/main"][..],
            &["checkout"][..],
            &["checkout", "--", "content/file.md"][..],
            &["checkout", "main", "--", "file.md"][..],
            &["checkout", "origin/main", "--", "file.md"][..],
            &["checkout", "HEAD", "--", "file.md"][..],
            &["checkout", "-p", "--", "content/file.md"][..],
            &["checkout", "--ours", "--", "content/file.md"][..],
            &["checkout", "-f", "--", "content/file.md"][..],
            &["switch"][..],
            &["-C", "/tmp", "status"][..],
            &["-C", "/tmp", "checkout", "--", "file.md"][..],
        ] {
            assert!(
                !is_head_moving(&v(allowed)),
                "{allowed:?} must not be head-moving"
            );
        }
    }

    #[test]
    fn allowlist_allows_repo_work() {
        for allowed in [
            &["status"][..],
            &["diff", "--staged"][..],
            &["log", "-1", "--oneline"][..],
            &["show", "HEAD"][..],
            &["ls-files"][..],
            &["rev-parse", "HEAD"][..],
            &["blame", "file.md"][..],
            &["describe", "--tags"][..],
            &["add", "-A"][..],
            &["commit", "-m", "x"][..],
            &["rm", "old.md"][..],
            &["mv", "a.md", "b.md"][..],
            &["restore", "--staged", "file.md"][..],
            &["fetch", "origin", "main"][..],
            &["merge", "origin/main"][..],
            &["merge", "--abort"][..],
            &["branch"][..],
            &["branch", "-a"][..],
            &["branch", "-vv"][..],
            &["remote"][..],
            &["remote", "-v"][..],
            &["checkout", "--", "file.md"][..],
            &["checkout", "HEAD", "--", "file.md"][..],
            &["-C", "/tmp", "status"][..],
            &["switch"][..],
        ] {
            assert!(is_allowed(&v(allowed)), "{allowed:?} must be allowed");
        }
    }

    #[test]
    fn allowlist_denies_dangerous_git() {
        for denied in [
            &["push"][..],
            &["push", "origin", "HEAD"][..],
            &["pull"][..],
            &["pull", "origin", "main"][..],
            &["rebase", "main"][..],
            &["reset", "--hard", "HEAD~1"][..],
            &["clean", "-fd"][..],
            &["stash"][..],
            &["stash", "push"][..],
            &["worktree", "add", "../x"][..],
            &["branch", "-d", "old"][..],
            &["branch", "-D", "old"][..],
            &["branch", "new-branch"][..],
            &["remote", "add", "x", "url"][..],
            &["remote", "remove", "origin"][..],
            &["config", "user.email", "x"][..],
            &["tag", "v1"][..],
            &["checkout", "main"][..],
            &["switch", "main"][..],
            &["-c", "alias.x=!touch /tmp/x", "x"][..],
            &["--exec-path=/tmp", "status"][..],
            &["--exec-path", "/tmp", "status"][..],
        ] {
            assert!(!is_allowed(&v(denied)), "{denied:?} must be denied");
        }
    }

    #[test]
    fn resolve_system_git_is_a_path_or_bare_name() {
        let git = resolve_system_git();
        let s = git.to_string_lossy();
        assert!(s == "git" || s.contains('/'), "{s}");
    }

    #[test]
    fn ensure_shim_writes_an_executable_idempotent_launcher() {
        let tmp = tempfile::tempdir().unwrap();
        let config = Config {
            projects_dir: tmp.path().to_path_buf(),
            hook_exe: Some(PathBuf::from("/app/orso")),
            ..Default::default()
        };
        let dir = ensure_shim_dir(&config).unwrap();
        assert_eq!(dir, shim_dir(tmp.path()));
        let script = dir.join("git");
        let content = std::fs::read_to_string(&script).unwrap();
        assert!(content.contains("git-shim -- \"$@\""), "{content}");
        assert!(content.contains("/app/orso"), "{content}");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_ne!(
                std::fs::metadata(&script).unwrap().permissions().mode() & 0o111,
                0
            );
        }
        // Idempotent: a second call leaves the file untouched.
        let before = std::fs::metadata(&script).unwrap().modified().unwrap();
        ensure_shim_dir(&config).unwrap();
        let after = std::fs::metadata(&script).unwrap().modified().unwrap();
        assert_eq!(before, after);
    }

    #[test]
    fn ensure_shim_skips_an_empty_projects_dir() {
        let config = Config {
            projects_dir: PathBuf::new(),
            hook_exe: Some(PathBuf::from("/app/orso")),
            ..Default::default()
        };
        assert_eq!(ensure_shim_dir(&config), None);
    }
}
