import { hc } from "hono/client"
import type { AppType } from "../server/app"

const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")

// Use any to bypass persistent Hono RPC inference issues in this environment, keeping AppType for reference
export const client = hc<AppType>(`${baseUrl}/api`) as any
