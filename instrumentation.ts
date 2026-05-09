export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Only run this code in the Node.js runtime, as Edge runtime doesn't have 
        // full access to standard Node APIs needed by Prisma adapter and child_process.

        // We dynamically import to ensure NO browser/edge leaks of these server dependencies
        const { initializeDatabase } = await import('./src/lib/db/init')

        // Fire and forget the initialization process so it doesn't block server startup
        // It will log its own progress and manage its own state
        initializeDatabase().catch(err => {
            console.error('[Instrumentation] Failed to start database initialization:', err)
        })

        // Temporary forensic investigation
        const { prisma } = await import('./src/lib/db/config');
        const { fetchFromDatabase } = await import('./src/features/ojs/server/ojs-service');
        const { ojsQuery, isOjsConfigured } = await import('./src/features/ojs/server/ojs-client');

        (async () => {
            try {
                console.log("[FORENSICS] OJS Configured:", isOjsConfigured());
                
                try {
                    const ojsJournals = await fetchFromDatabase(true);
                    console.log(`[FORENSICS] fetchFromDatabase(true) returned ${ojsJournals.length} journals`);
                    console.log("[FORENSICS] Names (all):", ojsJournals.map(j => j.path).join(", "));
                } catch (e) {
                    console.error("[FORENSICS] fetchFromDatabase error:", e);
                }

                try {
                    const ojsJournalsEnabled = await fetchFromDatabase(false);
                    console.log(`[FORENSICS] fetchFromDatabase(false) returned ${ojsJournalsEnabled.length} journals`);
                    console.log("[FORENSICS] Names (enabled):", ojsJournalsEnabled.map(j => j.path).join(", "));
                } catch (e) {
                    console.error("[FORENSICS] fetchFromDatabase(false) error:", e);
                }

                try {
                    const rawCount = await ojsQuery("SELECT count(*) as c FROM journals");
                    console.log("[FORENSICS] Raw OJS journals table count:", rawCount);
                    
                    const rawOjp = await ojsQuery("SELECT journal_id, path, enabled FROM journals WHERE path LIKE '%ojp%'");
                    console.log("[FORENSICS] OJS OJP query:", rawOjp);
                } catch (e) {
                    console.error("[FORENSICS] Raw OJS query error:", e);
                }

                try {
                    const localCount = await prisma.journal.count();
                    console.log("[FORENSICS] Local Prisma Journals Count:", localCount);

                    const localJournals = await prisma.journal.findMany({ select: { title: true, ojs_path: true, status: true } });
                    console.log("[FORENSICS] Local Prisma Journals:", localJournals);

                    // Force the sync to run so the new P2002/trim fixes take effect immediately
                    const { syncOjsJournals } = await import('./src/features/ojs/server/sync-ojs-journals');
                    console.log("[FORENSICS] Forcing syncOjsJournals to restore missing data...");
                    const ojsJournals = await fetchFromDatabase(true);
                    const syncResult = await syncOjsJournals(ojsJournals);
                    console.log("[FORENSICS] Forced sync result:", syncResult);
                } catch (e) {
                    console.error("[FORENSICS] Prisma or Sync error:", e);
                }
            } catch (e) {
                console.error("[FORENSICS] Investigation failed:", e);
            }
        })();
    }
}
