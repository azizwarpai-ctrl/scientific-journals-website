import { defineConfig } from '@prisma/config'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL
  },
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} ./prisma/seed.ts'
  }
})
