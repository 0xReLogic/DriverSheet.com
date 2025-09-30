mod api;
mod config;
mod db;
mod mail;
mod models;
mod sheets;
mod state;

use crate::config::AppConfig;
use crate::sheets::SheetsClient;
use crate::state::AppState;
use anyhow::Result;
use sqlx::sqlite::SqlitePoolOptions;
use std::time::Duration;
use tokio::signal;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    init_tracing();

    let config = AppConfig::from_env()?;
    std::fs::create_dir_all("data").ok();
    std::fs::create_dir_all(&config.tmp_dir).ok();

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await?;

    db::migrate(&pool).await?;

    let sheets = SheetsClient::new(&config.google_sa_key).await?;

    let bind_api = config.bind_api;
    let bind_mail = config.bind_mail;

    let state = AppState::new(pool.clone(), sheets, config);

    mail::run_mail_server(state.clone(), bind_mail);
    spawn_trial_monitor(state.clone());

    let app = api::app_router(state.clone());
    let listener = tokio::net::TcpListener::bind(bind_api).await?;
    tracing::info!("API listening on {}", listener.local_addr()?);

    axum::serve(listener, app.into_make_service())
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .try_init();
}

fn spawn_trial_monitor(state: AppState) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(3600));
        loop {
            interval.tick().await;
            if let Err(err) = enforce_trials(&state).await {
                tracing::error!(?err, "trial monitor error");
            }
        }
    });
}

async fn enforce_trials(state: &AppState) -> Result<()> {
    let users = db::users_on_trial(&state.pool, 7).await?;
    for user in users {
        tracing::warn!(user_id = user.id, email = %user.email, "trial expired without payment");
    }
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received");
}
