export const SITE_NAME = "DarkSon";
export const SITE_DESCRIPTION =
  "Visit the website of the most intelligent and charismatic person that exists in this world";

export function siteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "https://darkson.xyz";

  return raw.replace(/\/+$/, "");
}
