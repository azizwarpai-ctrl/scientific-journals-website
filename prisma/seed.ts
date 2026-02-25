import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'

/**
 * Parse DATABASE_URL to extract connection parameters.
 * Supports format: mysql://user:password@host:port/database
 */
function parseConnectionConfig() {
  const databaseUrl = process.env.DATABASE_URL

  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl)
      return {
        host: url.hostname || 'localhost',
        port: parseInt(url.port || '3306'),
        user: decodeURIComponent(url.username || 'root'),
        password: decodeURIComponent(url.password || ''),
        database: url.pathname.replace(/^\//, '') || 'scientific_journals_db',
      }
    } catch (e) {
      console.warn('⚠️  Failed to parse DATABASE_URL, falling back to individual env vars')
    }
  }

  // Fallback to individual environment variables
  return {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'scientific_journals_db',
  }
}

const config = parseConnectionConfig()
console.log(`📡 Connecting to: ${config.user}@${config.host}:${config.port}/${config.database}`)

const adapter = new PrismaMariaDb({
  ...config,
  connectionLimit: 5,
})

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
})



async function main() {
  console.log('🌱 Seeding database...')
  console.log('📍 Database:', process.env.DATABASE_NAME || 'scientific_journals_db')
  console.log('')

  // ════════════════════════════════════════════════
  // 1. ADMIN USERS (8 users: 1 superadmin, 2 admins, 2 editors, 3 authors)
  // ════════════════════════════════════════════════
  console.log('👤 Creating users...')
  const passwordHash = await bcrypt.hash('Test@2026!', 10)
  const simpleHash = await bcrypt.hash('author123', 10)

  const superadmin = await prisma.adminUser.upsert({
    where: { email: 'admin@digitopub.com' },
    update: { password_hash: passwordHash },
    create: {
      email: 'admin@digitopub.com',
      full_name: 'DigitoPub Super Admin',
      role: 'admin',
      password_hash: passwordHash,
    },
  })

  const admin2 = await prisma.adminUser.upsert({
    where: { email: 'sarah.ahmed@digitopub.com' },
    update: { password_hash: passwordHash },
    create: {
      email: 'sarah.ahmed@digitopub.com',
      full_name: 'Dr. Sarah Ahmed',
      role: 'admin',
      password_hash: passwordHash,
    },
  })

  const editor1 = await prisma.adminUser.upsert({
    where: { email: 'editor.karim@digitopub.com' },
    update: { password_hash: passwordHash },
    create: {
      email: 'editor.karim@digitopub.com',
      full_name: 'Prof. Karim Benaissa',
      role: 'editor',
      password_hash: passwordHash,
    },
  })

  const editor2 = await prisma.adminUser.upsert({
    where: { email: 'editor.fatima@digitopub.com' },
    update: { password_hash: passwordHash },
    create: {
      email: 'editor.fatima@digitopub.com',
      full_name: 'Dr. Fatima Zahra',
      role: 'editor',
      password_hash: passwordHash,
    },
  })

  const author1 = await prisma.adminUser.upsert({
    where: { email: 'author.ali@university.edu' },
    update: { password_hash: simpleHash },
    create: {
      email: 'author.ali@university.edu',
      full_name: 'Ali Mansour',
      role: 'author',
      password_hash: simpleHash,
    },
  })

  const author2 = await prisma.adminUser.upsert({
    where: { email: 'author.nadia@research.org' },
    update: { password_hash: simpleHash },
    create: {
      email: 'author.nadia@research.org',
      full_name: 'Dr. Nadia Khalil',
      role: 'author',
      password_hash: simpleHash,
    },
  })

  const author3 = await prisma.adminUser.upsert({
    where: { email: 'author.youssef@lab.ac' },
    update: { password_hash: simpleHash },
    create: {
      email: 'author.youssef@lab.ac',
      full_name: 'Youssef El Amrani',
      role: 'author',
      password_hash: simpleHash,
    },
  })

  const reviewer1 = await prisma.adminUser.upsert({
    where: { email: 'reviewer.hassan@institute.edu' },
    update: { password_hash: simpleHash },
    create: {
      email: 'reviewer.hassan@institute.edu',
      full_name: 'Prof. Hassan Benali',
      role: 'reviewer',
      password_hash: simpleHash,
    },
  })

  console.log(`   ✅ Created 8 users`)
  console.log(`   📧 Superadmin: admin@digitopub.com / Test@2026!`)
  console.log(`   📧 Admin: sarah.ahmed@digitopub.com / Test@2026!`)
  console.log(`   📧 Author: author.ali@university.edu / author123`)

  // ════════════════════════════════════════════════
  // 2. JOURNALS (6 journals: 4 active, 1 inactive, 1 suspended)
  // ════════════════════════════════════════════════
  console.log('\n📚 Creating journals...')

  const journal1 = await prisma.journal.upsert({
    where: { issn: '2708-5001' },
    update: {},
    create: {
      title: 'International Journal of Computer Science and Artificial Intelligence',
      abbreviation: 'IJCSAI',
      issn: '2708-5001',
      e_issn: '2708-501X',
      description: 'A peer-reviewed international journal publishing high-quality research papers in computer science, artificial intelligence, machine learning, and data science. The journal covers both theoretical foundations and practical applications.',
      field: 'Computer Science',
      publisher: 'DigitoPub Academic Press',
      editor_in_chief: 'Prof. Karim Benaissa',
      frequency: 'Quarterly',
      submission_fee: 0,
      publication_fee: 150,
      website_url: 'https://digitopub.com/journals/ijcsai',
      status: 'active',
      created_by: superadmin.id,
    },
  })

  const journal2 = await prisma.journal.upsert({
    where: { issn: '2708-5002' },
    update: {},
    create: {
      title: 'Journal of Environmental Sciences and Sustainability',
      abbreviation: 'JESS',
      issn: '2708-5002',
      e_issn: '2708-502X',
      description: 'An interdisciplinary journal focusing on environmental research, sustainability studies, climate change, renewable energy, and ecological conservation. Published biannually.',
      field: 'Environmental Science',
      publisher: 'DigitoPub Academic Press',
      editor_in_chief: 'Dr. Fatima Zahra',
      frequency: 'Biannual',
      submission_fee: 0,
      publication_fee: 100,
      website_url: 'https://digitopub.com/journals/jess',
      status: 'active',
      created_by: superadmin.id,
    },
  })

  const journal3 = await prisma.journal.upsert({
    where: { issn: '2708-5003' },
    update: {},
    create: {
      title: 'Mediterranean Medical Research Journal',
      abbreviation: 'MMRJ',
      issn: '2708-5003',
      e_issn: '2708-503X',
      description: 'A peer-reviewed medical journal covering clinical research, public health, pharmacology, and biomedical sciences with a focus on Mediterranean region health challenges.',
      field: 'Medical Sciences',
      publisher: 'DigitoPub Academic Press',
      editor_in_chief: 'Dr. Sarah Ahmed',
      frequency: 'Monthly',
      submission_fee: 25,
      publication_fee: 200,
      status: 'active',
      created_by: admin2.id,
    },
  })

  const journal4 = await prisma.journal.upsert({
    where: { issn: '2708-5004' },
    update: {},
    create: {
      title: 'Journal of Applied Mathematics and Engineering',
      abbreviation: 'JAME',
      issn: '2708-5004',
      e_issn: '2708-504X',
      description: 'Publishes original research in applied mathematics, numerical methods, optimization, and their applications in engineering disciplines.',
      field: 'Mathematics & Engineering',
      publisher: 'DigitoPub Academic Press',
      editor_in_chief: 'Prof. Karim Benaissa',
      frequency: 'Quarterly',
      submission_fee: 0,
      publication_fee: 120,
      status: 'active',
      created_by: superadmin.id,
    },
  })

  const journal5 = await prisma.journal.upsert({
    where: { issn: '2708-5005' },
    update: {},
    create: {
      title: 'Review of Social Sciences and Humanities',
      abbreviation: 'RSSH',
      issn: '2708-5005',
      description: 'An interdisciplinary journal covering sociology, philosophy, linguistics, history, and cultural studies.',
      field: 'Social Sciences',
      publisher: 'DigitoPub Academic Press',
      frequency: 'Annual',
      submission_fee: 0,
      publication_fee: 0,
      status: 'inactive',
      created_by: admin2.id,
    },
  })

  const journal6 = await prisma.journal.upsert({
    where: { issn: '2708-5006' },
    update: {},
    create: {
      title: 'Advances in Agricultural Biotechnology',
      abbreviation: 'AAB',
      issn: '2708-5006',
      e_issn: '2708-506X',
      description: 'Focused on biotechnology applications in agriculture, including genetic engineering, crop improvement, and sustainable farming technologies.',
      field: 'Agricultural Sciences',
      publisher: 'DigitoPub Academic Press',
      editor_in_chief: 'Dr. Fatima Zahra',
      frequency: 'Biannual',
      submission_fee: 10,
      publication_fee: 80,
      status: 'suspended',
      created_by: superadmin.id,
    },
  })

  console.log(`   ✅ Created 6 journals`)

  // ════════════════════════════════════════════════
  // 3. SUBMISSIONS (12 submissions in various statuses)
  // ════════════════════════════════════════════════
  console.log('\n📝 Creating submissions...')

  const sub1 = await prisma.submission.create({
    data: {
      journal_id: journal1.id,
      manuscript_title: 'Deep Learning Approaches for Arabic Natural Language Processing: A Comprehensive Survey',
      abstract: 'This paper presents a comprehensive survey of deep learning techniques applied to Arabic NLP tasks, including sentiment analysis, named entity recognition, and machine translation. We review over 150 recent publications and identify key trends and future research directions.',
      keywords: JSON.stringify(['deep learning', 'NLP', 'Arabic', 'machine translation', 'sentiment analysis']),
      submission_type: 'review_article',
      author_name: 'Ali Mansour',
      author_email: 'author.ali@university.edu',
      corresponding_author_name: 'Ali Mansour',
      corresponding_author_email: 'author.ali@university.edu',
      co_authors: JSON.stringify([
        { name: 'Dr. Nadia Khalil', email: 'author.nadia@research.org', affiliation: 'National Research Center' }
      ]),
      status: 'under_review',
      assigned_to: editor1.id,
      created_by: author1.id,
    },
  })

  const sub2 = await prisma.submission.create({
    data: {
      journal_id: journal1.id,
      manuscript_title: 'A Novel Federated Learning Framework for Privacy-Preserving Healthcare Analytics',
      abstract: 'We propose a federated learning framework designed specifically for healthcare institutions that enables collaborative model training without sharing sensitive patient data. Our approach achieves 94% accuracy on benchmark medical datasets while maintaining strict privacy guarantees.',
      keywords: JSON.stringify(['federated learning', 'privacy', 'healthcare', 'machine learning']),
      submission_type: 'original_research',
      author_name: 'Dr. Nadia Khalil',
      author_email: 'author.nadia@research.org',
      status: 'accepted',
      assigned_to: editor1.id,
      created_by: author2.id,
    },
  })

  const sub3 = await prisma.submission.create({
    data: {
      journal_id: journal2.id,
      manuscript_title: 'Impact of Climate Change on Olive Production in the Mediterranean Basin: A Multi-Decadal Analysis',
      abstract: 'Using satellite imagery and ground-truth data spanning 30 years, this study quantifies the impact of rising temperatures and changing precipitation patterns on olive cultivation across 12 Mediterranean countries.',
      keywords: JSON.stringify(['climate change', 'olive production', 'Mediterranean', 'agriculture']),
      submission_type: 'original_research',
      author_name: 'Youssef El Amrani',
      author_email: 'author.youssef@lab.ac',
      corresponding_author_name: 'Youssef El Amrani',
      corresponding_author_email: 'author.youssef@lab.ac',
      status: 'published',
      assigned_to: editor2.id,
      created_by: author3.id,
    },
  })

  const sub4 = await prisma.submission.create({
    data: {
      journal_id: journal2.id,
      manuscript_title: 'Solar-Powered Water Desalination: A Cost-Effectiveness Study in North Africa',
      abstract: 'This paper evaluates the economic feasibility of solar-powered reverse osmosis desalination systems deployed across three pilot sites in North Africa, comparing them against conventional energy-powered alternatives.',
      keywords: JSON.stringify(['solar energy', 'desalination', 'North Africa', 'sustainability']),
      submission_type: 'original_research',
      author_name: 'Ali Mansour',
      author_email: 'author.ali@university.edu',
      status: 'submitted',
      created_by: author1.id,
    },
  })

  const sub5 = await prisma.submission.create({
    data: {
      journal_id: journal3.id,
      manuscript_title: 'Prevalence of Antibiotic Resistance in Hospital-Acquired Infections: A Meta-Analysis',
      abstract: 'A systematic meta-analysis of 85 studies from 23 countries examining the prevalence of antibiotic-resistant bacteria in hospital settings, with a focus on MRSA, VRE, and carbapenem-resistant Enterobacteriaceae.',
      keywords: JSON.stringify(['antibiotic resistance', 'hospital infections', 'meta-analysis', 'MRSA']),
      submission_type: 'review_article',
      author_name: 'Dr. Nadia Khalil',
      author_email: 'author.nadia@research.org',
      status: 'revision_requested',
      assigned_to: editor2.id,
      created_by: author2.id,
      notes: 'Please address reviewer comments regarding the inclusion criteria for studies published before 2015.',
    },
  })

  const sub6 = await prisma.submission.create({
    data: {
      journal_id: journal3.id,
      manuscript_title: 'Traditional Medicinal Plants of the Atlas Mountains: Phytochemical Screening and Biological Activities',
      abstract: 'We performed phytochemical screening of 42 traditional medicinal plants collected from the Atlas Mountains region, evaluating their antioxidant, antimicrobial, and anti-inflammatory activities.',
      keywords: JSON.stringify(['medicinal plants', 'phytochemistry', 'Atlas Mountains', 'antioxidant']),
      submission_type: 'original_research',
      author_name: 'Youssef El Amrani',
      author_email: 'author.youssef@lab.ac',
      status: 'under_review',
      assigned_to: editor1.id,
      created_by: author3.id,
    },
  })

  const sub7 = await prisma.submission.create({
    data: {
      journal_id: journal4.id,
      manuscript_title: 'Optimal Control Strategies for Smart Grid Energy Distribution',
      abstract: 'This paper develops optimal control strategies for energy distribution in smart grids using dynamic programming and reinforcement learning, demonstrating a 23% improvement in energy efficiency.',
      keywords: JSON.stringify(['smart grid', 'optimal control', 'energy distribution', 'reinforcement learning']),
      submission_type: 'original_research',
      author_name: 'Ali Mansour',
      author_email: 'author.ali@university.edu',
      status: 'published',
      assigned_to: editor1.id,
      created_by: author1.id,
    },
  })

  const sub8 = await prisma.submission.create({
    data: {
      journal_id: journal4.id,
      manuscript_title: 'Numerical Methods for Fractional Differential Equations: A Comparative Study',
      abstract: 'We compare five numerical methods for solving fractional differential equations, analyzing their convergence rates, stability properties, and computational efficiency on a suite of benchmark problems.',
      keywords: JSON.stringify(['fractional calculus', 'numerical methods', 'differential equations']),
      submission_type: 'original_research',
      author_name: 'Dr. Nadia Khalil',
      author_email: 'author.nadia@research.org',
      status: 'accepted',
      assigned_to: editor2.id,
      created_by: author2.id,
    },
  })

  const sub9 = await prisma.submission.create({
    data: {
      journal_id: journal1.id,
      manuscript_title: 'Blockchain-Based Supply Chain Traceability: Implementation Challenges and Solutions',
      abstract: 'This paper examines the practical challenges of implementing blockchain technology for supply chain traceability, drawing on case studies from three large-scale deployments in the food industry.',
      keywords: JSON.stringify(['blockchain', 'supply chain', 'traceability', 'food industry']),
      submission_type: 'case_study',
      author_name: 'Youssef El Amrani',
      author_email: 'author.youssef@lab.ac',
      status: 'rejected',
      assigned_to: editor1.id,
      created_by: author3.id,
      notes: 'The paper does not present sufficient novelty beyond existing literature. Consider targeting a workshop or short paper venue.',
    },
  })

  const sub10 = await prisma.submission.create({
    data: {
      journal_id: journal2.id,
      manuscript_title: 'Microplastic Contamination in Coastal Wetlands: Detection Methods and Ecological Impact',
      abstract: 'We develop improved spectroscopic methods for detecting microplastic particles in wetland sediments and assess their ecological impact on benthic organisms across six Mediterranean coastal sites.',
      keywords: JSON.stringify(['microplastics', 'wetlands', 'contamination', 'ecology']),
      submission_type: 'original_research',
      author_name: 'Ali Mansour',
      author_email: 'author.ali@university.edu',
      status: 'submitted',
    },
  })

  const sub11 = await prisma.submission.create({
    data: {
      journal_id: journal3.id,
      manuscript_title: 'COVID-19 Long-Term Effects on Pediatric Mental Health: A Longitudinal Cohort Study',
      abstract: 'A three-year longitudinal study following 1,200 children aged 6-14 to assess the long-term psychological effects of the COVID-19 pandemic, including anxiety, depression, and social isolation.',
      keywords: JSON.stringify(['COVID-19', 'pediatric', 'mental health', 'longitudinal study']),
      submission_type: 'original_research',
      author_name: 'Dr. Nadia Khalil',
      author_email: 'author.nadia@research.org',
      status: 'published',
      assigned_to: editor2.id,
      created_by: author2.id,
    },
  })

  const sub12 = await prisma.submission.create({
    data: {
      journal_id: journal1.id,
      manuscript_title: 'Edge Computing for Real-Time IoT Data Processing: Architecture and Implementation',
      abstract: 'We propose an edge computing architecture for processing IoT sensor data in real-time, reducing cloud communication overhead by 67% while maintaining data processing accuracy above 99%.',
      keywords: JSON.stringify(['edge computing', 'IoT', 'real-time processing', 'architecture']),
      submission_type: 'original_research',
      author_name: 'Youssef El Amrani',
      author_email: 'author.youssef@lab.ac',
      status: 'submitted',
    },
  })

  console.log(`   ✅ Created 12 submissions`)

  // ════════════════════════════════════════════════
  // 4. REVIEWS (8 reviews for various submissions)
  // ════════════════════════════════════════════════
  console.log('\n🔍 Creating reviews...')

  await prisma.review.createMany({
    data: [
      {
        submission_id: sub1.id,
        reviewer_name: 'Prof. Hassan Benali',
        reviewer_email: 'reviewer.hassan@institute.edu',
        reviewer_affiliation: 'Institute of Advanced Studies',
        review_status: 'completed',
        recommendation: 'minor_revision',
        comments_to_author: 'The survey is comprehensive but could benefit from a more detailed comparison table in Section 4. Also, please address the recent work by Al-Khouri et al. (2025) which is highly relevant.',
        comments_to_editor: 'Solid survey paper. I recommend acceptance after minor revisions as suggested.',
        review_date: new Date('2026-01-15'),
        assigned_by: editor1.id,
      },
      {
        submission_id: sub1.id,
        reviewer_name: 'Dr. Leila Benkhaled',
        reviewer_email: 'leila.benkhaled@univ-tech.edu',
        reviewer_affiliation: 'University of Technology',
        review_status: 'completed',
        recommendation: 'accept',
        comments_to_author: 'Excellent work. The taxonomy of Arabic NLP approaches is particularly well-structured. Minor typos on pages 12 and 15.',
        comments_to_editor: 'Strong contribution to the field. Accept as-is or with minor corrections.',
        review_date: new Date('2026-01-20'),
        assigned_by: editor1.id,
      },
      {
        submission_id: sub2.id,
        reviewer_name: 'Prof. Hassan Benali',
        reviewer_email: 'reviewer.hassan@institute.edu',
        reviewer_affiliation: 'Institute of Advanced Studies',
        review_status: 'completed',
        recommendation: 'accept',
        comments_to_author: 'The federated learning framework is novel and well-evaluated. The privacy guarantees are rigorously proven.',
        comments_to_editor: 'Recommend immediate acceptance. This is a strong paper for the journal.',
        review_date: new Date('2025-12-10'),
        assigned_by: editor1.id,
      },
      {
        submission_id: sub5.id,
        reviewer_name: 'Dr. Amina Boudiaf',
        reviewer_email: 'amina.boudiaf@hospital.med',
        reviewer_affiliation: 'University Hospital Center',
        review_status: 'completed',
        recommendation: 'major_revision',
        comments_to_author: 'The meta-analysis methodology is sound, but the inclusion of studies from before 2015 introduces significant heterogeneity. Please consider restricting the analysis to post-2018 studies or adding subgroup analyses.',
        comments_to_editor: 'The paper has potential but needs substantial revisions to the methodology section.',
        review_date: new Date('2026-02-01'),
        assigned_by: editor2.id,
      },
      {
        submission_id: sub6.id,
        reviewer_name: 'Prof. Hassan Benali',
        reviewer_email: 'reviewer.hassan@institute.edu',
        reviewer_affiliation: 'Institute of Advanced Studies',
        review_status: 'pending',
        assigned_by: editor1.id,
      },
      {
        submission_id: sub6.id,
        reviewer_name: 'Dr. Rachid Ouahrani',
        reviewer_email: 'rachid.ouahrani@pharma.ac',
        reviewer_affiliation: 'Faculty of Pharmacy',
        review_status: 'pending',
        assigned_by: editor1.id,
      },
      {
        submission_id: sub9.id,
        reviewer_name: 'Dr. Leila Benkhaled',
        reviewer_email: 'leila.benkhaled@univ-tech.edu',
        reviewer_affiliation: 'University of Technology',
        review_status: 'completed',
        recommendation: 'reject',
        comments_to_author: 'While the topic is timely, the paper does not present sufficient novelty. The case studies lack depth and the comparison with existing blockchain solutions is superficial.',
        comments_to_editor: 'I recommend rejection. The paper needs significant reworking before it is suitable for this journal.',
        review_date: new Date('2026-01-28'),
        assigned_by: editor1.id,
      },
      {
        submission_id: sub8.id,
        reviewer_name: 'Dr. Amina Boudiaf',
        reviewer_email: 'amina.boudiaf@hospital.med',
        reviewer_affiliation: 'University Hospital Center',
        review_status: 'completed',
        recommendation: 'accept',
        comments_to_author: 'The comparative analysis is thorough and the convergence proofs are correct. Well-written paper.',
        comments_to_editor: 'Solid mathematical contribution. Recommend acceptance.',
        review_date: new Date('2026-02-10'),
        assigned_by: editor2.id,
      },
    ],
  })

  console.log(`   ✅ Created 8 reviews`)

  // ════════════════════════════════════════════════
  // 5. PUBLISHED ARTICLES (5 articles with DOIs and metrics)
  // ════════════════════════════════════════════════
  console.log('\n📖 Creating published articles...')

  await prisma.publishedArticle.createMany({
    data: [
      {
        submission_id: sub3.id,
        journal_id: journal2.id,
        doi: '10.5555/jess.2025.003',
        volume: 4,
        issue: 2,
        page_start: 45,
        page_end: 68,
        publication_date: new Date('2025-12-01'),
        pdf_url: '/articles/jess-v4-i2-003.pdf',
        views_count: 342,
        downloads_count: 89,
        citations_count: 5,
        published_by: admin2.id,
      },
      {
        submission_id: sub7.id,
        journal_id: journal4.id,
        doi: '10.5555/jame.2026.001',
        volume: 3,
        issue: 1,
        page_start: 1,
        page_end: 22,
        publication_date: new Date('2026-01-15'),
        pdf_url: '/articles/jame-v3-i1-001.pdf',
        views_count: 215,
        downloads_count: 56,
        citations_count: 2,
        published_by: superadmin.id,
      },
      {
        submission_id: sub11.id,
        journal_id: journal3.id,
        doi: '10.5555/mmrj.2026.007',
        volume: 8,
        issue: 2,
        page_start: 112,
        page_end: 134,
        publication_date: new Date('2026-02-01'),
        pdf_url: '/articles/mmrj-v8-i2-007.pdf',
        views_count: 1280,
        downloads_count: 401,
        citations_count: 12,
        published_by: admin2.id,
      },
      {
        submission_id: sub2.id,
        journal_id: journal1.id,
        doi: '10.5555/ijcsai.2026.004',
        volume: 6,
        issue: 1,
        page_start: 78,
        page_end: 95,
        publication_date: new Date('2026-02-15'),
        pdf_url: '/articles/ijcsai-v6-i1-004.pdf',
        views_count: 156,
        downloads_count: 34,
        citations_count: 0,
        published_by: superadmin.id,
      },
      {
        submission_id: sub8.id,
        journal_id: journal4.id,
        doi: '10.5555/jame.2026.002',
        volume: 3,
        issue: 1,
        page_start: 23,
        page_end: 41,
        publication_date: new Date('2026-02-20'),
        pdf_url: '/articles/jame-v3-i1-002.pdf',
        views_count: 78,
        downloads_count: 18,
        citations_count: 0,
        published_by: superadmin.id,
      },
    ],
  })

  console.log(`   ✅ Created 5 published articles`)

  // ════════════════════════════════════════════════
  // 6. SYSTEM SETTINGS (4 configuration entries)
  // ════════════════════════════════════════════════
  console.log('\n⚙️  Creating system settings...')

  const settings = [
    {
      setting_key: 'site_name',
      setting_value: JSON.stringify('DigitoPub — Scientific Journals Platform'),
      description: 'The display name for the platform shown in headers and page titles.',
    },
    {
      setting_key: 'contact_email',
      setting_value: JSON.stringify('contact@digitopub.com'),
      description: 'Primary contact email address displayed on the contact page and footer.',
    },
    {
      setting_key: 'maintenance_mode',
      setting_value: JSON.stringify(false),
      description: 'When enabled, the site shows a maintenance page to all non-admin users.',
    },
    {
      setting_key: 'analytics_enabled',
      setting_value: JSON.stringify(true),
      description: 'Whether Google Analytics / tracking scripts are loaded on public pages.',
    },
  ]

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { setting_key: setting.setting_key },
      update: { setting_value: setting.setting_value },
      create: { ...setting, updated_by: superadmin.id },
    })
  }

  console.log(`   ✅ Created 4 system settings`)

  // ════════════════════════════════════════════════
  // 7. MESSAGES (10 contact messages in various statuses)
  // ════════════════════════════════════════════════
  console.log('\n💬 Creating messages...')

  await prisma.message.createMany({
    data: [
      {
        name: 'Mohammed Tazi',
        email: 'mohammed.tazi@gmail.com',
        subject: 'Submission fee waiver request',
        message: 'Dear DigitoPub team, I am a PhD student from a developing country and would like to request a waiver for the submission fee for the IJCSAI journal. My research focuses on NLP for low-resource Arabic dialects. I have attached my student ID for verification.',
        message_type: 'submission_help',
        status: 'unread',
      },
      {
        name: 'Prof. Elena Popescu',
        email: 'elena.popescu@univ-bucharest.ro',
        subject: 'Partnership proposal for special issue',
        message: 'We are organizing a conference on Sustainable Computing and would like to propose a special issue of IJCSAI for selected papers. Would your editorial team be interested in discussing this collaboration?',
        message_type: 'partnership',
        status: 'unread',
      },
      {
        name: 'Rachid Amhaloui',
        email: 'rachid.amhaloui@outlook.com',
        subject: 'Cannot upload manuscript file',
        message: 'I have been trying to upload my manuscript (PDF, 4.2 MB) but the upload keeps failing. I have tried different browsers (Chrome, Firefox) without success. Please advise.',
        message_type: 'technical_support',
        status: 'read',
      },
      {
        name: 'Dr. Samira Khelifi',
        email: 'samira.khelifi@univ-constantine.dz',
        subject: 'Review timeline inquiry',
        message: 'I submitted my manuscript (ID: SUB-2026-089) to MMRJ two months ago and have not received any update. Could you please check the review status and provide an estimated timeline?',
        message_type: 'editorial',
        status: 'replied',
      },
      {
        name: 'Ahmed Bouzid',
        email: 'ahmed.bouzid@hotmail.com',
        subject: 'Interested in joining the editorial board',
        message: 'I am an Associate Professor with 15 years of experience in Environmental Science. I would like to express my interest in joining the editorial board of JESS. My CV and publication list are available upon request.',
        message_type: 'general',
        status: 'unread',
      },
      {
        name: 'Sophia Chen',
        email: 'sophia.chen@stanford.edu',
        subject: 'Indexing question',
        message: 'Is the International Journal of Computer Science and Artificial Intelligence indexed in Scopus or Web of Science? I need this information for my tenure evaluation. Thank you.',
        message_type: 'general',
        status: 'replied',
      },
      {
        name: 'Khalid Al-Rashid',
        email: 'khalid.alrashid@kau.edu.sa',
        subject: 'Bulk subscription for university library',
        message: 'We would like to arrange a bulk institutional subscription for our university library covering all DigitoPub journals. Please provide pricing details and the subscription process.',
        message_type: 'partnership',
        status: 'read',
      },
      {
        name: 'Maria Garcia',
        email: 'maria.garcia@upm.es',
        subject: 'LaTeX template not available',
        message: 'The author guidelines mention a LaTeX template but the download link on the JAME journal page returns a 404 error. Could you please fix this or email me the template directly?',
        message_type: 'technical_support',
        status: 'archived',
      },
      {
        name: 'Omar Benaissa',
        email: 'omar.benaissa@esi.dz',
        subject: 'Congratulations on the new platform',
        message: 'I just wanted to say how impressed I am with the new DigitoPub platform. The design is clean and the submission process is much smoother than other journals I have published with. Keep up the great work!',
        message_type: 'general',
        status: 'read',
      },
      {
        name: 'Anonymous Reporter',
        email: 'anonymous@protonmail.com',
        subject: 'Potential plagiarism report',
        message: 'I believe the article published in MMRJ Volume 8, Issue 1 (pages 34-52) contains substantial overlap with a previously published paper in Journal of Medical Research. I am attaching the comparison for your editorial review.',
        message_type: 'editorial',
        status: 'unread',
      },
    ],
  })

  console.log(`   ✅ Created 10 messages`)

  // ════════════════════════════════════════════════
  // 8. FAQ / SOLUTIONS (8 entries: 6 published, 2 draft)
  // ════════════════════════════════════════════════
  console.log('\n❓ Creating FAQ entries...')

  await prisma.fAQ.createMany({
    data: [
      {
        question: 'How do I submit a manuscript to DigitoPub?',
        answer: 'To submit a manuscript: 1) Create an account or log in. 2) Select the appropriate journal for your research. 3) Prepare your manuscript according to the journal\'s author guidelines. 4) Upload your manuscript and supplementary files through the submission portal. 5) Complete the metadata form with all author information. 6) Submit and track your progress through the dashboard.',
        category: 'Submission Process',
        is_published: true,
        view_count: 456,
        helpful_count: 89,
      },
      {
        question: 'What file formats are accepted for manuscript submission?',
        answer: 'We accept manuscripts in the following formats: PDF (preferred), Microsoft Word (.docx), LaTeX (.tex with all supporting files in a ZIP archive). Figures should be submitted as separate high-resolution files in TIFF, PNG, or EPS format (minimum 300 DPI).',
        category: 'Submission Process',
        is_published: true,
        view_count: 312,
        helpful_count: 67,
      },
      {
        question: 'How long does the peer review process take?',
        answer: 'The typical peer review timeline is: Initial screening: 1-2 weeks. Peer review: 4-8 weeks. Editorial decision: 1-2 weeks after reviews are received. Revision (if needed): 2-4 weeks for authors. Second review (if needed): 2-4 weeks. Total: approximately 2-4 months from submission to final decision.',
        category: 'Peer Review',
        is_published: true,
        view_count: 834,
        helpful_count: 156,
      },
      {
        question: 'Are there any publication fees?',
        answer: 'Publication fees vary by journal and are listed on each journal\'s page. Some journals offer fee waivers for researchers from low-income countries. Submission fees, where applicable, are non-refundable. Open access publication charges may apply for articles published under CC-BY license.',
        category: 'Fees & Payments',
        is_published: true,
        view_count: 521,
        helpful_count: 98,
      },
      {
        question: 'How can I check the status of my submission?',
        answer: 'You can check your submission status by: 1) Logging into your author dashboard. 2) Navigating to "My Submissions". 3) Each submission displays its current status (Submitted, Under Review, Revision Requested, Accepted, Published, or Rejected). You will also receive email notifications at each stage.',
        category: 'Submission Process',
        is_published: true,
        view_count: 267,
        helpful_count: 45,
      },
      {
        question: 'Is DigitoPub indexed in major databases?',
        answer: 'DigitoPub journals are indexed or in the process of being indexed in: Google Scholar, DOAJ, CrossRef, Scopus (selected journals). We are continuously working to expand our indexing coverage. Please check individual journal pages for current indexing status.',
        category: 'About DigitoPub',
        is_published: true,
        view_count: 689,
        helpful_count: 112,
      },
      {
        question: 'What is the open access policy?',
        answer: 'DRAFT: We are currently finalizing our open access policy. This FAQ will be updated with details about CC-BY and CC-BY-NC licensing options, embargo periods, and green/gold OA pathways.',
        category: 'About DigitoPub',
        is_published: false,
        view_count: 0,
        helpful_count: 0,
      },
      {
        question: 'How do I become a reviewer?',
        answer: 'DRAFT: Information about joining our reviewer pool, including eligibility criteria, application process, and reviewer responsibilities and incentives.',
        category: 'Peer Review',
        is_published: false,
        view_count: 0,
        helpful_count: 0,
      },
    ],
  })

  console.log(`   ✅ Created 8 FAQ entries`)

  // ════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(50))
  console.log('🎉 Seeding completed successfully!')
  console.log('═'.repeat(50))
  console.log('')
  console.log('📊 Summary:')
  console.log('   👤 8 Users (1 superadmin, 2 admins, 2 editors, 3 authors)')
  console.log('   📚 6 Journals (4 active, 1 inactive, 1 suspended)')
  console.log('   📝 12 Submissions (various lifecycle stages)')
  console.log('   🔍 8 Reviews (6 completed, 2 pending)')
  console.log('   📖 5 Published Articles (with DOIs and metrics)')
  console.log('   ⚙️  4 System Settings')
  console.log('   💬 10 Messages (unread, read, replied, archived)')
  console.log('   ❓ 8 FAQ Entries (6 published, 2 draft)')
  console.log('')
  console.log('🔑 Login Credentials:')
  console.log('   Admin:  admin@digitopub.com / Test@2026!')
  console.log('   Admin:  sarah.ahmed@digitopub.com / Test@2026!')
  console.log('   Editor: editor.karim@digitopub.com / Test@2026!')
  console.log('   Author: author.ali@university.edu / author123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('\n❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
