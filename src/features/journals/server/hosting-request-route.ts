import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { prisma } from "@/src/lib/db/config"
import { checkRateLimit } from "@/src/lib/rate-limiter"
import { JOURNAL_HOSTING_RATE_LIMIT } from "@/src/lib/rate-limiter-configs"
import { clientIpFromHeaders } from "@/src/lib/ip-hash"

/**
 * Hotfix A5 — POST /journals/register
 *
 * The public journal-hosting wizard (src/features/journals/components/register)
 * posts `client.journals.register.$post` with the combined wizard payload
 * (journalRegistrationPayloadSchema). This endpoint previously did not exist,
 * so submissions failed with "Resource not found".
 *
 * Minimal implementation: validate leniently (required contact + title,
 * extra wizard fields passed through), rate limit, persist the request as a
 * Message row for the admin inbox, and best-effort notify via email.
 */

// Lenient: only the fields we truly need are required; everything else the
// wizard sends is carried through into the persisted request body.
export const journalHostingRequestSchema = z.looseObject({
  publisherName: z.string().min(1, "Publisher name is required").max(255),
  contactEmail: z.email("A valid contact email is required"),
  title: z.string().min(1, "Journal title is required").max(255),
})

/** Render the full payload as readable key/value lines for the Message body. */
function formatRequestBody(payload: Record<string, unknown>): string {
  return Object.entries(payload)
    .map(([key, value]) => {
      const rendered =
        value === null || value === undefined
          ? ""
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value)
      return `${key}: ${rendered}`
    })
    .join("\n")
}

const app = new Hono()

app.post("/register", zValidator("json", journalHostingRequestSchema), async (c) => {
  try {
    const rate = checkRateLimit(clientIpFromHeaders(c.req.raw.headers), JOURNAL_HOSTING_RATE_LIMIT)
    if (!rate.allowed) {
      c.res.headers.set("Retry-After", String(rate.retryAfter))
      return c.json({ success: false, error: "Too many requests. Please try again later." }, 429)
    }

    const payload = c.req.valid("json")
    const subject = `Journal hosting request: ${payload.title}`.slice(0, 255)
    const body = formatRequestBody(payload)

    await prisma.message.create({
      data: {
        name: payload.publisherName,
        email: payload.contactEmail,
        subject,
        message: body,
        message_type: "journal_hosting",
        // status defaults to "unread"
      },
    })

    // Best-effort operator notification — never fails the request.
    // Lazy import: the email service transitively imports "server-only" and
    // nodemailer; loading it only when actually sending keeps the journals
    // router importable outside a server-component context (e.g. tests).
    const notifyTo = process.env.SMTP_FROM_EMAIL
    if (notifyTo) {
      void import("@/src/lib/email/service")
        .then(({ sendEmail }) =>
          sendEmail({
            to: notifyTo,
            subject,
            html: `<pre style="font-family:monospace;white-space:pre-wrap">${body
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}</pre>`,
            text: body,
          })
        )
        .then((result) => {
          if (!result.success) {
            console.warn(`[JOURNAL_HOSTING] Notification email failed: ${result.error}`)
          }
        })
        .catch((error) => {
          console.warn("[JOURNAL_HOSTING] Notification email failed:", error)
        })
    }

    return c.json({ success: true, message: "Request received. Our team will contact you." }, 201)
  } catch (error) {
    console.error("Error handling journal hosting request:", error)
    return c.json({ success: false, error: "Failed to submit request. Please try again." }, 500)
  }
})

export { app as hostingRequestRouter }
