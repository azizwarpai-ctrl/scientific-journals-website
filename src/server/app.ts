import { Hono } from "hono"
import { journalRouter } from "@/src/features/journals/server"
import { solutionRouter } from "@/src/features/solutions/server"
import { authRouter } from "@/src/features/auth/server"
import { messageRouter } from "@/src/features/messages/server"
import { ojsRouter } from "@/src/features/ojs/server"

const app = new Hono().basePath("/api")

// Feature routes
app.route("/journals", journalRouter)
app.route("/solutions", solutionRouter)
app.route("/auth", authRouter)
app.route("/messages", messageRouter)
app.route("/ojs", ojsRouter)

// Root health check
app.get("/", (c) => {
    return c.json(
        {
            success: true,
            message: "API is running",
            version: "1.0.0",
        },
        200
    )
})

export type AppType = typeof app
export { app }
