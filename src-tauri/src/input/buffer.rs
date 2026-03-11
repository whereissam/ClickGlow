use std::sync::mpsc::Receiver;
use std::sync::Arc;
use std::time::{Duration, Instant};

use crate::db::connection::Database;
use crate::db::queries;
use crate::input::listener::InputEvent;

const BATCH_SIZE: usize = 100;
const FLUSH_INTERVAL: Duration = Duration::from_secs(5);

pub fn start_buffer(rx: Receiver<InputEvent>, db: Arc<Database>) {
    std::thread::spawn(move || {
        let mut buffer: Vec<InputEvent> = Vec::with_capacity(BATCH_SIZE);
        let mut last_flush = Instant::now();

        loop {
            // Try to receive with a short timeout so we can check flush interval
            match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(event) => {
                    buffer.push(event);
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                    // No event received, check if we should flush
                }
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                    // Channel closed, flush remaining and exit
                    flush(&db, &mut buffer);
                    log::info!("Buffer thread shutting down, flushed remaining events");
                    break;
                }
            }

            let should_flush =
                buffer.len() >= BATCH_SIZE || (last_flush.elapsed() >= FLUSH_INTERVAL && !buffer.is_empty());

            if should_flush {
                flush(&db, &mut buffer);
                last_flush = Instant::now();
            }
        }
    });
}

fn flush(db: &Database, buffer: &mut Vec<InputEvent>) {
    if buffer.is_empty() {
        return;
    }

    let conn = db.conn.lock().unwrap();
    match queries::batch_insert(&conn, buffer) {
        Ok(()) => {
            log::debug!("Flushed {} events to DB", buffer.len());
        }
        Err(e) => {
            log::error!("Failed to flush events: {:?}", e);
        }
    }
    buffer.clear();
}
