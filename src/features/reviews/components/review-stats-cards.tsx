import { Card, CardContent } from "@/components/ui/card"
import type { Review } from "../schemas/review-schema"

interface ReviewStatCardsProps {
    reviews: Review[]
}

export function ReviewStatCards({ reviews }: ReviewStatCardsProps) {
    const stats = {
        total: reviews?.length || 0,
        pending: reviews?.filter((r) => r.review_status === "pending").length || 0,
        in_progress: reviews?.filter((r) => r.review_status === "in_progress").length || 0,
        completed: reviews?.filter((r) => r.review_status === "completed").length || 0,
    }

    return (
        <div className="grid gap-4 sm:grid-cols-4">
            <Card>
                <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Total Reviews</div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Pending</div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">In Progress</div>
                    <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.in_progress}</div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Completed</div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
                </CardContent>
            </Card>
        </div>
    )
}
