import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'
import { execSync } from 'child_process'

// Keep track of initialization to ensure it only runs once per Node process
let isInitialized = false
let isInitializing = false

export async function initializeDatabase() {
  // 1. Safe guards
  if (isInitialized) {
    return
  }

  // 2. Strict Production Guard
  if (process.env.ALLOW_PROD_DB_INIT !== 'true') {
    // We log but don't fail, because normal app startup shouldn't crash if init is disabled
    return
  }

  // Prevent parallel initializations in concurrent connections during startup
  if (isInitializing) {
    console.log('[DB Init] Initialization is already in progress...')
    // Wait for the other process to finish by simple polling (optional, but safe)
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    return
  }

  isInitializing = true
  console.log('[DB Init] Starting secure runtime database initialization...')

  try {
    // 3. Migrate database using npx prisma migrate deploy
    // Since we are in a production Hostinger environment, we must use `npx --no-install`
    // assuming prisma is installed in node_modules locally.
    console.log('[DB Init] Executing Prisma migrations...')
    try {
      const migrateOut = execSync('npx --no-install prisma migrate deploy', {
        env: { ...process.env },
        encoding: 'utf-8',
        stdio: 'pipe'
      })
      console.log('[DB Init] Migration output:', migrateOut.trim())
    } catch (migrateErr: any) {
      console.error('[DB Init] Migration failed. Output:', migrateErr.stdout || migrateErr.message)
      throw new Error('Database migration failed during runtime initialization.')
    }

    // 4. Seed database programmatically using Prisma Client directly instead of standard seed cmd
    // We instantiate our own internal client to ensure connection limits don't overlap with normal app flow
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
      // Helper for masking emails in logs
      const maskEmail = (email: string) => {
        const [name, domain] = email.split('@')
        if (!domain) return email
        return `${name.charAt(0)}${'*'.repeat(5)}@${domain}`
      }

      // 5. Validate Required Environment Variables
      const adminEmail = process.env.ADMIN_EMAIL
      const adminPasswordRaw = process.env.ADMIN_PASSWORD
      const supportEmail = process.env.SUPPORT_EMAIL
      const supportPasswordRaw = process.env.SUPPORT_PASSWORD

      if (!adminEmail || !adminPasswordRaw || !supportEmail || !supportPasswordRaw) {
        throw new Error('[DB Init] CRITICAL: Missing required seed credentials (ADMIN_EMAIL, ADMIN_PASSWORD, SUPPORT_EMAIL, SUPPORT_PASSWORD). Seeding aborted for security.')
      }

      console.log(`[DB Init] Checking for seed accounts...`)

      // 6. Seed Super Admin (Identify by role/flag for stability)
      const seededAdmin = await prisma.adminUser.findFirst({
        where: { role: 'superadmin' }
      })

      if (!seededAdmin) {
        console.log(`[DB Init] 👤 Creating Super Admin (${maskEmail(adminEmail)})...`)
        const adminPassword = await bcrypt.hash(adminPasswordRaw, 10)
        await prisma.adminUser.create({
          data: {
            email: adminEmail,
            password_hash: adminPassword,
            full_name: 'Super Administrator',
            role: 'superadmin',
          }
        })
      } else {
        // Update credentials if changed
        console.log(`[DB Init] Super Admin exists (${maskEmail(seededAdmin.email)}). Syncing credentials...`)
        const adminPassword = await bcrypt.hash(adminPasswordRaw, 10)
        await prisma.adminUser.update({
          where: { id: seededAdmin.id },
          data: {
            email: adminEmail,
            password_hash: adminPassword
          }
        })
      }

      // 7. Seed Support User
      const seededSupport = await prisma.adminUser.findFirst({
        where: { role: 'support' }
      })

      if (!seededSupport) {
        console.log(`[DB Init] 🛠️ Creating Support User (${maskEmail(supportEmail)})...`)
        const supportPassword = await bcrypt.hash(supportPasswordRaw, 10)
        await prisma.adminUser.create({
          data: {
            email: supportEmail,
            password_hash: supportPassword,
            full_name: 'Technical Support',
            role: 'support',
          }
        })
      } else {
        console.log(`[DB Init] Support User exists (${maskEmail(seededSupport.email)}). Syncing credentials...`)
        const supportPassword = await bcrypt.hash(supportPasswordRaw, 10)
        await prisma.adminUser.update({
          where: { id: seededSupport.id },
          data: {
            email: supportEmail,
            password_hash: supportPassword
          }
        })
      }

      // Initialize system settings if they don't exist
      console.log('[DB Init] ⚙️ Checking system settings...')
      const settingsCount = await prisma.systemSetting.count()

      if (settingsCount === 0) {
        console.log('[DB Init] ⚙️ Initializing default system settings...')
        await prisma.systemSetting.createMany({
          data: [
            {
              setting_key: 'site_name',
              setting_value: JSON.stringify('DigitoPub Scientific Journals'),
              description: 'The name of the platform',
            },
            {
              setting_key: 'contact_email',
              setting_value: JSON.stringify('support@digstobob.com'),
              description: 'Primary contact email for the platform',
            }
          ]
        })
      } else {
        console.log('[DB Init] System settings already exist. Skipping...')
      }

      console.log('[DB Init] ✅ Database initialization completed successfully.')
    } finally {
      await prisma.$disconnect()
    }

    isInitialized = true
  } catch (error) {
    console.error('[DB Init] ❌ Initialization process failed:', error)
    // We don't bubble up the error here to ensure the whole Next.js server doesn't crash on boot in odd ways,
    // but the DB won't be initialized.
  } finally {
    isInitializing = false
  }
}
