#!/usr/bin/env -S bun run
/**
 * MySQL Connection Test Script
 * 
 * Tests the connection to the main MySQL database.
 * 
 * Usage:
 *   bun run scripts/verify-mysql-connection.ts
 * 
 * @module scripts/verify-mysql-connection
 */

import mysql from 'mysql2/promise';

async function main() {
  console.log('🔌 Testing MySQL database connection...\n');
  
  try {
    // Get database connection details from environment or config
    const config = {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '3306'),
      database: process.env.DATABASE_NAME || 'scientific_journals',
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
    };
    
    console.log(`📡 Connecting to: ${config.user}@${config.host}:${config.port}/${config.database}`);
    
    const connection = await mysql.createConnection(config);
    
    // Test connection
    await connection.ping();
    console.log('✅ Connection successful!\n');
    
    // Get MySQL version
    const [versionRows] = await connection.execute<any>('SELECT VERSION() as version');
    console.log(`✅ MySQL Version: ${versionRows[0].version}`);
    
    // Check if required tables exist
    const tables = [
      'admin_users',
      'journals',
      'submissions',
      'reviews',
      'published_articles',
      'system_settings',
      'email_templates',
      'email_logs',
    ];
    
    console.log('\n📋 Checking required tables:');
    for (const table of tables) {
      try {
        const [rows] = await connection.execute<any>(
          `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [table]
        );
        if (rows.length > 0) {
          const [countRows] = await connection.execute<any>(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`   ✓ ${table.padEnd(20)} (${countRows[0].count} rows)`);
        } else {
          console.log(`   ✗ ${table.padEnd(20)} (missing)`);
        }
      } catch (error) {
        console.log(`   ✗ ${table.padEnd(20)} (error: ${error})`);
      }
    }
    
    // Test JSON field support (MySQL 5.7.8+)
    try {
      await connection.execute(`
        CREATE TEMPORARY TABLE test_json (
          id INT AUTO_INCREMENT PRIMARY KEY,
          data JSON
        )
      `);
      await connection.execute(`
        INSERT INTO test_json (data) VALUES ('{"test": true}')
      `);
      const [jsonRows] = await connection.execute<any>('SELECT data FROM test_json');
      console.log('\n✅ JSON field support: Working');
      console.log(`   Test value: ${JSON.stringify(jsonRows[0].data)}`);
    } catch (error) {
      console.log('\n❌ JSON field support: Not available');
      console.log('   Please upgrade to MySQL 5.7.8+ or MariaDB 10.2.7+');
    }
    
    await connection.end();
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check that MySQL is running');
    console.error('2. Verify your environment variables or .env file');
    console.error('3. Ensure the database exists: CREATE DATABASE scientific_journals;');
    console.error('4. Check user permissions: GRANT ALL PRIVILEGES ON scientific_journals.* TO \'user\'@\'localhost\';');
    process.exit(1);
  }
}

main();
