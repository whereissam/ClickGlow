-- Active window tracking
CREATE TABLE IF NOT EXISTS app_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name    TEXT NOT NULL,
    window_title TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL DEFAULT 'neutral',  -- 'productive', 'neutral', 'distraction'
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON app_events(created_at);
CREATE INDEX IF NOT EXISTS idx_app_events_app_name ON app_events(app_name);

-- App category overrides (user-configurable)
CREATE TABLE IF NOT EXISTS app_categories (
    app_name    TEXT PRIMARY KEY,
    category    TEXT NOT NULL DEFAULT 'neutral'
);

-- Default distraction categories
INSERT OR IGNORE INTO app_categories (app_name, category) VALUES
    ('YouTube', 'distraction'),
    ('Twitter', 'distraction'),
    ('Reddit', 'distraction'),
    ('Instagram', 'distraction'),
    ('TikTok', 'distraction'),
    ('Facebook', 'distraction'),
    ('Netflix', 'distraction'),
    ('Twitch', 'distraction');

-- Default productive categories
INSERT OR IGNORE INTO app_categories (app_name, category) VALUES
    ('Xcode', 'productive'),
    ('Visual Studio Code', 'productive'),
    ('Code', 'productive'),
    ('Terminal', 'productive'),
    ('iTerm2', 'productive'),
    ('IntelliJ IDEA', 'productive'),
    ('Sublime Text', 'productive'),
    ('Figma', 'productive'),
    ('Notion', 'productive'),
    ('Slack', 'productive');
