import { z } from "zod"

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required").max(200),
  type: z.enum(["all", "journal", "solution", "faq", "page", "article", "author", "category"]).optional().default("all"),
  limit: z.string().optional().default("20"),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>

export interface SearchableItem {
  id: string
  type: "journal" | "solution" | "faq" | "page" | "article" | "author" | "category"
  title: string
  description: string
  content: string
  url: string
  field?: string | null
  icon?: string | null
}

export interface SearchResponse {
  success: boolean
  data: {
    results: SearchableItem[]
    total: number
    query: string
    warning?: string
  }
}
