import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

declare global {
  var prisma: PrismaClient | undefined
}

// DATABASE_URL is the canonical connection string (used by prisma migrate,
// CI, and most deploy docs), but this adapter was historically built ONLY
// from the individual DATABASE_* vars — environments that set just the URL
// silently fell back to root@localhost with no password. Parse the URL as
// the fallback; explicit DATABASE_* vars still win.
function parseDatabaseUrl(): Partial<Record<'host' | 'port' | 'user' | 'password' | 'database', string>> {
  const raw = process.env.DATABASE_URL
  if (!raw) return {}
  try {
    const url = new URL(raw)
    return {
      host: url.hostname || undefined,
      port: url.port || undefined,
      user: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      database: url.pathname.replace(/^\//, '') || undefined,
    }
  } catch {
    console.warn('[db] DATABASE_URL is set but unparseable; falling back to DATABASE_* vars')
    return {}
  }
}

// Lazy adapter initialization to prevent connection errors during SSG (ENV-02)
function createPrismaClient(): PrismaClient {
  const fromUrl = parseDatabaseUrl()
  const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST || fromUrl.host || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || fromUrl.port || '3306'),
    user: process.env.DATABASE_USER || fromUrl.user || 'root',
    password: process.env.DATABASE_PASSWORD || fromUrl.password || '',
    database: process.env.DATABASE_NAME || fromUrl.database || 'scientific_journals_db',
    connectionLimit: 10,
  })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = global.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

// Helper function for backwards compatibility
export async function query(_text: string, _params?: unknown[]) {
  throw new Error('Direct SQL queries deprecated - use Prisma client instead')
}
