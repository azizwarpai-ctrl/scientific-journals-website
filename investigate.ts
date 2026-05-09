import { prisma } from './src/lib/db/config';
import { fetchFromDatabase } from './src/features/ojs/server/ojs-service';
import { ojsQuery, isOjsConfigured } from './src/features/ojs/server/ojs-client';

async function main() {
  console.log("OJS Configured:", isOjsConfigured());
  
  try {
    const ojsJournals = await fetchFromDatabase(true);
    console.log(`fetchFromDatabase(true) returned ${ojsJournals.length} journals`);
    console.log("Names:", ojsJournals.map(j => j.path).join(", "));
  } catch (e) {
    console.error("fetchFromDatabase error:", e);
  }

  try {
    const ojsJournalsEnabled = await fetchFromDatabase(false);
    console.log(`fetchFromDatabase(false) returned ${ojsJournalsEnabled.length} journals`);
    console.log("Names:", ojsJournalsEnabled.map(j => j.path).join(", "));
  } catch (e) {
    console.error("fetchFromDatabase(false) error:", e);
  }

  try {
    const rawCount = await ojsQuery("SELECT count(*) as c FROM journals");
    console.log("Raw OJS journals table count:", rawCount);
    
    const rawOjp = await ojsQuery("SELECT * FROM journals WHERE path LIKE '%ojp%'");
    console.log("OJS OJP query:", rawOjp);
  } catch (e) {
    console.error("Raw OJS query error:", e);
  }

  try {
    const localCount = await prisma.journal.count();
    console.log("Local Prisma Journals Count:", localCount);

    const localJournals = await prisma.journal.findMany({ select: { title: true, ojs_path: true, status: true } });
    console.log("Local Prisma Journals:", localJournals);
  } catch (e) {
    console.error("Prisma error:", e);
  }

  process.exit(0);
}

main();
