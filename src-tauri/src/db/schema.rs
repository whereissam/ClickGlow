use rusqlite::Connection;

const MIGRATION_V1: &str = include_str!("../../migrations/001_initial.sql");
const MIGRATION_V2: &str = include_str!("../../migrations/002_hourly_stats.sql");
const MIGRATION_V3: &str = include_str!("../../migrations/003_app_tracking.sql");
const MIGRATION_V4: &str = include_str!("../../migrations/004_keyword_rules.sql");

pub fn run_migrations(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    let version: i32 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(MIGRATION_V1)?;
        conn.pragma_update(None, "user_version", 1)?;
        log::info!("Ran migration v1");
    }

    if version < 2 {
        conn.execute_batch(MIGRATION_V2)?;
        conn.pragma_update(None, "user_version", 2)?;
        log::info!("Ran migration v2 (hourly_stats + weekly_reports)");
    }

    if version < 3 {
        conn.execute_batch(MIGRATION_V3)?;
        conn.pragma_update(None, "user_version", 3)?;
        log::info!("Ran migration v3 (app_events + app_categories)");
    }

    if version < 4 {
        conn.execute_batch(MIGRATION_V4)?;
        conn.pragma_update(None, "user_version", 4)?;
        log::info!("Ran migration v4 (keyword_rules)");
    }

    Ok(())
}
