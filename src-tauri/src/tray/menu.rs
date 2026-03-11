use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use std::sync::Arc;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

use crate::db::connection::Database;
use crate::pet;
use crate::state::{STATUS_PAUSED, STATUS_RUNNING};

const TRAY_HAPPY: &[u8] = include_bytes!("../../icons/tray-happy.png");
const TRAY_ANGRY: &[u8] = include_bytes!("../../icons/tray-angry.png");
const TRAY_SLEEPING: &[u8] = include_bytes!("../../icons/tray-sleeping.png");
const TRAY_IDLE: &[u8] = include_bytes!("../../icons/tray-idle.png");

fn pet_icon(mood: &str) -> Image<'static> {
    let bytes = match mood {
        "happy" => TRAY_HAPPY,
        "angry" => TRAY_ANGRY,
        "sleeping" => TRAY_SLEEPING,
        _ => TRAY_IDLE,
    };
    Image::from_bytes(bytes).expect("Failed to load tray icon")
}

pub fn setup_tray(
    app: &AppHandle,
    paused: Arc<AtomicBool>,
    listener_status: Arc<AtomicU8>,
    db: Arc<Database>,
    distracted: Arc<AtomicBool>,
) -> Result<(), Box<dyn std::error::Error>> {
    let p = pet::load_pet(&db);
    let pet_label = format!("{} HP:{}/{} Lv{}", p.name, p.hp, p.max_hp, p.level);
    let pet_item = MenuItem::with_id(app, "pet_status", &pet_label, false, None::<&str>)?;

    let status_label = status_text(listener_status.load(Ordering::Relaxed));
    let status_item = MenuItem::with_id(app, "status", &status_label, false, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Show Dashboard", true, None::<&str>)?;
    let buddy = MenuItem::with_id(app, "buddy", "Show Desktop Buddy", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, "pause", "Pause Recording", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&pet_item, &status_item, &show, &buddy, &pause, &quit])?;

    let _tray = TrayIconBuilder::new()
        .icon(pet_icon(&p.mood))
        .menu(&menu)
        .tooltip("ClickGlow")
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
                "buddy" => {
                    if let Some(window) = app.get_webview_window("buddy") {
                        let visible = window.is_visible().unwrap_or(false);
                        if visible {
                            let _ = window.hide();
                            let _ = buddy.set_text("Show Desktop Buddy");
                        } else {
                            let _ = window.show();
                            let _ = buddy.set_text("Hide Desktop Buddy");
                        }
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }

            // Update pet status in tray
            let _is_dist = distracted.load(Ordering::Relaxed);
            let p = pet::load_pet(&db);
            let _ = pet_item.set_text(&format!(
                "{} HP:{}/{} Lv{}",
                p.name, p.hp, p.max_hp, p.level
            ));
            // Update tray icon to match mood
            if let Some(tray) = app.tray_by_id("main") {
                let _ = tray.set_icon(Some(pet_icon(&p.mood)));
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
