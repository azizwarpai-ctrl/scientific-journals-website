
export const mockMessages = [
  {
    id: "1",
    subject: "Submission Inquiry",
    status: "unread",
    message_type: "submission_help",
    message: "I am having trouble uploading my manuscript.",
    response: null,
    responded_at: null,
    name: "Dr. Alice Smith",
    email: "alice@example.com",
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    subject: "Technical Issue",
    status: "resolved",
    message_type: "technical_support",
    message: "The login page is not loading correctly.",
    response: "We have fixed the issue. Please try clearing your cache.",
    responded_at: "2024-01-16T14:30:00Z",
    name: "Prof. Bob Jones",
    email: "bob@example.com",
    created_at: "2024-01-16T09:00:00Z",
  },
];

export const mockSubmissions = [
  {
    id: "1",
    manuscript_title: "Advanced Digital Dentistry",
    status: "submitted",
    abstract: "This paper explores new techniques in digital dentistry...",
    keywords: ["dentistry", "digital", "CAD/CAM"],
    manuscript_file_url: "#",
    notes: "Initial submission.",
    submission_type: "Original Research",
    submission_date: "2024-02-01T10:00:00Z",
    journals: {
      title: "Journal of Digitodontics",
      field: "Digital Dentistry",
      issn: "2456-7890",
    },
    author_name: "Dr. John Doe",
    author_email: "john@example.com",
    corresponding_author_name: "Dr. John Doe",
    corresponding_author_email: "john@example.com",
  },
  {
    id: "2",
    manuscript_title: "Biomedical Innovations 2024",
    status: "under_review",
    abstract: "A comprehensive review of biomedical innovations...",
    keywords: ["biomedical", "innovation", "health"],
    manuscript_file_url: "#",
    notes: "Under peer review.",
    submission_type: "Review Article",
    submission_date: "2024-02-05T15:00:00Z",
    journals: {
      title: "Open Journal of Biomedical Research",
      field: "Biomedical Science",
      issn: "2456-7891",
    },
    author_name: "Jane Smith",
    author_email: "jane@example.com",
    corresponding_author_name: null,
    corresponding_author_email: null,
  },
];

export const mockReviews = [
  {
      id: "1",
      submission_id: "1",
      reviewer_name: "Dr. Reviewer One",
      review_status: "site_completed",
      reviewer_email: "reviewer1@example.com",
      recommendation: "accept_with_minor_revisions",
      comments_to_author: "Good paper, but needs some clarifications...",
      review_date: "2024-02-10T11:00:00Z",
      created_at: "2024-02-10T11:00:00Z"
  }
];

export const mockJournals = [
  {
    id: "1",
    title: "Journal of Digitodontics",
    issn: "2456-7890",
    field: "Digital Dentistry",
  },
  {
    id: "2",
    title: "Open Journal of Biomedical Research",
    issn: "2456-7891",
    field: "Biomedical Science",
  }
];

export const mockPublishedArticles = [
  { id: "1", title: "Article 1" },
  { id: "2", title: "Article 2" }
];

export const mockFaqs = [
  {
    id: "1",
    question: "How do I submit a manuscript?",
    answer: "You can submit a manuscript by clicking on the 'Submit Manuscript' button on the homepage.",
    category: "submission",
    is_published: true,
    view_count: 150,
    helpful_count: 45,
    created_at: "2024-01-01T10:00:00Z"
  },
  {
    id: "2",
    question: "What is the review process?",
    answer: "Our review process involves...",
    category: "review",
    is_published: false,
    view_count: 0,
    helpful_count: 0,
    created_at: "2024-01-05T10:00:00Z"
  }
];

export const journalData: Record<string, any> = {
  "1": {
    title: "Journal of Digitodontics",
    issn: "ISSN 2456-7890",
    field: "Digital Dentistry",
    publisher: "dis Scientific",
    year: "2020",
    coverImage: "/images/imegjournal.jpg",
    description:
      "A premier peer-reviewed journal dedicated to advancing the field of digital dentistry through cutting-edge research and clinical applications.",
    aims: "To publish high-quality original research, reviews, and case studies that contribute to the understanding and practice of digital dentistry worldwide.",
    frequency: "Quarterly (4 issues per year)",
    loginUrl: "/journals/1/login",
    detailedInfo: {
      founded: "2020",
      language: "English",
      openAccess: "Yes",
      peerReview: "Double-blind",
      articleProcessingCharge: "$500 USD",
      submissionToDecision: "45 days average",
      acceptanceToPublication: "30 days average",
      copyrightPolicy: "Creative Commons Attribution 4.0 International License",
      withdrawalPolicy: "Available upon request with valid justification",
    },
  },
  "2": {
    title: "Open Journal of Biomedical Research",
    issn: "ISSN 2456-7891",
    field: "Biomedical Science",
    publisher: "dis Scientific",
    year: "2019",
    coverImage: "/images/2.png",
    description:
      "An open-access journal publishing groundbreaking biomedical research across all areas of human health and disease.",
    aims: "To accelerate the dissemination of biomedical discoveries and foster collaboration among researchers worldwide.",
    frequency: "Bi-monthly (6 issues per year)",
    loginUrl: "/journals/2/login",
    detailedInfo: {
      founded: "2019",
      language: "English",
      openAccess: "Yes",
      peerReview: "Double-blind",
      articleProcessingCharge: "$600 USD",
      submissionToDecision: "40 days average",
      acceptanceToPublication: "25 days average",
      copyrightPolicy: "Creative Commons Attribution 4.0 International License",
      withdrawalPolicy: "Available upon request with valid justification",
    },
  },
};

export const journalNames: Record<string, string> = {
  "1": "Journal of Digitodontics",
  "2": "Open Journal of Biomedical Research",
};
