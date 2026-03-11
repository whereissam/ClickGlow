use serde::{Deserialize, Serialize};
use sysinfo::{Components, System};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu_usage: f32,       // 0-100%
    pub cpu_temp: f32,        // Celsius (0 if unavailable)
    pub memory_percent: f32,  // 0-100%
    pub memory_used_gb: f32,
    pub memory_total_gb: f32,
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
    }
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
        "Hey! Focus!",
        "Back to work!",
        "I see you slacking...",
        "Your code misses you",
        "Procrastination detected!",
    ];
    let idx = (std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        % msgs.len() as u128) as usize;
    msgs[idx].to_string()
}
