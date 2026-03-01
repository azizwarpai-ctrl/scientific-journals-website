export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Only run this code in the Node.js runtime, as Edge runtime doesn't have 
        // full access to standard Node APIs needed by Prisma adapter and child_process.

        // We dynamically import to ensure NO browser/edge leaks of these server dependencies
        const { initializeDatabase } = await import('./lib/db/init')

        // Fire and forget the initialization process so it doesn't block server startup
        // It will log its own progress and manage its own state
        initializeDatabase().catch(err => {
            console.error('[Instrumentation] Failed to start database initialization:', err)
        })
    }
}
