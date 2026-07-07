# Search & Deduplication (Phase 3)

How the app finds jobs, normalizes them, removes duplicates, and persists them.

## Pipeline

```
POST /search ─▶ SearchService.run(userId, query)
                  │
                  ├─▶ SearchAgent.run(query)
                  │     ├─ ProviderRegistry.available(sources)   ← pluggable providers
                  │     ├─ Promise.allSettled(providers.search)  ← per-source error isolation
                  │     │     each provider: cache → rate-limit → retry → fetch+normalize
                  │     └─ DeduplicationAgent.dedupe(batch)       ← within-run dedup
                  │
                  ├─▶ JobService.persistNewJobs(unique)
                  │     ├─ DeduplicationAgent.isDuplicateOfExisting(job, dbKeys)  ← cross-run dedup
                  │     ├─ CompanyRepository.upsertByNameLocation
                  │     └─ JobRepository.createManySkipDuplicates (unique url safety net)
                  │
                  └─▶ SearchHistoryRepository.record(run)         ← always, even on failure
```

## Providers (`src/providers/`)

Every source implements `JobSourceProvider` (pluggable, constraint #5). Concrete
providers extend `BaseProvider`, which supplies the Search Strategy cross-cutting
concerns once — **caching, rate limiting, retry** — so a provider implements only
`fetch(query)`.

- **`SampleProvider`** — a fully-working provider over a fixed dataset. It makes
  the whole pipeline runnable and testable offline and is the reference impl.
- **`CompliantStubProvider`** — registered for every real source (LinkedIn,
  Indeed, Rozee, Mustakbil, Wellfound, Google Jobs, Greenhouse, Lever, company
  pages) but `isAvailable() === false` until a **ToS-compliant** integration +
  credentials are configured (constraint #8). The Search Agent skips unavailable
  providers cleanly. Enabling a source = subclass `BaseProvider` with a real
  `fetch()`, exactly like `SampleProvider`, and register it in
  `buildDefaultRegistry`.

## Deduplication Agent (`src/agents/dedup/`)

Pure and independently testable (constraint #6). Detects duplicates by, in order:

1. **Normalized URL** — protocol/`www`/query/hash/trailing-slash insensitive.
2. **Exact fingerprint** — `normalize(company)::normalize(title)::normalize(location)`,
   also persisted as `Job.dedupHash` (and by the seed, via the shared
   `jobFingerprint` helper — no logic drift).
3. **Fuzzy** — same company + **overlapping location** (`Lahore` ≈ `Lahore, Pakistan`)
   - Jaccard title similarity ≥ 0.8. Different cities never merge.

Cross-run dedup (`isDuplicateOfExisting`) compares a candidate against the URL +
`dedupHash` of every persisted job, so re-running a search inserts nothing new.

## Search strategy coverage (spec §Search Strategy)

| Feature                                                                   | Where                                                                      |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Keyword / exclude keywords / company / location / remote / multi-location | `SearchQuery`, provider `matches`, `jobFilterSchema`                       |
| Boolean search                                                            | `SearchQuery.boolean` (honored by real providers; sample uses keyword AND) |
| Pagination                                                                | `SearchQuery.page/pageSize`, `JobRepository.findMany`                      |
| Retry                                                                     | `withRetry` (exponential backoff) in `BaseProvider`                        |
| Rate limiting                                                             | `RateLimiter` per provider + a tighter per-route limiter on `POST /search` |
| Caching                                                                   | `Cache` interface + `InMemoryCache` (Redis-swappable) in `BaseProvider`    |

## Endpoints

| Method | Path               | Notes                                                                                                                                     |
| ------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/jobs`     | filters (keywords, location, company, remoteTypes, sources, minMatchScore, postedAfter), `sort` (NEWEST/HIGHEST_MATCH/SALARY), pagination |
| `GET`  | `/api/v1/jobs/:id` | 404 envelope when missing; 400 on non-uuid                                                                                                |
| `POST` | `/api/v1/search`   | runs the pipeline; `x-user-id` header selects the user (auth arrives in Phase 6, else falls back to the seeded demo user)                 |

## Verified end-to-end

Against live Postgres: a search for `angular` in Lahore found 4 raw results,
the Deduplication Agent collapsed the two Tkxel near-duplicates to 3, and 2 were
persisted (the third matched the seeded job's `dedupHash`) — `GET /jobs` then
returned exactly 3 jobs with no duplicate. A second identical search persisted 0.
