# DigitoPub SEO Remediation — Diagnosis & Operations Checklist

This document records the root cause for each Google Search Console finding,
the corresponding code change, and the operational steps that must happen
outside the codebase (Hostinger DNS / build / GSC) for the fixes to take effect.

## 1. Sitemap fetch failure ("couldn't fetch the file", 0 pages discovered)

### Root cause

`app/sitemap.ts` was declared `export const dynamic = "force-dynamic"` and
performed up to **three** OJS database lookups per journal (`fetchCurrentIssue`
+ `fetchArchiveIssues` + one `fetchIssueWithArticles` per issue). Each lookup
runs inside `ojsQuery()` which has its own three-attempt retry with
1s/2s/4s exponential back-off.

Worst case: a single hung OJS connection stalls the request for
**7 seconds × N issues × M journals**. Googlebot times out around 10–15 s
and reports "couldn't fetch the file". The route also re-threw any uncaught
error from Prisma or OJS, producing an HTTP 500 / empty body — same effect
in GSC.

A separate factor: when the **production database is freshly initialized
and `prisma.journal.findMany()` returns nothing** (a known issue on
Hostinger per the deployment history), the previous code emitted just the
homepage URL — a single-entry sitemap which GSC sometimes interpreted as
unusable. After the recent UIET-P1 work, the new code path still threw on
DB errors at request time, which surfaces as the same "couldn't fetch".

### Fix (commit `fix(seo): harden sitemap…`)

- Homepage **and every static public route** are pushed into `entries`
  before any I/O. The sitemap is now non-empty regardless of DB / OJS
  state.
- `prisma.journal.findMany()` is wrapped in `try/catch`; failure returns
  the static-only sitemap rather than propagating an exception.
- Every OJS call (`fetchCurrentIssue` / `fetchArchiveIssues` /
  `fetchIssueWithArticles`) is wrapped in a 4-second `Promise.race`
  timeout. If a call hangs or rejects, we log it and move on — degrading
  to "fewer URLs", never to "no response".
- `revalidate = 3600` is kept so the cached XML is served in between
  recomputes; combined with the timeout, a cold OJS DB can no longer
  stall every crawler hit.

The route continues to return `Content-Type: application/xml` via Next.js's
`MetadataRoute.Sitemap` convention — no custom Response object is needed.

## 2. The 403 URL ("Page blocked due to access forbidden")

### Likely sources

The exact URL must come from GSC's **URL Inspection** tool — we cannot
positively identify it from the repo alone. Three plausible sources:

1. **A private route Google somehow discovered.** Robots.txt already
   disallows `/api/`, `/admin/`, `/auth/`, but Google sometimes adds a URL
   to its discovery queue from external links and reports the resulting
   403 / disallow as an error. The new middleware change attaches
   `X-Robots-Tag: noindex, nofollow` to every response from `/admin`,
   `/api`, `/auth` and `/account`, so a discovered URL gets dropped from
   the index rather than re-crawled.
2. **`/api/pdf-proxy`** — this route proxies PDF galleys from OJS and can
   return 403 if the upstream OJS refuses the request. PDFs should be
   crawled via the article page's canonical PDF link, not the proxy URL,
   so noindex'ing `/api/*` covers this case as well.
3. **Hostinger WAF rule** rejecting the Googlebot User-Agent for certain
   paths. If GSC inspection points to a public page (not under
   `/api/`, `/admin/`, `/auth/`, `/account/`), the fix is to whitelist
   Googlebot in Hostinger's firewall rules. See the **Operations
   Checklist** below.

### Fix (commit `fix(seo): pin canonical URL form…`)

The middleware now stamps `X-Robots-Tag: noindex, nofollow` on every
response whose path begins with `/admin`, `/api`, `/auth` or `/account`.
This is **defense in depth** on top of `robots.txt` — the disallow tells
crawlers not to visit, the header tells them not to index even if they do.

## 3. Canonical duplication ("Duplicate, user didn't select canonical")

### Root cause

Three independent things can cause a "user didn't select canonical" flag:

- **www vs apex** — the same content reachable on both
  `www.digitopub.com` and `digitopub.com`, with both versions returning
  200. `NEXT_PUBLIC_APP_URL` is `https://digitopub.com` (apex), and
  `buildCanonical()` emits apex URLs. If the Hostinger DNS / virtual host
  also serves `www.`, Google sees two URLs serving identical content and
  picks one.
- **http vs https** — same as above, with the scheme.
- **Trailing slash inconsistency** — `buildCanonical()` strips trailing
  slashes (`/journals/5` → `/journals/5`), but Next.js's default
  `trailingSlash` setting was unset, leaving the door open for Next.js
  to internally canonicalize differently in some code paths.

### Fix

- `next.config.mjs` now sets `trailingSlash: false` explicitly. This
  matches `buildCanonical()` (no trailing slash) and what `sitemap.ts`
  publishes — every declared canonical now exactly matches a
  200-returning URL.
- The host / scheme normalization (apex-only, https-only) must happen at
  the **Hostinger edge**. See the **Operations Checklist** below.

## 4. `NEXT_PUBLIC_APP_URL` inlining

`NEXT_PUBLIC_*` env vars are baked into the JavaScript bundle at build
time. If the production build was run before `NEXT_PUBLIC_APP_URL` was
set in Hostinger, the deployed bundle still contains the build-time
default — which on Hostinger's Node.js host may be `http://localhost:3000`.

**We cannot verify this from the repo.** The operations checklist
includes a one-line `curl` check the user should run against production
to confirm the env var was inlined; if not, the fix is to rebuild and
redeploy.

The new `metadataBase` added to `app/layout.tsx` reads from the same env
var and falls back to `https://digitopub.com` if unset, so even an
unfixed build emits correct OpenGraph / Twitter URLs.

## 5. Production database seeding

Sitemap journal / issue / article URLs come from `prisma.journal.findMany()`.
If the production DB is empty (as deployment history suggests), the
hardened sitemap will return **only the homepage + static public routes**.
That is still a valid, indexable sitemap — much better than 500 — but it
won't help articles get indexed.

**This task does not seed the database.** The user should verify in the
production DB whether journals exist; if not, run `bun run ojs:sync` (or
the equivalent admin trigger) to populate Prisma from OJS.

---

## Operations Checklist

After deploying these commits, the following actions must happen **outside
the codebase** for the fixes to be visible to Google.

### 1. Verify `NEXT_PUBLIC_APP_URL` was inlined

```bash
curl -s https://digitopub.com/robots.txt
```

Expected output contains `Sitemap: https://digitopub.com/sitemap.xml` and
`Host: https://digitopub.com`. If you see `localhost` or `http://`,
rebuild and redeploy the app — `NEXT_PUBLIC_*` vars are inlined at build
time, not at runtime.

Also view-source on `https://digitopub.com/` and confirm:

- The `<link rel="canonical">` tag points to `https://digitopub.com`
  (no `localhost`, no `www.`, no trailing slash).
- The `<meta property="og:url">` tag matches.

### 2. Pick one canonical host and enforce a 301 redirect

In the Hostinger control panel:

- **Force HTTPS** — already standard, but verify `http://digitopub.com/`
  301-redirects to `https://digitopub.com/`.
- **Decide www vs apex.** The codebase is configured for **apex
  (`digitopub.com`)**. In Hostinger DNS / Apache / nginx config,
  301-redirect `www.digitopub.com` → `https://digitopub.com`.
- **Trailing-slash redirect.** Configure the web server to 301-redirect
  trailing-slash variants (e.g. `/about/` → `/about`). Without this,
  Google may try both forms even though our canonical and sitemap only
  emit one.

### 3. Re-deploy

```
Hostinger → Deploy with environment NEXT_PUBLIC_APP_URL=https://digitopub.com
```

Hostinger's build runs `bun run build` which runs `next build` — env vars
that exist at build time are inlined into the client bundle.

### 4. Re-submit the sitemap in GSC

1. Open Google Search Console for `https://digitopub.com`.
2. **Sitemaps → Add a new sitemap → `sitemap.xml` → Submit**.
3. Wait a few minutes, then refresh. Status should change from
   "Couldn't fetch" → "Success" with a non-zero "Discovered URLs" count.
4. For the previously-failing sitemap entry, click **Validate Fix** in
   the Sitemaps panel.

### 5. Re-validate the 403 URL

1. **URL Inspection → paste the failing URL → Test Live URL**.
2. If the URL is now a 200 (it should be, after deploy), click
   **Request Indexing**.
3. If the URL is `/api/*`, `/admin/*` or `/auth/*`, the X-Robots-Tag
   header will surface in the inspection report under "Indexing allowed?"
   — confirm it says "No: 'noindex' detected". The URL should be removed
   from the index automatically over the next few weeks. No action
   needed.

### 6. Re-validate the canonical duplication

For the URL flagged "Duplicate, user didn't select canonical":

1. Inspect the URL in GSC.
2. Confirm Google now sees a single canonical that matches the URL in
   the address bar.
3. Click **Validate Fix** in the Coverage panel for the duplication.

### 7. Validate JSON-LD

For one journal page and one article page:

1. Open `https://search.google.com/test/rich-results`.
2. Paste the URL.
3. Confirm:
   - Article pages report a valid **`ScholarlyArticle`** schema.
   - Journal pages report a valid **`Periodical`** schema.
   - All pages report a valid **`Organization`** schema (sitewide).

### 8. Verify production DB has journals

Optional but important — without journals in Prisma, the sitemap will
publish only the homepage + static routes. Either confirm in Prisma
Studio, or hit the API:

```bash
curl -s https://digitopub.com/api/journals | jq '.pagination.total'
```

Should be `> 0`. If it's `0`, run the OJS sync (`bun run ojs:sync` or
the admin trigger) to populate Prisma from OJS.

---

## Code Change Summary

| Objective | Commit | Files |
| --- | --- | --- |
| 1 — Sitemap resilience | `fix(seo): harden sitemap…` | `app/sitemap.ts` |
| 2 — 403 / noindex private | `fix(seo): pin canonical URL form and noindex private routes` | `middleware.ts` |
| 3 — Canonical duplication | (same commit as 2) | `next.config.mjs` |
| 6 — metadataBase | `feat(seo): add metadataBase + sitewide Organization JSON-LD` | `app/layout.tsx`, `components/seo/organization-jsonld.tsx` |
| 7 — Homepage SSR | `feat(seo): server-render the homepage's featured journals` | `app/page.tsx`, `app/home-page-client.tsx` |
| 8 — Per-page metadata | `feat(seo): unique title/description/canonical for every public page` | `app/{about,help,help/submission-service,help/technical-support,journals,register,contact,solutions,submit-manager}/layout.tsx`, `app/journals/[id]/layout.tsx` |
| 9 — JSON-LD | `feat(seo): Periodical + ScholarlyArticle JSON-LD…` | `components/seo/periodical-jsonld.tsx`, `app/journals/[id]/layout.tsx`, `app/journals/[id]/articles/[publicationId]/page.tsx` |
| 11 — Heading hierarchy | `fix(seo): add accessible h1 to /register` | `app/register/page.tsx` |

---

## Google Scholar — Option A (OJS as system of record)

The same article exists twice: on **digitopub.com** (a read-only gateway that
server-renders article pages from the external OJS database) and on
**submitmanager.com** (the canonical OJS install where the article is authored,
reviewed, and published). digitopub previously emitted the full Google Scholar
discovery surface for every article — the Highwire `citation_*` meta set
(`buildCitationMeta`) plus a `ScholarlyArticle` JSON-LD block — which made it
compete with the OJS copy for the *same* Scholar record. Worse, the emitted
`citation_pdf_url` resolved to `/api/pdf-proxy?…`, a path digitopub forbids
crawlers from fetching (`Disallow: /api/` in `app/robots.ts` plus an
`X-Robots-Tag: noindex` header from `middleware.ts`) — so digitopub advertised
a full-text PDF at a URL it simultaneously blocked.

**Decision:** OJS is the single Google Scholar system of record ("Option A").
digitopub no longer emits Scholar discovery metadata by default.

A new env flag, `EMIT_SCHOLAR_CITATION_META` (`"true"`/`"false"`, **default
`false`**), gates the entire Scholar surface:

- **`generateMetadata`** (`app/journals/[id]/articles/[publicationId]/page.tsx`):
  the `other: citationMeta` block is attached only when the flag is `true`. At
  the default, the page emits **zero** `citation_*` meta tags. Title,
  description, keywords, authors, `alternates.canonical` (self), and OpenGraph
  are unchanged — digitopub stays a normal, self-canonical, Search-indexable
  page.
- **`ScholarlyArticle` JSON-LD** (`components/article-jsonld.tsx`): rendered only
  when the flag is `true` (gated both at the call site and defensively inside
  the component). At the default, no `ScholarlyArticle` schema is emitted.
- **`citation_pdf_url`** (`src/features/journals/server/citation-meta.ts`): never
  a robots-blocked `/api/…` URL. When (and only when) the flag is `true`, it is
  built as the real OJS download URL
  `${ojsBaseUrl}/${journalUrlPath}/article/download/${submissionId}/${galleyId}`
  from the canonical OJS `submission_id`, PDF galley id, and journal `url_path`
  — not the route's `[publicationId]` param.
- **JSON-LD `url` field** (`components/article-jsonld.tsx`): the `url` property in
  the `ScholarlyArticle` block is never a proxy URL. When the resolved PDF URL
  points at `/api/pdf-proxy`, the safe OJS public download URL is substituted;
  if that is also unavailable, the `url` field is omitted entirely.

**Unchanged:** the human-facing PDF experience (`/api/pdf-proxy`, the inline
modal viewer, and `buildGalleyDownloadUrl`'s on-page links), `app/robots.ts`
(`Disallow: /api/` stays), and full SSR of article content. To make digitopub
the Scholar record later (Option B), set `EMIT_SCHOLAR_CITATION_META=true`.
