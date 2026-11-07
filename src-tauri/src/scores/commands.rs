use super::scan::{scan, ScanResult, ScoresError};

#[tauri::command]
pub fn scores_scan_folder(path: String) -> Result<ScanResult, String> {
    scan(&path).map_err(|error: ScoresError| format!("{}: {}", error.code(), error))
}
