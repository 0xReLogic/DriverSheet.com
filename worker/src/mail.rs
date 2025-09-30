use crate::db;
use crate::models::NewLogEntry;
use crate::state::AppState;
use anyhow::{anyhow, Context, Result};
use chrono::NaiveDate;
use mailin_embedded::{response, Handler, Response, Server, SslConfig};
use mailparse::ParsedMail;
use regex::Regex;
use serde_json::json;
use std::fs;
use std::io;
use std::mem;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use std::thread;
use tokio::runtime::Handle;
use tracing::{error, info, warn};
use uuid::Uuid;

const REGEX_GROSS: &str = r"Gross\s*\$?([\d,]+\.\d{2})";
const REGEX_TIPS: &str = r"Tips\s*\$?([\d,]+\.\d{2})";
const REGEX_DATE: &str = r"Date\s*(\d{1,2}/\d{1,2}/\d{4})";
const REGEX_MILEAGE: &str = r"Mileage\s*([\d,]+\.?\d*)?\s*mi";

pub fn run_mail_server(state: AppState, addr: SocketAddr) {
    let handle = Handle::current();
    let shared_state = Arc::new(state);
    thread::spawn(move || {
        let handler = MailApp::new(shared_state.clone(), handle.clone());
        let mut server = Server::new(handler);
        server.with_name("driversheet.com");
        if let Err(err) = server
            .with_ssl(SslConfig::None)
            .and_then(|s| s.with_addr(addr))
        {
            error!("mailin server configuration failed: {err:?}");
            return;
        }

        if let Err(err) = server.serve() {
            error!("mailin server failed: {err:?}");
        }
    });
}

struct MailApp {
    state: Arc<AppState>,
    handle: Handle,
    recipients: Vec<String>,
    buffer: Vec<u8>,
}

impl MailApp {
    fn new(state: Arc<AppState>, handle: Handle) -> Self {
        Self {
            state,
            handle,
            recipients: Vec::new(),
            buffer: Vec::new(),
        }
    }

    fn parse_forward_key(address: &str) -> Option<String> {
        let lower = address.to_ascii_lowercase();
        if let Some((local, domain)) = lower.split_once('@') {
            if domain == "driversheet.com" && local.starts_with("user-") {
                return Some(local.trim_start_matches("user-").to_string());
            }
        }
        None
    }

    async fn process_message(&self, recipient: &str, data: Vec<u8>) -> Result<()> {
        let parsed = mailparse::parse_mail(&data).context("Failed to parse email")?;

        let Some(user) = db::user_by_forward(&self.state.pool, recipient).await? else {
            warn!("No user mapped to forward key {recipient}");
            return Ok(());
        };

        let pdf_bytes = find_first_pdf(&parsed).context("No PDF attachment found")?;
        let tmp_path = write_temp_file(&self.state.config.tmp_dir, &pdf_bytes)?;
        let text = match pdf_extract::extract_text(&tmp_path) {
            Ok(content) => content,
            Err(err) => {
                error!("Failed to extract PDF text: {err:?}");
                return Ok(());
            }
        };
        fs::remove_file(&tmp_path).ok();

        let (order_date, gross, tips, mileage) = parse_text(&text)?;

        if let Some(sheet_id) = user.sheet_id.clone() {
            if let Err(err) = self
                .state
                .sheets
                .append_row(
                    &sheet_id,
                    &[
                        json!(order_date.to_string()),
                        json!(gross),
                        json!(tips),
                        json!(mileage),
                    ],
                )
                .await
            {
                error!("Sheets append failed: {err:?}");
            }
        } else {
            warn!("User {} missing sheet_id; skipping Sheets append", user.id);
        }

        let new_log = NewLogEntry {
            user_id: user.id,
            order_date,
            gross,
            tips,
            mileage,
        };

        if let Err(err) = db::insert_log(&self.state.pool, new_log).await {
            error!("Failed to insert log: {err:?}");
        }

        Ok(())
    }
}

impl Clone for MailApp {
    fn clone(&self) -> Self {
        Self {
            state: Arc::clone(&self.state),
            handle: self.handle.clone(),
            recipients: Vec::new(),
            buffer: Vec::new(),
        }
    }
}

impl Handler for MailApp {
    fn helo(&mut self, _ip: std::net::IpAddr, helo: &str) -> Response {
        info!("SMTP HELO from {helo}");
        response::OK
    }

    fn mail(&mut self, _ip: std::net::IpAddr, _domain: &str, _from: &str) -> Response {
        self.recipients.clear();
        self.buffer.clear();
        response::OK
    }

    fn rcpt(&mut self, to: &str) -> Response {
        if let Some(key) = Self::parse_forward_key(to) {
            self.recipients.push(key);
            response::OK
        } else {
            warn!("Rejecting RCPT {to}");
            response::NO_MAILBOX
        }
    }

    fn data_start(&mut self, _domain: &str, _from: &str, _is8bit: bool, to: &[String]) -> Response {
        if self.recipients.is_empty() {
            for addr in to {
                if let Some(key) = Self::parse_forward_key(addr) {
                    self.recipients.push(key);
                }
            }
        }
        response::OK
    }

    fn data(&mut self, buf: &[u8]) -> io::Result<()> {
        self.buffer.extend_from_slice(buf);
        Ok(())
    }

    fn data_end(&mut self) -> Response {
        if let Some(recipient) = self.recipients.first().cloned() {
            let payload = mem::take(&mut self.buffer);
            if let Err(err) = self
                .handle
                .block_on(self.process_message(&recipient, payload))
            {
                error!("Failed to process inbound email: {err:?}");
            }
        } else {
            warn!("No valid recipients captured for message");
        }
        self.recipients.clear();
        response::OK
    }
}

fn find_first_pdf(parsed: &ParsedMail<'_>) -> Result<Vec<u8>> {
    if parsed.subparts.is_empty() {
        if parsed.ctype.mimetype == "application/pdf" {
            return parsed
                .get_body_raw()
                .map_err(|e| anyhow!("Failed to read PDF body: {e}"));
        }
    }

    for part in &parsed.subparts {
        if part.ctype.mimetype == "application/pdf" {
            return part
                .get_body_raw()
                .map_err(|e| anyhow!("Failed to read PDF body: {e}"));
        }
        if let Ok(bytes) = find_first_pdf(part) {
            return Ok(bytes);
        }
    }

    Err(anyhow!("PDF attachment not found"))
}

fn write_temp_file(tmp_root: &str, bytes: &[u8]) -> Result<PathBuf> {
    let root = PathBuf::from(tmp_root);
    if !root.exists() {
        fs::create_dir_all(&root).context("Failed to create tmp dir")?;
    }
    let filename = format!("{}.pdf", Uuid::new_v4());
    let path = root.join(filename);
    fs::write(&path, bytes).context("Failed to write temp PDF")?;
    Ok(path)
}

fn parse_text(text: &str) -> Result<(NaiveDate, f64, f64, Option<f64>)> {
    let gross = capture_amount(text, REGEX_GROSS).context("Gross not found")?;
    let tips = capture_amount(text, REGEX_TIPS).context("Tips not found")?;
    let mileage = capture_optional_amount(text, REGEX_MILEAGE);
    let date = capture_date(text, REGEX_DATE).context("Date not found")?;
    Ok((date, gross, tips, mileage))
}

fn capture_amount(text: &str, pattern: &str) -> Option<f64> {
    let regex = Regex::new(pattern).ok()?;
    let caps = regex.captures(text)?;
    let raw = caps.get(1)?.as_str().replace(',', "");
    raw.parse().ok()
}

fn capture_optional_amount(text: &str, pattern: &str) -> Option<f64> {
    let regex = Regex::new(pattern).ok()?;
    regex
        .captures(text)
        .and_then(|caps| caps.get(1).map(|m| m.as_str().replace(',', "")))
        .and_then(|raw| raw.parse().ok())
}

fn capture_date(text: &str, pattern: &str) -> Option<NaiveDate> {
    let regex = Regex::new(pattern).ok()?;
    let caps = regex.captures(text)?;
    let raw = caps.get(1)?.as_str();
    NaiveDate::parse_from_str(raw, "%m/%d/%Y").ok()
}
