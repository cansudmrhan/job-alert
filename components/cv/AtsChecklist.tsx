import type { AtsCheck } from "@/lib/llm/types";

const STATUS = {
  pass: { label: "Pass", row: "border-emerald-200 bg-emerald-50", badge: "bg-emerald-600 text-white", icon: "✓" },
  warn: { label: "Warning", row: "border-amber-200 bg-amber-50", badge: "bg-amber-500 text-white", icon: "!" },
  fail: { label: "Fail", row: "border-red-200 bg-red-50", badge: "bg-red-600 text-white", icon: "✕" },
} as const;

export default function AtsChecklist({ checks }: { checks: AtsCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">ATS compatibility</h3>
      <ul className="space-y-2">
        {checks.map((c) => {
          const s = STATUS[c.status];
          return (
            <li key={c.check} className={`flex items-start gap-3 rounded-lg border p-3 ${s.row}`}>
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.badge}`}
                aria-label={s.label}
              >
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{c.check}</p>
                <p className="text-sm text-gray-700">{c.note}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
