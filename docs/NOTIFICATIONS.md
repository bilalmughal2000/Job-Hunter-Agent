# Notifications (Phase 8)

Multi-channel alerts (spec §Notification Agent), all free, defaulting to a
zero-config in-app feed.

## Channels (`src/agents/notification/`)

Pluggable `NotificationChannelSender`s (independently testable, constraint #6):

- **`InAppChannel`** — always configured; "delivery" is persistence, so every
  notification is recorded and visible in the app even with nothing else set up.
- **`TelegramChannel`** — Telegram Bot API via `fetch` (no SDK). Configured when
  `TELEGRAM_TOKEN` + `TELEGRAM_CHAT_ID` are set. Free: create a bot with
  @BotFather, get your chat id.
- **`EmailChannel`** — Nodemailer over any SMTP (e.g. a Gmail app password).
  Configured when `EMAIL_HOST` + `EMAIL_USER` + `EMAIL_PASSWORD` are set; sends
  to the user's own email. Transport is created lazily.

`NotificationService.notify(userId, message)` fans out to every **configured**
channel, records each attempt in the `Notification` table (`SENT`/`FAILED` +
error), and returns a per-channel result. Unconfigured channels are skipped.

## Templates (`templates.ts`)

`newJobAlert(job)` renders the spec's format:

```
🔥 New Job
Frontend Angular Developer
Tkxel
Lahore
95% Match
Missing Skill: Azure
Apply: <Job URL>
```

`testNotification()` — a simple manual/test message.

## Endpoints (auth required)

| Method | Path                    | Purpose                                                                          |
| ------ | ----------------------- | -------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/notifications` | the user's notification feed (paginated)                                         |
| `POST` | `/api/v1/notifications` | send one: `{ jobId }` → new-job alert; `{ subject, body }` → custom; `{}` → test |

(The spec's `POST /notify` maps to `POST /notifications`.)

## Enabling Telegram / email (free)

In `.env` / `backend/.env`:

```
# Telegram
TELEGRAM_TOKEN=123456:ABC...      # from @BotFather
TELEGRAM_CHAT_ID=your_chat_id     # from @userinfobot

# Email (e.g. Gmail app password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=you@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM="AI Job Hunter <you@gmail.com>"
```

Restart the backend; those channels then deliver alongside the in-app feed.

## Verified end-to-end

Against live Postgres with no external channels: a test notification and a
real job alert (Publicis Sapient "Java full stack Developer (Angular & AWS)")
both delivered `IN_APP / SENT` in the spec's format and appear in `GET
/notifications`. Telegram/email delivery + FAILED recording are covered by unit
tests (mocked transport).
