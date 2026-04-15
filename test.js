const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const sections = await prisma.aboutSection.findMany({ include: { items: true }});
    console.log(JSON.stringify(sections, null, 2));
}
main();
