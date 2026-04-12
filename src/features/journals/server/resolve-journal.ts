import { prisma } from "@/src/lib/db/config"

/**
 * Attempts to resolve an OJS journal ID dynamically from either Prisma OR OJS natively.
 * This is critical when Prisma is offline, out of sync, or empty but we still need 
 * to fetch OJS article data for valid journals.
 * 
 * @param id The requested journal path (e.g., 'ojbr') or numeric ID
 * @returns { found: true; ojsId: string | null; prismaId: bigint | null; ojsPath: string | null } | { found: false }
 */
export async function resolveJournalOjsId(
  id: string
): Promise<{ found: true; ojsId: string | null; prismaId: bigint | null; ojsPath: string | null } | { found: false }> {
  console.log(`[resolveJournalOjsId] Attempting to resolve journal id: "${id}"`);

  // 1. Try Prisma first for standard configurations
  // 1. Try Prisma first for standard configurations - Deterministic sequential lookups
  let journal = await prisma.journal.findUnique({
    where: { ojs_path: id }
  })
  
  if (!journal) {
    journal = await prisma.journal.findFirst({
      where: { ojs_id: id }
    })
  }

  if (!journal && /^\d+$/.test(id)) {
    journal = await prisma.journal.findUnique({
      where: { id: BigInt(id) }
    })
  }

  const select = journal ? { id: journal.id, ojs_id: journal.ojs_id, ojs_path: journal.ojs_path } : null
  
  // Found in Prisma
  if (journal) {
    console.log(`[resolveJournalOjsId] Found in Prisma DB. ojsId=${journal.ojs_id}, prismaId=${journal.id}`);
    return { found: true, ojsId: journal.ojs_id, prismaId: journal.id, ojsPath: journal.ojs_path }
  }

  console.log(`[resolveJournalOjsId] Not found in Prisma. Attempting OJS DB fallback for path="${id}"...`)

  // 2. Prisma empty/missing. Fallback directly to OJS schema lookup
  try {
    const { isOjsConfigured, ojsQuery } = await import("@/src/features/ojs/server/ojs-client")
    if (isOjsConfigured()) {
      let ojsMatch = await ojsQuery<{ journal_id: number, path: string }>(
        `SELECT journal_id, path FROM journals WHERE path = ? LIMIT 1`,
        [id]
      )

      if (ojsMatch.length === 0 && /^\d+$/.test(id)) {
        ojsMatch = await ojsQuery<{ journal_id: number, path: string }>(
          `SELECT journal_id, path FROM journals WHERE journal_id = ? LIMIT 1`,
          [parseInt(id, 10)]
        )
      }

      if (ojsMatch.length > 0) {
        const fallbackId = ojsMatch[0].journal_id.toString()
        const fallbackPath = ojsMatch[0].path || null
        console.log(`[resolveJournalOjsId] SUCCESS (OJS DB): ojsId=${fallbackId}, path=${fallbackPath}`);
        return { found: true, ojsId: fallbackId, prismaId: null, ojsPath: fallbackPath }
      }
    }
  } catch (err) {
    console.error(`[resolveJournalOjsId] Fallback to OJS DB failed for "${id}":`, err);
  }

  console.log(`[resolveJournalOjsId] Total resolution failure for: ${id}`)
  return { found: false }
}

