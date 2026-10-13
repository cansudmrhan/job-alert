import { AnthropicAnalyzer } from "./anthropic";
import { DEFAULT_GEMINI_MODEL, GeminiAnalyzer } from "./gemini";
import { SAMPLE_ANALYSIS, SampleAnalyzer } from "./sample";
import {
  CvAnalysisSchema,
  LlmProviderError,
  reasonFromError,
  type AnalysisSource,
  type FallbackReason,
  type CvAnalysis,
  type CvAnalysisInput,
  type CvAnalyzer,
} from "./types";

type Env = Record<string, string | undefined>;

type Provider = "gemini" | "anthropic" | "sample";

// LLM_PROVIDER wins when its key is available. Otherwise: gemini if
// GEMINI_API_KEY is set, else anthropic if ANTHROPIC_API_KEY is set, else sample.
export function selectProvider(env: Env = process.env): Provider {
  const requested = env.LLM_PROVIDER?.trim().toLowerCase();
  if (requested === "sample") return "sample";
  if (requested === "gemini" && env.GEMINI_API_KEY) return "gemini";
  if (requested === "anthropic" && env.ANTHROPIC_API_KEY) return "anthropic";

  if (env.GEMINI_API_KEY) return "gemini";
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  return "sample";
}

export function getCvAnalyzer(env: Env = process.env): CvAnalyzer {
  switch (selectProvider(env)) {
    case "gemini":
      return new GeminiAnalyzer(
        env.GEMINI_API_KEY as string,
        env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
      );
    case "anthropic":
      return new AnthropicAnalyzer(env.ANTHROPIC_API_KEY as string);
    default:
      return new SampleAnalyzer();
  }
}

type AnalysisOutcome = {
  analysis: CvAnalysis;
  source: AnalysisSource;
  fallbackReason?: FallbackReason;
};

export async function analyzeWithFallback(
  analyzer: CvAnalyzer,
  input: CvAnalysisInput
): Promise<AnalysisOutcome> {
  if (analyzer.provider === "sample") {
    return { analysis: SAMPLE_ANALYSIS, source: "sample", fallbackReason: "missing_key" };
  }
  try {
    const raw = await analyzer.analyze(input);
    return { analysis: CvAnalysisSchema.parse(raw), source: "live" };
  } catch (err) {
    if (!(err instanceof LlmProviderError)) {
      console.error(`[llm] unexpected failure: stage=parse provider=${analyzer.provider}`);
    }
    return { analysis: SAMPLE_ANALYSIS, source: "sample", fallbackReason: reasonFromError(err) };
  }
}
