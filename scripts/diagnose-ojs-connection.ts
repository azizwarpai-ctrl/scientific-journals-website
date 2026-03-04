/**
 * OJS Database Connection Diagnostic Script
 * 
 * Performs a full diagnostic sequence:
 *   1. Environment variable validation
 *   2. DNS resolution
 *   3. TCP port connectivity  
 *   4. MySQL authentication & handshake
 *   5. Query execution & privilege check
 *   6. OJS schema validation
 * 
 * Usage: npx tsx scripts/diagnose-ojs-connection.ts
 */

import * as net from "node:net"
import * as dns from "node:dns/promises"
import * as mariadb from "mariadb"
import * as dotenv from "dotenv"

dotenv.config()

// ─── Configuration ──────────────────────────────────────────────────────────

const CONFIG = {
    host: process.env.OJS_DATABASE_HOST || "",
    port: parseInt(process.env.OJS_DATABASE_PORT || "3306"),
    database: process.env.OJS_DATABASE_NAME || "",
    user: process.env.OJS_DATABASE_USER || "",
    password: process.env.OJS_DATABASE_PASSWORD || "",
}

const TIMEOUT_MS = 15000

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(emoji: string, msg: string) {
    console.log(`${emoji}  ${msg}`)
}

function pass(msg: string) { log("✅", msg) }
function fail(msg: string) { log("❌", msg) }
function warn(msg: string) { log("⚠️", msg) }
function info(msg: string) { log("ℹ️", msg) }

function mask(value: string): string {
    if (value.length <= 4) return "****"
    return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2)
}

// ─── Step 1: Environment Variable Validation ────────────────────────────────

function checkEnvironment(): boolean {
    console.log("\n═══════════════════════════════════════════")
    console.log("  STEP 1: Environment Variables")
    console.log("═══════════════════════════════════════════\n")

    const required: Array<[string, string]> = [
        ["OJS_DATABASE_HOST", CONFIG.host],
        ["OJS_DATABASE_NAME", CONFIG.database],
        ["OJS_DATABASE_USER", CONFIG.user],
    ]

    const optional: Array<[string, string]> = [
        ["OJS_DATABASE_PORT", String(CONFIG.port)],
        ["OJS_DATABASE_PASSWORD", CONFIG.password],
    ]

    let allPresent = true

    for (const [name, value] of required) {
        if (!value) {
            fail(`${name} is MISSING (required)`)
            allPresent = false
        } else {
            pass(`${name} = "${name.includes("PASSWORD") ? mask(value) : value}"`)
        }
    }

    for (const [name, value] of optional) {
        if (!value || value === "3306") {
            info(`${name} = "${value || "(default)"}"`)
        } else {
            pass(`${name} = "${name.includes("PASSWORD") ? mask(value) : value}"`)
        }
    }

    if (!allPresent) {
        fail("Missing required environment variables. Add them to your .env file.")
        console.log("\n  Example .env entries:")
        console.log('  OJS_DATABASE_HOST="your-host.siteground.biz"')
        console.log('  OJS_DATABASE_NAME="your_database_name"')
        console.log('  OJS_DATABASE_USER="your_database_user"')
        console.log('  OJS_DATABASE_PASSWORD="your_password"')
    }

    return allPresent
}

// ─── Step 2: DNS Resolution ──────────────────────────────────────────────────

async function checkDns(): Promise<boolean> {
    console.log("\n═══════════════════════════════════════════")
    console.log("  STEP 2: DNS Resolution")
    console.log("═══════════════════════════════════════════\n")

    try {
        const addresses = await dns.resolve4(CONFIG.host)
        pass(`${CONFIG.host} resolves to ${addresses.join(", ")}`)
        return true
    } catch (err: any) {
        if (err.code === "ENOTFOUND") {
            fail(`Cannot resolve hostname "${CONFIG.host}"`)
            info("Possible causes:")
            info("  • Hostname is misspelled")
            info("  • DNS server is unreachable")
            info("  • The database host doesn't exist")
        } else {
            fail(`DNS lookup failed: ${err.message}`)
        }
        return false
    }
}

// ─── Step 3: TCP Port Connectivity ──────────────────────────────────────────

async function checkPort(): Promise<boolean> {
    console.log("\n═══════════════════════════════════════════")
    console.log("  STEP 3: TCP Port Connectivity")
    console.log("═══════════════════════════════════════════\n")

    return new Promise((resolve) => {
        const socket = new net.Socket()
        const startTime = Date.now()

        socket.setTimeout(TIMEOUT_MS)

        socket.connect(CONFIG.port, CONFIG.host, () => {
            const elapsed = Date.now() - startTime
            pass(`Port ${CONFIG.port} is OPEN on ${CONFIG.host} (${elapsed}ms)`)
            socket.destroy()
            resolve(true)
        })

        socket.on("timeout", () => {
            fail(`Connection to ${CONFIG.host}:${CONFIG.port} TIMED OUT after ${TIMEOUT_MS}ms`)
            info("Possible causes:")
            info("  • Port 3306 is blocked by a firewall")
            info("  • SiteGround remote MySQL access is not enabled")
            info("  • The server is not accepting connections")
            socket.destroy()
            resolve(false)
        })

        socket.on("error", (err: any) => {
            if (err.code === "ECONNREFUSED") {
                fail(`Port ${CONFIG.port} is CLOSED (connection refused)`)
                info("MySQL is not running on this host/port, or it's behind a firewall.")
            } else {
                fail(`TCP connection error: ${err.message} (${err.code})`)
            }
            socket.destroy()
            resolve(false)
        })
    })
}

// ─── Step 4: MySQL Authentication & Handshake ────────────────────────────────

async function checkMysqlAuth(): Promise<mariadb.Connection | null> {
    console.log("\n═══════════════════════════════════════════")
    console.log("  STEP 4: MySQL Authentication")
    console.log("═══════════════════════════════════════════\n")

    try {
        const conn = await mariadb.createConnection({
            host: CONFIG.host,
            port: CONFIG.port,
            database: CONFIG.database,
            user: CONFIG.user,
            password: CONFIG.password,
            connectTimeout: TIMEOUT_MS,
            allowPublicKeyRetrieval: true,
        })

        pass("MySQL handshake successful!")

        // Get server info
        const serverVersion = await conn.query("SELECT VERSION() as version")
        info(`Server version: ${serverVersion[0].version}`)

        const currentUser = await conn.query("SELECT CURRENT_USER() as user")
        info(`Authenticated as: ${currentUser[0].user}`)

        return conn
    } catch (err: any) {
        const code = err.code || err.errno || "UNKNOWN"
        const sqlState = err.sqlState || ""

        switch (true) {
            case code === "ER_ACCESS_DENIED_ERROR" || err.errno === 1045:
                fail(`Access denied for user '${CONFIG.user}'`)
                info("Possible causes:")
                info("  • Wrong password")
                info("  • User doesn't have remote access privileges")
                info(`  • Your IP is not whitelisted in SiteGround (current IP shown in error)`)
                info("Fix: SiteGround → Site Tools → MySQL → Remote MySQL → Add your IP")
                // Extract IP from error message if possible
                const ipMatch = err.message?.match(/'[^']*'@'([^']+)'/)
                if (ipMatch) {
                    warn(`Your IP that needs whitelisting: ${ipMatch[1]}`)
                }
                break

            case code === "ECONNREFUSED":
                fail("Connection refused by the database server")
                info("MySQL might not be running or port is blocked.")
                break

            case code === "ETIMEDOUT" || code === "PROTOCOL_CONNECTION_LOST":
                fail("Connection timed out during handshake")
                info("Network latency too high or firewall is silently dropping packets.")
                break

            case err.message?.includes("RSA public key"):
                fail("RSA public key retrieval error")
                info("Fix: Add 'allowPublicKeyRetrieval: true' to your connection config.")
                break

            case err.message?.includes("ssl") || err.message?.includes("SSL"):
                fail("SSL/TLS handshake error")
                info("Fix: Configure SSL or add 'ssl: { rejectUnauthorized: false }' for testing.")
                break

            case err.message?.includes("Unknown database"):
                fail(`Database '${CONFIG.database}' does not exist`)
                info("Check the database name in your SiteGround MySQL panel.")
                break

            default:
                fail(`MySQL connection error: ${err.message}`)
                info(`Error code: ${code}, SQL State: ${sqlState}`)
        }

        return null
    }
}

// ─── Step 5: Query & Privilege Check ─────────────────────────────────────────

async function checkPrivileges(conn: mariadb.Connection): Promise<boolean> {
    console.log("\n═══════════════════════════════════════════")
    console.log("  STEP 5: Privileges & Query Test")
    console.log("═══════════════════════════════════════════\n")

    // Test SELECT privilege
    try {
        const tables = await conn.query("SHOW TABLES")
        pass(`SELECT privilege: OK (${tables.length} tables found)`)

        if (tables.length > 0) {
            const tableNames = tables.map((t: any) => Object.values(t)[0])
            info(`Tables: ${tableNames.slice(0, 10).join(", ")}${tableNames.length > 10 ? "..." : ""}`)
        }
    } catch (err: any) {
        fail(`SELECT privilege: DENIED — ${err.message}`)
        return false
    }

    // Test if OJS tables exist
    try {
        const journals = await conn.query("SELECT COUNT(*) as count FROM journals")
        pass(`OJS 'journals' table: EXISTS (${journals[0].count} rows)`)
    } catch (err: any) {
        if (err.message.includes("doesn't exist")) {
            fail("OJS 'journals' table NOT FOUND — this may not be an OJS database")
        } else {
            fail(`Cannot query OJS tables: ${err.message}`)
        }
        return false
    }

    // Test the actual query used by the application
    try {
        const result = await conn.query(`
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
        pass(`Application query: OK (${result.length} active journals)`)

        if (result.length > 0) {
            info("Sample journal:")
            info(`  ID: ${result[0].journal_id}`)
            info(`  Name: ${result[0].name}`)
            info(`  Path: ${result[0].path}`)
        }
    } catch (err: any) {
        fail(`Application query failed: ${err.message}`)
        info("The 'journal_settings' table may not exist or has a different schema.")
        return false
    }

    return true
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log("╔═══════════════════════════════════════════╗")
    console.log("║   OJS Database Connection Diagnostics     ║")
    console.log("╚═══════════════════════════════════════════╝")

    // Step 1: Check env vars
    if (!checkEnvironment()) {
        console.log("\n🛑 STOPPED: Fix environment variables first.\n")
        process.exit(1)
    }

    // Step 2: DNS
    const dnsOk = await checkDns()
    if (!dnsOk) {
        console.log("\n🛑 STOPPED: Cannot resolve database hostname.\n")
        process.exit(1)
    }

    // Step 3: Port
    const portOk = await checkPort()
    if (!portOk) {
        console.log("\n🛑 STOPPED: Cannot reach database port.\n")
        console.log("  ┌─ SiteGround Fix ─────────────────────────┐")
        console.log("  │ 1. Login to SiteGround Site Tools         │")
        console.log("  │ 2. Go to Site → MySQL → Remote MySQL      │")
        console.log("  │ 3. Add your server's public IP             │")
        console.log("  │ 4. Or add '%' for all IPs (NOT in prod!)   │")
        console.log("  └────────────────────────────────────────────┘")
        process.exit(1)
    }

    // Step 4: MySQL Auth
    const conn = await checkMysqlAuth()
    if (!conn) {
        console.log("\n🛑 STOPPED: MySQL authentication failed.\n")
        console.log("  ┌─ SiteGround Checklist ────────────────────┐")
        console.log("  │ 1. Verify username/password in MySQL panel │")
        console.log("  │ 2. Whitelist your IP in Remote MySQL       │")
        console.log("  │ 3. Ensure user has database permissions     │")
        console.log("  └────────────────────────────────────────────┘")
        process.exit(1)
    }

    // Step 5: Privileges
    const queryOk = await checkPrivileges(conn)
    await conn.end()

    // Summary
    console.log("\n╔═══════════════════════════════════════════╗")
    console.log("║               RESULTS SUMMARY             ║")
    console.log("╠═══════════════════════════════════════════╣")
    console.log(`║  Environment   ✅ OK                       ║`)
    console.log(`║  DNS           ✅ OK                       ║`)
    console.log(`║  TCP Port      ✅ OK                       ║`)
    console.log(`║  MySQL Auth    ✅ OK                       ║`)
    console.log(`║  Queries       ${queryOk ? "✅ OK" : "❌ FAILED"}                   ║`)
    console.log("╚═══════════════════════════════════════════╝")

    if (queryOk) {
        console.log("\n🎉 All checks passed! The OJS database is fully connected and operational.\n")
        console.log("Your .env values are correct. The application should be able to")
        console.log("fetch OJS journals at: GET /api/ojs/journals\n")
    } else {
        console.log("\n⚠️  Connection works but queries failed. Check table structure.\n")
    }

    process.exit(0)
}

main().catch((err) => {
    console.error("\n💥 Unexpected error:", err)
    process.exit(1)
})
