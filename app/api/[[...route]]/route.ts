import { NextRequest, NextResponse } from "next/server"
import { app } from "@/src/server/app"

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
