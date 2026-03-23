export interface AuthUser {
  id: string
  email: string
  full_name: string | null
  role: string
}

export interface AuthResponse {
  success: boolean
  user?: AuthUser
  error?: string
}

export interface MeResponse {
  success: boolean
  user: AuthUser
  error?: string
}
