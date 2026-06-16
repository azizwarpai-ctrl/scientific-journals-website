# Audio Abstracts — Phase 0 Analysis

> **Initiative**: B (FLAGSHIP) — Per-article audio: manager uploads, branded play button
> **Branch**: `claude/compassionate-bell-ab2fU`
> **Date**: 2026-06-05
> **Phase**: 0 (inventory + design decisions; no code emitted)

This document maps the **current** state of the codebase relative to introducing a per-article audio asset that managers upload through the admin dashboard and that public visitors play from the article card and the article page. Implementation tasks (B1–B4) must not begin until the **Design Decisions** below are resolved with the human reviewer.

Authoritative repo conventions (verified, do not contradict):

- OJS database is **READ-ONLY** (`CLAUDE.md`, OJS Integration section; `src/features/ojs/server/ojs-client.ts:1-112` exposes only `SELECT`-style helpers).
- Manager-uploaded data lives on digitopub side (Prisma/MySQL + chosen file storage).
- `app/robots.ts:11` disallows `/api/`; keep intact.
- `/api/pdf-proxy` viewer (`app/api/pdf-proxy/route.ts`) is the precedent for streaming a binary asset through a Next route; keep intact.
- `EMIT_SCHOLAR_CITATION_META=false` default; not affected by this initiative.
- All admin mutations go through `requireAdmin` (`src/lib/auth-middleware.ts:25-38`).

---

## 1. Inventory

### B-INV-1 — Does OJS already hold per-article audio?

**Short answer**: No digitopub code reads any OJS audio today. Whether OJS rows actually hold audio is an operator question, not a code one.

Evidence (every fact backed by a real file/line):

- The galley-fetch SQL in both apex read paths only pulls galleys and filters them by `label like '%pdf%'`:
  - `src/features/journals/server/article-detail-service.ts:282-310` — `publication_galleys` join, then `galleys.find(g => g.label?.toLowerCase().includes('pdf'))`.
  - `src/features/journals/server/ojs-article-utils.ts:167-232` — identical pattern for the current-issue listing.
- The OJS-galley URL builder (`src/features/journals/server/ojs-galley-utils.ts:31-57`) is content-type-agnostic — it would work for any galley file kind — but no caller ever passes a non-PDF galley through it.
- The OJS read client (`src/features/ojs/server/ojs-client.ts:59-98`) is a generic `ojsQuery<T>(sql, params)`; there is no audio-specific helper.
- Searching the entire repo: no `audio`/`Audio`/`AUDIO` / `mp3` / `wav` / `audio_abstract` symbols, columns, or types exist in `src/`, `app/`, `prisma/schema.prisma`, or `prisma/migrations/`. The only repo occurrences of "audio" are this analysis doc.
- The string "iJMP" appears (e.g. `tests/unit/pdf-proxy-bridge-url.test.ts:100`) only as a **journal slug** used in fixtures. The **iJMP theme**'s "AUDIO ABSTRACTS" UI is theme-side rendering and does not, by itself, prove what is or isn't stored in OJS for our journals.

What an OJS audio row could look like, technically, in the OJS 3.x schema we already read:

- A `publication_galleys` row whose `label` is something like `"Audio"` or `"MP3"` and whose linked `submission_files` row carries an `audio/mpeg`-style MIME type. This is the iJMP theme's most likely model.
- Alternatively, a "supplementary file" — a `submission_files` row with `file_stage = SUBMISSION_FILE_PROOF (=10)` or another stage, not linked to a galley.

Either is technically readable through the existing `ojsQuery` channel without any OJS write. We **cannot** verify which (if any) exists for digitopub's twelve journals from this environment — it is a one-shot read-only diagnostic query on the OJS DB, to be run by the operator. See **B-D1** below for how that answer steers the design.

### B-INV-2 — Attach point for `audioUrl` on the article DTOs

The PR that added `pdfDownloadUrl` to the two article DTOs is the exact precedent for an `audioUrl` field. Both attach points:

| DTO | File | Field added at | Server return populated at |
|---|---|---|---|
| `ArticleDetail` (article page) | `src/features/journals/types/article-detail-types.ts:38-45` | line 45 (`pdfDownloadUrl`) | `src/features/journals/server/article-detail-service.ts:315-325` (built), `:401` (returned) |
| `CurrentIssueArticle` (cards/listing) | `src/features/journals/types/current-issue-types.ts:18-35` | line 31 (`pdfDownloadUrl`) | `src/features/journals/server/ojs-article-utils.ts:234-241` (built), `:256` (returned) |

The same two places — and only those two places — would also receive `audioUrl: string | null`.

### B-INV-3 — Where the "play button" must render

Two placements, both already host the "View PDF" / "Download" actions next to which audio belongs:

1. **Article card** (current issue and archive issue lists) — footer of the card:
   - `app/journals/[id]/components/article-item.tsx:164-190` — "Action Footer" with the `View Article` link and the `ModalPdfViewer triggerStyle="card"`.
   - Rendered by `current-issue-section.tsx`, `archive-issue-detail.tsx` (both in `app/journals/[id]/components/`).

2. **Article page sidebar** — "Full Text" card:
   - `app/journals/[id]/articles/[publicationId]/components/article-sidebar.tsx:42-71` — the `<FileText />` "Full Text" card that holds the `ModalPdfViewer triggerStyle="sidebar"` and "Share article" button.
   - The page itself is `app/journals/[id]/articles/[publicationId]/page.tsx`.

The `ModalPdfViewer` (`app/journals/[id]/articles/[publicationId]/components/modal-pdf-viewer.tsx:34-37`) already exposes a `triggerStyle: "sidebar" | "card"` knob — the audio player should ship with the same two visual modes so the brand looks coherent.

### B-INV-4 — Admin upload precedent and file storage

**No multipart upload precedent in the codebase.** Verified:

- Grep for `formData|FormData|multipart|upload` in `src/` only returns:
  - `src/features/email-templates/components/new-template-form.tsx` — `formData` is a React Hook Form local var, not a `FormData`/file upload.
  - `src/features/email-templates/stores/new-template-store.ts` — same.
  - `src/features/ojs/utils/ojs-asset-url.ts`, `src/features/journals/server/editorial-board-service.ts` — references to OJS `uploadName` (read), not uploads.
- No admin Hono route accepts a binary body. The mutating admin routes confirmed:
  - `src/features/journals/server/route.ts:792 / :832 / :871` — JSON-only `journalCreateSchema` / `journalUpdateSchema`.
  - `src/features/messages/server/route.ts`, `src/features/email-templates/server/route.ts`, `src/features/billing/server/route.ts` — all `zValidator("json", …)` only.
- `Submission.manuscript_file_url` (`prisma/schema.prisma:83`) and `Submission.supplementary_files` (`:84`) are nullable URL/JSON columns that were never wired to a working upload route — they are legacy artifacts of an earlier import.

**Storage candidates** present in the environment:

- `.env.example:27-29` declares `MAX_FILE_SIZE_MB="50"`, `ALLOWED_FILE_TYPES="pdf,doc,docx,txt,jpg,png"`, `UPLOAD_DIR="./uploads"`. The `./uploads` path is **not** present in the repo (`ls uploads/` → exit 2), nor in `.gitignore`'s tracked tree, nor in `next.config.mjs`. The variable is set but no code reads it.
- `next.config.mjs` enables remote image hosts (`submitmanager.com`, `journals.digitopub.com`) but nothing for object storage.
- No S3 / R2 / GCS SDK is installed (no `@aws-sdk/*`, no `@google-cloud/*`, no `minio` in `package.json` — quick `grep` confirms).

**Implication**: there is no storage today. Picking one is part of **B-D2** below and requires the operator to confirm the hosting model (does the production host give us a persistent volume that survives deploys?).

---

## 2. Design Decisions (require human approval before B1 starts)

For each: the options, the trade-offs, the recommendation. Implementation does not start until the reviewer signs each off in this doc.

### B-D1 — Source of audio (OJS read vs digitopub upload vs both)

**Requirement (from the brief)**: "manager CAN upload via the dashboard." So digitopub-side upload is non-negotiable.

The open question is whether we **also** read whatever audio may already live in OJS.

| Option | What it does | Pros | Cons |
|---|---|---|---|
| **A. digitopub-upload only (recommended)** | Manager uploads from `/admin`; `audioUrl` is populated from the digitopub-side `ArticleAudio` table only. OJS is not consulted for audio. | One mental model. No risk of subtle "where did the audio come from?" bugs. Manager controls the asset end-to-end. Survives any future OJS theme/plugin change. | If OJS already has audio for some articles, the operator re-uploads them via the dashboard (one-time effort, bounded). |
| B. read-then-upload-fallback | First check for an OJS galley with audio MIME / `Audio` label; if absent, fall back to digitopub upload. | Re-uses any audio already in OJS. | Two code paths and two attach-point branches in `article-detail-service.ts` / `ojs-article-utils.ts`; "which one wins when both exist?" tie-break needs to be specified; debugging surface area roughly doubles. |
| C. read-only (no upload) | Skip the upload feature, surface OJS audio only. | Smallest code change. | **Violates the explicit requirement** ("managers upload via the dashboard"). Rejected. |

**Recommendation: A**. If, after the operator runs the one-shot OJS diagnostic query (count of `publication_galleys` rows with audio MIME / `Audio` label across our twelve journals), the count is significant, we can revisit and add B as a separate initiative — keeping initiatives small per the working agreement. Mention but do not block on this finding.

> **DECISION (human)**: ☐ A   ☐ B   ☐ C
> **Notes**:

### B-D2 — Storage location for manager-uploaded audio

| Option | What it does | Pros | Cons |
|---|---|---|---|
| **A. Object storage (S3-compatible: AWS S3, Cloudflare R2, MinIO) (recommended)** | Files live in a bucket; digitopub stores object key + metadata in `ArticleAudio` table. | Persistent across deploys. Backups + lifecycle rules built in. Horizontally scalable. Range requests (B-D3) supported natively. No filesystem coupling to the runtime host. | Adds one external dependency + creds (`STORAGE_*` env vars). Small per-GB cost. New SDK to install. |
| B. Host filesystem at `UPLOAD_DIR` (`.env.example:29` already names it) | Files in `./uploads/audio/...`; digitopub reads from disk. | Zero new dependency. Re-uses existing env var. | **Volatile on serverless hosts** (Vercel, Cloud Run — fs wiped on cold start). Needs an explicit persistent volume on the host (operator-confirmed, NOT documented anywhere in this repo). No backup story. Doesn't scale across replicas without shared storage. |
| C. OJS `files_dir` (write into OJS area) | Files placed where OJS stores them. | Co-located with the rest of the article assets. | **Hard-forbidden by the constitution** ("OJS database is READ-ONLY", `CLAUDE.md`; the `audit_ojs_writes` audit only exempts the ORCID-backfill path). The OJS files area is part of the same trust boundary. **Rejected.** |

**Recommendation: A (object storage)**, with provider chosen by the operator. The repo would gain `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` (or the equivalent for the picked provider) and a small `src/lib/storage.ts` adapter so the rest of the code stays provider-agnostic. **If** the operator confirms a persistent volume is mounted in production AND there is exactly one app replica, B becomes acceptable as an interim — but the chosen path must be stated, not assumed.

> **DECISION (human)**: ☐ A (object storage; provider = ____)   ☐ B (host fs; volume path = ____)
> **Notes**:

### B-D3 — How the audio is served to the browser

Audio players need HTTP `Range` requests so the user can scrub without downloading the whole file.

| Option | What it does | Pros | Cons |
|---|---|---|---|
| **A. `/api/audio/[id]` route with `Range` support (recommended)** | Next route reads object storage (or fs) and streams with `Accept-Ranges: bytes` + `206 Partial Content` handling. | Mirrors the existing `/api/pdf-proxy` precedent. Access logic / dedup / range parsing in TS we own. Works regardless of B-D2 choice. `robots.ts` `/api/` Disallow already covers it — keeps it out of search results without extra config. | We hand-roll the range handler (small, but real). |
| B. Direct object-storage public URL (S3 / R2 public link) | DB stores a fully-qualified URL; browser hits the bucket directly. | Zero proxy cost; range support built into S3 and R2. | Bypasses our access logic — can never gate or rate-limit. Exposes the bucket URL forever (cache poisoning concern). Doesn't work for option B-D2-B at all. Requires CORS on the bucket. |
| C. Pre-signed URL (server mints short-lived signed link, redirects browser to it) | DB row → API route that returns a `307` to a signed URL. | Range works. Short TTL reduces leakage. | Two round-trips on first play. Pre-signing doesn't exist on a host filesystem. Caching + `<audio src>` interplay with redirects is fiddly. |

**Recommendation: A**. Same shape as `/api/pdf-proxy` and the existing `robots.ts:11` disallow already covers it (no SEO change). Range handling is ~30 lines using `Request` headers and `Response` with `status: 206` + `Content-Range`. The route stays `public` (no `requireAdmin`); upload stays `requireAdmin`.

> **DECISION (human)**: ☐ A   ☐ B   ☐ C
> **Notes**:

### B-D4 — Prisma schema (one audio per article vs many)

The OJS article identity used by every downstream surface is **`(journal.ojs_id, publication.submission_id)`** — never the route param `[publicationId]` (which is the OJS `publication_id`, a different number and which changes when the article is re-versioned). See `app/journals/[id]/articles/[publicationId]/page.tsx` and the working-agreement note in `docs/scholar-subdomain/TASKS.md:T9` for why `pdfDownloadUrl` was built from `journalUrlPath + submissionId`.

The model proposal would therefore key on those two fields, plus a locale (since articles are multilingual and the existing `primary_locale` flows through the read services).

| Option | Shape | Pros | Cons |
|---|---|---|---|
| **A. One row per `(ojs_journal_id, submission_id, locale)` — many-per-article (recommended)** | `ArticleAudio { id, ojs_journal_id, submission_id, locale (nullable = default), storage_key, mime, size_bytes, duration_seconds, uploaded_by, created_at, updated_at }`. Unique on `(ojs_journal_id, submission_id, locale)`. | Aligns with OJS's per-locale galley model. Lets a multilingual journal carry, e.g., `en_US` + `fr_FR` audio. `locale = null` covers the common single-language case. | Slightly more complex selection logic on the read side (pick `primary_locale` first, then `null`, then any). |
| B. One row per `(ojs_journal_id, submission_id)` only — single audio | Same as A without `locale`. | Simplest. | Multilingual journals have to overwrite. Re-introduces the limitation later, requires a migration. |

**Recommendation: A**. The selection logic on read side is the same three-line `primary_locale → null → first()` fallback we already use for `pubSettings` in `article-detail-service.ts:127-167`. Cost is essentially zero, and the multilingual constraint is real for at least some of the twelve journals (`primary_locale` is read out of every article row).

Field details to nail down in B1:

- `storage_key VARCHAR(500)` — object-storage key or relative fs path.
- `mime VARCHAR(100)` — audio/mpeg, audio/mp4 (m4a), audio/wav, audio/ogg. Restrict on upload via Zod.
- `size_bytes BIGINT` — enforced against `MAX_AUDIO_SIZE_MB` env (default 50, mirroring `.env.example:27`).
- `duration_seconds INT NULL` — set if we run `ffprobe`/`music-metadata` on upload; nullable otherwise. (Not blocking.)
- `uploaded_by BIGINT` → `AdminUser.id`.

> **DECISION (human)**: ☐ A   ☐ B   ☐ Other (specify)
> **Notes**:

### B-D5 — Player placement, identity, accessibility

Two visual modes mirroring `ModalPdfViewer.triggerStyle`:

- **Card mode** (in `article-item.tsx` action footer, next to the small ghost "View PDF" button at lines 174-189): a small branded **play / pause** chip with a thin progress bar that appears on click, ~32 px tall, no scrub slider until the user opens the article page. Stays out of the way; uses one accent colour from the platform brand.
- **Sidebar mode** (in `article-sidebar.tsx` Full Text card, at lines 42-71, **below** the `ModalPdfViewer`): a full-width branded audio player with play/pause, current time / duration, scrub slider, volume, and download (right-click natively + an explicit download button only if `audio.isOpenAccess` policy allows — same posture as the PDF download button at `article-sidebar.tsx:63-70` which is always present).

Accessibility commitments (will be enforced in B3 + B4):

- Use a native `<audio>` element under the hood (keyboard, screen reader, OS media controls "free") plus a custom branded UI that delegates to it via `ref`.
- All controls are real `<button>`s with visible focus rings (Tailwind `focus:ring-2 focus:ring-primary/30`).
- `aria-label` on the root container ("Audio abstract for {article title}"); `aria-pressed` on play/pause; `role="slider"`, `aria-valuemin/max/now` on the scrub bar.
- Keyboard: Space = play/pause, ← / → = ±5 s, ↑ / ↓ = ±10 % volume (matching native `<audio>`).
- Honour `prefers-reduced-motion` — drop the equalizer / waveform animation if any.
- Visible text for play state (so it isn't icon-only); contrast against card background ≥ AA.

**Branded design**: hand off to the `frontend-design` skill in B3 with the platform brand tokens (primary / accent / radius / typography) already present in `tailwind.config.*` and `src/components/ui/`. Re-uses `<Button>` from `components/ui/button.tsx` for keyboard / focus parity with the PDF actions.

> **DECISION (human)**: ☐ Approved as proposed   ☐ Changes (describe)
> **Notes**:

---

## 3. Cross-initiative note

If Initiative A (Dashboard / tracking) eventually adds a `play` engagement event for audio, the same `user_event` table introduced by UIET-P1 (`prisma/schema.prisma:400-421`) is the natural home — `event_type` is a free-form column there. This is **not** in scope for Initiative B and is called out only so we don't accidentally close that door in B1's schema design.

---

## 4. What this analysis does NOT cover

Per the working agreement: implementation. Once B-D1..B-D5 are signed off, the next file written is `specs/audio-abstracts/spec.md` (speckit), then `plan.md`, then per-task PRs for B1..B4 with one small PR each. The board section below tracks status.

## 5. Open Questions (must be closed before B1)

1. B-D1 chosen option (A recommended).
2. B-D2 chosen option + provider (A recommended; operator picks bucket vendor).
3. B-D3 chosen option (A recommended).
4. B-D4 chosen option (A recommended) + final field list confirmed.
5. B-D5 sign-off on UX placement and a11y commitments.
6. Operator-side: run the one-shot read-only OJS query for any existing audio galleys / supp files across our twelve journals, and post the count back here. Result does **not** block B1 under recommendation A, but it is the input that would justify a future "OJS-audio read" initiative.

---

## 6. Task board

| id | title | owner | depends-on | status | acceptance criteria |
| -- | -- | -- | -- | -- | -- |
| B0 | This analysis doc | [repo] | — | in-review | All six **Open Questions** answered in this file; reviewer signs B-D1..B-D5. No code emitted. |
| B1 | Prisma model + migration + storage adapter + upload route + admin upload UI | [repo] | B0 approved, B-D2 chosen, operator provisions storage creds | in-review | **Done in this PR**. New `ArticleAudio` Prisma model (`prisma/schema.prisma`) + migration `20260605120000_article_audio` with `UNIQUE (ojs_journal_id, submission_id, locale)`. Object-storage adapter at `src/lib/storage/` (interface + S3 impl using `@aws-sdk/client-s3`, R2-by-default endpoint/region/bucket env); `getStorage()` factory throws if any `S3_*` var is missing. `POST /api/article-audio` `requireAdmin` route with multipart + zod mime/size/locale validation; upsert per (journal, submission, locale) with old-object cleanup on replace; orphan cleanup on DB failure. Admin UI at `/admin/article-audio` (sidebar entry added) follows the picker-required + empty-state pattern (B-D6 A): left card = journal dropdown + submission_id + locale; right card = file input only when an article is selected, else explicit "Select an article…" empty state in the editorial-board-empty-state shape. Inline English copy (B-D7 A). `.env.example` documents the `S3_*` vars and the existing `MAX_FILE_SIZE_MB`. Tests: 13 integration tests cover 401/403/400/upsert/replace/orphan-cleanup/delete; 8 unit tests cover the S3 adapter (mocked SDK) + the env-required factory. Suite: 553 → 574. tsc 0 errors. Lint 0 errors / 71 warnings (baseline). Rollback: revert PR + `prisma migrate resolve --rolled-back 20260605120000_article_audio` then drop the `article_audio` table. |
| B1a | Local-filesystem storage adapter (Hostinger persistent disk) | [repo] | B1 | in-review | **Done in this PR**. Hostinger Cloud gives us a persistent disk that survives redeploys, so audio is stored locally rather than in S3. New `LocalFileStorage` at `src/lib/storage/local.ts` implementing the same `ObjectStorage` interface — put / delete (no-op on `ENOENT`) / `signedReadUrl` (returns `/api/audio/<key>` path; the B3 public route will serve it). Path-traversal hardened: every key is rejected if absolute, containing `\0`, empty, or resolving outside the root. Factory in `src/lib/storage/index.ts` selects backend by env — `AUDIO_STORAGE_DIR` set → local; unset → S3. New `ensureLocalStorageRoot()` for boot-time mkdir; `LocalFileStorage.put()` also mkdir's the dirname per write so an unmounted host fails loudly on the first upload, not silently. `.env.example` documents `AUDIO_STORAGE_DIR` with the Hostinger path example and the "outside the build dir" rule. Tests: 17 new in `tests/unit/storage-local.test.ts` cover put/delete/replace/signedReadUrl, all path-traversal vectors (`..`, mixed `../`, absolute path, null byte, empty key), and factory selection by env. Pre-existing S3 factory test defensively cleared of `AUDIO_STORAGE_DIR` so concurrent suites don't cross-contaminate. Suite: 574 → 591. tsc 0 errors. Lint 0 errors / 71 warnings (baseline). |
| B2 | Attach `audioUrl` to `ArticleDetail` and `CurrentIssueArticle` | [repo] | B1 | todo | New field `audioUrl: string \| null` on both DTOs at the `pdfDownloadUrl` attach points (`article-detail-types.ts:38-45`, `current-issue-types.ts:18-35`). Server-side population in `article-detail-service.ts` and `ojs-article-utils.ts` from the new `ArticleAudio` table, choosing locale per B-D4 precedence. `null` when absent. Unit tests: present / absent / locale-fallback. No UI changes in this PR. |
| B3 | Branded, accessible play button + player on card + article page | [repo] | B2 | todo | New `ArticleAudioPlayer` component built with the `frontend-design` skill, matching B-D5. Renders in `article-item.tsx` (card mode) and `article-sidebar.tsx` (sidebar mode), next to the existing PDF actions. Public `GET /api/audio/[id]` route with `Range` (`206 Partial Content`) support, same shape as `/api/pdf-proxy`. `robots.ts` `/api/` disallow already covers it — no change there. a11y tests: keyboard play/pause + scrub, ARIA names, focus rings. Visual check both light / dark theme. |
| B4 | Tests + access-posture guards | [repo] | B3 | todo | Upload mime/size/auth tests; attach-logic null/absent tests; player a11y tests; **guard test**: fails the suite if anyone removes `requireAdmin` from the upload route, or adds an auth check to `GET /api/audio/...`, or adds `/audio` to `robots.ts` Disallow rules incorrectly. Suite green; lint baseline unchanged. |

Status values: `todo` · `ready` · `in-progress` · `in-review` · `blocked-on-ops` · `done`.

How to update: change `status` in the same PR that advances the row. New scope → new row, do not widen.
