import { PrismaClient } from '@prisma/client'

// Prisma 5 Stable Configuration
// Using standard schema.prisma configuration

declare global {
  var prisma: PrismaClient | undefined
}

// Simple PrismaClient - connection string from environment
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

// Helper function for backwards compatibility
export async function query(text: string, params?: any[]) {
  throw new Error('Direct SQL queries deprecated - use Prisma client instead')
}
