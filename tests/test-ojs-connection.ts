import * as mariadb from "mariadb"
import * as dotenv from "dotenv"

dotenv.config()

async function testConnection() {
    const host = process.env.OJS_DATABASE_HOST
    const port = parseInt(process.env.OJS_DATABASE_PORT || "3306")
    const database = process.env.OJS_DATABASE_NAME
    const user = process.env.OJS_DATABASE_USER
    const password = process.env.OJS_DATABASE_PASSWORD

    if (!host || !database || !user) {
        console.error("❌ Missing required OJS environment variables!")
        process.exit(1)
    }

    console.log(`Connecting to ${host}:${port}...`)

    let conn: mariadb.Connection | undefined
    try {
        conn = await mariadb.createConnection({
            host,
            port,
            database,
            user,
            password,
            connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "20000"),
            allowPublicKeyRetrieval: true,
            ssl: {
                rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
            }
        })
        console.log("✅ Successfully connected to OJS database!")

        const rows = await conn.query("SELECT COUNT(*) as count FROM journals")
        console.log(`📊 Found ${rows[0].count} journals in the OJS database.`)
    } catch (err) {
        console.error("❌ Connection failed!")
        if (err instanceof Error) {
            console.error(`Error: ${err.message}`)
            console.error(`Error name: ${err.name}`)
        } else {
            console.error(err)
        }
    } finally {
        if (conn) {
            try {
                await conn.end()
            } catch (endErr) {
                console.error("Failed to close connection:", endErr)
            }
        }
    }
}

testConnection()
