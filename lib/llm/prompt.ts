import { z } from "zod";
import { CvAnalysisSchema, type CvAnalysisInput } from "./types";

export const SYSTEM_PROMPT = `You are an expert technical recruiter and ATS (applicant tracking system) specialist. You compare a candidate's CV with a job description and return a structured analysis.

STRICT HONESTY RULES:
- NEVER invent employers, job titles, degrees, dates, skills, tools or achievements.
- Only reword, reorder and emphasise facts that are already present in the CV.
- Do not add numbers or metrics that are not in the CV.
- Anything the job asks for that the CV does not show goes into "gaps" and "missingKeywords". Phrase those entries as suggestions that apply "only if true" for the candidate.
- "improvedBullets" must reword only bullets that exist in the CV, mirroring the job's wording where it is truthful.
- "atsChecks" is an ATS compatibility checklist. Judge ONLY what is visible in the CV; if something cannot be determined from the CV, mark it "warn" and say so. Never invent facts. Return exactly these checks, in this order, each with status "pass", "warn" or "fail" and a one-sentence note:
  1. Standard section headings (e.g. Experience, Education, Skills)
  2. Single-column, readable layout
  3. Contact details present
  4. Consistent date formats
  5. Bullet length and metrics (concise bullets, measurable results already stated)
  6. Job keywords in skills AND experience
  7. Text-based document (not an image or scan)
  8. Sensible length
- Keep every list concise: at most 15 keywords per list, 5 strengths, 5 gaps and 6 improved bullets.
- atsScore is an integer from 0 to 100 estimating keyword and requirement coverage.
- Write in the language of the CV; default to English.`;

export function buildUserPrompt(input: CvAnalysisInput): string {
  const { job } = input;
  const header = [
    `JOB TITLE: ${job.title || "Not specified"}`,
    `COMPANY: ${job.company || "Not specified"}`,
    `JOB DESCRIPTION:\n${job.description}`,
  ].join("\n");
  const cv =
    input.cv.kind === "text"
      ? `CANDIDATE CV (plain text):\n${input.cv.text}`
      : "The candidate CV is attached as a PDF document.";
  return `${header}\n\n${cv}\n\nAnalyse how well the CV matches the job and return the result.`;
}

// JSON Schema derived from the zod schema, shared by every live provider.
export function analysisJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(CvAnalysisSchema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}
