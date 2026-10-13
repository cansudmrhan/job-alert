"use client";

import { useState } from "react";
import type { Job, Range } from "@/lib/types";

export function useJobSearch() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function search(query: string, countries: string[], range: Range) {
    if (!query.trim() || countries.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        query,
        countries: countries.join(","),
        range,
      });
      const res = await fetch(`/api/search?${params.toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Search failed");
      setJobs(body.jobs);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return { jobs, loading, error, searched, search };
}
