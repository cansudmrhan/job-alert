"use client";

import { useRouter } from "next/navigation";
import { postedLabel } from "@/lib/jobs";
import { normalizeJobUrl } from "@/lib/linkedin-url";
import { saveSelectedJob } from "@/lib/selected-job";
import type { Job } from "@/lib/types";

export default function JobCard({ job }: { job: Job }) {
  const router = useRouter();
  const posted = postedLabel(job);

  function matchMyCv() {
    saveSelectedJob({
      title: job.title,
      company: job.company,
      description: job.description,
      url: job.applyUrl,
    });
    router.push("/cv");
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {job.source}
        </span>
      </div>
      <p className="mb-1.5 text-sm text-gray-600">
        {job.company} — {job.location}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span className="text-xs text-gray-400">{posted ?? ""}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={matchMyCv}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            Match my CV
          </button>
          <a
            href={normalizeJobUrl(job.applyUrl)}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Apply
          </a>
        </div>
      </div>
    </div>
  );
}
