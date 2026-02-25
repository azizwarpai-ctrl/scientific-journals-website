import { hc } from "hono/client"
import type { AppType } from "@/src/server/app"

export const client = hc<AppType>("/")
