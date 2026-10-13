import { NextRequest, NextResponse } from "next/server";
import { deleteAlertById, isRedisConfigured } from "@/lib/redis";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title: string, message: string, status: number): NextResponse {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;color:#111;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:16px;">
<div style="max-width:420px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;text-align:center;">
<h1 style="font-size:20px;margin:0 0 8px;">${title}</h1>
<p style="color:#555;margin:0 0 20px;">${message}</p>
<a href="/" style="color:#2563eb;text-decoration:none;font-weight:600;">Back to Job Alert</a>
</div></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";
  if (!UUID_RE.test(id)) {
    return page("Invalid link", "This stop link is not valid.", 400);
  }
  if (!isRedisConfigured()) {
    return page("Unavailable", "Alerts are not available on this server right now.", 503);
  }

  try {
    const removed = await deleteAlertById(id);
    return removed
      ? page("Alert stopped", "You will no longer receive emails for this alert.", 200)
      : page("Already stopped", "This alert no longer exists, so nothing more will be sent.", 200);
  } catch {
    return page("Something went wrong", "Please try the link again in a moment.", 500);
  }
}
