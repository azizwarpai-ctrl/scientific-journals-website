import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  resolveOtpDelivery,
  deliverOtpToConsole,
  OtpDeliveryUnconfiguredError,
} from '@/src/features/auth/utils/auth-utils.server'

describe('resolveOtpDelivery', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns email when OTP_DELIVERY_METHOD=email', () => {
    vi.stubEnv('OTP_DELIVERY_METHOD', 'email')
    expect(resolveOtpDelivery()).toEqual({ method: 'email' })
  })

  it('returns disabled when OTP_DELIVERY_METHOD=disabled', () => {
    vi.stubEnv('OTP_DELIVERY_METHOD', 'disabled')
    expect(resolveOtpDelivery()).toEqual({ method: 'disabled' })
  })

  it('returns console in non-production when OTP_DELIVERY_METHOD=console', () => {
    vi.stubEnv('OTP_DELIVERY_METHOD', 'console')
    expect(resolveOtpDelivery()).toEqual({ method: 'console' })
  })

  it('falls back to console in non-production when unset', () => {
    vi.stubEnv('OTP_DELIVERY_METHOD', '')
    expect(resolveOtpDelivery()).toEqual({ method: 'console' })
  })

  it('warns and falls back to console in non-production on invalid value', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('OTP_DELIVERY_METHOD', 'smoke-signals')
    expect(resolveOtpDelivery()).toEqual({ method: 'console' })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('smoke-signals'))
  })

  it.each(['console', '', 'smoke-signals'])(
    'throws OtpDeliveryUnconfiguredError in production for %j',
    (value) => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('OTP_DELIVERY_METHOD', value)
      expect(() => resolveOtpDelivery()).toThrow(OtpDeliveryUnconfiguredError)
    }
  )

  it('still allows email and disabled in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('OTP_DELIVERY_METHOD', 'email')
    expect(resolveOtpDelivery()).toEqual({ method: 'email' })
    vi.stubEnv('OTP_DELIVERY_METHOD', 'disabled')
    expect(resolveOtpDelivery()).toEqual({ method: 'disabled' })
  })
})

describe('deliverOtpToConsole', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('logs the actual digits in non-production', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    deliverOtpToConsole('admin@example.com', '482901')
    expect(logSpy).toHaveBeenCalledWith(
      '[OTP][dev] Verification code for admin@example.com: 482901'
    )
  })

  it('never logs digits in production (defense in depth)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    deliverOtpToConsole('admin@example.com', '482901')
    expect(logSpy).not.toHaveBeenCalled()
  })
})
