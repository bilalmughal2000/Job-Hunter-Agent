# Deployment (Phase 10) — where to deploy it for FREE

The whole stack (Node/Docker backend + PostgreSQL + Angular static frontend) can
run on **$0** and outside Pakistan (so Telegram delivers).

> Why off-region: Telegram is network-blocked in Pakistan, so a backend running
> locally there can't deliver Telegram messages. Any non-PK host fixes it. Email
> works either way. All hosts below are outside Pakistan.

## Free hosting options (2026)

| Piece                     | Free host                                       | Notes                                                                                                              |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Database**              | **Neon** (Postgres)                             | Best free DB — serverless, permanent, no card. `DATABASE_URL` string.                                              |
|                           | Supabase (Postgres)                             | Free, but pauses after ~1 week idle.                                                                               |
| **Backend** (Docker/Node) | **Render** web service                          | Free forever; sleeps after ~15 min idle (cold start ~a few s).                                                     |
|                           | Koyeb / Fly.io                                  | Free-ish; Fly needs a card. Docker-native.                                                                         |
| **Frontend** (static)     | **Vercel** / **Netlify** / **Cloudflare Pages** | Free static hosting, instant. Or Render static site.                                                               |
| **All-in-one VM**         | **Oracle Cloud Always Free**                    | 4 ARM cores / 24 GB RAM **free forever**; run `docker compose up`. Card for ID only, never charged on Always-Free. |

### ⭐ Recommended free stack (no credit card)

**Neon (DB) + Render (backend) + Vercel (frontend).** Neon avoids Render's
30-day Postgres expiry, and none of the three needs a card.

1. **Neon** → neon.tech → new project → copy the **connection string**
   (`postgresql://...`). That's your `DATABASE_URL`.
2. **Render** → New → **Blueprint** → connect this repo (`render.yaml`). On the
   `ajh-backend` service, either keep Render's free DB _or_ (recommended) delete
   the `ajh-postgres` block and set `DATABASE_URL` to your **Neon** string as a
   secret. Fill the other secrets (see Option A step 4).
3. **Frontend** → deploy `frontend/` to **Vercel** (framework: Angular, output
   `dist/frontend/browser`) and add a rewrite `/(api/.*)` → your Render backend
   URL — or just use the `ajh-frontend` static site from the blueprint.

That's a permanent, free, always-reachable deployment where Telegram works.

## Option A — Render Blueprint (one-click, free)

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

## Option B2 — Frontend on Vercel (free)

`frontend/vercel.json` is included. On **vercel.com** → New Project → import this
repo → set **Root Directory = `frontend`**. It builds to `dist/frontend/browser`
and proxies `/api/*` to the backend. **Edit the `destination` in
`frontend/vercel.json`** to your real backend URL, then deploy. Netlify /
Cloudflare Pages work the same way (build `npm run build`, publish
`dist/frontend/browser`, add the `/api` rewrite).

## Option C — Oracle Cloud Always Free VM (free forever, full stack)

The most generous free option: a VM that never expires, running the whole
`docker compose` stack (Telegram works because it's outside Pakistan).

1. **oracle.com/cloud/free** → create an **Always Free** account (card for
   identity only; Always-Free resources are never charged). Pick a home region
   outside Pakistan.
2. Create an **Always Free VM** (e.g. VM.Standard.A1.Flex, Ubuntu). Open ports
   80/443 in the security list.
3. On the VM:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
   git clone https://github.com/bilalmughal2000/Job-Hunter-Agent.git
   cd Job-Hunter-Agent && cp .env.example .env   # fill in keys
   sudo docker compose up -d --build
   ```
4. Visit `http://<vm-ip>:8080`. (Add a domain + HTTPS via Caddy/nginx when ready.)

## Option D — any Docker host / other VM

```bash
cp .env.example .env    # fill in DATABASE_URL + keys
docker compose up -d --build
# backend :3000 · frontend :8080 · postgres :5432
```

`docker compose` already runs the backend (which migrates on start), the
frontend (nginx proxying /api), Postgres and Redis. Put it on any VM outside
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
