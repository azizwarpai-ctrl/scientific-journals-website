import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    try {
        console.log(`Connecting to ${process.env.OJS_DATABASE_HOST} as ${process.env.OJS_DATABASE_USER}...`);
        const conn = await mysql.createConnection({
            host: process.env.OJS_DATABASE_HOST,
            port: parseInt(process.env.OJS_DATABASE_PORT || "3306"),
            user: process.env.OJS_DATABASE_USER,
            password: process.env.OJS_DATABASE_PASSWORD || "",
            database: process.env.OJS_DATABASE_NAME,
            ssl: {
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2'
            },
            allowPublicKeyRetrieval: true,
            authPlugins: {
                // If the proxy announces something else, we can override the mapping?
            },
            // Wait, let's see if authPlugin exists on ConnectionOptions
            // authPlugin: 'caching_sha2_password',
        } as any);

        console.log("Connected!");
        await conn.end();
    } catch (e) {
        console.error("Connection failed:", e);
    }
}

main();
