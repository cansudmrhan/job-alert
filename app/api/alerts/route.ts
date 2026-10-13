import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { deleteAlert, getAllAlerts, getAlertsByEmail, isRedisConfigured, saveAlert } from "@/lib/redis";
import { parseCountryCodes } from "@/lib/locations";
import { checkAlertCaps, LIMIT_MESSAGES } from "@/lib/limits";
import { errors } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import type { Alert } from "@/lib/types";

const emailSchema = z.string().trim().email().max(254);

const createSchema = z.object({
  keyword: z.string().trim().min(1).max(100),
  countries: z.array(z.string()).max(10),
  range: z.enum(["24h", "week", "2weeks"]).default("24h"),
  email: emailSchema,
});

const REDIS_SETUP_MESSAGE = "Alerts need Upstash setup";

function requireRedis() {
  if (!isRedisConfigured()) throw errors.notConfigured(REDIS_SETUP_MESSAGE);
}

export async function GET(req: NextRequest) {
  try {
    requireRedis();
    const parsed = emailSchema.safeParse(new URL(req.url).searchParams.get("email") ?? "");
    if (!parsed.success) throw errors.badRequest("A valid email is required");
    return NextResponse.json({ alerts: await getAlertsByEmail(parsed.data) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireRedis();
    const body = createSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw errors.badRequest("Please provide a keyword, a country and a valid email.");

    const countries = parseCountryCodes(body.data.countries);
    if (countries.length === 0) throw errors.badRequest("At least one valid country is required");

    const existing = await getAllAlerts();
    const cap = checkAlertCaps(existing, body.data.email);
    if (!cap.allowed) {
      throw errors.rateLimited(
        cap.scope === "email" ? LIMIT_MESSAGES.alertEmail : LIMIT_MESSAGES.alertGlobal
      );
    }

    const alert: Alert = {
      id: randomUUID(),
      keyword: body.data.keyword,
      countries,
      range: body.data.range,
      email: body.data.email,
      createdAt: new Date().toISOString(),
    };
    await saveAlert(alert);
    return NextResponse.json({ alert }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    requireRedis();
    const params = new URL(req.url).searchParams;
    const id = params.get("id")?.trim();
    if (!id) throw errors.badRequest("id is required");
    const email = emailSchema.safeParse(params.get("email") ?? "");
    if (!email.success) throw errors.badRequest("A valid email is required");

    if (!(await deleteAlert(id, email.data))) throw errors.notFound("Alert not found");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
