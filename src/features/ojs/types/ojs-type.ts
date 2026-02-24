export interface OjsJournal {
    journal_id: number
    path: string
    primary_locale: string
    enabled: boolean
    name: string | null
    description: string | null
}

export interface OjsJournalsResponse {
    success: boolean
    data?: OjsJournal[]
    configured: boolean
    error?: string
}
