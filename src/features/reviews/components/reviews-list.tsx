import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import Link from "next/link"
import type { Review } from "../schemas/review-schema"

interface ReviewsListProps {
    reviews: Review[]
}

export function ReviewsList({ reviews }: ReviewsListProps) {
    if (!reviews || reviews.length === 0) {
        return (
            <Card>
                <CardContent className="p-0">
                    <div className="py-12 text-center">
                        <Eye className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No reviews found</p>
                        <p className="text-sm text-muted-foreground mt-1">Start by assigning reviewers to submissions</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent className="p-0">
                <div className="divide-y">
                    {reviews.map((review) => (
                        <div key={review.id} className="p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <div>
                                        <h3 className="font-semibold line-clamp-1">{review.submission?.manuscript_title}</h3>
                                        <p className="text-sm text-muted-foreground">{review.submission?.journal?.title}</p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                        <span>
                                            <span className="font-medium">Reviewer:</span> {review.reviewer_name}
                                        </span>
                                        <span className="text-muted-foreground">{review.reviewer_email}</span>
                                        {review.review_date && (
                                            <span className="text-muted-foreground">
                                                Reviewed: {new Date(review.review_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    {review.recommendation && (
                                        <Badge variant="outline" className="mt-2">
                                            {review.recommendation.replace("_", " ")}
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex flex-col items-end gap-3">
                                    <Badge
                                        variant="outline"
                                        className={`${review.review_status === "completed"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200"
                                            : review.review_status === "in_progress"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200"
                                                : review.review_status === "pending"
                                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200"
                                                    : "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200"
                                            }`}
                                    >
                                        {review.review_status.replace("_", " ")}
                                    </Badge>

                                    <Link href={`/admin/submissions/${review.submission_id}`}>
                                        <Button size="sm" variant="outline" className="bg-transparent">
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Submission
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
