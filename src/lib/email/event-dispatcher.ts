/**
 * Email Event Dispatcher
 * 
 * Maps system events to email templates and dispatches them via the Email Service.
 * Designed to be fire-and-forget: it logs failures but does not throw errors that
 * would interrupt the upstream process (e.g. registration or submission).
 */

import { sendTemplateEmail } from "./service"
import type { EmailEvent } from "./events"

/**
 * Maps event types to the expected slug/name of the `EmailTemplate` in the database.
 */
const EVENT_TEMPLATE_MAP: Record<EmailEvent["type"], string> = {
  registration_confirmation: "registration_confirmation",
  submission_received: "submission_received",
  review_requested: "review_requested",
  submission_accepted: "submission_accepted",
  submission_rejected: "submission_rejected",
}

/**
 * Dispatches an email event.
 * Converts the event payload into template variables and calls the email service.
 * Never throws an error; returns a boolean indicating success.
 */
export async function dispatchEmailEvent(event: EmailEvent): Promise<boolean> {
  const templateName = EVENT_TEMPLATE_MAP[event.type]
  
  if (!templateName) {
    console.warn(`[EMAIL DISPATCHER] Unknown event type: ${event.type}`)
    return false
  }

  const { email, ...restPayload } = event.payload

  // Convert all payload values to strings for the Mustache renderer
  const variables: Record<string, string> = { email: String(email ?? "") }
  for (const [key, value] of Object.entries(restPayload)) {
    variables[key] = value !== undefined && value !== null ? String(value) : ""
  }

  try {
    const result = await sendTemplateEmail({
      templateName,
      to: email,
      variables,
    })

    if (!result.success) {
      console.warn(`[EMAIL DISPATCHER] Failed to send ${event.type} email: ${result.error}`)
    }

    return result.success
  } catch (error) {
    console.error(`[EMAIL DISPATCHER] Uncaught error handling ${event.type}:`, error)
    return false
  }
}
