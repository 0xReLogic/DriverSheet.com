use chrono::{NaiveDate, NaiveDateTime};
use serde::{Deserialize, Serialize};
use serde_with::serde_as;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct User {
    pub id: i64,
    #[serde(rename = "googleId")]
    pub google_id: String,
    pub email: String,
    #[serde(rename = "sheetId")]
    pub sheet_id: Option<String>,
    #[serde(rename = "forwardAddress")]
    pub forward_key: String,
    pub paid: bool,
    pub created: NaiveDateTime,
}

impl User {
    pub fn forwarding_address(&self) -> String {
        format!("user-{}@driversheet.com", self.forward_key)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct UserUpsert {
    #[serde(rename = "googleId")]
    pub google_id: String,
    pub email: String,
    #[serde(rename = "sheetId")]
    pub sheet_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct LogEntry {
    pub id: i64,
    #[serde(rename = "userId")]
    pub user_id: i64,
    #[serde(rename = "orderDate")]
    pub order_date: NaiveDate,
    pub gross: f64,
    pub tips: f64,
    pub mileage: Option<f64>,
    #[serde(rename = "parsedAt")]
    pub parsed_at: NaiveDateTime,
}

#[derive(Debug, Clone)]
pub struct NewLogEntry {
    pub user_id: i64,
    pub order_date: NaiveDate,
    pub gross: f64,
    pub tips: f64,
    pub mileage: Option<f64>,
}

#[serde_as]
#[derive(Debug, Deserialize)]
pub struct LemonWebhook {
    pub meta: LemonMeta,
    pub data: LemonData,
}

#[derive(Debug, Deserialize)]
pub struct LemonMeta {
    #[serde(rename = "event_name")]
    pub event_name: String,
}

#[serde_as]
#[derive(Debug, Deserialize)]
pub struct LemonData {
    pub attributes: LemonAttributes,
}

#[serde_as]
#[derive(Debug, Deserialize)]
pub struct LemonAttributes {
    #[serde(rename = "customer_email")]
    pub customer_email: String,
}
