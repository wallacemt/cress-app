use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use serde::Serialize;
use tauri::{ipc::Channel, State};
use tauri_plugin_dialog::DialogExt;

use super::{
    import::{import_file, ImportedScore},
    scan::{scan, IgnoredExtension, ScanResult, ScoreEntry},
};
use crate::paths;

#[derive(Clone, Default)]
pub struct ScoreScanState(Arc<Mutex<HashMap<String, ScanSession>>>);

#[derive(Clone)]
struct ScanSession {
    entries: HashMap<String, PathBuf>,
    root: Option<PathBuf>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanSessionResult {
    pub scan_id: String,
    pub root_name: String,
    pub result: ScanResult,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportProgress {
    pub done: usize,
    pub total: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(untagged)]
pub enum ImportFileOutcome {
    Success(ImportedScore),
    Failure { error: String },
}

fn remember_scan(
    state: &ScoreScanState,
    root_name: String,
    result: ScanResult,
    paths: HashMap<String, PathBuf>,
    root: Option<PathBuf>,
) -> Result<ScanSessionResult, String> {
    let scan_id = uuid::Uuid::new_v4().to_string();
    let mut sessions = state
        .0
        .lock()
        .map_err(|_| "scan_state_poisoned".to_owned())?;
    sessions.clear();
    sessions.insert(
        scan_id.clone(),
        ScanSession {
            entries: paths,
            root,
        },
    );
    Ok(ScanSessionResult {
        scan_id,
        root_name,
        result,
    })
}

fn resolve_entry<'a>(session: &'a ScanSession, entry_id: &str) -> Option<&'a PathBuf> {
    session.entries.get(entry_id)
}

fn file_scan(paths: Vec<PathBuf>) -> ScanResult {
    let entries = paths
        .iter()
        .enumerate()
        .filter_map(|(index, path)| {
            Some(ScoreEntry {
                entry_id: index.to_string(),
                rel_dir: String::new(),
                file_name: path.file_name()?.to_string_lossy().into_owned(),
                size_bytes: std::fs::metadata(path)
                    .map(|metadata| metadata.len())
                    .unwrap_or_default(),
                source_path: path.clone(),
            })
        })
        .collect();
    ScanResult {
        entries,
        ignored_by_ext: Vec::<IgnoredExtension>::new(),
        ignored_by_ext_others: 0,
        skipped_deep_dirs: 0,
        truncated: false,
    }
}

#[tauri::command]
pub async fn scores_pick_folder_and_scan(
    app: tauri::AppHandle,
    state: State<'_, ScoreScanState>,
) -> Result<Option<ScanSessionResult>, String> {
    let state = state.inner().clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let Some(selected) = app.dialog().file().blocking_pick_folder() else {
            return Ok(None);
        };
        let root = selected
            .into_path()
            .map_err(|error| format!("invalid_folder: {error}"))?;
        let root_name = root
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default();
        let canonical_root = root
            .canonicalize()
            .map_err(|error| format!("scan_root: {error}"))?;
        let result = scan(&root).map_err(|error| format!("{}: {}", error.code(), error))?;
        let paths = result
            .entries
            .iter()
            .map(|entry| (entry.entry_id.clone(), entry.source_path.clone()))
            .collect();
        remember_scan(&state, root_name, result, paths, Some(canonical_root)).map(Some)
    })
    .await
    .map_err(|error| error.to_string())?;
    result
}

#[tauri::command]
pub async fn scores_pick_files_and_prepare(
    app: tauri::AppHandle,
    state: State<'_, ScoreScanState>,
) -> Result<Option<ScanSessionResult>, String> {
    let state = state.inner().clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let Some(selected) = app
            .dialog()
            .file()
            .add_filter("PDF", &["pdf"])
            .blocking_pick_files()
        else {
            return Ok(None);
        };
        let paths = selected
            .into_iter()
            .map(|file| {
                file.into_path()
                    .map_err(|error| format!("invalid_file: {error}"))
            })
            .collect::<Result<Vec<_>, _>>()?;
        let result = file_scan(paths.clone());
        let entries = result
            .entries
            .iter()
            .zip(paths)
            .map(|(entry, path)| (entry.entry_id.clone(), path))
            .collect();
        remember_scan(&state, String::new(), result, entries, None).map(Some)
    })
    .await
    .map_err(|error| error.to_string())?;
    result
}

#[tauri::command]
pub async fn scores_pick_file_and_prepare(
    app: tauri::AppHandle,
    state: State<'_, ScoreScanState>,
) -> Result<Option<ScanSessionResult>, String> {
    let state = state.inner().clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let Some(selected) = app
            .dialog()
            .file()
            .add_filter("PDF", &["pdf"])
            .blocking_pick_file()
        else {
            return Ok(None);
        };
        let path = selected
            .into_path()
            .map_err(|error| format!("invalid_file: {error}"))?;
        let result = file_scan(vec![path.clone()]);
        let entries = result
            .entries
            .iter()
            .map(|entry| (entry.entry_id.clone(), path.clone()))
            .collect();
        remember_scan(&state, String::new(), result, entries, None).map(Some)
    })
    .await
    .map_err(|error| error.to_string())?;
    result
}

#[tauri::command]
pub async fn scores_import_selected(
    app: tauri::AppHandle,
    state: State<'_, ScoreScanState>,
    scan_id: String,
    entry_ids: Vec<String>,
    progress: Channel<ImportProgress>,
) -> Result<Vec<ImportFileOutcome>, String> {
    let session = state
        .0
        .lock()
        .map_err(|_| "scan_state_poisoned".to_owned())?
        .get(&scan_id)
        .cloned()
        .ok_or_else(|| "scan_session_not_found".to_owned())?;
    let root = paths::scores_root(&app).map_err(|error| format!("{}: {}", error.code(), error))?;
    let result = tauri::async_runtime::spawn_blocking(move || {
        let total = entry_ids.len();
        let mut outcomes = Vec::with_capacity(total);
        for (index, entry_id) in entry_ids.iter().enumerate() {
            outcomes.push(match resolve_entry(&session, entry_id) {
                Some(path) => match validate_scan_source(&session, path) {
                    Ok(()) => match import_file(path, &root) {
                        Ok(imported) => ImportFileOutcome::Success(imported),
                        Err(error) => ImportFileOutcome::Failure {
                            error: error.code().into(),
                        },
                    },
                    Err(error) => ImportFileOutcome::Failure { error },
                },
                None => ImportFileOutcome::Failure {
                    error: "entry_not_found".into(),
                },
            });
            let done = index + 1;
            if done % 25 == 0 || done == total {
                progress
                    .send(ImportProgress { done, total })
                    .map_err(|error| error.to_string())?;
            }
        }
        Ok(outcomes)
    })
    .await
    .map_err(|error| error.to_string())?;
    result
}

fn validate_scan_source(session: &ScanSession, source: &Path) -> Result<(), String> {
    if let Some(root) = &session.root {
        let canonical_root = root.clone();
        let canonical_source = source
            .canonicalize()
            .map_err(|error| format!("source_path: {error}"))?;
        if !canonical_source.starts_with(canonical_root) {
            return Err("source_outside_scan_root".into());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn scores_delete_file(path: String, app: tauri::AppHandle) -> Result<(), String> {
    let resolved_path = paths::resolve_score_path(&app, &path)
        .map_err(|error| format!("{}: {}", error.code(), error))?;
    remove_score_file(resolved_path)
}

fn remove_score_file(path: PathBuf) -> Result<(), String> {
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("score_delete_failed: {error}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deleting_a_missing_score_file_is_idempotent() {
        let path =
            std::env::temp_dir().join(format!("cress-score-delete-{}.pdf", uuid::Uuid::new_v4()));
        std::fs::write(&path, b"pdf").unwrap();
        remove_score_file(path.clone()).unwrap();
        remove_score_file(path).unwrap();
    }

    #[test]
    fn file_scan_entries_resolve_to_selected_absolute_paths() {
        let root =
            std::env::temp_dir().join(format!("cress-scan-session-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&root).unwrap();
        let file = root.join("score.pdf");
        std::fs::write(&file, b"%PDF-").unwrap();
        let result = file_scan(vec![file.clone()]);
        let session = ScanSession {
            entries: HashMap::from([("0".into(), file.clone())]),
            root: None,
        };
        assert_eq!(result.entries[0].file_name, "score.pdf");
        assert_eq!(
            resolve_entry(&session, &result.entries[0].entry_id),
            Some(&file)
        );
        assert!(resolve_entry(&session, "missing").is_none());
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn scan_source_must_remain_inside_canonical_root() {
        let root = std::env::temp_dir().join(format!("cress-scan-root-{}", uuid::Uuid::new_v4()));
        let outside =
            std::env::temp_dir().join(format!("cress-scan-outside-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&root).unwrap();
        std::fs::create_dir_all(&outside).unwrap();
        let source = outside.join("score.pdf");
        std::fs::write(&source, b"%PDF-").unwrap();
        let session = ScanSession {
            entries: HashMap::new(),
            root: Some(root.canonicalize().unwrap()),
        };
        assert_eq!(
            validate_scan_source(&session, &source).unwrap_err(),
            "source_outside_scan_root"
        );
        let _ = std::fs::remove_dir_all(root);
        let _ = std::fs::remove_dir_all(outside);
    }

    #[cfg(unix)]
    #[test]
    fn folder_session_uses_real_path_not_lossy_display_fields() {
        use std::os::unix::ffi::OsStrExt;
        let root =
            std::env::temp_dir().join(format!("cress-scan-session-{}", uuid::Uuid::new_v4()));
        let directory = root.join(std::ffi::OsStr::from_bytes(b"bad-\xff"));
        std::fs::create_dir_all(&directory).unwrap();
        let source = directory.join("score.pdf");
        std::fs::write(&source, b"%PDF-").unwrap();
        let result = scan(&root).unwrap();
        let paths = result
            .entries
            .iter()
            .map(|entry| (entry.entry_id.clone(), entry.source_path.clone()))
            .collect();
        let session = ScanSession {
            entries: paths,
            root: Some(root.canonicalize().unwrap()),
        };
        assert_eq!(
            resolve_entry(&session, &result.entries[0].entry_id),
            Some(&source)
        );
        assert!(result.entries[0].rel_dir.contains('\u{fffd}'));
        let _ = std::fs::remove_dir_all(root);
    }
}
