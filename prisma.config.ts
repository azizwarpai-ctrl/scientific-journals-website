import { defineConfig } from '@prisma/config'
import 'dotenv/config'

console.log('DEBUG: POSTGRES_URL exists:', !!process.env.POSTGRES_URL)


export default defineConfig({
    datasource: {
        url: process.env.POSTGRES_URL,
    },
    migrations: {
        seed: 'bun prisma/seed.ts',
    },
})
