use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::db::connection::Database;
use crate::db::queries;

pub fn now_ms_util() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

/// Start background thread that:
/// 1. Checks once per hour if a new weekly report needs generating
/// 2. Pre-aggregates yesterday's hourly stats
/// 3. Runs data retention cleanup
pub fn start_scheduler(db: Arc<Database>) {
    std::thread::spawn(move || {
        log::info!("Report scheduler started");

        // Initial delay: wait 30s after app start before first check
        std::thread::sleep(Duration::from_secs(30));

        loop {
            if let Err(e) = run_tasks(&db) {
                log::error!("Scheduler task error: {:?}", e);
            }
            // Check every hour
            std::thread::sleep(Duration::from_secs(3600));
        }
    });
}

fn run_tasks(db: &Database) -> Result<(), Box<dyn std::error::Error>> {
    let conn = db.conn.lock().map_err(|e| format!("lock: {}", e))?;

    // 1. Generate weekly report for last completed week (if not already done)
    check_weekly_report(&conn)?;

    // 2. Pre-aggregate yesterday's hourly stats
    aggregate_yesterday(&conn)?;

    // 3. Data retention cleanup
    run_retention(&conn)?;

    Ok(())
}

fn check_weekly_report(conn: &rusqlite::Connection) -> Result<(), Box<dyn std::error::Error>> {
    let (iso_week, start_ms, end_ms) = last_completed_iso_week();

    // Check if report already exists
    let existing = queries::get_metadata(conn, &format!("report_{}", iso_week))?;
    if existing.is_some() {
        return Ok(());
    }

    log::info!("Generating weekly report for {}", iso_week);
    queries::generate_weekly_report(conn, &iso_week, start_ms, end_ms)?;
    queries::set_metadata(conn, &format!("report_{}", iso_week), "done")?;
    log::info!("Weekly report {} generated", iso_week);
    Ok(())
}

fn aggregate_yesterday(conn: &rusqlite::Connection) -> Result<(), Box<dyn std::error::Error>> {
    use std::time::{SystemTime, UNIX_EPOCH};

    let now_ms = SystemTime::now().duration_since(UNIX_EPOCH)?.as_millis() as i64;
    let day_ms: i64 = 86_400_000;

    // Yesterday's boundaries (UTC)
    let today_start = (now_ms / day_ms) * day_ms;
    let yesterday_start = today_start - day_ms;
    let yesterday_end = today_start - 1;

    // Date key for yesterday
    let secs = yesterday_start / 1000;
    let days_since_epoch = secs / 86400;
    let date_key = epoch_days_to_date(days_since_epoch);

    let already = queries::get_metadata(conn, &format!("agg_{}", date_key))?;
    if already.is_some() {
        return Ok(());
    }

    queries::aggregate_hourly(conn, &date_key, yesterday_start, yesterday_end)?;
    queries::set_metadata(conn, &format!("agg_{}", date_key), "done")?;
    log::debug!("Aggregated hourly stats for {}", date_key);
    Ok(())
}

fn run_retention(conn: &rusqlite::Connection) -> Result<(), Box<dyn std::error::Error>> {
    let retention_months = queries::get_metadata(conn, "retention_months")?;
    let months: u32 = match retention_months {
        Some(s) => s.parse().unwrap_or(0),
        None => 0, // 0 = keep forever
    };

    if months == 0 {
        return Ok(());
    }

    use std::time::{SystemTime, UNIX_EPOCH};
    let now_ms = SystemTime::now().duration_since(UNIX_EPOCH)?.as_millis() as i64;
    let cutoff_ms = now_ms - (months as i64 * 30 * 86_400_000);

    let (mouse, keys) = queries::delete_old_events(conn, cutoff_ms)?;
    if mouse > 0 || keys > 0 {
        log::info!("Data retention: deleted {} mouse events, {} key events (older than {} months)", mouse, keys, months);
    }
    Ok(())
}

/// Calculate the last completed ISO week's (iso_week_string, start_ms, end_ms)
fn last_completed_iso_week() -> (String, i64, i64) {
    use std::time::{SystemTime, UNIX_EPOCH};

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;

    let day_ms: i64 = 86_400_000;
    let today_start = (now_ms / day_ms) * day_ms;

    // Days since epoch (1970-01-01 was Thursday = day 4 in ISO week)
    let days = today_start / day_ms;
    // ISO weekday: Monday=1 ... Sunday=7
    // 1970-01-01 is Thursday (ISO day 4)
    let iso_weekday = ((days + 3) % 7) + 1; // Mon=1

    // Start of this ISO week (Monday)
    let this_week_monday = today_start - (iso_weekday - 1) * day_ms;
    // Last week
    let last_monday = this_week_monday - 7 * day_ms;
    let last_sunday_end = this_week_monday - 1;

    // Calculate ISO week number
    let last_monday_days = last_monday / day_ms;
    let iso_week_str = days_to_iso_week(last_monday_days);

    (iso_week_str, last_monday, last_sunday_end)
}

fn days_to_iso_week(days_since_epoch: i64) -> String {
    // Convert days since epoch to year and day-of-year
    let (year, _month, _day) = epoch_days_to_ymd(days_since_epoch);

    // Find Thursday of this week to determine ISO year
    let iso_weekday = ((days_since_epoch + 3) % 7) + 1;
    let thursday = days_since_epoch + (4 - iso_weekday);

    // Year of the Thursday
    let (thu_year, _, _) = epoch_days_to_ymd(thursday);

    // Jan 4 is always in week 1 of its ISO year
    let jan4 = ymd_to_epoch_days(thu_year, 1, 4);
    let jan4_weekday = ((jan4 + 3) % 7) + 1;
    let week1_monday = jan4 - (jan4_weekday - 1);

    let week_num = (thursday - week1_monday) / 7 + 1;
    let _ = year; // suppress unused warning

    format!("{}-W{:02}", thu_year, week_num)
}

fn epoch_days_to_ymd(days: i64) -> (i32, u32, u32) {
    // Algorithm from https://howardhinnant.github.io/date_algorithms.html
    let z = days + 719468;
    let era = (if z >= 0 { z } else { z - 146096 }) / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y as i32, m, d)
}

fn epoch_days_to_date(days: i64) -> String {
    let (y, m, d) = epoch_days_to_ymd(days);
    format!("{:04}-{:02}-{:02}", y, m, d)
}

fn ymd_to_epoch_days(year: i32, month: u32, day: u32) -> i64 {
    let y = if month <= 2 { year as i64 - 1 } else { year as i64 };
    let m = if month <= 2 { month + 9 } else { month - 3 } as i64;
    let era = (if y >= 0 { y } else { y - 399 }) / 400;
    let yoe = (y - era * 400) as u64;
    let doy = (153 * m as u64 + 2) / 5 + day as u64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe as i64 - 719468
}
