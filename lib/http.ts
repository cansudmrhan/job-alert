import { NextResponse } from "next/server";
import { toPublicError } from "./errors";

export function errorResponse(err: unknown): NextResponse {
  const { code, message, status } = toPublicError(err);
  return NextResponse.json({ error: message, code }, { status });
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
