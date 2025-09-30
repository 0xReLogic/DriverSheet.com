use crate::db;
use crate::models::{LemonWebhook, LogEntry, User, UserUpsert};
use crate::state::AppState;
use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::{Duration, Utc};
use constant_time_eq::constant_time_eq;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, warn};

pub fn app_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_headers(Any)
        .allow_methods(Any);

    Router::new()
        .route("/api/users", post(upsert_user))
        .route("/api/users/:id/logs", get(list_logs))
        .route("/api/lemon-webhook", post(lemon_webhook))
        .route("/health", get(health))
        .layer(cors)
        .with_state(state)
}

type HmacSha256 = Hmac<Sha256>;

async fn upsert_user(
    State(state): State<AppState>,
    Json(payload): Json<UserUpsert>,
) -> Result<Json<UserResponse>, ApiError> {
    let payload = normalize_sheet(payload);
    let user = db::upsert_user(&state.pool, payload).await?;
    Ok(Json(UserResponse::from(user, &state)))
}

async fn list_logs(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Vec<LogEntry>>, ApiError> {
    let Some(user) = db::user_by_id(&state.pool, id).await? else {
        return Err(ApiError::NotFound);
    };

    if !user.paid {
        let expired = (Utc::now().naive_utc() - user.created) > Duration::days(7);
        if expired {
            return Err(ApiError::PaymentRequired);
        }
    }

    let logs = db::recent_logs(&state.pool, id, 30).await?;
    Ok(Json(logs))
}

async fn lemon_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, ApiError> {
    let signature = headers
        .get("X-Signature")
        .and_then(|value| value.to_str().ok())
        .ok_or(ApiError::Unauthorized)?;

    let payload = String::from_utf8(body.to_vec()).map_err(|_| ApiError::BadUtf8)?;

    verify_signature(&state, signature, &payload)?;

    let webhook: LemonWebhook = serde_json::from_str(&payload)?;
    if webhook.meta.event_name == "invoice.paid" {
        db::mark_paid(&state.pool, &webhook.data.attributes.customer_email).await?;
        info!("Marked {} as paid", webhook.data.attributes.customer_email);
    } else {
        warn!("Ignoring lemon event {}", webhook.meta.event_name);
    }

    Ok(StatusCode::OK)
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

fn verify_signature(state: &AppState, signature: &str, payload: &str) -> Result<(), ApiError> {
    let mut mac = HmacSha256::new_from_slice(state.config.lemon_webhook_secret.as_bytes())
        .map_err(|_| ApiError::Unauthorized)?;
    mac.update(payload.as_bytes());
    let payoff = hex::encode(mac.finalize().into_bytes());
    if constant_time_eq(signature.as_bytes(), payoff.as_bytes()) {
        Ok(())
    } else {
        Err(ApiError::Unauthorized)
    }
}

fn normalize_sheet(mut payload: UserUpsert) -> UserUpsert {
    payload.sheet_id = payload.sheet_id.map(|id| normalize_sheet_id(id.trim()));
    payload
}

fn normalize_sheet_id(input: &str) -> String {
    if let Some(idx) = input.find("/spreadsheets/d/") {
        let tail = &input[idx + "/spreadsheets/d/".len()..];
        if let Some(end) = tail.find('/') {
            return tail[..end].to_string();
        }
        if let Some(end) = tail.find('?') {
            return tail[..end].to_string();
        }
        return tail.to_string();
    }
    input.to_string()
}

#[derive(serde::Serialize)]
struct UserResponse {
    id: i64,
    google_id: String,
    email: String,
    sheet_id: Option<String>,
    #[serde(rename = "forwardAddress")]
    forward_address: String,
    paid: bool,
    created: chrono::NaiveDateTime,
    #[serde(rename = "trialExpired")]
    trial_expired: bool,
    #[serde(rename = "lemonPaymentUrl")]
    lemon_payment_url: String,
}

impl UserResponse {
    fn from(user: User, state: &AppState) -> Self {
        let trial_expired = (Utc::now().naive_utc() - user.created) > Duration::days(7);
        let sheet_id = user.sheet_id.clone();
        let forward_address = user.forwarding_address();
        let google_id = user.google_id.clone();
        let email = user.email.clone();
        Self {
            id: user.id,
            google_id,
            email,
            sheet_id,
            forward_address,
            paid: user.paid,
            created: user.created,
            trial_expired,
            lemon_payment_url: state.config.lemon_payment_url.clone(),
        }
    }
}

#[derive(Debug)]
pub enum ApiError {
    Unauthorized,
    NotFound,
    PaymentRequired,
    Database(sqlx::Error),
    BadRequest(serde_json::Error),
    BadUtf8,
    Other(anyhow::Error),
}

impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self {
        ApiError::Database(err)
    }
}

impl From<anyhow::Error> for ApiError {
    fn from(err: anyhow::Error) -> Self {
        ApiError::Other(err)
    }
}

impl From<serde_json::Error> for ApiError {
    fn from(err: serde_json::Error) -> Self {
        ApiError::BadRequest(err)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        match self {
            ApiError::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized").into_response(),
            ApiError::NotFound => (StatusCode::NOT_FOUND, "not found").into_response(),
            ApiError::PaymentRequired => {
                (StatusCode::PAYMENT_REQUIRED, "payment required").into_response()
            }
            ApiError::Database(err) => {
                tracing::error!(?err, "database error");
                (StatusCode::INTERNAL_SERVER_ERROR, "database error").into_response()
            }
            ApiError::BadRequest(err) => {
                tracing::warn!(?err, "bad request");
                (StatusCode::BAD_REQUEST, "invalid body").into_response()
            }
            ApiError::BadUtf8 => {
                tracing::warn!("invalid utf8 payload");
                (StatusCode::BAD_REQUEST, "invalid utf8").into_response()
            }
            ApiError::Other(err) => {
                tracing::error!(?err, "server error");
                (StatusCode::INTERNAL_SERVER_ERROR, "server error").into_response()
            }
        }
    }
}
