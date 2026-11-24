//! `WS /ws/terminal?command=…&cols=…&rows=…` — onboarding's built-in terminal.
//!
//! Runs one of the setup guides' commands ([`crate::terminal::ALLOWED`]) in a
//! pseudo-terminal for as long as the socket is open. Auth is the REST
//! middleware's (`?t=`, cookie or Bearer) plus the browser `Origin` check that
//! `/ws/events` uses.
//!
//! Server → client: binary frames are terminal output; one final text frame
//! `{"type":"exit","code":n|null}` once the command has exited.
//! Client → server: text frames `{"type":"input","data":"…"}` and
//! `{"type":"resize","cols":n,"rows":n}`.

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Query, State};
use axum::http::{header, HeaderMap};
use axum::response::Response;
use serde::Deserialize;
use serde_json::json;

use crate::auth;
use crate::error::ApiError;
use crate::state::AppState;
use crate::terminal::pty::PtySession;

#[derive(Deserialize)]
pub struct TerminalQuery {
    command: String,
    #[serde(default = "default_cols")]
    cols: u16,
    #[serde(default = "default_rows")]
    rows: u16,
}

fn default_cols() -> u16 {
    80
}

fn default_rows() -> u16 {
    24
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum ClientMessage {
    Input { data: String },
    Resize { cols: u16, rows: u16 },
}

pub async fn ws(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TerminalQuery>,
    upgrade: WebSocketUpgrade,
) -> Result<Response, ApiError> {
    let origin = headers.get(header::ORIGIN).and_then(|v| v.to_str().ok());
    if !auth::ws_origin_allowed(origin, state.config.origin.as_deref()) {
        return Err(ApiError::unauth("origin not allowed").with_status(403));
    }
    // Refuse before upgrading, so a disallowed command is a plain HTTP error.
    let session = PtySession::start(&query.command, query.cols, query.rows)?;
    Ok(upgrade.on_upgrade(move |socket| pump(socket, session)))
}

async fn pump(mut socket: WebSocket, mut session: PtySession) {
    // Forward output until the command (and anything it started) has closed the terminal.
    loop {
        tokio::select! {
            chunk = session.output.recv() => match chunk {
                Some(bytes) => {
                    if socket.send(Message::Binary(bytes.into())).await.is_err() {
                        return;
                    }
                }
                None => break,
            },
            incoming = socket.recv() => match incoming {
                Some(Ok(Message::Text(text))) => match serde_json::from_str::<ClientMessage>(&text) {
                    Ok(ClientMessage::Input { data }) => {
                        let _ = session.input(data.as_bytes());
                    }
                    Ok(ClientMessage::Resize { cols, rows }) => session.resize(cols, rows),
                    Err(_) => {}
                },
                // The page closed or navigated away: dropping the session kills the command.
                Some(Ok(Message::Close(_))) | Some(Err(_)) | None => return,
                Some(Ok(_)) => {}
            },
        }
    }
    let code = match session.exit.take() {
        Some(exit) => exit.await.ok().flatten(),
        None => None,
    };
    let done = json!({ "type": "exit", "code": code }).to_string();
    let _ = socket.send(Message::Text(done.into())).await;
    let _ = socket.send(Message::Close(None)).await;
}
