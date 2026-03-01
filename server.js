const { createServer } = require('http')
const { parse } = require('url')
const { execSync } = require('child_process')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

// ── Database Initialization (runtime only) ──────────────────────
// Runs prisma db push + seed ONCE at server startup when enabled.
// This executes in the runtime environment where 127.0.0.1:3306 is accessible.
async function initDatabase() {
    if (process.env.ALLOW_PROD_DB_INIT !== 'true') {
        console.log('⏭️  DB Init skipped (ALLOW_PROD_DB_INIT != true)')
        return
    }

    console.log('──────────────────────────────────────────────────')
    console.log('🚀 Runtime Database Initialization')
    console.log('──────────────────────────────────────────────────')

    try {
        console.log('[1/2] Running prisma db push...')
        execSync('npx --no-install prisma db push --skip-generate', {
            stdio: 'inherit',
            env: process.env,
        })

        console.log('[2/2] Running prisma db seed...')
        execSync('npx --no-install prisma db seed', {
            stdio: 'inherit',
            env: process.env,
        })

        console.log('✅ Database initialized successfully.')
        console.log('──────────────────────────────────────────────────')
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message)
        console.error('   The server will still start, but the database may be empty.')
        console.log('──────────────────────────────────────────────────')
    }
}

// ── Server Startup ──────────────────────────────────────────────
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

initDatabase().then(() => {
    app.prepare().then(() => {
        createServer(async (req, res) => {
            try {
                const parsedUrl = parse(req.url, true)
                await handle(req, res, parsedUrl)
            } catch (err) {
                console.error('Error occurred handling', req.url, err)
                res.statusCode = 500
                res.end('internal server error')
            }
        })
            .once('error', (err) => {
                console.error(err)
                process.exit(1)
            })
            .listen(port, () => {
                console.log(`> Ready on http://${hostname}:${port}`)
            })
    })
})
