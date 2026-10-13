import { getRedis, isRedisConfigured } from "./redis";
import { getCountry, EU_LOCATION_CODE, EU_FALLBACK_QUERIES } from "./locations";
import { AGE_WINDOWS, dedupeAndSort, mergeBuckets, type RawLinkedInJob } from "./jobs";
import { errors } from "./errors";
import { trackApifyUsage } from "./limits";
import type { Job, Range } from "./types";

const ACTOR_ID = "curious_coder~linkedin-jobs-scraper";
const CACHE_TTL_SECONDS = 10 * 60;

const RANGE_TO_SECONDS: Record<Range, number> = {
  "24h": 24 * 60 * 60,
  week: 7 * 24 * 60 * 60,
  "2weeks": 14 * 24 * 60 * 60,
};

const MANUAL_LIMIT = 50;
const ALERT_LIMIT = 100;

type SearchParams = {
  keyword: string;
  countries: string[];
  range: Range;
  // Set by the alert cron: a single run over this look-back window, uncached.
  sinceSeconds?: number;
};

export function isLinkedInConfigured(): boolean {
  return Boolean(process.env.APIFY_TOKEN);
}

function buildSearchUrl(keyword: string, location: string, rangeSeconds: number): string {
  const url = new URL("https://www.linkedin.com/jobs/search/");
  url.searchParams.set("keywords", keyword);
  url.searchParams.set("location", location);
  url.searchParams.set("f_TPR", `r${Math.round(rangeSeconds)}`);
  url.searchParams.set("sortBy", "DD");
  return url.toString();
}

async function runActor(urls: string[], limitPerSource: number): Promise<RawLinkedInJob[]> {
  if (urls.length === 0) return [];

  const token = process.env.APIFY_TOKEN;
  if (!token) throw errors.notConfigured("Job search is not configured on this server.");

  let res: Response;
  try {
    res = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ urls, limitPerSource }),
        cache: "no-store",
      }
    );
  } catch {
    throw errors.upstream("The job source is temporarily unavailable. Please try again.");
  }

  if (!res.ok) {
    throw errors.upstream("The job source is temporarily unavailable. Please try again.");
  }
  const data: unknown = await res.json();
  const items = Array.isArray(data) ? (data as RawLinkedInJob[]) : [];
  await trackApifyUsage(items.length);
  return items;
}

function searchCacheKey(keyword: string, countries: string[], range: Range): string {
  const sortedCountries = countries.slice().sort().join(",");
  return `linkedin:search:${keyword.trim().toLowerCase()}:${sortedCountries}:${range}`;
}

export async function readCachedSearch(
  params: Pick<SearchParams, "keyword" | "countries" | "range">
): Promise<Job[] | null> {
  if (!isRedisConfigured()) return null;
  try {
    const cached = await getRedis().get<Job[] | string>(
      searchCacheKey(params.keyword, params.countries, params.range)
    );
    if (!cached) return null;
    return typeof cached === "string" ? (JSON.parse(cached) as Job[]) : cached;
  } catch {
    return null;
  }
}

async function writeCache(key: string, jobs: Job[]): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await getRedis().set(key, JSON.stringify(jobs), { ex: CACHE_TTL_SECONDS });
  } catch {
  }
}

function resolveLocations(countries: string[]): string[] {
  return countries.map((code) => {
    const location = code === EU_LOCATION_CODE ? "European Union" : getCountry(code)?.query;
    if (!location) throw errors.badRequest("Unknown country selected.");
    return location;
  });
}

// Runs one actor call per time window, in parallel, each covering all locations.
async function runWindows(
  keyword: string,
  locations: string[],
  windowSeconds: number[],
  limit: number
): Promise<RawLinkedInJob[][]> {
  return Promise.all(
    windowSeconds.map((seconds) =>
      runActor(
        locations.map((location) => buildSearchUrl(keyword, location, seconds)),
        limit
      )
    )
  );
}

export async function searchLinkedInJobs(params: SearchParams): Promise<Job[]> {
  if (params.sinceSeconds != null) {
    const [items] = await runWindows(
      params.keyword,
      resolveLocations(params.countries),
      [params.sinceSeconds],
      ALERT_LIMIT
    );
    return dedupeAndSort(items);
  }

  const cached = await readCachedSearch(params);
  if (cached) return cached;

  const locations = resolveLocations(params.countries);
  const isEuOnly = params.countries.length === 1 && params.countries[0] === EU_LOCATION_CODE;
  const is24h = params.range === "24h";
  const windows = is24h ? AGE_WINDOWS.map((w) => w.seconds) : [RANGE_TO_SECONDS[params.range]];

  let results = await runWindows(params.keyword, locations, windows, MANUAL_LIMIT);
  if (isEuOnly && results.every((r) => r.length === 0)) {
    results = await runWindows(params.keyword, EU_FALLBACK_QUERIES, windows, MANUAL_LIMIT);
  }

  const jobs = is24h ? mergeBuckets(results) : dedupeAndSort(results[0] ?? []);
  await writeCache(searchCacheKey(params.keyword, params.countries, params.range), jobs);
  return jobs;
}
