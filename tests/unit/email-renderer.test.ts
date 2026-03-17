import { describe, it, expect } from 'vitest'
import { renderTemplate, extractVariables, validateVariables } from '@/src/lib/email/renderer'

describe('Email Template Renderer', () => {
  // ═══════════════════════════════════════
  // renderTemplate
  // ═══════════════════════════════════════
  describe('renderTemplate', () => {
    it('should replace single variable', () => {
      const result = renderTemplate('Hello {{name}}!', { name: 'John' })
      expect(result).toBe('Hello John!')
    })

    it('should replace multiple variables', () => {
      const result = renderTemplate(
        'Dear {{firstName}} {{lastName}}, welcome to {{platform}}.',
        { firstName: 'John', lastName: 'Doe', platform: 'DigitoPub' }
      )
      expect(result).toBe('Dear John Doe, welcome to DigitoPub.')
    })

    it('should replace same variable multiple times', () => {
      const result = renderTemplate(
        '{{name}} is great. {{name}} is fantastic.',
        { name: 'DigitoPub' }
      )
      expect(result).toBe('DigitoPub is great. DigitoPub is fantastic.')
    })

    it('should leave unreplaced variables as-is', () => {
      const result = renderTemplate('Hello {{name}}, your code is {{code}}', { name: 'John' })
      expect(result).toBe('Hello John, your code is {{code}}')
    })

    it('should handle empty variables object', () => {
      const result = renderTemplate('Hello {{name}}!', {})
      expect(result).toBe('Hello {{name}}!')
    })

    it('should handle template with no variables', () => {
      const result = renderTemplate('Hello World!', { name: 'John' })
      expect(result).toBe('Hello World!')
    })

    it('should handle empty template string', () => {
      const result = renderTemplate('', { name: 'John' })
      expect(result).toBe('')
    })

    it('should handle HTML content', () => {
      const result = renderTemplate(
        '<h1>Hello {{name}}</h1><p>Welcome to {{platform}}</p>',
        { name: 'John', platform: 'DigitoPub' }
      )
      expect(result).toBe('<h1>Hello John</h1><p>Welcome to DigitoPub</p>')
    })

    it('should only replace alphanumeric and underscore variables', () => {
      const result = renderTemplate('{{valid_var}} and {{invalid-var}}', { valid_var: 'works' })
      // {{invalid-var}} should not match the regex \w+ because hyphen is not \w
      expect(result).toBe('works and {{invalid-var}}')
    })
  })

  // ═══════════════════════════════════════
  // extractVariables
  // ═══════════════════════════════════════
  describe('extractVariables', () => {
    it('should extract single variable', () => {
      const result = extractVariables('Hello {{name}}!')
      expect(result).toEqual(['name'])
    })

    it('should extract multiple unique variables', () => {
      const result = extractVariables('{{firstName}} {{lastName}} from {{company}}')
      expect(result).toEqual(['firstName', 'lastName', 'company'])
    })

    it('should deduplicate repeated variables', () => {
      const result = extractVariables('{{name}} is {{name}}')
      expect(result).toEqual(['name'])
    })

    it('should return empty array for no variables', () => {
      const result = extractVariables('Hello World!')
      expect(result).toEqual([])
    })

    it('should return empty array for empty string', () => {
      const result = extractVariables('')
      expect(result).toEqual([])
    })

    it('should handle underscore variables', () => {
      const result = extractVariables('{{user_name}} and {{email_address}}')
      expect(result).toEqual(['user_name', 'email_address'])
    })
  })

  // ═══════════════════════════════════════
  // validateVariables
  // ═══════════════════════════════════════
  describe('validateVariables', () => {
    it('should return empty array when all variables provided', () => {
      const result = validateVariables(
        'Hello {{name}}, your email is {{email}}',
        { name: 'John', email: 'john@test.com' }
      )
      expect(result).toEqual([])
    })

    it('should return missing variables', () => {
      const result = validateVariables(
        'Hello {{name}}, your code is {{code}}',
        { name: 'John' }
      )
      expect(result).toEqual(['code'])
    })

    it('should return all variables when none provided', () => {
      const result = validateVariables(
        '{{firstName}} {{lastName}}',
        {}
      )
      expect(result).toEqual(['firstName', 'lastName'])
    })

    it('should return empty array for template with no variables', () => {
      const result = validateVariables('Hello World!', {})
      expect(result).toEqual([])
    })

    it('should ignore extra provided variables', () => {
      const result = validateVariables(
        'Hello {{name}}',
        { name: 'John', extra: 'value' }
      )
      expect(result).toEqual([])
    })
  })
})
