# Task 1 — Audio Uploader UI: Investigation

> **Initiative**: B (audio abstracts) — supports task **B1** in `specs/audio-abstracts/analysis.md`
> **Branch**: `claude/compassionate-bell-ab2fU`
> **Date**: 2026-06-05
> **Phase**: investigation (no implementation; written before B1 PR)

This investigation explores the UX of the upcoming manager upload control (B1's "admin dashboard upload control") **before** we write any code, focused on three specific questions:

1. Does the codebase already have a create-mode-vs-edit-mode "gate" on any media-like field that we should reuse or unify with?
2. If we gate the uploader behind "the parent record must exist first," should we keep the gate or allow pre-save attachments via a draft/temp identity? (Two options, recommend one.)
3. If the uploader emits user-facing strings, do we introduce an i18n layer for them or use inline English? (The original ticket assumed `next-intl` keys; this repo has no i18n today.)

The investigation deliberately stops short of choosing a final design — the **decision** belongs to the reviewer. All claims are file/line-anchored.

---

## 0. Calibration vs. the upstream prompt

The prompt referenced a `MediaAttachmentFieldset` component with a hard `opacity-50 pointer-events-none` gate when `itemId` is null, ~20 `defaultValue:` misuses on `next-intl` `t()` calls, and missing `Media.Editor.*` keys in `ar.json` / `en.json`. **None of those artifacts exist in this codebase** (verified at session start: zero greps for `MediaAttachmentFieldset`, `Media.Editor`, `defaultValue:` on a `t()` call, `next-intl`, `messages/`, `locales/`, `i18n/`, or any `ar.json` / `en.json`).

The investigation is therefore **forward-looking**: we are designing the gate for code that B1 will introduce, not auditing an existing one. The three questions translate as follows for this repo:

| Original framing | What it means here |
|---|---|
| "Confirm fieldset works in edit, only disabled in create" | Confirm whether digitopub even has a "create" mode for the parent (article) the uploader attaches to — and if not, what the analogous "no parent selected yet" state is. |
| "H1: replace dim with empty state vs allow pre-save attach" | Same options, but applied to the picker-then-upload flow that B1 will build, not to a save/no-save form lifecycle. |
| "H2: 20 bogus `defaultValue:` args, add `Media.Editor.*` keys" | There is no i18n layer to misuse. The question is: when B1 ships, do we add one or not? |

This is the contradiction the working-agreement says to "follow the code and flag." Flagged.

---

## 1. Edit-vs-create disambiguation (zero-runtime, code-grounded)

**Answer**: **There is no "create-mode" for an article in digitopub.** Articles are read-only from OJS. Every audio upload would necessarily happen against an article that already exists upstream — i.e. always "edit-mode" in the upstream prompt's vocabulary. The relevant ambiguity isn't create-vs-edit, it's *article-selected-vs-no-article-selected* in the admin's picker step.

Evidence:

- The article read pipeline is OJS-only: `src/features/journals/server/article-detail-service.ts:51-104` (`fetchArticleDetail` queries OJS `publications` + `submissions` + `journals`); `src/features/journals/server/ojs-article-utils.ts:44-101` (`fetchArticlesWithAuthors` queries OJS `publications` by `issue_id`). Both return DTOs whose identity is `(ojs_journal_id, submission_id)`.
- The OJS client (`src/features/ojs/server/ojs-client.ts:59-98`) is `SELECT`-only by convention; `CLAUDE.md` ("OJS Integration") states "Read-only integration with Open Journal Systems database." The constitution's only allowed write is the ORCID backfill in `src/lib/ojs-write-guard.ts` — auditable, single-purpose, not a content-creation surface.
- There is **no `app/admin/articles/new` route** (the admin tree has only `journals/new` and the email-templates new page — see `ls app/admin/`). The journal-create page (`app/admin/journals/new/page.tsx`) sits next to `app/admin/journals/page.tsx`, the canonical "list + add new" pattern. Articles have no equivalent list/new pair because they are not authored in digitopub.
- The Prisma `Submission` model (`prisma/schema.prisma:71-…`) is the *manuscript-submission* surface (separate from OJS `submissions` table) — its lifecycle is "submitted → under_review → accepted/rejected → published." It is not used as the OJS-article handle and is never created from the admin UI either (no POST route for it in `src/features/journals/server/route.ts`; the only mutating journal routes are journal CRUD at `:792 / :832 / :871`).
- The proposed `ArticleAudio` schema (B-D4 in `specs/audio-abstracts/analysis.md`) is keyed `(ojs_journal_id, submission_id, locale)`. Both components of the key already exist in OJS before any digitopub interaction. There is no point in time where an `ArticleAudio` row could be created with a "draft" parent identity, because the parent identity is upstream-canonical.

**Consequence for B1's UI flow**: the manager always starts at "pick an article," not "create an article." After picking, `submission_id` + `journal_url_path` are known and the upload control is ready to accept a file. The gate-or-not question collapses to: *what does the page show before the manager has picked an article?*

That is a real UX question — but it is the picker's empty state, not a create-vs-edit gate on the uploader itself. Once the upload control mounts, it is always in "the parent exists" state.

---

## 2. H1 (revised) — Empty-state vs pre-save attach, for the picker step

Restated for this codebase: when the admin lands on the audio-management page with no article picked, what do they see?

### Option A — Picker-required, explicit empty state (recommended)

The page is split into two regions: a left-side **article picker** (search + journal/issue dropdowns) and a right-side **uploader card**. Until an article is selected, the uploader card renders an explicit empty state, e.g.:

```text
[ icon ]
Select an article to attach audio
Search by title, DOI, or submission ID on the left.
```

Patterned on the existing `app/journals/[id]/components/editorial-board/empty-state.tsx:3-15` empty state (centered icon-in-pill + heading + description). Same component shape; new copy.

**Pros**
- Mirrors the natural data model — an `ArticleAudio` row cannot exist without a real `submission_id`, so the UI never lets the user attempt the impossible.
- One unambiguous code path through the uploader (always "parent known").
- No throwaway draft rows in MySQL, no orphan files in object storage, no cleanup cron.
- Reuses the existing empty-state visual language (no new design tokens).

**Cons**
- The manager must commit to a target article before they can preview / trim / replace audio. If they realise they picked the wrong article, they re-pick — but the file they just uploaded is now bound to a different submission. Mitigation: explicit "Replace audio" and "Delete audio" actions on the uploader card, plus a confirm dialog when replacing.

**Effort**: small. One picker component (re-uses TanStack Query + the existing `client.journals.*` RPC + `Input` + `Card` primitives from `components/ui/`), one empty-state, no schema changes beyond what B-D4 already proposes. ~1–1.5 PR-days.

### Option B — Pre-save attach via draft/temp identity

The admin lands directly on an uploader form. The act of dropping a file mints a `draft_id` (digitopub-side UUID) and stores the file under that key. Later, the admin commits the draft to a real `(journal, submission)` by picking the target.

**Pros**
- Lets the manager "preview a file before committing to which article it belongs to," which is a workflow some content teams like.

**Cons**
- Two identities to track (`draft_id` + final `(journal, submission)`), and the move-from-draft-to-real step is a state transition that can fail (storage move fails after DB commit, etc.). Each new failure mode is real and visible to the manager.
- Orphan files: drafts that are never committed leak. Needs a TTL + cleanup job (extra cron, extra ops surface).
- Adds two API endpoints (`POST /draft`, `POST /draft/:id/commit`) instead of one (`POST /:journal/:submission/audio`).
- The draft → real boundary is an attack-surface broadener for B4's `requireAdmin` guard (now two `requireAdmin` routes to keep correct in lockstep). Per CLAUDE.md's identity rules, every digitopub-managed write path is a thing the guard tests must cover.
- No existing precedent in the repo: no draft/temp pattern exists in any other admin feature today (journals, submissions, email-templates, messages, billing all gate on real parent IDs).

**Effort**: medium-to-large. New endpoints, draft model, cleanup cron, two-step UX, plus the same picker that A needs anyway (for the commit step). ~3–4 PR-days, with ongoing ops cost for the cleanup job. Roughly **2.5×** Option A.

### Recommendation: **A**

Reasoning:
1. The data model already pins the parent identity upstream — pretending otherwise creates a fictitious "draft article" that has no counterpart anywhere in the system.
2. The repo's working-agreement says "Don't design for hypothetical future requirements" (CLAUDE.md / Doing tasks). The "preview audio before deciding which article" workflow is hypothetical; the "attach audio to a known article" workflow is the actual brief.
3. A is built almost entirely from existing primitives (`Input`, `Card`, the editorial-board empty-state shape, a TanStack Query hook). B introduces a new lifecycle, a new endpoint pair, a new cleanup ops surface, and a new test guard.
4. Two cells of the prompt's matrix collapse to the same answer here: the "gate" in A is not silent dimming, it is an explicit message, and that explicit message *is* the empty state. So we get H1's mitigation for free.

This is a recommendation, not a decision — explicitly flagged for **B-D6** below.

> **DECISION (human)**: ☐ A   ☐ B   ☐ Other (specify)
> **Notes**:

---

## 3. H2 (revised) — should B1 introduce i18n at all?

The upstream prompt's bug ("20 bogus `defaultValue:` args, missing `Media.Editor.*` keys") presumes an i18n layer. This repo has none — confirmed by exhaustive grep at session start: no `next-intl`, no `useTranslations`, no `messages/`, no locale JSONs, no `Locale` switcher anywhere in the tree. Every user-facing string in `app/` and `src/` is inline English (Arabic appears only in editorial-board author names that flow from OJS).

So H2 in its original form **does not apply**. The real question for B1 is:

| Option | What it does | Pros | Cons |
|---|---|---|---|
| **A. Inline English in the new uploader UI (recommended for B1)** | Same as every other surface in the repo today. Copy lives next to the JSX. | Zero new infrastructure. Matches the existing codebase 100%. No "first user of i18n" tax (i18n config, locale negotiation, RTL handling for Arabic if added). | If the platform later goes multilingual, this code gets refactored along with the rest. |
| B. Introduce `next-intl` (or another i18n library) as part of B1 | New dep, new `messages/{en,ar}.json`, new `next-intl` config in `app/layout.tsx`, RTL handling because Arabic is involved. | Sets up multilingual support before it's needed. | Drags a platform-wide concern into a single-feature PR (scope creep). Roughly doubles B1's footprint. Needs operator agreement on which locales to ship and a separate translation-completeness CI check (the `--update-baseline` flow from the original prompt). |

**Recommendation: A** for B1. If multilingual support is itself a desired initiative, it should be its own initiative (Initiative C) with its own analysis doc, not bundled into the audio MVP.

> **DECISION (human)**: ☐ A (inline English)   ☐ B (introduce i18n now)
> **Notes**:

---

## 4. What this changes about the analysis doc

If A is chosen for both H1 and H2 above, `specs/audio-abstracts/analysis.md` only needs a minor amendment under §2: a new **B-D6** "Picker UX" row pointing at this investigation, with status "see investigations/uploader.md". No B-D1..B-D5 changes.

If B is chosen for H1, B1 grows: add a `draft_audio` Prisma model, a draft TTL cron entry, two endpoints instead of one, and an extra guard test in B4. The schema in B-D4 stays as is (drafts are a separate table, not a flag on `ArticleAudio`).

If B is chosen for H2, a new Initiative C ("i18n introduction") should land **before** B1 begins, so B1 doesn't author untranslated strings the i18n init will then have to retro-fit.

---

## 5. Open Questions (must be closed before B1 starts)

In addition to the existing B-D1..B-D5 in the analysis doc:

- **B-D6**: H1 — Option A (picker-required + empty state) or Option B (draft/temp identity)? *Recommendation: A.*
- **B-D7**: H2 — Inline English (Option A) or introduce `next-intl` now (Option B)? *Recommendation: A.*

---

## 6. Task board row

| id | title | owner | depends-on | status | acceptance criteria |
| -- | -- | -- | -- | -- | -- |
| B0.1 | This investigation (uploader UX disambiguation) | [repo] | B0 in `analysis.md` | in-review | §1's edit-vs-create answer accepted; B-D6 + B-D7 closed by reviewer. No code emitted. |

Once B-D6 + B-D7 are signed, B1's acceptance criteria in `analysis.md` can be sharpened to reference the chosen picker UX and i18n posture. No further re-spec needed.
