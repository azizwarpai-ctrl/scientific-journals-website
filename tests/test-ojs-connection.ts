import * as mariadb from "mariadb"

async function testConnection() {
    console.log("Connecting to gparm12.siteground.biz:3306...")

    let conn
    try {
        conn = await mariadb.createConnection({
            host: "gparm12.siteground.biz",
            port: 3306,
            database: "dbkgvcunttgs97",
            user: "ua9oxq3q2pzvz",
            password: "32FFb#1449LF",
            connectTimeout: 20000,
            allowPublicKeyRetrieval: true, // This is required for some MySQL 8+ auth methods
            ssl: {
                rejectUnauthorized: false // Often needed for hosted DBs like Siteground
            }
        })
        console.log("✅ Successfully connected to OJS database!")

        const rows = await conn.query("SELECT COUNT(*) as count FROM journals")
        console.log(`📊 Found ${rows[0].count} journals in the OJS database.`)

        await conn.end()
    } catch (err) {
        console.error("❌ Connection failed!")
        if (err instanceof Error) {
            console.error(`Error: ${err.message}`)
            console.error(`Error name: ${err.name}`)
        } else {
            console.error(err)
        }
    }
}

testConnection()
