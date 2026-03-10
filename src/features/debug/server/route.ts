import { Hono } from "hono"
import { ojsQuery, isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import { fetchFromDatabase } from "@/src/features/ojs/server/ojs-service"

export const debugRouter = new Hono()

debugRouter.get("/database", async (c) => {
    const envConfig = {
        OJS_DATABASE_HOST: process.env.OJS_DATABASE_HOST || "unset",
        OJS_DATABASE_USER: process.env.OJS_DATABASE_USER || "unset",
        OJS_DATABASE_NAME: process.env.OJS_DATABASE_NAME || "unset",
        OJS_DATABASE_PORT: process.env.OJS_DATABASE_PORT || "unset",
        OJS_BASE_URL: process.env.OJS_BASE_URL || "unset",
        isOjsConfigured: isOjsConfigured()
    }

    try {
        const result = await ojsQuery<{ [key: string]: any }>("SELECT 1 as connected")
        const success = result.length > 0 && result[0].connected === 1
        
        return c.json({
            environment: envConfig,
            connection: "ok",
            query: success ? "ok" : "failed",
            error: null
        })
    } catch (error: any) {
        console.error("[DEBUG_DATABASE]", error)
        return c.json({
            environment: envConfig,
            connection: "failed",
            query: "failed",
            error: {
                message: error.message,
                code: error.code,
                stack: error.stack
            }
        })
    }
})

debugRouter.get("/ojs-schema", async (c) => {
    try {
        const [tables, journalsCount, usersCount, submissionsCount] = await Promise.allSettled([
            ojsQuery<{ [key: string]: any }>("SHOW TABLES"),
            ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM journals"),
            ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM users"),
            ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM submissions"),
        ])

        const extract = (res: PromiseSettledResult<any>) => {
            if (res.status === "fulfilled") return { status: "ok", data: res.value }
            const reason: any = res.reason
            return { status: "error", error: reason?.message || String(reason) }
        }

        const data = {
            tables: extract(tables),
            counts: {
                journals: extract(journalsCount),
                users: extract(usersCount),
                submissions: extract(submissionsCount)
            }
        }
        
        return c.json(data)
    } catch (error: any) {
        console.error("[DEBUG_OJS_SCHEMA]", error)
        return c.json({ error: error.message }, 500)
    }
})

debugRouter.get("/ojs-journals", async (c) => {
    try {
        const journals = await fetchFromDatabase(true)
        return c.json({
            status: "ok",
            count: journals.length,
            journals: journals,
        })
    } catch (error: any) {
        console.error("[DEBUG_OJS_JOURNALS]", error)
        return c.json({
            status: "failed",
            error: {
                message: error.message,
                code: error.code,
                stack: error.stack
            }
        })
    }
})
