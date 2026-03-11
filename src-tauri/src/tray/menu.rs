use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

use crate::state::{STATUS_PAUSED, STATUS_RUNNING};

pub fn setup_tray(
    app: &AppHandle,
    paused: Arc<AtomicBool>,
    listener_status: Arc<AtomicU8>,
) -> Result<(), Box<dyn std::error::Error>> {
    let status_label = status_text(listener_status.load(Ordering::Relaxed));
    let status_item = MenuItem::with_id(app, "status", &status_label, false, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Show Dashboard", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, "pause", "Pause Recording", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&status_item, &show, &pause, &quit])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("ClickGlow — Recording")
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "pause" => {
                    let is_paused = !paused.load(Ordering::Relaxed);
                    paused.store(is_paused, Ordering::Relaxed);

                    if is_paused {
                        listener_status.store(STATUS_PAUSED, Ordering::Relaxed);
                    } else {
                        listener_status.store(STATUS_RUNNING, Ordering::Relaxed);
                    }

                    let label = if is_paused { "Resume Recording" } else { "Pause Recording" };
                    let _ = pause.set_text(label);

                    let s = status_text(listener_status.load(Ordering::Relaxed));
                    let _ = status_item.set_text(&s);

                    log::info!("Recording {}", if is_paused { "paused" } else { "resumed" });
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}

fn status_text(status: u8) -> String {
    match status {
        0 => "● Recording".to_string(),
        1 => "⏸ Paused".to_string(),
        2 => "⚠ Error".to_string(),
        _ => "? Unknown".to_string(),
    }
}
