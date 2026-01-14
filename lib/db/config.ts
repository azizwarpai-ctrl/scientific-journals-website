import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import 'dotenv/config'

declare global {
  var prisma: PrismaClient | undefined
}

// Prisma 7 Configuration with MySQL/MariaDB Adapter
const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'scientific_journals_db',
  connectionLimit: 10,
})

export const prisma = global.prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

// Helper function for backwards compatibility
export async function query(text: string, params?: any[]) {
  throw new Error('Direct SQL queries deprecated - use Prisma client instead')
}
