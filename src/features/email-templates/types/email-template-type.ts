export interface EmailTemplate {
  id: string
  name: string
  subject: string
  html_content: string
  text_content: string | null
  variables: string[] | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmailLog {
  id: string
  template_id: string | null
  to_email: string
  subject: string
  status: string
  error_message: string | null
  sent_at: string | null
  created_at: string
}
