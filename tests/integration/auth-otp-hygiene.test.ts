import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ════════════════════════════════════════
// Mock all external dependencies BEFORE importing routes
// ════════════════════════════════════════

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}))

vi.mock('server-only', () => ({}))

vi.mock('@/src/lib/db/auth', () => ({
  getSession: vi.fn(),
  createSession: vi.fn(),
  destroySession: vi.fn(),
}))

vi.mock('@/src/lib/db/users', () => ({
  verifyPassword: vi.fn(),
  getUserById: vi.fn(),
}))

vi.mock('@/src/features/auth/server/send-otp-email', () => ({
  sendOtpEmail: vi.fn(),
}))

vi.mock('@/src/lib/db/config', () => ({
  prisma: {
    verificationCode: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    adminUser: {
      findUnique: vi.fn(),
    },
  },
}))

import { Hono } from 'hono'
import { authRouter } from '@/src/features/auth/server/route'
import { prisma } from '@/src/lib/db/config'
import { verifyPassword } from '@/src/lib/db/users'
import { __resetRateLimiterForTests } from '@/src/lib/rate-limiter'

const ADMIN_USER = { id: '1', email: 'admin@example.com', full_name: 'Admin', role: 'admin' }

function createApp() {
  const app = new Hono().basePath('/api')
  app.route('/auth', authRouter)
  return app
}

function postJson(app: ReturnType<typeof createApp>, path: string, body: unknown, ip = '203.0.113.5') {
  return app.request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

describe('Admin OTP hygiene (hotfix A4)', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    __resetRateLimiterForTests()
    app = createApp()

    vi.mocked(prisma.verificationCode.updateMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(prisma.verificationCode.create).mockResolvedValue({} as any)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  // ═══════════════════════════════════════
  // Fail-closed delivery resolution
  // ═══════════════════════════════════════
  describe('production fail-closed delivery', () => {
    it.each(['console', '', 'smoke-signals'])(
      'login returns 503 before storing any code when production OTP_DELIVERY_METHOD=%j',
      async (value) => {
        vi.stubEnv('NODE_ENV', 'production')
        vi.stubEnv('OTP_DELIVERY_METHOD', value)
        vi.mocked(verifyPassword).mockResolvedValue(ADMIN_USER as any)

        const res = await postJson(app, '/api/auth/login', {
          email: 'admin@example.com',
          password: 'correct-password',
        })

        expect(res.status).toBe(503)
        const body = await res.json()
        expect(body).toEqual({
          success: false,
          error: 'OTP delivery is not configured. Contact the site operator.',
        })
        // No code was invalidated or inserted
        expect(prisma.verificationCode.updateMany).not.toHaveBeenCalled()
        expect(prisma.verificationCode.create).not.toHaveBeenCalled()
      }
    )

    it('resend-code returns 503 before any lookup or insert in production console mode', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('OTP_DELIVERY_METHOD', 'console')

      const res = await postJson(app, '/api/auth/resend-code', { email: 'admin@example.com' })

      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body.error).toBe('OTP delivery is not configured. Contact the site operator.')
      expect(prisma.adminUser.findUnique).not.toHaveBeenCalled()
      expect(prisma.verificationCode.create).not.toHaveBeenCalled()
    })

    it('login keeps the existing 503 for OTP_DELIVERY_METHOD=disabled', async () => {
      vi.stubEnv('OTP_DELIVERY_METHOD', 'disabled')
      vi.mocked(verifyPassword).mockResolvedValue(ADMIN_USER as any)

      const res = await postJson(app, '/api/auth/login', {
        email: 'admin@example.com',
        password: 'correct-password',
      })

      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body.error).toContain('disabled')
      expect(prisma.verificationCode.create).not.toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════
  // Dev console delivery logs the digits
  // ═══════════════════════════════════════
  describe('dev console delivery', () => {
    it('logs the actual OTP digits on login in non-production console mode', async () => {
      vi.stubEnv('OTP_DELIVERY_METHOD', 'console')
      vi.mocked(verifyPassword).mockResolvedValue(ADMIN_USER as any)
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const res = await postJson(app, '/api/auth/login', {
        email: 'admin@example.com',
        password: 'correct-password',
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.requiresVerification).toBe(true)
      expect(prisma.verificationCode.create).toHaveBeenCalledTimes(1)

      const devLog = logSpy.mock.calls.find((call) =>
        String(call[0]).startsWith('[OTP][dev]')
      )
      expect(devLog).toBeDefined()
      expect(String(devLog![0])).toMatch(
        /^\[OTP\]\[dev\] Verification code for admin@example\.com: \d{6}$/
      )
    })
  })

  // ═══════════════════════════════════════
  // Rate limiting
  // ═══════════════════════════════════════
  describe('rate limiting', () => {
    it('login returns 429 with Retry-After after 10 attempts per IP in 15 min', async () => {
      vi.mocked(verifyPassword).mockResolvedValue(null as any)

      for (let i = 0; i < 10; i++) {
        const res = await postJson(app, '/api/auth/login', {
          email: 'admin@example.com',
          password: 'wrong',
        })
        expect(res.status).toBe(401)
      }

      const res = await postJson(app, '/api/auth/login', {
        email: 'admin@example.com',
        password: 'wrong',
      })
      expect(res.status).toBe(429)
      expect(res.headers.get('Retry-After')).toMatch(/^\d+$/)
      const body = await res.json()
      expect(body).toEqual({
        success: false,
        error: 'Too many attempts. Please try again later.',
      })
    })

    it('verify-code returns 429 after 15 attempts per IP in 15 min', async () => {
      vi.mocked(prisma.verificationCode.findFirst).mockResolvedValue(null)

      for (let i = 0; i < 15; i++) {
        const res = await postJson(app, '/api/auth/verify-code', {
          email: 'admin@example.com',
          code: '123456',
        })
        expect(res.status).toBe(401)
      }

      const res = await postJson(app, '/api/auth/verify-code', {
        email: 'admin@example.com',
        code: '123456',
      })
      expect(res.status).toBe(429)
      expect(res.headers.get('Retry-After')).toMatch(/^\d+$/)
    })

    it('resend-code returns 429 after 3 requests per IP+email in 10 min, but a different email is unaffected', async () => {
      vi.stubEnv('OTP_DELIVERY_METHOD', 'console')
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        ...ADMIN_USER,
        id: BigInt(1),
      } as any)

      for (let i = 0; i < 3; i++) {
        const res = await postJson(app, '/api/auth/resend-code', { email: 'admin@example.com' })
        expect(res.status).toBe(200)
      }

      const limited = await postJson(app, '/api/auth/resend-code', { email: 'admin@example.com' })
      expect(limited.status).toBe(429)
      expect(limited.headers.get('Retry-After')).toMatch(/^\d+$/)

      // Same IP, different email → separate bucket
      const other = await postJson(app, '/api/auth/resend-code', { email: 'other@example.com' })
      expect(other.status).toBe(200)
    })

    it('login rate limit is per-IP (different IP is unaffected)', async () => {
      vi.mocked(verifyPassword).mockResolvedValue(null as any)

      for (let i = 0; i < 10; i++) {
        await postJson(app, '/api/auth/login', { email: 'a@b.com', password: 'wrong' }, '203.0.113.5')
      }
      const limited = await postJson(app, '/api/auth/login', { email: 'a@b.com', password: 'wrong' }, '203.0.113.5')
      expect(limited.status).toBe(429)

      const otherIp = await postJson(app, '/api/auth/login', { email: 'a@b.com', password: 'wrong' }, '198.51.100.7')
      expect(otherIp.status).toBe(401)
    })
  })
})
