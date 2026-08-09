# OJS Legacy Metrics Backfill — Runbook

One-time seeding of OJS's cumulative view/download/citation totals into
`metrics_article_monthly` under `source='ojs_legacy_backfill'`, executed from a
workstation against the production databases. The admin timeseries chart
excludes this source by design; it feeds cumulative totals only.

## Preconditions

1. Workstation shell has (never commit these):
   ```bash
   export DATABASE_URL="mysql://…"          # production digitopub DB (Hostinger remote MySQL)
   export OJS_DATABASE_HOST=… OJS_DATABASE_PORT=3306 OJS_DATABASE_NAME=… \
          OJS_DATABASE_USER=… OJS_DATABASE_PASSWORD=…   # SiteGround, SELECT-only user
   ```
2. Workstation IP whitelisted for BOTH: Hostinger Remote MySQL and SiteGround
   Remote MySQL (Site Tools).
3. Connectivity: `bun run scripts/verify-ojs-connection.ts` passes.

## Safety checks (read-only, record outputs)

```sql
-- digitopub DB: must both be 0
SELECT COUNT(*) FROM metrics_article_monthly WHERE source='ojs_legacy_backfill';
SELECT COUNT(*) FROM sync_runs WHERE job_name='ojs-legacy-backfill';
```

## Dry run

```bash
bun run scripts/backfill-ojs-metrics.ts --dry-run --launch-month=YYYY-MM
```

Pin `--launch-month` explicitly (the month UIET-P1 event collection went live);
never rely on the current-month default. Review the printed per-journal totals
table — it must match expectations from OJS's own statistics pages.

## Execute (once)

```bash
bun run scripts/backfill-ojs-metrics.ts --confirm-once --launch-month=YYYY-MM
```

The script aborts if legacy rows already exist (idempotency guard) and records
the run in `sync_runs` (`job_name='ojs-legacy-backfill'`, `triggered_by='manual'`).

## Verify

```sql
SELECT COUNT(*) FROM metrics_article_monthly WHERE source='ojs_legacy_backfill';
-- must equal the dry-run "Rows to insert" figure
SELECT status, stats FROM sync_runs WHERE job_name='ojs-legacy-backfill';
-- status = success
```

The admin dashboard sync-health widget should list the run.

## Rollback (only if the numbers were wrong)

```sql
DELETE FROM metrics_article_monthly WHERE source='ojs_legacy_backfill';
```

Safe: the source tag is exclusive to this script. Then fix and re-run the
whole procedure.
