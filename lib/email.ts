import { Resend } from "resend";
import { errors } from "./errors";
import { normalizeJobUrl } from "./linkedin-url";
import type { Job } from "./types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function unsubscribeUrl(appUrl: string, alertId: string): string {
  const base = appUrl.replace(/\/+$/, "");
  return `${base}/api/alerts/unsubscribe?id=${encodeURIComponent(alertId)}`;
}

function safeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? escapeHtml(url) : "#";
}

type AlertEmailParams = {
  keyword: string;
  countryLabels: string[];
  jobs: Job[];
  alertId: string;
  appUrl: string;
};

export function buildAlertEmail(params: AlertEmailParams): { subject: string; html: string } {
  const countries = params.countryLabels.join(", ");
  const stopUrl = unsubscribeUrl(params.appUrl, params.alertId);
  const count = params.jobs.length;

  const rows = params.jobs
    .map(
      (j) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">
          <a href="${safeHref(normalizeJobUrl(j.applyUrl))}" style="font-weight:600;color:#1a4fd6;text-decoration:none;">${escapeHtml(j.title)}</a><br/>
          <span style="color:#555;">${escapeHtml(j.company)} — ${escapeHtml(j.location)}</span><br/>
          <span style="color:#999;font-size:12px;">${escapeHtml(j.source)}${
        j.postedAt ? " · " + escapeHtml(j.postedAt) : ""
      }</span>
        </td>
      </tr>`
    )
    .join("");

  const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#111;">${escapeHtml(params.keyword)} — ${escapeHtml(countries)}</h2>
        <p style="color:#555;">We found ${count} new job${count === 1 ? "" : "s"} matching your alert:</p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <p style="margin-top:24px;font-size:12px;color:#888;">
          Don&#39;t want these emails anymore?
          <a href="${escapeHtml(stopUrl)}" style="color:#888;">Stop this alert</a>
        </p>
      </div>
    `;

  return { subject: `${count} new jobs: ${params.keyword} in ${countries}`, html };
}

export async function sendAlertEmail(params: AlertEmailParams & { to: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  if (!apiKey || !from) {
    throw errors.notConfigured("Email sending is not configured on this server.");
  }

  const { subject, html } = buildAlertEmail(params);
  const { error } = await new Resend(apiKey).emails.send({ from, to: params.to, subject, html });
  if (error) throw errors.upstream("Could not send the alert email.");
}
