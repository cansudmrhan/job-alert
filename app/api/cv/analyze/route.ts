import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeWithFallback, getCvAnalyzer } from "@/lib/llm";
import { SAMPLE_ANALYSIS } from "@/lib/llm/sample";
import { FALLBACK_REASON_TEXT } from "@/lib/llm/types";
import { consumeQuota, LIMIT_MESSAGES } from "@/lib/limits";
import { errors } from "@/lib/errors";
import { clientIp, errorResponse } from "@/lib/http";

export const maxDuration = 60;

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BASE64_LENGTH = Math.ceil((MAX_PDF_BYTES * 4) / 3) + 8;

const inputSchema = z
  .object({
    cvText: z.string().trim().max(30_000).optional(),
    cvPdfBase64: z.string().max(MAX_PDF_BASE64_LENGTH).optional(),
    job: z.object({
      title: z.string().trim().max(200).default(""),
      company: z.string().trim().max(200).default(""),
      description: z.string().trim().min(20).max(20_000),
    }),
  })
  .refine((v) => Boolean(v.cvText) || Boolean(v.cvPdfBase64), {
    message: "Provide a CV as a PDF or pasted text.",
  });

function isPdf(base64: string): boolean {
  return Buffer.from(base64.slice(0, 16), "base64").toString("latin1").startsWith("%PDF");
}

export async function POST(req: NextRequest) {
  try {
    const parsed = inputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw errors.badRequest(
        "Please add your CV (PDF or text) and a job description of at least 20 characters."
      );
    }
    const { cvText, cvPdfBase64, job } = parsed.data;
    if (cvPdfBase64 && !isPdf(cvPdfBase64)) throw errors.badRequest("The uploaded file is not a PDF.");

    const analyzer = getCvAnalyzer();
    const input = {
      cv: cvPdfBase64
        ? ({ kind: "pdf", base64: cvPdfBase64 } as const)
        : ({ kind: "text", text: cvText as string } as const),
      job,
    };

    // Only live analyses count against the caps.
    if (analyzer.provider !== "sample") {
      const quota = await consumeQuota("cv", clientIp(req.headers));
      if (!quota.allowed) {
        return NextResponse.json({
          analysis: SAMPLE_ANALYSIS,
          source: "sample",
          notice: LIMIT_MESSAGES.cv,
          reason: "rate_limited",
        });
      }
    }

    const outcome = await analyzeWithFallback(analyzer, input);
    if (outcome.source === "sample") {
      console.error(`[cv/analyze] serving sample: provider=${analyzer.provider} reason=${outcome.fallbackReason}`);
    }
    return NextResponse.json({
      analysis: outcome.analysis,
      source: outcome.source,
      ...(outcome.fallbackReason
        ? { reason: outcome.fallbackReason, notice: FALLBACK_REASON_TEXT[outcome.fallbackReason] }
        : {}),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
