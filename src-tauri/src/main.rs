// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, AtomicU8};
use std::sync::Arc;

use clickglow::commands;
use clickglow::db::connection::Database;
use clickglow::input::{buffer, listener};
use clickglow::reporting;
use clickglow::state::AppState;
use clickglow::tracking;
use clickglow::tray::menu;

fn main() {
    env_logger::init();

    let db = Arc::new(Database::new().expect("Failed to initialize database"));
    let paused = Arc::new(AtomicBool::new(false));
    let listener_status = Arc::new(AtomicU8::new(0));
    let distracted = Arc::new(AtomicBool::new(false));

    // Start input listener -> buffer -> DB pipeline
    // Dropping `tx` on shutdown will cause the buffer thread to flush and exit
    let (tx, rx) = std::sync::mpsc::channel();
    listener::start_listener(tx, paused.clone(), listener_status.clone());
    buffer::start_buffer(rx, db.clone());
    reporting::start_scheduler(db.clone());
    tracking::start_tracker(db.clone(), paused.clone(), distracted.clone());

    let app_state = AppState {
        db: db.clone(),
        paused: paused.clone(),
        listener_status: listener_status.clone(),
        distracted: distracted.clone(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::get_mouse_heatmap,
            commands::get_key_frequency,
            commands::get_daily_summary,
            commands::get_recording_status,
            commands::toggle_recording,
            commands::get_listener_status,
            commands::check_accessibility,
            commands::get_onboarding_done,
            commands::set_onboarding_done,
            commands::get_weekly_report,
            commands::generate_weekly_report,
            commands::list_weekly_reports,
            commands::get_retention_months,
            commands::set_retention_months,
            commands::save_png,
            commands::get_app_usage,
            commands::get_category_breakdown,
            commands::get_time_thief,
            commands::set_app_category,
            commands::get_app_categories,
            commands::get_keyword_rules,
            commands::set_keyword_rule,
            commands::delete_keyword_rule,
            commands::get_activity_log,
            commands::get_pet,
            commands::is_distracted,
            commands::feed_pet,
            commands::damage_pet,
            commands::rename_pet,
        ])
        .setup(move |app| {
            menu::setup_tray(app.handle(), paused.clone(), listener_status.clone(), db.clone(), distracted.clone())
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
