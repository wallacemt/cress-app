// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[cfg(desktop)]
use tauri::Manager;

pub mod audio;
pub mod paths;
pub mod scores;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Em dev no Windows, o WebView2 mantém disk cache entre execuções mesmo com o
    // Vite servindo código novo — um perfil de user-data-folder novo por execução
    // evita módulos JS obsoletos sem depender de flags de cache do Chromium (sem
    // efeito documentado/confiável no WebView2).
    #[cfg(debug_assertions)]
    {
        let profile = std::env::temp_dir().join(format!("cress-dev-webview2-{}", std::process::id()));
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", profile);
    }
    // Em produção, o WebView2 também guarda disk cache entre execuções — depois de
    // um auto-update, ele pode continuar servindo index.html/CSS/JS da versão
    // anterior (UI quebrada/desalinhada). Um perfil por versão (não por processo,
    // como em dev) força cache novo só quando a versão muda, preservando o cache
    // normal entre reinícios da mesma versão.
    #[cfg(not(debug_assertions))]
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        let profile = std::path::Path::new(&local_app_data)
            .join("dev.wallacesantana.cress")
            .join("webview2")
            .join(env!("CARGO_PKG_VERSION"));
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", profile);
    }
    let builder = tauri::Builder::default();
    // Só uma instância do app pode rodar por vez; ao abrir uma segunda, ela
    // encerra sozinha e só foca/restaura a janela da instância já aberta.
    // Precisa ser o primeiro plugin registrado (exigência do próprio plugin).
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }));
    builder
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
        .manage(scores::commands::ScoreScanState::default())
        .invoke_handler(tauri::generate_handler![
            audio::commands::audio_list_input_devices,
            audio::commands::audio_start_input,
            audio::commands::audio_stop_input,
            audio::commands::recording_start,
            audio::commands::recording_pause,
            audio::commands::recording_resume,
            audio::commands::recording_finish,
            audio::commands::recording_delete,
            audio::commands::recording_probe,
            scores::commands::scores_pick_folder_and_scan,
            scores::commands::scores_pick_files_and_prepare,
            scores::commands::scores_pick_file_and_prepare,
            scores::commands::scores_import_selected,
            scores::commands::scores_delete_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
