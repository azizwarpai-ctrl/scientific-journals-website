import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'

/**
 * Stage 2: Phase 3 - Implementation
 * Production-ready Prisma seed script.
 * Fully follows Spec-Kit constraints.
 */
async function main() {
  if (process.env.RUN_SEED !== 'true') {
    console.log('⏭️  Skipping database seed (RUN_SEED is not set to "true")')
    return
  }

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
    } catch {
      console.warn('Failed to parse DATABASE_URL, using separate env vars instead.')
    }
  }

  const adapter = new PrismaMariaDb(config)
  const prisma = new PrismaClient({ adapter })

  console.log('🌱 Starting database seeding...')

  try {
    // 1. Initial Admin Users (Idempotent)
    console.log('👤 Initializing Administrative Users...')
    
    // Choose secure initialization password
    const DEFAULT_PASS = 'SecureInit2026!'
    const hashedPassword = await bcrypt.hash(DEFAULT_PASS, 10)

    const baseUsers = [
      {
        email: 'superadmin@digitopub.com',
        full_name: 'Super Administrator',
        role: 'super_admin',
      }
    ];

    // 2. Upsert Support User
    console.log('🛠️ Upserting Support User...')
    const supportPassword = await bcrypt.hash('00000000', 10)
    await prisma.adminUser.upsert({
      where: { email: 'www.alshebani88@gmail.com' },
      update: {}, // Don't overwrite if already exists
      create: {
        email: 'www.alshebani88@gmail.com',
        password_hash: supportPassword,
        full_name: 'Technical Support',
        role: 'admin',
      }
    });

    const ALLOWED_ROLES = ['admin', 'super_admin'];

    for (const user of baseUsers) {
      if (!ALLOWED_ROLES.includes(user.role)) {
         throw new Error(`❌ Validation Error: Invalid role '${user.role}' for user ${user.email}. Allowed roles: ${ALLOWED_ROLES.join(', ')}`);
      }

      await prisma.adminUser.upsert({
        where: { email: user.email },
        update: {}, // Will not overwrite if already exists
        create: {
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          password_hash: hashedPassword
        }
      })
    }

    // 2. System Settings (Idempotent)
    console.log('⚙️ Initializing Core System Settings...')
    const systemSettings = [
      {
        key: 'site_name',
        value: JSON.stringify('DigitoPub Scientific Journals'),
        description: 'Global name of the platform displayed on the frontend',
      },
      {
        key: 'contact_email',
        value: JSON.stringify('support@digitopub.com'),
        description: 'Primary contact email for systemic communications',
      }
    ]

    for (const setting of systemSettings) {
      await prisma.systemSetting.upsert({
        where: { setting_key: setting.key },
        update: {}, // Won't enforce changes if admin modified them
        create: {
          setting_key: setting.key,
          setting_value: setting.value,
          description: setting.description
        }
      })
    }

    // 3. Foundation CMS Content: About Page (Idempotent)
    // Canonical contract — keys MUST match app/about/page.tsx and app/admin/about/page.tsx:
    //   who_we_are, vision, goals
    console.log('📝 Initializing About Page baseline structure...')

    // One-time cleanup of deprecated seed keys. Prior versions created
    // mission_vision / our_mission / our_vision, which do not match the page.
    const removed = await prisma.aboutSection.deleteMany({
      where: { section_key: { in: ['mission_vision', 'our_mission', 'our_vision'] } }
    })
    if (removed.count > 0) {
      console.log(`🧹 Removed ${removed.count} legacy About rows.`)
    }

    const aboutContent: Array<{
      section_key: string
      block_type: string
      title: string
      subtitle: string | null
      content: string | null
      display_order: number
    }> = [
      {
        section_key: 'who_we_are',
        block_type: 'TEXT',
        title: 'Who We Are',
        subtitle: null,
        content: 'DigitoPub is the official publishing house and platform of Digitodontics International Academy. At DigitoPub, we redefine the future of academic publishing through seamless digital integration and innovation. As a forward-thinking scientific publisher, we provide a comprehensive suite of digital publishing and management solutions designed to empower journals, editors, and researchers worldwide.\n\nOur services include e-journal platform solutions for journal creation, hosting, and management; SubmitManager, our intuitive e-submission platform; and end-to-end e-editorial and e-review systems that streamline every stage of scholarly communication.\n\nBeyond these core services, we offer CrossRef integration (DOI, Crossmark, Similarity Check), XML, PDF, and LaTeX production, ORCID author identification, citation metrics, indexing, and archiving solutions through Portico and CLOCKSS, ensuring every publication meets the highest international standards of accessibility and integrity.',
        display_order: 10,
      },
      {
        section_key: 'vision',
        block_type: 'TEXT',
        title: 'Our Vision',
        subtitle: null,
        content: 'To create a vibrant ecosystem where science and technology evolve in harmony, fostering a trusted environment where scholarly work can thrive. We envision a future where every researcher has access to world-class publishing tools, transparent peer review, and global reach — regardless of geography, institution, or discipline.',
        display_order: 20,
      },
      {
        section_key: 'goals',
        block_type: 'TEXT',
        title: 'Our Mission',
        subtitle: null,
        content: 'To empower journals, editors, and researchers worldwide with comprehensive digital publishing solutions that uphold the highest standards of transparency, quality, and ethical scholarly communication. We bridge the gap between research creation, dissemination, and long-term preservation — so that every discovery reaches the people who need it.',
        display_order: 30,
      },
    ]

    for (const section of aboutContent) {
      await prisma.aboutSection.upsert({
        where: { section_key: section.section_key },
        update: {}, // Strict rule: never override what an Admin has tuned in the future
        create: {
          section_key: section.section_key,
          block_type: section.block_type,
          title: section.title,
          subtitle: section.subtitle,
          content: section.content,
          display_order: section.display_order,
          is_active: true,
        }
      })
    }

    console.log('\n✅ System initialized successfully with 2 core users.')
    console.log('──────────────────────────────────────────────────')
    console.log('Available Support/Admin Accounts:')
    for (const user of baseUsers) {
      console.log(`- ${user.email} (${user.role})`)
    }
    console.log(`Default initialization password: ${DEFAULT_PASS}`)
    console.log('⚠️ Reminder: Please reset passwords on initial login.')
    console.log('──────────────────────────────────────────────────')

  } catch (error) {
    console.error('❌ Critical error during seeding:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
