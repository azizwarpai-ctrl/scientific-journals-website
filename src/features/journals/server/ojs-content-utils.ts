/**
 * Shared helpers for OJS navigation-menu / static-page / journal_settings
 * row processing. Used by about-content, publication-fees and others so that
 * grouping and locale-fallback behavior stays identical across services.
 */

export interface SettingRow {
  setting_name: string
  setting_value: string | null
  locale: string
}

export interface NavRow {
  navigation_menu_item_id: number
  path: string | null
  setting_name: string | null
  setting_value: string | null
  locale: string
}

export interface StaticPageRow {
  static_page_id: number
  path: string | null
  setting_name: string | null
  setting_value: string | null
  locale: string
}

export interface GroupedItem {
  path: string | null
  settings: SettingRow[]
}

export function normalizeKey(value: string | null | undefined): string {
  if (!value) return ""
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Picks the best localized value for a setting. Priority: primaryLocale →
 * "" (unlocalized) → first available. A present-but-null value for the
 * primary locale falls through to the next candidate.
 */
export function pickBestLocale(
  rows: SettingRow[],
  settingName: string,
  primaryLocale: string,
): string | null {
  const matching = rows.filter((r) => r.setting_name === settingName)
  if (matching.length === 0) return null
  return (
    matching.find((r) => r.locale === primaryLocale)?.setting_value ??
    matching.find((r) => r.locale === "")?.setting_value ??
    matching[0]?.setting_value ??
    null
  )
}

export function groupByItemId(rows: NavRow[]): Map<number, GroupedItem> {
  const map = new Map<number, GroupedItem>()
  for (const row of rows) {
    let entry = map.get(row.navigation_menu_item_id)
    if (!entry) {
      entry = { path: row.path ?? null, settings: [] }
      map.set(row.navigation_menu_item_id, entry)
    }
    if (row.setting_name) {
      entry.settings.push({
        setting_name: row.setting_name,
        setting_value: row.setting_value,
        locale: row.locale,
      })
    }
  }
  return map
}

export function groupStaticPages(rows: StaticPageRow[]): Map<number, GroupedItem> {
  const map = new Map<number, GroupedItem>()
  for (const row of rows) {
    let entry = map.get(row.static_page_id)
    if (!entry) {
      entry = { path: row.path ?? null, settings: [] }
      map.set(row.static_page_id, entry)
    }
    if (row.setting_name) {
      entry.settings.push({
        setting_name: row.setting_name,
        setting_value: row.setting_value,
        locale: row.locale,
      })
    }
  }
  return map
}