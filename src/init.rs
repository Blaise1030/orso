//! `orso init` — vendor `integrations/orso`, bundled agent skills, and write a starter `orso.json`.

use crate::settings::{self, ProjectSettings, DEFAULT_DEV, DEFAULT_INSTALL, SETTINGS_FILE};
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
    format!(
        "{}\n",
        serde_json::to_string_pretty(&value).expect("starter orso.json")
    )
}

/// Copy the Orso Astro integration and bundled skills into the site root, and ensure a starter
/// `orso.json`.
///
/// - `dir` must exist and be a directory (default `.` from the CLI) — the project / repo root
///   that holds `orso.json`.
/// - Site files go under `orso.json`'s `root` (default `.`): `integrations/orso/` and the
///   VibeSDK frontend-design skills under `.agents/skills/` / `.claude/skills/`.
/// - `integrations/orso/` and the bundled skill folders are always refreshed from the embedded
///   sources.
/// - `orso.json` is written when missing, or when `force` is true.
pub fn run(dir: &Path, force: bool) -> Result<String, String> {
    let dir = resolve_dir(dir)?;

    let settings_path = dir.join(SETTINGS_FILE);
    let wrote_settings = if force || !settings_path.exists() {
        std::fs::write(&settings_path, starter_orso_json())
            .map_err(|e| format!("could not write {SETTINGS_FILE}: {e}"))?;
        true
    } else {
        false
    };

    let (site_root, root_label) = site_root_for_init(&dir)?;

    static_files::extract_orso_integration(&site_root)
        .map_err(|e| format!("could not write integrations/orso: {e}"))?;
    static_files::extract_bundled_skills(&site_root)
        .map_err(|e| format!("could not write agent skills: {e}"))?;

    let site_label = if root_label == "." {
        String::new()
    } else {
        format!("{root_label}/")
    };

    let mut msg = format!("Initialized Orso in {}\n", dir.display());
    msg.push_str(&format!(
        "  {site_label}integrations/orso/  (refreshed)\n"
    ));
    for name in static_files::BUNDLED_SKILL_NAMES {
        msg.push_str(&format!(
            "  {site_label}.agents/skills/{name}/  (refreshed)\n"
        ));
    }
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

/// Site directory for vendored files: prefer a fully valid `orso.json`, otherwise honor a
/// relative `root` that already exists (init often runs before `astro.config.*` is in place).
fn site_root_for_init(project: &Path) -> Result<(PathBuf, String), String> {
    if let Ok(settings) = settings::load(project) {
        let site = settings.site_dir(project);
        if site.is_dir() {
            return Ok((site, settings.root));
        }
        return Err(format!(
            "{}: orso.json root {:?} is not a directory",
            project.display(),
            settings.root
        ));
    }
    let defaults = ProjectSettings::defaults();
    let Ok(raw) = std::fs::read_to_string(project.join(SETTINGS_FILE)) else {
        return Ok((project.to_path_buf(), defaults.root));
    };
    let Ok(value) = serde_json::from_str::<serde_json::Value>(&raw) else {
        return Ok((project.to_path_buf(), defaults.root));
    };
    let Some(root) = value.get("root").and_then(|v| v.as_str()) else {
        return Ok((project.to_path_buf(), defaults.root));
    };
    if root == "." || root.is_empty() {
        return Ok((project.to_path_buf(), defaults.root));
    }
    if Path::new(root).is_absolute() || root.starts_with('/') || root.contains("..") {
        return Ok((project.to_path_buf(), defaults.root));
    }
    let site = project.join(root);
    if site.is_dir() {
        Ok((site, root.to_string()))
    } else {
        Err(format!(
            "{}: orso.json root {root:?} is not a directory",
            project.display()
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn init_writes_integration_skills_and_orso_json() {
        let tmp = tempfile::tempdir().unwrap();
        let msg = run(tmp.path(), false).unwrap();
        assert!(tmp.path().join("integrations/orso/index.js").is_file());
        assert!(!tmp.path().join("integrations/orso/panel").exists());
        for name in static_files::BUNDLED_SKILL_NAMES {
            assert!(
                tmp.path()
                    .join(".agents/skills")
                    .join(name)
                    .join("SKILL.md")
                    .is_file(),
                "{name}"
            );
            assert!(
                tmp.path()
                    .join(".claude/skills")
                    .join(name)
                    .join("SKILL.md")
                    .is_file(),
                "{name}"
            );
        }
        let settings = fs::read_to_string(tmp.path().join("orso.json")).unwrap();
        assert!(settings.contains(DEFAULT_INSTALL));
        assert!(settings.contains("{port}"));
        assert!(settings.contains("{host}"));
        assert!(msg.contains("orso()"));
        assert!(msg.contains(".agents/skills/frontend-design/"));
    }

    #[test]
    fn init_writes_skills_under_orso_json_root() {
        let tmp = tempfile::tempdir().unwrap();
        let site = tmp.path().join("site");
        fs::create_dir_all(&site).unwrap();
        // Valid settings path: root needs an Astro config for `settings::load`.
        fs::write(site.join("astro.config.mjs"), "export default {};\n").unwrap();
        fs::write(
            tmp.path().join("orso.json"),
            "{\n  \"root\": \"site\",\n  \"installDir\": \"site\"\n}\n",
        )
        .unwrap();
        // Leave a sibling skill that must not be deleted.
        let keep = site.join(".agents/skills/seo");
        fs::create_dir_all(&keep).unwrap();
        fs::write(keep.join("SKILL.md"), "# keep\n").unwrap();

        let msg = run(tmp.path(), false).unwrap();
        assert!(msg.contains("kept existing"));
        assert!(msg.contains("site/.agents/skills/frontend-design/"));
        assert!(site.join("integrations/orso/index.js").is_file());
        assert!(!tmp.path().join("integrations/orso").exists());
        for name in static_files::BUNDLED_SKILL_NAMES {
            assert!(
                site.join(".agents/skills")
                    .join(name)
                    .join("SKILL.md")
                    .is_file(),
                "{name}"
            );
        }
        assert_eq!(
            fs::read_to_string(site.join(".agents/skills/seo/SKILL.md")).unwrap(),
            "# keep\n"
        );
    }

    #[test]
    fn init_honors_root_before_astro_config_exists() {
        let tmp = tempfile::tempdir().unwrap();
        let site = tmp.path().join("web");
        fs::create_dir_all(&site).unwrap();
        fs::write(tmp.path().join("orso.json"), "{\"root\":\"web\"}\n").unwrap();
        run(tmp.path(), false).unwrap();
        assert!(site.join("integrations/orso/index.js").is_file());
        assert!(site
            .join(".agents/skills/frontend-design-saas/SKILL.md")
            .is_file());
    }

    #[test]
    fn init_preserves_orso_json_without_force() {
        let tmp = tempfile::tempdir().unwrap();
        run(tmp.path(), false).unwrap();
        let custom = "{\n  \"install\": \"pnpm install\"\n}\n";
        fs::write(tmp.path().join("orso.json"), custom).unwrap();
        // Drop a stale file that refresh should remove.
        fs::write(
            tmp.path().join("integrations/orso/stale-marker.js"),
            "// stale",
        )
        .unwrap();
        let msg = run(tmp.path(), false).unwrap();
        assert_eq!(
            fs::read_to_string(tmp.path().join("orso.json")).unwrap(),
            custom
        );
        assert!(msg.contains("kept existing"));
        assert!(!tmp
            .path()
            .join("integrations/orso/stale-marker.js")
            .exists());
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
