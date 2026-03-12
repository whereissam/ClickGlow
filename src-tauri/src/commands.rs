use std::sync::atomic::Ordering;
use tauri::State;

use crate::buddy::{self, BuddyReaction, SystemStats};
use crate::db::queries::{self, ActivityEntry, AppUsage, DailySummary, HeatmapPoint, KeyFrequency, KeywordRule, TimeThief, WeeklyReport};
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
    log::info!("Saving PNG: {} ({} bytes)", path.display(), data.len());
    std::fs::write(&path, &data).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn save_png_base64(base64_data: String, filename: String) -> Result<String, String> {
    use std::io::Write;
    let downloads = dirs::download_dir()
        .or_else(dirs::desktop_dir)
        .ok_or("Cannot find Downloads folder")?;
    let path = downloads.join(&filename);

    // Decode base64
    let decoded = base64_decode(&base64_data).map_err(|e| format!("Base64 decode error: {}", e))?;
    log::info!("Saving PNG (base64): {} ({} bytes)", path.display(), decoded.len());

    let mut file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    file.write_all(&decoded).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    let table = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = Vec::new();
    let mut buf: u32 = 0;
    let mut bits = 0;
    for &b in input.as_bytes() {
        if b == b'=' || b == b'\n' || b == b'\r' { continue; }
        let val = table.iter().position(|&c| c == b)
            .ok_or_else(|| format!("Invalid base64 char: {}", b as char))? as u32;
        buf = (buf << 6) | val;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
            buf &= (1 << bits) - 1;
        }
    }
    Ok(out)
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

#[tauri::command]
pub fn get_app_categories(state: State<AppState>) -> Result<Vec<(String, String)>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::get_app_categories(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_keyword_rules(state: State<AppState>) -> Result<Vec<KeywordRule>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::get_keyword_rules(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_keyword_rule(state: State<AppState>, keyword: String, category: String) -> Result<(), String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::set_keyword_rule(&conn, &keyword, &category).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_keyword_rule(state: State<AppState>, keyword: String) -> Result<(), String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::delete_keyword_rule(&conn, &keyword).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_activity_log(
    state: State<AppState>,
    start_ms: i64,
    end_ms: i64,
    limit: u32,
) -> Result<Vec<ActivityEntry>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    queries::get_activity_log(&conn, start_ms, end_ms, limit).map_err(|e| e.to_string())
}

// ===== Pet System =====

#[tauri::command]
pub fn get_pet(state: State<AppState>) -> PetState {
    pet::load_pet(&state.db)
}

#[tauri::command]
pub fn is_distracted(state: State<AppState>) -> bool {
    state.distracted.load(Ordering::Relaxed)
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

// ===== Desktop Buddy =====

#[tauri::command]
pub fn get_system_stats() -> SystemStats {
    buddy::get_system_stats()
}

#[tauri::command]
pub fn get_buddy_state(state: State<AppState>) -> BuddyReaction {
    let stats = buddy::get_system_stats();
    let distracted = state.distracted.load(Ordering::Relaxed);
    buddy::compute_reaction(&stats, distracted)
}

#[tauri::command]
pub fn toggle_buddy(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("buddy") {
        let visible = window.is_visible().unwrap_or(false);
        if visible {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.show().map_err(|e| e.to_string())?;
        }
        Ok(!visible)
    } else {
        Err("Buddy window not found".to_string())
    }
}

/// Check for focus milestones
#[tauri::command]
pub fn check_milestone(state: State<AppState>) -> Option<String> {
    let pet = pet::load_pet(&state.db);
    buddy::check_milestone(pet.total_focus_mins, pet.focus_streak)
}

/// Start a boss fight (2hr deep work challenge)
#[tauri::command]
pub fn start_boss_fight(state: State<AppState>) -> Result<buddy::BossFight, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let mut boss = buddy::BossFight::default();
    boss.start();
    let json = serde_json::to_string(&boss).map_err(|e| e.to_string())?;
    queries::set_metadata(&conn, "boss_fight", &json).map_err(|e| e.to_string())?;
    Ok(boss)
}

/// Get current boss fight state
#[tauri::command]
pub fn get_boss_fight(state: State<AppState>) -> buddy::BossFight {
    let conn = match state.db.conn.lock() {
        Ok(c) => c,
        Err(_) => return buddy::BossFight::default(),
    };
    match queries::get_metadata(&conn, "boss_fight") {
        Ok(Some(json)) => serde_json::from_str(&json).unwrap_or_default(),
        _ => buddy::BossFight::default(),
    }
}

/// Tick the boss fight (called every minute from frontend)
#[tauri::command]
pub fn tick_boss_fight(state: State<AppState>) -> Result<(buddy::BossFight, Option<String>), String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let mut boss: buddy::BossFight = match queries::get_metadata(&conn, "boss_fight") {
        Ok(Some(json)) => serde_json::from_str(&json).unwrap_or_default(),
        _ => return Ok((buddy::BossFight::default(), None)),
    };
    let distracted = state.distracted.load(Ordering::Relaxed);
    let msg = boss.tick(distracted);
    let json = serde_json::to_string(&boss).map_err(|e| e.to_string())?;
    queries::set_metadata(&conn, "boss_fight", &json).map_err(|e| e.to_string())?;
    Ok((boss, msg))
}

/// Get time thief summary for buddy notification
#[tauri::command]
pub fn get_weekly_time_thief(state: State<AppState>) -> Result<Option<String>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;
    let week_ago = now - 7 * 24 * 60 * 60 * 1000;
    match queries::get_time_thief(&conn, week_ago, now) {
        Ok(Some(thief)) => {
            let hours = thief.hours_stolen;
            Ok(Some(format!(
                "Your time thief this week: {} ({:.1}h). Watch out!",
                thief.app_name, hours
            )))
        }
        _ => Ok(None),
    }
}

/// Get screen dimensions for buddy edge detection
#[tauri::command]
pub fn get_screen_info(app: tauri::AppHandle) -> Result<(u32, u32), String> {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("buddy") {
        if let Ok(Some(m)) = window.current_monitor() {
            let size = m.size();
            return Ok((size.width, size.height));
        }
    }
    Err("Cannot get screen info".to_string())
}

/// Get buddy window position
#[tauri::command]
pub fn get_buddy_position(app: tauri::AppHandle) -> Result<(i32, i32), String> {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("buddy") {
        let pos = window.outer_position().map_err(|e| e.to_string())?;
        return Ok((pos.x, pos.y));
    }
    Err("Buddy window not found".to_string())
}

/// Resize buddy window (needed for walk mode along bottom edge)
#[tauri::command]
pub fn set_buddy_size(app: tauri::AppHandle, w: u32, h: u32) -> Result<(), String> {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("buddy") {
        window
            .set_size(tauri::Size::Physical(tauri::PhysicalSize { width: w, height: h }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn set_buddy_position(app: tauri::AppHandle, x: f64, y: f64) -> Result<(), String> {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("buddy") {
        window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: x as i32,
                y: y as i32,
            }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
