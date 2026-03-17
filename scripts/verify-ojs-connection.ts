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

import { ojsHealthCheck, ojsQuery } from '@/src/features/ojs/server/ojs-client';

async function main() {
  console.log('🔌 Testing OJS database connection...\n');
  
  try {
    // Test basic connection
    const health = await ojsHealthCheck();
    
    if (!health.ok) {
      console.error('❌ Failed to connect to OJS database');
      console.error(`Error: ${health.error}`);
      console.error('Please check your environment variables:');
      console.error('  - OJS_DATABASE_HOST');
      console.error('  - OJS_DATABASE_PORT');
      console.error('  - OJS_DATABASE_NAME');
      console.error('  - OJS_DATABASE_USER');
      console.error('  - OJS_DATABASE_PASSWORD');
      process.exit(1);
    }

    console.log(`✅ Connection successful! (Latency: ${health.latencyMs}ms)\n`);
    
    // Get database version
    const versionResult = await ojsQuery<any>('SELECT VERSION() as version');
    console.log(`✅ MySQL Version: ${versionResult[0].version}`);
    
    // Get journal count
    const journalCount = await ojsQuery<any>('SELECT COUNT(*) as count FROM journals');
    console.log(`📚 Total Journals: ${journalCount[0].count}`);
    
    // Get active journals count
    const activeJournals = await ojsQuery<any>('SELECT COUNT(*) as count FROM journals WHERE enabled = 1');
    console.log(`✓  Active Journals: ${activeJournals[0].count}`);
    
    // Get submission count
    const submissionCount = await ojsQuery<any>('SELECT COUNT(*) as count FROM submissions');
    console.log(`📝 Total Submissions: ${submissionCount[0].count}`);
    
    // Get published articles count
    const publishedCount = await ojsQuery<any>(`
      SELECT COUNT(*) as count 
      FROM publications p
      WHERE p.status = 3 AND p.date_published IS NOT NULL
    `);
    console.log(`📄 Published Articles: ${publishedCount[0].count}`);
    
    // Get user count
    const userCount = await ojsQuery<any>('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Total Users: ${userCount[0].count}`);
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed:', error);
    process.exit(1);
  }
}

main();
