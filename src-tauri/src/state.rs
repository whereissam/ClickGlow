use std::sync::atomic::{AtomicBool, AtomicU8};
use std::sync::{Arc, Mutex};

use crate::apm::ApmTracker;
use crate::db::connection::Database;
use crate::panic::PanicTracker;

/// Listener status: 0 = running, 1 = paused, 2 = error
pub const STATUS_RUNNING: u8 = 0;
pub const STATUS_PAUSED: u8 = 1;
pub const STATUS_ERROR: u8 = 2;

pub struct AppState {
    pub db: Arc<Database>,
    pub paused: Arc<AtomicBool>,
    pub listener_status: Arc<AtomicU8>,
    pub distracted: Arc<AtomicBool>,
    pub apm: Arc<Mutex<ApmTracker>>,
    pub panic_tracker: Arc<Mutex<PanicTracker>>,
}
