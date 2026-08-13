import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ReviewAssignment, SubmissionReviewDetail } from "../types"
import { formatDate } from "@/src/lib/utils"

interface SubmissionReviewDetailProps {
    detail: SubmissionReviewDetail
}

const STATE_BADGES = {
    declined: {
        label: "Declined",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200",
    },
    cancelled: {
        label: "Cancelled",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200",
    },
    completed: {
        label: "Completed",
        className: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200",
    },
    overdue: {
        label: "Overdue",
        className: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200",
    },
    pending: {
        label: "Pending",
        className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200",
    },
} as const

/** Priority order: declined > cancelled > completed > overdue > pending. */
function assignmentState(assignment: ReviewAssignment): keyof typeof STATE_BADGES {
    if (assignment.declined) return "declined"
    if (assignment.cancelled) return "cancelled"
    if (assignment.dateCompleted) return "completed"
    if (assignment.isOverdue) return "overdue"
    return "pending"
}

function AssignmentCard({ assignment }: { assignment: ReviewAssignment }) {
    const stateBadge = STATE_BADGES[assignmentState(assignment)]

    return (
        <div
            className={`rounded-lg border p-4 space-y-2 ${
                assignment.isOverdue && !assignment.dateCompleted && !assignment.declined && !assignment.cancelled
                    ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
                    : ""
            }`}
        >
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="font-medium">{assignment.reviewer.fullName}</p>
                    {assignment.reviewer.email && (
                        <p className="text-sm text-muted-foreground">{assignment.reviewer.email}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {assignment.reviewMethodLabel && (
                        <Badge variant="secondary">{assignment.reviewMethodLabel}</Badge>
                    )}
                    <Badge variant="outline" className={stateBadge.className}>
                        {stateBadge.label}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>Assigned: {formatDate(assignment.dateAssigned)}</span>
                <span>Response due: {formatDate(assignment.dateResponseDue)}</span>
                <span>Review due: {formatDate(assignment.dateDue)}</span>
                <span>Completed: {formatDate(assignment.dateCompleted)}</span>
            </div>

            {assignment.recommendationLabel && (
                <div className="text-sm">
                    <span className="font-medium">Recommendation: </span>
                    <Badge variant="outline">{assignment.recommendationLabel}</Badge>
                </div>
            )}
        </div>
    )
}

/** Review rounds accordion with assignments, recommendation badges, overdue highlighting. */
export function SubmissionReviewDetail({ detail }: SubmissionReviewDetailProps) {
    if (detail.rounds.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <p className="text-lg font-medium">No review rounds yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        This submission has not entered a review round in OJS
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Review Rounds</CardTitle>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" defaultValue={detail.rounds.map((r) => String(r.reviewRoundId))}>
                    {detail.rounds.map((round) => (
                        <AccordionItem key={round.reviewRoundId} value={String(round.reviewRoundId)}>
                            <AccordionTrigger className="transition-colors duration-200 ease-out">
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold">
                                        {round.round === 0 ? "Unassigned" : `Round ${round.round}`}
                                    </span>
                                    <Badge variant="outline">{round.statusLabel}</Badge>
                                    <span className="text-sm text-muted-foreground">
                                        {round.assignments.length} assignment
                                        {round.assignments.length === 1 ? "" : "s"}
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-3 pt-2">
                                    {round.assignments.length > 0 ? (
                                        round.assignments.map((assignment) => (
                                            <AssignmentCard key={assignment.reviewId} assignment={assignment} />
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No reviewer assignments in this round
                                        </p>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    )
}
