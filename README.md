# 🎯 AI Job Hunter Agent

An AI-powered job hunter that automatically finds Frontend Angular jobs in
Lahore, Pakistan, scores them against your resume, customizes an ATS-friendly
resume and cover letter per job, manages the full application workflow with
approval gates, tracks status end-to-end, and sends Telegram + email
notifications — with an Angular analytics dashboard.

> Built as a real SaaS product: clean architecture, DI, repository/service
> layers, strict TypeScript, logging, testing, Docker, and CI/CD.

## Tech stack

| Area          | Choice                                                                |
| ------------- | --------------------------------------------------------------------- |
| Backend       | Node 20 · TypeScript (strict) · Express · Prisma · PostgreSQL · Redis |
| AI            | OpenAI API (Responses / Agents SDK)                                   |
| Resume        | pdf-parse / mammoth + Tesseract OCR fallback                          |
| Automation    | Playwright (ToS-compliant only)                                       |
| Scheduler     | node-cron                                                             |
| Notifications | Telegram Bot · Nodemailer                                             |
| Frontend      | Angular (latest) · Angular Material · RxJS · Signals                  |
| Tooling       | ESLint 9 (flat) · Prettier · Vitest · Docker Compose · GitHub Actions |

## Monorepo layout

```
shared/    @ajh/shared — enums & API contracts shared by backend + frontend
backend/   Express API (clean architecture — see docs/ARCHITECTURE.md)
frontend/  Angular dashboard (Phase 7)
docker/    Dockerfiles + nginx
docs/      documentation
```

## Prerequisites

- Node.js `>= 20.11` (an `.nvmrc` pins the dev version)
- npm `>= 10`
- Docker + Docker Compose (for the full stack)

## Getting started (local, backend)

```bash
git clone <repo> && cd ai-job-hunter
cp .env.example .env          # fill in secrets as phases require them
npm install                   # installs all workspaces
npm run build --workspace=shared
npm run dev                   # backend on http://localhost:3000/api/v1

curl http://localhost:3000/api/v1/health
# { "ok": true, "data": { "status": "ok", ... } }
```

## Full stack via Docker

```bash
cp .env.example .env
docker compose up --build
# backend  → http://localhost:3000/api/v1
# frontend → http://localhost:8080   (static shell until Phase 7)
# postgres → localhost:5432 · redis → localhost:6379
```

## Scripts (run from repo root)

| Command                           | Description                   |
| --------------------------------- | ----------------------------- |
| `npm run dev`                     | Run the backend in watch mode |
| `npm run build`                   | Build shared + backend        |
| `npm run lint`                    | ESLint across workspaces      |
| `npm run format` / `format:check` | Prettier write / check        |
| `npm run typecheck`               | Type-check without emit       |
| `npm test`                        | Run tests                     |
| `npm run test:coverage`           | Tests + coverage report       |

## Build roadmap

The project is built **incrementally, one phase at a time**, each ending in a
review gate. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full
table. **Phases 1 (project setup) and 2 (database) are complete** — see
[`docs/DATABASE.md`](docs/DATABASE.md) for the schema.

## Compliance & ethics

- Respects every platform's Terms of Service; prefers official APIs / exports.
- **Never** fabricates skills, experience, certifications, or education.
- Applications are only marked "Submitted" after explicit user approval where
  auto-submit is not officially supported.

## License

Private / unpublished (Phase 1).
