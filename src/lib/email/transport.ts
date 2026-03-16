/**
 * Email Transport — Nodemailer SMTP wrapper.
 *
 * Reads SMTP configuration from environment variables.
 * Provides a singleton transporter instance.
 */

import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"

let transporter: Transporter | null = null

/**
 * Check whether SMTP is configured via environment variables.
 */
export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
}

/**
 * Get or create the Nodemailer transporter singleton.
 * Returns null if SMTP is not configured.
 */
export function getTransporter(): Transporter | null {
  if (!isSmtpConfigured()) {
    return null
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  }

  return transporter
}

/**
 * Get the configured "from" address for outgoing emails.
 */
export function getFromAddress(): string {
  return process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "noreply@example.com"
}
