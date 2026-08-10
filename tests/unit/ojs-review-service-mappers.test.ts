import { describe, expect, it } from "vitest"
import {
    buildPersonRef,
    mapDecisionRow,
    mapEditorRow,
    mapReviewAssignmentRow,
    mapReviewRoundRow,
    mapReviewerWorkloadRow,
    mapSubmissionSummaryRow,
    toIso,
} from "@/src/features/reviews/server/ojs-review-service"

describe("toIso", () => {
    it("converts Date objects to ISO strings", () => {
        expect(toIso(new Date("2026-01-15T10:30:00Z"))).toBe("2026-01-15T10:30:00.000Z")
    })
    it("converts date strings to ISO strings", () => {
        expect(toIso("2026-01-15 10:30:00")).toBe(new Date("2026-01-15 10:30:00").toISOString())
    })
    it("returns null for null/undefined/invalid", () => {
        expect(toIso(null)).toBeNull()
        expect(toIso(undefined)).toBeNull()
        expect(toIso("not-a-date")).toBeNull()
    })
})

describe("buildPersonRef", () => {
    it("joins given and family names", () => {
        const person = buildPersonRef({
            userId: 5,
            givenName: "Ada",
            familyName: "Lovelace",
            username: "ada",
            email: "ada@example.com",
            affiliation: "Analytical Engines Ltd",
            orcid: "0000-0001-2345-6789",
        })
        expect(person).toEqual({
            userId: 5,
            fullName: "Ada Lovelace",
            email: "ada@example.com",
            affiliation: "Analytical Engines Ltd",
            orcid: "0000-0001-2345-6789",
        })
    })

    it("falls back to username, then User #id", () => {
        expect(
            buildPersonRef({ userId: 5, givenName: null, familyName: null, username: "ada", email: null }).fullName
        ).toBe("ada")
        expect(
            buildPersonRef({ userId: 5, givenName: null, familyName: null, username: null, email: null }).fullName
        ).toBe("User #5")
        expect(
            buildPersonRef({ userId: 5, givenName: "  ", familyName: "", username: null, email: null }).fullName
        ).toBe("User #5")
    })
})

const baseSubmissionRow = {
    submissionId: 42,
    title: "A study of things",
    journalId: 3,
    journalTitle: "Journal of Things",
    journalPath: "jthings",
    stageId: 3,
    status: 1,
    dateSubmitted: new Date("2026-01-01T00:00:00Z"),
    dateLastActivity: new Date("2026-02-01T00:00:00Z"),
    currentRound: 2,
    reviewsPending: 1,
    reviewsCompleted: 2,
}

describe("mapSubmissionSummaryRow", () => {
    it("maps a full row including labels and ojsUrl", () => {
        const dto = mapSubmissionSummaryRow(baseSubmissionRow as never)
        expect(dto.submissionId).toBe(42)
        expect(dto.stageLabel).toBe("External Review")
        expect(dto.statusLabel).toBe("Queued")
        expect(dto.dateSubmitted).toBe("2026-01-01T00:00:00.000Z")
        expect(dto.currentRound).toBe(2)
        expect(dto.ojsUrl).toBe(
            "https://journals.digitopub.com/index.php/jthings/workflow/access/42"
        )
    })

    it("falls back on missing title/journal title and null round", () => {
        const dto = mapSubmissionSummaryRow({
            ...baseSubmissionRow,
            title: null,
            journalTitle: null,
            currentRound: null,
        } as never)
        expect(dto.title).toBe("Untitled submission")
        expect(dto.journalTitle).toBe("jthings")
        expect(dto.currentRound).toBeNull()
    })
})

const baseAssignmentRow = {
    reviewId: 7,
    reviewRoundId: 11,
    reviewerId: 21,
    reviewerEmail: "rev@example.com",
    reviewerUsername: "reviewer1",
    givenName: "Grace",
    familyName: "Hopper",
    affiliation: null,
    orcid: null,
    recommendation: 2,
    reviewMethod: 1,
    dateAssigned: new Date("2026-01-05T00:00:00Z"),
    dateNotified: null,
    dateConfirmed: null,
    dateDue: new Date("2026-03-01T00:00:00Z"),
    dateResponseDue: null,
    dateCompleted: new Date("2026-02-20T00:00:00Z"),
    declined: 0,
    cancelled: 0,
    isOverdue: 0,
}

describe("mapReviewAssignmentRow", () => {
    it("maps a completed assignment with labels", () => {
        const dto = mapReviewAssignmentRow(baseAssignmentRow as never)
        expect(dto.reviewer.fullName).toBe("Grace Hopper")
        expect(dto.recommendationLabel).toBe("Revisions Required")
        expect(dto.reviewMethodLabel).toBe("Double-Blind")
        expect(dto.declined).toBe(false)
        expect(dto.isOverdue).toBe(false)
        expect(dto.dateCompleted).toBe("2026-02-20T00:00:00.000Z")
    })

    it("handles null recommendation/method and flag conversions", () => {
        const dto = mapReviewAssignmentRow({
            ...baseAssignmentRow,
            recommendation: null,
            reviewMethod: null,
            declined: 1,
            isOverdue: 1,
        } as never)
        expect(dto.recommendation).toBeNull()
        expect(dto.recommendationLabel).toBeNull()
        expect(dto.reviewMethodLabel).toBeNull()
        expect(dto.declined).toBe(true)
        expect(dto.isOverdue).toBe(true)
    })
})

describe("mapReviewRoundRow", () => {
    it("maps a round with assignments and status label", () => {
        const assignment = mapReviewAssignmentRow(baseAssignmentRow as never)
        const dto = mapReviewRoundRow(
            { reviewRoundId: 11, round: 1, stageId: 3, status: 4 } as never,
            [assignment]
        )
        expect(dto.round).toBe(1)
        expect(dto.statusLabel).toBe("Reviews Completed")
        expect(dto.assignments).toHaveLength(1)
    })

    it("handles null status", () => {
        const dto = mapReviewRoundRow(
            { reviewRoundId: 11, round: 1, stageId: 3, status: null } as never,
            []
        )
        expect(dto.status).toBeNull()
        expect(dto.statusLabel).toBe("Unknown")
    })
})

describe("mapDecisionRow", () => {
    it("maps a decision event", () => {
        const dto = mapDecisionRow({
            editDecisionId: 3,
            editorId: 9,
            decision: 1,
            reviewRoundId: 11,
            round: 1,
            dateDecided: new Date("2026-02-25T12:00:00Z"),
        } as never)
        expect(dto.decisionLabel).toBe("Accept")
        expect(dto.dateDecided).toBe("2026-02-25T12:00:00.000Z")
    })
})

describe("mapEditorRow", () => {
    it("maps an editor assignment with resolved name", () => {
        const dto = mapEditorRow({
            userId: 9,
            userGroupId: 4,
            roleId: 17,
            dateAssigned: new Date("2026-01-02T00:00:00Z"),
            recommendOnly: 1,
            email: "ed@example.com",
            username: "editor",
            givenName: "Edsger",
            familyName: "Dijkstra",
        } as never)
        expect(dto.name).toBe("Edsger Dijkstra")
        expect(dto.roleId).toBe(17)
        expect(dto.recommendOnly).toBe(true)
    })
})

describe("mapReviewerWorkloadRow", () => {
    it("maps aggregate counts and average", () => {
        const dto = mapReviewerWorkloadRow({
            reviewerId: 21,
            email: "rev@example.com",
            username: "reviewer1",
            givenName: "Grace",
            familyName: "Hopper",
            affiliation: null,
            orcid: null,
            total: 10,
            active: 2,
            completed: 7,
            declined: 1,
            overdue: 1,
            avgDaysToComplete: 12.5,
        } as never)
        expect(dto.reviewer.fullName).toBe("Grace Hopper")
        expect(dto.total).toBe(10)
        expect(dto.overdue).toBe(1)
        expect(dto.avgDaysToComplete).toBe(12.5)
    })

    it("keeps null average when no completed reviews", () => {
        const dto = mapReviewerWorkloadRow({
            reviewerId: 21,
            email: null,
            username: "reviewer1",
            givenName: null,
            familyName: null,
            affiliation: null,
            orcid: null,
            total: 1,
            active: 1,
            completed: 0,
            declined: 0,
            overdue: 0,
            avgDaysToComplete: null,
        } as never)
        expect(dto.avgDaysToComplete).toBeNull()
        expect(dto.reviewer.fullName).toBe("reviewer1")
    })
})
