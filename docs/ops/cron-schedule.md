# Recurring Job Schedule

The production host has **no user crontab** (see [`discovery-2026-08.md`](./discovery-2026-08.md)).
All recurring jobs are exposed as Bearer-protected HTTP endpoints and must be scheduled via
**hPanel → Advanced → Cron Jobs** (curl commands) or an external scheduler (e.g. cron-job.org).

Every endpoint:
- requires `Authorization: Bearer $CRON_SECRET` (timing-safe compare; 401 otherwise) —
  **`CRON_SECRET` must be added to the production env first, it is currently missing**;
- holds a self-expiring DB lock (5 min) — concurrent/rapid retries get **429**;
- writes a `sync_runs` ledger row (job name, trigger, status, stats, error) for observability;
- returns **200** on success, **207** on partial completion (the next tick resumes).

## Schedule

| Job | Endpoint | Schedule (UTC) | Notes |
| --- | --- | --- | --- |
| OJS journals sync + snapshots | `GET /api/ojs/sync` | `*/15 * * * *` | Skips via 503 when `OJS_SYNC_ENABLED=false`. Includes soft-delete pass + `ojs_journal_snapshots` refresh (watermark-gated, usually a no-op). |
| Daily metrics aggregation | `POST /api/metrics/cron/daily` | `0 2 * * *` | Previous UTC day; `?day=YYYY-MM-DD` to re-run a specific day. Idempotent. |
| Monthly metrics rollup | `POST /api/metrics/cron/monthly` | `0 3 1 * *` | Previous UTC month; `?month=YYYY-MM` override. Idempotent. |
| User (ORCID) lifetime metrics | `POST /api/metrics/cron/user` | `0 4 * * *` | After daily aggregation. |
| Event retention cleanup | `POST /api/metrics/cron/retention` | `0 5 * * 0` | ~18-month retention. 50 s soft deadline per run; 207 = more to delete next week (or run again). |

## Exact commands (hPanel cron / external scheduler)

```bash
# every 15 minutes
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://digitopub.com/api/ojs/sync

# daily 02:00 UTC
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://digitopub.com/api/metrics/cron/daily

# monthly, 1st 03:00 UTC
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://digitopub.com/api/metrics/cron/monthly

# daily 04:00 UTC
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://digitopub.com/api/metrics/cron/user

# weekly, Sunday 05:00 UTC
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://digitopub.com/api/metrics/cron/retention
```

If hPanel cron cannot run `curl` with headers, use cron-job.org (supports custom headers);
the endpoints are safe to expose since they fail closed without the secret.

## CLI fallbacks (same logic, same ledger)

Each job also has a CLI wrapper for manual runs from a workstation with a production
`DATABASE_URL` (and `OJS_DATABASE_*` for the sync):

```bash
bun run ojs:sync
bun run scripts/aggregate-daily-metrics.ts [--day=YYYY-MM-DD]
bun run scripts/aggregate-monthly-metrics.ts [--month=YYYY-MM]
bun run scripts/update-user-metrics.ts
bun run scripts/retention-cleanup.ts
```

## Observability

`SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 20;` — or Prisma Studio →
`sync_runs`. A failure streak on `ojs_journals_sync` most likely means the SiteGround
Remote-MySQL whitelist dropped the app's outbound IP (see discovery doc, risk #1).
