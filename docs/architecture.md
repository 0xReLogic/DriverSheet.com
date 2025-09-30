# DriverSheet MVP Architecture

## Overview
DriverSheet is a micro-SaaS that ingests gig platform payout emails, extracts earnings data from PDF attachments, and appends the values into a user-provided Google Sheet. The platform exposes a landing + dashboard web app (Next.js) and a Rust worker handling HTTP APIs, inbound SMTP, PDF parsing, and Google Sheets sync.

```
Gig Platform Email ➜ SMTP Listener (mailin) ➜ PDF Parser ➜ Google Sheets API
                                          ↘︎ SQLite logs (last 30 rows cached)

Next.js Web (landing, auth, dashboard) ➜ Axum API ➜ SQLite / Lemon updates
```

## Data Model

### `users`
| column          | type        | notes                                             |
|-----------------|-------------|---------------------------------------------------|
| id              | INTEGER PK  | Auto-increment identifier returned to frontend    |
| google_id       | TEXT UNIQUE | Google OAuth subject                             |
| email           | TEXT UNIQUE | Login email                                      |
| sheet_id        | TEXT        | Google Sheet identifier                          |
| forward_key     | TEXT UNIQUE | Random slug `user-<key>@driversheet.com`         |
| paid            | BOOLEAN     | Trial starts false, set true when Lemon webhook   |
| created         | DATETIME    | UTC timestamp                                     |

### `logs`
| column      | type        | notes                          |
|-------------|-------------|--------------------------------|
| id          | INTEGER PK  |                                |
| user_id     | INTEGER FK  | References `users.id`          |
| order_date  | DATE        | Parsed payout date             |
| gross       | REAL        | Parsed gross earnings          |
| tips        | REAL        | Parsed tip amount              |
| mileage     | REAL NULL   | Parsed mileage (miles)         |
| parsed_at   | DATETIME    | Insert timestamp               |

## HTTP API (Axum)

- `POST /api/users`
  - Request: `{ "googleId": string, "email": string, "sheetId": string | null }
  - Behavior: upsert by `google_id`, optionally update `sheet_id`, lazily generate `forward_key`.
  - Response: `{ id, googleId, email, sheetId, forwardAddress, paid, created }`

- `GET /api/users/:id/logs`
  - `:id` is the numeric `users.id` returned to the frontend.
  - Response: array sorted desc by `parsed_at`, limited to 30 rows.

- `POST /api/lemon-webhook`
  - Verifies HMAC SHA256 signature using `LEMON_WEBHOOK_SECRET` against raw JSON body.
  - On `invoice.paid`, marks the matching `users.email` as `paid=true`.

## Google Sheets Integration
- Service account JSON passed via `GOOGLE_SA_KEY` env var.
- Uses `google-sheets4` + `yup-oauth2` service account authenticator.
- Appends rows to range `Sheet1!A:D` (order: Date, Gross, Tips, Mileage).
- Writes use 10s timeout; errors logged but do not block insert.

## SMTP Ingestion Flow
1. Mail server listens on `BIND_MAIL` via the `mailin` crate.
2. For each message, select the first PDF attachment (`Content-Type: application/pdf`).
3. Persist to `./data/tmp/<uuid>.pdf`, parse text with `pdf_extract` (`pdftotext` dependency).
4. Apply regex captures:
   - `Gross\s*\$?([\d,]+\.\d{2})`
   - `Tips\s*\$?([\d,]+\.\d{2})`
   - `Date\s*(\d{1,2}/\d{1,2}/\d{4})`
   - `Mileage\s*([\d,]+\.?\d*)?\s*mi`
5. On success, append row in Google Sheet and `logs` table. On failure, log error and discard.
6. Delete temp file immediately after parsing; background task ensures tmp dir cleaned on boot.

## Next.js Web
- App Router (Next.js 13) with TypeScript, Tailwind CSS for styling.
- `next-auth` with Google provider and JWT sessions.
- Pages:
  - `/`: marketing hero, embed loom placeholder, CTA to `/auth`.
  - `/auth`: handles sign-in, collects Google Sheet URL, posts to backend, redirects to `/dash`.
  - `/dash`: shows forwarding address, recent logs (fetch via internal API), CSV download, upgrade link.
- Internal API routes (`/api/register`, `/api/logs`, `/api/download`) proxy authenticated requests to Rust API using stored `userId`.
- UI components: copy-to-clipboard button, data table.

## Environment Variables
```
DATABASE_URL=sqlite://data/data.db
GOOGLE_SA_KEY={... service account JSON ...}
LEMON_WEBHOOK_SECRET=whsec_...
BIND_MAIL=0.0.0.0:25
BIND_API=0.0.0.0:8080

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
API_BASE_URL=http://localhost:8080
LEMON_PAYMENT_URL=https://checkout.lemon.com/... (used in dashboard CTA)
```

## Background Tasking
- Tokio task running hourly to expire trials: `paid` stays false until Lemon event; front-end shows banner after 7 days.
- Scheduler checks `users.created` and toggles a `trial_expired` flag (computed on read) without mutating DB to minimize writes.

## Deployment Outline
- Single Docker image (Debian slim) containing Rust binary (`driversheet-worker`) and Nginx serving `/web` static export.
- `supervisord` manages `driversheet-worker` and `nginx` inside container.
- `docker-compose.yml` exposes ports `25`, `80`, `443`, mounts `./data`.
- systemd unit controls docker compose stack on VPS.
- TLS termination handled by external reverse proxy (Caddy/Nginx snippet provided).

## Assumptions & Constraints
- PDF extraction relies on `pdftotext` (Poppler). Dockerfile installs `poppler-utils`.
- Google Sheets tab name fixed to `Sheet1` for MVP.
- No admin UI; manual DB edits if needed.
- Cron/trial enforcement implemented as in-server tokio interval.
- Forwarding email is `user-{forward_key}@driversheet.com` where `forward_key` = 8 char base32 slug.
