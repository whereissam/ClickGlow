// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use clickglow::commands;
use clickglow::db::connection::Database;
use clickglow::input::{buffer, listener};
use clickglow::state::AppState;
use clickglow::tray::menu;

fn main() {
    env_logger::init();

    let db = Arc::new(Database::new().expect("Failed to initialize database"));
    let paused = Arc::new(AtomicBool::new(false));

    // Start input listener -> buffer -> DB pipeline
    // Dropping `tx` on shutdown will cause the buffer thread to flush and exit
    let (tx, rx) = std::sync::mpsc::channel();
    listener::start_listener(tx, paused.clone());
    buffer::start_buffer(rx, db.clone());

    let app_state = AppState {
        db: db.clone(),
        paused: paused.clone(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::get_mouse_heatmap,
            commands::get_key_frequency,
            commands::get_daily_summary,
            commands::get_recording_status,
            commands::toggle_recording,
        ])
        .setup(move |app| {
            menu::setup_tray(app.handle(), paused.clone())
                .expect("Failed to setup tray");
            log::info!("ClickGlow started");
            Ok(())
        })
        .on_window_event(|window, event| {
            // Hide window on close instead of quitting (tray app behavior)
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
