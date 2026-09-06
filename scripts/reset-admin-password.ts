/**
 * Resets the password for an admin or support user directly in the database.
 * Uses bcrypt (10 rounds) matching the application's auth requirements.
 *
 * Usage:
 *   RESET_EMAIL="support@digitopub.com" RESET_PASSWORD="YourNewPasswordHere" bun run scripts/reset-admin-password.ts
 */

import "dotenv/config"
import bcrypt from "bcryptjs"
import { prisma } from "@/src/lib/db/config"

async function main() {
  const email = process.env.RESET_EMAIL || process.argv[2]
  const password = process.env.RESET_PASSWORD || process.argv[3]

  if (!email || !password) {
    console.error("Usage:")
    console.error('  RESET_EMAIL="support@digitopub.com" RESET_PASSWORD="<new-password>" bun run scripts/reset-admin-password.ts')
    console.error("  Or pass as arguments: bun run scripts/reset-admin-password.ts <email> <new-password>")
    process.exit(1)
  }

  if (password.length < 6) {
    console.error("Error: Password must be at least 6 characters.")
    process.exit(1)
  }

  console.log(`Looking up admin user: ${email}...`)
  const user = await prisma.adminUser.findUnique({
    where: { email },
  })

  const password_hash = await bcrypt.hash(password, 10)

  if (!user) {
    console.log(`User not found. Creating user ${email}...`)
    await prisma.adminUser.create({
      data: {
        email,
        full_name: "Technical Support",
        role: "admin",
        password_hash,
      },
    })
    console.log(`[Success] User ${email} created with the new password.`)
  } else {
    await prisma.adminUser.update({
      where: { email },
      data: {
        password_hash,
      },
    })
    console.log(`[Success] Password for ${email} updated successfully.`)
  }
}

main()
  .catch((err) => {
    console.error("[reset-admin-password] Error:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
