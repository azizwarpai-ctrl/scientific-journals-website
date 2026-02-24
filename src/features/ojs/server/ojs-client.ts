import mariadb from "mariadb"

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
        })
    }
    return pool
}

export async function ojsQuery<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const conn = await getPool().getConnection()
    try {
        const rows = await conn.query(sql, params)
        return rows as T[]
    } finally {
        conn.release()
    }
}

export { isOjsConfigured }
