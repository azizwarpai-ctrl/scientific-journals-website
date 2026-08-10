import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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
    // Exact-map assertions: existence checks alone would pass with swapped
    // or mistranslated labels; toEqual also fails on unexpected extra ids.
    it("stage ids 1-5", () => {
        expect(STAGE_LABELS).toEqual({
            1: "Submission",
            2: "Internal Review",
            3: "External Review",
            4: "Copyediting",
            5: "Production",
        })
    })
    it("submission statuses 1/3/4/5", () => {
        expect(SUBMISSION_STATUS_LABELS).toEqual({
            1: "Queued",
            3: "Published",
            4: "Declined",
            5: "Scheduled",
        })
    })
    it("recommendations 1-6", () => {
        expect(RECOMMENDATION_LABELS).toEqual({
            1: "Accept",
            2: "Revisions Required",
            3: "Resubmit for Review",
            4: "Resubmit Elsewhere",
            5: "Decline Submission",
            6: "See Comments",
        })
    })
    it("review methods 1-3", () => {
        expect(REVIEW_METHOD_LABELS).toEqual({
            1: "Double-Blind",
            2: "Blind",
            3: "Open",
        })
    })
    it("editorial decisions 1-4/6-8", () => {
        expect(DECISION_LABELS).toEqual({
            1: "Accept",
            2: "Revisions Requested",
            3: "Resubmit for Review",
            4: "Decline",
            6: "Send to Review",
            7: "Send to Production",
            8: "New Review Round",
        })
    })
    it("review round statuses 1-9", () => {
        expect(REVIEW_ROUND_STATUS_LABELS).toEqual({
            1: "Pending Reviewers",
            2: "Pending Reviews",
            3: "Reviews Ready",
            4: "Reviews Completed",
            5: "Reviews Overdue",
            6: "Revisions Submitted",
            7: "Resubmit for Review",
            8: "Resubmitted for Review",
            9: "Returned to Review",
        })
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
    // Clear the public-base env vars so the default-URL assertions can't be
    // broken by values inherited from the developer's shell ("" reads as unset).
    beforeEach(() => {
        vi.stubEnv("PUBLIC_OJS_BASE_URL", "")
        vi.stubEnv("NEXT_PUBLIC_OJS_BASE_URL", "")
    })
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it("builds the workflow access URL with the default public base", () => {
        expect(buildOjsWorkflowUrl("jmed", 123)).toBe(
            "https://journals.digitopub.com/index.php/jmed/workflow/access/123"
        )
    })

    it("encodes the journal path", () => {
        expect(buildOjsWorkflowUrl("my journal", 7)).toContain("/my%20journal/")
    })
})

describe("buildOjsReviewerUrl", () => {
    beforeEach(() => {
        vi.stubEnv("PUBLIC_OJS_BASE_URL", "")
        vi.stubEnv("NEXT_PUBLIC_OJS_BASE_URL", "")
    })
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it("points at the users & roles management screen", () => {
        expect(buildOjsReviewerUrl("jmed")).toBe(
            "https://journals.digitopub.com/index.php/jmed/management/settings/users"
        )
    })
})
