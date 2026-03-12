import { Hono } from "hono"
import { ojsQuery, isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import { fetchFromDatabase } from "@/src/features/ojs/server/ojs-service"
import { requireAdmin } from "@/src/lib/auth-middleware"
import mysql from "mysql2/promise"
import type { RowDataPacket } from "mysql2/promise"
import * as net from "node:net"
import { getSession } from "@/lib/db/auth"

export const debugRouter = new Hono()

// Protect all debug routes with admin auth
debugRouter.use(requireAdmin)

// --- 1. Environment Deep Inspection ---
debugRouter.get("/db-environment", (c) => {
    // Determine runtime environment
    let runtime_environment = "unknown"
    if (typeof globalThis !== "undefined" && (globalThis as any).EdgeRuntime) {
        runtime_environment = "edge"
    } else if (typeof process !== "undefined" && process.versions && process.versions.node) {
        runtime_environment = `node ${process.versions.node}`
    } else if (typeof globalThis !== "undefined" && (globalThis as any).Bun) {
        runtime_environment = `bun ${(globalThis as any).Bun.version}`
    }

    return c.json({
        success: true,
        data: {
            host: process.env.OJS_DATABASE_HOST || null,
            port: process.env.OJS_DATABASE_PORT || "3306",
            user: process.env.OJS_DATABASE_USER || null,
            database: process.env.OJS_DATABASE_NAME || null,
            node_environment: process.env.NODE_ENV || "development",
            runtime_environment,
            client_ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || "unknown"
        }
    })
})

// --- 2. Network Connectivity Probe ---
debugRouter.get("/network-probe", async (c) => {
    const host = process.env.OJS_DATABASE_HOST || ""
    const port = parseInt(process.env.OJS_DATABASE_PORT || "3306", 10)

    if (!host) {
        return c.json({ success: false, error: "OJS_DATABASE_HOST is not set." }, 400)
    }

    const result = await new Promise<any>((resolve) => {
        const socket = new net.Socket()
        const startTime = Date.now()
        
        socket.setTimeout(5000)

        socket.connect(port, host, () => {
            const latencyMs = Date.now() - startTime
            socket.destroy()
            resolve({ hostReachable: true, portOpen: true, latencyMs })
        })

        socket.on('timeout', () => {
            socket.destroy()
            resolve({ hostReachable: false, portOpen: false, latencyMs: Date.now() - startTime, error: "Connection timed out (firewall drop)" })
        })

        socket.on('error', (err: any) => {
            socket.destroy()
            resolve({ hostReachable: false, portOpen: false, latencyMs: Date.now() - startTime, error: err.message, code: err.code })
        })
    })

    return c.json({ success: true, data: result })
})

// --- 3. MySQL Authentication Plugin Probe ---
debugRouter.get("/auth-probe", async (c) => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.OJS_DATABASE_HOST,
            port: parseInt(process.env.OJS_DATABASE_PORT || "3306", 10),
            user: process.env.OJS_DATABASE_USER,
            password: process.env.OJS_DATABASE_PASSWORD || "",
            ssl: { rejectUnauthorized: false, minVersion: 'TLSv1.2' }, 
            connectTimeout: 5000
        })

        const [versionRows] = await conn.query<RowDataPacket[]>("SELECT VERSION() as version")
        const [pluginRows] = await conn.query<RowDataPacket[]>("SHOW VARIABLES LIKE 'default_authentication_plugin'")
        const [sslRows] = await conn.query<RowDataPacket[]>("SHOW VARIABLES LIKE 'have_ssl'")

        await conn.end()

        return c.json({
            success: true,
            data: {
                serverVersion: versionRows[0]?.version,
                authPlugin: pluginRows[0]?.Value,
                sslSupported: sslRows[0]?.Value
            }
        })
    } catch (error: any) {
        console.error("[DEBUG_AUTH_PROBE]", error)
        return c.json({ success: false, error: error.message }, 500)
    }
})

// --- 4. Database Existence Probe ---
debugRouter.get("/database-existence", async (c) => {
    try {
        const targetDb = process.env.OJS_DATABASE_NAME

        const conn = await mysql.createConnection({
            host: process.env.OJS_DATABASE_HOST,
            port: parseInt(process.env.OJS_DATABASE_PORT || "3306", 10),
            user: process.env.OJS_DATABASE_USER,
            password: process.env.OJS_DATABASE_PASSWORD || "",
            ssl: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
        })

        const [dbRows] = await conn.query<RowDataPacket[]>("SHOW DATABASES")
        await conn.end()

        const databases = dbRows.map(r => r.Database)
        const configuredDatabaseExists = databases.includes(targetDb)

        return c.json({
            success: true,
            data: {
                targetDatabase: targetDb,
                configuredDatabaseExists,
                databasesVisibleToUser: databases
            }
        })
    } catch (error: any) {
        console.error("[DEBUG_DB_EXISTENCE]", error)
        return c.json({ success: false, error: error.message }, 500)
    }
})

// --- 5. User Privilege Inspection ---
debugRouter.get("/user-privileges", async (c) => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.OJS_DATABASE_HOST,
            port: parseInt(process.env.OJS_DATABASE_PORT || "3306", 10),
            user: process.env.OJS_DATABASE_USER,
            password: process.env.OJS_DATABASE_PASSWORD || "",
            ssl: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
        })

        const [userRows] = await conn.query<RowDataPacket[]>("SELECT CURRENT_USER() as user")
        const currentUser = userRows[0]?.user

        const [grantsRows] = await conn.query<RowDataPacket[]>("SHOW GRANTS FOR CURRENT_USER")
        await conn.end()

        const grants = grantsRows.map(r => Object.values(r)[0])

        return c.json({
            success: true,
            data: { currentUser, grants }
        })
    } catch (error: any) {
        console.error("[DEBUG_USER_PRIVILEGES]", error)
        return c.json({ success: false, error: error.message }, 500)
    }
})

// --- 6. Charset and Encoding Probe ---
debugRouter.get("/charset-encoding", async (c) => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.OJS_DATABASE_HOST,
            port: parseInt(process.env.OJS_DATABASE_PORT || "3306", 10),
            user: process.env.OJS_DATABASE_USER,
            password: process.env.OJS_DATABASE_PASSWORD || "",
            ssl: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
        })

        const [charsetRows] = await conn.query<RowDataPacket[]>("SHOW VARIABLES LIKE 'character_set%'")
        const [collationRows] = await conn.query<RowDataPacket[]>("SHOW VARIABLES LIKE 'collation%'")
        await conn.end()

        const charsets = charsetRows.reduce((acc, row) => ({ ...acc, [row.Variable_name]: row.Value }), {})
        const collations = collationRows.reduce((acc, row) => ({ ...acc, [row.Variable_name]: row.Value }), {})

        return c.json({
            success: true,
            data: { charsets, collations }
        })
    } catch (error: any) {
        console.error("[DEBUG_CHARSET]", error)
        return c.json({ success: false, error: error.message }, 500)
    }
})

// --- 7. Structured Diagnostic Report (All-in-One) ---
debugRouter.get("/full-database-diagnostic", async (c) => {
    const origin = new URL(c.req.url).origin
    
    const fetchProbe = async (path: string) => {
        try {
            const res = await fetch(`${origin}/api/debug/${path}`, {
                headers: {
                    cookie: c.req.header("cookie") || ""
                }
            })
            return await res.json()
        } catch (e: any) {
            return { error: `Fetch to ${path} failed: ${e.message}` }
        }
    }

    const [
        environment,
        network,
        authentication,
        database,
        privileges,
        charset
    ] = await Promise.all([
        fetchProbe("db-environment"),
        fetchProbe("network-probe"),
        fetchProbe("auth-probe"),
        fetchProbe("database-existence"),
        fetchProbe("user-privileges"),
        fetchProbe("charset-encoding")
    ])

    return c.json({
        success: true,
        data: {
            timestamp: new Date().toISOString(),
            environment,
            network,
            authentication,
            database,
            privileges,
            charset,
            overallStatus: network?.data?.hostReachable && authentication?.data && database?.data?.configuredDatabaseExists ? "healthy" : "failing"
        }
    })
})

// Legacy general probes included:
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
        const queryOk = result.length > 0 && result[0].connected === 1
        
        return c.json({
            success: true,
            data: {
                environment: envConfig,
                connection: "ok",
                query: queryOk ? "ok" : "failed",
            }
        })
    } catch (error: any) {
        console.error("[DEBUG_DATABASE]", error)
        return c.json({ success: false, error: "Database connection failed" }, 500)
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

        return c.json({
            success: true,
            data: {
                tables: extract(tables),
                counts: {
                    journals: extract(journalsCount),
                    users: extract(usersCount),
                    submissions: extract(submissionsCount)
                }
            }
        })
    } catch (error: any) {
        console.error("[DEBUG_OJS_SCHEMA]", error)
        return c.json({ success: false, error: "Failed to query OJS schema" }, 500)
    }
})

debugRouter.get("/ojs-journals", async (c) => {
    try {
        const journals = await fetchFromDatabase(true)
        return c.json({
            success: true,
            data: {
                count: journals.length,
                journals,
            }
        })
    } catch (error: any) {
        console.error("[DEBUG_OJS_JOURNALS]", error)
        return c.json({ success: false, error: "Failed to fetch OJS journals" }, 500)
    }
})

// --- 8. Auth Debug Probe ---
debugRouter.get("/auth-session", async (c) => {
    try {
        const session = await getSession()
        const cookieHeader = c.req.header("cookie") || ""
        const hasAuthToken = cookieHeader.includes("auth_token=")
        
        return c.json({
            success: true,
            data: {
                sessionActive: !!session,
                session,
                cookiesDetected: {
                    auth_token: hasAuthToken,
                    raw: "redacted"
                }
            }
        })
    } catch (error: any) {
        console.error("[DEBUG_AUTH_SESSION]", error)
        return c.json({ success: false, error: "Failed to check auth session" }, 500)
    }
})

// --- 9. OJS URL / Connectivity Probe ---
debugRouter.get("/ping-ojs", async (c) => {
    const ojsUrl = process.env.OJS_BASE_URL
    if (!ojsUrl) {
        return c.json({ success: false, error: "OJS_BASE_URL is not set in environment" }, 400)
    }

    try {
        const start = Date.now()
        const res = await fetch(ojsUrl, { method: "HEAD", redirect: "follow" })
        const latencyMs = Date.now() - start
        
        return c.json({
            success: true,
            data: {
                url: ojsUrl,
                httpStatus: res.status,
                httpStatusText: res.statusText,
                redirected: res.redirected,
                finalUrl: res.url,
                latencyMs
            }
        })
    } catch (error: any) {
        console.error("[DEBUG_PING_OJS]", error)
        return c.json({ success: false, error: "Failed to reach OJS server" }, 500)
    }
})

// --- 10. Submission Flow Tester ---
debugRouter.get("/submission-flow", async (c) => {
    const ojsUrl = process.env.OJS_BASE_URL
    if (!ojsUrl) {
        return c.json({ success: false, error: "OJS_BASE_URL is not set" }, 400)
    }
    
    try {
        const origin = new URL(c.req.url).origin
        const sampleJournalPath = "sample"
        const targetUrl = `${origin}/api/ojs/sso/redirect?journalPath=${sampleJournalPath}`
        
        const start = Date.now()
        const res = await fetch(targetUrl, { 
            redirect: "manual",
            headers: {
                cookie: c.req.header("cookie") || ""
            }
        })
        const latencyMs = Date.now() - start
        
        const isRedirect = [301, 302, 303, 307, 308].includes(res.status)
        const location = res.headers.get("location")
        
        return c.json({
            success: true,
            data: {
                targetUrl,
                httpStatus: res.status,
                isRedirect,
                redirectLocation: location,
                latencyMs,
                recommendation: isRedirect && (location?.includes("sso_login.php") || location?.includes("login")) 
                    ? "Redirect logic verified. Points to: " + (location || "unknown")
                    : "No redirect detected. Ensure OJS_BASE_URL is correct and app is authenticated."
            }
        })
    } catch (error: any) {
        console.error("[DEBUG_SUBMISSION_FLOW]", error)
        return c.json({ success: false, error: "Failed to test submission flow" }, 500)
    }
})
