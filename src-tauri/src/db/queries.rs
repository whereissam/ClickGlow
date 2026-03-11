use rusqlite::Connection;
use serde::Serialize;

use crate::input::listener::InputEvent;

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
pub struct DailySummary {
    pub total_clicks: u64,
    pub total_moves: u64,
    pub total_keystrokes: u64,
    pub top_key: Option<String>,
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
    // Bucket into 10x10 pixel grid cells and count
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

    Ok(DailySummary {
        total_clicks,
        total_moves,
        total_keystrokes,
        top_key,
    })
}
