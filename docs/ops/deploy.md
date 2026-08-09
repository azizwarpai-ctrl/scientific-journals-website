# Deploying digitopub.com (Hostinger)

Documented 2026-08-08 from live-host inspection (see [`discovery-2026-08.md`](./discovery-2026-08.md)).

## How production actually runs

- Passenger/LiteSpeed serves the app from `~/domains/digitopub.com/nodejs/` using a
  **generated** `server.js` (Next standalone launcher) — NOT `bun run start` / `next start`.
- Node 20.19.4 via `PassengerNodejs /opt/alt/alt-nodejs20/root/bin/node`.
- Environment variables live in `~/domains/digitopub.com/public_html/.builds/config/.env`,
  managed through hPanel. There is no `.env` in the app root.
- Builds go through Hostinger's managed pipeline under `public_html/.builds/`
  (source checkout → build → standalone output copied to `nodejs/`).

## Pre-deploy checklist

- [ ] CI green on `main` — including the `e2e` Playwright job.
- [ ] Production env (`.builds/config/.env` via hPanel) contains everything the
      release needs. **Known gaps as of 2026-08 discovery:** `CRON_SECRET` and
      all UIET-P1 identity secrets are MISSING — cron endpoints and ORCID
      sign-in fail closed until they are added.
- [ ] hPanel/external cron entries match [`cron-schedule.md`](./cron-schedule.md).
- [ ] Any new migration is additive-safe (project policy) — check
      `prisma/migrations/` diff since the last deploy.
- [ ] Optional: Lighthouse budget run per [`lighthouse.md`](./lighthouse.md).

## Deploy procedure

1. Merge to `main`; CI (`.github/workflows/ci.yml`) must be green.
2. Trigger the Hostinger build (hPanel → website → Deploy, or the configured Git integration).
3. **Migrations**: the build script runs `prisma migrate deploy` when `DATABASE_URL` is present
   in the build environment. If the build environment cannot reach the DB, run migrations
   from a workstation against the remote Hostinger MySQL instead:
   ```bash
   DATABASE_URL="mysql://…" bunx prisma migrate deploy
   ```
   (Remote MySQL access is enabled on the Hostinger DB — see `docs/hostinger_deployment_report.md`.)
4. Restart Passenger:
   ```bash
   ssh hostinger 'touch ~/domains/digitopub.com/nodejs/tmp/restart.txt'
   ```
5. Smoke-verify:
   ```bash
   curl -fsS https://digitopub.com/api/ojs/health
   # New endpoints fail closed — 401 without credentials proves they're wired:
   curl -s -o /dev/null -w "%{http_code}\n" https://digitopub.com/api/admin-analytics/sync-health   # expect 401
   curl -s -o /dev/null -w "%{http_code}\n" -X POST https://digitopub.com/api/metrics/cron/daily     # expect 401
   bash docs/ops/verify-cutover.sh   # full read-only matrix
   ```

## Rollback

Hostinger keeps the previous source snapshot in `public_html/.builds/last-source/`.
Re-deploy the previous commit through the same pipeline, or restore via hPanel's
deployment history, then `touch tmp/restart.txt` again. Migrations are additive-only
by policy (see overhaul plan); `prisma migrate resolve --rolled-back <name>` if a
migration must be withdrawn.

## Cron / scheduling

The host has **no user crontab**. Recurring jobs must be scheduled via hPanel Cron Jobs
or an external HTTP scheduler hitting the Bearer-protected endpoints — see
[`cron-schedule.md`](./cron-schedule.md). `CRON_SECRET` must be set in the production env
(it is currently missing — see discovery doc).
