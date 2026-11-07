use std::{collections::HashMap, path::PathBuf, sync::Mutex};

use serde::Serialize;
use tauri::{ipc::Channel, State};
use tauri_plugin_dialog::DialogExt;

use crate::paths;
use super::{
    import::{import_file, ImportedScore},
    scan::{scan, IgnoredExtension, ScanResult, ScoreEntry},
};

#[derive(Default)]
pub struct ScoreScanState(Mutex<HashMap<String, ScanSession>>);

#[derive(Clone)]
struct ScanSession {
    entries: HashMap<String, PathBuf>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanSessionResult {
    pub scan_id: String,
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

fn remember_scan(state: &ScoreScanState, result: ScanResult, paths: HashMap<String, PathBuf>) -> Result<ScanSessionResult, String> {
    let scan_id = uuid::Uuid::new_v4().to_string();
    let mut sessions = state.0.lock().map_err(|_| "scan_state_poisoned".to_owned())?;
    sessions.clear();
    sessions.insert(scan_id.clone(), ScanSession { entries: paths });
    Ok(ScanSessionResult { scan_id, result })
}

fn resolve_entry<'a>(session: &'a ScanSession, entry_id: &str) -> Option<&'a PathBuf> {
    session.entries.get(entry_id)
}

fn file_scan(paths: Vec<PathBuf>) -> ScanResult {
    let entries = paths.iter().enumerate().filter_map(|(index, path)| {
        Some(ScoreEntry {
            entry_id: index.to_string(),
            rel_dir: String::new(),
            file_name: path.file_name()?.to_string_lossy().into_owned(),
            size_bytes: std::fs::metadata(path).map(|metadata| metadata.len()).unwrap_or_default(),
        })
    }).collect();
    ScanResult { entries, ignored_by_ext: Vec::<IgnoredExtension>::new(), ignored_by_ext_others: 0, skipped_deep_dirs: 0, truncated: false }
}

#[tauri::command]
pub fn scores_pick_folder_and_scan(app: tauri::AppHandle, state: State<'_, ScoreScanState>) -> Result<Option<ScanSessionResult>, String> {
    let Some(selected) = app.dialog().file().blocking_pick_folder() else { return Ok(None) };
    let root = selected.into_path().map_err(|error| format!("invalid_folder: {error}"))?;
    let result = scan(root.to_string_lossy().as_ref()).map_err(|error| format!("{}: {}", error.code(), error))?;
    let paths = result.entries.iter().map(|entry| (entry.entry_id.clone(), root.join(&entry.rel_dir).join(&entry.file_name))).collect();
    remember_scan(&state, result, paths).map(Some)
}

#[tauri::command]
pub fn scores_pick_files_and_prepare(app: tauri::AppHandle, state: State<'_, ScoreScanState>) -> Result<Option<ScanSessionResult>, String> {
    let Some(selected) = app.dialog().file().add_filter("PDF", &["pdf"]).blocking_pick_files() else { return Ok(None) };
    let paths = selected.into_iter().map(|file| file.into_path().map_err(|error| format!("invalid_file: {error}"))).collect::<Result<Vec<_>, _>>()?;
    let result = file_scan(paths.clone());
    let entries = result.entries.iter().zip(paths).map(|(entry, path)| (entry.entry_id.clone(), path)).collect();
    remember_scan(&state, result, entries).map(Some)
}

#[tauri::command]
pub fn scores_import_selected(
    app: tauri::AppHandle,
    state: State<'_, ScoreScanState>,
    scan_id: String,
    entry_ids: Vec<String>,
    progress: Channel<ImportProgress>,
) -> Result<Vec<ImportFileOutcome>, String> {
    let session = state.0.lock().map_err(|_| "scan_state_poisoned".to_owned())?.get(&scan_id).cloned().ok_or_else(|| "scan_session_not_found".to_owned())?;
    let root = paths::scores_root(&app).map_err(|error| format!("{}: {}", error.code(), error))?;
    let total = entry_ids.len();
    let mut outcomes = Vec::with_capacity(total);
    for (index, entry_id) in entry_ids.iter().enumerate() {
        outcomes.push(match resolve_entry(&session, entry_id) {
            Some(path) => match import_file(path, &root) {
                Ok(imported) => ImportFileOutcome::Success(imported),
                Err(error) => ImportFileOutcome::Failure { error: error.code().into() },
            },
            None => ImportFileOutcome::Failure { error: "entry_not_found".into() },
        });
        let done = index + 1;
        if done % 25 == 0 || done == total {
            progress.send(ImportProgress { done, total }).map_err(|error| error.to_string())?;
        }
    }
    Ok(outcomes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_scan_entries_resolve_to_selected_absolute_paths() {
        let root = std::env::temp_dir().join(format!("cress-scan-session-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&root).unwrap();
        let file = root.join("score.pdf");
        std::fs::write(&file, b"%PDF-").unwrap();
        let result = file_scan(vec![file.clone()]);
        let session = ScanSession { entries: HashMap::from([("0".into(), file.clone())]) };
        assert_eq!(result.entries[0].file_name, "score.pdf");
        assert_eq!(resolve_entry(&session, &result.entries[0].entry_id), Some(&file));
        assert!(resolve_entry(&session, "missing").is_none());
        let _ = std::fs::remove_dir_all(root);
    }
}
