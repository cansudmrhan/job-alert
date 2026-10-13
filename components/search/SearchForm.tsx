"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import CountrySelect from "@/components/search/CountrySelect";
import RangeToggle from "@/components/search/RangeToggle";
import type { Range } from "@/lib/types";

type SearchFormProps = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  countries: string[];
  onCountriesChange: (codes: string[]) => void;
  range: Range;
  onRangeChange: (range: Range) => void;
  onSubmit: () => void;
  loading: boolean;
  onCreateAlert: () => void;
};

export default function SearchForm({
  keyword,
  onKeywordChange,
  countries,
  onCountriesChange,
  range,
  onRangeChange,
  onSubmit,
  loading,
  onCreateAlert,
}: SearchFormProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") onSubmit();
  }

  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="w-full sm:min-w-[160px] sm:flex-1">
        <Input
          placeholder="Keyword (e.g. Frontend Developer)"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="w-full sm:min-w-[180px] sm:flex-1" onKeyDown={handleKeyDown}>
        <CountrySelect value={countries} onChange={onCountriesChange} />
      </div>
      <div className="flex flex-wrap gap-2">
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button onClick={onSubmit} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Searching..." : "Search"}
        </Button>
        <button
          type="button"
          onClick={onCreateAlert}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-600 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:w-auto"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" />
          </svg>
          Create Alert
        </button>
      </div>
    </div>
  );
}
