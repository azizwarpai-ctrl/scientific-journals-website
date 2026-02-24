import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { journalRouter } from "@/src/features/journals/server"
import { solutionRouter } from "@/src/features/solutions/server"
import { authRouter } from "@/src/features/auth/server"
import { messageRouter } from "@/src/features/messages/server"
import { ojsRouter } from "@/src/features/ojs/server"

const app = new Hono().basePath("/api")

// Global middleware
app.use(
    "/*",
    cors({
        origin: (origin) => {
            const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || []

            // If no allowed origins configured, reject all
            if (allowedOrigins.length === 0) return null

            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return allowedOrigins[0] || null

            // Allow if origin is in the allowlist
            if (allowedOrigins.includes(origin)) {
                return origin
            }

            // Reject non-matching origins
            return null
        },
        credentials: true,
    })
)
app.use("/*", logger())

// Feature routes
const routes = app
    .route("/journals", journalRouter)
    .route("/solutions", solutionRouter)
    .route("/auth", authRouter)
    .route("/messages", messageRouter)
    .route("/ojs", ojsRouter)

// Error handling
app.onError((err, c) => {
    console.error(`[API Error]: ${err}`)
    return c.json(
        {
            success: false,
            error: {
                message: "Internal server error",
                details: process.env.NODE_ENV === "development" ? err.message : undefined,
            },
        },
        500
    )
})

// 404 handler
app.notFound((c) => {
    return c.json(
        {
            success: false,
            error: "Resource not found",
        },
        404
    )
})

export type AppType = typeof routes
export { app }
