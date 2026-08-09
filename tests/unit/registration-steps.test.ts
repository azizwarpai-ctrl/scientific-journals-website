import { describe, it, expect } from 'vitest'
import {
    REGISTRATION_STEPS,
    journalSelectionSchema,
} from '@/src/features/auth/schemas/registration-schemas'

describe('REGISTRATION_STEPS', () => {
    it('has 6 steps with the journal-picker step at index 0', () => {
        expect(REGISTRATION_STEPS).toHaveLength(6)
        expect(REGISTRATION_STEPS[0].id).toBe('journal')
        expect(REGISTRATION_STEPS[0].label).toBe('Select Journal')
        expect(REGISTRATION_STEPS[0].schema).toBe(journalSelectionSchema)
    })

    it('keeps the original steps in order after the journal step', () => {
        expect(REGISTRATION_STEPS.map((s) => s.id)).toEqual([
            'journal',
            'personal',
            'academic',
            'role',
            'policies',
            'review',
        ])
    })

    it('every step exposes { id, label, schema }', () => {
        for (const step of REGISTRATION_STEPS) {
            expect(step.id).toBeTruthy()
            expect(step.label).toBeTruthy()
            expect('schema' in step).toBe(true)
        }
    })

    it('journalSelectionSchema rejects an empty journalPath', () => {
        expect(journalSelectionSchema.safeParse({ journalPath: '' }).success).toBe(false)
        expect(journalSelectionSchema.safeParse({ journalPath: 'myjournal' }).success).toBe(true)
    })
})
