import * as mariadb from "mariadb"

let pool: mariadb.Pool | null = null

function isOjsConfigured(): boolean {
    return !!(
        process.env.OJS_DATABASE_HOST &&
        process.env.OJS_DATABASE_NAME &&
        process.env.OJS_DATABASE_USER
    )
}

function getPool(): mariadb.Pool {
    if (!pool) {
        if (!isOjsConfigured()) {
            throw new Error("OJS database is not configured. Set OJS_DATABASE_* env vars.")
        }

        pool = mariadb.createPool({
            host: process.env.OJS_DATABASE_HOST,
            port: parseInt(process.env.OJS_DATABASE_PORT || "3306"),
            database: process.env.OJS_DATABASE_NAME,
            user: process.env.OJS_DATABASE_USER,
            password: process.env.OJS_DATABASE_PASSWORD || "",
            connectionLimit: 3,
            idleTimeout: 30000,
            connectTimeout: 10000,
            acquireTimeout: 10000,
            allowPublicKeyRetrieval: true,
        })
    }
    return pool
}

/**
 * Execute a query against the OJS database with retry logic.
 * 
 * Uses exponential backoff: 1s → 2s → 4s (3 attempts max).
 * This handles transient connection drops without blocking the event loop.
 */
export async function ojsQuery<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let conn: mariadb.Connection | undefined
        try {
            conn = await getPool().getConnection()
            const rows = await conn.query(sql, params)
            return rows as T[]
        } catch (err: any) {
            lastError = err

            // Don't retry auth or config errors — they won't resolve themselves
            const nonRetryable = [
                1045, // ER_ACCESS_DENIED_ERROR
                1044, // ER_DBACCESS_DENIED_ERROR
                1049, // ER_BAD_DB_ERROR
            ]
            if (nonRetryable.includes(err.errno)) {
                console.error(`[OJS] Non-retryable error (attempt ${attempt}/${maxRetries}):`, err.message)
                throw err
            }

            console.warn(`[OJS] Query failed (attempt ${attempt}/${maxRetries}): ${err.message}`)

            // Exponential backoff: 1s, 2s, 4s
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt - 1) * 1000
                await new Promise((resolve) => setTimeout(resolve, delay))
            }
        } finally {
            if (conn) {
                try { (conn as any).release?.() ?? conn.end() } catch { /* ignore release errors */ }
            }
        }
    }

    throw lastError || new Error("OJS query failed after all retries")
}

/**
 * Health check for the OJS connection.
 * Returns a status object without throwing.
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
    try {
        const conn = await getPool().getConnection()
        await conn.query("SELECT 1")
        conn.release()
        return { ok: true, configured: true, latencyMs: Date.now() - start, error: null }
    } catch (err: any) {
        return { ok: false, configured: true, latencyMs: Date.now() - start, error: err.message }
    }
}

/**
 * Gracefully close the OJS connection pool.
 * Call this during application shutdown.
 */
export async function closeOjsPool(): Promise<void> {
    if (pool) {
        try {
            await pool.end()
        } catch { /* ignore */ }
        pool = null
    }
}

export { isOjsConfigured }
