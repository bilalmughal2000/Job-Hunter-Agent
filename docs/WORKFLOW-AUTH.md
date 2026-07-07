# Application Workflow & Auth (Phase 6)

## Authentication — free, no paid service

- **Password hashing**: Node's built-in `crypto.scrypt` (`src/utils/password.ts`) —
  zero dependencies, salted, `timingSafeEqual` compare. Format `scrypt$salt$hash`.
- **Tokens**: `jsonwebtoken` (open-source) signed with `JWT_SECRET`
  (`src/utils/jwt.ts`).
- **Endpoints**: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
  (both rate-limited), `GET /api/v1/auth/me` (requires a token).
- **Middleware** (`src/middlewares/auth.middleware.ts`): `attachUser` populates
  `req.user` from a Bearer token when present (ignores invalid tokens);
  `requireAuth` rejects with 401 when absent/invalid; `requireAdmin` guards
  admin-only routes.
- Pre-auth endpoints (jobs/search/resume/AI) resolve the acting user as
  **JWT user → `x-user-id` header → seeded demo user**, so they keep working
  during development while honoring real auth once a token is sent.

## Workflow state machine (`src/services/workflow.ts`)

Stages advance **linearly**, which structurally enforces the approval gate —
`SUBMITTED` is unreachable without first passing `USER_APPROVED`:

```
JOB_FOUND → RESUME_MATCHED → RESUME_CUSTOMIZED → COVER_LETTER_GENERATED
  → PACKAGE_PREPARED → READY_FOR_REVIEW → USER_APPROVED → SUBMITTED → TRACKING
```

Guards enforced by `ApplicationService`:

- Advancing into **PACKAGE_PREPARED** requires an attached resume version **and**
  cover letter.
- Reaching the **SUBMITTED** stage auto-sets tracked status `SUBMITTED` + the
  applied date (approval already given by linear progression).

`ApplicationStatus` is tracked independently with its own validated transition
map (`SAVED → READY_FOR_REVIEW → SUBMITTED → UNDER_REVIEW → …`; `WITHDRAWN`/
`REJECTED` terminal). **Auto-Apply policy (constraint #9):** status can only be
set to `SUBMITTED` once the application is at/after `USER_APPROVED` — the app
never marks itself submitted without explicit user approval.

Every stage/status change appends an append-only `ApplicationEvent` (audit trail).

## Endpoints (all require auth)

| Method  | Path                               | Purpose                                                                                                      |
| ------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET`   | `/api/v1/applications`             | list the user's applications (filter by status)                                                              |
| `POST`  | `/api/v1/applications`             | create (`{ jobId, resumeVersionId?, coverLetterId? }`)                                                       |
| `GET`   | `/api/v1/applications/:id`         | full **application package** (customized resume, cover letter, portfolio/GitHub/LinkedIn, events, nextStage) |
| `PATCH` | `/api/v1/applications/:id`         | update recruiter/notes/dates/attachments                                                                     |
| `POST`  | `/api/v1/applications/:id/advance` | advance to the next stage                                                                                    |
| `PUT`   | `/api/v1/applications/:id/status`  | set tracked status (validated)                                                                               |

Applications are strictly owner-scoped — another user's id returns 404.

## Verified end-to-end

Against live Postgres: registered a user (scrypt + JWT) → `/auth/me` ok →
`/applications` returns 401 without a token → created an application → **marking
SUBMITTED before approval was rejected** → advanced through every stage; at the
SUBMITTED stage status auto-became `SUBMITTED` with an applied date; reached
`TRACKING` with 9 audit events; advancing past the end was rejected. Attempting
PACKAGE_PREPARED without an attached package was also rejected.
