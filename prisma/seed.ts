import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'

/**
 * Minimal Seed Script for DigitoPub
 * 
 * This script initializes the system with exactly two mandatory users:
 * 1. Super Admin: admin@digstobob.com
 * 2. Support User: support@digstobob.com
 * 
 * STRICT CONSTRAINTS:
 * - No Journals, Authors, or Reviewers are seeded (imported from external MySQL).
 * - No demo or fake data is created.
 */

async function main() {
  // Parse DATABASE_URL or use individual env vars
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
      console.warn('Failed to parse DATABASE_URL, falling back to individual env vars')
    }
  }

  const adapter = new PrismaMariaDb(config)
  const prisma = new PrismaClient({ adapter })

  console.log('🌱 Starting minimal system initialization...')

  try {
    // 1. Clean up existing users to ensure only the specified ones exist
    // WARNING: This is a destructive action for the user table to ensure compliance.
    console.log('🧹 Cleaning up local user table...')
    await prisma.adminUser.deleteMany({})

    // 2. Create Super Admin
    console.log('👤 Creating Super Admin...')
    const adminPassword = await bcrypt.hash('WMssg_k2', 10) // Should be changed on first login
    await prisma.adminUser.create({
      data: {
        email: 'admin@digitopub.com',
        password_hash: adminPassword,
        full_name: 'Super Administrator',
        role: 'superadmin',
      }
    })

    // 3. Create Support User
    console.log('🛠️ Creating Support User...')
    const supportPassword = await bcrypt.hash('support123', 10)
    await prisma.adminUser.create({
      data: {
        email: 'support@digstobob.com',
        password_hash: supportPassword,
        full_name: 'Technical Support',
        role: 'support',
      }
    })

    // 4. Initialize essential system settings
    console.log('⚙️ Initializing system settings...')
    await prisma.systemSetting.deleteMany({})
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

    console.log('\n✅ System initialized successfully with 2 core users.')
    console.log('──────────────────────────────────────────────────')
    console.log('Super Admin: admin@digstobob.com')
    console.log('Support:     support@digstobob.com')
    console.log('──────────────────────────────────────────────────')
    console.log('Note: Journals, Authors, and Reviewers must be imported from external DB.')

  } catch (error) {
    console.error('❌ Initialization failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
