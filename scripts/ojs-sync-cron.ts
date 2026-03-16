#!/usr/bin/env -S bun run
/**
 * OJS Data Sync Cron Script
 * 
 * Synchronizes data from the OJS database to the main application database.
 * This script should be run periodically via cron to keep data up-to-date.
 * 
 * Usage:
 *   bun run scripts/ojs-sync-cron.ts
 * 
 * Cron Schedule Examples (for crontab):
 *   Every 6 hours: 0 *\/6 * * *
 *   Every day at midnight: 0 0 * * *
 *   Every Monday at 2 AM: 0 2 * * 1
 * 
 * @module scripts/ojs-sync-cron
 */


import { prisma } from '../lib/db/config';
import { fetchFromDatabase } from '../src/features/ojs/server/ojs-service';
import { closeOjsPool, ojsHealthCheck } from '../src/features/ojs/server/ojs-client';
import { syncOjsJournals } from '../src/features/ojs/server/sync-ojs-journals';

/**
 * Main sync function
 */
async function main() {
  const startTime = Date.now();
  
  console.log('🚀 Starting OJS data synchronization...');
  console.log(`⏰ ${new Date().toISOString()}\n`);
  
  try {
    // 1. Test OJS connection
    const healthy = await ojsHealthCheck();
    if (!healthy.ok) {
      throw new Error(`Failed to connect to OJS database: ${healthy.error}`);
    }
    console.log('✅ Connected to OJS database');

    // 2. Fetch journals from OJS
    console.log('📚 Fetching journals from OJS...');
    const ojsJournals = await fetchFromDatabase();
    console.log(`   Found ${ojsJournals.length} journals`);

    // 3. Sync to internal database
    console.log('🔄 Synchronizing data...');
    const result = await syncOjsJournals(ojsJournals);
    
    // 4. Update sync timestamp (best effort)
    try {
      await prisma.$executeRaw`
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES ('ojs_last_sync', JSON_QUOTE(${new Date().toISOString()}), 'Last successful OJS sync timestamp')
        ON DUPLICATE KEY UPDATE 
          setting_value = VALUES(setting_value),
          updated_at = CURRENT_TIMESTAMP
      `;
    } catch (tsError) {
      console.warn('Could not update sync timestamp:', tsError);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Synchronization completed successfully!');
    console.log('───────────────────────────────────────');
    console.log(`📚 Journals: ${result.synced} synced, ${result.errors} errors`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('───────────────────────────────────────\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Synchronization failed:', error);
    process.exit(1);
  } finally {
    await closeOjsPool();
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (import.meta.main || !process.env.TEST_MODE) {
  main();
}
