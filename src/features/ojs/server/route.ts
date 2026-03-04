import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { ojsQuery, isOjsConfigured, ojsHealthCheck } from "./ojs-client"
import { ojsJournalsResponseSchema } from "../schemas/ojs-schema"
import type { OjsJournal } from "../schemas/ojs-schema"

const app = new Hono()

// GET /ojs/journals — Fetch journals from OJS database
app.get("/journals", async (c) => {
    try {
        if (!isOjsConfigured()) {
            return c.json(
                { success: true, data: [], configured: false },
                200
            )
        }

        const rows = await ojsQuery<{
            journal_id: number
            path: string
            primary_locale: string
            enabled: number
            name: string | null
            description: string | null
        }>(`
      SELECT
        j.journal_id,
        j.path,
        j.primary_locale,
        j.enabled,
        js_name.setting_value AS name,
        js_desc.setting_value AS description
      FROM journals j
      LEFT JOIN journal_settings js_name
        ON js_name.journal_id = j.journal_id
        AND js_name.setting_name = 'name'
        AND js_name.locale = j.primary_locale
      LEFT JOIN journal_settings js_desc
        ON js_desc.journal_id = j.journal_id
        AND js_desc.setting_name = 'description'
        AND js_desc.locale = j.primary_locale
      WHERE j.enabled = 1
      ORDER BY j.seq ASC
    `)

        const journals: OjsJournal[] = rows.map((row) => ({
            journal_id: row.journal_id,
            path: row.path,
            primary_locale: row.primary_locale,
            enabled: row.enabled === 1,
            name: row.name,
            description: row.description,
        }))

        const responsePayload = { success: true as const, data: journals, configured: true as const }

        // Validate output against schema before sending
        const validated = ojsJournalsResponseSchema.safeParse(responsePayload)
        if (!validated.success) {
            console.error("OJS response validation failed:", validated.error.flatten())
            return c.json(
                { success: false, configured: true, error: "Internal data validation error" },
                500
            )
        }

        return c.json(validated.data, 200)
    } catch (error) {
        console.error("Error fetching OJS journals:", error)
        return c.json(
            { success: false, configured: true, error: "Failed to fetch OJS journals" },
            500
        )
    }
})

// GET /ojs/health — Connection health check for monitoring
app.get("/health", async (c) => {
    const status = await ojsHealthCheck()
    return c.json(status, status.ok ? 200 : 503)
})

// ═══════════════════════════════════════════════════════════════════════
// TEMPORARY DEBUG ENDPOINT — DELETE AFTER DEBUGGING
// Access: GET /api/ojs/debug
// ═══════════════════════════════════════════════════════════════════════
app.get("/debug", async (c) => {
    const dns = await import("node:dns/promises")
    const net = await import("node:net")
    const mariadb = await import("mariadb")

    const host = process.env.OJS_DATABASE_HOST || ""
    const port = parseInt(process.env.OJS_DATABASE_PORT || "3306")
    const database = process.env.OJS_DATABASE_NAME || ""
    const user = process.env.OJS_DATABASE_USER || ""
    const password = process.env.OJS_DATABASE_PASSWORD || ""

    const steps: Array<{ step: string; status: "pass" | "fail" | "skip"; detail: string; ms: number }> = []
    const log = (step: string, status: "pass" | "fail" | "skip", detail: string, ms: number) => {
        steps.push({ step, status, detail, ms })
        console.log(`[OJS-DEBUG] ${status.toUpperCase()} ${step}: ${detail} (${ms}ms)`)
    }

    // ─── Step 1: Environment Variables ────────────────────────────
    const envStart = Date.now()
    const missingVars: string[] = []
    if (!host) missingVars.push("OJS_DATABASE_HOST")
    if (!database) missingVars.push("OJS_DATABASE_NAME")
    if (!user) missingVars.push("OJS_DATABASE_USER")

    if (missingVars.length > 0) {
        log("1_environment", "fail", `Missing: ${missingVars.join(", ")}`, Date.now() - envStart)
        return c.json({ success: false, steps, summary: "Missing environment variables" })
    }
    log("1_environment", "pass", `Host=${host} Port=${port} DB=${database} User=${user} Pass=${"*".repeat(Math.min(password.length, 8))}`, Date.now() - envStart)

    // ─── Step 2: DNS Resolution ───────────────────────────────────
    const dnsStart = Date.now()
    let resolvedIp = ""
    try {
        const addresses = await dns.resolve4(host)
        resolvedIp = addresses[0]
        log("2_dns", "pass", `${host} → ${addresses.join(", ")}`, Date.now() - dnsStart)
    } catch (err: any) {
        log("2_dns", "fail", `Cannot resolve: ${err.code || err.message}`, Date.now() - dnsStart)
        return c.json({ success: false, steps, summary: `DNS resolution failed for ${host}` })
    }

    // ─── Step 3: TCP Port ─────────────────────────────────────────
    const tcpStart = Date.now()
    const tcpOk = await new Promise<boolean>((resolve) => {
        const socket = new net.Socket()
        socket.setTimeout(10000)
        socket.connect(port, host, () => {
            log("3_tcp", "pass", `Port ${port} open on ${host}`, Date.now() - tcpStart)
            socket.destroy()
            resolve(true)
        })
        socket.on("timeout", () => {
            log("3_tcp", "fail", `Timeout after 10s — port ${port} blocked or Remote MySQL not enabled`, Date.now() - tcpStart)
            socket.destroy()
            resolve(false)
        })
        socket.on("error", (err: any) => {
            log("3_tcp", "fail", `${err.code}: ${err.message}`, Date.now() - tcpStart)
            socket.destroy()
            resolve(false)
        })
    })
    if (!tcpOk) {
        return c.json({ success: false, steps, summary: "TCP connection failed — port blocked or firewall" })
    }

    // ─── Step 4: MySQL Authentication ─────────────────────────────
    const authStart = Date.now()
    let conn: any = null
    try {
        conn = await mariadb.createConnection({
            host,
            port,
            database,
            user,
            password,
            connectTimeout: 10000,
            allowPublicKeyRetrieval: true,
        })
        log("4_auth", "pass", "MySQL handshake successful", Date.now() - authStart)
    } catch (err: any) {
        const errno = err.errno || 0
        let diagnosis = err.message
        if (errno === 1045) {
            const ipMatch = err.message?.match(/'[^']*'@'([^']+)'/)
            const ip = ipMatch?.[1] || "unknown"
            diagnosis = `Access denied — IP ${ip} not whitelisted in SiteGround Remote MySQL, or wrong password`
        } else if (err.message?.includes("RSA")) {
            diagnosis = "RSA key error — need allowPublicKeyRetrieval (already set)"
        } else if (errno === 1049) {
            diagnosis = `Unknown database '${database}' — check OJS_DATABASE_NAME`
        }
        log("4_auth", "fail", diagnosis, Date.now() - authStart)
        return c.json({ success: false, steps, summary: `MySQL auth failed: ${diagnosis}` })
    }

    // ─── Step 5: Query Test ───────────────────────────────────────
    const queryStart = Date.now()
    try {
        const selectOne = await conn.query("SELECT 1 AS test")
        const version = await conn.query("SELECT VERSION() AS version")
        const dbVersion = version[0]?.version || "unknown"
        log("5_query", "pass", `SELECT 1 OK, MySQL ${dbVersion}`, Date.now() - queryStart)

        // Bonus: check OJS tables
        let journalCount = -1
        try {
            const jResult = await conn.query("SELECT COUNT(*) AS cnt FROM journals")
            journalCount = Number(jResult[0]?.cnt ?? -1)
        } catch { /* table may not exist */ }

        await conn.end()

        return c.json({
            success: true,
            steps,
            summary: "All checks passed",
            db_version: dbVersion,
            ojs_journals_count: journalCount,
            server_info: {
                node_version: process.version,
                platform: process.platform,
                env_node_env: process.env.NODE_ENV,
            }
        })
    } catch (err: any) {
        log("5_query", "fail", err.message, Date.now() - queryStart)
        try { await conn.end() } catch { /* ignore */ }
        return c.json({ success: false, steps, summary: `Query failed: ${err.message}` })
    }
})

export { app as ojsRouter }
