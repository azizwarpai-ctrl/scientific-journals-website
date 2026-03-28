import { z } from "zod"

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required").max(200),
  type: z.enum(["all", "journal", "solution", "faq"]).optional().default("all"),
  limit: z.string().optional().default("20"),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>

export interface SearchResult {
  id: string
  type: "journal" | "solution" | "faq"
  title: string
  description: string
  url: string
  field?: string | null
  icon?: string | null
}

export interface SearchResponse {
  success: boolean
  data: {
    results: SearchResult[]
    total: number
    query: string
  }
}
