use rusqlite::Connection;

const MIGRATION_SQL: &str = include_str!("../../migrations/001_initial.sql");

pub fn run_migrations(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    let version: i32 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(MIGRATION_SQL)?;
        conn.pragma_update(None, "user_version", 1)?;
        log::info!("Ran migration v1");
    }

    Ok(())
}
