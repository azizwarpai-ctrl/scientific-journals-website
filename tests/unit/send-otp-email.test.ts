import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as emailService from '@/src/lib/email/service'

vi.mock('@/src/lib/email/service', () => ({
  sendEmail: vi.fn(),
}))

// Import after mock is declared so the module picks up the mock
import { sendOtpEmail } from '@/src/features/auth/server/send-otp-email'

describe('sendOtpEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls sendEmail with correct to, subject, and code in body', async () => {
    vi.mocked(emailService.sendEmail).mockResolvedValue({ success: true })

    const result = await sendOtpEmail('admin@example.com', '482901')

    expect(result).toEqual({ success: true })
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1)

    const call = vi.mocked(emailService.sendEmail).mock.calls[0][0]
    expect(call.to).toBe('admin@example.com')
    expect(call.subject).toBe('Your DigitoPub verification code')
    expect(call.html).toContain('482901')
    expect(call.text).toContain('482901')
    expect(call.text).toContain('5 minutes')
  })

  it('propagates SMTP-not-configured failure', async () => {
    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: false,
      error: 'SMTP not configured',
    })

    const result = await sendOtpEmail('user@example.com', '123456')

    expect(result).toEqual({ success: false, error: 'SMTP not configured' })
  })

  it('propagates transport send error', async () => {
    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: false,
      error: 'Connection refused',
    })

    const result = await sendOtpEmail('user@example.com', '654321')

    expect(result).toEqual({ success: false, error: 'Connection refused' })
  })
})
