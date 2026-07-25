import { Card, CardContent } from "@/components/ui/card"
import type { ReviewOverview } from "../types"

interface ReviewStatCardsProps {
    overview: ReviewOverview
}

/** Overview stat cards fed by GET /api/reviews/overview (live OJS aggregates). */
export function ReviewStatCards({ overview }: ReviewStatCardsProps) {
    const cards = [
        {
            label: "Submissions in Review",
            value: overview.submissionsInReview,
            className: "text-primary",
        },
        {
            label: "Active Assignments",
            value: overview.activeAssignments,
            className: "text-blue-600 dark:text-blue-400",
        },
        {
            label: "Overdue Reviews",
            value: overview.overdueReviews,
            className:
                overview.overdueReviews > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground",
        },
        {
            label: "Completed Reviews",
            value: overview.completedReviews,
            className: "text-green-600 dark:text-green-400",
        },
        {
            label: "Avg Days to Complete",
            value:
                overview.avgDaysToComplete === null
                    ? "—"
                    : overview.avgDaysToComplete.toFixed(1),
            className: "text-muted-foreground",
        },
    ]

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card, i) => (
                <Card
                    key={card.label}
                    className="animate-in fade-in duration-200"
                    style={{ animationDelay: `${i * 40}ms` }}
                >
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">{card.label}</div>
                        <div className={`text-2xl font-bold ${card.className}`}>{card.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
