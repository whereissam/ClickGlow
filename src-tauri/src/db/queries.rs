use rusqlite::Connection;
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

use rusqlite::OptionalExtension;

#[derive(Debug, Serialize)]
pub struct HeatmapPoint {
    pub x: f64,
    pub y: f64,
    pub value: u32,
}

#[derive(Debug, Serialize)]
pub struct KeyFrequency {
    pub key: String,
    pub count: u64,
}

#[derive(Debug, Serialize)]
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

    // Hourly activity breakdown
    // (created_at / 3600000) gives hour-of-epoch, % 24 gives hour-of-day in UTC
    // We use local time by adjusting in frontend instead
    let mut hourly_stmt = conn.prepare(
        "SELECT
            CAST((created_at / 3600000) % 24 AS INTEGER) as hr,
            SUM(CASE WHEN event_type > 0 THEN 1 ELSE 0 END) as clicks,
            SUM(CASE WHEN event_type = 0 THEN 1 ELSE 0 END) as moves
         FROM mouse_events
         WHERE created_at >= ?1 AND created_at <= ?2
         GROUP BY hr
         ORDER BY hr"
    )?;

    let mut key_hourly_stmt = conn.prepare(
        "SELECT
            CAST((created_at / 3600000) % 24 AS INTEGER) as hr,
            COUNT(*) as cnt
         FROM key_events
         WHERE created_at >= ?1 AND created_at <= ?2
         GROUP BY hr
         ORDER BY hr"
    )?;

    // Build hourly map
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

    // Peak hour = hour with most total activity
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
