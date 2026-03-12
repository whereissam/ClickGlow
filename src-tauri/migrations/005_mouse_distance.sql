-- Mouse distance tracking (odometer)
CREATE TABLE IF NOT EXISTS mouse_distance (
    date_key   TEXT PRIMARY KEY,  -- 'YYYY-MM-DD'
    pixels     REAL NOT NULL DEFAULT 0,
    screen_dpi REAL NOT NULL DEFAULT 110
);
