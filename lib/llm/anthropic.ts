import Anthropic from "@anthropic-ai/sdk";
import { analysisJsonSchema, buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import {
  CvAnalysisSchema,
  LlmProviderError,
  type CvAnalysis,
  type CvAnalysisInput,
  type CvAnalyzer,
} from "./types";

const ANTHROPIC_MODEL = "claude-sonnet-5-5";
const TOOL_NAME = "submit_cv_analysis";

export class AnthropicAnalyzer implements CvAnalyzer {
  readonly provider = "anthropic" as const;
  private readonly client: Anthropic;

  constructor(apiKey: string, client?: Anthropic) {
    this.client = client ?? new Anthropic({ apiKey });
  }

  async analyze(input: CvAnalysisInput): Promise<CvAnalysis> {
    const content: Anthropic.ContentBlockParam[] = [];
    if (input.cv.kind === "pdf") {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: input.cv.base64 },
      });
    }
    content.push({ type: "text", text: buildUserPrompt(input) });

    let message: Anthropic.Message;
    try {
      message = await this.client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: [
          {
            name: TOOL_NAME,
            description: "Submit the structured CV analysis.",
            input_schema: analysisJsonSchema() as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: TOOL_NAME },
        messages: [{ role: "user", content }],
      });
    } catch (err) {
      const status = err instanceof Anthropic.APIError ? err.status : undefined;
      const detail = err instanceof Error ? err.message.slice(0, 300) : "";
      console.error(`[anthropic] request failed: stage=request status=${status ?? "none"} message=${detail}`);
      throw new LlmProviderError("Anthropic request failed", status, "request", detail);
    }

    const block = message.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      console.error("[anthropic] no structured result: stage=response");
      throw new LlmProviderError("Anthropic returned no structured result", undefined, "response");
    }
    const checked = CvAnalysisSchema.safeParse(block.input);
    if (!checked.success) {
      console.error("[anthropic] schema mismatch: stage=parse");
      throw new LlmProviderError("Anthropic output did not match the schema", undefined, "parse");
    }
    return checked.data;
  }
}
