"use client";

import type { Range } from "@/lib/types";

type RangeToggleProps = {
  value: Range;
  onChange: (range: Range) => void;
};

const OPTIONS: { value: Range; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "week", label: "Week" },
  { value: "2weeks", label: "2 weeks" },
];

export default function RangeToggle({ value, onChange }: RangeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.value
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
