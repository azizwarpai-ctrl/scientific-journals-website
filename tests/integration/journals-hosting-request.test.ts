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

vi.mock('@/src/lib/email/service', () => ({
  sendEmail: vi.fn(),
}))

vi.mock('@/src/lib/db/config', () => ({
  prisma: {
    journal: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    message: {
      create: vi.fn(),
    },
  },
}))

import { Hono } from 'hono'
import { journalRouter } from '@/src/features/journals/server/route'
import { prisma } from '@/src/lib/db/config'
import { sendEmail } from '@/src/lib/email/service'
import { __resetRateLimiterForTests } from '@/src/lib/rate-limiter'

// A realistic wizard payload (journalRegistrationPayloadSchema shape)
const VALID_PAYLOAD = {
  publisherName: 'Acme Scientific Press',
  institution: 'Acme University',
  country: 'Libya',
  publisherAddress: '1 Research Way, Tripoli',
  contactEmail: 'publisher@example.com',
  website: 'https://acme.example.com',
  title: 'Journal of Modern Engineering',
  abbreviation: 'JME',
  printIssn: '1234-5678',
  onlineIssn: '8765-4321',
  discipline: 'Engineering',
  description: 'A peer-reviewed journal covering all aspects of modern engineering research and practice.',
  editorInChief: 'Dr. Jane Doe',
  editorEmail: 'editor@example.com',
  editorialBoardContact: 'board@example.com',
  editorialAddress: '2 Editorial Street, Tripoli',
  frequency: 'Quarterly',
  language: 'English',
  peerReviewPolicy: 'Double-blind',
  openAccessPolicy: 'Gold',
  publicationFee: 250,
  requestedUrlPath: 'jme',
  customDomain: '',
  ethicsConfirmation: true,
  copyrightAcceptance: true,
  platformPolicy: true,
}

function createApp() {
  const app = new Hono().basePath('/api')
  app.route('/journals', journalRouter)
  return app
}

function postRegister(app: ReturnType<typeof createApp>, body: unknown, ip = '203.0.113.9') {
  return app.request('/api/journals/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /journals/register — hosting request (hotfix A5)', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    __resetRateLimiterForTests()
    app = createApp()

    vi.mocked(prisma.message.create).mockResolvedValue({ id: BigInt(1) } as any)
    vi.mocked(sendEmail).mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('accepts a valid wizard payload, persists a Message row, and returns success', async () => {
    const res = await postRegister(app, VALID_PAYLOAD)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual({
      success: true,
      message: 'Request received. Our team will contact you.',
    })

    expect(prisma.message.create).toHaveBeenCalledTimes(1)
    const createArg = vi.mocked(prisma.message.create).mock.calls[0][0]
    expect(createArg.data).toMatchObject({
      name: 'Acme Scientific Press',
      email: 'publisher@example.com',
      subject: 'Journal hosting request: Journal of Modern Engineering',
      message_type: 'journal_hosting',
    })
    // Passthrough extras are carried into the persisted body
    expect(createArg.data.message).toContain('discipline: Engineering')
    expect(createArg.data.message).toContain('requestedUrlPath: jme')
  })

  it('rejects an invalid payload (missing contactEmail) with 400 and does not persist', async () => {
    const { contactEmail: _omitted, ...invalid } = VALID_PAYLOAD

    const res = await postRegister(app, invalid)

    expect(res.status).toBe(400)
    expect(prisma.message.create).not.toHaveBeenCalled()
  })

  it('rejects an empty journal title with 400', async () => {
    const res = await postRegister(app, { ...VALID_PAYLOAD, title: '' })

    expect(res.status).toBe(400)
    expect(prisma.message.create).not.toHaveBeenCalled()
  })

  it('rate limits after 3 requests per IP in 15 min with Retry-After', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await postRegister(app, VALID_PAYLOAD)
      expect(res.status).toBe(201)
    }

    const limited = await postRegister(app, VALID_PAYLOAD)
    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toMatch(/^\d+$/)
    const body = await limited.json()
    expect(body).toEqual({
      success: false,
      error: 'Too many requests. Please try again later.',
    })
    expect(prisma.message.create).toHaveBeenCalledTimes(3)
  })

  it('does not attempt email when SMTP_FROM_EMAIL is unset', async () => {
    vi.stubEnv('SMTP_FROM_EMAIL', '')

    const res = await postRegister(app, VALID_PAYLOAD)

    expect(res.status).toBe(201)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('never fails the request when the notification email fails', async () => {
    vi.stubEnv('SMTP_FROM_EMAIL', 'ops@example.com')
    vi.mocked(sendEmail).mockRejectedValue(new Error('SMTP down'))

    const res = await postRegister(app, VALID_PAYLOAD)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)

    // The notification is fire-and-forget behind a dynamic import — let it
    // settle before asserting (and so the rejection cannot leak into other tests)
    await vi.waitFor(() => expect(sendEmail).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setImmediate(resolve))
  })

  it('returns 500 when persistence fails', async () => {
    vi.mocked(prisma.message.create).mockRejectedValue(new Error('DB down'))

    const res = await postRegister(app, VALID_PAYLOAD)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})
