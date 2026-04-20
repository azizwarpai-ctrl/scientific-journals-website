# PDF Bridge — Deployment & Diagnostics

`ojs-pdf-bridge.php` is the durable fix for the recurring
"Access permission required" error in the DigitoPub PDF viewer. It serves
PDFs directly from the OJS `files_dir` on the submitmanager.com server,
bypassing every web-level permission layer (payments plugin, hotlink rules,
session interstitials) that causes 403s on the public galley URLs.

---

## Why this is needed

The PDF viewer (`app/journals/[id]/articles/[publicationId]/components/modal-pdf-viewer.tsx`)
reaches OJS through `app/api/pdf-proxy/route.ts`, which today probes:

1. `OJS_API_KEY` + REST `/api/v1/submissions/:id/files/:fileId/download`
2. Public `/article/download/:submissionId/:galleyId[/:fileId]`
3. Legacy `/article/viewFile/:submissionId/:galleyId[/:fileId]`

Any of those routes can return 403 when the OJS instance has:

- the **payments plugin** active (reads behind APC / subscription),
- **hotlink / Referer validation** at nginx or via a WAF,
- **session-based** interstitials (click-through, captcha, cookie consent),
- a plugin override that redirects anonymous users to the login page.

The PHP bridge sidesteps all of them by reading the file straight off the
OJS server's local filesystem.

---

## Install

1. Upload `ojs-pdf-bridge.php` **and** the adjacent `.htaccess` to the OJS
   install root (next to `index.php`, `config.inc.php`, and the existing
   `ojs-user-bridge.php`). The `.htaccess` is mandatory on Apache/SiteGround
   — without it `mod_php` silently strips the `Authorization` header and
   the bridge returns `401 AUTH_REQUIRED` for every call (the exact symptom
   the production bug reports).
2. Set the bearer token in **one** of these places:
   - env var `OJS_API_KEY` on the PHP-FPM / Apache process, or
   - `config.inc.php` under `[digitopub] api_key = <SECRET>`.
3. Ensure the PHP user can read the `[files] files_dir` path (it already can
   if OJS itself can serve galleys).
4. Lock the endpoint down with a firewall/WAF rule allowing only your
   Next.js server's IP — defence in depth on top of the Bearer check.

### Optional env knobs

| Env var                            | Purpose                                                            |
| ---------------------------------- | ------------------------------------------------------------------ |
| `OJS_API_KEY`                      | Shared Bearer token (see step 2)                                   |
| `OJS_CONFIG_PATH`                  | Absolute path to `config.inc.php` if not adjacent to the bridge    |
| `OJS_PDF_BRIDGE_ALLOW_STATUSES`    | Comma-separated OJS submission statuses to serve (default: `3`)    |

## Wire it to Next.js

Set these env vars on the Next.js deployment:

```
OJS_API_KEY=<same secret as the bridge>
OJS_PDF_BRIDGE_URL=https://submitmanager.com/ojs-pdf-bridge.php
```

When `OJS_PDF_BRIDGE_URL` is present, `app/api/pdf-proxy/route.ts` attempts
the bridge first. If the bridge returns a PDF, the viewer renders it; if the
bridge fails (misconfigured / offline / missing file), the proxy falls back
to the existing REST API + public URL ladder, so nothing regresses.

---

## Request contract

```
GET  /ojs-pdf-bridge.php
     ?journal=<journal_path>
     &submissionId=<int>
     &galleyId=<int>
     [&fileId=<int>]
Authorization: Bearer <OJS_API_KEY>
```

| Status | Meaning                                                   |
| ------ | --------------------------------------------------------- |
| 200    | `application/pdf` stream                                  |
| 400    | bad parameters                                            |
| 401    | Authorization header missing                              |
| 403    | invalid key / submission not published / mismatch         |
| 404    | journal / submission / galley / file not found on disk    |
| 415    | file on disk is not a PDF                                 |
| 500    | `config.inc.php` or `files_dir` unreadable, disk error    |

Errors respond with JSON plus an `X-PDF-Bridge-Error` header that the
Next.js proxy maps to its own `X-Proxy-Error` taxonomy.

---

## Safety guarantees

- **Auth-first.** Bearer token via `hash_equals` — no early returns, no
  timing leak.
- **Scoped to published content.** Only serves submissions with
  `submissions.status = 3` (PUBLISHED) belonging to the requested journal.
- **Galley↔submission cross-check.** Even with a valid Bearer, the bridge
  refuses if the galley's publication doesn't belong to `submissionId`.
- **Path-traversal safe.** Resolves the candidate path with `realpath()`
  and verifies it stays inside `files_dir`.
- **PDF validation.** Rejects non-PDF files via magic-byte check
  (`%PDF…`) or mimetype before streaming.
- **No writes, no exec, no shell.** Pure read path — PDO + `fopen`.

---

## Diagnosing `AUTH_REQUIRED` with the bridge installed

If the viewer still shows

```json
{"error":"AUTH_REQUIRED","message":"This file requires access permission on the source server.","status":403}
```

after the bridge is installed, walk the bridge's own diagnostics in order:

1. **Hit `?debug=1`.** Any authenticated caller (same Bearer) can request
   `…/ojs-pdf-bridge.php?journal=…&submissionId=…&galleyId=…&debug=1` and
   get a JSON trace of every resolution step (journal → submission →
   galley → file on disk). The step that fails names the exact reason.
   This endpoint never streams content, so it's safe to run in prod.

2. **Check the Next.js proxy response.** The proxy now forwards the
   bridge's `X-PDF-Bridge-Error` header and JSON body fields
   (`bridgeError`, `bridgeDetails`) to the client. Look at the network
   response body rather than the rendered "AUTH_REQUIRED" text — the
   real code will be one of:
   - `INVALID_KEY` — Bearer mismatch. Re-check `OJS_API_KEY` on both sides.
   - `UNPUBLISHED` — submission is not status=3. Either publish, or set
     `OJS_PDF_BRIDGE_ALLOW_STATUSES=3,5` for scheduled content.
   - `JOURNAL_NOT_FOUND` / `SUBMISSION_NOT_FOUND` — param mismatch; check
     `journals.path` and `submissions.submission_id` directly.
   - `SUBMISSION_MISMATCH` — the galley belongs to a different submission.
   - `FILE_NOT_FOUND` — `files.path` resolves outside `files_dir` or the
     file was deleted from disk.
   - `SERVER_MISCONFIGURED` — config.inc.php missing/unparseable, or
     `files_dir` unreadable.

3. **Apache strips `Authorization`?** If the Next.js log shows the bridge
   returning `AUTH_REQUIRED` on the first call even though `OJS_API_KEY`
   matches, Apache is dropping the header. Install the adjacent
   `.htaccess` (ships in this directory). SiteGround, cPanel-Apache, and
   some PHP-FPM builds all need it.

4. **Log output.** `error_log` lines prefixed `[PDF-Bridge]` are emitted
   for every failure path and for each successful stream. Tail the PHP
   error log on submitmanager.com — a missing line for your request
   proves the request never reached PHP (WAF / rewrite issue).

---

## Diagnostic checklist (when errors persist without the bridge)

Run these to narrow down which layer is blocking the current proxy path:

1. **Is `OJS_API_KEY` set on the Next.js server?**
   Without it, the REST API branch is skipped and only public galley URLs
   are tried — those are what get blocked by hotlink/payments plugins.
   Check: `echo $OJS_API_KEY` on the Next.js host.

2. **Is the API key valid in OJS?** The key must correspond to a
   user with publisher rights in the target journal's context.
   Check: in OJS, Journal Manager → Users & Roles → find the user tied to
   the key and confirm they have the Manager or Editor role in the journal.

3. **Does the payments plugin gate downloads?**
   Check: OJS → Website → Plugins → Generic → Payments. If "Fee-based
   article access" is enabled, public galley URLs *always* 403 for
   unauthenticated clients — the bridge is the only clean fix.

4. **Does the OJS server enforce Referer/hotlink rules?**
   Tail the OJS nginx/apache access log while you click "View PDF" and
   look for the proxy's request. If it hits `/article/download/...` and
   returns 403 with no body, it's a hotlink rule.

5. **Is CDN / Cloudflare caching the 403?**
   Look for a `cf-cache-status: HIT` or similar header on failed
   responses; purge the cache for the affected path and retry.

6. **Is the file actually on disk?** SSH to submitmanager.com and:
   ```sh
   cd "$(php -r 'require_once "config.inc.php"; $c=parse_ini_file("config.inc.php",true); echo $c["files"]["files_dir"];')"
   find journals/<context_id>/articles/<submission_id> -type f
   ```
   If the file is missing, neither the bridge nor the proxy can serve it —
   re-upload the galley.

---

## Rollback

Delete `ojs-pdf-bridge.php` from the OJS host **or** unset
`OJS_PDF_BRIDGE_URL` on the Next.js deployment. The proxy falls back to
the prior REST + public URL ladder with no code change.
