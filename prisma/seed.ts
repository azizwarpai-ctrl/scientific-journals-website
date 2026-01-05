import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@example.com'
  const password = 'admin'
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      full_name: 'Default Admin',
      role: 'admin',
      password_hash: hashedPassword,
    },
  })

  console.log({ user })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
