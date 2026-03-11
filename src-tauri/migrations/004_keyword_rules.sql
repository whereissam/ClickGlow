-- Keyword-based category rules (user-configurable)
-- Matches against window title (case-insensitive)
CREATE TABLE IF NOT EXISTS keyword_rules (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword  TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'neutral'  -- 'productive', 'neutral', 'distraction'
);

-- Default distraction keywords (users can override these)
INSERT OR IGNORE INTO keyword_rules (keyword, category) VALUES
    ('youtube', 'distraction'),
    ('twitter', 'distraction'),
    ('x.com', 'distraction'),
    ('reddit', 'distraction'),
    ('instagram', 'distraction'),
    ('tiktok', 'distraction'),
    ('facebook', 'distraction'),
    ('netflix', 'distraction'),
    ('twitch', 'distraction');

-- Default productive keywords
INSERT OR IGNORE INTO keyword_rules (keyword, category) VALUES
    ('github', 'productive'),
    ('stackoverflow', 'productive'),
    ('docs.rs', 'productive'),
    ('developer.apple', 'productive'),
    ('mdn web docs', 'productive');
