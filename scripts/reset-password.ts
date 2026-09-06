#!/usr/bin/env bun
/**
 * Standalone password reset script.
 * Uses mysql2 directly (no Prisma, no dotenv dependency).
 * 
 * Usage on server:
 *   bun run reset-password.ts
 */

import mysql from "mysql2/promise";
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
    // Strip surrounding quotes
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

  // Load env vars
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  // Try current dir first, then parent dir
  let env = loadEnvFile(process.cwd());
  if (!env.DATABASE_HOST && !env.DATABASE_URL) {
    const parentDir = path.resolve(process.cwd(), "..");
    env = loadEnvFile(parentDir);
  }

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
    console.error("");
    console.error("Set these in .env or as environment variables.");
    process.exit(1);
  }

  console.log(`[info] Connecting to ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

  // Connect
  let connection: mysql.Connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      port: parseInt(dbPort),
      user: dbUser,
      password: dbPass,
      database: dbName,
    });
    console.log("[ok] Connected to MySQL.");
  } catch (e: any) {
    console.error("[FATAL] Cannot connect to MySQL:", e.message);
    process.exit(1);
  }

  // List existing admin users
  try {
    const [rows] = await connection.execute(
      "SELECT id, email, role FROM admin_users"
    );
    console.log("");
    console.log("[info] Existing admin_users:");
    console.table(rows);
  } catch (e: any) {
    console.error("[error] Could not list admin_users:", e.message);
  }

  // Generate bcrypt hash
  console.log("[info] Generating bcrypt hash (10 rounds)...");
  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  console.log("[ok] Hash generated:", hash.substring(0, 20) + "...");

  // Try UPDATE first
  try {
    const [result] = await connection.execute<mysql.ResultSetHeader>(
      "UPDATE admin_users SET password_hash = ? WHERE email = ?",
      [hash, TARGET_EMAIL]
    );

    if (result.affectedRows === 0) {
      console.log(`[info] No existing user '${TARGET_EMAIL}' found. Creating...`);
      await connection.execute(
        "INSERT INTO admin_users (email, password_hash, full_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [TARGET_EMAIL, hash, "Technical Support", "admin"]
      );
      console.log(`[SUCCESS] Created '${TARGET_EMAIL}' with new password.`);
    } else {
      console.log(`[SUCCESS] Password updated for '${TARGET_EMAIL}' (${result.affectedRows} row affected).`);
    }
  } catch (e: any) {
    console.error("[FATAL] SQL error:", e.message);
    await connection.end();
    process.exit(1);
  }

  // Verify the update
  try {
    const [rows] = await connection.execute<any[]>(
      "SELECT id, email, role, LENGTH(password_hash) as hash_length FROM admin_users WHERE email = ?",
      [TARGET_EMAIL]
    );
    if (rows.length > 0) {
      console.log("[verify] User record after update:", rows[0]);
    }
  } catch (e: any) {
    console.warn("[warn] Verification query failed:", e.message);
  }

  await connection.end();
  console.log("");
  console.log("=== Done. You can now log in at /admin/login ===");
}

main().catch((err) => {
  console.error("[UNHANDLED ERROR]:", err);
  process.exit(1);
});
