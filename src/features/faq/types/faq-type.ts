export interface Faq {
  id: string
  question: string
  answer: string
  category: string | null
  is_published: boolean
  view_count: number
  helpful_count: number
  created_at: string
  updated_at: string
}

export interface FaqResponse {
  success: boolean
  data?: Faq | Faq[]
  error?: string
  message?: string
}
