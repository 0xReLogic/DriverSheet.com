use anyhow::{anyhow, Context, Result};
use reqwest::Client;
use serde_json::json;
use std::sync::Arc;
use std::time::Duration;
use yup_oauth2::authenticator::DefaultAuthenticator;
use yup_oauth2::{ServiceAccountAuthenticator, ServiceAccountKey};

const SHEETS_SCOPE: &str = "https://www.googleapis.com/auth/spreadsheets";

#[derive(Clone)]
pub struct SheetsClient {
    authenticator: Arc<DefaultAuthenticator>,
    http: Client,
}

impl SheetsClient {
    pub async fn new(sa_key_json: &str) -> Result<Self> {
        let key: ServiceAccountKey = serde_json::from_str(sa_key_json)
            .context("Failed to parse GOOGLE_SA_KEY as service account JSON")?;

        let auth = ServiceAccountAuthenticator::builder(key)
            .build()
            .await
            .context("Failed to build service account authenticator")?;

        let http = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .context("Failed to construct reqwest client")?;

        Ok(Self {
            authenticator: Arc::new(auth),
            http,
        })
    }

    pub async fn append_row(&self, sheet_id: &str, values: &[serde_json::Value]) -> Result<()> {
        let token = self
            .authenticator
            .token(&[SHEETS_SCOPE])
            .await
            .context("Failed to obtain OAuth token for Sheets API")?;

        let url = format!(
            "https://sheets.googleapis.com/v4/spreadsheets/{}/values/Sheet1!A:D:append",
            sheet_id
        );

        let body = json!({
            "values": [values]
        });

        let response = self
            .http
            .post(url)
            .bearer_auth(
                token
                    .token()
                    .ok_or_else(|| anyhow!("Missing token string"))?,
            )
            .query(&[("valueInputOption", "USER_ENTERED")])
            .json(&body)
            .send()
            .await
            .context("Failed to send append request to Sheets API")?;

        if !response.status().is_success() {
            let text = response
                .text()
                .await
                .unwrap_or_else(|_| "<empty>".to_string());
            return Err(anyhow!("Sheets API error: {}", text));
        }

        Ok(())
    }
}
