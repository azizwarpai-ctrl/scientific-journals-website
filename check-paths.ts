import { prisma } from "./src/lib/db/config"

async function checkPaths() {
  const journals = await prisma.journal.findMany({
    select: { id: true, title: true, ojs_path: true }
  })
  console.log("=== JOURNAL OJS PATHS ===")
  console.dir(journals, { depth: null })
  console.log("=========================")
}

checkPaths().catch(console.error).finally(() => prisma.$disconnect())
