/**
 * Email Transport — Nodemailer SMTP wrapper.
 *
 * Reads SMTP configuration from environment variables.
 * Provides a singleton transporter instance.
 */

import "server-only"
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
    const host = process.env.SMTP_HOST
    const portString = process.env.SMTP_PORT || "587"
    const parsedPort = parseInt(portString, 10)

    if (isNaN(parsedPort) || !Number.isFinite(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      throw new Error(`Invalid SMTP port: ${portString} (parsed as ${parsedPort}). Port must be a finite integer between 1 and 65535.`);
    }

    // Use explicit secure if defined, otherwise infer from port 465
    const secure = process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : parsedPort === 465

    transporter = nodemailer.createTransport({
      host,
      port: parsedPort,
      secure,
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
  if (!process.env.SMTP_FROM_EMAIL && !process.env.SMTP_USER) {
    console.warn("⚠️  WARNING: Using default fallback 'noreply@example.com' for outgoing emails. This may cause delivery issues or mark emails as spam. Please set SMTP_FROM_EMAIL or SMTP_USER in your environment variables.")
  }
  return process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "noreply@example.com"
}
