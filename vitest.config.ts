import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
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
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
            '@/src': path.resolve(__dirname, './src'),
            '@/lib': path.resolve(__dirname, './lib'),
        },
    },
})
