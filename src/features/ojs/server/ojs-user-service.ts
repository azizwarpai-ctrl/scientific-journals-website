import { isOjsConfigured, getOjsConnection } from "@/src/features/ojs/server/ojs-client"
import type { RegistrationPayload } from "@/src/features/auth/schemas/registration-schemas"
import crypto from "crypto"
import type { RowDataPacket } from "mysql2"

export interface OjsUserProvisionData {
    email: string
    firstName: string
    lastName: string
    country: string
    affiliation: string
    biography?: string
    orcid?: string
}

// We try the PHP Bridge first, but fall back to raw MySQL inserts if the bridge isn't available
export async function provisionOjsUser(payload: OjsUserProvisionData): Promise<{ success: boolean; error?: string }> {
    if (!isOjsConfigured()) {
        console.warn("[OJS] Not configured, skipping OJS user provisioning")
        return { success: false, error: "OJS not configured" }
    }

    let conn;
    try {
        conn = await getOjsConnection()
        await conn.beginTransaction()

        // Fallback Native MySQL logic because the PHP Bridge (ojs-user-bridge.php) hasn't been written/deployed yet
        const { email, firstName, lastName, country, affiliation, biography, orcid } = payload
        const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") + "_" + crypto.randomBytes(4).toString("hex")
        const dummyPassword = crypto.randomUUID()

        // 1. Create the user
        await conn.execute(
            `INSERT INTO users (username, password, email, country, disabled, inline_help, date_registered, date_last_login) 
             VALUES (?, ?, ?, ?, 0, 1, NOW(), NOW())`,
            [username, dummyPassword, email, country]
        )

        // Find the auto-incremented user_id
        const [userRow] = await conn.execute<RowDataPacket[]>(`SELECT user_id FROM users WHERE email = ?`, [email])
        if (!userRow || userRow.length === 0) {
            throw new Error("User creation failed: ID not found")
        }
        const userId = userRow[0].user_id

        // 2. Insert standard user settings (EAV table)
        // OJS uses locale strings (e.g., 'en_US') for many settings
        const locale = "en_US"

        const settings = [
            { name: "givenName", value: firstName, type: "string" },
            { name: "familyName", value: lastName, type: "string" },
            { name: "affiliation", value: affiliation, type: "string" },
        ]
        
        if (biography) {
            settings.push({ name: "biography", value: biography, type: "string" })
        }
        
        if (orcid) {
            // ORCID in OJS is typically stored as a full URL
            settings.push({ name: "orcid", value: `https://orcid.org/${orcid}`, type: "string" })
        }

        for (const setting of settings) {
            await conn.execute(
                `INSERT INTO user_settings (user_id, locale, setting_name, setting_value, setting_type) VALUES (?, ?, ?, ?, ?)`,
                [userId, locale, setting.name, setting.value, setting.type]
            )
        }

        await conn.commit()
        return { success: true }
    } catch (error: any) {
        if (conn) await conn.rollback()
        console.error("[OJS] Provisioning failed:", error.message)
        return { success: false, error: error.message }
    } finally {
        if (conn) conn.release()
    }
}
