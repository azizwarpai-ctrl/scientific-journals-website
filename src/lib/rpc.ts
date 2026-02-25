import { hc } from "hono/client"
import type { AppType } from "../server/app"

const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")

// Explicitly type as any to bypass persistent Hono RPC inference issues in production build
export const client: any = hc<AppType>(`${baseUrl}/api`)
