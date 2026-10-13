"use client";

import { useState } from "react";
import SearchForm from "@/components/search/SearchForm";
import JobList from "@/components/jobs/JobList";
import CreateAlertModal from "@/components/alerts/CreateAlertModal";
import AlertList from "@/components/alerts/AlertList";
import { useJobSearch } from "@/hooks/useJobSearch";
import type { Range } from "@/lib/types";

export default function HomePage() {
  const [keyword, setKeyword] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [range, setRange] = useState<Range>("24h");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const { jobs, loading, error, searched, search } = useJobSearch();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 pb-20">
      <h1 className="text-2xl font-bold">Job Search</h1>
      <p className="mb-6 text-gray-500">Newest jobs first.</p>

      <SearchForm
        keyword={keyword}
        onKeywordChange={setKeyword}
        countries={countries}
        onCountriesChange={setCountries}
        range={range}
        onRangeChange={setRange}
        onSubmit={() => search(keyword, countries, range)}
        loading={loading}
        onCreateAlert={() => setShowAlertModal(true)}
      />

      <JobList jobs={jobs} loading={loading} error={error} searched={searched} />

      {showAlertModal && (
        <CreateAlertModal
          defaultKeyword={keyword}
          defaultCountries={countries}
          defaultRange={range}
          onClose={() => setShowAlertModal(false)}
        />
      )}

      <AlertList />
    </div>
  );
}
