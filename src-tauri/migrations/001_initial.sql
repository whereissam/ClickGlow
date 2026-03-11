CREATE TABLE IF NOT EXISTS mouse_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type  INTEGER NOT NULL,
    x           REAL NOT NULL,
    y           REAL NOT NULL,
    screen_w    INTEGER NOT NULL,
    screen_h    INTEGER NOT NULL,
    created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS key_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    key_code    TEXT NOT NULL,
    created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS metadata (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mouse_events_created_at ON mouse_events(created_at);
CREATE INDEX IF NOT EXISTS idx_key_events_created_at ON key_events(created_at);
CREATE INDEX IF NOT EXISTS idx_mouse_events_type_time ON mouse_events(event_type, created_at);
