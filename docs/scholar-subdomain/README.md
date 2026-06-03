# Scholar Subdomain Initiative — Canonical Plan

This directory is the single source of truth for the initiative that moves the
Google-Scholar record of our OJS install onto **`journals.digitopub.com`** without
migrating files, while every public, citation, and DOI URL reads `digitopub.com` and
`submitmanager.com` is hidden behind a permanent redirect.

> Read this README first, then `data-flow.md` for the visuals, `TASKS.md` for the
> board, and `working-agreement.md` for how a task is run end-to-end.

---

## Mission

Make the existing OJS 3.5.0.2 install the Scholar-indexed record under the name
`journals.digitopub.com` (DNS alias + SSL on the **same** SiteGround server — no file
migration), so the entire scholarly surface (citation metadata, full-text PDFs, DOI
landing pages) lives on the digitopub.com namespace. The Next.js apex
(`digitopub.com`, Hostinger) remains the brand site and journal directory, defers to
the subdomain via canonical, and emits no competing scholarly metadata.
`submitmanager.com` becomes a 301 to the subdomain.

## End-state

| Surface                    | Host                          | Notes                                                  |
| -------------------------- | ----------------------------- | ------------------------------------------------------ |
| Brand site / directory     | `digitopub.com` (apex)        | Next.js on Hostinger. No `citation_*`, no ScholarlyArticle. |
| Article landing (Scholar)  | `journals.digitopub.com`      | OJS on SiteGround. Full Highwire `citation_*`.         |
| Full-text PDF (Scholar)    | `journals.digitopub.com`      | Same host as landing, 200 `application/pdf`, no login. |
| DOI link target            | `journals.digitopub.com`      | Crossref re-deposited with new URLs.                   |
| Old marketing host         | `submitmanager.com`           | Permanent 301 → subdomain.                             |
| Human PDF viewer           | `digitopub.com/api/pdf-proxy` | Untouched. Server-side fetch from OJS for UX only.     |

## Confirmed facts (do not re-investigate)

- **Two servers, decoupled names.** Next.js + Hono apex `digitopub.com` (Hostinger);
  OJS 3.5.0.2 (SiteGround), 12 journals, path-based from one docroot. Hostnames are
  decoupled from servers via DNS, so the subdomain can point at SiteGround without
  moving a file.
- **OJS is already Scholar-correct.** Full Highwire `citation_*` tags, OJS generator
  tag, same-host open PDFs (200 `application/pdf`, no login), crawlable robots;
  GoogleOther is already crawling it.
- **Apex is already neutered for Scholar.** `EMIT_SCHOLAR_CITATION_META` (default
  `false`) suppresses `citation_*` and ScholarlyArticle on the apex. The human
  `/api/pdf-proxy` is untouched.
- **OJS hostname is centralized.** `src/features/ojs/utils/ojs-config.ts` exposes
  `getOjsBaseUrl`, `getPublicOjsBaseUrl`, `getOjsPublicAssetsBaseUrl` (strips `/ojs`),
  and `normalizeOjsAssetUrl`. Envs: `OJS_BASE_URL`, `PUBLIC_OJS_BASE_URL`,
  `NEXT_PUBLIC_OJS_BASE_URL`.
- **Apex article route.** `app/journals/[id]/articles/[publicationId]/page.tsx` owns
  `generateMetadata` + `buildCanonical`. `[publicationId]` is **not** the OJS
  submission_id — build OJS URLs from the real `submissionId` / `journalUrlPath`
  carried in the query.
- **Latent image bug.** Resolvers are duplicated: `ojs-cover-utils.ts` handles
  JSON + PHP-serialized + plain via `next/image` (works); `resolveProfileImageUrl` in
  `editorial-board-service.ts` handles only JSON + plain via plain `<img>` (falls back
  to initials); Highlights uses a third path (broken). The OJS host has hotlink/WAF
  protection; `next/image`'s server-side fetch survives it, plain browser `<img>` does
  not.
- **Latent link bug.** `custom-blocks-service.ts::extractCardFields()` extracts
  `href`/`src` with raw regex and decodes `title`/`description` but not `link`/`image`,
  so `&amp;` survives in URLs and breaks multi-param links (e.g. Scholar
  `?hl=en&user=`). `board-nav-service.ts` uses cheerio `.attr()` (decodes) and is the
  correct pattern.

## Phased roadmap

1. **Repo prep (T1–T3, no infra).** Centralize the OJS host, point the apex canonical
   at the subdomain, fix the image pipeline and the HTML-entity link bug. None of
   this changes user-visible URLs until the env value is flipped.
2. **Artifacts (T4).** Generate `submitmanager-301.htaccess` and `verify-cutover.sh`.
   Repo-only — operator runs them.
3. **Cutover (T5, [ops]).** DNS → SiteGround alias + Let's Encrypt SSL → verify HTTPS
   → flip OJS `base_url` + clear caches → apply 301 → re-deposit DOIs.
4. **Finalize (T6).** Deploy the apex env, GSC property, sitemap, log hygiene,
   open-access audit of all 12 journals, run `verify-cutover.sh` until green, monitor
   Scholar recrawl.

## Owners

| Tag     | Who              | Scope                                                                |
| ------- | ---------------- | -------------------------------------------------------------------- |
| [repo]  | Implementing eng | Code, tests, docs, task board, verification scripts.                 |
| [ops]   | Human operator   | DNS, SiteGround alias + SSL, OJS `base_url` flip, Apache 301, Crossref deposit, GSC. |

## Global acceptance criteria

A change is complete only when **all** of the following hold:

- Small, single-purpose PR. No scope creep; new scope becomes a new task.
- `tsc --noEmit` and lint pass with zero errors.
- Tests added or updated; full suite green.
- Acceptance-criteria checklist and rollback note in the PR body.
- `TASKS.md` status updated.
- Guardrails intact: `app/robots.ts` still disallows `/api/`; `/api/pdf-proxy` still
  works; `EMIT_SCHOLAR_CITATION_META` stays `false` on the apex; no OJS file moves; no
  runtime env edits from the repo side.
- Human approval recorded before merge.

## Glossary

- **Apex** — the bare domain `digitopub.com`, served by Next.js on Hostinger.
- **Subdomain** — `journals.digitopub.com`, a DNS alias pointing at the same
  SiteGround server that already hosts OJS.
- **base_url** — OJS configuration value that determines the absolute URLs OJS emits
  in HTML, sitemaps, and feeds. Flipping this is the visible pivot of the cutover.
- **Canonical** — `<link rel="canonical">` on apex article pages, pointing at the
  subdomain landing so search engines consolidate signals there.
- **Highwire `citation_*`** — the meta-tag vocabulary (`citation_title`,
  `citation_pdf_url`, …) that Google Scholar requires on a landing page to index an
  article.
- **Hotlink / WAF** — protection rules on the OJS host that block third-party browser
  requests for assets; `next/image`'s server-side fetch bypasses this, plain `<img>`
  does not.
