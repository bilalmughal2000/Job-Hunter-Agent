# Resume & Application Agent (Phase 4)

Upload → text extraction (with OCR fallback) → structured profile extraction →
normalized persistence → profile API.

## Pipeline

```
POST /resume/upload (multipart) ─▶ ResumeService.upload
   │  multer: mime+ext allow-list, size cap, in-memory (no disk paths)
   ├─▶ Storage.save(buffer)                       ← uuid filename + sha256 checksum
   ├─▶ ResumeRepository.create                    ← status PENDING; first upload = primary
   └─▶ process():
        ├─ status → PARSING
        ├─ TextExtractionService.extract(buffer, format)
        │     PDF→pdf-parse · DOCX→mammoth · TXT/RTF→utf8
        │     too little text? → OCR (tesseract.js, PDF only) → else MANUAL_REVIEW
        ├─ PARSED | OCR_FALLBACK → StructuredExtractor.extract(text)
        │     └─ ResumeRepository.saveProfile (transaction: profile + all children,
        │         skills linked to the canonical Skill dictionary)
        └─ status → PARSED | OCR_FALLBACK | MANUAL_REVIEW | FAILED
```

## Pluggable extraction (`src/agents/resume-application/extraction/`)

Same pattern as the Phase 3 providers — narrow interfaces, swappable impls:

- **`TextExtractor`** (one per format): `PdfTextExtractor` (pdf-parse v2, lazy
  import), `DocxTextExtractor` (mammoth), `TxtTextExtractor` (utf8 + light RTF
  de-control).
- **`OcrExtractor`**: `TesseractOcrExtractor` (tesseract.js, WASM, lazy). Runs on
  image bytes. Scanned-PDF OCR needs page rasterization — a documented future
  enhancement; until then such files are flagged `MANUAL_REVIEW`.
- **`TextExtractionService`**: picks the extractor by format and applies the
  spec's fallback ladder → assigns a `ResumeParseStatus`.
- **`StructuredExtractor`**: `HeuristicStructuredExtractor` now — deterministic,
  dependency-free, offline, fully unit-tested. The AI-backed extractor (Phase 5)
  implements the same interface and swaps in via the container.

## Extracted fields (spec §Resume Processing)

Contact (name, email, phone, location), links (GitHub, LinkedIn, portfolio,
website), summary, skills (technical/soft classified), experience (company,
title, dates, current flag, highlights), projects (+ technologies), education
(degree, institution, dates, grade), certifications, languages (+ proficiency),
awards. Stored in `ResumeProfile` + normalized child tables; `ResumeSkill.skillId`
links to the canonical `Skill` dictionary when the name matches.

## Security (spec §Security → uploads)

- mime + extension allow-list (`pdf`, `docx`, `txt`, `rtf`); everything else 400s.
- size cap via `UPLOAD_MAX_BYTES` (default 5 MB); multer `LIMIT_FILE_SIZE` → 400.
- files stored under server-generated uuid names — no user-controlled paths.
- sha256 checksum recorded per file. (Virus scanning is a pluggable future hook.)

## Error handling (spec §Error Handling → resumes)

parse fails → OCR fallback → still nothing → `MANUAL_REVIEW`; unexpected errors
→ `FAILED` with the message on `Resume.parseError`. The row is always persisted,
so nothing is silently lost.

## Endpoints

| Method | Path                         | Notes                                                                                    |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------- |
| `POST` | `/api/v1/resume/upload`      | multipart field `resume`; `x-user-id` header selects user (else demo). 201 + `ResumeDTO` |
| `GET`  | `/api/v1/resume/:id`         | resume metadata + `hasProfile`                                                           |
| `GET`  | `/api/v1/resume/:id/profile` | full structured `ResumeProfileDTO` (404 if not yet extracted)                            |

## Verified end-to-end

Against live Postgres: uploaded a `.txt` resume → `PARSED`, marked primary; the
profile API returned name/email/GitHub, 6 skills (Communication classified SOFT,
rest TECHNICAL), experience with `isCurrent`, education, and languages with
proficiency. All 6 skills linked to the canonical dictionary. A `.exe` upload was
rejected with 400.
