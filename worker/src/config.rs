use anyhow::{Context, Result};
use serde::Deserialize;
use std::env;
use std::net::SocketAddr;

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub database_url: String,
    pub google_sa_key: String,
    pub lemon_webhook_secret: String,
    #[serde(default = "default_bind_api")]
    pub bind_api: SocketAddr,
    #[serde(default = "default_bind_mail")]
    pub bind_mail: SocketAddr,
    pub tmp_dir: String,
    pub lemon_payment_url: String,
}

fn default_bind_api() -> SocketAddr {
    "0.0.0.0:8080".parse().unwrap()
}

fn default_bind_mail() -> SocketAddr {
    "0.0.0.0:25".parse().unwrap()
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        let database_url = env::var("DATABASE_URL").context("DATABASE_URL missing")?;
        let google_sa_key = env::var("GOOGLE_SA_KEY").context("GOOGLE_SA_KEY missing")?;
        let lemon_webhook_secret =
            env::var("LEMON_WEBHOOK_SECRET").context("LEMON_WEBHOOK_SECRET missing")?;
        let bind_api = env::var("BIND_API")
            .unwrap_or_else(|_| "0.0.0.0:8080".to_string())
            .parse()
            .context("Invalid BIND_API")?;
        let bind_mail = env::var("BIND_MAIL")
            .unwrap_or_else(|_| "0.0.0.0:25".to_string())
            .parse()
            .context("Invalid BIND_MAIL")?;
        let tmp_dir = env::var("TMP_DIR").unwrap_or_else(|_| "data/tmp".to_string());
        let lemon_payment_url = env::var("LEMON_PAYMENT_URL")
            .unwrap_or_else(|_| "https://pay.lemon.com/driver-sheet".to_string());

        Ok(Self {
            database_url,
            google_sa_key,
            lemon_webhook_secret,
            bind_api,
            bind_mail,
            tmp_dir,
            lemon_payment_url,
        })
    }
}
