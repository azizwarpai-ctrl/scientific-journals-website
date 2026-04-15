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
    console.log('📝 Initializing About Page baseline structure...')
    
    // Database mapping derived from structural CMS needs
    const aboutContent = [
      {
        section_key: 'who_we_are',
        block_type: 'TEXT',
        title: 'Who We Are',
        subtitle: null,
        content: 'DigitoPub is the official publishing house and platform of Digitodontics International Academy. At DigitoPub, we redefine the future of academic publishing through seamless digital integration and innovation. As a forward-thinking scientific publisher, we provide a comprehensive suite of digital publishing and management solutions designed to empower journals, editors, and researchers worldwide.\n\nOur services include e-journal platform solutions for journal creation, hosting, and management; SubmitManager, our intuitive e-submission platform; and end-to-end e-editorial and e-review systems that streamline every stage of scholarly communication.\n\nBeyond these core services, we offer CrossRef integration (DOI, Crossmark, Similarity Check), XML, PDF, and LaTeX production, ORCID author identification, citation metrics, indexing, and archiving solutions through Portico and CLOCKSS, ensuring every publication meets the highest international standards of accessibility and integrity.',
        display_order: 10,
        items: []
      },
      {
        section_key: 'mission_vision',
        block_type: 'CARDS',
        title: 'Our Mission & Vision',
        subtitle: null,
        content: null,
        display_order: 20,
        items: [
          {
            title: 'Our Mission',
            description: 'To empower journals, editors, and researchers worldwide with comprehensive digital publishing solutions that uphold the highest standards of transparency, quality, and ethical scholarly communication. We bridge the gap between research creation, dissemination, and long-term preservation.',
            icon: 'Target',
            color_theme: 'primary',
            display_order: 0,
          },
          {
            title: 'Our Vision',
            description: 'To create a vibrant ecosystem where science and technology evolve in harmony, fostering a trusted environment where scholarly work can thrive. We envision a future where every researcher has access to world-class publishing tools and global reach.',
            icon: 'Eye',
            color_theme: 'secondary',
            display_order: 1,
          }
        ]
      }
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
          ...(section.items && section.items.length > 0
            ? {
                items: {
                  create: section.items,
                },
              }
            : {}),
        }
      })
    }

    // 4. Initialize About page core sections (idempotent)
    console.log('📖 Upserting About page sections...')
    await prisma.aboutSection.upsert({
      where: { section_key: 'our_mission' },
      update: {},
      create: {
        section_key: 'our_mission',
        block_type: 'TEXT',
        title: 'Our Mission',
        content: 'To empower journals, editors, and researchers worldwide with comprehensive digital publishing solutions that uphold the highest standards of transparency, quality, and ethical scholarly communication. We bridge the gap between research creation, dissemination, and long-term preservation.',
        is_active: true,
        display_order: 1
      }
    })

    await prisma.aboutSection.upsert({
      where: { section_key: 'our_vision' },
      update: {},
      create: {
        section_key: 'our_vision',
        block_type: 'TEXT',
        title: 'Our Vision',
        content: 'To create a vibrant ecosystem where science and technology evolve in harmony, fostering a trusted environment where scholarly work can thrive. We envision a future where every researcher has access to world-class publishing tools and global reach.',
        is_active: true,
        display_order: 2
      }
    })

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
