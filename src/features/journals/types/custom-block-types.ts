/**
 * Custom Block Types
 *
 * Represents sidebar blocks managed by the OJS Custom Block Manager plugin.
 * Stored in plugin_settings under plugin_name = 'customblockmanagerplugin'
 * and individual '{blockName}customblockplugin' entries.
 */

import { z } from "zod";

export const CustomBlockSchema = z.object({
  /** Machine name of the block (e.g. "myblock") */
  name: z.string(),
  /** Sanitized HTML content of the block */
  content: z.string(),
  
  // Structured data parsed from HTML
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  link: z.string().optional(),
  image: z.string().optional(),
});

export type CustomBlock = z.infer<typeof CustomBlockSchema>;

export interface JournalInfoCard {
  title: string
  description: string
  link?: string
  image?: string
}

export interface CustomBlocksResponse {
  blocks: CustomBlock[]
}
