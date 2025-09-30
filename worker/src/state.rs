use crate::{config::AppConfig, sheets::SheetsClient};
use std::sync::Arc;

use sqlx::SqlitePool;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub sheets: Arc<SheetsClient>,
    pub config: Arc<AppConfig>,
}

impl AppState {
    pub fn new(pool: SqlitePool, sheets: SheetsClient, config: AppConfig) -> Self {
        Self {
            pool,
            sheets: Arc::new(sheets),
            config: Arc::new(config),
        }
    }
}
