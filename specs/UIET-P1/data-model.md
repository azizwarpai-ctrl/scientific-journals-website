# Data Model: UIET-P1

**Feature**: ORCID Identity, Engagement Tracking, OA-Aware PDF Gating
**Spec**: [./spec.md](./spec.md)
**Plan**: [./plan.md](./plan.md)
**Date**: 2026-05-12

## Overview

Seven new tables on the digitopub MySQL database. No changes to the existing OJS database schema (except the single feature-flagged `user_settings.orcid` INSERT path described in `plan.md`).

All BigInt fields MUST be serialized via `serializeRecord()` or `serializeMany()` from `src/lib/serialize.ts` before being returned as JSON. All new tables follow the existing convention: `@id @default(autoincrement())` BigInt primary keys, snake_case columns, `@@map` to plural snake_case table names.

| Table | Purpose | Approx. rows / year |
|---|---|---|
| `user_event` | Raw engagement log (view / download / citation_export) | ≤ 5 M |
| `metrics_article_daily` | Daily aggregates per article | ≤ 200 k |
| `metrics_article_monthly` | Monthly roll-up per article | ≤ 15 k |
| `user_metrics` | Lifetime per-ORCID totals | ≤ 100 k |
| `revoked_orcids` | ORCIDs whose data has been deleted | ≤ 1 k |
| `user_orcid_links` | digitopub-side `orcid → ojs_user_id` cache | ≤ 100 k |
| `audit_ojs_writes` | Append-only audit log of every write digitopub performed on OJS | ≤ 100 k |

---

## 1. `user_event` — Raw event log

```prisma
model UserEvent {
  id            BigInt   @id @default(autoincrement())
  orcid         String?  @db.VarChar(19)        // "0000-0001-2345-6789" or NULL
  ip_hash       String?  @db.Char(64)            // SHA-256 hex (lowercase) or NULL
  ua_hash       String?  @db.Char(64)            // SHA-256 hex (lowercase) or NULL
  article_id    BigInt                            // OJS publication_id
  journal_id    BigInt                            // OJS journal_id
  galley_id     BigInt?                           // download events only
  event_type    String   @db.VarChar(32)          // 'view' | 'download' | 'citation_export'
  source        String   @db.VarChar(32)          // 'article_page'|'pdf_view'|'essential_only'|'pre_consent'|'ris'|'bibtex'|'plain'|'all'
  citation_format String? @db.VarChar(16)         // citation_export only: 'vancouver'|'apa'|'ris'|'bibtex'
  event_meta    Json?
  dedup_key     String   @db.Char(64)             // SHA-256(orcid || '|' || ip_hash) — never NULL
  view_day      String?  @db.Char(10)             // 'YYYY-MM-DD' UTC, for view dedup uniqueness
  created_at    DateTime @default(now())

  @@unique([article_id, event_type, dedup_key, view_day], name: "uq_view_dedup", map: "uq_user_event_view_dedup")
  @@index([orcid, created_at])
  @@index([article_id, event_type, created_at])
  @@index([created_at])
  @@map("user_event")
}
```

**Notes**:
- `dedup_key = SHA-256(orcid || '|' || ip_hash || '|' || ua_hash)`. Never NULL: if everything is anonymized (`pre_consent` or `essential_only`), `dedup_key = SHA-256('|' || ip_hash_or_constant)` so we can still measure cardinality.
- For pre-consent + first-30-days mode, `ip_hash` is NULL but we substitute a constant `'anonymous'` token in `dedup_key` so all anonymous pre-consent events fall into one bucket (intentional — we cannot dedup unidentified visitors per-person).
- `view_day` is populated only for view rows (`event_type='view'`). For other event types it is NULL. The unique constraint thus uniquely enforces "one view per (article, identity, UTC day)" without affecting downloads / citations.
- `galley_id` is BigInt to match OJS conventions. Nullable because views and citation exports do not have galleys.
- Why a `view_day` text column instead of `DATE(created_at)`? MySQL prior to 8.0 did not support functional indexes; the explicit column is portable across MySQL/MariaDB and avoids index-impl edge cases.

## 2. `metrics_article_daily` — Daily aggregates

```prisma
model MetricsArticleDaily {
  id                BigInt   @id @default(autoincrement())
  article_id        BigInt
  journal_id        BigInt
  day               String   @db.Char(10)         // 'YYYY-MM-DD' UTC
  views             Int      @default(0)
  unique_views      Int      @default(0)
  downloads         Int      @default(0)
  unique_downloads  Int      @default(0)
  citations         Int      @default(0)
  source            String   @default("digitopub") @db.VarChar(32)  // 'digitopub'|'ojs_legacy_backfill'
  computed_at       DateTime @default(now())

  @@unique([article_id, day, source], map: "uq_daily_article_day_source")
  @@index([journal_id, day])
  @@index([day])
  @@map("metrics_article_daily")
}
```

**Notes**:
- A nightly job upserts one row per `(article_id, day, source='digitopub')`. The backfill script writes rows with `source='ojs_legacy_backfill'`.
- Unique on `(article_id, day, source)` so re-running the nightly job is idempotent.

## 3. `metrics_article_monthly` — Monthly roll-up

```prisma
model MetricsArticleMonthly {
  id                BigInt   @id @default(autoincrement())
  article_id        BigInt
  journal_id        BigInt
  year              Int                            // e.g., 2026
  month             Int                            // 1..12
  views             Int      @default(0)
  unique_views      Int      @default(0)
  downloads         Int      @default(0)
  unique_downloads  Int      @default(0)
  citations         Int      @default(0)
  source            String   @default("digitopub") @db.VarChar(32)
  computed_at       DateTime @default(now())

  @@unique([article_id, year, month, source], map: "uq_monthly_article_year_month_source")
  @@index([journal_id, year, month])
  @@index([year, month])
  @@map("metrics_article_monthly")
}
```

**Notes**:
- Sidebar `MetricCard` reads SUM here filtered by `article_id`. The monthly granularity is sufficient for "all-time totals" display because rows aggregate forever.
- Monthly job runs on the 1st of each month UTC 03:00. The backfill writes a single `source='ojs_legacy_backfill'` row dated 1 month before deploy.

## 4. `user_metrics` — Lifetime per-ORCID totals

```prisma
model UserMetrics {
  orcid             String   @id @db.VarChar(19)
  views             Int      @default(0)
  downloads         Int      @default(0)
  citations         Int      @default(0)
  first_seen_at     DateTime
  last_event_at     DateTime
  updated_at        DateTime @default(now()) @updatedAt

  @@index([last_event_at])
  @@map("user_metrics")
}
```

**Notes**:
- Updated by the nightly aggregation job, not in real time (to avoid per-event UPDATE contention).
- `orcid` is the primary key (one row per researcher), allowing fast `/account/stats` lookups.
- Deleted in full when `/api/account/data` (DELETE) is invoked.

## 5. `revoked_orcids` — Post-deletion blocklist

```prisma
model RevokedOrcid {
  orcid          String   @id @db.VarChar(19)
  revoked_at     DateTime @default(now())
  cookie_iat_min Int                              // unix seconds; cookies with iat < this MUST be rejected

  @@map("revoked_orcids")
}
```

**Notes**:
- When a user calls `/api/account/data` DELETE, we insert a row with `cookie_iat_min = now_seconds`. The identity cookie verifier checks this table on each call (cached 60 s); cookies with `iat < cookie_iat_min` are rejected even if HMAC + expiry are valid.
- Without this row, a still-valid identity cookie could keep writing events for an "erased" user.
- After 30 days the row can be expunged because all matching cookies have absolutely-expired.

## 6. `user_orcid_links` — digitopub-side ORCID↔OJS map

```prisma
model UserOrcidLink {
  id            BigInt   @id @default(autoincrement())
  orcid         String   @unique @db.VarChar(19)
  ojs_user_id   BigInt
  email_hash    String?  @db.Char(64)
  linked_at     DateTime @default(now())
  link_source   String   @db.VarChar(32)         // 'orcid_match'|'email_match'
  ojs_backfilled Boolean @default(false)

  @@index([ojs_user_id])
  @@map("user_orcid_links")
}
```

**Notes**:
- `link_source` records *how* we linked. Used to audit whether email-match (less certain) vs. orcid-match (canonical) was applied.
- `ojs_backfilled=true` iff we successfully wrote the ORCID into OJS via the audited write path. If the backfill flag was OFF at link time, this stays `false`; a maintenance job can flip it later.

## 7. `audit_ojs_writes` — Audit log

```prisma
model AuditOjsWrite {
  id                BigInt   @id @default(autoincrement())
  request_id        String   @db.VarChar(36)     // UUID per request
  orcid             String   @db.VarChar(19)
  ojs_user_id       BigInt
  ojs_table         String   @db.VarChar(64)     // 'user_settings'
  ojs_column_set    String   @db.Text             // 'setting_name=orcid; setting_value=<orcid>'
  planned_at        DateTime @default(now())
  success           Boolean?                      // NULL until resolved
  resolved_at       DateTime?
  error             String?  @db.Text
  reason            String   @db.VarChar(64)     // 'orcid_backfill'

  @@index([orcid])
  @@index([ojs_user_id])
  @@index([planned_at])
  @@map("audit_ojs_writes")
}
```

**Notes**:
- Insert with `success=NULL` BEFORE attempting the OJS write. Update to `success=true|false` AFTER. This guarantees no write to OJS is unaudited even if the audit write succeeds but the OJS write crashes the process.
- `reason` is currently always `'orcid_backfill'`; the column exists so any future audited write path adds its own reason.

---

## Prisma Migration

A single migration named `{timestamp}_uiet_p1_engagement_tracking` will:

1. CREATE TABLE for all 7 models with the exact indexes above.
2. NO modifications to any existing table.
3. NO data backfill (the backfill is a separate `bun run scripts/backfill-ojs-metrics.ts --confirm-once` invocation, not embedded in the migration).

The migration is generated by `bunx prisma migrate dev --name uiet_p1_engagement_tracking` and committed to `prisma/migrations/{timestamp}_uiet_p1_engagement_tracking/`.

### Manual SQL preview (for review)

```sql
CREATE TABLE `user_event` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `orcid` VARCHAR(19) NULL,
  `ip_hash` CHAR(64) NULL,
  `ua_hash` CHAR(64) NULL,
  `article_id` BIGINT NOT NULL,
  `journal_id` BIGINT NOT NULL,
  `galley_id` BIGINT NULL,
  `event_type` VARCHAR(32) NOT NULL,
  `source` VARCHAR(32) NOT NULL,
  `citation_format` VARCHAR(16) NULL,
  `event_meta` JSON NULL,
  `dedup_key` CHAR(64) NOT NULL,
  `view_day` CHAR(10) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_event_view_dedup` (`article_id`,`event_type`,`dedup_key`,`view_day`),
  KEY `idx_user_event_orcid_time` (`orcid`,`created_at`),
  KEY `idx_user_event_article_type_time` (`article_id`,`event_type`,`created_at`),
  KEY `idx_user_event_created_at` (`created_at`)
) ENGINE=InnoDB;

CREATE TABLE `metrics_article_daily` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `article_id` BIGINT NOT NULL,
  `journal_id` BIGINT NOT NULL,
  `day` CHAR(10) NOT NULL,
  `views` INT NOT NULL DEFAULT 0,
  `unique_views` INT NOT NULL DEFAULT 0,
  `downloads` INT NOT NULL DEFAULT 0,
  `unique_downloads` INT NOT NULL DEFAULT 0,
  `citations` INT NOT NULL DEFAULT 0,
  `source` VARCHAR(32) NOT NULL DEFAULT 'digitopub',
  `computed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_daily_article_day_source` (`article_id`,`day`,`source`),
  KEY `idx_daily_journal_day` (`journal_id`,`day`),
  KEY `idx_daily_day` (`day`)
) ENGINE=InnoDB;

CREATE TABLE `metrics_article_monthly` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `article_id` BIGINT NOT NULL,
  `journal_id` BIGINT NOT NULL,
  `year` INT NOT NULL,
  `month` INT NOT NULL,
  `views` INT NOT NULL DEFAULT 0,
  `unique_views` INT NOT NULL DEFAULT 0,
  `downloads` INT NOT NULL DEFAULT 0,
  `unique_downloads` INT NOT NULL DEFAULT 0,
  `citations` INT NOT NULL DEFAULT 0,
  `source` VARCHAR(32) NOT NULL DEFAULT 'digitopub',
  `computed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_monthly_article_year_month_source` (`article_id`,`year`,`month`,`source`),
  KEY `idx_monthly_journal_ym` (`journal_id`,`year`,`month`),
  KEY `idx_monthly_year_month` (`year`,`month`)
) ENGINE=InnoDB;

CREATE TABLE `user_metrics` (
  `orcid` VARCHAR(19) NOT NULL,
  `views` INT NOT NULL DEFAULT 0,
  `downloads` INT NOT NULL DEFAULT 0,
  `citations` INT NOT NULL DEFAULT 0,
  `first_seen_at` DATETIME(3) NOT NULL,
  `last_event_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`orcid`),
  KEY `idx_user_metrics_last_event` (`last_event_at`)
) ENGINE=InnoDB;

CREATE TABLE `revoked_orcids` (
  `orcid` VARCHAR(19) NOT NULL,
  `revoked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `cookie_iat_min` INT NOT NULL,
  PRIMARY KEY (`orcid`)
) ENGINE=InnoDB;

CREATE TABLE `user_orcid_links` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `orcid` VARCHAR(19) NOT NULL,
  `ojs_user_id` BIGINT NOT NULL,
  `email_hash` CHAR(64) NULL,
  `linked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `link_source` VARCHAR(32) NOT NULL,
  `ojs_backfilled` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orcid` (`orcid`),
  KEY `idx_ojs_user_id` (`ojs_user_id`)
) ENGINE=InnoDB;

CREATE TABLE `audit_ojs_writes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `request_id` VARCHAR(36) NOT NULL,
  `orcid` VARCHAR(19) NOT NULL,
  `ojs_user_id` BIGINT NOT NULL,
  `ojs_table` VARCHAR(64) NOT NULL,
  `ojs_column_set` TEXT NOT NULL,
  `planned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `success` BOOLEAN NULL,
  `resolved_at` DATETIME(3) NULL,
  `error` TEXT NULL,
  `reason` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_orcid` (`orcid`),
  KEY `idx_audit_ojs_user` (`ojs_user_id`),
  KEY `idx_audit_planned` (`planned_at`)
) ENGINE=InnoDB;
```

---

## Existing schema notes

- `PublishedArticle.views_count`, `downloads_count`, `citations_count`: **kept** for backward compatibility with legacy seed data, but no new code writes to them. A code comment on the Prisma model documents the deprecation: `/// DEPRECATED — use metrics_article_monthly. Retained for backward compatibility with legacy seed data.`
- `AdminUser.orcid`: existing column on `admin_users`. This is the *admin's own* ORCID (e.g., editor's display profile), wholly unrelated to the public-user ORCID flow. We do not touch it.
- `OjsSsoToken`: existing model for the registration-time SSO handoff. Unrelated to the new identity layer. Untouched.

---

## Serialization

Every endpoint returning rows from these new tables MUST pass the result through `serializeRecord()` / `serializeMany()`:

```ts
import { serializeMany, serializeRecord } from '@/src/lib/serialize'

// Single row
const row = await prisma.userMetrics.findUnique({ where: { orcid } })
return c.json({ success: true, data: row ? serializeRecord(row) : null })

// Array
const rows = await prisma.metricsArticleMonthly.findMany({ where: ... })
return c.json({ success: true, data: serializeMany(rows) })
```

The only fields needing serialization are `BigInt`s (`id`, `article_id`, `journal_id`, `galley_id`, `ojs_user_id`). String, JSON, and DateTime are JSON-safe by default.
