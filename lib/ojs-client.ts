/**
 * OJS Database Client
 * 
 * Provides a separate MySQL connection pool for read-only access
 * to the Open Journal Systems (OJS) database.
 * 
 * @module lib/ojs-client
 */

import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

let ojsPool: Pool | null = null;

/**
 * Get or create the OJS database connection pool
 */
export function getOJSPool(): Pool {
  if (!ojsPool) {
    ojsPool = mysql.createPool({
      host: process.env.OJS_DATABASE_HOST || 'localhost',
      port: parseInt(process.env.OJS_DATABASE_PORT || '3306'),
      database: process.env.OJS_DATABASE_NAME || 'ojs_db',
      user: process.env.OJS_DATABASE_USER || 'readonly_user',
      password: process.env.OJS_DATABASE_PASSWORD,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: '+00:00', // Use UTC
    });
    
    console.log('✅ OJS database connection pool created');
  }
  
  return ojsPool;
}

/**
 * Execute a read-only query on the OJS database
 * 
 * @param sql SQL query string
 * @param params Query parameters (prevents SQL injection)
 * @returns Query results as typed array
 */
export async function queryOJS<T extends RowDataPacket>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  try {
    const pool = getOJSPool();
    const [rows] = await pool.execute<T[]>(sql, params);
    return rows;
  } catch (error) {
    console.error('❌ OJS query error:', error);
    throw new Error(`OJS database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a connection from the pool for transactions
 * Remember to release the connection after use!
 */
export async function getOJSConnection(): Promise<PoolConnection> {
  const pool = getOJSPool();
  return await pool.getConnection();
}

/**
 * Test OJS database connection
 * 
 * @returns True if connection successful, false otherwise
 */
export async function testOJSConnection(): Promise<boolean> {
  try {
    const pool = getOJSPool();
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ OJS database connection successful');
    return true;
  } catch (error) {
    console.error('❌ OJS database connection failed:', error);
    return false;
  }
}

/**
 * Gracefully close the OJS connection pool
 * Call this when shutting down the application
 */
export async function closeOJSConnection(): Promise<void> {
  if (ojsPool) {
    await ojsPool.end();
    ojsPool = null;
    console.log('🔌 OJS database connection pool closed');
  }
}

/**
 * Get pool statistics for monitoring
 */
export function getOJSPoolStats() {
  if (!ojsPool) {
    return null;
  }
  
  return {
    totalConnections: (ojsPool as any)._allConnections?.length || 0,
    freeConnections: (ojsPool as any)._freeConnections?.length || 0,
    queuedRequests: (ojsPool as any)._connectionQueue?.length || 0,
  };
}
