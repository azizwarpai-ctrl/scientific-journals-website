import { prisma } from "@/src/lib/db/config"

/**
 * Resolves a journal identifier (ojs_path slug, ojs_id, or numeric id) to its
 * ojs_id needed for OJS database queries.
 *
 * This consolidates the repeated 3-step lookup pattern used across all journal
 * API routes so Server Components can reuse the same resolution logic.
 */
export async function resolveJournalOjsId(
  id: string
): Promise<{ ojsId: string; prismaId: bigint } | null> {
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

  if (!journal || !journal.ojs_id) return null

  return { ojsId: journal.ojs_id, prismaId: journal.id }
}
