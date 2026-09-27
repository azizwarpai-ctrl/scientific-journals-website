# OJS PDF Pipeline

How article PDFs get from the OJS server (submitmanager.com / journals.digitopub.com) to the reader's browser on digitopub.com, and how to diagnose display failures.

## Why a pipeline exists at all

OJS stores galley files in `files_dir`, which lives **outside** the web root (`/home/customer/www/submitmanager.com/ojs_files`) — PDFs have no direct static URL. OJS's public endpoints (`/article/download/{s}/{g}/{f}`) force `Content-Disposition: attachment` (breaks inline iframe rendering) and can be blocked by the payments plugin, hotlink rules, or WAF interstitials.

## The canonical pieces

- `src/features/journals/server/ojs-galley-utils.ts` — `buildGalleyDownloadUrl()` builds the viewer URL: `/api/pdf-proxy?journal=…&submissionId=…&galleyId=…&fileId=…`. Returns `null` (UI shows "PDF not available") when `submission_file_id` is missing or a `remote_url` galley points elsewhere.
- `src/features/ojs/utils/ojs-config.ts` — `buildOjsArticleDownloadUrl()` builds the clean OJS `/article/download/{s}/{g}` URL used for the Download button and citation metadata. **Never** expose `/api/pdf-proxy` in SEO surfaces (`citation-meta.ts`, `article-jsonld.tsx` enforce this; `app/robots.ts` disallows `/api/`).
- `app/api/pdf-proxy/route.ts` — the same-origin proxy. Two upstream strategies, in order:
  - **Path 0 — PDF bridge** (`ojs-pdf-bridge.php` on the OJS server): authenticated with `Authorization: Bearer $OJS_API_KEY`; resolves galley → submission_file in the DB, verifies the submission is PUBLISHED, streams from `files_dir`. Bypasses all OJS permission layers. Skipped when `OJS_API_KEY` is unset. Redirects are followed manually (max 3 hops) only to OJS-owned hosts (`resolveOjsRedirectTarget` in `src/features/ojs/utils/ojs-hosts.ts`) so stale aliases can't disable the bridge and the Bearer key never leaks cross-host. 429 is terminal.
  - **Path 1 — web URL fallback**: fetches `/article/download/{s}/{g}/{f}` with a browser UA. Works for open galleys but is exposed to payments-plugin/WAF interference — this is the fragile path the bridge replaces.
- `modal-pdf-viewer.tsx` + `pdf/use-pdf-modal.ts` — the viewer. On open, the client probes the proxy URL and reads `X-Proxy-Error` before mounting the sandboxed iframe.

## Bridge contract (`ojs-pdf-bridge.php` on the OJS server)

```
GET /ojs-pdf-bridge.php?journal=<path>&submissionId=<id>&galleyId=<id>&fileId=<submission_file_id>
Authorization: Bearer <OJS_API_KEY>
```

- `OJS_API_KEY` must match on both sides: the Next.js env, and either the PHP process env or `[digitopub] api_key` in `config.inc.php`.
- Deployed at the OJS **web root** (next to `index.php`) — NOT under `/ojs/`. The legacy `/ojs/` path 301-redirects; before redirect-following was added, that stale URL silently disabled the bridge (issue #171).
- Success: `200 application/pdf`. Errors: JSON with `400/401/403/404/429/500`.
- Response header `X-Proxy-Path` tells you which path served the request: `bridge`, `bridge-429`, or `web-url`. **Healthy production = `bridge`.**

## Environment variables

| Var | Purpose |
|---|---|
| `OJS_API_KEY` | Shared Bearer token; bridge skipped entirely when unset |
| `OJS_BRIDGE_URL` | Full bridge URL; if unset, `OJS_PDF_BRIDGE_URL`, else `${OJS_BASE_URL}/ojs-pdf-bridge.php` |
| `OJS_BASE_URL` | Canonical OJS origin; also drives Path 1 and clean download URLs |

## Verifying production

```bash
curl -sI "https://digitopub.com/api/pdf-proxy?journal=ojmr&submissionId=34&galleyId=35&fileId=66"
# expect: 200, content-type: application/pdf, x-proxy-path: bridge
```

If `x-proxy-path: web-url`, the bridge fell through — check the app logs for `[pdf-proxy] bridge fall-through` / `bridge redirect not followed`, then verify `OJS_BRIDGE_URL` and that both servers hold the same `OJS_API_KEY` (compare `sha256` hashes, never print the key).

## Tests

- `tests/unit/pdf-proxy-bridge-url.test.ts` — bridge URL precedence, query params, and the redirect policy (same-host/alias followed; foreign host, http downgrade, and missing/garbage `Location` refused).
