import { NextRequest, NextResponse } from "next/server"
import { Hono } from "hono"
import { journalRouter } from "@/src/features/journals"
import { solutionRouter } from "@/src/features/solutions"
import { authRouter } from "@/src/features/auth"
import { messageRouter } from "@/src/features/messages"

const app = new Hono().basePath("/api")

// Feature routes
app.route("/journals", journalRouter)
app.route("/solutions", solutionRouter)
app.route("/auth", authRouter)
app.route("/messages", messageRouter)

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

// Custom Next.js handler for Hono app
const handler = async (req: NextRequest) => {
  const method = req.method
  const url = new URL(req.url)
  const path = url.pathname
  const search = url.search

  const hRequest = new Request(`http://localhost${path}${search}`, {
    method,
    headers: req.headers,
    body: method === "GET" || method === "HEAD" ? undefined : req.body,
  })

  const response = await app.fetch(hRequest)
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  })
}

// Export for Next.js
export const GET = handler
export const POST = handler
export const PATCH = handler
export const DELETE = handler

// Export AppType for RPC client type safety
export type AppType = typeof app
