const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sections = await prisma.aboutSection.findMany();
  console.log("Sections count:", sections.length);
  if (sections.length > 0) {
      console.log(sections);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
