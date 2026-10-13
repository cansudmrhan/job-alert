import { analysisJsonSchema, buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import {
  CvAnalysisSchema,
  LlmProviderError,
  type CvAnalysis,
  type CvAnalysisInput,
  type CvAnalyzer,
} from "./types";

// Larger flash models returned 503 "high demand" on the free tier and
// 2.5-flash returns 404 for new users. Override with GEMINI_MODEL.
export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiResponse = {
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
};

// Truncated upstream error text, for server-side logs only.
async function upstreamMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return (body.error?.message ?? "").replace(/\s+/g, " ").slice(0, 300);
  } catch {
    return "";
  }
}

export class GeminiAnalyzer implements CvAnalyzer {
  readonly provider = "gemini" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_GEMINI_MODEL,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly retryDelayMs: number = 1500
  ) {}

  async analyze(input: CvAnalysisInput): Promise<CvAnalysis> {
    const parts: Array<Record<string, unknown>> = [];
    if (input.cv.kind === "pdf") {
      parts.push({ inlineData: { mimeType: "application/pdf", data: input.cv.base64 } });
    }
    parts.push({ text: buildUserPrompt(input) });

    const request = () =>
      this.fetchImpl(`${ENDPOINT}/${encodeURIComponent(this.model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseJsonSchema: analysisJsonSchema(),
          },
        }),
        cache: "no-store",
      });

    let res: Response;
    try {
      res = await request();
      // 503 "high demand" is usually a short spike: retry once.
      if (res.status === 503) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
        res = await request();
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message.slice(0, 200) : "";
      console.error(`[gemini] network error: stage=request model=${this.model} message=${detail}`);
      throw new LlmProviderError("Gemini request could not be sent", undefined, "request", detail);
    }

    if (!res.ok) {
      const detail = await upstreamMessage(res);
      console.error(`[gemini] request failed: stage=request model=${this.model} status=${res.status} message=${detail}`);
      throw new LlmProviderError(`Gemini request failed (${res.status})`, res.status, "request", detail);
    }

    const data = (await res.json().catch(() => null)) as GeminiResponse | null;
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) {
      const why = data?.promptFeedback?.blockReason ?? data?.candidates?.[0]?.finishReason ?? "no text";
      console.error(`[gemini] empty response: stage=response model=${this.model} reason=${why}`);
      throw new LlmProviderError("Gemini returned an empty response", res.status, "response", String(why));
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      console.error(`[gemini] invalid JSON: stage=parse model=${this.model}`);
      throw new LlmProviderError("Gemini returned invalid JSON", res.status, "parse");
    }
    const checked = CvAnalysisSchema.safeParse(json);
    if (!checked.success) {
      const issue = checked.error.issues[0];
      console.error(
        `[gemini] schema mismatch: stage=parse model=${this.model} path=${issue?.path.join(".")} message=${issue?.message}`
      );
      throw new LlmProviderError("Gemini output did not match the schema", res.status, "parse");
    }
    return checked.data;
  }
}
