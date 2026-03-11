# ClickGlow Usage Guide

## Getting Started

### 1. Prerequisites

- **Rust** (stable) - [Install via rustup](https://rustup.rs/)
- **Tauri CLI v2** - `cargo install tauri-cli --version "^2" --locked`
- **macOS**: Accessibility permission required (see below)

### 2. Run in Development

```bash
cd ClickGlow
cargo tauri dev
```

### 3. Build for Release

```bash
cargo tauri build
```

The `.dmg` (macOS) / `.msi` (Windows) / `.deb` (Linux) will be in `src-tauri/target/release/bundle/`.

---

## macOS Permissions

ClickGlow uses global input listening to track mouse and keyboard activity. macOS requires **Accessibility** permission for this.

1. On first launch, macOS will prompt you to grant permission
2. Go to **System Settings > Privacy & Security > Accessibility**
3. Enable **ClickGlow** (or the terminal you're running `cargo tauri dev` from)
4. Restart the app

If using `cargo tauri dev`, you need to grant permission to your **terminal app** (e.g. Terminal.app, iTerm2, or VS Code).

---

## Dashboard

The dashboard has three views accessible from the sidebar:

### Dashboard (Overview)

Shows at-a-glance stats for the selected time range:
- **Clicks** - Total mouse clicks
- **Mouse Moves** - Sampled mouse movements (20Hz)
- **Keystrokes** - Total key presses
- **Top Key** - Most frequently pressed key
- **Activity Preview** - Mini heatmap of mouse activity

### Heatmap

Full-size mouse activity heatmap with filters:
- **All** - Combined movement + clicks
- **Clicks Only** - Only click positions (left, right, middle)
- **Movement** - Mouse hover/movement patterns

Colors range from blue (cold/low activity) through green and yellow to red (hot/high activity).

### Keyboard

Horizontal bar chart showing the top 50 most-used keys, sorted by frequency. Useful for discovering your typing patterns.

---

## Time Range

Use the dropdown in the sidebar to filter data:
- **Today** - Since midnight
- **This Week** - Since start of current week (Sunday)
- **This Month** - Since 1st of current month

---

## System Tray

ClickGlow runs as a system tray app. Right-click (or left-click on macOS) the tray icon for:
- **Show Dashboard** - Open/focus the dashboard window
- **Pause Recording** / **Resume Recording** - Toggle input capture
- **Quit** - Flush remaining events and exit

---

## Data Storage

All data is stored locally in SQLite:

```
~/Library/Application Support/clickglow/data.db    # macOS
%APPDATA%/clickglow/data.db                        # Windows
~/.local/share/clickglow/data.db                   # Linux
```

### Inspecting Data

You can query the database directly:

```bash
# Count events
sqlite3 ~/Library/Application\ Support/clickglow/data.db \
  "SELECT COUNT(*) FROM mouse_events; SELECT COUNT(*) FROM key_events;"

# Top 10 keys today
sqlite3 ~/Library/Application\ Support/clickglow/data.db \
  "SELECT key_code, COUNT(*) as cnt FROM key_events
   WHERE created_at >= strftime('%s','now','start of day') * 1000
   GROUP BY key_code ORDER BY cnt DESC LIMIT 10;"

# Mouse clicks by type
sqlite3 ~/Library/Application\ Support/clickglow/data.db \
  "SELECT event_type, COUNT(*) FROM mouse_events
   WHERE event_type > 0 GROUP BY event_type;"
```

### Data Size

Approximate storage usage during active use:
- ~576K mouse move events per 8-hour day (~28MB)
- ~10K-50K key events per day (~1MB)
- One month of heavy use: ~500MB-1GB

---

## How It Works

### Event Pipeline

```
Global Input (rdev)
    │
    ▼
Listener Thread ──── 50ms throttle on mouse moves
    │
    ▼
mpsc channel
    │
    ▼
Buffer Thread ──── flush every 100 events or 5 seconds
    │
    ▼
SQLite (WAL mode) ──── batch INSERT in single transaction
    │
    ▼
Tauri IPC Commands ──── frontend fetches via invoke()
    │
    ▼
Dashboard (heatmap.js + ECharts)
```

### Mouse Move Sampling

Mouse movement is sampled at 20Hz (one event per 50ms) to avoid flooding the database. This is more than enough resolution for heatmap visualization — the heatmap buckets data into 10x10 pixel grid cells anyway.

### Batch Writes

Events are buffered in memory and flushed to SQLite in batches to minimize I/O:
- **100 events** accumulated, OR
- **5 seconds** elapsed since last flush

Each flush is wrapped in a single SQLite transaction with prepared statements for maximum throughput.

---

## Privacy

- All data stays in the local SQLite file
- Zero network connections
- Zero analytics or telemetry
- No keylogger behavior — key codes are stored (e.g. "KeyA"), not actual typed characters
- You can delete the database file at any time to wipe all data
