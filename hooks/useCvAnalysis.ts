"use client";

import { useState } from "react";
import { SAMPLE_ANALYSIS } from "@/lib/llm/sample";
import type { AnalysisSource, CvAnalysis } from "@/lib/llm/types";

type CvRequest = {
  cvText?: string;
  cvPdfBase64?: string;
  job: { title: string; company: string; description: string };
};

type Result = { analysis: CvAnalysis; source: AnalysisSource; notice?: string };

export function useCvAnalysis() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze(request: CvRequest) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cv/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Analysis failed");
      setResult(body as Result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  // Shows the static example with no request, so it never counts toward limits.
  function showSample() {
    setError(null);
    setResult({ analysis: SAMPLE_ANALYSIS, source: "sample" });
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  return { result, loading, error, analyze, showSample, reset };
}
