#!/usr/bin/env bun
/**
 * Standalone password reset script.
 * Uses the 'mariadb' driver (same one Prisma's adapter uses, guaranteed installed).
 *
 * Usage on server:
 *   cd ~/domains/digitopub.com/nodejs
 *   bun run scripts/reset-password.ts
 */

import mariadb from "mariadb";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// ── Hard-coded target ────────────────────────────────────
const TARGET_EMAIL = "support@digitopub.com";
const NEW_PASSWORD = "^Zn>Xawy7b";

// ── Load .env manually (no dotenv dependency needed) ─────
function loadEnvFile(dir: string): Record<string, string> {
  const envPath = path.join(dir, ".env");
  const vars: Record<string, string> = {};
  if (!fs.existsSync(envPath)) {
    console.log(`[info] No .env found at ${envPath}`);
    return vars;
  }
  console.log(`[info] Loading .env from ${envPath}`);
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

async function main() {
  console.log("=== Password Reset Script ===");
  console.log(`Target: ${TARGET_EMAIL}`);
  console.log("");

  // Load env vars from .env in current working directory
  const env = loadEnvFile(process.cwd());

  // Merge with process.env (process.env takes precedence)
  const getEnv = (key: string) => process.env[key] || env[key] || "";

  // Parse DATABASE_URL if available
  let dbHost = getEnv("DATABASE_HOST");
  let dbPort = getEnv("DATABASE_PORT") || "3306";
  let dbUser = getEnv("DATABASE_USER");
  let dbPass = getEnv("DATABASE_PASSWORD");
  let dbName = getEnv("DATABASE_NAME");

  const dbUrl = getEnv("DATABASE_URL");
  if (dbUrl && (!dbHost || !dbUser)) {
    console.log("[info] Parsing DATABASE_URL...");
    try {
      const url = new URL(dbUrl);
      dbHost = dbHost || url.hostname;
      dbPort = dbPort || url.port || "3306";
      dbUser = dbUser || decodeURIComponent(url.username);
      dbPass = dbPass || decodeURIComponent(url.password);
      dbName = dbName || url.pathname.replace(/^\//, "");
    } catch (e) {
      console.error("[error] Failed to parse DATABASE_URL:", e);
    }
  }

  if (!dbHost || !dbUser || !dbName) {
    console.error("[FATAL] Missing database credentials.");
    console.error("  DATABASE_HOST:", dbHost || "(empty)");
    console.error("  DATABASE_USER:", dbUser || "(empty)");
    console.error("  DATABASE_NAME:", dbName || "(empty)");
    process.exit(1);
  }

  console.log(`[info] Connecting to ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

  let conn: mariadb.Connection;
  try {
    conn = await mariadb.createConnection({
      host: dbHost,
      port: parseInt(dbPort),
      user: dbUser,
      password: dbPass,
      database: dbName,
    });
    console.log("[ok] Connected to database.");
  } catch (e: any) {
    console.error("[FATAL] Cannot connect:", e.message);
    process.exit(1);
  }

  // List existing admin users
  try {
    const rows = await conn.query("SELECT id, email, role FROM admin_users");
    console.log("\n[info] Existing admin_users:");
    for (const r of rows) {
      console.log(`  id=${r.id}  email=${r.email}  role=${r.role}`);
    }
  } catch (e: any) {
    console.error("[error] Could not list admin_users:", e.message);
  }

  // Generate bcrypt hash
  console.log("\n[info] Generating bcrypt hash (10 rounds)...");
  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  console.log("[ok] Hash generated:", hash.substring(0, 20) + "...");

  // Try UPDATE first
  try {
    const result = await conn.query(
      "UPDATE admin_users SET password_hash = ? WHERE email = ?",
      [hash, TARGET_EMAIL]
    );

    if (result.affectedRows === 0) {
      console.log(`[info] No existing user '${TARGET_EMAIL}' found. Creating...`);
      await conn.query(
        "INSERT INTO admin_users (email, password_hash, full_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [TARGET_EMAIL, hash, "Technical Support", "admin"]
      );
      console.log(`[SUCCESS] Created '${TARGET_EMAIL}' with new password.`);
    } else {
      console.log(`[SUCCESS] Password updated for '${TARGET_EMAIL}' (${result.affectedRows} row affected).`);
    }
  } catch (e: any) {
    console.error("[FATAL] SQL error:", e.message);
    await conn.end();
    process.exit(1);
  }

  // Verify
  try {
    const rows = await conn.query(
      "SELECT id, email, role, LENGTH(password_hash) as hash_length FROM admin_users WHERE email = ?",
      [TARGET_EMAIL]
    );
    if (rows.length > 0) {
      console.log(`[verify] id=${rows[0].id}  email=${rows[0].email}  role=${rows[0].role}  hash_length=${rows[0].hash_length}`);
    }
  } catch (e: any) {
    console.warn("[warn] Verification query failed:", e.message);
  }

  await conn.end();
  console.log("\n=== Done. You can now log in at /admin/login ===");
}

main().catch((err) => {
  console.error("[UNHANDLED ERROR]:", err);
  process.exit(1);
});
