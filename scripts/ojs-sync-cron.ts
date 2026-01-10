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


import { PrismaClient } from '@prisma/client';
import { getActiveJournals, getPublishedArticles } from '../lib/ojs-service';
import { closeOJSConnection, testOJSConnection } from '../lib/ojs-client';

const prisma = new PrismaClient();

interface SyncStats {
  journals: { synced: number; failed: number };
  articles: { synced: number; failed: number };
}

/**
 * Sync journals from OJS to the application database
 */
async function syncJournals(): Promise<SyncStats['journals']> {
  console.log('📚 Syncing journals from OJS...');
  
  let synced = 0;
  let failed = 0;
  
  try {
    const ojsJournals = await getActiveJournals();
    console.log(`   Found ${ojsJournals.length} journals in OJS`);
    
    for (const ojsJournal of ojsJournals) {
      try {
        // Extract journal data from settings
        const title = ojsJournal.settings.name?.en || 
                      ojsJournal.settings.name?.default || 
                      'Untitled Journal';
        
        const abbreviation = ojsJournal.settings.abbreviation?.en || 
                            ojsJournal.settings.abbreviation?.default || 
                            null;
        
        const issn = ojsJournal.settings.printIssn?.default || null;
        const e_issn = ojsJournal.settings.onlineIssn?.default || null;
        const description = ojsJournal.settings.description?.en || 
                           ojsJournal.settings.description?.default || 
                           null;
        
        // Map to your application's journal structure
        const journalData = {
          title,
          abbreviation,
          issn,
          e_issn,
          description,
          field: 'General', // You may want to map this from OJS categories
          publisher: ojsJournal.settings.publisherInstitution?.default || null,
          ojs_id: ojsJournal.journal_id.toString(),
        };
        
        // Use upsert to update or create
        // Note: You'll need to add ojs_id field to your journals table
        await prisma.$executeRaw`
          INSERT INTO journals (title, abbreviation, issn, e_issn, description, field, publisher, ojs_id)
          VALUES (${title}, ${abbreviation}, ${issn}, ${e_issn}, ${description}, 'General', ${journalData.publisher}, ${journalData.ojs_id})
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            abbreviation = VALUES(abbreviation),
            issn = VALUES(issn),
            e_issn = VALUES(e_issn),
            description = VALUES(description),
            publisher = VALUES(publisher),
            updated_at = CURRENT_TIMESTAMP
        `;
        
        synced++;
        console.log(`   ✓ Synced: ${title}`);
      } catch (error) {
        failed++;
        console.error(`   ✗ Failed to sync journal ${ojsJournal.journal_id}:`, error);
      }
    }
  } catch (error) {
    console.error('   ✗ Error fetching journals from OJS:', error);
    throw error;
  }
  
  return { synced, failed };
}

/**
 * Sync published articles from OJS
 */
async function syncArticles(): Promise<SyncStats['articles']> {
  console.log('📄 Syncing published articles from OJS...');
  
  let synced = 0;
  let failed = 0;
  
  try {
    // First, get all journals from our database that have an ojs_id
    const journals = await prisma.$queryRaw<Array<{ id: bigint; ojs_id: string }>>`
      SELECT id, ojs_id FROM journals WHERE ojs_id IS NOT NULL
    `;
    
    console.log(`   Processing ${journals.length} journals`);
    
    for (const journal of journals) {
      try {
        const ojsJournalId = BigInt(journal.ojs_id);
        const articles = await getPublishedArticles(ojsJournalId, 100, 0);
        
        console.log(`   Found ${articles.length} articles for journal ${journal.id}`);
        
        for (const article of articles) {
          try {
            // Sync article as published_article
            // Note: This is simplified - you may want to create submission records first
            await prisma.$executeRaw`
              INSERT INTO published_articles (
                journal_id, 
                doi, 
                publication_date, 
                ojs_publication_id,
                created_at
              )
              VALUES (
                ${journal.id},
                ${article.doi},
                ${article.date_published},
                ${article.publication_id.toString()},
                CURRENT_TIMESTAMP
              )
              ON DUPLICATE KEY UPDATE
                doi = VALUES(doi),
                publication_date = VALUES(publication_date)
            `;
            
            synced++;
          } catch (error) {
            failed++;
            console.error(`   ✗ Failed to sync article ${article.publication_id}:`, error);
          }
        }
      } catch (error) {
        failed++;
        console.error(`   ✗ Failed to sync articles for journal ${journal.id}:`, error);
      }
    }
  } catch (error) {
    console.error('   ✗ Error syncing articles:', error);
    throw error;
  }
  
  return { synced, failed };
}

/**
 * Update the last sync timestamp in system settings
 */
async function updateSyncTimestamp() {
  try {
    await prisma.$executeRaw`
      INSERT INTO system_settings (setting_key, setting_value, description)
      VALUES ('ojs_last_sync', JSON_QUOTE(${new Date().toISOString()}), 'Last successful OJS sync timestamp')
      ON DUPLICATE KEY UPDATE 
        setting_value = VALUES(setting_value),
        updated_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error('Failed to update sync timestamp:', error);
  }
}

/**
 * Main sync function
 */
async function main() {
  const startTime = Date.now();
  
  console.log('🚀 Starting OJS data synchronization...');
  console.log(`⏰ ${new Date().toISOString()}\n`);
  
  try {
    // Test OJS connection first
    const connected = await testOJSConnection();
    if (!connected) {
      throw new Error('Failed to connect to OJS database');
    }
    
    const stats: SyncStats = {
      journals: { synced: 0, failed: 0 },
      articles: { synced: 0, failed: 0 },
    };
    
    // Sync journals
    stats.journals = await syncJournals();
    
    // Sync articles
    stats.articles = await syncArticles();
    
    // Update last sync timestamp
    await updateSyncTimestamp();
    
    const duration = ((Date.now() - startTime  ) / 1000).toFixed(2);
    
    console.log('\n✅ Synchronization completed successfully!');
    console.log('───────────────────────────────────────');
    console.log(`📚 Journals: ${stats.journals.synced} synced, ${stats.journals.failed} failed`);
    console.log(`📄 Articles: ${stats.articles.synced} synced, ${stats.articles.failed} failed`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('───────────────────────────────────────\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Synchronization failed:', error);
    process.exit(1);
  } finally {
    await closeOJSConnection();
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { syncJournals, syncArticles };
