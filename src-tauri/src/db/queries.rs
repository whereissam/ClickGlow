use rusqlite::{Connection, OptionalExtension};
use serde::Serialize;

use crate::input::listener::InputEvent;

// --- Metadata helpers ---

pub fn get_metadata(conn: &Connection, key: &str) -> Result<Option<String>, rusqlite::Error> {
    conn.query_row(
        "SELECT value FROM metadata WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get(0),
    )
    .optional()
}

pub fn set_metadata(conn: &Connection, key: &str, value: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO metadata (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        rusqlite::params![key, value],
    )?;
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct HeatmapPoint {
    pub x: f64,
    pub y: f64,
    pub value: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct KeyFrequency {
    pub key: String,
    pub count: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct HourlyActivity {
    pub hour: u32,
    pub clicks: u64,
    pub moves: u64,
    pub keystrokes: u64,
}

#[derive(Debug, Serialize)]
pub struct DailySummary {
    pub total_clicks: u64,
    pub total_moves: u64,
    pub total_keystrokes: u64,
    pub top_key: Option<String>,
    pub peak_hour: Option<u32>,
    pub hourly: Vec<HourlyActivity>,
}

pub fn batch_insert(conn: &Connection, events: &[InputEvent]) -> Result<(), rusqlite::Error> {
    let tx = conn.unchecked_transaction()?;

    {
        let mut mouse_stmt = tx.prepare_cached(
            "INSERT INTO mouse_events (event_type, x, y, screen_w, screen_h, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
        )?;
        let mut key_stmt = tx.prepare_cached(
            "INSERT INTO key_events (key_code, created_at) VALUES (?1, ?2)"
        )?;

        for event in events {
            match event {
                InputEvent::MouseMove { x, y, screen_w, screen_h, timestamp } => {
                    mouse_stmt.execute(rusqlite::params![0, x, y, screen_w, screen_h, timestamp])?;
                }
                InputEvent::MouseClick { x, y, button, screen_w, screen_h, timestamp } => {
                    mouse_stmt.execute(rusqlite::params![*button as i32, x, y, screen_w, screen_h, timestamp])?;
                }
                InputEvent::KeyPress { key_code, timestamp } => {
                    key_stmt.execute(rusqlite::params![key_code, timestamp])?;
                }
            }
        }
    }

    tx.commit()?;
    Ok(())
}

pub fn get_mouse_heatmap(
    conn: &Connection,
    start_ms: i64,
    end_ms: i64,
    event_type: Option<i32>,
) -> Result<Vec<HeatmapPoint>, rusqlite::Error> {
    let sql = match event_type {
        Some(_) => {
            "SELECT CAST(x/10 AS INTEGER)*10 as bx, CAST(y/10 AS INTEGER)*10 as by, COUNT(*) as cnt
             FROM mouse_events
             WHERE created_at >= ?1 AND created_at <= ?2 AND event_type = ?3
             GROUP BY bx, by"
        }
        None => {
            "SELECT CAST(x/10 AS INTEGER)*10 as bx, CAST(y/10 AS INTEGER)*10 as by, COUNT(*) as cnt
             FROM mouse_events
             WHERE created_at >= ?1 AND created_at <= ?2
             GROUP BY bx, by"
        }
    };

    let mut stmt = conn.prepare(sql)?;

    let mut results = Vec::new();
    let map_row = |row: &rusqlite::Row| -> Result<HeatmapPoint, rusqlite::Error> {
        Ok(HeatmapPoint {
            x: row.get(0)?,
            y: row.get(1)?,
            value: row.get(2)?,
        })
    };

    if let Some(et) = event_type {
        let rows = stmt.query_map(rusqlite::params![start_ms, end_ms, et], map_row)?;
        for row in rows {
            results.push(row?);
        }
    } else {
        let rows = stmt.query_map(rusqlite::params![start_ms, end_ms], map_row)?;
        for row in rows {
            results.push(row?);
        }
    }

    Ok(results)
}

pub fn get_key_frequency(
    conn: &Connection,
    start_ms: i64,
    end_ms: i64,
) -> Result<Vec<KeyFrequency>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT key_code, COUNT(*) as cnt FROM key_events
         WHERE created_at >= ?1 AND created_at <= ?2
         GROUP BY key_code ORDER BY cnt DESC LIMIT 50"
    )?;

    let rows = stmt.query_map(rusqlite::params![start_ms, end_ms], |row| {
        Ok(KeyFrequency {
            key: row.get(0)?,
            count: row.get(1)?,
        })
    })?;

    rows.collect()
}

pub fn get_daily_summary(
    conn: &Connection,
    start_ms: i64,
    end_ms: i64,
) -> Result<DailySummary, rusqlite::Error> {
    let total_clicks: u64 = conn.query_row(
        "SELECT COUNT(*) FROM mouse_events WHERE event_type > 0 AND created_at >= ?1 AND created_at <= ?2",
        rusqlite::params![start_ms, end_ms],
        |row| row.get(0),
    )?;

    let total_moves: u64 = conn.query_row(
        "SELECT COUNT(*) FROM mouse_events WHERE event_type = 0 AND created_at >= ?1 AND created_at <= ?2",
        rusqlite::params![start_ms, end_ms],
        |row| row.get(0),
    )?;

    let total_keystrokes: u64 = conn.query_row(
        "SELECT COUNT(*) FROM key_events WHERE created_at >= ?1 AND created_at <= ?2",
        rusqlite::params![start_ms, end_ms],
        |row| row.get(0),
    )?;

    let top_key: Option<String> = conn.query_row(
        "SELECT key_code FROM key_events WHERE created_at >= ?1 AND created_at <= ?2
         GROUP BY key_code ORDER BY COUNT(*) DESC LIMIT 1",
        rusqlite::params![start_ms, end_ms],
        |row| row.get(0),
    ).ok();

    let hourly = get_hourly_activity(conn, start_ms, end_ms)?;

    let peak_hour = hourly.iter()
        .max_by_key(|h| h.clicks + h.moves + h.keystrokes)
        .map(|h| h.hour);

    Ok(DailySummary {
        total_clicks,
        total_moves,
        total_keystrokes,
        top_key,
        peak_hour,
        hourly,
    })
}

// ===== Weekly Report =====

#[derive(Debug, Serialize, Clone)]
pub struct WeeklyReport {
    pub iso_week: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub total_clicks: u64,
    pub total_moves: u64,
    pub total_keystrokes: u64,
    pub top_key: Option<String>,
    pub peak_hour: Option<u32>,
    pub avg_daily_clicks: f64,
    pub avg_daily_keystrokes: f64,
    pub hourly: Vec<HourlyActivity>,
    pub top_keys: Vec<KeyFrequency>,
}

/// Generate and store a weekly report for the given ISO week range
pub fn generate_weekly_report(
    conn: &Connection,
    iso_week: &str,
    start_ms: i64,
    end_ms: i64,
) -> Result<WeeklyReport, rusqlite::Error> {
    let total_clicks: u64 = conn.query_row(
        "SELECT COUNT(*) FROM mouse_events WHERE event_type > 0 AND created_at >= ?1 AND created_at <= ?2",
        rusqlite::params![start_ms, end_ms],
        |row| row.get(0),
    )?;

    let total_moves: u64 = conn.query_row(
        "SELECT COUNT(*) FROM mouse_events WHERE event_type = 0 AND created_at >= ?1 AND created_at <= ?2",
        rusqlite::params![start_ms, end_ms],
        |row| row.get(0),
    )?;

    let total_keystrokes: u64 = conn.query_row(
        "SELECT COUNT(*) FROM key_events WHERE created_at >= ?1 AND created_at <= ?2",
        rusqlite::params![start_ms, end_ms],
        |row| row.get(0),
    )?;

    let top_key: Option<String> = conn.query_row(
        "SELECT key_code FROM key_events WHERE created_at >= ?1 AND created_at <= ?2
         GROUP BY key_code ORDER BY COUNT(*) DESC LIMIT 1",
        rusqlite::params![start_ms, end_ms],
        |row| row.get(0),
    ).ok();

    let top_keys = get_key_frequency(conn, start_ms, end_ms)?;
    let hourly = get_hourly_activity(conn, start_ms, end_ms)?;

    let peak_hour = hourly.iter()
        .max_by_key(|h| h.clicks + h.moves + h.keystrokes)
        .map(|h| h.hour);

    let days = ((end_ms - start_ms) as f64 / 86_400_000.0).max(1.0);
    let avg_daily_clicks = total_clicks as f64 / days;
    let avg_daily_keystrokes = total_keystrokes as f64 / days;

    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;

    // Store report
    conn.execute(
        "INSERT OR REPLACE INTO weekly_reports
         (iso_week, start_ms, end_ms, total_clicks, total_moves, total_keystrokes,
          top_key, peak_hour, avg_daily_clicks, avg_daily_keystrokes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        rusqlite::params![
            iso_week, start_ms, end_ms, total_clicks, total_moves, total_keystrokes,
            top_key, peak_hour, avg_daily_clicks, avg_daily_keystrokes, now_ms
        ],
    )?;

    Ok(WeeklyReport {
        iso_week: iso_week.to_string(),
        start_ms,
        end_ms,
        total_clicks,
        total_moves,
        total_keystrokes,
        top_key,
        peak_hour,
        avg_daily_clicks,
        avg_daily_keystrokes,
        hourly,
        top_keys,
    })
}

/// Get a stored weekly report
pub fn get_weekly_report(conn: &Connection, iso_week: &str) -> Result<Option<WeeklyReport>, rusqlite::Error> {
    let row = conn.query_row(
        "SELECT iso_week, start_ms, end_ms, total_clicks, total_moves, total_keystrokes,
                top_key, peak_hour, avg_daily_clicks, avg_daily_keystrokes
         FROM weekly_reports WHERE iso_week = ?1",
        rusqlite::params![iso_week],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, u64>(3)?,
                row.get::<_, u64>(4)?,
                row.get::<_, u64>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Option<u32>>(7)?,
                row.get::<_, f64>(8)?,
                row.get::<_, f64>(9)?,
            ))
        },
    ).optional()?;

    match row {
        None => Ok(None),
        Some((iso_week, start_ms, end_ms, total_clicks, total_moves, total_keystrokes,
              top_key, peak_hour, avg_daily_clicks, avg_daily_keystrokes)) => {
            let hourly = get_hourly_activity(conn, start_ms, end_ms)?;
            let top_keys = get_key_frequency(conn, start_ms, end_ms)?;
            Ok(Some(WeeklyReport {
                iso_week,
                start_ms,
                end_ms,
                total_clicks,
                total_moves,
                total_keystrokes,
                top_key,
                peak_hour,
                avg_daily_clicks,
                avg_daily_keystrokes,
                hourly,
                top_keys,
            }))
        }
    }
}

/// List all available weekly report ISO weeks
pub fn list_weekly_reports(conn: &Connection) -> Result<Vec<String>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT iso_week FROM weekly_reports ORDER BY iso_week DESC"
    )?;
    let rows = stmt.query_map([], |row| row.get(0))?;
    rows.collect()
}

/// Shared hourly activity query (used by daily summary and weekly reports)
fn get_hourly_activity(conn: &Connection, start_ms: i64, end_ms: i64) -> Result<Vec<HourlyActivity>, rusqlite::Error> {
    let mut hourly_stmt = conn.prepare(
        "SELECT
            CAST((created_at / 3600000) % 24 AS INTEGER) as hr,
            SUM(CASE WHEN event_type > 0 THEN 1 ELSE 0 END) as clicks,
            SUM(CASE WHEN event_type = 0 THEN 1 ELSE 0 END) as moves
         FROM mouse_events
         WHERE created_at >= ?1 AND created_at <= ?2
         GROUP BY hr ORDER BY hr"
    )?;

    let mut key_hourly_stmt = conn.prepare(
        "SELECT
            CAST((created_at / 3600000) % 24 AS INTEGER) as hr,
            COUNT(*) as cnt
         FROM key_events
         WHERE created_at >= ?1 AND created_at <= ?2
         GROUP BY hr ORDER BY hr"
    )?;

    let mut hourly_map: std::collections::HashMap<u32, HourlyActivity> = std::collections::HashMap::new();

    let mouse_rows = hourly_stmt.query_map(rusqlite::params![start_ms, end_ms], |row| {
        Ok((row.get::<_, u32>(0)?, row.get::<_, u64>(1)?, row.get::<_, u64>(2)?))
    })?;

    for row in mouse_rows {
        let (hr, clicks, moves) = row?;
        let entry = hourly_map.entry(hr).or_insert(HourlyActivity {
            hour: hr, clicks: 0, moves: 0, keystrokes: 0,
        });
        entry.clicks = clicks;
        entry.moves = moves;
    }

    let key_rows = key_hourly_stmt.query_map(rusqlite::params![start_ms, end_ms], |row| {
        Ok((row.get::<_, u32>(0)?, row.get::<_, u64>(1)?))
    })?;

    for row in key_rows {
        let (hr, cnt) = row?;
        let entry = hourly_map.entry(hr).or_insert(HourlyActivity {
            hour: hr, clicks: 0, moves: 0, keystrokes: 0,
        });
        entry.keystrokes = cnt;
    }

    let mut hourly: Vec<HourlyActivity> = hourly_map.into_values().collect();
    hourly.sort_by_key(|h| h.hour);
    Ok(hourly)
}

// ===== Pre-aggregation =====

/// Aggregate raw events into hourly_stats for a given date_key ('YYYY-MM-DD')
pub fn aggregate_hourly(conn: &Connection, date_key: &str, start_ms: i64, end_ms: i64) -> Result<(), rusqlite::Error> {
    // Mouse stats
    conn.execute(
        "INSERT OR REPLACE INTO hourly_stats (date_key, hour, clicks, moves, keystrokes)
         SELECT ?1,
                CAST((created_at / 3600000) % 24 AS INTEGER) as hr,
                SUM(CASE WHEN event_type > 0 THEN 1 ELSE 0 END),
                SUM(CASE WHEN event_type = 0 THEN 1 ELSE 0 END),
                0
         FROM mouse_events
         WHERE created_at >= ?2 AND created_at <= ?3
         GROUP BY hr",
        rusqlite::params![date_key, start_ms, end_ms],
    )?;

    // Update keystroke counts
    let mut stmt = conn.prepare(
        "SELECT CAST((created_at / 3600000) % 24 AS INTEGER) as hr, COUNT(*)
         FROM key_events
         WHERE created_at >= ?1 AND created_at <= ?2
         GROUP BY hr"
    )?;
    let rows = stmt.query_map(rusqlite::params![start_ms, end_ms], |row| {
        Ok((row.get::<_, u32>(0)?, row.get::<_, u64>(1)?))
    })?;

    for row in rows {
        let (hr, cnt) = row?;
        conn.execute(
            "INSERT INTO hourly_stats (date_key, hour, clicks, moves, keystrokes)
             VALUES (?1, ?2, 0, 0, ?3)
             ON CONFLICT(date_key, hour) DO UPDATE SET keystrokes = ?3",
            rusqlite::params![date_key, hr, cnt],
        )?;
    }

    Ok(())
}

// ===== Data Retention =====

/// Delete events older than `before_ms`
pub fn delete_old_events(conn: &Connection, before_ms: i64) -> Result<(usize, usize), rusqlite::Error> {
    let mouse_deleted = conn.execute(
        "DELETE FROM mouse_events WHERE created_at < ?1",
        rusqlite::params![before_ms],
    )?;
    let key_deleted = conn.execute(
        "DELETE FROM key_events WHERE created_at < ?1",
        rusqlite::params![before_ms],
    )?;
    Ok((mouse_deleted, key_deleted))
}

// ===== App Tracking =====

#[derive(Debug, Serialize, Clone)]
pub struct AppUsage {
    pub app_name: String,
    pub category: String,
    pub total_duration_ms: i64,
    pub session_count: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct TimeThief {
    pub app_name: String,
    pub hours_stolen: f64,
    pub switch_count: u64,
    pub longest_session_ms: i64,
}

/// Get app usage stats for a time range
pub fn get_app_usage(
    conn: &Connection,
    start_ms: i64,
    end_ms: i64,
) -> Result<Vec<AppUsage>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT app_name, category, SUM(duration_ms) as total, COUNT(*) as cnt
         FROM app_events
         WHERE created_at >= ?1 AND created_at <= ?2
         GROUP BY app_name
         ORDER BY total DESC
         LIMIT 30"
    )?;

    let rows = stmt.query_map(rusqlite::params![start_ms, end_ms], |row| {
        Ok(AppUsage {
            app_name: row.get(0)?,
            category: row.get(1)?,
            total_duration_ms: row.get(2)?,
            session_count: row.get(3)?,
        })
    })?;

    rows.collect()
}

/// Get category breakdown (productive/neutral/distraction time)
pub fn get_category_breakdown(
    conn: &Connection,
    start_ms: i64,
    end_ms: i64,
) -> Result<Vec<(String, i64)>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT category, SUM(duration_ms) as total
         FROM app_events
         WHERE created_at >= ?1 AND created_at <= ?2
         GROUP BY category
         ORDER BY total DESC"
    )?;

    let rows = stmt.query_map(rusqlite::params![start_ms, end_ms], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    })?;

    rows.collect()
}

/// Get the top time thief (most distracting app)
pub fn get_time_thief(
    conn: &Connection,
    start_ms: i64,
    end_ms: i64,
) -> Result<Option<TimeThief>, rusqlite::Error> {
    let result = conn.query_row(
        "SELECT app_name,
                SUM(duration_ms) / 3600000.0 as hours,
                COUNT(*) as switches,
                MAX(duration_ms) as longest
         FROM app_events
         WHERE created_at >= ?1 AND created_at <= ?2
           AND category = 'distraction'
         GROUP BY app_name
         ORDER BY hours DESC
         LIMIT 1",
        rusqlite::params![start_ms, end_ms],
        |row| {
            Ok(TimeThief {
                app_name: row.get(0)?,
                hours_stolen: row.get(1)?,
                switch_count: row.get(2)?,
                longest_session_ms: row.get(3)?,
            })
        },
    ).optional()?;

    Ok(result)
}

/// Set app category override
pub fn set_app_category(conn: &Connection, app_name: &str, category: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO app_categories (app_name, category) VALUES (?1, ?2)
         ON CONFLICT(app_name) DO UPDATE SET category = ?2",
        rusqlite::params![app_name, category],
    )?;
    Ok(())
}

/// Get all app category overrides
pub fn get_app_categories(conn: &Connection) -> Result<Vec<(String, String)>, rusqlite::Error> {
    let mut stmt = conn.prepare("SELECT app_name, category FROM app_categories ORDER BY app_name")?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;
    rows.collect()
}

/// Get recent activity log entries
#[derive(Debug, Serialize, Clone)]
pub struct ActivityEntry {
    pub app_name: String,
    pub window_title: String,
    pub category: String,
    pub duration_ms: i64,
    pub created_at: i64,
}

pub fn get_activity_log(
    conn: &Connection,
    start_ms: i64,
    end_ms: i64,
    limit: u32,
) -> Result<Vec<ActivityEntry>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT app_name, window_title, category, duration_ms, created_at
         FROM app_events
         WHERE created_at >= ?1 AND created_at <= ?2
         ORDER BY created_at DESC
         LIMIT ?3"
    )?;

    let rows = stmt.query_map(rusqlite::params![start_ms, end_ms, limit], |row| {
        Ok(ActivityEntry {
            app_name: row.get(0)?,
            window_title: row.get(1)?,
            category: row.get(2)?,
            duration_ms: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;

    rows.collect()
}

// ===== Keyword Rules =====

#[derive(Debug, Serialize, Clone)]
pub struct KeywordRule {
    pub id: i64,
    pub keyword: String,
    pub category: String,
}

pub fn get_keyword_rules(conn: &Connection) -> Result<Vec<KeywordRule>, rusqlite::Error> {
    let mut stmt = conn.prepare("SELECT id, keyword, category FROM keyword_rules ORDER BY keyword")?;
    let rows = stmt.query_map([], |row| {
        Ok(KeywordRule {
            id: row.get(0)?,
            keyword: row.get(1)?,
            category: row.get(2)?,
        })
    })?;
    rows.collect()
}

pub fn set_keyword_rule(conn: &Connection, keyword: &str, category: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO keyword_rules (keyword, category) VALUES (?1, ?2)
         ON CONFLICT(keyword) DO UPDATE SET category = ?2",
        rusqlite::params![keyword.to_lowercase(), category],
    )?;
    Ok(())
}

pub fn delete_keyword_rule(conn: &Connection, keyword: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "DELETE FROM keyword_rules WHERE keyword = ?1",
        rusqlite::params![keyword],
    )?;
    Ok(())
}

// ===== Mouse Distance (Odometer) =====

/// Add pixel distance for a given day (accumulates)
pub fn add_mouse_distance(conn: &Connection, date_key: &str, pixels: f64, dpi: f64) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO mouse_distance (date_key, pixels, screen_dpi)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(date_key) DO UPDATE SET pixels = pixels + ?2, screen_dpi = ?3",
        rusqlite::params![date_key, pixels, dpi],
    )?;
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct DistanceStats {
    pub today_pixels: f64,
    pub today_meters: f64,
    pub week_pixels: f64,
    pub week_meters: f64,
    pub alltime_pixels: f64,
    pub alltime_meters: f64,
    pub daily_history: Vec<DailyDistance>,
}

#[derive(Debug, Serialize)]
pub struct DailyDistance {
    pub date_key: String,
    pub pixels: f64,
    pub meters: f64,
}

/// Get distance stats: today, this week (last 7 days), and all-time
pub fn get_distance_stats(conn: &Connection, today: &str) -> Result<DistanceStats, rusqlite::Error> {
    // Today
    let today_row: Option<(f64, f64)> = conn.query_row(
        "SELECT pixels, screen_dpi FROM mouse_distance WHERE date_key = ?1",
        rusqlite::params![today],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).optional()?;
    let (today_pixels, today_dpi) = today_row.unwrap_or((0.0, 110.0));
    let today_meters = pixels_to_meters(today_pixels, today_dpi);

    // Last 7 days
    let mut stmt = conn.prepare(
        "SELECT date_key, pixels, screen_dpi FROM mouse_distance ORDER BY date_key DESC LIMIT 7"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?, row.get::<_, f64>(2)?))
    })?;
    let mut week_pixels = 0.0;
    let mut week_meters = 0.0;
    let mut daily_history = Vec::new();
    for row in rows {
        let (date_key, px, dpi) = row?;
        let m = pixels_to_meters(px, dpi);
        week_pixels += px;
        week_meters += m;
        daily_history.push(DailyDistance { date_key, pixels: px, meters: m });
    }

    // All-time
    let alltime_row: (f64, f64) = conn.query_row(
        "SELECT COALESCE(SUM(pixels), 0), AVG(screen_dpi) FROM mouse_distance",
        [],
        |row| Ok((row.get(0)?, row.get::<_, f64>(1).unwrap_or(110.0))),
    )?;
    let alltime_meters = pixels_to_meters(alltime_row.0, alltime_row.1);

    Ok(DistanceStats {
        today_pixels,
        today_meters,
        week_pixels,
        week_meters,
        alltime_pixels: alltime_row.0,
        alltime_meters,
        daily_history,
    })
}

/// Convert pixels to meters using DPI
fn pixels_to_meters(pixels: f64, dpi: f64) -> f64 {
    // 1 inch = 0.0254 meters, pixels / dpi = inches
    (pixels / dpi) * 0.0254
}

/// Get distraction time in the last N minutes (for pet damage calculation)
pub fn get_recent_distraction_ms(conn: &Connection, since_ms: i64) -> Result<i64, rusqlite::Error> {
    conn.query_row(
        "SELECT COALESCE(SUM(duration_ms), 0) FROM app_events
         WHERE created_at >= ?1 AND category = 'distraction'",
        rusqlite::params![since_ms],
        |row| row.get(0),
    )
}
