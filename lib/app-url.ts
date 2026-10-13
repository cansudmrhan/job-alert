export function appUrl(requestOrigin: string): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return (configured || requestOrigin).replace(/\/+$/, "");
}
