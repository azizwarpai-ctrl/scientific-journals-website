import { prisma } from "./config"
import bcrypt from "bcryptjs"

export async function createUser(email: string, password: string, fullName: string, role = "admin") {
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.adminUser.create({
    data: {
      email,
      full_name: fullName,
      role,
      password_hash: hashedPassword,
    },
  })

  return user.id
}

export async function verifyPassword(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      full_name: true,
      role: true,
      password_hash: true,
    },
  })

  if (!user) {
    return null
  }

  const isValid = await bcrypt.compare(password, user.password_hash)

  if (!isValid) {
    return null
  }

  return {
    id: user.id.toString(), // Convert BigInt to string for JSON
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  }
}

export async function getUserById(userId: string) {
  const user = await prisma.adminUser.findUnique({
    where: { id: BigInt(userId) },
    select: {
      id: true,
      email: true,
      full_name: true,
      role: true,
    },
  })

  if (!user) {
    return null
  }

  return {
    id: user.id.toString(),
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  }
}
