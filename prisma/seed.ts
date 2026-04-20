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
    try {
      const removed = await prisma.aboutSection.deleteMany({
        where: { section_key: { in: ['mission_vision', 'our_mission', 'our_vision'] } }
      })
      if (removed.count > 0) {
        console.log(`🧹 Removed ${removed.count} legacy About rows.`)
      }
    } catch (e) {
      console.error('⚠️ Legacy About cleanup failed (continuing):', e instanceof Error ? e.message : String(e))
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
        // Note: section_key "goals" is the canonical identifier (used in app/about/page.tsx lookup
        // and app/admin/about/page.tsx dropdown), but the title and content describe "Our Mission".
        // This alias is intentional for backward compatibility with the admin UI contract.
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

    // 4. Help Centre: baseline categories for the four footer sections
    //    (Guide for Authors, Guide for Reviewers, Publication Ethics, FAQ).
    //    These are admin-editable via /admin/help-content. Seeds are idempotent
    //    and never overwrite edits an admin has made after the first run.
    //
    //    Content provenance:
    //      - Guide for Authors / Guide for Reviewers topics come verbatim from
    //        the previous `scripts/seed-help-articles.ts` + the pre-refactor
    //        `help-schema.ts` defaults (git commit 5c84b35).
    //      - Publication Ethics / FAQ topics are drafted to reflect the
    //        platform's OJS-backed workflow, COPE alignment, and core services
    //        (DOI/Crossref, ORCID, Portico/CLOCKSS). Admins can edit or extend
    //        via the dashboard; the first seed leaves them immutable after.
    console.log('📚 Initializing Help Centre baseline categories...')

    const helpSeed: Array<{
      slug: string
      title: string
      topics: Array<{ title: string; content: string; order: number }>
    }> = [
      {
        slug: 'guide-for-authors',
        title: 'Guide for Authors',
        topics: [
          {
            title: 'Manuscript Preparation',
            content:
              "Ensure your manuscript adheres to the journal's formatting guidelines, including citation style, figure resolution, and word count limits. Use the templates provided if available.",
            order: 1,
          },
          {
            title: 'Submission Process',
            content:
              'Verify that all co-authors are listed correctly and that you have obtained necessary ethical approvals. Prepare a cover letter to the editor highlighting the significance of your work.',
            order: 2,
          },
          {
            title: 'Revision & Resubmission',
            content:
              "When submitting a revised manuscript, include a point-by-point response to the reviewers' comments. Highlight changes in the manuscript text for easy verification.",
            order: 3,
          },
        ],
      },
      {
        slug: 'guide-for-reviewers',
        title: 'Guide for Reviewers',
        topics: [
          {
            title: 'The Review Process',
            content:
              "Reviews should be constructive, objective, and timely. Evaluate the study's methodology, clarity, and contribution to the field. Maintain confidentiality throughout the process.",
            order: 1,
          },
          {
            title: 'Writing Reviews',
            content:
              'Provide specific comments and suggestions for improvement. Clearly state your recommendation (Accept, Minor Revision, Major Revision, Reject) to the editor.',
            order: 2,
          },
          {
            title: 'Timeline & Expectations',
            content:
              'Accept review invitations only if you have the expertise and time to complete the review within the deadline. Inform the editor immediately if a conflict of interest or delay arises.',
            order: 3,
          },
        ],
      },
      {
        slug: 'publication-ethics',
        title: 'Publication Ethics',
        topics: [
          {
            title: 'Authorship & Contribution',
            content:
              'All listed authors must have made substantial contributions to the conception, design, execution, or interpretation of the reported study. Ghost, gift, and guest authorship are not permitted. Any change to the author list after submission requires written consent from all authors and editorial approval.',
            order: 1,
          },
          {
            title: 'Originality & Plagiarism',
            content:
              "Submitted manuscripts must be the authors' original work and not under consideration elsewhere. All submissions are screened through similarity-detection tools (Crossref Similarity Check / iThenticate). Plagiarism, self-plagiarism, and duplicate publication are grounds for immediate rejection or retraction.",
            order: 2,
          },
          {
            title: 'Conflicts of Interest',
            content:
              'Authors, reviewers, and editors must disclose any financial, personal, or professional relationships that could be perceived as influencing the work. Undisclosed conflicts discovered post-publication may trigger a correction or retraction.',
            order: 3,
          },
          {
            title: 'Research Integrity & Data Availability',
            content:
              'Data fabrication, falsification, and selective reporting are serious forms of misconduct. Authors should retain raw data and, where applicable, deposit it in a recognised public repository. Editors may request underlying data at any stage of review.',
            order: 4,
          },
          {
            title: 'Ethical Approval & Informed Consent',
            content:
              'Studies involving human participants must cite approval from an institutional review board (IRB) or equivalent, together with a statement confirming informed consent. Animal studies must comply with recognised guidelines (e.g. ARRIVE) and declare ethical oversight.',
            order: 5,
          },
          {
            title: 'Corrections, Retractions & Misconduct',
            content:
              'We follow COPE guidelines for handling suspected misconduct, errors, and disputes. Confirmed errors are addressed through corrigenda, expressions of concern, or retractions, and all post-publication notices are linked to the original article via Crossmark.',
            order: 6,
          },
        ],
      },
      {
        slug: 'faq',
        title: 'FAQ',
        topics: [
          {
            title: 'How do I submit a manuscript?',
            content:
              'Submissions are handled through SubmitManager, our integrated e-submission platform. From any journal page, click "Submit Manuscript" — new authors are provisioned an account automatically and returning authors go straight to their dashboard.',
            order: 1,
          },
          {
            title: 'Do I need an account on DigitoPub to submit?',
            content:
              'No separate DigitoPub account is required. Author identities and submissions live on SubmitManager; DigitoPub simply routes you there securely.',
            order: 2,
          },
          {
            title: 'How long does the peer review process take?',
            content:
              'Typical first-decision times range from 4 to 8 weeks, depending on the journal and reviewer availability. You can track the current status of your submission at any time from your SubmitManager dashboard.',
            order: 3,
          },
          {
            title: 'Are there article processing charges (APCs)?',
            content:
              "APC policies vary per journal. Each journal's specific fees, waiver policy, and funding options are listed on its individual page under \"Author Guidelines.\"",
            order: 4,
          },
          {
            title: 'How are DOIs assigned to published articles?',
            content:
              'Every accepted article receives a persistent DOI registered with Crossref at the time of publication. Crossmark is enabled so readers are notified of any subsequent corrections or updates.',
            order: 5,
          },
          {
            title: 'Why do you recommend an ORCID iD?',
            content:
              'ORCID provides a unique, persistent identifier that disambiguates your authorship across journals and databases. We collect ORCID iDs at submission so your publications are reliably linked to your scholarly record.',
            order: 6,
          },
          {
            title: 'How do I volunteer as a reviewer?',
            content:
              "Contact the journal's editorial office directly — contact details are on each journal's page — or indicate your interest through your SubmitManager profile. Editors invite reviewers based on subject expertise and prior review history.",
            order: 7,
          },
          {
            title: 'How is long-term access to my article guaranteed?',
            content:
              'All journals hosted by DigitoPub are archived with Portico and CLOCKSS, ensuring permanent access even if a journal ceases publication. Content is also indexed with major discovery services where eligible.',
            order: 8,
          },
        ],
      },
    ]

    for (const seed of helpSeed) {
      const category = await prisma.helpCategory.upsert({
        where: { slug: seed.slug },
        update: {}, // Never overwrite admin edits after first run
        create: {
          slug: seed.slug,
          title: seed.title,
        },
      })

      // HelpTopic has no unique composite key, so upsert by (category_id, title)
      // via findFirst + conditional create. Existing topics are left untouched
      // regardless of content drift — the admin is the source of truth after
      // the first seed.
      for (const topic of seed.topics) {
        const existing = await prisma.helpTopic.findFirst({
          where: { category_id: category.id, title: topic.title },
          select: { id: true },
        })
        if (!existing) {
          await prisma.helpTopic.create({
            data: {
              category_id: category.id,
              title: topic.title,
              content: topic.content,
              order: topic.order,
              is_active: true,
            },
          })
        }
      }
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
