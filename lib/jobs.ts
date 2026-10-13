import { isEnglishJob } from "./language";
import type { AgeBucket, Job } from "./types";

export type RawLinkedInJob = {
  id?: string | number | null;
  link?: string | null;
  title?: string | null;
  companyName?: string | null;
  location?: string | null;
  employmentType?: string | null;
  postedAt?: string | null;
  postedAtTimestamp?: number | string | null;
  descriptionText?: string | null;
  descriptionHtml?: string | null;
};

// Ordered smallest window first. `seconds` is the LinkedIn f_TPR value.
export const AGE_WINDOWS: ReadonlyArray<{ bucket: AgeBucket; seconds: number; label: string }> = [
  { bucket: "1h", seconds: 3600, label: "under 1 h" },
  { bucket: "3h", seconds: 10800, label: "under 3 h" },
  { bucket: "6h", seconds: 21600, label: "under 6 h" },
  { bucket: "12h", seconds: 43200, label: "under 12 h" },
  { bucket: "24h", seconds: 86400, label: "under 24 h" },
];

const BUCKET_LABELS = Object.fromEntries(AGE_WINDOWS.map((w) => [w.bucket, w.label])) as Record<
  AgeBucket,
  string
>;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type ParsedTimestamp = { timestamp: number; precision: "hour" | "day" };

function fromNumber(n: number): ParsedTimestamp {
  return { timestamp: n > 1e12 ? Math.round(n / 1000) : Math.round(n), precision: "hour" };
}

// The actor normally returns `postedAt` as a bare "YYYY-MM-DD" (day precision).
// An exact unix time or a date string with a time component is hour precision.
function parseTimestamp(
  postedAt?: string | null,
  raw?: number | string | null
): ParsedTimestamp | null {
  if (typeof raw === "number" && !Number.isNaN(raw)) return fromNumber(raw);
  if (typeof raw === "string" && raw.trim()) {
    const asNumber = Number(raw);
    if (!Number.isNaN(asNumber)) return fromNumber(asNumber);
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) {
      return {
        timestamp: Math.round(parsed / 1000),
        precision: DATE_ONLY_PATTERN.test(raw.trim()) ? "day" : "hour",
      };
    }
  }
  if (postedAt) {
    const parsed = Date.parse(postedAt);
    if (!Number.isNaN(parsed)) {
      return {
        timestamp: Math.round(parsed / 1000),
        precision: DATE_ONLY_PATTERN.test(postedAt.trim()) ? "day" : "hour",
      };
    }
  }
  return null;
}

function normalizeJob(item: RawLinkedInJob, ageBucket: AgeBucket | null = null): Job | null {
  const id = String(item.id ?? item.link ?? "").trim();
  if (!id) return null;

  const description =
    item.descriptionText ?? (item.descriptionHtml ? stripHtml(item.descriptionHtml) : "");

  // Only the description is language-checked; titles can be localized even
  // when the posting itself is in English.
  if (!isEnglishJob({ title: "", description })) return null;

  const parsed = parseTimestamp(item.postedAt, item.postedAtTimestamp);

  return {
    id,
    title: item.title ?? "Untitled",
    company: item.companyName ?? "Unknown",
    location: item.location ?? "Remote / not specified",
    employmentType: item.employmentType ?? null,
    applyUrl: item.link ?? "",
    description,
    postedAt: item.postedAt ?? null,
    postedAtTimestamp: parsed?.timestamp ?? null,
    postedAtPrecision: parsed?.precision ?? null,
    ageBucket,
    source: "LinkedIn",
  };
}

// Merges per-window results (aligned with AGE_WINDOWS, smallest first).
// A job is labelled with the smallest window it appears in. Iterating the
// windows in order and keeping the first sighting gives "smaller bucket first,
// LinkedIn's order inside a bucket" without any extra sorting.
export function mergeBuckets(resultsByWindow: RawLinkedInJob[][]): Job[] {
  const seen = new Set<string>();
  const merged: Job[] = [];

  resultsByWindow.forEach((items, index) => {
    const bucket = AGE_WINDOWS[index]?.bucket;
    if (!bucket) return;
    for (const raw of items) {
      const job = normalizeJob(raw, bucket);
      if (!job) continue;
      const keys = [job.id, job.applyUrl].filter(Boolean);
      if (keys.some((k) => seen.has(k))) continue;
      keys.forEach((k) => seen.add(k));
      merged.push(job);
    }
  });

  return merged;
}

// De-duplicates a single result set. LinkedIn already returns it sorted by
// date (sortBy=DD); we only re-sort when every job has hour precision, since
// day-level dates would scramble that order.
export function dedupeAndSort(items: RawLinkedInJob[]): Job[] {
  const seen = new Set<string>();
  const jobs: Job[] = [];
  for (const raw of items) {
    const job = normalizeJob(raw);
    if (!job) continue;
    const keys = [job.id, job.applyUrl].filter(Boolean);
    if (keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    jobs.push(job);
  }

  const allHourPrecision = jobs.length > 0 && jobs.every((j) => j.postedAtPrecision === "hour");
  if (!allHourPrecision) return jobs;
  return jobs.sort((a, b) => (b.postedAtTimestamp ?? 0) - (a.postedAtTimestamp ?? 0));
}

// Label shown on a job card: the bucket for 24h searches, otherwise
// "Today" / "Yesterday" / "N days ago" from the posting date.
export function postedLabel(job: Job, now: number = Date.now()): string | null {
  if (job.ageBucket) return BUCKET_LABELS[job.ageBucket];
  if (job.postedAtTimestamp == null) return null;

  const posted = new Date(job.postedAtTimestamp * 1000);
  if (Number.isNaN(posted.getTime())) return null;

  // Compare UTC calendar days (day-precision dates are parsed as UTC midnight).
  const today = new Date(now);
  const postedDay = Date.UTC(posted.getUTCFullYear(), posted.getUTCMonth(), posted.getUTCDate());
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const diffDays = Math.round((todayDay - postedDay) / 86400000);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}
