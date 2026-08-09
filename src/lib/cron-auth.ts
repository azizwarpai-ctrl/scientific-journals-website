import { createHash, timingSafeEqual } from "crypto"

/**
 * Verifies a `Authorization: Bearer <CRON_SECRET>` header in constant time.
 *
 * Both sides are hashed to a fixed length before comparison so neither the
 * secret's length nor its bytes leak through timing. Returns false when the
 * secret is unset — cron endpoints fail closed.
 */
export function verifyCronSecret(authorizationHeader: string | undefined): boolean {
    const token = authorizationHeader?.startsWith("Bearer ")
        ? authorizationHeader.slice(7)
        : null
    const secret = process.env.CRON_SECRET
    if (!secret || !token) return false

    const tokenDigest = createHash("sha256").update(token).digest()
    const secretDigest = createHash("sha256").update(secret).digest()
    return timingSafeEqual(tokenDigest, secretDigest)
}
