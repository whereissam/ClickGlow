use std::sync::mpsc::Receiver;
use std::sync::Arc;
use std::time::{Duration, Instant};

use crate::db::connection::Database;
use crate::db::queries;
use crate::input::listener::InputEvent;

const BATCH_SIZE: usize = 100;
const FLUSH_INTERVAL: Duration = Duration::from_secs(5);
const MAX_RETRY: u32 = 3;
const MAX_BUFFER_SIZE: usize = 10_000; // Safety cap to prevent OOM

pub fn start_buffer(rx: Receiver<InputEvent>, db: Arc<Database>) {
    std::thread::spawn(move || {
        let mut buffer: Vec<InputEvent> = Vec::with_capacity(BATCH_SIZE);
        let mut last_flush = Instant::now();

        // Mouse odometer: track distance between consecutive move events
        let mut last_mouse: Option<(f64, f64)> = None;
        let mut accumulated_pixels: f64 = 0.0;
        let mut current_date = today_str();
        let mut current_dpi: f64 = get_screen_dpi();

        loop {
            match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(event) => {
                    // Calculate mouse distance for move events
                    if let InputEvent::MouseMove { x, y, .. } = &event {
                        if let Some((lx, ly)) = last_mouse {
                            let dx = x - lx;
                            let dy = y - ly;
                            accumulated_pixels += (dx * dx + dy * dy).sqrt();
                        }
                        last_mouse = Some((*x, *y));
                    }
                    buffer.push(event);
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                    // No event received, check if we should flush
                }
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                    flush_with_retry(&db, &mut buffer);
                    flush_distance(&db, &current_date, accumulated_pixels, current_dpi);
                    log::info!("Buffer thread shutting down, flushed remaining events");
                    break;
                }
            }

            // Safety: drop oldest events if buffer grows too large (DB write failing)
            if buffer.len() > MAX_BUFFER_SIZE {
                let drop_count = buffer.len() - MAX_BUFFER_SIZE;
                buffer.drain(..drop_count);
                log::warn!("Buffer overflow, dropped {} oldest events", drop_count);
            }

            let should_flush =
                buffer.len() >= BATCH_SIZE || (last_flush.elapsed() >= FLUSH_INTERVAL && !buffer.is_empty());

            if should_flush {
                flush_with_retry(&db, &mut buffer);

                // Flush accumulated distance
                let today = today_str();
                if today != current_date {
                    // Day changed: flush yesterday's remaining distance, reset
                    flush_distance(&db, &current_date, accumulated_pixels, current_dpi);
                    accumulated_pixels = 0.0;
                    current_date = today;
                    current_dpi = get_screen_dpi();
                } else if accumulated_pixels > 0.0 {
                    flush_distance(&db, &current_date, accumulated_pixels, current_dpi);
                    accumulated_pixels = 0.0;
                }

                last_flush = Instant::now();
            }
        }
    });
}

fn flush_with_retry(db: &Database, buffer: &mut Vec<InputEvent>) {
    if buffer.is_empty() {
        return;
    }

    for attempt in 0..MAX_RETRY {
        match db.conn.lock() {
            Ok(conn) => {
                match queries::batch_insert(&conn, buffer) {
                    Ok(()) => {
                        log::debug!("Flushed {} events to DB", buffer.len());
                        buffer.clear();
                        return;
                    }
                    Err(e) => {
                        log::error!("DB insert failed (attempt {}): {:?}", attempt + 1, e);
                    }
                }
            }
            Err(e) => {
                log::error!("DB lock poisoned (attempt {}): {:?}", attempt + 1, e);
            }
        }

        if attempt < MAX_RETRY - 1 {
            std::thread::sleep(Duration::from_millis(100 * (attempt as u64 + 1)));
        }
    }

    // All retries failed — keep events in buffer, they'll be retried next flush
    log::error!("All {} flush retries failed, {} events still buffered", MAX_RETRY, buffer.len());
}

fn flush_distance(db: &Database, date_key: &str, pixels: f64, dpi: f64) {
    if pixels <= 0.0 {
        return;
    }
    match db.conn.lock() {
        Ok(conn) => {
            if let Err(e) = queries::add_mouse_distance(&conn, date_key, pixels, dpi) {
                log::error!("Failed to flush mouse distance: {:?}", e);
            }
        }
        Err(e) => {
            log::error!("DB lock poisoned for distance flush: {:?}", e);
        }
    }
}

fn today_str() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Convert to local date by adding timezone offset
    let local_offset = chrono_free_local_offset();
    let local_secs = now as i64 + local_offset;
    let days = local_secs / 86400;
    // Compute date from days since epoch
    let (y, m, d) = days_to_ymd(days);
    format!("{:04}-{:02}-{:02}", y, m, d)
}

/// Get local timezone offset in seconds (without chrono dependency)
fn chrono_free_local_offset() -> i64 {
    // Use libc on macOS/Linux
    #[cfg(unix)]
    {
        use std::mem::MaybeUninit;
        unsafe {
            let now = libc::time(std::ptr::null_mut());
            let mut tm = MaybeUninit::<libc::tm>::uninit();
            libc::localtime_r(&now, tm.as_mut_ptr());
            (*tm.as_ptr()).tm_gmtoff as i64
        }
    }
    #[cfg(not(unix))]
    {
        0 // UTC fallback on non-Unix
    }
}

/// Convert days since Unix epoch to (year, month, day)
fn days_to_ymd(days: i64) -> (i32, u32, u32) {
    // Civil calendar algorithm
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y as i32, m, d)
}

/// Get screen DPI using Core Graphics on macOS
#[cfg(target_os = "macos")]
fn get_screen_dpi() -> f64 {
    use core_graphics::display::CGDisplay;
    let display = CGDisplay::main();
    let px_wide = display.pixels_wide() as f64;
    let mode = display.display_mode();
    match mode {
        Some(m) => {
            let pt_wide = m.width() as f64;
            if pt_wide > 0.0 {
                // Scale factor * base macOS DPI (72 pt/inch → actual pixels)
                let scale = px_wide / pt_wide;
                // macOS standard: 72 points per inch, so actual DPI = 72 * scale
                // But for physical distance, we use the panel's actual pixel density
                // Typical Retina MacBook: ~220 DPI, non-Retina: ~110 DPI
                // Approximate: most Mac displays are ~110 DPI at 1x, scale × 110
                110.0 * scale
            } else {
                110.0
            }
        }
        None => 110.0,
    }
}

#[cfg(not(target_os = "macos"))]
fn get_screen_dpi() -> f64 {
    96.0 // Windows/Linux default
}
