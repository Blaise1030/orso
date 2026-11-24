//! One setup command in a pseudo-terminal, for onboarding's built-in terminal.
//!
//! Only commands in [`super::ALLOWED`] start, and the session *is* that command:
//! there is no shell prompt to fall back to, and it ends when the command exits.
//! The user can type into it (an installer's password prompt, `gh`'s "press
//! Enter"), but never gets a free shell.

use std::io::{Read, Write};

use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use tokio::sync::{mpsc, oneshot};

use crate::error::ApiError;

/// A running setup command. Dropping it kills the command.
pub struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    killer: Box<dyn ChildKiller + Send + Sync>,
    /// Output, in chunks; closes once the command and everything it started has exited.
    pub output: mpsc::Receiver<Vec<u8>>,
    /// The command's exit code (`None` when it was killed by a signal).
    pub exit: Option<oneshot::Receiver<Option<u32>>>,
}

fn size(cols: u16, rows: u16) -> PtySize {
    PtySize {
        cols: cols.clamp(20, 400),
        rows: rows.clamp(5, 200),
        pixel_width: 0,
        pixel_height: 0,
    }
}

/// The login shell runs the command, so installers' PATH changes and the user's own
/// PATH apply (a Finder-launched daemon has launchd's minimal PATH).
fn command(line: &str) -> CommandBuilder {
    let shell = std::env::var("SHELL")
        .ok()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "/bin/zsh".into());
    let mut cmd = CommandBuilder::new(shell);
    cmd.args(["-lic", line]);
    if let Some(home) = std::env::var_os("HOME") {
        cmd.cwd(home);
    }
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd
}

impl PtySession {
    /// Starts `line`, which must be in [`super::ALLOWED`].
    pub fn start(line: &str, cols: u16, rows: u16) -> Result<Self, ApiError> {
        if !super::is_allowed(line) {
            return Err(ApiError::badreq("orso can't run that command for you"));
        }
        Self::spawn(command(line), cols, rows)
    }

    fn spawn(cmd: CommandBuilder, cols: u16, rows: u16) -> Result<Self, ApiError> {
        let pair = native_pty_system()
            .openpty(size(cols, rows))
            .map_err(fail)?;
        let mut child = pair.slave.spawn_command(cmd).map_err(fail)?;
        // Only the child holds the terminal's other end now, so reading ends when it exits.
        drop(pair.slave);
        let killer = child.clone_killer();
        let mut reader = pair.master.try_clone_reader().map_err(fail)?;
        let writer = pair.master.take_writer().map_err(fail)?;

        let (out_tx, output) = mpsc::channel::<Vec<u8>>(64);
        std::thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        if out_tx.blocking_send(buf[..n].to_vec()).is_err() {
                            break;
                        }
                    }
                }
            }
        });
        let (exit_tx, exit) = oneshot::channel();
        std::thread::spawn(move || {
            let code = child.wait().ok().map(|status| status.exit_code());
            let _ = exit_tx.send(code);
        });

        Ok(Self {
            master: pair.master,
            writer,
            killer,
            output,
            exit: Some(exit),
        })
    }

    /// What the user typed (or the terminal's replies to the program's queries).
    pub fn input(&mut self, data: &[u8]) -> std::io::Result<()> {
        self.writer.write_all(data)?;
        self.writer.flush()
    }

    pub fn resize(&self, cols: u16, rows: u16) {
        let _ = self.master.resize(size(cols, rows));
    }
}

impl Drop for PtySession {
    fn drop(&mut self) {
        let _ = self.killer.kill();
    }
}

fn fail(e: impl std::fmt::Display) -> ApiError {
    ApiError::io(format!("couldn't start the terminal: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn run(cmd: CommandBuilder) -> (String, Option<u32>) {
        let mut session = PtySession::spawn(cmd, 80, 24).unwrap();
        let mut out = Vec::new();
        while let Some(chunk) = session.output.recv().await {
            out.extend(chunk);
        }
        let code = session.exit.take().unwrap().await.unwrap();
        (String::from_utf8_lossy(&out).into_owned(), code)
    }

    fn sh(script: &str) -> CommandBuilder {
        let mut cmd = CommandBuilder::new("/bin/sh");
        cmd.args(["-c", script]);
        cmd
    }

    #[test]
    fn only_allowed_commands_start() {
        assert!(PtySession::start("rm -rf ~", 80, 24).is_err());
    }

    #[tokio::test]
    async fn streams_output_and_reports_the_exit_code() {
        let (out, code) = run(sh("echo hello; exit 3")).await;
        assert!(out.contains("hello"), "{out}");
        assert_eq!(code, Some(3));
    }

    #[tokio::test]
    async fn the_command_reads_what_the_user_types() {
        let mut session = PtySession::spawn(sh("read line; echo \"got $line\""), 80, 24).unwrap();
        session.input(b"yes\r").unwrap();
        let mut out = Vec::new();
        while let Some(chunk) = session.output.recv().await {
            out.extend(chunk);
        }
        let out = String::from_utf8_lossy(&out);
        assert!(out.contains("got yes"), "{out}");
    }

    #[tokio::test]
    async fn dropping_the_session_kills_the_command() {
        let mut session = PtySession::spawn(sh("sleep 30"), 80, 24).unwrap();
        let exit = session.exit.take().unwrap();
        drop(session);
        let code = tokio::time::timeout(std::time::Duration::from_secs(5), exit)
            .await
            .expect("killed promptly")
            .unwrap();
        assert_ne!(code, Some(0));
    }
}
