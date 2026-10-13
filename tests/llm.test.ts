import { describe, expect, it, vi } from "vitest";
import { analyzeWithFallback, getCvAnalyzer, selectProvider } from "@/lib/llm";
import { SAMPLE_ANALYSIS } from "@/lib/llm/sample";
import {
  CvAnalysisSchema,
  LlmProviderError,
  type CvAnalysisInput,
  type CvAnalyzer,
} from "@/lib/llm/types";

const input: CvAnalysisInput = {
  cv: { kind: "text", text: "Frontend developer with React experience." },
  job: { title: "Engineer", company: "Acme", description: "Build things with React and Python." },
};

const env = (vars: Record<string, string>) => vars;

describe("CvAnalysis schema", () => {
  it("accepts the sample analysis", () => {
    expect(CvAnalysisSchema.safeParse(SAMPLE_ANALYSIS).success).toBe(true);
  });

  it("rejects out-of-range scores and missing fields", () => {
    expect(CvAnalysisSchema.safeParse({ ...SAMPLE_ANALYSIS, atsScore: 101 }).success).toBe(false);
    expect(CvAnalysisSchema.safeParse({ ...SAMPLE_ANALYSIS, atsScore: -1 }).success).toBe(false);
    const { atsChecks: _omit, ...rest } = SAMPLE_ANALYSIS;
    expect(CvAnalysisSchema.safeParse(rest).success).toBe(false);
  });

  it("validates ATS check statuses and has no improvedCv", () => {
    const bad = { ...SAMPLE_ANALYSIS, atsChecks: [{ check: "x", status: "maybe", note: "n" }] };
    expect(CvAnalysisSchema.safeParse(bad).success).toBe(false);
    expect(SAMPLE_ANALYSIS.atsChecks.length).toBe(8);
    expect("improvedCv" in CvAnalysisSchema.shape).toBe(false);
  });
});

describe("provider selection", () => {
  it("defaults to gemini when its key is set", () => {
    expect(selectProvider(env({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" }))).toBe("gemini");
  });
  it("falls back to anthropic, then sample", () => {
    expect(selectProvider(env({ ANTHROPIC_API_KEY: "a" }))).toBe("anthropic");
    expect(selectProvider(env({}))).toBe("sample");
  });
  it("honours LLM_PROVIDER when the key exists", () => {
    expect(selectProvider(env({ LLM_PROVIDER: "anthropic", GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" }))).toBe(
      "anthropic"
    );
    expect(selectProvider(env({ LLM_PROVIDER: "sample", GEMINI_API_KEY: "g" }))).toBe("sample");
  });
  it("falls back to sample when the requested provider has no key", () => {
    expect(selectProvider(env({ LLM_PROVIDER: "anthropic" }))).toBe("sample");
  });
  it("builds the matching analyzer", () => {
    expect(getCvAnalyzer(env({ GEMINI_API_KEY: "g" })).provider).toBe("gemini");
    expect(getCvAnalyzer(env({})).provider).toBe("sample");
  });
});

describe("analyzeWithFallback", () => {
  const live = (analyze: CvAnalyzer["analyze"]): CvAnalyzer => ({ provider: "gemini", analyze });

  it("returns the live result when valid", async () => {
    const out = await analyzeWithFallback(live(async () => ({ ...SAMPLE_ANALYSIS, atsScore: 10 })), input);
    expect(out.source).toBe("live");
    expect(out.analysis.atsScore).toBe(10);
  });

  it("falls back to the sample on HTTP 429", async () => {
    const analyze = vi.fn().mockRejectedValue(new LlmProviderError("quota", 429));
    const out = await analyzeWithFallback(live(analyze), input);
    expect(out.source).toBe("sample");
    expect(out.fallbackReason).toBe("rate_limited");
    expect(out.analysis).toEqual(SAMPLE_ANALYSIS);
  });

  it("falls back on other provider errors", async () => {
    const out = await analyzeWithFallback(
      live(async () => {
        throw new LlmProviderError("boom", 500);
      }),
      input
    );
    expect(out.source).toBe("sample");
    expect(out.fallbackReason).toBe("upstream_error");
  });

  it("falls back when the output violates the schema", async () => {
    const out = await analyzeWithFallback(
      live(async () => ({ ...SAMPLE_ANALYSIS, atsScore: 500 })),
      input
    );
    expect(out.source).toBe("sample");
    expect(out.fallbackReason).toBe("bad_response");
  });

  it.each([
    [401, "invalid_key"],
    [403, "invalid_key"],
    [404, "model_not_found"],
    [429, "rate_limited"],
    [503, "upstream_error"],
  ])("maps HTTP %i to %s", async (status, reason) => {
    const out = await analyzeWithFallback(
      live(async () => {
        throw new LlmProviderError("x", status);
      }),
      input
    );
    expect(out.source).toBe("sample");
    expect(out.fallbackReason).toBe(reason);
  });

  it("serves the sample for the sample provider with a missing_key reason", async () => {
    const out = await analyzeWithFallback(getCvAnalyzer(env({})), input);
    expect(out.source).toBe("sample");
    expect(out.fallbackReason).toBe("missing_key");
  });
});

describe("gemini analyzer (mocked fetch)", () => {
  it("sends JSON schema output config and parses the response", async () => {
    const { GeminiAnalyzer } = await import("@/lib/llm/gemini");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(SAMPLE_ANALYSIS) }] } }],
        }),
        { status: 200 }
      )
    );
    const analyzer = new GeminiAnalyzer("key", "test-model", fetchMock as unknown as typeof fetch);
    const result = await analyzer.analyze(input);
    expect(result.atsScore).toBe(SAMPLE_ANALYSIS.atsScore);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema.properties.atsScore).toBeDefined();
    expect(body.generationConfig.responseJsonSchema.properties.atsChecks).toBeDefined();
  });

  it("sends a PDF as inline base64 data before the prompt", async () => {
    const { GeminiAnalyzer } = await import("@/lib/llm/gemini");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(SAMPLE_ANALYSIS) }] } }] }),
        { status: 200 }
      )
    );
    const analyzer = new GeminiAnalyzer("key", "m", fetchMock as unknown as typeof fetch);
    await analyzer.analyze({ ...input, cv: { kind: "pdf", base64: "JVBERi0=" } });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.contents[0].parts[0].inlineData).toEqual({ mimeType: "application/pdf", data: "JVBERi0=" });
  });

  it("retries once on 503 and never logs the key", async () => {
    const { GeminiAnalyzer } = await import("@/lib/llm/gemini");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockImplementation(
      async () => new Response(JSON.stringify({ error: { message: "high demand" } }), { status: 503 })
    );
    const analyzer = new GeminiAnalyzer("SECRET-KEY", "m", fetchMock as unknown as typeof fetch, 0);
    await expect(analyzer.analyze(input)).rejects.toMatchObject({ status: 503, stage: "request" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const logged = err.mock.calls.flat().join(" ");
    expect(logged).toContain("status=503");
    expect(logged).not.toContain("SECRET-KEY");
    err.mockRestore();
  });

  it("surfaces 429 as a provider error with status", async () => {
    const { GeminiAnalyzer } = await import("@/lib/llm/gemini");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 429 }));
    const analyzer = new GeminiAnalyzer("key", "m", fetchMock as unknown as typeof fetch);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(analyzer.analyze(input)).rejects.toMatchObject({ status: 429 });
    err.mockRestore();
  });
});
