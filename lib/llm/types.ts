import { z } from "zod";

const ImprovedBulletSchema = z.object({
  original: z.string(),
  improved: z.string(),
  reason: z.string(),
});

const AtsCheckSchema = z.object({
  check: z.string(),
  status: z.enum(["pass", "warn", "fail"]),
  note: z.string(),
});

export const CvAnalysisSchema = z.object({
  atsScore: z.number().int().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  improvedSummary: z.string(),
  improvedBullets: z.array(ImprovedBulletSchema),
  atsChecks: z.array(AtsCheckSchema),
});

export type CvAnalysis = z.infer<typeof CvAnalysisSchema>;
export type AtsCheck = z.infer<typeof AtsCheckSchema>;

type CvSource =
  | { kind: "text"; text: string }
  | { kind: "pdf"; base64: string };

export type CvAnalysisInput = {
  cv: CvSource;
  job: { title: string; company: string; description: string };
};

export type AnalysisSource = "live" | "sample";

export interface CvAnalyzer {
  readonly provider: "gemini" | "anthropic" | "sample";
  analyze(input: CvAnalysisInput): Promise<CvAnalysis>;
}

// Safe, client-facing reason why a live analysis was not served.
export type FallbackReason =
  | "missing_key"
  | "invalid_key"
  | "model_not_found"
  | "rate_limited"
  | "bad_response"
  | "upstream_error";

// Thrown by live providers. `status` is the upstream HTTP status, `stage`
// which step failed, `detail` the upstream error message (server-side logs
// only, never sent to the client).
export class LlmProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly stage: "request" | "response" | "parse" = "request",
    readonly detail?: string
  ) {
    super(message);
    this.name = "LlmProviderError";
  }
}

export function reasonFromError(err: unknown): FallbackReason {
  if (!(err instanceof LlmProviderError)) return "bad_response";
  if (err.stage !== "request") return "bad_response";
  const { status } = err;
  if (status === 429) return "rate_limited";
  if (status === 401 || status === 403) return "invalid_key";
  if (status === 404) return "model_not_found";
  return "upstream_error";
}

export const FALLBACK_REASON_TEXT: Record<FallbackReason, string> = {
  missing_key: "No AI provider key is configured on this server.",
  invalid_key: "The AI provider rejected the API key.",
  model_not_found: "The configured AI model was not found.",
  rate_limited: "The AI provider rate limit was reached. Try again later.",
  bad_response: "The AI provider returned an unusable response.",
  upstream_error: "The AI provider is temporarily unavailable.",
};
