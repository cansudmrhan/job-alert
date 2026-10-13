import type { AnalysisSource, CvAnalysis } from "@/lib/llm/types";
import AtsChecklist from "./AtsChecklist";
import BulletComparison from "./BulletComparison";
import BulletList from "./BulletList";
import KeywordChips from "./KeywordChips";
import ScoreRing from "./ScoreRing";

type CvResultsProps = {
  analysis: CvAnalysis;
  source: AnalysisSource;
  notice?: string;
};

export default function CvResults({ analysis, source, notice }: CvResultsProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <ScoreRing score={analysis.atsScore} />
        <div className="min-w-[200px] flex-1">
          <span
            className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              source === "live" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {source === "live" ? "Live analysis" : "Sample result"}
          </span>
          <p className="text-sm text-gray-700">{analysis.improvedSummary}</p>
          {source === "sample" && (
            <p className="mt-2 text-xs text-gray-500">
              This is an example and is not based on your CV.
            </p>
          )}
          {source === "sample" && notice && (
            <p className="mt-1 text-xs font-medium text-amber-700">Reason: {notice}</p>
          )}
        </div>
      </div>

      <AtsChecklist checks={analysis.atsChecks} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <KeywordChips title="Matched keywords" items={analysis.matchedKeywords} tone="matched" />
        <KeywordChips
          title="Missing keywords"
          items={analysis.missingKeywords}
          tone="missing"
          hint="Add these only if they are true for you."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <BulletList title="Strengths" items={analysis.strengths} />
        <BulletList title="Gaps" items={analysis.gaps} />
      </div>

      <BulletComparison bullets={analysis.improvedBullets} />
    </div>
  );
}
