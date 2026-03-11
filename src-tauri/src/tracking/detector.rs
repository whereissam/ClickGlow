/// Get the currently active (frontmost) window's app name and title.

#[cfg(target_os = "macos")]
pub fn get_active_window() -> Option<(String, String)> {
    let output = std::process::Command::new("osascript")
        .args(["-e", r#"
            tell application "System Events"
                set frontApp to first application process whose frontmost is true
                set appName to displayed name of frontApp
                set bundleId to bundle identifier of frontApp
                try
                    set winTitle to name of front window of frontApp
                on error
                    set winTitle to ""
                end try
                return appName & "|||" & winTitle & "|||" & bundleId
            end tell
        "#])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<&str> = s.splitn(3, "|||").collect();
    if parts.len() >= 2 {
        let raw_name = parts[0].to_string();
        let title = parts[1].to_string();
        let bundle_id = if parts.len() == 3 { parts[2] } else { "" };

        // Use displayed name, but fall back to friendly name from bundle ID
        // This fixes "Electron" showing instead of "Visual Studio Code"
        let app_name = resolve_app_name(&raw_name, bundle_id);

        Some((app_name, title))
    } else if !s.is_empty() {
        Some((s, String::new()))
    } else {
        None
    }
}

/// Resolve a friendly app name from the bundle identifier when the process
/// name is generic (e.g. "Electron", "CEF", "helper").
#[cfg(target_os = "macos")]
fn resolve_app_name(displayed_name: &str, bundle_id: &str) -> String {
    // Map known bundle IDs to friendly names
    let friendly = match bundle_id {
        "com.microsoft.VSCode" => "Visual Studio Code",
        "com.microsoft.VSCodeInsiders" => "VS Code Insiders",
        "dev.zed.Zed" => "Zed",
        "com.sublimetext.4" | "com.sublimetext.3" => "Sublime Text",
        "com.googlecode.iterm2" => "iTerm2",
        "com.apple.Terminal" => "Terminal",
        "net.kovidgoyal.kitty" => "kitty",
        "co.zeit.hyper" => "Hyper",
        "com.github.wez.wezterm" => "WezTerm",
        "com.brave.Browser" => "Brave Browser",
        "com.google.Chrome" => "Google Chrome",
        "org.mozilla.firefox" => "Firefox",
        "com.apple.Safari" => "Safari",
        "com.operasoftware.Opera" => "Opera",
        "company.thebrowser.Browser" => "Arc",
        "com.vivaldi.Vivaldi" => "Vivaldi",
        "com.tinyspeck.slackmacgap" => "Slack",
        "com.hnc.Discord" => "Discord",
        "com.spotify.client" => "Spotify",
        "us.zoom.xos" => "Zoom",
        "com.figma.Desktop" => "Figma",
        "com.linear" => "Linear",
        "com.electron.dockerdesktop" => "Docker Desktop",
        "md.obsidian" => "Obsidian",
        "com.todesktop.230313mzl4w4u92" => "Cursor",
        "dev.warp.Warp-Stable" => "Warp",
        "com.postmanlabs.mac" => "Postman",
        "com.insomnia.app" => "Insomnia",
        "com.jetbrains.intellij" | "com.jetbrains.intellij.ce" => "IntelliJ IDEA",
        "com.jetbrains.WebStorm" => "WebStorm",
        "com.jetbrains.pycharm" | "com.jetbrains.pycharm.ce" => "PyCharm",
        "com.jetbrains.goland" => "GoLand",
        _ => "",
    };

    if !friendly.is_empty() {
        return friendly.to_string();
    }

    // If displayed name is generic, try extracting from bundle ID
    let generic_names = ["electron", "cef", "helper", "framework"];
    let lower = displayed_name.to_lowercase();
    if generic_names.iter().any(|g| lower.contains(g)) && !bundle_id.is_empty() {
        // Use last component of bundle ID as fallback
        // e.g. "com.example.MyApp" → "MyApp"
        if let Some(last) = bundle_id.rsplit('.').next() {
            return last.to_string();
        }
    }

    displayed_name.to_string()
}

#[cfg(not(target_os = "macos"))]
pub fn get_active_window() -> Option<(String, String)> {
    // TODO: Windows (GetForegroundWindow) and Linux (xdotool) support
    None
}
