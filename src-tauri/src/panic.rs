// Boss Panic Index — detect rapid tab-switches and panic combos
use serde::Serialize;
use std::collections::VecDeque;
use std::sync::Mutex;

const PANIC_WINDOW_MS: i64 = 2000; // 2 seconds
const PANIC_SWITCH_THRESHOLD: usize = 3; // 3 switches in 2s = panic
const PANIC_KEY_WINDOW_MS: i64 = 1500; // rapid keys within 1.5s

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

pub struct PanicTracker {
    /// Recent Cmd+Tab / Alt+Tab timestamps
    recent_switches: VecDeque<i64>,
    /// Recent panic key timestamps (Esc, Cmd+W, Cmd+H)
    recent_panic_keys: VecDeque<i64>,
    /// Modifier state: is Cmd/Alt currently held
    cmd_held: bool,
    /// Panic events log
    events: VecDeque<PanicEvent>,
    /// Total panic count (session)
    total_panics: u32,
    /// Weekly panic count
    weekly_panics: u32,
    weekly_reset_date: String,
    /// Current panic happening
    in_panic: bool,
    panic_start_ms: i64,
}

impl PanicTracker {
    pub fn new() -> Mutex<Self> {
        Mutex::new(Self {
            recent_switches: VecDeque::with_capacity(20),
            recent_panic_keys: VecDeque::with_capacity(20),
            cmd_held: false,
            events: VecDeque::with_capacity(100),
            total_panics: 0,
            weekly_panics: 0,
            weekly_reset_date: String::new(),
            in_panic: false,
            panic_start_ms: 0,
        })
    }

    /// Called when a key is pressed — detects panic patterns
    pub fn on_key(&mut self, key: &str) {
        let now = now_ms();

        // Track modifier state
        if key == "MetaLeft" || key == "MetaRight" || key == "Alt" || key == "AltGr" {
            self.cmd_held = true;
        }

        // Detect Cmd+Tab / Alt+Tab
        if key == "Tab" && self.cmd_held {
            self.recent_switches.push_back(now);
            self.prune_old(&mut self.recent_switches.clone(), now, PANIC_WINDOW_MS);

            // Count switches in window
            let count = self.recent_switches.iter().filter(|&&t| t >= now - PANIC_WINDOW_MS).count();
            if count >= PANIC_SWITCH_THRESHOLD {
                self.trigger_panic(now, "rapid_tab_switch");
            }
        }

        // Detect panic keys: Escape, Cmd+W, Cmd+H
        let is_panic_key = key == "Escape"
            || (self.cmd_held && (key == "KeyW" || key == "KeyH" || key == "KeyQ"));

        if is_panic_key {
            self.recent_panic_keys.push_back(now);

            let count = self.recent_panic_keys.iter().filter(|&&t| t >= now - PANIC_KEY_WINDOW_MS).count();
            if count >= 3 {
                self.trigger_panic(now, "panic_keys");
            }
        }

        // Prune old entries
        let switch_cutoff = now - PANIC_WINDOW_MS;
        while self.recent_switches.front().map_or(false, |&t| t < switch_cutoff) {
            self.recent_switches.pop_front();
        }
        let key_cutoff = now - PANIC_KEY_WINDOW_MS;
        while self.recent_panic_keys.front().map_or(false, |&t| t < key_cutoff) {
            self.recent_panic_keys.pop_front();
        }

        // Clear panic state after 3 seconds of calm
        if self.in_panic && now - self.panic_start_ms > 3000 {
            self.in_panic = false;
        }
    }

    /// Called when a key is released
    pub fn on_key_release(&mut self, key: &str) {
        if key == "MetaLeft" || key == "MetaRight" || key == "Alt" || key == "AltGr" {
            self.cmd_held = false;
        }
    }

    fn trigger_panic(&mut self, now: i64, kind: &str) {
        if self.in_panic {
            return; // Don't double-count
        }

        self.in_panic = true;
        self.panic_start_ms = now;
        self.total_panics += 1;

        // Weekly reset
        let today = today_str();
        if self.weekly_reset_date.is_empty() {
            self.weekly_reset_date = today.clone();
        }
        // Simple: reset weekly count if more than 7 days have passed
        // (Just check if date string changed enough — approximate)
        if today != self.weekly_reset_date {
            // Check if it's been a week (rough check: different week)
            let days_diff = days_between(&self.weekly_reset_date, &today);
            if days_diff >= 7 {
                self.weekly_panics = 0;
                self.weekly_reset_date = today;
            }
        }
        self.weekly_panics += 1;

        let event = PanicEvent {
            timestamp_ms: now,
            kind: kind.to_string(),
            score: match kind {
                "rapid_tab_switch" => 3,
                "panic_keys" => 2,
                _ => 1,
            },
        };

        self.events.push_back(event);
        if self.events.len() > 100 {
            self.events.pop_front();
        }
    }

    pub fn get_stats(&self) -> PanicStats {
        let now = now_ms();
        let week_ago = now - 7 * 24 * 60 * 60 * 1000;
        let recent: Vec<PanicEvent> = self.events.iter()
            .filter(|e| e.timestamp_ms >= week_ago)
            .cloned()
            .collect();
        let weekly_score: u32 = recent.iter().map(|e| e.score).sum();

        PanicStats {
            in_panic: self.in_panic,
            total_panics: self.total_panics,
            weekly_panics: self.weekly_panics,
            weekly_score,
            recent_events: recent,
            stealth_master: self.weekly_panics == 0,
        }
    }

    fn prune_old(&self, _deque: &mut VecDeque<i64>, _now: i64, _window: i64) {
        // Pruning handled inline
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct PanicEvent {
    pub timestamp_ms: i64,
    pub kind: String,
    pub score: u32,
}

#[derive(Debug, Serialize)]
pub struct PanicStats {
    pub in_panic: bool,
    pub total_panics: u32,
    pub weekly_panics: u32,
    pub weekly_score: u32,
    pub recent_events: Vec<PanicEvent>,
    pub stealth_master: bool,
}

fn today_str() -> String {
    #[cfg(unix)]
    {
        use std::mem::MaybeUninit;
        unsafe {
            let now = libc::time(std::ptr::null_mut());
            let mut tm = MaybeUninit::<libc::tm>::uninit();
            libc::localtime_r(&now, tm.as_mut_ptr());
            let tm = tm.assume_init();
            format!("{:04}-{:02}-{:02}", tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday)
        }
    }
    #[cfg(not(unix))]
    {
        "unknown".to_string()
    }
}

/// Rough days between two YYYY-MM-DD strings
fn days_between(a: &str, b: &str) -> i64 {
    let parse = |s: &str| -> i64 {
        let parts: Vec<&str> = s.split('-').collect();
        if parts.len() != 3 { return 0; }
        let y: i64 = parts[0].parse().unwrap_or(0);
        let m: i64 = parts[1].parse().unwrap_or(0);
        let d: i64 = parts[2].parse().unwrap_or(0);
        y * 365 + m * 30 + d
    };
    (parse(b) - parse(a)).abs()
}
