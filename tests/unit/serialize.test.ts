import { describe, it, expect } from 'vitest'
import { serializeRecord, serializeMany } from '@/src/lib/serialize'

describe('Serialize Utilities', () => {
    describe('serializeRecord', () => {
        it('should convert BigInt fields to strings', () => {
            const record = { id: BigInt(123), name: 'Test' }
            const result = serializeRecord(record)
            expect(result.id).toBe('123')
            expect(typeof result.id).toBe('string')
        })

        it('should preserve non-BigInt fields', () => {
            const record = { id: BigInt(1), name: 'Test', count: 42, active: true }
            const result = serializeRecord(record)
            expect(result.name).toBe('Test')
            expect(result.count).toBe(42)
            expect(result.active).toBe(true)
        })

        it('should handle null values', () => {
            const record = { id: BigInt(1), description: null }
            const result = serializeRecord(record)
            expect(result.description).toBeNull()
        })

        it('should handle nested objects', () => {
            const record = { id: BigInt(1), nested: { inner_id: BigInt(2), value: 'x' } }
            const result = serializeRecord(record)
            expect(result.nested.inner_id).toBe('2')
            expect(result.nested.value).toBe('x')
        })

        it('should preserve Date objects', () => {
            const date = new Date('2026-01-01')
            const record = { id: BigInt(1), created_at: date }
            const result = serializeRecord(record)
            expect(result.created_at).toEqual(date)
        })

        it('should handle zero BigInt', () => {
            const record = { id: BigInt(0) }
            const result = serializeRecord(record)
            expect(result.id).toBe('0')
        })

        it('should handle large BigInt', () => {
            const record = { id: BigInt('9007199254740993') }
            const result = serializeRecord(record)
            expect(result.id).toBe('9007199254740993')
        })

        it('should handle arrays correctly (not recurse into them)', () => {
            const record = { id: BigInt(1), tags: ['a', 'b', 'c'] }
            const result = serializeRecord(record)
            expect(result.tags).toEqual(['a', 'b', 'c'])
        })
    })

    describe('serializeMany', () => {
        it('should serialize an array of records', () => {
            const records = [
                { id: BigInt(1), name: 'First' },
                { id: BigInt(2), name: 'Second' },
            ]
            const result = serializeMany(records)
            expect(result).toHaveLength(2)
            expect(result[0].id).toBe('1')
            expect(result[1].id).toBe('2')
        })

        it('should return empty array for empty input', () => {
            const result = serializeMany([])
            expect(result).toEqual([])
        })

        it('should not mutate original records', () => {
            const original = { id: BigInt(1), name: 'Test' }
            const records = [original]
            serializeMany(records)
            expect(typeof original.id).toBe('bigint')
        })
    })
})
