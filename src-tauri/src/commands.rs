use tauri::State;

use crate::db::queries::{self, DailySummary, HeatmapPoint, KeyFrequency};
use crate::state::AppState;

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
    !state.paused.load(std::sync::atomic::Ordering::Relaxed)
}

#[tauri::command]
pub fn toggle_recording(state: State<AppState>) -> bool {
    let was_paused = state.paused.load(std::sync::atomic::Ordering::Relaxed);
    state.paused.store(!was_paused, std::sync::atomic::Ordering::Relaxed);
    !was_paused // return: is now recording?
}
