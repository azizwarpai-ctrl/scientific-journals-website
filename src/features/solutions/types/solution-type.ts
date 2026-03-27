export interface Solution {
  id: string
  title: string
  description: string
  icon: string | null
  features: string[] | null
  display_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface SolutionResponse {
  success: boolean
  data?: Solution | Solution[]
  error?: string
  message?: string
}
