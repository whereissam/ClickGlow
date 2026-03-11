# ClickGlow

A privacy-first keyboard & mouse heatmap generator for your desktop. Runs silently in the background, records your input activity locally, and generates beautiful heatmaps and frequency charts.

**All data stays on your machine. Zero network. Zero telemetry.**

## Features

- **Mouse Heatmap** - See where you click and hover most on screen
- **Keyboard Frequency Chart** - Discover your most-used keys
- **Daily/Weekly Reports** - Auto-generated usage summaries
- **System Tray** - Runs quietly in the background
- **Cross-platform** - macOS, Windows, Linux

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Rust + Tauri v2 |
| Input Capture | `rdev` (global listener) |
| Storage | SQLite via `rusqlite` (WAL mode) |
| Frontend | Vanilla JS + `heatmap.js` + `ECharts` |
| System Tray | Tauri built-in tray API |

## Architecture

```mermaid
graph TD
    subgraph OS["Operating System"]
        MOUSE["Mouse Events"]
        KB["Keyboard Events"]
    end

    subgraph RUST["Rust Backend (Tauri)"]
        RDEV["rdev Global Listener<br/><i>50ms mouse throttle</i>"]
        BUF["Event Buffer<br/><i>flush: 100 events / 5s</i>"]
        DB[("SQLite DB<br/><i>WAL mode</i>")]
        IPC["Tauri IPC Commands"]
        TRAY["System Tray<br/><i>Pause / Show / Quit</i>"]
    end

    subgraph FRONTEND["Frontend Dashboard"]
        HEAT["Mouse Heatmap<br/><i>heatmap.js</i>"]
        KEYS["Keyboard Chart<br/><i>ECharts</i>"]
        STATS["Stats Panel"]
    end

    MOUSE --> RDEV
    KB --> RDEV
    RDEV -->|"mpsc channel"| BUF
    BUF -->|"batch INSERT"| DB
    DB --> IPC
    IPC -->|"invoke()"| HEAT
    IPC -->|"invoke()"| KEYS
    IPC -->|"invoke()"| STATS
    TRAY -.->|"pause/resume"| RDEV

    style OS fill:#2A2D34,stroke:#5C5E66,color:#E8E6E3
    style RUST fill:#1E1F24,stroke:#F7B801,color:#E8E6E3
    style FRONTEND fill:#1E1F24,stroke:#7ED957,color:#E8E6E3
    style RDEV fill:#2A2D34,stroke:#FF6B35,color:#E8E6E3
    style BUF fill:#2A2D34,stroke:#F7B801,color:#E8E6E3
    style DB fill:#2A2D34,stroke:#5B8CFF,color:#E8E6E3
    style IPC fill:#2A2D34,stroke:#5C5E66,color:#E8E6E3
    style TRAY fill:#2A2D34,stroke:#F7B801,color:#E8E6E3
    style HEAT fill:#2A2D34,stroke:#FF6B35,color:#E8E6E3
    style KEYS fill:#2A2D34,stroke:#F7B801,color:#E8E6E3
    style STATS fill:#2A2D34,stroke:#7ED957,color:#E8E6E3
```

### Event Flow

```mermaid
sequenceDiagram
    participant OS as macOS / Windows
    participant L as Listener Thread
    participant B as Buffer Thread
    participant DB as SQLite
    participant FE as Frontend

    OS->>L: Mouse move (x, y)
    Note over L: Throttle: skip if < 50ms
    L->>B: InputEvent via mpsc
    OS->>L: Key press (key)
    L->>B: InputEvent via mpsc

    loop Every 100 events or 5s
        B->>DB: BEGIN TRANSACTION
        B->>DB: batch INSERT (prepared stmt)
        B->>DB: COMMIT
    end

    FE->>DB: invoke('get_mouse_heatmap')
    DB-->>FE: Vec<HeatmapPoint>
    FE->>DB: invoke('get_key_frequency')
    DB-->>FE: Vec<KeyFrequency>
```

### Product Roadmap

```mermaid
graph LR
    P1["Phase 1<br/>Capture + Store<br/><b>DONE</b>"]
    P2["Phase 2<br/>Dashboard<br/><b>DONE</b>"]
    P3["Phase 3<br/>Polish + Controls"]
    P4["Phase 4<br/>Weekly Reports"]
    P5["Phase 5<br/>Focus Pet +<br/>Time Thief"]

    P1 --> P2 --> P3 --> P4 --> P5

    style P1 fill:#7ED957,stroke:#5C5E66,color:#1E1F24
    style P2 fill:#7ED957,stroke:#5C5E66,color:#1E1F24
    style P3 fill:#F7B801,stroke:#5C5E66,color:#1E1F24
    style P4 fill:#2A2D34,stroke:#5C5E66,color:#E8E6E3
    style P5 fill:#2A2D34,stroke:#FF6B35,color:#E8E6E3
```

## Project Structure

```
ClickGlow/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # Entry point
│   │   ├── lib.rs               # Module declarations
│   │   ├── commands.rs          # Tauri IPC handlers
│   │   ├── state.rs             # App state (DB, listener controls)
│   │   ├── input/
│   │   │   ├── listener.rs      # rdev global listener
│   │   │   └── buffer.rs        # Event batching (100 events / 5s)
│   │   ├── db/
│   │   │   ├── connection.rs    # SQLite connection (WAL mode)
│   │   │   ├── schema.rs        # Migrations
│   │   │   └── queries.rs       # Insert/select/aggregate
│   │   ├── tray/                # System tray setup & menu
│   │   └── reporting/           # Weekly report scheduler
│   └── migrations/
│       └── 001_initial.sql
├── src/                         # Web frontend (vanilla JS)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── main.js              # App init, Tauri IPC
│       ├── heatmap.js           # Mouse heatmap (heatmap.js lib)
│       ├── keyboard-chart.js    # Key frequency (ECharts)
│       └── dashboard.js         # Dashboard orchestration
├── docs/
│   └── todo.md
└── README.md
```

## Data Schema

```sql
-- Mouse events (moves + clicks)
CREATE TABLE mouse_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type  INTEGER NOT NULL,  -- 0=move, 1=left, 2=right, 3=middle
    x           REAL NOT NULL,
    y           REAL NOT NULL,
    screen_w    INTEGER NOT NULL,
    screen_h    INTEGER NOT NULL,
    created_at  INTEGER NOT NULL   -- unix ms
);

-- Keyboard events (key-down only)
CREATE TABLE key_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    key_code    TEXT NOT NULL,      -- e.g. "KeyA", "Space", "ShiftLeft"
    created_at  INTEGER NOT NULL   -- unix ms
);
```

## Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Tauri v2 CLI](https://v2.tauri.app/start/prerequisites/)
- macOS: Grant **Accessibility** permission when prompted (System Settings > Privacy & Security > Accessibility)

## Development

```bash
# Install Tauri CLI
cargo install create-tauri-app --locked

# Scaffold project (run from parent directory)
cargo create-tauri-app

# Dev mode
cargo tauri dev

# Build release
cargo tauri build
```

## Privacy

ClickGlow stores all data in a local SQLite file (`~/.clickglow/data.db`). No data is ever transmitted over the network. No analytics. No telemetry. Your keystrokes and mouse data never leave your machine.

## License

MIT
