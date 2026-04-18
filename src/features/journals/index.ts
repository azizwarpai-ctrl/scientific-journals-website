export { journalCreateSchema, journalUpdateSchema, journalIdParamSchema } from "./schemas/journal-schema"
export type { JournalCreate, JournalUpdate } from "./schemas/journal-schema"
export type { Journal, JournalResponse } from "./types/journal-type"
export { useCreateJournal } from "./api/use-create-journal"
export { useGetJournals } from "./api/use-get-journals"
export { useGetJournal } from "./api/use-get-journal"
export { useGetJournalStats } from "@/src/features/journals/api/use-get-journal-stats"
export { useGetCurrentIssue } from "@/src/features/journals/api/use-get-current-issue"
export { useGetArchiveIssues } from "@/src/features/journals/api/use-get-archive-issues"
export { useGetIssueDetail } from "@/src/features/journals/api/use-get-issue-detail"
export type { CurrentIssue, CurrentIssueArticle, CurrentIssueAuthor } from "@/src/features/journals/types/current-issue-types"
export type { ArchiveIssue, IssueDetail } from "@/src/features/journals/types/archive-issue-types"
export type { ArticleDetail, ArticleDetailAuthor, ArticleGalley } from "@/src/features/journals/types/article-detail-types"
export { useJournalId } from "./hooks/use-journal-id"
export { useGetArticleDetail } from "./api/use-get-article-detail"
export { useGetEditorialBoard } from "./api/use-get-editorial-board"
export { useGetCustomBlocks } from "./api/use-get-custom-blocks"
export { useGetJournalFees } from "./api/use-get-journal-fees"
// Journal Registration Multi-Step Wizard
export { 
  journalRegistrationPayloadSchema,
  JOURNAL_REGISTRATION_STEPS
} from "./schemas/journal-registration-schemas"

export type { JournalRegistrationPayload } from "./schemas/journal-registration-schemas"
export { useJournalRegistrationStore } from "./stores/journal-registration-store"
export { JournalRegistrationWizard } from "./components/register/journal-registration-wizard"
