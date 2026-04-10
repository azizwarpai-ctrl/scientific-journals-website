export interface HelpArticle {
  id: string
  title: string
  content: string
  category: string | null
  icon: string | null
  display_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface HelpArticleResponse {
  success: boolean
  data?: HelpArticle | HelpArticle[]
  error?: string
  message?: string
}
