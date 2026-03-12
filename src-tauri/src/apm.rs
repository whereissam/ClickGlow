// APM (Actions Per Minute) tracking and Flow Mode detection
use serde::Serialize;
use std::collections::VecDeque;
use std::sync::Mutex;

const APM_WINDOW_SECS: i64 = 60;
const FLOW_APM_THRESHOLD: u32 = 100;
const FLOW_SUSTAIN_MS: i64 = 5 * 60 * 1000; // 5 minutes
const HISTORY_MINUTES: usize = 60;

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
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

pub struct ApmTracker {
    /// Recent event timestamps (rolling window)
    recent_events: VecDeque<i64>,
    /// When APM first exceeded threshold
    high_apm_since_ms: i64,
    /// Currently in flow state
    in_flow: bool,
    /// When flow started
    flow_start_ms: i64,
    /// Per-minute APM snapshots (timestamp_ms, apm)
    apm_history: VecDeque<(i64, u32)>,
    /// Last snapshot time
    last_snapshot_ms: i64,
    /// Daily high APM
    daily_high: u32,
    daily_high_date: String,
    /// All-time high APM
    alltime_high: u32,
}

impl ApmTracker {
    pub fn new() -> Mutex<Self> {
        Mutex::new(Self {
            recent_events: VecDeque::with_capacity(2000),
            high_apm_since_ms: 0,
            in_flow: false,
            flow_start_ms: 0,
            apm_history: VecDeque::with_capacity(HISTORY_MINUTES),
            last_snapshot_ms: 0,
            daily_high: 0,
            daily_high_date: String::new(),
            alltime_high: 0,
        })
    }

    /// Record an action (click or keystroke)
    pub fn record_action(&mut self) {
        let now = now_ms();
        self.recent_events.push_back(now);

        // Prune events older than window
        let cutoff = now - APM_WINDOW_SECS * 1000;
        while self.recent_events.front().map_or(false, |&t| t < cutoff) {
            self.recent_events.pop_front();
        }

        let apm = self.recent_events.len() as u32;

        // Daily reset
        let today = today_str();
        if today != self.daily_high_date {
            self.daily_high = 0;
            self.daily_high_date = today;
        }

        // Update high scores
        if apm > self.daily_high {
            self.daily_high = apm;
        }
        if apm > self.alltime_high {
            self.alltime_high = apm;
        }

        // Flow detection
        if apm >= FLOW_APM_THRESHOLD {
            if self.high_apm_since_ms == 0 {
                self.high_apm_since_ms = now;
            }
            let sustained = now - self.high_apm_since_ms;
            if sustained >= FLOW_SUSTAIN_MS && !self.in_flow {
                self.in_flow = true;
                self.flow_start_ms = self.high_apm_since_ms;
            }
        } else {
            self.high_apm_since_ms = 0;
            self.in_flow = false;
            self.flow_start_ms = 0;
        }

        // Snapshot APM every minute
        if now - self.last_snapshot_ms >= 60_000 {
            self.apm_history.push_back((now, apm));
            if self.apm_history.len() > HISTORY_MINUTES {
                self.apm_history.pop_front();
            }
            self.last_snapshot_ms = now;
        }
    }

    pub fn get_stats(&self) -> ApmStats {
        let now = now_ms();
        let cutoff = now - APM_WINDOW_SECS * 1000;
        let apm = self.recent_events.iter().filter(|&&t| t >= cutoff).count() as u32;

        let flow_duration_ms = if self.in_flow {
            now - self.flow_start_ms
        } else {
            0
        };

        // Compute flow level based on sustained APM above threshold
        let flow_level = if !self.in_flow {
            0
        } else if flow_duration_ms < 10 * 60 * 1000 {
            1 // "Warming up"
        } else if flow_duration_ms < 20 * 60 * 1000 {
            2 // "In the zone"
        } else {
            3 // "ULTRA COMBO"
        };

        ApmStats {
            current_apm: apm,
            in_flow: self.in_flow,
            flow_duration_ms,
            flow_level,
            daily_high: self.daily_high,
            alltime_high: self.alltime_high,
            history: self.apm_history.iter().map(|&(t, a)| ApmSnapshot { timestamp_ms: t, apm: a }).collect(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ApmStats {
    pub current_apm: u32,
    pub in_flow: bool,
    pub flow_duration_ms: i64,
    pub flow_level: u32, // 0=none, 1=warming, 2=zone, 3=ultra
    pub daily_high: u32,
    pub alltime_high: u32,
    pub history: Vec<ApmSnapshot>,
}

#[derive(Debug, Serialize)]
pub struct ApmSnapshot {
    pub timestamp_ms: i64,
    pub apm: u32,
}
