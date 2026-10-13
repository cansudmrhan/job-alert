export type Range = "24h" | "week" | "2weeks";

export type AgeBucket = "1h" | "3h" | "6h" | "12h" | "24h";

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  employmentType: string | null;
  applyUrl: string;
  description: string;
  postedAt: string | null;
  postedAtTimestamp: number | null;
  postedAtPrecision: "hour" | "day" | null;
  // Smallest 24h-range window the job appeared in; null for week / 2 weeks.
  ageBucket: AgeBucket | null;
  source: string;
};

export type Alert = {
  id: string;
  keyword: string;
  countries: string[];
  range: Range;
  email: string;
  createdAt: string;
};
