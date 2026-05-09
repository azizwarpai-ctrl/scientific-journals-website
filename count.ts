import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.journal.count().then(count => console.log('Journal count:', count)).finally(() => prisma.$disconnect());
