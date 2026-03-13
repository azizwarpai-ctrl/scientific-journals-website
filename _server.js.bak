const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = process.env.PORT || 3000

// NOTE: Database migrations are now handled at build time via `prisma migrate deploy`
// in the build script (package.json). Runtime seeding is handled by the Next.js
// instrumentation hook (lib/db/init.ts). This server script no longer manages DB init.
async function initDatabase() {
    // No-op: migrations run at build time, seeding runs via instrumentation hook.
    console.log('ℹ️  DB migrations handled at build time. Runtime seeding via instrumentation hook.')
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
