import { NextRequest, NextResponse } from "next/server";
import { searchLinkedInJobs, isLinkedInConfigured } from "@/lib/linkedin";
import { getAllAlerts, getSeenJobIds, isRedisConfigured, markJobsSeen } from "@/lib/redis";
import { sendAlertEmail } from "@/lib/email";
import { getCountry } from "@/lib/locations";
import { budgetExhausted, getLimits } from "@/lib/limits";
import { appUrl } from "@/lib/app-url";
import { toPublicError } from "@/lib/errors";

export const maxDuration = 60;

// Each run looks back 3 hours regardless of the alert's range, so it only pays for fresh jobs.
const CRON_LOOKBACK_SECONDS = 3 * 60 * 60;

// Runs only 09:00-20:00 Europe/Berlin unless ?force=1, so a loose schedule can't spend outside it.
function isWithinWorkingWindow(): boolean {
  const berlinHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Berlin",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  return berlinHour >= 9 && berlinHour < 20;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const expected = process.env.CRON_SECRET;
  const secret = req.headers.get("x-cron-secret") || searchParams.get("secret");
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLinkedInConfigured()) {
    return NextResponse.json({ skipped: true, reason: "APIFY_TOKEN is not set" });
  }
  if (!isRedisConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Upstash is not configured" });
  }

  if (await budgetExhausted()) {
    return NextResponse.json({ skipped: true, reason: "monthly Apify budget reached" });
  }

  const force = searchParams.get("force") === "1";
  if (!force && !isWithinWorkingWindow()) {
    return NextResponse.json({ skipped: true, reason: "outside 09:00-20:00 Europe/Berlin window" });
  }

  const all = await getAllAlerts();
  const alerts = all
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, getLimits().alertsGlobal);
  const origin = appUrl(req.nextUrl.origin);
  const results: Array<{ alertId: string; newJobs: number; error?: string }> = [];

  for (const alert of alerts) {
    // Spend accrues during the run.
    if (await budgetExhausted()) {
      results.push({ alertId: alert.id, newJobs: 0, error: "monthly Apify budget reached" });
      continue;
    }
    try {
      const jobs = await searchLinkedInJobs({
        keyword: alert.keyword,
        countries: alert.countries,
        range: alert.range ?? "24h",
        sinceSeconds: CRON_LOOKBACK_SECONDS,
      });
      const seen = await getSeenJobIds(alert.id);
      const newJobs = jobs.filter((j) => !seen.has(j.id));

      if (newJobs.length > 0) {
        const countryLabels = alert.countries
          .map((code) => getCountry(code)?.label)
          .filter((label): label is string => Boolean(label));

        await sendAlertEmail({
          to: alert.email,
          keyword: alert.keyword,
          countryLabels,
          jobs: newJobs,
          alertId: alert.id,
          appUrl: origin,
        });
        await markJobsSeen(alert.id, newJobs.map((j) => j.id));
      }

      results.push({ alertId: alert.id, newJobs: newJobs.length });
    } catch (err) {
      results.push({ alertId: alert.id, newJobs: 0, error: toPublicError(err).message });
    }
  }

  return NextResponse.json({ checked: alerts.length, results });
}
