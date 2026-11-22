//! `orso init` — vendor `integrations/orso` and write a starter `orso.json`.

use crate::settings::{DEFAULT_DEV, DEFAULT_INSTALL, SETTINGS_FILE};
use crate::static_files;
use serde_json::json;
use std::path::{Path, PathBuf};

/// Snippet printed after a successful init (site does not auto-edit `astro.config`).
pub fn orso_config_snippet() -> &'static str {
    r#"import { orso } from "./integrations/orso/index.js";

// in defineConfig({ … }):
integrations: [/* existing integrations */, orso()],"#
}

/// Starter `orso.json` body (pretty-printed JSON + trailing newline).
pub fn starter_orso_json() -> String {
    let value = json!({
        "install": DEFAULT_INSTALL,
        "dev": DEFAULT_DEV,
    });
    format!("{}\n", serde_json::to_string_pretty(&value).expect("starter orso.json"))
}

/// Copy the Orso Astro integration into `dir` and ensure a starter `orso.json`.
///
/// - `dir` must exist and be a directory (default `.` from the CLI).
/// - `integrations/orso/` is always refreshed from the embedded sources.
/// - `orso.json` is written when missing, or when `force` is true.
pub fn run(dir: &Path, force: bool) -> Result<String, String> {
    let dir = resolve_dir(dir)?;
    static_files::extract_orso_integration(&dir)
        .map_err(|e| format!("could not write integrations/orso: {e}"))?;

    let settings_path = dir.join(SETTINGS_FILE);
    let wrote_settings = if force || !settings_path.exists() {
        std::fs::write(&settings_path, starter_orso_json())
            .map_err(|e| format!("could not write {SETTINGS_FILE}: {e}"))?;
        true
    } else {
        false
    };

    let mut msg = format!(
        "Initialized Orso in {}\n  integrations/orso/  (refreshed)\n",
        dir.display()
    );
    if wrote_settings {
        msg.push_str(&format!("  {SETTINGS_FILE}            (written)\n"));
    } else {
        msg.push_str(&format!(
            "  {SETTINGS_FILE}            (kept existing; pass --force to replace)\n"
        ));
    }
    msg.push_str("\nAdd orso() to astro.config (last among integrations):\n\n");
    msg.push_str(orso_config_snippet());
    msg.push('\n');
    Ok(msg)
}

fn resolve_dir(dir: &Path) -> Result<PathBuf, String> {
    let dir = if dir.as_os_str().is_empty() {
        PathBuf::from(".")
    } else {
        dir.to_path_buf()
    };
    let meta = std::fs::metadata(&dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    if !meta.is_dir() {
        return Err(format!("{}: not a directory", dir.display()));
    }
    std::fs::canonicalize(&dir).map_err(|e| format!("{}: {e}", dir.display()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn init_writes_integration_and_orso_json() {
        let tmp = tempfile::tempdir().unwrap();
        let msg = run(tmp.path(), false).unwrap();
        assert!(tmp.path().join("integrations/orso/index.js").is_file());
        assert!(!tmp.path().join("integrations/orso/panel").exists());
        let settings = fs::read_to_string(tmp.path().join("orso.json")).unwrap();
        assert!(settings.contains(DEFAULT_INSTALL));
        assert!(settings.contains("{port}"));
        assert!(settings.contains("{host}"));
        assert!(msg.contains("orso()"));
    }

    #[test]
    fn init_preserves_orso_json_without_force() {
        let tmp = tempfile::tempdir().unwrap();
        run(tmp.path(), false).unwrap();
        let custom = "{\n  \"install\": \"pnpm install\"\n}\n";
        fs::write(tmp.path().join("orso.json"), custom).unwrap();
        // Drop a stale file that refresh should remove.
        fs::write(tmp.path().join("integrations/orso/stale-marker.js"), "// stale").unwrap();
        let msg = run(tmp.path(), false).unwrap();
        assert_eq!(fs::read_to_string(tmp.path().join("orso.json")).unwrap(), custom);
        assert!(msg.contains("kept existing"));
        assert!(!tmp.path().join("integrations/orso/stale-marker.js").exists());
        assert!(tmp.path().join("integrations/orso/index.js").is_file());
    }

    #[test]
    fn init_force_replaces_orso_json() {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(tmp.path().join("orso.json"), "{\"install\":\"x\"}\n").unwrap();
        run(tmp.path(), true).unwrap();
        let settings = fs::read_to_string(tmp.path().join("orso.json")).unwrap();
        assert!(settings.contains(DEFAULT_INSTALL));
        assert!(!settings.contains("\"x\""));
    }

    #[test]
    fn init_rejects_missing_dir() {
        let tmp = tempfile::tempdir().unwrap();
        let missing = tmp.path().join("nope");
        let err = run(&missing, false).unwrap_err();
        assert!(err.contains("nope"), "{err}");
    }
}
