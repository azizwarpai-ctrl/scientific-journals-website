import { prisma } from "@/src/lib/db/config"
import type { OjsJournal } from "../schemas/ojs-schema"

/**
 * Synchronize OJS journals into the internal Prisma database.
 * Uses `ojs_id` as the unique linking key between systems.
 *
 * Invoked exclusively from the bearer-protected cron endpoint and the
 * `scripts/ojs-sync-cron.ts` standalone script — never on a per-request path.
 */
export async function syncOjsJournals(ojsJournals: OjsJournal[]): Promise<{ synced: number; errors: number }> {
    let synced = 0
    let errors = 0
    const baseUrl = process.env.OJS_BASE_URL || ""
    const BATCH_SIZE = 10

    for (let i = 0; i < ojsJournals.length; i += BATCH_SIZE) {
        const batch = ojsJournals.slice(i, i + BATCH_SIZE)
        const results = await Promise.allSettled(
            batch.map(async (journal) => {
                const existing = await prisma.journal.findUnique({
                    where: { ojs_id: String(journal.journal_id) },
                })

                // OJS is the source of truth - always use its path if available, otherwise fallback to existing
                const trimmedJournalPath = journal.path?.trim() || ''
                const safeOjsPath = trimmedJournalPath || existing?.ojs_path || null

                if (existing) {
                    return prisma.journal.update({
                        where: { id: existing.id },
                        data: {
                            title: journal.name || journal.path,
                            description: journal.description || null,
                            cover_image_url: journal.thumbnail_url || null,
                            issn: journal.issn || null,
                            e_issn: journal.e_issn || null,
                            publisher: journal.publisher || null,
                            abbreviation: journal.abbreviation || null,
                            editor_in_chief: journal.contact_name || null,
                            website_url: baseUrl && safeOjsPath ? `${baseUrl}/index.php/${safeOjsPath}` : null,
                            ojs_path: safeOjsPath,
                            status: journal.enabled ? "active" : "inactive",
                            aims_and_scope: journal.aims_and_scope ?? null,
                            author_guidelines: journal.author_guidelines ?? null,
                            publication_fee: journal.publication_fee ?? 0,
                            submission_fee: journal.submission_fee ?? 0,
                        },
                    })
                }

                try {
                    return await prisma.journal.create({
                        data: {
                            ojs_id: String(journal.journal_id),
                            title: journal.name || journal.path,
                            description: journal.description || null,
                            field: "General Science",
                            cover_image_url: journal.thumbnail_url || null,
                            issn: journal.issn || null,
                            e_issn: journal.e_issn || null,
                            publisher: journal.publisher || null,
                            abbreviation: journal.abbreviation || null,
                            editor_in_chief: journal.contact_name || null,
                            website_url: baseUrl && safeOjsPath ? `${baseUrl}/index.php/${safeOjsPath}` : null,
                            ojs_path: safeOjsPath,
                            status: journal.enabled ? "active" : "inactive",
                            aims_and_scope: journal.aims_and_scope ?? null,
                            author_guidelines: journal.author_guidelines ?? null,
                            publication_fee: journal.publication_fee ?? 0,
                            submission_fee: journal.submission_fee ?? 0,
                        },
                    })
                } catch (error) {
                    // Ignore P2002 Unique constraint failures which happen if another sync raced us
                    if ((error as { code?: string })?.code !== "P2002") throw error
                    return null
                }
            })
        )

        for (let j = 0; j < results.length; j++) {
            if (results[j].status === "fulfilled") {
                synced++
            } else {
                errors++
                const journal = batch[j]
                console.error(
                    `[OJS_SYNC] Failed to sync journal ${journal.journal_id} (${journal.path}):`,
                    (results[j] as PromiseRejectedResult).reason
                )
            }
        }
    }

    console.log(`[OJS_SYNC] Completed: ${synced} synced, ${errors} errors`)
    return { synced, errors }
}
