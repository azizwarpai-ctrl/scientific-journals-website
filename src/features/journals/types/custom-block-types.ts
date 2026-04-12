/**
 * Custom Block Types
 *
 * Represents sidebar blocks managed by the OJS Custom Block Manager plugin.
 * Stored in plugin_settings under plugin_name = 'customblockmanagerplugin'
 * and individual '{blockName}customblockplugin' entries.
 */

export interface CustomBlock {
  /** Machine name of the block (e.g. "myblock") */
  name: string
  /** Sanitized HTML content of the block */
  content: string
  
  // Structured data parsed from HTML
  title: string
  description: string
  link?: string
  image?: string
}

export interface JournalInfoCard {
  title: string
  description: string
  link?: string
  image?: string
}

export interface CustomBlocksResponse {
  blocks: CustomBlock[]
}
