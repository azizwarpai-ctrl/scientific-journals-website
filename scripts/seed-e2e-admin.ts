/**
 * Seeds (or updates) the admin user Playwright logs in as. CI-only helper —
 * runs after `prisma migrate deploy` against the ephemeral MySQL service.
 *
 * Usage: ADMIN_EMAIL=… ADMIN_PASSWORD=… bun run scripts/seed-e2e-admin.ts
 */

import "dotenv/config"
import bcrypt from "bcryptjs"
import { prisma } from "@/src/lib/db/config"

async function main() {
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    if (!email || !password) {
        console.error("[seed-e2e-admin] ADMIN_EMAIL and ADMIN_PASSWORD are required.")
        process.exit(1)
    }

    const password_hash = await bcrypt.hash(password, 10)
    await prisma.adminUser.upsert({
        where: { email },
        create: {
            email,
            full_name: "E2E Admin",
            role: "superadmin",
            password_hash,
        },
        update: { password_hash, role: "superadmin" },
    })
    console.log(`[seed-e2e-admin] Admin ${email} ready.`)
}

main()
    .catch((err) => {
        console.error("[seed-e2e-admin] failed:", err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
