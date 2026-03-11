#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::check_accessibility_permission;

#[cfg(not(target_os = "macos"))]
pub fn check_accessibility_permission() -> bool {
    true // No permission needed on other platforms
}
