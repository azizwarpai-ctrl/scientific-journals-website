import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gavel } from "lucide-react"
import type { DecisionEvent } from "../types"

interface DecisionsTimelineProps {
    decisions: DecisionEvent[]
}

/** Chronological editorial decision timeline for a submission. */
export function DecisionsTimeline({ decisions }: DecisionsTimelineProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Editorial Decisions</CardTitle>
            </CardHeader>
            <CardContent>
                {decisions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No editorial decisions recorded yet</p>
                ) : (
                    <ol className="relative border-l border-muted space-y-4 ml-2">
                        {decisions.map((decision, i) => (
                            <li
                                key={decision.editDecisionId}
                                className="ml-4 animate-in fade-in duration-200"
                                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                            >
                                <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-muted">
                                    <Gavel className="h-2.5 w-2.5 text-muted-foreground" />
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{decision.decisionLabel}</Badge>
                                    {decision.round !== null && (
                                        <span className="text-sm text-muted-foreground">
                                            Round {decision.round}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {decision.dateDecided
                                        ? new Date(decision.dateDecided).toLocaleString()
                                        : "Date unknown"}
                                </p>
                            </li>
                        ))}
                    </ol>
                )}
            </CardContent>
        </Card>
    )
}
