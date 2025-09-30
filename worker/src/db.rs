use crate::models::{LogEntry, NewLogEntry, User, UserUpsert};
use anyhow::Result;
use rand::{distributions::Alphanumeric, Rng};
use sqlx::{Sqlite, SqlitePool, Transaction};

pub async fn migrate(pool: &SqlitePool) -> Result<()> {
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
}

pub async fn upsert_user(pool: &SqlitePool, payload: UserUpsert) -> Result<User> {
    let mut tx = pool.begin().await?;
    let existing: Option<User> = sqlx::query_as(
        r#"SELECT id, google_id, email, sheet_id, forward_key, paid, created
        FROM users WHERE google_id = ?"#,
    )
    .bind(&payload.google_id)
    .fetch_optional(&mut *tx)
    .await?;

    let forward_key = if let Some(ref user) = existing {
        user.forward_key.clone()
    } else {
        generate_forward_key(&mut tx).await?
    };

    let sheet_id = payload
        .sheet_id
        .or_else(|| existing.as_ref().and_then(|u| u.sheet_id.clone()));

    sqlx::query(
        r#"INSERT INTO users (google_id, email, sheet_id, forward_key, paid)
           VALUES (?, ?, ?, ?, COALESCE((SELECT paid FROM users WHERE google_id = ?), 0))
           ON CONFLICT(google_id) DO UPDATE SET email=excluded.email, sheet_id=excluded.sheet_id"#,
    )
    .bind(&payload.google_id)
    .bind(&payload.email)
    .bind(&sheet_id)
    .bind(&forward_key)
    .bind(&payload.google_id)
    .execute(&mut *tx)
    .await?;

    let user = sqlx::query_as::<_, User>(
        r#"SELECT id, google_id, email, sheet_id, forward_key, paid, created
            FROM users WHERE google_id = ?"#,
    )
    .bind(&payload.google_id)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(user)
}

pub async fn mark_paid(pool: &SqlitePool, email: &str) -> Result<()> {
    sqlx::query("UPDATE users SET paid = 1 WHERE email = ?")
        .bind(email)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn recent_logs(pool: &SqlitePool, user_id: i64, limit: i64) -> Result<Vec<LogEntry>> {
    let rows = sqlx::query_as::<_, LogEntry>(
        r#"SELECT id, user_id, order_date, gross, tips, mileage, parsed_at
           FROM logs WHERE user_id = ? ORDER BY parsed_at DESC LIMIT ?"#,
    )
    .bind(user_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn insert_log(pool: &SqlitePool, entry: NewLogEntry) -> Result<LogEntry> {
    let record = sqlx::query_as::<_, LogEntry>(
        r#"INSERT INTO logs (user_id, order_date, gross, tips, mileage)
           VALUES (?, ?, ?, ?, ?)
           RETURNING id, user_id, order_date, gross, tips, mileage, parsed_at"#,
    )
    .bind(entry.user_id)
    .bind(entry.order_date)
    .bind(entry.gross)
    .bind(entry.tips)
    .bind(entry.mileage)
    .fetch_one(pool)
    .await?;
    Ok(record)
}

pub async fn user_by_forward(pool: &SqlitePool, forward_key: &str) -> Result<Option<User>> {
    let user = sqlx::query_as::<_, User>(
        r#"SELECT id, google_id, email, sheet_id, forward_key, paid, created
           FROM users WHERE forward_key = ?"#,
    )
    .bind(forward_key)
    .fetch_optional(pool)
    .await?;
    Ok(user)
}

pub async fn user_by_id(pool: &SqlitePool, id: i64) -> Result<Option<User>> {
    let user = sqlx::query_as::<_, User>(
        r#"SELECT id, google_id, email, sheet_id, forward_key, paid, created
           FROM users WHERE id = ?"#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(user)
}

pub async fn users_on_trial(pool: &SqlitePool, days: i64) -> Result<Vec<User>> {
    let offset = format!("-{} days", days);
    let rows = sqlx::query_as::<_, User>(
        r#"SELECT id, google_id, email, sheet_id, forward_key, paid, created
           FROM users WHERE paid = 0 AND created <= datetime('now', ?)"#,
    )
    .bind(offset)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

async fn generate_forward_key(tx: &mut Transaction<'_, Sqlite>) -> Result<String> {
    loop {
        let candidate: String = rand::thread_rng()
            .sample_iter(&Alphanumeric)
            .filter(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
            .map(char::from)
            .take(8)
            .collect();
        let slug = candidate.to_lowercase();
        let exists: Option<(i64,)> = sqlx::query_as("SELECT id FROM users WHERE forward_key = ?")
            .bind(&slug)
            .fetch_optional(&mut **tx)
            .await?;
        if exists.is_none() {
            return Ok(slug);
        }
    }
}
