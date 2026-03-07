import mysql from "mysql2/promise"
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise"
import * as net from "node:net"
import * as dns from "node:dns/promises"

let pool: Pool | null = null

function isOjsConfigured(): boolean {
    return !!(
        process.env.OJS_DATABASE_HOST &&
        process.env.OJS_DATABASE_NAME &&
        process.env.OJS_DATABASE_USER
    )
}

function getPool(): Pool {
    if (!pool) {
        if (!isOjsConfigured()) {
            throw new Error("OJS database is not configured. Set OJS_DATABASE_* env vars.")
        }

        // Apply external hosting connection options like ssl and allowPublicKeyRetrieval
        pool = mysql.createPool({
            host: process.env.OJS_DATABASE_HOST,
            port: parseInt(process.env.OJS_DATABASE_PORT || "3306"),
            database: process.env.OJS_DATABASE_NAME,
            user: process.env.OJS_DATABASE_USER,
            password: process.env.OJS_DATABASE_PASSWORD || "",
            connectionLimit: 3,
            connectTimeout: 10000,
            waitForConnections: true,
            queueLimit: 10,
            enableKeepAlive: true,
            keepAliveInitialDelay: 30000,
            ssl: {
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2'
            },
            flags: ['+LOCAL_FILES'],
            allowPublicKeyRetrieval: true,
            authSwitchHandler: function ({ pluginName, pluginData }: any, cb: any) {
                // If the server asks for mysql_native_password, but we KNOW it's caching_sha2_password
                if (pluginName === 'mysql_native_password' || pluginName === 'caching_sha2_password') {
                    // Let the internal mysql2 handler process it automatically based on its capabilities
                    return cb();
                }
                cb(new Error(`Unknown auth plugin: ${pluginName}`));
            }
        } as any)
    }
    return pool
}

/**
 * Execute a query against the OJS database with retry logic.
 *
 * Uses exponential backoff: 1s → 2s → 4s (3 attempts max).
 */
export async function ojsQuery<T = RowDataPacket>(sql: string, params?: any[]): Promise<T[]> {
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let conn: PoolConnection | undefined
        try {
            conn = await getPool().getConnection()
            const [rows] = await conn.query<RowDataPacket[]>(sql, params)
            return rows as T[]
        } catch (err: any) {
            lastError = err

            const nonRetryable = [
                "ER_ACCESS_DENIED_ERROR",
                "ER_DBACCESS_DENIED_ERROR",
                "ER_BAD_DB_ERROR",
                "ER_HOST_IS_BLOCKED",
            ]
            if (nonRetryable.includes(err.code)) {
                console.error(`[OJS] Non-retryable error (attempt ${attempt}/${maxRetries}):`, err.message)
                throw err
            }

            console.warn(`[OJS] Query failed (attempt ${attempt}/${maxRetries}): ${err.message}`)

            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt - 1) * 1000
                await new Promise((resolve) => setTimeout(resolve, delay))
            }
        } finally {
            if (conn) {
                try { conn.release() } catch { /* ignore */ }
            }
        }
    }

    throw lastError || new Error("OJS query failed after all retries")
}

// ─── DNS Check ───────────────────────────────────────────────────────

async function checkDns(host: string): Promise<{ ok: boolean; addresses: string[]; error: string | null }> {
    try {
        const addresses = await dns.resolve4(host)
        return { ok: true, addresses, error: null }
    } catch (err: any) {
        return { ok: false, addresses: [], error: err.code === "ENOTFOUND" ? `Cannot resolve hostname "${host}"` : err.message }
    }
}

// ─── TCP Port Check ──────────────────────────────────────────────────

async function checkPort(host: string, port: number, timeoutMs = 10000): Promise<{ ok: boolean; latencyMs: number; error: string | null }> {
    return new Promise((resolve) => {
        const socket = new net.Socket()
        const startTime = Date.now()

        socket.setTimeout(timeoutMs)

        socket.connect(port, host, () => {
            const elapsed = Date.now() - startTime
            socket.destroy()
            resolve({ ok: true, latencyMs: elapsed, error: null })
        })

        socket.on("timeout", () => {
            socket.destroy()
            resolve({ ok: false, latencyMs: Date.now() - startTime, error: `Connection timed out after ${timeoutMs}ms. Port may be blocked by firewall.` })
        })

        socket.on("error", (err: any) => {
            socket.destroy()
            if (err.code === "ECONNREFUSED") {
                resolve({ ok: false, latencyMs: Date.now() - startTime, error: `Port ${port} is closed (connection refused). MySQL may not be running.` })
            } else {
                resolve({ ok: false, latencyMs: Date.now() - startTime, error: `TCP error: ${err.message} (${err.code})` })
            }
        })
    })
}

// ─── Full Diagnostic ─────────────────────────────────────────────────

export interface OjsDiagnosticResult {
    ok: boolean
    configured: boolean
    steps: {
        envCheck: { ok: boolean; host: string | null; port: number; database: string | null; user: string | null; outboundIp: string | null }
        dnsResolution: { ok: boolean; addresses: string[]; error: string | null } | null
        tcpConnection: { ok: boolean; latencyMs: number; error: string | null } | null
        mysqlAuth: {
            ok: boolean;
            mysqlVersion: string | null;
            authenticatedAs: string | null;
            sourceIp: string | null;
            authPlugin: string | null;
            error: string | null;
            code?: string;
            errno?: number;
            sqlState?: string;
        } | null
        queryTest: {
            ok: boolean;
            databaseName: string | null;
            tablesVisible: number | null;
            journalCount: number | null;
            sampleJournal: string | null;
            error: string | null;
            code?: string;
            errno?: number;
            sqlState?: string;
        } | null
    }
    latencyMs: number
    error: string | null
    mode: string
}

/**
 * Full diagnostic check for the OJS connection.
 * Mirrors the CLI diagnose-ojs-connection.ts steps but accessible via HTTP.
 */
export async function ojsDiagnostic(): Promise<OjsDiagnosticResult> {
    const start = Date.now()

    const host = process.env.OJS_DATABASE_HOST || ""
    const port = parseInt(process.env.OJS_DATABASE_PORT || "3306")
    const database = process.env.OJS_DATABASE_NAME || ""
    const user = process.env.OJS_DATABASE_USER || ""

    let outboundIp: string | null = null
    try {
        const ipRes = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) })
        const ipJson = (await ipRes.json()) as { ip: string }
        outboundIp = ipJson.ip || null
    } catch { /* ignore */ }

    // Step 1: Environment check
    const envOk = !!(host && database && user)
    const envCheck = { ok: envOk, host: host || null, port, database: database || null, user: user || null, pwLength: process.env.OJS_DATABASE_PASSWORD ? process.env.OJS_DATABASE_PASSWORD.length : 0, outboundIp }

    if (!envOk) {
        return {
            ok: false,
            configured: false,
            steps: { envCheck, dnsResolution: null, tcpConnection: null, mysqlAuth: null, queryTest: null },
            latencyMs: Date.now() - start,
            error: "Missing required OJS_DATABASE_* environment variables",
            mode: "direct"
        }
    }

    // Step 2: DNS resolution
    const dnsResult = await checkDns(host)
    if (!dnsResult.ok) {
        return {
            ok: false,
            configured: true,
            steps: { envCheck, dnsResolution: dnsResult, tcpConnection: null, mysqlAuth: null, queryTest: null },
            latencyMs: Date.now() - start,
            error: `DNS resolution failed: ${dnsResult.error}`,
            mode: "direct"
        }
    }

    // Step 3: TCP port check
    const tcpResult = await checkPort(host, port)
    if (!tcpResult.ok) {
        return {
            ok: false,
            configured: true,
            steps: { envCheck, dnsResolution: dnsResult, tcpConnection: tcpResult, mysqlAuth: null, queryTest: null },
            latencyMs: Date.now() - start,
            error: `TCP connection failed: ${tcpResult.error}`,
            mode: "direct"
        }
    }

    // Step 4 & 5: MySQL auth + queries (use pool connection)
    let conn: PoolConnection | undefined
    try {
        conn = await getPool().getConnection()

        // Auth & Metadata info
        const [versionRows] = await conn.query<RowDataPacket[]>("SELECT VERSION() as version")
        const mysqlVersion = versionRows[0]?.version || null

        const [userRows] = await conn.query<RowDataPacket[]>("SELECT CURRENT_USER() as user")
        const authenticatedAs = userRows[0]?.user || null

        const [ipRows] = await conn.query<RowDataPacket[]>("SELECT SUBSTRING_INDEX(USER(), '@', -1) as ip")
        const sourceIp = ipRows[0]?.ip || null

        const [pluginRows] = await conn.query<RowDataPacket[]>("SHOW VARIABLES LIKE 'default_authentication_plugin'")
        const authPlugin = pluginRows[0]?.Value || null

        const mysqlAuth = { ok: true, mysqlVersion, authenticatedAs, sourceIp, authPlugin, error: null }

        // Query tests
        const [dbRows] = await conn.query<RowDataPacket[]>("SELECT DATABASE() as db")
        const databaseName = dbRows[0]?.db || null

        const [tableRows] = await conn.query<RowDataPacket[]>("SHOW TABLES")
        const tablesVisible = tableRows.length

        let journalCount: number | null = null
        let sampleJournal: string | null = null
        try {
            const [jRows] = await conn.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM journals")
            journalCount = jRows[0]?.count ?? null

            const [sampleRows] = await conn.query<RowDataPacket[]>(`
                SELECT js.setting_value AS name
                FROM journals j
                LEFT JOIN journal_settings js ON js.journal_id = j.journal_id AND js.setting_name = 'name' AND js.locale = j.primary_locale
                WHERE j.enabled = 1
                ORDER BY j.seq ASC
                LIMIT 1
            `)
            sampleJournal = sampleRows[0]?.name || null
        } catch { /* journals table may not exist */ }

        const queryTest = { ok: true, databaseName, tablesVisible, journalCount, sampleJournal, error: null }

        return {
            ok: true,
            configured: true,
            steps: { envCheck, dnsResolution: dnsResult, tcpConnection: tcpResult, mysqlAuth, queryTest },
            latencyMs: Date.now() - start,
            error: null,
            mode: "direct"
        }
    } catch (err: any) {
        const code = err.code || "UNKNOWN"
        let errorMsg = err.message
        let sourceIpFromErr: string | null = null

        if (code === "ER_ACCESS_DENIED_ERROR") {
            const ipMatch = err.message?.match(/'[^']*'@'([^']+)'/)
            if (ipMatch) {
                sourceIpFromErr = ipMatch[1]
                errorMsg = `Access denied for user '${user}'. Your IP: ${sourceIpFromErr} — whitelist it in SiteGround Remote MySQL.`
            }
        } else if (err.message?.includes("Unknown database")) {
            errorMsg = `Database '${database}' does not exist. Check the name in SiteGround MySQL panel.`
        }

        return {
            ok: false,
            configured: true,
            steps: {
                envCheck,
                dnsResolution: dnsResult,
                tcpConnection: tcpResult,
                mysqlAuth: {
                    ok: false,
                    mysqlVersion: null,
                    authenticatedAs: null,
                    sourceIp: sourceIpFromErr,
                    authPlugin: null,
                    error: errorMsg,
                    code: err.code,
                    errno: err.errno,
                    sqlState: err.sqlState
                },
                queryTest: null,
            },
            latencyMs: Date.now() - start,
            error: errorMsg,
            mode: "direct"
        }
    } finally {
        if (conn) {
            try { conn.release() } catch { /* ignore */ }
        }
    }
}

/**
 * Simple health check (lightweight version of ojsDiagnostic).
 */
export async function ojsHealthCheck(): Promise<{
    ok: boolean
    configured: boolean
    latencyMs: number | null
    error: string | null
}> {
    if (!isOjsConfigured()) {
        return { ok: false, configured: false, latencyMs: null, error: null }
    }

    const start = Date.now()
    let conn: PoolConnection | undefined
    try {
        conn = await getPool().getConnection()
        await conn.query("SELECT 1")
        return { ok: true, configured: true, latencyMs: Date.now() - start, error: null }
    } catch (err: any) {
        return { ok: false, configured: true, latencyMs: Date.now() - start, error: err.message }
    } finally {
        if (conn) {
            try { conn.release() } catch { /* ignore */ }
        }
    }
}

/**
 * Gracefully close the OJS connection pool.
 */
export async function closeOjsPool(): Promise<void> {
    if (pool) {
        try { await pool.end() } catch { /* ignore */ }
        pool = null
    }
}

export { isOjsConfigured }
