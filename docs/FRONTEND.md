# Frontend — Angular Dashboard (Phase 7)

Angular 19 (standalone components + Signals) with Angular Material, talking to
the REST API. Lives in `frontend/` as its own project (not an npm workspace) so
its Angular toolchain stays isolated from the backend.

## Run

```bash
cd frontend
npm install
npm start          # ng serve on http://localhost:4200, proxies /api → :3000
# or production build:
npm run build      # → dist/frontend/browser
```

`proxy.conf.json` forwards `/api` to the backend during `ng serve`. In Docker,
nginx serves the built bundle and proxies `/api` to the `backend` service.

## Architecture (`src/app/`)

- **core/**
  - `models.ts` — typed mirror of the API contracts (`ApiResponse<T>`, DTOs).
  - `api.service.ts` — one typed method per endpoint (jobs, search, resume, AI,
    applications, cover letters).
  - `auth.service.ts` — signal-based auth state; token/user persisted to
    `localStorage`.
  - `auth.interceptor.ts` — attaches the `Bearer` token; on 401 logs out +
    redirects to `/login`.
  - `auth.guard.ts` — protects the authenticated shell.
- **shell.component.ts** — Material toolbar + sidenav navigation + `<router-outlet>`.
- **pages/** (all lazy-loaded routes)
  - `login` — login + register tabs.
  - `dashboard` — overview metrics (jobs, applications, submitted, interviews,
    offers, rejections, success rate) computed from live data.
  - `jobs` — filterable/sortable job list + "search sources" trigger.
  - `job-detail` — the AI action hub: **Analyze · Match · Customize resume ·
    Cover letter · Track application**, each rendering its result.
  - `resume` — upload (PDF/DOCX/TXT) + structured profile view (skills,
    experience, education, links).
  - `applications` — the workflow **board**: columns per stage, advance-stage and
    set-status actions (server enforces the approval gate).
  - `analytics` — SVG bar charts: application funnel, top hiring companies,
    most-in-demand missing skills.
  - `settings` — account info + AI-backend / search-preference notes.

## Pages ↔ spec

Covers the spec's dashboard pages (Dashboard, Today's/Saved/Applied via the Jobs
& Applications views, Resume Manager, Cover Letters via job detail, Applications
board, Analytics, Settings), filters (keywords/location/remote/match/sort), and
the required visualizations (funnel, hiring trends, skill-gap charts).

## Verified

- `ng build --configuration production` — clean, all pages compile as lazy chunks.
- Frontend Docker image builds; nginx serves the SPA (deep routes fall back to
  `index.html`).
- **Full stack via `docker compose up`**: SPA served on :8080, nginx `/api`
  proxy reaches the backend, and register→JWT→authenticated `/applications` all
  succeed through the proxy.
