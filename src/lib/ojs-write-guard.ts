/**
 * Audited single-path writer for the OJS database.
 *
 * Constitution rule (UIET-P1): digitopub writes to OJS ONLY through this
 * helper, ONLY when ENABLE_ORCID_OJS_BACKFILL=true, and EVERY write is
 * audited in audit_ojs_writes (success or failure).
 */

import { randomUUID } from "node:crypto"
import { prisma } from "./db/config"
import { getOjsConnection } from "@/src/features/ojs/server/ojs-client"
import { getEnv } from "./env"

export interface WriteOrcidInput {
  orcid: string
  ojsUserId: number | bigint
  /** Caller-supplied request id (defaults to a fresh UUID). */
  requestId?: string
}

export interface WriteOrcidResult {
  success: boolean
  /** Was a real write attempted? Returns false when flag is OFF or row already existed. */
  attempted: boolean
  auditId: bigint | null
  error?: string
}

export function isBackfillEnabled(): boolean {
  return getEnv().ENABLE_ORCID_OJS_BACKFILL
}

/**
 * Write ORCID into OJS user_settings, audit-first.
 *
 * Order of operations:
 *   1. INSERT audit_ojs_writes with success=NULL (planned).
 *   2. INSERT INTO user_settings on OJS.
 *   3. UPDATE audit_ojs_writes SET success=true (or success=false on failure).
 *
 * Idempotency: if the OJS row already exists, we still write an audit row
 * marked success=true but `attempted=false`.
 */
export async function writeOrcidToOjsWithAudit(
  input: WriteOrcidInput
): Promise<WriteOrcidResult> {
  if (!isBackfillEnabled()) {
    return { success: false, attempted: false, auditId: null }
  }

  const requestId = input.requestId ?? randomUUID()
  const ojsUserIdBigInt =
    typeof input.ojsUserId === "bigint" ? input.ojsUserId : BigInt(input.ojsUserId)
  const columnSet = `setting_name='orcid'; setting_value='${input.orcid}'`

  // 1) Plan the write — audit row with success=NULL.
  const auditRow = await prisma.auditOjsWrite.create({
    data: {
      request_id: requestId,
      orcid: input.orcid,
      ojs_user_id: ojsUserIdBigInt,
      ojs_table: "user_settings",
      ojs_column_set: columnSet,
      reason: "orcid_backfill",
    },
    select: { id: true },
  })

  let conn: Awaited<ReturnType<typeof getOjsConnection>> | null = null
  try {
    conn = await getOjsConnection()

    // Pre-check: if an ORCID setting row already exists for this user, skip.
    const [existing] = (await conn.query(
      "SELECT user_id FROM user_settings WHERE user_id = ? AND setting_name = 'orcid' LIMIT 1",
      [Number(ojsUserIdBigInt)]
    )) as [Array<{ user_id: number }>, unknown]

    if (Array.isArray(existing) && existing.length > 0) {
      await prisma.auditOjsWrite.update({
        where: { id: auditRow.id },
        data: {
          success: true,
          resolved_at: new Date(),
          error: "row_exists_skipped",
        },
      })
      return { success: true, attempted: false, auditId: auditRow.id }
    }

    await conn.query(
      "INSERT INTO user_settings (user_id, locale, setting_name, setting_value) VALUES (?, '', 'orcid', ?)",
      [Number(ojsUserIdBigInt), input.orcid]
    )

    await prisma.auditOjsWrite.update({
      where: { id: auditRow.id },
      data: { success: true, resolved_at: new Date() },
    })
    return { success: true, attempted: true, auditId: auditRow.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // eslint-disable-next-line no-console
    console.error(`[ojs-write-guard] OJS write failed for orcid=${input.orcid}: ${message}`)
    try {
      await prisma.auditOjsWrite.update({
        where: { id: auditRow.id },
        data: { success: false, resolved_at: new Date(), error: message.slice(0, 1000) },
      })
    } catch {
      /* swallow — we already logged */
    }
    return { success: false, attempted: true, auditId: auditRow.id, error: message }
  } finally {
    if (conn) {
      try {
        conn.release()
      } catch {
        /* ignore */
      }
    }
  }
}
