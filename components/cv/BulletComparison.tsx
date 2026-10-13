import type { CvAnalysis } from "@/lib/llm/types";

export default function BulletComparison({ bullets }: { bullets: CvAnalysis["improvedBullets"] }) {
  if (bullets.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">Before / after</h3>
      <div className="space-y-3">
        {bullets.map((bullet, index) => (
          <div key={index} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Before
                </p>
                <p className="text-sm text-gray-600">{bullet.original}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                  After
                </p>
                <p className="text-sm text-gray-900">{bullet.improved}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Why: {bullet.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
