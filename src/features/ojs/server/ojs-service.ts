import { getOjsBaseUrl } from "../utils/ojs-config"
import { ojsQuery } from "./ojs-client"
import { mapOjsJournalRow, type OjsJournalRow } from "./ojs-mappers"
import type { OjsJournal } from "../schemas/ojs-schema"

export async function fetchFromDatabase(includeDisabled = false): Promise<OjsJournal[]> {
    const baseUrl = getOjsBaseUrl()

    const enabledFilter = includeDisabled ? "" : "WHERE j.enabled = 1"
    const rows = await ojsQuery<OjsJournalRow>(`
        SELECT
            j.journal_id,
            j.path,
            j.primary_locale,
            j.enabled,
            js_name.setting_value AS name,
            js_desc.setting_value AS description,
            COALESCE(
                js_cover_loc.setting_value,
                js_cover_def.setting_value,
                js_thumb_loc.setting_value,
                js_thumb_def.setting_value
            ) AS thumbnail,
            js_issn.setting_value AS issn,
            js_eissn.setting_value AS e_issn,
            js_pub.setting_value AS publisher,
            js_abbrev.setting_value AS abbreviation,
            js_contact.setting_value AS contact_name,
            js_country.setting_value AS country,
            js_aims.setting_value AS aims_and_scope,
            js_guidelines.setting_value AS author_guidelines
        FROM journals j
        LEFT JOIN journal_settings js_name
            ON js_name.journal_id = j.journal_id
            AND js_name.setting_name = 'name'
            AND js_name.locale = j.primary_locale
        LEFT JOIN journal_settings js_desc
            ON js_desc.journal_id = j.journal_id
            AND js_desc.setting_name = 'description'
            AND js_desc.locale = j.primary_locale
        -- Cover image: prefer localized homepageImage, fallback to default homepageImage
        LEFT JOIN journal_settings js_cover_loc
            ON js_cover_loc.journal_id = j.journal_id
            AND js_cover_loc.setting_name = 'homepageImage'
            AND js_cover_loc.locale = j.primary_locale
        LEFT JOIN journal_settings js_cover_def
            ON js_cover_def.journal_id = j.journal_id
            AND js_cover_def.setting_name = 'homepageImage'
            AND js_cover_def.locale = ''
            AND js_cover_loc.setting_value IS NULL
        -- Thumbnail: prefer localized, fallback to default
        LEFT JOIN journal_settings js_thumb_loc
            ON js_thumb_loc.journal_id = j.journal_id
            AND js_thumb_loc.setting_name = 'journalThumbnail'
            AND js_thumb_loc.locale = j.primary_locale
            AND js_cover_loc.setting_value IS NULL
            AND js_cover_def.setting_value IS NULL
        LEFT JOIN journal_settings js_thumb_def
            ON js_thumb_def.journal_id = j.journal_id
            AND js_thumb_def.setting_name = 'journalThumbnail'
            AND js_thumb_def.locale = ''
            AND js_cover_loc.setting_value IS NULL
            AND js_cover_def.setting_value IS NULL
            AND js_thumb_loc.setting_value IS NULL
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
        LEFT JOIN journal_settings js_abbrev
            ON js_abbrev.journal_id = j.journal_id
            AND js_abbrev.setting_name = 'abbreviation'
            AND js_abbrev.locale = j.primary_locale
        LEFT JOIN journal_settings js_contact
            ON js_contact.journal_id = j.journal_id
            AND js_contact.setting_name = 'contactName'
            AND js_contact.locale = ''
        LEFT JOIN journal_settings js_country
            ON js_country.journal_id = j.journal_id
            AND js_country.setting_name = 'country'
            AND js_country.locale = ''
        LEFT JOIN journal_settings js_aims
            ON js_aims.journal_id = j.journal_id
            AND js_aims.setting_name = 'aimsAndScope'
            AND js_aims.locale = j.primary_locale
        LEFT JOIN journal_settings js_guidelines
            ON js_guidelines.journal_id = j.journal_id
            AND js_guidelines.setting_name = 'authorGuidelines'
            AND js_guidelines.locale = j.primary_locale
        ${enabledFilter}
        ORDER BY j.seq ASC
    `)

    return rows.map((row) => mapOjsJournalRow(row, baseUrl))
}
