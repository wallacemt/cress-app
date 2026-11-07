use serde::Serialize;
use tauri::{ipc::Channel, Manager};

use super::{
    import::{import_file, ImportedScore},
    scan::{scan, ScanResult, ScoresError},
};

#[tauri::command]
pub fn scores_scan_folder(path: String) -> Result<ScanResult, String> {
    scan(&path).map_err(|error: ScoresError| format!("{}: {}", error.code(), error))
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

#[tauri::command]
pub fn scores_import_files(
    app: tauri::AppHandle,
    paths: Vec<String>,
    progress: Channel<ImportProgress>,
) -> Result<Vec<ImportFileOutcome>, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("app_data_dir_unavailable: {error}"))?
        .join("scores");
    let total = paths.len();
    let mut outcomes = Vec::with_capacity(total);
    for (index, path) in paths.iter().enumerate() {
        outcomes.push(match import_file(std::path::Path::new(path), &root) {
            Ok(imported) => ImportFileOutcome::Success(imported),
            Err(error) => ImportFileOutcome::Failure {
                error: error.code().into(),
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
}
