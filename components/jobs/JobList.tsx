import type { Job } from "@/lib/types";
import JobCard from "./JobCard";

type JobListProps = {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  searched: boolean;
};

export default function JobList({ jobs, loading, error, searched }: JobListProps) {
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (searched && jobs.length === 0 && !loading) {
    return (
      <p className="mt-10 text-center text-sm text-gray-500">
        No jobs in this time range.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
