import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import type { ReviewerWorkload } from "../types"

interface ReviewerWorkloadTableProps {
    reviewers: ReviewerWorkload[]
}

/** Per-reviewer workload aggregates (live OJS review_assignments GROUP BY). */
export function ReviewerWorkloadTable({ reviewers }: ReviewerWorkloadTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Reviewer Workload</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {reviewers.length === 0 ? (
                    <div className="py-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No reviewers found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Reviewers appear here once they have assignments in OJS
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-3 font-medium">Reviewer</th>
                                    <th className="px-4 py-3 font-medium text-right">Total</th>
                                    <th className="px-4 py-3 font-medium text-right">Active</th>
                                    <th className="px-4 py-3 font-medium text-right">Completed</th>
                                    <th className="px-4 py-3 font-medium text-right">Declined</th>
                                    <th className="px-4 py-3 font-medium text-right">Overdue</th>
                                    <th className="px-4 py-3 font-medium text-right">Avg days</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {reviewers.map((workload, i) => (
                                    <tr
                                        key={workload.reviewer.userId}
                                        className="hover:bg-muted/50 transition-colors duration-200 ease-out animate-in fade-in"
                                        style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{workload.reviewer.fullName}</div>
                                            {workload.reviewer.email && (
                                                <div className="text-muted-foreground">{workload.reviewer.email}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">{workload.total}</td>
                                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                                            {workload.active}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                                            {workload.completed}
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground">
                                            {workload.declined}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right font-medium ${
                                                workload.overdue > 0
                                                    ? "text-red-600 dark:text-red-400"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {workload.overdue}
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground">
                                            {workload.avgDaysToComplete === null
                                                ? "—"
                                                : workload.avgDaysToComplete.toFixed(1)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
