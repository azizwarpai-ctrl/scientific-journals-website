import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { journalRouter } from "@/src/features/journals/server"
import { faqRouter } from "@/src/features/faq/server"
import { solutionRouter } from "@/src/features/solutions/server/route"
import { helpRouter } from "@/src/features/help/server"
import { ojsRouter } from "@/src/features/ojs/server"
import { authRouter } from "@/src/features/auth/server"
import { messageRouter } from "@/src/features/messages/server"
import { metricsRouter } from "@/src/features/metrics/server"
import { reviewsRouter } from "@/src/features/reviews/server"
import { aboutRouter } from "@/src/features/about/server"
import { statisticsRouter } from "@/src/features/statistics/server"
import { emailTemplateRouter } from "@/src/features/email-templates/server"
import { billingRouter } from "@/src/features/billing/server"
import { searchRouter } from "@/src/features/search/server"
import { fetchFromDatabase } from "@/src/features/ojs/server/ojs-service"
import { triggerStartupSync } from "@/src/features/ojs/server/sync-ojs-journals"

const apiApp = new Hono()
    .route("/journals", journalRouter)
    .route("/faqs", faqRouter)
    .route("/solutions", solutionRouter)
    .route("/help", helpRouter)
    .route("/auth", authRouter)
    .route("/messages", messageRouter)
    .route("/ojs", ojsRouter)
    .route("/metrics", metricsRouter)
    .route("/reviews", reviewsRouter)
    .route("/about", aboutRouter)
    .route("/statistics", statisticsRouter)
    .route("/email-templates", emailTemplateRouter)
    .route("/billing", billingRouter)
    .route("/search", searchRouter)


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

// Prevent all browsers and CDNs from caching API responses
// This is critical on Hostinger where hcdn can cache stale 403s
app.use("/*", async (c, next) => {
    await next()
    c.res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    c.res.headers.set("Pragma", "no-cache")
})

// Ensure background startup sync fires on the first few requests if not completed
app.use("/*", async (c, next) => {
    if (!c.req.path.includes("/ojs/sync")) {
        triggerStartupSync(() => fetchFromDatabase(true))
    }
    await next()
})

// Mount API routes
app.route("/", apiApp)

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

export type AppType = typeof apiApp
export { app }
