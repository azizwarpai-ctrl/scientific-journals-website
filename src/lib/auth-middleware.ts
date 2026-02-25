import { getSession } from "@/lib/db/auth"
import { createMiddleware } from "hono/factory"
import type { Context, Next } from "hono"

/**
 * Middleware that requires a valid authenticated session.
 * Returns 401 if no valid JWT session is found.
 */
export const requireAuth = createMiddleware(async (c: Context, next: Next) => {
    const session = await getSession()

    if (!session) {
        return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    // Store session in context for downstream handlers
    c.set("session", session)
    await next()
})

/**
 * Middleware that requires the user to have the "admin" role.
 * Returns 401 if not authenticated, 403 if not an admin.
 */
export const requireAdmin = createMiddleware(async (c: Context, next: Next) => {
    const session = await getSession()

    if (!session) {
        return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    if (session.role !== "admin") {
        return c.json({ success: false, error: "Forbidden: admin access required" }, 403)
    }

    c.set("session", session)
    await next()
})

/**
 * Middleware that requires the user to have one of the specified roles.
 */
export function requireRole(...roles: string[]) {
    return createMiddleware(async (c: Context, next: Next) => {
        const session = await getSession()

        if (!session) {
            return c.json({ success: false, error: "Unauthorized" }, 401)
        }

        if (!roles.includes(session.role)) {
            return c.json(
                { success: false, error: `Forbidden: requires one of [${roles.join(", ")}] role` },
                403
            )
        }

        c.set("session", session)
        await next()
    })
}
