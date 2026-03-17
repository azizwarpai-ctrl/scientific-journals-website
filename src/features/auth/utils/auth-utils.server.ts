import crypto from "node:crypto"

/**
 * Get OTP delivery method based on environment
 */
export const getOtpDeliveryMethod = () => {
  const allowed = ["console", "email", "disabled"]
  const val = process.env.OTP_DELIVERY_METHOD
  
  if (val && allowed.includes(val)) {
    return val as "console" | "email" | "disabled"
  }
  
  if (val) {
    console.warn(`[Auth] Invalid OTP_DELIVERY_METHOD "${val}". Defaulting to "console".`)
  }
  
  // Always default to 'console' if no email system is wired up yet, so registration isn't blocked in production
  return "console"
}

/**
 * Generate a 6-digit OTP code using cryptographically secure random numbers
 */
export function generateOTPCode(): string {
  // crypto.randomInt upper bound is exclusive, so 1000000 includes 999999
  return crypto.randomInt(100000, 1000000).toString()
}
