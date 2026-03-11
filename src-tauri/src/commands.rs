use std::sync::atomic::Ordering;
use tauri::State;

use crate::db::queries::{self, DailySummary, HeatmapPoint, KeyFrequency};
use crate::platform;
use crate::state::{AppState, STATUS_ERROR, STATUS_PAUSED, STATUS_RUNNING};

#[tauri::command]
pub fn get_mouse_heatmap(
    state: State<AppState>,
    start_ms: i64,
    end_ms: i64,
    event_type: Option<i32>,
) -> Result<Vec<HeatmapPoint>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::get_mouse_heatmap(&conn, start_ms, end_ms, event_type).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_key_frequency(
    state: State<AppState>,
    start_ms: i64,
    end_ms: i64,
) -> Result<Vec<KeyFrequency>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::get_key_frequency(&conn, start_ms, end_ms).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_daily_summary(
    state: State<AppState>,
    start_ms: i64,
    end_ms: i64,
) -> Result<DailySummary, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::get_daily_summary(&conn, start_ms, end_ms).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_recording_status(state: State<AppState>) -> bool {
    !state.paused.load(Ordering::Relaxed)
}

#[tauri::command]
pub fn toggle_recording(state: State<AppState>) -> bool {
    let was_paused = state.paused.load(Ordering::Relaxed);
    state.paused.store(!was_paused, Ordering::Relaxed);

    // Update listener status accordingly
    if was_paused {
        state.listener_status.store(STATUS_RUNNING, Ordering::Relaxed);
    } else {
        state.listener_status.store(STATUS_PAUSED, Ordering::Relaxed);
    }

    !was_paused // return: is now recording?
}

/// Returns "recording", "paused", or "error"
#[tauri::command]
pub fn get_listener_status(state: State<AppState>) -> String {
    match state.listener_status.load(Ordering::Relaxed) {
        STATUS_RUNNING => "recording".to_string(),
        STATUS_PAUSED => "paused".to_string(),
        STATUS_ERROR => "error".to_string(),
        _ => "unknown".to_string(),
    }
}

/// Check if macOS Accessibility permission is granted
#[tauri::command]
pub fn check_accessibility() -> bool {
    platform::check_accessibility_permission()
}
