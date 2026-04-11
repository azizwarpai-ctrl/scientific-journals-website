import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sections = await prisma.aboutSection.findMany({
    include: { items: true }
  })
  
  console.log("=== ABOUT SECTIONS IN DB ===")
  console.log(JSON.stringify(sections, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  , 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
