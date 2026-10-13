// Normalises LinkedIn job links to the canonical English page, regardless of
// country subdomain (ae., de., tr., ...), locale or tracking parameters.

const LINKEDIN_HOST = /(^|\.)linkedin\.com$/i;

function extractJobId(url: URL): string | null {
  // /jobs/view/123456, /jobs/view/some-title-at-acme-123456, /comm/jobs/view/123456
  const view = url.pathname.match(/\/jobs\/view\/(?:[^/?#]*-)?(\d{5,})(?:[/?#]|$)/i);
  if (view) return view[1];
  // /jobs/search/?currentJobId=123456, /jobs/collections/...?currentJobId=123456
  const current = url.searchParams.get("currentJobId");
  return current && /^\d{5,}$/.test(current) ? current : null;
}

export function normalizeJobUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  if (!/^https?:$/.test(url.protocol) || !LINKEDIN_HOST.test(url.hostname)) return raw;
  const id = extractJobId(url);
  if (!id) return raw;
  return `https://www.linkedin.com/jobs/view/${id}/?_l=en`;
}
