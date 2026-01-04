import { query } from "./config"
import bcrypt from "bcryptjs"

export async function createUser(email: string, password: string, fullName: string, role = "admin") {
  const hashedPassword = await bcrypt.hash(password, 10)
  const userId = crypto.randomUUID()

  await query("INSERT INTO admin_users (id, email, full_name, role, password_hash) VALUES ($1, $2, $3, $4, $5)", [
    userId,
    email,
    fullName,
    role,
    hashedPassword,
  ])

  return userId
}

export async function verifyPassword(email: string, password: string) {
  const result = await query("SELECT id, email, full_name, role, password_hash FROM admin_users WHERE email = $1", [
    email,
  ])

  if (result.rows.length === 0) {
    return null
  }

  const user = result.rows[0]
  const isValid = await bcrypt.compare(password, user.password_hash)

  if (!isValid) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  }
}

export async function getUserById(userId: string) {
  const result = await query("SELECT id, email, full_name, role FROM admin_users WHERE id = $1", [userId])
  return result.rows[0] || null
}
