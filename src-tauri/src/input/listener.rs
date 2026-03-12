use rdev::{Event, EventType, Key, Button};
use std::sync::mpsc::Sender;
use std::sync::atomic::{AtomicBool, AtomicI64, AtomicU8, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use crate::apm::ApmTracker;
use crate::panic::PanicTracker;
use crate::state::{STATUS_RUNNING, STATUS_ERROR};

#[derive(Debug, Clone, Copy)]
pub enum MouseButton {
    Left = 1,
    Right = 2,
    Middle = 3,
}

#[derive(Debug, Clone)]
pub enum InputEvent {
    MouseMove {
        x: f64,
        y: f64,
        screen_w: u32,
        screen_h: u32,
        timestamp: i64,
    },
    MouseClick {
        x: f64,
        y: f64,
        button: MouseButton,
        screen_w: u32,
        screen_h: u32,
        timestamp: i64,
    },
    KeyPress {
        key_code: String,
        timestamp: i64,
    },
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn key_to_string(key: Key) -> String {
    format!("{:?}", key)
}

fn button_to_enum(button: Button) -> MouseButton {
    match button {
        Button::Left => MouseButton::Left,
        Button::Right => MouseButton::Right,
        Button::Middle => MouseButton::Middle,
        _ => MouseButton::Left,
    }
}

/// Get primary screen dimensions using Core Graphics on macOS
#[cfg(target_os = "macos")]
fn screen_dimensions() -> (u32, u32) {
    use core_graphics::display::CGDisplay;
    let display = CGDisplay::main();
    let w = display.pixels_wide() as u32;
    let h = display.pixels_high() as u32;
    if w > 0 && h > 0 { (w, h) } else { (1920, 1080) }
}

#[cfg(not(target_os = "macos"))]
fn screen_dimensions() -> (u32, u32) {
    (1920, 1080)
}

/// Track last known mouse position for click events
static LAST_MOUSE_X: AtomicI64 = AtomicI64::new(0);
static LAST_MOUSE_Y: AtomicI64 = AtomicI64::new(0);

pub fn start_listener(
    tx: Sender<InputEvent>,
    paused: Arc<AtomicBool>,
    listener_status: Arc<AtomicU8>,
    apm: Arc<Mutex<ApmTracker>>,
    panic_tracker: Arc<Mutex<PanicTracker>>,
) {
    std::thread::spawn(move || {
        listener_status.store(STATUS_RUNNING, Ordering::Relaxed);
        let mut last_move = Instant::now();
        let move_throttle = std::time::Duration::from_millis(50);

        // Cache screen dimensions, refresh every 60s
        let mut cached_dims = screen_dimensions();
        let mut last_dims_check = Instant::now();
        let dims_refresh = std::time::Duration::from_secs(60);

        // IMPORTANT: Do NOT access event.name in the callback.
        // On macOS, rdev's event.name calls TSMGetInputSourceProperty which
        // must run on the main thread. Calling it from the listener thread
        // causes a dispatch_assert_queue_fail crash.
        let callback = move |event: Event| {
            if paused.load(Ordering::Relaxed) {
                return;
            }

            // Refresh screen dimensions periodically
            if last_dims_check.elapsed() >= dims_refresh {
                cached_dims = screen_dimensions();
                last_dims_check = Instant::now();
            }

            let ts = now_ms();
            let (sw, sh) = cached_dims;

            let input_event = match event.event_type {
                EventType::MouseMove { x, y } => {
                    LAST_MOUSE_X.store(x.to_bits() as i64, Ordering::Relaxed);
                    LAST_MOUSE_Y.store(y.to_bits() as i64, Ordering::Relaxed);

                    if last_move.elapsed() < move_throttle {
                        return;
                    }
                    last_move = Instant::now();
                    Some(InputEvent::MouseMove {
                        x, y,
                        screen_w: sw,
                        screen_h: sh,
                        timestamp: ts,
                    })
                }
                EventType::ButtonPress(button) => {
                    let x = f64::from_bits(LAST_MOUSE_X.load(Ordering::Relaxed) as u64);
                    let y = f64::from_bits(LAST_MOUSE_Y.load(Ordering::Relaxed) as u64);

                    // APM: count clicks
                    if let Ok(mut apm) = apm.lock() {
                        apm.record_action();
                    }

                    Some(InputEvent::MouseClick {
                        x, y,
                        button: button_to_enum(button),
                        screen_w: sw,
                        screen_h: sh,
                        timestamp: ts,
                    })
                }
                EventType::KeyPress(key) => {
                    let key_code = key_to_string(key);

                    // APM: count keystrokes
                    if let Ok(mut apm) = apm.lock() {
                        apm.record_action();
                    }

                    // Panic detection
                    if let Ok(mut panic) = panic_tracker.lock() {
                        panic.on_key(&key_code);
                    }

                    Some(InputEvent::KeyPress {
                        key_code,
                        timestamp: ts,
                    })
                }
                EventType::KeyRelease(key) => {
                    let key_code = key_to_string(key);
                    // Track modifier releases for panic detection
                    if let Ok(mut panic) = panic_tracker.lock() {
                        panic.on_key_release(&key_code);
                    }
                    None
                }
                _ => None,
            };

            if let Some(evt) = input_event {
                let _ = tx.send(evt);
            }
        };

        log::info!("Input listener started (screen: {:?})", cached_dims);

        if let Err(e) = rdev::listen(callback) {
            log::error!("Input listener error: {:?}", e);
            listener_status.store(STATUS_ERROR, Ordering::Relaxed);
        }
    });
}
