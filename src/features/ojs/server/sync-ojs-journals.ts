import { prisma } from "@/lib/db/config"
import { isOjsConfigured } from "./ojs-client"
import type { OjsJournal } from "../schemas/ojs-schema"

// Module-level flag to ensure startup sync runs only once per cold start
let hasRunStartupSync = false

/**
 * Synchronize OJS journals into the internal Prisma database.
 * Uses `ojs_id` as the unique linking key between systems.
 * 
 * Called automatically on app startup (once) and via the cron API route.
 */
export async function syncOjsJournals(ojsJournals: OjsJournal[]): Promise<{ synced: number; errors: number }> {
    let synced = 0
    let errors = 0
    const baseUrl = process.env.OJS_BASE_URL || ""
    const BATCH_SIZE = 10

    for (let i = 0; i < ojsJournals.length; i += BATCH_SIZE) {
        const batch = ojsJournals.slice(i, i + BATCH_SIZE)
        const results = await Promise.allSettled(
            batch.map((journal) =>
                prisma.journal.upsert({
                    where: { ojs_id: String(journal.journal_id) },
                    update: {
                        title: journal.name || journal.path,
                        description: journal.description || null,
                        cover_image_url: journal.thumbnail_url || null,
                        issn: journal.issn || null,
                        e_issn: journal.e_issn || null,
                        publisher: journal.publisher || null,
                        abbreviation: journal.abbreviation || null,
                        editor_in_chief: journal.contact_name || null,
                        website_url: baseUrl ? `${baseUrl}/${journal.path}` : null,
                        ojs_path: journal.path,
                        status: journal.enabled ? "active" : "inactive",
                        updated_at: new Date(),
                    },
                    create: {
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
                        website_url: baseUrl ? `${baseUrl}/${journal.path}` : null,
                        ojs_path: journal.path,
                        status: journal.enabled ? "active" : "inactive",
                    },
                })
            )
        )

        for (let j = 0; j < results.length; j++) {
            if (results[j].status === "fulfilled") {
                synced++
            } else {
                errors++
                const journal = batch[j]
                console.error(
                    `[OJS_SYNC] Failed to upsert journal ${journal.journal_id} (${journal.path}):`,
                    (results[j] as PromiseRejectedResult).reason
                )
            }
        }
    }

    console.log(`[OJS_SYNC] Completed: ${synced} synced, ${errors} errors`)
    return { synced, errors }
}

/**
 * Run startup sync if it hasn't been run yet this cold start.
 * Non-blocking — fires and forgets so it doesn't slow down the first request.
 */
export function triggerStartupSync(fetchFn: () => Promise<OjsJournal[]>) {
    if (hasRunStartupSync || !isOjsConfigured()) return
    hasRunStartupSync = true

    // Fire-and-forget: don't block the request
    fetchFn()
        .then((journals) => syncOjsJournals(journals))
        .then((result) => {
            console.log(`[OJS_SYNC] Startup sync done:`, result)
            if (result.errors > 0) {
                console.warn(`[OJS_SYNC] Startup sync completed with ${result.errors} errors, allowing retry.`)
                hasRunStartupSync = false // Allow retry on next request if it partially failed
            }
        })
        .catch((err) => {
            console.error(`[OJS_SYNC] Startup sync failed:`, err)
            hasRunStartupSync = false // Allow retry on next request if it transiently failed
        })
}
