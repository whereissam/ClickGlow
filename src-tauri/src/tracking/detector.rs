/// Get the currently active (frontmost) window's app name and title.

#[cfg(target_os = "macos")]
pub fn get_active_window() -> Option<(String, String)> {
    let output = std::process::Command::new("osascript")
        .args(["-e", r#"
            tell application "System Events"
                set frontApp to first application process whose frontmost is true
                set appName to name of frontApp
                try
                    set winTitle to name of front window of frontApp
                on error
                    set winTitle to ""
                end try
                return appName & "|||" & winTitle
            end tell
        "#])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<&str> = s.splitn(2, "|||").collect();
    if parts.len() == 2 {
        Some((parts[0].to_string(), parts[1].to_string()))
    } else if !s.is_empty() {
        Some((s, String::new()))
    } else {
        None
    }
}

#[cfg(not(target_os = "macos"))]
pub fn get_active_window() -> Option<(String, String)> {
    // TODO: Windows (GetForegroundWindow) and Linux (xdotool) support
    None
}
