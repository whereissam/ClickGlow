#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::check_accessibility_permission;

#[cfg(target_os = "macos")]
pub use macos::check_accessibility_with_prompt;

#[cfg(not(target_os = "macos"))]
pub fn check_accessibility_permission() -> bool {
    true
}

#[cfg(not(target_os = "macos"))]
pub fn check_accessibility_with_prompt() -> bool {
    true
}
