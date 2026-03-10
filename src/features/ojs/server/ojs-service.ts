import { ojsQuery } from "./ojs-client"
import { mapOjsJournalRow } from "./ojs-mappers"
import type { OjsJournal } from "../schemas/ojs-schema"

export async function fetchFromDatabase(includeDisabled = false): Promise<OjsJournal[]> {
    const baseUrl = process.env.OJS_BASE_URL

    if (!baseUrl) {
        throw new Error("OJS_BASE_URL environment variable is missing but required for OJS integration.")
    }

    const enabledFilter = includeDisabled ? "" : "WHERE j.enabled = 1"
    const rows = await ojsQuery<any>(`
        SELECT
            j.journal_id,
            j.path,
            j.primary_locale,
            j.enabled,
            js_name.setting_value AS name,
            js_desc.setting_value AS description,
            js_thumb.setting_value AS thumbnail,
            js_issn.setting_value AS issn,
            js_eissn.setting_value AS e_issn,
            js_pub.setting_value AS publisher
        FROM journals j
        LEFT JOIN journal_settings js_name
            ON js_name.journal_id = j.journal_id
            AND js_name.setting_name = 'name'
            AND js_name.locale = j.primary_locale
        LEFT JOIN journal_settings js_desc
            ON js_desc.journal_id = j.journal_id
            AND js_desc.setting_name = 'description'
            AND js_desc.locale = j.primary_locale
        LEFT JOIN journal_settings js_thumb
            ON js_thumb.journal_id = j.journal_id
            AND js_thumb.setting_name = 'journalThumbnail'
        LEFT JOIN journal_settings js_issn
            ON js_issn.journal_id = j.journal_id
            AND js_issn.setting_name = 'printIssn'
            AND js_issn.locale = ''
        LEFT JOIN journal_settings js_eissn
            ON js_eissn.journal_id = j.journal_id
            AND js_eissn.setting_name = 'onlineIssn'
            AND js_eissn.locale = ''
        LEFT JOIN journal_settings js_pub
            ON js_pub.journal_id = j.journal_id
            AND js_pub.setting_name = 'publisherInstitution'
            AND js_pub.locale = j.primary_locale
        ${enabledFilter}
        ORDER BY j.seq ASC
    `)

    return rows.map((row) => mapOjsJournalRow(row, baseUrl))
}
