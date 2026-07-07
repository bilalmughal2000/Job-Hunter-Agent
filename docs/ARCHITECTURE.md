# Architecture

AI Job Hunter is a multi-user SaaS-style application built with **Clean
Architecture**: dependencies point inward, and each layer depends only on
abstractions of the layer beneath it.

## Monorepo layout

```
ai-job-hunter/
├── shared/        @ajh/shared — enums, DTOs, API contracts (backend + frontend)
├── backend/       Node + TypeScript + Express API
│   └── src/
│       ├── config/        env validation (zod), typed config
│       ├── utils/         logger (pino), errors, asyncHandler
│       ├── middlewares/   error handling, (auth/validation later)
│       ├── routes/        HTTP routing → controllers
│       ├── controllers/   thin HTTP adapters
│       ├── services/      business logic / orchestration
│       ├── repositories/  data access (Prisma) — the only DB layer
│       ├── models/        domain models & mappers
│       ├── agents/        pluggable AI agents (search, match, resume, …)
│       ├── providers/     one module per job source
│       ├── ai/            LLM client abstraction + prompts
│       ├── scheduler/     node-cron jobs
│       └── database/      Prisma client singleton + seed
├── frontend/      Angular dashboard (Phase 7)
├── docker/        Dockerfiles + nginx config
├── docs/          documentation
└── .github/       CI/CD workflows
```

## Layering / dependency rule

```
routes → controllers → services → repositories → database (Prisma)
                          │
                          ├── agents ──→ ai (LLM client)
                          └── providers (job sources)
```

- **Controllers** never touch the DB or agents directly — only services.
- **Services** depend on repository/agent _interfaces_, enabling DI + mocking.
- **Agents & providers** are pluggable and independently unit-testable.
- **shared** holds contracts consumed by both backend and frontend to prevent
  drift.

## Request / response contract

Every endpoint returns a typed envelope (`ApiResponse<T>` from `@ajh/shared`):

```jsonc
// success
{ "ok": true, "data": { /* ... */ } }
// error
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "…" } }
```

## Cross-cutting concerns

- **Config**: validated once at boot via zod (`src/config/env.ts`); invalid env
  fails fast.
- **Logging**: pino, pretty in dev / JSON in prod; HTTP logging via pino-http.
- **Errors**: typed `AppError` hierarchy → central error middleware.
- **Security**: helmet, CORS allow-list, global rate limiting (JWT, input
  validation, upload scanning added in later phases).

## Build order (phased)

| Phase | Scope                                                                          |
| ----- | ------------------------------------------------------------------------------ |
| 1 ✅  | Project setup: monorepo, tooling, lint, Docker + CI skeleton                   |
| 2 ✅  | Prisma schema (incl. resume/application tables), migrations, seed              |
| 3 ✅  | Search + Deduplication agents, pluggable source providers                      |
| 4 ✅  | Resume & Application agent: upload, parse/OCR, structured profile              |
| 5 ✅  | AI agents: matching, resume optimizer, cover letter, job analysis              |
| 6 ✅  | Application workflow state machine + approval gates + tracking APIs + JWT auth |
| 7 ✅  | Angular dashboard: pages, filters, board, analytics viz                        |
| 8     | Notifications: Telegram + email                                                |
| 9     | Analytics & reporting, career assistant outputs                                |
| 10    | Deployment: compose, deploy guides, CI/CD                                      |

## Compliance note

Job-source integrations must respect each platform's Terms of Service —
official APIs, RSS, or user-authorized exports are preferred over scraping.
Automated application submission is only marked "Submitted" after explicit
user review/approval where auto-submit is not officially supported.
