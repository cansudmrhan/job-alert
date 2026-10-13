import { describe, expect, it } from "vitest";
import { AGE_WINDOWS, dedupeAndSort, mergeBuckets, postedLabel, type RawLinkedInJob } from "@/lib/jobs";
import type { Job } from "@/lib/types";

const raw = (id: string, extra: Partial<RawLinkedInJob> = {}): RawLinkedInJob => ({
  id,
  link: `https://linkedin.com/jobs/view/${id}`,
  title: `Job ${id}`,
  companyName: "Acme",
  location: "Berlin",
  descriptionText: "We build great software with React and TypeScript.",
  postedAt: "2026-10-13",
  ...extra,
});

const baseJob: Job = {
  id: "1",
  title: "t",
  company: "c",
  location: "l",
  employmentType: null,
  applyUrl: "https://x",
  description: "",
  postedAt: null,
  postedAtTimestamp: null,
  postedAtPrecision: null,
  ageBucket: null,
  source: "LinkedIn",
};

describe("time-bucket labeling", () => {
  it("labels a job with the smallest window it appears in", () => {
    const jobs = mergeBuckets([
      [raw("a")],
      [raw("a"), raw("b")],
      [raw("a"), raw("b"), raw("c")],
      [],
      [raw("d")],
    ]);
    const byId = Object.fromEntries(jobs.map((j) => [j.id, j.ageBucket]));
    expect(byId).toEqual({ a: "1h", b: "3h", c: "6h", d: "24h" });
  });

  it("has the five expected windows in order", () => {
    expect(AGE_WINDOWS.map((w) => w.seconds)).toEqual([3600, 10800, 21600, 43200, 86400]);
    expect(AGE_WINDOWS.map((w) => w.label)).toEqual([
      "under 1 h",
      "under 3 h",
      "under 6 h",
      "under 12 h",
      "under 24 h",
    ]);
  });

  it("shows the bucket label for 24h jobs", () => {
    expect(postedLabel({ ...baseJob, ageBucket: "6h" })).toBe("under 6 h");
  });

  it("shows Today / Yesterday / N days ago for older ranges", () => {
    const now = Date.parse("2026-10-13T15:00:00Z");
    const ts = (d: string) => Date.parse(`${d}T00:00:00Z`) / 1000;
    const label = (d: string) =>
      postedLabel({ ...baseJob, postedAtTimestamp: ts(d), postedAtPrecision: "day" }, now);
    expect(label("2026-10-13")).toBe("Today");
    expect(label("2026-10-12")).toBe("Yesterday");
    expect(label("2026-10-08")).toBe("5 days ago");
  });

  it("returns null when there is no date", () => {
    expect(postedLabel(baseJob)).toBeNull();
  });
});

describe("de-duplication and sorting", () => {
  it("de-duplicates across buckets by id and by url", () => {
    const jobs = mergeBuckets([
      [raw("a")],
      [raw("zzz", { link: "https://linkedin.com/jobs/view/a" }), raw("b")],
    ]);
    expect(jobs.map((j) => j.id)).toEqual(["a", "b"]);
  });

  it("puts smaller buckets first and keeps LinkedIn order inside a bucket", () => {
    const jobs = mergeBuckets([[raw("x2"), raw("x1")], [raw("y1")], [], [], [raw("z1"), raw("z2")]]);
    expect(jobs.map((j) => j.id)).toEqual(["x2", "x1", "y1", "z1", "z2"]);
  });

  it("keeps order when jobs only have day precision", () => {
    const jobs = dedupeAndSort([raw("a", { postedAt: "2026-10-01" }), raw("b", { postedAt: "2026-10-12" })]);
    expect(jobs.map((j) => j.id)).toEqual(["a", "b"]);
  });

  it("sorts newest first when every job has hour precision", () => {
    const jobs = dedupeAndSort([
      raw("old", { postedAtTimestamp: 1_000 }),
      raw("new", { postedAtTimestamp: 2_000 }),
    ]);
    expect(jobs.map((j) => j.id)).toEqual(["new", "old"]);
  });

  it("drops non-English jobs", () => {
    const jobs = mergeBuckets([[raw("a", { descriptionText: "مرحبا بكم في شركتنا للبرمجة" })]]);
    expect(jobs).toHaveLength(0);
  });
});
