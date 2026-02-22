export interface Solution {
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

export interface SolutionResponse {
  success: boolean
  data?: Solution | Solution[]
  error?: string
  message?: string
}
