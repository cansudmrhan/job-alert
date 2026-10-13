import { NextRequest, NextResponse } from "next/server";
import { isLinkedInConfigured, readCachedSearch, searchLinkedInJobs } from "@/lib/linkedin";
import { parseCountryCodes } from "@/lib/locations";
import { budgetExhausted, consumeQuota, LIMIT_MESSAGES } from "@/lib/limits";
import { errors } from "@/lib/errors";
import { clientIp, errorResponse } from "@/lib/http";
import type { Range } from "@/lib/types";

export const maxDuration = 60;

const VALID_RANGES: Range[] = ["24h", "week", "2weeks"];

export async function GET(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams;
    const keyword = params.get("query")?.trim().slice(0, 100);
    const countriesParam = params.get("countries")?.trim();
    const rangeParam = params.get("range")?.trim().toLowerCase();

    if (!keyword) throw errors.badRequest("query is required");
    if (!countriesParam) throw errors.badRequest("countries is required");

    const countries = parseCountryCodes(countriesParam);
    if (countries.length === 0) throw errors.badRequest("No valid countries provided");

    const range: Range = VALID_RANGES.includes(rangeParam as Range) ? (rangeParam as Range) : "24h";
    const query = { keyword, countries, range };

    // Cached results are free and not counted against the caps.
    const cached = await readCachedSearch(query);
    if (cached) return NextResponse.json({ jobs: cached, cached: true });

    if (!isLinkedInConfigured()) {
      throw errors.notConfigured("Job search is not configured on this server.");
    }

    if (await budgetExhausted()) throw errors.rateLimited(LIMIT_MESSAGES.budget);

    const quota = await consumeQuota("search", clientIp(req.headers));
    if (!quota.allowed) throw errors.rateLimited(LIMIT_MESSAGES.search);

    return NextResponse.json({ jobs: await searchLinkedInJobs(query) });
  } catch (err) {
    return errorResponse(err);
  }
}
