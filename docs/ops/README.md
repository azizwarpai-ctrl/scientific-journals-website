# Ops Artifacts — `journals.digitopub.com` Cutover

Two files in this directory are everything the human operator needs to perform
and verify the cutover. The repo generates them; the operator applies them.

| File | Purpose | Owner |
| --- | --- | --- |
| [`submitmanager-301.htaccess`](./submitmanager-301.htaccess) | Host-conditional 301 from `submitmanager.com` → `https://journals.digitopub.com`. | [ops] applies. |
| [`verify-cutover.sh`](./verify-cutover.sh) | Read-only `curl` matrix that gates every stage. Exits non-zero on any red signal. | [ops] runs after each step, all green = cutover done. |

> Nothing here writes to OJS, DNS, Crossref, GSC, or the apex. Both files are
> safe to inspect, copy, and re-run as many times as needed.

---

## Apply order (Stage C of the steering plan)

The numbered steps from `docs/scholar-subdomain/data-flow.md` :

1. **DNS A record** — `journals.digitopub.com` → SiteGround IP. *(reversible)*
2. **SiteGround alias + Let's Encrypt SSL**. *(reversible)*
3. **Verify HTTPS** on subdomain serves the existing OJS install with no broken assets. *(reversible)*
4. **▶ Flip OJS `base_url`** to `https://journals.digitopub.com` and clear OJS caches.  ← **one-way door**
5. **Apply this `.htaccess` block** at the TOP of the docroot's `.htaccess`, above OJS's own rewrite block.
6. **Re-deposit DOIs** at Crossref with the new article URLs.
7. **Deploy the apex** with `OJS_BASE_URL` / `PUBLIC_OJS_BASE_URL` / `NEXT_PUBLIC_OJS_BASE_URL` pointing at the subdomain (T6).
8. **Add the GSC property** for `journals.digitopub.com` and submit the OJS sitemap.

Steps 1–3 are invisible to crawlers; revert by removing DNS / SSL. Step 4 is
the public pivot — after this OJS emits subdomain URLs in HTML, sitemaps, and
feeds. Reverting after step 4 requires flipping `base_url` back and waiting
for Scholar to re-crawl.

---

## Running `verify-cutover.sh`

```bash
bash docs/ops/verify-cutover.sh
```

The defaults check OJBR submission #32 (DOI `10.26629/ojbr.2026.02`).
Override anything via environment variables — useful for re-running against a
different article:

```bash
JOURNAL_SLUG=ijmp \
  SUBMISSION_ID=14 \
  GALLEY_ID=27 \
  DOI=10.26629/ijmp.2025.07 \
  APEX_JOURNAL_ID=2 \
  APEX_PUBLICATION_ID=14 \
  bash docs/ops/verify-cutover.sh
```

`APEX_JOURNAL_ID` and `APEX_PUBLICATION_ID` are the **apex-side** identifiers
(the route is `/journals/[id]/articles/[publicationId]`, and `[publicationId]`
is NOT the OJS `submission_id` — see `CLAUDE.md`).

### What the matrix checks

| # | Stage | Check |
| - | --- | --- |
| 1 | C/D | OJS `/robots.txt` allows `/article/view` and `/article/download` (no blanket `Disallow: /`). |
| 2 | C/D | Landing page (Googlebot UA) returns `200 text/html` with Highwire `citation_*` + the OJS `generator` meta. |
| 3 | **C — THE PRIZE** | `citation_pdf_url` is on the subdomain, returns `200 application/pdf`, no login / sign-in / register redirect. This is the single most important signal Google Scholar uses. |
| 4 | C | `doi.org/<DOI>` resolves to `journals.digitopub.com`. |
| 5 | D | Apex article page (Googlebot UA) emits **zero** `citation_*` tags, zero `ScholarlyArticle` JSON-LD, and its `<link rel="canonical">` points at the subdomain. |
| 6 | C | `submitmanager.com/.../article/view/<id>` returns `301` with `Location:` on the subdomain. |
| 7 | **T2 lock** | A cover, an editorial photo, and a Highlights image each return `200 image/*` through `/api/image-proxy` — proves the image pipeline survives the cutover. |
| 8 | **T3 lock** | The Highlights "Explore More" Scholar link renders `?hl=en&user=...` with **no** `&amp;` — proves HTML-entity decoding survives the cutover. |

### Reading the output

Each check prints a coloured `PASS` or `FAIL` line with the criterion and a
short detail (URL, status, content-type, etc.). The summary at the bottom
reports total `PASS` / `FAIL` counts and prints **`CUTOVER VERIFIED`** when —
and only when — every single check is green.

Exit codes:

- `0` — every check passed (the cutover is done).
- `1` — at least one check failed (the matrix lists which).

### Re-running during the cutover

The script is read-only and idempotent. The expected progression:

- **Before step 4 (OJS `base_url` flip)** — most subdomain-targeted checks
  fail; this is normal. Useful as a baseline.
- **After step 4** — checks 1, 2, 3 should pass; check 5 (apex) still fails
  until step 7; check 6 (legacy 301) still fails until step 5.
- **After step 5 (this `.htaccess` applied)** — add check 6.
- **After step 6 (DOI re-deposit)** — add check 4.
- **After step 7 (apex deploy)** — add check 5 and the T2/T3 locks (7, 8).
- **End state** — all green. `CUTOVER VERIFIED`. Done.

If a check that previously passed turns red on a later run, the failure
output names the offending URL — re-run it manually with `curl -vI` to
inspect headers / Location / content-type.

---

## Rollback

- **`.htaccess` rule:** delete the block from the docroot `.htaccess`. The
  legacy host resumes serving OJS directly until DNS for `submitmanager.com`
  is changed elsewhere.
- **`verify-cutover.sh`:** deleting the file has no runtime effect. It's a
  read-only diagnostic script.

This directory contains no code that affects production behaviour by its
presence — only the operator's deliberate application does.
