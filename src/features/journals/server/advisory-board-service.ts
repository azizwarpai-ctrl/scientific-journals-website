import { getJournalPrimaryLocale } from "@/src/features/ojs/server/ojs-client"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"
import { fetchBoardFromNavPage } from "./board-nav-service"

/**
 * Fetches the advisory board for a journal.
 * Advisory boards on this platform are authored as hand-written HTML
 * in OJS Navigation Menu items with the path 'advisory-board'.
 */
export async function fetchAdvisoryBoard(
  ojsJournalId: string
): Promise<EditorialBoardMember[]> {
  const primaryLocale = await getJournalPrimaryLocale(ojsJournalId)

  const members = await fetchBoardFromNavPage(ojsJournalId, "advisory-board", primaryLocale)
  
  // No fallback for advisory boards yet, as they are custom to this platform's
  // hand-authored OJS pages.
  return members ?? []
}
