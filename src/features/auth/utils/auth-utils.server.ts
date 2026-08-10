import crypto from "node:crypto"

export type OtpDeliveryMethod = "console" | "email" | "disabled"

/**
 * Thrown when OTP delivery cannot be safely resolved in production.
 * In production, "console" delivery is a dead end (codes are never actually
 * shown to anyone), so console/unset/invalid configurations fail closed
 * instead of silently generating undeliverable codes.
 */
export class OtpDeliveryUnconfiguredError extends Error {
  constructor(message = "OTP delivery is not configured for production") {
    super(message)
    this.name = "OtpDeliveryUnconfiguredError"
  }
}

/**
 * Resolve the effective OTP delivery configuration from OTP_DELIVERY_METHOD.
 *
 * - "email"    → { method: "email" }
 * - "disabled" → { method: "disabled" } (callers keep their existing 503 path)
 * - "console" / unset / invalid:
 *     - production: THROWS OtpDeliveryUnconfiguredError (fail closed — console
 *       delivery is useless in production and unset/invalid must not silently
 *       fall back to it)
 *     - non-production: { method: "console" } (dev convenience)
 *
 * Callers MUST resolve delivery BEFORE generating or persisting a code.
 */
export function resolveOtpDelivery():
  | { method: "email" }
  | { method: "console" }
  | { method: "disabled" } {
  const raw = process.env.OTP_DELIVERY_METHOD

  if (raw === "email") return { method: "email" }
  if (raw === "disabled") return { method: "disabled" }

  // "console", unset, or invalid value
  if (process.env.NODE_ENV === "production") {
    throw new OtpDeliveryUnconfiguredError(
      raw === "console"
        ? 'OTP_DELIVERY_METHOD "console" is not allowed in production'
        : raw
          ? `Invalid OTP_DELIVERY_METHOD "${raw}" in production`
          : "OTP_DELIVERY_METHOD is unset in production"
    )
  }

  if (raw && raw !== "console") {
    console.warn(`[Auth] Invalid OTP_DELIVERY_METHOD "${raw}". Defaulting to "console".`)
  }

  return { method: "console" }
}

/**
 * Dev-only console delivery: logs the actual OTP digits so local sign-in is
 * possible without SMTP. Never emits digits in production (resolveOtpDelivery
 * already refuses console mode there; this guard is defense in depth).
 */
export function deliverOtpToConsole(email: string, code: string): void {
  if (process.env.NODE_ENV === "production") return
  console.log(`[OTP][dev] Verification code for ${email}: ${code}`)
}

/**
 * Generate a 6-digit OTP code using cryptographically secure random numbers
 */
export function generateOTPCode(): string {
  // crypto.randomInt upper bound is exclusive, so 1000000 includes 999999
  return crypto.randomInt(100000, 1000000).toString()
}
