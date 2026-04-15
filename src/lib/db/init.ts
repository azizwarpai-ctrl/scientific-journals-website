import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'

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
    // Database schema migrations are executed here synchronously to ensure Hostinger applies them
    console.log('[DB Init] Starting runtime database schema migrations (Raw SQL Mode)...')

    // 1. Initialize Prisma Client early so we can run raw SQL migrations
    console.log('[DB Init] Initializing Prisma Client for migrations...')
    const dbUrl = process.env.DATABASE_URL
    let config: Record<string, unknown> = {
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
      } catch {
        console.warn('[DB Init] Failed to parse DATABASE_URL, falling back to individual env vars')
      }
    }

    const adapter = new PrismaMariaDb(config)
    const prisma = new PrismaClient({ adapter })

    try {
      // --- RAW SQL SCHEMA MIGRATIONS ---
      // Because `prisma migrate deploy` requires `prisma/migrations` files which are not checked into Git,
      // and `prisma db push` cannot be reliably run via PM2/node_modules in a production shell,
      // we execute the missing schema structure explicitly via native Prisma SQL.

      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `journals` ADD COLUMN `ojs_path` VARCHAR(100) NULL;')
        console.log('[DB Init] Applied schema patch: Added ojs_path to journals')
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        if (!errorMsg.includes('Duplicate column name')) {
          console.error('[DB Init] Failed to add ojs_path column:', errorMsg)
        }
      }

      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS \`ojs_sso_tokens\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`token\` VARCHAR(128) NOT NULL,
            \`email\` VARCHAR(255) NOT NULL,
            \`expires_at\` DATETIME(3) NOT NULL,
            \`used\` BOOLEAN NOT NULL DEFAULT false,
            \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE INDEX \`ojs_sso_tokens_token_key\`(\`token\`),
            INDEX \`ojs_sso_tokens_token_idx\`(\`token\`),
            INDEX \`ojs_sso_tokens_email_idx\`(\`email\`),
            PRIMARY KEY (\`id\`)
          ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `)
        console.log('[DB Init] Applied schema patch: Synchronized ojs_sso_tokens table')
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        console.error('[DB Init] Failed to create ojs_sso_tokens table:', errorMsg)
      }

      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS \`verification_codes\` (
            \`id\` BIGINT NOT NULL AUTO_INCREMENT,
            \`user_id\` BIGINT NOT NULL,
            \`email\` VARCHAR(255) NOT NULL,
            \`code\` VARCHAR(10) NOT NULL,
            \`expires_at\` DATETIME(3) NOT NULL,
            \`used\` BOOLEAN NOT NULL DEFAULT false,
            \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`attempts\` INT NOT NULL DEFAULT 0,
            \`last_failed_at\` DATETIME(3) NULL,
            \`locked_until\` DATETIME(3) NULL,
            INDEX \`verification_codes_email_idx\`(\`email\`),
            INDEX \`verification_codes_code_idx\`(\`code\`),
            PRIMARY KEY (\`id\`)
          ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `)
        console.log('[DB Init] Applied schema patch: Synchronized verification_codes table')
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        console.error('[DB Init] Failed to create verification_codes table:', errorMsg)
      }

      // --- Patch: Add OJS extended profile columns to admin_users ---
      const profileColumns = [
        { name: 'country', type: 'VARCHAR(90) NULL' },
        { name: 'phone', type: 'VARCHAR(32) NULL' },
        { name: 'affiliation', type: 'VARCHAR(255) NULL' },
        { name: 'department', type: 'VARCHAR(255) NULL' },
        { name: 'orcid', type: 'VARCHAR(255) NULL' },
        { name: 'biography', type: 'TEXT NULL' },
      ]

      for (const col of profileColumns) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE \`admin_users\` ADD COLUMN \`${col.name}\` ${col.type};`)
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : String(e)
          if (!errorMsg.includes('Duplicate column name')) {
            console.error(`[DB Init] Failed to add ${col.name} column:`, errorMsg)
          }
        }
      }
      console.log('[DB Init] Applied schema patch: Synchronized admin_users profile columns')
      
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `about_sections` ADD COLUMN `section_key` VARCHAR(50) NULL UNIQUE;')
        console.log('[DB Init] Applied schema patch: Added section_key to about_sections')
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        if (!errorMsg.includes('Duplicate column name')) {
          console.error('[DB Init] Failed to add section_key column:', errorMsg)
        }
      }

      // --- END MIGRATIONS ---

      console.log('[DB Init] Starting runtime database seeding...')

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
          role: 'super_admin' // Ensure role is correct if email matches
        },
        create: {
          email: adminEmail,
          password_hash: adminHash,
          full_name: 'Super Administrator',
          role: 'super_admin',
        }
      })
      console.log(`[DB Init] Super Admin (${maskEmail(adminEmail)}) synchronized.`)

      // Atomic Upsert for Support User
      const supportHash = await bcrypt.hash(supportPasswordRaw, 10)
      await prisma.adminUser.upsert({
        where: { email: supportEmail },
        update: {
          password_hash: supportHash,
          role: 'admin'
        },
        create: {
          email: supportEmail,
          password_hash: supportHash,
          full_name: 'Technical Support',
          role: 'admin',
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
    } catch (error) {
      console.error('[DB Init] ❌ Initialization process failed:', error)
      initializationPromise = null // Allow retry if it failed
      throw error
    } finally {
      await prisma.$disconnect()
    }
  })()

  return initializationPromise
}
