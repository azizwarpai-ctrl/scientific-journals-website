import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'
import { spawn } from 'child_process'
import path from 'path'

// Keep track of initialization to ensure it only runs once per Node process
let isInitialized = false
let initializationPromise: Promise<void> | null = null

export async function initializeDatabase() {
  // 1. Safe guards
  if (isInitialized) {
    return
  }

  // 2. Strict Production Guard
  if (process.env.ALLOW_PROD_DB_INIT !== 'true') {
    return
  }

  // Prevent parallel initializations in concurrent connections during startup
  if (initializationPromise) {
    console.log('[DB Init] Waiting for existing initialization to complete...')
    return initializationPromise
  }

  initializationPromise = (async () => {
    console.log('[DB Init] Starting secure runtime database initialization...')

    try {
      // 3. Migrate database using direct node invocation (non-blocking, avoids npx and symlink issues)
      console.log('[DB Init] Executing Prisma migrations...')
      await new Promise<void>((resolve, reject) => {
        const prismaPath = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
        const proc = spawn(process.execPath, [prismaPath, 'migrate', 'deploy'], {
          env: { ...process.env },
          shell: true,
          stdio: 'pipe'
        })

        proc.stdout?.on('data', (data) => {
          const chunk = data.toString().trim()
          if (chunk) console.log(`[DB Init] Migration: ${chunk}`)
        })
        proc.stderr?.on('data', (data) => {
          const chunk = data.toString().trim()
          if (chunk) console.error(`[DB Init] Migration Error: ${chunk}`)
        })

        const timeout = setTimeout(() => {
          proc.kill()
          reject(new Error('Database migration timed out after 10 minutes.'))
        }, 600000)

        proc.on('close', (code) => {
          clearTimeout(timeout)
          if (code === 0) {
            console.log('[DB Init] Migration completed successfully.')
            resolve()
          } else {
            console.error('[DB Init] Migration failed.')
            reject(new Error(`Prisma migrate exited with code ${code}`))
          }
        })
      })

      // 4. Seed database programmatically using Prisma Client directly
      console.log('[DB Init] Initializing Seed Client...')
      const dbUrl = process.env.DATABASE_URL
      let config: any = {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '3306'),
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'scientific_journals_db',
        connectionLimit: 5,
      }

      if (dbUrl) {
        try {
          const url = new URL(dbUrl)
          config = {
            host: url.hostname,
            port: parseInt(url.port) || 3306,
            user: url.username,
            password: decodeURIComponent(url.password),
            database: url.pathname.substring(1),
            connectionLimit: 5,
          }
        } catch (e) {
          console.warn('[DB Init] Failed to parse DATABASE_URL, falling back to individual env vars')
        }
      }

      const adapter = new PrismaMariaDb(config)
      const prisma = new PrismaClient({ adapter })

      try {
        const maskEmail = (email: string) => {
          const [name, domain] = email.split('@')
          if (!domain) return email
          return `${name.charAt(0)}${'*'.repeat(5)}@${domain}`
        }

        const adminEmail = process.env.ADMIN_EMAIL
        const adminPasswordRaw = process.env.ADMIN_PASSWORD
        const supportEmail = process.env.SUPPORT_EMAIL
        const supportPasswordRaw = process.env.SUPPORT_PASSWORD

        if (!adminEmail || !adminPasswordRaw || !supportEmail || !supportPasswordRaw) {
          throw new Error('[DB Init] CRITICAL: Missing required seed credentials.')
        }

        console.log(`[DB Init] Atomic seeding of privileged accounts...`)

        // Atomic Upsert for Super Admin
        const adminHash = await bcrypt.hash(adminPasswordRaw, 10)
        await prisma.adminUser.upsert({
          where: { email: adminEmail },
          update: {
            password_hash: adminHash,
            role: 'superadmin' // Ensure role is correct if email matches
          },
          create: {
            email: adminEmail,
            password_hash: adminHash,
            full_name: 'Super Administrator',
            role: 'superadmin',
          }
        })
        console.log(`[DB Init] Super Admin (${maskEmail(adminEmail)}) synchronized.`)

        // Atomic Upsert for Support User
        const supportHash = await bcrypt.hash(supportPasswordRaw, 10)
        await prisma.adminUser.upsert({
          where: { email: supportEmail },
          update: {
            password_hash: supportHash,
            role: 'support'
          },
          create: {
            email: supportEmail,
            password_hash: supportHash,
            full_name: 'Technical Support',
            role: 'support',
          }
        })
        console.log(`[DB Init] Support User (${maskEmail(supportEmail)}) synchronized.`)

        // Idempotent per-key settings seeding
        const defaultSettings = [
          { key: 'site_name', value: 'DigitoPub Scientific Journals', desc: 'The name of the platform' },
          { key: 'contact_email', value: 'support@digstobob.com', desc: 'Primary contact email' }
        ]

        console.log('[DB Init] ⚙️ Synchronizing system settings...')
        for (const setting of defaultSettings) {
          await prisma.systemSetting.upsert({
            where: { setting_key: setting.key },
            update: {}, // Don't overwrite existing values if key exists
            create: {
              setting_key: setting.key,
              setting_value: JSON.stringify(setting.value),
              description: setting.desc
            }
          })
        }

        console.log('[DB Init] ✅ Database initialization completed successfully.')
        isInitialized = true
      } finally {
        await prisma.$disconnect()
      }
    } catch (error) {
      console.error('[DB Init] ❌ Initialization process failed:', error)
      initializationPromise = null // Allow retry if it failed
      throw error
    }
  })()

  return initializationPromise
}
