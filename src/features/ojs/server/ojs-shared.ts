import { prisma } from "@/src/lib/db/config"

/**
 * Returns the set of OJS journal IDs that DigitoPub surfaces, as validated
 * positive integers.
 */
export async function getSyncedJournalIds(): Promise<number[]> {
    const journals = await prisma.journal.findMany({
        where: { ojs_id: { not: null }, status: "active" },
        select: { ojs_id: true },
    })
    return journals.reduce<number[]>((acc, j) => {
        const n = Number(j.ojs_id)
        if (Number.isInteger(n) && n > 0) acc.push(n)
        return acc
    }, [])
}

/** Localized publication title with locale fallback chain. */
export const TITLE_SUBSELECT = `COALESCE(
    (SELECT ps.setting_value FROM publication_settings ps
        WHERE ps.publication_id = s.current_publication_id AND ps.setting_name = 'title' AND ps.locale = s.locale LIMIT 1),
    (SELECT ps.setting_value FROM publication_settings ps
        WHERE ps.publication_id = s.current_publication_id AND ps.setting_name = 'title' AND ps.locale = j.primary_locale LIMIT 1),
    (SELECT ps.setting_value FROM publication_settings ps
        WHERE ps.publication_id = s.current_publication_id AND ps.setting_name = 'title' LIMIT 1)
)`

export const JOURNAL_TITLE_SUBSELECT = `(SELECT js.setting_value FROM journal_settings js
    WHERE js.journal_id = j.journal_id AND js.setting_name = 'name' AND js.locale = j.primary_locale LIMIT 1)`

export const CURRENT_ROUND_SUBSELECT = `(SELECT MAX(rr.round) FROM review_rounds rr
    WHERE rr.submission_id = s.submission_id)`

/** Primary-author name fragment (given/family) for the current publication. */
export function authorNameSubselect(setting: "givenName" | "familyName"): string {
    return `(SELECT aus.setting_value FROM authors au
        JOIN author_settings aus ON aus.author_id = au.author_id AND aus.setting_name = '${setting}'
        WHERE au.publication_id = s.current_publication_id
        ORDER BY au.seq ASC LIMIT 1)`
}

/** EAV user_settings lookup, preferring the empty-locale row. */
export function userSettingSubselect(userIdExpr: string, settingName: string): string {
    return `(SELECT us.setting_value FROM user_settings us
        WHERE us.user_id = ${userIdExpr} AND us.setting_name = '${settingName}'
        ORDER BY us.locale LIMIT 1)`
}
