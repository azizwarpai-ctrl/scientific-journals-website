export interface Message {
  id: string
  name: string
  email: string
  subject: string
  message: string
  message_type: string
  status: string
  created_at: string
  updated_at: string
}

export interface MessageResponse {
  success: boolean
  data?: Message | Message[]
  error?: string
  message?: string
}
