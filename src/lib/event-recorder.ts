/**
 * Engagement event recorder with idempotency rules:
 *   - view: dedup per (article, identity-or-iphash, UTC day)
 *   - download: dedup per (article, galley, identity-or-iphash) within 30 s
 *   - citation_export: no dedup
 *
 * Consent honored via `effectiveConsentMode`:
 *   - all              -> rows include ip_hash + ua_hash
 *   - essential_only   -> rows have NULL ip_hash/ua_hash, source = 'essential_only'
 *                         (unless caller supplied a more specific source)
 *   - pre_consent      -> rows have NULL orcid, NULL ip_hash/ua_hash,
 *                         source = 'pre_consent'
 */

import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "./db/config"
import { dayKey } from "./ip-hash"
import { effectiveConsentMode, type ConsentPayload } from "./consent"

export type EventType = "view" | "download" | "citation_export"

export const DOWNLOAD_DEDUP_WINDOW_SECONDS = 30

const ANONYMOUS_TOKEN = "anonymous"

export interface RecordEventInput {
  orcid: string | null
  ip: string | null
  ua: string | null
  ipHash: string | null
  uaHash: string | null
  articleId: bigint | number
  journalId: bigint | number
  galleyId?: bigint | number | null
  eventType: EventType
  source: string
  citationFormat?: string | null
  eventMeta?: Record<string, unknown> | null
  consent: ConsentPayload | null
  /** Override "now" for deterministic tests. */
  now?: Date
}

export interface RecordEventResult {
  recorded: boolean
  deduped: boolean
}

function dedupKey(orcid: string | null, ipHash: string | null, uaHash: string | null): string {
  const components = [
    orcid ?? "",
    ipHash ?? "",
    uaHash ?? "",
  ]
  // When everything is anonymized (pre_consent + no hashes), bucket all
  // anonymous events together so we have a single, stable, low-cardinality
  // dedup key rather than NULLs that would all collide on the UNIQUE index.
  const hasIdentity = components.some(Boolean)
  const raw = hasIdentity ? components.join("|") : ANONYMOUS_TOKEN
  return createHash("sha256").update(raw).digest("hex")
}

function applyConsent(input: RecordEventInput): {
  orcid: string | null
  ipHash: string | null
  uaHash: string | null
  source: string
} {
  const mode = effectiveConsentMode(input.consent)
  if (mode === "all") {
    return {
      orcid: input.orcid,
      ipHash: input.ipHash,
      uaHash: input.uaHash,
      source: input.source,
    }
  }
  if (mode === "essential_only") {
    return {
      orcid: input.orcid,
      ipHash: null,
      uaHash: null,
      source:
        input.source === "article_page" || input.source === "pdf_view"
          ? input.source
          : "essential_only",
    }
  }
  // pre_consent: strip ORCID too — fully anonymous.
  return { orcid: null, ipHash: null, uaHash: null, source: "pre_consent" }
}

export async function recordEvent(input: RecordEventInput): Promise<RecordEventResult> {
  const now = input.now ?? new Date()
  const { orcid, ipHash, uaHash, source } = applyConsent(input)
  const articleId =
    typeof input.articleId === "bigint" ? input.articleId : BigInt(input.articleId)
  const journalId =
    typeof input.journalId === "bigint" ? input.journalId : BigInt(input.journalId)
  const galleyId = input.galleyId === null || input.galleyId === undefined
    ? null
    : typeof input.galleyId === "bigint"
      ? input.galleyId
      : BigInt(input.galleyId)
  const key = dedupKey(orcid, ipHash, uaHash)

  if (input.eventType === "view") {
    return recordView({
      orcid,
      ipHash,
      uaHash,
      articleId,
      journalId,
      source,
      eventMeta: input.eventMeta,
      dedupKey: key,
      now,
    })
  }

  if (input.eventType === "download") {
    if (!galleyId) {
      // Defensive — the contract requires galley_id on downloads. Let the
      // caller see this as a 400 upstream; here we just refuse to write.
      return { recorded: false, deduped: false }
    }
    return recordDownload({
      orcid,
      ipHash,
      uaHash,
      articleId,
      journalId,
      galleyId,
      source,
      eventMeta: input.eventMeta,
      dedupKey: key,
      now,
    })
  }

  // citation_export — no dedup
  await prisma.userEvent.create({
    data: {
      orcid,
      ip_hash: ipHash,
      ua_hash: uaHash,
      article_id: articleId,
      journal_id: journalId,
      galley_id: null,
      event_type: "citation_export",
      source,
      citation_format: input.citationFormat ?? null,
      event_meta: (input.eventMeta as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      dedup_key: key,
      view_day: null,
      created_at: now,
    },
  })
  return { recorded: true, deduped: false }
}

interface ViewWriteArgs {
  orcid: string | null
  ipHash: string | null
  uaHash: string | null
  articleId: bigint
  journalId: bigint
  source: string
  eventMeta?: Record<string, unknown> | null
  dedupKey: string
  now: Date
}

async function recordView(args: ViewWriteArgs): Promise<RecordEventResult> {
  const day = dayKey(args.now)
  try {
    await prisma.userEvent.create({
      data: {
        orcid: args.orcid,
        ip_hash: args.ipHash,
        ua_hash: args.uaHash,
        article_id: args.articleId,
        journal_id: args.journalId,
        galley_id: null,
        event_type: "view",
        source: args.source,
        citation_format: null,
        event_meta: (args.eventMeta as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        dedup_key: args.dedupKey,
        view_day: day,
        created_at: args.now,
      },
    })
    return { recorded: true, deduped: false }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { recorded: true, deduped: true }
    }
    throw err
  }
}

interface DownloadWriteArgs extends ViewWriteArgs {
  galleyId: bigint
}

async function recordDownload(args: DownloadWriteArgs): Promise<RecordEventResult> {
  const since = new Date(args.now.getTime() - DOWNLOAD_DEDUP_WINDOW_SECONDS * 1000)
  const existing = await prisma.userEvent.findFirst({
    where: {
      event_type: "download",
      article_id: args.articleId,
      galley_id: args.galleyId,
      dedup_key: args.dedupKey,
      created_at: { gte: since },
    },
    select: { id: true },
  })
  if (existing) {
    return { recorded: true, deduped: true }
  }
  await prisma.userEvent.create({
    data: {
      orcid: args.orcid,
      ip_hash: args.ipHash,
      ua_hash: args.uaHash,
      article_id: args.articleId,
      journal_id: args.journalId,
      galley_id: args.galleyId,
      event_type: "download",
      source: args.source,
      citation_format: null,
      event_meta: (args.eventMeta as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      dedup_key: args.dedupKey,
      view_day: null,
      created_at: args.now,
    },
  })
  return { recorded: true, deduped: false }
}
