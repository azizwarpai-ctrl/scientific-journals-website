import { execSync } from 'child_process'
import 'dotenv/config'

console.log('--- Testing Hostinger Init Locally ---')
console.log('ALLOW_PROD_DB_INIT:', process.env.ALLOW_PROD_DB_INIT || 'not set')

try {
    console.log('Attempting npx --version...')
    const out = execSync('npx --version', { encoding: 'utf-8', env: process.env })
    console.log('Result:', out.trim())
} catch (err: any) {
    console.error('NPX failed:', err.message)
}

try {
    console.log('Attempting npx prisma --version...')
    const out = execSync('npx --no-install prisma --version', { encoding: 'utf-8', env: process.env })
    console.log('Result:', out.trim())
} catch (err: any) {
    console.error('Prisma failed:', err.message)
}
