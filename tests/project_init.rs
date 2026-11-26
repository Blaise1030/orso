//! Opening a project without `orso.json` must not start the preview; init then starts it.
use std::path::Path;
use std::time::{Duration, Instant};

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use http_body_util::BodyExt;
use orso::config::Config;
use orso::devserver::DevServerOptions;
use orso::http;
use orso::projects::DevserverStatus;
use orso::state::AppState;
use serde_json::Value;
use tokio::process::Command;
use tower::ServiceExt;

fn config(dir: &Path) -> Config {
    Config {
        port: 0,
        origin: None,
        projects_dir: dir.to_path_buf(),
        no_auth: true,
        token: None,
        agents_config: None,
        ..Default::default()
    }
}

fn script(body: &'static str) -> DevServerOptions {
    let mut opts = DevServerOptions::custom(move |spec| {
        let mut c = Command::new("sh");
        c.arg("-c").arg(body).env("PORT", spec.port.to_string());
        c
    });
    opts.backoff_base = Duration::from_millis(10);
    opts
}

#[tokio::test]
async fn missing_orso_json_skips_devserver_until_init() {
    let tmp = tempfile::tempdir().unwrap();
    let root = tmp.path().to_path_buf();
    let state = AppState::with_options(config(&root), false, script(
        r#"echo "ready on http://127.0.0.1:$PORT"; sleep 60"#,
    ));

    let info = state.projects.create("Bare").await.unwrap();
    let dir = root.join(&info.id);
    assert!(
        !dir.join("orso.json").exists(),
        "template projects ship without orso.json"
    );

    state.watch_project(&info.id).await;
    state.devservers.start(&info.id).await.unwrap();

    let after = state.projects.get(&info.id).await.unwrap();
    assert_eq!(after.devserver, DevserverStatus::NeedsSetup);
    assert!(!dir.join("orso.json").exists());

    orso::init::run(&dir, false).unwrap();
    assert!(dir.join("orso.json").exists());
    state.devservers.start(&info.id).await.unwrap();

    let start = Instant::now();
    loop {
        let p = state.projects.get(&info.id).await.unwrap();
        if p.devserver == DevserverStatus::Ready {
            break;
        }
        assert!(
            start.elapsed() < Duration::from_secs(5),
            "dev server should become ready after init: {:?}",
            p.devserver
        );
        tokio::time::sleep(Duration::from_millis(20)).await;
    }
}

#[tokio::test]
async fn resume_all_skips_projects_without_orso_json() {
    let tmp = tempfile::tempdir().unwrap();
    let root = tmp.path().to_path_buf();
    let id = {
        let first = AppState::with_options(config(&root), false, DevServerOptions::disabled());
        let info = first.projects.create("Bare").await.unwrap();
        info.id
    };

    let state = AppState::with_options(
        config(&root),
        false,
        script(
            r#"echo "ready on http://127.0.0.1:$PORT"; sleep 60"#,
        ),
    );
    let mut events = state.events.subscribe();
    state.devservers.resume_all().await;

    let p = state.projects.get(&id).await.unwrap();
    assert_eq!(p.devserver, DevserverStatus::NeedsSetup);

    let start = Instant::now();
    while start.elapsed() < Duration::from_millis(400) {
        if let Ok(Ok(raw)) =
            tokio::time::timeout(Duration::from_millis(50), events.recv()).await
        {
            let ev: Value = serde_json::from_str(&raw).unwrap();
            if ev["type"] == "devserver.status" && ev["state"] == "ready" {
                panic!("devserver must not become ready without orso.json: {ev}");
            }
        }
    }
}

#[tokio::test]
async fn init_http_writes_orso_json_and_starts_preview() {
    let tmp = tempfile::tempdir().unwrap();
    let root = tmp.path().to_path_buf();
    let state = AppState::with_options(
        config(&root),
        false,
        script(r#"echo "  Local:   http://127.0.0.1:$PORT/"; sleep 60"#),
    );
    let app = http::router(state.clone());

    let info = state.projects.create("Bare").await.unwrap();
    state.devservers.start(&info.id).await.unwrap();
    assert_eq!(
        state.projects.get(&info.id).await.unwrap().devserver,
        DevserverStatus::NeedsSetup
    );

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/projects/{}/init", info.id))
                .header(header::HOST, "localhost")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body: Value = serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes())
        .unwrap();
    assert_eq!(body["id"], info.id);
    assert!(root.join(&info.id).join("orso.json").is_file());
    assert_ne!(body["devserver"], "needsSetup");

    let start = Instant::now();
    loop {
        let p = state.projects.get(&info.id).await.unwrap();
        if p.devserver == DevserverStatus::Ready {
            break;
        }
        assert!(
            start.elapsed() < Duration::from_secs(5),
            "expected ready after init, got {:?}",
            p.devserver
        );
        tokio::time::sleep(Duration::from_millis(20)).await;
    }

    // Idempotent: init again keeps existing orso.json and does not park as needsSetup.
    let res = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/projects/{}/init", info.id))
                .header(header::HOST, "localhost")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}
