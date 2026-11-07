// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod audio;
pub mod paths;
pub mod scores;

#[tauri::command]
async fn blocking_pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    Ok(app
        .dialog()
        .file()
        .blocking_pick_folder()
        .map(|path| path.to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:cress.db",
                    vec![tauri_plugin_sql::Migration {
                        version: 1,
                        description: "initial schema",
                        sql: include_str!("../migrations/0001_init.sql"),
                        kind: tauri_plugin_sql::MigrationKind::Up,
                    },
                    tauri_plugin_sql::Migration {
                        version: 2,
                        description: "seed da obra sentinela de prática livre",
                        sql: include_str!("../migrations/0002_free_practice_piece.sql"),
                        kind: tauri_plugin_sql::MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(if cfg!(debug_assertions) {
                    log::LevelFilter::Debug
                } else {
                    log::LevelFilter::Warn
                })
                .level_for("sqlx", log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(audio::commands::AudioInputState::default())
        .manage(audio::commands::RecordingState::default())
        .invoke_handler(tauri::generate_handler![
            blocking_pick_folder,
            audio::commands::audio_list_input_devices,
            audio::commands::audio_start_input,
            audio::commands::audio_stop_input,
            audio::commands::recording_start,
            audio::commands::recording_pause,
            audio::commands::recording_resume,
            audio::commands::recording_finish,
            audio::commands::recording_delete,
            audio::commands::recording_probe,
            scores::commands::scores_scan_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
