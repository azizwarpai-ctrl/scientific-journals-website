# UIET-P1 API Contracts

OpenAPI 3.1 specifications for every new endpoint introduced by this feature.

| File | Endpoints | Purpose |
|---|---|---|
| [`auth-orcid.yaml`](./auth-orcid.yaml) | `/api/auth/orcid/{start,callback,whoami,refresh,logout}` | ORCID OAuth flow, identity cookie management |
| [`metrics.yaml`](./metrics.yaml) | `/api/metrics/events/{view,download,citation}` | Engagement event ingestion (rate-limited, consent-aware) |
| [`account.yaml`](./account.yaml) | `/api/account/{stats,data}` | Self-service stats + right-to-erasure deletion |

## Naming convention

All new endpoints are namespaced under `/api/auth/orcid/*`, `/api/metrics/events/*`, and `/api/account/*` to avoid collision with the existing admin auth router (`/api/auth/login`, `/api/auth/logout`) and the existing site-stats router (`GET /api/metrics/`).

## Validation

All request bodies/params are validated server-side via `@hono/zod-validator` against a Zod schema mirroring each `requestBody`/`parameters` block above. BigInt fields are accepted as numeric strings in JSON and converted with `BigInt(value)` after validation.

## Error envelope

Every error response uses:

```json
{ "success": false, "error": "<CODE>", "message": "Human-readable explanation" }
```

The `error` field is from a fixed enum per endpoint (see each YAML); the `message` field is for end-user display.

## Status code conventions

- **200** — success (including dedup'd writes; `deduped: true` flag distinguishes).
- **204** — never used; we always return a body.
- **302** — only OAuth flow endpoints (`/start`, `/callback`).
- **400** — request schema invalid or OAuth state invalid/expired/reused.
- **401** — missing or invalid identity cookie (where required).
- **403** — account explicitly disabled in OJS.
- **429** — rate limit exceeded; `Retry-After` header always present.
- **502** — upstream (ORCID) failure.
- **500** — internal error; logged with request id.
