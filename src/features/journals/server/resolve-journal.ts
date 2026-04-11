import { prisma } from "@/src/lib/db/config"

/**
 * Resolves a journal identifier (ojs_path slug, ojs_id, or numeric id) to its
 * ojs_id needed for OJS database queries.
 *
 * This safe fallback resolution chain ensures that an empty Prisma DB DOES NOT break
 * the flow as long as the journal exists in OJS.
 */
export async function resolveJournalOjsId(
  id: string
): Promise<{ ojsId: string; prismaId: bigint | null } | null> {
  console.log(`[resolveJournalOjsId] Attempting to resolve journal id: "${id}"`);

  // 1. Try ojs_path (slug-based URL — primary)
  let journal = await prisma.journal.findUnique({
    where: { ojs_path: id },
    select: { ojs_id: true, id: true },
  })

  // 2. Try ojs_id (legacy OJS-sourced navigation)
  if (!journal) {
    journal = await prisma.journal.findUnique({
      where: { ojs_id: id },
      select: { ojs_id: true, id: true },
    })
  }

  // 3. Try numeric id
  if (!journal && /^\d+$/.test(id)) {
    journal = await prisma.journal.findUnique({
      where: { id: BigInt(id) },
      select: { ojs_id: true, id: true },
    })
  }

  if (journal?.ojs_id) {
    console.log(`[resolveJournalOjsId] Found in Prisma DB. ojsId=${journal.ojs_id}, prismaId=${journal.id}`);
    return { ojsId: journal.ojs_id, prismaId: journal.id }
  }

  // 4. Safe Fallback Strategy: Target OJS Database directly
  console.log(`[resolveJournalOjsId] Not found in Prisma DB. Falling back to OJS query for "${id}"`);
  try {
    const { isOjsConfigured, ojsQuery } = await import("@/src/features/ojs/server/ojs-client");
    if (isOjsConfigured()) {
      let rows = await ojsQuery<{ journal_id: number }>(
        "SELECT journal_id FROM journals WHERE path = ? LIMIT 1",
        [id]
      )

      if (rows.length === 0 && /^\d+$/.test(id)) {
        rows = await ojsQuery<{ journal_id: number }>(
          "SELECT journal_id FROM journals WHERE journal_id = ? LIMIT 1",
          [parseInt(id, 10)]
        )
      }

      if (rows.length > 0) {
        const resolvedOjsId = rows[0].journal_id.toString();
        console.log(`[resolveJournalOjsId] OJS fallback successful! resolvedOjsId=${resolvedOjsId}`);
        return { ojsId: resolvedOjsId, prismaId: null };
      }
    } else {
      console.warn(`[resolveJournalOjsId] OJS is not configured. Cannot perform fallback.`);
    }
  } catch (error) {
    console.error(`[resolveJournalOjsId] OJS fallback lookup failed:`, error);
  }

  console.log(`[resolveJournalOjsId] Resolution completely failed for "${id}"`);
  return null
}
