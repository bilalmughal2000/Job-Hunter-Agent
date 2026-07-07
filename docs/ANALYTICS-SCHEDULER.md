# Analytics, Reports, Career Assistant & Scheduler (Phase 9)

## Analytics (`GET /api/v1/analytics`, auth)

Server-computed aggregates from the DB (Analytics Agent):

- `totalJobs`, `jobsBySource`
- `topCompanies`, `mostDemandedSkills` (from `JobSkill`)
- `averageSalary` (best-effort parse of free-text salaries)
- `hiringTrend` — new jobs/day for the last 14 days
- `applications` — totals by status + submitted/interviews/offers/rejections + success rate
- `skillGaps` — missing skills tallied across the user's matches

Pure helpers (`src/agents/analytics/compute.ts`) — `parseSalaryToNumber`,
`averageSalaryLabel`, `bucketByDay`, `successRate`, `tallyTop` — are unit-tested.

## Skills (`GET /api/v1/skills`, auth)

The canonical skill dictionary ranked by demand (JobSkill count).

## Weekly reports (`GET /api/v1/reports`, `POST /api/v1/reports`, auth)

`POST` generates + upserts this week's `WeeklyReport` (top companies, demanded
skills, avg salary, new jobs, applications, interview probability, skill gaps);
`GET` lists the last 12. The scheduler generates these weekly.

## AI Career Assistant (`GET /api/v1/jobs/:id/assistant`, auth)

For a job × the user's resume (spec §AI Career Assistant):
interview probability, ATS score, resume suggestions, missing skills, curated
**learning resources** per missing skill, expected salary range, likely
**interview questions**, a **company summary**, and **similar jobs**.
Heuristic by default; LLM (`LlmCareerAssistant`) when an AI key is set, with a
truthfulness-preserving heuristic fallback.

## Scheduler (node-cron)

`SchedulerService` (spec §Scheduler) runs:

- **every 4 hours** (`SEARCH_CRON`) — per-user search from their `SearchPreference`
  (fallback: Angular/Frontend in Lahore), notifying when new jobs are found;
- **weekly** (`WEEKLY_REPORT_CRON`, Mon 08:00) — generate weekly reports + notify.

**Disabled unless `ENABLE_SCHEDULER=true`** so it never fires in dev/CI/tests or
across scaled instances by accident. Manual trigger (admin only):
`POST /api/v1/scheduler/run/:task` where task ∈ `search | weekly`.

```
ENABLE_SCHEDULER=true
SEARCH_CRON=0 */4 * * *
WEEKLY_REPORT_CRON=0 8 * * 1
```

## Verified end-to-end

Against live Postgres: `/analytics` returned 58 jobs, avg salary, top companies,
a 14-day trend; `/skills` ranked by demand; `POST /reports` produced a weekly
report; `/jobs/:id/assistant` returned interview questions, learning resources,
similar jobs and a company summary; the scheduler trigger correctly requires
admin. LLM job-analysis now restricts skills to concrete technologies.
