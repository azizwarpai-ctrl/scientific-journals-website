import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dispatchEmailEvent } from '@/src/lib/email/event-dispatcher'
import * as emailService from '@/src/lib/email/service'
import type { EmailEvent } from '@/src/lib/email/events'

// Mock the email service
vi.mock('@/src/lib/email/service', () => ({
  sendTemplateEmail: vi.fn(),
}))

describe('Email Event Dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console outputs during tests to keep logs clean
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should dispatch registration_confirmation event correctly', async () => {
    // Setup mock success
    vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({ success: true })

    const event: EmailEvent = {
      type: 'registration_confirmation',
      payload: {
        email: 'test@example.com',
        author_name: 'John Doe',
        journal_title: 'Test Journal',
      },
    }

    const result = await dispatchEmailEvent(event)

    expect(result).toBe(true)
    expect(emailService.sendTemplateEmail).toHaveBeenCalledTimes(1)
    expect(emailService.sendTemplateEmail).toHaveBeenCalledWith({
      templateName: 'registration_confirmation',
      to: 'test@example.com',
      variables: {
        email: 'test@example.com',
        author_name: 'John Doe',
        journal_title: 'Test Journal',
      },
    })
  })

  it('should ignore unknown event types gracefully', async () => {
    // @ts-expect-error Testing invalid runtime input
    const event: EmailEvent = {
      type: 'unknown_event_type',
      payload: { email: 'test@example.com' },
    }

    const result = await dispatchEmailEvent(event)

    expect(result).toBe(false)
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown event type'))
    expect(emailService.sendTemplateEmail).not.toHaveBeenCalled()
  })

  it('should return false but not throw if sendTemplateEmail fails', async () => {
    vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({ 
      success: false, 
      error: 'SMTP not configured' 
    })

    const event: EmailEvent = {
      type: 'submission_accepted',
      payload: {
        email: 'author@example.com',
        author_name: 'Jane Doe',
        submission_id: 'SUB-123',
        journal_title: 'Science Journal',
      },
    }

    const result = await dispatchEmailEvent(event)

    expect(result).toBe(false)
    expect(emailService.sendTemplateEmail).toHaveBeenCalledTimes(1)
    expect(emailService.sendTemplateEmail).toHaveBeenCalledWith({
      templateName: 'submission_accepted',
      to: 'author@example.com',
      variables: {
        email: 'author@example.com',
        author_name: 'Jane Doe',
        submission_id: 'SUB-123',
        journal_title: 'Science Journal',
      },
    })
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to send submission_accepted'))
  })

  it('should catch unhandled exceptions to remain fire-and-forget safe', async () => {
    vi.mocked(emailService.sendTemplateEmail).mockRejectedValue(new Error('Network crash'))

    const event: EmailEvent = {
      type: 'submission_received',
      payload: {
        email: 'author@test.com',
        author_name: 'Bob',
        submission_id: '404',
        journal_title: 'History Review',
        submission_date: '2025-01-01',
      },
    }

    // Should not throw
    const result = await dispatchEmailEvent(event)

    expect(result).toBe(false)
    expect(emailService.sendTemplateEmail).toHaveBeenCalledTimes(1)
    expect(emailService.sendTemplateEmail).toHaveBeenCalledWith({
      templateName: 'submission_received',
      to: 'author@test.com',
      variables: {
        email: 'author@test.com',
        author_name: 'Bob',
        submission_id: '404',
        journal_title: 'History Review',
        submission_date: '2025-01-01',
      },
    })
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Uncaught error handling submission_received'), expect.any(Error))
  })

  it('should handle undefined values in payload by converting to empty string', async () => {
    vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({ success: true })

    const event: EmailEvent = {
      type: 'submission_rejected',
      payload: {
        email: 'test@example.com',
        author_name: 'John',
        submission_id: '123',
        journal_title: 'Journal',
        reason: undefined, // Optional field
      },
    }

    await dispatchEmailEvent(event)

    expect(emailService.sendTemplateEmail).toHaveBeenCalledWith({
      templateName: 'submission_rejected',
      to: 'test@example.com',
      variables: {
        email: 'test@example.com',
        author_name: 'John',
        submission_id: '123',
        journal_title: 'Journal',
        reason: '',
      },
    })
  })
})
