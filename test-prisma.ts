import { prisma } from './src/lib/db/config';

async function main() {
  try {
    const res = await prisma.aboutSection.findMany();
    console.log("Success:", JSON.stringify(res, (_, v) => typeof v === 'bigint' ? v.toString() : v));
  } catch (e) {
    console.error("Error:", (e as Error).message);
  }
  await prisma.$disconnect();
}
main();
