import { CvAnalysisSchema, type CvAnalysis, type CvAnalysisInput, type CvAnalyzer } from "./types";

// Static example for the "Try with sample" button and the no-provider fallback.
export const SAMPLE_ANALYSIS: CvAnalysis = {
  atsScore: 72,
  matchedKeywords: [
    "React",
    "TypeScript",
    "Next.js",
    "REST APIs",
    "Tailwind CSS",
    "Unit testing",
    "CI/CD",
    "Agile",
  ],
  missingKeywords: [
    "Python",
    "LLM integration",
    "Prompt engineering",
    "PostgreSQL",
    "Docker",
    "Vector databases",
  ],
  strengths: [
    "Five years of production React and TypeScript experience maps directly to the frontend half of the role.",
    "Hands-on Next.js work shows readiness for a full-stack, API-driven product.",
    "Testing and CI/CD experience signals engineering discipline the posting asks for.",
    "Led a small team on a customer-facing dashboard, which supports the ownership expectation.",
  ],
  gaps: [
    "The role expects backend work in Python; the CV shows Node.js only. Mention any Python exposure, but only if true.",
    "No LLM or prompt engineering experience is visible. Add a side project or course only if true.",
    "Database experience is not stated. Add PostgreSQL or similar only if you have used it.",
  ],
  improvedSummary:
    "Frontend engineer with 5 years of experience building production React, TypeScript and Next.js applications, comfortable owning features end to end from UI to REST API integration, with a strong focus on testing and CI/CD.",
  improvedBullets: [
    {
      original: "Worked on the company dashboard using React.",
      improved:
        "Built and maintained a customer-facing analytics dashboard in React and TypeScript, integrating REST APIs and covering key flows with unit tests.",
      reason: "Names the stack and responsibilities the job description emphasises.",
    },
    {
      original: "Helped with deployments.",
      improved: "Maintained CI/CD pipelines for the frontend, automating test runs and deployments.",
      reason: "Uses the job's CI/CD wording while keeping the claim within what the CV states.",
    },
    {
      original: "Led small team of developers.",
      improved:
        "Led a team of three developers on the dashboard project, coordinating work in an agile process.",
      reason: "Makes ownership and agile practice explicit, both requested in the posting.",
    },
  ],
  atsChecks: [
    {
      check: "Standard section headings",
      status: "pass",
      note: "Experience, Education and Skills sections are clearly labelled.",
    },
    {
      check: "Single-column, readable layout",
      status: "pass",
      note: "Content reads top to bottom in one column.",
    },
    {
      check: "Contact details present",
      status: "pass",
      note: "Email and location are listed at the top.",
    },
    {
      check: "Consistent date formats",
      status: "warn",
      note: "Dates mix 'Jan 2021' and '2021' styles; pick one format.",
    },
    {
      check: "Bullet length and metrics",
      status: "warn",
      note: "Bullets are concise but few include measurable results; add numbers only if true.",
    },
    {
      check: "Job keywords in skills and experience",
      status: "warn",
      note: "React and TypeScript appear in both; Python and LLM terms are missing from both.",
    },
    {
      check: "Text-based document",
      status: "pass",
      note: "Text is selectable, not an image or scan.",
    },
    {
      check: "Sensible length",
      status: "pass",
      note: "The CV fits on one to two pages.",
    },
  ],
};

CvAnalysisSchema.parse(SAMPLE_ANALYSIS);

export class SampleAnalyzer implements CvAnalyzer {
  readonly provider = "sample" as const;

  async analyze(_input: CvAnalysisInput): Promise<CvAnalysis> {
    return SAMPLE_ANALYSIS;
  }
}
