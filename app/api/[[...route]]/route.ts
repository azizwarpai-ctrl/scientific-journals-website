import { handle } from "hono/vercel"
import { app } from "@/src/server/app"

// Export standard HTTP method handlers for Next.js App Router
export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)

// Export type for RPC client
export type { AppType } from "@/src/server/app"
