# ClickGlow - Development TODO

## Phase 1: Capture and Store (Foundation) - DONE

- [x] Scaffold Tauri v2 project
- [x] Set up Rust module structure (`input/`, `db/`, `tray/`, `reporting/`)
- [x] Implement `db/connection.rs` - open SQLite with WAL mode
- [x] Implement `db/schema.rs` - run migrations on startup
- [x] Create `migrations/001_initial.sql` (mouse_events, key_events, metadata tables)
- [x] Implement `input/listener.rs` - spawn rdev thread, normalize events
- [x] Add mouse move throttling (50ms interval) in listener
- [x] Implement `input/buffer.rs` - batch events (100 events or 5s flush)
- [x] Implement `db/queries.rs` - batch insert for mouse and key events
- [x] Wire up `main.rs` - init DB, start listener, start buffer
- [x] Create `state.rs` - AppState with DB handle and listener controls
- [x] Add basic system tray icon with Quit menu item
- [x] Fix rdev macOS crash - switch to fufesou/rdev fork for thread-safe keyboard handling
- [x] Track mouse position via atomics for accurate click coordinates

## Phase 2: Visualization Dashboard - DONE

- [x] Implement read queries: `get_mouse_heatmap()`, `get_key_frequency()`, `get_daily_summary()`
- [x] Implement Tauri IPC commands in `commands.rs`
- [x] Build frontend with sidebar navigation (Dashboard / Heatmap / Keyboard)
- [x] Integrate `heatmap.js` for mouse heatmap rendering
- [x] Integrate `ECharts` for keyboard frequency bar chart
- [x] Add time range selector (today / this week / this month)
- [x] Add "Show Dashboard" to tray menu
- [x] Pre-aggregate data into 10x10 grid cells for heatmap performance
- [x] Cozy Game UI redesign (Space Grotesk + Inter, warm color palette)
- [x] Heatmap filter buttons (All / Clicks Only / Movement)
- [x] Mini heatmap preview on dashboard
- [x] Recording status indicator with pulse animation

## Phase 3: Controls and Polish - DONE

- [x] Add Pause/Resume toggle to tray menu and dashboard UI (clickable recording indicator)
- [x] Build summary stats: peak hour + hourly activity bar chart (clicks & keystrokes by hour)
- [x] Handle multi-monitor: detect actual screen dimensions via Core Graphics API (macOS)
- [x] Screen dimensions cached + refreshed every 60s
- [x] Graceful shutdown: hide window on close (tray app), flush buffer on channel disconnect
- [x] Compact stat cards UI fix (was too stretched)
- [x] Auto-start on login via `tauri-plugin-autostart` (macOS LaunchAgent)
- [x] Error handling: DB write retry (3 attempts w/ backoff), buffer overflow cap (10K events)
- [x] Surface listener status in tray menu (● Recording / ⏸ Paused / ⚠ Error)
- [x] macOS Accessibility permission detection via `AXIsProcessTrustedWithOptions` + UI banner

## Phase 4: Reports and Optimization - DONE

- [x] Weekly report scheduler (background thread, checks once/hour, compares ISO week)
- [x] Report data aggregation for full prior week (stored in `weekly_reports` table)
- [x] "Weekly Report" tab with stats, avg daily rates, hourly chart, top keys chart
- [x] Week selector dropdown + "Generate Current" button for on-demand reports
- [x] PNG export of heatmap (canvas.toBlob → save to Downloads via IPC)
- [x] Data retention settings (auto-delete after N months, configurable in Settings tab)
- [x] Pre-aggregate hourly buckets (`hourly_stats` table, auto-aggregated daily)
- [x] Settings tab with retention config and about info
- [x] Migration v2: `hourly_stats` + `weekly_reports` tables
- [ ] Windows testing and platform-specific fixes
- [ ] Linux testing (X11; document Wayland limitations)

## Phase 5: Focus Pet + Time Thief (Product Evolution)

The vision: merge three features into one product — **ClickGlow becomes a Digital Life Simulator**.

### 5A: Active Window Tracking

- [ ] Add `active-win-pos-rs` crate for foreground window detection
- [ ] Create `app_events` table (app_name, window_title, duration_ms, created_at)
- [ ] Poll active window every 2s, store transitions
- [ ] Categorize apps: productive / neutral / distraction (user-configurable)
- [ ] Add app usage chart to dashboard (time per app, pie chart)

### 5B: Focus Pet (Tamagotchi x Productivity)

- [ ] Design pet system: HP, XP, Level, Mood
- [ ] Canvas-based pet animation (idle, happy, angry, sleeping)
- [ ] Pomodoro timer integration (25min focus = feed pet)
- [ ] Distraction detection: if browser title contains YouTube/Twitter/Reddit → pet loses HP
- [ ] Pet evolution: Lv1 Slime → Lv2 Dragon → Lv3 Wizard
- [ ] Focus streak tracking (like GitHub contributions)
- [ ] Boss fight mode: 2hr deep work challenge

### 5C: Time Thief Weekly Poster

- [ ] Generate "WANTED" poster for top time-wasting app
- [ ] Western-style poster template (canvas rendering)
- [ ] Stats: hours stolen, number of switches, longest session
- [ ] Export as PNG for sharing
- [ ] Weekly notification: "Your time thief this week..."

### 5D: Desktop Buddy (Stretch Goal)

- [ ] Floating mini-window with pet avatar
- [ ] Reacts to user behavior in real-time
- [ ] "Shouldn't you be coding?" when opening distractions
- [ ] Celebrates milestones: "2 hours deep work!"
