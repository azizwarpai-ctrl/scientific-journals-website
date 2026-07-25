import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Eye, FileText } from "lucide-react"
import Link from "next/link"
import type { SubmissionSummary } from "../types"

interface ReviewsListProps {
    submissions: SubmissionSummary[]
}

function stageBadgeClass(stageId: number): string {
    switch (stageId) {
        case 1:
            return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200"
        case 2:
        case 3:
            return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200"
        case 4:
            return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200"
        case 5:
            return "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200"
        default:
            return "bg-muted text-muted-foreground"
    }
}

function statusBadgeClass(status: number): string {
    switch (status) {
        case 1:
            return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200"
        case 3:
            return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200"
        case 4:
            return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200"
        case 5:
            return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200"
        default:
            return "bg-muted text-muted-foreground"
    }
}

/** OJS-backed submission rows with stage/status badges and "Open in OJS" deep links. */
export function ReviewsList({ submissions }: ReviewsListProps) {
    if (!submissions || submissions.length === 0) {
        return (
            <Card>
                <CardContent className="p-0">
                    <div className="py-12 text-center">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No submissions found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Try adjusting your filters, or check back once submissions enter review
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent className="p-0">
                <div className="divide-y">
                    {submissions.map((submission, i) => (
                        <div
                            key={submission.submissionId}
                            className="p-4 hover:bg-muted/50 transition-colors duration-200 ease-out animate-in fade-in"
                            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <div>
                                        <Link
                                            href={`/admin/submissions/${submission.submissionId}`}
                                            className="font-semibold line-clamp-1 hover:underline"
                                        >
                                            {submission.title}
                                        </Link>
                                        <p className="text-sm text-muted-foreground">
                                            {submission.journalTitle} • #{submission.submissionId}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                        {submission.currentRound !== null && (
                                            <span>
                                                Round {submission.currentRound}:{" "}
                                                <span className="font-medium text-foreground">
                                                    {submission.reviewsCompleted}
                                                </span>{" "}
                                                completed,{" "}
                                                <span className="font-medium text-foreground">
                                                    {submission.reviewsPending}
                                                </span>{" "}
                                                pending
                                            </span>
                                        )}
                                        {submission.dateSubmitted && (
                                            <span>
                                                Submitted: {new Date(submission.dateSubmitted).toLocaleDateString()}
                                            </span>
                                        )}
                                        {submission.dateLastActivity && (
                                            <span>
                                                Last activity: {new Date(submission.dateLastActivity).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className={stageBadgeClass(submission.stageId)}>
                                            {submission.stageLabel}
                                        </Badge>
                                        <Badge variant="outline" className={statusBadgeClass(submission.status)}>
                                            {submission.statusLabel}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                        className="bg-transparent transition-transform duration-150 ease-out active:scale-[0.97]"
                                    >
                                        <Link href={`/admin/submissions/${submission.submissionId}`}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            Review Detail
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                        className="bg-transparent transition-transform duration-150 ease-out active:scale-[0.97]"
                                    >
                                        <a href={submission.ojsUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Open in OJS
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
