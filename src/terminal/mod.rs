//! Run a setup command for the user, so they never paste one themselves: in
//! onboarding's built-in terminal ([`pty`]), or in the Terminal app.
//!
//! orso doesn't install the assistants or the GitHub tools, or run their sign-in:
//! each vendor's own command does, in a Terminal window the user watches. The
//! daemon writes a one-shot `.command` script (it deletes itself as it starts) and
//! `open`s it, which macOS hands to Terminal (or the user's chosen terminal app).
//!
//! Only the commands in [`ALLOWED`] can run: the web UI names one, the daemon
//! checks it word for word. These must match the guides' commands
//! (`web/src/modules/assistant/install.ts`, `web/src/modules/github/guide.ts`).

use std::path::{Path, PathBuf};

use crate::error::ApiError;

pub mod pty;

/// Every command a setup guide may ask the daemon to run, exactly as the guide shows it.
pub const ALLOWED: &[&str] = &[
    // Assistants: install
    "curl -fsSL https://opencode.ai/v2/install | bash",
    "curl -fsSL https://claude.ai/install.sh | bash",
    "curl -fsSL https://chatgpt.com/codex/install.sh | sh",
    "curl https://cursor.com/install -fsS | bash",
    // Assistants: sign in
    "claude auth login",
    "codex login",
    "cursor-agent login",
    // GitHub
    "xcode-select --install",
    "brew install gh",
    "gh auth login --web",
];

/// Shown at the top of the window, before the command runs.
const INTRO: &str = "orso opened this window to run:";
const DONE: &str = "All done. You can close this window and go back to orso.";
const FAILED: &str =
    "That didn't finish. Scroll up to see what went wrong, then try again from orso.";

pub fn is_allowed(command: &str) -> bool {
    ALLOWED.contains(&command)
}

/// `text` as one single-quoted shell word.
fn quote(text: &str) -> String {
    format!("'{}'", text.replace('\'', r"'\''"))
}

/// The `.command` script: removes itself, shows what it runs, runs it in the user's
/// login shell (so installers' PATH changes and the user's own PATH apply), then says
/// whether it worked.
pub fn script(command: &str) -> String {
    let body = format!(
        "if {command}; then echo; echo {done}; else echo; echo {failed}; fi",
        done = quote(DONE),
        failed = quote(FAILED),
    );
    [
        "#!/bin/sh".to_string(),
        r#"rm -f -- "$0""#.to_string(),
        "clear".to_string(),
        format!(
            r"printf '%s\n\n  %s\n\n' {} {}",
            quote(INTRO),
            quote(command)
        ),
        format!(r#"exec "${{SHELL:-/bin/zsh}}" -lic {}"#, quote(&body)),
        String::new(),
    ]
    .join("\n")
}

/// Where the one-shot scripts are written: private to the user.
fn scripts_dir() -> PathBuf {
    crate::setup_prefs::prefs_dir().join("terminal")
}

fn write_script(dir: &Path, command: &str) -> std::io::Result<PathBuf> {
    use std::io::Write;
    use std::os::unix::fs::{DirBuilderExt, OpenOptionsExt, PermissionsExt};

    std::fs::DirBuilder::new()
        .recursive(true)
        .mode(0o700)
        .create(dir)?;
    std::fs::set_permissions(dir, std::fs::Permissions::from_mode(0o700))?;
    let name = format!("setup-{:016x}.command", rand::random::<u64>());
    let path = dir.join(name);
    // `create_new` never follows or overwrites anything already at the path.
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o700)
        .open(&path)?;
    file.write_all(script(command).as_bytes())?;
    Ok(path)
}

/// Opens Terminal running `command`, which must be in [`ALLOWED`].
pub async fn run(command: &str) -> Result<(), ApiError> {
    if !is_allowed(command) {
        return Err(ApiError::badreq("orso can't run that command for you"));
    }
    if !cfg!(target_os = "macos") {
        return Err(ApiError::badreq(
            "Opening Terminal only works on a Mac. Copy the command into your terminal instead.",
        )
        .with_status(501));
    }
    let path = write_script(&scripts_dir(), command)
        .map_err(|e| ApiError::io(format!("couldn't prepare the Terminal window: {e}")))?;
    let out = tokio::process::Command::new("open")
        .arg(&path)
        .output()
        .await
        .map_err(|e| ApiError::io(format!("couldn't open Terminal: {e}")))?;
    if !out.status.success() {
        let _ = std::fs::remove_file(&path);
        return Err(ApiError::io(format!(
            "couldn't open Terminal: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_guides_commands_are_allowed() {
        assert!(is_allowed("claude auth login"));
        assert!(is_allowed("gh auth login --web"));
        assert!(!is_allowed("claude auth login; rm -rf ~"));
        assert!(!is_allowed("rm -rf ~"));
        assert!(!is_allowed(""));
    }

    #[test]
    fn script_deletes_itself_and_runs_the_command_in_a_login_shell() {
        let s = script("curl -fsSL https://claude.ai/install.sh | bash");
        assert!(s.starts_with("#!/bin/sh\nrm -f -- \"$0\"\n"), "{s}");
        assert!(
            s.contains("-lic 'if curl -fsSL https://claude.ai/install.sh | bash; then"),
            "{s}"
        );
        assert!(s.contains("All done."), "{s}");
    }

    #[test]
    fn script_quotes_single_quotes() {
        assert_eq!(quote("it's"), r"'it'\''s'");
    }

    /// Runs the generated script with `/bin/sh` standing in for the login shell.
    fn run_script(command: &str) -> (String, bool) {
        let dir = tempfile::tempdir().unwrap();
        let path = write_script(dir.path(), command).unwrap();
        let out = std::process::Command::new("/bin/sh")
            .arg(&path)
            .env("SHELL", "/bin/sh")
            .env("HOME", dir.path())
            .env("TERM", "dumb")
            .output()
            .unwrap();
        (
            String::from_utf8_lossy(&out.stdout).into_owned(),
            path.exists(),
        )
    }

    #[test]
    fn script_runs_the_command_and_says_it_worked() {
        let (stdout, left) = run_script("echo hi");
        assert!(stdout.contains("hi"), "{stdout}");
        assert!(stdout.contains(DONE), "{stdout}");
        assert!(!left, "the script removes itself");
    }

    #[test]
    fn script_says_when_the_command_failed() {
        let (stdout, _) = run_script("false");
        assert!(stdout.contains(FAILED), "{stdout}");
        assert!(!stdout.contains(DONE), "{stdout}");
    }
}
