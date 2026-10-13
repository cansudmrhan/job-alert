type KeywordChipsProps = {
  title: string;
  items: string[];
  tone: "matched" | "missing";
  hint?: string;
};

const TONES = {
  matched: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  missing: "bg-amber-50 text-amber-800 ring-amber-200",
};

export default function KeywordChips({ title, items, tone, hint }: KeywordChipsProps) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-gray-900">{title}</h3>
      {hint && <p className="mb-2 text-xs text-gray-500">{hint}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">None</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li key={item} className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${TONES[tone]}`}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
