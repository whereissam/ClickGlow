use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use crate::db::connection::Database;

pub struct AppState {
    pub db: Arc<Database>,
    pub paused: Arc<AtomicBool>,
}
