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

        loop {
            match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(event) => {
                    buffer.push(event);
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                    // No event received, check if we should flush
                }
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                    flush_with_retry(&db, &mut buffer);
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
