export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: string
}

export interface AuthResponse {
  success: boolean
  user?: Omit<AuthUser, "full_name">
  error?: string
}
