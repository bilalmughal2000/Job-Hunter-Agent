# Database (Phase 2)

PostgreSQL via Prisma. Schema: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).
Enums are kept 1:1 with [`shared/src/enums.ts`](../shared/src/enums.ts) so the
API and DB never drift. Designed multi-user from day one.

## Entity groups

**Core**
`User`, `SearchPreference` (1:1), `Company`, `JobSource` (configured source +
runtime cursor), `Skill` (canonical dictionary), `Job`, `JobSkill`
(required/preferred, join), `SavedJob`, `SearchHistory`, `WeeklyReport`,
`Notification`.

**Resume & Application**
`Resume` (raw upload + parse status) → `ResumeProfile` (1:1 structured data) →
normalized children: `ResumeSkill`, `ResumeExperience`, `ResumeProject`,
`ResumeEducation`, `ResumeCertification`, `ResumeLanguage`, `ResumeAward`.
`MatchResult` (per resume-profile × job), `ResumeVersion` (customized per job),
`CoverLetter`, `Application`, `ApplicationEvent` (status/stage history).

## Key relations

```
User 1─┬─* Resume ─1─1 ResumeProfile ─1─* {Skill,Experience,Project,Education,Certification,Language,Award}
       ├─* ResumeVersion ─*─1 Job          (many versions per job — the `version` field)
       ├─* CoverLetter   ─*─1 ResumeVersion
       ├─* Application    (unique per user+job)
       │      ├─?─1 ResumeVersion
       │      ├─?─1 CoverLetter
       │      └─*   ApplicationEvent        (append-only audit trail)
       ├─* MatchResult   ─*─1 ResumeProfile, Job   (unique per profile+job)
       ├─1─1 SearchPreference
       └─* SavedJob / SearchHistory / WeeklyReport / Notification

Company 1─* Job ─*─* Skill  (via JobSkill)
```

## Design decisions

- **Two match snapshots.** `Job.matchScore` / `Job.missingSkills` are the
  denormalized "primary user" snapshot the spec's Job Model lists; the
  normalized, per-user truth is `MatchResult` (`@@unique([resumeProfileId, jobId])`).
- **Dedup support.** `Job` has `@@unique([url])`, `@@unique([source, externalId])`,
  and an indexed `dedupHash` for the Phase 3 similarity pass.
- **Cascades.** Deleting a `User` cascades to their resumes/versions/applications;
  deleting a `Resume` cascades to its profile and all child rows. `Job.companyId`
  and application FKs use `SetNull` so history survives referenced-row deletion.
- **Audit trail.** Workflow transitions are recorded in `ApplicationEvent`
  rather than mutating a single status field (Phase 6 state machine).

## Migrations & seed

```bash
docker compose up -d postgres          # local Postgres on :5432
cd backend
npx prisma migrate dev                  # apply migrations + regenerate client
npx prisma db seed                      # idempotent seed (upserts)
npx prisma studio                       # browse data
```

- Migrations live in `backend/prisma/migrations/` and are committed.
- `DATABASE_URL` is read from `backend/.env` (loaded via `prisma.config.ts`).
- The seed creates 10 job sources, 30 skills, a demo admin user with search
  preferences, and one sample company + job.

Initial migration: `20260707143611_init` — 26 tables, verified applied + seeded.
