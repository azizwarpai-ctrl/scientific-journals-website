import { prisma } from "@/src/lib/db/config"

/**
 * TOCTOU-safe distributed job lock backed by `system_settings` — the same
 * pattern the OJS sync endpoint has used since its introduction (raw
 * INSERT … ON DUPLICATE KEY UPDATE with an in-SQL expiry check, then a
 * read-back), generalized for any job key.
 *
 * Returns true when the lock was acquired; false when another run holds it
 * (caller should respond 429). The lock self-expires after `windowMs` — no
 * explicit release, which also throttles rapid retries after completion.
 */
export async function acquireJobLock(lockKey: string, windowMs: number): Promise<boolean> {
    const now = new Date().toISOString()
    const windowSec = Math.floor(windowMs / 1000)

    await prisma.$executeRaw`
      INSERT INTO system_settings (setting_key, setting_value, description)
      VALUES (${lockKey}, ${now}, 'Job lock — ISO timestamp of last attempt')
      ON DUPLICATE KEY UPDATE
        setting_value = CASE
          WHEN UNIX_TIMESTAMP(NOW()) - UNIX_TIMESTAMP(setting_value) >= ${windowSec}
          THEN ${now}
          ELSE setting_value
        END
    `

    const lockCheck = await prisma.systemSetting.findUnique({
        where: { setting_key: lockKey },
        select: { setting_value: true },
    })
    return (lockCheck?.setting_value as string | null) === now
}
