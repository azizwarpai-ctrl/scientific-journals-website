export interface Journal {
  id: string
  title: string
  abbreviation: string | null
  issn: string | null
  e_issn: string | null
  description: string | null
  field: string
  publisher: string | null
  editor_in_chief: string | null
  frequency: string | null
  submission_fee: string | number
  publication_fee: string | number
  cover_image_url: string | null
  website_url: string | null
  status: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  ojs_id: string | null
}

export interface JournalResponse {
  success: boolean
  data?: Journal | Journal[]
  error?: string
  message?: string
}
