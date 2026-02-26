// src/instrumentation.ts
// This file executes exactly once when Next.js starts up.

export async function register() {
    // Only run the seed check in a Node.js environment on production server startup.
    // We check for process.env.NEXT_RUNTIME === 'nodejs' to prevent running in the Edge runtime where child_process is unavailable.
    if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
        try {
            // Import the dynamic elements here strictly within the nodejs context
            // to avoid breaking Edge runtime compilation for middleware which also triggers this file on some setups.
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const { prisma } = await import('@/lib/db/config');

            const execAsync = promisify(exec);

            // Check if the initialization has already been completed using our SystemSetting table
            const isSeeded = await prisma.systemSetting.findUnique({
                where: { setting_key: 'seed_completed' }
            });

            if (!isSeeded) {
                console.log('🚀 [Instrumentation]: Production mode detected. Prisma seed has NOT been executed.');
                console.log('🚀 [Instrumentation]: Running Prisma seed automatically...');

                // Execute the Next seeding command. 
                // We use Bun as defined in original package.json "prisma": { "seed": "bun prisma/seed.ts" }
                // For production environments not running Bun, this could be "npx prisma db seed" assuming standard prisma paths.
                // But per constraints, let's execute the standard package.json db:seed script safely via npm/bun

                // Since package.json script db:seed is custom sql, and prisma: { seed: "bun prisma/seed.ts" } is set
                // The proper prisma command is `prisma db seed` 
                const { stdout, stderr } = await execAsync('npx prisma db seed');

                if (stdout) console.log(`[Seed Output]: ${stdout}`);
                if (stderr) console.error(`[Seed Error/Warning]: ${stderr}`);

                // Persist the flag to prevent re-running in the future
                await prisma.systemSetting.create({
                    data: {
                        setting_key: 'seed_completed',
                        setting_value: JSON.stringify(true),
                        description: 'Flag indicating whether initial Prisma seed has been executed on production startup.',
                    }
                });

                console.log('✅ [Instrumentation]: Prisma seed executed and flag persisted successfully.');
            } else {
                console.log('✅ [Instrumentation]: Prisma seed was already executed previously. Skipping.');
            }
        } catch (error) {
            console.error('❌ [Instrumentation]: Failed during auto-seeding process:', error);
            // We don't necessarily exit the process here to allow the app to run even if seeding fails,
            // but in some strict environments you might want to call process.exit(1).
        }
    }
}
