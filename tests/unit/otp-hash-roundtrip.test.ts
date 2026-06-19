import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import { generateOTPCode } from '@/src/features/auth/utils/auth-utils.server'

describe('OTP bcrypt hash round-trip', () => {
  it('bcrypt hash of a 6-digit OTP fits within VARCHAR(72)', async () => {
    const code = generateOTPCode()
    const hash = await bcrypt.hash(code, 10)

    expect(code).toHaveLength(6)
    expect(hash.length).toBeLessThanOrEqual(72)
    expect(hash.length).toBe(60)
  })

  it('bcrypt.compare succeeds against the full (non-truncated) hash', async () => {
    const code = generateOTPCode()
    const hash = await bcrypt.hash(code, 10)

    const result = await bcrypt.compare(code, hash)
    expect(result).toBe(true)
  })

  it('bcrypt.compare fails against a VARCHAR(10)-truncated hash', async () => {
    const code = generateOTPCode()
    const hash = await bcrypt.hash(code, 10)
    const truncated = hash.substring(0, 10)

    const result = await bcrypt.compare(code, truncated)
    expect(result).toBe(false)
  })
})
