# AI Agents (Phase 5)

Four AI agents, all wired to the Phase-4 resume profile. Every agent is an
**interface with two implementations** — a deterministic default that runs
offline (powers tests/CI and works with no API key) and an LLM-backed one. The
container picks based on `AI_PROVIDER`.

## Backends

| `AI_PROVIDER`         | Behaviour                                                   |
| --------------------- | ----------------------------------------------------------- |
| `heuristic` (default) | Deterministic agents. No key, offline.                      |
| `openai-compatible`   | LLM agents via `AiClient` → any OpenAI-compatible endpoint. |

The `AiClient` (`src/ai/`) is the only LLM surface. One `OpenAiCompatibleClient`
covers **OpenAI, Groq, Gemini (OpenAI-compat), OpenRouter, Together, local
Ollama** — differing only by `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY`. LLM JSON
output is fence-tolerant-parsed and **zod-validated** (`parseAiJson`), and LLM
agents fall back to the deterministic agent on any failure.

### Free, no-cost setup

Groq (simplest, no credit card):

```
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=gsk_...
AI_MODEL=llama-3.3-70b-versatile
```

Gemini: `AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`,
`AI_MODEL=gemini-2.0-flash`. Local Ollama: `AI_BASE_URL=http://localhost:11434/v1`,
any pulled model, `AI_API_KEY=ollama`.

## The agents (`src/agents/`)

| Agent                | Default (offline)                          | LLM                   | Output              |
| -------------------- | ------------------------------------------ | --------------------- | ------------------- |
| **Matching**         | skill-coverage + experience-gap scoring    | `LlmMatchingAgent`    | `MatchResult`       |
| **Job Analysis**     | lexicon skill extraction + text heuristics | `LlmJobAnalysisAgent` | `JobAnalysis`       |
| **Resume Optimizer** | truthful reorder/emphasis                  | `LlmResumeOptimizer`  | `CustomizedResume`  |
| **Cover Letter**     | professional template                      | `LlmCoverLetterAgent` | `CoverLetterResult` |

### Truthfulness (spec constraint #7)

The Resume Optimizer **never invents** skills/experience. The heuristic only
reorders existing content; the LLM variant enforces it twice — a strict system
prompt **and** a post-filter that drops any highlighted skill/keyword the
candidate does not actually list (falling back to the heuristic on bad output).

## Persistence

- **Matching** → `MatchResult` (unique per resume-profile × job) + refreshes the
  `Job.matchScore`/`missingSkills` snapshot and sets status `MATCHED`.
- **Job Analysis** → `Job.aiSummary` + `JobSkill` rows (REQUIRED/PREFERRED),
  skills linked to the canonical `Skill` dictionary; status `ANALYZED`.
- **Optimizer** → `ResumeVersion` (auto-incrementing `version` per base-resume ×
  job; `content` is the `CustomizedResume` JSON + `atsScore`).
- **Cover Letter** → `CoverLetter` (linked to job + resume version).

## Endpoints

| Method | Path                             | Agent                                             |
| ------ | -------------------------------- | ------------------------------------------------- |
| `POST` | `/api/v1/jobs/:id/analyze`       | Job Analysis                                      |
| `POST` | `/api/v1/jobs/:id/match`         | Matching (body: `{ resumeId? }`)                  |
| `POST` | `/api/v1/resume/customize`       | Resume Optimizer (body: `{ jobId, resumeId? }`)   |
| `GET`  | `/api/v1/resume/versions/:jobId` | list versions                                     |
| `POST` | `/api/v1/cover-letter`           | Cover Letter (body: `{ jobId, resumeVersionId }`) |
| `PUT`  | `/api/v1/cover-letter/:id`       | edit (body: `{ content }`)                        |

All AI routes carry a tighter per-route rate limit. `x-user-id` selects the user
(auth arrives in Phase 6; else the seeded demo user).

## Verified end-to-end

Against live Postgres with the heuristic backend: analyze → `requiredSkills`
persisted as `JobSkill`s + `aiSummary`; match → score 80, strong skills matched,
missing "Signals", persisted to `MatchResult` + Job snapshot; customize → ATS 75
`ResumeVersion`; cover letter → personalized to company + role, persisted.
