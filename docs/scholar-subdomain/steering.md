# Steering — One-Page Command Sheet

The single page to glance at to know what's happening, who's doing it, and what
the next prize is. Pair with `README.md` for context, `data-flow.md` for the
diagrams, `TASKS.md` for live status, `working-agreement.md` for lifecycle.

---

## Ownership at a glance

| Human ([ops] — approve, perform, confirm) | Claude Code ([repo] — implement in dependency order) |
| ----------------------------------------- | ---------------------------------------------------- |
| Approve every PR before merge.            | **T0** Docs kickoff. ✅                              |
| Perform DNS A record `journals.digitopub.com → SiteGround IP`. | **T1** OJS host single-source + apex canonical → subdomain. ✅ in-review |
| Perform SiteGround alias + Let's Encrypt SSL. | **T7** `parseOjsFilename` test refresh. ✅ in-review |
| Confirm HTTPS serves OJS on the subdomain. | **T8** Remove stray `test-parse.js`. ✅ in-review    |
| Flip OJS `base_url` + clear caches. (**One-way door.**) | **T2** Image pipeline — one resolver + one render path. |
| Apply Apache 301 from `submitmanager.com`. | **T3** HTML-entity link decoding in custom blocks.  |
| Re-deposit DOIs at Crossref.              | **T4** Generate `.htaccess` + `verify-cutover.sh`.   |
| Deploy apex env → subdomain (after subdomain SSL is up). | **T6** (repo half) Apex env deploy, sitemap wiring. |
| Add GSC property + submit OJS sitemap.    |                                                      |
| Run `verify-cutover.sh` until the matrix is green.   |                                            |

## Safety rule

> **Nothing public changes until the subdomain resolves with SSL.** Stages A
> and B are entirely reversible from a visitor's point of view; the apex still
> ships, OJS still ships, no URLs change. The **OJS `base_url` flip in Stage C
> is the only one-way door** — once the OJS install starts emitting
> `journals.digitopub.com` URLs in its HTML, sitemaps, and feeds, crawlers will
> begin recording the new host. Reverting after that requires re-flipping
> `base_url`, clearing caches again, and waiting for Scholar to recrawl.
> Don't open that door until A and B are green and the subdomain has been
> verified end-to-end at HTTPS.

---

## The four stages, integrated

### Stage A — Green baseline ✅ done

Repo state where every guardrail is in place and every signal is honest.

- Outputs: T0 docs, T1 host single-source + apex canonical, T7/T8 baseline fixes.
- Tests: 517/517. `tsc --noEmit`: 0 errors. `bun run lint`: 0 errors / 76 warnings.
- No `submitmanager.com` literal in `app/` or `src/` (comments excepted).
- Apex emits no `citation_*` (gated by `EMIT_SCHOLAR_CITATION_META`, default `false`).
- `robots.ts` continues to `Disallow: /api/`. `/api/pdf-proxy` untouched.

**Prize: a trustworthy CI floor.** Every later task lands on a green baseline,
so a regression is unambiguous — it's _this PR's_ doing, not noise from the
previous merge.

### Stage B — Repo correctness

The latent defects that would corrupt the new subdomain surface if shipped uncovered.

- T2 — one resolver + one render path for every OJS image; `<OjsImage>`
  empirically survives the hotlink/WAF; covers, editorial photos, Highlights
  migrated; ESLint guard against raw `<img src={ojs…}>`.
- T3 — `extractCardFields()` and `extractLinksFromBiography()` decode HTML
  entities in `href`/`src`; multi-param URLs (`?hl=en&user=`) round-trip.
- T4 — generate `docs/ops/submitmanager-301.htaccess` (host-conditional 301)
  and `docs/ops/verify-cutover.sh` (the matrix script).

**Prize: T4's `.htaccess` + `verify-cutover.sh` artifacts.** Once these
artifacts exist, the human has everything they need to step through Stage C
without reading code. The verification script is the contract between [repo]
and [ops] — it converts "I think it works" into "the matrix says it works".

### Stage C — Cutover

Ordered, mostly-reversible steps from a clean subdomain to the visible pivot.

1. DNS A record live for `journals.digitopub.com`. *(reversible)*
2. SiteGround domain alias + Let's Encrypt SSL serving 200. *(reversible)*
3. HTTPS on subdomain serves current OJS, no broken assets. *(reversible)*
4. **OJS `base_url` flip + clear caches.** *(one-way door)*
5. Apache 301 from `submitmanager.com` → `https://journals.digitopub.com$1`.
6. Re-deposit DOIs at Crossref; sample DOI resolves to subdomain.

**Prize: `citation_pdf_url` = a same-host open PDF on
`journals.digitopub.com`.** That's the single signal Google Scholar uses to
decide where the record lives. When `verify-cutover.sh` shows
`citation_pdf_url` points at the subdomain and the URL returns 200
`application/pdf` from the same host, Stage C has landed.

### Stage D — Convergence

The long tail: deploy the apex with the new env, wire up monitoring, prove the
record is solid on every channel.

- Apex env `OJS_BASE_URL` / `PUBLIC_OJS_BASE_URL` / `NEXT_PUBLIC_OJS_BASE_URL`
  → subdomain. Canonical, JSON-LD `sameAs`, internal links all match.
- GSC property added; OJS sitemap submitted.
- OJS error pages and log hygiene reviewed.
- Open-access audit of all 12 journals (each has `citation_*` + 200 PDF on subdomain).
- `verify-cutover.sh` matrix fully green; Scholar recrawl monitored.

**Prize: DOI resolves to the subdomain.** A persistent identifier in the
external system (Crossref) now points at the new host, and Scholar has
re-indexed at least one article from there. The initiative is "done" the
moment that round-trip succeeds end-to-end.

---

## Where we are right now

```
A ─█████████─  done
B ─░░░░░░░░░─  next: T2 image pipeline
C ─░░░░░░░░░─  blocked-on-ops (T4 artifacts not yet generated)
D ─░░░░░░░░░─  not started
```
