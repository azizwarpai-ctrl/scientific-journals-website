import type { OjsJournal } from "../schemas/ojs-schema"
export type { OjsJournal }

export interface OjsJournalsResponse {
    success: boolean
    data?: OjsJournal[]
    configured: boolean
    error?: string
}
