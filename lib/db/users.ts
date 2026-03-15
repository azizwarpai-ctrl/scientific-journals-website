import { prisma } from "./config"
import bcrypt from "bcryptjs"

interface CreateUserParams {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: string
  country?: string
  phone?: string
  affiliation?: string
  department?: string
  orcid?: string
  biography?: string
}

export async function createUser(params: CreateUserParams) {
  const hashedPassword = await bcrypt.hash(params.password, 10)

  const user = await prisma.adminUser.create({
    data: {
      email: params.email,
      full_name: `${params.firstName} ${params.lastName}`.trim(),
      role: params.role || "author",
      password_hash: hashedPassword,
      country: params.country || null,
      phone: params.phone || null,
      affiliation: params.affiliation || null,
      department: params.department || null,
      orcid: params.orcid || null,
      biography: params.biography || null,
    },
  })

  return user.id.toString()
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
