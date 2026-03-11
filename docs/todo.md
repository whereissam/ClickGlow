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

## Phase 5: Focus Pet + Time Thief (Product Evolution) - DONE

The vision: merge three features into one product — **ClickGlow becomes a Digital Life Simulator**.

### 5A: Active Window Tracking - DONE

- [x] macOS active window detection via AppleScript (`osascript`) — no extra crate needed
- [x] `app_events` table + `app_categories` table (migration v3)
- [x] Background thread polls every 2s, records app transitions with duration
- [x] Categorize apps: productive / neutral / distraction (auto + user-configurable)
- [x] Apps tab: category pie chart + top apps bar chart (color-coded by category)
- [x] Window title keyword detection for distractions (YouTube, Twitter, Reddit, etc.)

### 5B: Focus Pet (Tamagotchi x Productivity) - DONE

- [x] Pet system: HP, XP, Level, Mood, species — stored as JSON in metadata
- [x] CSS-animated pet creature (slime/dragon/wizard) with mood states (idle, happy, angry, sleeping)
- [x] Pomodoro timer with configurable duration (15/25/30/45/60/90/120 min) → feed pet
- [x] Distraction detection via window title keywords → pet takes damage
- [x] Pet evolution: Lv1 Slime → Lv2 Dragon → Lv3 Wizard (auto-evolves at XP thresholds)
- [x] Focus streak tracking (consecutive sessions counter)
- [x] Interactive: click pet to bounce, hover to scale
- [x] Horizontal layout fix: pet + stats side-by-side to fit viewport
- [x] Onboarding wizard (3-step: welcome → accessibility permission → ready)
- [ ] Boss fight mode: 2hr deep work challenge (future enhancement)

### 5C: Time Thief Weekly Poster - DONE

- [x] "WANTED" poster UI for top time-wasting app (western style, gold/brown theme)
- [x] Stats: hours stolen, switch count, longest session
- [x] Auto-populated from distraction category data
- [ ] Export poster as PNG (placeholder — needs html2canvas or canvas rendering)
- [ ] Weekly notification: "Your time thief this week..." (future enhancement)

### 5D: Desktop Buddy (Stretch Goal)

- [ ] Floating mini-window with pet avatar
- [ ] Reacts to user behavior in real-time
- [ ] "Shouldn't you be coding?" when opening distractions
- [ ] Celebrates milestones: "2 hours deep work!"

---

## Phase 6: Desktop Edge Climber (Desktop Buddy Evolution)

Evolve the Focus Pet into a **desktop-edge climbing character** — a transparent always-on-top mini-window where the pet "escapes" from the sidebar and lives on your screen edge.

### 6A: Transparent Floating Window

- [ ] Create secondary Tauri window: transparent, frameless, always-on-top, skip-taskbar
- [ ] Window size ~80x120px, positioned at screen edge (right/left/bottom)
- [ ] Click-through on transparent areas (non-pet regions)
- [ ] Draggable: user can reposition pet along screen edges
- [ ] Edge snapping: pet "sticks" to nearest screen edge when released
- [ ] Toggle on/off from tray menu + pet panel

### 6B: Climbing & Edge Animations

- [ ] Idle animation: pet hangs on screen edge, gentle sway
- [ ] Climbing animation: pet crawls up/down the edge periodically
- [ ] Peek animation: pet peeks from behind the edge, hides when mouse approaches
- [ ] Walk animation: pet walks along bottom/top edge
- [ ] Transition between edges (climb around corners)

### 6C: System-Reactive Behaviors

- [ ] **CPU temperature monitor** (Rust `sysinfo` crate) — poll every 10s
  - [ ] CPU > 80°C → pet starts sweating (sweat drops animation)
  - [ ] CPU > 95°C → pet catches fire / melting animation
- [ ] **Fan speed monitor** — detect high RPM
  - [ ] Fan > 5000 RPM → pet gets "blown away" animation (hair/body fluttering)
  - [ ] Fan max → pet flies off screen edge, slowly crawls back
- [ ] **Memory pressure** — high RAM usage
  - [ ] RAM > 90% → pet inflates like a balloon, looks stressed
- [ ] Distraction detected → pet holds up a sign: "Hey! Focus!" or roasts you

### 6D: Hydration & Break Reminders

- [ ] Configurable timer: remind to drink water (default every 30 min)
- [ ] Pet holds up a water glass sign, does a drinking animation
- [ ] Break reminder: after 1hr continuous use, pet does stretching exercise
- [ ] Snooze button on reminder (pet looks disappointed)
- [ ] Reminder history: "You drank 8 glasses today!"

### 6E: Fun Interactions

- [ ] Click pet → random reaction (jump, spin, wave, blush)
- [ ] Double-click → pet does a backflip
- [ ] Right-click → context menu (feed, poke, sleep, settings)
- [ ] Drag pet away from edge → pet panics and scrambles back
- [ ] Idle too long → pet falls asleep on the edge, snores (zzz bubbles)
- [ ] Mouse cursor near pet → pet notices and watches cursor

---

## Phase 7: Gamification & Fun Data

### 7A: Mouse Odometer (Real-World Distance)

- [ ] Track total mouse pixel distance moved per day
- [ ] Convert pixels → real distance using screen DPI (e.g., "3.2 km today")
- [ ] Fun comparisons: "You climbed Mt. Jade!" / "You crossed the Golden Gate Bridge!"
- [ ] Daily/weekly/all-time distance stats
- [ ] Achievement badges for distance milestones

### 7B: Virtual Keyboard "Paint Wear" Simulator

- [ ] Render a virtual keyboard in UI
- [ ] Key opacity/texture degrades based on keystroke count
- [ ] Stages: pristine → faded → cracked → hole → missing keycap
- [ ] Visual "wear heatmap" on the keyboard layout
- [ ] Fun stat: "Your spacebar has been hit 42,069 times"

### 7C: APM (Actions Per Minute) Flow Mode

- [ ] Real-time APM counter (clicks + keystrokes per minute)
- [ ] Flow state detection: sustained high APM (>100) for 5+ minutes
- [ ] Visual effects when in flow: screen edge glow / fire effect / "ULTRA COMBO"
- [ ] APM history chart: see when you hit peak performance
- [ ] Daily high score + all-time record

### 7D: Boss Panic Index

- [ ] Detect rapid Alt+Tab / Cmd+Tab sequences (>3 switches in 2 seconds)
- [ ] Detect panic key combos: rapid Esc, Cmd+W, Cmd+H
- [ ] "Panic score" per incident, weekly panic report
- [ ] Pet reacts: ducks and hides when you panic-switch
- [ ] Achievement: "Stealth Master — 0 panic switches this week"

---

## Phase 8: Generative Art & Advanced Viz

### 8A: Mouse Trail Art Generator

- [ ] Record mouse trajectory with timestamps
- [ ] Render as generative art: particle trails / brush strokes / flow fields
- [ ] One day of work → one unique abstract artwork
- [ ] Export as PNG wallpaper / set as desktop background
- [ ] Art style options: watercolor, neon, ink, constellation

### 8B: Time-lapse Heatmap Replay

- [ ] Store heatmap snapshots per hour
- [ ] Playback slider: watch heatmap "burn in" from 9am → 5pm
- [ ] Adjustable speed: 1x, 2x, 5x, 10x
- [ ] Export as GIF / video

### 8C: 3D Terrain Map

- [ ] Convert click density → 3D height map
- [ ] Click clusters = mountains, mouse trails = rivers
- [ ] Interactive WebGL viewer (rotate, zoom)
- [ ] "Your desktop is a landscape" — shareable render

---

## Existing Future Enhancements

- [ ] Boss fight mode: 2hr deep work challenge with special rewards
- [ ] Export Time Thief poster as PNG (html2canvas)
- [ ] Weekly notification: "Your time thief this week..."
- [ ] Windows active window detection (GetForegroundWindow)
- [ ] Linux active window detection (xdotool / X11; document Wayland limitations)
- [ ] Pet rename UI in frontend
- [ ] App category editor UI (add/remove/change categories)
- [ ] Focus streak heatmap (GitHub-style contribution grid)
- [ ] Sound effects for pet interactions
- [ ] Dark/light theme toggle
