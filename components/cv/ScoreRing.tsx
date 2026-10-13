export default function ScoreRing({ score }: { score: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const color = clamped >= 75 ? "#059669" : clamped >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`ATS score ${clamped} out of 100`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{clamped}</span>
        <span className="text-[10px] uppercase tracking-wide text-gray-500">ATS score</span>
      </div>
    </div>
  );
}
