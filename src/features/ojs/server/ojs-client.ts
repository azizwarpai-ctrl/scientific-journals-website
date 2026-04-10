import mysql from "mysql2/promise"
import type { OjsUserProvisionData } from "@/src/features/ojs/types"
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise"

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
            password: process.env.OJS_DATABASE_PASSWORD?.trim() || "",
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
            authSwitchHandler: function ({ pluginName, pluginData: _pluginData }: { pluginName: string; pluginData: Buffer }, cb: (err?: Error | null) => void) {
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
export async function ojsQuery<T = RowDataPacket>(sql: string, params?: unknown[]): Promise<T[]> {
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let conn: PoolConnection | undefined
        try {
            conn = await getPool().getConnection()
            const [rows] = await conn.query<RowDataPacket[]>(sql, params)
            return rows as T[]
        } catch (error) {
            const err = error as Error & { code?: string }
            lastError = err

            const nonRetryable = [
                "ER_ACCESS_DENIED_ERROR",
                "ER_DBACCESS_DENIED_ERROR",
                "ER_BAD_DB_ERROR",
                "ER_HOST_IS_BLOCKED",
            ]
            if (err.code && nonRetryable.includes(err.code)) {
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

/**
 * Gracefully close the OJS connection pool.
 */
export async function closeOjsPool(): Promise<void> {
    if (pool) {
        try { await pool.end() } catch { /* ignore */ }
        pool = null
    }
}

export async function getOjsConnection(): Promise<PoolConnection> {
    return getPool().getConnection()
}

/**
 * Forwards provisioning requests to the OJS API/bridge over HTTP.
 * Implements retry logic similar to ojsQuery.
 */
export async function provisionUser(payload: OjsUserProvisionData): Promise<{ success: boolean; error?: string }> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    const baseUrlStr = process.env.OJS_BASE_URL?.replace(/\/$/, "") || "";
    const apiKey = process.env.OJS_API_KEY;

    if (!baseUrlStr) {
        return { success: false, error: "OJS_BASE_URL is not configured." };
    }
    if (!apiKey) {
        return { success: false, error: "OJS_API_KEY is not configured." };
    }

    // Validate URL and enforce HTTPS for non-local hosts
    let baseUrl: URL;
    try {
        baseUrl = new URL(baseUrlStr);
    } catch {
        return { success: false, error: `Invalid OJS_BASE_URL: ${baseUrlStr}` };
    }

    const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname);
    if (!isLoopback && baseUrl.protocol !== "https:") {
        return { success: false, error: "OJS_BASE_URL must use HTTPS for non-local environments." };
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            // Assume the PHP bridge is located here as requested by integration plan options
            const response = await fetch(`${baseUrlStr}/ojs-user-bridge.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text();
                // 409 Conflict means the user already exists, which is a success for idempotency
                if (response.status === 409) {
                    return { success: true };
                }
                // 401/403 shouldn't be retried
                if (response.status === 401 || response.status === 403) {
                    return { success: false, error: `Auth Error: ${errText}` };
                }
                throw new Error(`HTTP ${response.status}: ${errText}`);
            }
            return { success: true };
        } catch (error) {
            const err = error as Error & { name?: string }
            clearTimeout(timeoutId);
            lastError = err;

            if (err.name === 'AbortError') {
                console.warn(`[OJS Bridge] Provisioning timed out (attempt ${attempt}/${maxRetries})`);
            } else {
                console.warn(`[OJS Bridge] Provisioning failed (attempt ${attempt}/${maxRetries}): ${err.message}`);
            }

            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt - 1) * 1000;
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }
    return { success: false, error: lastError?.message || "OJS provisioning failed after all retries" };
}

/**
 * Diagnostic health check to verify OJS database connectivity and configuration.
 */
export async function ojsHealthCheck(): Promise<{ ok: boolean; configured: boolean; error: string | null }> {
    const configured = isOjsConfigured()
    if (!configured) return { ok: false, configured: false, error: "Settings missing (OJS_DATABASE_*)" }

    try {
        await ojsQuery("SELECT 1")
        return { ok: true, configured: true, error: null }
    } catch (err) {
        return { ok: false, configured: true, error: (err as Error).message }
    }
}

export { isOjsConfigured }
