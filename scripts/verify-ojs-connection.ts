#!/usr/bin/env -S bun run
/**
 * OJS Database Connection Test Script
 * 
 * Tests the connection to the OJS database and displays basic information.
 * 
 * Usage:
 *   bun run scripts/verify-ojs-connection.ts
 * 
 * @module scripts/verify-ojs-connection
 */

import { testOJSConnection, queryOJS, getOJSPoolStats } from '../lib/ojs-client';

async function main() {
  console.log('🔌 Testing OJS database connection...\n');
  
  try {
    // Test basic connection
    const connected = await testOJSConnection();
    
    if (!connected) {
      console.error('❌ Failed to connect to OJS database');
      console.error('Please check your environment variables:');
      console.error('  - OJS_DATABASE_HOST');
      console.error('  - OJS_DATABASE_PORT');
      console.error('  - OJS_DATABASE_NAME');
      console.error('  - OJS_DATABASE_USER');
      console.error('  - OJS_DATABASE_PASSWORD');
      process.exit(1);
    }
    
    // Get database version
    const [versionResult] = await queryOJS<any>('SELECT VERSION() as version');
    console.log(`✅ MySQL Version: ${versionResult.version}`);
    
    // Get journal count
    const [journalCount] = await queryOJS<any>('SELECT COUNT(*) as count FROM journals');
    console.log(`📚 Total Journals: ${journalCount.count}`);
    
    // Get active journals count
    const [activeJournals] = await queryOJS<any>('SELECT COUNT(*) as count FROM journals WHERE enabled = 1');
    console.log(`✓  Active Journals: ${activeJournals.count}`);
    
    // Get submission count
    const [submissionCount] = await queryOJS<any>('SELECT COUNT(*) as count FROM submissions');
    console.log(`📝 Total Submissions: ${submissionCount.count}`);
    
    // Get published articles count
    const [publishedCount] = await queryOJS<any>(`
      SELECT COUNT(*) as count 
      FROM publications p
      WHERE p.status = 3 AND p.date_published IS NOT NULL
    `);
    console.log(`📄 Published Articles: ${publishedCount.count}`);
    
    // Get user count
    const [userCount] = await queryOJS<any>('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Total Users: ${userCount.count}`);
    
    // Get pool statistics
    const poolStats = getOJSPoolStats();
    if (poolStats) {
      console.log('\n📊 Connection Pool Statistics:');
      console.log(`   Total Connections: ${poolStats.totalConnections}`);
      console.log(`   Free Connections: ${poolStats.freeConnections}`);
      console.log(`   Queued Requests: ${poolStats.queuedRequests}`);
    }
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed:', error);
    process.exit(1);
  }
}

main();
