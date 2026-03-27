import { z } from "zod"

export const guideSectionSchema = z.object({
  title: z.string().trim().min(1),
  content: z.array(z.object({
    heading: z.string().trim().min(1),
    text: z.string().trim().min(1),
  })),
})

export const helpContentSchema = z.object({
  heroTitle: z.string().trim().min(1),
  heroSubtitle: z.string().trim().min(1),
  authorGuide: guideSectionSchema,
  reviewerGuide: guideSectionSchema,
})

export type HelpContent = z.infer<typeof helpContentSchema>
export type GuideSection = z.infer<typeof guideSectionSchema>

export const defaultHelpContent: HelpContent = {
  heroTitle: "Help Center",
  heroSubtitle: "Find answers, guides and support for your publishing journey",
  authorGuide: {
    title: "Guide for Authors",
    content: [
      {
        heading: "Manuscript Preparation",
        text: "Ensure your manuscript adheres to the journal's formatting guidelines, including citation style, figure resolution, and word count limits. Use the templates provided if available.",
      },
      {
        heading: "Submission Process",
        text: "Verify that all co-authors are listed correctly and that you have obtained necessary ethical approvals. Prepare a cover letter to the editor highlighting the significance of your work.",
      },
      {
        heading: "Revision & Resubmission",
        text: "When submitting a revised manuscript, include a point-by-point response to the reviewers' comments. Highlight changes in the manuscript text for easy verification.",
      },
    ],
  },
  reviewerGuide: {
    title: "Guide for Reviewers",
    content: [
      {
        heading: "The Review Process",
        text: "Reviews should be constructive, objective, and timely. Evaluate the study's methodology, clarity, and contribution to the field. Maintain confidentiality throughout the process.",
      },
      {
        heading: "Writing Reviews",
        text: "Provide specific comments and suggestions for improvement. Clearly state your recommendation (Accept, Minor Revision, Major Revision, Reject) to the editor.",
      },
      {
        heading: "Timeline & Expectations",
        text: "Accept review invitations only if you have the expertise and time to complete the review within the deadline. Inform the editor immediately if a conflict of interest or delay arises.",
      },
    ],
  },
}
