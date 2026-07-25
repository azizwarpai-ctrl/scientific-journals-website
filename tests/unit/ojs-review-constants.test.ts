import { describe, expect, it } from "vitest"
import {
    DECISION_LABELS,
    RECOMMENDATION_LABELS,
    REVIEW_METHOD_LABELS,
    REVIEW_ROUND_STATUS_LABELS,
    STAGE_LABELS,
    SUBMISSION_STATUS_LABELS,
    buildOjsReviewerUrl,
    buildOjsWorkflowUrl,
    completeSubmissionPredicate,
    labelFor,
} from "@/src/features/reviews/server/ojs-review-constants"

describe("labelFor", () => {
    it("returns the mapped label for known values", () => {
        expect(labelFor(STAGE_LABELS, 3)).toBe("External Review")
        expect(labelFor(SUBMISSION_STATUS_LABELS, 1)).toBe("Queued")
        expect(labelFor(RECOMMENDATION_LABELS, 2)).toBe("Revisions Required")
        expect(labelFor(DECISION_LABELS, 4)).toBe("Decline")
        expect(labelFor(REVIEW_METHOD_LABELS, 1)).toBe("Double-Blind")
        expect(labelFor(REVIEW_ROUND_STATUS_LABELS, 5)).toBe("Reviews Overdue")
    })

    it("falls back to Unknown ({value}) for unmapped values", () => {
        expect(labelFor(STAGE_LABELS, 99)).toBe("Unknown (99)")
        expect(labelFor(DECISION_LABELS, 42)).toBe("Unknown (42)")
    })

    it("returns plain Unknown for null/undefined", () => {
        expect(labelFor(STAGE_LABELS, null)).toBe("Unknown")
        expect(labelFor(STAGE_LABELS, undefined)).toBe("Unknown")
    })
})

describe("enum maps cover the documented OJS 3.x values", () => {
    it("stage ids 1-5", () => {
        for (const id of [1, 2, 3, 4, 5]) expect(STAGE_LABELS[id]).toBeTruthy()
    })
    it("submission statuses 1/3/4/5", () => {
        for (const id of [1, 3, 4, 5]) expect(SUBMISSION_STATUS_LABELS[id]).toBeTruthy()
    })
    it("recommendations 1-6", () => {
        for (const id of [1, 2, 3, 4, 5, 6]) expect(RECOMMENDATION_LABELS[id]).toBeTruthy()
    })
    it("review methods 1-3", () => {
        for (const id of [1, 2, 3]) expect(REVIEW_METHOD_LABELS[id]).toBeTruthy()
    })
})

describe("completeSubmissionPredicate", () => {
    it("matches empty-string and '0' sentinels with the given alias", () => {
        expect(completeSubmissionPredicate("s")).toBe(
            "(s.submission_progress = '' OR s.submission_progress = '0')"
        )
        expect(completeSubmissionPredicate("x")).toContain("x.submission_progress")
    })
})

describe("buildOjsWorkflowUrl", () => {
    it("builds the workflow access URL with the default public base", () => {
        // vitest env sets no PUBLIC_OJS_BASE_URL/NEXT_PUBLIC_OJS_BASE_URL → default landing base
        expect(buildOjsWorkflowUrl("jmed", 123)).toBe(
            "https://journals.digitopub.com/index.php/jmed/workflow/access/123"
        )
    })

    it("encodes the journal path", () => {
        expect(buildOjsWorkflowUrl("my journal", 7)).toContain("/my%20journal/")
    })
})

describe("buildOjsReviewerUrl", () => {
    it("points at the users & roles management screen", () => {
        expect(buildOjsReviewerUrl("jmed")).toBe(
            "https://journals.digitopub.com/index.php/jmed/management/settings/users"
        )
    })
})
