// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod audio;
pub mod paths;

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
                    }],
                )
                .build(),
        )
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(if cfg!(debug_assertions) { log::LevelFilter::Debug } else { log::LevelFilter::Warn })
                .level_for("sqlx", log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(audio::commands::AudioInputState::default())
        .invoke_handler(tauri::generate_handler![
            blocking_pick_folder,
            audio::commands::audio_list_input_devices,
            audio::commands::audio_start_input,
            audio::commands::audio_stop_input,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
