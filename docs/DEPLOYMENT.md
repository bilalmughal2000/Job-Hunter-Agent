# Deployment (Phase 10) — run outside Pakistan so Telegram works

The app is Docker-ready and ships a **Render Blueprint** (`render.yaml`) that
stands up Postgres + the backend + the frontend on Render's US infrastructure —
where Telegram is reachable.

> Why: Telegram is network-blocked in Pakistan, so a backend running locally
> there can't deliver Telegram messages. Hosting the backend on Render (or any
> non-PK server) fixes it. Email works either way.

## Option A — Render Blueprint (recommended, free)

1. Push this repo to GitHub (already done).
2. In **Render** → **New → Blueprint** → connect the repo → it reads `render.yaml`
   and previews: a Postgres DB, `ajh-backend` (Docker), `ajh-frontend` (static).
3. Click **Apply**. Render creates all three. `JWT_SECRET` is auto-generated;
   `DATABASE_URL` and `CORS_ORIGIN` are wired automatically.
4. Fill the **secret** env vars (marked `sync: false`) on the **ajh-backend**
   service → _Environment_:
   - `AI_API_KEY` = your Groq key
   - `JSEARCH_API_KEY` = your RapidAPI JSearch key
   - `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID` = your bot token + chat id
   - (optional) `EMAIL_*`
     Save → the service redeploys.
5. The backend runs `prisma migrate deploy` on boot (schema is created
   automatically). Health check: `GET /api/v1/health`.
6. **Frontend URL check:** the blueprint proxies `/api/*` to
   `https://ajh-backend.onrender.com`. If Render suffixes your backend name
   (e.g. `ajh-backend-xyz.onrender.com`), update the rewrite `destination` in
   `render.yaml` (or the frontend service's _Redirects/Rewrites_) to match, then
   redeploy the frontend.

Open the frontend URL → register → search → the **backend on Render can now
deliver Telegram** (and email). Verify: Notifications → _Send test_ → it arrives
in Telegram.

### Free-tier notes

- Render free web services **sleep after ~15 min idle** and cold-start on the
  next request (a few seconds). Fine for personal use.
- The free Postgres instance has a limited lifetime — upgrade or recreate as
  needed.

## Option B — Railway

1. **railway.com** → New Project → Deploy from GitHub repo.
2. Add a **PostgreSQL** plugin (sets `DATABASE_URL`).
3. Add a service from the repo using `docker/backend.Dockerfile`; set the same
   env vars as above. Railway runs the image's start command (migrate + serve).
4. Deploy the frontend as a separate static service (build
   `cd frontend && npm ci && npm run build`, serve `frontend/dist/frontend/browser`)
   with an `/api` rewrite to the backend URL.

## Option C — any Docker host / GCP VM

```bash
cp .env.example .env    # fill in DATABASE_URL + keys
docker compose up -d --build
# backend :3000 · frontend :8080 · postgres :5432
```

`docker compose` already runs the backend (which migrates on start), the
frontend (nginx proxying /api), Postgres and Redis. Put it on a VM outside
Pakistan and point a domain at :8080.

## Local development

```bash
docker compose up -d postgres            # database
cd backend && npm run dev                # API on :3000 (migrate + tsx watch)
cd frontend && npm start                 # app on :4200 (proxies /api → :3000)
```

## What runs on deploy

- **Migrations:** `prisma migrate deploy` runs automatically on backend start
  (Docker `CMD`), so the managed database is provisioned to the current schema.
- **Seeding is optional** in production — users self-register, and the skill
  dictionary/job sources are created on demand. To seed a demo dataset:
  `npm run prisma:seed --workspace=@ajh/backend` against the deployed DB.
- **CI/CD:** `.github/workflows/ci.yml` runs lint, typecheck, tests, builds, and
  Docker image builds on every push.
