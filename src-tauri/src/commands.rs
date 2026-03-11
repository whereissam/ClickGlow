use std::sync::atomic::Ordering;
use tauri::State;

use crate::db::queries::{self, AppUsage, DailySummary, HeatmapPoint, KeyFrequency, TimeThief, WeeklyReport};
use crate::pet::{self, PetState};
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

/// Check if onboarding has been completed
#[tauri::command]
pub fn get_onboarding_done(state: State<AppState>) -> Result<bool, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let val = queries::get_metadata(&conn, "onboarding_done").map_err(|e| e.to_string())?;
    Ok(val.as_deref() == Some("1"))
}

/// Mark onboarding as completed
#[tauri::command]
pub fn set_onboarding_done(state: State<AppState>) -> Result<(), String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::set_metadata(&conn, "onboarding_done", "1").map_err(|e| e.to_string())
}

// ===== Weekly Reports =====

#[tauri::command]
pub fn get_weekly_report(
    state: State<AppState>,
    iso_week: String,
) -> Result<Option<WeeklyReport>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::get_weekly_report(&conn, &iso_week).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn generate_weekly_report(
    state: State<AppState>,
    iso_week: String,
    start_ms: i64,
    end_ms: i64,
) -> Result<WeeklyReport, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::generate_weekly_report(&conn, &iso_week, start_ms, end_ms).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_weekly_reports(state: State<AppState>) -> Result<Vec<String>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::list_weekly_reports(&conn).map_err(|e| e.to_string())
}

// ===== Data Retention =====

#[tauri::command]
pub fn get_retention_months(state: State<AppState>) -> Result<u32, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let val = queries::get_metadata(&conn, "retention_months").map_err(|e| e.to_string())?;
    Ok(val.and_then(|s| s.parse().ok()).unwrap_or(0))
}

#[tauri::command]
pub fn set_retention_months(state: State<AppState>, months: u32) -> Result<(), String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::set_metadata(&conn, "retention_months", &months.to_string()).map_err(|e| e.to_string())
}

// ===== PNG Export =====

#[tauri::command]
pub fn save_png(data: Vec<u8>, filename: String) -> Result<String, String> {
    let downloads = dirs::download_dir()
        .or_else(dirs::desktop_dir)
        .ok_or("Cannot find Downloads folder")?;
    let path = downloads.join(&filename);
    std::fs::write(&path, &data).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

// ===== App Tracking =====

#[tauri::command]
pub fn get_app_usage(
    state: State<AppState>,
    start_ms: i64,
    end_ms: i64,
) -> Result<Vec<AppUsage>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::get_app_usage(&conn, start_ms, end_ms).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_category_breakdown(
    state: State<AppState>,
    start_ms: i64,
    end_ms: i64,
) -> Result<Vec<(String, i64)>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::get_category_breakdown(&conn, start_ms, end_ms).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_time_thief(
    state: State<AppState>,
    start_ms: i64,
    end_ms: i64,
) -> Result<Option<TimeThief>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::get_time_thief(&conn, start_ms, end_ms).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_app_category(
    state: State<AppState>,
    app_name: String,
    category: String,
) -> Result<(), String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::set_app_category(&conn, &app_name, &category).map_err(|e| e.to_string())
}

// ===== Pet System =====

#[tauri::command]
pub fn get_pet(state: State<AppState>) -> PetState {
    pet::load_pet(&state.db)
}

#[tauri::command]
pub fn feed_pet(state: State<AppState>, focus_mins: i32) -> Result<PetState, String> {
    let mut p = pet::load_pet(&state.db);
    p.feed(focus_mins);
    pet::save_pet(&state.db, &p)?;
    Ok(p)
}

#[tauri::command]
pub fn damage_pet(state: State<AppState>, amount: i32) -> Result<PetState, String> {
    let mut p = pet::load_pet(&state.db);
    p.take_damage(amount);
    pet::save_pet(&state.db, &p)?;
    Ok(p)
}

#[tauri::command]
pub fn rename_pet(state: State<AppState>, name: String) -> Result<PetState, String> {
    let mut p = pet::load_pet(&state.db);
    p.name = name;
    pet::save_pet(&state.db, &p)?;
    Ok(p)
}
