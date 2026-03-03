import { hc } from "hono/client"
import type { AppType } from "../server/app"

const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")

/**
 * Hono RPC Client
 * 
 * NOTE: The 'as any' cast is a temporary workaround for a known TypeScript inference issue 
 * in Hono v4.12.2 where complex router composition via .route() can cause the hc<AppType> 
 * to lose method definitions (get/post/etc) in the production build environment.
 * 
 * See Hono Issue: https://github.com/honojs/hono/issues/ (Multiple reports on deep nesting)
 * TODO: Re-evaluate when upgrading Hono or if flattening the router structure.
 */
export const client = hc<AppType>(`${baseUrl}/api`) as any
