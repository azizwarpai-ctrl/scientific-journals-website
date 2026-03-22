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
    if (record === null || record === undefined) return record as unknown as Serialized<T>

    if (typeof record === "bigint") {
        return record.toString() as unknown as Serialized<T>
    }

    if (Array.isArray(record)) {
        return record.map(serializeRecord) as unknown as Serialized<T>
    }

    if (record instanceof Date) {
        return record as unknown as Serialized<T>
    }

    // Handle Prisma Decimal type (has toNumber method)
    if (
        typeof record === "object" &&
        record !== null &&
        "toNumber" in record &&
        typeof (record as { toNumber?: unknown }).toNumber === "function"
    ) {
        return (record as { toNumber: () => number }).toNumber() as unknown as Serialized<T>
    }

    if (typeof record === "object" && record !== null) {
        const serialized: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
            serialized[key] = serializeRecord(value)
        }
        return serialized as unknown as Serialized<T>
    }

    return record as unknown as Serialized<T>
}

/**
 * Serialize an array of records.
 */
export function serializeMany<T>(records: T[]): Serialized<T>[] {
    return records.map(serializeRecord)
}
