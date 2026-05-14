import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        // Per-file isolation so vi.mock() factories declared in one file
        // don't bleed into another. The journals-self-heal tests dynamically
        // import @/src/features/ojs/server/ojs-client; if another file has
        // already loaded the real module into a shared worker, vi.mock()
        // here can't override it. Forks pool + fileParallelism:false gives
        // each file its own clean worker.
        pool: 'forks',
        isolate: true,
        fileParallelism: false,
        env: {
            OJS_BASE_URL: 'http://localhost:8000',
            OJS_DATABASE_HOST: ''
        },
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'text-summary', 'json-summary'],
            include: [
                'src/features/**/schemas/**',
                'src/lib/**',
            ],
            exclude: [
                'node_modules',
                '.next',
                'prisma',
            ],
        },
        testTimeout: 10000,
        server: {
            deps: {
                inline: ['zod'],
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
            '@/src': path.resolve(__dirname, './src'),
            '@/lib': path.resolve(__dirname, './lib'),
        },
        conditions: ['import', 'module', 'node', 'default'],
    },
})
