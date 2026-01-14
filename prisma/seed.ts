import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'scientific_journals_db',
  connectionLimit: 5,
})

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
})


async function main() {
  console.log('🌱 Seeding database...')
  console.log('📍 Using:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'))

  // Create default admin user
  const email = 'admin@digitopub.com'
  const password = 'admin123'
  const hashedPassword = await bcrypt.hash(password, 10)

  const adminUser = await prisma.adminUser.upsert({
    where: { email },
    update: {
      password_hash: hashedPassword,
    },
    create: {
      email,
      full_name: 'DigitoPub Admin',
      role: 'admin',
      password_hash: hashedPassword,
    },
  })

  console.log('✅ Admin user created/updated:')
  console.log('   📧 Email:', email)
  console.log('   🔑 Password: admin123')
  console.log('   🆔 ID:', adminUser.id.toString())
  console.log('   👤 Name:', adminUser.full_name)
}

main()
  .then(async () => {
    console.log('\n✅ Seeding completed successfully!')
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('\n❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
