import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding help articles...")

  // Author Guide
  await prisma.helpArticle.createMany({
    data: [
      {
        title: "Manuscript Preparation",
        content:
          "Ensure your manuscript adheres to the journal's formatting guidelines, including citation style, figure resolution, and word count limits. Use the templates provided if available.",
        category: "Guide for Authors",
        icon: "BookOpen",
        display_order: 1,
        is_published: true,
      },
      {
        title: "Submission Process",
        content:
          "Verify that all co-authors are listed correctly and that you have obtained necessary ethical approvals. Prepare a cover letter to the editor highlighting the significance of your work.",
        category: "Guide for Authors",
        icon: "BookOpen",
        display_order: 2,
        is_published: true,
      },
      {
        title: "Revision & Resubmission",
        content:
          "When submitting a revised manuscript, include a point-by-point response to the reviewers' comments. Highlight changes in the manuscript text for easy verification.",
        category: "Guide for Authors",
        icon: "BookOpen",
        display_order: 3,
        is_published: true,
      },
    ],
  })

  // Reviewer Guide
  await prisma.helpArticle.createMany({
    data: [
      {
        title: "The Review Process",
        content:
          "Reviews should be constructive, objective, and timely. Evaluate the study's methodology, clarity, and contribution to the field. Maintain confidentiality throughout the process.",
        category: "Guide for Reviewers",
        icon: "Users",
        display_order: 1,
        is_published: true,
      },
      {
        title: "Writing Reviews",
        content:
          "Provide specific comments and suggestions for improvement. Clearly state your recommendation (Accept, Minor Revision, Major Revision, Reject) to the editor.",
        category: "Guide for Reviewers",
        icon: "Users",
        display_order: 2,
        is_published: true,
      },
      {
        title: "Timeline & Expectations",
        content:
          "Accept review invitations only if you have the expertise and time to complete the review within the deadline. Inform the editor immediately if a conflict of interest or delay arises.",
        category: "Guide for Reviewers",
        icon: "Users",
        display_order: 3,
        is_published: true,
      },
    ],
  })

  console.log("Seeding finished successfully.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
