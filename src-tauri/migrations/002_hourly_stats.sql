-- Pre-aggregated hourly stats for performance
CREATE TABLE IF NOT EXISTS hourly_stats (
    date_key    TEXT NOT NULL,       -- 'YYYY-MM-DD'
    hour        INTEGER NOT NULL,    -- 0-23 (UTC)
    clicks      INTEGER NOT NULL DEFAULT 0,
    moves       INTEGER NOT NULL DEFAULT 0,
    keystrokes  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date_key, hour)
);

-- Weekly reports table
CREATE TABLE IF NOT EXISTS weekly_reports (
    iso_week    TEXT PRIMARY KEY,    -- 'YYYY-Wnn' e.g. '2026-W10'
    start_ms    INTEGER NOT NULL,
    end_ms      INTEGER NOT NULL,
    total_clicks    INTEGER NOT NULL DEFAULT 0,
    total_moves     INTEGER NOT NULL DEFAULT 0,
    total_keystrokes INTEGER NOT NULL DEFAULT 0,
    top_key         TEXT,
    peak_hour       INTEGER,
    avg_daily_clicks    REAL NOT NULL DEFAULT 0,
    avg_daily_keystrokes REAL NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
);
