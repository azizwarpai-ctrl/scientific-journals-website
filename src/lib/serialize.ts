/**
 * Centralized BigInt serialization for Prisma models.
 * Converts BigInt fields to strings for JSON compatibility.
 */

/**
 * Type helper to convert BigInt fields to strings recursively.
 */
export type Serialized<T> = T extends bigint
    ? string
    : T extends Array<infer U>
    ? Array<Serialized<U>>
    : T extends object
    ? { [K in keyof T]: Serialized<T[K]> }
    : T

/**
 * Serialize a single record, converting all BigInt values to strings.
 */
export function serializeRecord<T>(record: T): Serialized<T> {
    if (record === null || record === undefined) return record as any

    if (typeof record === "bigint") {
        return record.toString() as any
    }

    if (Array.isArray(record)) {
        return record.map(serializeRecord) as any
    }

    if (typeof record === "object") {
        const serialized: any = {}
        for (const [key, value] of Object.entries(record)) {
            serialized[key] = serializeRecord(value)
        }
        return serialized
    }

    return record as any
}

/**
 * Serialize an array of records.
 */
export function serializeMany<T>(records: T[]): Serialized<T>[] {
    return records.map(serializeRecord)
}
