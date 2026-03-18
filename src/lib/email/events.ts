/**
 * Email Event Catalogue
 * 
 * Defines all system events that can trigger an email, and the exact data payload
 * each event carries. These payloads map directly to template {{variables}}.
 * 
 * Strict architectural rule: This system is purely reactive. It receives these
 * payloads from upstream processes (like OJS webhooks or portal forms) and 
 * has no authority over the raw data.
 */

export type EmailEvent =
  | {
      type: "registration_confirmation"
      payload: {
        author_name: string
        email: string
        journal_title: string
      }
    }
  | {
      type: "submission_received"
      payload: {
        author_name: string
        email: string
        submission_id: string
        journal_title: string
        submission_date: string
      }
    }
  | {
      type: "review_requested"
      payload: {
        reviewer_name: string
        email: string
        submission_id: string
        journal_title: string
        due_date: string
      }
    }
  | {
      type: "submission_accepted"
      payload: {
        author_name: string
        email: string
        submission_id: string
        journal_title: string
      }
    }
  | {
      type: "submission_rejected"
      payload: {
        author_name: string
        email: string
        submission_id: string
        journal_title: string
        reason?: string
      }
    }

export type EmailEventType = EmailEvent["type"]
