import { Hono } from "hono"
import { ojsQuery, isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import { fetchFromDatabase } from "@/src/features/ojs/server/ojs-service"
import mysql from "mysql2/promise"
import type { RowDataPacket } from "mysql2/promise"
import * as net from "node:net"
import { getSession } from "@/lib/db/auth"

export const debugRouter = new Hono()

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
        host: process.env.OJS_DATABASE_HOST || null,
        port: process.env.OJS_DATABASE_PORT || "3306",
        user: process.env.OJS_DATABASE_USER || null,
        database: process.env.OJS_DATABASE_NAME || null,
        node_environment: process.env.NODE_ENV || "development",
        runtime_environment,
        // Hostinger / Vercel often set x-real-ip or similar, try to echo it if helpful, though external IP is what matters for MySQL
        client_ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || "unknown"
    })
})

// --- 2. Network Connectivity Probe ---
debugRouter.get("/network-probe", async (c) => {
    const host = process.env.OJS_DATABASE_HOST || ""
    const port = parseInt(process.env.OJS_DATABASE_PORT || "3306", 10)

    if (!host) {
        return c.json({ error: "OJS_DATABASE_HOST is not set." }, 400)
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

    return c.json(result)
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
            ok: true,
            serverVersion: versionRows[0]?.version,
            authPlugin: pluginRows[0]?.Value,
            sslSupported: sslRows[0]?.Value
        })
    } catch (error: any) {
        console.error("[DEBUG_AUTH_PROBE]", error)
        return c.json({
            ok: false,
            error: error.message,
            code: error.code,
            sqlState: error.sqlState,
            fatal: error.fatal
        })
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
            // Connect WITHOUT specifying a database to test if we can login globally first
        })

        const [dbRows] = await conn.query<RowDataPacket[]>("SHOW DATABASES")
        await conn.end()

        const databases = dbRows.map(r => r.Database)
        const configuredDatabaseExists = databases.includes(targetDb)

        return c.json({
            ok: true,
            targetDatabase: targetDb,
            configuredDatabaseExists,
            databasesVisibleToUser: databases
        })
    } catch (error: any) {
        console.error("[DEBUG_DB_EXISTENCE]", error)
        return c.json({ ok: false, error: error.message, code: error.code })
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
            ok: true,
            currentUser,
            grants
        })
    } catch (error: any) {
        console.error("[DEBUG_USER_PRIVILEGES]", error)
        return c.json({ ok: false, error: error.message, code: error.code })
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
            ok: true,
            charsets,
            collations
        })
    } catch (error: any) {
        console.error("[DEBUG_CHARSET]", error)
        return c.json({ ok: false, error: error.message, code: error.code })
    }
})

// --- 7. Structured Diagnostic Report (All-in-One) ---
debugRouter.get("/full-database-diagnostic", async (c) => {
    const origin = new URL(c.req.url).origin
    
    // Fire all probes concurrently by calling their respective logic functions or self-fetching
    // Self-fetching is easiest to reuse the route logic without extracting to separate functions
    const fetchProbe = async (path: string) => {
        try {
            const res = await fetch(`${origin}/api/debug/${path}`)
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

    const report = {
        timestamp: new Date().toISOString(),
        environment,
        network,
        authentication,
        database,
        privileges,
        charset,
        overallStatus: network.hostReachable && authentication.ok && database.configuredDatabaseExists ? "healthy" : "failing"
    }

    return c.json(report)
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

// --- 8. Auth Debug Probe ---
debugRouter.get("/auth-session", async (c) => {
    try {
        const session = await getSession()
        const cookieHeader = c.req.header("cookie") || ""
        const hasAuthToken = cookieHeader.includes("auth_token=")
        
        return c.json({
            status: "ok",
            sessionActive: !!session,
            session,
            cookiesDetected: {
                auth_token: hasAuthToken,
                raw: process.env.NODE_ENV === "development" ? cookieHeader : "hidden"
            }
        })
    } catch (error: any) {
        return c.json({ status: "error", error: error.message }, 500)
    }
})

// --- 9. OJS URL / Connectivity Probe ---
debugRouter.get("/ping-ojs", async (c) => {
    const ojsUrl = process.env.OJS_BASE_URL
    if (!ojsUrl) {
        return c.json({ status: "error", error: "OJS_BASE_URL is not set in environment" }, 400)
    }

    try {
        const start = Date.now()
        // Simple HEAD request to minimize payload
        const res = await fetch(ojsUrl, { method: "HEAD", redirect: "follow" })
        const latencyMs = Date.now() - start
        
        return c.json({
            status: "ok",
            url: ojsUrl,
            httpStatus: res.status,
            httpStatusText: res.statusText,
            redirected: res.redirected,
            finalUrl: res.url,
            latencyMs
        })
    } catch (error: any) {
        return c.json({ status: "error", url: ojsUrl, error: error.message }, 500)
    }
})

// --- 10. Submission Flow Tester ---
debugRouter.get("/submission-flow", async (c) => {
    const ojsUrl = process.env.OJS_BASE_URL
    if (!ojsUrl) {
        return c.json({ status: "error", error: "OJS_BASE_URL is not set" }, 400)
    }
    
    try {
        // Attempt a GET against a typical OJS submission URL to trace redirects
        // Usually /index.php/journal/submission/wizard or /index.php/index/login
        const targetUrl = ojsUrl.endsWith('/') ? `${ojsUrl}index.php/index/login` : `${ojsUrl}/index.php/index/login`
        
        const start = Date.now()
        const res = await fetch(targetUrl, { redirect: "manual" }) // Catch the first redirect
        const latencyMs = Date.now() - start
        
        const isRedirect = [301, 302, 303, 307, 308].includes(res.status)
        const location = res.headers.get("location")
        
        return c.json({
            status: "ok",
            targetUrl,
            httpStatus: res.status,
            isRedirect,
            redirectLocation: location,
            latencyMs,
            recommendation: isRedirect && location?.includes("login") ? "Requires authentication to submit." : "Page exists or handles state directly."
        })
    } catch (error: any) {
        console.error("[DEBUG_SUBMISSION_FLOW]", error)
        return c.json({ status: "error", error: error.message }, 500)
    }
})
