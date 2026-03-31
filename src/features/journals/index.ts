export { journalCreateSchema, journalUpdateSchema, journalIdParamSchema } from "./schemas/journal-schema"
export type { JournalCreate, JournalUpdate } from "./schemas/journal-schema"
export type { Journal, JournalResponse } from "./types/journal-type"
export { useCreateJournal } from "./api/use-create-journal"
export { useGetJournals } from "./api/use-get-journals"
export { useGetJournal } from "./api/use-get-journal"
export { useGetJournalStats } from "@/src/features/journals/api/use-get-journal-stats"
export { useJournalId } from "./hooks/use-journal-id"

// Journal Registration Multi-Step Wizard
export { 
  journalRegistrationPayloadSchema,
  JOURNAL_REGISTRATION_STEPS
} from "./schemas/journal-registration-schemas"

export type { JournalRegistrationPayload } from "./schemas/journal-registration-schemas"
export { useJournalRegistrationStore } from "./stores/journal-registration-store"
export { JournalRegistrationWizard } from "./components/register/journal-registration-wizard"
