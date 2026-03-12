use serde::{Deserialize, Serialize};
use sysinfo::{Components, System};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu_usage: f32,       // 0-100%
    pub cpu_temp: f32,        // Celsius (0 if unavailable)
    pub memory_percent: f32,  // 0-100%
    pub memory_used_gb: f32,
    pub memory_total_gb: f32,
    pub fan_rpm: f32,         // max fan RPM (0 if unavailable)
}

/// Collect current system stats (CPU, temp, memory)
pub fn get_system_stats() -> SystemStats {
    let mut sys = System::new();
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    // CPU usage (average across all cores)
    let cpu_usage = sys.global_cpu_usage();

    // CPU temperature from components
    let components = Components::new_with_refreshed_list();
    let cpu_temp = components
        .iter()
        .find(|c| {
            let label = c.label().to_lowercase();
            label.contains("cpu") || label.contains("die") || label.contains("package")
        })
        .and_then(|c| c.temperature())
        .unwrap_or(0.0);

    // Fan speed — look for fan components
    let fan_rpm = components
        .iter()
        .filter(|c| {
            let label = c.label().to_lowercase();
            label.contains("fan")
        })
        .filter_map(|c| c.temperature()) // sysinfo reports fan RPM as "temperature" for some components
        .fold(0.0f32, f32::max);
    // On macOS, also try reading via SMC if sysinfo doesn't report fans
    let fan_rpm = if fan_rpm == 0.0 { get_fan_rpm_macos() } else { fan_rpm };

    // Memory
    let total = sys.total_memory() as f64;
    let used = sys.used_memory() as f64;
    let memory_percent = if total > 0.0 {
        (used / total * 100.0) as f32
    } else {
        0.0
    };

    SystemStats {
        cpu_usage,
        cpu_temp,
        memory_percent,
        memory_used_gb: (used / 1_073_741_824.0) as f32,
        memory_total_gb: (total / 1_073_741_824.0) as f32,
        fan_rpm,
    }
}

/// Try to read fan RPM on macOS via powermetrics / ioreg fallback
fn get_fan_rpm_macos() -> f32 {
    #[cfg(target_os = "macos")]
    {
        // Use ioreg to read AppleSMC fan data
        if let Ok(output) = std::process::Command::new("ioreg")
            .args(["-rc", "AppleSMCKeyStore"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            // Look for fan speed values — format varies but typically "Fan0" with RPM
            for line in text.lines() {
                if line.contains("FanActual") || line.contains("Fan0") {
                    // Try to extract numeric RPM value
                    if let Some(num) = line.split('=').last() {
                        if let Ok(rpm) = num.trim().trim_matches('"').parse::<f32>() {
                            if rpm > 0.0 {
                                return rpm;
                            }
                        }
                    }
                }
            }
        }
    }
    0.0
}

/// Determine buddy reaction based on system stats
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuddyReaction {
    pub state: String,       // "normal", "sweating", "on_fire", "blown", "stressed"
    pub message: Option<String>,
}

pub fn compute_reaction(stats: &SystemStats, distracted: bool) -> BuddyReaction {
    if distracted {
        return BuddyReaction {
            state: "scolding".to_string(),
            message: Some(pick_scold_message()),
        };
    }

    if stats.cpu_temp > 95.0 {
        return BuddyReaction {
            state: "on_fire".to_string(),
            message: Some(format!("CPU {}°C — I'm melting!!", stats.cpu_temp as i32)),
        };
    }

    // Fan max RPM — pet gets blown away
    if stats.fan_rpm > 6000.0 {
        return BuddyReaction {
            state: "blown".to_string(),
            message: Some(format!("Fan {}RPM — I'm flying away!!", stats.fan_rpm as i32)),
        };
    }

    // Fan high RPM — pet flutters
    if stats.fan_rpm > 5000.0 {
        return BuddyReaction {
            state: "windy".to_string(),
            message: Some(format!("Fan {}RPM — so windy!", stats.fan_rpm as i32)),
        };
    }

    if stats.cpu_temp > 80.0 {
        return BuddyReaction {
            state: "sweating".to_string(),
            message: Some(format!("CPU {}°C — so hot...", stats.cpu_temp as i32)),
        };
    }

    if stats.cpu_usage > 90.0 {
        return BuddyReaction {
            state: "sweating".to_string(),
            message: Some(format!("CPU {}% — working hard!", stats.cpu_usage as i32)),
        };
    }

    if stats.memory_percent > 90.0 {
        return BuddyReaction {
            state: "stressed".to_string(),
            message: Some(format!(
                "RAM {:.1}/{:.1} GB — I'm bloating!",
                stats.memory_used_gb, stats.memory_total_gb
            )),
        };
    }

    BuddyReaction {
        state: "normal".to_string(),
        message: None,
    }
}

fn pick_scold_message() -> String {
    let msgs = [
        "Shouldn't you be coding?",
        "Hey! Focus!",
        "Back to work!",
        "I see you slacking...",
        "Your code misses you",
        "Procrastination detected!",
        "That's not VS Code...",
        "Your pet is watching you.",
        "Close that tab. Now.",
        "Is that really productive?",
        "Your streak is crying rn",
    ];
    let idx = (std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        % msgs.len() as u128) as usize;
    msgs[idx].to_string()
}

/// Milestone thresholds (in minutes) for deep work celebration
pub fn check_milestone(total_focus_mins: i32, streak: i32) -> Option<String> {
    // Check session milestones
    match total_focus_mins {
        m if m >= 120 && m < 122 => Some("2 hours deep work! You're a machine!".to_string()),
        m if m >= 60 && m < 62 => Some("1 hour focused! Keep it up!".to_string()),
        m if m >= 180 && m < 182 => Some("3 HOURS! Legendary focus!".to_string()),
        _ => None,
    }
    .or_else(|| {
        // Check streak milestones
        match streak {
            3 => Some("3 sessions in a row! Hat trick!".to_string()),
            5 => Some("5 streak! You're on fire!".to_string()),
            10 => Some("10 STREAK! Absolute legend!".to_string()),
            _ => None,
        }
    })
}

/// Boss fight state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BossFight {
    pub active: bool,
    pub start_time: i64,        // ms timestamp
    pub duration_mins: i32,     // target: 120 mins
    pub elapsed_mins: i32,
    pub distractions: i32,      // penalty count
    pub hp: i32,                // boss HP 0-100
}

impl Default for BossFight {
    fn default() -> Self {
        Self {
            active: false,
            start_time: 0,
            duration_mins: 120,
            elapsed_mins: 0,
            distractions: 0,
            hp: 100,
        }
    }
}

/// Hydration & break reminder configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReminderConfig {
    pub water_enabled: bool,
    pub water_interval_mins: i32,     // default 30
    pub break_enabled: bool,
    pub break_interval_mins: i32,     // default 60
}

impl Default for ReminderConfig {
    fn default() -> Self {
        Self {
            water_enabled: true,
            water_interval_mins: 30,
            break_enabled: true,
            break_interval_mins: 60,
        }
    }
}

/// Hydration & break reminder state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReminderState {
    pub last_water_ms: i64,
    pub last_break_ms: i64,
    pub water_count_today: i32,
    pub today_date: String,          // "YYYY-MM-DD" to reset daily
    pub water_snoozed_until_ms: i64, // 0 = not snoozed
    pub break_snoozed_until_ms: i64,
}

impl Default for ReminderState {
    fn default() -> Self {
        let now = now_ms();
        Self {
            last_water_ms: now,
            last_break_ms: now,
            water_count_today: 0,
            today_date: today_str(),
            water_snoozed_until_ms: 0,
            break_snoozed_until_ms: 0,
        }
    }
}

pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn today_str() -> String {
    let secs = now_ms() / 1000;
    let days = secs / 86400;
    // Simple date calc (good enough for daily reset)
    format!("day-{}", days)
}

/// Check which reminders are due
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReminderCheck {
    pub water_due: bool,
    pub break_due: bool,
    pub water_count_today: i32,
}

pub fn check_reminders(config: &ReminderConfig, state: &mut ReminderState) -> ReminderCheck {
    let now = now_ms();
    let today = today_str();

    // Reset daily counter
    if state.today_date != today {
        state.water_count_today = 0;
        state.today_date = today;
    }

    let water_due = config.water_enabled
        && now - state.last_water_ms >= (config.water_interval_mins as i64) * 60 * 1000
        && (state.water_snoozed_until_ms == 0 || now >= state.water_snoozed_until_ms);

    let break_due = config.break_enabled
        && now - state.last_break_ms >= (config.break_interval_mins as i64) * 60 * 1000
        && (state.break_snoozed_until_ms == 0 || now >= state.break_snoozed_until_ms);

    ReminderCheck {
        water_due,
        break_due,
        water_count_today: state.water_count_today,
    }
}

impl BossFight {
    pub fn start(&mut self) {
        self.active = true;
        self.start_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;
        self.elapsed_mins = 0;
        self.distractions = 0;
        self.hp = 100;
    }

    /// Tick the boss fight — call every minute
    /// Returns a message if the fight state changed
    pub fn tick(&mut self, distracted: bool) -> Option<String> {
        if !self.active {
            return None;
        }

        self.elapsed_mins += 1;

        // Focused minute deals damage to boss
        if !distracted {
            let damage = 1; // ~1 HP per minute for 120 min fight
            self.hp = (self.hp - damage).max(0);
        } else {
            self.distractions += 1;
            // Boss heals on distraction
            self.hp = (self.hp + 3).min(100);
            return Some(format!("Boss healed! {} distractions so far...", self.distractions));
        }

        // Check victory
        if self.hp <= 0 {
            self.active = false;
            return Some("BOSS DEFEATED! 2hr deep work complete!".to_string());
        }

        // Check timeout
        if self.elapsed_mins >= self.duration_mins {
            self.active = false;
            if self.hp <= 20 {
                return Some(format!("So close! Boss had {}HP left. Try again!", self.hp));
            }
            return Some(format!("Time's up! Boss had {}HP left.", self.hp));
        }

        // Progress milestones
        match self.elapsed_mins {
            30 => Some(format!("30min in! Boss at {}HP — keep attacking!", self.hp)),
            60 => Some(format!("Halfway there! Boss at {}HP!", self.hp)),
            90 => Some(format!("90min! Almost there! Boss at {}HP!", self.hp)),
            _ => None,
        }
    }
}
