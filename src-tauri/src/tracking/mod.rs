mod detector;

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use crate::db::connection::Database;
use crate::pet;

const POLL_INTERVAL: Duration = Duration::from_secs(2);
const PET_DAMAGE_PER_TICK: i32 = 3; // HP lost per 2s of distraction

/// Start the active window tracking thread.
/// Polls every 2s, records app transitions with duration.
/// Also damages the pet in real-time when distractions are detected.
pub fn start_tracker(db: Arc<Database>, paused: Arc<AtomicBool>, distracted: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        log::info!("Window tracker started");

        let mut last_app: Option<String> = None;
        let mut last_title: Option<String> = None;
        let mut last_switch = Instant::now();
        let mut distraction_ticks: u32 = 0;

        loop {
            std::thread::sleep(POLL_INTERVAL);

            if paused.load(Ordering::Relaxed) {
                continue;
            }

            let (app, title) = match detector::get_active_window() {
                Some(w) => w,
                None => continue,
            };

            // Check if CURRENT window is a distraction (real-time, every tick)
            let is_distraction = {
                match db.conn.lock() {
                    Ok(conn) => {
                        let cat = get_category(&conn, &app, &title);
                        log::debug!("Tracker: app={}, title={}, category={}", app, title, cat);
                        cat == "distraction"
                    },
                    Err(_) => false,
                }
            };

            distracted.store(is_distraction, Ordering::Relaxed);

            if is_distraction {
                distraction_ticks += 1;
                log::debug!("Distraction tick {} for {} - {}", distraction_ticks, app, title);
                // Damage pet every 5 ticks (10 seconds) of continuous distraction
                if distraction_ticks % 5 == 0 {
                    let mut p = pet::load_pet(&db);
                    p.take_damage(PET_DAMAGE_PER_TICK);
                    let _ = pet::save_pet(&db, &p);
                    log::debug!("Pet took {} damage (distraction: {} - {})", PET_DAMAGE_PER_TICK, app, title);
                }
            } else {
                distraction_ticks = 0;
            }

            let app_changed = last_app.as_deref() != Some(&app);
            // Also detect title change (e.g. switching YouTube tab in same browser)
            let title_changed = last_title.as_deref() != Some(&title);

            if app_changed || (title_changed && is_significant_title_change(last_title.as_deref(), &title)) {
                // Record the previous app's session
                if let Some(prev_app) = &last_app {
                    let duration = last_switch.elapsed().as_millis() as i64;
                    if duration > 1000 { // Only record if > 1 second
                        let prev_title = last_title.as_deref().unwrap_or("");
                        let ts = now_ms();

                        if let Err(e) = record_app_event(&db, prev_app, prev_title, duration, ts) {
                            log::error!("Failed to record app event: {:?}", e);
                        }
                    }
                }

                last_app = Some(app);
                last_title = Some(title);
                last_switch = Instant::now();
            } else if title_changed {
                last_title = Some(title);
            }
        }
    });
}

/// Check if a title change is significant enough to record as a new session
fn is_significant_title_change(old: Option<&str>, new: &str) -> bool {
    match old {
        None => true,
        Some(old_title) => {
            // Consider it significant if the domain/site changed
            let old_lower = old_title.to_lowercase();
            let new_lower = new.to_lowercase();
            let keywords = ["youtube", "twitter", "reddit", "instagram", "facebook", "netflix", "twitch"];
            for kw in &keywords {
                let was = old_lower.contains(kw);
                let now = new_lower.contains(kw);
                if was != now {
                    return true;
                }
            }
            false
        }
    }
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn record_app_event(
    db: &Database,
    app_name: &str,
    window_title: &str,
    duration_ms: i64,
    created_at: i64,
) -> Result<(), Box<dyn std::error::Error>> {
    let conn = db.conn.lock().map_err(|e| format!("{}", e))?;

    // Look up category from user overrides, or check window title for distraction keywords
    let category = get_category(&conn, app_name, window_title);

    conn.execute(
        "INSERT INTO app_events (app_name, window_title, category, duration_ms, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![app_name, window_title, category, duration_ms, created_at],
    )?;

    Ok(())
}

fn get_category(conn: &rusqlite::Connection, app_name: &str, window_title: &str) -> String {
    // 1. Check user-defined app category first (exact app name match)
    if let Ok(cat) = conn.query_row(
        "SELECT category FROM app_categories WHERE app_name = ?1",
        rusqlite::params![app_name],
        |row| row.get::<_, String>(0),
    ) {
        return cat;
    }

    // 2. Check keyword rules from DB (user-configurable, matches window title)
    let title_lower = window_title.to_lowercase();
    if let Ok(mut stmt) = conn.prepare("SELECT keyword, category FROM keyword_rules") {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }) {
            for row in rows.flatten() {
                let (keyword, category) = row;
                if title_lower.contains(&keyword) {
                    return category;
                }
            }
        }
    }

    "neutral".to_string()
}
